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
    """Create test database engine"""
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create isolated database session per test"""
    connection = db_engine.connect()
    transaction = connection.begin()
    
    # Force expire_on_commit=False to prevent ObjectDeletedError/DetachedInstanceError
    # when sharing session between test and app (which commits)
    from sqlalchemy.orm import Session
    session = Session(bind=connection, expire_on_commit=False)
    
    from sqlalchemy.orm import Session
    session = Session(bind=connection, expire_on_commit=False)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient with dependency overrides"""
    # Create a generator that yields the session for the dependency
    # Note: We can't access the function-scoped db_session here easily if client is module-scoped.
    # To fix this, we should make client function-scoped OR use a session-scoped DB session?
    # Better: Override per test using the 'db_session' fixture values?
    # Actually, the standard way is to override globally or per request.
    # Since db_session is function-scoped (good for isolation), client should probably be function-scoped 
    # to override dependency with the CURRENT test session.
    # But usually TestClient is expensive to create? No, it's fast.
    return TestClient(app)

@pytest.fixture(scope="function", autouse=True)
def override_db_dependency(client, db_session):
    """Override get_db to use the test session"""
    from database import get_db
    app.dependency_overrides[get_db] = lambda: db_session
    yield
    app.dependency_overrides.clear()

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
def test_db(db_session):
    """Alias for db_session for compatibility with existing tests"""
    return db_session
