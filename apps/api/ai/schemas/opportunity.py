from datetime import datetime
from typing import List, Optional, Dict, Any
from ai.models.opportunity import OpportunityStatus, OpportunityPriority
from schemas.base import AppBaseModel
from pydantic import Field

class OpportunitySummary(AppBaseModel):
    id: str
    tenant_id: str
    scope: str
    category: Optional[str] = None
    type: str
    priority: OpportunityPriority
    state: OpportunityStatus = Field(..., validation_alias="status", serialization_alias="state")
    confidence_score: float
    impact_score: float
    title: str
    recommended_action_label: Optional[str] = None
    is_acknowledged: bool
    is_stale: bool
    created_at: Optional[datetime] = Field(None, validation_alias="createdAt")

class OpportunityListResponse(AppBaseModel):
    items: List[OpportunitySummary]

class OpportunityFull(OpportunitySummary):
    locale: str = "tr"
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    summary: Optional[str] = None
    why_now: Optional[str] = None
    explanation: Optional[List[str]] = None
    evidence: Optional[Dict[str, Any]] = None
    recommended_capability: Optional[str] = None
    alternative_actions: Optional[List[Dict[str, Any]]] = None
    action_plan_id: Optional[str] = None
    action_status: Optional[Dict[str, Any]] = None
    user_decision_options: Optional[List[str]] = None
    required_slots: Optional[Dict[str, Any]] = None
    ui_config: Optional[Dict[str, Any]] = None
    approval_required: bool = True
    expires_at: Optional[datetime] = Field(None, validation_alias="expiresAt")

class OpportunityUpdateState(AppBaseModel):
    status: str = Field(..., description="New status for the opportunity (e.g., acknowledged, dismissed)")
