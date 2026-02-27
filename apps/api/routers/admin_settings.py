"""
FastAPI Admin Settings Router - Migrated from Flask routes/admin_settings.py
Handles system settings management for admin panel
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from pydantic import BaseModel
import logging

from sqlalchemy.orm import Session

from core.dependencies import get_current_admin_user
from database import get_db
from schemas.base import ResponseEnvelope
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.system_settings import SystemSettingRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/settings", tags=["AdminSettings"])

# --- Schemas ---

class SettingItem(BaseModel):
    key: str
    value: str
    category: Optional[str] = "general"
    isPublic: Optional[bool] = False

class SettingsUpdate(BaseModel):
    settings: List[SettingItem]

# --- Routes ---

@router.post("/init-db", operation_id="createAdminSettingInitDb", response_model=ResponseEnvelope)
def init_db(
    admin_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Initialize System Settings table"""
    try:
        from models.system_setting import SystemSetting
        from database import engine
        
        SystemSetting.__table__.create(engine, checkfirst=True)
        
        # Seed default settings if empty
        if db.query(SystemSetting).count() == 0:
            defaults = [
                SystemSetting(key='site_name', value='X-Ear CRM', category='general', is_public=True),
                SystemSetting(key='maintenance_mode', value='false', category='maintenance', is_public=True),
                SystemSetting(key='smtp_host', value='smtp.gmail.com', category='mail'),
                SystemSetting(key='smtp_port', value='587', category='mail'),
                SystemSetting(key='smtp_user', value='', category='mail'),
                SystemSetting(key='smtp_pass', value='', category='mail'),
            ]
            for setting in defaults:
                db.add(setting)
            db.commit()
        
        return ResponseEnvelope(message='System Settings table initialized')
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", operation_id="listAdminSettings", response_model=ResponseEnvelope[List[SystemSettingRead]])
def get_settings(
    admin_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all system settings"""
    try:
        from models.system_setting import SystemSetting
        
        settings = db.query(SystemSetting).all()
        
        return ResponseEnvelope(data=[
            SystemSettingRead.model_validate(s)
            for s in settings
        ])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", operation_id="updateAdminSettings", response_model=ResponseEnvelope)
def update_settings(
    request_data: List[SettingItem],
    admin_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update system settings"""
    try:
        from models.system_setting import SystemSetting
        
        for item in request_data:
            setting = db.get(SystemSetting, item.key)
            if setting:
                setting.value = str(item.value)
            else:
                setting = SystemSetting(
                    key=item.key,
                    value=str(item.value),
                    category=item.category,
                    is_public=item.isPublic
                )
                db.add(setting)
        
        db.commit()
        
        return ResponseEnvelope(message='Settings updated')
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Update settings error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/cache/clear", operation_id="createAdminSettingCacheClear", response_model=ResponseEnvelope)
def clear_cache(
    admin_user=Depends(get_current_admin_user)
):
    """Clear system cache (Mock)"""
    return ResponseEnvelope(message='Cache cleared successfully')

@router.post("/backup", operation_id="createAdminSettingBackup", response_model=ResponseEnvelope)
def trigger_backup(
    admin_user=Depends(get_current_admin_user)
):
    """Trigger database backup (Mock)"""
    return ResponseEnvelope(message='Backup job started')
