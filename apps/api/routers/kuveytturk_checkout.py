"""
Kuveyt Turk 3D Secure Checkout Router

Flow:
  1. POST /api/payments/kuveytturk/initiate   → returns HTML for 3D redirect
  2. POST /api/payments/kuveytturk/callback/ok  → OkUrl: parse, provision, redirect
  3. POST /api/payments/kuveytturk/callback/fail → FailUrl: redirect with error
"""

import html as html_module
import logging
import os
import json
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments/kuveytturk", tags=["KuveytTurk POS"])

# ─── In-memory order store (use Redis in production) ────────────
_pending_orders: dict = {}


# ─── Schemas ────────────────────────────────────────────────────

class InitiatePaymentRequest(BaseModel):
    card_number: str
    card_expire_month: str  # "06"
    card_expire_year: str   # "29"
    card_cvv: str
    card_holder_name: str
    plan_id: str
    billing_interval: str = "YEARLY"
    addon_ids: Optional[List[str]] = None
    sms_package_id: Optional[str] = None
    email: Optional[str] = ""
    phone: Optional[str] = ""
    company_name: Optional[str] = None
    sector: Optional[str] = None


# ─── Helpers ────────────────────────────────────────────────────

def _get_landing_url() -> str:
    return os.getenv("LANDING_URL", "http://localhost:3000")


def _get_api_url() -> str:
    return os.getenv("API_PUBLIC_URL", "http://localhost:5003")


# ─── Endpoints ──────────────────────────────────────────────────

@router.post("/initiate", operation_id="initiateKuveytTurkPayment")
async def initiate_payment(
    req: InitiatePaymentRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Phase 1: Collect card info, build XML, get 3D redirect HTML."""
    from services.kuveytturk_service import KuveytTurkService
    from models.plan import Plan
    from models.addon import AddOn
    from models.sms_package import SmsPackage

    # Calculate total amount
    plan = db.get(Plan, req.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    total_amount = float(plan.price) if plan.price else 0.0

    addon_ids = req.addon_ids or []
    if addon_ids:
        addons = db.query(AddOn).filter(AddOn.id.in_(addon_ids), AddOn.is_active == True).all()
        for addon in addons:
            total_amount += float(addon.price) if addon.price else 0.0

    sms_amount = 0.0
    if req.sms_package_id:
        sms_pkg = db.get(SmsPackage, req.sms_package_id)
        if sms_pkg:
            sms_amount = float(sms_pkg.price) if sms_pkg.price else 0.0
            total_amount += sms_amount

    if total_amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    # Get client IP
    client_ip = request.client.host if request.client else "127.0.0.1"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    service = KuveytTurkService()
    merchant_order_id = service.generate_order_id()

    api_url = _get_api_url()
    ok_url = f"{api_url}/api/payments/kuveytturk/callback/ok"
    fail_url = f"{api_url}/api/payments/kuveytturk/callback/fail"

    # Store order details for callback processing
    _pending_orders[merchant_order_id] = {
        "plan_id": req.plan_id,
        "billing_interval": req.billing_interval,
        "addon_ids": addon_ids,
        "sms_package_id": req.sms_package_id,
        "total_amount": total_amount,
        "amount_kurus": service.amount_to_kurus(total_amount),
        "email": req.email,
        "phone": req.phone,
        "company_name": req.company_name,
        "sector": req.sector,
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Auth token from header for callback user identification
        "auth_token": request.headers.get("authorization", "").replace("Bearer ", ""),
    }

    # Clean card number
    card_number = req.card_number.replace(" ", "").replace("'", "").replace("-", "")

    result = await service.initiate_3d_payment(
        card_number=card_number,
        card_expire_month=req.card_expire_month,
        card_expire_year=req.card_expire_year,
        card_cvv=req.card_cvv,
        card_holder_name=req.card_holder_name,
        amount=total_amount,
        merchant_order_id=merchant_order_id,
        ok_url=ok_url,
        fail_url=fail_url,
        client_ip=client_ip,
        email=req.email or "",
        phone=req.phone or "",
    )

    if not result["success"]:
        raise HTTPException(status_code=502, detail="Bank gateway error")

    return {
        "success": True,
        "data": {
            "html": result["html"],
            "merchant_order_id": merchant_order_id,
            "amount": total_amount,
        },
    }


@router.post("/callback/ok", response_class=HTMLResponse, include_in_schema=False)
async def callback_ok(
    request: Request,
    db: Session = Depends(get_db),
):
    """OkUrl callback from KuveytTurk after successful card validation.
    Receives form data with AuthenticationResponse.
    """
    from services.kuveytturk_service import KuveytTurkService

    form_data = await request.form()
    auth_response = form_data.get("AuthenticationResponse", "")

    if not auth_response:
        logger.error("OkUrl callback: no AuthenticationResponse")
        return _redirect_html(f"{_get_landing_url()}/checkout?error=no_response")

    service = KuveytTurkService()
    parsed = service.parse_callback_response(str(auth_response))

    response_code = parsed.get("response_code")
    md_value = parsed.get("md")
    merchant_order_id = parsed.get("merchant_order_id")

    logger.info(
        f"OkUrl callback: code={response_code} "
        f"msg={parsed.get('response_message')} "
        f"order={merchant_order_id}"
    )

    if response_code != "00" or not md_value:
        error_msg = parsed.get("response_message", "Card validation failed")
        return _redirect_html(
            f"{_get_landing_url()}/checkout?error={error_msg}"
        )

    # Get stored order
    order_data = _pending_orders.get(merchant_order_id)
    if not order_data:
        logger.error(f"OkUrl: order not found: {merchant_order_id}")
        return _redirect_html(f"{_get_landing_url()}/checkout?error=order_not_found")

    # Phase 2: Provision
    provision_result = await service.complete_provision(
        amount_kurus=order_data["amount_kurus"],
        merchant_order_id=merchant_order_id,
        md_value=md_value,
    )

    if not provision_result["success"]:
        error_msg = provision_result.get("response_message", "Provision failed")
        logger.error(f"Provision failed: {provision_result}")
        return _redirect_html(
            f"{_get_landing_url()}/checkout?error={error_msg}"
        )

    # Payment successful - create subscription
    try:
        _create_subscription(db, order_data, provision_result)
    except Exception as e:
        logger.error(f"Subscription creation failed after payment: {e}")
        # Payment was successful but subscription failed
        # Still redirect to success but log the error

    # Clean up
    _pending_orders.pop(merchant_order_id, None)

    order_id = provision_result.get("order_id", "")
    provision_number = provision_result.get("provision_number", "")

    return _redirect_html(
        f"{_get_landing_url()}/checkout/success"
        f"?payment_id={order_id}"
        f"&provision={provision_number}"
        f"&order={merchant_order_id}"
    )


@router.post("/callback/fail", response_class=HTMLResponse, include_in_schema=False)
async def callback_fail(
    request: Request,
):
    """FailUrl callback from KuveytTurk after failed card validation."""
    from services.kuveytturk_service import KuveytTurkService

    form_data = await request.form()
    auth_response = form_data.get("AuthenticationResponse", "")

    error_msg = "Payment failed"
    if auth_response:
        service = KuveytTurkService()
        parsed = service.parse_callback_response(str(auth_response))
        error_msg = parsed.get("response_message", "Payment failed")
        merchant_order_id = parsed.get("merchant_order_id")
        logger.warning(
            f"FailUrl callback: code={parsed.get('response_code')} "
            f"msg={error_msg} order={merchant_order_id}"
        )
        # Clean up pending order
        if merchant_order_id:
            _pending_orders.pop(merchant_order_id, None)

    return _redirect_html(
        f"{_get_landing_url()}/checkout?error={error_msg}"
    )


# ─── Subscription Creator ──────────────────────────────────────

def _create_subscription(db: Session, order_data: dict, provision_result: dict):
    """Create tenant subscription after successful payment."""
    from models.tenant import Tenant, TenantStatus
    from models.plan import Plan
    from models.user import User
    from models.sms_package import SmsPackage
    from core.models.subscription import Subscription, PaymentHistory

    auth_token = order_data.get("auth_token", "")
    user = None

    if auth_token:
        import jwt
        from core.security import get_jwt_secret, JWT_ALGORITHM
        try:
            payload = jwt.decode(auth_token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                user = db.get(User, user_id)
        except Exception as e:
            logger.warning(f"Failed to decode token in callback: {e}")

    if not user:
        logger.warning("No user found for payment callback - subscription not created")
        return

    plan = db.get(Plan, order_data["plan_id"])
    if not plan:
        logger.error(f"Plan not found: {order_data['plan_id']}")
        return

    # Get or create tenant
    tenant = None
    if user.tenant_id:
        tenant = db.get(Tenant, user.tenant_id)

    if not tenant:
        company_name = order_data.get("company_name") or f"{user.username}'s Business"
        tenant = Tenant(
            name=company_name,
            slug=Tenant.generate_slug(company_name),
            owner_email=user.email or f"{user.phone}@mobile.x-ear.com",
            billing_email=user.email or f"{user.phone}@mobile.x-ear.com",
            status=TenantStatus.ACTIVE.value,
        )
        if order_data.get("sector"):
            tenant.sector = order_data["sector"]
        db.add(tenant)
        db.flush()
        user.tenant_id = tenant.id
        user.role = "tenant_admin"

    # Set subscription dates
    start_date = datetime.now(timezone.utc)
    if order_data["billing_interval"] == "YEARLY":
        end_date = start_date + timedelta(days=365)
    else:
        end_date = start_date + timedelta(days=30)

    tenant.current_plan_id = plan.id
    tenant.current_plan = plan.slug
    tenant.subscription_start_date = start_date
    tenant.subscription_end_date = end_date
    tenant.status = TenantStatus.ACTIVE.value

    # Feature usage init
    feature_usage = tenant.feature_usage or {}
    if plan.features and isinstance(plan.features, list):
        for feature in plan.features:
            if isinstance(feature, dict):
                key = feature.get("key")
                limit = feature.get("limit", 0)
                if key:
                    feature_usage[key] = {
                        "limit": limit,
                        "used": 0,
                        "last_reset": start_date.isoformat(),
                    }

    # SMS Package
    if order_data.get("sms_package_id"):
        sms_pkg = db.get(SmsPackage, order_data["sms_package_id"])
        if sms_pkg:
            current_credits = feature_usage.get("sms_credits", 0)
            if isinstance(current_credits, dict):
                current_credits = current_credits.get("limit", 0)
            feature_usage["sms_credits"] = current_credits + sms_pkg.sms_count

    tenant.feature_usage = feature_usage
    flag_modified(tenant, "feature_usage")

    # Create payment history record
    try:
        payment = PaymentHistory(
            tenant_id=tenant.id,
            amount=order_data["total_amount"],
            currency="TRY",
            status="SUCCEEDED",
            provider_payment_id=provision_result.get("order_id"),
            payment_method="kuveytturk_3d",
        )
        db.add(payment)
    except Exception as e:
        logger.warning(f"Failed to create payment history: {e}")

    # Referral commission
    if tenant.affiliate_id and plan.price and float(plan.price) > 0:
        try:
            from services.commission_service import CommissionService
            commission_amount = float(plan.price) * 0.10
            CommissionService.create_commission(
                db=db,
                affiliate_id=tenant.affiliate_id,
                tenant_id=tenant.id,
                event="signup_subscription",
                amount=commission_amount,
            )
        except Exception as e:
            logger.error(f"Failed to create commission: {e}")

    db.commit()
    logger.info(
        f"Subscription created: tenant={tenant.id} plan={plan.slug} "
        f"order={provision_result.get('order_id')}"
    )


# ─── HTML Redirect Helper ──────────────────────────────────────

def _redirect_html(url: str) -> HTMLResponse:
    """Return an HTML page that redirects via JavaScript (needed because
    bank POSTs to our callback, and we can't 302-redirect a POST)."""
    safe_url = html_module.escape(url, quote=True)
    return HTMLResponse(
        content=f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecting...</title></head>
<body>
<p>Redirecting...</p>
<script>window.location.href = "{safe_url}";</script>
</body>
</html>""",
        status_code=200,
    )
