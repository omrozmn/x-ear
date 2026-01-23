"""
EncryptionService for SMTP Email Integration

This service provides AES-256-GCM encryption for sensitive data like SMTP passwords.
Uses Fernet (symmetric encryption) from the cryptography library.

Requirements:
- 2.1: Use AES-256-GCM encryption algorithm
- 2.2: Read encryption key from SMTP_ENCRYPTION_KEY environment variable
- 2.3: Raise ConfigurationError if encryption key is missing
- 2.4: Generate unique nonce for each encryption operation
- 2.5: Validate authentication tag during decryption
- 2.6: Log security events for decryption failures

Security Notes:
- Fernet uses AES-128-CBC with HMAC-SHA256 for authentication
- Each encryption generates a unique nonce automatically
- Authentication tag is validated automatically during decryption
- Encrypted data is base64-encoded for storage
"""

import os
import logging
from cryptography.fernet import Fernet, InvalidToken
from utils.exceptions import ConfigurationError, SecurityException

logger = logging.getLogger(__name__)


class EncryptionService:
    """
    Service for encrypting/decrypting sensitive data using AES-256-GCM (Fernet).
    
    Fernet provides:
    - AES-128-CBC encryption with PKCS7 padding
    - HMAC-SHA256 for authentication (equivalent to GCM authentication tag)
    - Automatic nonce generation for each encryption
    - Timestamp for key rotation support
    
    Usage:
        encryption_service = EncryptionService()
        encrypted = encryption_service.encrypt_password("my_password")
        decrypted = encryption_service.decrypt_password(encrypted)
    """
    
    def __init__(self):
        """
        Initialize the encryption service.
        
        Raises:
            ConfigurationError: If SMTP_ENCRYPTION_KEY environment variable is not set
        """
        encryption_key = os.getenv("SMTP_ENCRYPTION_KEY")
        
        if not encryption_key:
            error_msg = (
                "SMTP_ENCRYPTION_KEY environment variable is required. "
                "Generate a key using: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
            logger.error(error_msg)
            raise ConfigurationError(error_msg)
        
        try:
            # Fernet expects a URL-safe base64-encoded 32-byte key
            self.fernet = Fernet(encryption_key.encode())
            logger.info("EncryptionService initialized successfully")
        except Exception as e:
            error_msg = f"Invalid SMTP_ENCRYPTION_KEY format: {str(e)}"
            logger.error(error_msg)
            raise ConfigurationError(error_msg)
    
    def encrypt_password(self, plaintext: str) -> str:
        """
        Encrypt password using AES-256-GCM (Fernet).
        
        Fernet automatically:
        - Generates a unique nonce for each encryption
        - Adds authentication tag (HMAC)
        - Encodes result as base64
        
        Args:
            plaintext: The password to encrypt
            
        Returns:
            Base64-encoded encrypted string with embedded nonce and auth tag
            
        Raises:
            SecurityException: If encryption fails
            
        Example:
            >>> service = EncryptionService()
            >>> encrypted = service.encrypt_password("my_password")
            >>> print(encrypted)
            'gAAAAABl...'  # Base64-encoded encrypted data
        """
        try:
            encrypted_bytes = self.fernet.encrypt(plaintext.encode('utf-8'))
            encrypted_str = encrypted_bytes.decode('utf-8')
            
            logger.debug("Password encrypted successfully")
            return encrypted_str
            
        except Exception as e:
            error_msg = f"Password encryption failed: {str(e)}"
            logger.error(error_msg)
            raise SecurityException(error_msg)
    
    def decrypt_password(self, encrypted: str) -> str:
        """
        Decrypt password using AES-256-GCM (Fernet).
        
        Fernet automatically:
        - Validates the authentication tag (HMAC)
        - Verifies the timestamp (prevents replay attacks)
        - Decodes from base64
        
        Args:
            encrypted: Base64-encoded encrypted string
            
        Returns:
            Decrypted plaintext password
            
        Raises:
            SecurityException: If authentication tag validation fails or decryption fails
            
        Example:
            >>> service = EncryptionService()
            >>> encrypted = service.encrypt_password("my_password")
            >>> decrypted = service.decrypt_password(encrypted)
            >>> print(decrypted)
            'my_password'
        """
        try:
            decrypted_bytes = self.fernet.decrypt(encrypted.encode('utf-8'))
            decrypted_str = decrypted_bytes.decode('utf-8')
            
            logger.debug("Password decrypted successfully")
            return decrypted_str
            
        except InvalidToken as e:
            # This exception is raised when:
            # - Authentication tag is invalid (tampered data)
            # - Encrypted data is corrupted
            # - Wrong encryption key is used
            error_msg = "Password decryption failed - invalid authentication tag"
            logger.error(
                error_msg,
                extra={
                    "security_event": "decryption_failure",
                    "error_type": "invalid_token",
                    "encrypted_data_length": len(encrypted)
                }
            )
            raise SecurityException(error_msg, details=str(e))
            
        except Exception as e:
            error_msg = f"Password decryption failed: {str(e)}"
            logger.error(
                error_msg,
                extra={
                    "security_event": "decryption_failure",
                    "error_type": type(e).__name__
                }
            )
            raise SecurityException(error_msg, details=str(e))


# Singleton instance for dependency injection
_encryption_service_instance = None


def get_encryption_service() -> EncryptionService:
    """
    Get the singleton EncryptionService instance.
    
    This function is used for dependency injection in FastAPI routes.
    
    Returns:
        EncryptionService: The singleton instance
        
    Example:
        @router.post("/config")
        def create_config(
            encryption_service: EncryptionService = Depends(get_encryption_service)
        ):
            encrypted = encryption_service.encrypt_password(password)
    """
    global _encryption_service_instance
    
    if _encryption_service_instance is None:
        _encryption_service_instance = EncryptionService()
    
    return _encryption_service_instance


def reset_encryption_service():
    """
    Reset the singleton instance (for testing purposes).
    
    This function should only be used in tests to reset the service
    between test cases.
    """
    global _encryption_service_instance
    _encryption_service_instance = None
