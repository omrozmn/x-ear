"""
Unified Access Decorator
------------------------
Provides the @unified_access decorator for securing endpoints using
the AccessContext pattern. This decorator simplifies controller logic
by handling authentication, authorization, and context injection.
"""

from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import verify_jwt_in_request
from utils.access_context import get_access_context
import logging

logger = logging.getLogger(__name__)

def unified_access(resource: str = None, action: str = None, permission: str = None):
    """
    Decorator to protect endpoints with Unified Access Control.
    
    This decorator performs the following steps:
    1. Verifies JWT (AuthN)
    2. Builds AccessContext (AuthZ + Scoping)
    3. Checks Permissions (RBAC) if specified
    4. Injects 'ctx' into the controller function
    
    Args:
        resource: Optional resource name (e.g. 'patients')
        action: Optional action (e.g. 'read')
        permission: Explicit permission string (e.g. 'patients:read')
                    If not provided, it's constructed from resource:action
                    
    Usage:
        @unified_access(resource='patients', action='read')
        def get_patients(ctx):
            ...
            
    The controller function MUST accept 'ctx' as its first positional argument
    (or as a named argument if configured differently, but convention is first).
    """
    
    # Construct required permission string
    required_permission = permission
    legacy_permission = None
    
    if not required_permission and resource and action:
        # 1. New Schema: resource.action (e.g., 'patients.view')
        # Map actions to new standard
        action_map = {'read': 'view', 'write': 'edit'} # Default write to edit, but specific routes should override
        mapped_action = action_map.get(action, action)
        required_permission = f"{resource}.{mapped_action}"
        
        # 2. Legacy Schema: singular:action (e.g., 'patient:read')
        resource_to_perm_key = {
            'patients': 'patient',
            'inventory': 'inventory',
            'suppliers': 'supplier',
            'invoices': 'invoice',
            'appointments': 'appointment',
            'devices': 'device',
            'sales': 'sale',
            'branches': 'branches',
            'payments': 'payments',
            'dashboard': 'dashboard',
            'users': 'users',
            'cash_records': 'cash_records',
        }
        if resource in resource_to_perm_key:
            perm_key = resource_to_perm_key[resource]
        elif resource.endswith('ies'):
            perm_key = resource[:-3] + 'y'
        elif resource.endswith('es'):
            perm_key = resource[:-2]
        elif resource.endswith('s'):
            perm_key = resource[:-1]
        else:
            perm_key = resource
        legacy_permission = f"{perm_key}:{action}"

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # 1. Verify JWT
            try:
                verify_jwt_in_request()
            except Exception as e:
                logger.warning(f"JWT verification failed: {e}")
                return jsonify({'error': 'Unauthorized', 'message': str(e)}), 401
            
            # 2. Build Access Context
            requested_tenant = request.args.get('tenant_id') or request.headers.get('X-Tenant-ID')
            
            ctx = get_access_context(requested_tenant_id=requested_tenant)
            if not ctx:
                return jsonify({'error': 'Unauthorized', 'message': 'Invalid security context'}), 401
            
            # 3. Check Permissions
            # Logic: Try new permission first. If not found, try legacy permission.
            if required_permission:
                has_perm = ctx.has_permission(required_permission)
                if not has_perm and legacy_permission:
                    has_perm = ctx.has_permission(legacy_permission)
                
                # Backward Compatibility: if action is create/edit/delete, also check generic 'write' legacy permission
                if not has_perm and legacy_permission and action in ['create', 'edit', 'delete']:
                     # Reconstruct generic write permission from legacy key
                     # legacy_permission is like "patient:create", we want "patient:write"
                     try:
                         base_key = legacy_permission.split(':')[0]
                         legacy_write = f"{base_key}:write"
                         if legacy_write != legacy_permission:
                             has_perm = ctx.has_permission(legacy_write)
                     except Exception:
                         pass

                if not has_perm:
                    logger.warning(f"Permission denied: User {ctx.principal_id} needs {required_permission} (or {legacy_permission})")
                    return jsonify({'error': 'Forbidden', 'message': f'Insufficient permissions. Required: {required_permission}'}), 403
            
            # 4. Inject context
            # We inject 'ctx' as a keyword argument to be safe with Flask's variable routing rules
            # The controller must define `ctx` in its signature.
            # However, Flask only passes URL variables to kwargs.
            # Standard practice with decorators modifying signature is tricky in Flask 2.0+ 
            # without proper Type Hinting tools, but passing it as kwarg usually works 
            # if the function accepts it.
            
            # Check if function expects 'ctx'
            # (In dynamic python we can just pass it, but if the route doesn't accept **kwargs, it might fail)
            # A safer way might be to rely on variable arguments, 
            # but let's assume all unified controllers have `ctx` arg.
            
            return fn(ctx=ctx, *args, **kwargs)
            
        return wrapper
    return decorator
