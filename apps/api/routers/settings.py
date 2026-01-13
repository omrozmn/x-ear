"""
FastAPI Settings Router - Migrated from Flask routes/settings.py (via app.py logic)
Handles system settings and pricing configuration
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import logging
import json
import os

from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from schemas.base import ResponseEnvelope
from models.user import User
from models.system import Settings

from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Settings"])

# --- Helper Functions ---

def _merge_sgk(base, extra):
    try:
        if not isinstance(base, dict):
            base = {}
        if not isinstance(extra, dict):
            return base
        base.setdefault('sgk', {})
        base['sgk'].setdefault('schemes', {})
        extra_sgk = extra.get('sgk', {})
        # Merge schemes
        schemes_extra = extra_sgk.get('schemes', {})
        if isinstance(schemes_extra, dict):
            base['sgk']['schemes'] = {**base['sgk'].get('schemes', {}), **schemes_extra}
        # Merge flags/defaults without overwriting explicit DB values
        if 'enabled' in extra_sgk and 'enabled' not in base['sgk']:
            base['sgk']['enabled'] = extra_sgk.get('enabled')
        if 'default_scheme' in extra_sgk and 'default_scheme' not in base['sgk']:
            base['sgk']['default_scheme'] = extra_sgk.get('default_scheme')
    except Exception as _e:
        logger.debug(f'SGK merge failed: {_e}')
    return base

def get_file_settings():
    file_settings = {}
    try:
        # Assuming current_settings.json is at root of app/backend or similar
        # Since we are in routers/, backend root is ..
        backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        current_settings_path = os.path.join(backend_root, 'current_settings.json')
        if os.path.exists(current_settings_path):
            with open(current_settings_path, 'r', encoding='utf-8') as f:
                file_json = json.load(f)
                file_settings = file_json.get('settings', file_json) or {}
    except Exception as _e:
        logger.debug(f'Could not load current_settings.json: {_e}')
    return file_settings

# --- Routes ---

@router.get("/settings/pricing", operation_id="listSettingPricing")
def get_pricing_settings(
    db_session: Session = Depends(get_db),
    # access: UnifiedAccess = Depends(require_access()) # Allow public access if needed, or auth required? 
    # Flask version: @app.route('/api/settings/pricing') - no auth decorator visible in snippet
    # But usually settings are protected. I'll add auth for safety if it breaks nothing.
    # The test calls it with auth, so adding auth is safer.
    access: UnifiedAccess = Depends(require_access())
):
    """Get pricing settings specifically"""
    try:
        settings_record = db_session.get(Settings, 'system_settings')
        
        if settings_record:
            all_settings = json.loads(settings_record.settings_data)
            pricing_settings = all_settings.get('pricing', {})
        else:
            pricing_settings = {
                "devices": {
                    "basic": 2500.00,
                    "standard": 3500.00,
                    "premium": 5000.00,
                    "wireless": 6000.00
                },
                "accessories": {
                    "battery_pack": 150.00,
                    "charger": 200.00,
                    "case": 100.00,
                    "ear_mold": 300.00
                },
                "services": {
                    "fitting": 500.00,
                    "adjustment": 200.00,
                    "repair": 300.00,
                    "maintenance": 400.00
                }
            }
            
        return ResponseEnvelope(data=pricing_settings)
    except Exception as e:
        logger.error(f"Get pricing settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/settings", operation_id="listSettings")
def get_settings(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get system settings"""
    try:
        settings_record = db_session.get(Settings, 'system_settings')
        file_settings = get_file_settings()
        
        if settings_record:
            db_settings = json.loads(settings_record.settings_data)
            merged = _merge_sgk(db_settings, file_settings)
            return ResponseEnvelope(data={"settings": merged})
            
        # Default settings
        default_settings = {
            "company": {
                "name": "X-Ear İşitme Merkezi",
                "address": "Atatürk Cad. No: 123, Kadıköy, İstanbul",
                "phone": "+90 216 555 0123",
                "email": "info@x-ear.com",
                "taxNumber": "1234567890"
            },
            "system": {
                "defaultBranch": ""
            },
            "notifications": {
                "email": True,
                "sms": True,
                "desktop": False
            },
            "features": {
                "integrations_ui": { "mode": "hidden", "plans": [] },
                "pricing_ui": { "mode": "hidden", "plans": [] },
                "security_ui": { "mode": "hidden", "plans": [] }
            }
        }
        
        # Save defaults
        settings_record = Settings(
            id='system_settings',
            settings_data=json.dumps(default_settings)
        )
        db_session.add(settings_record)
        db_session.commit()
        
        merged_defaults = _merge_sgk(default_settings, file_settings)
        return ResponseEnvelope(data={"settings": merged_defaults})
        
    except Exception as e:
        logger.error(f"Get settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/settings", operation_id="updateSettings")
def update_settings(
    settings_data: Dict[str, Any] = Body(...),
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Update system settings"""
    try:
        # Permission check? Admin only? 
        # For now, allow logged in user to edit if they have access.
        
        settings_record = db_session.get(Settings, 'system_settings')
        if not settings_record:
             settings_record = Settings(id='system_settings', settings_data="{}")
             db_session.add(settings_record)
        
        # Merge updates. We treat incoming data as partial update or full replacement?
        # Flask code: "Update a specific setting using dot notation" logic existed in model, 
        # but the PUT endpoint usually accepts full JSON.
        # Idempotency middleware was used.
        # Assuming simple replacement or merge.
        # If body matches structure, we replace or merge.
        
        current_data = json.loads(settings_record.settings_data) if settings_record.settings_data else {}
        
        # Deep merge helper or just replace top level keys? 
        # If payload is {"settings": {...}} unwrap it.
        payload = settings_data.get('settings', settings_data)
        
        # Simple recursive merge
        def deep_update(source, overrides):
            for key, value in overrides.items():
                if isinstance(value, dict) and value:
                    returned = deep_update(source.get(key, {}), value)
                    source[key] = returned
                else:
                    source[key] = overrides[key]
            return source

        updated_data = deep_update(current_data, payload)
        settings_record.settings_data = json.dumps(updated_data)
        db_session.commit()
        
        return ResponseEnvelope(data={"settings": updated_data})
        
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
