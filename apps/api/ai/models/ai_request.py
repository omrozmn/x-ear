"""
AIRequest Model - Stores AI requests with encrypted prompts.

Requirements:
- 9.1: Log all requests to AI_Audit_Storage
- 10.1: Store prompts in encrypted form with configurable retention
- 2.7: Log all processed requests with tenant context

This model stores the initial AI request before processing.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import uuid4

from sqlalchemy import Column, String, Text, DateTime, Integer, Boolean, Index
from sqlalchemy.dialects.postgresql import JSONB

from database import Base, now_utc


def _gen_id() -> str:
    """Generate a unique ID for AI requests."""
    return f"aireq_{uuid4().hex}"


class RequestStatus(str, Enum):
    """Status of an AI request."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REJECTED = "rejected"  # Rejected by policy engine
    TIMEOUT = "timeout"


class AIRequest(Base):
    """
    Stores AI requests with encrypted prompts.
    
    This is part of AI_Audit_Storage - the AI Layer's dedicated storage.
    Core business tables are NOT accessible to the AI Layer.
    
    Attributes:
        id: Unique request identifier (aireq_<uuid>)
        tenant_id: Tenant isolation boundary
        user_id: User who made the request
        session_id: Optional session for conversation context
        
        prompt_encrypted: Encrypted user prompt (AES-256-GCM)
        prompt_hash: SHA-256 hash of original prompt for deduplication
        prompt_redacted: Redacted version for logging (PII/PHI removed)
        
        intent_type: Classified intent type (e.g., "query", "action", "report")
        intent_confidence: Confidence score from Intent Refiner (0.0-1.0)
        intent_data: Structured intent output as JSON
        
        model_id: Model used for processing
        model_version: Version of the model
        prompt_template_id: Template used for the prompt
        prompt_template_hash: SHA-256 hash of the prompt template
        
        status: Current status of the request
        error_message: Error message if failed
        
        tokens_input: Number of input tokens consumed
        tokens_output: Number of output tokens generated
        latency_ms: Total processing latency in milliseconds
        
        created_at: When the request was created
        completed_at: When the request was completed
    """
    __tablename__ = "ai_requests"
    
    # Primary key
    id = Column(String(64), primary_key=True, default=_gen_id)
    
    # Tenant and user context
    tenant_id = Column(String(64), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    session_id = Column(String(64), nullable=True, index=True)
    
    # Request content (encrypted and redacted)
    prompt_encrypted = Column(Text, nullable=False)  # AES-256-GCM encrypted
    prompt_hash = Column(String(64), nullable=False, index=True)  # SHA-256
    prompt_redacted = Column(Text, nullable=True)  # PII/PHI redacted version
    
    # Intent classification
    intent_type = Column(String(32), nullable=True)
    intent_confidence = Column(Integer, nullable=True)  # 0-100 (stored as int for precision)
    intent_data = Column(JSONB, nullable=True)  # Structured intent output
    
    # Model tracking
    model_id = Column(String(64), nullable=True)
    model_version = Column(String(32), nullable=True)
    prompt_template_id = Column(String(64), nullable=True)
    prompt_template_hash = Column(String(64), nullable=True)  # SHA-256
    
    # Status tracking
    status = Column(String(20), nullable=False, default=RequestStatus.PENDING.value)
    error_message = Column(Text, nullable=True)
    
    # Usage metrics
    tokens_input = Column(Integer, nullable=True, default=0)
    tokens_output = Column(Integer, nullable=True, default=0)
    latency_ms = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=now_utc, index=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Legal hold flag (prevents deletion during compliance investigations)
    legal_hold = Column(Boolean, nullable=False, default=False, index=True)
    
    # Idempotency
    idempotency_key = Column(String(128), nullable=True, index=True)
    
    # Indexes for common queries
    __table_args__ = (
        Index("ix_ai_requests_tenant_created", "tenant_id", "created_at"),
        Index("ix_ai_requests_user_created", "user_id", "created_at"),
        Index("ix_ai_requests_status_created", "status", "created_at"),
        Index("ix_ai_requests_legal_hold_created", "legal_hold", "created_at"),
    )
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "tenantId": self.tenant_id,
            "userId": self.user_id,
            "sessionId": self.session_id,
            "intentType": self.intent_type,
            "intentConfidence": self.intent_confidence / 100.0 if self.intent_confidence else None,
            "intentData": self.intent_data,
            "modelId": self.model_id,
            "modelVersion": self.model_version,
            "status": self.status,
            "errorMessage": self.error_message,
            "tokensInput": self.tokens_input,
            "tokensOutput": self.tokens_output,
            "latencyMs": self.latency_ms,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "completedAt": self.completed_at.isoformat() if self.completed_at else None,
        }
    
    def mark_completed(self, latency_ms: int) -> None:
        """Mark the request as completed."""
        self.status = RequestStatus.COMPLETED.value
        self.completed_at = now_utc()
        self.latency_ms = latency_ms
    
    def mark_failed(self, error_message: str) -> None:
        """Mark the request as failed."""
        self.status = RequestStatus.FAILED.value
        self.error_message = error_message
        self.completed_at = now_utc()
    
    def mark_rejected(self, reason: str) -> None:
        """Mark the request as rejected by policy engine."""
        self.status = RequestStatus.REJECTED.value
        self.error_message = reason
        self.completed_at = now_utc()
