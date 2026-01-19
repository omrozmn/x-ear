"""
Kill Switch Service for AI Layer

Implements emergency mechanism to disable AI functionality at three scopes:
- Global: Disables all AI features across all tenants
- Tenant-level: Disables AI for a specific tenant
- Capability-level: Disables specific AI capabilities (chat, actions, OCR)

Requirements:
- 15.3: Kill_Switch with three scopes: global, tenant-level, capability-level
- 15.4: WHEN Kill_Switch is activated, reject all new requests immediately
- 19.5: Support incident-triggered automatic kill switch activation

This service uses in-memory storage with thread-safe access.
For production, consider using Redis for distributed state.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from threading import Lock
from typing import Optional, Callable, Any
from functools import wraps


logger = logging.getLogger(__name__)


class KillSwitchScope(Enum):
    """Scope of the kill switch."""
    GLOBAL = "global"
    TENANT = "tenant"
    CAPABILITY = "capability"


class AICapability(Enum):
    """AI capabilities that can be individually disabled."""
    CHAT = "chat"
    ACTIONS = "actions"
    OCR = "ocr"
    ALL = "all"  # Special value to disable all capabilities


class KillSwitchActiveError(Exception):
    """Raised when a request is blocked by an active kill switch."""
    
    def __init__(
        self,
        message: str,
        scope: KillSwitchScope,
        target_id: Optional[str] = None,
        reason: Optional[str] = None,
    ):
        super().__init__(message)
        self.scope = scope
        self.target_id = target_id
        self.reason = reason


@dataclass
class KillSwitchState:
    """State of a kill switch."""
    active: bool
    scope: KillSwitchScope
    target_id: Optional[str] = None  # tenant_id or capability name
    activated_by: Optional[str] = None
    activated_at: Optional[datetime] = None
    reason: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "active": self.active,
            "scope": self.scope.value,
            "target_id": self.target_id,
            "activated_by": self.activated_by,
            "activated_at": self.activated_at.isoformat() if self.activated_at else None,
            "reason": self.reason,
        }


@dataclass
class KillSwitchCheckResult:
    """Result of a kill switch check."""
    blocked: bool
    scope: Optional[KillSwitchScope] = None
    target_id: Optional[str] = None
    reason: Optional[str] = None
    activated_by: Optional[str] = None
    activated_at: Optional[datetime] = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "blocked": self.blocked,
            "scope": self.scope.value if self.scope else None,
            "target_id": self.target_id,
            "reason": self.reason,
            "activated_by": self.activated_by,
            "activated_at": self.activated_at.isoformat() if self.activated_at else None,
        }


class KillSwitch:
    """
    Kill Switch service for emergency AI disablement.
    
    Supports three scopes:
    - Global: Disables all AI features
    - Tenant: Disables AI for a specific tenant
    - Capability: Disables specific AI capabilities (chat, actions, OCR)
    
    Thread-safe for concurrent access.
    
    Usage:
        kill_switch = KillSwitch.get()
        
        # Activate global kill switch
        kill_switch.activate_global(user_id="admin", reason="Emergency maintenance")
        
        # Check if blocked
        result = kill_switch.check(tenant_id="tenant-1", capability=AICapability.CHAT)
        if result.blocked:
            raise KillSwitchActiveError(...)
    """
    
    _instance: Optional["KillSwitch"] = None
    
    def __init__(self):
        """Initialize the kill switch service."""
        self._lock = Lock()
        
        # Global kill switch state
        self._global_state: KillSwitchState = KillSwitchState(
            active=False,
            scope=KillSwitchScope.GLOBAL,
        )
        
        # Tenant-level kill switches: tenant_id -> state
        self._tenant_states: dict[str, KillSwitchState] = {}
        
        # Capability-level kill switches: capability -> state
        self._capability_states: dict[AICapability, KillSwitchState] = {}
    
    @classmethod
    def get(cls) -> "KillSwitch":
        """Get the singleton KillSwitch instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    @classmethod
    def reset(cls) -> None:
        """Reset the singleton instance (for testing)."""
        cls._instance = None
    
    # =========================================================================
    # Global Kill Switch
    # =========================================================================
    
    def activate_global(
        self,
        user_id: str,
        reason: str,
    ) -> KillSwitchState:
        """
        Activate the global kill switch.
        
        Args:
            user_id: ID of the user activating the switch
            reason: Reason for activation
            
        Returns:
            The updated kill switch state
        """
        with self._lock:
            self._global_state = KillSwitchState(
                active=True,
                scope=KillSwitchScope.GLOBAL,
                activated_by=user_id,
                activated_at=datetime.now(timezone.utc),
                reason=reason,
            )
            logger.warning(
                f"Global kill switch ACTIVATED by {user_id}: {reason}"
            )
            return self._global_state
    
    def deactivate_global(self, user_id: str) -> KillSwitchState:
        """
        Deactivate the global kill switch.
        
        Args:
            user_id: ID of the user deactivating the switch
            
        Returns:
            The updated kill switch state
        """
        with self._lock:
            self._global_state = KillSwitchState(
                active=False,
                scope=KillSwitchScope.GLOBAL,
            )
            logger.info(f"Global kill switch DEACTIVATED by {user_id}")
            return self._global_state
    
    def is_global_active(self) -> bool:
        """Check if global kill switch is active."""
        with self._lock:
            return self._global_state.active
    
    def get_global_state(self) -> KillSwitchState:
        """Get the global kill switch state."""
        with self._lock:
            return self._global_state
    
    # =========================================================================
    # Tenant-Level Kill Switch
    # =========================================================================
    
    def activate_tenant(
        self,
        tenant_id: str,
        user_id: str,
        reason: str,
    ) -> KillSwitchState:
        """
        Activate kill switch for a specific tenant.
        
        Args:
            tenant_id: ID of the tenant to disable
            user_id: ID of the user activating the switch
            reason: Reason for activation
            
        Returns:
            The updated kill switch state
        """
        with self._lock:
            state = KillSwitchState(
                active=True,
                scope=KillSwitchScope.TENANT,
                target_id=tenant_id,
                activated_by=user_id,
                activated_at=datetime.now(timezone.utc),
                reason=reason,
            )
            self._tenant_states[tenant_id] = state
            logger.warning(
                f"Tenant kill switch ACTIVATED for {tenant_id} by {user_id}: {reason}"
            )
            return state
    
    def deactivate_tenant(self, tenant_id: str, user_id: str) -> KillSwitchState:
        """
        Deactivate kill switch for a specific tenant.
        
        Args:
            tenant_id: ID of the tenant to re-enable
            user_id: ID of the user deactivating the switch
            
        Returns:
            The updated kill switch state
        """
        with self._lock:
            state = KillSwitchState(
                active=False,
                scope=KillSwitchScope.TENANT,
                target_id=tenant_id,
            )
            self._tenant_states[tenant_id] = state
            logger.info(
                f"Tenant kill switch DEACTIVATED for {tenant_id} by {user_id}"
            )
            return state
    
    def is_tenant_active(self, tenant_id: str) -> bool:
        """Check if kill switch is active for a tenant."""
        with self._lock:
            state = self._tenant_states.get(tenant_id)
            return state.active if state else False
    
    def get_tenant_state(self, tenant_id: str) -> Optional[KillSwitchState]:
        """Get the kill switch state for a tenant."""
        with self._lock:
            return self._tenant_states.get(tenant_id)
    
    def get_all_tenant_states(self) -> dict[str, KillSwitchState]:
        """Get all tenant kill switch states."""
        with self._lock:
            return dict(self._tenant_states)
    
    # =========================================================================
    # Capability-Level Kill Switch
    # =========================================================================
    
    def activate_capability(
        self,
        capability: AICapability,
        user_id: str,
        reason: str,
    ) -> KillSwitchState:
        """
        Activate kill switch for a specific capability.
        
        Args:
            capability: The capability to disable
            user_id: ID of the user activating the switch
            reason: Reason for activation
            
        Returns:
            The updated kill switch state
        """
        with self._lock:
            state = KillSwitchState(
                active=True,
                scope=KillSwitchScope.CAPABILITY,
                target_id=capability.value,
                activated_by=user_id,
                activated_at=datetime.now(timezone.utc),
                reason=reason,
            )
            self._capability_states[capability] = state
            logger.warning(
                f"Capability kill switch ACTIVATED for {capability.value} by {user_id}: {reason}"
            )
            return state
    
    def deactivate_capability(
        self,
        capability: AICapability,
        user_id: str,
    ) -> KillSwitchState:
        """
        Deactivate kill switch for a specific capability.
        
        Args:
            capability: The capability to re-enable
            user_id: ID of the user deactivating the switch
            
        Returns:
            The updated kill switch state
        """
        with self._lock:
            state = KillSwitchState(
                active=False,
                scope=KillSwitchScope.CAPABILITY,
                target_id=capability.value,
            )
            self._capability_states[capability] = state
            logger.info(
                f"Capability kill switch DEACTIVATED for {capability.value} by {user_id}"
            )
            return state
    
    def is_capability_active(self, capability: AICapability) -> bool:
        """Check if kill switch is active for a capability."""
        with self._lock:
            # Check if ALL capabilities are disabled
            all_state = self._capability_states.get(AICapability.ALL)
            if all_state and all_state.active:
                return True
            
            # Check specific capability
            state = self._capability_states.get(capability)
            return state.active if state else False
    
    def get_capability_state(self, capability: AICapability) -> Optional[KillSwitchState]:
        """Get the kill switch state for a capability."""
        with self._lock:
            return self._capability_states.get(capability)
    
    def get_all_capability_states(self) -> dict[AICapability, KillSwitchState]:
        """Get all capability kill switch states."""
        with self._lock:
            return dict(self._capability_states)
    
    # =========================================================================
    # Combined Check
    # =========================================================================
    
    def check(
        self,
        tenant_id: Optional[str] = None,
        capability: Optional[AICapability] = None,
    ) -> KillSwitchCheckResult:
        """
        Check if any kill switch blocks the request.
        
        Checks in order of priority:
        1. Global kill switch
        2. Tenant-level kill switch (if tenant_id provided)
        3. Capability-level kill switch (if capability provided)
        
        Args:
            tenant_id: Optional tenant ID to check
            capability: Optional capability to check
            
        Returns:
            KillSwitchCheckResult indicating if blocked and why
        """
        with self._lock:
            # 1. Check global kill switch
            if self._global_state.active:
                return KillSwitchCheckResult(
                    blocked=True,
                    scope=KillSwitchScope.GLOBAL,
                    reason=self._global_state.reason,
                    activated_by=self._global_state.activated_by,
                    activated_at=self._global_state.activated_at,
                )
            
            # 2. Check tenant-level kill switch
            if tenant_id:
                tenant_state = self._tenant_states.get(tenant_id)
                if tenant_state and tenant_state.active:
                    return KillSwitchCheckResult(
                        blocked=True,
                        scope=KillSwitchScope.TENANT,
                        target_id=tenant_id,
                        reason=tenant_state.reason,
                        activated_by=tenant_state.activated_by,
                        activated_at=tenant_state.activated_at,
                    )
            
            # 3. Check capability-level kill switch
            if capability:
                # Check ALL capabilities first
                all_state = self._capability_states.get(AICapability.ALL)
                if all_state and all_state.active:
                    return KillSwitchCheckResult(
                        blocked=True,
                        scope=KillSwitchScope.CAPABILITY,
                        target_id=AICapability.ALL.value,
                        reason=all_state.reason,
                        activated_by=all_state.activated_by,
                        activated_at=all_state.activated_at,
                    )
                
                # Check specific capability
                cap_state = self._capability_states.get(capability)
                if cap_state and cap_state.active:
                    return KillSwitchCheckResult(
                        blocked=True,
                        scope=KillSwitchScope.CAPABILITY,
                        target_id=capability.value,
                        reason=cap_state.reason,
                        activated_by=cap_state.activated_by,
                        activated_at=cap_state.activated_at,
                    )
            
            # Not blocked
            return KillSwitchCheckResult(blocked=False)
    
    def require_not_blocked(
        self,
        tenant_id: Optional[str] = None,
        capability: Optional[AICapability] = None,
    ) -> None:
        """
        Check kill switch and raise if blocked.
        
        Args:
            tenant_id: Optional tenant ID to check
            capability: Optional capability to check
            
        Raises:
            KillSwitchActiveError: If any kill switch blocks the request
        """
        result = self.check(tenant_id=tenant_id, capability=capability)
        if result.blocked:
            scope_msg = f"{result.scope.value}"
            if result.target_id:
                scope_msg += f" ({result.target_id})"
            
            raise KillSwitchActiveError(
                message=f"AI features disabled by {scope_msg} kill switch: {result.reason}",
                scope=result.scope,
                target_id=result.target_id,
                reason=result.reason,
            )
    
    # =========================================================================
    # Bulk Operations
    # =========================================================================
    
    def deactivate_all(self, user_id: str) -> None:
        """
        Deactivate all kill switches.
        
        Args:
            user_id: ID of the user deactivating all switches
        """
        with self._lock:
            self._global_state = KillSwitchState(
                active=False,
                scope=KillSwitchScope.GLOBAL,
            )
            self._tenant_states.clear()
            self._capability_states.clear()
            logger.info(f"All kill switches DEACTIVATED by {user_id}")
    
    def get_all_active(self) -> list[KillSwitchState]:
        """Get all active kill switches."""
        with self._lock:
            active = []
            
            if self._global_state.active:
                active.append(self._global_state)
            
            for state in self._tenant_states.values():
                if state.active:
                    active.append(state)
            
            for state in self._capability_states.values():
                if state.active:
                    active.append(state)
            
            return active
    
    def is_any_active(self) -> bool:
        """Check if any kill switch is active."""
        with self._lock:
            if self._global_state.active:
                return True
            
            for state in self._tenant_states.values():
                if state.active:
                    return True
            
            for state in self._capability_states.values():
                if state.active:
                    return True
            
            return False


# =============================================================================
# Decorator for Kill Switch Enforcement
# =============================================================================

def require_kill_switch_inactive(
    capability: Optional[AICapability] = None,
) -> Callable:
    """
    Decorator to check kill switch before function execution.
    
    The decorated function must accept tenant_id as a keyword argument.
    
    Usage:
        @require_kill_switch_inactive(capability=AICapability.CHAT)
        def ai_chat(prompt: str, tenant_id: str):
            ...
    
    Raises:
        KillSwitchActiveError: If kill switch is active
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            tenant_id = kwargs.get("tenant_id")
            
            kill_switch = KillSwitch.get()
            kill_switch.require_not_blocked(
                tenant_id=tenant_id,
                capability=capability,
            )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


# =============================================================================
# Convenience Functions
# =============================================================================

def get_kill_switch() -> KillSwitch:
    """Get the singleton KillSwitch instance."""
    return KillSwitch.get()


def reset_kill_switch() -> None:
    """Reset the singleton KillSwitch instance (for testing)."""
    KillSwitch.reset()


def is_kill_switch_active(
    tenant_id: Optional[str] = None,
    capability: Optional[AICapability] = None,
) -> bool:
    """
    Check if any kill switch is active for the given context.
    
    Args:
        tenant_id: Optional tenant ID to check
        capability: Optional capability to check
        
    Returns:
        True if any applicable kill switch is active
    """
    result = KillSwitch.get().check(tenant_id=tenant_id, capability=capability)
    return result.blocked


def activate_global_kill_switch(user_id: str, reason: str) -> KillSwitchState:
    """Activate the global kill switch."""
    return KillSwitch.get().activate_global(user_id=user_id, reason=reason)


def deactivate_global_kill_switch(user_id: str) -> KillSwitchState:
    """Deactivate the global kill switch."""
    return KillSwitch.get().deactivate_global(user_id=user_id)


def activate_tenant_kill_switch(
    tenant_id: str,
    user_id: str,
    reason: str,
) -> KillSwitchState:
    """Activate kill switch for a specific tenant."""
    return KillSwitch.get().activate_tenant(
        tenant_id=tenant_id,
        user_id=user_id,
        reason=reason,
    )


def deactivate_tenant_kill_switch(tenant_id: str, user_id: str) -> KillSwitchState:
    """Deactivate kill switch for a specific tenant."""
    return KillSwitch.get().deactivate_tenant(tenant_id=tenant_id, user_id=user_id)


def activate_capability_kill_switch(
    capability: AICapability,
    user_id: str,
    reason: str,
) -> KillSwitchState:
    """Activate kill switch for a specific capability."""
    return KillSwitch.get().activate_capability(
        capability=capability,
        user_id=user_id,
        reason=reason,
    )


def deactivate_capability_kill_switch(
    capability: AICapability,
    user_id: str,
) -> KillSwitchState:
    """Deactivate kill switch for a specific capability."""
    return KillSwitch.get().deactivate_capability(
        capability=capability,
        user_id=user_id,
    )
