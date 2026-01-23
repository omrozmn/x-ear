"""
Audit Schemas - Pydantic models for ActivityLog domain
"""
from typing import Optional, Any
from datetime import datetime
from pydantic import Field, ConfigDict
from .base import AppBaseModel, IDMixin, TimestampMixin


class AuditLogRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading an activity log entry - matches ActivityLog.to_dict() output"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    user_id: Optional[str] = Field(None, alias="userId")
    real_user_id: Optional[str] = Field(None, alias="realUserId")
    role: Optional[str] = None
    action: str
    message: Optional[str] = None
    entity_type: Optional[str] = Field(None, alias="entityType")
    entity_id: Optional[str] = Field(None, alias="entityId")
    data: Optional[Any] = None
    ip_address: Optional[str] = Field(None, alias="ipAddress")
    user_agent: Optional[str] = Field(None, alias="userAgent")
    details: Optional[str] = None  # Deprecated
    is_critical: bool = Field(False, alias="isCritical")
    # Optional user details if joined
    user_name: Optional[str] = Field(None, alias="userName")
    user_email: Optional[str] = Field(None, alias="userEmail")

