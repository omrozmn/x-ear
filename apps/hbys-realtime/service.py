"""
Notification & Realtime Service - Business logic.
Handles notification dispatch, preference checking, WebSocket coordination,
and CRUD operations for notifications and preferences.
"""
import json
import logging
from datetime import datetime, time, timezone
from typing import Optional, List

from sqlalchemy import and_
from sqlalchemy.orm import Session

from hbys_common.database import gen_id
from models.clinical_notification import ClinicalNotification
from models.notification_preference import NotificationPreference
from ws.connection_manager import manager
from schemas import (
    NotificationCreate,
    NotificationRead,
    NotificationListResponse,
    PreferenceCreate,
    PreferenceUpdate,
    PreferenceRead,
    PreferenceListResponse,
    WSNotificationMessage,
)

logger = logging.getLogger(__name__)


# ─── Preference Checking ─────────────────────────────────────────────────────


def _is_in_quiet_hours(start: Optional[time], end: Optional[time]) -> bool:
    """Check if current time falls within quiet hours window."""
    if not start or not end:
        return False
    now_time = datetime.now(timezone.utc).time()
    if start <= end:
        # e.g. 22:00 - 06:00 does NOT apply here; 08:00 - 17:00 does
        return start <= now_time <= end
    else:
        # Overnight range: e.g. 22:00 - 06:00
        return now_time >= start or now_time <= end


def check_user_preference(
    db: Session,
    user_id: str,
    tenant_id: str,
    notification_type: str,
    channel: str = "websocket",
) -> bool:
    """
    Check if a user has enabled notifications for a given type + channel,
    and that current time is not in quiet hours.

    Returns True if notification should be delivered, False to suppress.
    If no preference exists, defaults to True (deliver).
    """
    pref = (
        db.query(NotificationPreference)
        .filter(
            NotificationPreference.user_id == user_id,
            NotificationPreference.tenant_id == tenant_id,
            NotificationPreference.notification_type == notification_type,
            NotificationPreference.channel == channel,
        )
        .first()
    )

    if pref is None:
        # No explicit preference -> allow delivery
        return True

    if not pref.is_enabled:
        return False

    if _is_in_quiet_hours(pref.quiet_hours_start, pref.quiet_hours_end):
        # Critical notifications bypass quiet hours
        if notification_type in ("code_blue", "critical_lab", "panic_value"):
            return True
        return False

    return True


# ─── Notification Dispatch ────────────────────────────────────────────────────


async def dispatch_notification(
    db: Session,
    notification: ClinicalNotification,
) -> int:
    """
    Dispatch a notification through WebSocket based on its target_type.
    Updates the notification status to 'sent' and records sent_at.

    Returns number of WebSocket connections that received the message.
    """
    payload = WSNotificationMessage(
        type="notification",
        notification_id=notification.id,
        notification_type=notification.notification_type,
        priority=notification.priority,
        title=notification.title,
        message=notification.message,
        data=notification.data,
        patient_id=notification.patient_id,
        source_type=notification.source_type,
        source_id=notification.source_id,
        timestamp=datetime.now(timezone.utc),
    ).model_dump(mode="json")

    sent_count = 0
    tenant_id = notification.tenant_id

    if notification.target_type == "user" and notification.target_id:
        # Check preference before sending
        should_send = check_user_preference(
            db,
            user_id=notification.target_id,
            tenant_id=tenant_id,
            notification_type=notification.notification_type,
            channel=notification.channel,
        )
        if should_send:
            sent_count = await manager.send_to_user(
                notification.target_id, payload, tenant_id=tenant_id
            )

    elif notification.target_type == "role" and notification.target_id:
        sent_count = await manager.send_to_role(
            notification.target_id, payload, tenant_id=tenant_id
        )

    elif notification.target_type == "ward" and notification.target_id:
        sent_count = await manager.send_to_ward(
            notification.target_id, payload, tenant_id=tenant_id
        )

    elif notification.target_type == "all":
        sent_count = await manager.broadcast_tenant(tenant_id, payload)

    # Update notification status only if at least one recipient received it
    if sent_count > 0:
        notification.status = "sent"
        notification.sent_at = datetime.now(timezone.utc)
    db.commit()

    logger.info(
        "Notification dispatched: id=%s type=%s target=%s/%s sent_to=%d",
        notification.id, notification.notification_type,
        notification.target_type, notification.target_id,
        sent_count,
    )
    return sent_count


async def create_and_dispatch(
    db: Session,
    data: NotificationCreate,
    tenant_id: str,
) -> tuple[ClinicalNotification, int]:
    """
    Create a notification record and immediately dispatch it via WebSocket.
    Returns (notification, sent_count).
    """
    notif = ClinicalNotification(
        id=gen_id("cno"),
        notification_type=data.notification_type,
        priority=data.priority,
        title=data.title,
        message=data.message,
        data=data.data,
        source_type=data.source_type,
        source_id=data.source_id,
        patient_id=data.patient_id,
        target_type=data.target_type,
        target_id=data.target_id,
        status="pending",
        expires_at=data.expires_at,
        channel=data.channel,
        tenant_id=tenant_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    sent_count = await dispatch_notification(db, notif)
    return notif, sent_count


# ─── Notification CRUD ────────────────────────────────────────────────────────


def list_notifications(
    db: Session,
    tenant_id: str,
    *,
    user_id: Optional[str] = None,
    notification_type: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> NotificationListResponse:
    """
    List notifications for a tenant, optionally filtered by user, type, status, priority.
    When user_id is given, returns notifications targeted to that user, their roles, or broadcast.
    """
    query = db.query(ClinicalNotification).filter(
        ClinicalNotification.tenant_id == tenant_id,
    )

    if user_id:
        query = query.filter(
            (ClinicalNotification.target_type == "all")
            | (
                (ClinicalNotification.target_type == "user")
                & (ClinicalNotification.target_id == user_id)
            )
        )

    if notification_type:
        query = query.filter(ClinicalNotification.notification_type == notification_type)

    if status:
        query = query.filter(ClinicalNotification.status == status)

    if priority:
        query = query.filter(ClinicalNotification.priority == priority)

    total = query.count()

    # Count unread
    unread_count = query.filter(
        ClinicalNotification.status.in_(["pending", "sent", "delivered"])
    ).count()

    items = (
        query
        .order_by(ClinicalNotification.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return NotificationListResponse(
        items=[NotificationRead.model_validate(i) for i in items],
        total=total,
        unread_count=unread_count,
    )


def get_notification(
    db: Session, notification_id: str, tenant_id: str
) -> Optional[ClinicalNotification]:
    """Get a single notification by ID."""
    return (
        db.query(ClinicalNotification)
        .filter(
            ClinicalNotification.id == notification_id,
            ClinicalNotification.tenant_id == tenant_id,
        )
        .first()
    )


def mark_notification_read(
    db: Session,
    notification_id: str,
    tenant_id: str,
    read_by: str,
) -> Optional[ClinicalNotification]:
    """Mark a notification as read."""
    notif = get_notification(db, notification_id, tenant_id)
    if not notif:
        return None

    notif.status = "read"
    notif.read_at = datetime.now(timezone.utc)
    notif.read_by = read_by
    db.commit()
    db.refresh(notif)
    logger.info("Notification read: id=%s by=%s", notification_id, read_by)
    return notif


def mark_all_read(
    db: Session,
    tenant_id: str,
    user_id: str,
) -> int:
    """Mark all pending/sent/delivered notifications as read for a user. Returns count."""
    count = (
        db.query(ClinicalNotification)
        .filter(
            ClinicalNotification.tenant_id == tenant_id,
            ClinicalNotification.status.in_(["pending", "sent", "delivered"]),
            (
                (ClinicalNotification.target_type == "all")
                | (
                    (ClinicalNotification.target_type == "user")
                    & (ClinicalNotification.target_id == user_id)
                )
            ),
        )
        .update(
            {
                ClinicalNotification.status: "read",
                ClinicalNotification.read_at: datetime.now(timezone.utc),
                ClinicalNotification.read_by: user_id,
            },
            synchronize_session="fetch",
        )
    )
    db.commit()
    logger.info("Marked %d notifications read for user=%s", count, user_id)
    return count


# ─── Preference CRUD ─────────────────────────────────────────────────────────


def list_preferences(
    db: Session,
    user_id: str,
    tenant_id: str,
) -> PreferenceListResponse:
    """List all notification preferences for a user."""
    items = (
        db.query(NotificationPreference)
        .filter(
            NotificationPreference.user_id == user_id,
            NotificationPreference.tenant_id == tenant_id,
        )
        .order_by(NotificationPreference.notification_type)
        .all()
    )
    return PreferenceListResponse(
        items=[PreferenceRead.model_validate(i) for i in items],
        total=len(items),
    )


def upsert_preference(
    db: Session,
    user_id: str,
    tenant_id: str,
    data: PreferenceCreate,
) -> NotificationPreference:
    """Create or update a notification preference (upsert by user + type + channel)."""
    pref = (
        db.query(NotificationPreference)
        .filter(
            NotificationPreference.user_id == user_id,
            NotificationPreference.tenant_id == tenant_id,
            NotificationPreference.notification_type == data.notification_type,
            NotificationPreference.channel == data.channel,
        )
        .first()
    )

    if pref:
        pref.is_enabled = data.is_enabled
        pref.quiet_hours_start = data.quiet_hours_start
        pref.quiet_hours_end = data.quiet_hours_end
    else:
        pref = NotificationPreference(
            id=gen_id("npf"),
            user_id=user_id,
            notification_type=data.notification_type,
            channel=data.channel,
            is_enabled=data.is_enabled,
            quiet_hours_start=data.quiet_hours_start,
            quiet_hours_end=data.quiet_hours_end,
            tenant_id=tenant_id,
        )
        db.add(pref)

    db.commit()
    db.refresh(pref)
    logger.info(
        "Preference upserted: user=%s type=%s channel=%s enabled=%s",
        user_id, data.notification_type, data.channel, data.is_enabled,
    )
    return pref


def update_preference(
    db: Session,
    preference_id: str,
    tenant_id: str,
    data: PreferenceUpdate,
) -> Optional[NotificationPreference]:
    """Update an existing preference by ID."""
    pref = (
        db.query(NotificationPreference)
        .filter(
            NotificationPreference.id == preference_id,
            NotificationPreference.tenant_id == tenant_id,
        )
        .first()
    )
    if not pref:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pref, field, value)

    db.commit()
    db.refresh(pref)
    logger.info("Preference updated: id=%s", preference_id)
    return pref


def delete_preference(
    db: Session, preference_id: str, tenant_id: str
) -> bool:
    """Delete a notification preference. Returns True if deleted."""
    pref = (
        db.query(NotificationPreference)
        .filter(
            NotificationPreference.id == preference_id,
            NotificationPreference.tenant_id == tenant_id,
        )
        .first()
    )
    if not pref:
        return False

    db.delete(pref)
    db.commit()
    logger.info("Preference deleted: id=%s", preference_id)
    return True
