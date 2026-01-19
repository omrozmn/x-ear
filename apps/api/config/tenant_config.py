"""
Tenant Security Configuration (G-02)

This module provides configuration for tenant isolation behavior.
Environment variables control strict mode and other security settings.

Environment Variables:
- TENANT_STRICT_MODE: When "true", queries without tenant context raise errors
                      When "false" (default), only warning logs are generated

CRITICAL: In production, TENANT_STRICT_MODE should be "true" to prevent
accidental cross-tenant data access.
"""
import os
import logging
from typing import Literal

logger = logging.getLogger(__name__)

# Cache for strict mode (allows test override)
_strict_mode_cache: bool | None = None


def _parse_bool_env(key: str, default: bool = False) -> bool:
    """
    Parse boolean environment variable.
    
    Accepts: "true", "1", "yes" (case-insensitive) as True
    Everything else is False
    """
    value = os.getenv(key, "").lower()
    return value in ("true", "1", "yes")


def get_tenant_strict_mode() -> bool:
    """
    Get current tenant strict mode setting.
    
    This function reads from environment on each call when cache is None,
    allowing tests to modify the environment and clear the cache.
    
    Returns:
        True if strict mode is enabled, False otherwise
    """
    global _strict_mode_cache
    if _strict_mode_cache is None:
        _strict_mode_cache = _parse_bool_env("TENANT_STRICT_MODE", default=False)
    return _strict_mode_cache


# Tenant Strict Mode Configuration (legacy, use get_tenant_strict_mode())
# When True: Queries without tenant context raise TenantContextRequiredError
# When False: Queries without tenant context log a warning but proceed
TENANT_STRICT_MODE: bool = get_tenant_strict_mode()


def set_tenant_strict_mode(enabled: bool) -> None:
    """
    Set tenant strict mode (for testing purposes only).
    
    WARNING: This should only be used in tests. In production,
    use the TENANT_STRICT_MODE environment variable.
    
    Args:
        enabled: Whether to enable strict mode
    """
    global TENANT_STRICT_MODE, _strict_mode_cache
    TENANT_STRICT_MODE = enabled
    _strict_mode_cache = enabled
    logger.info(f"Tenant strict mode set to: {enabled}")


# Tenant Context Behavior Configuration
class TenantBehavior:
    """
    Configuration for tenant context behavior in different scenarios.
    """
    
    # HTTP Request behavior
    HTTP_REQUEST_STRICT: bool = True  # Always require tenant in HTTP requests
    
    # Background Task behavior
    BACKGROUND_TASK_STRICT: bool = True  # Always require explicit tenant_id
    
    # Admin/System behavior
    ADMIN_WHITELIST_AUDIT: bool = True  # Log admin cross-tenant access
    
    # Query behavior based on strict mode
    @classmethod
    def get_query_behavior(cls) -> Literal["error", "warning", "silent"]:
        """
        Get query behavior when tenant context is missing.
        
        Returns:
            "error": Raise TenantContextRequiredError
            "warning": Log warning and proceed
            "silent": Proceed without logging (not recommended)
        """
        if TENANT_STRICT_MODE:
            return "error"
        return "warning"


# Log configuration on module load
if TENANT_STRICT_MODE:
    logger.warning(
        "🔒 TENANT_STRICT_MODE is ENABLED - "
        "Queries without tenant context will raise errors"
    )
else:
    logger.info(
        "⚠️ TENANT_STRICT_MODE is DISABLED - "
        "Queries without tenant context will only log warnings"
    )
