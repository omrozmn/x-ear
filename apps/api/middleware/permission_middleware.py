"""FastAPI Permission Middleware (Flask-free)

Centralized permission enforcement based on `config/permissions_map.py`.

Why this exists:
- Avoid per-route permission boilerplate.
- Keep behavior consistent across all routers.

Expected outcome:
- No Flask/Flask-JWT-Extended dependency in runtime middleware.
- Permissions are enforced using JWT parsing directly in middleware.

G-02 COMPLIANCE:
- Uses pure ASGI callable middleware (not BaseHTTPMiddleware)
- Ensures proper context cleanup and performance
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Callable, Optional

from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp, Receive, Scope, Send
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


def parse_token_from_request(scope: Scope) -> Optional[AccessContextFromToken]:
    """Parse JWT token from Authorization header in ASGI scope"""
    headers = dict(scope.get("headers", []))
    auth_header = headers.get(b"authorization", b"").decode("utf-8")
    
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


class FastAPIPermissionMiddleware:
    """Pure ASGI callable permission middleware (G-02 compliant).
    
    Enforce permissions for all `/api` routes.

    Rules:
    - `public` endpoints bypass auth.
    - `None` permission means: JWT/auth required, but no specific permission.
    - Any other value requires the permission to be present in the resolved context.
    
    This is a pure ASGI middleware, NOT BaseHTTPMiddleware, for:
    - Better performance (no request/response wrapping overhead)
    - Correct ContextVar propagation
    - G-02 spec compliance
    """

    def __init__(self, app: ASGIApp, *, skip_admin_jwt: bool = True):
        self.app = app
        self._skip_admin_jwt = skip_admin_jwt

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        path = scope.get("path", "")

        # Preflight CORS requests
        if method == "OPTIONS":
            await self.app(scope, receive, send)
            return

        if not path.startswith("/api"):
            await self.app(scope, receive, send)
            return

        required_permission = get_permission_for_endpoint(method, path)
        if required_permission == "public":
            await self.app(scope, receive, send)
            return

        # Parse token directly from scope headers
        ctx = parse_token_from_request(scope)
        
        if ctx is None:
            # No valid token - let the endpoint handle auth (401)
            await self.app(scope, receive, send)
            return

        # Store context in scope state for potential use by endpoints
        if "state" not in scope:
            scope["state"] = {}
        scope["state"]["access_context"] = ctx

        # If endpoint needs only auth (no specific permission)
        if required_permission is None:
            await self.app(scope, receive, send)
            return

        # Admin panel endpoints: allow admin tokens
        if self._skip_admin_jwt and path.startswith("/api/admin/"):
            if ctx.is_admin:
                await self.app(scope, receive, send)
                return

            await self._send_json_error(
                scope, receive, send,
                401,
                {
                    "error": "Bu sayfaya erişim için admin paneli giriş tokenı gereklidir.",
                    "required": "admin_jwt",
                    "path": path,
                },
            )
            return

        # Admin roles bypass permission checks
        if ctx.role in {"tenant_admin", "admin", "super_admin"}:
            await self.app(scope, receive, send)
            return

        # Check specific permission
        if required_permission not in set(ctx.permissions):
            logger.warning(
                "Permission denied [MIDDLEWARE]: role=%s path=%s method=%s required=%s perms_count=%d has_perm=%s",
                ctx.role,
                path,
                method,
                required_permission,
                len(ctx.permissions),
                required_permission in ctx.permissions
            )
            await self._send_json_error(
                scope, receive, send,
                403,
                {
                    "error": f"Bu işlem için yetkiniz yok: {required_permission}",
                    "required_permission": required_permission,
                    "your_role": ctx.role,
                    "path": path,
                },
            )
            return

        await self.app(scope, receive, send)

    async def _send_json_error(
        self, 
        scope: Scope, 
        receive: Receive, 
        send: Send, 
        status_code: int, 
        payload: dict[str, Any]
    ) -> None:
        """Send a JSON error response directly via ASGI"""
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        
        await send({
            "type": "http.response.start",
            "status": status_code,
            "headers": [
                [b"content-type", b"application/json"],
                [b"content-length", str(len(body)).encode()],
            ],
        })
        await send({
            "type": "http.response.body",
            "body": body,
        })


# Legacy function for backward compatibility (deprecated)
def _json_error(status_code: int, payload: dict[str, Any]) -> Response:
    """Deprecated: Use _send_json_error in ASGI middleware instead"""
    return Response(
        content=json.dumps(payload, ensure_ascii=False),
        status_code=status_code,
        media_type="application/json",
    )

