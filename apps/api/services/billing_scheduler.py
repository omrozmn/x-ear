"""
Recurring Billing Scheduler

Handles:
- Subscription auto-renewal before expiry
- Failed payment retry (1, 3, 7 days)
- Dunning notifications (email/SMS warning before suspension)
- Grace period management
- Subscription suspension after max retries

Runs as scheduled task via APScheduler (daily at 6 AM UTC).
"""

import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from database import SessionLocal

logger = logging.getLogger(__name__)

# Retry schedule: days after first failure
RETRY_SCHEDULE = [1, 3, 7]
GRACE_PERIOD_DAYS = 7
MAX_RETRIES = 3


def run_billing_cycle():
    """
    Main billing cycle — runs daily.

    1. Find subscriptions expiring in next 3 days
    2. Attempt renewal via payment gateway
    3. Handle failures with retry schedule
    4. Send dunning notifications
    5. Suspend after max retries
    """
    logger.info("Starting billing cycle")
    db = SessionLocal()

    try:
        from core.models.subscription import Subscription, SubscriptionStatus
        from models.tenant import Tenant

        now = datetime.now(timezone.utc)
        three_days = now + timedelta(days=3)

        # 1. Find subscriptions expiring soon
        expiring = db.query(Subscription).filter(
            Subscription.status == SubscriptionStatus.ACTIVE.value,
            Subscription.current_period_end <= three_days,
            Subscription.current_period_end > now,
            Subscription.cancel_at_period_end.isnot(True),
        ).all()

        renewed = 0
        failed = 0

        for sub in expiring:
            tenant = db.query(Tenant).filter(Tenant.id == sub.tenant_id).first()
            if not tenant:
                continue

            result = _attempt_renewal(db, sub, tenant)
            if result:
                renewed += 1
            else:
                failed += 1

        # 2. Retry failed payments
        retried = _retry_failed_payments(db)

        # 3. Suspend overdue subscriptions
        suspended = _suspend_overdue(db)

        db.commit()
        logger.info(
            f"Billing cycle complete: {renewed} renewed, {failed} failed, "
            f"{retried} retried, {suspended} suspended"
        )

    except Exception as e:
        logger.error(f"Billing cycle failed: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


def _attempt_renewal(db: Session, sub, tenant) -> bool:
    """Attempt to renew a subscription."""
    try:
        from services.payment_gateway import PaymentGateway

        gateway = PaymentGateway(db, tenant.id)
        plan_amount = _get_plan_amount(db, sub.plan_id)

        if plan_amount <= 0:
            logger.warning(f"Plan {sub.plan_id} has zero amount, skipping billing")
            # Free plan — just extend the period
            sub.current_period_start = sub.current_period_end
            sub.current_period_end = sub.current_period_end + timedelta(days=30)
            return True

        result = gateway.charge(
            amount=plan_amount,
            customer_email=tenant.billing_email or tenant.owner_email,
            customer_name=tenant.name,
            description=f"Subscription renewal - {tenant.name}",
        )

        if result.success:
            # Update subscription period
            sub.current_period_start = sub.current_period_end
            sub.current_period_end = sub.current_period_end + timedelta(days=30)
            sub.retry_count = 0
            sub.last_payment_status = "paid"

            # Log payment
            _log_payment(db, sub, plan_amount, result)
            logger.info(f"Renewed subscription for tenant {tenant.id}")
            return True
        else:
            sub.retry_count = (sub.retry_count or 0) + 1
            sub.last_payment_status = "failed"
            sub.last_payment_error = result.error
            _send_dunning_notification(db, tenant, sub, "payment_failed")
            logger.warning(f"Renewal failed for tenant {tenant.id}: {result.error}")
            return False

    except Exception as e:
        logger.error(f"Renewal attempt failed for {sub.tenant_id}: {e}")
        return False


def _retry_failed_payments(db: Session) -> int:
    """Retry previously failed payments based on retry schedule."""
    from core.models.subscription import Subscription, SubscriptionStatus
    from models.tenant import Tenant

    now = datetime.now(timezone.utc)
    retried = 0

    failed_subs = db.query(Subscription).filter(
        Subscription.status == SubscriptionStatus.ACTIVE.value,
        Subscription.last_payment_status == "failed",
        Subscription.retry_count < MAX_RETRIES,
    ).all()

    for sub in failed_subs:
        retry_count = sub.retry_count or 0
        if retry_count >= len(RETRY_SCHEDULE):
            continue

        # Check if enough time has passed since last retry
        days_since_failure = (now - (sub.current_period_end or now)).days
        if days_since_failure < RETRY_SCHEDULE[min(retry_count, len(RETRY_SCHEDULE) - 1)]:
            continue

        tenant = db.query(Tenant).filter(Tenant.id == sub.tenant_id).first()
        if not tenant:
            continue

        if _attempt_renewal(db, sub, tenant):
            retried += 1

    return retried


def _suspend_overdue(db: Session) -> int:
    """Suspend subscriptions that exceeded max retries + grace period."""
    from core.models.subscription import Subscription, SubscriptionStatus

    now = datetime.now(timezone.utc)
    grace_cutoff = now - timedelta(days=GRACE_PERIOD_DAYS)
    suspended = 0

    overdue = db.query(Subscription).filter(
        Subscription.status == SubscriptionStatus.ACTIVE.value,
        Subscription.last_payment_status == "failed",
        Subscription.retry_count >= MAX_RETRIES,
        Subscription.current_period_end < grace_cutoff,
    ).all()

    for sub in overdue:
        sub.status = SubscriptionStatus.PAST_DUE.value
        _send_dunning_notification(db, sub.tenant_id, sub, "subscription_suspended")
        suspended += 1
        logger.warning(f"Suspended subscription for tenant {sub.tenant_id}")

    return suspended


def _get_plan_amount(db: Session, plan_id: str) -> float:
    """Get the price amount for a plan."""
    try:
        from core.models.plan import Plan
        plan = db.query(Plan).filter(Plan.id == plan_id).first()
        if plan:
            return float(getattr(plan, 'price', 0) or getattr(plan, 'monthly_price', 0) or 0)
    except Exception:
        pass
    return 0


def _log_payment(db: Session, sub, amount: float, result) -> None:
    """Log a payment to PaymentHistory."""
    try:
        from core.models.subscription import PaymentHistory
        from core.models.base import gen_id
        payment = PaymentHistory(
            id=gen_id("ph"),
            tenant_id=sub.tenant_id,
            subscription_id=sub.id,
            amount=amount,
            currency=result.raw.get("currency", "TRY") if result.raw else "TRY",
            status="paid",
            provider=result.provider,
            provider_payment_id=result.payment_id,
            paid_at=datetime.now(timezone.utc),
        )
        db.add(payment)
    except Exception as e:
        logger.warning(f"Failed to log payment: {e}")


def _send_dunning_notification(db: Session, tenant, sub, notification_type: str) -> None:
    """Send dunning notification via AI event trigger."""
    try:
        from ai.services.event_triggers import trigger_event, EventType
        trigger_event(
            db=db,
            event_type=f"billing_{notification_type}",
            tenant_id=tenant.id if hasattr(tenant, 'id') else str(tenant),
            entity_type="subscription",
            entity_id=sub.id,
            data={
                "retry_count": sub.retry_count,
                "notification_type": notification_type,
                "tenant_name": tenant.name if hasattr(tenant, 'name') else "",
            },
        )
    except Exception as e:
        logger.warning(f"Dunning notification failed: {e}")
