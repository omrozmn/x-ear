from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from models.base import db
from models.permission import Permission
from models.user import User
from models.role import Role
from utils.validation import is_valid_permission_name
from utils.admin_permissions import AdminPermissions
from config.tenant_permissions import TenantPermissions, get_permissions_for_role

permissions_bp = Blueprint('permissions', __name__)

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

@permissions_bp.route('/permissions', methods=['GET'])
@unified_access(permission=AdminPermissions.ROLES_READ)
def list_permissions(ctx):
    """List all permissions, grouped by category (Admin)"""
    # This seems to be for managing system global permissions
    # Filter out admin permissions for tenant context (Python side for reliability)
    # Only return permissions relevant to tenant operations
    all_perms = Permission.query.order_by(Permission.name).all()
    perms = [p for p in all_perms if not p.name.startswith('admin.') and not p.name.startswith('system.') and not p.name.startswith('activity_logs.')]
    
    # Group permissions by category
    grouped = {}
    ungrouped = []
    
    for p in perms:
        pdict = p.to_dict()
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
    
    return success_response({
        'data': result,
        'all': [p.to_dict() for p in perms]
    })

@permissions_bp.route('/permissions/my', methods=['GET'])
@unified_access()
def get_my_permissions(ctx):
    """Get current user's permissions based on their role"""
    user = ctx.user
    
    if not user:
        # Should not happen with unified_access unless token payload issue
        return error_response('User not found', code='USER_NOT_FOUND', status_code=404)
    
    # Super admin checks
    if user.role == 'super_admin':
         # Force Super Admin response regardless of tenant_id
         perms = Permission.query.order_by(Permission.name).all()
         return success_response({
             'permissions': [p.name for p in perms],
             'role': user.role,
             'isSuperAdmin': True
         })

    if user.role == 'admin':
        # Tenant Admin
        # Return full tenant permissions
        from config.tenant_permissions import _FULL_ADMIN_PERMISSIONS
        return success_response({
            'permissions': list(_FULL_ADMIN_PERMISSIONS),
            'role': user.role,
            'isSuperAdmin': False
        })

    # For Tenant Users, verify against role map in code
    # This is safer than DB permission list if we are moving to code-based permissions
    mapped_perms = get_permissions_for_role(user.role)
    
    return success_response({
        'permissions': list(mapped_perms),
        'role': user.role,
        'isSuperAdmin': False
    })


@permissions_bp.route('/permissions/role/<role_name>', methods=['GET'])
@unified_access(permission=AdminPermissions.ROLES_READ)
def get_role_permissions(ctx, role_name):
    """Get permissions for a specific role (Admin Panel)"""
    role = Role.query.filter_by(name=role_name).one_or_none()
    if not role:
        return error_response('Role not found', code='NOT_FOUND', status_code=404)
    
    return success_response({
        'role': role.to_dict(),
        'permissions': [p.name for p in role.permissions]
    })


@permissions_bp.route('/permissions/role/<role_name>', methods=['PUT'])
@unified_access(permission=AdminPermissions.ROLES_MANAGE)
def update_role_permissions(ctx, role_name):
    """Update permissions for a role (Admin Panel)"""
    role = Role.query.filter_by(name=role_name).one_or_none()
    if not role:
        return error_response('Role not found', code='NOT_FOUND', status_code=404)
    
    data = request.get_json() or {}
    permission_names = data.get('permissions', [])
    
    # Clear existing permissions
    role.permissions.clear()
    
    # Add new permissions
    for pname in permission_names:
        perm = Permission.query.filter_by(name=pname).one_or_none()
        if perm:
            role.permissions.append(perm)
    
    db.session.commit()
    
    return success_response({
        'role': role.to_dict(),
        'permissions': [p.name for p in role.permissions]
    })


@permissions_bp.route('/permissions', methods=['POST'])
@unified_access(permission=AdminPermissions.ROLES_MANAGE)
def create_permission(ctx):
    """Create a new permission (System Admin)"""
    # This might be rarely used if we define permissions in code
    data = request.get_json() or {}
    if not data.get('name'):
        return error_response('name required', code='MISSING_FIELD', status_code=400)
    if not is_valid_permission_name(data['name']):
        return error_response('invalid permission name', code='INVALID_NAME', status_code=400)
    if Permission.query.filter_by(name=data['name']).first():
        return error_response('permission exists', code='ALREADY_EXISTS', status_code=409)
        
    p = Permission()
    p.name = data['name']
    p.description = data.get('description')
    db.session.add(p)
    db.session.commit()
    return success_response(data=p.to_dict(), status_code=201)
