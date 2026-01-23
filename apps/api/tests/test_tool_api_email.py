"""
Integration tests for Tool API Email Notifications Endpoint

Tests cover:
- AI request validation against allowlist
- Quota enforcement (100 per hour per tenant)
- Fail-safe error handling (errors don't cascade to AI)
- Audit logging with action_plan_hash
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from core.models.email import SMTPEmailLog
from routers.tool_api.email_notifications import (
    AI_EMAIL_SCENARIO_ALLOWLIST,
    _check_quota,
    _log_ai_email_request
)


# Fixtures

@pytest.fixture
def mock_db():
    """Mock database session."""
    db = Mock(spec=Session)
    db.add = Mock()
    db.flush = Mock()
    db.commit = Mock()
    db.close = Mock()
    db.query = Mock()
    return db


@pytest.fixture
def mock_current_user():
    """Mock authenticated user."""
    user = Mock()
    user.tenant_id = "tenant_123"
    user.id = "user_123"
    user.email = "admin@example.com"
    return user


@pytest.fixture
def valid_ai_email_request():
    """Valid AI email notification request."""
    return {
        "scenario": "ai_proposal_created",
        "recipient": "admin@example.com",
        "variables": {
            "proposal_title": "Create new party",
            "proposal_id": "prop_123"
        },
        "language": "tr",
        "actionPlanHash": "abc123def456"
    }


# Unit Tests for Helper Functions

def test_check_quota_within_limit(mock_db):
    """Test quota check when within limit (< 100 emails per hour)."""
    # Arrange
    tenant_id = "tenant_123"
    
    # Mock query to return 50 emails in last hour
    mock_query = Mock()
    mock_query.filter = Mock(return_value=mock_query)
    mock_query.scalar = Mock(return_value=50)
    mock_db.query = Mock(return_value=mock_query)
    
    # Act
    result = _check_quota(tenant_id, mock_db)
    
    # Assert
    assert result is True


def test_check_quota_exceeded(mock_db):
    """Test quota check when limit exceeded (>= 100 emails per hour)."""
    # Arrange
    tenant_id = "tenant_123"
    
    # Mock query to return 100 emails in last hour
    mock_query = Mock()
    mock_query.filter = Mock(return_value=mock_query)
    mock_query.scalar = Mock(return_value=100)
    mock_db.query = Mock(return_value=mock_query)
    
    # Act
    result = _check_quota(tenant_id, mock_db)
    
    # Assert
    assert result is False


def test_log_ai_email_request_success():
    """Test that AI email request logging doesn't raise exceptions."""
    # Act & Assert - should not raise
    _log_ai_email_request(
        tenant_id="tenant_123",
        scenario="ai_proposal_created",
        recipient="admin@example.com",
        action_plan_hash="abc123",
        success=True
    )


def test_log_ai_email_request_with_error():
    """Test that AI email request logging handles errors gracefully."""
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

def test_tool_api_email_endpoint_registered(client: TestClient):
    """Test that Tool API email endpoint is registered."""
    # This will return 401 without auth, but proves endpoint exists
    response = client.post("/tool-api/email/notify", json={})
    assert response.status_code in [200, 400, 401, 403, 422]


def test_tool_api_email_router_import():
    """Test that the Tool API router can be imported without errors."""
    from routers.tool_api import email_notifications
    assert email_notifications.router is not None
    assert hasattr(email_notifications, 'send_ai_email_notification')


@patch('routers.tool_api.email_notifications.EmailService')
@patch('routers.tool_api.email_notifications._check_quota')
def test_ai_request_validated_against_allowlist(
    mock_check_quota,
    mock_email_service_class,
    client: TestClient,
    auth_headers
):
    """Test that AI email requests are validated against scenario allowlist."""
    # Arrange
    mock_check_quota.return_value = True
    
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


@patch('routers.tool_api.email_notifications._check_quota')
def test_quota_enforcement(
    mock_check_quota,
    client: TestClient,
    auth_headers,
    valid_ai_email_request
):
    """Test that quota is enforced (max 100 per hour per tenant)."""
    # Arrange
    mock_check_quota.return_value = False  # Quota exceeded
    
    # Act
    response = client.post("/tool-api/email/notify", json=valid_ai_email_request, headers=auth_headers)
    
    # Assert
    assert response.status_code == 429
    data = response.json()
    assert data["success"] is False
    assert "quota exceeded" in data["error"]["message"].lower()


@patch('routers.tool_api.email_notifications.EmailService')
@patch('routers.tool_api.email_notifications._check_quota')
def test_failure_doesnt_cascade_to_ai_layer(
    mock_check_quota,
    mock_email_service_class,
    client: TestClient,
    auth_headers,
    valid_ai_email_request
):
    """Test that email service failures don't cascade to AI layer."""
    # Arrange
    mock_check_quota.return_value = True
    
    # Mock EmailService to raise exception
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


@patch('routers.tool_api.email_notifications.EmailService')
@patch('routers.tool_api.email_notifications._check_quota')
@patch('routers.tool_api.email_notifications._log_ai_email_request')
def test_audit_logging_includes_action_plan_hash(
    mock_log_request,
    mock_check_quota,
    mock_email_service_class,
    client: TestClient,
    auth_headers,
    valid_ai_email_request
):
    """Test that audit logging includes action_plan_hash."""
    # Arrange
    mock_check_quota.return_value = True
    
    mock_email_service = Mock()
    mock_email_service.queue_email = Mock(return_value="email_log_123")
    mock_email_service_class.return_value = mock_email_service
    
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


@patch('routers.tool_api.email_notifications.EmailService')
@patch('routers.tool_api.email_notifications._check_quota')
def test_successful_ai_email_request(
    mock_check_quota,
    mock_email_service_class,
    client: TestClient,
    auth_headers,
    valid_ai_email_request
):
    """Test successful AI email notification request."""
    # Arrange
    mock_check_quota.return_value = True
    
    mock_email_service = Mock()
    mock_email_service.queue_email = Mock(return_value="email_log_123")
    mock_email_service_class.return_value = mock_email_service
    
    # Act
    response = client.post("/tool-api/email/notify", json=valid_ai_email_request, headers=auth_headers)
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["emailLogId"] == "email_log_123"
    assert data["data"]["queued"] is True
    assert "queued successfully" in data["data"]["message"].lower()


def test_ai_email_scenario_allowlist_defined():
    """Test that AI email scenario allowlist is properly defined."""
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


@patch('routers.tool_api.email_notifications.get_current_user')
@patch('routers.tool_api.email_notifications.get_db')
@patch('routers.tool_api.email_notifications.EmailService')
@patch('routers.tool_api.email_notifications._check_quota')
def test_background_task_added_for_email_sending(
    mock_check_quota,
    mock_email_service_class,
    mock_get_db,
    mock_get_current_user,
    client: TestClient,
    mock_current_user,
    mock_db,
    valid_ai_email_request
):
    """Test that background task is added for async email sending."""
    # Arrange
    mock_get_current_user.return_value = mock_current_user
    mock_get_db.return_value = mock_db
    mock_check_quota.return_value = True
    
    mock_email_service = Mock()
    mock_email_service.queue_email = Mock(return_value="email_log_123")
    mock_email_service.send_email_task = Mock()
    mock_email_service_class.return_value = mock_email_service
    
    # Act
    response = client.post("/tool-api/email/notify", json=valid_ai_email_request)
    
    # Assert
    assert response.status_code == 200
    # Email should be queued (background task added)
    mock_email_service.queue_email.assert_called_once()


@patch('routers.tool_api.email_notifications.get_current_user')
@patch('routers.tool_api.email_notifications.get_db')
@patch('routers.tool_api.email_notifications._check_quota')
def test_missing_required_fields_returns_422(
    mock_check_quota,
    mock_get_db,
    mock_get_current_user,
    client: TestClient,
    mock_current_user,
    mock_db
):
    """Test that missing required fields returns 422 validation error."""
    # Arrange
    mock_get_current_user.return_value = mock_current_user
    mock_get_db.return_value = mock_db
    
    invalid_request = {
        "scenario": "ai_proposal_created",
        # Missing recipient, variables, actionPlanHash
    }
    
    # Act
    response = client.post("/tool-api/email/notify", json=invalid_request)
    
    # Assert
    assert response.status_code == 422  # Pydantic validation error


@patch('routers.tool_api.email_notifications.get_current_user')
@patch('routers.tool_api.email_notifications.get_db')
@patch('routers.tool_api.email_notifications._check_quota')
def test_invalid_email_format_returns_422(
    mock_check_quota,
    mock_get_db,
    mock_get_current_user,
    client: TestClient,
    mock_current_user,
    mock_db
):
    """Test that invalid email format returns 422 validation error."""
    # Arrange
    mock_get_current_user.return_value = mock_current_user
    mock_get_db.return_value = mock_db
    
    invalid_request = {
        "scenario": "ai_proposal_created",
        "recipient": "not-an-email",  # Invalid email format
        "variables": {},
        "language": "tr",
        "actionPlanHash": "abc123"
    }
    
    # Act
    response = client.post("/tool-api/email/notify", json=invalid_request)
    
    # Assert
    assert response.status_code == 422  # Pydantic validation error
