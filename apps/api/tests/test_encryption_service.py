"""
Unit tests for EncryptionService

Tests cover:
- Encryption/decryption round-trip
- Missing encryption key handling
- Invalid authentication tag handling
- Decryption failure logging
- Encryption uniqueness (different nonces)
- Property-based testing for encryption round-trip consistency
"""

import pytest
import os
from unittest.mock import patch, MagicMock
from cryptography.fernet import Fernet, InvalidToken
from hypothesis import given, settings, strategies as st

from services.encryption_service import (
    EncryptionService,
    get_encryption_service,
    reset_encryption_service
)
from utils.exceptions import ConfigurationError, SecurityException


class TestEncryptionService:
    """Test suite for EncryptionService"""
    
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        """Reset singleton before and after each test"""
        reset_encryption_service()
        yield
        reset_encryption_service()
    
    @pytest.fixture
    def valid_encryption_key(self):
        """Generate a valid Fernet key for testing"""
        return Fernet.generate_key().decode()
    
    @pytest.fixture
    def encryption_service(self, valid_encryption_key):
        """Create an EncryptionService instance with valid key"""
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": valid_encryption_key}):
            return EncryptionService()
    
    def test_initialization_with_valid_key(self, valid_encryption_key):
        """Test that EncryptionService initializes successfully with valid key"""
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": valid_encryption_key}):
            service = EncryptionService()
            assert service.fernet is not None
    
    def test_initialization_without_key_raises_configuration_error(self):
        """Test that missing encryption key raises ConfigurationError"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ConfigurationError) as exc_info:
                EncryptionService()
            
            assert "SMTP_ENCRYPTION_KEY environment variable is required" in str(exc_info.value)
    
    def test_initialization_with_invalid_key_raises_configuration_error(self):
        """Test that invalid encryption key format raises ConfigurationError"""
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": "invalid_key_format"}):
            with pytest.raises(ConfigurationError) as exc_info:
                EncryptionService()
            
            assert "Invalid SMTP_ENCRYPTION_KEY format" in str(exc_info.value)
    
    def test_encrypt_password_returns_base64_string(self, encryption_service):
        """Test that encrypt_password returns a base64-encoded string"""
        plaintext = "my_secure_password"
        encrypted = encryption_service.encrypt_password(plaintext)
        
        # Fernet output starts with version byte (gAAAAA...)
        assert isinstance(encrypted, str)
        assert len(encrypted) > 0
        assert encrypted.startswith("gAAAAA")  # Fernet version marker
    
    def test_decrypt_password_returns_original_plaintext(self, encryption_service):
        """Test that decrypt_password returns the original plaintext"""
        plaintext = "my_secure_password"
        encrypted = encryption_service.encrypt_password(plaintext)
        decrypted = encryption_service.decrypt_password(encrypted)
        
        assert decrypted == plaintext
    
    def test_encryption_round_trip_with_special_characters(self, encryption_service):
        """Test encryption/decryption with special characters"""
        plaintext = "p@ssw0rd!#$%^&*()_+-=[]{}|;:',.<>?/~`"
        encrypted = encryption_service.encrypt_password(plaintext)
        decrypted = encryption_service.decrypt_password(encrypted)
        
        assert decrypted == plaintext
    
    def test_encryption_round_trip_with_unicode(self, encryption_service):
        """Test encryption/decryption with unicode characters"""
        plaintext = "şifre_türkçe_字符_🔒"
        encrypted = encryption_service.encrypt_password(plaintext)
        decrypted = encryption_service.decrypt_password(encrypted)
        
        assert decrypted == plaintext
    
    def test_encryption_produces_different_ciphertext_each_time(self, encryption_service):
        """Test that encrypting the same plaintext produces different ciphertext (unique nonces)"""
        plaintext = "my_secure_password"
        
        encrypted1 = encryption_service.encrypt_password(plaintext)
        encrypted2 = encryption_service.encrypt_password(plaintext)
        
        # Different ciphertext due to unique nonces
        assert encrypted1 != encrypted2
        
        # But both decrypt to the same plaintext
        assert encryption_service.decrypt_password(encrypted1) == plaintext
        assert encryption_service.decrypt_password(encrypted2) == plaintext
    
    def test_decrypt_with_tampered_data_raises_security_exception(self, encryption_service):
        """Test that decrypting tampered data raises SecurityException"""
        plaintext = "my_secure_password"
        encrypted = encryption_service.encrypt_password(plaintext)
        
        # Tamper with the encrypted data
        tampered = encrypted[:-5] + "XXXXX"
        
        with pytest.raises(SecurityException) as exc_info:
            encryption_service.decrypt_password(tampered)
        
        assert "invalid authentication tag" in str(exc_info.value)
    
    def test_decrypt_with_invalid_base64_raises_security_exception(self, encryption_service):
        """Test that decrypting invalid base64 raises SecurityException"""
        invalid_encrypted = "not_valid_base64_!@#$%"
        
        with pytest.raises(SecurityException) as exc_info:
            encryption_service.decrypt_password(invalid_encrypted)
        
        assert "Password decryption failed" in str(exc_info.value)
    
    def test_decrypt_with_wrong_key_raises_security_exception(self, valid_encryption_key):
        """Test that decrypting with wrong key raises SecurityException"""
        # Encrypt with first key
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": valid_encryption_key}):
            service1 = EncryptionService()
            encrypted = service1.encrypt_password("my_password")
        
        # Try to decrypt with different key
        different_key = Fernet.generate_key().decode()
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": different_key}):
            service2 = EncryptionService()
            
            with pytest.raises(SecurityException) as exc_info:
                service2.decrypt_password(encrypted)
            
            assert "invalid authentication tag" in str(exc_info.value)
    
    def test_decryption_failure_logs_security_event(self, encryption_service, caplog):
        """Test that decryption failure logs a security event"""
        import logging
        caplog.set_level(logging.ERROR)
        
        invalid_encrypted = "gAAAAABinvalid_data"
        
        with pytest.raises(SecurityException):
            encryption_service.decrypt_password(invalid_encrypted)
        
        # Check that security event was logged
        assert any("invalid authentication tag" in record.message for record in caplog.records)
        assert any(record.levelname == "ERROR" for record in caplog.records)
    
    def test_encrypt_empty_string(self, encryption_service):
        """Test encrypting an empty string"""
        plaintext = ""
        encrypted = encryption_service.encrypt_password(plaintext)
        decrypted = encryption_service.decrypt_password(encrypted)
        
        assert decrypted == plaintext
    
    def test_encrypt_very_long_password(self, encryption_service):
        """Test encrypting a very long password"""
        plaintext = "a" * 10000  # 10KB password
        encrypted = encryption_service.encrypt_password(plaintext)
        decrypted = encryption_service.decrypt_password(encrypted)
        
        assert decrypted == plaintext
    
    def test_get_encryption_service_returns_singleton(self, valid_encryption_key):
        """Test that get_encryption_service returns the same instance"""
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": valid_encryption_key}):
            service1 = get_encryption_service()
            service2 = get_encryption_service()
            
            assert service1 is service2
    
    def test_reset_encryption_service_clears_singleton(self, valid_encryption_key):
        """Test that reset_encryption_service clears the singleton"""
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": valid_encryption_key}):
            service1 = get_encryption_service()
            reset_encryption_service()
            service2 = get_encryption_service()
            
            assert service1 is not service2
    
    def test_encryption_service_initialization_logs_success(self, valid_encryption_key, caplog):
        """Test that successful initialization logs info message"""
        import logging
        caplog.set_level(logging.INFO)
        
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": valid_encryption_key}):
            EncryptionService()
        
        assert any("EncryptionService initialized successfully" in record.message for record in caplog.records)
    
    def test_encryption_service_initialization_logs_error_on_missing_key(self, caplog):
        """Test that missing key logs error message"""
        import logging
        caplog.set_level(logging.ERROR)
        
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ConfigurationError):
                EncryptionService()
        
        assert any("SMTP_ENCRYPTION_KEY environment variable is required" in record.message for record in caplog.records)


class TestEncryptionServiceEdgeCases:
    """Test edge cases and error conditions"""
    
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        """Reset singleton before and after each test"""
        reset_encryption_service()
        yield
        reset_encryption_service()
    
    @pytest.fixture
    def valid_encryption_key(self):
        """Generate a valid Fernet key for testing"""
        return Fernet.generate_key().decode()
    
    @pytest.fixture
    def encryption_service(self, valid_encryption_key):
        """Create an EncryptionService instance with valid key"""
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": valid_encryption_key}):
            return EncryptionService()
    
    def test_encrypt_with_newlines(self, encryption_service):
        """Test encrypting password with newlines"""
        plaintext = "password\nwith\nnewlines"
        encrypted = encryption_service.encrypt_password(plaintext)
        decrypted = encryption_service.decrypt_password(encrypted)
        
        assert decrypted == plaintext
    
    def test_encrypt_with_null_bytes(self, encryption_service):
        """Test encrypting password with null bytes"""
        plaintext = "password\x00with\x00nulls"
        encrypted = encryption_service.encrypt_password(plaintext)
        decrypted = encryption_service.decrypt_password(encrypted)
        
        assert decrypted == plaintext
    
    def test_decrypt_with_empty_string_raises_security_exception(self, encryption_service):
        """Test that decrypting empty string raises SecurityException"""
        with pytest.raises(SecurityException):
            encryption_service.decrypt_password("")
    
    def test_encrypt_password_logs_debug_message(self, encryption_service, caplog):
        """Test that encryption logs debug message"""
        import logging
        caplog.set_level(logging.DEBUG)
        
        encryption_service.encrypt_password("test_password")
        
        assert any("Password encrypted successfully" in record.message for record in caplog.records)
    
    def test_decrypt_password_logs_debug_message(self, encryption_service, caplog):
        """Test that decryption logs debug message"""
        import logging
        caplog.set_level(logging.DEBUG)
        
        encrypted = encryption_service.encrypt_password("test_password")
        encryption_service.decrypt_password(encrypted)
        
        assert any("Password decrypted successfully" in record.message for record in caplog.records)
    
    def test_missing_encryption_key_error_message_is_user_friendly(self):
        """
        Test that missing encryption key raises ConfigurationError with user-friendly message.
        
        Requirement 2.3: WHEN encryption key is missing, THE System SHALL raise a configuration error
        
        This test verifies:
        1. ConfigurationError is raised (not generic Exception)
        2. Error message is clear and actionable
        3. Error message includes instructions for generating a key
        4. Error message doesn't expose sensitive system details
        """
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ConfigurationError) as exc_info:
                EncryptionService()
            
            error_message = str(exc_info.value)
            
            # Verify error message is user-friendly
            assert "SMTP_ENCRYPTION_KEY environment variable is required" in error_message
            assert "Generate a key using:" in error_message
            assert "Fernet.generate_key()" in error_message
            
            # Verify error message doesn't expose sensitive details
            assert "password" not in error_message.lower() or "generate" in error_message.lower()
            assert "secret" not in error_message.lower()
    
    def test_empty_encryption_key_raises_configuration_error(self):
        """
        Test that empty encryption key (empty string) raises ConfigurationError.
        
        Requirement 2.3: WHEN encryption key is missing, THE System SHALL raise a configuration error
        
        This test verifies that an empty string is treated the same as a missing key.
        """
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": ""}):
            with pytest.raises(ConfigurationError) as exc_info:
                EncryptionService()
            
            assert "SMTP_ENCRYPTION_KEY environment variable is required" in str(exc_info.value)
    
    def test_tampered_ciphertext_error_message_is_user_friendly(self, encryption_service):
        """
        Test that tampered ciphertext raises SecurityException with user-friendly message.
        
        Requirement 2.6: IF decryption fails due to invalid authentication tag, 
        THEN THE System SHALL log the security event and raise an exception
        
        This test verifies:
        1. SecurityException is raised (not generic Exception)
        2. Error message is user-friendly and doesn't expose sensitive details
        3. Error message doesn't reveal cryptographic implementation details
        """
        plaintext = "my_secure_password"
        encrypted = encryption_service.encrypt_password(plaintext)
        
        # Tamper with the encrypted data
        tampered = encrypted[:-5] + "XXXXX"
        
        with pytest.raises(SecurityException) as exc_info:
            encryption_service.decrypt_password(tampered)
        
        error_message = str(exc_info.value)
        
        # Verify error message is user-friendly
        assert "invalid authentication tag" in error_message.lower()
        
        # Verify error message doesn't expose sensitive details
        assert plaintext not in error_message
        assert "Fernet" not in error_message  # Don't expose crypto library details
        assert "AES" not in error_message  # Don't expose algorithm details
    
    def test_decryption_failure_logs_security_event_with_structured_fields(self, encryption_service, caplog):
        """
        Test that decryption failure logs security event with proper structured logging.
        
        Requirement 2.6: IF decryption fails due to invalid authentication tag, 
        THEN THE System SHALL log the security event and raise an exception
        
        This test verifies:
        1. Security event is logged at ERROR level
        2. Log includes structured fields: security_event, error_type
        3. Log includes encrypted_data_length for forensics
        4. Log doesn't include sensitive data (plaintext, keys)
        """
        import logging
        caplog.set_level(logging.ERROR)
        
        plaintext = "my_secure_password"
        encrypted = encryption_service.encrypt_password(plaintext)
        
        # Tamper with the encrypted data
        tampered = encrypted[:-5] + "XXXXX"
        
        with pytest.raises(SecurityException):
            encryption_service.decrypt_password(tampered)
        
        # Find the security event log record
        security_logs = [
            record for record in caplog.records 
            if record.levelname == "ERROR" and "invalid authentication tag" in record.message
        ]
        
        assert len(security_logs) > 0, "Security event should be logged"
        
        security_log = security_logs[0]
        
        # Verify structured logging fields
        assert hasattr(security_log, "security_event"), "Log should include security_event field"
        assert security_log.security_event == "decryption_failure"
        
        assert hasattr(security_log, "error_type"), "Log should include error_type field"
        assert security_log.error_type == "invalid_token"
        
        assert hasattr(security_log, "encrypted_data_length"), "Log should include encrypted_data_length field"
        assert security_log.encrypted_data_length == len(tampered)
        
        # Verify sensitive data is NOT logged
        assert plaintext not in security_log.message
        assert "password" not in security_log.message.lower() or "decryption" in security_log.message.lower()
    
    def test_decryption_failure_with_invalid_base64_logs_security_event(self, encryption_service, caplog):
        """
        Test that decryption failure with invalid base64 logs security event.
        
        Requirement 2.6: IF decryption fails, THEN THE System SHALL log the security event
        
        This test verifies that all decryption failures (including invalid base64) 
        are logged with proper structure. Note: Fernet raises InvalidToken for any 
        decryption failure, including invalid base64 format.
        """
        import logging
        caplog.set_level(logging.ERROR)
        
        invalid_encrypted = "not_valid_base64_!@#$%"
        
        with pytest.raises(SecurityException):
            encryption_service.decrypt_password(invalid_encrypted)
        
        # Find the security event log record
        security_logs = [
            record for record in caplog.records 
            if record.levelname == "ERROR" and "invalid authentication tag" in record.message
        ]
        
        assert len(security_logs) > 0, "Security event should be logged"
        
        security_log = security_logs[0]
        
        # Verify structured logging fields
        assert hasattr(security_log, "security_event"), "Log should include security_event field"
        assert security_log.security_event == "decryption_failure"
        
        assert hasattr(security_log, "error_type"), "Log should include error_type field"
        # Fernet raises InvalidToken for all decryption failures
        assert security_log.error_type == "invalid_token"
    
    def test_wrong_key_decryption_error_message_doesnt_expose_keys(self, valid_encryption_key):
        """
        Test that decryption with wrong key doesn't expose key material in error message.
        
        Requirement 2.6: IF decryption fails, THEN THE System SHALL log the security event
        
        This test verifies that error messages never expose encryption keys.
        """
        # Encrypt with first key
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": valid_encryption_key}):
            service1 = EncryptionService()
            encrypted = service1.encrypt_password("my_password")
        
        # Try to decrypt with different key
        different_key = Fernet.generate_key().decode()
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": different_key}):
            service2 = EncryptionService()
            
            with pytest.raises(SecurityException) as exc_info:
                service2.decrypt_password(encrypted)
            
            error_message = str(exc_info.value)
            
            # Verify keys are not exposed in error message
            assert valid_encryption_key not in error_message
            assert different_key not in error_message
            assert "my_password" not in error_message
    
    def test_initialization_logs_error_on_missing_key_before_raising(self, caplog):
        """
        Test that missing key logs error before raising ConfigurationError.
        
        Requirement 2.3: WHEN encryption key is missing, THE System SHALL raise a configuration error
        
        This test verifies that the error is logged for operational visibility.
        """
        import logging
        caplog.set_level(logging.ERROR)
        
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ConfigurationError):
                EncryptionService()
        
        # Verify error was logged
        error_logs = [
            record for record in caplog.records 
            if record.levelname == "ERROR" and "SMTP_ENCRYPTION_KEY" in record.message
        ]
        
        assert len(error_logs) > 0, "Missing key error should be logged"
        assert "environment variable is required" in error_logs[0].message



class TestEncryptionServicePropertyBased:
    """
    Property-based tests for EncryptionService using Hypothesis.
    
    These tests validate universal properties that should hold for ALL inputs,
    running with minimum 100 iterations per property.
    """
    
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        """Reset singleton before and after each test"""
        reset_encryption_service()
        yield
        reset_encryption_service()
    
    @given(plaintext=st.text(min_size=0, max_size=1000))
    @settings(max_examples=100, deadline=None)
    def test_property_encryption_round_trip_consistency(self, plaintext):
        """
        **Property 1: Encryption Round-Trip Consistency**
        **Validates: Requirements 1.1, 2.1, 2.5**
        
        For any plaintext SMTP password, encrypting then decrypting should 
        produce the original password value.
        
        This property ensures that:
        1. Encryption is reversible
        2. No data is lost during encryption/decryption
        3. The authentication tag is correctly validated
        4. The system works with any valid string input
        
        Test strategy:
        - Generate random strings of various lengths and character sets
        - Encrypt each string
        - Decrypt the ciphertext
        - Verify the result matches the original plaintext
        - Verify ciphertext is different from plaintext (unless empty)
        """
        # Generate a valid encryption key for this test
        valid_encryption_key = Fernet.generate_key().decode()
        
        # Create encryption service with valid key
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": valid_encryption_key}):
            service = EncryptionService()
        
        # Encrypt the plaintext
        ciphertext = service.encrypt_password(plaintext)
        
        # Verify ciphertext is a non-empty string
        assert isinstance(ciphertext, str)
        assert len(ciphertext) > 0
        
        # Verify ciphertext is different from plaintext (unless plaintext is empty)
        # Empty strings may have predictable short ciphertexts, but they should still differ
        if len(plaintext) > 0:
            assert ciphertext != plaintext, "Ciphertext should differ from plaintext"
        
        # Decrypt the ciphertext
        decrypted = service.decrypt_password(ciphertext)
        
        # CRITICAL: Decrypted value must exactly match original plaintext
        assert decrypted == plaintext, (
            f"Round-trip failed: original={repr(plaintext)}, "
            f"decrypted={repr(decrypted)}"
        )
    
    @given(plaintext=st.text(min_size=1, max_size=500))
    @settings(max_examples=100, deadline=None)
    def test_property_encryption_produces_unique_ciphertext(self, plaintext):
        """
        **Property 2: Encryption Uniqueness**
        **Validates: Requirements 2.4**
        
        Encrypting the same plaintext multiple times should produce different 
        ciphertext each time due to unique nonce generation.
        
        This property ensures that:
        1. Each encryption operation generates a unique nonce
        2. The same password encrypted twice cannot be correlated
        3. Replay attacks are prevented
        
        Test strategy:
        - Generate random strings
        - Encrypt the same string twice
        - Verify the two ciphertexts are different
        - Verify both decrypt to the same original plaintext
        """
        # Generate a valid encryption key for this test
        valid_encryption_key = Fernet.generate_key().decode()
        
        # Create encryption service with valid key
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": valid_encryption_key}):
            service = EncryptionService()
        
        # Encrypt the same plaintext twice
        ciphertext1 = service.encrypt_password(plaintext)
        ciphertext2 = service.encrypt_password(plaintext)
        
        # Verify both are valid ciphertexts
        assert isinstance(ciphertext1, str)
        assert isinstance(ciphertext2, str)
        assert len(ciphertext1) > 0
        assert len(ciphertext2) > 0
        
        # CRITICAL: Ciphertexts must be different (unique nonces)
        assert ciphertext1 != ciphertext2, (
            f"Encrypting the same plaintext twice should produce different "
            f"ciphertext due to unique nonces"
        )
        
        # Both should decrypt to the same original plaintext
        decrypted1 = service.decrypt_password(ciphertext1)
        decrypted2 = service.decrypt_password(ciphertext2)
        
        assert decrypted1 == plaintext
        assert decrypted2 == plaintext
    
    @given(
        plaintext=st.text(
            alphabet=st.characters(
                blacklist_categories=('Cs',),  # Exclude surrogates
                blacklist_characters='\x00'     # Exclude null bytes for safety
            ),
            min_size=0,
            max_size=500
        )
    )
    @settings(max_examples=100, deadline=None)
    def test_property_encryption_handles_unicode(self, plaintext):
        """
        **Property: Unicode Character Handling**
        **Validates: Requirements 2.1, 2.5**
        
        Encryption should correctly handle all valid Unicode characters,
        including special characters, emojis, and non-ASCII text.
        
        This is critical for international deployments where SMTP passwords
        may contain non-ASCII characters.
        
        Test strategy:
        - Generate strings with diverse Unicode characters
        - Verify round-trip encryption/decryption preserves all characters
        """
        # Generate a valid encryption key for this test
        valid_encryption_key = Fernet.generate_key().decode()
        
        # Create encryption service with valid key
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": valid_encryption_key}):
            service = EncryptionService()
        
        # Encrypt and decrypt
        ciphertext = service.encrypt_password(plaintext)
        decrypted = service.decrypt_password(ciphertext)
        
        # Verify exact match
        assert decrypted == plaintext, (
            f"Unicode handling failed: original={repr(plaintext)}, "
            f"decrypted={repr(decrypted)}"
        )
    
    @given(plaintext=st.text(min_size=1, max_size=100))
    @settings(max_examples=100, deadline=None)
    def test_property_ciphertext_format(self, plaintext):
        """
        **Property: Ciphertext Format Consistency**
        **Validates: Requirements 2.1, 2.4**
        
        All ciphertexts should follow the Fernet format:
        - Base64-encoded
        - Start with version marker 'gAAAAA'
        - Contain embedded nonce and authentication tag
        
        Test strategy:
        - Generate random plaintexts
        - Verify all ciphertexts follow the expected format
        """
        # Generate a valid encryption key for this test
        valid_encryption_key = Fernet.generate_key().decode()
        
        # Create encryption service with valid key
        with patch.dict(os.environ, {"SMTP_ENCRYPTION_KEY": valid_encryption_key}):
            service = EncryptionService()
        
        # Encrypt
        ciphertext = service.encrypt_password(plaintext)
        
        # Verify Fernet format
        assert isinstance(ciphertext, str)
        assert ciphertext.startswith("gAAAAA"), (
            f"Ciphertext should start with Fernet version marker 'gAAAAA', "
            f"got: {ciphertext[:10]}"
        )
        
        # Verify it's valid base64 by attempting to decrypt
        decrypted = service.decrypt_password(ciphertext)
        assert decrypted == plaintext
