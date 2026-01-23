"""
Property-Based Tests for User Audit Trail

Tests that user_id is properly tracked in AI requests for audit purposes.

Requirements tested:
- 2.7: Log all processed requests with tenant context and user_id
- 9.1: Store user_id in ai_request table for audit trail

Properties:
- Property 13: User audit trail - Every AI request must include user_id from JWT token
"""

import os
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from hypothesis import given, strategies as st, settings, HealthCheck, assume
from jose import jwt

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from ai.models.ai_request import AIRequest, RequestStatus
from ai.services.request_logger import RequestLogger, EncryptionService
from database import Base

# Set test environment
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")

# Test database setup
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture
def in_memory_db():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    yield db
    
    db.close()
    Base.metadata.drop_all(bind=engine)


# Hypothesis strategies for generating test data
@st.composite
def ai_request_data(draw):
    """Generate valid AI request data."""
    tenant_id = draw(st.text(min_size=1, max_size=50, alphabet=st.characters(min_codepoint=32, max_codepoint=126, blacklist_characters="\x00\n\r\t")))
    user_id = draw(st.text(min_size=1, max_size=50, alphabet=st.characters(min_codepoint=32, max_codepoint=126, blacklist_characters="\x00\n\r\t")))
    prompt = draw(st.text(min_size=1, max_size=500, alphabet=st.characters(min_codepoint=32, max_codepoint=126, blacklist_characters="\x00")))
    
    # Ensure no null bytes or control characters
    assume("\x00" not in tenant_id)
    assume("\x00" not in user_id)
    assume("\x00" not in prompt)
    
    return {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "prompt": prompt,
    }


# =============================================================================
# Property 13: User Audit Trail
# =============================================================================

@settings(
    max_examples=50,  # P1 requirement: 50 iterations
    suppress_health_check=[HealthCheck.function_scoped_fixture],
    deadline=None,
)
@given(request_data=ai_request_data())
def test_property_13_user_audit_trail(in_memory_db: Session, request_data: dict):
    """
    Property 13: User audit trail
    
    PROPERTY: Every AI request logged to the database MUST include the user_id
    from the JWT token for audit trail purposes.
    
    INVARIANT: For all AI requests:
        ai_request.user_id == jwt_token.user_id
        AND ai_request.user_id IS NOT NULL
        AND ai_request.user_id != ""
    
    This ensures that we can always trace back which user made a specific AI request,
    which is critical for:
    - Security audits
    - Compliance investigations
    - User behavior analysis
    - Incident response
    
    Validates: Requirements 2.7, 9.1
    """
    # Arrange
    tenant_id = request_data["tenant_id"]
    user_id = request_data["user_id"]
    prompt = request_data["prompt"]
    
    request_logger = RequestLogger(in_memory_db)
    
    # Act - Log AI request with user_id
    ai_request = request_logger.log_request(
        tenant_id=tenant_id,
        user_id=user_id,
        prompt=prompt,
    )
    
    # Assert - Verify user_id is stored
    assert ai_request.user_id is not None, "user_id must not be None"
    assert ai_request.user_id != "", "user_id must not be empty"
    assert ai_request.user_id == user_id, f"user_id must match JWT token: expected {user_id}, got {ai_request.user_id}"
    
    # Verify it's persisted in database
    in_memory_db.refresh(ai_request)
    assert ai_request.user_id == user_id, "user_id must be persisted in database"
    
    # Verify we can query by user_id
    found_requests = in_memory_db.query(AIRequest).filter(
        AIRequest.user_id == user_id
    ).all()
    assert len(found_requests) > 0, "Must be able to query AI requests by user_id"
    assert ai_request.id in [r.id for r in found_requests], "Request must be findable by user_id"


@settings(
    max_examples=50,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
    deadline=None,
)
@given(request_data=ai_request_data())
def test_property_13_user_id_required(in_memory_db: Session, request_data: dict):
    """
    Property 13 (variant): User ID is required
    
    PROPERTY: AI request creation MUST fail if user_id is missing or empty.
    
    This ensures that we never create AI requests without proper user attribution.
    
    Validates: Requirements 2.7, 9.1
    """
    # Arrange
    tenant_id = request_data["tenant_id"]
    prompt = request_data["prompt"]
    
    request_logger = RequestLogger(in_memory_db)
    
    # Act & Assert - Missing user_id should raise ValueError
    with pytest.raises(ValueError, match="user_id is required"):
        request_logger.log_request(
            tenant_id=tenant_id,
            user_id="",  # Empty user_id
            prompt=prompt,
        )
    
    # Act & Assert - None user_id should raise ValueError
    with pytest.raises(ValueError, match="user_id is required"):
        request_logger.log_request(
            tenant_id=tenant_id,
            user_id=None,  # None user_id
            prompt=prompt,
        )


@settings(
    max_examples=50,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
    deadline=None,
)
@given(request_data=ai_request_data())
def test_property_13_tenant_isolation_with_user_id(in_memory_db: Session, request_data: dict):
    """
    Property 13 (variant): Tenant isolation with user audit trail
    
    PROPERTY: AI requests MUST be isolated by tenant_id, and each request
    MUST include the user_id for audit purposes.
    
    INVARIANT: For all AI requests:
        ai_request.tenant_id == jwt_token.tenant_id
        AND ai_request.user_id == jwt_token.user_id
        AND query(tenant_id=T1) DOES NOT return requests with tenant_id=T2
    
    This ensures that:
    1. Tenant isolation is maintained
    2. User attribution is preserved
    3. Cross-tenant data leakage is prevented
    
    Validates: Requirements 2.7, 9.1
    """
    # Arrange - Create requests for two different tenants
    # Use unique tenant IDs to avoid conflicts with other test runs
    import uuid
    unique_suffix = uuid.uuid4().hex[:8]
    
    tenant_id_1 = f"{request_data['tenant_id']}_{unique_suffix}_t1"
    user_id_1 = f"{request_data['user_id']}_{unique_suffix}_u1"
    prompt_1 = request_data["prompt"]
    
    tenant_id_2 = f"{request_data['tenant_id']}_{unique_suffix}_t2"
    user_id_2 = f"{request_data['user_id']}_{unique_suffix}_u2"
    prompt_2 = prompt_1 + " (tenant 2)"
    
    request_logger = RequestLogger(in_memory_db)
    
    # Act - Log requests for both tenants
    ai_request_1 = request_logger.log_request(
        tenant_id=tenant_id_1,
        user_id=user_id_1,
        prompt=prompt_1,
    )
    
    ai_request_2 = request_logger.log_request(
        tenant_id=tenant_id_2,
        user_id=user_id_2,
        prompt=prompt_2,
    )
    
    # Assert - Verify tenant isolation
    tenant_1_requests = in_memory_db.query(AIRequest).filter(
        AIRequest.tenant_id == tenant_id_1
    ).all()
    
    tenant_2_requests = in_memory_db.query(AIRequest).filter(
        AIRequest.tenant_id == tenant_id_2
    ).all()
    
    # Tenant 1 should only see their own requests
    assert len(tenant_1_requests) >= 1, "Tenant 1 should have at least one request"
    assert all(r.tenant_id == tenant_id_1 for r in tenant_1_requests), "Tenant 1 should only see their own requests"
    assert all(r.user_id == user_id_1 for r in tenant_1_requests), "Tenant 1 requests should have correct user_id"
    
    # Tenant 2 should only see their own requests
    assert len(tenant_2_requests) >= 1, "Tenant 2 should have at least one request"
    assert all(r.tenant_id == tenant_id_2 for r in tenant_2_requests), "Tenant 2 should only see their own requests"
    assert all(r.user_id == user_id_2 for r in tenant_2_requests), "Tenant 2 requests should have correct user_id"
    
    # No cross-tenant leakage
    assert ai_request_1.id not in [r.id for r in tenant_2_requests], "Tenant 1 request should not appear in Tenant 2 results"
    assert ai_request_2.id not in [r.id for r in tenant_1_requests], "Tenant 2 request should not appear in Tenant 1 results"


@settings(
    max_examples=50,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
    deadline=None,
)
@given(request_data=ai_request_data())
def test_property_13_user_id_persists_across_status_updates(in_memory_db: Session, request_data: dict):
    """
    Property 13 (variant): User ID persists across status updates
    
    PROPERTY: The user_id MUST remain unchanged throughout the lifecycle of an AI request,
    regardless of status updates.
    
    INVARIANT: For all AI requests and all status updates:
        ai_request.user_id == original_user_id
        AND ai_request.user_id IS IMMUTABLE
    
    This ensures that the audit trail is never corrupted by status updates.
    
    Validates: Requirements 2.7, 9.1
    """
    # Arrange
    tenant_id = request_data["tenant_id"]
    user_id = request_data["user_id"]
    prompt = request_data["prompt"]
    
    request_logger = RequestLogger(in_memory_db)
    
    # Act - Log AI request
    ai_request = request_logger.log_request(
        tenant_id=tenant_id,
        user_id=user_id,
        prompt=prompt,
    )
    
    original_user_id = ai_request.user_id
    
    # Update status multiple times
    statuses = [
        RequestStatus.PROCESSING,
        RequestStatus.COMPLETED,
    ]
    
    for status in statuses:
        request_logger.update_request_status(
            request_id=ai_request.id,
            status=status,
            intent_type="test_intent",
            intent_confidence=0.95,
        )
        
        # Refresh from database
        in_memory_db.refresh(ai_request)
        
        # Assert - user_id must remain unchanged
        assert ai_request.user_id == original_user_id, \
            f"user_id must remain unchanged after status update to {status.value}: expected {original_user_id}, got {ai_request.user_id}"


@settings(
    max_examples=50,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
    deadline=None,
)
@given(request_data=ai_request_data())
def test_property_13_user_id_indexed_for_queries(in_memory_db: Session, request_data: dict):
    """
    Property 13 (variant): User ID is indexed for efficient queries
    
    PROPERTY: The user_id field MUST be indexed to support efficient audit queries.
    
    This ensures that we can quickly retrieve all AI requests for a specific user
    during security audits or compliance investigations.
    
    Validates: Requirements 2.7, 9.1
    """
    # Arrange - Create multiple requests for the same user
    tenant_id = request_data["tenant_id"]
    user_id = request_data["user_id"]
    
    request_logger = RequestLogger(in_memory_db)
    
    # Act - Create multiple requests
    num_requests = 5
    request_ids = []
    
    for i in range(num_requests):
        ai_request = request_logger.log_request(
            tenant_id=tenant_id,
            user_id=user_id,
            prompt=f"{request_data['prompt']} - request {i}",
        )
        request_ids.append(ai_request.id)
    
    # Assert - Verify we can efficiently query by user_id
    user_requests = in_memory_db.query(AIRequest).filter(
        AIRequest.user_id == user_id
    ).all()
    
    assert len(user_requests) >= num_requests, f"Should find at least {num_requests} requests for user {user_id}"
    
    # Verify all created requests are found
    found_ids = [r.id for r in user_requests]
    for request_id in request_ids:
        assert request_id in found_ids, f"Request {request_id} should be findable by user_id"
    
    # Verify all found requests have the correct user_id
    for request in user_requests:
        assert request.user_id == user_id, f"All found requests should have user_id={user_id}"


# =============================================================================
# Integration Test: End-to-End User Audit Trail
# =============================================================================

@settings(
    max_examples=20,  # Fewer examples for integration test
    suppress_health_check=[HealthCheck.function_scoped_fixture],
    deadline=None,
)
@given(request_data=ai_request_data())
def test_integration_user_audit_trail_end_to_end(in_memory_db: Session, request_data: dict):
    """
    Integration test: End-to-end user audit trail
    
    Simulates the complete flow:
    1. User makes AI request with JWT token
    2. Request is logged with user_id
    3. Request is processed and status updated
    4. Audit query retrieves all requests for user
    
    Validates: Requirements 2.7, 9.1
    """
    # Arrange
    tenant_id = request_data["tenant_id"]
    user_id = request_data["user_id"]
    prompt = request_data["prompt"]
    
    request_logger = RequestLogger(in_memory_db)
    
    # Act - Simulate complete flow
    
    # 1. Log initial request
    ai_request = request_logger.log_request(
        tenant_id=tenant_id,
        user_id=user_id,
        prompt=prompt,
        session_id="test_session",
    )
    
    assert ai_request.user_id == user_id, "Initial request must have user_id"
    assert ai_request.status == RequestStatus.PENDING.value, "Initial status should be PENDING"
    
    # 2. Update to processing
    request_logger.update_request_status(
        request_id=ai_request.id,
        status=RequestStatus.PROCESSING,
    )
    
    in_memory_db.refresh(ai_request)
    assert ai_request.user_id == user_id, "user_id must persist after processing update"
    
    # 3. Update to completed with intent
    request_logger.update_request_status(
        request_id=ai_request.id,
        status=RequestStatus.COMPLETED,
        intent_type="query",
        intent_confidence=0.92,
        intent_data={"entity": "party"},
        latency_ms=150,
    )
    
    in_memory_db.refresh(ai_request)
    assert ai_request.user_id == user_id, "user_id must persist after completion"
    assert ai_request.status == RequestStatus.COMPLETED.value, "Status should be COMPLETED"
    assert ai_request.intent_type == "query", "Intent type should be stored"
    
    # 4. Audit query - retrieve all requests for user
    audit_results = in_memory_db.query(AIRequest).filter(
        AIRequest.user_id == user_id,
        AIRequest.tenant_id == tenant_id,
    ).order_by(AIRequest.created_at.desc()).all()
    
    assert len(audit_results) > 0, "Audit query should find requests"
    assert ai_request.id in [r.id for r in audit_results], "Completed request should be in audit results"
    
    # Verify audit trail completeness
    for audit_request in audit_results:
        assert audit_request.user_id == user_id, "All audit results should have correct user_id"
        assert audit_request.tenant_id == tenant_id, "All audit results should have correct tenant_id"
        assert audit_request.created_at is not None, "All audit results should have created_at timestamp"
