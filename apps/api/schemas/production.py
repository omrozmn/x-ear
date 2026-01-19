"""
Production Schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import Field, ConfigDict
from .base import AppBaseModel, IDMixin, TimestampMixin


class ProductionOrderRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading ProductionOrder"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    tenant_id: str = Field(..., alias="tenantId")
    party_id: str = Field(..., alias="partyId")
    order_number: str = Field(..., alias="orderNumber")
    product_type: Optional[str] = Field(None, alias="productType")
    status: str
    manufacturer: Optional[str] = None
    estimated_delivery_date: Optional[datetime] = Field(None, alias="estimatedDeliveryDate")
    notes: Optional[str] = None
