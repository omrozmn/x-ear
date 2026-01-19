"""
Graceful Degradation Service for AI Layer

Ensures the system works correctly when AI is disabled or unavailable.
Provides fallback mechanisms and status tracking for AI availability.

Requirements:
- 1.2: WHEN the AI_Layer is disabled or unavailable, THE System SHALL continue all operations without degradation
- 1.6: IF the AI_Layer fails, THEN THE System SHALL log the failure and continue normal operations
- 24.11: IF the local model is unreachable, THEN THE AI_Layer SHALL gracefully disable AI features
- 24.12: WHEN the local model is unreachable, THE core backend functionality SHALL remain unaffected
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from functools import wraps
from threading import Lock
from typing import Any, Callable, Dict, Optional, TypeVar, Generic

logger = logging.getLogger(__name__)


class AIAvailabilityStatus(str, Enum):
    """Status of AI availability."""
    AVAILABLE = "available"           # AI is fully operational
    DEGRADED = "degraded"             # AI is partially available (some features disabled)
    UNAVAILABLE = "unavailable"       # AI is completely unavailable
    DISABLED = "disabled"             # AI is intentionally disabled via config


class DegradationReason(str, Enum):
    """Reason for AI degradation or unavailability."""
    NONE = "none"                     # No degradation
    CONFIG_DISABLED = "config_disabled"  # AI_ENABLED=false
    KILL_SWITCH = "kill_switch"       # Kill switch activated
    MODEL_UNREACHABLE = "model_unreachable"  # Cannot connect to model
    MODEL_TIMEOUT = "model_timeout"   # Model inference timeout
    QUOTA_EXCEEDED = "quota_exceeded"  # Tenant quota exceeded
    RATE_LIMITED = "rate_limited"     # Rate limit exceeded
    CIRCUIT_OPEN = "circuit_open"     # Circuit breaker open
    INTERNAL_ERROR = "internal_error"  # Internal error


@dataclass
class AIAvailabilityState:
    """Current state of AI availability."""
    status: AIAvailabilityStatus
    reason: DegradationReason
    message: Optional[str] = None
    last_check: Optional[datetime] = None
    model_available: bool = False
    features_available: Dict[str, bool] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "status": self.status.value,
            "reason": self.reason.value,
            "message": self.message,
            "last_check": self.last_check.isoformat() if self.last_check else None,
            "model_available": self.model_available,
            "features_available": self.features_available,
        }


@dataclass
class FallbackResponse:
    """Response returned when AI is unavailable."""
    success: bool
    message: str
    fallback_used: bool = True
    original_error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
            "fallback_used": self.fallback_used,
            "original_error": self.original_error,
        }


T = TypeVar('T')


class GracefulDegradationService:
    """
    Service for managing AI graceful degradation.
    
    Ensures the system continues to function when AI is unavailable:
    - Tracks AI availability status
    - Provides fallback mechanisms
    - Logs failures without cascading
    - Maintains core functionality
    
    Usage:
        service = GracefulDegradationService.get()
        
        # Check if AI is available
        if service.is_ai_available():
            result = await ai_operation()
        else:
            result = fallback_operation()
        
        # Or use the decorator
        @service.with_fallback(fallback_fn)
        async def ai_operation():
            ...
    """
    
    _instance: Optional["GracefulDegradationService"] = None
    
    def __init__(self):
        """Initialize the graceful degradation service."""
        self._lock = Lock()
        self._state = AIAvailabilityState(
            status=AIAvailabilityStatus.AVAILABLE,
            reason=DegradationReason.NONE,
            last_check=datetime.now(timezone.utc),
            model_available=True,
            features_available={
                "chat": True,
                "actions": True,
                "ocr": True,
            },
        )
        self._failure_count = 0
        self._max_failures_before_degraded = 3
        self._last_failure_time: Optional[datetime] = None
    
    @classmethod
    def get(cls) -> "GracefulDegradationService":
        """Get the singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    @classmethod
    def reset(cls) -> None:
        """Reset the singleton instance (for testing)."""
        cls._instance = None
    
    def get_state(self) -> AIAvailabilityState:
        """Get current AI availability state."""
        with self._lock:
            return self._state
    
    def is_ai_available(self) -> bool:
        """Check if AI is available for use."""
        with self._lock:
            return self._state.status == AIAvailabilityStatus.AVAILABLE
    
    def is_ai_enabled(self) -> bool:
        """Check if AI is enabled (not disabled via config)."""
        with self._lock:
            return self._state.status != AIAvailabilityStatus.DISABLED
    
    def is_feature_available(self, feature: str) -> bool:
        """Check if a specific AI feature is available."""
        with self._lock:
            if self._state.status in (AIAvailabilityStatus.UNAVAILABLE, AIAvailabilityStatus.DISABLED):
                return False
            return self._state.features_available.get(feature, False)
    
    def mark_available(self) -> None:
        """Mark AI as available."""
        with self._lock:
            self._state = AIAvailabilityState(
                status=AIAvailabilityStatus.AVAILABLE,
                reason=DegradationReason.NONE,
                last_check=datetime.now(timezone.utc),
                model_available=True,
                features_available={
                    "chat": True,
                    "actions": True,
                    "ocr": True,
                },
            )
            self._failure_count = 0
            logger.info("AI marked as available")
    
    def mark_disabled(self, message: Optional[str] = None) -> None:
        """Mark AI as disabled via configuration."""
        with self._lock:
            self._state = AIAvailabilityState(
                status=AIAvailabilityStatus.DISABLED,
                reason=DegradationReason.CONFIG_DISABLED,
                message=message or "AI features are disabled via configuration",
                last_check=datetime.now(timezone.utc),
                model_available=False,
                features_available={
                    "chat": False,
                    "actions": False,
                    "ocr": False,
                },
            )
            logger.info(f"AI marked as disabled: {message}")
    
    def mark_unavailable(
        self,
        reason: DegradationReason,
        message: Optional[str] = None,
    ) -> None:
        """Mark AI as unavailable."""
        with self._lock:
            self._state = AIAvailabilityState(
                status=AIAvailabilityStatus.UNAVAILABLE,
                reason=reason,
                message=message,
                last_check=datetime.now(timezone.utc),
                model_available=False,
                features_available={
                    "chat": False,
                    "actions": False,
                    "ocr": False,
                },
            )
            logger.warning(f"AI marked as unavailable: {reason.value} - {message}")
    
    def mark_degraded(
        self,
        reason: DegradationReason,
        message: Optional[str] = None,
        available_features: Optional[Dict[str, bool]] = None,
    ) -> None:
        """Mark AI as degraded (partially available)."""
        with self._lock:
            features = available_features or {
                "chat": True,
                "actions": False,
                "ocr": False,
            }
            self._state = AIAvailabilityState(
                status=AIAvailabilityStatus.DEGRADED,
                reason=reason,
                message=message,
                last_check=datetime.now(timezone.utc),
                model_available=True,
                features_available=features,
            )
            logger.warning(f"AI marked as degraded: {reason.value} - {message}")
    
    def record_failure(
        self,
        reason: DegradationReason,
        error: Optional[Exception] = None,
    ) -> None:
        """
        Record an AI failure.
        
        After multiple consecutive failures, AI will be marked as degraded or unavailable.
        """
        should_mark_unavailable = False
        should_mark_degraded = False
        failure_count = 0
        
        with self._lock:
            self._failure_count += 1
            failure_count = self._failure_count
            self._last_failure_time = datetime.now(timezone.utc)
            
            error_msg = str(error) if error else "Unknown error"
            logger.error(
                f"AI failure recorded ({self._failure_count}): {reason.value} - {error_msg}"
            )
            
            # After threshold failures, mark as degraded or unavailable
            if self._failure_count >= self._max_failures_before_degraded:
                if reason == DegradationReason.MODEL_UNREACHABLE:
                    should_mark_unavailable = True
                else:
                    should_mark_degraded = True
        
        # Call mark methods outside the lock to avoid deadlock
        if should_mark_unavailable:
            self.mark_unavailable(reason, f"Model unreachable after {failure_count} failures")
        elif should_mark_degraded:
            self.mark_degraded(reason, f"Degraded after {failure_count} failures")
    
    def record_success(self) -> None:
        """Record a successful AI operation, resetting failure count."""
        should_mark_available = False
        
        with self._lock:
            if self._failure_count > 0:
                logger.info(f"AI success recorded, resetting failure count from {self._failure_count}")
            self._failure_count = 0
            
            # If we were degraded, check if we should restore
            if self._state.status == AIAvailabilityStatus.DEGRADED:
                should_mark_available = True
        
        # Call mark_available outside the lock to avoid deadlock
        if should_mark_available:
            self.mark_available()
    
    def update_model_status(self, available: bool, error: Optional[str] = None) -> None:
        """Update model availability status."""
        should_mark_available = False
        should_mark_unavailable = False
        unavailable_error = None
        
        with self._lock:
            if available:
                if not self._state.model_available:
                    logger.info("Model is now available")
                self._state.model_available = True
                if self._state.status == AIAvailabilityStatus.UNAVAILABLE:
                    if self._state.reason == DegradationReason.MODEL_UNREACHABLE:
                        should_mark_available = True
            else:
                self._state.model_available = False
                if self._state.status == AIAvailabilityStatus.AVAILABLE:
                    should_mark_unavailable = True
                    unavailable_error = error or "Model is unreachable"
        
        # Call mark methods outside the lock to avoid deadlock
        if should_mark_available:
            self.mark_available()
        elif should_mark_unavailable:
            self.mark_unavailable(DegradationReason.MODEL_UNREACHABLE, unavailable_error)
    
    def update_from_kill_switch(self, active: bool, reason: Optional[str] = None) -> None:
        """Update status based on kill switch state."""
        should_mark_unavailable = False
        should_mark_available = False
        kill_switch_reason = None
        
        with self._lock:
            if active:
                should_mark_unavailable = True
                kill_switch_reason = reason or "Kill switch activated"
            elif self._state.reason == DegradationReason.KILL_SWITCH:
                # Only restore if we were disabled by kill switch
                should_mark_available = True
        
        # Call mark methods outside the lock to avoid deadlock
        if should_mark_unavailable:
            self.mark_unavailable(DegradationReason.KILL_SWITCH, kill_switch_reason)
        elif should_mark_available:
            self.mark_available()
    
    def get_fallback_response(
        self,
        operation: str,
        original_error: Optional[str] = None,
    ) -> FallbackResponse:
        """
        Get a fallback response when AI is unavailable.
        
        Args:
            operation: Name of the operation that failed
            original_error: Original error message if any
            
        Returns:
            FallbackResponse with appropriate message
        """
        state = self.get_state()
        
        if state.status == AIAvailabilityStatus.DISABLED:
            message = "AI features are currently disabled. Please try again later."
        elif state.status == AIAvailabilityStatus.UNAVAILABLE:
            if state.reason == DegradationReason.MODEL_UNREACHABLE:
                message = "AI service is temporarily unavailable. The system continues to operate normally without AI features."
            elif state.reason == DegradationReason.KILL_SWITCH:
                message = "AI features have been temporarily disabled by an administrator."
            else:
                message = "AI service is temporarily unavailable. Please try again later."
        elif state.status == AIAvailabilityStatus.DEGRADED:
            message = f"AI service is operating in degraded mode. Some features may be unavailable."
        else:
            message = f"AI operation '{operation}' could not be completed."
        
        return FallbackResponse(
            success=False,
            message=message,
            fallback_used=True,
            original_error=original_error,
        )


def with_graceful_degradation(
    fallback_value: Any = None,
    fallback_fn: Optional[Callable[..., Any]] = None,
    log_error: bool = True,
) -> Callable:
    """
    Decorator for graceful degradation of AI operations.
    
    If the decorated function fails due to AI unavailability,
    returns the fallback value or calls the fallback function.
    
    Args:
        fallback_value: Value to return on failure (if fallback_fn not provided)
        fallback_fn: Function to call on failure (receives same args as decorated fn)
        log_error: Whether to log the error
        
    Usage:
        @with_graceful_degradation(fallback_value=None)
        async def ai_operation():
            ...
        
        @with_graceful_degradation(fallback_fn=sync_fallback)
        async def ai_operation_with_fallback():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            service = GracefulDegradationService.get()
            
            # Check if AI is available before attempting
            if not service.is_ai_available():
                if log_error:
                    logger.info(f"AI unavailable, using fallback for {func.__name__}")
                if fallback_fn:
                    return fallback_fn(*args, **kwargs)
                return fallback_value
            
            try:
                result = await func(*args, **kwargs)
                service.record_success()
                return result
            except Exception as e:
                if log_error:
                    logger.error(f"AI operation {func.__name__} failed: {e}")
                
                # Determine degradation reason from exception type
                from ai.runtime.model_client import (
                    ModelConnectionError,
                    ModelTimeoutError,
                    ModelUnavailableError,
                )
                
                if isinstance(e, ModelConnectionError):
                    service.record_failure(DegradationReason.MODEL_UNREACHABLE, e)
                elif isinstance(e, ModelTimeoutError):
                    service.record_failure(DegradationReason.MODEL_TIMEOUT, e)
                elif isinstance(e, ModelUnavailableError):
                    service.record_failure(DegradationReason.MODEL_UNREACHABLE, e)
                else:
                    service.record_failure(DegradationReason.INTERNAL_ERROR, e)
                
                if fallback_fn:
                    return fallback_fn(*args, **kwargs)
                return fallback_value
        
        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            service = GracefulDegradationService.get()
            
            if not service.is_ai_available():
                if log_error:
                    logger.info(f"AI unavailable, using fallback for {func.__name__}")
                if fallback_fn:
                    return fallback_fn(*args, **kwargs)
                return fallback_value
            
            try:
                result = func(*args, **kwargs)
                service.record_success()
                return result
            except Exception as e:
                if log_error:
                    logger.error(f"AI operation {func.__name__} failed: {e}")
                service.record_failure(DegradationReason.INTERNAL_ERROR, e)
                
                if fallback_fn:
                    return fallback_fn(*args, **kwargs)
                return fallback_value
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


def ensure_core_functionality(func: Callable) -> Callable:
    """
    Decorator that ensures core functionality is never blocked by AI failures.
    
    If the decorated function fails due to AI issues, it logs the error
    and continues without raising, ensuring core operations complete.
    
    Usage:
        @ensure_core_functionality
        def operation_with_optional_ai():
            # AI enhancement that shouldn't block core operation
            ...
    """
    @wraps(func)
    async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            logger.warning(
                f"AI enhancement {func.__name__} failed, continuing without AI: {e}"
            )
            return None
    
    @wraps(func)
    def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.warning(
                f"AI enhancement {func.__name__} failed, continuing without AI: {e}"
            )
            return None
    
    import asyncio
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    return sync_wrapper


# =============================================================================
# Convenience Functions
# =============================================================================

def get_degradation_service() -> GracefulDegradationService:
    """Get the singleton GracefulDegradationService instance."""
    return GracefulDegradationService.get()


def is_ai_available() -> bool:
    """Check if AI is available."""
    return GracefulDegradationService.get().is_ai_available()


def is_ai_enabled() -> bool:
    """Check if AI is enabled."""
    return GracefulDegradationService.get().is_ai_enabled()


def get_ai_availability_state() -> AIAvailabilityState:
    """Get current AI availability state."""
    return GracefulDegradationService.get().get_state()


def mark_ai_available() -> None:
    """Mark AI as available."""
    GracefulDegradationService.get().mark_available()


def mark_ai_disabled(message: Optional[str] = None) -> None:
    """Mark AI as disabled."""
    GracefulDegradationService.get().mark_disabled(message)


def mark_ai_unavailable(reason: DegradationReason, message: Optional[str] = None) -> None:
    """Mark AI as unavailable."""
    GracefulDegradationService.get().mark_unavailable(reason, message)


def record_ai_failure(reason: DegradationReason, error: Optional[Exception] = None) -> None:
    """Record an AI failure."""
    GracefulDegradationService.get().record_failure(reason, error)


def record_ai_success() -> None:
    """Record a successful AI operation."""
    GracefulDegradationService.get().record_success()
