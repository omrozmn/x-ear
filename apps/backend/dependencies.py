import os
from typing import Optional, List, Union
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from datetime import datetime

from models.base import db
from models.user import User
from models.admin_user import AdminUser
from models.permission import Permission
from models.role import Role
from utils.tenant_security import UnboundSession
from schemas.base import ApiError
import logging

# Logger
logger = logging.getLogger(__name__)

# Config
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-dev-secret-key-change-in-prod')
ALGORITHM = "HS256"

# OAuth2 scheme for Swagger UI mechanism
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class AccessContext:
    """
    Mirror of the AccessContext class from utils/decorators.py
    Holds the security context for the current request.
    """
    def __init__(self, user=None, tenant_id=None, role=None, is_admin=False, is_super_admin=False, branch_id=None):
        self.user = user
        self.principal_id = user.id if user else None
        self.tenant_id = tenant_id
        self.role = role
        self.is_admin = is_admin # Generic admin flag
        self.is_super_admin = is_super_admin
        self.is_tenant_admin = role == 'tenant_admin'
        self.branch_id = branch_id
        
    def has_permission(self, permission: str) -> bool:
        """Check if context has specific permission"""
        if self.is_super_admin or self.is_tenant_admin:
            return True
        # TODO: Implement granular permission check logic caching
        return True # For now, permissive if authenticated, similar to unified_access default behavior without granular checks

    def require_resource_permission(self, resource: str, action: str) -> None:
        """
        Check if context has permission for resource/action.
        Raises HTTPException if not permitted.
        """
        permission = f"{resource}:{action}"
        if not self.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ApiError(
                    message="Insufficient permissions",
                    code="AUTH_FORBIDDEN",
                    details={"resource": resource, "action": action},
                ).model_dump(mode="json"),
            )

from app import app
from contextlib import contextmanager

def get_db():
    """
    Yields the thread-local Flask-SQLAlchemy session.
    Manually manages app context for FastAPI compatibility.
    """
    ctx = app.app_context()
    ctx.push()
    try:
        yield db.session
    except Exception:
        db.session.rollback()
        raise
    finally:
        ctx.pop()

async def get_current_user_token(token: str = Depends(oauth2_scheme)):
    """Validates JWT and returns payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ApiError(message="Could not validate credentials", code="AUTH_INVALID_TOKEN").model_dump(mode="json"),
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_context(
    token: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
) -> AccessContext:
    """
    FastAPI dependency that replicates @unified_access behavior.
    Returns an AccessContext object.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        claims = payload # simplified, claims are usually top level or in 'claims' dict

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ApiError(message="Missing token subject", code="AUTH_MISSING_SUB").model_dump(mode="json"),
            )
        
        # Handle Admin Users (prefixed with admin_)
        if str(user_id).startswith('admin_'):
             # Logic for AdminUser
             pass
        
        # Regular User
        # We rely on UnboundSession behavior for cross-tenant lookups if needed, 
        # but usually we just want to find the user.
        user = db_session.get(User, user_id)
        
        if not user:
            # Try finding AdminUser
            if str(user_id).startswith('admin_'):
                 actual_id = user_id[6:]
                 admin = db_session.get(AdminUser, actual_id)
                 if admin:
                     return AccessContext(
                         user=admin,
                         tenant_id=None,
                         role=admin.role,
                         is_admin=True,
                         is_super_admin=admin.role == 'super_admin'
                     )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ApiError(message="User not found", code="AUTH_USER_NOT_FOUND").model_dump(mode="json"),
            )
            
        if not user.is_active:
             raise HTTPException(
                 status_code=status.HTTP_401_UNAUTHORIZED,
                 detail=ApiError(message="User inactive", code="AUTH_USER_INACTIVE").model_dump(mode="json"),
             )
             
        # Create Context
        ctx = AccessContext(
            user=user,
            tenant_id=user.tenant_id,
            role=user.role,
            is_admin=user.role in ['admin', 'tenant_admin'],
            is_super_admin=False # Regular users aren't super admins
        )
        
        return ctx
        
    except JWTError as e:
        logger.error(f"JWT Validation Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ApiError(message="Invalid token", code="AUTH_INVALID_TOKEN").model_dump(mode="json"),
        )
    except Exception as e:
        logger.error(f"Context Creation Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ApiError(message="Authentication failed", code="AUTH_CONTEXT_FAILED").model_dump(mode="json"),
        )

# Permission Factories
def require_permission(permission: str):
    """Dependency factory for checking specific permissions"""
    def permission_checker(ctx: AccessContext = Depends(get_current_context)):
        if not ctx.has_permission(permission):
             raise HTTPException(
                 status_code=status.HTTP_403_FORBIDDEN,
                 detail=ApiError(
                     message="Insufficient permissions",
                     code="AUTH_FORBIDDEN",
                     details={"permission": permission},
                 ).model_dump(mode="json"),
             )
        return ctx
    return permission_checker

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
) -> User:
    """Get current authenticated user (tenant user)"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = db_session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if not user.is_active:
            raise HTTPException(status_code=401, detail="User inactive")
        
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_admin_user(
    token: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
) -> AdminUser:
    """Get current authenticated admin user"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        user_type = payload.get("user_type")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Handle admin_ prefix
        actual_id = user_id
        if str(user_id).startswith('admin_'):
            actual_id = user_id[6:]
        
        admin = db_session.get(AdminUser, actual_id)
        if not admin:
            raise HTTPException(status_code=401, detail="Admin user not found")
        
        if not admin.is_active:
            raise HTTPException(status_code=401, detail="Admin user inactive")
        
        return admin
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
