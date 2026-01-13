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
    addon_type: str = Field("FEATURE", alias="addonType", description="Addon type")
    price: float = Field(..., description="Addon price")
    currency: str = Field("TRY", description="Currency")
    unit_name: Optional[str] = Field(None, alias="unitName", description="Unit name")
    limit_amount: Optional[int] = Field(None, alias="limitAmount", description="Limit amount")
    is_active: bool = Field(True, alias="isActive", description="Is addon active")


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
    is_active: Optional[bool] = Field(None, alias="isActive")


class AddonRead(AddonBase, IDMixin, TimestampMixin):
    """Schema for reading an addon"""
    tenant_count: int = Field(0, alias="tenantCount", description="Number of tenants using this addon")


# Type aliases for frontend compatibility
AddOn = AddonRead
Addon = AddonRead  # Alternative alias
AddonInput = AddonCreate
