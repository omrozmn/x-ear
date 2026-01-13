"""Backend middleware helpers.

This package is FastAPI-first. Legacy Flask middleware has been migrated.
"""

from .permission_middleware import FastAPIPermissionMiddleware

__all__ = [
    "FastAPIPermissionMiddleware",
]
