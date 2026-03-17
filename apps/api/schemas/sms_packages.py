"""
SMS Package Schemas - Pydantic models for SMS Package domain
"""
from typing import Optional
from decimal import Decimal
from pydantic import Field, ConfigDict
from .base import AppBaseModel, IDMixin, TimestampMixin


class DetailedSmsPackageRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading an SMS package - matches SmsPackage.to_dict() output"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    name: str
    description: Optional[str] = None
    sms_count: int = Field(..., alias="smsCount")
    price: Decimal
    currency: str = Field("TRY", description="Currency code")
    country_code: Optional[str] = Field(None, alias="countryCode", description="ISO 3166-1 alpha-2 country code")
    is_active: bool = Field(True, alias="isActive")
