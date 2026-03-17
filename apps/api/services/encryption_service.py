"""
EncryptionService for SMTP Email Integration

Now delegates to the unified CryptoService (AES-256-GCM, quantum-resistant).
Maintains backward compatibility: decrypts legacy Fernet values transparently,
new encryptions always use AES-256-GCM.

Requirements:
- 2.1: Use AES-256-GCM encryption algorithm
- 2.2: Read encryption key from ENCRYPTION_KEY / SMTP_ENCRYPTION_KEY env var
- 2.3: Raise ConfigurationError if encryption key is missing
- 2.4: Generate unique nonce for each encryption operation
- 2.5: Validate authentication tag during decryption
- 2.6: Log security events for decryption failures
"""

import logging
from services.crypto_service import CryptoService, get_crypto_service, reset_crypto_service
from utils.exceptions import ConfigurationError, SecurityException  # noqa: F401 – re-export

logger = logging.getLogger(__name__)


class EncryptionService:
    """
    Thin wrapper around CryptoService for backward compatibility.

    All new encryptions use AES-256-GCM. Legacy Fernet values are
    decrypted transparently on read.
    """

    def __init__(self):
        try:
            self._crypto = CryptoService()
            logger.info("EncryptionService initialized (AES-256-GCM via CryptoService)")
        except ConfigurationError:
            raise
        except Exception as e:
            raise ConfigurationError(f"EncryptionService init failed: {e}")

    def encrypt_password(self, plaintext: str) -> str:
        """Encrypt with AES-256-GCM."""
        try:
            return self._crypto.encrypt(plaintext)
        except Exception as e:
            raise SecurityException(f"Password encryption failed: {e}")

    def decrypt_password(self, encrypted: str) -> str:
        """Decrypt AES-256-GCM or legacy Fernet."""
        try:
            return self._crypto.decrypt(encrypted)
        except Exception as e:
            raise SecurityException(f"Password decryption failed: {e}")


# Singleton
_encryption_service_instance = None


def get_encryption_service() -> EncryptionService:
    """Get the singleton EncryptionService instance (FastAPI Depends compatible)."""
    global _encryption_service_instance
    if _encryption_service_instance is None:
        _encryption_service_instance = EncryptionService()
    return _encryption_service_instance


def reset_encryption_service():
    """Reset singleton (testing only)."""
    global _encryption_service_instance
    _encryption_service_instance = None
    reset_crypto_service()
