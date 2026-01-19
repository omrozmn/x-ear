"""
FastAPI Notifications Router - Migrated from Flask routes/notifications.py
Notification CRUD, settings, stats
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from uuid import uuid4
import logging

from sqlalchemy.orm import Session

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope, ApiError
from schemas.notifications import NotificationCreate as NotificationCreateSchema
from schemas.notifications import NotificationRead, NotificationUpdate, NotificationStats, NotificationSettings
from models.notification import Notification
from models.system import Settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Notifications"])

def now_utc():
    return datetime.now(timezone.utc)

class NotificationSettingsUpdate(BaseModel):
    user_id: str = Field(..., alias="userId")
    preferences: Optional[dict] = None
    settings: Optional[dict] = None

# --- Routes ---

@router.post("/notifications", operation_id="createNotifications", status_code=201, response_model=ResponseEnvelope[NotificationRead])
def create_notification(
    notif_in: NotificationCreateSchema,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Create a new notification"""
    try:
        data = notif_in.model_dump(by_alias=False)
        
        notif = Notification.from_dict(data)
        if not notif.id:
            notif.id = f"notif_{now_utc().strftime('%d%m%Y%H%M%S')}_{uuid4().hex[:6]}"
        notif.user_id = notif.user_id or data.get('user_id') or 'system'
        
        db_session.add(notif)
        db_session.commit()
        
        return ResponseEnvelope(data=NotificationRead.model_validate(notif))
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notifications", operation_id="listNotifications", response_model=ResponseEnvelope[List[NotificationRead]])
def list_notifications(
    user_id: Optional[str] = Query(None, alias="user_id"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """List notifications for a user"""
    try:
        query = db_session.query(Notification)
        
        # Filter by tenant
        if access.tenant_id:
            query = query.filter(Notification.tenant_id == access.tenant_id)
        
        # Filter by user if provided, otherwise use current user
        target_user_id = user_id or access.user_id
        if target_user_id:
            query = query.filter(Notification.user_id == target_user_id)
        
        query = query.order_by(Notification.created_at.desc())
        
        total = query.count()
        notifications = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return ResponseEnvelope(
            data=[NotificationRead.model_validate(n) for n in notifications],
            meta={
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page
            }
        )
    except Exception as e:
        logger.error(f"List notifications error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/notifications/{notification_id}/read", operation_id="updateNotificationRead", response_model=ResponseEnvelope[NotificationRead])
def mark_notification_read(
    notification_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Mark notification as read"""
    try:
        notif = db_session.get(Notification, notification_id)
        if not notif:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Notification not found", code="NOTIFICATION_NOT_FOUND").model_dump(mode="json")
            )
        
        # Model uses is_read
        notif.is_read = True
        db_session.commit()
        
        return ResponseEnvelope(data=NotificationRead.model_validate(notif))
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Mark notification read error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/notifications/{notification_id}", operation_id="updateNotification", response_model=ResponseEnvelope[NotificationRead])
def update_notification(
    notification_id: str,
    notif_in: NotificationUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Update a notification"""
    try:
        notif = db_session.get(Notification, notification_id)
        if not notif:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Notification not found", code="NOTIFICATION_NOT_FOUND").model_dump(mode="json")
            )
        
        data = notif_in.model_dump(exclude_unset=True)
        if 'is_read' in data:
            notif.is_read = data['is_read']
            
        db_session.commit()
        return ResponseEnvelope(data=NotificationRead.model_validate(notif))
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notifications/stats", operation_id="listNotificationStats", response_model=ResponseEnvelope[NotificationStats])
def notification_stats(
    user_id: str = Query(..., alias="user_id"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get notification stats for a user"""
    try:
        total = db_session.query(Notification).filter(Notification.user_id == user_id).count()
        unread = (
            db_session.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
            .count()
        )
        
        return ResponseEnvelope(
            data=NotificationStats(total=total, unread=unread, read=total-unread)
        )
    except Exception as e:
        logger.error(f"Notification stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/notifications/{notification_id}", operation_id="deleteNotification", response_model=ResponseEnvelope[None])
def delete_notification(
    notification_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Delete a notification"""
    try:
        notif = db_session.get(Notification, notification_id)
        if not notif:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Notification not found", code="NOTIFICATION_NOT_FOUND").model_dump(mode="json")
            )
        
        db_session.delete(notif)
        db_session.commit()
        
        return ResponseEnvelope(message="Notification deleted")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Delete notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notifications/settings", operation_id="listNotificationSettings", response_model=ResponseEnvelope[NotificationSettings])
def get_user_notification_settings(
    user_id: str = Query(..., alias="user_id"),
    db_session: Session = Depends(get_db)
):
    """Get user notification settings"""
    try:
        settings_record = Settings.get_system_settings()
        user_settings = settings_record.get_setting(f'userNotifications.{user_id}', default=None)
        
        if user_settings is None:
            default_notifications = settings_record.get_setting('notifications', {})
            return ResponseEnvelope(data=NotificationSettings(**default_notifications))
        
        return ResponseEnvelope(data=NotificationSettings(**user_settings))
    except Exception as e:
        logger.error(f"Get user notification settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/notifications/settings", operation_id="updateNotificationSettings", response_model=ResponseEnvelope[NotificationSettings])
def set_user_notification_settings(
    settings_in: NotificationSettingsUpdate,
    db_session: Session = Depends(get_db)
):
    """Set user notification settings"""
    try:
        user_id = settings_in.user_id
        prefs = settings_in.preferences or settings_in.settings
        
        if not prefs:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="preferences required", code="MISSING_PREFERENCES").model_dump(mode="json")
            )
        
        settings_record = Settings.get_system_settings()
        settings = settings_record.settings_json
        user_map = settings.get('userNotifications', {})
        user_map[user_id] = prefs
        settings['userNotifications'] = user_map
        settings_record.settings_json = settings
        
        db_session.add(settings_record)
        db_session.commit()
        
        return ResponseEnvelope(message="Preferences updated", data=NotificationSettings(**prefs))
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Set user notification settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
