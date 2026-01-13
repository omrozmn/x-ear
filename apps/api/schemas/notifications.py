"""
Notification Schemas - Pydantic models for Notification domain
"""
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin


class NotificationType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"
    REMINDER = "reminder"


class NotificationChannel(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"


class NotificationBase(AppBaseModel):
    """Base notification schema"""
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    type: NotificationType = Field(NotificationType.INFO, description="Notification type")
    channel: NotificationChannel = Field(NotificationChannel.IN_APP, description="Notification channel")
    
    # Target
    user_id: Optional[str] = Field(None, alias="userId", description="Target user ID")
    
    # Metadata
    action_url: Optional[str] = Field(None, alias="actionUrl", description="Action URL")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional data")


class NotificationCreate(NotificationBase):
    """Schema for creating a notification"""
    pass


class NotificationUpdate(AppBaseModel):
    """Schema for updating a notification"""
    is_read: Optional[bool] = Field(None, alias="isRead")


class NotificationRead(NotificationBase, IDMixin, TimestampMixin):
    """Schema for reading a notification"""
    tenant_id: str = Field(..., alias="tenantId")
    is_read: bool = Field(False, alias="isRead", description="Is notification read")
    read_at: Optional[datetime] = Field(None, alias="readAt", description="Read timestamp")


class NotificationStats(AppBaseModel):
    """Notification statistics"""
    total: int = Field(0, description="Total notifications")
    unread: int = Field(0, description="Unread notifications")
    by_type: Dict[str, int] = Field({}, alias="byType", description="Count by type")


class NotificationSettings(AppBaseModel):
    """User notification settings"""
    user_id: str = Field(..., alias="userId")
    preferences: Optional[Dict[str, Any]] = Field(None, description="User preferences")
    settings: Optional[Dict[str, Any]] = Field(None, description="Notification settings")


# Type aliases for frontend compatibility
Notification = NotificationRead
