"""Apps Router - FastAPI"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import logging

from schemas.base import ResponseEnvelope
from schemas.apps import AppRead, AppCreate, AppUpdate
from models.user import User
from models.role import Role
from models.user_app_role import UserAppRole
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/apps", tags=["Apps"])

class AppCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None

class AppUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class RoleAssign(BaseModel):
    userId: str
    role: str

class OwnerTransfer(BaseModel):
    ownerUserId: str

@router.get("", operation_id="listApps")
async def list_apps(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("apps.read", admin_only=True))
):
    """List all apps"""
    apps = db.query(App).order_by(App.name).all()
    # Use Pydantic schema for type-safe serialization (NO to_dict())
    return {"success": True, "data": [AppRead.model_validate(a) for a in apps]}

@router.post("", operation_id="createApp")
async def create_app(
    data: AppCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("apps.write", admin_only=True))
):
    """Create a new app"""
    if not data.name or not data.slug:
        raise HTTPException(status_code=400, detail="name and slug required")
    
    slug = data.slug.lower().replace(" ", "-")
    if db.query(App).filter(App.slug == slug).first():
        raise HTTPException(status_code=409, detail="slug already exists")
    
    app = App(name=data.name, slug=slug, description=data.description)
    db.add(app)
    db.commit()
    db.refresh(app)
    # Use Pydantic schema for type-safe serialization (NO to_dict())
    return {"success": True, "data": AppRead.model_validate(app)}

@router.get("/{app_id}", operation_id="getApp")
async def get_app(
    app_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get app details"""
    app = db.get(App, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Not found")
    # Use Pydantic schema for type-safe serialization (NO to_dict())
    return {"success": True, "data": AppRead.model_validate(app)}

@router.put("/{app_id}", operation_id="updateApp")
async def update_app(
    app_id: str,
    data: AppUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Update app details"""
    app = db.get(App, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Not found")
    
    if data.name is not None:
        app.name = data.name
    if data.description is not None:
        app.description = data.description
    
    db.commit()
    # Use Pydantic schema for type-safe serialization (NO to_dict())
    return {"success": True, "data": AppRead.model_validate(app)}

@router.delete("/{app_id}", operation_id="deleteApp")
async def delete_app(
    app_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("apps.write", admin_only=True))
):
    """Delete an app"""
    app = db.get(App, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Not found")
    
    db.delete(app)
    db.commit()
    return {"success": True, "message": "Deleted"}

# --- Additional Endpoints (Migrated from Flask) ---

@router.post("/{app_id}/assign", operation_id="createAppAssign")
async def assign_user_to_app(
    app_id: str,
    data: RoleAssign,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("apps.write", admin_only=True))
):
    """Assign a user to an app with a specific role"""
    app = db.get(App, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    user = db.get(User, data.userId)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if assignment already exists
    existing = db.query(UserAppRole).filter(
        UserAppRole.user_id == data.userId,
        UserAppRole.app_id == app_id
    ).first()
    
    if existing:
        existing.role = data.role
    else:
        assignment = UserAppRole(user_id=data.userId, app_id=app_id, role=data.role)
        db.add(assignment)
    
    db.commit()
    return {"success": True, "message": f"User assigned to app with role: {data.role}"}

@router.post("/{app_id}/transfer_ownership", operation_id="createAppTransferOwnership")
async def transfer_app_ownership(
    app_id: str,
    data: OwnerTransfer,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("apps.write", admin_only=True))
):
    """Transfer app ownership to another user"""
    app = db.get(App, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    new_owner = db.get(User, data.ownerUserId)
    if not new_owner:
        raise HTTPException(status_code=404, detail="New owner user not found")
    
    # Update app owner
    if hasattr(app, 'owner_id'):
        app.owner_id = data.ownerUserId
    
    # Ensure new owner has admin role for the app
    existing = db.query(UserAppRole).filter(
        UserAppRole.user_id == data.ownerUserId,
        UserAppRole.app_id == app_id
    ).first()
    
    if existing:
        existing.role = "owner"
    else:
        assignment = UserAppRole(user_id=data.ownerUserId, app_id=app_id, role="owner")
        db.add(assignment)
    
    db.commit()
    return {"success": True, "message": "Ownership transferred successfully"}
