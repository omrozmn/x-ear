"""
JWT Authentication & Authorization for HBYS microservices.
Validates tokens issued by X-EAR core API.
"""
import os
from typing import Optional
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
from .database import set_current_tenant_id

security = HTTPBearer(auto_error=False)

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


class CurrentUser(BaseModel):
    user_id: str
    tenant_id: str
    email: Optional[str] = None
    role: Optional[str] = None
    permissions: list[str] = []


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    """Extract and validate JWT token, set tenant context."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    tenant_id = payload.get("tenant_id") or payload.get("tenantId")
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No tenant context in token")

    # Set tenant context for DB queries
    set_current_tenant_id(tenant_id)

    return CurrentUser(
        user_id=payload.get("sub") or payload.get("user_id", ""),
        tenant_id=tenant_id,
        email=payload.get("email"),
        role=payload.get("role"),
        permissions=payload.get("permissions", []),
    )


def require_permission(permission: str):
    """Dependency that checks if user has a specific permission."""

    async def checker(user: CurrentUser = Depends(get_current_user)):
        if permission not in user.permissions and user.role != "admin":
            raise HTTPException(
                status_code=403,
                detail=f"Permission '{permission}' required",
            )
        return user

    return checker
