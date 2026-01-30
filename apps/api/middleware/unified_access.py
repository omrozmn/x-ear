"""
Unified Access Control for FastAPI
===================================
Flask'taki unified_access decorator'ının FastAPI karşılığı.

Tek bir yerden:
- JWT validation
- Tenant isolation
- Permission checking
- Admin/Tenant user ayrımı
- Impersonation desteği

Kullanım:
    from middleware.unified_access import UnifiedAccess, require_access

    # Dependency olarak
    @router.get("/patients")
    def list_patients(access: UnifiedAccess = Depends(require_access("patients.read"))):
        # access.tenant_id ile tenant-scoped query
        # access.user ile user bilgisi
        # access.has_permission("x") ile permission check
        pass

    # Public endpoint
    @router.get("/public")
    def public_endpoint(access: UnifiedAccess = Depends(require_access(public=True))):
        pass
"""

from __future__ import annotations

import os
import logging
from dataclasses import dataclass, field
from typing import Optional, Set, Any, Callable
from functools import lru_cache

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from database import get_db, set_current_tenant_id

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-dev-secret-key-change-in-prod')
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


@dataclass
class UnifiedAccess:
    """
    Unified access context - Flask'taki AccessContext'in FastAPI karşılığı.
    
    Tüm authorization bilgilerini tek bir yerde toplar.
    """
    # Identity
    user: Any = None
    user_id: Optional[str] = None
    user_type: str = "anonymous"  # "tenant", "admin", "anonymous"
    
    # Tenant context
    tenant_id: Optional[str] = None
    branch_id: Optional[str] = None
    
    # Role & Permissions
    role: Optional[str] = None
    permissions: Set[str] = field(default_factory=set)
    
    # Flags
    is_authenticated: bool = False
    is_admin: bool = False
    is_super_admin: bool = False
    is_tenant_admin: bool = False
    is_impersonating: bool = False
    
    # Raw JWT claims (for advanced use)
    claims: dict = field(default_factory=dict)
    
    @property
    def principal_id(self) -> Optional[str]:
        """Alias for user_id for backward compatibility"""
        return self.user_id
    
    def has_permission(self, permission: str) -> bool:
        """Check if user has specific permission"""
        if self.is_super_admin:
            return True
        # Platform admins and Tenant admins bypass non-platform permissions
        if (self.is_admin or self.is_tenant_admin) and not permission.startswith("admin."):
            return True
        return permission in self.permissions
    
    def require_permission(self, permission: str) -> None:
        """Raise 403 if permission not present"""
        if not self.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": f"Bu işlem için yetkiniz yok: {permission}",
                    "code": "PERMISSION_DENIED",
                    "required": permission,
                    "your_role": self.role
                }
            )
    
    def require_tenant(self) -> str:
        """Raise 401 if no tenant context"""
        if not self.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"message": "Tenant context required", "code": "TENANT_REQUIRED"}
            )
        return self.tenant_id
    
    def can_access_tenant(self, target_tenant_id: str) -> bool:
        """Check if user can access a specific tenant"""
        if self.is_super_admin:
            return True
        return self.tenant_id == target_tenant_id


def _build_access_from_token(
    token: Optional[str],
    db: Session
) -> UnifiedAccess:
    """Build UnifiedAccess from JWT token"""
    
    if not token:
        return UnifiedAccess()  # Anonymous
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        logger.debug(f"JWT decode failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Invalid token", "code": "INVALID_TOKEN"}
        )
    
    user_id = payload.get("sub")
    if not user_id:
        logger.error(f"Invalid token: missing subject (sub) claim. Payload keys: {list(payload.keys())}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Invalid token: missing subject", "code": "INVALID_TOKEN"}
        )
    
    # Check for impersonation
    is_impersonating = payload.get("is_impersonating", False)
    is_impersonating_tenant = payload.get("is_impersonating_tenant", False)
    
    # Admin user (prefixed with admin_)
    if str(user_id).startswith("admin_"):
        from models.admin_user import AdminUser
        
        actual_id = user_id[6:]
        admin = db.get(AdminUser, actual_id)
        
        if not admin:
            logger.error(f"Admin user not found in DB. ID: {actual_id}")
            raise HTTPException(status_code=401, detail="Admin user not found")
        if not admin.is_active:
            logger.error(f"Admin user inactive. ID: {actual_id}")
            raise HTTPException(status_code=401, detail="Admin user inactive")
        
        # Get permissions
        permissions = set()
        if hasattr(admin, 'get_all_permissions'):
            permissions = admin.get_all_permissions()
        elif payload.get('role_permissions'):
            permissions = set(payload.get('role_permissions', []))
        
        # Handle tenant impersonation
        effective_tenant_id = None
        if is_impersonating_tenant:
            effective_tenant_id = payload.get('effective_tenant_id') or payload.get('tenant_id')
            # CRITICAL: Set tenant context for query filtering
            if effective_tenant_id:
                set_current_tenant_id(effective_tenant_id)
        
        # Handle role impersonation
        effective_role = admin.role
        if is_impersonating:
            effective_role = payload.get('effective_role', admin.role)
            permissions = set(payload.get('role_permissions', []))
            # Also check for tenant_id in role impersonation
            if not effective_tenant_id:
                effective_tenant_id = payload.get('tenant_id') or payload.get('effective_tenant_id')
                if effective_tenant_id:
                    set_current_tenant_id(effective_tenant_id)
        
        return UnifiedAccess(
            user=admin,
            user_id=str(admin.id),
            user_type="admin",
            tenant_id=effective_tenant_id,
            role=effective_role,
            permissions=permissions,
            is_authenticated=True,
            is_admin=True,
            is_super_admin=(admin.role == "super_admin" and not is_impersonating),
            is_impersonating=is_impersonating or is_impersonating_tenant,
            claims=payload
        )
    
    # Regular tenant user
    from models.user import User
    
    user = db.get(User, user_id)
    if not user:
        logger.error(f"User not found in DB. ID: {user_id}")
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        logger.error(f"User user inactive. ID: {user_id}")
        raise HTTPException(status_code=401, detail="User inactive")
    
    # Check permission version - if changed, token is stale
    token_perm_ver = payload.get('perm_ver', 1)
    user_perm_ver = getattr(user, 'permissions_version', 1) or 1
    
    if token_perm_ver != user_perm_ver:
        logger.warning(f"Permission version mismatch. Token: {token_perm_ver}, User: {user_perm_ver}")
        raise HTTPException(
            status_code=401,
            detail={
                "message": "Permission değişikliği algılandı. Lütfen tekrar giriş yapın.",
                "code": "PERMISSIONS_CHANGED"
            }
        )
    
    # Set tenant context for query filtering
    set_current_tenant_id(user.tenant_id)
    
    # Get permissions from token first (faster), fallback to database
    permissions = set()
    if payload.get('role_permissions'):
        permissions = set(payload.get('role_permissions', []))
    
    # Fallback to database if token doesn't have permissions
    if not permissions:
        try:
            from models.role import Role
            role = db.query(Role).filter_by(name=user.role).first()
            if role and hasattr(role, 'permissions'):
                permissions = {p.name for p in role.permissions}
        except Exception as e:
            logger.warning(f"Failed to load role permissions: {e}")
    
    # Fallback to static permissions
    if not permissions:
        try:
            from config.tenant_permissions import get_permissions_for_role
            permissions = get_permissions_for_role(user.role)
        except Exception:
            pass
    
    return UnifiedAccess(
        user=user,
        user_id=str(user.id),
        user_type="tenant",
        tenant_id=user.tenant_id,
        branch_id=getattr(user, 'branch_id', None),
        role=user.role,
        permissions=permissions,
        is_authenticated=True,
        is_admin=False,
        is_super_admin=False,
        is_tenant_admin=(user.role in ("tenant_admin", "admin")),
        claims=payload
    )


def require_access(
    permission: Optional[str] = None,
    *,
    public: bool = False,
    admin_only: bool = False,
    tenant_required: bool = True
) -> Callable:
    """
    Dependency factory for unified access control.
    
    Args:
        permission: Required permission string (e.g., "patients.read")
        public: If True, allows unauthenticated access
        admin_only: If True, requires admin user
        tenant_required: If True, requires tenant context (default for tenant endpoints)
    
    Usage:
        @router.get("/patients")
        def list_patients(access: UnifiedAccess = Depends(require_access("patients.read"))):
            pass
    """
    
    def access_dependency(
        token: Optional[str] = Depends(oauth2_scheme),
        db: Session = Depends(get_db)
    ) -> UnifiedAccess:
        # Public endpoints
        if public:
            if token:
                try:
                    return _build_access_from_token(token, db)
                except HTTPException:
                    return UnifiedAccess()  # Invalid token on public = anonymous
            return UnifiedAccess()
        
        # Authenticated endpoints
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"message": "Authentication required", "code": "AUTH_REQUIRED"},
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        access = _build_access_from_token(token, db)
        
        # Admin only check
        if admin_only and not access.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Admin access required", "code": "ADMIN_REQUIRED"}
            )
        
        # Tenant context check (skip for admins without impersonation)
        if tenant_required and not access.is_admin and not access.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"message": "Tenant context required", "code": "TENANT_REQUIRED"}
            )
        
        # Permission check
        if permission:
            access.require_permission(permission)
        
        return access
    
    return access_dependency


# Convenience aliases
def require_auth() -> Callable:
    """Require authentication, no specific permission"""
    return require_access()


def require_admin() -> Callable:
    """Require admin user"""
    return require_access(admin_only=True, tenant_required=False)


def require_tenant_admin() -> Callable:
    """Require tenant admin role"""
    def check(access: UnifiedAccess = Depends(require_access())):
        if not access.is_tenant_admin and not access.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Tenant admin access required", "code": "TENANT_ADMIN_REQUIRED"}
            )
        return access
    return check
