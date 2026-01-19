"""
Replacement Schemas - Pydantic models for Replacement domain
"""
from typing import Optional, Any
from datetime import datetime
from decimal import Decimal
from pydantic import Field, ConfigDict, field_validator
from .base import AppBaseModel, IDMixin, TimestampMixin
import json


class ReplacementRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading a replacement - matches Replacement.to_dict() output"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    party_id: str = Field(..., alias="partyId")
    sale_id: Optional[str] = Field(None, alias="saleId")
    old_device_id: Optional[str] = Field(None, alias="oldDeviceId")
    new_device_id: Optional[str] = Field(None, alias="newDeviceId")
    old_device_info: Optional[Any] = Field(None, alias="oldDeviceInfo")
    new_device_info: Optional[Any] = Field(None, alias="newDeviceInfo")
    replacement_reason: Optional[str] = Field(None, alias="replacementReason")
    status: str = "pending"
    price_difference: Optional[Decimal] = Field(None, alias="priceDifference")
    return_invoice_id: Optional[str] = Field(None, alias="returnInvoiceId")
    return_invoice_status: Optional[str] = Field(None, alias="returnInvoiceStatus")
    gib_sent: bool = Field(False, alias="gibSent")
    gib_sent_date: Optional[datetime] = Field(None, alias="gibSentDate")
    created_by: Optional[str] = Field(None, alias="createdBy")
    notes: Optional[str] = None
    
    @field_validator('old_device_info', 'new_device_info', mode='before')
    @classmethod
    def parse_json_string(cls, v):
        """Parse JSON string to dict if needed"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return v
        return v

class ReplacementCreate(AppBaseModel):
    sale_id: Optional[str] = Field(None, alias="saleId")
    old_device_id: Optional[str] = Field(None, alias="oldDeviceId")
    new_inventory_id: Optional[str] = Field(None, alias="newInventoryId")
    old_device_info: Optional[dict] = Field(None, alias="oldDeviceInfo")
    new_device_info: Optional[dict] = Field(None, alias="newDeviceInfo")
    replacement_reason: Optional[str] = Field(None, alias="replacementReason")
    price_difference: Optional[float] = Field(None, alias="priceDifference")
    notes: Optional[str] = None
    created_by: Optional[str] = Field(None, alias="createdBy")

class ReplacementStatusUpdate(AppBaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class ReplacementInvoiceCreate(AppBaseModel):
    invoice_type: Optional[str] = Field("return", alias="invoiceType")
    notes: Optional[str] = None

class ReplacementInvoiceResponse(AppBaseModel):
    invoice: dict
    replacement: ReplacementRead
