"""
Integration tests for Tool API Email Notifications Endpoint

Tests cover:
- AI request validation against allowlist
- Quota enforcement (100 per hour per tenant)
- Fail-safe error handling (errors don't cascade to AI)
- Audit logging with action_plan_hash

Requirements validated: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 26.1-26.7
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from core.models.email import SMTPEmailLog, TenantSMTPConfig
from routers.tool_api.email_notifications import (
    AI_EMAIL_SCENARIO_ALLOWLIST,
    _check_quota,
    _log_ai_email_request
)


# Fixtures

@pytest.fixture
def valid_ai_email_request():
    """Valid AI email notification request."""
    return {
        "scenario": "ai_proposal_created",
        "recipient": "admin@example.com",
        "variables": {
            "proposalTitle": "Create new party",
            "proposalId": "prop_123"
        },
        "language": "tr",
        "actionPlanHash": "abc123def456"
    }


@pytest.fixture
def smtp_config(db_session, test_tenant):
    """Create a test SMTP configuration."""
    from services.encryption_service import EncryptionService
    
    encryption_service = EncryptionService()
    encrypted_password = encryption_service.encrypt_password("test_password")
    
    config = TenantSMTPConfig(
        tenant_id=test_tenant.id,
        host="smtp.test.com",
        port=465,
        username="test@test.com",
        encrypted_password=encrypted_password,
        from_email="test@test.com",
        from_name="Test Sender",
        use_ssl=True,
        use_tls=False,
        timeout=30,
        is_active=True
    )
    db_session.add(config)
    db_session.commit()
    return config


# Unit Tests for Helper Functions

def test_check_quota_within_limit(db_session, test_tenant):
    """Test quota check when within limit (< 100 emails per hour).
    
    Validates: Requirement 26.3 - Quota enforcement
    """
    # Arrange - Create 50 AI email logs in the last hour
    for i in range(50):
        log = SMTPEmailLog(
            tenant_id=test_tenant.id,
            recipient=f"user{i}@example.com",
            subject="AI Proposal",
            status="sent",
            scenario="ai_proposal_created",
            created_at=datetime.now(timezone.utc) - timedelta(minutes=30)
        )
        db_session.add(log)
    db_session.commit()
    
    # Act
    result = _check_quota(test_tenant.id, db_session)
    
    # Assert
    assert result is True


def test_check_quota_exceeded(db_session, test_tenant):
    """Test quota check when limit exceeded (>= 100 emails per hour).
    
    Validates: Requirement 26.3 - Quota enforcement
    """
    # Arrange - Create 100 AI email logs in the last hour
    for i in range(100):
        log = SMTPEmailLog(
            tenant_id=test_tenant.id,
            recipient=f"user{i}@example.com",
            subject="AI Proposal",
            status="sent",
            scenario="ai_proposal_created",
            created_at=datetime.now(timezone.utc) - timedelta(minutes=30)
        )
        db_session.add(log)
    db_session.commit()
    
    # Act
    result = _check_quota(test_tenant.id, db_session)
    
    # Assert
    assert result is False


def test_check_quota_ignores_old_emails(db_session, test_tenant):
    """Test that quota check only counts emails from last hour.
    
    Validates: Requirement 26.3 - Quota enforcement time window
    """
    # Arrange - Create 100 AI email logs older than 1 hour
    for i in range(100):
        log = SMTPEmailLog(
            tenant_id=test_tenant.id,
            recipient=f"user{i}@example.com",
            subject="AI Proposal",
            status="sent",
            scenario="ai_proposal_created",
            created_at=datetime.now(timezone.utc) - timedelta(hours=2)
        )
        db_session.add(log)
    
    # Create 10 recent emails
    for i in range(10):
        log = SMTPEmailLog(
            tenant_id=test_tenant.id,
            recipient=f"recent{i}@example.com",
            subject="AI Proposal",
            status="sent",
            scenario="ai_proposal_created",
            created_at=datetime.now(timezone.utc) - timedelta(minutes=30)
        )
        db_session.add(log)
    db_session.commit()
    
    # Act
    result = _check_quota(test_tenant.id, db_session)
    
    # Assert - Should be within quota (only 10 recent emails count)
    assert result is True


def test_check_quota_tenant_isolation(db_session, test_tenant):
    """Test that quota check is tenant-isolated.
    
    Validates: Requirement 18.1, 18.2 - Tenant isolation
    """
    # Arrange - Create another tenant
    from core.models.tenant import Tenant
    other_tenant = Tenant(
        id='tenant-2',
        name='Other Tenant',
        slug='other-tenant',
        owner_email='other@example.com',
        billing_email='billing-other@example.com',
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(other_tenant)
    db_session.commit()
    
    # Create 100 emails for other tenant
    for i in range(100):
        log = SMTPEmailLog(
            tenant_id=other_tenant.id,
            recipient=f"user{i}@example.com",
            subject="AI Proposal",
            status="sent",
            scenario="ai_proposal_created",
            created_at=datetime.now(timezone.utc) - timedelta(minutes=30)
        )
        db_session.add(log)
    
    # Create 10 emails for test tenant
    for i in range(10):
        log = SMTPEmailLog(
            tenant_id=test_tenant.id,
            recipient=f"user{i}@example.com",
            subject="AI Proposal",
            status="sent",
            scenario="ai_proposal_created",
            created_at=datetime.now(timezone.utc) - timedelta(minutes=30)
        )
        db_session.add(log)
    db_session.commit()
    
    # Act
    result = _check_quota(test_tenant.id, db_session)
    
    # Assert - Should be within quota (only test_tenant's 10 emails count)
    assert result is True


def test_log_ai_email_request_success():
    """Test that AI email request logging doesn't raise exceptions.
    
    Validates: Requirement 26.4 - Audit logging
    """
    # Act & Assert - should not raise
    _log_ai_email_request(
        tenant_id="tenant_123",
        scenario="ai_proposal_created",
        recipient="admin@example.com",
        action_plan_hash="abc123",
        success=True
    )


def test_log_ai_email_request_with_error():
    """Test that AI email request logging handles errors gracefully.
    
    Validates: Requirement 26.4 - Audit logging with error details
    """
    # Act & Assert - should not raise even with error message
    _log_ai_email_request(
        tenant_id="tenant_123",
        scenario="ai_proposal_created",
        recipient="admin@example.com",
        action_plan_hash="abc123",
        success=False,
        error_message="SMTP connection failed"
    )


# Integration Tests

def test_ai_email_scenario_allowlist_defined():
    """Test that AI email scenario allowlist is properly defined.
    
    Validates: Requirement 26.2 - Permission allowlist
    """
    # Assert
    assert isinstance(AI_EMAIL_SCENARIO_ALLOWLIST, set)
    assert len(AI_EMAIL_SCENARIO_ALLOWLIST) > 0
    
    # Verify expected scenarios are in allowlist
    expected_scenarios = {
        "ai_proposal_created",
        "ai_execution_approval",
        "ai_action_completed",
        "ai_quota_exceeded",
        "ai_error_notification"
    }
    assert expected_scenarios.issubset(AI_EMAIL_SCENARIO_ALLOWLIST)


def test_ai_request_validated_against_allowlist(
    client: TestClient,
    auth_headers,
    db_session,
    smtp_config
):
    """Test that AI email requests are validated against scenario allowlist.
    
    Validates: Requirement 26.2 - AI request validation against allowlist
    """
    # Arrange
    invalid_request = {
        "scenario": "invalid_scenario",  # Not in allowlist
        "recipient": "admin@example.com",
        "variables": {},
        "language": "tr",
        "actionPlanHash": "abc123"
    }
    
    # Act
    response = client.post("/tool-api/email/notify", json=invalid_request, headers=auth_headers)
    
    # Assert
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert "not in AI email allowlist" in data["error"]["message"]


def test_quota_enforcement(
    client: TestClient,
    auth_headers,
    db_session,
    test_tenant,
    smtp_config,
    valid_ai_email_request
):
    """Test that quota is enforced (max 100 per hour per tenant).
    
    Validates: Requirement 26.3 - Quota enforcement
    """
    # Arrange - Create 100 AI email logs to exceed quota
    for i in range(100):
        log = SMTPEmailLog(
            tenant_id=test_tenant.id,
            recipient=f"user{i}@example.com",
            subject="AI Proposal",
            status="sent",
            scenario="ai_proposal_created",
            created_at=datetime.now(timezone.utc) - timedelta(minutes=30)
        )
        db_session.add(log)
    db_session.commit()
    
    # Act
    response = client.post("/tool-api/email/notify", json=valid_ai_email_request, headers=auth_headers)
    
    # Assert
    assert response.status_code == 429
    data = response.json()
    assert data["success"] is False
    assert "quota exceeded" in data["error"]["message"].lower()


@patch('routers.tool_api.email_notifications.EmailService')
def test_failure_doesnt_cascade_to_ai_layer(
    mock_email_service_class,
    client: TestClient,
    auth_headers,
    db_session,
    smtp_config,
    valid_ai_email_request
):
    """Test that email service failures don't cascade to AI layer.
    
    Validates: Requirement 26.6 - Fail-safe error handling
    """
    # Arrange - Mock EmailService to raise exception
    mock_email_service = Mock()
    mock_email_service.queue_email = Mock(side_effect=Exception("SMTP server down"))
    mock_email_service_class.return_value = mock_email_service
    
    # Act
    response = client.post("/tool-api/email/notify", json=valid_ai_email_request, headers=auth_headers)
    
    # Assert - should return 500 but with graceful message
    assert response.status_code == 500
    data = response.json()
    assert data["success"] is False
    # Error message should be user-friendly, not expose internals
    assert "temporarily unavailable" in data["error"]["message"].lower()
    assert "SMTP server down" not in data["error"]["message"]


@patch('routers.tool_api.email_notifications._log_ai_email_request')
def test_audit_logging_includes_action_plan_hash(
    mock_log_request,
    client: TestClient,
    auth_headers,
    db_session,
    smtp_config,
    valid_ai_email_request
):
    """Test that audit logging includes action_plan_hash.
    
    Validates: Requirement 26.4 - Audit logging with action_plan_hash
    """
    # Act
    response = client.post("/tool-api/email/notify", json=valid_ai_email_request, headers=auth_headers)
    
    # Assert
    assert response.status_code == 200
    
    # Verify audit logging was called with action_plan_hash
    assert mock_log_request.call_count >= 2  # Called at start and end
    
    # Check that action_plan_hash was passed
    calls = mock_log_request.call_args_list
    for call in calls:
        kwargs = call[1] if len(call) > 1 else call.kwargs
        assert "action_plan_hash" in kwargs
        assert kwargs["action_plan_hash"] == "abc123def456"


def test_successful_ai_email_request(
    client: TestClient,
    auth_headers,
    db_session,
    smtp_config,
    valid_ai_email_request
):
    """Test successful AI email notification request.
    
    Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5
    """
    # Act
    response = client.post("/tool-api/email/notify", json=valid_ai_email_request, headers=auth_headers)
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "emailLogId" in data["data"]
    assert data["data"]["queued"] is True
    assert "queued successfully" in data["data"]["message"].lower()
    
    # Verify email log was created in database
    email_log = db_session.query(SMTPEmailLog).filter_by(
        id=data["data"]["emailLogId"]
    ).first()
    assert email_log is not None
    assert email_log.scenario == "ai_proposal_created"
    assert email_log.recipient == "admin@example.com"
    assert email_log.status == "pending"


def test_missing_required_fields_returns_422(
    client: TestClient,
    auth_headers,
    db_session
):
    """Test that missing required fields returns 422 validation error.
    
    Validates: Requirement 26.2 - Request validation
    """
    # Arrange
    invalid_request = {
        "scenario": "ai_proposal_created",
        # Missing recipient, variables, actionPlanHash
    }
    
    # Act
    response = client.post("/tool-api/email/notify", json=invalid_request, headers=auth_headers)
    
    # Assert
    assert response.status_code == 422  # Pydantic validation error


def test_invalid_email_format_returns_422(
    client: TestClient,
    auth_headers,
    db_session
):
    """Test that invalid email format returns 422 validation error.
    
    Validates: Requirement 26.2 - Email format validation
    """
    # Arrange
    invalid_request = {
        "scenario": "ai_proposal_created",
        "recipient": "not-an-email",  # Invalid email format
        "variables": {},
        "language": "tr",
        "actionPlanHash": "abc123"
    }
    
    # Act
    response = client.post("/tool-api/email/notify", json=invalid_request, headers=auth_headers)
    
    # Assert
    assert response.status_code == 422  # Pydantic validation error


def test_ai_email_uses_background_task(
    client: TestClient,
    auth_headers,
    db_session,
    smtp_config,
    valid_ai_email_request
):
    """Test that email is queued as background task (async).
    
    Validates: Requirement 3.1 - Asynchronous email sending
    """
    # Act
    response = client.post("/tool-api/email/notify", json=valid_ai_email_request, headers=auth_headers)
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    
    # Email should be queued (status=pending), not sent immediately
    email_log = db_session.query(SMTPEmailLog).filter_by(
        id=data["data"]["emailLogId"]
    ).first()
    assert email_log.status == "pending"
    assert email_log.sent_at is None


def test_ai_email_respects_tenant_isolation(
    client: TestClient,
    auth_headers,
    db_session,
    test_tenant,
    smtp_config,
    valid_ai_email_request
):
    """Test that AI emails respect tenant isolation.
    
    Validates: Requirement 18.1, 18.2 - Tenant isolation
    """
    # Act
    response = client.post("/tool-api/email/notify", json=valid_ai_email_request, headers=auth_headers)
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    
    # Verify email log has correct tenant_id
    email_log = db_session.query(SMTPEmailLog).filter_by(
        id=data["data"]["emailLogId"]
    ).first()
    assert email_log.tenant_id == test_tenant.id


def test_ai_email_with_all_scenarios(
    client: TestClient,
    auth_headers,
    db_session,
    smtp_config
):
    """Test that all AI scenarios in allowlist work correctly.
    
    Validates: Requirement 26.2 - All allowlisted scenarios
    """
    # Test each scenario in the allowlist
    for scenario in AI_EMAIL_SCENARIO_ALLOWLIST:
        request = {
            "scenario": scenario,
            "recipient": "admin@example.com",
            "variables": {"test": "value"},
            "language": "tr",
            "actionPlanHash": f"hash_{scenario}"
        }
        
        response = client.post("/tool-api/email/notify", json=request, headers=auth_headers)
        
        # All allowlisted scenarios should succeed
        assert response.status_code == 200, f"Scenario {scenario} failed"
        data = response.json()
        assert data["success"] is True


def test_ai_email_without_smtp_config_uses_fallback(
    client: TestClient,
    auth_headers,
    db_session,
    test_tenant,
    valid_ai_email_request
):
    """Test that AI email works without tenant SMTP config (uses global fallback).
    
    Validates: Requirement 1.3 - Global fallback configuration
    """
    # Note: No smtp_config fixture, so no tenant-specific config exists
    
    # Act
    response = client.post("/tool-api/email/notify", json=valid_ai_email_request, headers=auth_headers)
    
    # Assert - Should still succeed using global fallback
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["queued"] is True
