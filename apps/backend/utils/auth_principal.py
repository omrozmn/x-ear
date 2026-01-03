"""
Authentication Principal Utilities
----------------------------------
Unified principal resolution for tenant users, tenant admins, and super admins.
This module provides a single interface to resolve the authenticated user
regardless of their role type.

IMPORTANT: Three distinct user types exist:
1. Tenant User (users table, role='user') - Regular tenant user
2. Tenant Admin (users table, role='admin'/'owner') - Tenant administrator
3. Super Admin (admin_users table) - Platform administrator

Only Super Admin can access cross-tenant data!
"""

from dataclasses import dataclass
from typing import Optional
from enum import Enum
from flask import g
from flask_jwt_extended import get_jwt_identity, get_jwt
from models.base import db
from models.user import User
from models.admin_user import AdminUser
import logging

logger = logging.getLogger(__name__)


class PrincipalKind(str, Enum):
    """Principal type enumeration"""
    TENANT_USER = "tenant_user"       # Regular tenant user (users table, role='user')
    TENANT_ADMIN = "tenant_admin"     # Tenant administrator (users table, role='admin')
    SUPER_ADMIN = "super_admin"       # Platform administrator (admin_users table)


# Tenant admin roles (configurable)
TENANT_ADMIN_ROLES = {'admin', 'owner', 'manager'}


@dataclass(frozen=True)
class Principal:
    """
    Represents the authenticated principal for the current request.
    
    Attributes:
        kind: Type of principal (PrincipalKind enum value)
        id: Principal ID (user_id or admin_id)
        tenant_id: Tenant ID for tenant users/admins, None for super admins
        admin: AdminUser instance if super admin, None otherwise
        user: User instance if tenant user/admin, None otherwise
        claims: JWT claims dictionary
    """
    kind: PrincipalKind
    id: str
    tenant_id: Optional[str]
    admin: Optional[AdminUser]
    user: Optional[User]
    claims: dict

    @property
    def is_super_admin(self) -> bool:
        """Check if principal is a super admin (platform administrator)"""
        return self.kind == PrincipalKind.SUPER_ADMIN

    @property
    def is_tenant_admin(self) -> bool:
        """Check if principal is a tenant admin"""
        return self.kind == PrincipalKind.TENANT_ADMIN

    @property
    def is_tenant_user(self) -> bool:
        """Check if principal is a regular tenant user"""
        return self.kind == PrincipalKind.TENANT_USER

    @property
    def is_tenant_member(self) -> bool:
        """Check if principal belongs to a tenant (user or admin)"""
        return self.kind in (PrincipalKind.TENANT_USER, PrincipalKind.TENANT_ADMIN)
    
    @property
    def can_manage_tenant(self) -> bool:
        """Check if principal can manage their tenant (tenant admin or super admin)"""
        return self.kind in (PrincipalKind.TENANT_ADMIN, PrincipalKind.SUPER_ADMIN)

    def to_dict(self) -> dict:
        """Convert principal to dictionary"""
        return {
            'kind': self.kind.value,
            'id': self.id,
            'tenant_id': self.tenant_id,
            'is_super_admin': self.is_super_admin,
            'is_tenant_admin': self.is_tenant_admin,
            'is_tenant_user': self.is_tenant_user,
            'is_tenant_member': self.is_tenant_member,
            'claims': self.claims
        }


def get_current_principal() -> Optional[Principal]:
    """
    Resolve the authenticated principal for the current request.
    
    This function:
    1. Checks Flask g context for cached principal
    2. Resolves JWT identity and claims
    3. Determines principal type based on ID prefix and role
    4. Loads appropriate user model
    5. Caches result in Flask g for request duration
    
    Returns:
        Principal object if authenticated, None otherwise
        
    Principal Type Resolution:
        - ID starts with 'admin_' → SUPER_ADMIN (admin_users table)
        - ID starts with 'usr_' + role in TENANT_ADMIN_ROLES → TENANT_ADMIN (users table)
        - ID starts with 'usr_' + other role → TENANT_USER (users table)
        
    Example:
        ```python
        @jwt_required()
        def my_endpoint():
            principal = get_current_principal()
            if not principal:
                return jsonify({'error': 'Unauthorized'}), 401
                
            if principal.is_super_admin:
                # Cross-tenant access allowed
                pass
            elif principal.is_tenant_admin:
                # Tenant-scoped admin access
                data = query_tenant_data(principal.tenant_id)
            else:
                # Regular user access
                data = query_user_data(principal.tenant_id, principal.id)
        ```
    """
    # Check if already cached in request context
    if hasattr(g, '_current_principal'):
        return g._current_principal
    
    try:
        # Get JWT identity and claims
        principal_id = get_jwt_identity()
        if not principal_id:
            g._current_principal = None
            return None
            
        claims = get_jwt() or {}
        
        # SUPER ADMIN: ID starts with 'admin_' → admin_users table
        if str(principal_id).startswith('admin_'):
            # Strip the 'admin_' prefix to get the actual UUID in database
            actual_admin_id = principal_id[6:] if principal_id.startswith('admin_') else principal_id
            admin = db.session.get(AdminUser, actual_admin_id)
            if not admin:
                logger.warning(f"Super admin user not found: {principal_id} (looked up as {actual_admin_id})")
                g._current_principal = None
                return None
            
            principal = Principal(
                kind=PrincipalKind.SUPER_ADMIN,
                id=admin.id,
                tenant_id=None,  # Super admins don't belong to a tenant
                admin=admin,
                user=None,
                claims=claims
            )
        else:
            # TENANT USER/ADMIN: ID starts with 'usr_' → users table
            user = db.session.get(User, principal_id)
            if not user:
                logger.warning(f"Tenant user not found: {principal_id}")
                g._current_principal = None
                return None
            
            # Determine principal kind based on role
            user_role = (user.role or '').lower()
            
            if user_role == 'super_admin':
                 kind = PrincipalKind.SUPER_ADMIN
            elif user_role in TENANT_ADMIN_ROLES:
                 kind = PrincipalKind.TENANT_ADMIN
            else:
                 kind = PrincipalKind.TENANT_USER
            
            principal = Principal(
                kind=kind,
                id=user.id,
                tenant_id=user.tenant_id,  # Tenant users MUST have tenant_id
                admin=None,
                user=user,
                claims=claims
            )
        
        # Cache in request context
        g._current_principal = principal
        return principal
        
    except Exception as e:
        logger.error(f"Error resolving principal: {e}", exc_info=True)
        g._current_principal = None
        return None


def require_principal():
    """
    Helper to ensure principal exists.
    Use after @jwt_required()
    
    Returns:
        Principal if authenticated, or error response tuple
        
    Example:
        ```python
        @jwt_required()
        def my_endpoint():
            principal = require_principal()
            if isinstance(principal, tuple):  # Error response
                return principal
            # Use principal here
        ```
    """
    principal = get_current_principal()
    if not principal:
        from flask import jsonify
        return jsonify({'error': 'Unauthorized'}), 401
    return principal
