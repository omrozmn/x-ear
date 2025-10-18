from functools import wraps
from flask import request, current_app, jsonify
import logging

logger = logging.getLogger(__name__)


def rate_limit(identifier_getter=None, window_seconds: int = 3600, max_calls: int = 5, key_prefix: str = 'rl'):
    """A decorator factory for rate limiting endpoints.

    - identifier_getter: a callable that accepts (request) and returns a string identifier (e.g., email or phone).
      If None, decorator will try to use 'identifier' or 'phone' fields from JSON body, then remote_addr as fallback.
    - window_seconds: time window for counting requests.
    - max_calls: maximum allowed calls within the window.
    - key_prefix: prefix for keys in the store.

    The decorator uses current_app.extensions['otp_store'].increment_rate to increment and read counts.
    Falls back to a transient in-memory increment if the store is not available.
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                # Resolve identifier
                id_val = None
                try:
                    if identifier_getter:
                        id_val = identifier_getter(request)
                    else:
                        data = request.get_json(silent=True) or {}
                        id_val = data.get('identifier') or data.get('phone')
                except Exception:
                    id_val = None

                if not id_val:
                    # Use client IP as a fallback rate-limit key; may be shared across NAT.
                    id_val = request.remote_addr or 'unknown'

                # Combine with prefix to avoid collisions
                key_identifier = f"{key_prefix}:{id_val}"

                otp_store = current_app.extensions.get('otp_store')

                if otp_store:
                    count = otp_store.increment_rate(key_identifier, window_seconds)
                else:
                    # Transient fallback counter stored on app for dev/testing
                    logger.warning(f"Rate limiter falling back to transient in-memory counter for {key_identifier}")
                    app_counts = getattr(current_app, '_transient_rate_counts', None)
                    if app_counts is None:
                        current_app._transient_rate_counts = {}
                        app_counts = current_app._transient_rate_counts
                    window = int(__import__('time').time()) // window_seconds
                    window_key = f"{key_identifier}:{window}"
                    app_counts.setdefault(window_key, 0)
                    app_counts[window_key] += 1
                    count = app_counts[window_key]

                if count > max_calls:
                    logger.info(f"Rate limit exceeded for {key_identifier}: {count}/{max_calls}")
                    return jsonify({"success": False, "error": "Rate limit exceeded"}), 429

                return func(*args, **kwargs)
            except Exception as e:
                logger.exception(f"Rate limit decorator failure: {e}")
                # Fail open: if rate limiter fails, allow the request to proceed rather than blocking.
                return func(*args, **kwargs)

        return wrapper

    return decorator
