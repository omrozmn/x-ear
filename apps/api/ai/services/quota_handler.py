"""
Quota Handler Service for AI Layer

Gracefully handles quota exceeded scenarios without affecting core functionality.

Requirements:
- 12.2: When a tenant exceeds their AI quota, THE System SHALL gracefully
        disable AI features (not block core functionality)

This service provides:
- Quota status checking
- Graceful degradation when quota exceeded
- Clear error messages for users
- Logging of quota events
"""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional, Callable, Any
from functools import wraps
from enum import Enum
import logging

from ai.config import AIConfig, AIQuotaExceededError
from ai.services.usage_tracker import UsageTracker, get_usage_tracker
from ai.models.ai_usage import UsageType


logger = logging.getLogger(__name__)


class QuotaStatus(str, Enum):
    """Status of quota for a tenant."""
    OK = "ok"                    # Quota available
    WARNING = "warning"          # Approaching limit (>80%)
    EXCEEDED = "exceeded"        # Quota exceeded
    UNLIMITED = "unlimited"      # No quota set


@dataclass
class QuotaInfo:
    """Information about quota status for a tenant/type."""
    tenant_id: str
    usage_type: UsageType
    status: QuotaStatus
    current_usage: int
    quota_limit: Optional[int]
    remaining: Optional[int]
    percentage_used: Optional[float]
    message: str
    
    @property
    def is_available(self) -> bool:
        """Check if quota is available for use."""
        return self.status in (QuotaStatus.OK, QuotaStatus.WARNING, QuotaStatus.UNLIMITED)
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "tenantId": self.tenant_id,
            "usageType": self.usage_type.value,
            "status": self.status.value,
            "currentUsage": self.current_usage,
            "quotaLimit": self.quota_limit,
            "remaining": self.remaining,
            "percentageUsed": self.percentage_used,
            "message": self.message,
            "isAvailable": self.is_available,
        }


@dataclass
class QuotaExceededResponse:
    """Response when quota is exceeded."""
    error_code: str = "QUOTA_EXCEEDED"
    message: str = "AI quota exceeded for this billing period"
    usage_type: Optional[str] = None
    current_usage: Optional[int] = None
    quota_limit: Optional[int] = None
    retry_after: Optional[str] = None  # When quota resets (e.g., "tomorrow")
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "errorCode": self.error_code,
            "message": self.message,
            "usageType": self.usage_type,
            "currentUsage": self.current_usage,
            "quotaLimit": self.quota_limit,
            "retryAfter": self.retry_after,
        }


class QuotaHandler:
    """
    Handles quota checking and graceful degradation.
    
    This service ensures that when AI quota is exceeded:
    1. AI features are gracefully disabled
    2. Core functionality remains unaffected
    3. Users receive clear error messages
    4. Events are logged for monitoring
    """
    
    _instance: Optional["QuotaHandler"] = None
    
    def __init__(self, usage_tracker: Optional[UsageTracker] = None):
        """
        Initialize the quota handler.
        
        Args:
            usage_tracker: Optional UsageTracker instance (uses singleton if not provided)
        """
        self._tracker = usage_tracker or get_usage_tracker()
        self._warning_threshold = 0.8  # 80% usage triggers warning
    
    @classmethod
    def get(cls) -> "QuotaHandler":
        """Get the singleton QuotaHandler instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    @classmethod
    def reset(cls) -> None:
        """Reset the singleton instance (for testing)."""
        cls._instance = None
    
    def get_quota_info(
        self,
        tenant_id: str,
        usage_type: UsageType,
    ) -> QuotaInfo:
        """
        Get quota information for a tenant/type.
        
        Args:
            tenant_id: The tenant identifier
            usage_type: Type of usage to check
            
        Returns:
            QuotaInfo with current status
        """
        has_quota, current, limit = self._tracker.check_quota(tenant_id, usage_type)
        
        if limit is None:
            return QuotaInfo(
                tenant_id=tenant_id,
                usage_type=usage_type,
                status=QuotaStatus.UNLIMITED,
                current_usage=current,
                quota_limit=None,
                remaining=None,
                percentage_used=None,
                message="Unlimited quota",
            )
        
        remaining = max(0, limit - current)
        percentage = (current / limit) * 100 if limit > 0 else 0
        
        if not has_quota:
            status = QuotaStatus.EXCEEDED
            message = f"Quota exceeded: {current}/{limit} requests used"
        elif percentage >= self._warning_threshold * 100:
            status = QuotaStatus.WARNING
            message = f"Approaching quota limit: {current}/{limit} requests used ({percentage:.1f}%)"
        else:
            status = QuotaStatus.OK
            message = f"Quota available: {remaining} requests remaining"
        
        return QuotaInfo(
            tenant_id=tenant_id,
            usage_type=usage_type,
            status=status,
            current_usage=current,
            quota_limit=limit,
            remaining=remaining,
            percentage_used=percentage,
            message=message,
        )
    
    def check_quota_available(
        self,
        tenant_id: str,
        usage_type: UsageType,
    ) -> bool:
        """
        Check if quota is available for a request.
        
        Args:
            tenant_id: The tenant identifier
            usage_type: Type of usage to check
            
        Returns:
            True if quota is available, False otherwise
        """
        info = self.get_quota_info(tenant_id, usage_type)
        return info.is_available
    
    def handle_quota_exceeded(
        self,
        tenant_id: str,
        usage_type: UsageType,
    ) -> QuotaExceededResponse:
        """
        Handle a quota exceeded scenario.
        
        This method:
        1. Logs the event
        2. Creates a user-friendly response
        3. Does NOT affect core functionality
        
        Args:
            tenant_id: The tenant identifier
            usage_type: Type of usage that exceeded quota
            
        Returns:
            QuotaExceededResponse with details
        """
        info = self.get_quota_info(tenant_id, usage_type)
        
        # Log the event
        logger.warning(
            "AI quota exceeded",
            extra={
                "tenant_id": tenant_id,
                "usage_type": usage_type.value,
                "current_usage": info.current_usage,
                "quota_limit": info.quota_limit,
            }
        )
        
        return QuotaExceededResponse(
            error_code="QUOTA_EXCEEDED",
            message=f"AI {usage_type.value} quota exceeded for this billing period. "
                    f"Current usage: {info.current_usage}, Limit: {info.quota_limit}",
            usage_type=usage_type.value,
            current_usage=info.current_usage,
            quota_limit=info.quota_limit,
            retry_after="tomorrow",  # Quota resets daily
        )
    
    def acquire_or_graceful_fail(
        self,
        tenant_id: str,
        usage_type: UsageType,
        tokens_input: int = 0,
        tokens_output: int = 0,
    ) -> tuple[bool, Optional[QuotaExceededResponse]]:
        """
        Try to acquire quota, returning graceful failure if exceeded.
        
        This method does NOT raise exceptions - it returns a tuple
        indicating success/failure with details.
        
        Args:
            tenant_id: The tenant identifier
            usage_type: Type of usage
            tokens_input: Input tokens to track
            tokens_output: Output tokens to track
            
        Returns:
            Tuple of (success, error_response)
            - (True, None) if quota acquired
            - (False, QuotaExceededResponse) if quota exceeded
        """
        try:
            self._tracker.acquire_quota(
                tenant_id=tenant_id,
                usage_type=usage_type,
                tokens_input=tokens_input,
                tokens_output=tokens_output,
            )
            return (True, None)
        except AIQuotaExceededError:
            response = self.handle_quota_exceeded(tenant_id, usage_type)
            return (False, response)
    
    def get_all_quota_info(self, tenant_id: str) -> dict[str, QuotaInfo]:
        """
        Get quota information for all usage types.
        
        Args:
            tenant_id: The tenant identifier
            
        Returns:
            Dictionary mapping usage type to QuotaInfo
        """
        return {
            usage_type.value: self.get_quota_info(tenant_id, usage_type)
            for usage_type in UsageType
        }
    
    def is_any_quota_exceeded(self, tenant_id: str) -> bool:
        """
        Check if any quota is exceeded for a tenant.
        
        Args:
            tenant_id: The tenant identifier
            
        Returns:
            True if any quota is exceeded
        """
        for usage_type in UsageType:
            info = self.get_quota_info(tenant_id, usage_type)
            if info.status == QuotaStatus.EXCEEDED:
                return True
        return False


def require_quota(usage_type: UsageType) -> Callable:
    """
    Decorator to require quota before executing a function.
    
    The decorated function must accept tenant_id as a keyword argument.
    If quota is exceeded, raises AIQuotaExceededError.
    
    Usage:
        @require_quota(UsageType.CHAT)
        def ai_chat(prompt: str, tenant_id: str):
            ...
    
    Args:
        usage_type: Type of usage to check
        
    Returns:
        Decorator function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            tenant_id = kwargs.get("tenant_id")
            if not tenant_id:
                raise ValueError("require_quota decorator requires tenant_id kwarg")
            
            handler = QuotaHandler.get()
            if not handler.check_quota_available(tenant_id, usage_type):
                raise AIQuotaExceededError(
                    f"AI quota exceeded for {usage_type.value}"
                )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


def graceful_quota_check(usage_type: UsageType) -> Callable:
    """
    Decorator for graceful quota handling.
    
    Instead of raising an exception, returns None if quota exceeded.
    The decorated function must accept tenant_id as a keyword argument.
    
    Usage:
        @graceful_quota_check(UsageType.CHAT)
        def ai_suggest(prompt: str, tenant_id: str) -> Optional[str]:
            ...
            
        # Returns None if quota exceeded, otherwise returns result
    
    Args:
        usage_type: Type of usage to check
        
    Returns:
        Decorator function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            tenant_id = kwargs.get("tenant_id")
            if not tenant_id:
                raise ValueError("graceful_quota_check decorator requires tenant_id kwarg")
            
            handler = QuotaHandler.get()
            if not handler.check_quota_available(tenant_id, usage_type):
                logger.info(
                    f"AI feature disabled due to quota: {usage_type.value}",
                    extra={"tenant_id": tenant_id}
                )
                return None
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


def get_quota_handler() -> QuotaHandler:
    """Get the singleton QuotaHandler instance."""
    return QuotaHandler.get()


def reset_quota_handler() -> None:
    """Reset the singleton QuotaHandler instance (for testing)."""
    QuotaHandler.reset()
