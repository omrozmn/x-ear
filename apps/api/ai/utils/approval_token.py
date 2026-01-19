"""
Approval Token Generation and Validation

Implements HMAC-signed tokens for action approval with:
- Binding to action_plan_hash + tenant_id + approver_id
- 24-hour expiration
- Single-use tracking
- Plan drift detection

Requirements:
- 8.3: Approval token is single-use, HMAC-signed, bound to action_plan_hash + tenant_id + approver_id
- 8.4: Approval token expires within 24 hours
- 8.5: Token invalidated if action_plan changes (plan drift detection)
"""

import hashlib
import hmac
import json
import os
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Set
from uuid import uuid4
import base64
import logging

logger = logging.getLogger(__name__)


class ApprovalTokenError(Exception):
    """Base exception for approval token errors."""
    pass


class TokenExpiredError(ApprovalTokenError):
    """Token has expired."""
    pass


class TokenAlreadyUsedError(ApprovalTokenError):
    """Token has already been used (single-use enforcement)."""
    pass


class TokenInvalidSignatureError(ApprovalTokenError):
    """Token signature is invalid."""
    pass


class PlanDriftError(ApprovalTokenError):
    """Action plan has changed since token was issued."""
    pass


class TokenNotFoundError(ApprovalTokenError):
    """Token not found in registry."""
    pass


def _get_secret_key() -> bytes:
    """Get the secret key for HMAC signing."""
    key = os.getenv("AI_APPROVAL_SECRET_KEY")
    if not key:
        # Generate a random key if not set (for development)
        # In production, this should be set via environment variable
        key = secrets.token_hex(32)
        logger.warning(
            "AI_APPROVAL_SECRET_KEY not set, using random key. "
            "Set this in production for token persistence across restarts."
        )
    return key.encode()


def _compute_action_plan_hash(action_plan: dict) -> str:
    """Compute SHA-256 hash of action plan."""
    # Sort keys for deterministic hashing
    plan_json = json.dumps(action_plan, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(plan_json.encode()).hexdigest()


@dataclass
class ApprovalToken:
    """
    Single-use, HMAC-signed token for action approval.
    
    Bound to: action_plan_hash + tenant_id + approver_id
    
    Attributes:
        token_id: Unique identifier for the token
        action_id: ID of the action being approved
        action_plan_hash: SHA-256 hash of the action plan
        tenant_id: Tenant boundary
        approver_id: User who can approve
        issued_at: When the token was issued
        expires_at: When the token expires (max 24 hours)
        signature: HMAC-SHA256 signature
    """
    token_id: str
    action_id: str
    action_plan_hash: str
    tenant_id: str
    approver_id: str
    issued_at: datetime
    expires_at: datetime
    signature: str
    
    @classmethod
    def generate(
        cls,
        action_id: str,
        action_plan_hash: str,
        tenant_id: str,
        approver_id: str,
        expiration_hours: int = 24,
    ) -> "ApprovalToken":
        """
        Generate a new approval token.
        
        Args:
            action_id: ID of the action to approve
            action_plan_hash: SHA-256 hash of the action plan
            tenant_id: Tenant ID
            approver_id: User ID of the approver
            expiration_hours: Hours until expiration (max 24)
            
        Returns:
            New ApprovalToken instance
        """
        # Enforce max 24 hour expiration
        expiration_hours = min(expiration_hours, 24)
        
        token_id = f"aptok_{uuid4().hex}"
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=expiration_hours)
        
        # Create signature payload
        payload = cls._create_signature_payload(
            token_id=token_id,
            action_id=action_id,
            action_plan_hash=action_plan_hash,
            tenant_id=tenant_id,
            approver_id=approver_id,
            issued_at=now,
            expires_at=expires_at,
        )
        
        # Sign with HMAC-SHA256
        signature = cls._sign(payload)
        
        token = cls(
            token_id=token_id,
            action_id=action_id,
            action_plan_hash=action_plan_hash,
            tenant_id=tenant_id,
            approver_id=approver_id,
            issued_at=now,
            expires_at=expires_at,
            signature=signature,
        )
        
        logger.info(
            f"Generated approval token {token_id} for action {action_id}",
            extra={
                "token_id": token_id,
                "action_id": action_id,
                "tenant_id": tenant_id,
                "approver_id": approver_id,
                "expires_at": expires_at.isoformat(),
            }
        )
        
        return token
    
    @staticmethod
    def _create_signature_payload(
        token_id: str,
        action_id: str,
        action_plan_hash: str,
        tenant_id: str,
        approver_id: str,
        issued_at: datetime,
        expires_at: datetime,
    ) -> str:
        """Create the payload string for signing."""
        return (
            f"{token_id}:{action_id}:{action_plan_hash}:"
            f"{tenant_id}:{approver_id}:"
            f"{issued_at.isoformat()}:{expires_at.isoformat()}"
        )
    
    @staticmethod
    def _sign(payload: str) -> str:
        """Sign payload with HMAC-SHA256."""
        signature = hmac.new(
            _get_secret_key(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    def verify_signature(self) -> bool:
        """Verify the token signature."""
        payload = self._create_signature_payload(
            token_id=self.token_id,
            action_id=self.action_id,
            action_plan_hash=self.action_plan_hash,
            tenant_id=self.tenant_id,
            approver_id=self.approver_id,
            issued_at=self.issued_at,
            expires_at=self.expires_at,
        )
        expected_signature = self._sign(payload)
        return hmac.compare_digest(self.signature, expected_signature)
    
    def is_expired(self) -> bool:
        """Check if the token has expired."""
        return datetime.now(timezone.utc) > self.expires_at
    
    def check_plan_drift(self, current_action_plan_hash: str) -> bool:
        """
        Check if the action plan has changed since token was issued.
        
        Returns:
            True if plan has drifted (changed), False if unchanged
        """
        return self.action_plan_hash != current_action_plan_hash
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "tokenId": self.token_id,
            "actionId": self.action_id,
            "actionPlanHash": self.action_plan_hash,
            "tenantId": self.tenant_id,
            "approverId": self.approver_id,
            "issuedAt": self.issued_at.isoformat(),
            "expiresAt": self.expires_at.isoformat(),
            "signature": self.signature,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "ApprovalToken":
        """Create from dictionary."""
        return cls(
            token_id=data["tokenId"],
            action_id=data["actionId"],
            action_plan_hash=data["actionPlanHash"],
            tenant_id=data["tenantId"],
            approver_id=data["approverId"],
            issued_at=datetime.fromisoformat(data["issuedAt"]),
            expires_at=datetime.fromisoformat(data["expiresAt"]),
            signature=data["signature"],
        )
    
    def encode(self) -> str:
        """Encode token to a URL-safe string."""
        data = json.dumps(self.to_dict(), separators=(',', ':'))
        return base64.urlsafe_b64encode(data.encode()).decode()
    
    @classmethod
    def decode(cls, encoded: str) -> "ApprovalToken":
        """Decode token from URL-safe string."""
        try:
            data = json.loads(base64.urlsafe_b64decode(encoded.encode()).decode())
            return cls.from_dict(data)
        except Exception as e:
            raise ApprovalTokenError(f"Failed to decode token: {e}")
    
    def get_hash(self) -> str:
        """Get hash of the token for storage (not the full token)."""
        return hashlib.sha256(self.token_id.encode()).hexdigest()


class ApprovalTokenRegistry:
    """
    Registry for tracking approval tokens.
    
    Handles:
    - Token storage and retrieval
    - Single-use enforcement
    - Expiration cleanup
    """
    
    def __init__(self):
        # In-memory storage for tokens
        # In production, this should be backed by Redis or database
        self._tokens: Dict[str, ApprovalToken] = {}
        self._used_tokens: Set[str] = set()
    
    def register(self, token: ApprovalToken) -> None:
        """Register a new token."""
        self._tokens[token.token_id] = token
        logger.debug(f"Registered token {token.token_id}")
    
    def get(self, token_id: str) -> Optional[ApprovalToken]:
        """Get a token by ID."""
        return self._tokens.get(token_id)
    
    def mark_used(self, token_id: str) -> None:
        """Mark a token as used (single-use enforcement)."""
        self._used_tokens.add(token_id)
        logger.info(f"Marked token {token_id} as used")
    
    def is_used(self, token_id: str) -> bool:
        """Check if a token has been used."""
        return token_id in self._used_tokens
    
    def remove(self, token_id: str) -> None:
        """Remove a token from the registry."""
        self._tokens.pop(token_id, None)
        self._used_tokens.discard(token_id)
    
    def cleanup_expired(self) -> int:
        """Remove expired tokens. Returns count of removed tokens."""
        now = datetime.now(timezone.utc)
        expired = [
            token_id for token_id, token in self._tokens.items()
            if token.expires_at < now
        ]
        for token_id in expired:
            self.remove(token_id)
        if expired:
            logger.info(f"Cleaned up {len(expired)} expired tokens")
        return len(expired)
    
    def clear(self) -> None:
        """Clear all tokens (for testing)."""
        self._tokens.clear()
        self._used_tokens.clear()


# Global registry instance
_registry: Optional[ApprovalTokenRegistry] = None


def get_token_registry() -> ApprovalTokenRegistry:
    """Get the global token registry instance."""
    global _registry
    if _registry is None:
        _registry = ApprovalTokenRegistry()
    return _registry


def reset_token_registry() -> None:
    """Reset the global token registry (for testing)."""
    global _registry
    _registry = None


@dataclass
class TokenValidationResult:
    """Result of token validation."""
    valid: bool
    token: Optional[ApprovalToken] = None
    error: Optional[str] = None
    error_type: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "valid": self.valid,
            "error": self.error,
            "errorType": self.error_type,
        }


class ApprovalTokenValidator:
    """
    Validates approval tokens with comprehensive checks.
    
    Validation includes:
    - Signature verification
    - Expiration check
    - Single-use enforcement
    - Plan drift detection
    """
    
    def __init__(self, registry: Optional[ApprovalTokenRegistry] = None):
        self._registry = registry or get_token_registry()
    
    def validate(
        self,
        token: ApprovalToken,
        current_action_plan_hash: str,
        expected_action_id: Optional[str] = None,
        expected_tenant_id: Optional[str] = None,
        expected_approver_id: Optional[str] = None,
    ) -> TokenValidationResult:
        """
        Validate an approval token.
        
        Args:
            token: The token to validate
            current_action_plan_hash: Current hash of the action plan
            expected_action_id: Expected action ID (optional)
            expected_tenant_id: Expected tenant ID (optional)
            expected_approver_id: Expected approver ID (optional)
            
        Returns:
            TokenValidationResult with validation outcome
        """
        # 1. Verify signature
        if not token.verify_signature():
            logger.warning(
                f"Token {token.token_id} has invalid signature",
                extra={"token_id": token.token_id}
            )
            return TokenValidationResult(
                valid=False,
                error="Invalid token signature",
                error_type="invalid_signature",
            )
        
        # 2. Check expiration
        if token.is_expired():
            logger.info(
                f"Token {token.token_id} has expired",
                extra={
                    "token_id": token.token_id,
                    "expired_at": token.expires_at.isoformat(),
                }
            )
            return TokenValidationResult(
                valid=False,
                error="Token has expired",
                error_type="expired",
            )
        
        # 3. Check single-use (if registry is available)
        if self._registry.is_used(token.token_id):
            logger.warning(
                f"Token {token.token_id} has already been used",
                extra={"token_id": token.token_id}
            )
            return TokenValidationResult(
                valid=False,
                error="Token has already been used",
                error_type="already_used",
            )
        
        # 4. Check plan drift
        if token.check_plan_drift(current_action_plan_hash):
            logger.warning(
                f"Token {token.token_id} has plan drift",
                extra={
                    "token_id": token.token_id,
                    "original_hash": token.action_plan_hash,
                    "current_hash": current_action_plan_hash,
                }
            )
            return TokenValidationResult(
                valid=False,
                error="Action plan has changed since token was issued",
                error_type="plan_drift",
            )
        
        # 5. Check action ID match (if provided)
        if expected_action_id and token.action_id != expected_action_id:
            logger.warning(
                f"Token {token.token_id} action ID mismatch",
                extra={
                    "token_id": token.token_id,
                    "expected": expected_action_id,
                    "actual": token.action_id,
                }
            )
            return TokenValidationResult(
                valid=False,
                error="Token action ID does not match",
                error_type="action_mismatch",
            )
        
        # 6. Check tenant ID match (if provided)
        if expected_tenant_id and token.tenant_id != expected_tenant_id:
            logger.warning(
                f"Token {token.token_id} tenant ID mismatch",
                extra={
                    "token_id": token.token_id,
                    "expected": expected_tenant_id,
                    "actual": token.tenant_id,
                }
            )
            return TokenValidationResult(
                valid=False,
                error="Token tenant ID does not match",
                error_type="tenant_mismatch",
            )
        
        # 7. Check approver ID match (if provided)
        if expected_approver_id and token.approver_id != expected_approver_id:
            logger.warning(
                f"Token {token.token_id} approver ID mismatch",
                extra={
                    "token_id": token.token_id,
                    "expected": expected_approver_id,
                    "actual": token.approver_id,
                }
            )
            return TokenValidationResult(
                valid=False,
                error="Token approver ID does not match",
                error_type="approver_mismatch",
            )
        
        # All checks passed
        logger.info(
            f"Token {token.token_id} validated successfully",
            extra={"token_id": token.token_id}
        )
        return TokenValidationResult(valid=True, token=token)
    
    def validate_and_consume(
        self,
        token: ApprovalToken,
        current_action_plan_hash: str,
        expected_action_id: Optional[str] = None,
        expected_tenant_id: Optional[str] = None,
        expected_approver_id: Optional[str] = None,
    ) -> TokenValidationResult:
        """
        Validate and consume a token (mark as used).
        
        This is the primary method for using a token - it validates
        and marks the token as used in a single operation.
        
        Args:
            token: The token to validate and consume
            current_action_plan_hash: Current hash of the action plan
            expected_action_id: Expected action ID (optional)
            expected_tenant_id: Expected tenant ID (optional)
            expected_approver_id: Expected approver ID (optional)
            
        Returns:
            TokenValidationResult with validation outcome
        """
        result = self.validate(
            token=token,
            current_action_plan_hash=current_action_plan_hash,
            expected_action_id=expected_action_id,
            expected_tenant_id=expected_tenant_id,
            expected_approver_id=expected_approver_id,
        )
        
        if result.valid:
            # Mark token as used (single-use enforcement)
            self._registry.mark_used(token.token_id)
            logger.info(
                f"Token {token.token_id} consumed",
                extra={"token_id": token.token_id}
            )
        
        return result
    
    def validate_encoded(
        self,
        encoded_token: str,
        current_action_plan_hash: str,
        **kwargs,
    ) -> TokenValidationResult:
        """
        Validate an encoded token string.
        
        Args:
            encoded_token: Base64-encoded token string
            current_action_plan_hash: Current hash of the action plan
            **kwargs: Additional validation parameters
            
        Returns:
            TokenValidationResult with validation outcome
        """
        try:
            token = ApprovalToken.decode(encoded_token)
        except ApprovalTokenError as e:
            return TokenValidationResult(
                valid=False,
                error=str(e),
                error_type="decode_error",
            )
        
        return self.validate(
            token=token,
            current_action_plan_hash=current_action_plan_hash,
            **kwargs,
        )


def generate_approval_token(
    action_id: str,
    action_plan: dict,
    tenant_id: str,
    approver_id: str,
    expiration_hours: int = 24,
) -> ApprovalToken:
    """
    Convenience function to generate and register an approval token.
    
    Args:
        action_id: ID of the action to approve
        action_plan: The action plan dictionary
        tenant_id: Tenant ID
        approver_id: User ID of the approver
        expiration_hours: Hours until expiration (max 24)
        
    Returns:
        New ApprovalToken instance
    """
    action_plan_hash = _compute_action_plan_hash(action_plan)
    
    token = ApprovalToken.generate(
        action_id=action_id,
        action_plan_hash=action_plan_hash,
        tenant_id=tenant_id,
        approver_id=approver_id,
        expiration_hours=expiration_hours,
    )
    
    # Register the token
    get_token_registry().register(token)
    
    return token


def validate_approval_token(
    token: ApprovalToken,
    action_plan: dict,
    consume: bool = True,
    **kwargs,
) -> TokenValidationResult:
    """
    Convenience function to validate an approval token.
    
    Args:
        token: The token to validate
        action_plan: Current action plan dictionary
        consume: Whether to mark the token as used
        **kwargs: Additional validation parameters
        
    Returns:
        TokenValidationResult with validation outcome
    """
    current_hash = _compute_action_plan_hash(action_plan)
    validator = ApprovalTokenValidator()
    
    if consume:
        return validator.validate_and_consume(
            token=token,
            current_action_plan_hash=current_hash,
            **kwargs,
        )
    else:
        return validator.validate(
            token=token,
            current_action_plan_hash=current_hash,
            **kwargs,
        )
