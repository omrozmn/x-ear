"""
AI Layer Middleware

FastAPI middleware components:
- RateLimiter: Per-tenant and per-user rate limiting
- KillSwitchMiddleware: Check kill switch status on every request
"""

from ai.middleware.rate_limiter import (
    RateLimiter,
    RateLimitResult,
    RateLimitWindow,
    rate_limit,
    get_rate_limiter,
    reset_rate_limiter,
)

from ai.middleware.kill_switch_middleware import (
    KillSwitchMiddleware,
    create_kill_switch_dependency,
    require_chat_enabled,
    require_actions_enabled,
    require_ocr_enabled,
    require_ai_enabled,
)

__all__ = [
    # Rate Limiter
    "RateLimiter",
    "RateLimitResult",
    "RateLimitWindow",
    "rate_limit",
    "get_rate_limiter",
    "reset_rate_limiter",
    # Kill Switch Middleware
    "KillSwitchMiddleware",
    "create_kill_switch_dependency",
    "require_chat_enabled",
    "require_actions_enabled",
    "require_ocr_enabled",
    "require_ai_enabled",
]
