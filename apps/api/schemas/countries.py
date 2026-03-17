"""
Country Schemas - Pydantic models for Country domain
"""
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import Field
from .base import AppBaseModel, TimestampMixin


class CountryRead(AppBaseModel, TimestampMixin):
    """Schema for reading a country"""
    code: str = Field(..., description="ISO 3166-1 alpha-2 code")
    name: str = Field(..., description="Country name in English")
    native_name: Optional[str] = Field(None, alias="nativeName", description="Country name in native language")
    enabled: bool = Field(False, description="Is this country enabled?")
    creatable: bool = Field(False, description="Can new tenants be created for this country?")
    currency_code: str = Field(..., alias="currencyCode", description="ISO 4217 currency code")
    locale: str = Field(..., description="Locale string e.g. tr-TR")
    timezone: str = Field(..., description="IANA timezone e.g. Europe/Istanbul")
    phone_prefix: str = Field(..., alias="phonePrefix", description="Phone prefix e.g. +90")
    flag_emoji: Optional[str] = Field(None, alias="flagEmoji", description="Flag emoji")
    date_format: Optional[str] = Field(None, alias="dateFormat", description="Date format pattern")
    config: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Country-specific config")
    sort_order: int = Field(0, alias="sortOrder")


class CountryUpdate(AppBaseModel):
    """Schema for updating a country"""
    enabled: Optional[bool] = None
    creatable: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None
    sort_order: Optional[int] = Field(None, alias="sortOrder")
    date_format: Optional[str] = Field(None, alias="dateFormat")
    native_name: Optional[str] = Field(None, alias="nativeName")
