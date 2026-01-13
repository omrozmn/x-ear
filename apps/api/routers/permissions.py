"""
FastAPI Permissions Router - Migrated from Flask routes/permissions.py
Handles permission management and role-permission assignments
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List
from pydantic import BaseModel
import logging

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope, ApiError
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Permissions"])

# Permission categories for frontend grouping
PERMISSION_CATEGORIES = {
    'patients': {'label': 'Hastalar', 'icon': 'users'},
    'sales': {'label': 'Satışlar', 'icon': 'shopping-cart'},
    'finance': {'label': 'Finans', 'icon': 'dollar-sign'},
    'invoices': {'label': 'Faturalar', 'icon': 'file-text'},
    'devices': {'label': 'Cihazlar', 'icon': 'headphones'},
    'inventory': {'label': 'Stok', 'icon': 'package'},
    'campaigns': {'label': 'Kampanyalar', 'icon': 'megaphone'},
    'sgk': {'label': 'SGK', 'icon': 'shield'},
    'settings': {'label': 'Ayarlar', 'icon': 'settings'},
    'team': {'label': 'Ekip', 'icon': 'users-round'},
    'reports': {'label': 'Raporlar', 'icon': 'bar-chart'},
    'dashboard': {'label': 'Dashboard', 'icon': 'layout-dashboard'},
}

# --- Schemas ---

class PermissionCreate(BaseModel):
    name: str
    description: Optional[str] = None

class RolePermissionsUpdate(BaseModel):
    permissions: List[str]

# --- Routes ---

@router.get("/permissions", operation_id="listPermissions")
def list_permissions(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """List all permissions, grouped by category"""
    try:
        from models.permission import Permission
        
        # Get all permissions, filter out admin/system ones for tenant context
        all_perms = db.query(Permission).order_by(Permission.name).all()
        perms = [p for p in all_perms if not p.name.startswith('admin.') 
                 and not p.name.startswith('system.') 
                 and not p.name.startswith('activity_logs.')]
        
        # Group permissions by category
        grouped = {}
        ungrouped = []
        
        for p in perms:
            pdict = p.to_dict() if hasattr(p, 'to_dict') else {'id': p.id, 'name': p.name, 'description': p.description}
            if '.' in p.name:
                category = p.name.split('.')[0]
                if category in PERMISSION_CATEGORIES:
                    if category not in grouped:
                        grouped[category] = {
                            'category': category,
                            'label': PERMISSION_CATEGORIES[category]['label'],
                            'icon': PERMISSION_CATEGORIES[category]['icon'],
                            'permissions': []
                        }
                    grouped[category]['permissions'].append(pdict)
                else:
                    ungrouped.append(pdict)
            else:
                ungrouped.append(pdict)
        
        result = list(grouped.values())
        if ungrouped:
            result.append({
                'category': 'other',
                'label': 'Diğer',
                'icon': 'more-horizontal',
                'permissions': ungrouped
            })
        
        return ResponseEnvelope(data={
            'data': result,
            'all': [p.to_dict() if hasattr(p, 'to_dict') else {'name': p.name} for p in perms]
        })
        
    except Exception as e:
        logger.error(f"Error listing permissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/permissions/my", operation_id="listPermissionMy")
def get_my_permissions(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get current user's permissions based on their role"""
    try:
        from models.permission import Permission
        from config.tenant_permissions import get_permissions_for_role, _FULL_ADMIN_PERMISSIONS
        
        # Check if admin user
        if access.is_super_admin:
            perms = db.query(Permission).order_by(Permission.name).all()
            return ResponseEnvelope(data={
                'permissions': [p.name for p in perms],
                'role': access.role,
                'isSuperAdmin': True
            })
        
        # Regular tenant user
        user = access.user
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Super admin checks (users table with super_admin role)
        if user.role == 'super_admin':
            perms = db.query(Permission).order_by(Permission.name).all()
            return ResponseEnvelope(data={
                'permissions': [p.name for p in perms],
                'role': user.role,
                'isSuperAdmin': True
            })

        if user.role == 'admin':
            # Tenant Admin - return full tenant permissions
            return ResponseEnvelope(data={
                'permissions': list(_FULL_ADMIN_PERMISSIONS),
                'role': user.role,
                'isSuperAdmin': False
            })

        # For Tenant Users, verify against role map in code
        mapped_perms = get_permissions_for_role(user.role)
        
        return ResponseEnvelope(data={
            'permissions': list(mapped_perms),
            'role': user.role,
            'isSuperAdmin': False
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting my permissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/permissions/role/{role_name}", operation_id="getPermissionRole")
def get_role_permissions(
    role_name: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get permissions for a specific role"""
    try:
        from models.role import Role
        
        role = db.query(Role).filter_by(name=role_name).first()
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        
        return ResponseEnvelope(data={
            'role': role.to_dict() if hasattr(role, 'to_dict') else {'id': role.id, 'name': role.name},
            'permissions': [p.name for p in role.permissions] if hasattr(role, 'permissions') else []
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting role permissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/permissions/role/{role_name}", operation_id="updatePermissionRole")
def update_role_permissions(
    role_name: str,
    request_data: RolePermissionsUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update permissions for a role"""
    try:
        from models.role import Role
        from models.permission import Permission
        
        role = db.query(Role).filter_by(name=role_name).first()
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        
        # Clear existing permissions
        role.permissions.clear()
        
        # Add new permissions
        for pname in request_data.permissions:
            perm = db.query(Permission).filter_by(name=pname).first()
            if perm:
                role.permissions.append(perm)
        
        db.commit()
        
        return ResponseEnvelope(data={
            'role': role.to_dict() if hasattr(role, 'to_dict') else {'id': role.id, 'name': role.name},
            'permissions': [p.name for p in role.permissions]
        })
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating role permissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/permissions", operation_id="createPermissions", status_code=201)
def create_permission(
    request_data: PermissionCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Create a new permission (System Admin)"""
    try:
        from models.permission import Permission
        
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Only super admin can create permissions")
        
        # Validate permission name
        if not request_data.name or '.' not in request_data.name:
            raise HTTPException(status_code=400, detail="Invalid permission name format (use category.action)")
        
        # Check if exists
        existing = db.query(Permission).filter_by(name=request_data.name).first()
        if existing:
            raise HTTPException(status_code=409, detail="Permission already exists")
        
        p = Permission()
        p.name = request_data.name
        p.description = request_data.description
        db.add(p)
        db.commit()
        
        return ResponseEnvelope(
            data=p.to_dict() if hasattr(p, 'to_dict') else {'id': p.id, 'name': p.name}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating permission: {e}")
        raise HTTPException(status_code=500, detail=str(e))
