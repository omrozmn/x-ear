"""
FastAPI Admin Addons Router - Migrated from Flask routes/admin_addons.py
Handles add-on/package management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime
import logging
import uuid
import re

from sqlalchemy.orm import Session

from schemas.base import ResponseEnvelope
from schemas.addons import AddonCreate, AddonUpdate, AddonRead
from models.admin_user import AdminUser
from models.addon import AddOn, AddOnType
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/addons", tags=["Admin Addons"])

# Response models
class AddonListResponse(ResponseEnvelope):
    data: Optional[dict] = None

class AddonDetailResponse(ResponseEnvelope):
    data: Optional[dict] = None

@router.get("", operation_id="listAdminAddons", response_model=AddonListResponse)
def list_addons(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None),
    is_active: Optional[str] = Query(None),
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """List all add-ons"""
    try:
        query = db_session.query(AddOn)
        
        if type:
            query = query.filter_by(addon_type=AddOnType[type.upper()])
        if is_active:
            query = query.filter_by(is_active=is_active.lower() == 'true')
        
        query = query.order_by(AddOn.created_at.desc())
        total = query.count()
        addons = query.offset((page - 1) * limit).limit(limit).all()
        
        return ResponseEnvelope(data={
            # Use Pydantic schema for type-safe serialization (NO to_dict())
            "addons": [AddonRead.model_validate(a).model_dump(by_alias=True) for a in addons],
            "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}
        })
    except Exception as e:
        logger.error(f"List addons error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", operation_id="createAdminAddon", response_model=AddonDetailResponse)
def create_addon(
    request_data: AddonCreate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Create a new add-on"""
    try:
        slug = request_data.slug
        if not slug:
            slug = re.sub(r'[^\w\s-]', '', request_data.name.lower())
            slug = re.sub(r'[-\s]+', '-', slug).strip('-')
        
        addon = AddOn(
            id=str(uuid.uuid4()),
            name=request_data.name,
            slug=slug,
            description=request_data.description,
            addon_type=AddOnType[request_data.addon_type.upper()],
            price=request_data.price,
            currency=request_data.currency,
            unit_name=request_data.unit_name,
            limit_amount=request_data.limit_amount,
            is_active=request_data.is_active
        )
        db_session.add(addon)
        db_session.commit()
        db_session.refresh(addon)  # Refresh to get updated fields
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data={"addon": AddonRead.model_validate(addon).model_dump(by_alias=True)})
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create addon error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{addon_id}", operation_id="getAdminAddon", response_model=AddonDetailResponse)
def get_addon(
    addon_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get add-on details"""
    addon = db_session.get(AddOn, addon_id)
    if not addon:
        raise HTTPException(status_code=404, detail={"message": "Add-on not found", "code": "NOT_FOUND"})
    # Use Pydantic schema for type-safe serialization (NO to_dict())
    return ResponseEnvelope(data={"addon": AddonRead.model_validate(addon).model_dump(by_alias=True)})

@router.put("/{addon_id}", operation_id="updateAdminAddon", response_model=AddonDetailResponse)
def update_addon(
    addon_id: str,
    request_data: AddonUpdate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Update add-on"""
    try:
        addon = db_session.get(AddOn, addon_id)
        if not addon:
            raise HTTPException(status_code=404, detail={"message": "Add-on not found", "code": "NOT_FOUND"})
        
        update_data = request_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                if key == 'addon_type':
                    setattr(addon, key, AddOnType[value.upper()])
                else:
                    setattr(addon, key, value)
        
        addon.updated_at = datetime.utcnow()
        db_session.commit()
        db_session.refresh(addon)  # Refresh to get updated fields
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data={"addon": AddonRead.model_validate(addon).model_dump(by_alias=True)})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update addon error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{addon_id}", operation_id="deleteAdminAddon", response_model=ResponseEnvelope)
def delete_addon(
    addon_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Delete add-on (soft delete)"""
    try:
        addon = db_session.get(AddOn, addon_id)
        if not addon:
            raise HTTPException(status_code=404, detail={"message": "Add-on not found", "code": "NOT_FOUND"})
        
        addon.is_active = False
        addon.updated_at = datetime.utcnow()
        db_session.commit()
        return ResponseEnvelope(message="Add-on deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Delete addon error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
