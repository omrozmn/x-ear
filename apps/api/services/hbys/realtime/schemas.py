"""
Notification & Realtime Service Schemas (Pydantic v2)
Full CRUD schemas for clinical notifications and notification preferences.
"""
from datetime import datetime, time
from typing import Optional, List

from pydantic import Field

from schemas.base import AppBaseModel


# ─── Notification Type / Channel / Priority constants ─────────────────────────

NOTIFICATION_TYPES = [
    "critical_lab", "panic_value", "vital_alert", "medication_due",
    "nurse_call", "code_blue", "consultation_request",
    "bed_ready", "discharge_ready", "surgery_ready",
]

PRIORITY_LEVELS = ["low", "medium", "high", "critical"]

TARGET_TYPES = ["user", "role", "ward", "all"]

CHANNELS = ["websocket", "push", "sms", "email", "pager"]

STATUS_VALUES = ["pending", "sent", "delivered", "read", "expired"]


# ─── Clinical Notification Schemas ───────────────────────────────────────────


class NotificationCreate(AppBaseModel):
    """Schema for creating a notification via API."""
    notification_type: str = Field(..., description="One of: " + ", ".join(NOTIFICATION_TYPES))
    priority: str = Field("medium", description="low / medium / high / critical")
    title: str = Field(..., max_length=255)
    message: str
    data: Optional[str] = Field(None, description="JSON-encoded additional payload")
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    patient_id: Optional[str] = None
    target_type: str = Field("user", description="user / role / ward / all")
    target_id: Optional[str] = None
    channel: str = Field("websocket", description="websocket / push / sms / email / pager")
    expires_at: Optional[datetime] = None


class NotificationRead(AppBaseModel):
    """Full notification representation."""
    id: str
    notification_type: str
    priority: str
    title: str
    message: str
    data: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    patient_id: Optional[str] = None
    target_type: str
    target_id: Optional[str] = None
    status: str
    sent_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    read_by: Optional[str] = None
    expires_at: Optional[datetime] = None
    channel: str
    tenant_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class NotificationListResponse(AppBaseModel):
    """Paginated notification list."""
    items: List[NotificationRead] = Field(default_factory=list)
    total: int = 0
    unread_count: int = 0


class NotificationMarkRead(AppBaseModel):
    """Schema for marking a single notification as read."""
    read_by: Optional[str] = Field(None, description="User ID who read it (auto-filled from auth)")


class NotificationMarkAllRead(AppBaseModel):
    """Schema for marking all notifications as read for a user."""
    user_id: Optional[str] = Field(None, description="User ID (auto-filled from auth)")


# ─── Code Blue Schemas ────────────────────────────────────────────────────────


class CodeBlueRequest(AppBaseModel):
    """Schema for triggering a Code Blue alert."""
    location: str = Field(..., max_length=255, description="Physical location of the emergency")
    patient_id: Optional[str] = None
    ward_id: Optional[str] = None
    notes: Optional[str] = None


class CodeBlueResponse(AppBaseModel):
    """Response after Code Blue activation."""
    notification_id: str
    location: str
    status: str = "broadcast"
    connections_notified: int = 0


# ─── Notification Preference Schemas ─────────────────────────────────────────


class PreferenceCreate(AppBaseModel):
    """Create or update a notification preference."""
    notification_type: str = Field(..., description="One of: " + ", ".join(NOTIFICATION_TYPES))
    channel: str = Field("websocket", description="websocket / push / sms / email / pager")
    is_enabled: bool = True
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None


class PreferenceUpdate(AppBaseModel):
    """Partial update for a notification preference."""
    is_enabled: Optional[bool] = None
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None


class PreferenceRead(AppBaseModel):
    """Full notification preference representation."""
    id: str
    user_id: str
    notification_type: str
    channel: str
    is_enabled: bool
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None
    tenant_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PreferenceListResponse(AppBaseModel):
    """List of notification preferences for a user."""
    items: List[PreferenceRead] = Field(default_factory=list)
    total: int = 0


# ─── WebSocket Message Schemas ───────────────────────────────────────────────


class WSAuthMessage(AppBaseModel):
    """Expected first message from WebSocket client for authentication."""
    type: str = Field("auth", description="Message type, must be 'auth'")
    token: str = Field(..., description="JWT access token")
    ward_id: Optional[str] = Field(None, description="Ward the user is currently working in")


class WSNotificationMessage(AppBaseModel):
    """Notification payload sent over WebSocket to clients."""
    type: str = "notification"
    notification_id: str
    notification_type: str
    priority: str
    title: str
    message: str
    data: Optional[str] = None
    patient_id: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    timestamp: Optional[datetime] = None


class SendNotificationRequest(AppBaseModel):
    """Manual notification send request from API."""
    notification_type: str = Field(..., description="One of: " + ", ".join(NOTIFICATION_TYPES))
    priority: str = Field("medium")
    title: str = Field(..., max_length=255)
    message: str
    data: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    patient_id: Optional[str] = None
    target_type: str = Field("user")
    target_id: Optional[str] = None
    channel: str = Field("websocket")
    expires_at: Optional[datetime] = None
