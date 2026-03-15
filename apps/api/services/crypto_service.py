"""
Unified AES-256-GCM Encryption Service (Quantum-Resistant)

Provides AES-256-GCM encryption for all sensitive data across the platform:
- SMTP passwords
- SGK credentials (tesis kodu, mesul müdür şifresi)
- POS merchant keys
- TC Kimlik numbers
- Any integration credentials

AES-256 with 256-bit keys is considered quantum-resistant:
Grover's algorithm halves effective key length → 128-bit equivalent,
still computationally infeasible for quantum computers.

Backward Compatibility:
- Detects Fernet-encrypted values (prefix 'gAAAAA') and transparently re-encrypts
- New encryptions always use AES-256-GCM
"""

import os
import base64
import hashlib
import secrets
import logging
from typing import Optional
from dataclasses import dataclass

from utils.exceptions import ConfigurationError, SecurityException

logger = logging.getLogger(__name__)

# AES-256-GCM constants
KEY_SIZE = 32       # 256 bits
NONCE_SIZE = 12     # 96 bits (GCM standard)
TAG_SIZE = 16       # 128 bits

# Prefix to identify AES-256-GCM encrypted values
AES_GCM_PREFIX = "AESGCM:"
# Fernet tokens always start with 'gAAAAA'
FERNET_PREFIX = "gAAAAA"


@dataclass
class EncryptedPayload:
    """Container for AES-256-GCM encrypted data."""
    nonce: bytes
    tag: bytes
    ciphertext: bytes

    def to_string(self) -> str:
        """Serialize to storage-safe string: AESGCM:<base64(nonce+tag+ciphertext)>"""
        combined = self.nonce + self.tag + self.ciphertext
        return AES_GCM_PREFIX + base64.b64encode(combined).decode("utf-8")

    @classmethod
    def from_string(cls, encoded: str) -> "EncryptedPayload":
        """Deserialize from storage string."""
        if not encoded.startswith(AES_GCM_PREFIX):
            raise SecurityException("Invalid encrypted data format: missing AESGCM prefix")
        raw = encoded[len(AES_GCM_PREFIX):]
        try:
            combined = base64.b64decode(raw)
        except Exception as e:
            raise SecurityException(f"Invalid base64 in encrypted data: {e}")
        if len(combined) < NONCE_SIZE + TAG_SIZE:
            raise SecurityException("Encrypted data too short")
        nonce = combined[:NONCE_SIZE]
        tag = combined[NONCE_SIZE:NONCE_SIZE + TAG_SIZE]
        ciphertext = combined[NONCE_SIZE + TAG_SIZE:]
        return cls(nonce=nonce, tag=tag, ciphertext=ciphertext)


class CryptoService:
    """
    Unified AES-256-GCM encryption service.

    Uses ENCRYPTION_KEY env var (falls back to SMTP_ENCRYPTION_KEY for backward compat).
    Key derivation: if raw key isn't exactly 32 bytes, PBKDF2-HMAC-SHA256 is applied.
    """

    def __init__(self, key: Optional[bytes] = None):
        if key is not None:
            self._key = key
        else:
            self._key = self._load_key()
        self._fernet = None  # lazy-loaded for backward compat

    def _load_key(self) -> bytes:
        """Load and derive AES-256 key from environment."""
        key_str = os.getenv("ENCRYPTION_KEY") or os.getenv("SMTP_ENCRYPTION_KEY")
        if not key_str:
            logger.error(
                "ENCRYPTION_KEY (or SMTP_ENCRYPTION_KEY) environment variable is required"
            )
            raise ConfigurationError(
                "ENCRYPTION_KEY (or SMTP_ENCRYPTION_KEY) environment variable is required. "
                "Generate with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        # Try hex (64 hex chars = 32 bytes)
        if len(key_str) == 64:
            try:
                return bytes.fromhex(key_str)
            except ValueError:
                pass
        # Try base64
        try:
            decoded = base64.b64decode(key_str)
            if len(decoded) == KEY_SIZE:
                return decoded
        except Exception:
            pass
        # Derive via PBKDF2
        return self._derive_key(key_str)

    @staticmethod
    def _derive_key(password: str) -> bytes:
        """Derive 256-bit key from arbitrary string via PBKDF2-HMAC-SHA256."""
        return hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            b"xear_crypto_v1",
            iterations=100_000,
            dklen=KEY_SIZE,
        )

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext with AES-256-GCM.

        Returns:
            String in format 'AESGCM:<base64(nonce+tag+ciphertext)>'
        """
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        nonce = secrets.token_bytes(NONCE_SIZE)
        aesgcm = AESGCM(self._key)
        ct_with_tag = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        # AESGCM appends 16-byte tag
        tag = ct_with_tag[-TAG_SIZE:]
        ciphertext = ct_with_tag[:-TAG_SIZE]
        payload = EncryptedPayload(nonce=nonce, tag=tag, ciphertext=ciphertext)
        return payload.to_string()

    def decrypt(self, encrypted: str) -> str:
        """
        Decrypt an encrypted string.

        Supports both AES-256-GCM (new) and Fernet (legacy) formats.
        If Fernet is detected, decrypts with Fernet and returns plaintext.
        """
        if encrypted.startswith(AES_GCM_PREFIX):
            return self._decrypt_aesgcm(encrypted)
        if encrypted.startswith(FERNET_PREFIX):
            return self._decrypt_fernet_legacy(encrypted)
        # Try AES-GCM without prefix (unlikely but safe)
        try:
            return self._decrypt_aesgcm(AES_GCM_PREFIX + encrypted)
        except Exception:
            raise SecurityException(
                "Cannot decrypt: unrecognized format. "
                "Expected AESGCM: or Fernet (gAAAAA) prefix."
            )

    def _decrypt_aesgcm(self, encrypted: str) -> str:
        """Decrypt AES-256-GCM encrypted data."""
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        payload = EncryptedPayload.from_string(encrypted)
        ct_with_tag = payload.ciphertext + payload.tag
        aesgcm = AESGCM(self._key)
        try:
            plaintext = aesgcm.decrypt(payload.nonce, ct_with_tag, None)
            return plaintext.decode("utf-8")
        except Exception as e:
            logger.error(
                "AES-256-GCM decryption failed",
                extra={"security_event": "decryption_failure", "error": str(e)},
            )
            raise SecurityException("Decryption failed — invalid key or tampered data")

    def _decrypt_fernet_legacy(self, encrypted: str) -> str:
        """Decrypt legacy Fernet-encrypted data for backward compatibility."""
        fernet = self._get_fernet()
        if fernet is None:
            raise SecurityException(
                "Cannot decrypt Fernet data: SMTP_ENCRYPTION_KEY not available"
            )
        try:
            decrypted = fernet.decrypt(encrypted.encode("utf-8"))
            return decrypted.decode("utf-8")
        except Exception as e:
            logger.error(
                "Fernet legacy decryption failed",
                extra={"security_event": "fernet_decryption_failure", "error": str(e)},
            )
            raise SecurityException("Legacy Fernet decryption failed")

    def _get_fernet(self):
        """Lazy-load Fernet for backward compatibility."""
        if self._fernet is None:
            fernet_key = os.getenv("SMTP_ENCRYPTION_KEY")
            if fernet_key:
                try:
                    from cryptography.fernet import Fernet
                    self._fernet = Fernet(fernet_key.encode())
                except Exception:
                    return None
        return self._fernet

    def re_encrypt(self, encrypted: str) -> str:
        """Decrypt (any format) then re-encrypt with AES-256-GCM."""
        plaintext = self.decrypt(encrypted)
        return self.encrypt(plaintext)

    def is_legacy_format(self, encrypted: str) -> bool:
        """Check if value is encrypted with legacy Fernet."""
        return encrypted.startswith(FERNET_PREFIX)

    # Convenience aliases matching old EncryptionService API
    def encrypt_password(self, plaintext: str) -> str:
        """Encrypt a password (alias for encrypt)."""
        return self.encrypt(plaintext)

    def decrypt_password(self, encrypted: str) -> str:
        """Decrypt a password (alias for decrypt)."""
        return self.decrypt(encrypted)


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------
_crypto_service_instance: Optional[CryptoService] = None


def get_crypto_service() -> CryptoService:
    """Get the singleton CryptoService instance (FastAPI Depends compatible)."""
    global _crypto_service_instance
    if _crypto_service_instance is None:
        _crypto_service_instance = CryptoService()
    return _crypto_service_instance


def reset_crypto_service() -> None:
    """Reset singleton (testing only)."""
    global _crypto_service_instance
    _crypto_service_instance = None
