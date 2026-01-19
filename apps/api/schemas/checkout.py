"""
Checkout Schemas
"""
from typing import Optional
from pydantic import Field
from .base import AppBaseModel

class CheckoutSessionCreate(AppBaseModel):
    plan_id: str = Field(..., alias="planId")
    billing_cycle: Optional[str] = Field("monthly", alias="billingCycle")
    company_name: str = Field(..., alias="companyName")
    email: str
    phone: Optional[str] = None

class CheckoutSessionResponse(AppBaseModel):
    success: bool
    checkout_url: str = Field(..., alias="checkoutUrl")
    payment_id: str = Field(..., alias="paymentId")

class PaymentConfirmRequest(AppBaseModel):
    payment_id: str = Field(..., alias="paymentId")

class PaymentConfirmResponse(AppBaseModel):
    success: bool
    message: str
