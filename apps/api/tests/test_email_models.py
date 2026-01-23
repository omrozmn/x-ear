"""
Tests for email system database models.

This test file verifies that the email system models (TenantSMTPConfig, SMTPEmailLog, EmailTemplate)
are correctly defined and can interact with the database.
"""
import pytest
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy.orm import Session
from hypothesis import given, strategies as st, settings, HealthCheck

from models.email import TenantSMTPConfig, SMTPEmailLog, EmailTemplate
from models.tenant import Tenant


class TestEmailModels:
    """Test suite for email system models."""
    
    def test_tenant_smtp_config_creation(self, db_session: Session):
        """Test creating a TenantSMTPConfig record."""
        # Create a test tenant first
        tenant = Tenant(
            id=str(uuid4()),
            name="Test Tenant",
            slug="test-tenant",
            owner_email="owner@test.com",
            billing_email="billing@test.com"
        )
        db_session.add(tenant)
        db_session.flush()
        
        # Create SMTP config
        config = TenantSMTPConfig(
            id=str(uuid4()),
            tenant_id=tenant.id,
            host="smtp.test.com",
            port=465,
            username="test@test.com",
            encrypted_password="encrypted_password_here",
            from_email="noreply@test.com",
            from_name="Test System",
            use_tls=False,
            use_ssl=True,
            timeout=30,
            is_active=True
        )
        db_session.add(config)
        db_session.commit()
        
        # Verify
        retrieved = db_session.query(TenantSMTPConfig).filter_by(id=config.id).first()
        assert retrieved is not None
        assert retrieved.host == "smtp.test.com"
        assert retrieved.port == 465
        assert retrieved.tenant_id == tenant.id
        assert retrieved.is_active is True
    
    def test_smtp_email_log_creation(self, db_session: Session):
        """Test creating an SMTPEmailLog record."""
        # Create a test tenant first
        tenant = Tenant(
            id=str(uuid4()),
            name="Test Tenant 2",
            slug="test-tenant-2",
            owner_email="owner@test.com",
            billing_email="billing@test.com"
        )
        db_session.add(tenant)
        db_session.flush()
        
        # Create email log
        log = SMTPEmailLog(
            id=str(uuid4()),
            tenant_id=tenant.id,
            recipient="user@test.com",
            subject="Test Email",
            body_preview="This is a test email...",
            status="sent",
            sent_at=datetime.now(timezone.utc),
            retry_count=0,
            template_name="test_template",
            scenario="test_scenario"
        )
        db_session.add(log)
        db_session.commit()
        
        # Verify
        retrieved = db_session.query(SMTPEmailLog).filter_by(id=log.id).first()
        assert retrieved is not None
        assert retrieved.recipient == "user@test.com"
        assert retrieved.status == "sent"
        assert retrieved.tenant_id == tenant.id
    
    def test_email_template_creation(self, db_session: Session):
        """Test creating an EmailTemplate record."""
        template = EmailTemplate(
            id=str(uuid4()),
            name="password_reset",
            language_code="tr",
            subject_template="Şifre Sıfırlama - {{ app_name }}",
            html_template="<html><body>{{ content }}</body></html>",
            text_template="{{ content }}",
            variables_schema={"required": ["content", "app_name"]}
        )
        db_session.add(template)
        db_session.commit()
        
        # Verify
        retrieved = db_session.query(EmailTemplate).filter_by(id=template.id).first()
        assert retrieved is not None
        assert retrieved.name == "password_reset"
        assert retrieved.language_code == "tr"
        assert "required" in retrieved.variables_schema
    
    def test_tenant_smtp_config_relationship(self, db_session: Session):
        """Test the relationship between Tenant and TenantSMTPConfig."""
        # Create tenant
        tenant = Tenant(
            id=str(uuid4()),
            name="Test Tenant 3",
            slug="test-tenant-3",
            owner_email="owner@test.com",
            billing_email="billing@test.com"
        )
        db_session.add(tenant)
        db_session.flush()
        
        # Create SMTP config
        config = TenantSMTPConfig(
            id=str(uuid4()),
            tenant_id=tenant.id,
            host="smtp.test.com",
            port=465,
            username="test@test.com",
            encrypted_password="encrypted_password_here",
            from_email="noreply@test.com",
            from_name="Test System"
        )
        db_session.add(config)
        db_session.commit()
        
        # Test relationship
        retrieved_tenant = db_session.query(Tenant).filter_by(id=tenant.id).first()
        assert retrieved_tenant is not None
        assert retrieved_tenant.smtp_configs.count() == 1
        assert retrieved_tenant.smtp_configs.first().host == "smtp.test.com"
        
        # Test reverse relationship
        retrieved_config = db_session.query(TenantSMTPConfig).filter_by(id=config.id).first()
        assert retrieved_config.tenant.name == "Test Tenant 3"
    
    def test_smtp_email_log_indexes(self, db_session: Session):
        """Test that indexes are working for SMTPEmailLog queries."""
        # Create tenant
        tenant = Tenant(
            id=str(uuid4()),
            name="Test Tenant 4",
            slug="test-tenant-4",
            owner_email="owner@test.com",
            billing_email="billing@test.com"
        )
        db_session.add(tenant)
        db_session.flush()
        
        # Create multiple email logs
        for i in range(5):
            log = SMTPEmailLog(
                id=str(uuid4()),
                tenant_id=tenant.id,
                recipient=f"user{i}@test.com",
                subject=f"Test Email {i}",
                status="sent" if i % 2 == 0 else "failed",
                sent_at=datetime.now(timezone.utc) if i % 2 == 0 else None
            )
            db_session.add(log)
        db_session.commit()
        
        # Query by tenant_id (should use index)
        logs = db_session.query(SMTPEmailLog).filter_by(tenant_id=tenant.id).all()
        assert len(logs) == 5
        
        # Query by status (should use index)
        sent_logs = db_session.query(SMTPEmailLog).filter_by(tenant_id=tenant.id, status="sent").all()
        assert len(sent_logs) == 3
        
        failed_logs = db_session.query(SMTPEmailLog).filter_by(tenant_id=tenant.id, status="failed").all()
        assert len(failed_logs) == 2
    
    def test_tenant_smtp_config_active_filter(self, db_session: Session):
        """Test filtering active SMTP configurations."""
        # Create tenant
        tenant = Tenant(
            id=str(uuid4()),
            name="Test Tenant 5",
            slug="test-tenant-5",
            owner_email="owner@test.com",
            billing_email="billing@test.com"
        )
        db_session.add(tenant)
        db_session.flush()
        
        # Create active config
        active_config = TenantSMTPConfig(
            id=str(uuid4()),
            tenant_id=tenant.id,
            host="smtp.active.com",
            port=465,
            username="active@test.com",
            encrypted_password="encrypted",
            from_email="noreply@test.com",
            from_name="Test",
            is_active=True
        )
        db_session.add(active_config)
        
        # Create inactive config
        inactive_config = TenantSMTPConfig(
            id=str(uuid4()),
            tenant_id=tenant.id,
            host="smtp.inactive.com",
            port=465,
            username="inactive@test.com",
            encrypted_password="encrypted",
            from_email="noreply@test.com",
            from_name="Test",
            is_active=False
        )
        db_session.add(inactive_config)
        db_session.commit()
        
        # Query active configs (should use index)
        active_configs = db_session.query(TenantSMTPConfig).filter_by(
            tenant_id=tenant.id,
            is_active=True
        ).all()
        assert len(active_configs) == 1
        assert active_configs[0].host == "smtp.active.com"


class TestTenantIsolationProperties:
    """Property-based tests for tenant isolation on email models.
    
    **Validates: Requirements 1.4, 5.7, 18.1, 18.2**
    """
    
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(
        tenant_count=st.integers(min_value=2, max_value=5),
        configs_per_tenant=st.integers(min_value=1, max_value=3)
    )
    def test_property_3_smtp_config_tenant_isolation(
        self, 
        db_session: Session,
        tenant_count: int,
        configs_per_tenant: int
    ):
        """Property 3: Tenant Isolation for SMTP Configurations
        
        GIVEN multiple tenants with SMTP configurations
        WHEN querying configurations filtered by tenant_id
        THEN only configurations belonging to that tenant are returned
        AND no configurations from other tenants are visible
        
        **Validates: Requirements 1.4, 18.1, 18.2**
        """
        # Create multiple tenants
        tenants = []
        for i in range(tenant_count):
            tenant = Tenant(
                id=str(uuid4()),
                name=f"Tenant {i}",
                slug=f"tenant-{i}-{uuid4().hex[:8]}",
                owner_email=f"owner{i}@test.com",
                billing_email=f"billing{i}@test.com"
            )
            db_session.add(tenant)
            tenants.append(tenant)
        db_session.flush()
        
        # Create SMTP configurations for each tenant
        tenant_configs = {}
        for tenant in tenants:
            configs = []
            for j in range(configs_per_tenant):
                config = TenantSMTPConfig(
                    id=str(uuid4()),
                    tenant_id=tenant.id,
                    host=f"smtp.tenant{tenant.name}.com",
                    port=465,
                    username=f"user{j}@tenant{tenant.name}.com",
                    encrypted_password=f"encrypted_pass_{tenant.id}_{j}",
                    from_email=f"noreply{j}@tenant{tenant.name}.com",
                    from_name=f"Tenant {tenant.name} System {j}",
                    is_active=(j == 0)  # Only first config is active
                )
                db_session.add(config)
                configs.append(config)
            tenant_configs[tenant.id] = configs
        db_session.commit()
        
        # Property: Querying by tenant_id returns ONLY that tenant's configs
        for tenant in tenants:
            retrieved_configs = db_session.query(TenantSMTPConfig).filter_by(
                tenant_id=tenant.id
            ).all()
            
            # Assert correct count
            assert len(retrieved_configs) == configs_per_tenant, \
                f"Expected {configs_per_tenant} configs for tenant {tenant.id}, got {len(retrieved_configs)}"
            
            # Assert all configs belong to this tenant
            for config in retrieved_configs:
                assert config.tenant_id == tenant.id, \
                    f"Config {config.id} has tenant_id {config.tenant_id}, expected {tenant.id}"
            
            # Assert no configs from other tenants are visible
            retrieved_ids = {c.id for c in retrieved_configs}
            expected_ids = {c.id for c in tenant_configs[tenant.id]}
            assert retrieved_ids == expected_ids, \
                f"Retrieved config IDs don't match expected for tenant {tenant.id}"
            
            # Assert configs from other tenants are NOT in results
            for other_tenant in tenants:
                if other_tenant.id != tenant.id:
                    other_config_ids = {c.id for c in tenant_configs[other_tenant.id]}
                    assert retrieved_ids.isdisjoint(other_config_ids), \
                        f"Tenant {tenant.id} query returned configs from tenant {other_tenant.id}"
    
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(
        tenant_count=st.integers(min_value=2, max_value=5),
        logs_per_tenant=st.integers(min_value=1, max_value=10)
    )
    def test_property_4_email_log_tenant_isolation(
        self,
        db_session: Session,
        tenant_count: int,
        logs_per_tenant: int
    ):
        """Property 4: Tenant Isolation for Email Logs
        
        GIVEN multiple tenants with email logs
        WHEN querying email logs filtered by tenant_id
        THEN only logs belonging to that tenant are returned
        AND no logs from other tenants are visible
        
        **Validates: Requirements 5.7, 18.1, 18.2**
        """
        # Create multiple tenants
        tenants = []
        for i in range(tenant_count):
            tenant = Tenant(
                id=str(uuid4()),
                name=f"Tenant {i}",
                slug=f"tenant-{i}-{uuid4().hex[:8]}",
                owner_email=f"owner{i}@test.com",
                billing_email=f"billing{i}@test.com"
            )
            db_session.add(tenant)
            tenants.append(tenant)
        db_session.flush()
        
        # Create email logs for each tenant
        tenant_logs = {}
        for tenant in tenants:
            logs = []
            for j in range(logs_per_tenant):
                log = SMTPEmailLog(
                    id=str(uuid4()),
                    tenant_id=tenant.id,
                    recipient=f"user{j}@tenant{tenant.name}.com",
                    subject=f"Email {j} for {tenant.name}",
                    body_preview=f"This is email {j} for tenant {tenant.id}",
                    status="sent" if j % 2 == 0 else "failed",
                    sent_at=datetime.now(timezone.utc) if j % 2 == 0 else None,
                    retry_count=j % 3,
                    template_name=f"template_{j % 3}",
                    scenario=f"scenario_{j % 2}"
                )
                db_session.add(log)
                logs.append(log)
            tenant_logs[tenant.id] = logs
        db_session.commit()
        
        # Property: Querying by tenant_id returns ONLY that tenant's logs
        for tenant in tenants:
            retrieved_logs = db_session.query(SMTPEmailLog).filter_by(
                tenant_id=tenant.id
            ).all()
            
            # Assert correct count
            assert len(retrieved_logs) == logs_per_tenant, \
                f"Expected {logs_per_tenant} logs for tenant {tenant.id}, got {len(retrieved_logs)}"
            
            # Assert all logs belong to this tenant
            for log in retrieved_logs:
                assert log.tenant_id == tenant.id, \
                    f"Log {log.id} has tenant_id {log.tenant_id}, expected {tenant.id}"
            
            # Assert no logs from other tenants are visible
            retrieved_ids = {log.id for log in retrieved_logs}
            expected_ids = {log.id for log in tenant_logs[tenant.id]}
            assert retrieved_ids == expected_ids, \
                f"Retrieved log IDs don't match expected for tenant {tenant.id}"
            
            # Assert logs from other tenants are NOT in results
            for other_tenant in tenants:
                if other_tenant.id != tenant.id:
                    other_log_ids = {log.id for log in tenant_logs[other_tenant.id]}
                    assert retrieved_ids.isdisjoint(other_log_ids), \
                        f"Tenant {tenant.id} query returned logs from tenant {other_tenant.id}"
    
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(
        tenant_count=st.integers(min_value=2, max_value=5),
        configs_per_tenant=st.integers(min_value=1, max_value=3),
        status_filter=st.sampled_from(["sent", "failed", "pending"])
    )
    def test_property_smtp_config_active_isolation(
        self,
        db_session: Session,
        tenant_count: int,
        configs_per_tenant: int,
        status_filter: str
    ):
        """Property: Active SMTP config queries respect tenant boundaries
        
        GIVEN multiple tenants with active and inactive SMTP configurations
        WHEN querying active configurations filtered by tenant_id
        THEN only active configurations for that tenant are returned
        AND no configurations from other tenants are visible
        
        **Validates: Requirements 1.4, 1.7, 18.1, 18.2**
        """
        # Create multiple tenants
        tenants = []
        for i in range(tenant_count):
            tenant = Tenant(
                id=str(uuid4()),
                name=f"Tenant {i}",
                slug=f"tenant-{i}-{uuid4().hex[:8]}",
                owner_email=f"owner{i}@test.com",
                billing_email=f"billing{i}@test.com"
            )
            db_session.add(tenant)
            tenants.append(tenant)
        db_session.flush()
        
        # Create SMTP configurations with varying active status
        tenant_active_configs = {}
        for tenant in tenants:
            active_configs = []
            for j in range(configs_per_tenant):
                is_active = (j % 2 == 0)  # Alternate active/inactive
                config = TenantSMTPConfig(
                    id=str(uuid4()),
                    tenant_id=tenant.id,
                    host=f"smtp{j}.tenant{tenant.name}.com",
                    port=465,
                    username=f"user{j}@tenant{tenant.name}.com",
                    encrypted_password=f"encrypted_pass_{tenant.id}_{j}",
                    from_email=f"noreply{j}@tenant{tenant.name}.com",
                    from_name=f"Tenant {tenant.name} System {j}",
                    is_active=is_active
                )
                db_session.add(config)
                if is_active:
                    active_configs.append(config)
            tenant_active_configs[tenant.id] = active_configs
        db_session.commit()
        
        # Property: Querying active configs by tenant_id returns ONLY that tenant's active configs
        for tenant in tenants:
            retrieved_configs = db_session.query(TenantSMTPConfig).filter_by(
                tenant_id=tenant.id,
                is_active=True
            ).all()
            
            expected_count = len(tenant_active_configs[tenant.id])
            
            # Assert correct count
            assert len(retrieved_configs) == expected_count, \
                f"Expected {expected_count} active configs for tenant {tenant.id}, got {len(retrieved_configs)}"
            
            # Assert all configs belong to this tenant and are active
            for config in retrieved_configs:
                assert config.tenant_id == tenant.id, \
                    f"Config {config.id} has tenant_id {config.tenant_id}, expected {tenant.id}"
                assert config.is_active is True, \
                    f"Config {config.id} is not active but was returned in active query"
            
            # Assert no configs from other tenants are visible
            retrieved_ids = {c.id for c in retrieved_configs}
            expected_ids = {c.id for c in tenant_active_configs[tenant.id]}
            assert retrieved_ids == expected_ids, \
                f"Retrieved active config IDs don't match expected for tenant {tenant.id}"
    
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    @given(
        tenant_count=st.integers(min_value=2, max_value=5),
        logs_per_tenant=st.integers(min_value=1, max_value=10),
        status_filter=st.sampled_from(["sent", "failed", "pending"])
    )
    def test_property_email_log_status_isolation(
        self,
        db_session: Session,
        tenant_count: int,
        logs_per_tenant: int,
        status_filter: str
    ):
        """Property: Email log status queries respect tenant boundaries
        
        GIVEN multiple tenants with email logs of various statuses
        WHEN querying logs filtered by tenant_id and status
        THEN only logs matching both tenant and status are returned
        AND no logs from other tenants are visible
        
        **Validates: Requirements 5.7, 18.1, 18.2**
        """
        # Create multiple tenants
        tenants = []
        for i in range(tenant_count):
            tenant = Tenant(
                id=str(uuid4()),
                name=f"Tenant {i}",
                slug=f"tenant-{i}-{uuid4().hex[:8]}",
                owner_email=f"owner{i}@test.com",
                billing_email=f"billing{i}@test.com"
            )
            db_session.add(tenant)
            tenants.append(tenant)
        db_session.flush()
        
        # Create email logs with various statuses
        tenant_status_logs = {}
        statuses = ["sent", "failed", "pending"]
        
        for tenant in tenants:
            status_logs = {status: [] for status in statuses}
            for j in range(logs_per_tenant):
                status = statuses[j % len(statuses)]
                log = SMTPEmailLog(
                    id=str(uuid4()),
                    tenant_id=tenant.id,
                    recipient=f"user{j}@tenant{tenant.name}.com",
                    subject=f"Email {j} for {tenant.name}",
                    body_preview=f"This is email {j}",
                    status=status,
                    sent_at=datetime.now(timezone.utc) if status == "sent" else None,
                    retry_count=j % 3,
                    template_name=f"template_{j % 3}",
                    scenario=f"scenario_{j % 2}"
                )
                db_session.add(log)
                status_logs[status].append(log)
            tenant_status_logs[tenant.id] = status_logs
        db_session.commit()
        
        # Property: Querying by tenant_id and status returns ONLY matching logs
        for tenant in tenants:
            retrieved_logs = db_session.query(SMTPEmailLog).filter_by(
                tenant_id=tenant.id,
                status=status_filter
            ).all()
            
            expected_logs = tenant_status_logs[tenant.id][status_filter]
            expected_count = len(expected_logs)
            
            # Assert correct count
            assert len(retrieved_logs) == expected_count, \
                f"Expected {expected_count} {status_filter} logs for tenant {tenant.id}, got {len(retrieved_logs)}"
            
            # Assert all logs belong to this tenant and have correct status
            for log in retrieved_logs:
                assert log.tenant_id == tenant.id, \
                    f"Log {log.id} has tenant_id {log.tenant_id}, expected {tenant.id}"
                assert log.status == status_filter, \
                    f"Log {log.id} has status {log.status}, expected {status_filter}"
            
            # Assert no logs from other tenants are visible
            retrieved_ids = {log.id for log in retrieved_logs}
            expected_ids = {log.id for log in expected_logs}
            assert retrieved_ids == expected_ids, \
                f"Retrieved {status_filter} log IDs don't match expected for tenant {tenant.id}"
