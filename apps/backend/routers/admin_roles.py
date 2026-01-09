"""
FastAPI Admin Roles Router - Migrated from Flask routes/admin_roles.py
Handles admin panel role and permission management
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from pydantic import BaseModel
import logging

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["AdminRoles"])

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

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    permissions: Optional[List[str]] = None

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class RolePermissionsUpdate(BaseModel):
    permissions: List[str]

class UserRolesUpdate(BaseModel):
    role_ids: List[str]

# --- Routes ---

@router.get("/roles", operation_id="listAdminRoles")
def get_admin_roles(
    include_permissions: bool = False,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all admin roles"""
    try:
        if not access.is_super_admin and (not access.user or access.user.role not in ['admin', 'super_admin']):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from models.admin_permission import AdminRoleModel
        
        roles = db.query(AdminRoleModel).order_by(AdminRoleModel.name).all()
        
        return ResponseEnvelope(data={
            'roles': [
                r.to_dict(include_permissions=include_permissions) if hasattr(r, 'to_dict') else {'id': r.id, 'name': r.name}
                for r in roles
            ],
            'total': len(roles)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get admin roles error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/roles/{role_id}", operation_id="getAdminRole")
def get_admin_role(
    role_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get single role detail"""
    try:
        if not access.is_super_admin and (not access.user or access.user.role not in ['admin', 'super_admin']):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from models.admin_permission import AdminRoleModel
        
        role = db.get(AdminRoleModel, role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Rol bulunamadı")
        
        return ResponseEnvelope(data={
            'role': role.to_dict(include_permissions=True) if hasattr(role, 'to_dict') else {'id': role.id, 'name': role.name}
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get admin role error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/roles", operation_id="createAdminRoles", status_code=201)
def create_admin_role(
    request_data: RoleCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Create new role"""
    try:
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        from models.admin_permission import AdminRoleModel, AdminPermissionModel
        
        name = request_data.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Rol adı zorunludur")
        
        # Check if exists
        existing = db.query(AdminRoleModel).filter_by(name=name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Bu isimde bir rol zaten var")
        
        role = AdminRoleModel(
            name=name,
            description=request_data.description or '',
            is_system_role=False
        )
        
        # Add permissions
        if request_data.permissions:
            for code in request_data.permissions:
                perm = db.query(AdminPermissionModel).filter_by(code=code).first()
                if perm:
                    role.permissions.append(perm)
        
        db.add(role)
        db.commit()
        
        logger.info(f"Admin role created: {role.name} by user {access.principal_id}")
        
        return ResponseEnvelope(data={
            'message': 'Rol oluşturuldu',
            'role': role.to_dict(include_permissions=True) if hasattr(role, 'to_dict') else {'id': role.id, 'name': role.name}
        })
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Create admin role error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/roles/{role_id}", operation_id="updateAdminRole")
def update_admin_role(
    role_id: str,
    request_data: RoleUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update role"""
    try:
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        from models.admin_permission import AdminRoleModel
        
        role = db.get(AdminRoleModel, role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Rol bulunamadı")
        
        # System role name cannot be changed
        if role.is_system_role and request_data.name and request_data.name != role.name:
            raise HTTPException(status_code=400, detail="Sistem rollerinin adı değiştirilemez")
        
        # Check name uniqueness
        if request_data.name and request_data.name.strip() != role.name:
            existing = db.query(AdminRoleModel).filter_by(name=request_data.name.strip()).first()
            if existing:
                raise HTTPException(status_code=400, detail="Bu isimde bir rol zaten var")
            role.name = request_data.name.strip()
        
        if request_data.description is not None:
            role.description = request_data.description
        
        db.commit()
        
        logger.info(f"Admin role updated: {role.name}")
        
        return ResponseEnvelope(data={
            'message': 'Rol güncellendi',
            'role': role.to_dict(include_permissions=True) if hasattr(role, 'to_dict') else {'id': role.id, 'name': role.name}
        })
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Update admin role error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/roles/{role_id}", operation_id="deleteAdminRole")
def delete_admin_role(
    role_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete role"""
    try:
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        from models.admin_permission import AdminRoleModel
        
        role = db.get(AdminRoleModel, role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Rol bulunamadı")
        
        if role.is_system_role:
            raise HTTPException(status_code=400, detail="Sistem rolleri silinemez")
        
        # Check if role has users
        user_count = role.users.count() if hasattr(role.users, 'count') else len(list(role.users))
        if user_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f'Bu role atanmış {user_count} kullanıcı var. Önce kullanıcıları başka bir role taşıyın.'
            )
        
        role_name = role.name
        db.delete(role)
        db.commit()
        
        logger.info(f"Admin role deleted: {role_name}")
        
        return ResponseEnvelope(message='Rol silindi')
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Delete admin role error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/roles/{role_id}/permissions", operation_id="listAdminRolePermissions")
def get_admin_role_permissions(
    role_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get role permissions"""
    try:
        if not access.is_super_admin and (not access.user or access.user.role not in ['admin', 'super_admin']):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from models.admin_permission import AdminRoleModel
        
        role = db.get(AdminRoleModel, role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Rol bulunamadı")
        
        return ResponseEnvelope(data={
            'role_id': role.id,
            'role_name': role.name,
            'is_system_role': role.is_system_role,
            'permissions': [p.to_dict() if hasattr(p, 'to_dict') else {'code': p.code} for p in role.permissions.all()]
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get role permissions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/roles/{role_id}/permissions", operation_id="updateAdminRolePermissions")
def update_admin_role_permissions(
    role_id: str,
    request_data: RolePermissionsUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update role permissions"""
    try:
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        from models.admin_permission import AdminRoleModel, AdminPermissionModel
        
        role = db.get(AdminRoleModel, role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Rol bulunamadı")
        
        # SuperAdmin permissions cannot be changed
        if role.name == 'SuperAdmin':
            raise HTTPException(status_code=400, detail="SuperAdmin rolünün izinleri değiştirilemez")
        
        # Clear existing permissions
        role.permissions = []
        db.flush()
        
        # Add new permissions
        for code in request_data.permissions:
            perm = db.query(AdminPermissionModel).filter_by(code=code).first()
            if perm:
                role.permissions.append(perm)
        
        db.commit()
        
        logger.info(f"Admin role permissions updated: {role.name}, {len(request_data.permissions)} permissions")
        
        return ResponseEnvelope(data={
            'message': 'Rol izinleri güncellendi',
            'role': role.to_dict(include_permissions=True) if hasattr(role, 'to_dict') else {'id': role.id, 'name': role.name}
        })
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Update role permissions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/permissions", operation_id="listAdminPermissions")
def get_admin_permissions(
    category: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all permissions"""
    try:
        if not access.is_super_admin and (not access.user or access.user.role not in ['admin', 'super_admin']):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from models.admin_permission import AdminPermissionModel
        
        query = db.query(AdminPermissionModel)
        if category:
            query = query.filter_by(category=category)
        
        permissions = query.order_by(AdminPermissionModel.category, AdminPermissionModel.code).all()
        
        # Group permissions by category
        grouped = {}
        ungrouped = []
        
        for perm in permissions:
            cat = perm.category
            if not cat and '.' in perm.code:
                cat = perm.code.split('.')[0]
            cat = cat or 'other'
            
            pdict = perm.to_dict() if hasattr(perm, 'to_dict') else {'code': perm.code}
            
            if cat in PERMISSION_CATEGORIES:
                if cat not in grouped:
                    grouped[cat] = {
                        'category': cat,
                        'label': PERMISSION_CATEGORIES[cat]['label'],
                        'icon': PERMISSION_CATEGORIES[cat]['icon'],
                        'permissions': []
                    }
                grouped[cat]['permissions'].append(pdict)
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
            'all': [p.to_dict() if hasattr(p, 'to_dict') else {'code': p.code} for p in permissions],
            'total': len(permissions)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get admin permissions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin-users", operation_id="listAdminAdminUsers")
def get_admin_users_with_roles(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get admin users with roles"""
    try:
        if not access.is_super_admin and (not access.user or access.user.role not in ['admin', 'super_admin']):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from models.admin_user import AdminUser
        
        users = db.query(AdminUser).filter_by(is_active=True).order_by(AdminUser.email).all()
        
        return ResponseEnvelope(data={
            'users': [
                u.to_dict(include_roles=True) if hasattr(u, 'to_dict') else {'id': u.id, 'email': u.email}
                for u in users
            ],
            'total': len(users)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get admin users error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin-users/{user_id}", operation_id="getAdminAdminUser")
def get_admin_user_detail(
    user_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get admin user detail"""
    try:
        if not access.is_super_admin and (not access.user or access.user.role not in ['admin', 'super_admin']):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from models.admin_user import AdminUser
        
        user = db.get(AdminUser, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        return ResponseEnvelope(data={
            'user': user.to_dict(include_roles=True) if hasattr(user, 'to_dict') else {'id': user.id, 'email': user.email}
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get admin user detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/admin-users/{user_id}/roles", operation_id="updateAdminAdminUserRoles")
def update_admin_user_roles(
    user_id: str,
    request_data: UserRolesUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update user roles"""
    try:
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        from models.admin_user import AdminUser
        from models.admin_permission import AdminRoleModel
        
        user = db.get(AdminUser, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # admin@x-ear.com must keep SuperAdmin role
        if user.email == 'admin@x-ear.com':
            super_admin = db.query(AdminRoleModel).filter_by(name='SuperAdmin').first()
            if super_admin and super_admin.id not in request_data.role_ids:
                raise HTTPException(
                    status_code=400,
                    detail='admin@x-ear.com kullanıcısından SuperAdmin rolü kaldırılamaz'
                )
        
        # Clear existing roles
        user.admin_roles = []
        db.flush()
        
        # Add new roles
        for role_id in request_data.role_ids:
            role = db.get(AdminRoleModel, role_id)
            if role:
                user.admin_roles.append(role)
        
        db.commit()
        
        logger.info(f"Admin user roles updated: {user.email}, {len(request_data.role_ids)} roles")
        
        return ResponseEnvelope(data={
            'message': 'Kullanıcı rolleri güncellendi',
            'user': user.to_dict(include_roles=True) if hasattr(user, 'to_dict') else {'id': user.id, 'email': user.email}
        })
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Update admin user roles error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-permissions", operation_id="listAdminMyPermissions")
def get_my_admin_permissions(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get current admin user's permissions"""
    try:
        from models.admin_user import AdminUser
        from models.admin_permission import AdminPermissionModel
        from models.user import User
        
        user_id = access.principal_id
        
        user = db.get(AdminUser, user_id)
        
        # If not found in AdminUser, check standard User table
        if not user:
            standard_user = db.get(User, user_id)
            if standard_user and standard_user.role == 'super_admin':
                all_permissions = db.query(AdminPermissionModel).all()
                return ResponseEnvelope(data={
                    'is_super_admin': True,
                    'permissions': [p.code for p in all_permissions],
                    'roles': ['SuperAdmin']
                })
            
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # SuperAdmin has all permissions
        if hasattr(user, 'is_super_admin') and user.is_super_admin():
            all_permissions = db.query(AdminPermissionModel).all()
            return ResponseEnvelope(data={
                'is_super_admin': True,
                'permissions': [p.code for p in all_permissions],
                'roles': ['SuperAdmin']
            })
        
        return ResponseEnvelope(data={
            'is_super_admin': False,
            'permissions': list(user.get_all_permissions()) if hasattr(user, 'get_all_permissions') else [],
            'roles': [r.name for r in user.admin_roles] if hasattr(user, 'admin_roles') else []
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get my admin permissions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
