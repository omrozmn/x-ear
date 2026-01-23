"""
Pytest configuration for AI Layer tests.
"""

import sys
from pathlib import Path

# Add the api directory to the path for imports
# Use Path for reliable resolution with spaces in path
_api_dir = Path(__file__).resolve().parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

# Also add to PYTHONPATH for subprocess calls
import os
os.environ.setdefault("PYTHONPATH", str(_api_dir))

# Set environment variables before importing app
os.environ.setdefault("AI_ENABLED", "true")
os.environ.setdefault("AI_PHASE", "C")  # Enable execution for testing
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

import pytest
from fastapi import Request
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from core.database import Base
# Import AI models to ensure their tables are created
from ai.models import AIRequest, AIAction, AIAuditLog, AIUsage


# =============================================================================
# Database Fixtures
# =============================================================================

@pytest.fixture(scope="function")
def db_session() -> Session:
    """
    Provide test database session.
    
    Uses the real SQLite database (not in-memory) to ensure AI tables exist.
    Automatically rolls back changes after each test for isolation.
    """
    # Use real database path (same as production)
    db_path = Path(__file__).resolve().parent.parent.parent / "instance" / "xear_crm.db"
    
    # Create engine pointing to real database
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
        echo=False,
    )
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    # Start a transaction
    session.begin()
    
    try:
        yield session
    finally:
        # Rollback to undo any changes made during the test
        session.rollback()
        session.close()
        engine.dispose()


# =============================================================================
# Authentication Fixtures
# =============================================================================

@pytest.fixture
def auth_context():
    """
    Provide authentication context for tests.
    
    Returns a dictionary with tenant_id, user_id, and permissions
    that will be injected into request.state by the mock auth middleware.
    """
    return {
        "tenant_id": "test-tenant",
        "user_id": "test-user",
        "permissions": ["ai.chat", "ai.admin", "ai.execute", "ai.view"],
    }


@pytest.fixture
def mock_auth_middleware(auth_context):
    """
    Provide mock authentication middleware for tests.
    
    This middleware bypasses JWT authentication and injects
    test authentication context into request.state.
    
    Usage in test app:
        @app.middleware("http")
        async def auth_middleware(request: Request, call_next):
            return await mock_auth_middleware(request, call_next)
    """
    async def middleware(request: Request, call_next):
        # Inject authentication context into request.state
        request.state.tenant_id = auth_context["tenant_id"]
        request.state.user_id = auth_context["user_id"]
        request.state.user_permissions = auth_context["permissions"]
        
        # Call the next middleware/endpoint
        response = await call_next(request)
        return response
    
    return middleware


# =============================================================================
# Test Data Seeding Helpers
# =============================================================================

class TestDataFactory:
    """
    Factory for creating test data for AI models.
    
    Provides helper methods to create realistic test data for:
    - AIRequest
    - AIAction
    - AIAuditLog
    - AIUsage
    
    All methods follow the project's naming conventions and tenant isolation rules.
    """
    
    @staticmethod
    def create_ai_request(
        session: Session,
        tenant_id: str = "test-tenant",
        user_id: str = "test-user",
        prompt: str = "Test prompt",
        session_id: str = None,
        status: str = "pending",
        intent_type: str = None,
        **kwargs
    ) -> AIRequest:
        """
        Create an AIRequest for testing.
        
        Args:
            session: Database session
            tenant_id: Tenant ID (default: "test-tenant")
            user_id: User ID (default: "test-user")
            prompt: User prompt (default: "Test prompt")
            session_id: Optional session ID for conversation context
            status: Request status (default: "pending")
            intent_type: Optional intent type
            **kwargs: Additional fields to override
            
        Returns:
            Created AIRequest instance
        """
        from ai.models.ai_request import AIRequest
        import hashlib
        
        # Generate prompt hash
        prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()
        
        request = AIRequest(
            tenant_id=tenant_id,
            user_id=user_id,
            prompt_encrypted=f"encrypted_{prompt}",  # Simplified for testing
            prompt_hash=prompt_hash,
            prompt_redacted=prompt,
            session_id=session_id,
            status=status,
            intent_type=intent_type,
            **kwargs
        )
        
        session.add(request)
        session.commit()
        session.refresh(request)
        
        return request
    
    @staticmethod
    def create_ai_action(
        session: Session,
        request_id: str,
        tenant_id: str = "test-tenant",
        user_id: str = "test-user",
        action_plan: dict = None,
        risk_level: str = "low",
        status: str = "draft",
        **kwargs
    ) -> AIAction:
        """
        Create an AIAction for testing.
        
        Args:
            session: Database session
            request_id: Reference to AIRequest
            tenant_id: Tenant ID (default: "test-tenant")
            user_id: User ID (default: "test-user")
            action_plan: Action plan JSON (default: simple plan)
            risk_level: Risk level (default: "low")
            status: Action status (default: "draft")
            **kwargs: Additional fields to override
            
        Returns:
            Created AIAction instance
        """
        from ai.models.ai_action import AIAction
        import hashlib
        import json
        
        # Default action plan
        if action_plan is None:
            action_plan = {
                "steps": [
                    {
                        "tool_id": "test_tool",
                        "operation": "test_operation",
                        "parameters": {"test": "value"}
                    }
                ]
            }
        
        # Generate action plan hash
        action_plan_json = json.dumps(action_plan, sort_keys=True)
        action_plan_hash = hashlib.sha256(action_plan_json.encode()).hexdigest()
        
        action = AIAction(
            request_id=request_id,
            tenant_id=tenant_id,
            user_id=user_id,
            action_plan=action_plan,
            action_plan_hash=action_plan_hash,
            tool_schema_versions={},
            risk_level=risk_level,
            status=status,
            **kwargs
        )
        
        session.add(action)
        session.commit()
        session.refresh(action)
        
        return action
    
    @staticmethod
    def create_ai_audit_log(
        session: Session,
        tenant_id: str = "test-tenant",
        user_id: str = "test-user",
        event_type: str = "request_received",
        request_id: str = None,
        action_id: str = None,
        **kwargs
    ) -> AIAuditLog:
        """
        Create an AIAuditLog for testing.
        
        Args:
            session: Database session
            tenant_id: Tenant ID (default: "test-tenant")
            user_id: User ID (default: "test-user")
            event_type: Event type (default: "request_received")
            request_id: Optional reference to AIRequest
            action_id: Optional reference to AIAction
            **kwargs: Additional fields to override
            
        Returns:
            Created AIAuditLog instance
        """
        from ai.models.ai_audit_log import AIAuditLog
        
        audit_log = AIAuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            event_type=event_type,
            request_id=request_id,
            action_id=action_id,
            **kwargs
        )
        
        session.add(audit_log)
        session.commit()
        session.refresh(audit_log)
        
        return audit_log
    
    @staticmethod
    def create_ai_usage(
        session: Session,
        tenant_id: str = "test-tenant",
        usage_type: str = "chat",
        request_count: int = 1,
        token_count_input: int = 10,
        token_count_output: int = 20,
        usage_date: "date" = None,
        **kwargs
    ) -> AIUsage:
        """
        Create an AIUsage record for testing.
        
        Args:
            session: Database session
            tenant_id: Tenant ID (default: "test-tenant")
            usage_type: Usage type (default: "chat")
            request_count: Number of requests (default: 1)
            token_count_input: Input tokens (default: 10)
            token_count_output: Output tokens (default: 20)
            usage_date: Usage date (default: today)
            **kwargs: Additional fields to override
            
        Returns:
            Created AIUsage instance
        """
        from ai.models.ai_usage import AIUsage
        from datetime import date
        
        if usage_date is None:
            usage_date = date.today()
        
        usage = AIUsage(
            tenant_id=tenant_id,
            usage_date=usage_date,
            usage_type=usage_type,
            request_count=request_count,
            token_count_input=token_count_input,
            token_count_output=token_count_output,
            **kwargs
        )
        
        session.add(usage)
        session.commit()
        session.refresh(usage)
        
        return usage


@pytest.fixture
def test_data_factory():
    """
    Provide TestDataFactory for creating test data.
    
    Usage:
        def test_something(db_session, test_data_factory):
            request = test_data_factory.create_ai_request(
                db_session,
                prompt="Create a party"
            )
            action = test_data_factory.create_ai_action(
                db_session,
                request_id=request.id
            )
    """
    return TestDataFactory


@pytest.fixture
def seeded_db_session(db_session, test_data_factory):
    """
    Provide a database session with pre-seeded test data.
    
    Creates a basic set of test data:
    - 1 AIRequest (pending)
    - 1 AIAction (draft)
    - 1 AIAuditLog (request_received)
    - 1 AIUsage record
    
    Returns:
        Tuple of (session, request, action, audit_log, usage)
    """
    from datetime import date, timedelta
    import uuid
    
    # Use unique tenant ID to avoid conflicts
    test_tenant_id = f"test-tenant-seeded-{uuid.uuid4().hex[:8]}"
    
    # Create test data
    request = test_data_factory.create_ai_request(
        db_session,
        tenant_id=test_tenant_id,
        prompt="Test prompt for integration tests",
        status="pending"
    )
    
    action = test_data_factory.create_ai_action(
        db_session,
        request_id=request.id,
        tenant_id=test_tenant_id,
        risk_level="low",
        status="draft"
    )
    
    audit_log = test_data_factory.create_ai_audit_log(
        db_session,
        tenant_id=test_tenant_id,
        event_type="request_received",
        request_id=request.id
    )
    
    # Use a past date to avoid UNIQUE constraint with existing data
    test_date = date.today() - timedelta(days=30)
    
    usage = test_data_factory.create_ai_usage(
        db_session,
        tenant_id=test_tenant_id,
        usage_type="chat",
        request_count=1,
        usage_date=test_date
    )
    
    # Return session and created objects
    return db_session, request, action, audit_log, usage
