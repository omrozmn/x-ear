"""
Property-based tests for email idempotency.

Tests idempotency key deduplication and tenant-scoped idempotency.
"""
import pytest
from datetime import datetime, timezone, timedelta
from hypothesis import given, strategies as st, settings, HealthCheck
from sqlalchemy.orm import Session

from core.models.email import SMTPEmailLog
from services.email_service import EmailService
from services.smtp_config_service import SMTPConfigService
from services.email_template_service import EmailTemplateService
from services.encryption_service import EncryptionService


# ============================================================================
# Property 21: Idempotency Key Deduplication
# ============================================================================

@settings(suppress_health_check=[HealthCheck.function_scoped_fixture], max_examples=10)
@given(
    idempotency_key=st.text(min_size=1, max_size=128, alphabet=st.characters(blacklist_categories=('Cs',))),
    recipient=st.emails(),
    scenario=st.sampled_from(["password_reset", "user_invite", "email_verification", "invoice_created", "system_error"])
)
def test_property_21_idempotency_key_deduplication(
    db_session: Session,
    idempotency_key: str,
    recipient: str,
    scenario: str
):
    """
    Property 21: Idempotency Key Deduplication
    
    **Validates: Requirements 19.1, 19.2, 19.3**
    
    **Property**: For any idempotency_key K and tenant T, calling queue_email()
    multiple times with the same K within 24 hours MUST return the same email_log_id
    and MUST NOT create duplicate email log entries.
    
    **Invariant**: 
    - First call creates new email log
    - Subsequent calls within 24h return existing email_log_id
    - No duplicate email logs created
    """
    # Setup
    tenant_id = "test_tenant_123"
    encryption_service = EncryptionService()
    smtp_config_service = SMTPConfigService(db_session, encryption_service)
    template_service = EmailTemplateService()
    email_service = EmailService(db_session, smtp_config_service, template_service)
    
    variables = {"user_name": "Test User", "reset_link": "https://example.com/reset"}
    
    # First call - should create new email log
    email_log_id_1 = email_service.queue_email(
        scenario=scenario,
        recipient=recipient,
        variables=variables,
        tenant_id=tenant_id,
        language="tr",
        idempotency_key=idempotency_key
    )
    db_session.commit()
    
    # Second call with same idempotency_key - should return same ID
    email_log_id_2 = email_service.queue_email(
        scenario=scenario,
        recipient=recipient,
        variables=variables,
        tenant_id=tenant_id,
        language="tr",
        idempotency_key=idempotency_key
    )
    db_session.commit()
    
    # Third call with same idempotency_key - should return same ID
    email_log_id_3 = email_service.queue_email(
        scenario=scenario,
        recipient=recipient,
        variables=variables,
        tenant_id=tenant_id,
        language="tr",
        idempotency_key=idempotency_key
    )
    db_session.commit()
    
    # Assertions
    assert email_log_id_1 == email_log_id_2, "Second call should return same email_log_id"
    assert email_log_id_1 == email_log_id_3, "Third call should return same email_log_id"
    
    # Verify only one email log entry exists
    email_logs = db_session.query(SMTPEmailLog).filter(
        SMTPEmailLog.tenant_id == tenant_id,
        SMTPEmailLog.idempotency_key == idempotency_key
    ).all()
    
    assert len(email_logs) == 1, f"Expected 1 email log, found {len(email_logs)}"
    assert email_logs[0].id == email_log_id_1, "Email log ID should match first call"


# ============================================================================
# Property 22: Tenant-Scoped Idempotency
# ============================================================================

@settings(suppress_health_check=[HealthCheck.function_scoped_fixture], max_examples=10)
@given(
    idempotency_key=st.text(min_size=1, max_size=128, alphabet=st.characters(blacklist_categories=('Cs',))),
    recipient=st.emails(),
    scenario=st.sampled_from(["password_reset", "user_invite", "email_verification"])
)
def test_property_22_tenant_scoped_idempotency(
    db_session: Session,
    idempotency_key: str,
    recipient: str,
    scenario: str
):
    """
    Property 22: Tenant-Scoped Idempotency
    
    **Validates: Requirements 19.1, 19.2, 19.3**
    
    **Property**: The same idempotency_key K used by different tenants T1 and T2
    MUST create separate email log entries. Idempotency is scoped per tenant.
    
    **Invariant**:
    - Tenant T1 with key K creates email log E1
    - Tenant T2 with same key K creates email log E2
    - E1 ≠ E2 (different email_log_ids)
    - Both email logs exist independently
    """
    # Setup
    tenant_id_1 = "tenant_alpha"
    tenant_id_2 = "tenant_beta"
    
    encryption_service = EncryptionService()
    smtp_config_service = SMTPConfigService(db_session, encryption_service)
    template_service = EmailTemplateService()
    email_service = EmailService(db_session, smtp_config_service, template_service)
    
    variables = {"user_name": "Test User", "verification_link": "https://example.com/verify"}
    
    # Tenant 1 queues email with idempotency_key
    email_log_id_1 = email_service.queue_email(
        scenario=scenario,
        recipient=recipient,
        variables=variables,
        tenant_id=tenant_id_1,
        language="tr",
        idempotency_key=idempotency_key
    )
    db_session.commit()
    
    # Tenant 2 queues email with SAME idempotency_key
    email_log_id_2 = email_service.queue_email(
        scenario=scenario,
        recipient=recipient,
        variables=variables,
        tenant_id=tenant_id_2,
        language="tr",
        idempotency_key=idempotency_key
    )
    db_session.commit()
    
    # Assertions
    assert email_log_id_1 != email_log_id_2, "Different tenants should create different email logs"
    
    # Verify both email logs exist
    email_log_1 = db_session.get(SMTPEmailLog, email_log_id_1)
    email_log_2 = db_session.get(SMTPEmailLog, email_log_id_2)
    
    assert email_log_1 is not None, "Tenant 1 email log should exist"
    assert email_log_2 is not None, "Tenant 2 email log should exist"
    
    assert email_log_1.tenant_id == tenant_id_1, "Email log 1 should belong to tenant 1"
    assert email_log_2.tenant_id == tenant_id_2, "Email log 2 should belong to tenant 2"
    
    assert email_log_1.idempotency_key == idempotency_key, "Email log 1 should have idempotency_key"
    assert email_log_2.idempotency_key == idempotency_key, "Email log 2 should have idempotency_key"


# ============================================================================
# Unit Tests for Idempotency Edge Cases
# ============================================================================

def test_idempotency_expiry_after_24_hours(db_session: Session):
    """Test that idempotency expires after 24 hours."""
    tenant_id = "test_tenant_456"
    idempotency_key = "test_key_expiry"
    recipient = "test@example.com"
    scenario = "password_reset"
    
    encryption_service = EncryptionService()
    smtp_config_service = SMTPConfigService(db_session, encryption_service)
    template_service = EmailTemplateService()
    email_service = EmailService(db_session, smtp_config_service, template_service)
    
    variables = {"user_name": "Test User", "reset_link": "https://example.com/reset"}
    
    # Create first email log
    email_log_id_1 = email_service.queue_email(
        scenario=scenario,
        recipient=recipient,
        variables=variables,
        tenant_id=tenant_id,
        language="tr",
        idempotency_key=idempotency_key
    )
    db_session.commit()
    
    # Manually set created_at to 25 hours ago (beyond 24h window)
    email_log = db_session.get(SMTPEmailLog, email_log_id_1)
    email_log.created_at = datetime.now(timezone.utc) - timedelta(hours=25)
    db_session.commit()
    
    # Queue email again with same idempotency_key
    # Should create NEW email log because old one is expired
    email_log_id_2 = email_service.queue_email(
        scenario=scenario,
        recipient=recipient,
        variables=variables,
        tenant_id=tenant_id,
        language="tr",
        idempotency_key=idempotency_key
    )
    db_session.commit()
    
    # Assertions
    assert email_log_id_1 != email_log_id_2, "Should create new email log after 24h expiry"
    
    # Verify both email logs exist
    email_logs = db_session.query(SMTPEmailLog).filter(
        SMTPEmailLog.tenant_id == tenant_id,
        SMTPEmailLog.idempotency_key == idempotency_key
    ).all()
    
    assert len(email_logs) == 2, "Should have 2 email logs (expired + new)"


def test_idempotency_without_key(db_session: Session):
    """Test that emails without idempotency_key always create new logs."""
    tenant_id = "test_tenant_789"
    recipient = "test@example.com"
    scenario = "user_invite"
    
    encryption_service = EncryptionService()
    smtp_config_service = SMTPConfigService(db_session, encryption_service)
    template_service = EmailTemplateService()
    email_service = EmailService(db_session, smtp_config_service, template_service)
    
    variables = {"user_name": "Test User", "invite_link": "https://example.com/invite"}
    
    # Queue 3 emails without idempotency_key
    email_log_id_1 = email_service.queue_email(
        scenario=scenario,
        recipient=recipient,
        variables=variables,
        tenant_id=tenant_id,
        language="tr",
        idempotency_key=None
    )
    db_session.commit()
    
    email_log_id_2 = email_service.queue_email(
        scenario=scenario,
        recipient=recipient,
        variables=variables,
        tenant_id=tenant_id,
        language="tr",
        idempotency_key=None
    )
    db_session.commit()
    
    email_log_id_3 = email_service.queue_email(
        scenario=scenario,
        recipient=recipient,
        variables=variables,
        tenant_id=tenant_id,
        language="tr",
        idempotency_key=None
    )
    db_session.commit()
    
    # Assertions - all should be different
    assert email_log_id_1 != email_log_id_2, "Should create different email logs without idempotency_key"
    assert email_log_id_1 != email_log_id_3, "Should create different email logs without idempotency_key"
    assert email_log_id_2 != email_log_id_3, "Should create different email logs without idempotency_key"
    
    # Verify all 3 email logs exist
    email_logs = db_session.query(SMTPEmailLog).filter(
        SMTPEmailLog.tenant_id == tenant_id,
        SMTPEmailLog.recipient == recipient,
        SMTPEmailLog.scenario == scenario
    ).all()
    
    assert len(email_logs) == 3, "Should have 3 separate email logs"
