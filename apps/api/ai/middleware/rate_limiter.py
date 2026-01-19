"""
Rate Limiter Middleware for AI Layer

Implements per-tenant and per-user rate limiting for AI requests.

Requirements:
- 6.6: Implement rate limiting per tenant and per user
- 12.3: Implement request rate limiting (requests per minute per user)

This middleware uses a sliding window algorithm with in-memory storage.
For production, consider using Redis for distributed rate limiting.
"""

import time
from collections import defaultdict
from dataclasses import dataclass, field
from threading import Lock
from typing import Optional, Callable, Any
from functools import wraps

from ai.config import AIConfig, AIRateLimitError


@dataclass
class RateLimitWindow:
    """Sliding window for rate limiting."""
    requests: list[float] = field(default_factory=list)
    lock: Lock = field(default_factory=Lock)
    
    def add_request(self, timestamp: float) -> None:
        """Add a request timestamp."""
        with self.lock:
            self.requests.append(timestamp)
    
    def count_requests_in_window(self, window_start: float) -> int:
        """Count requests within the time window."""
        with self.lock:
            # Clean up old requests
            self.requests = [t for t in self.requests if t >= window_start]
            return len(self.requests)
    
    def clear(self) -> None:
        """Clear all requests."""
        with self.lock:
            self.requests.clear()


@dataclass
class RateLimitResult:
    """Result of a rate limit check."""
    allowed: bool
    current_count: int
    limit: int
    remaining: int
    reset_at: float  # Unix timestamp when window resets
    retry_after: Optional[int] = None  # Seconds until retry allowed
    
    def to_headers(self) -> dict[str, str]:
        """Convert to HTTP headers for rate limit info."""
        return {
            "X-RateLimit-Limit": str(self.limit),
            "X-RateLimit-Remaining": str(max(0, self.remaining)),
            "X-RateLimit-Reset": str(int(self.reset_at)),
        }


class RateLimiter:
    """
    Rate limiter with per-tenant and per-user limits.
    
    Uses a sliding window algorithm to track requests.
    Thread-safe for concurrent access.
    
    Attributes:
        tenant_windows: Rate limit windows per tenant
        user_windows: Rate limit windows per user (tenant:user key)
        window_seconds: Duration of the rate limit window
    """
    
    _instance: Optional["RateLimiter"] = None
    
    def __init__(
        self,
        tenant_limit_per_minute: Optional[int] = None,
        user_limit_per_minute: Optional[int] = None,
        window_seconds: int = 60,
    ):
        """
        Initialize the rate limiter.
        
        Args:
            tenant_limit_per_minute: Max requests per tenant per minute
            user_limit_per_minute: Max requests per user per minute
            window_seconds: Duration of the sliding window
        """
        config = AIConfig.get()
        self.tenant_limit = tenant_limit_per_minute or config.quota.rate_limit_per_minute
        self.user_limit = user_limit_per_minute or config.quota.rate_limit_per_user_per_minute
        self.window_seconds = window_seconds
        
        # Storage for rate limit windows
        self._tenant_windows: dict[str, RateLimitWindow] = defaultdict(RateLimitWindow)
        self._user_windows: dict[str, RateLimitWindow] = defaultdict(RateLimitWindow)
        self._lock = Lock()
    
    @classmethod
    def get(cls) -> "RateLimiter":
        """Get the singleton RateLimiter instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    @classmethod
    def reset(cls) -> None:
        """Reset the singleton instance (for testing)."""
        cls._instance = None
    
    def _get_window_start(self) -> float:
        """Get the start of the current sliding window."""
        return time.time() - self.window_seconds
    
    def check_tenant_limit(self, tenant_id: str) -> RateLimitResult:
        """
        Check if tenant is within rate limit.
        
        Args:
            tenant_id: The tenant identifier
            
        Returns:
            RateLimitResult with limit status
        """
        now = time.time()
        window_start = self._get_window_start()
        
        with self._lock:
            window = self._tenant_windows[tenant_id]
        
        current_count = window.count_requests_in_window(window_start)
        remaining = self.tenant_limit - current_count
        reset_at = now + self.window_seconds
        
        allowed = current_count < self.tenant_limit
        retry_after = None if allowed else self.window_seconds
        
        return RateLimitResult(
            allowed=allowed,
            current_count=current_count,
            limit=self.tenant_limit,
            remaining=remaining,
            reset_at=reset_at,
            retry_after=retry_after,
        )
    
    def check_user_limit(self, tenant_id: str, user_id: str) -> RateLimitResult:
        """
        Check if user is within rate limit.
        
        Args:
            tenant_id: The tenant identifier
            user_id: The user identifier
            
        Returns:
            RateLimitResult with limit status
        """
        now = time.time()
        window_start = self._get_window_start()
        key = f"{tenant_id}:{user_id}"
        
        with self._lock:
            window = self._user_windows[key]
        
        current_count = window.count_requests_in_window(window_start)
        remaining = self.user_limit - current_count
        reset_at = now + self.window_seconds
        
        allowed = current_count < self.user_limit
        retry_after = None if allowed else self.window_seconds
        
        return RateLimitResult(
            allowed=allowed,
            current_count=current_count,
            limit=self.user_limit,
            remaining=remaining,
            reset_at=reset_at,
            retry_after=retry_after,
        )
    
    def check_limits(self, tenant_id: str, user_id: str) -> RateLimitResult:
        """
        Check both tenant and user rate limits.
        
        Returns the more restrictive result.
        
        Args:
            tenant_id: The tenant identifier
            user_id: The user identifier
            
        Returns:
            RateLimitResult with the more restrictive limit status
        """
        tenant_result = self.check_tenant_limit(tenant_id)
        user_result = self.check_user_limit(tenant_id, user_id)
        
        # Return the more restrictive result
        if not tenant_result.allowed:
            return tenant_result
        if not user_result.allowed:
            return user_result
        
        # Both allowed - return the one with fewer remaining
        if tenant_result.remaining <= user_result.remaining:
            return tenant_result
        return user_result
    
    def record_request(self, tenant_id: str, user_id: str) -> None:
        """
        Record a request for rate limiting.
        
        Call this after successfully processing a request.
        
        Args:
            tenant_id: The tenant identifier
            user_id: The user identifier
        """
        now = time.time()
        key = f"{tenant_id}:{user_id}"
        
        with self._lock:
            self._tenant_windows[tenant_id].add_request(now)
            self._user_windows[key].add_request(now)
    
    def acquire(self, tenant_id: str, user_id: str) -> RateLimitResult:
        """
        Check limits and record request if allowed.
        
        This is the main entry point for rate limiting.
        
        Args:
            tenant_id: The tenant identifier
            user_id: The user identifier
            
        Returns:
            RateLimitResult with limit status
            
        Raises:
            AIRateLimitError: If rate limit is exceeded
        """
        result = self.check_limits(tenant_id, user_id)
        
        if not result.allowed:
            raise AIRateLimitError(
                f"Rate limit exceeded. Retry after {result.retry_after} seconds."
            )
        
        self.record_request(tenant_id, user_id)
        return result
    
    def clear_tenant(self, tenant_id: str) -> None:
        """Clear rate limit data for a tenant (for testing)."""
        with self._lock:
            if tenant_id in self._tenant_windows:
                self._tenant_windows[tenant_id].clear()
            # Clear all user windows for this tenant
            keys_to_clear = [k for k in self._user_windows if k.startswith(f"{tenant_id}:")]
            for key in keys_to_clear:
                self._user_windows[key].clear()
    
    def clear_all(self) -> None:
        """Clear all rate limit data (for testing)."""
        with self._lock:
            self._tenant_windows.clear()
            self._user_windows.clear()


def rate_limit(func: Callable) -> Callable:
    """
    Decorator to apply rate limiting to a function.
    
    The decorated function must accept tenant_id and user_id as keyword arguments.
    
    Usage:
        @rate_limit
        def ai_chat(prompt: str, tenant_id: str, user_id: str):
            ...
    
    Raises:
        AIRateLimitError: If rate limit is exceeded
    """
    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        tenant_id = kwargs.get("tenant_id")
        user_id = kwargs.get("user_id")
        
        if not tenant_id or not user_id:
            raise ValueError("rate_limit decorator requires tenant_id and user_id kwargs")
        
        limiter = RateLimiter.get()
        limiter.acquire(tenant_id, user_id)
        
        return func(*args, **kwargs)
    
    return wrapper


class RateLimitExceededError(Exception):
    """Raised when rate limit is exceeded."""
    
    def __init__(self, message: str, retry_after_seconds: int = 60):
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


def get_rate_limiter() -> RateLimiter:
    """Get the singleton RateLimiter instance."""
    return RateLimiter.get()


def reset_rate_limiter() -> None:
    """Reset the singleton RateLimiter instance (for testing)."""
    RateLimiter.reset()


def check_rate_limit(tenant_id: str, user_id: str) -> RateLimitResult:
    """
    Check rate limit and raise if exceeded.
    
    Convenience function for use in API endpoints.
    
    Args:
        tenant_id: The tenant identifier
        user_id: The user identifier
        
    Returns:
        RateLimitResult if allowed
        
    Raises:
        RateLimitExceededError: If rate limit is exceeded
    """
    limiter = get_rate_limiter()
    result = limiter.check_limits(tenant_id, user_id)
    
    if not result.allowed:
        raise RateLimitExceededError(
            f"Rate limit exceeded. Retry after {result.retry_after} seconds.",
            retry_after_seconds=result.retry_after or 60,
        )
    
    # Record the request
    limiter.record_request(tenant_id, user_id)
    return result
