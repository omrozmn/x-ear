"""
Kill Switch Middleware for AI Layer

FastAPI middleware that checks kill switch status on every AI request.
Returns 503 Service Unavailable when kill switch is active.

Requirements:
- 15.4: WHEN Kill_Switch is activated, reject all new requests immediately

CRITICAL: This middleware uses ASGI callable pattern (NOT BaseHTTPMiddleware)
to prevent context leaks with streaming responses (G-02 requirement).

This middleware should be added to the FastAPI app to intercept all
requests to /ai/* endpoints.
"""

import logging
from typing import Optional, Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from ai.services.kill_switch import (
    KillSwitch,
    KillSwitchCheckResult,
    AICapability,
)


logger = logging.getLogger(__name__)


# HTTP status code for service unavailable
HTTP_503_SERVICE_UNAVAILABLE = 503


def _extract_tenant_id(request: Request) -> Optional[str]:
    """
    Extract tenant_id from the request.
    
    Tries multiple sources:
    1. Request state (set by auth middleware)
    2. Header (X-Tenant-ID)
    3. Query parameter (tenant_id)
    
    Args:
        request: The FastAPI request
        
    Returns:
        The tenant ID if found, None otherwise
    """
    # Try request state first (set by auth middleware)
    if hasattr(request.state, "tenant_id"):
        return request.state.tenant_id
    
    # Try header
    tenant_id = request.headers.get("X-Tenant-ID")
    if tenant_id:
        return tenant_id
    
    # Try query parameter
    tenant_id = request.query_params.get("tenant_id")
    if tenant_id:
        return tenant_id
    
    return None


def _extract_capability(request: Request) -> Optional[AICapability]:
    """
    Extract the AI capability from the request path.
    
    Maps URL paths to capabilities:
    - /ai/chat/* -> CHAT
    - /ai/actions/* -> ACTIONS
    - /ai/ocr/* -> OCR
    
    Args:
        request: The FastAPI request
        
    Returns:
        The AI capability if identified, None otherwise
    """
    path = request.url.path.lower()
    
    if "/ai/chat" in path:
        return AICapability.CHAT
    elif "/ai/actions" in path or "/ai/action" in path:
        return AICapability.ACTIONS
    elif "/ai/ocr" in path:
        return AICapability.OCR
    
    return None


def _create_kill_switch_response(result: KillSwitchCheckResult) -> JSONResponse:
    """
    Create a 503 response for kill switch activation.
    
    Args:
        result: The kill switch check result
        
    Returns:
        JSONResponse with 503 status and error details
    """
    error_response = {
        "error": {
            "code": "AI_DISABLED",
            "message": "AI features are currently disabled",
            "details": {
                "scope": result.scope.value if result.scope else None,
                "target_id": result.target_id,
                "reason": result.reason,
                "activated_by": result.activated_by,
                "activated_at": result.activated_at.isoformat() if result.activated_at else None,
            },
        },
        "retry_after": None,  # Kill switch doesn't have automatic retry
    }
    
    return JSONResponse(
        status_code=HTTP_503_SERVICE_UNAVAILABLE,
        content=error_response,
        headers={
            "Retry-After": "3600",  # Suggest retry after 1 hour
            "X-AI-Kill-Switch": "active",
        },
    )


class KillSwitchMiddleware:
    """
    ASGI middleware to check kill switch status on every AI request.
    
    This middleware intercepts requests to /ai/* endpoints and checks
    if any kill switch (global, tenant, or capability) is active.
    
    If active, returns 503 Service Unavailable immediately.
    
    CRITICAL: Uses ASGI callable pattern (NOT BaseHTTPMiddleware) to prevent
    context leaks with streaming responses (G-02 requirement).
    
    Usage:
        from fastapi import FastAPI
        from ai.middleware.kill_switch_middleware import KillSwitchMiddleware
        
        app = FastAPI()
        app.add_middleware(KillSwitchMiddleware)
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
            exclude_paths: Paths to exclude from kill switch check
        """
        self.app = app
        self.ai_path_prefix = ai_path_prefix
        self.exclude_paths = exclude_paths or [
            "/ai/status",  # Status endpoint should always work
            "/ai/health",  # Health check should always work
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
        
        # Extract context for kill switch check
        # Note: We need to create a minimal Request object to extract headers
        request = Request(scope, receive)
        tenant_id = _extract_tenant_id(request)
        capability = _extract_capability(request)
        
        # Check kill switch
        kill_switch = KillSwitch.get()
        result = kill_switch.check(
            tenant_id=tenant_id,
            capability=capability,
        )
        
        if result.blocked:
            logger.warning(
                f"Request blocked by kill switch: "
                f"path={path}, tenant={tenant_id}, capability={capability}, "
                f"scope={result.scope}, reason={result.reason}"
            )
            
            # Create and send 503 response
            response = _create_kill_switch_response(result)
            await response(scope, receive, send)
            return
        
        # Continue to next middleware/app
        await self.app(scope, receive, send)


def create_kill_switch_dependency(
    capability: Optional[AICapability] = None,
) -> Callable:
    """
    Create a FastAPI dependency for kill switch checking.
    
    Use this as an alternative to middleware for more granular control.
    
    Usage:
        from fastapi import Depends
        from ai.middleware.kill_switch_middleware import create_kill_switch_dependency
        
        @router.post("/chat")
        async def chat(
            request: ChatRequest,
            _: None = Depends(create_kill_switch_dependency(AICapability.CHAT)),
        ):
            ...
    
    Args:
        capability: The AI capability to check
        
    Returns:
        A FastAPI dependency function
    """
    async def dependency(request: Request) -> None:
        tenant_id = _extract_tenant_id(request)
        
        kill_switch = KillSwitch.get()
        result = kill_switch.check(
            tenant_id=tenant_id,
            capability=capability,
        )
        
        if result.blocked:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "code": "AI_DISABLED",
                    "message": "AI features are currently disabled",
                    "scope": result.scope.value if result.scope else None,
                    "reason": result.reason,
                },
                headers={"Retry-After": "3600"},
            )
    
    return dependency


# Pre-built dependencies for common capabilities
require_chat_enabled = create_kill_switch_dependency(AICapability.CHAT)
require_actions_enabled = create_kill_switch_dependency(AICapability.ACTIONS)
require_ocr_enabled = create_kill_switch_dependency(AICapability.OCR)
require_ai_enabled = create_kill_switch_dependency(None)  # Checks global only
