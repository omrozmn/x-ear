"""
Payment Integrations Schemas
"""
from typing import Optional
from pydantic import Field
from .base import AppBaseModel

class PayTRConfigRead(AppBaseModel):
    merchant_id: Optional[str] = Field(None, alias="merchantId")
    merchant_key_masked: str = Field(..., alias="merchantKeyMasked")
    merchant_salt_masked: str = Field(..., alias="merchantSaltMasked")
    test_mode: bool = Field(False, alias="testMode")
    enabled: bool = False

class PayTRInitiateResponse(AppBaseModel):
    token: str
    iframe_url: str = Field(..., alias="iframeUrl")
    payment_record_id: str = Field(..., alias="paymentRecordId")
