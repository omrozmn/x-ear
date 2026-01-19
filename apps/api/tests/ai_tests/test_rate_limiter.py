"""
Property-based tests for Rate Limiter.

**Property 12: Rate Limiting Enforcement**
**Validates: Requirements 6.6, 12.1, 12.2, 12.3**

Requirements:
- 6.6: Implement rate limiting per tenant and per user
- 12.1: Track AI request counts per tenant and per subscription plan
- 12.2: Gracefully disable AI features when quota exceeded (not block core functionality)
- 12.3: Implement request rate limiting (requests per minute per user)
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from uuid import uuid4

from ai.middleware.rate_limiter import (
    RateLimiter,
    RateLimitResult,
    rate_limit,
    get_rate_limiter,
    reset_rate_limiter,
)
from ai.config import AIRateLimitError, AIConfig


@pytest.fixture(autouse=True)
def reset_limiter():
    """Reset rate limiter before each test."""
    reset_rate_limiter()
    AIConfig.reset()
    yield
    reset_rate_limiter()
    AIConfig.reset()


class TestRateLimiterBasic:
    """Basic unit tests for rate limiter."""
    
    def test_allows_requests_under_limit(self):
        """Requests under the limit should be allowed."""
        limiter = RateLimiter(tenant_limit_per_minute=10, user_limit_per_minute=5)
        tenant_id = str(uuid4())
        user_id = str(uuid4())
        
        result = limiter.check_limits(tenant_id, user_id)
        
        assert result.allowed is True
        assert result.remaining > 0
    
    def test_blocks_requests_over_tenant_limit(self):
        """Requests over tenant limit should be blocked."""
        limiter = RateLimiter(tenant_limit_per_minute=3, user_limit_per_minute=10)
        tenant_id = str(uuid4())
        user_id = str(uuid4())
        
        # Make requests up to limit
        for _ in range(3):
            limiter.record_request(tenant_id, user_id)
        
        result = limiter.check_tenant_limit(tenant_id)
        
        assert result.allowed is False
        assert result.retry_after is not None
    
    def test_blocks_requests_over_user_limit(self):
        """Requests over user limit should be blocked."""
        limiter = RateLimiter(tenant_limit_per_minute=100, user_limit_per_minute=3)
        tenant_id = str(uuid4())
        user_id = str(uuid4())
        
        # Make requests up to limit
        for _ in range(3):
            limiter.record_request(tenant_id, user_id)
        
        result = limiter.check_user_limit(tenant_id, user_id)
        
        assert result.allowed is False
        assert result.retry_after is not None
    
    def test_acquire_raises_on_limit_exceeded(self):
        """acquire() should raise AIRateLimitError when limit exceeded."""
        limiter = RateLimiter(tenant_limit_per_minute=2, user_limit_per_minute=10)
        tenant_id = str(uuid4())
        user_id = str(uuid4())
        
        # Use up the limit
        limiter.acquire(tenant_id, user_id)
        limiter.acquire(tenant_id, user_id)
        
        # Next request should fail
        with pytest.raises(AIRateLimitError):
            limiter.acquire(tenant_id, user_id)
    
    def test_different_tenants_have_separate_limits(self):
        """Different tenants should have independent rate limits."""
        limiter = RateLimiter(tenant_limit_per_minute=2, user_limit_per_minute=10)
        tenant_a = str(uuid4())
        tenant_b = str(uuid4())
        user_id = str(uuid4())
        
        # Use up tenant A's limit
        limiter.acquire(tenant_a, user_id)
        limiter.acquire(tenant_a, user_id)
        
        # Tenant B should still be allowed
        result = limiter.check_tenant_limit(tenant_b)
        assert result.allowed is True
    
    def test_different_users_have_separate_limits(self):
        """Different users should have independent rate limits."""
        limiter = RateLimiter(tenant_limit_per_minute=100, user_limit_per_minute=2)
        tenant_id = str(uuid4())
        user_a = str(uuid4())
        user_b = str(uuid4())
        
        # Use up user A's limit
        limiter.acquire(tenant_id, user_a)
        limiter.acquire(tenant_id, user_a)
        
        # User B should still be allowed
        result = limiter.check_user_limit(tenant_id, user_b)
        assert result.allowed is True
    
    def test_rate_limit_headers(self):
        """Rate limit result should provide proper headers."""
        limiter = RateLimiter(tenant_limit_per_minute=10, user_limit_per_minute=5)
        tenant_id = str(uuid4())
        user_id = str(uuid4())
        
        result = limiter.acquire(tenant_id, user_id)
        headers = result.to_headers()
        
        assert "X-RateLimit-Limit" in headers
        assert "X-RateLimit-Remaining" in headers
        assert "X-RateLimit-Reset" in headers


class TestRateLimiterProperty:
    """
    Property-based tests for rate limiting.
    
    **Feature: ai-layer-architecture, Property 12: Rate Limiting Enforcement**
    **Validates: Requirements 6.6, 12.1, 12.2, 12.3**
    """
    
    @settings(max_examples=100)
    @given(
        tenant_id=st.uuids().map(str),
        user_id=st.uuids().map(str),
        request_count=st.integers(min_value=1, max_value=50),
        tenant_limit=st.integers(min_value=1, max_value=100),
        user_limit=st.integers(min_value=1, max_value=100),
    )
    def test_rate_limiting_enforcement(
        self,
        tenant_id: str,
        user_id: str,
        request_count: int,
        tenant_limit: int,
        user_limit: int,
    ):
        """
        Property 12: Rate Limiting Enforcement
        
        For any tenant and user, when the request rate exceeds the configured
        limit (requests per minute), subsequent requests SHALL be rejected;
        the number of successful requests SHALL NOT exceed the limit.
        
        **Validates: Requirements 6.6, 12.1, 12.2, 12.3**
        """
        # Reset for each test case
        reset_rate_limiter()
        
        limiter = RateLimiter(
            tenant_limit_per_minute=tenant_limit,
            user_limit_per_minute=user_limit,
        )
        
        # The effective limit is the minimum of tenant and user limits
        effective_limit = min(tenant_limit, user_limit)
        
        successful = 0
        rate_limited = 0
        
        for _ in range(request_count):
            try:
                limiter.acquire(tenant_id, user_id)
                successful += 1
            except AIRateLimitError:
                rate_limited += 1
        
        # Property: successful requests should not exceed the effective limit
        assert successful <= effective_limit, (
            f"Successful requests ({successful}) exceeded limit ({effective_limit})"
        )
        
        # Property: if we made more requests than the limit, some should be rate limited
        if request_count > effective_limit:
            assert rate_limited > 0, (
                f"Expected rate limiting when {request_count} > {effective_limit}"
            )
        
        # Property: total should equal request count
        assert successful + rate_limited == request_count
    
    @settings(max_examples=100)
    @given(
        tenant_id=st.uuids().map(str),
        num_users=st.integers(min_value=2, max_value=10),
        requests_per_user=st.integers(min_value=1, max_value=20),
        tenant_limit=st.integers(min_value=10, max_value=200),
        user_limit=st.integers(min_value=5, max_value=50),
    )
    def test_per_user_isolation(
        self,
        tenant_id: str,
        num_users: int,
        requests_per_user: int,
        tenant_limit: int,
        user_limit: int,
    ):
        """
        Property: Per-user rate limits are isolated.
        
        Different users within the same tenant should have independent
        rate limits. One user hitting their limit should not affect others.
        
        **Validates: Requirements 6.6, 12.3**
        """
        reset_rate_limiter()
        
        limiter = RateLimiter(
            tenant_limit_per_minute=tenant_limit,
            user_limit_per_minute=user_limit,
        )
        
        users = [str(uuid4()) for _ in range(num_users)]
        user_successful = {user: 0 for user in users}
        
        # Each user makes requests
        for user_id in users:
            for _ in range(requests_per_user):
                try:
                    limiter.acquire(tenant_id, user_id)
                    user_successful[user_id] += 1
                except AIRateLimitError:
                    pass
        
        # Property: each user's successful requests should not exceed user limit
        for user_id, count in user_successful.items():
            assert count <= user_limit, (
                f"User {user_id} had {count} successful requests, exceeding limit {user_limit}"
            )
        
        # Property: total successful should not exceed tenant limit
        total_successful = sum(user_successful.values())
        assert total_successful <= tenant_limit, (
            f"Total successful ({total_successful}) exceeded tenant limit ({tenant_limit})"
        )
    
    @settings(max_examples=100)
    @given(
        num_tenants=st.integers(min_value=2, max_value=5),
        requests_per_tenant=st.integers(min_value=1, max_value=20),
        tenant_limit=st.integers(min_value=5, max_value=50),
    )
    def test_per_tenant_isolation(
        self,
        num_tenants: int,
        requests_per_tenant: int,
        tenant_limit: int,
    ):
        """
        Property: Per-tenant rate limits are isolated.
        
        Different tenants should have completely independent rate limits.
        One tenant hitting their limit should not affect others.
        
        **Validates: Requirements 6.6, 12.1**
        """
        reset_rate_limiter()
        
        limiter = RateLimiter(
            tenant_limit_per_minute=tenant_limit,
            user_limit_per_minute=100,  # High user limit to test tenant limit
        )
        
        tenants = [str(uuid4()) for _ in range(num_tenants)]
        tenant_successful = {tenant: 0 for tenant in tenants}
        
        # Each tenant makes requests
        for tenant_id in tenants:
            user_id = str(uuid4())
            for _ in range(requests_per_tenant):
                try:
                    limiter.acquire(tenant_id, user_id)
                    tenant_successful[tenant_id] += 1
                except AIRateLimitError:
                    pass
        
        # Property: each tenant's successful requests should not exceed tenant limit
        for tenant_id, count in tenant_successful.items():
            assert count <= tenant_limit, (
                f"Tenant {tenant_id} had {count} successful requests, exceeding limit {tenant_limit}"
            )
        
        # Property: tenants are independent - if one hits limit, others can still succeed
        if requests_per_tenant > tenant_limit and num_tenants > 1:
            # At least one tenant should have hit the limit
            limited_tenants = [t for t, c in tenant_successful.items() if c == tenant_limit]
            assert len(limited_tenants) >= 1, "Expected at least one tenant to hit limit"


class TestRateLimitDecorator:
    """Tests for the rate_limit decorator."""
    
    def test_decorator_applies_rate_limiting(self):
        """The decorator should apply rate limiting to functions."""
        reset_rate_limiter()
        
        # Create a limiter with low limit
        limiter = RateLimiter(tenant_limit_per_minute=2, user_limit_per_minute=10)
        RateLimiter._instance = limiter
        
        @rate_limit
        def my_function(data: str, tenant_id: str, user_id: str) -> str:
            return f"processed: {data}"
        
        tenant_id = str(uuid4())
        user_id = str(uuid4())
        
        # First two calls should succeed
        result1 = my_function("test1", tenant_id=tenant_id, user_id=user_id)
        result2 = my_function("test2", tenant_id=tenant_id, user_id=user_id)
        
        assert result1 == "processed: test1"
        assert result2 == "processed: test2"
        
        # Third call should fail
        with pytest.raises(AIRateLimitError):
            my_function("test3", tenant_id=tenant_id, user_id=user_id)
    
    def test_decorator_requires_tenant_and_user_id(self):
        """The decorator should require tenant_id and user_id kwargs."""
        reset_rate_limiter()
        
        @rate_limit
        def my_function(data: str, tenant_id: str = None, user_id: str = None) -> str:
            return f"processed: {data}"
        
        with pytest.raises(ValueError, match="tenant_id and user_id"):
            my_function("test")
