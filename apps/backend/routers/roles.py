"""
FastAPI Roles Router - Migrated from Flask routes/roles.py
Role CRUD and permission management
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
import logging
import re

from sqlalchemy.orm import Session

from dependencies import get_db, get_current_context, AccessContext
from schemas.base import ResponseEnvelope, ApiError
from models.role import Role
from models.permission import Permission
from models.base import db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Roles"])

# --- Request Schemas ---

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_system: bool = False

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class PermissionAssign(BaseModel):
    permission: str

# --- Helper Functions ---

def is_valid_role_name(name: str) -> bool:
    """Validate role name"""
    if not name or len(name) < 2 or len(name) > 50:
        return False
    return bool(re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', name))

# --- Routes ---

@router.get("/roles")
def list_roles(
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Get all roles"""
    roles = Role.query.order_by(Role.name).all()
    return ResponseEnvelope(data=[r.to_dict() for r in roles])

@router.post("/roles", status_code=201)
def create_role(
    role_in: RoleCreate,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Create a new role"""
    try:
        if not role_in.name:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="name required", code="NAME_REQUIRED").model_dump(mode="json")
            )
        
        if not is_valid_role_name(role_in.name):
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="invalid role name", code="INVALID_NAME").model_dump(mode="json")
            )
        
        if Role.query.filter_by(name=role_in.name).first():
            raise HTTPException(
                status_code=409,
                detail=ApiError(message="role exists", code="ROLE_EXISTS").model_dump(mode="json")
            )
        
        role = Role()
        role.name = role_in.name
        role.description = role_in.description
        role.is_system = role_in.is_system
        
        db_session.add(role)
        db_session.commit()
        
        return ResponseEnvelope(data=role.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create role error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/roles/{role_id}")
def update_role(
    role_id: str,
    role_in: RoleUpdate,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Update a role"""
    try:
        role = db_session.get(Role, role_id)
        if not role:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="role not found", code="ROLE_NOT_FOUND").model_dump(mode="json")
            )
        
        data = role_in.model_dump(exclude_unset=True)
        
        if 'name' in data and data['name']:
            if not is_valid_role_name(data['name']):
                raise HTTPException(
                    status_code=400,
                    detail=ApiError(message="invalid role name", code="INVALID_NAME").model_dump(mode="json")
                )
            existing = Role.query.filter_by(name=data['name']).first()
            if existing and existing.id != role_id:
                raise HTTPException(
                    status_code=409,
                    detail=ApiError(message="role name already exists", code="NAME_EXISTS").model_dump(mode="json")
                )
            role.name = data['name']
        
        if 'description' in data:
            role.description = data['description']
        
        db_session.add(role)
        db_session.commit()
        
        return ResponseEnvelope(data=role.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update role error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/roles/{role_id}")
def delete_role(
    role_id: str,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Delete a role"""
    try:
        role = db_session.get(Role, role_id)
        if not role:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="role not found", code="ROLE_NOT_FOUND").model_dump(mode="json")
            )
        
        if role.is_system:
            raise HTTPException(
                status_code=403,
                detail=ApiError(message="cannot delete system role", code="SYSTEM_ROLE").model_dump(mode="json")
            )
        
        db_session.delete(role)
        db_session.commit()
        
        return ResponseEnvelope(message="role deleted")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Delete role error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/roles/{role_id}/permissions")
def add_permission_to_role(
    role_id: str,
    perm_in: PermissionAssign,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Add permission to role"""
    try:
        role = db_session.get(Role, role_id)
        if not role:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="role not found", code="ROLE_NOT_FOUND").model_dump(mode="json")
            )
        
        perm = Permission.query.filter_by(name=perm_in.permission).first()
        if not perm:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="permission not found", code="PERMISSION_NOT_FOUND").model_dump(mode="json")
            )
        
        if perm in role.permissions:
            raise HTTPException(
                status_code=409,
                detail=ApiError(message="permission already assigned", code="ALREADY_ASSIGNED").model_dump(mode="json")
            )
        
        role.permissions.append(perm)
        db_session.add(role)
        db_session.commit()
        
        return ResponseEnvelope(data=role.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Add permission error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/roles/{role_id}/permissions/{permission_id}")
def remove_permission_from_role(
    role_id: str,
    permission_id: str,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Remove permission from role"""
    try:
        role = db_session.get(Role, role_id)
        if not role:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="role not found", code="ROLE_NOT_FOUND").model_dump(mode="json")
            )
        
        perm = db_session.get(Permission, permission_id)
        if not perm:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="permission not found", code="PERMISSION_NOT_FOUND").model_dump(mode="json")
            )
        
        if perm not in role.permissions:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="permission not assigned", code="NOT_ASSIGNED").model_dump(mode="json")
            )
        
        role.permissions.remove(perm)
        db_session.add(role)
        db_session.commit()
        
        return ResponseEnvelope(data=role.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Remove permission error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
