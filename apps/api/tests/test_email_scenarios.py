"""Integration tests for email scenario integrations"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from services.email_scenario_service import EmailScenarioService
from core.models.email import SMTPEmailLog


class TestEmailScenarios:
    """Test email scenario integrations."""
    
    @pytest.fixture
    def email_scenario_service(self, db_session: Session):
        """Create email scenario service instance."""
        return EmailScenarioService(db_session)
    
    @pytest.fixture
    def background_tasks(self):
        """Create mock background tasks."""
        return Mock(spec=BackgroundTasks)
    
    def test_send_password_reset_email(
        self,
        email_scenario_service: EmailScenarioService,
        background_tasks: Mock,
        db_session: Session
    ):
        """Test password reset email triggers email sending."""
        # Arrange
        recipient = "user@example.com"
        user_name = "Test User"
        reset_link = "https://app.x-ear.com/reset-password?token=abc123"
        tenant_id = "tenant_123"
        
        # Act
        email_scenario_service.send_password_reset_email(
            background_tasks=background_tasks,
            recipient=recipient,
            user_name=user_name,
            reset_link=reset_link,
            tenant_id=tenant_id,
            language="tr",
            expires_in_hours=1
        )
        
        # Assert
        # Check that email was queued
        email_log = db_session.query(SMTPEmailLog).filter_by(
            recipient=recipient,
            scenario="password_reset"
        ).first()
        
        assert email_log is not None
        assert email_log.tenant_id == tenant_id
        assert email_log.status == "pending"
        assert email_log.template_name == "password_reset"
        
        # Check that background task was added
        background_tasks.add_task.assert_called_once()
        call_args = background_tasks.add_task.call_args
        assert call_args[1]["scenario"] == "password_reset"
        assert call_args[1]["recipient"] == recipient
        assert call_args[1]["tenant_id"] == tenant_id
    
    def test_send_user_invite_email(
        self,
        email_scenario_service: EmailScenarioService,
        background_tasks: Mock,
        db_session: Session
    ):
        """Test user invite email triggers email sending."""
        # Arrange
        recipient = "newuser@example.com"
        inviter_name = "Admin User"
        organization_name = "Test Org"
        invitation_link = "https://app.x-ear.com/invite?token=xyz789"
        role_name = "Staff"
        tenant_id = "tenant_123"
        
        # Act
        email_scenario_service.send_user_invite_email(
            background_tasks=background_tasks,
            recipient=recipient,
            inviter_name=inviter_name,
            organization_name=organization_name,
            invitation_link=invitation_link,
            role_name=role_name,
            tenant_id=tenant_id,
            language="tr"
        )
        
        # Assert
        email_log = db_session.query(SMTPEmailLog).filter_by(
            recipient=recipient,
            scenario="user_invite"
        ).first()
        
        assert email_log is not None
        assert email_log.tenant_id == tenant_id
        assert email_log.status == "pending"
        assert email_log.template_name == "user_invite"
        
        background_tasks.add_task.assert_called_once()
        call_args = background_tasks.add_task.call_args
        assert call_args[1]["scenario"] == "user_invite"
        assert call_args[1]["variables"]["inviter_name"] == inviter_name
        assert call_args[1]["variables"]["organization_name"] == organization_name
    
    def test_send_email_verification_email(
        self,
        email_scenario_service: EmailScenarioService,
        background_tasks: Mock,
        db_session: Session
    ):
        """Test email verification email triggers email sending."""
        # Arrange
        recipient = "verify@example.com"
        user_name = "New User"
        verification_link = "https://app.x-ear.com/verify?token=verify123"
        tenant_id = "tenant_123"
        
        # Act
        email_scenario_service.send_email_verification_email(
            background_tasks=background_tasks,
            recipient=recipient,
            user_name=user_name,
            verification_link=verification_link,
            tenant_id=tenant_id,
            language="tr"
        )
        
        # Assert
        email_log = db_session.query(SMTPEmailLog).filter_by(
            recipient=recipient,
            scenario="email_verification"
        ).first()
        
        assert email_log is not None
        assert email_log.tenant_id == tenant_id
        assert email_log.status == "pending"
        assert email_log.template_name == "email_verification"
        
        background_tasks.add_task.assert_called_once()
    
    def test_send_invoice_created_email(
        self,
        email_scenario_service: EmailScenarioService,
        background_tasks: Mock,
        db_session: Session
    ):
        """Test invoice creation email triggers email sending."""
        # Arrange
        recipient = "customer@example.com"
        invoice_number = "INV-2025-001"
        amount = "1500.00"
        currency = "TRY"
        due_date = "2025-02-15"
        invoice_link = "https://app.x-ear.com/invoices/inv_123"
        tenant_id = "tenant_123"
        
        # Act
        email_scenario_service.send_invoice_created_email(
            background_tasks=background_tasks,
            recipient=recipient,
            invoice_number=invoice_number,
            amount=amount,
            currency=currency,
            due_date=due_date,
            invoice_link=invoice_link,
            tenant_id=tenant_id,
            language="tr"
        )
        
        # Assert
        email_log = db_session.query(SMTPEmailLog).filter_by(
            recipient=recipient,
            scenario="invoice_created"
        ).first()
        
        assert email_log is not None
        assert email_log.tenant_id == tenant_id
        assert email_log.status == "pending"
        assert email_log.template_name == "invoice_created"
        
        background_tasks.add_task.assert_called_once()
        call_args = background_tasks.add_task.call_args
        assert call_args[1]["variables"]["invoice_number"] == invoice_number
        assert call_args[1]["variables"]["amount"] == amount
    
    def test_send_system_error_email(
        self,
        email_scenario_service: EmailScenarioService,
        background_tasks: Mock,
        db_session: Session
    ):
        """Test system error email triggers email to admins."""
        # Arrange
        admin_emails = ["admin1@example.com", "admin2@example.com"]
        error_type = "DatabaseConnectionError"
        timestamp = "2025-01-25T10:30:00Z"
        tenant_name = "Test Tenant"
        error_details = "Connection to database failed after 3 retries"
        admin_link = "https://admin.x-ear.com/errors/err_123"
        tenant_id = "tenant_123"
        
        # Act
        email_scenario_service.send_system_error_email(
            background_tasks=background_tasks,
            admin_emails=admin_emails,
            error_type=error_type,
            timestamp=timestamp,
            tenant_name=tenant_name,
            error_details=error_details,
            admin_link=admin_link,
            tenant_id=tenant_id,
            language="tr"
        )
        
        # Assert
        # Should create one email log per admin
        email_logs = db_session.query(SMTPEmailLog).filter_by(
            scenario="system_error",
            tenant_id=tenant_id
        ).all()
        
        assert len(email_logs) == 2
        assert email_logs[0].recipient in admin_emails
        assert email_logs[1].recipient in admin_emails
        
        # Should add one background task per admin
        assert background_tasks.add_task.call_count == 2
    
    def test_email_failure_does_not_raise(
        self,
        email_scenario_service: EmailScenarioService,
        background_tasks: Mock,
        db_session: Session
    ):
        """Test that email failures don't cascade to business logic."""
        # Arrange
        recipient = "user@example.com"
        
        # Mock email service to raise exception
        with patch.object(
            email_scenario_service.email_service,
            'queue_email',
            side_effect=Exception("SMTP server unavailable")
        ):
            # Act - should not raise
            email_scenario_service.send_password_reset_email(
                background_tasks=background_tasks,
                recipient=recipient,
                user_name="Test User",
                reset_link="https://example.com/reset",
                tenant_id="tenant_123"
            )
        
        # Assert - no exception raised, business logic continues
        # Background task should not be added since queue_email failed
        background_tasks.add_task.assert_not_called()

