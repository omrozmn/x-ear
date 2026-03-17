import logging
import os
import time
import asyncio
from typing import Callable, Optional

try:
    from fastapi import Request, HTTPException
except Exception:
    class Request:  # type: ignore
        pass

    class HTTPException(Exception):  # type: ignore
        def __init__(self, status_code=500, detail=""):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

logger = logging.getLogger(__name__)

# --- Rate limit backends ---

_redis_client = None
_redis_checked = False


def _get_redis():
    """Lazy-init Redis client; returns None if unavailable."""
    global _redis_client, _redis_checked
    if _redis_checked:
        return _redis_client
    _redis_checked = True
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        try:
            import redis
            _redis_client = redis.from_url(redis_url, decode_responses=True)
            _redis_client.ping()
            logger.info("Rate limiter using Redis backend")
        except Exception as e:
            logger.warning(f"Redis unavailable for rate limiter, using in-memory: {e}")
            _redis_client = None
    return _redis_client


def _check_rate_redis(key: str, window_seconds: int, max_calls: int) -> bool:
    """Returns True if request is allowed, False if rate limited."""
    r = _get_redis()
    if r is None:
        return _check_rate_memory(key, window_seconds, max_calls)
    try:
        now = int(time.time())
        window = now // window_seconds
        rkey = f"xear:rl:{key}:{window}"
        count = r.incr(rkey)
        if count == 1:
            r.expire(rkey, window_seconds)
        return count <= max_calls
    except Exception:
        return _check_rate_memory(key, window_seconds, max_calls)


# In-memory fallback
_RATE_STORE = {}


def _check_rate_memory(key: str, window_seconds: int, max_calls: int) -> bool:
    now = time.time()
    entry = _RATE_STORE.get(key)
    if entry and entry['expires_at'] > now:
        if entry['count'] >= max_calls:
            return False
        entry['count'] += 1
    else:
        _RATE_STORE[key] = {'count': 1, 'expires_at': now + window_seconds}
    return True


def _now() -> float:
    return time.time()


def rate_limit(identifier_getter: Optional[Callable] = None, window_seconds: int = 3600, max_calls: int = 5, key_prefix: str = 'rl'):
    """FastAPI-compatible rate limit decorator with Redis support (in-memory fallback)."""

    def decorator(func):
        is_coro = asyncio.iscoroutinefunction(func)

        async def _handle_request_async(req: Optional[Request]):
            id_val = None
            try:
                if identifier_getter:
                    id_val = identifier_getter(req)
                else:
                    if req:
                        try:
                            data = await req.json()
                            id_val = data.get('identifier') or data.get('phone')
                        except Exception:
                            id_val = None
            except Exception:
                id_val = None

            if not id_val:
                if req and getattr(req, 'client', None) and getattr(req.client, 'host', None):
                    id_val = req.client.host
                else:
                    id_val = 'unknown'
            return id_val

        def _handle_request_sync(req: Optional[Request]):
            id_val = None
            try:
                if identifier_getter:
                    id_val = identifier_getter(req)
            except Exception:
                id_val = None
            if not id_val:
                if req and getattr(req, 'client', None) and getattr(req.client, 'host', None):
                    id_val = req.client.host
                else:
                    id_val = 'unknown'
            return id_val

        async def async_wrapper(*args, **kwargs):
            req = None
            for a in args:
                if isinstance(a, Request):
                    req = a
                    break
            if not req:
                req = kwargs.get('request')

            id_val = await _handle_request_async(req)
            key = f"{key_prefix}:{id_val}"
            if not _check_rate_redis(key, window_seconds, max_calls):
                raise HTTPException(status_code=429, detail='Rate limit exceeded')

            return await func(*args, **kwargs)

        def sync_wrapper(*args, **kwargs):
            req = None
            for a in args:
                if isinstance(a, Request):
                    req = a
                    break
            if not req:
                req = kwargs.get('request')

            id_val = _handle_request_sync(req)
            key = f"{key_prefix}:{id_val}"
            if not _check_rate_redis(key, window_seconds, max_calls):
                raise HTTPException(status_code=429, detail='Rate limit exceeded')

            return func(*args, **kwargs)

        return async_wrapper if is_coro else sync_wrapper

    return decorator
