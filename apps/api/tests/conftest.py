"""
Pytest configuration for API tests.
Provides shared fixtures for FastAPI testing.
"""

import sys
import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import event
from datetime import datetime, timedelta

# Add the api directory to the path IMMEDIATELY
_api_dir = Path(__file__).resolve().parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

# Set test environment headers
os.environ['JWT_SECRET_KEY'] = 'test-secret'
os.environ['TESTING'] = 'true'  # Disable idempotency middleware in tests
os.environ['APP_ENV'] = 'testing'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'  # Use in-memory DB for tests
os.environ['SMTP_ENCRYPTION_KEY'] = '1RRDcoqlZU8KwHa_Y0ylelmteMsSM6Wgl07RJsGL2-k='  # Valid Fernet key for tests

# Patch JSONB for SQLite tests
import sqlalchemy.dialects.postgresql
from sqlalchemy.types import JSON
sqlalchemy.dialects.postgresql.JSONB = JSON

# Import after path setup and patches
from main import app
from core.database import Base, engine, SessionLocal
from core.models.user import User
from core.models.tenant import Tenant
import middleware.unified_access
import dependencies

# Patch secret keys
dependencies.SECRET_KEY = 'test-secret'
middleware.unified_access.SECRET_KEY = 'test-secret'

# Also patch permission_middleware if it exists
try:
    import middleware.permission_middleware
    middleware.permission_middleware.SECRET_KEY = 'test-secret'
except (ImportError, AttributeError):
    pass

# Patch AI middleware auth
try:
    import ai.middleware.auth
    ai.middleware.auth.SECRET_KEY = 'test-secret'
except (ImportError, AttributeError):
    pass

@pytest.fixture(scope="session")
def db_engine():
    """Create test database engine (in-memory DB via DATABASE_URL env override).

    Import ALL models before create_all so every column is registered with
    Base.metadata.  Some modules register their tables early during
    ``from main import app``; if the email models aren't imported yet at that
    point, the new columns (is_promotional, unsubscribe_token) are missing.
    drop_all + create_all on in-memory SQLite is cheap and guarantees a
    fresh, complete schema.
    """
    # Force-import models that may have been missed during app import
    import core.models  # noqa: F401  – registers all models with Base
    try:
        import core.models.email  # noqa: F401
    except ImportError:
        pass

    # Drop any tables that were created during ``from main import app`` with
    # an incomplete schema, then re-create everything from scratch.
    assert "memory" in str(engine.url), "Safety: only drop_all on in-memory DB"
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield engine

@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a clean database session per test.

    SQLite in-memory does not properly roll back SAVEPOINTs, so instead
    we let each test commit freely and clean up all rows afterwards.

    IMPORTANT: Bypasses tenant filter during setup/teardown so that
    test fixtures can create data without a tenant context.
    """
    from core.database import _skip_tenant_filter

    # Bypass tenant filter for test session
    skip_token = _skip_tenant_filter.set(True)

    session = SessionLocal(bind=db_engine, expire_on_commit=False)
    # Set default test tenant in session.info for tenant-filtered queries
    session.info['tenant_id'] = 'tenant-1'

    yield session

    session.rollback()  # discard any pending state
    # Delete all rows from every table (reverse dependency order)
    for table in reversed(Base.metadata.sorted_tables):
        try:
            session.execute(table.delete())
        except Exception:
            pass
    session.commit()
    session.close()

    # Restore tenant filter
    _skip_tenant_filter.reset(skip_token)

@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient - function scoped for proper db_session override"""
    from core.database import get_db, set_current_tenant_id

    def override_get_db():
        # Don't pre-set session.info['tenant_id'] here.
        # The tenant filter event listener will pick up the ContextVar
        # set by access_dependency (which runs after get_db).
        # The default 'tenant-1' is already set by the db_session fixture
        # and serves as fallback for tests that don't use JWT auth.
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    # Also set ContextVar for middleware that reads it
    set_current_tenant_id('tenant-1')

    test_client = TestClient(app)

    yield test_client

    # Cleanup
    app.dependency_overrides.clear()
    # Reset ContextVar and thread-local to avoid leaking tenant context
    set_current_tenant_id(None)
    try:
        from middleware.unified_access import _thread_local
        if hasattr(_thread_local, 'tenant_id'):
            del _thread_local.tenant_id
    except (ImportError, AttributeError):
        pass

@pytest.fixture(scope="function")
def test_tenant(db_session):
    """Create a persistent test tenant"""
    tenant = db_session.query(Tenant).filter_by(id='tenant-1').first()
    if not tenant:
        tenant = Tenant(
            id='tenant-1',
            name='Test Tenant',
            slug='test-tenant',
            owner_email='test@example.com',
            billing_email='billing@example.com',
            is_active=True,
            created_at=datetime.utcnow()
        )
        db_session.add(tenant)
        db_session.commit()
    return tenant

@pytest.fixture(scope="function")
def test_admin_user(db_session, test_tenant):
    """Create a test admin user"""
    user = db_session.query(User).filter_by(id='test-admin').first()
    if not user:
        user = User(
            id='test-admin',
            username='admin',
            email='admin@test.com',
            role='admin',
            tenant_id=test_tenant.id,
            is_active=True
        )
        user.set_password('admin123')
        db_session.add(user)
        db_session.commit()
    return user

@pytest.fixture(scope="function")
def auth_headers(test_admin_user):
    """Generate auth headers for test admin"""
    import uuid
    import time
    
    payload = {
        'sub': test_admin_user.id,
        'role': test_admin_user.role,
        'tenant_id': test_admin_user.tenant_id,
        'user_type': 'tenant',
        'role_permissions': ['*'],  # Admin has all permissions in tests
        'perm_ver': 1,
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    token = jwt.encode(payload, 'test-secret', algorithm='HS256')
    
    # Add Idempotency-Key for write operations (G-04/G-06)
    idempotency_key = f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}"
    
    return {
        'Authorization': f'Bearer {token}',
        'Idempotency-Key': idempotency_key
    }

@pytest.fixture(scope="function")
def auth_headers_tenant_admin(test_admin_user):
    """Generate auth headers for tenant_admin role (alias used by several tests)."""
    import uuid
    import time

    payload = {
        'sub': test_admin_user.id,
        'role': 'tenant_admin',
        'tenant_id': test_admin_user.tenant_id,
        'user_type': 'tenant',
        'role_permissions': ['*'],
        'perm_ver': 1,
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    token = jwt.encode(payload, 'test-secret', algorithm='HS256')
    idempotency_key = f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}"

    return {
        'Authorization': f'Bearer {token}',
        'Idempotency-Key': idempotency_key
    }


@pytest.fixture(scope="function")
def test_db(db_session):
    """Alias for db_session for compatibility with existing tests"""
    return db_session
