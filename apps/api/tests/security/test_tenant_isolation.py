"""
Tenant Isolation Tests (G-02 Task 8.1)

Tests for token-based context management and request → background task → query flow.
Validates Requirements 5.1, 5.2 from multi-tenancy-security spec.

CRITICAL RULES TESTED:
1. Token-based ContextVar reset (set(None) YASAK)
2. Background task context isolation
3. Async context propagation
4. Exception cleanup
"""
import pytest
import asyncio
from unittest.mock import patch, MagicMock
from contextvars import copy_context

# Configure pytest-asyncio
pytestmark = pytest.mark.asyncio(loop_scope="function")

# Import tenant context utilities
import sys
from pathlib import Path
_api_dir = Path(__file__).resolve().parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

from core.database import (
    set_tenant_context,
    reset_tenant_context,
    get_current_tenant_id,
    set_current_tenant_id,
    unbound_session,
    TenantContextToken
)
from utils.background_task import (
    tenant_task,
    tenant_task_async,
    run_in_tenant_context,
    run_in_tenant_context_async
)
from utils.async_context import (
    gather_with_tenant_context,
    create_task_with_tenant_context,
    run_with_tenant_context,
    TenantContextTaskGroup
)
from utils.exceptions import (
    TenantContextError,
    TenantContextMissingError,
    UnboundSessionAuditError
)


class TestTokenBasedContextManagement:
    """Tests for token-based tenant context management."""
    
    def test_set_tenant_context_returns_token(self):
        """set_tenant_context should return a token for cleanup."""
        token = set_tenant_context("tenant_123")
        try:
            assert token is not None
            assert get_current_tenant_id() == "tenant_123"
        finally:
            reset_tenant_context(token)
    
    def test_reset_tenant_context_restores_previous(self):
        """reset_tenant_context should restore previous context value."""
        # Set initial context
        token1 = set_tenant_context("tenant_A")
        try:
            assert get_current_tenant_id() == "tenant_A"
            
            # Set nested context
            token2 = set_tenant_context("tenant_B")
            try:
                assert get_current_tenant_id() == "tenant_B"
            finally:
                reset_tenant_context(token2)
            
            # Should be back to tenant_A
            assert get_current_tenant_id() == "tenant_A"
        finally:
            reset_tenant_context(token1)
    
    def test_token_reset_after_exception(self):
        """Context should be properly reset even after exception."""
        token = set_tenant_context("tenant_123")
        
        try:
            assert get_current_tenant_id() == "tenant_123"
            raise ValueError("Test exception")
        except ValueError:
            pass
        finally:
            reset_tenant_context(token)
        
        # Context should be reset (to default None or previous value)
        # Note: After reset, it goes back to the previous value (None in this case)
        assert get_current_tenant_id() is None
    
    def test_nested_context_isolation(self):
        """Nested contexts should be properly isolated."""
        results = []
        
        token1 = set_tenant_context("outer")
        try:
            results.append(("outer_start", get_current_tenant_id()))
            
            token2 = set_tenant_context("inner")
            try:
                results.append(("inner", get_current_tenant_id()))
            finally:
                reset_tenant_context(token2)
            
            results.append(("outer_end", get_current_tenant_id()))
        finally:
            reset_tenant_context(token1)
        
        assert results == [
            ("outer_start", "outer"),
            ("inner", "inner"),
            ("outer_end", "outer")
        ]


class TestBackgroundTaskDecorator:
    """Tests for @tenant_task decorator."""
    
    def test_tenant_task_sets_context(self):
        """@tenant_task should set tenant context before execution."""
        captured_tenant = None
        
        @tenant_task
        def capture_tenant(*, tenant_id: str):
            nonlocal captured_tenant
            captured_tenant = get_current_tenant_id()
            return captured_tenant
        
        result = capture_tenant(tenant_id="tenant_456")
        
        assert result == "tenant_456"
        assert captured_tenant == "tenant_456"
    
    def test_tenant_task_resets_context_after_success(self):
        """@tenant_task should reset context after successful execution."""
        @tenant_task
        def simple_task(*, tenant_id: str):
            return get_current_tenant_id()
        
        # Ensure no context before
        assert get_current_tenant_id() is None
        
        result = simple_task(tenant_id="tenant_789")
        
        # Context should be reset after
        assert get_current_tenant_id() is None
        assert result == "tenant_789"
    
    def test_tenant_task_resets_context_after_exception(self):
        """@tenant_task should reset context even after exception."""
        @tenant_task
        def failing_task(*, tenant_id: str):
            raise RuntimeError("Task failed")
        
        assert get_current_tenant_id() is None
        
        with pytest.raises(RuntimeError, match="Task failed"):
            failing_task(tenant_id="tenant_error")
        
        # Context should still be reset
        assert get_current_tenant_id() is None
    
    def test_tenant_task_rejects_positional_args(self):
        """@tenant_task should reject positional arguments."""
        @tenant_task
        def task_with_args(*, tenant_id: str, data: str):
            return data
        
        with pytest.raises(TenantContextError, match="keyword-only"):
            task_with_args("positional_arg", tenant_id="t1", data="test")
    
    def test_tenant_task_requires_tenant_id(self):
        """@tenant_task should require tenant_id parameter."""
        @tenant_task
        def task_without_tenant(*, tenant_id: str):
            return "done"
        
        with pytest.raises(TenantContextError, match="tenant_id is required"):
            task_without_tenant()
    
    def test_tenant_task_rejects_none_tenant_id(self):
        """@tenant_task should reject None tenant_id."""
        @tenant_task
        def task_with_none(*, tenant_id: str):
            return "done"
        
        with pytest.raises(TenantContextError, match="tenant_id is required"):
            task_with_none(tenant_id=None)


class TestAsyncBackgroundTaskDecorator:
    """Tests for @tenant_task_async decorator."""
    
    @pytest.mark.asyncio
    async def test_tenant_task_async_sets_context(self):
        """@tenant_task_async should set tenant context."""
        captured_tenant = None
        
        @tenant_task_async
        async def async_capture(*, tenant_id: str):
            nonlocal captured_tenant
            captured_tenant = get_current_tenant_id()
            await asyncio.sleep(0.01)  # Simulate async work
            return captured_tenant
        
        result = await async_capture(tenant_id="async_tenant")
        
        assert result == "async_tenant"
        assert captured_tenant == "async_tenant"
    
    @pytest.mark.asyncio
    async def test_tenant_task_async_resets_after_exception(self):
        """@tenant_task_async should reset context after exception."""
        @tenant_task_async
        async def async_failing(*, tenant_id: str):
            await asyncio.sleep(0.01)
            raise RuntimeError("Async failed")
        
        assert get_current_tenant_id() is None
        
        with pytest.raises(RuntimeError, match="Async failed"):
            await async_failing(tenant_id="async_error")
        
        assert get_current_tenant_id() is None
    
    @pytest.mark.asyncio
    async def test_tenant_task_async_rejects_positional(self):
        """@tenant_task_async should reject positional arguments."""
        @tenant_task_async
        async def async_task(*, tenant_id: str):
            return "done"
        
        with pytest.raises(TenantContextError, match="keyword-only"):
            await async_task("positional", tenant_id="t1")


class TestGatherWithTenantContext:
    """Tests for gather_with_tenant_context utility."""
    
    @pytest.mark.asyncio
    async def test_gather_propagates_context(self):
        """gather_with_tenant_context should propagate context to all tasks."""
        results = []
        
        async def capture_task(task_id: int):
            tenant = get_current_tenant_id()
            results.append((task_id, tenant))
            return tenant
        
        # Set context first
        token = set_tenant_context("gather_tenant")
        try:
            gathered = await gather_with_tenant_context(
                capture_task(1),
                capture_task(2),
                capture_task(3)
            )
        finally:
            reset_tenant_context(token)
        
        # All tasks should have seen the same tenant
        assert all(r == "gather_tenant" for r in gathered)
        assert all(t == "gather_tenant" for _, t in results)
    
    @pytest.mark.asyncio
    async def test_gather_requires_context(self):
        """gather_with_tenant_context should require tenant context."""
        async def dummy_task():
            return "done"
        
        # Ensure no context
        assert get_current_tenant_id() is None
        
        with pytest.raises(TenantContextMissingError, match="requires tenant context"):
            await gather_with_tenant_context(dummy_task())
    
    @pytest.mark.asyncio
    async def test_gather_handles_exceptions(self):
        """gather_with_tenant_context should handle exceptions properly."""
        async def failing_task():
            raise ValueError("Task error")
        
        async def success_task():
            return "success"
        
        token = set_tenant_context("exception_tenant")
        try:
            results = await gather_with_tenant_context(
                success_task(),
                failing_task(),
                return_exceptions=True
            )
        finally:
            reset_tenant_context(token)
        
        assert results[0] == "success"
        assert isinstance(results[1], ValueError)


class TestUnboundSession:
    """Tests for unbound_session context manager."""
    
    def test_unbound_session_requires_reason(self):
        """unbound_session should require a reason parameter."""
        with pytest.raises(UnboundSessionAuditError, match="reason"):
            with unbound_session(reason=""):
                pass
    
    def test_unbound_session_with_reason(self):
        """unbound_session should work with valid reason."""
        with unbound_session(reason="test-admin-report"):
            # Should not raise
            pass
    
    def test_unbound_session_logs_entry_exit(self):
        """unbound_session should log entry and exit."""
        with patch('core.database.logger') as mock_logger:
            with unbound_session(reason="audit-test"):
                pass
            
            # Check that info was logged
            assert mock_logger.info.call_count >= 2


class TestRunInTenantContext:
    """Tests for run_in_tenant_context utility."""
    
    def test_run_in_tenant_context_sets_and_resets(self):
        """run_in_tenant_context should set and reset context."""
        def capture_tenant():
            return get_current_tenant_id()
        
        assert get_current_tenant_id() is None
        
        result = run_in_tenant_context("utility_tenant", capture_tenant)
        
        assert result == "utility_tenant"
        assert get_current_tenant_id() is None
    
    @pytest.mark.asyncio
    async def test_run_in_tenant_context_async(self):
        """run_in_tenant_context_async should work for async functions."""
        async def async_capture():
            await asyncio.sleep(0.01)
            return get_current_tenant_id()
        
        assert get_current_tenant_id() is None
        
        result = await run_in_tenant_context_async("async_utility", async_capture)
        
        assert result == "async_utility"
        assert get_current_tenant_id() is None


class TestRequestToBackgroundTaskFlow:
    """Integration tests for request → background task → query flow."""
    
    def test_request_context_to_background_task(self):
        """Simulate request setting context, then background task using it."""
        # Simulate request middleware setting context
        request_token = set_tenant_context("request_tenant")
        
        try:
            # Capture current tenant (as request handler would)
            current_tenant = get_current_tenant_id()
            assert current_tenant == "request_tenant"
            
            # Simulate spawning background task with explicit tenant_id
            task_results = []
            
            @tenant_task
            def background_work(*, tenant_id: str, data: str):
                task_tenant = get_current_tenant_id()
                task_results.append(task_tenant)
                return f"processed_{data}"
            
            # Background task should use the same tenant
            result = background_work(tenant_id=current_tenant, data="item1")
            
            assert result == "processed_item1"
            assert task_results[0] == "request_tenant"
            
        finally:
            # Simulate middleware cleanup
            reset_tenant_context(request_token)
        
        # After request, context should be clean
        assert get_current_tenant_id() is None
    
    @pytest.mark.asyncio
    async def test_concurrent_requests_isolation(self):
        """Concurrent requests should have isolated tenant contexts."""
        results = {}
        
        async def simulate_request(tenant_id: str, request_id: str):
            token = set_tenant_context(tenant_id)
            try:
                # Simulate some async work
                await asyncio.sleep(0.01)
                captured = get_current_tenant_id()
                results[request_id] = captured
                return captured
            finally:
                reset_tenant_context(token)
        
        # Run concurrent "requests"
        await asyncio.gather(
            simulate_request("tenant_A", "req_1"),
            simulate_request("tenant_B", "req_2"),
            simulate_request("tenant_C", "req_3"),
        )
        
        # Each request should have seen its own tenant
        assert results["req_1"] == "tenant_A"
        assert results["req_2"] == "tenant_B"
        assert results["req_3"] == "tenant_C"
