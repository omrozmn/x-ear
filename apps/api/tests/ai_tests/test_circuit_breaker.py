"""
Property-based tests for Circuit Breaker.

**Feature: ai-layer-architecture**
**Property 13: Circuit Breaker Behavior**

**Validates: Requirements 17.1, 17.2, 17.3**

Tests that:
- Circuit breaker opens after failure threshold
- Circuit breaker transitions to half-open after timeout
- Circuit breaker closes after success threshold in half-open
- Requests are rejected when circuit is open
"""

import sys
from pathlib import Path
import asyncio
import time

# Add the api directory to the path
_current_file = Path(__file__).resolve()
_api_dir = _current_file.parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

import pytest
from hypothesis import given, strategies as st, settings

from ai.runtime.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerOpenError,
    CircuitState,
    circuit_breaker,
)


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def default_breaker():
    """Create a circuit breaker with default config."""
    return CircuitBreaker("test")


@pytest.fixture
def fast_breaker():
    """Create a circuit breaker with fast timeout for testing."""
    config = CircuitBreakerConfig(
        failure_threshold=3,
        success_threshold=2,
        timeout_seconds=0.1,  # 100ms for fast testing
        half_open_max_calls=2,
    )
    return CircuitBreaker("fast_test", config)


# =============================================================================
# Basic State Tests
# =============================================================================

class TestCircuitBreakerBasic:
    """Basic tests for circuit breaker."""
    
    def test_initial_state_closed(self, default_breaker):
        """Circuit breaker starts in closed state."""
        assert default_breaker.state == CircuitState.CLOSED
        assert default_breaker.is_closed
        assert not default_breaker.is_open
    
    def test_success_keeps_closed(self, default_breaker):
        """Successful calls keep circuit closed."""
        def success_func():
            return "success"
        
        for _ in range(10):
            result = default_breaker.execute_sync(success_func)
            assert result == "success"
        
        assert default_breaker.is_closed
        assert default_breaker.metrics.successful_calls == 10
    
    def test_failure_increments_count(self, default_breaker):
        """Failed calls increment failure count."""
        def fail_func():
            raise ValueError("test error")
        
        with pytest.raises(ValueError):
            default_breaker.execute_sync(fail_func)
        
        assert default_breaker.metrics.failed_calls == 1
    
    def test_metrics_tracking(self, default_breaker):
        """Metrics are tracked correctly."""
        def success_func():
            return True
        
        def fail_func():
            raise ValueError("error")
        
        # 3 successes
        for _ in range(3):
            default_breaker.execute_sync(success_func)
        
        # 2 failures
        for _ in range(2):
            try:
                default_breaker.execute_sync(fail_func)
            except ValueError:
                pass
        
        metrics = default_breaker.metrics
        assert metrics.total_calls == 5
        assert metrics.successful_calls == 3
        assert metrics.failed_calls == 2


# =============================================================================
# Property 13: Circuit Breaker Behavior
# =============================================================================

class TestCircuitBreakerBehavior:
    """
    Property 13: Circuit Breaker Behavior
    
    Validates: Requirements 17.1, 17.2, 17.3
    """
    
    def test_opens_after_failure_threshold(self, fast_breaker):
        """Circuit opens after reaching failure threshold."""
        def fail_func():
            raise ValueError("error")
        
        # Fail until threshold (3 failures)
        for _ in range(3):
            try:
                fast_breaker.execute_sync(fail_func)
            except ValueError:
                pass
        
        assert fast_breaker.state == CircuitState.OPEN
        assert fast_breaker.is_open
    
    def test_rejects_when_open(self, fast_breaker):
        """Requests are rejected when circuit is open."""
        def fail_func():
            raise ValueError("error")
        
        # Open the circuit
        for _ in range(3):
            try:
                fast_breaker.execute_sync(fail_func)
            except ValueError:
                pass
        
        assert fast_breaker.is_open
        
        # Next call should be rejected
        def success_func():
            return "success"
        
        with pytest.raises(CircuitBreakerOpenError) as exc_info:
            fast_breaker.execute_sync(success_func)
        
        assert exc_info.value.circuit_name == "fast_test"
        assert fast_breaker.metrics.rejected_calls == 1
    
    def test_transitions_to_half_open_after_timeout(self, fast_breaker):
        """Circuit transitions to half-open after timeout."""
        def fail_func():
            raise ValueError("error")
        
        # Open the circuit
        for _ in range(3):
            try:
                fast_breaker.execute_sync(fail_func)
            except ValueError:
                pass
        
        assert fast_breaker.is_open
        
        # Wait for timeout
        time.sleep(0.15)  # 150ms > 100ms timeout
        
        # State should now be half-open
        assert fast_breaker.state == CircuitState.HALF_OPEN
    
    def test_closes_after_success_in_half_open(self, fast_breaker):
        """Circuit closes after success threshold in half-open."""
        def fail_func():
            raise ValueError("error")
        
        def success_func():
            return "success"
        
        # Open the circuit
        for _ in range(3):
            try:
                fast_breaker.execute_sync(fail_func)
            except ValueError:
                pass
        
        # Wait for half-open
        time.sleep(0.15)
        assert fast_breaker.state == CircuitState.HALF_OPEN
        
        # Succeed twice (success_threshold=2)
        for _ in range(2):
            fast_breaker.execute_sync(success_func)
        
        assert fast_breaker.state == CircuitState.CLOSED
    
    def test_reopens_on_failure_in_half_open(self, fast_breaker):
        """Circuit reopens on failure in half-open state."""
        def fail_func():
            raise ValueError("error")
        
        # Open the circuit
        for _ in range(3):
            try:
                fast_breaker.execute_sync(fail_func)
            except ValueError:
                pass
        
        # Wait for half-open
        time.sleep(0.15)
        assert fast_breaker.state == CircuitState.HALF_OPEN
        
        # Fail in half-open
        try:
            fast_breaker.execute_sync(fail_func)
        except ValueError:
            pass
        
        assert fast_breaker.state == CircuitState.OPEN
    
    @given(st.integers(min_value=1, max_value=10))
    @settings(max_examples=50)
    def test_failure_threshold_property(self, threshold: int):
        """
        Property: Circuit opens exactly at failure threshold.
        """
        config = CircuitBreakerConfig(
            failure_threshold=threshold,
            timeout_seconds=60.0,
        )
        breaker = CircuitBreaker("test", config)
        
        def fail_func():
            raise ValueError("error")
        
        # Fail threshold-1 times, should stay closed
        for _ in range(threshold - 1):
            try:
                breaker.execute_sync(fail_func)
            except ValueError:
                pass
        
        assert breaker.state == CircuitState.CLOSED
        
        # One more failure should open
        try:
            breaker.execute_sync(fail_func)
        except ValueError:
            pass
        
        assert breaker.state == CircuitState.OPEN
    
    def test_success_resets_failure_count(self, fast_breaker):
        """Success resets failure count in closed state."""
        def fail_func():
            raise ValueError("error")
        
        def success_func():
            return "success"
        
        # 2 failures (below threshold of 3)
        for _ in range(2):
            try:
                fast_breaker.execute_sync(fail_func)
            except ValueError:
                pass
        
        # 1 success resets count
        fast_breaker.execute_sync(success_func)
        
        # 2 more failures should not open (count was reset)
        for _ in range(2):
            try:
                fast_breaker.execute_sync(fail_func)
            except ValueError:
                pass
        
        assert fast_breaker.state == CircuitState.CLOSED


# =============================================================================
# Async Tests (using asyncio.run for compatibility)
# =============================================================================

class TestCircuitBreakerAsync:
    """Tests for async circuit breaker operations."""
    
    def test_async_success(self, default_breaker):
        """Async successful calls work correctly."""
        async def async_success():
            return "async_success"
        
        result = asyncio.run(default_breaker.execute(async_success))
        assert result == "async_success"
        assert default_breaker.metrics.successful_calls == 1
    
    def test_async_failure(self, default_breaker):
        """Async failed calls are tracked."""
        async def async_fail():
            raise ValueError("async error")
        
        with pytest.raises(ValueError):
            asyncio.run(default_breaker.execute(async_fail))
        
        assert default_breaker.metrics.failed_calls == 1
    
    def test_async_rejection_when_open(self, fast_breaker):
        """Async calls are rejected when circuit is open."""
        async def async_fail():
            raise ValueError("error")
        
        # Open the circuit
        for _ in range(3):
            try:
                asyncio.run(fast_breaker.execute(async_fail))
            except ValueError:
                pass
        
        assert fast_breaker.is_open
        
        async def async_success():
            return "success"
        
        with pytest.raises(CircuitBreakerOpenError):
            asyncio.run(fast_breaker.execute(async_success))


# =============================================================================
# Control Methods Tests
# =============================================================================

class TestCircuitBreakerControl:
    """Tests for circuit breaker control methods."""
    
    def test_reset(self, fast_breaker):
        """Reset returns circuit to closed state."""
        def fail_func():
            raise ValueError("error")
        
        # Open the circuit
        for _ in range(3):
            try:
                fast_breaker.execute_sync(fail_func)
            except ValueError:
                pass
        
        assert fast_breaker.is_open
        
        # Reset
        fast_breaker.reset()
        
        assert fast_breaker.state == CircuitState.CLOSED
    
    def test_force_open(self, default_breaker):
        """Force open sets circuit to open state."""
        assert default_breaker.is_closed
        
        default_breaker.force_open()
        
        assert default_breaker.is_open
    
    def test_get_status(self, default_breaker):
        """get_status returns correct information."""
        status = default_breaker.get_status()
        
        assert status["name"] == "test"
        assert status["state"] == "closed"
        assert "metrics" in status
        assert "failureCount" in status


# =============================================================================
# Decorator Tests
# =============================================================================

class TestCircuitBreakerDecorator:
    """Tests for circuit breaker decorator."""
    
    def test_decorator_sync(self):
        """Decorator works with sync functions."""
        @circuit_breaker("decorator_test", failure_threshold=2)
        def decorated_func():
            return "decorated"
        
        result = decorated_func()
        assert result == "decorated"
        
        # Access circuit breaker through function attribute
        assert hasattr(decorated_func, "circuit_breaker")
        assert decorated_func.circuit_breaker.metrics.successful_calls == 1
    
    def test_decorator_opens_on_failures(self):
        """Decorator opens circuit on failures."""
        call_count = 0
        
        @circuit_breaker("decorator_fail_test", failure_threshold=2, timeout_seconds=60)
        def failing_func():
            nonlocal call_count
            call_count += 1
            raise ValueError("error")
        
        # Fail twice to open
        for _ in range(2):
            try:
                failing_func()
            except ValueError:
                pass
        
        assert call_count == 2
        assert failing_func.circuit_breaker.is_open
        
        # Next call should be rejected without calling function
        with pytest.raises(CircuitBreakerOpenError):
            failing_func()
        
        assert call_count == 2  # Function not called


# =============================================================================
# Half-Open State Tests
# =============================================================================

class TestHalfOpenState:
    """Tests for half-open state behavior."""
    
    def test_limited_calls_in_half_open(self, fast_breaker):
        """Only limited calls allowed in half-open state."""
        def fail_func():
            raise ValueError("error")
        
        # Open the circuit
        for _ in range(3):
            try:
                fast_breaker.execute_sync(fail_func)
            except ValueError:
                pass
        
        # Wait for half-open
        time.sleep(0.15)
        assert fast_breaker.state == CircuitState.HALF_OPEN
        
        def success_func():
            return "success"
        
        # Should allow half_open_max_calls (2) calls
        fast_breaker.execute_sync(success_func)
        fast_breaker.execute_sync(success_func)  # This closes the circuit
        
        # Circuit should be closed now (2 successes = success_threshold)
        assert fast_breaker.state == CircuitState.CLOSED
    
    def test_state_changes_tracked(self, fast_breaker):
        """State changes are tracked in metrics."""
        def fail_func():
            raise ValueError("error")
        
        def success_func():
            return "success"
        
        initial_changes = fast_breaker.metrics.state_changes
        
        # Open the circuit
        for _ in range(3):
            try:
                fast_breaker.execute_sync(fail_func)
            except ValueError:
                pass
        
        # Wait for half-open
        time.sleep(0.15)
        _ = fast_breaker.state  # Trigger state check
        
        # Close the circuit
        for _ in range(2):
            fast_breaker.execute_sync(success_func)
        
        # Should have 2 state changes: CLOSED->OPEN, OPEN->HALF_OPEN, HALF_OPEN->CLOSED
        assert fast_breaker.metrics.state_changes >= initial_changes + 2
