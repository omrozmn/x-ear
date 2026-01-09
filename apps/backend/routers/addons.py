"""
FastAPI Addons Router - Migrated from Flask routes/addons.py
Handles subscription addons
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
import logging

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope
from schemas.addons import AddonRead, AddonCreate, AddonUpdate
from middleware.unified_access import UnifiedAccess, require_access, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/addons", tags=["Addons"])

# --- Routes ---

@router.get("", response_model=ResponseEnvelope[List[AddonRead]])
def get_addons(db: Session = Depends(get_db)):
    """Get all active addons (Public)"""
    try:
        from models.addon import AddOn
        
        addons = db.query(AddOn).filter_by(is_active=True).all()
        
        return ResponseEnvelope(data=[
            addon.to_dict() if hasattr(addon, 'to_dict') else {'id': addon.id, 'name': addon.name}
            for addon in addons
        ])
        
    except Exception as e:
        logger.error(f"Error getting addons: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin", operation_id="listAddonAdmin", response_model=ResponseEnvelope[List[AddonRead]])
def get_admin_addons(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all addons for admin (including inactive)"""
    try:
        from models.addon import AddOn
        
        if not access.is_super_admin and (not access.user or access.user.role not in ['admin', 'super_admin']):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        addons = db.query(AddOn).all()
        
        return ResponseEnvelope(data=[
            addon.to_dict() if hasattr(addon, 'to_dict') else {'id': addon.id, 'name': addon.name}
            for addon in addons
        ])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting admin addons: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", status_code=201, response_model=ResponseEnvelope[AddonRead])
def create_addon(
    request_data: AddonCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Create a new addon (Super Admin only)"""
    try:
        from models.addon import AddOn
        
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        addon = AddOn(
            name=request_data.name,
            description=request_data.description,
            price=request_data.price,
            addon_type=request_data.addon_type,
            features=request_data.features or [],
            is_active=request_data.is_active
        )
        
        db.add(addon)
        db.commit()
        
        return ResponseEnvelope(data=addon.to_dict() if hasattr(addon, 'to_dict') else {'id': addon.id})
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating addon: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{addon_id}", operation_id="updateAddon", response_model=ResponseEnvelope[AddonRead])
def update_addon(
    addon_id: str,
    request_data: AddonUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update an addon (Super Admin only)"""
    try:
        from models.addon import AddOn
        
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        addon = db.get(AddOn, addon_id)
        if not addon:
            raise HTTPException(status_code=404, detail="Addon not found")
        
        if request_data.name is not None:
            addon.name = request_data.name
        if request_data.description is not None:
            addon.description = request_data.description
        if request_data.price is not None:
            addon.price = request_data.price
        if request_data.features is not None:
            addon.features = request_data.features
        if request_data.is_active is not None:
            addon.is_active = request_data.is_active
        
        db.commit()
        
        return ResponseEnvelope(data=addon.to_dict() if hasattr(addon, 'to_dict') else {'id': addon.id})
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating addon: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{addon_id}", operation_id="deleteAddon")
def delete_addon(
    addon_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete an addon (Super Admin only)"""
    try:
        from models.addon import AddOn
        
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        addon = db.get(AddOn, addon_id)
        if not addon:
            raise HTTPException(status_code=404, detail="Addon not found")
        
        db.delete(addon)
        db.commit()
        
        return ResponseEnvelope(message="Addon deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting addon: {e}")
        raise HTTPException(status_code=500, detail=str(e))
