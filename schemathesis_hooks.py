"""Schemathesis hooks for X-Ear API testing"""
import time
import random
import schemathesis

@schemathesis.hook
def before_call(context, case):
    """Add Idempotency-Key header to all write operations"""
    if case.method in ["POST", "PUT", "PATCH", "DELETE"]:
        # Generate unique idempotency key
        timestamp = int(time.time() * 1000)
        random_suffix = random.randint(1000, 9999)
        idempotency_key = f"test-{timestamp}-{random_suffix}"
        
        # Add to headers
        if case.headers is None:
            case.headers = {}
        case.headers["Idempotency-Key"] = idempotency_key
