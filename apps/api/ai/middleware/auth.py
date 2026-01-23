"""
JWT Authentication Middleware for AI Layer

FastAPI middleware that validates JWT tokens and sets tenant context for AI requests.
This middleware ensures proper tenant isolation and user authentication for all AI endpoints.

Requirements:
- 2.1: Extract and validate JWT token from Authorization header
- 2.3: Validate token signature using shared secret key
- 2.5: Extract tenant_id and user_id claims from token payload
- 2.6: Set tenant context using set_tenant_context(tenant_id)
- 2.8: Reset tenant context in finally block
- 2.9: Reject tokens without tenant_id claim
- 2.10: Only accept tenant_id from JWT claims (not from request body/query)

CRITICAL: This middleware uses ASGI callable pattern (NOT BaseHTTPMiddleware)
to prevent context leaks with streaming responses (G-02 requirement).

Security Rules:
- Token-based context management (NEVER use set_current_tenant_id(None))
- Always reset context in finally block
- Tenant ID ONLY from verified JWT claims
- No fallback to request body/query parameters for tenant_id
"""

import os
import logging
from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send
from jose import jwt, JWTError

from core.database import set_tenant_context, reset_tenant_context, TenantContextToken

logger = logging.getLogger(__name__)

# JWT Configuration
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-dev-secret-key-change-in-prod')
ALGORITHM = "HS256"

# HTTP status codes
HTTP_401_UNAUTHORIZED = 401


def _create_auth_error_response(detail: str, request_id: Optional[str] = None) -> JSONResponse:
    """
    Create a 401 response for authentication errors.
    
    Args:
        detail: Error message
        request_id: Optional request ID for tracing
        
    Returns:
        JSONResponse with 401 status and error details
    """
    error_response = {
        "success": False,
        "error": {
            "code": "AUTH_REQUIRED",
            "message": detail,
        },
        "requestId": request_id,
    }
    
    return JSONResponse(
        status_code=HTTP_401_UNAUTHORIZED,
        content=error_response,
        headers={"WWW-Authenticate": "Bearer"},
    )


class AIAuthMiddleware:
    """
    ASGI middleware to validate JWT tokens and set tenant context for AI endpoints.
    
    This middleware intercepts requests to /ai/* endpoints and:
    1. Extracts JWT token from Authorization header
    2. Validates token signature
    3. Extracts tenant_id and user_id claims
    4. Sets tenant context for database query filtering
    5. Attaches tenant_id and user_id to request.state
    6. Resets tenant context after request completion
    
    CRITICAL: Uses ASGI callable pattern (NOT BaseHTTPMiddleware) to prevent
    context leaks with streaming responses (G-02 requirement).
    
    Usage:
        from fastapi import FastAPI
        from ai.middleware.auth import AIAuthMiddleware
        
        app = FastAPI()
        app.add_middleware(AIAuthMiddleware)
    """
    
    def __init__(
        self,
        app: ASGIApp,
        ai_path_prefix: str = "/ai",
        exclude_paths: Optional[list[str]] = None,
    ):
        """
        Initialize the middleware.
        
        Args:
            app: The ASGI application
            ai_path_prefix: URL prefix for AI endpoints (default: /ai)
            exclude_paths: Paths to exclude from JWT validation (e.g., health checks)
        """
        self.app = app
        self.ai_path_prefix = ai_path_prefix
        self.exclude_paths = exclude_paths or [
            "/ai/status",  # Status endpoint may not require auth
            "/ai/health",  # Health check may not require auth
        ]
    
    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """
        ASGI callable interface.
        
        Args:
            scope: ASGI scope
            receive: ASGI receive callable
            send: ASGI send callable
        """
        # Only process HTTP requests
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        path = scope.get("path", "")
        
        # Only check AI endpoints
        if not path.startswith(self.ai_path_prefix):
            await self.app(scope, receive, send)
            return
        
        # Skip excluded paths
        for exclude_path in self.exclude_paths:
            if path.startswith(exclude_path):
                await self.app(scope, receive, send)
                return
        
        # Create Request object to access headers
        request = Request(scope, receive)
        
        # Extract Authorization header
        auth_header = request.headers.get("Authorization")
        
        if not auth_header:
            logger.warning(f"Missing Authorization header for AI request: {path}")
            response = _create_auth_error_response(
                "Missing or invalid authorization token",
                request_id=request.headers.get("X-Request-ID")
            )
            await response(scope, receive, send)
            return
        
        # Validate Bearer token format
        if not auth_header.startswith("Bearer "):
            logger.warning(f"Malformed Authorization header for AI request: {path}")
            response = _create_auth_error_response(
                "Missing or invalid authorization token",
                request_id=request.headers.get("X-Request-ID")
            )
            await response(scope, receive, send)
            return
        
        # Extract token
        token_str = auth_header.split(" ", 1)[1]
        
        # Decode and validate JWT
        try:
            payload = jwt.decode(token_str, SECRET_KEY, algorithms=[ALGORITHM])
        except JWTError as e:
            logger.warning(f"JWT validation failed for AI request: {path} - {e}")
            response = _create_auth_error_response(
                "Token expired or invalid",
                request_id=request.headers.get("X-Request-ID")
            )
            await response(scope, receive, send)
            return
        
        # Extract claims
        tenant_id = payload.get("tenant_id")
        user_id = payload.get("sub")  # Standard JWT claim for user ID
        
        # Validate tenant_id claim (CRITICAL: Requirement 2.9)
        if not tenant_id:
            logger.error(f"JWT missing tenant_id claim for AI request: {path}")
            response = _create_auth_error_response(
                "Token missing tenant_id claim",
                request_id=request.headers.get("X-Request-ID")
            )
            await response(scope, receive, send)
            return
        
        # Set tenant context (CRITICAL: Token-based management per G-02)
        context_token: Optional[TenantContextToken] = None
        
        try:
            # Set tenant context for database query filtering
            context_token = set_tenant_context(tenant_id)
            
            # Attach to request state for downstream use
            # Note: We need to modify the scope's state dict directly
            if "state" not in scope:
                scope["state"] = {}
            
            scope["state"]["tenant_id"] = tenant_id
            scope["state"]["user_id"] = user_id
            
            logger.debug(
                f"AI request authenticated: path={path}, tenant={tenant_id}, user={user_id}"
            )
            
            # Continue to next middleware/app
            await self.app(scope, receive, send)
            
        finally:
            # CRITICAL: Always reset tenant context (Requirement 2.8, G-02)
            if context_token is not None:
                reset_tenant_context(context_token)
                logger.debug(f"Tenant context reset for AI request: {path}")


async def ai_auth_middleware(request: Request, call_next):
    """
    Function-based middleware for JWT authentication (alternative to ASGI middleware).
    
    This is a simpler alternative to AIAuthMiddleware class, but may have
    context leak issues with streaming responses. Use AIAuthMiddleware class instead.
    
    DEPRECATED: Use AIAuthMiddleware class for production.
    
    Args:
        request: FastAPI request
        call_next: Next middleware/handler
        
    Returns:
        Response from downstream handler
        
    Raises:
        HTTPException: If authentication fails
    """
    # Extract Authorization header
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "error": {
                    "code": "AUTH_REQUIRED",
                    "message": "Missing or invalid authorization token",
                },
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token_str = auth_header.split(" ", 1)[1]
    
    # Validate and decode JWT
    try:
        payload = jwt.decode(token_str, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        return JSONResponse(
            status_code=HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "error": {
                    "code": "AUTH_REQUIRED",
                    "message": "Token expired or invalid",
                },
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract claims
    tenant_id = payload.get("tenant_id")
    user_id = payload.get("sub")
    
    if not tenant_id:
        logger.error("JWT missing tenant_id claim")
        return JSONResponse(
            status_code=HTTP_401_UNAUTHORIZED,
            content={
                "success": False,
                "error": {
                    "code": "AUTH_REQUIRED",
                    "message": "Token missing tenant_id claim",
                },
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Set tenant context
    context_token = set_tenant_context(tenant_id)
    
    # Attach to request state
    request.state.tenant_id = tenant_id
    request.state.user_id = user_id
    
    try:
        response = await call_next(request)
        return response
    finally:
        # Always reset context
        reset_tenant_context(context_token)
