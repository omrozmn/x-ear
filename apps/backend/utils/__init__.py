from datetime import datetime, timezone
from .rate_limit import rate_limit

def now_utc():
    """Return current UTC datetime"""
    return datetime.now(timezone.utc)

__all__ = [
    'now_utc',
    'rate_limit'
]