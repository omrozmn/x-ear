"""FastAPI Permission Middleware (Flask-free)

Centralized permission enforcement based on `config/permissions_map.py`.

Why this exists:
- Avoid per-route permission boilerplate.
- Keep behavior consistent across all routers.

Expected outcome:
- No Flask/Flask-JWT-Extended dependency in runtime middleware.
- Permissions are enforced using JWT parsing directly in middleware.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from jose import jwt, JWTError

from config.permissions_map import get_permission_for_endpoint

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-dev-secret-key-change-in-prod')
ALGORITHM = "HS256"


class AccessContextFromToken:
    """Lightweight access context parsed directly from JWT token"""
    
    def __init__(self, payload: dict):
        self.payload = payload
        self.user_id = payload.get("sub")
        self.tenant_id = payload.get("tenant_id") or payload.get("access.tenant_id")
        self.role = payload.get("role")
        self.user_type = payload.get("user_type")
        self.permissions = payload.get("role_permissions", [])
        self.is_impersonating = payload.get("is_impersonating", False)
        
    @property
    def is_admin(self) -> bool:
        return self.user_type == "admin" or str(self.user_id).startswith("admin_")
    
    @property
    def is_super_admin(self) -> bool:
        return self.role == "super_admin"


def parse_token_from_request(request: Request) -> Optional[AccessContextFromToken]:
    """Parse JWT token from Authorization header"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header[7:]  # Remove "Bearer " prefix
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        ctx = AccessContextFromToken(payload)
        logger.info(f"Token parsed: role={ctx.role}, perms_count={len(ctx.permissions)}")
        return ctx
    except JWTError as e:
        logger.warning(f"JWT decode failed: {e}")
        return None


class FastAPIPermissionMiddleware(BaseHTTPMiddleware):
    """Enforce permissions for all `/api` routes.

    Rules:
    - `public` endpoints bypass auth.
    - `None` permission means: JWT/auth required, but no specific permission.
    - Any other value requires the permission to be present in the resolved context.
    """

    def __init__(self, app, *, skip_admin_jwt: bool = True):
        super().__init__(app)
        self._skip_admin_jwt = skip_admin_jwt

    async def dispatch(self, request: Request, call_next):
        # Preflight CORS requests
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if not path.startswith("/api"):
            return await call_next(request)

        required_permission = get_permission_for_endpoint(request.method, path)
        if required_permission == "public":
            return await call_next(request)

        # Parse token directly (not using dependency injection)
        ctx = parse_token_from_request(request)
        
        if ctx is None:
            # No valid token - let the endpoint handle auth (401)
            return await call_next(request)

        # Store context in request state for potential use by endpoints
        request.state.access_context = ctx

        # If endpoint needs only auth (no specific permission)
        if required_permission is None:
            return await call_next(request)

        # Admin panel endpoints: allow admin tokens
        if self._skip_admin_jwt and path.startswith("/api/admin/"):
            if ctx.is_admin:
                return await call_next(request)

            return _json_error(
                401,
                {
                    "error": "Bu sayfaya erişim için admin paneli giriş tokenı gereklidir.",
                    "required": "admin_jwt",
                    "path": path,
                },
            )

        # Admin roles bypass permission checks
        if ctx.role in {"tenant_admin", "admin", "super_admin"}:
            return await call_next(request)

        # Check specific permission
        if required_permission not in set(ctx.permissions):
            logger.warning(
                "Permission denied [MIDDLEWARE]: role=%s path=%s method=%s required=%s perms_count=%d has_perm=%s",
                ctx.role,
                path,
                request.method,
                required_permission,
                len(ctx.permissions),
                required_permission in ctx.permissions
            )
            return _json_error(
                403,
                {
                    "error": f"Bu işlem için yetkiniz yok: {required_permission}",
                    "required_permission": required_permission,
                    "your_role": ctx.role,
                    "path": path,
                },
            )

        return await call_next(request)


def _json_error(status_code: int, payload: dict[str, Any]) -> Response:
    import json

    return Response(
        content=json.dumps(payload, ensure_ascii=False),
        status_code=status_code,
        media_type="application/json",
    )
