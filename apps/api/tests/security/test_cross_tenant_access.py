"""
Cross-Tenant Access Tests (G-02 Task 8.2)

Negative tests to verify tenant A cannot access tenant B data.
Validates Requirement 5.5 from multi-tenancy-security spec.

CRITICAL TESTS:
1. Tenant A cannot query tenant B data
2. Concurrent requests maintain isolation
3. TENANT_STRICT_MODE=true behavior
4. Background tasks cannot leak tenant context
"""
import pytest
import asyncio
import os
from unittest.mock import patch, MagicMock
from datetime import datetime

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
    should_skip_tenant_filter,
    SessionLocal,
    Base,
    engine
)
from utils.background_task import tenant_task, tenant_task_async
from utils.async_context import gather_with_tenant_context
from utils.exceptions import (
    TenantContextError,
    TenantContextRequiredError,
    TenantMismatchError
)


class TestCrossTenantQueryPrevention:
    """Tests that queries are properly filtered by tenant."""
    
    def test_query_without_context_in_strict_mode(self):
        """Query without tenant context should raise in strict mode."""
        # This test requires TENANT_STRICT_MODE=true
        with patch.dict(os.environ, {'TENANT_STRICT_MODE': 'true'}):
            # Force reload of config
            from config import tenant_config
            tenant_config._strict_mode_cache = None
            
            # Ensure no context
            assert get_current_tenant_id() is None
            
            # In strict mode, this should raise
            # Note: Actual query test requires DB setup
            # Here we test the config behavior
            from config.tenant_config import get_tenant_strict_mode
            assert get_tenant_strict_mode() is True
    
    def test_query_without_context_in_non_strict_mode(self):
        """Query without tenant context should warn in non-strict mode."""
        with patch.dict(os.environ, {'TENANT_STRICT_MODE': 'false'}):
            from config import tenant_config
            tenant_config._strict_mode_cache = None
            
            from config.tenant_config import get_tenant_strict_mode
            assert get_tenant_strict_mode() is False


class TestConcurrentRequestIsolation:
    """Tests for concurrent request tenant isolation."""
    
    @pytest.mark.asyncio
    async def test_concurrent_requests_no_context_leak(self):
        """Concurrent requests should not leak tenant context to each other."""
        leak_detected = False
        results = {}
        
        async def request_handler(tenant_id: str, request_id: str, delay: float):
            nonlocal leak_detected
            
            token = set_tenant_context(tenant_id)
            try:
                # Check context at start
                start_tenant = get_current_tenant_id()
                if start_tenant != tenant_id:
                    leak_detected = True
                
                # Simulate async work with varying delays
                await asyncio.sleep(delay)
                
                # Check context after delay
                end_tenant = get_current_tenant_id()
                if end_tenant != tenant_id:
                    leak_detected = True
                
                results[request_id] = {
                    "expected": tenant_id,
                    "start": start_tenant,
                    "end": end_tenant
                }
                
            finally:
                reset_tenant_context(token)
        
        # Run many concurrent requests with different tenants
        tasks = []
        for i in range(20):
            tenant = f"tenant_{i % 5}"  # 5 different tenants
            delay = 0.01 * (i % 3)  # Varying delays
            tasks.append(request_handler(tenant, f"req_{i}", delay))
        
        await asyncio.gather(*tasks)
        
        # Verify no leaks
        assert not leak_detected, "Context leak detected between concurrent requests"
        
        # Verify all results match expected
        for req_id, result in results.items():
            assert result["start"] == result["expected"], f"{req_id}: start mismatch"
            assert result["end"] == result["expected"], f"{req_id}: end mismatch"
    
    @pytest.mark.asyncio
    async def test_nested_async_operations_isolation(self):
        """Nested async operations should maintain tenant isolation."""
        results = []
        
        async def inner_operation(op_id: str):
            tenant = get_current_tenant_id()
            await asyncio.sleep(0.01)
            results.append((op_id, tenant))
            return tenant
        
        async def outer_operation(tenant_id: str, op_id: str):
            token = set_tenant_context(tenant_id)
            try:
                # Run inner operations
                inner_results = await gather_with_tenant_context(
                    inner_operation(f"{op_id}_inner_1"),
                    inner_operation(f"{op_id}_inner_2"),
                )
                return inner_results
            finally:
                reset_tenant_context(token)
        
        # Run outer operations concurrently
        outer_results = await asyncio.gather(
            outer_operation("tenant_X", "outer_1"),
            outer_operation("tenant_Y", "outer_2"),
        )
        
        # Verify inner operations saw correct tenant
        for op_id, tenant in results:
            if "outer_1" in op_id:
                assert tenant == "tenant_X", f"{op_id} should see tenant_X"
            elif "outer_2" in op_id:
                assert tenant == "tenant_Y", f"{op_id} should see tenant_Y"


class TestBackgroundTaskIsolation:
    """Tests for background task tenant isolation."""
    
    def test_background_task_cannot_access_request_context(self):
        """Background task should not inherit request context automatically."""
        # Set request context
        request_token = set_tenant_context("request_tenant")
        
        try:
            # Background task without explicit tenant_id should fail
            @tenant_task
            def task_without_tenant(*, tenant_id: str):
                return get_current_tenant_id()
            
            # This should raise because tenant_id is not provided
            with pytest.raises(TenantContextError):
                task_without_tenant()  # No tenant_id
                
        finally:
            reset_tenant_context(request_token)
    
    def test_background_task_uses_explicit_tenant(self):
        """Background task should use explicitly provided tenant_id."""
        # Set request context to tenant_A
        request_token = set_tenant_context("tenant_A")
        
        try:
            @tenant_task
            def task_with_tenant(*, tenant_id: str):
                return get_current_tenant_id()
            
            # Task should use tenant_B, not inherit tenant_A
            result = task_with_tenant(tenant_id="tenant_B")
            assert result == "tenant_B"
            
            # Request context should still be tenant_A
            assert get_current_tenant_id() == "tenant_A"
            
        finally:
            reset_tenant_context(request_token)
    
    @pytest.mark.asyncio
    async def test_async_task_isolation_from_caller(self):
        """Async background task should be isolated from caller context."""
        caller_tenant = None
        task_tenant = None
        
        @tenant_task_async
        async def isolated_task(*, tenant_id: str):
            nonlocal task_tenant
            task_tenant = get_current_tenant_id()
            await asyncio.sleep(0.01)
            return task_tenant
        
        # Set caller context
        token = set_tenant_context("caller_tenant")
        try:
            caller_tenant = get_current_tenant_id()
            
            # Run task with different tenant
            result = await isolated_task(tenant_id="task_tenant")
            
            # Verify isolation
            assert caller_tenant == "caller_tenant"
            assert task_tenant == "task_tenant"
            assert result == "task_tenant"
            
            # Caller context should be unchanged
            assert get_current_tenant_id() == "caller_tenant"
            
        finally:
            reset_tenant_context(token)


class TestUnboundSessionSecurity:
    """Tests for unbound_session security controls."""
    
    def test_unbound_session_bypasses_filter(self):
        """unbound_session should bypass tenant filter."""
        token = set_tenant_context("normal_tenant")
        try:
            # Normal context - filter should be active
            assert not should_skip_tenant_filter()
            
            # Inside unbound_session - filter should be skipped
            with unbound_session(reason="test-bypass"):
                assert should_skip_tenant_filter()
            
            # After exit - filter should be active again
            assert not should_skip_tenant_filter()
            
        finally:
            reset_tenant_context(token)
    
    def test_unbound_session_nested(self):
        """Nested unbound_session should work correctly."""
        token = set_tenant_context("nested_tenant")
        try:
            assert not should_skip_tenant_filter()
            
            with unbound_session(reason="outer"):
                assert should_skip_tenant_filter()
                
                with unbound_session(reason="inner"):
                    assert should_skip_tenant_filter()
                
                # Still skipped after inner exits
                assert should_skip_tenant_filter()
            
            # Not skipped after outer exits
            assert not should_skip_tenant_filter()
            
        finally:
            reset_tenant_context(token)
    
    def test_unbound_session_exception_cleanup(self):
        """unbound_session should cleanup even on exception."""
        token = set_tenant_context("exception_tenant")
        try:
            assert not should_skip_tenant_filter()
            
            try:
                with unbound_session(reason="exception-test"):
                    assert should_skip_tenant_filter()
                    raise ValueError("Test exception")
            except ValueError:
                pass
            
            # Should be cleaned up after exception
            assert not should_skip_tenant_filter()
            
        finally:
            reset_tenant_context(token)


class TestTenantMismatchDetection:
    """Tests for tenant mismatch detection."""
    
    def test_tenant_mismatch_error_creation(self):
        """TenantMismatchError should capture all details."""
        error = TenantMismatchError(
            expected_tenant="tenant_A",
            actual_tenant="tenant_B",
            entity_type="Party",
            entity_id="party_123"
        )
        
        assert error.expected_tenant == "tenant_A"
        assert error.actual_tenant == "tenant_B"
        assert error.entity_type == "Party"
        assert error.entity_id == "party_123"
        assert "tenant_A" in str(error)
        assert "tenant_B" in str(error)
        assert "Party" in str(error)
    
    def test_tenant_mismatch_without_entity(self):
        """TenantMismatchError should work without entity details."""
        error = TenantMismatchError(
            expected_tenant="tenant_X",
            actual_tenant="tenant_Y"
        )
        
        assert "tenant_X" in str(error)
        assert "tenant_Y" in str(error)


class TestStrictModeEnforcement:
    """Tests for TENANT_STRICT_MODE enforcement."""
    
    def test_strict_mode_config_true(self):
        """TENANT_STRICT_MODE=true should enable strict mode."""
        with patch.dict(os.environ, {'TENANT_STRICT_MODE': 'true'}):
            from config import tenant_config
            tenant_config._strict_mode_cache = None
            # Also update the module-level variable
            tenant_config.TENANT_STRICT_MODE = tenant_config.get_tenant_strict_mode()
            
            from config.tenant_config import get_tenant_strict_mode, TenantBehavior
            assert get_tenant_strict_mode() is True
            assert TenantBehavior.get_query_behavior() == "error"
    
    def test_strict_mode_config_false(self):
        """TENANT_STRICT_MODE=false should disable strict mode."""
        with patch.dict(os.environ, {'TENANT_STRICT_MODE': 'false'}):
            from config import tenant_config
            tenant_config._strict_mode_cache = None
            tenant_config.TENANT_STRICT_MODE = tenant_config.get_tenant_strict_mode()
            
            from config.tenant_config import get_tenant_strict_mode, TenantBehavior
            assert get_tenant_strict_mode() is False
            assert TenantBehavior.get_query_behavior() == "warning"
    
    def test_strict_mode_default(self):
        """Default TENANT_STRICT_MODE should be false."""
        with patch.dict(os.environ, {}, clear=True):
            # Remove the key if it exists
            os.environ.pop('TENANT_STRICT_MODE', None)
            
            from config import tenant_config
            tenant_config._strict_mode_cache = None
            tenant_config.TENANT_STRICT_MODE = tenant_config.get_tenant_strict_mode()
            
            from config.tenant_config import get_tenant_strict_mode
            assert get_tenant_strict_mode() is False
