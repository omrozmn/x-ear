"""
FastAPI Notifications Router - Migrated from Flask routes/notifications.py
Notification CRUD, settings, stats
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from uuid import uuid4
import logging

from sqlalchemy.orm import Session

from dependencies import get_db, get_current_context, AccessContext
from schemas.base import ResponseEnvelope, ApiError
from models.notification import Notification
from models.system import Settings
from models.base import db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Notifications"])

def now_utc():
    return datetime.now(timezone.utc)

# --- Request Schemas ---

class NotificationCreate(BaseModel):
    user_id: Optional[str] = Field(None, alias="userId")
    title: str
    message: Optional[str] = None
    type: str = "info"
    data: Optional[dict] = None

class NotificationSettingsUpdate(BaseModel):
    user_id: str = Field(..., alias="userId")
    preferences: Optional[dict] = None
    settings: Optional[dict] = None

# --- Routes ---

@router.post("/notifications", status_code=201)
def create_notification(
    notif_in: NotificationCreate,
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
        
        return ResponseEnvelope(data=notif.to_dict())
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notifications")
def list_notifications(
    user_id: str = Query(..., alias="user_id"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db_session: Session = Depends(get_db)
):
    """List notifications for a user"""
    try:
        query = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc())
        
        total = query.count()
        notifications = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return ResponseEnvelope(
            data=[n.to_dict() for n in notifications],
            meta={
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": (total + per_page - 1) // per_page
            }
        )
    except Exception as e:
        logger.error(f"List notifications error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
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
        
        notif.read = True
        db_session.commit()
        
        return ResponseEnvelope(data=notif.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Mark notification read error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notifications/stats")
def notification_stats(
    user_id: str = Query(..., alias="user_id"),
    db_session: Session = Depends(get_db)
):
    """Get notification stats for a user"""
    try:
        total = Notification.query.filter_by(user_id=user_id).count()
        unread = Notification.query.filter_by(user_id=user_id, is_read=False).count()
        
        return ResponseEnvelope(
            data={"total": total, "unread": unread}
        )
    except Exception as e:
        logger.error(f"Notification stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/notifications/{notification_id}")
def delete_notification(
    notification_id: str,
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

@router.get("/notifications/settings")
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
            return ResponseEnvelope(data=default_notifications)
        
        return ResponseEnvelope(data=user_settings)
    except Exception as e:
        logger.error(f"Get user notification settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/notifications/settings")
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
        
        return ResponseEnvelope(message="Preferences updated", data=prefs)
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Set user notification settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
