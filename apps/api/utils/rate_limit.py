import time
import asyncio
from typing import Callable, Optional
try:
    from fastapi import Request, HTTPException
except Exception:
    # Provide minimal fallbacks so utilities import in test environments
    class Request:  # type: ignore
        pass

    class HTTPException(Exception):  # type: ignore
        def __init__(self, status_code=500, detail=""):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

# Simple process-local in-memory rate store: { key: {'count': int, 'expires_at': float} }
_RATE_STORE = {}


def _now() -> float:
    return time.time()


def rate_limit(identifier_getter: Optional[Callable] = None, window_seconds: int = 3600, max_calls: int = 5, key_prefix: str = 'rl'):
    """FastAPI-compatible rate limit decorator.

    Works with both sync and async endpoint callables. Attempts to extract a
    `fastapi.Request` from positional or keyword args. If `identifier_getter`
    is provided it will be called with the request (or None) to produce an
    identifier string. Otherwise falls back to JSON body fields `identifier` or
    `phone` (async) or to the client IP address.
    """

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
            # extract Request if present
            req = None
            for a in args:
                if isinstance(a, Request):
                    req = a
                    break
            if not req:
                req = kwargs.get('request')

            id_val = await _handle_request_async(req)
            key = f"{key_prefix}:{id_val}"
            now = _now()
            entry = _RATE_STORE.get(key)
            if entry and entry['expires_at'] > now:
                if entry['count'] >= max_calls:
                    raise HTTPException(status_code=429, detail='Rate limit exceeded')
                entry['count'] += 1
            else:
                _RATE_STORE[key] = {'count': 1, 'expires_at': now + window_seconds}

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
            now = _now()
            entry = _RATE_STORE.get(key)
            if entry and entry['expires_at'] > now:
                if entry['count'] >= max_calls:
                    raise HTTPException(status_code=429, detail='Rate limit exceeded')
                entry['count'] += 1
            else:
                _RATE_STORE[key] = {'count': 1, 'expires_at': now + window_seconds}

            return func(*args, **kwargs)

        return async_wrapper if is_coro else sync_wrapper

    return decorator
