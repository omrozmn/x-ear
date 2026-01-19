"""
System Setting Schemas
"""
from typing import Optional
from pydantic import Field, ConfigDict
from .base import AppBaseModel, TimestampMixin


class SystemSettingRead(AppBaseModel, TimestampMixin):
    """Schema for reading SystemSetting"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    key: str
    value: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_public: bool = Field(False, alias="isPublic")

class SystemSettingsResponse(AppBaseModel):
    settings: dict

class PricingSettingsResponse(AppBaseModel):
    devices: dict
    accessories: dict
    services: dict
