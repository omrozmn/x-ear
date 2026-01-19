"""
App Schemas
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

from schemas.base import AppBaseModel, IDMixin, TimestampMixin


class AppRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading App - replaces to_dict()"""
    name: str
    slug: str
    description: Optional[str] = None
    is_active: Optional[bool] = Field(None, alias="isActive")


class AppCreate(AppBaseModel):
    """Schema for creating App"""
    name: str
    slug: str
    description: Optional[str] = None


class AppUpdate(AppBaseModel):
    """Schema for updating App"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = Field(None, alias="isActive")