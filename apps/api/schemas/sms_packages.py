"""
SMS Package Schemas - Pydantic models for SMS Package domain
"""
from typing import Optional
from decimal import Decimal
from pydantic import Field, ConfigDict
from .base import AppBaseModel, IDMixin, TimestampMixin


class SmsPackageRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading an SMS package - matches SmsPackage.to_dict() output"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    name: str
    description: Optional[str] = None
    sms_count: int = Field(..., alias="smsCount")
    price: Decimal
    is_active: bool = Field(True, alias="isActive")
