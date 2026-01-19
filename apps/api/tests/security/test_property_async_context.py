"""
Property-based tests for async context propagation (G-02)
Tests that tenant context propagates correctly in async operations
"""
import pytest
import asyncio
from utils.async_context import gather_with_tenant_context
from core.database import _current_tenant_id, set_tenant_context, reset_tenant_context, get_current_tenant_id


@pytest.mark.asyncio
async def test_property_async_context_propagation():
    """
    Property: Tenant context propagates to async tasks
    
    For any tenant_id, when using gather_with_tenant_context,
    all async tasks should see the correct tenant context.
    
    **Feature: multi-tenancy-security, Property: Async Context Propagation**
    **Validates: Requirements 3.1, 3.2**
    """
    async def check_context(expected_tenant: str):
        current = get_current_tenant_id()
        return current == expected_tenant
    
    # Set context
    token = set_tenant_context("tenant-async-1")
    
    try:
        # Run multiple async tasks
        results = await gather_with_tenant_context(
            check_context("tenant-async-1"),
            check_context("tenant-async-1"),
            check_context("tenant-async-1"),
        )
        
        # All tasks should have seen correct context
        assert all(results), f"Some tasks didn't see correct context: {results}"
        
    finally:
        reset_tenant_context(token)


@pytest.mark.asyncio
async def test_property_async_context_isolation():
    """
    Property: Each async task has isolated context
    
    For any set of concurrent async tasks with different contexts,
    each should maintain its own context without interference.
    
    **Feature: multi-tenancy-security, Property: Async Context Propagation**
    **Validates: Requirements 3.1, 3.2**
    """
    results = []
    
    async def task_with_context(tenant_id: str, task_id: int):
        token = set_tenant_context(tenant_id)
        try:
            await asyncio.sleep(0.01)  # Simulate async work
            current = get_current_tenant_id()
            results.append({
                "task_id": task_id,
                "expected": tenant_id,
                "actual": current,
                "match": tenant_id == current
            })
        finally:
            reset_tenant_context(token)
    
    # Run multiple tasks concurrently
    await asyncio.gather(
        task_with_context("tenant-1", 1),
        task_with_context("tenant-2", 2),
        task_with_context("tenant-3", 3),
        task_with_context("tenant-1", 4),
        task_with_context("tenant-2", 5),
    )
    
    # All tasks should have maintained their context
    assert all(r["match"] for r in results), f"Context isolation failed: {results}"


@pytest.mark.asyncio
async def test_property_async_gather_preserves_context():
    """
    Property: gather_with_tenant_context preserves caller's context
    
    For any tenant context, after gather_with_tenant_context completes,
    the caller's context should be unchanged.
    
    **Feature: multi-tenancy-security, Property: Async Context Propagation**
    **Validates: Requirements 3.1, 3.2**
    """
    # Set initial context
    token = set_tenant_context("tenant-caller")
    
    try:
        async def dummy_task():
            await asyncio.sleep(0.01)
            return "done"
        
        # Run gather
        await gather_with_tenant_context(
            dummy_task(),
            dummy_task(),
            dummy_task(),
        )
        
        # Caller's context should be preserved
        current = get_current_tenant_id()
        assert current == "tenant-caller"
        
    finally:
        reset_tenant_context(token)


@pytest.mark.asyncio
async def test_property_async_exception_handling():
    """
    Property: Context cleanup happens even when async tasks fail
    
    For any async task that raises an exception, the context
    should still be cleaned up properly.
    
    **Feature: multi-tenancy-security, Property: Async Context Propagation**
    **Validates: Requirements 3.1, 3.2**
    """
    async def failing_task():
        raise ValueError("Task failed")
    
    async def succeeding_task():
        return "success"
    
    token = set_tenant_context("tenant-exception")
    
    try:
        # gather_with_tenant_context should handle exceptions
        with pytest.raises(ValueError):
            await gather_with_tenant_context(
                succeeding_task(),
                failing_task(),
                succeeding_task(),
            )
    finally:
        reset_tenant_context(token)


@pytest.mark.asyncio
async def test_property_async_nested_gather():
    """
    Property: Nested gather operations maintain correct context
    
    For any nested async operations, each level should maintain
    its own context correctly.
    
    **Feature: multi-tenancy-security, Property: Async Context Propagation**
    **Validates: Requirements 3.1, 3.2**
    """
    async def inner_operation():
        current = get_current_tenant_id()
        return current
    
    async def outer_operation(expected_tenant: str):
        # Verify context in outer operation
        current = get_current_tenant_id()
        assert current == expected_tenant
        
        # Run nested gather
        results = await gather_with_tenant_context(
            inner_operation(),
            inner_operation(),
        )
        
        # All inner operations should see same context
        assert all(r == expected_tenant for r in results)
        
        return expected_tenant
    
    token = set_tenant_context("tenant-nested")
    
    try:
        results = await gather_with_tenant_context(
            outer_operation("tenant-nested"),
            outer_operation("tenant-nested"),
        )
        
        assert all(r == "tenant-nested" for r in results)
        
    finally:
        reset_tenant_context(token)
