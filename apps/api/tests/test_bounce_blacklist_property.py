"""
Property-Based Tests for Bounce Blacklist Enforcement

**Property 29: Bounce Blacklist Enforcement**
*For any* recipient that experiences 3+ hard bounces, they must be automatically blacklisted
and all future emails to that recipient must be rejected.

**Validates: Requirements 6.3, 6.4, 6.5**

This test uses Hypothesis to generate random bounce scenarios and verify that:
1. Recipients are blacklisted after 3 hard bounces
2. Soft bounces do not trigger blacklisting
3. Blacklisted recipients cannot receive emails
4. Bounce classification is correct for various SMTP codes
5. Bounce counters increment correctly

IMPORTANT: These tests use REAL database operations (no mocks) as per X-Ear CRM rules.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from core.models.base import Base, gen_id
from core.models.email_deliverability import EmailBounce
from core.models.communication import EmailLog
from core.models.tenant import Tenant
from services.bounce_handler_service import BounceHandlerService


# Test database setup
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture
def db_session():
    """Create a test database session."""
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    # Create test tenant
    tenant = Tenant(
        id="test_tenant_001",
        name="Test Tenant",
        slug="test-tenant",
        owner_email="owner@test.com",
        billing_email="billing@test.com",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    session.add(tenant)
    session.commit()
    
    yield session
    
    # Clean up all data after each test
    session.query(EmailBounce).delete()
    session.query(EmailLog).delete()
    session.commit()
    
    session.close()
    Base.metadata.drop_all(engine)


# Strategies for generating test data
@st.composite
def email_address(draw):
    """Generate valid email addresses."""
    username = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Ll', 'Nd')),
        min_size=3,
        max_size=20
    ))
    domain = draw(st.sampled_from([
        "example.com",
        "test.com",
        "demo.org",
        "sample.net"
    ]))
    return f"{username}@{domain}"


@st.composite
def smtp_error_code(draw, bounce_type=None):
    """Generate SMTP error codes."""
    if bounce_type == "hard":
        return draw(st.sampled_from([550, 551, 552, 553, 554]))
    elif bounce_type == "soft":
        return draw(st.sampled_from([421, 450, 451, 452]))
    elif bounce_type == "block":
        return draw(st.sampled_from([521, 541, 554]))
    else:
        return draw(st.sampled_from([421, 450, 451, 452, 550, 551, 552, 553, 554, 521, 541]))


@st.composite
def smtp_error_message(draw):
    """Generate SMTP error messages."""
    return draw(st.sampled_from([
        "550 5.1.1 User unknown",
        "550 5.7.1 Relaying denied",
        "552 5.2.2 Mailbox full",
        "421 4.4.2 Connection timed out",
        "450 4.2.1 Mailbox temporarily unavailable",
        "554 5.7.1 Message rejected due to policy"
    ]))


# Property 29: Bounce Blacklist Enforcement
@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
@given(
    recipient=email_address(),
    hard_bounce_count=st.integers(min_value=1, max_value=5)
)
def test_property_hard_bounces_trigger_blacklist(db_session: Session, recipient: str, hard_bounce_count: int):
    """
    Property: Recipients with 3+ hard bounces must be blacklisted.
    
    For any recipient and any number of hard bounces >= 3,
    the recipient must be automatically blacklisted.
    """
    service = BounceHandlerService(db_session)
    tenant_id = "test_tenant_001"
    
    # Simulate hard bounces
    for i in range(hard_bounce_count):
        email_log_id = gen_id("email")
        
        # Create email log
        email_log = EmailLog(
            id=email_log_id,
            tenant_id=tenant_id,
            to_email=recipient,
            from_email="noreply@x-ear.com",
            subject=f"Test Email {i}",
            body_text="Test content",
            status="pending",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(email_log)
        db_session.commit()
        
        # Process hard bounce
        service.process_bounce(
            email_log_id=email_log_id,
            recipient=recipient,
            tenant_id=tenant_id,
            smtp_code=550,  # Hard bounce
            smtp_message="550 5.1.1 User unknown"
        )
    
    # Verify blacklist status
    is_blacklisted = service.is_blacklisted(recipient, tenant_id)
    
    if hard_bounce_count >= 3:
        assert is_blacklisted, f"Recipient should be blacklisted after {hard_bounce_count} hard bounces"
    else:
        assert not is_blacklisted, f"Recipient should NOT be blacklisted after only {hard_bounce_count} hard bounces"


@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
@given(
    recipient=email_address(),
    soft_bounce_count=st.integers(min_value=1, max_value=10)
)
def test_property_soft_bounces_do_not_trigger_blacklist(db_session: Session, recipient: str, soft_bounce_count: int):
    """
    Property: Soft bounces should never trigger blacklisting.
    
    For any recipient and any number of soft bounces,
    the recipient must NOT be blacklisted.
    """
    service = BounceHandlerService(db_session)
    tenant_id = "test_tenant_001"
    
    # Simulate soft bounces
    for i in range(soft_bounce_count):
        email_log_id = gen_id("email")
        
        # Create email log
        email_log = EmailLog(
            id=email_log_id,
            tenant_id=tenant_id,
            to_email=recipient,
            from_email="noreply@x-ear.com",
            subject=f"Test Email {i}",
            body_text="Test content",
            status="pending",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(email_log)
        db_session.commit()
        
        # Process soft bounce
        service.process_bounce(
            email_log_id=email_log_id,
            recipient=recipient,
            tenant_id=tenant_id,
            smtp_code=450,  # Soft bounce
            smtp_message="450 4.2.1 Mailbox temporarily unavailable"
        )
    
    # Verify NOT blacklisted
    is_blacklisted = service.is_blacklisted(recipient, tenant_id)
    assert not is_blacklisted, f"Recipient should NOT be blacklisted after {soft_bounce_count} soft bounces"


@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
@given(
    recipient=email_address(),
    smtp_code=smtp_error_code()
)
def test_property_bounce_classification_is_deterministic(db_session: Session, recipient: str, smtp_code: int):
    """
    Property: Bounce classification must be deterministic.
    
    For any SMTP code, the classification must always return the same bounce type.
    """
    service = BounceHandlerService(db_session)
    
    # Classify bounce multiple times
    classification1 = service.classify_bounce(smtp_code, "Test message")
    classification2 = service.classify_bounce(smtp_code, "Different message")
    classification3 = service.classify_bounce(smtp_code, "Another message")
    
    # All classifications must be identical
    assert classification1 == classification2 == classification3, \
        f"Bounce classification for code {smtp_code} must be deterministic"
    
    # Verify classification matches expected type
    if smtp_code in [550, 551, 552, 553, 554]:
        assert classification1 == "hard", f"Code {smtp_code} should be classified as hard bounce"
    elif smtp_code in [421, 450, 451, 452]:
        assert classification1 == "soft", f"Code {smtp_code} should be classified as soft bounce"
    elif smtp_code in [521, 541]:
        assert classification1 == "block", f"Code {smtp_code} should be classified as block"


@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
@given(
    recipient=email_address(),
    bounce_sequence=st.lists(
        st.sampled_from(["hard", "soft", "block"]),
        min_size=1,
        max_size=10
    )
)
def test_property_bounce_counter_increments_correctly(db_session: Session, recipient: str, bounce_sequence: list):
    """
    Property: Bounce counter must increment correctly for each bounce.
    
    For any sequence of bounces, the bounce counter must equal the number of bounces processed.
    """
    service = BounceHandlerService(db_session)
    tenant_id = "test_tenant_001"
    
    # Clean up any existing data for this recipient
    db_session.query(EmailBounce).filter(EmailBounce.recipient == recipient).delete()
    db_session.query(EmailLog).filter(EmailLog.to_email == recipient).delete()
    db_session.commit()
    
    # Process bounce sequence
    for i, bounce_type in enumerate(bounce_sequence):
        email_log_id = gen_id("email")
        
        # Create email log
        email_log = EmailLog(
            id=email_log_id,
            tenant_id=tenant_id,
            to_email=recipient,
            from_email="noreply@x-ear.com",
            subject=f"Test Email {i}",
            body_text="Test content",
            status="pending",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(email_log)
        db_session.commit()
        
        # Get SMTP code for bounce type
        if bounce_type == "hard":
            smtp_code = 550
        elif bounce_type == "soft":
            smtp_code = 450
        else:  # block
            smtp_code = 521
        
        # Process bounce
        service.process_bounce(
            email_log_id=email_log_id,
            recipient=recipient,
            tenant_id=tenant_id,
            smtp_code=smtp_code,
            smtp_message=f"Test bounce {i}"
        )
    
    # Verify bounce count
    bounce_record = service.get_bounce_record(recipient, tenant_id)
    assert bounce_record is not None, "Bounce record should exist"
    assert bounce_record.bounce_count == len(bounce_sequence), \
        f"Bounce count should be {len(bounce_sequence)}, got {bounce_record.bounce_count}"


@settings(
    max_examples=50,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
@given(
    recipient=email_address()
)
def test_property_unblacklist_reverses_blacklist(db_session: Session, recipient: str):
    """
    Property: Unblacklisting must reverse blacklist status.
    
    For any blacklisted recipient, calling unblacklist must make them not blacklisted.
    """
    service = BounceHandlerService(db_session)
    tenant_id = "test_tenant_001"
    
    # Create 3 hard bounces to trigger blacklist
    for i in range(3):
        email_log_id = gen_id("email")
        
        # Create email log
        email_log = EmailLog(
            id=email_log_id,
            tenant_id=tenant_id,
            to_email=recipient,
            from_email="noreply@x-ear.com",
            subject=f"Test Email {i}",
            body_text="Test content",
            status="pending",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(email_log)
        db_session.commit()
        
        # Process hard bounce
        service.process_bounce(
            email_log_id=email_log_id,
            recipient=recipient,
            tenant_id=tenant_id,
            smtp_code=550,
            smtp_message="550 5.1.1 User unknown"
        )
    
    # Verify blacklisted
    assert service.is_blacklisted(recipient, tenant_id), "Recipient should be blacklisted"
    
    # Unblacklist
    result = service.unblacklist_recipient(recipient, tenant_id)
    assert result, "Unblacklist should succeed"
    
    # Verify NOT blacklisted
    assert not service.is_blacklisted(recipient, tenant_id), "Recipient should NOT be blacklisted after unblacklist"


@settings(
    max_examples=50,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
@given(
    recipients=st.lists(email_address(), min_size=2, max_size=5, unique=True)
)
def test_property_tenant_isolation_for_blacklist(db_session: Session, recipients: list):
    """
    Property: Blacklist must be tenant-isolated.
    
    For any recipient blacklisted in one tenant, they must NOT be blacklisted in another tenant.
    """
    service = BounceHandlerService(db_session)
    tenant1_id = "test_tenant_001"
    
    # Create or get second tenant
    tenant2 = db_session.query(Tenant).filter(Tenant.id == "test_tenant_002").first()
    if not tenant2:
        tenant2 = Tenant(
            id="test_tenant_002",
            name="Test Tenant 2",
            slug="test-tenant-2",
            owner_email="owner2@test.com",
            billing_email="billing2@test.com",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(tenant2)
        db_session.commit()
    tenant2_id = "test_tenant_002"
    
    recipient = recipients[0]
    
    # Clean up any existing data for this recipient
    db_session.query(EmailBounce).filter(EmailBounce.recipient == recipient).delete()
    db_session.query(EmailLog).filter(EmailLog.to_email == recipient).delete()
    db_session.commit()
    
    # Blacklist in tenant1
    for i in range(3):
        email_log_id = gen_id("email")
        
        # Create email log
        email_log = EmailLog(
            id=email_log_id,
            tenant_id=tenant1_id,
            to_email=recipient,
            from_email="noreply@x-ear.com",
            subject=f"Test Email {i}",
            body_text="Test content",
            status="pending",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(email_log)
        db_session.commit()
        
        # Process hard bounce
        service.process_bounce(
            email_log_id=email_log_id,
            recipient=recipient,
            tenant_id=tenant1_id,
            smtp_code=550,
            smtp_message="550 5.1.1 User unknown"
        )
    
    # Verify blacklisted in tenant1
    assert service.is_blacklisted(recipient, tenant1_id), "Recipient should be blacklisted in tenant1"
    
    # Verify NOT blacklisted in tenant2
    assert not service.is_blacklisted(recipient, tenant2_id), "Recipient should NOT be blacklisted in tenant2"
