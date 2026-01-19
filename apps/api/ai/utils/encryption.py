"""
Encryption utilities for AI Layer data protection.

Requirements:
- 10.1: Store prompts in encrypted form with configurable retention (default 30 days)

This module provides AES-256-GCM encryption for sensitive data like prompts.
The encryption key is loaded from environment variables.
"""

import os
import base64
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple
from dataclasses import dataclass


# Default retention period in days
DEFAULT_RETENTION_DAYS = 30
MIN_RETENTION_DAYS = 1
MAX_RETENTION_DAYS = 365


class EncryptionError(Exception):
    """Raised when encryption/decryption fails."""
    pass


class EncryptionKeyMissingError(EncryptionError):
    """Raised when encryption key is not configured."""
    pass


@dataclass
class EncryptedData:
    """Container for encrypted data with metadata."""
    ciphertext: bytes
    nonce: bytes
    tag: bytes
    
    def to_base64(self) -> str:
        """Encode encrypted data as base64 string for storage."""
        # Format: nonce (12 bytes) + tag (16 bytes) + ciphertext
        combined = self.nonce + self.tag + self.ciphertext
        return base64.b64encode(combined).decode('utf-8')
    
    @classmethod
    def from_base64(cls, encoded: str) -> "EncryptedData":
        """Decode encrypted data from base64 string."""
        try:
            combined = base64.b64decode(encoded.encode('utf-8'))
            if len(combined) < 28:  # 12 (nonce) + 16 (tag) minimum
                raise EncryptionError("Invalid encrypted data format")
            
            nonce = combined[:12]
            tag = combined[12:28]
            ciphertext = combined[28:]
            
            return cls(ciphertext=ciphertext, nonce=nonce, tag=tag)
        except Exception as e:
            raise EncryptionError(f"Failed to decode encrypted data: {e}")


class PromptEncryptor:
    """
    Encrypts and decrypts prompts using AES-256-GCM.
    
    The encryption key is derived from the AI_ENCRYPTION_KEY environment variable.
    If no key is set, encryption operations will fail with EncryptionKeyMissingError.
    
    Usage:
        encryptor = PromptEncryptor()
        encrypted = encryptor.encrypt("sensitive prompt")
        decrypted = encryptor.decrypt(encrypted)
    """
    
    # AES-256 requires 32-byte key
    KEY_SIZE = 32
    # GCM nonce size
    NONCE_SIZE = 12
    
    def __init__(self, key: Optional[bytes] = None):
        """
        Initialize the encryptor.
        
        Args:
            key: Optional encryption key. If not provided, loaded from environment.
        """
        if key is not None:
            self._key = key
        else:
            self._key = self._load_key_from_env()
    
    def _load_key_from_env(self) -> bytes:
        """Load encryption key from environment variable."""
        key_str = os.getenv("AI_ENCRYPTION_KEY")
        if not key_str:
            raise EncryptionKeyMissingError(
                "AI_ENCRYPTION_KEY environment variable is not set. "
                "Generate a key using: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        
        # Key can be hex-encoded or base64-encoded
        try:
            # Try hex first
            if len(key_str) == 64:  # 32 bytes * 2 hex chars
                return bytes.fromhex(key_str)
            # Try base64
            key_bytes = base64.b64decode(key_str)
            if len(key_bytes) == self.KEY_SIZE:
                return key_bytes
        except Exception:
            pass
        
        # Derive key from string using PBKDF2
        return self._derive_key(key_str)
    
    def _derive_key(self, password: str) -> bytes:
        """Derive a 256-bit key from a password using PBKDF2."""
        # Use a fixed salt for deterministic key derivation
        # In production, consider using a per-tenant salt stored securely
        salt = b"xear_ai_layer_v1"
        return hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt,
            iterations=100000,
            dklen=self.KEY_SIZE
        )
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a plaintext string.
        
        Args:
            plaintext: The text to encrypt
            
        Returns:
            Base64-encoded encrypted data
            
        Raises:
            EncryptionError: If encryption fails
            EncryptionKeyMissingError: If no encryption key is configured
        """
        if not self._key:
            raise EncryptionKeyMissingError("Encryption key not configured")
        
        try:
            # Import cryptography here to make it optional
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
            
            # Generate random nonce
            nonce = secrets.token_bytes(self.NONCE_SIZE)
            
            # Create cipher and encrypt
            aesgcm = AESGCM(self._key)
            ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
            
            # GCM appends the tag to ciphertext, extract it
            # Tag is last 16 bytes
            tag = ciphertext[-16:]
            actual_ciphertext = ciphertext[:-16]
            
            encrypted = EncryptedData(
                ciphertext=actual_ciphertext,
                nonce=nonce,
                tag=tag
            )
            
            return encrypted.to_base64()
            
        except ImportError:
            # Fallback to simple encoding if cryptography not available
            # This is NOT secure and should only be used for development
            import warnings
            warnings.warn(
                "cryptography library not installed. Using insecure base64 encoding. "
                "Install cryptography for production use: pip install cryptography",
                RuntimeWarning
            )
            return self._fallback_encode(plaintext)
        except Exception as e:
            raise EncryptionError(f"Encryption failed: {e}")
    
    def decrypt(self, encrypted: str) -> str:
        """
        Decrypt an encrypted string.
        
        Args:
            encrypted: Base64-encoded encrypted data
            
        Returns:
            Decrypted plaintext
            
        Raises:
            EncryptionError: If decryption fails
            EncryptionKeyMissingError: If no encryption key is configured
        """
        if not self._key:
            raise EncryptionKeyMissingError("Encryption key not configured")
        
        try:
            # Import cryptography here to make it optional
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
            
            # Decode encrypted data
            data = EncryptedData.from_base64(encrypted)
            
            # Reconstruct ciphertext with tag
            ciphertext_with_tag = data.ciphertext + data.tag
            
            # Create cipher and decrypt
            aesgcm = AESGCM(self._key)
            plaintext = aesgcm.decrypt(data.nonce, ciphertext_with_tag, None)
            
            return plaintext.decode('utf-8')
            
        except ImportError:
            # Fallback to simple decoding if cryptography not available
            return self._fallback_decode(encrypted)
        except Exception as e:
            raise EncryptionError(f"Decryption failed: {e}")
    
    def _fallback_encode(self, plaintext: str) -> str:
        """Fallback encoding when cryptography is not available (NOT SECURE)."""
        # XOR with key for minimal obfuscation (NOT SECURE)
        key_bytes = self._key
        plaintext_bytes = plaintext.encode('utf-8')
        
        # Simple XOR
        result = bytes(
            p ^ key_bytes[i % len(key_bytes)]
            for i, p in enumerate(plaintext_bytes)
        )
        
        # Prefix with marker to identify fallback encoding
        return "FALLBACK:" + base64.b64encode(result).decode('utf-8')
    
    def _fallback_decode(self, encoded: str) -> str:
        """Fallback decoding when cryptography is not available."""
        if not encoded.startswith("FALLBACK:"):
            raise EncryptionError("Cannot decode: not fallback encoded")
        
        encoded_data = encoded[9:]  # Remove "FALLBACK:" prefix
        encrypted_bytes = base64.b64decode(encoded_data.encode('utf-8'))
        
        # Reverse XOR
        key_bytes = self._key
        result = bytes(
            e ^ key_bytes[i % len(key_bytes)]
            for i, e in enumerate(encrypted_bytes)
        )
        
        return result.decode('utf-8')
    
    @staticmethod
    def hash_prompt(prompt: str) -> str:
        """
        Generate SHA-256 hash of a prompt for deduplication.
        
        Args:
            prompt: The prompt to hash
            
        Returns:
            Hex-encoded SHA-256 hash
        """
        return hashlib.sha256(prompt.encode('utf-8')).hexdigest()


class RetentionConfig:
    """
    Configuration for data retention periods.
    
    Retention periods are loaded from environment variables:
    - AI_PROMPT_RETENTION_DAYS: Retention for encrypted prompts (default: 30)
    - AI_AUDIT_RETENTION_DAYS: Retention for audit logs (default: 90)
    - AI_SNAPSHOT_RETENTION_DAYS: Retention for diff snapshots (default: 90)
    """
    
    def __init__(self):
        self._prompt_retention_days = self._load_retention(
            "AI_PROMPT_RETENTION_DAYS", DEFAULT_RETENTION_DAYS
        )
        self._audit_retention_days = self._load_retention(
            "AI_AUDIT_RETENTION_DAYS", 90
        )
        self._snapshot_retention_days = self._load_retention(
            "AI_SNAPSHOT_RETENTION_DAYS", 90
        )
    
    def _load_retention(self, env_var: str, default: int) -> int:
        """Load retention period from environment variable."""
        try:
            days = int(os.getenv(env_var, str(default)))
            # Clamp to valid range
            return max(MIN_RETENTION_DAYS, min(MAX_RETENTION_DAYS, days))
        except ValueError:
            return default
    
    @property
    def prompt_retention_days(self) -> int:
        """Retention period for encrypted prompts in days."""
        return self._prompt_retention_days
    
    @property
    def audit_retention_days(self) -> int:
        """Retention period for audit logs in days."""
        return self._audit_retention_days
    
    @property
    def snapshot_retention_days(self) -> int:
        """Retention period for diff snapshots in days."""
        return self._snapshot_retention_days
    
    def get_prompt_expiry(self, from_date: Optional[datetime] = None) -> datetime:
        """Calculate expiry date for prompts."""
        base = from_date or datetime.utcnow()
        return base + timedelta(days=self._prompt_retention_days)
    
    def get_audit_expiry(self, from_date: Optional[datetime] = None) -> datetime:
        """Calculate expiry date for audit logs."""
        base = from_date or datetime.utcnow()
        return base + timedelta(days=self._audit_retention_days)
    
    def is_expired(self, created_at: datetime, retention_days: int) -> bool:
        """Check if a record has exceeded its retention period."""
        expiry = created_at + timedelta(days=retention_days)
        return datetime.utcnow() > expiry


# Singleton instances
_encryptor: Optional[PromptEncryptor] = None
_retention_config: Optional[RetentionConfig] = None


def get_encryptor() -> PromptEncryptor:
    """Get the singleton PromptEncryptor instance."""
    global _encryptor
    if _encryptor is None:
        _encryptor = PromptEncryptor()
    return _encryptor


def get_retention_config() -> RetentionConfig:
    """Get the singleton RetentionConfig instance."""
    global _retention_config
    if _retention_config is None:
        _retention_config = RetentionConfig()
    return _retention_config


def encrypt_prompt(prompt: str) -> Tuple[str, str]:
    """
    Encrypt a prompt and return encrypted data with hash.
    
    Args:
        prompt: The prompt to encrypt
        
    Returns:
        Tuple of (encrypted_prompt, prompt_hash)
    """
    encryptor = get_encryptor()
    encrypted = encryptor.encrypt(prompt)
    prompt_hash = encryptor.hash_prompt(prompt)
    return encrypted, prompt_hash


def decrypt_prompt(encrypted: str) -> str:
    """
    Decrypt an encrypted prompt.
    
    Args:
        encrypted: The encrypted prompt
        
    Returns:
        Decrypted prompt
    """
    return get_encryptor().decrypt(encrypted)


def reset_singletons() -> None:
    """Reset singleton instances (for testing)."""
    global _encryptor, _retention_config
    _encryptor = None
    _retention_config = None
