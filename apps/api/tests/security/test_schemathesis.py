"""
Schemathesis API Fuzzing Tests
================================
Auto-generates test cases from OpenAPI schema to find:
- Server crashes (500 errors)
- Validation bypasses
- Unexpected behavior with edge-case inputs
"""
import os
import sys
from pathlib import Path

_api_dir = Path(__file__).resolve().parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

os.environ.setdefault('JWT_SECRET_KEY', 'test-secret')
os.environ.setdefault('TESTING', 'true')
os.environ.setdefault('DATABASE_URL', 'sqlite:///:memory:')
os.environ.setdefault('SMTP_ENCRYPTION_KEY', '1RRDcoqlZU8KwHa_Y0ylelmteMsSM6Wgl07RJsGL2-k=')

import sqlalchemy.dialects.postgresql
from sqlalchemy.types import JSON
sqlalchemy.dialects.postgresql.JSONB = JSON

import schemathesis
from main import app

# Patch secrets for test
import middleware.unified_access
import middleware.permission_middleware
middleware.unified_access.SECRET_KEY = 'test-secret'
middleware.permission_middleware.SECRET_KEY = 'test-secret'
try:
    import ai.middleware.auth
    ai.middleware.auth.SECRET_KEY = 'test-secret'
except (ImportError, AttributeError):
    pass

schema = schemathesis.from_asgi("/openapi.json", app=app)


@schema.parametrize()
def test_api_no_server_errors(case):
    """No API endpoint should return 500 for any valid schema input."""
    response = case.call_asgi()
    # We only care about server errors (500+)
    # 400/401/403/404/422/429 are expected for fuzzy inputs
    assert response.status_code < 500, \
        f"Server error {response.status_code} on {case.method} {case.path}: {response.text[:200]}"
