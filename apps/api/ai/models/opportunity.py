from sqlalchemy import Column, String, JSON, DateTime, Enum, Float, ForeignKey, Text, Boolean
from datetime import datetime, timezone
from core.models.base import BaseModel
from ai.models.base import gen_id
import enum

class OpportunityStatus(str, enum.Enum):
    NEW = "new"
    VISIBLE = "visible"
    ACKNOWLEDGED = "acknowledged"
    DISMISSED = "dismissed"
    PLANNED = "planned"
    SIMULATED = "simulated"
    APPROVED = "approved"
    EXECUTED = "executed"
    FAILED = "failed"
    EXPIRED = "expired"

class OpportunityPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AIOpportunity(BaseModel):
    """
    Represents a proactive AI discovery (Insight) that can lead to an action.
    """
    __tablename__ = 'ai_opportunities'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("opp"))
    tenant_id = Column(String(50), nullable=False, index=True)
    user_id = Column(String(50), index=True) # Target user if applicable
    
    # Classification
    category = Column(String(50), index=True) # operational, financial, patient_care, growth, system
    type = Column(String(100), nullable=False, index=True) # e.g., 'stock_reorder'
    scope = Column(String(20), default="single") # single, bulk
    
    # Entity reference
    entity_type = Column(String(50)) # product, patient, appointment
    entity_id = Column(String(50))
    
    # Content
    locale = Column(String(10), default="tr") # tr, en
    title = Column(String(255), nullable=False)
    summary = Column(Text)
    why_now = Column(Text) # Short rationale for current trigger
    explanation = Column(JSON) # List of readable explanation strings
    evidence = Column(JSON) # Raw data
    
    # Scoring & Prioritization
    priority = Column(Enum(OpportunityPriority), default=OpportunityPriority.MEDIUM)
    confidence_score = Column(Float, default=1.0)
    impact_score = Column(Float, default=0.0)
    
    # Lifecycle
    status = Column(Enum(OpportunityStatus), default=OpportunityStatus.NEW)
    is_acknowledged = Column(Boolean, default=False)
    
    # AI Pipeline Integration
    recommended_capability = Column(String(100))
    recommended_action_label = Column(String(100))
    alternative_actions = Column(JSON) # List of { "capability": "...", "label": "..." }
    action_plan_id = Column(String(50))
    action_status = Column(JSON) # { "mode": "SIMULATE", "status": "COMPLETED", "plan_id": "...", "approval_required": bool }
    
    # Workflow
    user_decision_options = Column(JSON) # ["acknowledge", "dismiss", "simulate", "open_in_chat"]
    required_slots = Column(JSON) 
    
    # UI Metadata
    ui_config = Column(JSON) # { "render_as": "card" }
    
    # Safety
    requires_approval = Column(Boolean, default=True)
    approval_reason = Column(String(255))
    
    # Expiry & Audit
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))
    
    # Deduplication & Escalation
    dedup_hash = Column(String(64), unique=True, index=True) # tenant:type:entity_id

    @property
    def is_stale(self) -> bool:
        if self.expires_at and datetime.now(timezone.utc) > self.expires_at:
            return True
        return False

    def to_summary_dict(self):
        """Used for list endpoint (lightweight)."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "scope": self.scope,
            "category": self.category,
            "type": self.type,
            "priority": self.priority.value,
            "status": self.status.value,
            "confidence_score": self.confidence_score,
            "impact_score": self.impact_score,
            "title": self.title,
            "recommended_action_label": self.recommended_action_label,
            "is_acknowledged": self.is_acknowledged,
            "is_stale": self.is_stale,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }

    def to_full_dict(self):
        """Used for detail endpoint (comprehensive)."""
        data = self.to_summary_dict()
        data.update({
            "locale": self.locale,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "summary": self.summary,
            "why_now": self.why_now,
            "explanation": self.explanation,
            "evidence": self.evidence,
            "recommended_capability": self.recommended_capability,
            "alternative_actions": self.alternative_actions,
            "action_plan_id": self.action_plan_id,
            "action_status": self.action_status,
            "user_decision_options": self.user_decision_options,
            "required_slots": self.required_slots,
            "ui_config": self.ui_config,
            "approval_required": self.requires_approval,
            "expiresAt": self.expires_at.isoformat() if self.expires_at else None,
        })
        return data
