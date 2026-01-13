"""
FastAPI Dependencies - DEPRECATED
=================================
This module is kept for backward compatibility only.
All new code should use middleware.unified_access instead.

Migration:
- get_current_context -> require_access()
- get_current_user -> require_access()
- get_current_admin_user -> require_admin()
- require_admin_permission -> require_access(..., admin_only=True)
- get_tenant_id -> access.tenant_id
"""
import os
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
import logging
import warnings

from database import get_db, set_current_tenant_id

logger = logging.getLogger(__name__)

# Config - JWT Security
# In production, JWT_SECRET_KEY MUST be set via environment variable
_env = os.getenv('ENVIRONMENT', 'development').lower()
SECRET_KEY = os.getenv('JWT_SECRET_KEY')

if not SECRET_KEY:
    if _env in ('production', 'prod', 'staging'):
        raise ValueError(
            "CRITICAL: JWT_SECRET_KEY environment variable must be set in production! "
            "Generate a secure key with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    # Development-only fallback (will log warning)
    SECRET_KEY = 'dev-only-insecure-key-do-not-use-in-prod'
    logger.warning("⚠️  Using insecure development JWT key. Set JWT_SECRET_KEY in production!")

ALGORITHM = "HS256"

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# =============================================================================
# DEPRECATED - Use middleware.unified_access instead
# =============================================================================

class AccessContext:
    """
    DEPRECATED: Use UnifiedAccess from middleware.unified_access instead.
    
    This class is kept for backward compatibility only.
    """
    
    def __init__(
        self,
        user=None,
        tenant_id=None,
        role=None,
        is_admin=False,
        is_super_admin=False,
        branch_id=None,
        permissions=None,
        user_type: str | None = None,
    ):
        self.user = user
        self.principal_id = user.id if user else None
        self.tenant_id = tenant_id
        self.role = role
        self.is_admin = is_admin
        self.is_super_admin = is_super_admin
        self.is_tenant_admin = role == 'tenant_admin'
        self.branch_id = branch_id
        self.permissions = permissions or []
        self.user_type = user_type
    
    def has_permission(self, permission: str) -> bool:
        if self.is_super_admin or self.is_tenant_admin:
            return True
        return permission in self.permissions


def get_current_context(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> AccessContext:
    """
    DEPRECATED: Use require_access() from middleware.unified_access instead.
    """
    warnings.warn(
        "get_current_context is deprecated. Use require_access() from middleware.unified_access",
        DeprecationWarning,
        stacklevel=2
    )
    from middleware.unified_access import _build_access_from_token
    access = _build_access_from_token(token, db)
    return AccessContext(
        user=access.user,
        tenant_id=access.tenant_id,
        role=access.role,
        is_admin=access.is_admin,
        is_super_admin=access.is_super_admin,
        permissions=access.permissions,
        user_type=access.user_type,
    )


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    DEPRECATED: Use require_access() from middleware.unified_access instead.
    """
    warnings.warn(
        "get_current_user is deprecated. Use require_access() from middleware.unified_access",
        DeprecationWarning,
        stacklevel=2
    )
    from models.user import User
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if not user.is_active:
            raise HTTPException(status_code=401, detail="User inactive")
        
        set_current_tenant_id(user.tenant_id)
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_admin_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    DEPRECATED: Use require_admin() from middleware.unified_access instead.
    """
    warnings.warn(
        "get_current_admin_user is deprecated. Use require_admin() from middleware.unified_access",
        DeprecationWarning,
        stacklevel=2
    )
    from models.admin_user import AdminUser
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        actual_id = user_id
        if str(user_id).startswith('admin_'):
            actual_id = user_id[6:]
        
        admin = db.get(AdminUser, actual_id)
        if not admin:
            raise HTTPException(status_code=401, detail="Admin user not found")
        
        if not admin.is_active:
            raise HTTPException(status_code=401, detail="Admin user inactive")
        
        return admin
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin_permission(*required_permissions: str):
    """
    DEPRECATED: Use require_access(..., admin_only=True) from middleware.unified_access instead.
    """
    warnings.warn(
        "require_admin_permission is deprecated. Use require_access(..., admin_only=True)",
        DeprecationWarning,
        stacklevel=2
    )
    
    def admin_permission_checker(admin_user=Depends(get_current_admin_user)):
        role = getattr(admin_user, "role", None)
        if role == "super_admin":
            return admin_user

        if not required_permissions:
            return admin_user

        permissions = getattr(admin_user, "permissions", None)
        if permissions is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Insufficient permissions", "code": "AUTH_FORBIDDEN"},
            )

        if isinstance(permissions, dict):
            has_all = all(bool(permissions.get(p)) for p in required_permissions)
        else:
            try:
                has_all = all(p in permissions for p in required_permissions)
            except TypeError:
                has_all = False

        if not has_all:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Insufficient permissions", "code": "AUTH_FORBIDDEN"},
            )

        return admin_user

    return admin_permission_checker


def get_tenant_id(ctx: AccessContext = Depends(get_current_context)) -> str:
    """
    DEPRECATED: Use access.tenant_id directly from UnifiedAccess instead.
    """
    warnings.warn(
        "get_tenant_id is deprecated. Use access.tenant_id from UnifiedAccess",
        DeprecationWarning,
        stacklevel=2
    )
    tenant_id = ctx.tenant_id
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Missing tenant context", "code": "TENANT_MISSING"},
        )
    return str(tenant_id)
