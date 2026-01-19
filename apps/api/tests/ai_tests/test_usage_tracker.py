"""
Property-based tests for Usage Tracker.

**Property 23: Atomic Usage Counter Updates**
**Validates: Requirements 29.1, 29.2, 29.3**

Requirements:
- 29.1: Update usage counters atomically (UPSERT with atomic increment)
- 29.2: NOT use read-modify-write patterns for usage updates
- 29.3: Reflect correct total under concurrent requests
"""

import pytest
from hypothesis import given, strategies as st, settings
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Barrier
import time

from ai.services.usage_tracker import (
    UsageTracker,
    UsageRecord,
    UsageSummary,
    get_usage_tracker,
    reset_usage_tracker,
    track_usage,
    check_and_track_usage,
)
from ai.models.ai_usage import UsageType
from ai.config import AIQuotaExceededError, AIConfig


@pytest.fixture(autouse=True)
def reset_tracker():
    """Reset usage tracker before each test."""
    reset_usage_tracker()
    AIConfig.reset()
    yield
    reset_usage_tracker()
    AIConfig.reset()


class TestUsageTrackerBasic:
    """Basic unit tests for usage tracker."""
    
    def test_increment_usage_creates_record(self):
        """Incrementing usage should create a record."""
        tracker = UsageTracker()
        tenant_id = str(uuid4())
        
        record = tracker.increment_usage(
            tenant_id=tenant_id,
            usage_type=UsageType.CHAT,
            request_count=1,
            tokens_input=100,
            tokens_output=50,
        )
        
        assert record.tenant_id == tenant_id
        assert record.usage_type == UsageType.CHAT
        assert record.request_count == 1
        assert record.token_count_input == 100
        assert record.token_count_output == 50
    
    def test_increment_usage_accumulates(self):
        """Multiple increments should accumulate."""
        tracker = UsageTracker()
        tenant_id = str(uuid4())
        
        tracker.increment_usage(tenant_id, UsageType.CHAT, 1, 100, 50)
        tracker.increment_usage(tenant_id, UsageType.CHAT, 1, 200, 100)
        record = tracker.increment_usage(tenant_id, UsageType.CHAT, 1, 150, 75)
        
        assert record.request_count == 3
        assert record.token_count_input == 450
        assert record.token_count_output == 225
    
    def test_different_types_tracked_separately(self):
        """Different usage types should be tracked separately."""
        tracker = UsageTracker()
        tenant_id = str(uuid4())
        
        tracker.increment_usage(tenant_id, UsageType.CHAT, 5, 500, 250)
        tracker.increment_usage(tenant_id, UsageType.EXECUTION, 2, 200, 100)
        
        chat_record = tracker.get_usage(tenant_id, UsageType.CHAT)
        exec_record = tracker.get_usage(tenant_id, UsageType.EXECUTION)
        
        assert chat_record.request_count == 5
        assert exec_record.request_count == 2
    
    def test_quota_enforcement(self):
        """Quota should be enforced when set."""
        tracker = UsageTracker()
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.CHAT, limit=3)
        
        # First 3 should succeed
        tracker.acquire_quota(tenant_id, UsageType.CHAT)
        tracker.acquire_quota(tenant_id, UsageType.CHAT)
        tracker.acquire_quota(tenant_id, UsageType.CHAT)
        
        # Fourth should fail
        with pytest.raises(AIQuotaExceededError):
            tracker.acquire_quota(tenant_id, UsageType.CHAT)
    
    def test_no_quota_means_unlimited(self):
        """Without quota set, usage should be unlimited."""
        tracker = UsageTracker()
        tenant_id = str(uuid4())
        
        # Make many requests without quota
        for _ in range(100):
            tracker.acquire_quota(tenant_id, UsageType.CHAT)
        
        record = tracker.get_usage(tenant_id, UsageType.CHAT)
        assert record.request_count == 100
        assert record.quota_exceeded is False
    
    def test_usage_summary(self):
        """Usage summary should aggregate all types."""
        tracker = UsageTracker()
        tenant_id = str(uuid4())
        
        tracker.increment_usage(tenant_id, UsageType.CHAT, 5, 500, 250)
        tracker.increment_usage(tenant_id, UsageType.EXECUTION, 2, 200, 100)
        tracker.increment_usage(tenant_id, UsageType.ADVISORY, 3, 300, 150)
        
        summary = tracker.get_usage_summary(tenant_id)
        
        assert summary.total_requests == 10
        assert summary.total_tokens_input == 1000
        assert summary.total_tokens_output == 500
        assert len(summary.by_type) == len(UsageType)
    
    def test_check_quota_returns_correct_values(self):
        """check_quota should return correct tuple."""
        tracker = UsageTracker()
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.CHAT, limit=10)
        tracker.increment_usage(tenant_id, UsageType.CHAT, 3)
        
        has_quota, current, limit = tracker.check_quota(tenant_id, UsageType.CHAT)
        
        assert has_quota is True
        assert current == 3
        assert limit == 10


class TestUsageTrackerProperty:
    """
    Property-based tests for atomic usage updates.
    
    **Feature: ai-layer-architecture, Property 23: Atomic Usage Counter Updates**
    **Validates: Requirements 29.1, 29.2, 29.3**
    """
    
    @settings(max_examples=100)
    @given(
        tenant_id=st.uuids().map(str),
        num_increments=st.integers(min_value=1, max_value=100),
        tokens_per_request=st.integers(min_value=0, max_value=1000),
    )
    def test_sequential_increments_accumulate_correctly(
        self,
        tenant_id: str,
        num_increments: int,
        tokens_per_request: int,
    ):
        """
        Property: Sequential increments accumulate correctly.
        
        For any sequence of increments, the final count should equal
        the sum of all increments.
        
        **Validates: Requirements 29.1**
        """
        reset_usage_tracker()
        tracker = UsageTracker()
        
        expected_requests = 0
        expected_input = 0
        expected_output = 0
        
        for _ in range(num_increments):
            tracker.increment_usage(
                tenant_id=tenant_id,
                usage_type=UsageType.CHAT,
                request_count=1,
                tokens_input=tokens_per_request,
                tokens_output=tokens_per_request // 2,
            )
            expected_requests += 1
            expected_input += tokens_per_request
            expected_output += tokens_per_request // 2
        
        record = tracker.get_usage(tenant_id, UsageType.CHAT)
        
        assert record.request_count == expected_requests
        assert record.token_count_input == expected_input
        assert record.token_count_output == expected_output
    
    @settings(max_examples=100)
    @given(
        concurrent_requests=st.integers(min_value=2, max_value=50),
    )
    def test_atomic_usage_updates_under_concurrency(
        self,
        concurrent_requests: int,
    ):
        """
        Property 23: Atomic Usage Counter Updates
        
        For any concurrent AI requests from the same tenant, the usage
        counter SHALL reflect the correct total; no requests SHALL bypass
        quota due to race conditions.
        
        **Validates: Requirements 29.1, 29.2, 29.3**
        """
        reset_usage_tracker()
        tracker = UsageTracker()
        tenant_id = str(uuid4())
        
        # Use a barrier to synchronize thread starts
        barrier = Barrier(concurrent_requests)
        
        def make_request():
            barrier.wait()  # Wait for all threads to be ready
            tracker.increment_usage(
                tenant_id=tenant_id,
                usage_type=UsageType.CHAT,
                request_count=1,
                tokens_input=100,
                tokens_output=50,
            )
            return True
        
        # Execute concurrent requests
        with ThreadPoolExecutor(max_workers=concurrent_requests) as executor:
            futures = [executor.submit(make_request) for _ in range(concurrent_requests)]
            results = [f.result() for f in as_completed(futures)]
        
        # All requests should succeed
        assert all(results)
        
        # Counter should exactly match the number of requests
        record = tracker.get_usage(tenant_id, UsageType.CHAT)
        assert record.request_count == concurrent_requests, (
            f"Expected {concurrent_requests} requests, got {record.request_count}"
        )
        assert record.token_count_input == concurrent_requests * 100
        assert record.token_count_output == concurrent_requests * 50
    
    @settings(max_examples=100)
    @given(
        quota_limit=st.integers(min_value=5, max_value=50),
        concurrent_requests=st.integers(min_value=10, max_value=100),
    )
    def test_quota_enforcement_under_concurrency(
        self,
        quota_limit: int,
        concurrent_requests: int,
    ):
        """
        Property: Quota is enforced correctly under concurrent load.
        
        When multiple concurrent requests compete for quota, the total
        successful requests should not exceed the quota limit.
        
        **Validates: Requirements 29.1, 29.2, 29.3**
        """
        reset_usage_tracker()
        tracker = UsageTracker()
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.CHAT, limit=quota_limit)
        
        barrier = Barrier(concurrent_requests)
        
        def try_acquire():
            barrier.wait()
            try:
                tracker.acquire_quota(tenant_id, UsageType.CHAT)
                return True
            except AIQuotaExceededError:
                return False
        
        with ThreadPoolExecutor(max_workers=concurrent_requests) as executor:
            futures = [executor.submit(try_acquire) for _ in range(concurrent_requests)]
            results = [f.result() for f in as_completed(futures)]
        
        successful = sum(1 for r in results if r)
        
        # Property: successful requests should not exceed quota
        assert successful <= quota_limit, (
            f"Successful requests ({successful}) exceeded quota ({quota_limit})"
        )
        
        # Property: if we made more requests than quota, some should fail
        if concurrent_requests > quota_limit:
            failed = sum(1 for r in results if not r)
            assert failed > 0, "Expected some requests to fail due to quota"
    
    @settings(max_examples=100)
    @given(
        num_tenants=st.integers(min_value=2, max_value=5),
        requests_per_tenant=st.integers(min_value=1, max_value=20),
    )
    def test_tenant_isolation_in_usage_tracking(
        self,
        num_tenants: int,
        requests_per_tenant: int,
    ):
        """
        Property: Usage is tracked separately per tenant.
        
        Different tenants should have completely independent usage counters.
        
        **Validates: Requirements 29.1**
        """
        reset_usage_tracker()
        tracker = UsageTracker()
        
        tenants = [str(uuid4()) for _ in range(num_tenants)]
        
        # Each tenant makes requests
        for tenant_id in tenants:
            for _ in range(requests_per_tenant):
                tracker.increment_usage(tenant_id, UsageType.CHAT, 1, 100, 50)
        
        # Each tenant should have exactly their own count
        for tenant_id in tenants:
            record = tracker.get_usage(tenant_id, UsageType.CHAT)
            assert record.request_count == requests_per_tenant, (
                f"Tenant {tenant_id} should have {requests_per_tenant} requests, "
                f"got {record.request_count}"
            )
    
    @settings(max_examples=100)
    @given(
        num_types=st.integers(min_value=2, max_value=len(UsageType)),
        requests_per_type=st.integers(min_value=1, max_value=20),
    )
    def test_usage_type_isolation(
        self,
        num_types: int,
        requests_per_type: int,
    ):
        """
        Property: Usage is tracked separately per type.
        
        Different usage types should have independent counters.
        
        **Validates: Requirements 29.1**
        """
        reset_usage_tracker()
        tracker = UsageTracker()
        tenant_id = str(uuid4())
        
        types = list(UsageType)[:num_types]
        
        # Make requests for each type
        for usage_type in types:
            for _ in range(requests_per_type):
                tracker.increment_usage(tenant_id, usage_type, 1, 100, 50)
        
        # Each type should have exactly its own count
        for usage_type in types:
            record = tracker.get_usage(tenant_id, usage_type)
            assert record.request_count == requests_per_type, (
                f"Type {usage_type} should have {requests_per_type} requests, "
                f"got {record.request_count}"
            )


class TestConvenienceFunctions:
    """Tests for convenience functions."""
    
    def test_track_usage_function(self):
        """track_usage convenience function should work."""
        reset_usage_tracker()
        tenant_id = str(uuid4())
        
        record = track_usage(
            tenant_id=tenant_id,
            usage_type=UsageType.CHAT,
            tokens_input=100,
            tokens_output=50,
        )
        
        assert record.request_count == 1
        assert record.token_count_input == 100
    
    def test_check_and_track_usage_function(self):
        """check_and_track_usage should check quota and track."""
        reset_usage_tracker()
        tracker = get_usage_tracker()
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.CHAT, limit=2)
        
        # First two should succeed
        check_and_track_usage(tenant_id, UsageType.CHAT)
        check_and_track_usage(tenant_id, UsageType.CHAT)
        
        # Third should fail
        with pytest.raises(AIQuotaExceededError):
            check_and_track_usage(tenant_id, UsageType.CHAT)
