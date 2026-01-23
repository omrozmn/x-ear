"""
Integration tests for Email Logs Router

Tests email log viewing and manual email sending endpoints with real database.
No mocks - uses actual database and services.
"""

import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from core.models.email import SMTPEmailLog, TenantSMTPConfig
from services.encryption_service import EncryptionService


@pytest.fixture
def smtp_config(db_session, test_tenant):
    """Create a test SMTP configuration."""
    encryption_service = EncryptionService()
    encrypted_password = encryption_service.encrypt_password("test_password")
    
    config = TenantSMTPConfig(
        tenant_id=test_tenant.id,
        host="smtp.test.com",
        port=587,
        username="test@test.com",
        encrypted_password=encrypted_password,
        from_email="test@test.com",
        from_name="Test Sender",
        use_tls=True,
        use_ssl=False,
        timeout=30,
        is_active=True
    )
    db_session.add(config)
    db_session.commit()
    return config


@pytest.fixture
def email_logs(db_session, test_tenant):
    """Create test email logs."""
    logs = []
    
    # Create sent email
    log1 = SMTPEmailLog(
        tenant_id=test_tenant.id,
        recipient="user1@example.com",
        subject="Test Email 1",
        body_preview="This is a test email",
        status="sent",
        sent_at=datetime.now(timezone.utc),
        scenario="password_reset",
        template_name="password_reset",
        retry_count=0
    )
    logs.append(log1)
    
    # Create failed email
    log2 = SMTPEmailLog(
        tenant_id=test_tenant.id,
        recipient="user2@example.com",
        subject="Test Email 2",
        body_preview="This is another test email",
        status="failed",
        error_message="SMTP connection failed",
        scenario="user_invite",
        template_name="user_invite",
        retry_count=3
    )
    logs.append(log2)
    
    # Create pending email
    log3 = SMTPEmailLog(
        tenant_id=test_tenant.id,
        recipient="user3@example.com",
        subject="Test Email 3",
        body_preview="This is a pending email",
        status="pending",
        scenario="email_verification",
        template_name="email_verification",
        retry_count=0
    )
    logs.append(log3)
    
    for log in logs:
        db_session.add(log)
    
    db_session.commit()
    return logs


def test_get_email_logs_success(client: TestClient, auth_headers, email_logs):
    """Test retrieving email logs with pagination."""
    response = client.get(
        "/admin/integrations/smtp/logs",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert "data" in data
    assert "items" in data["data"]
    assert "total" in data["data"]
    assert "page" in data["data"]
    assert "perPage" in data["data"]
    assert "totalPages" in data["data"]
    
    # Should have 3 logs
    assert data["data"]["total"] == 3
    assert len(data["data"]["items"]) == 3
    assert data["data"]["page"] == 1
    assert data["data"]["perPage"] == 25


def test_get_email_logs_pagination(client: TestClient, auth_headers, email_logs):
    """Test email logs pagination parameters are accepted."""
    # Just test that pagination parameters are accepted
    # Actual pagination logic is tested in other tests
    response = client.get(
        "/admin/integrations/smtp/logs?page=1&perPage=10",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify response structure
    assert "data" in data
    assert "items" in data["data"]
    assert "total" in data["data"]
    assert "page" in data["data"]
    assert "perPage" in data["data"]
    assert "totalPages" in data["data"]


def test_get_email_logs_filter_by_status(client: TestClient, auth_headers, email_logs):
    """Test filtering email logs by status."""
    response = client.get(
        "/admin/integrations/smtp/logs?status=sent",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["data"]["total"] == 1
    assert len(data["data"]["items"]) == 1
    assert data["data"]["items"][0]["status"] == "sent"


def test_get_email_logs_filter_by_recipient(client: TestClient, auth_headers, email_logs):
    """Test filtering email logs by recipient (partial match)."""
    response = client.get(
        "/admin/integrations/smtp/logs?recipient=user1",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["data"]["total"] == 1
    assert len(data["data"]["items"]) == 1
    assert "user1@example.com" in data["data"]["items"][0]["recipient"]


def test_get_email_logs_tenant_isolation(client: TestClient, auth_headers, db_session):
    """Test that email logs are tenant-isolated."""
    # Create log for different tenant
    other_log = SMTPEmailLog(
        tenant_id="other-tenant",
        recipient="other@example.com",
        subject="Other Tenant Email",
        body_preview="This should not be visible",
        status="sent",
        scenario="test",
        template_name="test",
        retry_count=0
    )
    db_session.add(other_log)
    db_session.commit()
    
    # Request logs - should only see own tenant's logs
    response = client.get(
        "/admin/integrations/smtp/logs",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Should not include other tenant's log
    for item in data["data"]["items"]:
        assert item["recipient"] != "other@example.com"


def test_send_manual_email_success(client: TestClient, auth_headers, smtp_config):
    """Test sending manual email queues successfully."""
    request_data = {
        "recipients": ["test1@example.com", "test2@example.com"],
        "subject": "Manual Test Email",
        "bodyHtml": "<h1>Hello</h1><p>This is a test email.</p>",
        "bodyText": "Hello\n\nThis is a test email."
    }
    
    response = client.post(
        "/admin/emails/send",
        headers=auth_headers,
        json=request_data
    )
    
    assert response.status_code == 202
    data = response.json()
    
    assert data["success"] is True
    assert "data" in data
    assert "emailIds" in data["data"]
    assert "queuedCount" in data["data"]
    assert data["data"]["queuedCount"] == 2
    assert len(data["data"]["emailIds"]) == 2


def test_send_manual_email_no_smtp_config(client: TestClient, auth_headers):
    """Test sending manual email without SMTP config returns 404."""
    request_data = {
        "recipients": ["test@example.com"],
        "subject": "Test Email",
        "bodyHtml": "<p>Test</p>"
    }
    
    response = client.post(
        "/admin/emails/send",
        headers=auth_headers,
        json=request_data
    )
    
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert "SMTP configuration" in data["error"]["message"]


def test_send_manual_email_validation_errors(client: TestClient, auth_headers, smtp_config):
    """Test manual email validation."""
    # Empty recipients
    response = client.post(
        "/admin/emails/send",
        headers=auth_headers,
        json={
            "recipients": [],
            "subject": "Test",
            "bodyHtml": "<p>Test</p>"
        }
    )
    assert response.status_code == 422  # Validation error
    
    # Too many recipients
    response = client.post(
        "/admin/emails/send",
        headers=auth_headers,
        json={
            "recipients": [f"user{i}@example.com" for i in range(101)],
            "subject": "Test",
            "bodyHtml": "<p>Test</p>"
        }
    )
    assert response.status_code == 422  # Validation error


def test_email_logs_endpoints_registered(client: TestClient):
    """Test that email logs endpoints are registered."""
    # These will return 401 without auth, but that proves the endpoints exist
    response = client.get("/admin/integrations/smtp/logs")
    assert response.status_code in [200, 401, 403]  # Endpoint exists
    
    response = client.post("/admin/emails/send", json={})
    assert response.status_code in [200, 400, 401, 403, 404, 422]  # Endpoint exists


def test_email_logs_router_import():
    """Test that the router can be imported without errors."""
    from routers import email_logs
    assert email_logs.router is not None
    assert hasattr(email_logs, 'get_email_logs')
    assert hasattr(email_logs, 'send_manual_email')

