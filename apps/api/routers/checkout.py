"""Checkout Router - FastAPI"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
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

@router.post("/session", operation_id="createCheckoutSession", response_model=ResponseEnvelope[CheckoutSessionResponse])
async def create_checkout_session(data: CheckoutSessionCreate, db: Session = Depends(get_db)):
    """Create checkout session for plan purchase"""
    try:
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
        
        return ResponseEnvelope(data=CheckoutSessionResponse(
            success=True,
            checkout_url=f"/checkout/success?payment_id={payment.id}",
            payment_id=payment.id
        ))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/confirm", operation_id="createCheckoutConfirm", response_model=ResponseEnvelope[PaymentConfirmResponse])
async def confirm_payment(data: PaymentConfirmRequest, db: Session = Depends(get_db)):
    """Confirm payment"""
    try:
        payment = db.get(PaymentHistory, data.payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        if payment.status == PaymentStatus.SUCCEEDED.value:
            return ResponseEnvelope(data=PaymentConfirmResponse(success=True, message="Already paid"))
        
        payment.status = PaymentStatus.SUCCEEDED.value
        payment.paid_at = datetime.utcnow()
        
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
