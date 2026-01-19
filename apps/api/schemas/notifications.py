"""
Notification Schemas
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

from schemas.base import AppBaseModel, IDMixin, TimestampMixin


class NotificationType(str, Enum):
    """Notification types"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"


class NotificationChannel(str, Enum):
    """Notification channels"""
    PUSH = "push"
    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"


class NotificationBase(AppBaseModel):
    """Base Notification schema"""
    title: str
    message: str
    notification_type: Optional[str] = Field("info", alias="notificationType")


class Notification(AppBaseModel, IDMixin, TimestampMixin):
    """Full Notification schema"""
    user_id: str = Field(..., alias="userId")
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    title: str
    message: str
    notification_type: str = Field(..., alias="notificationType")
    is_read: bool = Field(False, alias="isRead")
    read_at: Optional[datetime] = Field(None, alias="readAt")
    data: Optional[dict] = None


class NotificationStats(AppBaseModel):
    """Notification statistics"""
    total: int
    unread: int
    read: int


class NotificationSettings(AppBaseModel):
    """Notification settings"""
    email_enabled: bool = Field(True, alias="emailEnabled")
    push_enabled: bool = Field(True, alias="pushEnabled")
    sms_enabled: bool = Field(False, alias="smsEnabled")


class NotificationUpdate(AppBaseModel):
    """Schema for updating Notification"""
    is_read: Optional[bool] = Field(None, alias="isRead")
    read_at: Optional[datetime] = Field(None, alias="readAt")


class NotificationRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading Notification - replaces to_dict()"""
    user_id: Optional[str] = Field(None, alias="userId")
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    title: str
    message: str
    notification_type: Optional[str] = Field(None, alias="notificationType")
    is_read: Optional[bool] = Field(None, alias="isRead")
    read_at: Optional[datetime] = Field(None, alias="readAt")
    data: Optional[dict] = None


class NotificationTemplateRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading NotificationTemplate - replaces to_dict()"""
    name: Optional[str] = None
    description: Optional[str] = None
    title_template: Optional[str] = Field(None, alias="titleTemplate")
    body_template: Optional[str] = Field(None, alias="bodyTemplate")
    channel: Optional[str] = None
    variables: Optional[List[str]] = None
    email_from_name: Optional[str] = Field(None, alias="emailFromName")
    email_from_address: Optional[str] = Field(None, alias="emailFromAddress")
    email_to_type: Optional[str] = Field(None, alias="emailToType")
    email_to_addresses: Optional[str] = Field(None, alias="emailToAddresses")
    email_subject: Optional[str] = Field(None, alias="emailSubject")
    email_body_html: Optional[str] = Field(None, alias="emailBodyHtml")
    email_body_text: Optional[str] = Field(None, alias="emailBodyText")
    trigger_event: Optional[str] = Field(None, alias="triggerEvent")
    trigger_conditions: Optional[str] = Field(None, alias="triggerConditions")
    template_category: Optional[str] = Field(None, alias="templateCategory")
    is_active: Optional[bool] = Field(None, alias="isActive")


class NotificationCreate(AppBaseModel):
    """Schema for creating Notification"""
    user_id: str = Field(..., alias="userId")
    title: str
    message: str
    notification_type: Optional[str] = Field("info", alias="notificationType")
    data: Optional[dict] = None


class NotificationTemplateCreate(AppBaseModel):
    """Schema for creating NotificationTemplate"""
    name: str
    description: Optional[str] = None
    title_template: Optional[str] = Field(None, alias="titleTemplate")
    body_template: Optional[str] = Field(None, alias="bodyTemplate")
    channel: Optional[str] = "push"
    variables: Optional[List[str]] = []
    email_from_name: Optional[str] = Field(None, alias="emailFromName")
    email_from_address: Optional[str] = Field(None, alias="emailFromAddress")
    email_to_type: Optional[str] = Field(None, alias="emailToType")
    email_to_addresses: Optional[str] = Field(None, alias="emailToAddresses")
    email_subject: Optional[str] = Field(None, alias="emailSubject")
    email_body_html: Optional[str] = Field(None, alias="emailBodyHtml")
    email_body_text: Optional[str] = Field(None, alias="emailBodyText")
    trigger_event: Optional[str] = Field("manual", alias="triggerEvent")
    trigger_conditions: Optional[str] = Field(None, alias="triggerConditions")
    template_category: Optional[str] = Field("platform_announcement", alias="templateCategory")
    is_active: Optional[bool] = Field(True, alias="isActive")