"""Checkout Router - FastAPI"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import hashlib
import hmac
import os
import secrets
import uuid
import logging

from database import get_db
from models.tenant import Tenant, TenantStatus
from models.subscription import Subscription, SubscriptionStatus, PaymentHistory, PaymentStatus
from models.plan import Plan
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/checkout", tags=["Checkout"])

from schemas.base import ResponseEnvelope
from schemas.checkout import (
    CheckoutSessionCreate, CheckoutSessionResponse,
    PaymentConfirmRequest, PaymentConfirmResponse
)

# ─── Rate limiting for unauthenticated checkout ─────────────────
_CHECKOUT_RATE: dict[str, list[float]] = {}  # ip -> list of timestamps
_CHECKOUT_RATE_LIMIT = 10  # max requests per window
_CHECKOUT_RATE_WINDOW = 300  # 5 minutes

# ─── Session token store (use Redis in production) ──────────────
_CHECKOUT_SESSION_TOKENS: dict[int, str] = {}  # payment_id -> token
_CHECKOUT_SESSION_SECRET = os.getenv("CHECKOUT_SESSION_SECRET", secrets.token_hex(32))


def _check_rate_limit(request: Request) -> None:
    """Simple IP-based rate limiter for checkout endpoints."""
    import time
    client_ip = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    now = time.time()
    timestamps = _CHECKOUT_RATE.get(client_ip, [])
    # Remove expired entries
    timestamps = [t for t in timestamps if now - t < _CHECKOUT_RATE_WINDOW]
    if len(timestamps) >= _CHECKOUT_RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many checkout requests. Please try again later.")
    timestamps.append(now)
    _CHECKOUT_RATE[client_ip] = timestamps


def _generate_session_token(payment_id: int) -> str:
    """Generate a signed session token for a checkout session."""
    token = hmac.new(
        _CHECKOUT_SESSION_SECRET.encode(),
        f"{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    _CHECKOUT_SESSION_TOKENS[payment_id] = token
    return token


def _verify_session_token(payment_id: int, token: str) -> bool:
    """Verify that the session token is valid for the given payment."""
    expected = _CHECKOUT_SESSION_TOKENS.get(payment_id)
    if not expected:
        return False
    return hmac.compare_digest(expected, token)


@router.post("/session", operation_id="createCheckoutSession", response_model=ResponseEnvelope[CheckoutSessionResponse])
async def create_checkout_session(data: CheckoutSessionCreate, request: Request, db: Session = Depends(get_db)):
    """Create checkout session for plan purchase"""
    try:
        _check_rate_limit(request)
        if not data.plan_id or not data.company_name or not data.email:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        plan = db.get(Plan, data.plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        amount = plan.get_monthly_price() if data.billing_cycle == "monthly" else plan.get_yearly_price()
        
        tenant = Tenant(
            name=data.company_name,
            slug=Tenant.generate_slug(data.company_name),
            owner_email=data.email,
            billing_email=data.email,
            status=TenantStatus.TRIAL.value,
            current_plan=plan.slug,
            max_users=plan.max_users
        )
        db.add(tenant)
        db.flush()
        
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=30 if data.billing_cycle == "monthly" else 365)
        
        subscription = Subscription(
            tenant_id=tenant.id,
            plan_id=plan.id,
            status=SubscriptionStatus.INCOMPLETE.value,
            current_period_start=start_date,
            current_period_end=end_date
        )
        db.add(subscription)
        db.flush()
        
        payment = PaymentHistory(
            tenant_id=tenant.id,
            subscription_id=subscription.id,
            amount=amount,
            currency="TRY",
            status=PaymentStatus.PENDING.value,
            description=f"Subscription to {plan.name} ({data.billing_cycle})"
        )
        db.add(payment)
        db.commit()
        
        session_token = _generate_session_token(payment.id)

        return ResponseEnvelope(data=CheckoutSessionResponse(
            success=True,
            checkout_url=f"/checkout/success?payment_id={payment.id}",
            payment_id=payment.id,
            session_token=session_token,
        ))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/confirm", operation_id="createCheckoutConfirm", response_model=ResponseEnvelope[PaymentConfirmResponse])
async def confirm_payment(data: PaymentConfirmRequest, request: Request, db: Session = Depends(get_db)):
    """Confirm payment"""
    try:
        _check_rate_limit(request)

        payment = db.get(PaymentHistory, data.payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        if payment.status == PaymentStatus.SUCCEEDED.value:
            return ResponseEnvelope(data=PaymentConfirmResponse(success=True, message="Already paid"))

        # Verify session token to prevent unauthorized confirmation
        session_token = getattr(data, 'session_token', None) or request.headers.get("x-checkout-session-token")
        if not session_token or not _verify_session_token(payment.id, session_token):
            raise HTTPException(status_code=403, detail="Invalid or missing session token")

        # Verify payment is still in PENDING status (not already failed/cancelled)
        if payment.status != PaymentStatus.PENDING.value:
            raise HTTPException(status_code=400, detail=f"Payment cannot be confirmed in status: {payment.status}")

        payment.status = PaymentStatus.SUCCEEDED.value
        payment.paid_at = datetime.utcnow()

        # Clean up used session token
        _CHECKOUT_SESSION_TOKENS.pop(payment.id, None)
        
        subscription = db.get(Subscription, payment.subscription_id)
        if subscription:
            subscription.status = SubscriptionStatus.ACTIVE.value
        
        tenant = db.get(Tenant, payment.tenant_id)
        if tenant:
            tenant.status = TenantStatus.ACTIVE.value
            
            existing_user = db.query(User).filter_by(email=tenant.owner_email).first()
            if not existing_user:
                temp_password = f"Welcome{uuid.uuid4().hex[:6]}"
                new_user = User(
                    username=tenant.owner_email.split("@")[0],
                    email=tenant.owner_email,
                    tenant_id=tenant.id,
                    role="admin"
                )
                new_user.set_password(temp_password)
                db.add(new_user)
        
        db.commit()
        return ResponseEnvelope(data=PaymentConfirmResponse(success=True, message="Payment confirmed and tenant activated"))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
