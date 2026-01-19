"""
AIAuditLog Model - Comprehensive audit logging (append-only).

Requirements:
- 9.1: Log all requests, decisions, and actions to AI_Audit_Storage (append-only)
- 9.2: Include user_id, tenant_id, intent, action_plan, risk_level, outcome, 
       model_id, model_version, prompt_template_version, policy_version
- 9.5: Store field-level diff snapshots with redaction
- 9.7: Support "AI incident" tagging
- 19.1: Support incident tagging on audit records
- 26.2: Include prompt_template_hash in audit log

This model is APPEND-ONLY. Records cannot be updated or deleted.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from uuid import uuid4

from sqlalchemy import Column, String, Text, DateTime, Integer, Boolean, Index
from sqlalchemy.dialects.postgresql import JSONB

from database import Base, now_utc


def _gen_id() -> str:
    """Generate a unique ID for audit logs."""
    return f"ailog_{uuid4().hex}"


class IncidentTag(str, Enum):
    """Incident tags for AI audit records."""
    NONE = "none"
    SECURITY = "security"  # Security-related incident
    POLICY_VIOLATION = "policy_violation"  # Policy engine violation
    DATA_LEAK = "data_leak"  # Potential data leakage
    PROMPT_INJECTION = "prompt_injection"  # Prompt injection attempt
    SCHEMA_DRIFT = "schema_drift"  # Tool schema drift detected
    UNAUTHORIZED_ACCESS = "unauthorized_access"  # Unauthorized access attempt
    RATE_LIMIT = "rate_limit"  # Rate limit exceeded
    MODEL_ERROR = "model_error"  # Model inference error
    VALIDATION_FAILURE = "validation_failure"  # LLM output validation failure
    MANUAL_REVIEW = "manual_review"  # Flagged for manual review


class AuditEventType(str, Enum):
    """Types of audit events."""
    REQUEST_RECEIVED = "request_received"
    INTENT_CLASSIFIED = "intent_classified"
    ACTION_PLANNED = "action_planned"
    APPROVAL_REQUESTED = "approval_requested"
    APPROVAL_GRANTED = "approval_granted"
    APPROVAL_REJECTED = "approval_rejected"
    EXECUTION_STARTED = "execution_started"
    EXECUTION_COMPLETED = "execution_completed"
    EXECUTION_FAILED = "execution_failed"
    ROLLBACK_EXECUTED = "rollback_executed"
    POLICY_EVALUATED = "policy_evaluated"
    POLICY_BLOCKED = "policy_blocked"
    GUARDRAIL_TRIGGERED = "guardrail_triggered"
    KILL_SWITCH_ACTIVATED = "kill_switch_activated"
    CONFIG_MODIFIED = "config_modified"
    INCIDENT_TAGGED = "incident_tagged"


class AIAuditLog(Base):
    """
    Comprehensive audit logging for AI Layer operations.
    
    This table is APPEND-ONLY. Records cannot be updated or deleted.
    Retention: minimum 90 days, configurable up to 1 year.
    
    Attributes:
        id: Unique audit log identifier (ailog_<uuid>)
        
        # Context
        tenant_id: Tenant isolation boundary
        user_id: User who triggered the event
        request_id: Reference to AI request
        action_id: Reference to AI action (if applicable)
        session_id: Session context
        
        # Event details
        event_type: Type of audit event
        event_timestamp: When the event occurred
        
        # AI context
        intent_type: Classified intent type
        intent_confidence: Confidence score
        action_plan_hash: Hash of action plan (if applicable)
        risk_level: Risk level (if applicable)
        outcome: Outcome of the event (success, failure, blocked, etc.)
        
        # Model tracking
        model_id: Model used
        model_version: Model version
        prompt_template_id: Prompt template used
        prompt_template_version: Version of prompt template
        prompt_template_hash: SHA-256 hash of prompt template
        
        # Policy tracking
        policy_version: Version of policy rules evaluated
        policy_rule_id: Specific rule that was triggered (if any)
        policy_decision: Decision made by policy engine
        
        # Data changes (redacted)
        diff_snapshot: Field-level diff with sensitive data redacted
        
        # Error tracking
        error_code: Error code if failed
        error_message: Error message if failed
        
        # Incident tracking
        incident_tag: Incident classification
        incident_bundle_id: Reference to incident bundle (if exported)
        
        # Extra context
        extra_data: Additional context as JSON
        
        # Timestamps
        created_at: When the log was created (immutable)
    """
    __tablename__ = "ai_audit_logs"
    
    # Primary key
    id = Column(String(64), primary_key=True, default=_gen_id)
    
    # Context
    tenant_id = Column(String(64), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    request_id = Column(String(64), nullable=True, index=True)
    action_id = Column(String(64), nullable=True, index=True)
    session_id = Column(String(64), nullable=True)
    
    # Event details
    event_type = Column(String(32), nullable=False, index=True)
    event_timestamp = Column(DateTime, nullable=False, default=now_utc)
    
    # AI context
    intent_type = Column(String(32), nullable=True)
    intent_confidence = Column(Integer, nullable=True)  # 0-100
    action_plan_hash = Column(String(64), nullable=True)
    risk_level = Column(String(16), nullable=True)
    outcome = Column(String(32), nullable=True)  # success, failure, blocked, timeout, etc.
    
    # Model tracking
    model_id = Column(String(64), nullable=True)
    model_version = Column(String(32), nullable=True)
    prompt_template_id = Column(String(64), nullable=True)
    prompt_template_version = Column(String(32), nullable=True)
    prompt_template_hash = Column(String(64), nullable=True)  # SHA-256
    
    # Policy tracking
    policy_version = Column(String(32), nullable=True)
    policy_rule_id = Column(String(64), nullable=True)
    policy_decision = Column(String(16), nullable=True)  # allow, block, require_approval
    
    # Data changes (redacted)
    diff_snapshot = Column(JSONB, nullable=True)  # Field-level diff, sensitive data redacted
    
    # Error tracking
    error_code = Column(String(32), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Incident tracking
    incident_tag = Column(String(32), nullable=True, default=IncidentTag.NONE.value)
    incident_bundle_id = Column(String(64), nullable=True, index=True)
    
    # Extra context
    extra_data = Column(JSONB, nullable=True, default=dict)
    
    # Timestamps (immutable - no updated_at)
    created_at = Column(DateTime, nullable=False, default=now_utc)
    
    # Indexes for common queries
    __table_args__ = (
        Index("ix_ai_audit_logs_tenant_timestamp", "tenant_id", "event_timestamp"),
        Index("ix_ai_audit_logs_event_type_timestamp", "event_type", "event_timestamp"),
        Index("ix_ai_audit_logs_incident_tag", "incident_tag", "event_timestamp"),
        Index("ix_ai_audit_logs_request_timestamp", "request_id", "event_timestamp"),
    )
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "tenantId": self.tenant_id,
            "userId": self.user_id,
            "requestId": self.request_id,
            "actionId": self.action_id,
            "sessionId": self.session_id,
            "eventType": self.event_type,
            "eventTimestamp": self.event_timestamp.isoformat() if self.event_timestamp else None,
            "intentType": self.intent_type,
            "intentConfidence": self.intent_confidence / 100.0 if self.intent_confidence else None,
            "actionPlanHash": self.action_plan_hash,
            "riskLevel": self.risk_level,
            "outcome": self.outcome,
            "modelId": self.model_id,
            "modelVersion": self.model_version,
            "promptTemplateId": self.prompt_template_id,
            "promptTemplateVersion": self.prompt_template_version,
            "promptTemplateHash": self.prompt_template_hash,
            "policyVersion": self.policy_version,
            "policyRuleId": self.policy_rule_id,
            "policyDecision": self.policy_decision,
            "diffSnapshot": self.diff_snapshot,
            "errorCode": self.error_code,
            "errorMessage": self.error_message,
            "incidentTag": self.incident_tag,
            "incidentBundleId": self.incident_bundle_id,
            "extraData": self.extra_data,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
    
    @classmethod
    def create_event(
        cls,
        tenant_id: str,
        user_id: str,
        event_type: AuditEventType,
        request_id: Optional[str] = None,
        action_id: Optional[str] = None,
        **kwargs
    ) -> "AIAuditLog":
        """
        Factory method to create an audit log event.
        
        This is the preferred way to create audit logs to ensure
        all required fields are set correctly.
        """
        return cls(
            tenant_id=tenant_id,
            user_id=user_id,
            event_type=event_type.value,
            request_id=request_id,
            action_id=action_id,
            event_timestamp=now_utc(),
            **kwargs
        )
    
    def tag_incident(self, tag: IncidentTag, bundle_id: Optional[str] = None) -> None:
        """
        Tag this audit record as an incident.
        
        Note: This is one of the few allowed "updates" - incident tagging
        is considered an annotation, not a modification of the original record.
        """
        self.incident_tag = tag.value
        if bundle_id:
            self.incident_bundle_id = bundle_id
