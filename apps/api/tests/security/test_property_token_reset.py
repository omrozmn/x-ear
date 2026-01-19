"""
Property-based tests for token-based context reset (G-02)
Tests that context cleanup works correctly across all scenarios
"""
import pytest
from contextvars import ContextVar, Token
from core.database import _current_tenant_id, set_tenant_context, reset_tenant_context


def test_property_token_reset_restores_previous_value():
    """
    Property 1: Token reset always restores previous context value
    
    For any initial context value and any new value,
    setting then resetting should restore the original value.
    
    **Feature: multi-tenancy-security, Property 1: Request Context Cleanup Guarantee**
    **Validates: Requirements 1.1, 1.2**
    """
    # Test with various initial values
    test_cases = [
        (None, "tenant-1"),
        ("tenant-1", "tenant-2"),
        ("tenant-2", None),
        (None, None),
        ("tenant-1", "tenant-1"),  # Same value
    ]
    
    for initial_value, new_value in test_cases:
        # Reset context to clean state for each test
        _current_tenant_id.set(None)
        
        # Set initial context
        if initial_value is not None:
            initial_token = _current_tenant_id.set(initial_value)
        
        # Get current value
        current = _current_tenant_id.get(None)
        assert current == initial_value, f"Initial setup failed for {initial_value}"
        
        # Set new value with token
        token = set_tenant_context(new_value)
        assert _current_tenant_id.get(None) == new_value
        
        # Reset to previous value
        reset_tenant_context(token)
        
        # Verify restoration
        restored = _current_tenant_id.get(None)
        assert restored == initial_value, \
            f"Failed to restore {initial_value} after setting {new_value}, got {restored}"


def test_property_nested_context_reset():
    """
    Property 2: Nested context changes restore correctly
    
    For any sequence of context changes, each reset restores
    the immediately previous value (stack-like behavior).
    
    **Feature: multi-tenancy-security, Property 1: Request Context Cleanup Guarantee**
    **Validates: Requirements 1.1, 1.2**
    """
    # Start with None
    _current_tenant_id.set(None)
    
    # Nested context changes
    token1 = set_tenant_context("tenant-1")
    assert _current_tenant_id.get() == "tenant-1"
    
    token2 = set_tenant_context("tenant-2")
    assert _current_tenant_id.get() == "tenant-2"
    
    token3 = set_tenant_context("tenant-3")
    assert _current_tenant_id.get() == "tenant-3"
    
    # Reset in reverse order (LIFO)
    reset_tenant_context(token3)
    assert _current_tenant_id.get() == "tenant-2"
    
    reset_tenant_context(token2)
    assert _current_tenant_id.get() == "tenant-1"
    
    reset_tenant_context(token1)
    assert _current_tenant_id.get(None) is None


def test_property_exception_safety():
    """
    Property 3: Context reset works even after exceptions
    
    For any context value, if an exception occurs after setting context,
    the reset in finally block should still restore the previous value.
    
    **Feature: multi-tenancy-security, Property 1: Request Context Cleanup Guarantee**
    **Validates: Requirements 1.1, 1.2**
    """
    # Set initial context
    _current_tenant_id.set("tenant-initial")
    
    # Try to change context and raise exception
    try:
        token = set_tenant_context("tenant-exception")
        assert _current_tenant_id.get() == "tenant-exception"
        raise ValueError("Test exception")
    except ValueError:
        # Reset should work even after exception
        reset_tenant_context(token)
    
    # Verify restoration
    assert _current_tenant_id.get() == "tenant-initial"


def test_property_multiple_resets_idempotent():
    """
    Property 4: Token can only be used once (by design)
    
    ContextVar tokens are single-use by design. This test verifies
    that attempting to reuse a token raises RuntimeError.
    
    **Feature: multi-tenancy-security, Property 1: Request Context Cleanup Guarantee**
    **Validates: Requirements 1.1, 1.2**
    """
    _current_tenant_id.set("tenant-1")
    
    token = set_tenant_context("tenant-2")
    assert _current_tenant_id.get() == "tenant-2"
    
    # First reset
    reset_tenant_context(token)
    assert _current_tenant_id.get() == "tenant-1"
    
    # Second reset with same token should raise RuntimeError
    # This is expected behavior - tokens are single-use
    with pytest.raises(RuntimeError, match="has already been used"):
        reset_tenant_context(token)


def test_property_concurrent_contexts_isolated():
    """
    Property 5: Concurrent context changes don't interfere
    
    For any two independent context changes, they should not affect each other.
    This tests ContextVar's thread-local behavior.
    
    **Feature: multi-tenancy-security, Property 1: Request Context Cleanup Guarantee**
    **Validates: Requirements 1.1, 1.2**
    """
    import threading
    import time
    
    results = {}
    
    def worker(tenant_id: str, worker_id: int):
        """Worker that sets context and verifies isolation"""
        token = set_tenant_context(tenant_id)
        time.sleep(0.01)  # Simulate work
        
        # Verify context is still correct
        current = _current_tenant_id.get()
        results[worker_id] = (current == tenant_id)
        
        reset_tenant_context(token)
    
    # Start multiple threads with different contexts
    threads = []
    for i in range(5):
        t = threading.Thread(target=worker, args=(f"tenant-{i}", i))
        threads.append(t)
        t.start()
    
    # Wait for all threads
    for t in threads:
        t.join()
    
    # Verify all workers saw their own context
    assert all(results.values()), f"Context isolation failed: {results}"


def test_property_token_type_safety():
    """
    Property 6: Token type is correct and usable
    
    For any context value, set_tenant_context should return a valid Token
    that can be used with reset_tenant_context.
    
    **Feature: multi-tenancy-security, Property 1: Request Context Cleanup Guarantee**
    **Validates: Requirements 1.1, 1.2**
    """
    test_values = [None, "tenant-1", "tenant-2", ""]
    
    for value in test_values:
        token = set_tenant_context(value)
        
        # Verify token is correct type
        assert isinstance(token, Token), f"Expected Token, got {type(token)}"
        
        # Verify token is usable
        reset_tenant_context(token)  # Should not raise
