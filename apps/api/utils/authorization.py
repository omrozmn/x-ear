from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, get_jwt
from models.base import db
from models.user import User
from models.permission import Permission
from models.user_app_role import UserAppRole
from models.role import Role
import logging

logger = logging.getLogger(__name__)


def role_required(role):
    """Decorator to require that the current user has the given role."""
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = None
            try:
                user = db.session.get(User, user_id)
            except Exception:
                pass
            if not user:
                return jsonify({'success': False, 'error': 'Unauthorized'}), 401
            # Allow multiple roles if role is a tuple/list
            allowed_roles = role if isinstance(role, (list, tuple)) else [role]
            if user.role not in allowed_roles:
                return jsonify({'success': False, 'error': 'Forbidden - insufficient role'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def admin_required(fn):
    """Allow both 'admin' and 'tenant_admin' roles to access admin endpoints."""
    return role_required(['admin', 'tenant_admin'])(fn)


# New: permission system helpers

def can(user, permission_name, app_id=None):
    """Check whether the given user is granted the named permission.

    - Super-admin shortcut: if user.role == 'admin' return True.
    - If app_id is provided, check user's roles for that app and whether any
      of those roles include the requested permission.
    - If app_id is None, check any user_app_roles across apps for a matching permission.
    """
    if not user:
        return False

    # Super admin bypass
    if getattr(user, 'role', None) == 'admin':
        return True

    # Find permission
    perm = Permission.query.filter_by(name=permission_name).one_or_none()
    if not perm:
        return False

    # Gather role ids that include this permission
    role_ids = [r.id for r in perm.roles]
    if not role_ids:
        return False

    # If app_id provided, find user_app_roles for user+app
    query = UserAppRole.query.filter(UserAppRole.user_id == user.id)
    if app_id:
        query = query.filter(UserAppRole.app_id == app_id)

    user_roles = query.all()
    for ur in user_roles:
        if ur.role_id in role_ids:
            return True

    return False


def permission_required(permission_name, app_id_arg=None):
    """Decorator to require that the current user has given permission.

    If app_id_arg is provided, decorator will look for that kwarg in the
    wrapped function's kwargs to pass as app_id to the check. If omitted,
    permission is checked across any apps the user has roles for.
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = db.session.get(User, user_id)
            if not user:
                return jsonify({'success': False, 'error': 'Unauthorized'}), 401

            app_id = None
            if app_id_arg and app_id_arg in kwargs:
                app_id = kwargs[app_id_arg]
            # Allow app id from JSON body or query param as convenience
            if not app_id:
                app_id = request.json.get('app_id') if request.is_json and request.json else request.args.get('app_id')

            if not can(user, permission_name, app_id):
                return jsonify({'success': False, 'error': 'Forbidden - insufficient permission'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# =============================================================================
# CRM Permission System - Role-based permissions for CRM endpoints
# =============================================================================

def get_effective_role(user):
    """
    Get the effective role for the user.
    If the user is impersonating (via debug role switcher), return the impersonated role.
    Otherwise, return the user's actual role.
    """
    try:
        jwt_claims = get_jwt()
        # Check if impersonating via debug role switcher
        if jwt_claims.get('is_impersonating') and jwt_claims.get('effective_role'):
            return jwt_claims.get('effective_role')
    except Exception:
        pass
    
    return getattr(user, 'role', None)


def get_role_permissions(role_name):
    """
    Get all permission names for a given role.
    Returns a set of permission names.
    """
    # tenant_admin has all permissions
    if role_name == 'tenant_admin':
        return {p.name for p in Permission.query.all()}
    
    role = Role.query.filter_by(name=role_name).first()
    if not role:
        return set()
    
    return {p.name for p in role.permissions}


def has_crm_permission(user, permission_name):
    """
    Check if user has the specified CRM permission.
    Takes into account role impersonation for debug/QA purposes.
    
    Args:
        user: User object
        permission_name: Permission name like 'patients.delete'
    
    Returns:
        bool: True if user has permission, False otherwise
    """
    if not user:
        return False
    
    effective_role = get_effective_role(user)
    
    # tenant_admin, admin and super_admin have all permissions
    if effective_role in ('tenant_admin', 'admin', 'super_admin'):
        return True
    
    # Check if permission is in JWT claims (for impersonated roles)
    try:
        jwt_claims = get_jwt()
        if jwt_claims.get('is_impersonating') and jwt_claims.get('role_permissions'):
            return permission_name in jwt_claims.get('role_permissions', [])
    except Exception:
        pass
    
    # Fall back to database lookup
    permissions = get_role_permissions(effective_role)
    return permission_name in permissions


def crm_permission_required(permission_name):
    """
    Decorator to require that the current user has the specified CRM permission.
    
    This decorator checks:
    1. JWT authentication
    2. User exists
    3. User's role (or effective role if impersonating) has the permission
    
    Usage:
        @crm_permission_required('patients.delete')
        def delete_patient(patient_id):
            ...
    
    Args:
        permission_name: Permission name like 'patients.delete', 'sales.create', etc.
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({
                    'success': False, 
                    'error': 'Unauthorized - user not found'
                }), 401
            
            if not has_crm_permission(user, permission_name):
                effective_role = get_effective_role(user)
                logger.warning(
                    f"Permission denied: user={user.email}, role={effective_role}, "
                    f"required_permission={permission_name}"
                )
                return jsonify({
                    'success': False, 
                    'error': f'Bu işlem için yetkiniz yok: {permission_name}'
                }), 403
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def crm_any_permission_required(*permission_names):
    """
    Decorator that allows access if user has ANY of the specified permissions.
    
    Usage:
        @crm_any_permission_required('patients.view', 'patients.edit')
        def get_patient(patient_id):
            ...
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({
                    'success': False, 
                    'error': 'Unauthorized - user not found'
                }), 401
            
            for perm in permission_names:
                if has_crm_permission(user, perm):
                    return fn(*args, **kwargs)
            
            effective_role = get_effective_role(user)
            logger.warning(
                f"Permission denied: user={user.email}, role={effective_role}, "
                f"required_any={permission_names}"
            )
            return jsonify({
                'success': False, 
                'error': f'Bu işlem için yetkiniz yok'
            }), 403
        return wrapper
    return decorator
