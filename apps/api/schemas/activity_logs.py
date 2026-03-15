"""
Activity Log Schemas - Pydantic models for Activity Log domain
"""
from typing import Optional, List, Dict, Any
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin


class ActivityLogBase(AppBaseModel):
    """Base activity log schema"""
    action: str = Field(..., description="Action type")
    entity_type: Optional[str] = Field(None, alias="entityType", description="Entity type")
    entity_id: Optional[str] = Field(None, alias="entityId", description="Entity ID")
    message: Optional[str] = Field(None, description="Log message")
    details: Optional[Dict[str, Any] | str] = Field(None, description="Additional details (dict or string)")
    is_critical: bool = Field(False, alias="isCritical", description="Is critical action")


class ActivityLogCreate(ActivityLogBase):
    """Schema for creating an activity log"""
    user_id: Optional[str] = Field(None, alias="userId")
    tenant_id: Optional[str] = Field(None, alias="tenantId")


class ActivityLogRead(ActivityLogBase, IDMixin, TimestampMixin):
    """Schema for reading an activity log"""
    user_id: Optional[str] = Field(None, alias="userId")
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    branch_name: Optional[str] = Field(None, alias="branchName")
    role: Optional[str] = None
    data: Optional[Dict[str, Any] | str] = None
    ip_address: Optional[str] = Field(None, alias="ipAddress")
    user_agent: Optional[str] = Field(None, alias="userAgent")
    
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
