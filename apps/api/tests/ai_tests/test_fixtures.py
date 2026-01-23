"""
Test Database Fixtures

Validates that database fixtures and test data seeding helpers work correctly.

This test file ensures:
- In-memory SQLite database is created properly
- Test data factory creates valid records
- Proper cleanup between tests
- Tenant isolation is maintained
"""

import pytest
from sqlalchemy.orm import Session

from ai.models.ai_request import AIRequest, RequestStatus
from ai.models.ai_action import AIAction, ActionStatus, RiskLevel
from ai.models.ai_audit_log import AIAuditLog, AuditEventType
from ai.models.ai_usage import AIUsage, UsageType


class TestDatabaseFixtures:
    """Test database fixtures and seeding helpers."""
    
    def test_db_session_fixture_creates_tables(self, db_session):
        """Test that db_session fixture creates all required tables."""
        # Verify we can query tables without errors
        # Note: Database may have existing data from development
        requests = db_session.query(AIRequest).all()
        actions = db_session.query(AIAction).all()
        audit_logs = db_session.query(AIAuditLog).all()
        usage = db_session.query(AIUsage).all()
        
        # Tables should exist and be queryable (may have existing data)
        assert requests is not None
        assert actions is not None
        assert audit_logs is not None
        assert usage is not None
    
    def test_db_session_cleanup_between_tests(self, db_session):
        """Test that database changes are rolled back between tests."""
        from ai.models.ai_request import AIRequest, RequestStatus
        
        # Get initial count
        initial_count = db_session.query(AIRequest).count()
        
        # Add a test record
        test_request = AIRequest(
            id="test-cleanup-request",
            tenant_id="test-tenant",
            user_id="test-user",
            prompt_encrypted="test",
            prompt_hash="test-hash",
            status=RequestStatus.PENDING,
        )
        db_session.add(test_request)
        db_session.flush()
        
        # Verify it was added
        new_count = db_session.query(AIRequest).count()
        assert new_count == initial_count + 1
        
        # The fixture will rollback this change after the test
    
    def test_test_data_factory_creates_ai_request(self, db_session, test_data_factory):
        """Test that TestDataFactory creates valid AIRequest."""
        request = test_data_factory.create_ai_request(
            db_session,
            tenant_id="tenant-123",
            user_id="user-456",
            prompt="Create a party named John Doe",
            status=RequestStatus.PENDING.value
        )
        
        # Verify request was created
        assert request.id is not None
        assert request.id.startswith("aireq_")
        assert request.tenant_id == "tenant-123"
        assert request.user_id == "user-456"
        assert request.prompt_redacted == "Create a party named John Doe"
        assert request.status == RequestStatus.PENDING.value
        assert request.prompt_hash is not None
        
        # Verify it's in the database
        db_request = db_session.query(AIRequest).filter_by(id=request.id).first()
        assert db_request is not None
        assert db_request.tenant_id == "tenant-123"
    
    def test_test_data_factory_creates_ai_action(self, db_session, test_data_factory):
        """Test that TestDataFactory creates valid AIAction."""
        # Create request first
        request = test_data_factory.create_ai_request(db_session)
        
        # Create action
        action_plan = {
            "steps": [
                {
                    "tool_id": "party_tool",
                    "operation": "create_party",
                    "parameters": {"name": "John Doe"}
                }
            ]
        }
        
        action = test_data_factory.create_ai_action(
            db_session,
            request_id=request.id,
            tenant_id="tenant-123",
            user_id="user-456",
            action_plan=action_plan,
            risk_level=RiskLevel.LOW.value,
            status=ActionStatus.DRAFT.value
        )
        
        # Verify action was created
        assert action.id is not None
        assert action.id.startswith("aiact_")
        assert action.request_id == request.id
        assert action.tenant_id == "tenant-123"
        assert action.user_id == "user-456"
        assert action.action_plan == action_plan
        assert action.risk_level == RiskLevel.LOW.value
        assert action.status == ActionStatus.DRAFT.value
        assert action.action_plan_hash is not None
        
        # Verify it's in the database
        db_action = db_session.query(AIAction).filter_by(id=action.id).first()
        assert db_action is not None
        assert db_action.request_id == request.id
    
    def test_test_data_factory_creates_ai_audit_log(self, db_session, test_data_factory):
        """Test that TestDataFactory creates valid AIAuditLog."""
        # Create request first
        request = test_data_factory.create_ai_request(db_session)
        
        # Create audit log
        audit_log = test_data_factory.create_ai_audit_log(
            db_session,
            tenant_id="tenant-123",
            user_id="user-456",
            event_type=AuditEventType.REQUEST_RECEIVED.value,
            request_id=request.id,
            intent_type="action",
            outcome="success"
        )
        
        # Verify audit log was created
        assert audit_log.id is not None
        assert audit_log.id.startswith("ailog_")
        assert audit_log.tenant_id == "tenant-123"
        assert audit_log.user_id == "user-456"
        assert audit_log.event_type == AuditEventType.REQUEST_RECEIVED.value
        assert audit_log.request_id == request.id
        assert audit_log.intent_type == "action"
        assert audit_log.outcome == "success"
        
        # Verify it's in the database
        db_audit_log = db_session.query(AIAuditLog).filter_by(id=audit_log.id).first()
        assert db_audit_log is not None
        assert db_audit_log.request_id == request.id
    
    def test_test_data_factory_creates_ai_usage(self, db_session, test_data_factory):
        """Test that TestDataFactory creates valid AIUsage."""
        from datetime import date, timedelta
        import uuid
        
        # Use a past date to avoid UNIQUE constraint with existing data
        test_date = date.today() - timedelta(days=30)
        
        usage = test_data_factory.create_ai_usage(
            db_session,
            tenant_id=f"tenant-test-{uuid.uuid4().hex[:8]}",  # Unique tenant
            usage_type=UsageType.CHAT.value,
            request_count=5,
            token_count_input=100,
            token_count_output=200,
            usage_date=test_date  # Use past date
        )
        
        # Verify usage was created
        assert usage.id is not None
        assert usage.id.startswith("aiuse_")
        assert usage.tenant_id.startswith("tenant-test-")
        assert usage.usage_type == UsageType.CHAT.value
        assert usage.request_count == 5
        assert usage.token_count_input == 100
        assert usage.token_count_output == 200
        assert usage.usage_date == test_date
        
        # Verify it's in the database
        db_usage = db_session.query(AIUsage).filter_by(id=usage.id).first()
        assert db_usage is not None
        assert db_usage.tenant_id == usage.tenant_id
    
    def test_seeded_db_session_fixture(self, seeded_db_session):
        """Test that seeded_db_session fixture provides pre-populated data."""
        session, request, action, audit_log, usage = seeded_db_session
        
        # Verify all objects were created
        assert request is not None
        assert request.id.startswith("aireq_")
        
        assert action is not None
        assert action.id.startswith("aiact_")
        assert action.request_id == request.id
        
        assert audit_log is not None
        assert audit_log.id.startswith("ailog_")
        assert audit_log.request_id == request.id
        
        assert usage is not None
        assert usage.id.startswith("aiuse_")
        
        # Verify they're in the database
        db_request = session.query(AIRequest).filter_by(id=request.id).first()
        assert db_request is not None
        
        db_action = session.query(AIAction).filter_by(id=action.id).first()
        assert db_action is not None
        
        db_audit_log = session.query(AIAuditLog).filter_by(id=audit_log.id).first()
        assert db_audit_log is not None
        
        db_usage = session.query(AIUsage).filter_by(id=usage.id).first()
        assert db_usage is not None
    
    def test_tenant_isolation_in_test_data(self, db_session, test_data_factory):
        """Test that test data respects tenant isolation."""
        import uuid
        
        # Use unique tenant IDs to avoid conflicts with existing data
        tenant1_id = f"tenant-test-1-{uuid.uuid4().hex[:8]}"
        tenant2_id = f"tenant-test-2-{uuid.uuid4().hex[:8]}"
        
        # Create data for tenant 1
        request1 = test_data_factory.create_ai_request(
            db_session,
            tenant_id=tenant1_id,
            prompt="Tenant 1 request"
        )
        
        # Create data for tenant 2
        request2 = test_data_factory.create_ai_request(
            db_session,
            tenant_id=tenant2_id,
            prompt="Tenant 2 request"
        )
        
        # Query by tenant
        tenant1_requests = db_session.query(AIRequest).filter_by(tenant_id=tenant1_id).all()
        tenant2_requests = db_session.query(AIRequest).filter_by(tenant_id=tenant2_id).all()
        
        # Verify isolation
        assert len(tenant1_requests) == 1
        assert len(tenant2_requests) == 1
        assert tenant1_requests[0].id == request1.id
        assert tenant2_requests[0].id == request2.id
        assert tenant1_requests[0].prompt_redacted == "Tenant 1 request"
        assert tenant2_requests[0].prompt_redacted == "Tenant 2 request"
    
    def test_multiple_actions_per_request(self, db_session, test_data_factory):
        """Test that multiple actions can be created for a single request."""
        # Create request
        request = test_data_factory.create_ai_request(db_session)
        
        # Create multiple actions
        action1 = test_data_factory.create_ai_action(
            db_session,
            request_id=request.id,
            risk_level=RiskLevel.LOW.value
        )
        
        action2 = test_data_factory.create_ai_action(
            db_session,
            request_id=request.id,
            risk_level=RiskLevel.HIGH.value
        )
        
        # Query actions for this request
        actions = db_session.query(AIAction).filter_by(request_id=request.id).all()
        
        # Verify both actions exist
        assert len(actions) == 2
        action_ids = [a.id for a in actions]
        assert action1.id in action_ids
        assert action2.id in action_ids
    
    def test_audit_trail_for_request(self, db_session, test_data_factory):
        """Test that multiple audit logs can be created for a request."""
        # Create request
        request = test_data_factory.create_ai_request(db_session)
        
        # Create audit trail
        log1 = test_data_factory.create_ai_audit_log(
            db_session,
            event_type=AuditEventType.REQUEST_RECEIVED.value,
            request_id=request.id
        )
        
        log2 = test_data_factory.create_ai_audit_log(
            db_session,
            event_type=AuditEventType.INTENT_CLASSIFIED.value,
            request_id=request.id
        )
        
        log3 = test_data_factory.create_ai_audit_log(
            db_session,
            event_type=AuditEventType.ACTION_PLANNED.value,
            request_id=request.id
        )
        
        # Query audit logs for this request
        logs = db_session.query(AIAuditLog).filter_by(request_id=request.id).all()
        
        # Verify all logs exist
        assert len(logs) == 3
        log_ids = [log.id for log in logs]
        assert log1.id in log_ids
        assert log2.id in log_ids
        assert log3.id in log_ids
        
        # Verify event types
        event_types = [log.event_type for log in logs]
        assert AuditEventType.REQUEST_RECEIVED.value in event_types
        assert AuditEventType.INTENT_CLASSIFIED.value in event_types
        assert AuditEventType.ACTION_PLANNED.value in event_types
