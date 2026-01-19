"""Backend middleware helpers.

This package is FastAPI-first. Legacy Flask middleware has been migrated.
"""

from .permission_middleware import FastAPIPermissionMiddleware
from .tenant_context import (
    register_tenant_context_middleware,
    TenantContextASGIMiddleware,
    clear_tenant_context, 
    get_tenant_context_state
)

__all__ = [
    "FastAPIPermissionMiddleware",
    "register_tenant_context_middleware",
    "TenantContextASGIMiddleware",
    "clear_tenant_context",
    "get_tenant_context_state",
]
