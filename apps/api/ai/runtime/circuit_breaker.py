"""
Circuit Breaker for AI Layer

Implements circuit breaker pattern for inference calls.
Prevents cascading failures when model is unavailable.

Requirements:
- 17.1: Circuit breaker for inference calls
- 17.2: Timeout handling with partial results
- 17.3: Graceful degradation
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Optional, TypeVar, Generic
from functools import wraps

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CircuitState(str, Enum):
    """State of the circuit breaker."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5          # Failures before opening
    success_threshold: int = 2          # Successes to close from half-open
    timeout_seconds: float = 30.0       # Time before trying half-open
    half_open_max_calls: int = 3        # Max calls in half-open state
    
    # Metrics window
    window_size_seconds: float = 60.0   # Time window for failure counting


@dataclass
class CircuitBreakerMetrics:
    """Metrics for circuit breaker."""
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    rejected_calls: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    state_changes: int = 0
    
    def to_dict(self) -> dict:
        return {
            "totalCalls": self.total_calls,
            "successfulCalls": self.successful_calls,
            "failedCalls": self.failed_calls,
            "rejectedCalls": self.rejected_calls,
            "lastFailureTime": self.last_failure_time.isoformat() if self.last_failure_time else None,
            "lastSuccessTime": self.last_success_time.isoformat() if self.last_success_time else None,
            "stateChanges": self.state_changes,
        }


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open."""
    def __init__(self, circuit_name: str, retry_after_seconds: float):
        self.circuit_name = circuit_name
        self.retry_after_seconds = retry_after_seconds
        super().__init__(
            f"Circuit breaker '{circuit_name}' is open. Retry after {retry_after_seconds:.1f}s"
        )


class CircuitBreaker:
    """
    Circuit breaker implementation.
    
    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Service failing, requests rejected immediately
    - HALF_OPEN: Testing recovery, limited requests allowed
    """
    
    def __init__(
        self,
        name: str,
        config: Optional[CircuitBreakerConfig] = None,
    ):
        """
        Initialize circuit breaker.
        
        Args:
            name: Name of the circuit (for logging/metrics)
            config: Circuit breaker configuration
        """
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._half_open_calls = 0
        self._last_failure_time: Optional[float] = None
        self._last_state_change: float = time.time()
        self._metrics = CircuitBreakerMetrics()
    
    @property
    def state(self) -> CircuitState:
        """Get current circuit state."""
        self._check_state_transition()
        return self._state
    
    @property
    def is_closed(self) -> bool:
        """Check if circuit is closed (normal operation)."""
        return self.state == CircuitState.CLOSED
    
    @property
    def is_open(self) -> bool:
        """Check if circuit is open (rejecting requests)."""
        return self.state == CircuitState.OPEN
    
    @property
    def metrics(self) -> CircuitBreakerMetrics:
        """Get circuit breaker metrics."""
        return self._metrics
    
    def _check_state_transition(self) -> None:
        """Check if state should transition based on timeout."""
        if self._state == CircuitState.OPEN:
            elapsed = time.time() - self._last_state_change
            if elapsed >= self.config.timeout_seconds:
                self._transition_to(CircuitState.HALF_OPEN)
    
    def _transition_to(self, new_state: CircuitState) -> None:
        """Transition to a new state."""
        if self._state != new_state:
            old_state = self._state
            self._state = new_state
            self._last_state_change = time.time()
            self._metrics.state_changes += 1
            
            if new_state == CircuitState.HALF_OPEN:
                self._half_open_calls = 0
                self._success_count = 0
            elif new_state == CircuitState.CLOSED:
                self._failure_count = 0
            
            logger.info(
                f"Circuit breaker '{self.name}' transitioned: {old_state.value} -> {new_state.value}"
            )
    
    def _record_success(self) -> None:
        """Record a successful call."""
        self._metrics.total_calls += 1
        self._metrics.successful_calls += 1
        self._metrics.last_success_time = datetime.now(timezone.utc)
        
        if self._state == CircuitState.HALF_OPEN:
            self._success_count += 1
            if self._success_count >= self.config.success_threshold:
                self._transition_to(CircuitState.CLOSED)
        elif self._state == CircuitState.CLOSED:
            # Reset failure count on success
            self._failure_count = 0
    
    def _record_failure(self) -> None:
        """Record a failed call."""
        self._metrics.total_calls += 1
        self._metrics.failed_calls += 1
        self._metrics.last_failure_time = datetime.now(timezone.utc)
        self._last_failure_time = time.time()
        
        if self._state == CircuitState.HALF_OPEN:
            # Any failure in half-open goes back to open
            self._transition_to(CircuitState.OPEN)
        elif self._state == CircuitState.CLOSED:
            self._failure_count += 1
            if self._failure_count >= self.config.failure_threshold:
                self._transition_to(CircuitState.OPEN)
    
    def _can_execute(self) -> bool:
        """Check if a call can be executed."""
        state = self.state  # This triggers state check
        
        if state == CircuitState.CLOSED:
            return True
        elif state == CircuitState.OPEN:
            return False
        elif state == CircuitState.HALF_OPEN:
            if self._half_open_calls < self.config.half_open_max_calls:
                self._half_open_calls += 1
                return True
            return False
        
        return False
    
    def _get_retry_after(self) -> float:
        """Get seconds until retry is allowed."""
        if self._state != CircuitState.OPEN:
            return 0.0
        elapsed = time.time() - self._last_state_change
        return max(0.0, self.config.timeout_seconds - elapsed)
    
    async def execute(
        self,
        func: Callable[..., Any],
        *args,
        **kwargs,
    ) -> Any:
        """
        Execute a function through the circuit breaker.
        
        Args:
            func: Async function to execute
            *args: Positional arguments
            **kwargs: Keyword arguments
            
        Returns:
            Result of the function
            
        Raises:
            CircuitBreakerOpenError: If circuit is open
        """
        if not self._can_execute():
            self._metrics.rejected_calls += 1
            raise CircuitBreakerOpenError(self.name, self._get_retry_after())
        
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            self._record_success()
            return result
            
        except Exception as e:
            self._record_failure()
            raise
    
    def execute_sync(
        self,
        func: Callable[..., Any],
        *args,
        **kwargs,
    ) -> Any:
        """
        Execute a synchronous function through the circuit breaker.
        
        Args:
            func: Function to execute
            *args: Positional arguments
            **kwargs: Keyword arguments
            
        Returns:
            Result of the function
            
        Raises:
            CircuitBreakerOpenError: If circuit is open
        """
        if not self._can_execute():
            self._metrics.rejected_calls += 1
            raise CircuitBreakerOpenError(self.name, self._get_retry_after())
        
        try:
            result = func(*args, **kwargs)
            self._record_success()
            return result
        except Exception as e:
            self._record_failure()
            raise
    
    def reset(self) -> None:
        """Reset the circuit breaker to closed state."""
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._half_open_calls = 0
        self._last_failure_time = None
        self._last_state_change = time.time()
        logger.info(f"Circuit breaker '{self.name}' reset to CLOSED")
    
    def force_open(self) -> None:
        """Force the circuit breaker to open state."""
        self._transition_to(CircuitState.OPEN)
        logger.warning(f"Circuit breaker '{self.name}' forced to OPEN")
    
    def get_status(self) -> dict:
        """Get circuit breaker status."""
        return {
            "name": self.name,
            "state": self.state.value,
            "failureCount": self._failure_count,
            "successCount": self._success_count,
            "retryAfterSeconds": self._get_retry_after(),
            "metrics": self._metrics.to_dict(),
        }


def circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    timeout_seconds: float = 30.0,
):
    """
    Decorator to wrap a function with circuit breaker.
    
    Args:
        name: Circuit breaker name
        failure_threshold: Failures before opening
        timeout_seconds: Time before trying half-open
    """
    config = CircuitBreakerConfig(
        failure_threshold=failure_threshold,
        timeout_seconds=timeout_seconds,
    )
    cb = CircuitBreaker(name, config)
    
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await cb.execute(func, *args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return cb.execute_sync(func, *args, **kwargs)
        
        if asyncio.iscoroutinefunction(func):
            async_wrapper.circuit_breaker = cb
            return async_wrapper
        else:
            sync_wrapper.circuit_breaker = cb
            return sync_wrapper
    
    return decorator


# Global circuit breakers
_circuit_breakers: dict[str, CircuitBreaker] = {}


def get_circuit_breaker(name: str) -> CircuitBreaker:
    """Get or create a circuit breaker by name."""
    if name not in _circuit_breakers:
        _circuit_breakers[name] = CircuitBreaker(name)
    return _circuit_breakers[name]


def get_inference_circuit_breaker() -> CircuitBreaker:
    """Get the circuit breaker for inference calls."""
    return get_circuit_breaker("inference")
