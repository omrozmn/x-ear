import os
import time
import json
from typing import Optional

REDIS_URL = os.getenv('REDIS_URL')

class BaseOTPStore:
    def set_otp(self, identifier: str, code: str, ttl: int):
        raise NotImplementedError

    def get_otp(self, identifier: str) -> Optional[str]:
        raise NotImplementedError

    def delete_otp(self, identifier: str):
        raise NotImplementedError

    def increment_rate(self, identifier: str, window_seconds: int) -> int:
        """Increment rate counter and return current count"""
        raise NotImplementedError

    def is_healthy(self) -> bool:
        """Return True if the backing store is healthy/available."""
        return False


class InMemoryOTPStore(BaseOTPStore):
    def __init__(self):
        self._storage = {}
        self._expiry = {}
        self._rate = {}

    def set_otp(self, identifier: str, code: str, ttl: int):
        now = int(time.time())
        self._storage[identifier] = code
        self._expiry[identifier] = now + ttl

    def get_otp(self, identifier: str) -> Optional[str]:
        now = int(time.time())
        code = self._storage.get(identifier)
        expiry = self._expiry.get(identifier, 0)
        if not code or now > expiry:
            return None
        return code

    def delete_otp(self, identifier: str):
        try:
            del self._storage[identifier]
            del self._expiry[identifier]
        except KeyError:
            pass

    def increment_rate(self, identifier: str, window_seconds: int) -> int:
        now = int(time.time())
        window_key = f'{identifier}:{(now // window_seconds)}'
        self._rate.setdefault(window_key, 0)
        self._rate[window_key] += 1
        # Clean up old windows (simple opportunistic cleanup)
        # Note: this in-memory approach is only suitable for single-process dev/test
        return self._rate[window_key]


class RedisOTPStore(BaseOTPStore):
    def __init__(self, url: str):
        import redis
        # Note: redis.from_url may raise if connection params invalid or redis library unavailable
        self._r = redis.from_url(url, decode_responses=True)
        # Lightweight health cache
        self._healthy = True

    def set_otp(self, identifier: str, code: str, ttl: int):
        key = f'xear:otp:{identifier}'
        self._r.set(key, code, ex=ttl)

    def get_otp(self, identifier: str) -> Optional[str]:
        key = f'xear:otp:{identifier}'
        return self._r.get(key)

    def delete_otp(self, identifier: str):
        key = f'xear:otp:{identifier}'
        self._r.delete(key)

    def increment_rate(self, identifier: str, window_seconds: int) -> int:
        now = int(time.time())
        window = now // window_seconds
        key = f'xear:rl:{identifier}:{window}'
        # Use INCR and set expiry to window_seconds to auto-expire
        count = self._r.incr(key)
        if count == 1:
            self._r.expire(key, window_seconds)
        return int(count)

    def is_healthy(self) -> bool:
        try:
            # ping returns True if reachable
            return bool(self._r.ping())
        except Exception:
            return False


def get_store() -> BaseOTPStore:
    if REDIS_URL:
        try:
            store = RedisOTPStore(REDIS_URL)
            if store.is_healthy():
                return store
            # If ping fails, log and fall back
            import logging
            logging.getLogger(__name__).warning('Redis available at REDIS_URL but ping failed; falling back to in-memory OTP store')
            return InMemoryOTPStore()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f'Failed to initialize RedisOTPStore: {e} — falling back to in-memory store')
            return InMemoryOTPStore()
    return InMemoryOTPStore()
