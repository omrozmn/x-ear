"""
Feature Flag Integration for AI Layer

Integrates with the existing feature flag system to enable/disable AI capabilities.
Allows per-tenant and per-capability control of AI features.

Requirements:
- 1.7: THE AI_Layer SHALL be completely removable by disabling feature flags without code changes
- 18.1: THE AI_Layer SHALL support feature flags to enable/disable specific AI capabilities
"""

import logging
import os
from dataclasses import dataclass
from enum import Enum
from functools import wraps
from threading import Lock
from typing import Any, Callable, Dict, Optional, Set

logger = logging.getLogger(__name__)


class AIFeatureFlag(str, Enum):
    """AI feature flags that can be toggled."""
    # Master switch
    AI_ENABLED = "ai.enabled"
    
    # Capability flags
    AI_CHAT = "ai.chat.enabled"
    AI_ACTIONS = "ai.actions.enabled"
    AI_OCR = "ai.ocr.enabled"
    
    # Phase flags
    AI_PHASE_B = "ai.phase.proposal"
    AI_PHASE_C = "ai.phase.execution"
    
    # Feature-specific flags
    AI_PII_REDACTION = "ai.pii_redaction.enabled"
    AI_APPROVAL_REQUIRED = "ai.approval.required"
    AI_AUDIT_LOGGING = "ai.audit.enabled"


@dataclass
class FeatureFlagState:
    """State of a feature flag."""
    flag: AIFeatureFlag
    enabled: bool
    tenant_overrides: Dict[str, bool]  # tenant_id -> enabled
    
    def is_enabled_for_tenant(self, tenant_id: Optional[str] = None) -> bool:
        """Check if flag is enabled for a specific tenant."""
        if tenant_id and tenant_id in self.tenant_overrides:
            return self.tenant_overrides[tenant_id]
        return self.enabled


class AIFeatureFlagService:
    """
    Service for managing AI feature flags.
    
    Provides:
    - Global enable/disable of AI features
    - Per-tenant feature flag overrides
    - Integration with external feature flag systems
    
    Usage:
        service = AIFeatureFlagService.get()
        
        # Check if feature is enabled
        if service.is_enabled(AIFeatureFlag.AI_CHAT, tenant_id="tenant-1"):
            # Use AI chat
            ...
        
        # Disable feature for tenant
        service.set_tenant_override(AIFeatureFlag.AI_CHAT, "tenant-1", False)
    """
    
    _instance: Optional["AIFeatureFlagService"] = None
    
    def __init__(self):
        """Initialize the feature flag service."""
        self._lock = Lock()
        self._flags: Dict[AIFeatureFlag, FeatureFlagState] = {}
        self._external_provider: Optional[Callable[[str, str], bool]] = None
        self._initialize_defaults()
    
    @classmethod
    def get(cls) -> "AIFeatureFlagService":
        """Get the singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    @classmethod
    def reset(cls) -> None:
        """Reset the singleton instance (for testing)."""
        cls._instance = None
    
    def _initialize_defaults(self) -> None:
        """Initialize default flag states from environment."""
        # Master switch - default enabled unless explicitly disabled
        ai_enabled = os.getenv("AI_ENABLED", "true").lower() == "true"
        
        # Initialize all flags with defaults
        defaults = {
            AIFeatureFlag.AI_ENABLED: ai_enabled,
            AIFeatureFlag.AI_CHAT: ai_enabled,
            AIFeatureFlag.AI_ACTIONS: ai_enabled,
            AIFeatureFlag.AI_OCR: ai_enabled,
            AIFeatureFlag.AI_PHASE_B: os.getenv("AI_PHASE", "A") in ("B", "C"),
            AIFeatureFlag.AI_PHASE_C: os.getenv("AI_PHASE", "A") == "C",
            AIFeatureFlag.AI_PII_REDACTION: True,  # Always enabled by default
            AIFeatureFlag.AI_APPROVAL_REQUIRED: True,  # Always enabled by default
            AIFeatureFlag.AI_AUDIT_LOGGING: True,  # Always enabled by default
        }
        
        for flag, enabled in defaults.items():
            self._flags[flag] = FeatureFlagState(
                flag=flag,
                enabled=enabled,
                tenant_overrides={},
            )
    
    def set_external_provider(
        self,
        provider: Callable[[str, str], bool],
    ) -> None:
        """
        Set an external feature flag provider.
        
        The provider function receives (flag_name, tenant_id) and returns bool.
        This allows integration with external systems like LaunchDarkly, Split, etc.
        
        Args:
            provider: Function that checks external feature flag system
        """
        with self._lock:
            self._external_provider = provider
            logger.info("External feature flag provider configured")
    
    def is_enabled(
        self,
        flag: AIFeatureFlag,
        tenant_id: Optional[str] = None,
    ) -> bool:
        """
        Check if a feature flag is enabled.
        
        Checks in order:
        1. External provider (if configured)
        2. Tenant-specific override
        3. Global default
        
        Args:
            flag: The feature flag to check
            tenant_id: Optional tenant ID for tenant-specific checks
            
        Returns:
            True if the feature is enabled
        """
        with self._lock:
            # Check master switch first
            if flag != AIFeatureFlag.AI_ENABLED:
                master_state = self._flags.get(AIFeatureFlag.AI_ENABLED)
                if master_state and not master_state.is_enabled_for_tenant(tenant_id):
                    return False
            
            # Check external provider
            if self._external_provider and tenant_id:
                try:
                    return self._external_provider(flag.value, tenant_id)
                except Exception as e:
                    logger.warning(f"External feature flag check failed: {e}")
                    # Fall through to local check
            
            # Check local state
            state = self._flags.get(flag)
            if state:
                return state.is_enabled_for_tenant(tenant_id)
            
            # Default to disabled for unknown flags
            return False
    
    def set_enabled(self, flag: AIFeatureFlag, enabled: bool) -> None:
        """
        Set global enabled state for a flag.
        
        Args:
            flag: The feature flag to set
            enabled: Whether to enable or disable
        """
        with self._lock:
            if flag in self._flags:
                self._flags[flag].enabled = enabled
            else:
                self._flags[flag] = FeatureFlagState(
                    flag=flag,
                    enabled=enabled,
                    tenant_overrides={},
                )
            logger.info(f"Feature flag {flag.value} set to {enabled}")
    
    def set_tenant_override(
        self,
        flag: AIFeatureFlag,
        tenant_id: str,
        enabled: bool,
    ) -> None:
        """
        Set tenant-specific override for a flag.
        
        Args:
            flag: The feature flag to override
            tenant_id: The tenant ID
            enabled: Whether to enable or disable for this tenant
        """
        with self._lock:
            if flag not in self._flags:
                self._flags[flag] = FeatureFlagState(
                    flag=flag,
                    enabled=True,
                    tenant_overrides={},
                )
            self._flags[flag].tenant_overrides[tenant_id] = enabled
            logger.info(f"Feature flag {flag.value} override for tenant {tenant_id}: {enabled}")
    
    def remove_tenant_override(self, flag: AIFeatureFlag, tenant_id: str) -> None:
        """
        Remove tenant-specific override for a flag.
        
        Args:
            flag: The feature flag
            tenant_id: The tenant ID
        """
        with self._lock:
            if flag in self._flags and tenant_id in self._flags[flag].tenant_overrides:
                del self._flags[flag].tenant_overrides[tenant_id]
                logger.info(f"Feature flag {flag.value} override removed for tenant {tenant_id}")
    
    def get_all_flags(self, tenant_id: Optional[str] = None) -> Dict[str, bool]:
        """
        Get all feature flag states.
        
        Args:
            tenant_id: Optional tenant ID for tenant-specific values
            
        Returns:
            Dictionary of flag name to enabled state
        """
        with self._lock:
            return {
                flag.value: state.is_enabled_for_tenant(tenant_id)
                for flag, state in self._flags.items()
            }
    
    def get_enabled_capabilities(self, tenant_id: Optional[str] = None) -> Set[str]:
        """
        Get set of enabled AI capabilities for a tenant.
        
        Args:
            tenant_id: Optional tenant ID
            
        Returns:
            Set of enabled capability names
        """
        capabilities = set()
        
        if self.is_enabled(AIFeatureFlag.AI_CHAT, tenant_id):
            capabilities.add("chat")
        if self.is_enabled(AIFeatureFlag.AI_ACTIONS, tenant_id):
            capabilities.add("actions")
        if self.is_enabled(AIFeatureFlag.AI_OCR, tenant_id):
            capabilities.add("ocr")
        
        return capabilities
    
    def is_ai_completely_disabled(self, tenant_id: Optional[str] = None) -> bool:
        """
        Check if AI is completely disabled (can be removed without code changes).
        
        Args:
            tenant_id: Optional tenant ID
            
        Returns:
            True if AI is completely disabled
        """
        return not self.is_enabled(AIFeatureFlag.AI_ENABLED, tenant_id)


def require_feature_flag(flag: AIFeatureFlag) -> Callable:
    """
    Decorator to require a feature flag to be enabled.
    
    Usage:
        @require_feature_flag(AIFeatureFlag.AI_CHAT)
        async def ai_chat(prompt: str, tenant_id: str):
            ...
    
    Raises:
        FeatureFlagDisabledError: If the feature flag is disabled
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            tenant_id = kwargs.get("tenant_id")
            service = AIFeatureFlagService.get()
            
            if not service.is_enabled(flag, tenant_id):
                raise FeatureFlagDisabledError(
                    f"Feature {flag.value} is disabled"
                )
            
            return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            tenant_id = kwargs.get("tenant_id")
            service = AIFeatureFlagService.get()
            
            if not service.is_enabled(flag, tenant_id):
                raise FeatureFlagDisabledError(
                    f"Feature {flag.value} is disabled"
                )
            
            return func(*args, **kwargs)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


class FeatureFlagDisabledError(Exception):
    """Raised when a required feature flag is disabled."""
    
    def __init__(self, message: str, flag: Optional[AIFeatureFlag] = None):
        super().__init__(message)
        self.flag = flag


# =============================================================================
# Convenience Functions
# =============================================================================

def get_feature_flag_service() -> AIFeatureFlagService:
    """Get the singleton AIFeatureFlagService instance."""
    return AIFeatureFlagService.get()


def is_feature_enabled(
    flag: AIFeatureFlag,
    tenant_id: Optional[str] = None,
) -> bool:
    """Check if a feature flag is enabled."""
    return AIFeatureFlagService.get().is_enabled(flag, tenant_id)


def is_ai_enabled(tenant_id: Optional[str] = None) -> bool:
    """Check if AI is enabled (master switch)."""
    return AIFeatureFlagService.get().is_enabled(AIFeatureFlag.AI_ENABLED, tenant_id)


def is_chat_enabled(tenant_id: Optional[str] = None) -> bool:
    """Check if AI chat is enabled."""
    return AIFeatureFlagService.get().is_enabled(AIFeatureFlag.AI_CHAT, tenant_id)


def is_actions_enabled(tenant_id: Optional[str] = None) -> bool:
    """Check if AI actions are enabled."""
    return AIFeatureFlagService.get().is_enabled(AIFeatureFlag.AI_ACTIONS, tenant_id)


def is_ocr_enabled(tenant_id: Optional[str] = None) -> bool:
    """Check if AI OCR is enabled."""
    return AIFeatureFlagService.get().is_enabled(AIFeatureFlag.AI_OCR, tenant_id)


def get_enabled_capabilities(tenant_id: Optional[str] = None) -> Set[str]:
    """Get set of enabled AI capabilities."""
    return AIFeatureFlagService.get().get_enabled_capabilities(tenant_id)


def disable_ai_for_tenant(tenant_id: str) -> None:
    """Disable all AI features for a tenant."""
    service = AIFeatureFlagService.get()
    service.set_tenant_override(AIFeatureFlag.AI_ENABLED, tenant_id, False)


def enable_ai_for_tenant(tenant_id: str) -> None:
    """Enable AI features for a tenant (remove override)."""
    service = AIFeatureFlagService.get()
    service.remove_tenant_override(AIFeatureFlag.AI_ENABLED, tenant_id)
