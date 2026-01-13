"""
FastAPI Roles Router - Migrated from Flask routes/roles.py
Role CRUD and permission management
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from pydantic import BaseModel
import logging
import re

from sqlalchemy.orm import Session

from schemas.base import ResponseEnvelope, ApiError
from schemas.roles import RoleRead, RoleCreate as SchemaRoleCreate, RoleUpdate as SchemaRoleUpdate
from models.role import Role
from models.permission import Permission
from models.user import User

from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Roles"])

# --- Request Schemas (local, for backwards compat) ---

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


def invalidate_role_permissions(db_session: Session, role_name: str):
    """
    Increment permissions_version for all users with this role.
    This forces them to re-login to get updated permissions.
    """
    try:
        users = db_session.query(User).filter_by(role=role_name).all()
        for user in users:
            current_version = getattr(user, 'permissions_version', 1) or 1
            user.permissions_version = current_version + 1
        db_session.commit()
        logger.info(f"Invalidated permissions for {len(users)} users with role '{role_name}'")
    except Exception as e:
        logger.error(f"Failed to invalidate role permissions: {e}")
        db_session.rollback()

# --- Routes ---

@router.get("/roles", operation_id="listRoles", response_model=ResponseEnvelope[List[RoleRead]])
def list_roles(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get all roles"""
    try:
        roles = db_session.query(Role).order_by(Role.name).all()
        return ResponseEnvelope(data=[r.to_dict() for r in roles])
    except Exception as e:
        logger.error(f"List roles error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/roles", operation_id="createRoles", status_code=201, response_model=ResponseEnvelope[RoleRead])
def create_role(
    role_in: RoleCreate,
    access: UnifiedAccess = Depends(require_access()),
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
        
        if db_session.query(Role).filter_by(name=role_in.name).first():
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

@router.put("/roles/{role_id}", operation_id="updateRole", response_model=ResponseEnvelope[RoleRead])
def update_role(
    role_id: str,
    role_in: RoleUpdate,
    access: UnifiedAccess = Depends(require_access()),
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
            existing = db_session.query(Role).filter_by(name=data['name']).first()
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

@router.delete("/roles/{role_id}", operation_id="deleteRole")
def delete_role(
    role_id: str,
    access: UnifiedAccess = Depends(require_access()),
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
        
        if getattr(role, 'is_system', False):
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

# NOTE: GET /permissions endpoint is now in permissions.py
# This duplicate was causing OpenAPI conflicts


@router.post("/roles/{role_id}/permissions", operation_id="createRolePermissions", response_model=ResponseEnvelope[RoleRead])
def add_permission_to_role(
    role_id: str,
    perm_in: PermissionAssign,
    access: UnifiedAccess = Depends(require_access("role:write")),
    db_session: Session = Depends(get_db)
):
    """Add a permission to a role"""
    try:
        role = db_session.get(Role, role_id)
        if not role:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="role not found", code="ROLE_NOT_FOUND").model_dump(mode="json")
            )
        
        permission = db_session.query(Permission).filter_by(name=perm_in.permission).first()
        if not permission:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="permission not found", code="PERMISSION_NOT_FOUND").model_dump(mode="json")
            )
        
        if permission not in role.permissions:
            role.permissions.append(permission)
            db_session.commit()
            
            # Invalidate tokens for users with this role
            invalidate_role_permissions(db_session, role.name)
        
        return ResponseEnvelope(data=role.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Add permission to role error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/roles/{role_id}/permissions/{permission_name}", operation_id="deleteRolePermission")
def remove_permission_from_role(
    role_id: str,
    permission_name: str,
    access: UnifiedAccess = Depends(require_access("role:write")),
    db_session: Session = Depends(get_db)
):
    """Remove a permission from a role"""
    try:
        role = db_session.get(Role, role_id)
        if not role:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="role not found", code="ROLE_NOT_FOUND").model_dump(mode="json")
            )
        
        permission = db_session.query(Permission).filter_by(name=permission_name).first()
        if not permission:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="permission not found", code="PERMISSION_NOT_FOUND").model_dump(mode="json")
            )
        
        if permission in role.permissions:
            role.permissions.remove(permission)
            db_session.commit()
            
            # Invalidate tokens for users with this role
            invalidate_role_permissions(db_session, role.name)
        
        return ResponseEnvelope(message="permission removed")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Remove permission from role error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/roles/{role_id}/permissions", operation_id="updateRolePermissions", response_model=ResponseEnvelope[RoleRead])
def set_role_permissions(
    role_id: str,
    permissions: List[str],
    access: UnifiedAccess = Depends(require_access("role:write")),
    db_session: Session = Depends(get_db)
):
    """Set all permissions for a role (replaces existing)"""
    try:
        role = db_session.get(Role, role_id)
        if not role:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="role not found", code="ROLE_NOT_FOUND").model_dump(mode="json")
            )
        
        # Get all requested permissions
        new_permissions = []
        for perm_name in permissions:
            perm = db_session.query(Permission).filter_by(name=perm_name).first()
            if perm:
                new_permissions.append(perm)
        
        # Replace permissions
        role.permissions = new_permissions
        db_session.commit()
        
        # Invalidate tokens for users with this role
        invalidate_role_permissions(db_session, role.name)
        
        return ResponseEnvelope(data=role.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Set role permissions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
