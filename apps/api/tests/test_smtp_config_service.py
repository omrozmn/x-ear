"""
Unit tests for SMTPConfigService

Tests cover:
- Creating and updating SMTP configurations
- Password encryption before storage
- Retrieving active configurations with tenant filtering
- Decrypting passwords for email sending
- Global fallback configuration
- SMTP field validation
- Tenant isolation

Requirements tested:
- 1.1: Encrypt SMTP password before storing
- 1.2: Decrypt password only when explicitly requested
- 1.3: Use global fallback when no tenant config
- 1.4: Store configurations with tenant_id isolation
- 1.7: Use most recently created active configuration
- 22.1-22.7: Validate SMTP configuration fields
"""

import pytest
import os
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from hypothesis import given, settings, strategies as st

from core.models.email import TenantSMTPConfig
from core.database import Base
from services.smtp_config_service import SMTPConfigService
from services.encryption_service import EncryptionService
from utils.exceptions import SecurityException


# Test database setup
@pytest.fixture(scope="function")
def test_db():
    """Create a test database session."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(bind=engine)
    session = TestingSessionLocal()
    
    yield session
    
    session.close()


@pytest.fixture
def encryption_service():
    """Create an EncryptionService instance for testing."""
    with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": "test_key_32_bytes_long_base64=="}, clear=False):
        # Generate a valid Fernet key for testing
        from cryptography.fernet import Fernet
        test_key = Fernet.generate_key().decode()
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": test_key}):
            service = EncryptionService()
            yield service


@pytest.fixture
def smtp_config_service(test_db, encryption_service):
    """Create an SMTPConfigService instance for testing."""
    return SMTPConfigService(test_db, encryption_service)


@pytest.fixture
def sample_config_data():
    """Sample SMTP configuration data."""
    return {
        "host": "mail.test.com",
        "port": 465,
        "username": "info@test.com",
        "password": "secret123",
        "from_email": "info@test.com",
        "from_name": "Test Company",
        "use_tls": False,
        "use_ssl": True,
        "timeout": 30
    }


class TestCreateOrUpdateConfig:
    """Tests for create_or_update_config method."""
    
    def test_create_new_config_encrypts_password(
        self, 
        smtp_config_service, 
        test_db, 
        sample_config_data
    ):
        """Test that creating a new config encrypts the password."""
        tenant_id = "tenant_123"
        
        # Create config
        config = smtp_config_service.create_or_update_config(
            sample_config_data.copy(), 
            tenant_id
        )
        
        # Verify config was created
        assert config.id is not None
        assert config.tenant_id == tenant_id
        assert config.host == "mail.test.com"
        assert config.port == 465
        
        # Verify password is encrypted (not plaintext)
        assert config.encrypted_password != "secret123"
        assert len(config.encrypted_password) > 0
        
        # Verify password can be decrypted back to original
        decrypted = smtp_config_service.encryption_service.decrypt_password(
            config.encrypted_password
        )
        assert decrypted == "secret123"
    
    def test_update_existing_config(
        self, 
        smtp_config_service, 
        test_db, 
        sample_config_data
    ):
        """Test that updating an existing config works correctly."""
        tenant_id = "tenant_123"
        
        # Create initial config
        config1 = smtp_config_service.create_or_update_config(
            sample_config_data.copy(), 
            tenant_id
        )
        test_db.commit()
        config1_id = config1.id
        
        # Update config with new values
        updated_data = sample_config_data.copy()
        updated_data["host"] = "mail2.test.com"
        updated_data["password"] = "newsecret456"
        
        config2 = smtp_config_service.create_or_update_config(
            updated_data, 
            tenant_id
        )
        
        # Verify it's the same config (updated, not new)
        assert config2.id == config1_id
        assert config2.host == "mail2.test.com"
        
        # Verify new password is encrypted
        decrypted = smtp_config_service.encryption_service.decrypt_password(
            config2.encrypted_password
        )
        assert decrypted == "newsecret456"
        
        # Verify only one active config exists
        active_configs = test_db.query(TenantSMTPConfig).filter(
            TenantSMTPConfig.tenant_id == tenant_id,
            TenantSMTPConfig.is_active == True
        ).all()
        assert len(active_configs) == 1
    
    def test_create_config_requires_password(
        self, 
        smtp_config_service, 
        sample_config_data
    ):
        """Test that creating config without password raises error."""
        tenant_id = "tenant_123"
        config_data = sample_config_data.copy()
        del config_data["password"]
        
        with pytest.raises(ValueError, match="Password is required"):
            smtp_config_service.create_or_update_config(config_data, tenant_id)
    
    def test_create_config_with_empty_password_raises_error(
        self, 
        smtp_config_service, 
        sample_config_data
    ):
        """Test that creating config with empty password raises error."""
        tenant_id = "tenant_123"
        config_data = sample_config_data.copy()
        config_data["password"] = ""
        
        with pytest.raises(ValueError, match="Password is required"):
            smtp_config_service.create_or_update_config(config_data, tenant_id)
    
    def test_password_not_stored_in_plaintext(
        self, 
        smtp_config_service, 
        test_db, 
        sample_config_data
    ):
        """Test that password is never stored in plaintext in database."""
        tenant_id = "tenant_123"
        original_password = "super_secret_password_123"
        
        config_data = sample_config_data.copy()
        config_data["password"] = original_password
        
        # Create config
        config = smtp_config_service.create_or_update_config(config_data, tenant_id)
        test_db.commit()
        
        # Verify encrypted password is different from plaintext
        assert config.encrypted_password != original_password
        
        # Verify encrypted password doesn't contain plaintext
        assert original_password not in config.encrypted_password
        
        # Verify encrypted password is not empty
        assert len(config.encrypted_password) > 0
        
        # Verify we can decrypt it back to original
        decrypted = smtp_config_service.encryption_service.decrypt_password(
            config.encrypted_password
        )
        assert decrypted == original_password
    
    def test_different_passwords_produce_different_ciphertexts(
        self, 
        smtp_config_service, 
        test_db, 
        sample_config_data
    ):
        """Test that encrypting different passwords produces different ciphertexts."""
        tenant1_id = "tenant_123"
        tenant2_id = "tenant_456"
        
        # Create two configs with different passwords
        config_data1 = sample_config_data.copy()
        config_data1["password"] = "password1"
        config1 = smtp_config_service.create_or_update_config(config_data1, tenant1_id)
        
        config_data2 = sample_config_data.copy()
        config_data2["password"] = "password2"
        config2 = smtp_config_service.create_or_update_config(config_data2, tenant2_id)
        
        test_db.commit()
        
        # Verify different encrypted passwords
        assert config1.encrypted_password != config2.encrypted_password
    
    def test_same_password_produces_different_ciphertexts(
        self, 
        smtp_config_service, 
        test_db, 
        sample_config_data
    ):
        """Test that encrypting the same password twice produces different ciphertexts (due to unique nonce)."""
        tenant1_id = "tenant_123"
        tenant2_id = "tenant_456"
        
        # Create two configs with the SAME password
        config_data1 = sample_config_data.copy()
        config_data1["password"] = "same_password"
        config1 = smtp_config_service.create_or_update_config(config_data1, tenant1_id)
        
        config_data2 = sample_config_data.copy()
        config_data2["password"] = "same_password"
        config2 = smtp_config_service.create_or_update_config(config_data2, tenant2_id)
        
        test_db.commit()
        
        # Verify different encrypted passwords (unique nonce per encryption)
        assert config1.encrypted_password != config2.encrypted_password
        
        # But both decrypt to the same plaintext
        decrypted1 = smtp_config_service.encryption_service.decrypt_password(
            config1.encrypted_password
        )
        decrypted2 = smtp_config_service.encryption_service.decrypt_password(
            config2.encrypted_password
        )
        assert decrypted1 == decrypted2 == "same_password"


class TestGetActiveConfig:
    """Tests for get_active_config method."""
    
    def test_get_active_config_returns_most_recent(
        self, 
        smtp_config_service, 
        test_db, 
        sample_config_data
    ):
        """Test that get_active_config returns the most recently created config."""
        tenant_id = "tenant_123"
        
        # Create first config
        config1 = smtp_config_service.create_or_update_config(
            sample_config_data.copy(), 
            tenant_id
        )
        test_db.commit()
        
        # Deactivate first config and create second
        config1.is_active = False
        test_db.commit()
        
        config_data2 = sample_config_data.copy()
        config_data2["host"] = "mail2.test.com"
        config2 = TenantSMTPConfig(
            tenant_id=tenant_id,
            encrypted_password=smtp_config_service.encryption_service.encrypt_password("test"),
            host="mail2.test.com",
            port=465,
            username="info@test.com",
            from_email="info@test.com",
            from_name="Test",
            is_active=True
        )
        test_db.add(config2)
        test_db.commit()
        
        # Get active config
        active = smtp_config_service.get_active_config(tenant_id)
        
        # Should return the most recent active config
        assert active is not None
        assert active.id == config2.id
        assert active.host == "mail2.test.com"
    
    def test_get_active_config_returns_none_when_no_config(
        self, 
        smtp_config_service
    ):
        """Test that get_active_config returns None when no config exists."""
        tenant_id = "tenant_nonexistent"
        
        config = smtp_config_service.get_active_config(tenant_id)
        
        assert config is None
    
    def test_get_active_config_tenant_isolation(
        self, 
        smtp_config_service, 
        test_db, 
        sample_config_data
    ):
        """Test that get_active_config only returns configs for the specified tenant."""
        tenant1_id = "tenant_123"
        tenant2_id = "tenant_456"
        
        # Create config for tenant1
        smtp_config_service.create_or_update_config(
            sample_config_data.copy(), 
            tenant1_id
        )
        test_db.commit()
        
        # Try to get config for tenant2
        config = smtp_config_service.get_active_config(tenant2_id)
        
        # Should return None (tenant isolation)
        assert config is None


class TestGetConfigWithDecryptedPassword:
    """Tests for get_config_with_decrypted_password method."""
    
    def test_get_config_with_decrypted_password(
        self, 
        smtp_config_service, 
        test_db, 
        sample_config_data
    ):
        """Test that get_config_with_decrypted_password returns plaintext password."""
        tenant_id = "tenant_123"
        
        # Create config
        smtp_config_service.create_or_update_config(
            sample_config_data.copy(), 
            tenant_id
        )
        test_db.commit()
        
        # Get config with decrypted password
        config_dict = smtp_config_service.get_config_with_decrypted_password(tenant_id)
        
        # Verify all fields are present
        assert config_dict["host"] == "mail.test.com"
        assert config_dict["port"] == 465
        assert config_dict["username"] == "info@test.com"
        assert config_dict["password"] == "secret123"  # Plaintext!
        assert config_dict["from_email"] == "info@test.com"
        assert config_dict["from_name"] == "Test Company"
        assert config_dict["use_tls"] is False
        assert config_dict["use_ssl"] is True
        assert config_dict["timeout"] == 30
    
    def test_fallback_to_global_config_when_no_tenant_config(
        self, 
        smtp_config_service
    ):
        """Test that global fallback config is used when no tenant config exists."""
        tenant_id = "tenant_nonexistent"
        
        # Mock environment variables
        with patch.dict(os.environ, {
            "SMTP_HOST": "global.mail.com",
            "SMTP_PORT": "587",
            "SMTP_USER": "global@example.com",
            "SMTP_PASS": "globalpass",
            "SMTP_FROM_EMAIL": "noreply@example.com",
            "SMTP_FROM_NAME": "Global Sender",
            "SMTP_USE_TLS": "true",
            "SMTP_USE_SSL": "false",
            "SMTP_TIMEOUT": "60"
        }):
            config_dict = smtp_config_service.get_config_with_decrypted_password(tenant_id)
        
        # Verify global config is returned
        assert config_dict["host"] == "global.mail.com"
        assert config_dict["port"] == 587
        assert config_dict["username"] == "global@example.com"
        assert config_dict["password"] == "globalpass"
        assert config_dict["from_email"] == "noreply@example.com"
        assert config_dict["from_name"] == "Global Sender"
        assert config_dict["use_tls"] is True
        assert config_dict["use_ssl"] is False
        assert config_dict["timeout"] == 60
    
    def test_fallback_when_tenant_config_deactivated(
        self, 
        smtp_config_service, 
        test_db, 
        sample_config_data
    ):
        """Test that global fallback is used when tenant config is deactivated."""
        tenant_id = "tenant_123"
        
        # Create and then deactivate config
        smtp_config_service.create_or_update_config(
            sample_config_data.copy(), 
            tenant_id
        )
        test_db.commit()
        
        smtp_config_service.deactivate_config(tenant_id)
        test_db.commit()
        
        # Mock environment variables for global config
        with patch.dict(os.environ, {
            "SMTP_HOST": "fallback.mail.com",
            "SMTP_PORT": "465",
            "SMTP_USER": "fallback@example.com",
            "SMTP_PASS": "fallbackpass",
            "SMTP_FROM_EMAIL": "fallback@example.com",
            "SMTP_FROM_NAME": "Fallback Sender",
            "SMTP_USE_TLS": "false",
            "SMTP_USE_SSL": "true",
            "SMTP_TIMEOUT": "30"
        }):
            config_dict = smtp_config_service.get_config_with_decrypted_password(tenant_id)
        
        # Should use global fallback
        assert config_dict["host"] == "fallback.mail.com"
        assert config_dict["username"] == "fallback@example.com"


class TestValidateConfig:
    """Tests for validate_config method."""
    
    def test_validate_valid_config(self, smtp_config_service, sample_config_data):
        """Test that valid config passes validation."""
        is_valid, error = smtp_config_service.validate_config(sample_config_data)
        
        assert is_valid is True
        assert error == ""
    
    def test_validate_rejects_empty_host(self, smtp_config_service, sample_config_data):
        """Test that empty host is rejected."""
        config_data = sample_config_data.copy()
        config_data["host"] = ""
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        assert is_valid is False
        assert "Host is required" in error
    
    def test_validate_rejects_invalid_port(self, smtp_config_service, sample_config_data):
        """Test that invalid port is rejected."""
        config_data = sample_config_data.copy()
        config_data["port"] = 70000  # Out of range
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        assert is_valid is False
        assert "Port must be between 1 and 65535" in error
    
    def test_validate_rejects_invalid_email_format(
        self, 
        smtp_config_service, 
        sample_config_data
    ):
        """Test that invalid email format is rejected."""
        config_data = sample_config_data.copy()
        config_data["from_email"] = "not-an-email"
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        assert is_valid is False
        assert "Invalid from_email format" in error
    
    def test_validate_rejects_invalid_timeout(
        self, 
        smtp_config_service, 
        sample_config_data
    ):
        """Test that invalid timeout is rejected."""
        config_data = sample_config_data.copy()
        config_data["timeout"] = 200  # Too high
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        assert is_valid is False
        assert "Timeout must be between 5 and 120 seconds" in error
    
    def test_validate_rejects_timeout_too_low(
        self, 
        smtp_config_service, 
        sample_config_data
    ):
        """Test that timeout below minimum is rejected."""
        config_data = sample_config_data.copy()
        config_data["timeout"] = 2  # Too low (minimum is 5)
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        assert is_valid is False
        assert "Timeout must be between 5 and 120 seconds" in error
    
    def test_validate_rejects_negative_port(
        self, 
        smtp_config_service, 
        sample_config_data
    ):
        """Test that negative port is rejected."""
        config_data = sample_config_data.copy()
        config_data["port"] = -1
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        assert is_valid is False
        assert "Port must be between 1 and 65535" in error
    
    def test_validate_rejects_port_zero(
        self, 
        smtp_config_service, 
        sample_config_data
    ):
        """Test that port 0 is rejected."""
        config_data = sample_config_data.copy()
        config_data["port"] = 0
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        assert is_valid is False
        assert "Port must be between 1 and 65535" in error
    
    def test_validate_rejects_whitespace_only_host(
        self, 
        smtp_config_service, 
        sample_config_data
    ):
        """Test that whitespace-only host is rejected."""
        config_data = sample_config_data.copy()
        config_data["host"] = "   "  # Only whitespace
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        assert is_valid is False
        assert "Host is required" in error
    
    def test_validate_rejects_email_without_at_symbol(
        self, 
        smtp_config_service, 
        sample_config_data
    ):
        """Test that email without @ symbol is rejected."""
        config_data = sample_config_data.copy()
        config_data["from_email"] = "notanemail.com"
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        assert is_valid is False
        assert "Invalid from_email format" in error
    
    def test_validate_rejects_email_without_domain(
        self, 
        smtp_config_service, 
        sample_config_data
    ):
        """Test that email without domain is rejected."""
        config_data = sample_config_data.copy()
        config_data["from_email"] = "user@"
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        assert is_valid is False
        assert "Invalid from_email format" in error
    
    def test_validate_warns_about_ssl_port_mismatch(
        self, 
        smtp_config_service, 
        sample_config_data,
        caplog
    ):
        """Test that SSL port mismatch generates warning (but doesn't fail)."""
        import logging
        
        # Set up logging to capture warnings
        caplog.set_level(logging.WARNING)
        
        config_data = sample_config_data.copy()
        config_data["use_ssl"] = True
        config_data["port"] = 25  # Non-standard for SSL
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        # Should still be valid (warning, not error)
        assert is_valid is True
        assert error == ""
        
        # Verify warning was logged
        assert any("SSL typically uses port 465" in record.message for record in caplog.records), \
            "Should log warning about SSL port mismatch"
    
    def test_validate_warns_about_tls_port_mismatch(
        self, 
        smtp_config_service, 
        sample_config_data,
        caplog
    ):
        """Test that TLS port mismatch generates warning (but doesn't fail)."""
        import logging
        
        # Set up logging to capture warnings
        caplog.set_level(logging.WARNING)
        
        config_data = sample_config_data.copy()
        config_data["use_tls"] = True
        config_data["port"] = 465  # Non-standard for TLS (typically 587 or 25)
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        # Should still be valid (warning, not error)
        assert is_valid is True
        assert error == ""
        
        # Verify warning was logged
        assert any("TLS typically uses port 587 or 25" in record.message for record in caplog.records), \
            "Should log warning about TLS port mismatch"
    
    def test_validate_accepts_standard_ssl_port(
        self, 
        smtp_config_service, 
        sample_config_data,
        caplog
    ):
        """Test that standard SSL port (465) does not generate warning."""
        import logging
        
        # Set up logging to capture warnings
        caplog.set_level(logging.WARNING)
        
        config_data = sample_config_data.copy()
        config_data["use_ssl"] = True
        config_data["port"] = 465  # Standard SSL port
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        # Should be valid
        assert is_valid is True
        assert error == ""
        
        # Should NOT log SSL warning for standard port
        ssl_warnings = [r for r in caplog.records if "SSL typically uses port" in r.message]
        assert len(ssl_warnings) == 0, "Should not warn about standard SSL port"
    
    def test_validate_accepts_standard_tls_ports(
        self, 
        smtp_config_service, 
        sample_config_data,
        caplog
    ):
        """Test that standard TLS ports (587, 25) do not generate warning."""
        import logging
        
        # Test port 587
        caplog.clear()
        caplog.set_level(logging.WARNING)
        
        config_data = sample_config_data.copy()
        config_data["use_tls"] = True
        config_data["port"] = 587  # Standard TLS port
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        assert is_valid is True
        assert error == ""
        
        # Should NOT log TLS warning for standard port
        tls_warnings = [r for r in caplog.records if "TLS typically uses port" in r.message]
        assert len(tls_warnings) == 0, "Should not warn about standard TLS port 587"
        
        # Test port 25
        caplog.clear()
        config_data["port"] = 25  # Alternative standard TLS port
        
        is_valid, error = smtp_config_service.validate_config(config_data)
        
        assert is_valid is True
        assert error == ""
        
        tls_warnings = [r for r in caplog.records if "TLS typically uses port" in r.message]
        assert len(tls_warnings) == 0, "Should not warn about standard TLS port 25"


class TestDeactivateConfig:
    """Tests for deactivate_config method."""
    
    def test_deactivate_existing_config(
        self, 
        smtp_config_service, 
        test_db, 
        sample_config_data
    ):
        """Test that deactivating an existing config works."""
        tenant_id = "tenant_123"
        
        # Create config
        smtp_config_service.create_or_update_config(
            sample_config_data.copy(), 
            tenant_id
        )
        test_db.commit()
        
        # Deactivate
        result = smtp_config_service.deactivate_config(tenant_id)
        
        assert result is True
        
        # Verify config is deactivated
        config = smtp_config_service.get_active_config(tenant_id)
        assert config is None
    
    def test_deactivate_nonexistent_config(self, smtp_config_service):
        """Test that deactivating nonexistent config returns False."""
        tenant_id = "tenant_nonexistent"
        
        result = smtp_config_service.deactivate_config(tenant_id)
        
        assert result is False


class TestGlobalFallbackConfig:
    """Tests for _get_global_fallback_config method."""
    
    def test_global_fallback_uses_defaults(self, smtp_config_service):
        """Test that global fallback uses default values when env vars not set."""
        # Clear environment variables
        with patch.dict(os.environ, {}, clear=True):
            config = smtp_config_service._get_global_fallback_config()
        
        # Verify defaults
        assert config["host"] == "mail.x-ear.com"
        assert config["port"] == 465
        assert config["username"] == "info@x-ear.com"
        assert config["password"] == ""
        assert config["from_email"] == "info@x-ear.com"
        assert config["from_name"] == "X-Ear CRM"
        assert config["use_tls"] is False
        assert config["use_ssl"] is True
        assert config["timeout"] == 30
    
    def test_global_fallback_uses_env_vars(self, smtp_config_service):
        """Test that global fallback uses environment variables when set."""
        with patch.dict(os.environ, {
            "SMTP_HOST": "custom.mail.com",
            "SMTP_PORT": "587",
            "SMTP_USER": "custom@example.com",
            "SMTP_PASS": "custompass",
            "SMTP_FROM_EMAIL": "custom@example.com",
            "SMTP_FROM_NAME": "Custom Name",
            "SMTP_USE_TLS": "true",
            "SMTP_USE_SSL": "false",
            "SMTP_TIMEOUT": "45"
        }):
            config = smtp_config_service._get_global_fallback_config()
        
        # Verify custom values
        assert config["host"] == "custom.mail.com"
        assert config["port"] == 587
        assert config["username"] == "custom@example.com"
        assert config["password"] == "custompass"
        assert config["from_email"] == "custom@example.com"
        assert config["from_name"] == "Custom Name"
        assert config["use_tls"] is True
        assert config["use_ssl"] is False
        assert config["timeout"] == 45



# ============================================================================
# Property-Based Tests
# ============================================================================

class TestPropertyMostRecentActiveConfig:
    """
    Property-Based Tests for Most Recent Active Configuration Selection
    
    **Validates: Requirements 1.7**
    
    Property 5: Most Recent Active Configuration Selection
    
    For any tenant with multiple SMTP configurations, the system should select
    the configuration with the most recent created_at timestamp where is_active
    is true.
    
    This property test verifies that:
    1. When multiple active configs exist, the most recent one is selected
    2. Inactive configs are ignored regardless of their created_at timestamp
    3. The selection is consistent across varying numbers of configs (1-5)
    4. The selection works correctly with mixed active/inactive configs
    """
    
    def _create_test_db_and_service(self):
        """Helper to create a fresh database and service for each test."""
        from cryptography.fernet import Fernet
        
        # Create in-memory database
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        TestingSessionLocal = sessionmaker(bind=engine)
        session = TestingSessionLocal()
        
        # Create encryption service with valid key
        test_key = Fernet.generate_key().decode()
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": test_key}):
            encryption_service = EncryptionService()
        
        # Create SMTP config service
        service = SMTPConfigService(session, encryption_service)
        
        return session, service, encryption_service
    
    @given(
        num_configs=st.integers(min_value=1, max_value=5),
        active_indices=st.lists(
            st.integers(min_value=0, max_value=4),
            min_size=1,
            max_size=5,
            unique=True
        )
    )
    @settings(max_examples=100, deadline=None)
    def test_most_recent_active_config_selected(
        self,
        num_configs,
        active_indices
    ):
        """
        Property Test: Most Recent Active Configuration Selection
        
        **Validates: Requirements 1.7**
        
        Given: A tenant with N SMTP configurations (1-5)
        And: Some configurations are active, others are inactive
        When: get_active_config() is called
        Then: The configuration with the most recent created_at timestamp
              where is_active=True should be returned
        
        Test Strategy:
        1. Generate N configurations with different timestamps
        2. Mark some as active based on active_indices
        3. Verify get_active_config() returns the most recent active one
        4. Test with varying numbers of configs and active/inactive mixes
        """
        # Create fresh database and service for this test
        test_db, service, encryption_service = self._create_test_db_and_service()
        
        try:
            # Filter active_indices to only include valid indices for num_configs
            valid_active_indices = [idx for idx in active_indices if idx < num_configs]
            
            # Ensure at least one config is active
            if not valid_active_indices:
                valid_active_indices = [0]
            
            tenant_id = f"tenant_property_test_{num_configs}_{len(valid_active_indices)}"
            
            # Create configurations with incrementing timestamps
            configs = []
            base_time = datetime.now(timezone.utc)
            
            for i in range(num_configs):
                # Each config has a timestamp 1 second apart
                created_at = base_time + timedelta(seconds=i)
                is_active = i in valid_active_indices
                
                config = TenantSMTPConfig(
                    tenant_id=tenant_id,
                    host=f"mail{i}.test.com",
                    port=465,
                    username=f"user{i}@test.com",
                    encrypted_password=encryption_service.encrypt_password(f"pass{i}"),
                    from_email=f"from{i}@test.com",
                    from_name=f"Test {i}",
                    use_tls=False,
                    use_ssl=True,
                    timeout=30,
                    is_active=is_active,
                    created_at=created_at
                )
                test_db.add(config)
                configs.append((i, created_at, is_active))
            
            test_db.commit()
            
            # Get active config
            active_config = service.get_active_config(tenant_id)
            
            # Determine expected result: most recent active config
            active_configs = [(idx, ts) for idx, ts, active in configs if active]
            expected_idx = max(active_configs, key=lambda x: x[1])[0]
            
            # Verify the correct config was selected
            assert active_config is not None, "Should return an active config"
            assert active_config.host == f"mail{expected_idx}.test.com", \
                f"Should return the most recent active config (index {expected_idx})"
            assert active_config.is_active is True, "Returned config should be active"
            
            # Verify it's truly the most recent among active configs
            for idx, ts, is_active in configs:
                if is_active and idx != expected_idx:
                    # All other active configs should have earlier timestamps
                    config_in_db = test_db.query(TenantSMTPConfig).filter(
                        TenantSMTPConfig.tenant_id == tenant_id,
                        TenantSMTPConfig.host == f"mail{idx}.test.com"
                    ).first()
                    assert config_in_db.created_at < active_config.created_at, \
                        f"Config {idx} should have earlier timestamp than selected config {expected_idx}"
        finally:
            test_db.close()
    
    @given(
        num_inactive=st.integers(min_value=1, max_value=3),
        num_active=st.integers(min_value=1, max_value=3)
    )
    @settings(max_examples=100, deadline=None)
    def test_inactive_configs_ignored(
        self,
        num_inactive,
        num_active
    ):
        """
        Property Test: Inactive Configurations Are Ignored
        
        **Validates: Requirements 1.7**
        
        Given: A tenant with both active and inactive SMTP configurations
        And: Some inactive configs have more recent timestamps than active ones
        When: get_active_config() is called
        Then: Only active configurations should be considered
        And: The most recent active config should be returned
        
        Test Strategy:
        1. Create inactive configs with recent timestamps
        2. Create active configs with older timestamps
        3. Verify only active configs are considered
        4. Verify the most recent active config is selected
        """
        # Create fresh database and service for this test
        test_db, service, encryption_service = self._create_test_db_and_service()
        
        try:
            tenant_id = f"tenant_inactive_test_{num_inactive}_{num_active}"
            
            base_time = datetime.now(timezone.utc)
            all_configs = []
            
            # Create inactive configs with MORE RECENT timestamps
            for i in range(num_inactive):
                created_at = base_time + timedelta(seconds=100 + i)
                config = TenantSMTPConfig(
                    tenant_id=tenant_id,
                    host=f"inactive{i}.test.com",
                    port=465,
                    username=f"inactive{i}@test.com",
                    encrypted_password=encryption_service.encrypt_password(f"pass{i}"),
                    from_email=f"inactive{i}@test.com",
                    from_name=f"Inactive {i}",
                    use_tls=False,
                    use_ssl=True,
                    timeout=30,
                    is_active=False,  # INACTIVE
                    created_at=created_at
                )
                test_db.add(config)
                all_configs.append(("inactive", i, created_at, False))
            
            # Create active configs with OLDER timestamps
            active_configs = []
            for i in range(num_active):
                created_at = base_time + timedelta(seconds=i)
                config = TenantSMTPConfig(
                    tenant_id=tenant_id,
                    host=f"active{i}.test.com",
                    port=465,
                    username=f"active{i}@test.com",
                    encrypted_password=encryption_service.encrypt_password(f"pass{i}"),
                    from_email=f"active{i}@test.com",
                    from_name=f"Active {i}",
                    use_tls=False,
                    use_ssl=True,
                    timeout=30,
                    is_active=True,  # ACTIVE
                    created_at=created_at
                )
                test_db.add(config)
                all_configs.append(("active", i, created_at, True))
                active_configs.append((i, created_at))
            
            test_db.commit()
            
            # Get active config
            result = service.get_active_config(tenant_id)
            
            # Should return the most recent ACTIVE config
            # (not the most recent overall, which would be inactive)
            expected_idx = max(active_configs, key=lambda x: x[1])[0]
            
            assert result is not None, "Should return an active config"
            assert result.host == f"active{expected_idx}.test.com", \
                "Should return the most recent ACTIVE config, ignoring inactive ones"
            assert result.is_active is True, "Returned config must be active"
            
            # Verify no inactive config was returned (even if more recent)
            assert "inactive" not in result.host, \
                "Should never return an inactive config"
        finally:
            test_db.close()
    
    @given(num_configs=st.integers(min_value=1, max_value=5))
    @settings(max_examples=100, deadline=None)
    def test_single_active_among_many(
        self,
        num_configs
    ):
        """
        Property Test: Single Active Config Among Many Inactive
        
        **Validates: Requirements 1.7**
        
        Given: A tenant with N configurations
        And: Only one configuration is active
        When: get_active_config() is called
        Then: The single active configuration should be returned
        And: Its position among all configs should not matter
        
        Test Strategy:
        1. Create N configs with only one active
        2. Vary which position the active config is in
        3. Verify the active config is always found
        """
        # Create fresh database and service for this test
        test_db, service, encryption_service = self._create_test_db_and_service()
        
        try:
            tenant_id = f"tenant_single_active_{num_configs}"
            
            # Choose a random position for the active config
            import random
            active_position = random.randint(0, num_configs - 1)
            
            base_time = datetime.now(timezone.utc)
            
            for i in range(num_configs):
                created_at = base_time + timedelta(seconds=i)
                is_active = (i == active_position)
                
                config = TenantSMTPConfig(
                    tenant_id=tenant_id,
                    host=f"mail{i}.test.com",
                    port=465,
                    username=f"user{i}@test.com",
                    encrypted_password=encryption_service.encrypt_password(f"pass{i}"),
                    from_email=f"from{i}@test.com",
                    from_name=f"Test {i}",
                    use_tls=False,
                    use_ssl=True,
                    timeout=30,
                    is_active=is_active,
                    created_at=created_at
                )
                test_db.add(config)
            
            test_db.commit()
            
            # Get active config
            result = service.get_active_config(tenant_id)
            
            # Should return the single active config
            assert result is not None, "Should find the single active config"
            assert result.host == f"mail{active_position}.test.com", \
                f"Should return the active config at position {active_position}"
            assert result.is_active is True, "Returned config must be active"
        finally:
            test_db.close()
    
    def test_no_active_configs_returns_none(self):
        """
        Property Test: No Active Configs Returns None
        
        **Validates: Requirements 1.7**
        
        Given: A tenant with only inactive SMTP configurations
        When: get_active_config() is called
        Then: None should be returned (triggering fallback to global config)
        
        Test Strategy:
        1. Create multiple inactive configs
        2. Verify get_active_config() returns None
        3. This triggers the global fallback mechanism
        """
        # Create fresh database and service for this test
        test_db, service, encryption_service = self._create_test_db_and_service()
        
        try:
            tenant_id = "tenant_no_active"
            
            base_time = datetime.now(timezone.utc)
            
            # Create 3 inactive configs
            for i in range(3):
                created_at = base_time + timedelta(seconds=i)
                config = TenantSMTPConfig(
                    tenant_id=tenant_id,
                    host=f"mail{i}.test.com",
                    port=465,
                    username=f"user{i}@test.com",
                    encrypted_password=encryption_service.encrypt_password(f"pass{i}"),
                    from_email=f"from{i}@test.com",
                    from_name=f"Test {i}",
                    use_tls=False,
                    use_ssl=True,
                    timeout=30,
                    is_active=False,  # All inactive
                    created_at=created_at
                )
                test_db.add(config)
            
            test_db.commit()
            
            # Get active config
            result = service.get_active_config(tenant_id)
            
            # Should return None (no active configs)
            assert result is None, \
                "Should return None when no active configs exist (triggers global fallback)"
        finally:
            test_db.close()
