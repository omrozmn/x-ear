"""Property-Based Tests for Unsubscribe Honor.

Tests Property 31: Unsubscribe Honor
Validates Requirements 8.5, 8.6, 8.7

These tests verify that unsubscribe preferences are honored and emails
are not sent to unsubscribed recipients (CAN-SPAM compliance).
"""

import pytest
from datetime import datetime, timezone
from hypothesis import given, strategies as st, settings, HealthCheck, assume
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.models.base import Base, gen_id
from core.models.tenant import Tenant
from core.models.email_deliverability import EmailUnsubscribe
from services.unsubscribe_service import UnsubscribeService


class TestUnsubscribeHonorProperty:
    """Property-based tests for unsubscribe honor."""
    
    @pytest.fixture(scope="function")
    def db_session(self):
        """Create in-memory SQLite database for testing."""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Create test tenant
        tenant = Tenant(
            id=gen_id("tenant"),
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
        
        session.close()
        engine.dispose()
    
    @given(
        recipient=st.emails(),
        scenario=st.sampled_from([
            "invoice_created", "marketing_campaign", "newsletter",
            "password_reset", "user_invite", "email_verification"
        ])
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_unsubscribed_recipient_is_detected(self, db_session, recipient, scenario):
        """
        **Property 31.1: Unsubscribe Detection**
        
        After unsubscribing, is_unsubscribed() must return True.
        
        **Validates: Requirements 8.5, 8.6**
        """
        # Get tenant
        tenant = db_session.query(Tenant).first()
        tenant_id = tenant.id
        
        service = UnsubscribeService(db_session)
        
        # Initially not unsubscribed
        assert service.is_unsubscribed(recipient, tenant_id, scenario) is False
        
        # Process unsubscribe
        token = f"test_token_{recipient}_{scenario}"
        success, _ = service.process_unsubscribe(
            recipient=recipient,
            tenant_id=tenant_id,
            scenario=scenario,
            token=token,
            ip_address="127.0.0.1",
            user_agent="test"
        )
        
        assert success is True
        
        # Now must be unsubscribed
        assert service.is_unsubscribed(recipient, tenant_id, scenario) is True
    
    @given(
        recipient=st.emails(),
        scenario1=st.sampled_from(["invoice_created", "marketing_campaign", "newsletter"]),
        scenario2=st.sampled_from(["password_reset", "user_invite", "email_verification"])
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_unsubscribe_is_scenario_specific(self, db_session, recipient, scenario1, scenario2):
        """
        **Property 31.2: Scenario Isolation**
        
        Unsubscribing from one scenario must not affect other scenarios.
        
        **Validates: Requirements 8.6, 8.7**
        """
        assume(scenario1 != scenario2)
        
        tenant = db_session.query(Tenant).first()
        tenant_id = tenant.id
        
        service = UnsubscribeService(db_session)
        
        # Unsubscribe from scenario1
        token = f"test_token_{recipient}_{scenario1}"
        service.process_unsubscribe(
            recipient=recipient,
            tenant_id=tenant_id,
            scenario=scenario1,
            token=token,
            ip_address="127.0.0.1",
            user_agent="test"
        )
        
        # Must be unsubscribed from scenario1
        assert service.is_unsubscribed(recipient, tenant_id, scenario1) is True
        
        # Must NOT be unsubscribed from scenario2
        assert service.is_unsubscribed(recipient, tenant_id, scenario2) is False
    
    @given(
        recipient=st.emails(),
        scenario=st.sampled_from(["invoice_created", "marketing_campaign", "newsletter"])
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_duplicate_unsubscribe_is_idempotent(self, db_session, recipient, scenario):
        """
        **Property 31.3: Idempotency**
        
        Multiple unsubscribe requests must be idempotent.
        
        **Validates: Requirements 8.6**
        """
        tenant = db_session.query(Tenant).first()
        tenant_id = tenant.id
        
        service = UnsubscribeService(db_session)
        
        # First unsubscribe
        token1 = f"test_token_{recipient}_{scenario}_1"
        success1, msg1 = service.process_unsubscribe(
            recipient=recipient,
            tenant_id=tenant_id,
            scenario=scenario,
            token=token1,
            ip_address="127.0.0.1",
            user_agent="test"
        )
        
        assert success1 is True
        
        # Second unsubscribe (duplicate)
        token2 = f"test_token_{recipient}_{scenario}_2"
        success2, msg2 = service.process_unsubscribe(
            recipient=recipient,
            tenant_id=tenant_id,
            scenario=scenario,
            token=token2,
            ip_address="127.0.0.1",
            user_agent="test"
        )
        
        # Must still succeed (idempotent)
        assert success2 is True
        assert "already unsubscribed" in msg2.lower()
        
        # Must still be unsubscribed
        assert service.is_unsubscribed(recipient, tenant_id, scenario) is True
    
    @given(
        recipient=st.emails(),
        scenario=st.sampled_from(["invoice_created", "marketing_campaign", "newsletter"])
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_resubscribe_reverses_unsubscribe(self, db_session, recipient, scenario):
        """
        **Property 31.4: Resubscribe**
        
        Resubscribing must reverse unsubscribe status.
        
        **Validates: Requirements 8.6**
        """
        tenant = db_session.query(Tenant).first()
        tenant_id = tenant.id
        
        service = UnsubscribeService(db_session)
        
        # Unsubscribe
        token = f"test_token_{recipient}_{scenario}"
        service.process_unsubscribe(
            recipient=recipient,
            tenant_id=tenant_id,
            scenario=scenario,
            token=token,
            ip_address="127.0.0.1",
            user_agent="test"
        )
        
        assert service.is_unsubscribed(recipient, tenant_id, scenario) is True
        
        # Resubscribe
        result = service.resubscribe(recipient, tenant_id, scenario)
        assert result is True
        
        # Must no longer be unsubscribed
        assert service.is_unsubscribed(recipient, tenant_id, scenario) is False
    
    @given(
        recipient=st.emails(),
        scenario=st.sampled_from(["invoice_created", "marketing_campaign", "newsletter"])
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_unsubscribe_token_is_stored(self, db_session, recipient, scenario):
        """
        **Property 31.5: Token Storage**
        
        Unsubscribe token must be stored for audit trail.
        
        **Validates: Requirements 8.5**
        """
        tenant = db_session.query(Tenant).first()
        tenant_id = tenant.id
        
        service = UnsubscribeService(db_session)
        
        # Generate token
        token = f"test_token_{recipient}_{scenario}"
        
        # Unsubscribe
        service.process_unsubscribe(
            recipient=recipient,
            tenant_id=tenant_id,
            scenario=scenario,
            token=token,
            ip_address="127.0.0.1",
            user_agent="test"
        )
        
        # Token must be retrievable
        record = service.get_by_token(token)
        assert record is not None
        assert record.recipient == recipient
        assert record.scenario == scenario
        assert record.tenant_id == tenant_id
    
    @given(
        recipient=st.emails(),
        scenario=st.sampled_from(["invoice_created", "marketing_campaign", "newsletter"]),
        ip_address=st.ip_addresses(v=4).map(str)
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_unsubscribe_logs_client_info(self, db_session, recipient, scenario, ip_address):
        """
        **Property 31.6: Audit Trail**
        
        Unsubscribe must log IP address and user agent for audit.
        
        **Validates: Requirements 8.5**
        """
        tenant = db_session.query(Tenant).first()
        tenant_id = tenant.id
        
        service = UnsubscribeService(db_session)
        
        token = f"test_token_{recipient}_{scenario}"
        user_agent = "Mozilla/5.0 Test Browser"
        
        # Unsubscribe
        service.process_unsubscribe(
            recipient=recipient,
            tenant_id=tenant_id,
            scenario=scenario,
            token=token,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Verify audit info stored
        record = service.get_by_token(token)
        assert record is not None
        assert record.ip_address == ip_address
        assert record.user_agent == user_agent
        assert record.unsubscribed_at is not None
    
    @given(
        recipient=st.emails(),
        scenario=st.sampled_from(["invoice_created", "marketing_campaign", "newsletter"])
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_unsubscribe_link_generation_is_unique(self, db_session, recipient, scenario):
        """
        **Property 31.7: Unique Tokens**
        
        Each unsubscribe link must have a unique token.
        
        **Validates: Requirements 8.5**
        """
        tenant = db_session.query(Tenant).first()
        tenant_id = tenant.id
        
        service = UnsubscribeService(db_session)
        
        # Generate multiple links
        url1, token1 = service.generate_unsubscribe_link(recipient, tenant_id, scenario)
        url2, token2 = service.generate_unsubscribe_link(recipient, tenant_id, scenario)
        
        # Tokens must be different (cryptographically random)
        assert token1 != token2
        assert url1 != url2
    
    def test_transactional_emails_not_unsubscribable(self, db_session):
        """
        **Property 31.8: Transactional Protection**
        
        Transactional emails (password reset, etc.) should not have unsubscribe.
        This is a design validation test.
        
        **Validates: Requirements 8.7**
        """
        # This is validated by scenario classification in EmailService
        # Transactional scenarios should not generate unsubscribe tokens
        
        from services.email_service import TRANSACTIONAL_SCENARIOS, PROMOTIONAL_SCENARIOS
        
        # Verify no overlap
        overlap = TRANSACTIONAL_SCENARIOS & PROMOTIONAL_SCENARIOS
        assert len(overlap) == 0, "Transactional and promotional scenarios must not overlap"
        
        # Verify critical transactional scenarios
        assert "password_reset" in TRANSACTIONAL_SCENARIOS
        assert "email_verification" in TRANSACTIONAL_SCENARIOS
        assert "user_invite" in TRANSACTIONAL_SCENARIOS
        
        # Verify promotional scenarios
        assert "marketing_campaign" in PROMOTIONAL_SCENARIOS
        assert "newsletter" in PROMOTIONAL_SCENARIOS
