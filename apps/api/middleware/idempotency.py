"""
Idempotency Middleware for FastAPI (G-04/G-06)

Enforces idempotency on write operations (POST, PUT, PATCH).

Features:
- Validates Idempotency-Key header presence on write requests
- Caches responses by key + body hash
- Returns cached response on duplicate requests
- Returns 409 Conflict on same key + different payload

🔴 CRITICAL: Uses ASGI callable pattern, NOT BaseHTTPMiddleware
"""

import hashlib
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Callable
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger(__name__)

# In-memory cache (use Redis in production)
_idempotency_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 3600  # 1 hour

# Paths to skip idempotency check
SKIP_PATHS = [
    "/health",
    "/metrics",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/api/auth/lookup-phone",
    "/docs",
    "/openapi.json",
    "/redoc",
]


def _clean_expired_cache():
    """Remove expired entries from cache"""
    now = datetime.utcnow()
    expired_keys = [
        key for key, value in _idempotency_cache.items()
        if value.get("expires_at", now) < now
    ]
    for key in expired_keys:
        del _idempotency_cache[key]


class IdempotencyMiddleware:
    """
    ASGI Middleware to enforce idempotency on write operations.
    
    🔴 CRITICAL: BaseHTTPMiddleware KULLANILMAZ (context leak riski)
    Bu middleware ASGI callable pattern kullanır.
    """
    
    def __init__(self, app: ASGIApp, *, enabled: bool = True):
        self.app = app
        # Enable idempotency middleware unless explicitly disabled
        # For idempotency tests, we want it enabled even in test environment
        testing_mode = os.getenv("TESTING") == "true"
        enable_for_idempotency_tests = os.getenv("ENABLE_IDEMPOTENCY_TESTS") == "true"
        
        self.enabled = enabled and (not testing_mode or enable_for_idempotency_tests)
    
    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        # Skip if disabled (e.g., in tests)
        if not self.enabled:
            await self.app(scope, receive, send)
            return
        
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        method = scope.get("method", "GET").upper()
        path = scope.get("path", "")
        
        # Only enforce on write operations
        if method not in ("POST", "PUT", "PATCH"):
            await self.app(scope, receive, send)
            return
        
        # Skip certain paths
        if any(path.startswith(skip) for skip in SKIP_PATHS):
            await self.app(scope, receive, send)
            return
        
        # Get idempotency key from headers
        headers = dict(scope.get("headers", []))
        idempotency_key = (
            headers.get(b"idempotency-key", b"").decode() or
            headers.get(b"Idempotency-Key", b"").decode()
        )
        
        if not idempotency_key:
            # Return 400 Bad Request directly via ASGI
            await self._send_error(
                send,
                400,
                {
                    "success": False,
                    "error": {
                        "code": "IDEMPOTENCY_KEY_MISSING",
                        "message": "Idempotency-Key header is required for write operations"
                    }
                }
            )
            return
        
        # Read body for hash calculation
        body_parts = []
        
        async def receive_wrapper():
            message = await receive()
            if message["type"] == "http.request":
                body = message.get("body", b"")
                if body:
                    body_parts.append(body)
            return message
        
        # Collect body
        body_bytes = b""
        while True:
            message = await receive()
            if message["type"] == "http.request":
                body = message.get("body", b"")
                if body:
                    body_parts.append(body)
                if not message.get("more_body", False):
                    break
        
        body_bytes = b"".join(body_parts)
        body_hash = hashlib.sha256(body_bytes).hexdigest()[:16]
        
        # 🔴 CRITICAL: Cache key MUST include body hash
        cache_key = f"{method}:{path}:{idempotency_key}"
        full_cache_key = f"{cache_key}:{body_hash}"
        
        # Clean expired entries periodically
        if len(_idempotency_cache) > 1000:
            _clean_expired_cache()
        
        # Check for existing cache entry
        cached = _idempotency_cache.get(full_cache_key)
        
        if cached:
            # Check TTL
            if datetime.utcnow() < cached["expires_at"]:
                logger.info(f"Returning cached response for idempotency key: {idempotency_key}")
                await self._send_cached_response(send, cached)
                return
            else:
                # Expired, remove from cache
                del _idempotency_cache[full_cache_key]
        
        # Check if same idempotency key was used with different payload
        for existing_key in list(_idempotency_cache.keys()):
            if existing_key.startswith(cache_key) and existing_key != full_cache_key:
                existing_entry = _idempotency_cache.get(existing_key)
                if existing_entry and datetime.utcnow() < existing_entry["expires_at"]:
                    # Same key, different payload = 422 Conflict
                    logger.warning(f"Idempotency conflict: key={idempotency_key}, different payload")
                    await self._send_error(
                        send,
                        422,
                        {
                            "success": False,
                            "error": {
                                "code": "IDEMPOTENCY_KEY_REUSED",
                                "message": "Idempotency-Key was already used with a different request payload"
                            }
                        }
                    )
                    return
        
        # Create new receive that replays the body
        body_sent = [False]
        
        async def receive_replay():
            if not body_sent[0]:
                body_sent[0] = True
                return {
                    "type": "http.request",
                    "body": body_bytes,
                    "more_body": False
                }
            return {"type": "http.disconnect"}
        
        # Capture response for caching
        response_body = []
        response_status = [200]
        response_headers = [{}]
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                response_status[0] = message.get("status", 200)
                response_headers[0] = {
                    k.decode() if isinstance(k, bytes) else k: v.decode() if isinstance(v, bytes) else v
                    for k, v in message.get("headers", [])
                }
            elif message["type"] == "http.response.body":
                body = message.get("body", b"")
                if body:
                    response_body.append(body)
            await send(message)
        
        # Process request with replayed body
        await self.app(scope, receive_replay, send_wrapper)
        
        # Cache successful responses (2xx)
        if 200 <= response_status[0] < 300:
            full_body = b"".join(response_body)
            _idempotency_cache[full_cache_key] = {
                "body": full_body,
                "status_code": response_status[0],
                "headers": response_headers[0],
                "expires_at": datetime.utcnow() + timedelta(seconds=CACHE_TTL_SECONDS),
                "created_at": datetime.utcnow()
            }
            logger.debug(f"Cached response for idempotency key: {idempotency_key}")
    
    async def _send_error(self, send: Send, status_code: int, payload: dict):
        """Send JSON error response directly via ASGI"""
        body = json.dumps(payload).encode("utf-8")
        await send({
            "type": "http.response.start",
            "status": status_code,
            "headers": [
                [b"content-type", b"application/json"],
                [b"content-length", str(len(body)).encode()],
            ],
        })
        await send({
            "type": "http.response.body",
            "body": body,
        })
    
    async def _send_cached_response(self, send: Send, cached: dict):
        """Send cached response directly via ASGI"""
        headers = [
            [k.encode() if isinstance(k, str) else k, v.encode() if isinstance(v, str) else v]
            for k, v in cached.get("headers", {}).items()
        ]
        # Add the idempotency replayed header
        headers.append([b"X-Idempotency-Replayed", b"true"])
        
        await send({
            "type": "http.response.start",
            "status": cached["status_code"],
            "headers": headers,
        })
        await send({
            "type": "http.response.body",
            "body": cached["body"],
        })
