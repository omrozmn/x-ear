"""
Unit tests for email integration Pydantic schemas.

Tests validation rules for:
- Email format validation
- Port range validation
- Timeout range validation
- Password exclusion from response schemas
- CamelCase field name serialization
"""
import pytest
from datetime import datetime, timezone
from pydantic import ValidationError

from schemas.email import (
    EmailStatus,
    SMTPConfigBase,
    SMTPConfigCreate,
    SMTPConfigUpdate,
    SMTPConfigResponse,
    SendTestEmailRequest,
    SendTestEmailResponse,
    SendEmailRequest,
    SendEmailResponse,
    EmailLogResponse,
    EmailLogListRequest,
    EmailLogListResponse,
)


class TestSMTPConfigSchemas:
    """Test SMTP configuration schemas."""

    def test_smtp_config_base_valid(self):
        """Test valid SMTP configuration."""
        config = SMTPConfigBase(
            host="smtp.example.com",
            port=465,
            username="user@example.com",
            from_email="noreply@example.com",
            from_name="X-Ear CRM",
            use_tls=False,
            use_ssl=True,
            timeout=30
        )
        assert config.host == "smtp.example.com"
        assert config.port == 465
        assert config.timeout == 30

    def test_smtp_config_invalid_email_format(self):
        """Test invalid email format is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            SMTPConfigBase(
                host="smtp.example.com",
                port=465,
                username="user@example.com",
                from_email="invalid-email",  # Invalid format
                from_name="X-Ear CRM",
            )
        assert "from_email" in str(exc_info.value)

    def test_smtp_config_invalid_port_range(self):
        """Test port range validation."""
        # Port too low
        with pytest.raises(ValidationError) as exc_info:
            SMTPConfigBase(
                host="smtp.example.com",
                port=0,  # Invalid
                username="user@example.com",
                from_email="noreply@example.com",
                from_name="X-Ear CRM",
            )
        assert "port" in str(exc_info.value)

        # Port too high
        with pytest.raises(ValidationError) as exc_info:
            SMTPConfigBase(
                host="smtp.example.com",
                port=65536,  # Invalid
                username="user@example.com",
                from_email="noreply@example.com",
                from_name="X-Ear CRM",
            )
        assert "port" in str(exc_info.value)

    def test_smtp_config_invalid_timeout_range(self):
        """Test timeout range validation."""
        # Timeout too low
        with pytest.raises(ValidationError) as exc_info:
            SMTPConfigBase(
                host="smtp.example.com",
                port=465,
                username="user@example.com",
                from_email="noreply@example.com",
                from_name="X-Ear CRM",
                timeout=4  # Invalid (< 5)
            )
        assert "timeout" in str(exc_info.value)

        # Timeout too high
        with pytest.raises(ValidationError) as exc_info:
            SMTPConfigBase(
                host="smtp.example.com",
                port=465,
                username="user@example.com",
                from_email="noreply@example.com",
                from_name="X-Ear CRM",
                timeout=121  # Invalid (> 120)
            )
        assert "timeout" in str(exc_info.value)

    def test_smtp_config_create_with_password(self):
        """Test SMTP config creation includes password."""
        config = SMTPConfigCreate(
            host="smtp.example.com",
            port=465,
            username="user@example.com",
            from_email="noreply@example.com",
            from_name="X-Ear CRM",
            password="secret123"
        )
        assert config.password == "secret123"

    def test_smtp_config_update_optional_password(self):
        """Test SMTP config update has optional password."""
        config = SMTPConfigUpdate(
            host="smtp.example.com",
            port=465,
            username="user@example.com",
            from_email="noreply@example.com",
            from_name="X-Ear CRM",
            password=None  # Optional
        )
        assert config.password is None

    def test_smtp_config_response_excludes_password(self):
        """Test password is never in response schema."""
        config = SMTPConfigResponse(
            id="config-123",
            tenant_id="tenant-456",
            host="smtp.example.com",
            port=465,
            username="user@example.com",
            from_email="noreply@example.com",
            from_name="X-Ear CRM",
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        # Serialize to dict
        config_dict = config.model_dump(by_alias=True)
        
        # Ensure password is not in serialized output
        assert "password" not in config_dict
        assert "Password" not in config_dict

    def test_smtp_config_camelcase_serialization(self):
        """Test camelCase field names in serialization."""
        config = SMTPConfigResponse(
            id="config-123",
            tenant_id="tenant-456",
            host="smtp.example.com",
            port=465,
            username="user@example.com",
            from_email="noreply@example.com",
            from_name="X-Ear CRM",
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        config_dict = config.model_dump(by_alias=True)
        
        # Check camelCase fields
        assert "tenantId" in config_dict
        assert "fromEmail" in config_dict
        assert "fromName" in config_dict
        assert "useTls" in config_dict
        assert "useSsl" in config_dict
        assert "isActive" in config_dict
        assert "createdAt" in config_dict
        assert "updatedAt" in config_dict


class TestEmailSendingSchemas:
    """Test email sending schemas."""

    def test_test_email_request_valid(self):
        """Test valid test email request."""
        request = SendTestEmailRequest(recipient="test@example.com")
        assert request.recipient == "test@example.com"

    def test_test_email_request_invalid_email(self):
        """Test invalid email format is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            SendTestEmailRequest(recipient="invalid-email")
        assert "recipient" in str(exc_info.value)

    def test_send_email_request_valid(self):
        """Test valid send email request."""
        request = SendEmailRequest(
            recipients=["user1@example.com", "user2@example.com"],
            subject="Test Email",
            body_html="<p>Hello World</p>",
            body_text="Hello World"
        )
        assert len(request.recipients) == 2
        assert request.subject == "Test Email"

    def test_send_email_request_empty_recipients(self):
        """Test empty recipients list is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            SendEmailRequest(
                recipients=[],  # Empty list
                subject="Test",
                body_html="<p>Test</p>"
            )
        assert "recipients" in str(exc_info.value)

    def test_send_email_request_too_many_recipients(self):
        """Test too many recipients is rejected."""
        recipients = [f"user{i}@example.com" for i in range(101)]  # 101 recipients
        with pytest.raises(ValidationError) as exc_info:
            SendEmailRequest(
                recipients=recipients,
                subject="Test",
                body_html="<p>Test</p>"
            )
        assert "recipients" in str(exc_info.value)

    def test_send_email_response_structure(self):
        """Test send email response structure."""
        response = SendEmailResponse(
            email_ids=["email-1", "email-2"],
            queued_count=2,
            message="Emails queued successfully"
        )
        assert len(response.email_ids) == 2
        assert response.queued_count == 2

    def test_send_email_response_camelcase(self):
        """Test camelCase serialization for send email response."""
        response = SendEmailResponse(
            email_ids=["email-1"],
            queued_count=1,
            message="Success"
        )
        response_dict = response.model_dump(by_alias=True)
        assert "emailIds" in response_dict
        assert "queuedCount" in response_dict


class TestEmailLogSchemas:
    """Test email log schemas."""

    def test_email_log_response_valid(self):
        """Test valid email log response."""
        log = EmailLogResponse(
            id="log-123",
            tenant_id="tenant-456",
            recipient="user@example.com",
            subject="Test Email",
            body_preview="Hello...",
            status=EmailStatus.SENT,
            sent_at=datetime.now(timezone.utc),
            error_message=None,
            retry_count=0,
            template_name="password_reset",
            scenario="password_reset",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        assert log.status == EmailStatus.SENT
        assert log.retry_count == 0

    def test_email_log_response_camelcase(self):
        """Test camelCase serialization for email log."""
        log = EmailLogResponse(
            id="log-123",
            tenant_id="tenant-456",
            recipient="user@example.com",
            subject="Test",
            status=EmailStatus.FAILED,
            retry_count=3,
            error_message="Connection timeout",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        log_dict = log.model_dump(by_alias=True)
        
        assert "tenantId" in log_dict
        assert "bodyPreview" in log_dict
        assert "sentAt" in log_dict
        assert "errorMessage" in log_dict
        assert "retryCount" in log_dict
        assert "templateName" in log_dict
        assert "createdAt" in log_dict
        assert "updatedAt" in log_dict

    def test_email_log_list_request_defaults(self):
        """Test email log list request defaults."""
        request = EmailLogListRequest()
        assert request.page == 1
        assert request.per_page == 25

    def test_email_log_list_request_invalid_per_page(self):
        """Test invalid per_page range is rejected."""
        # Too low
        with pytest.raises(ValidationError) as exc_info:
            EmailLogListRequest(per_page=5)  # < 10
        assert "per_page" in str(exc_info.value) or "perPage" in str(exc_info.value)

        # Too high
        with pytest.raises(ValidationError) as exc_info:
            EmailLogListRequest(per_page=101)  # > 100
        assert "per_page" in str(exc_info.value) or "perPage" in str(exc_info.value)

    def test_email_log_list_request_filters(self):
        """Test email log list request with filters."""
        request = EmailLogListRequest(
            page=2,
            per_page=50,
            status="sent",
            recipient="user@example.com",
            date_from=datetime(2025, 1, 1, tzinfo=timezone.utc),
            date_to=datetime(2025, 1, 31, tzinfo=timezone.utc)
        )
        assert request.page == 2
        assert request.per_page == 50
        assert request.status == "sent"
        assert request.recipient == "user@example.com"

    def test_email_log_list_request_camelcase(self):
        """Test camelCase serialization for list request."""
        request = EmailLogListRequest(
            page=1,
            per_page=25,
            date_from=datetime.now(timezone.utc)
        )
        request_dict = request.model_dump(by_alias=True)
        
        assert "perPage" in request_dict
        assert "dateFrom" in request_dict
        assert "dateTo" in request_dict

    def test_email_log_list_response_structure(self):
        """Test email log list response structure."""
        log1 = EmailLogResponse(
            id="log-1",
            tenant_id="tenant-1",
            recipient="user1@example.com",
            subject="Test 1",
            status=EmailStatus.SENT,
            retry_count=0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        log2 = EmailLogResponse(
            id="log-2",
            tenant_id="tenant-1",
            recipient="user2@example.com",
            subject="Test 2",
            status=EmailStatus.FAILED,
            retry_count=3,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        response = EmailLogListResponse(
            items=[log1, log2],
            total=2,
            page=1,
            per_page=25,
            total_pages=1
        )
        
        assert len(response.items) == 2
        assert response.total == 2
        assert response.total_pages == 1

    def test_email_log_list_response_camelcase(self):
        """Test camelCase serialization for list response."""
        response = EmailLogListResponse(
            items=[],
            total=0,
            page=1,
            per_page=25,
            total_pages=0
        )
        response_dict = response.model_dump(by_alias=True)
        
        assert "perPage" in response_dict
        assert "totalPages" in response_dict


class TestEmailStatus:
    """Test email status enum."""

    def test_email_status_values(self):
        """Test email status enum values."""
        assert EmailStatus.PENDING == "pending"
        assert EmailStatus.SENT == "sent"
        assert EmailStatus.FAILED == "failed"
        assert EmailStatus.BOUNCED == "bounced"

    def test_email_status_in_schema(self):
        """Test email status enum usage in schema."""
        log = EmailLogResponse(
            id="log-1",
            tenant_id="tenant-1",
            recipient="user@example.com",
            subject="Test",
            status=EmailStatus.SENT,
            retry_count=0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        assert log.status == EmailStatus.SENT
        
        # Serialization should use enum value
        log_dict = log.model_dump(by_alias=True)
        assert log_dict["status"] == "sent"
