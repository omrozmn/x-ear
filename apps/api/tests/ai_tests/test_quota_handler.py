"""
Tests for Quota Handler Service.

Requirements:
- 12.2: When a tenant exceeds their AI quota, THE System SHALL gracefully
        disable AI features (not block core functionality)
"""

import pytest
from uuid import uuid4

from ai.services.quota_handler import (
    QuotaHandler,
    QuotaInfo,
    QuotaStatus,
    QuotaExceededResponse,
    get_quota_handler,
    reset_quota_handler,
    require_quota,
    graceful_quota_check,
)
from ai.services.usage_tracker import UsageTracker, reset_usage_tracker
from ai.models.ai_usage import UsageType
from ai.config import AIQuotaExceededError, AIConfig


@pytest.fixture(autouse=True)
def reset_services():
    """Reset services before each test."""
    reset_quota_handler()
    reset_usage_tracker()
    AIConfig.reset()
    yield
    reset_quota_handler()
    reset_usage_tracker()
    AIConfig.reset()


class TestQuotaHandler:
    """Tests for QuotaHandler class."""
    
    def test_get_quota_info_unlimited(self):
        """Should return unlimited status when no quota set."""
        handler = QuotaHandler()
        tenant_id = str(uuid4())
        
        info = handler.get_quota_info(tenant_id, UsageType.CHAT)
        
        assert info.status == QuotaStatus.UNLIMITED
        assert info.quota_limit is None
        assert info.is_available is True
    
    def test_get_quota_info_ok(self):
        """Should return OK status when under quota."""
        tracker = UsageTracker()
        handler = QuotaHandler(usage_tracker=tracker)
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.CHAT, limit=100)
        tracker.increment_usage(tenant_id, UsageType.CHAT, 10)
        
        info = handler.get_quota_info(tenant_id, UsageType.CHAT)
        
        assert info.status == QuotaStatus.OK
        assert info.current_usage == 10
        assert info.quota_limit == 100
        assert info.remaining == 90
        assert info.is_available is True
    
    def test_get_quota_info_warning(self):
        """Should return WARNING status when approaching limit."""
        tracker = UsageTracker()
        handler = QuotaHandler(usage_tracker=tracker)
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.CHAT, limit=100)
        tracker.increment_usage(tenant_id, UsageType.CHAT, 85)  # 85% used
        
        info = handler.get_quota_info(tenant_id, UsageType.CHAT)
        
        assert info.status == QuotaStatus.WARNING
        assert info.is_available is True  # Still available
    
    def test_get_quota_info_exceeded(self):
        """Should return EXCEEDED status when over quota."""
        tracker = UsageTracker()
        handler = QuotaHandler(usage_tracker=tracker)
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.CHAT, limit=10)
        tracker.increment_usage(tenant_id, UsageType.CHAT, 15)  # Over limit
        
        info = handler.get_quota_info(tenant_id, UsageType.CHAT)
        
        assert info.status == QuotaStatus.EXCEEDED
        assert info.is_available is False
    
    def test_check_quota_available(self):
        """Should correctly check quota availability."""
        tracker = UsageTracker()
        handler = QuotaHandler(usage_tracker=tracker)
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.CHAT, limit=5)
        
        # Initially available
        assert handler.check_quota_available(tenant_id, UsageType.CHAT) is True
        
        # Use up quota
        for _ in range(5):
            tracker.increment_usage(tenant_id, UsageType.CHAT, 1)
        
        # Now exceeded
        assert handler.check_quota_available(tenant_id, UsageType.CHAT) is False
    
    def test_handle_quota_exceeded(self):
        """Should return proper response when quota exceeded."""
        tracker = UsageTracker()
        handler = QuotaHandler(usage_tracker=tracker)
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.CHAT, limit=10)
        tracker.increment_usage(tenant_id, UsageType.CHAT, 15)
        
        response = handler.handle_quota_exceeded(tenant_id, UsageType.CHAT)
        
        assert response.error_code == "QUOTA_EXCEEDED"
        assert response.usage_type == "chat"
        assert response.current_usage == 15
        assert response.quota_limit == 10
        assert response.retry_after is not None
    
    def test_acquire_or_graceful_fail_success(self):
        """Should return success when quota available."""
        tracker = UsageTracker()
        handler = QuotaHandler(usage_tracker=tracker)
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.CHAT, limit=10)
        
        success, error = handler.acquire_or_graceful_fail(tenant_id, UsageType.CHAT)
        
        assert success is True
        assert error is None
    
    def test_acquire_or_graceful_fail_exceeded(self):
        """Should return graceful failure when quota exceeded."""
        tracker = UsageTracker()
        handler = QuotaHandler(usage_tracker=tracker)
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.CHAT, limit=2)
        tracker.increment_usage(tenant_id, UsageType.CHAT, 2)
        
        success, error = handler.acquire_or_graceful_fail(tenant_id, UsageType.CHAT)
        
        assert success is False
        assert error is not None
        assert error.error_code == "QUOTA_EXCEEDED"
    
    def test_get_all_quota_info(self):
        """Should return quota info for all types."""
        handler = QuotaHandler()
        tenant_id = str(uuid4())
        
        all_info = handler.get_all_quota_info(tenant_id)
        
        assert len(all_info) == len(UsageType)
        for usage_type in UsageType:
            assert usage_type.value in all_info
    
    def test_is_any_quota_exceeded(self):
        """Should detect if any quota is exceeded."""
        tracker = UsageTracker()
        handler = QuotaHandler(usage_tracker=tracker)
        tenant_id = str(uuid4())
        
        # Initially none exceeded
        assert handler.is_any_quota_exceeded(tenant_id) is False
        
        # Exceed one type
        tracker.set_quota(tenant_id, UsageType.CHAT, limit=5)
        tracker.increment_usage(tenant_id, UsageType.CHAT, 10)
        
        assert handler.is_any_quota_exceeded(tenant_id) is True


class TestQuotaDecorators:
    """Tests for quota decorators."""
    
    def test_require_quota_allows_when_available(self):
        """require_quota should allow execution when quota available."""
        tracker = UsageTracker()
        QuotaHandler._instance = QuotaHandler(usage_tracker=tracker)
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.CHAT, limit=10)
        
        @require_quota(UsageType.CHAT)
        def my_function(data: str, tenant_id: str) -> str:
            return f"processed: {data}"
        
        result = my_function("test", tenant_id=tenant_id)
        assert result == "processed: test"
    
    def test_require_quota_raises_when_exceeded(self):
        """require_quota should raise when quota exceeded."""
        tracker = UsageTracker()
        QuotaHandler._instance = QuotaHandler(usage_tracker=tracker)
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.CHAT, limit=2)
        tracker.increment_usage(tenant_id, UsageType.CHAT, 5)
        
        @require_quota(UsageType.CHAT)
        def my_function(data: str, tenant_id: str) -> str:
            return f"processed: {data}"
        
        with pytest.raises(AIQuotaExceededError):
            my_function("test", tenant_id=tenant_id)
    
    def test_graceful_quota_check_returns_result_when_available(self):
        """graceful_quota_check should return result when quota available."""
        tracker = UsageTracker()
        QuotaHandler._instance = QuotaHandler(usage_tracker=tracker)
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.ADVISORY, limit=10)
        
        @graceful_quota_check(UsageType.ADVISORY)
        def my_function(data: str, tenant_id: str) -> str:
            return f"processed: {data}"
        
        result = my_function("test", tenant_id=tenant_id)
        assert result == "processed: test"
    
    def test_graceful_quota_check_returns_none_when_exceeded(self):
        """graceful_quota_check should return None when quota exceeded."""
        tracker = UsageTracker()
        QuotaHandler._instance = QuotaHandler(usage_tracker=tracker)
        tenant_id = str(uuid4())
        
        tracker.set_quota(tenant_id, UsageType.ADVISORY, limit=2)
        tracker.increment_usage(tenant_id, UsageType.ADVISORY, 5)
        
        @graceful_quota_check(UsageType.ADVISORY)
        def my_function(data: str, tenant_id: str) -> str:
            return f"processed: {data}"
        
        result = my_function("test", tenant_id=tenant_id)
        assert result is None  # Gracefully returns None


class TestQuotaInfoSerialization:
    """Tests for QuotaInfo serialization."""
    
    def test_quota_info_to_dict(self):
        """QuotaInfo should serialize to dict correctly."""
        info = QuotaInfo(
            tenant_id="tenant-123",
            usage_type=UsageType.CHAT,
            status=QuotaStatus.WARNING,
            current_usage=80,
            quota_limit=100,
            remaining=20,
            percentage_used=80.0,
            message="Approaching limit",
        )
        
        data = info.to_dict()
        
        assert data["tenantId"] == "tenant-123"
        assert data["usageType"] == "chat"
        assert data["status"] == "warning"
        assert data["currentUsage"] == 80
        assert data["quotaLimit"] == 100
        assert data["remaining"] == 20
        assert data["percentageUsed"] == 80.0
        assert data["isAvailable"] is True
    
    def test_quota_exceeded_response_to_dict(self):
        """QuotaExceededResponse should serialize to dict correctly."""
        response = QuotaExceededResponse(
            error_code="QUOTA_EXCEEDED",
            message="Quota exceeded",
            usage_type="chat",
            current_usage=15,
            quota_limit=10,
            retry_after="tomorrow",
        )
        
        data = response.to_dict()
        
        assert data["errorCode"] == "QUOTA_EXCEEDED"
        assert data["message"] == "Quota exceeded"
        assert data["usageType"] == "chat"
        assert data["currentUsage"] == 15
        assert data["quotaLimit"] == 10
        assert data["retryAfter"] == "tomorrow"
