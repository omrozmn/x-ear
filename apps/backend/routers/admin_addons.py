"""
FastAPI Admin Addons Router - Migrated from Flask routes/admin_addons.py
Handles add-on/package management
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
import logging
import uuid
import re

from sqlalchemy.orm import Session

from dependencies import get_db, get_current_admin_user
from schemas.base import ResponseEnvelope
from models.admin_user import AdminUser
from models.addon import AddOn, AddOnType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/addons", tags=["Admin Addons"])

# --- Request Schemas ---

class CreateAddonRequest(BaseModel):
    name: str
    price: float
    slug: Optional[str] = None
    description: Optional[str] = None
    addon_type: Optional[str] = "FLAT_FEE"
    currency: Optional[str] = "TRY"
    unit_name: Optional[str] = None
    limit_amount: Optional[int] = None
    is_active: Optional[bool] = True

class UpdateAddonRequest(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    addon_type: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    unit_name: Optional[str] = None
    limit_amount: Optional[int] = None
    is_active: Optional[bool] = None

# --- Routes ---

@router.get("")
def list_addons(
    page: int = 1,
    limit: int = 20,
    type: str = "",
    is_active: str = "",
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
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
            "addons": [a.to_dict() for a in addons],
            "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}
        })
    except Exception as e:
        logger.error(f"List addons error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
def create_addon(
    request_data: CreateAddonRequest,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
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
        return ResponseEnvelope(data={"addon": addon.to_dict()})
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create addon error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{addon_id}")
def get_addon(
    addon_id: str,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Get add-on details"""
    addon = db_session.get(AddOn, addon_id)
    if not addon:
        raise HTTPException(status_code=404, detail={"message": "Add-on not found", "code": "NOT_FOUND"})
    return ResponseEnvelope(data={"addon": addon.to_dict()})

@router.put("/{addon_id}")
def update_addon(
    addon_id: str,
    request_data: UpdateAddonRequest,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
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
        return ResponseEnvelope(data={"addon": addon.to_dict()})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update addon error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{addon_id}")
def delete_addon(
    addon_id: str,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
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
