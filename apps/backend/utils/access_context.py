"""
Access Context - Request-Scope Authentication Context
-----------------------------------------------------
Provides a higher-level abstraction over Principal that includes
permission checking and tenant scoping logic.
"""

from dataclasses import dataclass
from typing import Optional, Set
from flask import g
from utils.auth_principal import get_current_principal, Principal, PrincipalKind
from utils.admin_permissions import AdminPermissions
from config.tenant_permissions import get_permissions_for_role
import logging

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AccessContext:
    """
    Request-scoped access context providing unified interface for
    authorization and tenant scoping.
    
    Attributes:
        principal_kind: 'admin' or 'tenant'
        principal_id: User/Admin ID
        permissions: Set of permission strings (RBAC)
        
        tenant_id: Effective tenant scope (ABAC)
            - For Tenant Users: Fixed to their tenant
            - For Super Admins: Selected tenant or None (Global)
            
        allowed_tenants: Set of accessible tenant IDs (ABAC)
            - For Tenant Users: {own_tenant_id}
            - For Super Admins: None (All tenants) OR specific set if restricted
            
        claims: JWT claims
    """
    principal_kind: PrincipalKind
    principal_id: str
    permissions: Set[str]
    tenant_id: Optional[str]
    allowed_tenants: Optional[Set[str]]
    claims: dict
    
    # Keep reference to principal for advanced use cases
    _principal: Principal = None

    @property
    def is_super_admin(self) -> bool:
        """Check if current context is for a super admin"""
        return self.principal_kind == PrincipalKind.SUPER_ADMIN
    
    @property
    def is_tenant_member(self) -> bool:
        """Check if principal is a tenant member (user or admin)"""
        return self.principal_kind in (PrincipalKind.TENANT_USER, PrincipalKind.TENANT_ADMIN)
    
    @property
    def is_tenant_admin(self) -> bool:
        """Check if principal is a tenant administrator"""
        return self.principal_kind == PrincipalKind.TENANT_ADMIN
    
    @property
    def is_tenant_user(self) -> bool:
        """Check if principal is a regular tenant user"""
        return self.principal_kind == PrincipalKind.TENANT_USER

    @property
    def user(self):
        """Get the underlying user object if available"""
        # If impersonating, return a simulated User object
        if self.claims.get('is_impersonating'):
            return self._create_impersonated_user()
            
        return self._principal.user if self._principal else None
    
    def _create_impersonated_user(self):
        """Create a mock User object for impersonation compatibility"""
        try:
            from models.user import User
            
            # Extract data from connection/claims
            role = self.claims.get('effective_role', 'user')
            tenant_id = self.claims.get('tenant_id')
            
            # Use real user details if available
            real_user_id = self.claims.get('real_user_id')
            real_email = self.claims.get('real_user_email')
            
            if not real_user_id:
                return None
                
            # Create transient User object (not attached to session)
            u = User(
                id=real_user_id,
                email=real_email,
                username=real_email.split('@')[0] if real_email else 'admin_impersonator',
                tenant_id=tenant_id,
                role=role,
                first_name='QA',
                last_name='Admin',
                is_active=True
            )
            return u
        except Exception as e:
            logger.error(f"Failed to create impersonated user: {e}")
            return None
    
    def has_permission(self, permission: str) -> bool:
        """
        Check if context has a specific permission.
        Args:
            permission: Permission string or AdminPermissions enum value
        """
        # Super Admins have global access
        if self.is_super_admin:
            return True

        # Convert enum to string if necessary
        perm_str = permission.value if isinstance(permission, AdminPermissions) else str(permission)
        return perm_str in self.permissions
    
    def require_permission(self, permission: str) -> bool:
        """Require a specific permission, raise if not present."""
        if not self.has_permission(permission):
            # Using specific exception type is better but for now simple error
            raise PermissionError(f"Missing required permission: {permission}")
        return True
    
    def to_dict(self) -> dict:
        """Convert context to dictionary"""
        return {
            'principal_kind': self.principal_kind.value,
            'principal_id': self.principal_id,
            'tenant_id': self.tenant_id,
            'allowed_tenants': list(self.allowed_tenants) if self.allowed_tenants else None,
            'permissions': list(self.permissions),
            'claims': self.claims
        }


def get_access_context(requested_tenant_id: Optional[str] = None) -> Optional[AccessContext]:
    """
    Get or create the access context for the current request.
    
    Args:
        requested_tenant_id: Optional tenant ID requested by Super Admin to switch context.
                             Ignored for Tenant Users (locked to their own tenant).
    
    Returns:
        AccessContext if authenticated, None otherwise
    """
    # Check if already cached in request context
    # Note: If requested_tenant_id changes in same request, we might need to invalidate
    # but that's a rare edge case. For now simple caching.
    if hasattr(g, '_access_context') and g._access_context:
        # If Super Admin requests a different tenant than cached, we might need to rebuild
        # But generally ctx is built once per request.
        return g._access_context
    
    try:
        # Get principal first
        principal = get_current_principal()
        if not principal:
            g._access_context = None
            return None
        
        permissions: Set[str] = set()
        effective_tenant_id: Optional[str] = None
        allowed_tenants: Optional[Set[str]] = None
        
        # 1. Resolve Permissions & Scope based on Principal Type
        
        if principal.is_super_admin:
            # SUPER ADMIN
            # Check for impersonation (QA Role Switcher)
            if principal.claims.get('is_impersonating'):
                # Override super admin logic - use permissions from token
                permissions = set(principal.claims.get('role_permissions', []))
                
                # Scope: Locked to target tenant from token
                effective_tenant_id = principal.claims.get('tenant_id')
                allowed_tenants = {effective_tenant_id} if effective_tenant_id else set()
                
                logger.info(f"Impersonating role: {principal.claims.get('effective_role')} for tenant {effective_tenant_id}")
                
            else:
                # NORMAL SUPER ADMIN behavior
                # Permissions from role (admin_roles) or claims
                if principal.admin and hasattr(principal.admin, 'get_all_permissions'):
                     permissions = principal.admin.get_all_permissions()
                elif 'permissions' in principal.claims:
                    permissions = set(principal.claims.get('permissions', []))
                
                # Scope: Can be Global (None) or Specific Tenant
                effective_tenant_id = requested_tenant_id
                allowed_tenants = None # None means "All Access"
            
        else:
            # TENANT USER / ADMIN
            # Permissions from Role Mapping (RBAC)
            # Permissions from Role Mapping (RBAC)
            role_name = principal.user.role if principal.user else 'user'
            
            # Try DB (Dynamic Roles)
            permissions = set()
            try:
                # Import here to avoid circular dependencies
                from models.role import Role
                db_role = Role.query.filter_by(name=role_name).first()
                if db_role:
                    permissions = {p.name for p in db_role.permissions}
            except Exception as e:
                logger.warning(f"Failed to fetch role permissions from DB: {e}")
            
            # Fallback to static map if DB failed or role not found or empty permissions (optional)
            if not permissions:
                 permissions = get_permissions_for_role(role_name)
            
            # Scope: Locked to own tenant
            effective_tenant_id = principal.tenant_id
            allowed_tenants = {principal.tenant_id} if principal.tenant_id else set()
            
            # Security check: Tenant user CANNOT request other tenants
            if requested_tenant_id and requested_tenant_id != principal.tenant_id:
                logger.warning(f"Tenant user {principal.id} tried to access {requested_tenant_id}")
                # We enforce their own tenant regardless of what they asked
                effective_tenant_id = principal.tenant_id
        
        # Determine effective kind
        context_kind = principal.kind
        if principal.claims.get('is_impersonating'):
            role = principal.claims.get('effective_role')
            if role in ['tenant_admin', 'admin']:
                context_kind = PrincipalKind.TENANT_ADMIN
            else:
                context_kind = PrincipalKind.TENANT_USER
        
        # Build access context
        context = AccessContext(
            principal_kind=context_kind,
            principal_id=principal.id,
            permissions=permissions,
            tenant_id=effective_tenant_id,
            allowed_tenants=allowed_tenants,
            claims=principal.claims,
            _principal=principal
        )
        
        # Cache in request context
        g._access_context = context
        return context
        
    except Exception as e:
        logger.error(f"Error creating access context: {e}", exc_info=True)
        g._access_context = None
        return None


def require_access_context(tenant_id: Optional[str] = None):
    """
    Decorator helper to ensure access context exists.
    """
    ctx = get_access_context(requested_tenant_id=tenant_id)
    if not ctx:
        from flask import jsonify
        return jsonify({'error': 'Unauthorized'}), 401
    return ctx
