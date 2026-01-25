"""
AI Request Logger Service

Logs AI requests to the database with encrypted prompts and user audit trail.

Requirements:
- 2.7: Log all processed requests with tenant context and user_id
- 9.1: Store user_id in ai_request table for audit trail
- 10.1: Store prompts in encrypted form with configurable retention
"""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from uuid import uuid4

from sqlalchemy.orm import Session

from ai.models.ai_request import AIRequest, RequestStatus

logger = logging.getLogger(__name__)


class RequestLogger:
    """
    Service for logging AI requests to the database.
    
    Handles:
    - Prompt encryption
    - User audit trail
    - Tenant isolation
    - Idempotency
    """
    
    def __init__(self, db: Session):
        """
        Initialize the request logger.
        
        Args:
            db: Database session
        """
        self.db = db
        self.encryption_service = EncryptionService()
    
    def log_request(
        self,
        tenant_id: str,
        user_id: str,
        prompt: str,
        session_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        model_id: Optional[str] = None,
        model_version: Optional[str] = None,
        prompt_template_id: Optional[str] = None,
        prompt_template_hash: Optional[str] = None,
    ) -> AIRequest:
        """
        Log an AI request to the database.
        
        Args:
            tenant_id: Tenant ID from JWT token
            user_id: User ID from JWT token (for audit trail)
            prompt: User's natural language prompt
            session_id: Optional session ID for conversation context
            idempotency_key: Optional idempotency key for duplicate detection
            model_id: Model used for processing
            model_version: Version of the model
            prompt_template_id: Template used for the prompt
            prompt_template_hash: SHA-256 hash of the prompt template
            
        Returns:
            Created AIRequest record
            
        Raises:
            ValueError: If required fields are missing
        """
        # Validate required fields
        if not tenant_id:
            raise ValueError("tenant_id is required")
        if not user_id:
            raise ValueError("user_id is required")
        if not prompt:
            raise ValueError("prompt is required")
        
        # Check for duplicate idempotency key
        if idempotency_key:
            existing = self.db.query(AIRequest).filter(
                AIRequest.tenant_id == tenant_id,
                AIRequest.idempotency_key == idempotency_key,
            ).first()
            
            if existing:
                logger.info(
                    f"Duplicate request detected via idempotency key",
                    extra={
                        "tenant_id": tenant_id,
                        "user_id": user_id,
                        "idempotency_key": idempotency_key,
                        "existing_request_id": existing.id,
                    }
                )
                return existing
        
        # Encrypt prompt
        encrypted_prompt, encryption_key_id = self.encryption_service.encrypt(prompt)
        
        # Compute prompt hash for deduplication
        prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()
        
        # Create AI request record
        ai_request = AIRequest(
            tenant_id=tenant_id,
            user_id=user_id,  # Requirement 2.7: Include user_id for audit trail
            session_id=session_id,
            prompt_encrypted=encrypted_prompt,
            prompt_hash=prompt_hash,
            model_id=model_id,
            model_version=model_version,
            prompt_template_id=prompt_template_id,
            prompt_template_hash=prompt_template_hash,
            status=RequestStatus.PENDING.value,
            idempotency_key=idempotency_key,
        )
        
        # Save to database
        self.db.add(ai_request)
        self.db.commit()
        self.db.refresh(ai_request)
        
        logger.info(
            f"AI request logged to database",
            extra={
                "request_id": ai_request.id,
                "tenant_id": tenant_id,
                "user_id": user_id,
                "session_id": session_id,
                "model_id": model_id,
            }
        )
        
        return ai_request
    
    def update_request_status(
        self,
        request_id: str,
        status: RequestStatus,
        intent_type: Optional[str] = None,
        intent_confidence: Optional[float] = None,
        intent_data: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        tokens_input: Optional[int] = None,
        tokens_output: Optional[int] = None,
        latency_ms: Optional[int] = None,
    ) -> Optional[AIRequest]:
        """
        Update the status of an AI request.
        
        Args:
            request_id: Request ID to update
            status: New status
            intent_type: Classified intent type
            intent_confidence: Confidence score (0.0-1.0)
            intent_data: Structured intent data
            error_message: Error message if failed
            tokens_input: Number of input tokens
            tokens_output: Number of output tokens
            latency_ms: Processing latency in milliseconds
            
        Returns:
            Updated AIRequest record, or None if not found
        """
        ai_request = self.db.query(AIRequest).filter(
            AIRequest.id == request_id
        ).first()
        
        if not ai_request:
            logger.warning(f"AI request not found: {request_id}")
            return None
        
        # Update status
        ai_request.status = status.value
        
        # Update intent classification
        if intent_type:
            ai_request.intent_type = intent_type
        if intent_confidence is not None:
            # Store as integer (0-100) for precision
            ai_request.intent_confidence = int(intent_confidence * 100)
        if intent_data:
            ai_request.intent_data = intent_data
        
        # Update error message
        if error_message:
            ai_request.error_message = error_message
        
        # Update usage metrics
        if tokens_input is not None:
            ai_request.tokens_input = tokens_input
        if tokens_output is not None:
            ai_request.tokens_output = tokens_output
        if latency_ms is not None:
            ai_request.latency_ms = latency_ms
        
        # Update completion timestamp
        if status in [RequestStatus.COMPLETED, RequestStatus.FAILED, RequestStatus.REJECTED, RequestStatus.TIMEOUT]:
            ai_request.completed_at = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(ai_request)
        
        logger.info(
            f"AI request status updated",
            extra={
                "request_id": request_id,
                "status": status.value,
                "intent_type": intent_type,
            }
        )
        
        return ai_request
    
        return ai_request

    def cleanup_old_requests(self, days: int = 90) -> int:
        """
        Delete AI requests older than specified days, unless they have a legal hold.
        BUG-009: Implement retention policy.
        
        Args:
            days: Retention period in days (default: 90)
            
        Returns:
            Number of requests deleted
        """
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Count and delete requests older than cutoff without legal hold
        query = self.db.query(AIRequest).filter(
            AIRequest.created_at < cutoff,
            AIRequest.legal_hold == False
        )
        count = query.delete(synchronize_session=False)
        self.db.commit()
        
        if count > 0:
            logger.info(f"Audit cleanup: removed {count} requests older than {days} days")
            
        return count


class EncryptionService:
    """
    Service for encrypting and decrypting prompts.
    
    In production, this should use a proper key management service (KMS).
    For now, we use a simple encryption scheme.
    """
    
    def __init__(self):
        """Initialize the encryption service."""
        # In production, load encryption key from KMS
        self.encryption_key_id = "default_key_v1"
    
    def encrypt(self, plaintext: str) -> tuple[str, str]:
        """
        Encrypt a plaintext string.
        
        Args:
            plaintext: Text to encrypt
            
        Returns:
            Tuple of (encrypted_text, key_id)
        """
        # TODO: Implement proper AES-256-GCM encryption
        # For now, we just base64 encode (NOT SECURE - placeholder only)
        import base64
        encrypted = base64.b64encode(plaintext.encode()).decode()
        return encrypted, self.encryption_key_id
    
    def decrypt(self, encrypted_text: str, key_id: str) -> str:
        """
        Decrypt an encrypted string.
        
        Args:
            encrypted_text: Encrypted text
            key_id: Key ID used for encryption
            
        Returns:
            Decrypted plaintext
        """
        # TODO: Implement proper AES-256-GCM decryption
        # For now, we just base64 decode (NOT SECURE - placeholder only)
        import base64
        decrypted = base64.b64decode(encrypted_text.encode()).decode()
        return decrypted


def encrypt_prompt(prompt: str) -> tuple[str, str]:
    """
    Encrypt a prompt using the default encryption service.
    
    Args:
        prompt: Plaintext prompt
        
    Returns:
        Tuple of (encrypted_prompt, key_id)
    """
    service = EncryptionService()
    return service.encrypt(prompt)


def get_request_logger(db: Session) -> RequestLogger:
    """
    Get a RequestLogger instance.
    
    Args:
        db: Database session
        
    Returns:
        RequestLogger instance
    """
    return RequestLogger(db)
