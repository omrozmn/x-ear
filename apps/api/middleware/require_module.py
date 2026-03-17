"""
Module Gating Dependency for FastAPI.

Usage:
    from middleware.require_module import require_module

    @router.get("/sgk/documents")
    def list_sgk_documents(
        access: UnifiedAccess = Depends(require_access("sgk.view")),
        _module: None = Depends(require_module("sgk")),
    ):
        pass

If the module is not enabled for the tenant's sector, returns 403.
Env-var overrides are respected (FEATURE_<MODULE_ID>=true).
"""
from __future__ import annotations

import os
import logging
from typing import Callable, Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access

logger = logging.getLogger(__name__)


def require_module(module_id: str) -> Callable:
    """
    Dependency factory that checks if a module is enabled for the current tenant's sector.

    Args:
        module_id: Module identifier (e.g., "sgk", "devices", "hearing_tests")

    Returns:
        FastAPI dependency function
    """

    def module_dependency(
        request: Request,
        db: Session = Depends(get_db),
    ) -> None:
        from config.module_registry import is_module_enabled, get_module
        from core.features import feature_gate

        # Extract tenant from request state (set by unified_access middleware)
        access: Optional[UnifiedAccess] = getattr(request.state, 'access', None)

        # Super admins bypass module checks
        if access and access.is_super_admin:
            return None

        # Get tenant sector
        tenant_sector = _get_tenant_sector(access, db)

        # Check env-var override first (FEATURE_<MODULE_ID>=true always wins)
        env_key = f"FEATURE_{module_id.upper()}"
        env_val = os.getenv(env_key)
        if env_val is not None:
            if env_val.lower() == "true":
                return None
            # Explicitly disabled via env
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": f"Bu modül kullanılamıyor: {module_id}",
                    "code": "MODULE_DISABLED",
                    "module": module_id,
                }
            )

        # Check module registry
        if not is_module_enabled(module_id, tenant_sector):
            logger.info(
                f"Module '{module_id}' blocked for sector '{tenant_sector}' "
                f"(tenant_id={access.tenant_id if access else 'N/A'})"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": f"Bu modül sektörünüz için kullanılamıyor: {module_id}",
                    "code": "MODULE_NOT_AVAILABLE",
                    "module": module_id,
                    "sector": tenant_sector,
                }
            )

        return None

    return module_dependency


def _get_tenant_sector(access: Optional[UnifiedAccess], db: Session) -> str:
    """Resolve the tenant's sector code. Falls back to 'hearing'."""
    if not access or not access.tenant_id:
        return "hearing"

    try:
        from models.tenant import Tenant
        tenant = db.get(Tenant, access.tenant_id)
        if tenant:
            return getattr(tenant, 'sector', None) or 'hearing'
    except Exception as e:
        logger.warning(f"Failed to resolve tenant sector: {e}")

    return "hearing"
