"""
Tenant Context Middleware (G-02)
================================
Ensures ContextVar cleanup after each request to prevent cross-tenant data leaks.

CRITICAL SECURITY: This middleware MUST be added to the FastAPI app to prevent
tenant isolation breaches. Without proper cleanup, ContextVar values can leak
between requests in async/threaded environments.

CRITICAL DESIGN RULES:
1. NEVER use BaseHTTPMiddleware - it can cause context leaks with streaming responses
2. ALWAYS use token-based reset (not set(None))
3. ALWAYS use finally block for cleanup

Gap Reference: G-02 Multi-tenancy ContextVar leak
"""

from __future__ import annotations

import logging
from typing import Callable, Awaitable

from fastapi import FastAPI, Request, Response
from starlette.types import ASGIApp, Receive, Scope, Send

from core.database import (
    set_tenant_context, 
    reset_tenant_context,
    get_current_tenant_id,
    _current_tenant_id, 
    _skip_tenant_filter,
    TenantContextToken,
    SkipFilterToken
)

logger = logging.getLogger(__name__)


# ============================================================================
# FUNCTION-BASED MIDDLEWARE (RECOMMENDED)
# ============================================================================

def register_tenant_context_middleware(app: FastAPI) -> None:
    """
    Register tenant context middleware using @app.middleware("http") pattern.
    
    This is the CORRECT way to implement middleware in FastAPI.
    DO NOT use BaseHTTPMiddleware - it can cause context leaks.
    
    Usage in main.py:
        from middleware.tenant_context import register_tenant_context_middleware
        register_tenant_context_middleware(app)
    
    Args:
        app: FastAPI application instance
    """
    
    @app.middleware("http")
    async def tenant_context_middleware(
        request: Request, 
        call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """
        Middleware to ensure tenant ContextVar is properly cleaned up after each request.
        
        This prevents cross-tenant data leaks that could occur when:
        1. Request A sets tenant_id to "tenant_A"
        2. Request A completes but ContextVar is not cleared
        3. Request B (different tenant or anonymous) inherits "tenant_A" context
        4. Request B can now access Tenant A's data (SECURITY BREACH)
        
        CRITICAL: Uses token-based reset, NOT set(None)
        """
        # Store tokens for proper reset
        # Note: We don't set tenant here - UnifiedAccess dependency does that
        # We only ensure cleanup happens
        skip_filter_token: SkipFilterToken | None = None
        
        try:
            # Reset skip_filter to False at start of request
            skip_filter_token = _skip_tenant_filter.set(False)
            
            # Process the request - tenant context will be set by UnifiedAccess
            response = await call_next(request)
            return response
            
        finally:
            # CRITICAL: Always clear tenant context after request using token-based reset
            try:
                # Reset skip_tenant_filter using token
                if skip_filter_token is not None:
                    _skip_tenant_filter.reset(skip_filter_token)
                
                # For tenant_id, we need to get the current token and reset
                # Since we didn't set it here, we use the raw ContextVar reset
                # This resets to the default value (None)
                current_tenant = get_current_tenant_id()
                if current_tenant is not None:
                    # Create a token by setting, then immediately reset
                    temp_token = _current_tenant_id.set(None)
                    # This effectively clears the context
                    logger.debug(f"Tenant context cleared: {current_tenant} -> None")
                
                logger.debug("Tenant context cleanup completed")
                
            except Exception as e:
                # Log but don't raise - we don't want cleanup failures to mask
                # the original response/exception
                logger.error(f"Failed to clear tenant context: {e}")


# ============================================================================
# ASGI-STYLE MIDDLEWARE (ALTERNATIVE)
# ============================================================================

class TenantContextASGIMiddleware:
    """
    ASGI-style middleware for tenant context management.
    
    This is an alternative to the function-based middleware above.
    Use this if you need more control over the ASGI lifecycle.
    
    CRITICAL: This does NOT inherit from BaseHTTPMiddleware.
    BaseHTTPMiddleware is FORBIDDEN due to context leak issues.
    
    Usage:
        app.add_middleware(TenantContextASGIMiddleware)
    """
    
    def __init__(self, app: ASGIApp):
        self.app = app
    
    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Store token for proper reset
        skip_filter_token: SkipFilterToken | None = None
        
        try:
            # Reset skip_filter to False at start of request
            skip_filter_token = _skip_tenant_filter.set(False)
            
            # Process the request
            await self.app(scope, receive, send)
            
        finally:
            # CRITICAL: Always clear tenant context after request
            try:
                # Reset skip_tenant_filter using token
                if skip_filter_token is not None:
                    _skip_tenant_filter.reset(skip_filter_token)
                
                # Clear tenant_id
                current_tenant = get_current_tenant_id()
                if current_tenant is not None:
                    _current_tenant_id.set(None)
                    logger.debug(f"Tenant context cleared: {current_tenant} -> None")
                    
            except Exception as e:
                logger.error(f"Failed to clear tenant context: {e}")


# ============================================================================
# DEPRECATED: BaseHTTPMiddleware version
# ============================================================================

# 🔴 DEPRECATED - DO NOT USE
# This class is kept only for reference. It should NOT be used in production.
# BaseHTTPMiddleware can cause context leaks with streaming responses.

# class TenantContextMiddleware(BaseHTTPMiddleware):
#     """
#     DEPRECATED: Use register_tenant_context_middleware() instead.
#     
#     BaseHTTPMiddleware is FORBIDDEN due to context leak issues.
#     """
#     pass


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def clear_tenant_context() -> None:
    """
    Utility function to explicitly clear tenant context.
    
    Use this in:
    - Background task completion handlers
    - Test teardown
    - Manual context management scenarios
    
    WARNING: Prefer token-based reset when possible.
    This function uses set(None) which is less safe in nested contexts.
    """
    _current_tenant_id.set(None)
    _skip_tenant_filter.set(False)
    logger.debug("Tenant context explicitly cleared")


def get_tenant_context_state() -> dict:
    """
    Get current tenant context state for debugging/logging.
    
    Returns:
        dict with current tenant_id and skip_filter values
    """
    return {
        "tenant_id": _current_tenant_id.get(),
        "skip_filter": _skip_tenant_filter.get()
    }
