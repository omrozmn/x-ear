"""
Addon Schemas - Pydantic models for Addon domain
"""
from typing import Optional, List
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin


class AddonBase(AppBaseModel):
    """Base addon schema"""
    name: str = Field(..., description="Addon name")
    slug: Optional[str] = Field(None, description="Addon slug")
    description: Optional[str] = Field(None, description="Addon description")
    addon_type: str = Field("FLAT_FEE", alias="addonType", description="Addon type (PER_USER, FLAT_FEE, USAGE_BASED)")
    price: float = Field(..., description="Addon price")
    currency: str = Field("TRY", description="Currency")
    unit_name: Optional[str] = Field(None, alias="unitName", description="Unit name")
    limit_amount: Optional[int] = Field(None, alias="limitAmount", description="Limit amount")
    sector: Optional[str] = Field(None, description="Sector code (hearing, pharmacy, hospital, etc.)")
    country_code: Optional[str] = Field(None, alias="countryCode", description="ISO 3166-1 alpha-2 country code")
    is_active: bool = Field(True, alias="isActive", description="Is addon active")
    features: Optional[List] = Field(default_factory=list, description="Addon features")


class AddonCreate(AddonBase):
    """Schema for creating an addon"""
    pass


class AddonUpdate(AppBaseModel):
    """Schema for updating an addon"""
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    addon_type: Optional[str] = Field(None, alias="addonType")
    price: Optional[float] = None
    currency: Optional[str] = None
    unit_name: Optional[str] = Field(None, alias="unitName")
    limit_amount: Optional[int] = Field(None, alias="limitAmount")
    sector: Optional[str] = None
    country_code: Optional[str] = Field(None, alias="countryCode")
    is_active: Optional[bool] = Field(None, alias="isActive")


class AddonRead(AddonBase, IDMixin, TimestampMixin):
    """Schema for reading an addon"""
    tenant_count: int = Field(0, alias="tenantCount", description="Number of tenants using this addon")


# Type aliases for frontend compatibility
AddOn = AddonRead
Addon = AddonRead  # Alternative alias
AddonInput = AddonCreate
