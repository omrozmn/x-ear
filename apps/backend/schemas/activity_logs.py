"""
Activity Log Schemas - Pydantic models for Activity Log domain
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin


class ActivityLogBase(AppBaseModel):
    """Base activity log schema"""
    action: str = Field(..., description="Action type")
    entity_type: Optional[str] = Field(None, alias="entityType", description="Entity type")
    entity_id: Optional[str] = Field(None, alias="entityId", description="Entity ID")
    message: Optional[str] = Field(None, description="Log message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")
    is_critical: bool = Field(False, alias="isCritical", description="Is critical action")


class ActivityLogCreate(ActivityLogBase):
    """Schema for creating an activity log"""
    user_id: Optional[str] = Field(None, alias="userId")
    tenant_id: Optional[str] = Field(None, alias="tenantId")


class ActivityLogRead(ActivityLogBase, IDMixin, TimestampMixin):
    """Schema for reading an activity log"""
    user_id: Optional[str] = Field(None, alias="userId")
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    
    # Enriched fields
    user_name: Optional[str] = Field(None, alias="userName")
    user_email: Optional[str] = Field(None, alias="userEmail")


class ActivityLogStats(AppBaseModel):
    """Activity log statistics"""
    total: int = Field(0, description="Total logs")
    last_24_hours: int = Field(0, alias="last24Hours", description="Logs in last 24 hours")
    critical: int = Field(0, description="Critical logs count")
    top_actions: List[Dict[str, Any]] = Field([], alias="topActions", description="Top actions")


# Type aliases for frontend compatibility
ActivityLog = ActivityLogRead
