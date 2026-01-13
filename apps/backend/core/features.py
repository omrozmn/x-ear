"""
Feature Gate implementation for X-Ear Platform.
Implements Contract #14: FeatureGate Fail-Mode Policy.
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
        default: bool = False
    ) -> bool:
        """
        Check if a feature is enabled for a given context.
        
        Args:
            flag_key: Unique identifier for the feature (snake_case)
            tenant_id: Context tenant UUID
            user_id: Context user UUID
            fail_mode: Strategy usage on evaluation error (Contract #14)
            default: Default value if not strictly defined
            
        Returns:
            bool: True if feature is enabled
        """
        if self._global_disabled:
            return False
            
        try:
            # Phase 1: Simple logic - check environment variables or default
            # Example env: FEATURE_NEW_DASHBOARD=true
            env_key = f"FEATURE_{flag_key.upper()}"
            env_val = os.getenv(env_key)
            
            if env_val is not None:
                return env_val.lower() == "true"
            
            # TODO: Phase 2 - Implement database lookup or Redis cache
            # For now, return the default provided by the caller
            return default
            
        except Exception as e:
            logger.error(f"FeatureGate evaluation failed for {flag_key}: {e}")
            # Contract #14 logic
            return True if fail_mode == "open" else False

# Singleton instance
feature_gate = FeatureGate()
