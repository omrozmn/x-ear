"""
Feature Gate implementation for X-Ear Platform.
Implements Contract #14: FeatureGate Fail-Mode Policy.

Phase 2 addition: Sector-aware feature derivation.
If a module's feature_flag is checked, the module_registry is consulted
to determine if it's enabled for the tenant's sector.
Env-var overrides ALWAYS win (Contract #14 preserved).
"""
import logging
import os
from enum import Enum
from typing import Literal, Optional

# Configure logging
logger = logging.getLogger(__name__)

class FailMode(str, Enum):
    OPEN = "open"      # Return TRUE on error (UI, UX, cosmetics)
    CLOSED = "closed"  # Return FALSE on error (Billing, Quota, Security)

class FeatureGate:
    """
    Centralized feature flag evaluation logic.
    Phase 1: Local evaluation logic (always returns default or True).
    Phase 2: Sector-aware module gating via module_registry.
    """

    def __init__(self):
        self._flags = {}
        # Simple env var override for testing: FEATURE_FLAG_DISABLE_ALL=true
        self._global_disabled = os.getenv("FEATURE_FLAG_DISABLE_ALL", "false").lower() == "true"

    def is_enabled(
        self,
        flag_key: str,
        tenant_id: str = None,
        user_id: str = None,
        fail_mode: Literal["open", "closed"] = "closed",
        default: bool = False,
        sector: Optional[str] = None,
    ) -> bool:
        """
        Check if a feature is enabled for a given context.

        Args:
            flag_key: Unique identifier for the feature (snake_case)
            tenant_id: Context tenant UUID
            user_id: Context user UUID
            fail_mode: Strategy usage on evaluation error (Contract #14)
            default: Default value if not strictly defined
            sector: Tenant sector code (if provided, module_registry is consulted)

        Returns:
            bool: True if feature is enabled
        """
        if self._global_disabled:
            return False

        try:
            # Step 1: Env-var override ALWAYS wins (Contract #14)
            env_key = f"FEATURE_{flag_key.upper()}"
            env_val = os.getenv(env_key)

            if env_val is not None:
                return env_val.lower() == "true"

            # Step 2: Sector-aware module check
            if sector:
                from config.module_registry import is_module_enabled, get_module
                module = get_module(flag_key)
                if module is not None:
                    return module.applies_to(sector)

            # Step 3: Fallback to default
            return default

        except Exception as e:
            logger.error(f"FeatureGate evaluation failed for {flag_key}: {e}")
            # Contract #14 logic
            return True if fail_mode == "open" else False

    def is_module_enabled_for_sector(self, module_id: str, sector: str) -> bool:
        """
        Convenience: Check if a module is enabled for a sector.
        Env-var overrides are respected.
        """
        return self.is_enabled(module_id, sector=sector, default=True)

    def should_enforce_limits(self) -> bool:
        """
        Check if feature/quota limits should be enforced (blocking).
        Phase 2: controlled by ENFORCE_FEATURE_LIMITS env var.
        """
        if self._global_disabled:
            return False

        return os.getenv("ENFORCE_FEATURE_LIMITS", "false").lower() == "true"

# Singleton instance
feature_gate = FeatureGate()
