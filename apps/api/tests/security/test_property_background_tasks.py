"""
Property-based tests for background task isolation (G-02)
Tests that @tenant_task decorator properly isolates tenant context
"""
import pytest
from utils.background_task import tenant_task, TenantContextError
from core.database import _current_tenant_id, get_current_tenant_id


def test_property_background_task_requires_keyword_only():
    """
    Property: @tenant_task requires keyword-only tenant_id parameter
    
    For any function decorated with @tenant_task, calling it with
    positional tenant_id should raise TenantContextError.
    
    **Feature: multi-tenancy-security, Property 2: Background Task Context Isolation**
    **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    """
    @tenant_task
    def sample_task(*, tenant_id: str, data: str):
        return f"{tenant_id}:{data}"
    
    # Correct usage (keyword argument)
    result = sample_task(tenant_id="tenant-1", data="test")
    assert result == "tenant-1:test"
    
    # Incorrect usage (positional argument) - should raise
    with pytest.raises(TenantContextError, match="keyword-only"):
        sample_task("tenant-1", "test")  # type: ignore


def test_property_background_task_sets_context():
    """
    Property: @tenant_task sets tenant context for task execution
    
    For any tenant_id passed to a @tenant_task function,
    the context should be set correctly during execution.
    
    **Feature: multi-tenancy-security, Property 2: Background Task Context Isolation**
    **Validates: Requirements 2.1, 2.2, 2.3**
    """
    results = []
    
    @tenant_task
    def check_context(*, tenant_id: str):
        # Inside task, context should be set
        current = get_current_tenant_id()
        results.append((tenant_id, current))
        return current
    
    # Test with multiple tenant IDs
    test_tenants = ["tenant-1", "tenant-2", "tenant-3"]
    
    for tenant_id in test_tenants:
        result = check_context(tenant_id=tenant_id)
        assert result == tenant_id
    
    # Verify all executions had correct context
    for expected, actual in results:
        assert expected == actual


def test_property_background_task_cleans_up_context():
    """
    Property: @tenant_task cleans up context after execution
    
    For any task execution, the tenant context should be cleaned up
    after the task completes (success or failure).
    
    **Feature: multi-tenancy-security, Property 2: Background Task Context Isolation**
    **Validates: Requirements 2.1, 2.2, 2.3**
    """
    # Set initial context
    _current_tenant_id.set("tenant-initial")
    
    @tenant_task
    def task_that_succeeds(*, tenant_id: str):
        assert get_current_tenant_id() == tenant_id
        return "success"
    
    @tenant_task
    def task_that_fails(*, tenant_id: str):
        assert get_current_tenant_id() == tenant_id
        raise ValueError("Task failed")
    
    # Execute successful task
    result = task_that_succeeds(tenant_id="tenant-task-1")
    assert result == "success"
    
    # Context should be restored to initial
    assert get_current_tenant_id() == "tenant-initial"
    
    # Execute failing task
    with pytest.raises(ValueError):
        task_that_fails(tenant_id="tenant-task-2")
    
    # Context should still be restored
    assert get_current_tenant_id() == "tenant-initial"


def test_property_background_task_isolation():
    """
    Property: Multiple background tasks have isolated contexts
    
    For any sequence of background tasks with different tenant_ids,
    each should execute with its own isolated context.
    
    **Feature: multi-tenancy-security, Property 2: Background Task Context Isolation**
    **Validates: Requirements 2.1, 2.2, 2.3**
    """
    execution_log = []
    
    @tenant_task
    def log_execution(*, tenant_id: str, task_id: int):
        current = get_current_tenant_id()
        execution_log.append({
            "task_id": task_id,
            "expected": tenant_id,
            "actual": current,
            "match": tenant_id == current
        })
        return current
    
    # Execute multiple tasks
    for i in range(10):
        tenant_id = f"tenant-{i % 3}"  # 3 different tenants
        result = log_execution(tenant_id=tenant_id, task_id=i)
        assert result == tenant_id
    
    # Verify all tasks had correct isolated context
    assert all(entry["match"] for entry in execution_log)


def test_property_background_task_nested_execution():
    """
    Property: Nested background tasks maintain correct context
    
    For any background task that calls another background task,
    each should maintain its own context correctly.
    
    **Feature: multi-tenancy-security, Property 2: Background Task Context Isolation**
    **Validates: Requirements 2.1, 2.2, 2.3**
    """
    @tenant_task
    def inner_task(*, tenant_id: str):
        return get_current_tenant_id()
    
    @tenant_task
    def outer_task(*, tenant_id: str):
        # Outer task context
        outer_context = get_current_tenant_id()
        assert outer_context == tenant_id
        
        # Call inner task with different tenant
        inner_result = inner_task(tenant_id="tenant-inner")
        assert inner_result == "tenant-inner"
        
        # Outer context should be restored
        restored_context = get_current_tenant_id()
        assert restored_context == tenant_id
        
        return outer_context
    
    result = outer_task(tenant_id="tenant-outer")
    assert result == "tenant-outer"


def test_property_background_task_concurrent_execution():
    """
    Property: Concurrent background tasks have isolated contexts
    
    For any concurrent background tasks with different tenant_ids,
    their contexts should not interfere with each other.
    
    **Feature: multi-tenancy-security, Property 2: Background Task Context Isolation**
    **Validates: Requirements 2.1, 2.2, 2.3**
    """
    import threading
    import time
    
    results = {}
    errors = []
    
    @tenant_task
    def concurrent_task(*, tenant_id: str, task_id: int):
        try:
            # Verify context at start
            current = get_current_tenant_id()
            if current != tenant_id:
                errors.append(f"Task {task_id}: Expected {tenant_id}, got {current}")
                return
            
            # Simulate work
            time.sleep(0.01)
            
            # Verify context still correct
            current = get_current_tenant_id()
            if current != tenant_id:
                errors.append(f"Task {task_id}: Context changed during execution")
                return
            
            results[task_id] = tenant_id
            
        except Exception as e:
            errors.append(f"Task {task_id}: {str(e)}")
    
    # Start multiple concurrent tasks
    threads = []
    for i in range(10):
        t = threading.Thread(
            target=concurrent_task,
            kwargs={"tenant_id": f"tenant-{i % 3}", "task_id": i}
        )
        threads.append(t)
        t.start()
    
    # Wait for all tasks
    for t in threads:
        t.join()
    
    # Verify all tasks completed successfully
    assert len(errors) == 0, f"Errors occurred: {errors}"
    assert len(results) == 10, f"Not all tasks completed: {results}"
