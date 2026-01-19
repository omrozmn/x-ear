"""
Context Cleanup Tests (G-02 Task 8.3)

Tests for token-based cleanup after normal completion and various exception types.
Validates Requirements 5.1, 5.2 from multi-tenancy-security spec.

CRITICAL TESTS:
1. Token-based cleanup after normal completion
2. Token-based cleanup after various exception types
3. Nested context cleanup
4. Middleware cleanup simulation
"""
import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from contextlib import contextmanager

# Configure pytest-asyncio
pytestmark = pytest.mark.asyncio(loop_scope="function")

import sys
from pathlib import Path
_api_dir = Path(__file__).resolve().parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

from core.database import (
    set_tenant_context,
    reset_tenant_context,
    get_current_tenant_id,
    unbound_session,
    TenantContextToken
)
from utils.background_task import tenant_task, tenant_task_async
from utils.async_context import (
    gather_with_tenant_context,
    create_task_with_tenant_context,
    TenantContextTaskGroup
)
from utils.exceptions import TenantContextMissingError


class TestNormalCompletionCleanup:
    """Tests for context cleanup after normal completion."""
    
    def test_simple_context_cleanup(self):
        """Simple set/reset should clean up properly."""
        assert get_current_tenant_id() is None
        
        token = set_tenant_context("cleanup_test")
        assert get_current_tenant_id() == "cleanup_test"
        
        reset_tenant_context(token)
        assert get_current_tenant_id() is None
    
    def test_function_context_cleanup(self):
        """Function using context should clean up after return."""
        def process_with_context(tenant_id: str) -> str:
            token = set_tenant_context(tenant_id)
            try:
                return f"processed_{get_current_tenant_id()}"
            finally:
                reset_tenant_context(token)
        
        assert get_current_tenant_id() is None
        result = process_with_context("func_tenant")
        assert result == "processed_func_tenant"
        assert get_current_tenant_id() is None
    
    @pytest.mark.asyncio
    async def test_async_function_cleanup(self):
        """Async function should clean up after completion."""
        async def async_process(tenant_id: str) -> str:
            token = set_tenant_context(tenant_id)
            try:
                await asyncio.sleep(0.01)
                return get_current_tenant_id()
            finally:
                reset_tenant_context(token)
        
        assert get_current_tenant_id() is None
        result = await async_process("async_tenant")
        assert result == "async_tenant"
        assert get_current_tenant_id() is None
    
    def test_decorator_cleanup(self):
        """@tenant_task decorator should clean up after completion."""
        @tenant_task
        def decorated_task(*, tenant_id: str, data: str):
            return f"{get_current_tenant_id()}_{data}"
        
        assert get_current_tenant_id() is None
        result = decorated_task(tenant_id="decorated", data="test")
        assert result == "decorated_test"
        assert get_current_tenant_id() is None


class TestExceptionCleanup:
    """Tests for context cleanup after various exception types."""
    
    def test_cleanup_after_value_error(self):
        """Context should clean up after ValueError."""
        token = set_tenant_context("value_error_tenant")
        
        try:
            raise ValueError("Test value error")
        except ValueError:
            pass
        finally:
            reset_tenant_context(token)
        
        assert get_current_tenant_id() is None
    
    def test_cleanup_after_runtime_error(self):
        """Context should clean up after RuntimeError."""
        token = set_tenant_context("runtime_error_tenant")
        
        try:
            raise RuntimeError("Test runtime error")
        except RuntimeError:
            pass
        finally:
            reset_tenant_context(token)
        
        assert get_current_tenant_id() is None
    
    def test_cleanup_after_type_error(self):
        """Context should clean up after TypeError."""
        token = set_tenant_context("type_error_tenant")
        
        try:
            raise TypeError("Test type error")
        except TypeError:
            pass
        finally:
            reset_tenant_context(token)
        
        assert get_current_tenant_id() is None
    
    def test_cleanup_after_key_error(self):
        """Context should clean up after KeyError."""
        token = set_tenant_context("key_error_tenant")
        
        try:
            d = {}
            _ = d["nonexistent"]
        except KeyError:
            pass
        finally:
            reset_tenant_context(token)
        
        assert get_current_tenant_id() is None
    
    def test_cleanup_after_attribute_error(self):
        """Context should clean up after AttributeError."""
        token = set_tenant_context("attr_error_tenant")
        
        try:
            obj = None
            _ = obj.nonexistent
        except AttributeError:
            pass
        finally:
            reset_tenant_context(token)
        
        assert get_current_tenant_id() is None
    
    @pytest.mark.asyncio
    async def test_cleanup_after_async_exception(self):
        """Context should clean up after async exception."""
        token = set_tenant_context("async_error_tenant")
        
        try:
            await asyncio.sleep(0.01)
            raise RuntimeError("Async error")
        except RuntimeError:
            pass
        finally:
            reset_tenant_context(token)
        
        assert get_current_tenant_id() is None
    
    def test_decorator_cleanup_after_exception(self):
        """@tenant_task should clean up after exception."""
        @tenant_task
        def failing_decorated(*, tenant_id: str):
            raise ValueError("Decorated failure")
        
        assert get_current_tenant_id() is None
        
        with pytest.raises(ValueError):
            failing_decorated(tenant_id="failing_tenant")
        
        assert get_current_tenant_id() is None
    
    @pytest.mark.asyncio
    async def test_async_decorator_cleanup_after_exception(self):
        """@tenant_task_async should clean up after exception."""
        @tenant_task_async
        async def async_failing(*, tenant_id: str):
            await asyncio.sleep(0.01)
            raise RuntimeError("Async decorated failure")
        
        assert get_current_tenant_id() is None
        
        with pytest.raises(RuntimeError):
            await async_failing(tenant_id="async_failing")
        
        assert get_current_tenant_id() is None


class TestNestedContextCleanup:
    """Tests for nested context cleanup scenarios."""
    
    def test_nested_context_proper_unwinding(self):
        """Nested contexts should unwind in correct order."""
        contexts = []
        
        token1 = set_tenant_context("level_1")
        contexts.append(("enter_1", get_current_tenant_id()))
        
        try:
            token2 = set_tenant_context("level_2")
            contexts.append(("enter_2", get_current_tenant_id()))
            
            try:
                token3 = set_tenant_context("level_3")
                contexts.append(("enter_3", get_current_tenant_id()))
            finally:
                reset_tenant_context(token3)
                contexts.append(("exit_3", get_current_tenant_id()))
        finally:
            reset_tenant_context(token2)
            contexts.append(("exit_2", get_current_tenant_id()))
        
        reset_tenant_context(token1)
        contexts.append(("exit_1", get_current_tenant_id()))
        
        expected = [
            ("enter_1", "level_1"),
            ("enter_2", "level_2"),
            ("enter_3", "level_3"),
            ("exit_3", "level_2"),
            ("exit_2", "level_1"),
            ("exit_1", None),
        ]
        assert contexts == expected
    
    def test_nested_context_with_exception_in_middle(self):
        """Exception in middle level should still clean up all levels."""
        token1 = set_tenant_context("outer")
        
        try:
            token2 = set_tenant_context("middle")
            try:
                token3 = set_tenant_context("inner")
                try:
                    # Exception in middle level
                    raise ValueError("Middle exception")
                finally:
                    reset_tenant_context(token3)
            except ValueError:
                pass
            finally:
                reset_tenant_context(token2)
        finally:
            reset_tenant_context(token1)
        
        assert get_current_tenant_id() is None
    
    def test_nested_unbound_session_cleanup(self):
        """Nested unbound_session should clean up properly."""
        token = set_tenant_context("nested_unbound")
        
        try:
            with unbound_session(reason="outer_unbound"):
                with unbound_session(reason="inner_unbound"):
                    pass
                # Inner cleaned up
            # Outer cleaned up
        finally:
            reset_tenant_context(token)
        
        assert get_current_tenant_id() is None


class TestMiddlewareCleanupSimulation:
    """Tests simulating middleware cleanup behavior."""
    
    @pytest.mark.asyncio
    async def test_middleware_cleanup_on_success(self):
        """Simulate middleware cleanup on successful request."""
        cleanup_called = False
        
        async def simulate_middleware(tenant_id: str):
            nonlocal cleanup_called
            token = set_tenant_context(tenant_id)
            try:
                # Simulate request processing
                await asyncio.sleep(0.01)
                return {"status": "success"}
            finally:
                reset_tenant_context(token)
                cleanup_called = True
        
        result = await simulate_middleware("middleware_tenant")
        
        assert result["status"] == "success"
        assert cleanup_called
        assert get_current_tenant_id() is None
    
    @pytest.mark.asyncio
    async def test_middleware_cleanup_on_error(self):
        """Simulate middleware cleanup on request error."""
        cleanup_called = False
        
        async def simulate_middleware_error(tenant_id: str):
            nonlocal cleanup_called
            token = set_tenant_context(tenant_id)
            try:
                await asyncio.sleep(0.01)
                raise RuntimeError("Request failed")
            finally:
                reset_tenant_context(token)
                cleanup_called = True
        
        with pytest.raises(RuntimeError):
            await simulate_middleware_error("error_tenant")
        
        assert cleanup_called
        assert get_current_tenant_id() is None
    
    @pytest.mark.asyncio
    async def test_middleware_cleanup_on_timeout(self):
        """Simulate middleware cleanup on request timeout."""
        cleanup_called = False
        
        async def simulate_middleware_timeout(tenant_id: str):
            nonlocal cleanup_called
            token = set_tenant_context(tenant_id)
            try:
                await asyncio.wait_for(asyncio.sleep(10), timeout=0.01)
            except asyncio.TimeoutError:
                raise
            finally:
                reset_tenant_context(token)
                cleanup_called = True
        
        with pytest.raises(asyncio.TimeoutError):
            await simulate_middleware_timeout("timeout_tenant")
        
        assert cleanup_called
        assert get_current_tenant_id() is None
    
    @pytest.mark.asyncio
    async def test_middleware_cleanup_on_cancellation(self):
        """Simulate middleware cleanup on request cancellation."""
        cleanup_called = False
        
        async def simulate_middleware_cancel(tenant_id: str):
            nonlocal cleanup_called
            token = set_tenant_context(tenant_id)
            try:
                await asyncio.sleep(10)  # Long sleep
            except asyncio.CancelledError:
                raise
            finally:
                reset_tenant_context(token)
                cleanup_called = True
        
        task = asyncio.create_task(simulate_middleware_cancel("cancel_tenant"))
        await asyncio.sleep(0.01)  # Let task start
        task.cancel()
        
        with pytest.raises(asyncio.CancelledError):
            await task
        
        assert cleanup_called
        assert get_current_tenant_id() is None


class TestGatherCleanup:
    """Tests for gather_with_tenant_context cleanup."""
    
    @pytest.mark.asyncio
    async def test_gather_cleanup_on_success(self):
        """gather_with_tenant_context should clean up after success."""
        async def simple_task(task_id: int):
            await asyncio.sleep(0.01)
            return task_id
        
        token = set_tenant_context("gather_success")
        try:
            results = await gather_with_tenant_context(
                simple_task(1),
                simple_task(2),
                simple_task(3)
            )
            assert results == [1, 2, 3]
        finally:
            reset_tenant_context(token)
        
        assert get_current_tenant_id() is None
    
    @pytest.mark.asyncio
    async def test_gather_cleanup_on_partial_failure(self):
        """gather_with_tenant_context should clean up on partial failure."""
        async def maybe_fail(task_id: int, should_fail: bool):
            await asyncio.sleep(0.01)
            if should_fail:
                raise ValueError(f"Task {task_id} failed")
            return task_id
        
        token = set_tenant_context("gather_partial")
        try:
            results = await gather_with_tenant_context(
                maybe_fail(1, False),
                maybe_fail(2, True),
                maybe_fail(3, False),
                return_exceptions=True
            )
            
            assert results[0] == 1
            assert isinstance(results[1], ValueError)
            assert results[2] == 3
        finally:
            reset_tenant_context(token)
        
        assert get_current_tenant_id() is None


class TestTaskGroupCleanup:
    """Tests for TenantContextTaskGroup cleanup."""
    
    @pytest.mark.asyncio
    async def test_task_group_cleanup_on_success(self):
        """TenantContextTaskGroup should clean up after success."""
        results = []
        
        async def capture_task(task_id: int):
            tenant = get_current_tenant_id()
            results.append((task_id, tenant))
            return task_id
        
        token = set_tenant_context("task_group_success")
        try:
            async with TenantContextTaskGroup() as tg:
                tg.create_task(capture_task(1))
                tg.create_task(capture_task(2))
        finally:
            reset_tenant_context(token)
        
        assert len(results) == 2
        assert all(t == "task_group_success" for _, t in results)
        assert get_current_tenant_id() is None
    
    @pytest.mark.asyncio
    async def test_task_group_requires_context(self):
        """TenantContextTaskGroup should require tenant context."""
        assert get_current_tenant_id() is None
        
        with pytest.raises(TenantContextMissingError):
            async with TenantContextTaskGroup() as tg:
                pass
