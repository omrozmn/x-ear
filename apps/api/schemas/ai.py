"""
AI Layer Pydantic Schemas for OpenAPI Generation

These schemas define the API contracts for the AI Layer endpoints.
They are used by FastAPI to generate OpenAPI documentation and by
Orval to generate TypeScript types for the frontend.

IMPORTANT:
- All schemas use camelCase aliases for JSON serialization
- operation_id in routers must be unique and descriptive
- Tags are used by Orval for code splitting (tags-split mode)
"""

from datetime import datetime, date
from enum import Enum
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field

from schemas.base import AppBaseModel, IDMixin, TimestampMixin, ResponseMeta


# =============================================================================
# Enums
# =============================================================================

class AIPhaseEnum(str, Enum):
    """AI Layer operational phase."""
    A = "read_only"
    B = "proposal"
    C = "execution"


class RequestStatusEnum(str, Enum):
    """Status of an AI request."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REJECTED = "rejected"
    TIMEOUT = "timeout"


class ActionStatusEnum(str, Enum):
    """Status of an AI action."""
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    EXPIRED = "expired"


class RiskLevelEnum(str, Enum):
    """Risk level for AI actions."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentTagEnum(str, Enum):
    """Incident tags for AI audit records."""
    NONE = "none"
    SECURITY = "security"
    POLICY_VIOLATION = "policy_violation"
    DATA_LEAK = "data_leak"
    PROMPT_INJECTION = "prompt_injection"
    SCHEMA_DRIFT = "schema_drift"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    RATE_LIMIT = "rate_limit"
    MODEL_ERROR = "model_error"
    VALIDATION_FAILURE = "validation_failure"
    MANUAL_REVIEW = "manual_review"


class UsageTypeEnum(str, Enum):
    """Types of AI usage to track."""
    ADVISORY = "advisory"
    BLOCKING = "blocking"
    EXECUTION = "execution"
    CHAT = "chat"
    OCR = "ocr"


class AuditEventTypeEnum(str, Enum):
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


# =============================================================================
# AI Chat Schemas
# =============================================================================

class AIChatRequest(AppBaseModel):
    """Request schema for AI chat endpoint."""
    message: str = Field(..., min_length=1, max_length=4096, description="User message")
    session_id: Optional[str] = Field(None, alias="sessionId", description="Session ID for conversation context")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context for the AI")


class AIChatResponse(AppBaseModel):
    """Response schema for AI chat endpoint."""
    request_id: str = Field(..., alias="requestId", description="Unique request identifier")
    message: str = Field(..., description="AI response message")
    intent_type: Optional[str] = Field(None, alias="intentType", description="Classified intent type")
    intent_confidence: Optional[float] = Field(None, alias="intentConfidence", ge=0, le=1, description="Intent confidence score")
    suggestions: Optional[List[str]] = Field(None, description="Suggested follow-up actions")
    session_id: Optional[str] = Field(None, alias="sessionId", description="Session ID")


# =============================================================================
# AI Request Schemas
# =============================================================================

class AIRequestBase(AppBaseModel):
    """Base schema for AI requests."""
    intent_type: Optional[str] = Field(None, alias="intentType")
    intent_confidence: Optional[float] = Field(None, alias="intentConfidence", ge=0, le=1)
    status: RequestStatusEnum = Field(default=RequestStatusEnum.PENDING)


class AIRequestRead(AIRequestBase, IDMixin):
    """Schema for reading AI request details."""
    tenant_id: str = Field(..., alias="tenantId")
    user_id: str = Field(..., alias="userId")
    session_id: Optional[str] = Field(None, alias="sessionId")
    ai_model_id: Optional[str] = Field(None, alias="modelId")
    ai_model_version: Optional[str] = Field(None, alias="modelVersion")
    tokens_input: Optional[int] = Field(None, alias="tokensInput")
    tokens_output: Optional[int] = Field(None, alias="tokensOutput")
    latency_ms: Optional[int] = Field(None, alias="latencyMs")
    error_message: Optional[str] = Field(None, alias="errorMessage")
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")


# =============================================================================
# AI Action Schemas
# =============================================================================

class ToolOperation(AppBaseModel):
    """Schema for a single tool operation in an action plan."""
    tool_id: str = Field(..., alias="toolId", description="Tool identifier")
    operation: str = Field(..., description="Operation to perform")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Operation parameters")
    risk_level: RiskLevelEnum = Field(default=RiskLevelEnum.LOW, alias="riskLevel")


class ActionPlan(AppBaseModel):
    """Schema for an action plan."""
    operations: List[ToolOperation] = Field(..., description="List of operations to execute")
    description: str = Field(..., description="Human-readable description of the plan")
    estimated_duration_ms: Optional[int] = Field(None, alias="estimatedDurationMs")


class RollbackPlan(AppBaseModel):
    """Schema for a rollback plan."""
    operations: List[ToolOperation] = Field(..., description="Rollback operations")
    description: str = Field(..., description="Human-readable description")


class AIActionCreate(AppBaseModel):
    """Schema for creating an AI action (internal use)."""
    request_id: str = Field(..., alias="requestId")
    action_plan: ActionPlan = Field(..., alias="actionPlan")
    rollback_plan: Optional[RollbackPlan] = Field(None, alias="rollbackPlan")


class AIActionRead(AppBaseModel, IDMixin):
    """Schema for reading AI action details."""
    request_id: str = Field(..., alias="requestId")
    tenant_id: str = Field(..., alias="tenantId")
    user_id: str = Field(..., alias="userId")
    action_plan: ActionPlan = Field(..., alias="actionPlan")
    action_plan_hash: str = Field(..., alias="actionPlanHash")
    tool_schema_versions: Dict[str, str] = Field(default_factory=dict, alias="toolSchemaVersions")
    risk_level: RiskLevelEnum = Field(..., alias="riskLevel")
    risk_reasoning: Optional[str] = Field(None, alias="riskReasoning")
    required_permissions: List[str] = Field(default_factory=list, alias="requiredPermissions")
    rollback_plan: Optional[RollbackPlan] = Field(None, alias="rollbackPlan")
    status: ActionStatusEnum = Field(...)
    approval_expires_at: Optional[datetime] = Field(None, alias="approvalExpiresAt")
    approved_by: Optional[str] = Field(None, alias="approvedBy")
    approved_at: Optional[datetime] = Field(None, alias="approvedAt")
    rejection_reason: Optional[str] = Field(None, alias="rejectionReason")
    execution_started_at: Optional[datetime] = Field(None, alias="executionStartedAt")
    execution_completed_at: Optional[datetime] = Field(None, alias="executionCompletedAt")
    execution_result: Optional[Dict[str, Any]] = Field(None, alias="executionResult")
    execution_error: Optional[str] = Field(None, alias="executionError")
    dry_run_result: Optional[Dict[str, Any]] = Field(None, alias="dryRunResult")
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")


class AIActionApproveRequest(AppBaseModel):
    """Request schema for approving an AI action."""
    approval_token: str = Field(..., alias="approvalToken", description="HMAC-signed approval token")


class AIActionRejectRequest(AppBaseModel):
    """Request schema for rejecting an AI action."""
    reason: str = Field(..., min_length=1, max_length=1000, description="Rejection reason")


class AIActionExecuteRequest(AppBaseModel):
    """Request schema for executing an AI action."""
    approval_token: str = Field(..., alias="approvalToken", description="HMAC-signed approval token")
    dry_run: bool = Field(default=False, alias="dryRun", description="If true, simulate without executing")


class AIActionExecuteResponse(AppBaseModel):
    """Response schema for action execution."""
    action_id: str = Field(..., alias="actionId")
    status: ActionStatusEnum = Field(...)
    result: Optional[Dict[str, Any]] = Field(None, description="Execution result")
    error: Optional[str] = Field(None, description="Error message if failed")
    dry_run: bool = Field(..., alias="dryRun")


# =============================================================================
# AI Audit Log Schemas
# =============================================================================

class AIAuditLogRead(AppBaseModel, IDMixin):
    """Schema for reading AI audit log entries."""
    tenant_id: str = Field(..., alias="tenantId")
    user_id: str = Field(..., alias="userId")
    request_id: Optional[str] = Field(None, alias="requestId")
    action_id: Optional[str] = Field(None, alias="actionId")
    session_id: Optional[str] = Field(None, alias="sessionId")
    event_type: AuditEventTypeEnum = Field(..., alias="eventType")
    event_timestamp: datetime = Field(..., alias="eventTimestamp")
    intent_type: Optional[str] = Field(None, alias="intentType")
    intent_confidence: Optional[float] = Field(None, alias="intentConfidence", ge=0, le=1)
    action_plan_hash: Optional[str] = Field(None, alias="actionPlanHash")
    risk_level: Optional[RiskLevelEnum] = Field(None, alias="riskLevel")
    outcome: Optional[str] = Field(None)
    ai_model_id: Optional[str] = Field(None, alias="modelId")
    ai_model_version: Optional[str] = Field(None, alias="modelVersion")
    prompt_template_id: Optional[str] = Field(None, alias="promptTemplateId")
    prompt_template_version: Optional[str] = Field(None, alias="promptTemplateVersion")
    prompt_template_hash: Optional[str] = Field(None, alias="promptTemplateHash")
    policy_version: Optional[str] = Field(None, alias="policyVersion")
    policy_rule_id: Optional[str] = Field(None, alias="policyRuleId")
    policy_decision: Optional[str] = Field(None, alias="policyDecision")
    error_code: Optional[str] = Field(None, alias="errorCode")
    error_message: Optional[str] = Field(None, alias="errorMessage")
    incident_tag: Optional[IncidentTagEnum] = Field(None, alias="incidentTag")
    incident_bundle_id: Optional[str] = Field(None, alias="incidentBundleId")
    created_at: datetime = Field(..., alias="createdAt")


class AIAuditLogFilters(AppBaseModel):
    """Filters for querying AI audit logs."""
    event_type: Optional[AuditEventTypeEnum] = Field(None, alias="eventType")
    request_id: Optional[str] = Field(None, alias="requestId")
    action_id: Optional[str] = Field(None, alias="actionId")
    incident_tag: Optional[IncidentTagEnum] = Field(None, alias="incidentTag")
    start_date: Optional[datetime] = Field(None, alias="startDate")
    end_date: Optional[datetime] = Field(None, alias="endDate")


# =============================================================================
# AI Usage Schemas
# =============================================================================

class AIUsageRead(AppBaseModel, IDMixin):
    """Schema for reading AI usage records."""
    tenant_id: str = Field(..., alias="tenantId")
    usage_date: date = Field(..., alias="usageDate")
    usage_type: UsageTypeEnum = Field(..., alias="usageType")
    request_count: int = Field(..., alias="requestCount")
    token_count_input: int = Field(..., alias="tokenCountInput")
    token_count_output: int = Field(..., alias="tokenCountOutput")
    quota_limit: Optional[int] = Field(None, alias="quotaLimit")
    quota_exceeded_at: Optional[datetime] = Field(None, alias="quotaExceededAt")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")


class AIUsageSummary(AppBaseModel):
    """Summary of AI usage for a tenant."""
    tenant_id: str = Field(..., alias="tenantId")
    period_start: date = Field(..., alias="periodStart")
    period_end: date = Field(..., alias="periodEnd")
    total_requests: int = Field(..., alias="totalRequests")
    total_tokens_input: int = Field(..., alias="totalTokensInput")
    total_tokens_output: int = Field(..., alias="totalTokensOutput")
    usage_by_type: Dict[str, int] = Field(default_factory=dict, alias="usageByType")
    quota_status: Dict[str, Dict[str, Any]] = Field(default_factory=dict, alias="quotaStatus")


# =============================================================================
# AI Status Schemas
# =============================================================================

class AIStatusResponse(AppBaseModel):
    """Response schema for AI status endpoint."""
    enabled: bool = Field(..., description="Whether AI is enabled")
    phase: AIPhaseEnum = Field(..., description="Current AI phase")
    ai_model_id: str = Field(..., alias="modelId", description="Active model ID")
    ai_model_version: str = Field(..., alias="modelVersion", description="Active model version")
    ai_model_available: bool = Field(..., alias="modelAvailable", description="Whether model is reachable")
    kill_switch_active: bool = Field(default=False, alias="killSwitchActive")
    quota_remaining: Optional[int] = Field(None, alias="quotaRemaining")
    quota_limit: Optional[int] = Field(None, alias="quotaLimit")


# =============================================================================
# AI Admin Schemas
# =============================================================================

class AIKillSwitchRequest(AppBaseModel):
    """Request schema for activating/deactivating kill switch."""
    active: bool = Field(..., description="Whether to activate the kill switch")
    scope: str = Field(default="global", description="Scope: global, tenant, or capability")
    target_id: Optional[str] = Field(None, alias="targetId", description="Target ID for tenant/capability scope")
    reason: str = Field(..., min_length=1, max_length=500, description="Reason for activation")


class AIKillSwitchResponse(AppBaseModel):
    """Response schema for kill switch operations."""
    active: bool = Field(...)
    scope: str = Field(...)
    target_id: Optional[str] = Field(None, alias="targetId")
    activated_by: Optional[str] = Field(None, alias="activatedBy")
    activated_at: Optional[datetime] = Field(None, alias="activatedAt")
    reason: Optional[str] = Field(None)


class AIConfigUpdate(AppBaseModel):
    """Request schema for updating AI configuration."""
    quota_limit: Optional[int] = Field(None, alias="quotaLimit", ge=0)
    risk_threshold: Optional[RiskLevelEnum] = Field(None, alias="riskThreshold")
    auto_approve_low_risk: Optional[bool] = Field(None, alias="autoApproveLowRisk")


# =============================================================================
# Incident Schemas
# =============================================================================

class AIIncidentTagRequest(AppBaseModel):
    """Request schema for tagging an audit record as an incident."""
    audit_log_id: str = Field(..., alias="auditLogId")
    incident_tag: IncidentTagEnum = Field(..., alias="incidentTag")
    notes: Optional[str] = Field(None, max_length=1000)


class AIIncidentBundleExport(AppBaseModel):
    """Response schema for incident bundle export."""
    bundle_id: str = Field(..., alias="bundleId")
    incident_tag: IncidentTagEnum = Field(..., alias="incidentTag")
    audit_logs: List[AIAuditLogRead] = Field(..., alias="auditLogs")
    exported_at: datetime = Field(..., alias="exportedAt")
    exported_by: str = Field(..., alias="exportedBy")


# =============================================================================
# List Response Schemas (for pagination)
# =============================================================================

class AIRequestListResponse(AppBaseModel):
    """Paginated list of AI requests."""
    data: List[AIRequestRead] = Field(...)
    meta: ResponseMeta = Field(...)


class AIActionListResponse(AppBaseModel):
    """Paginated list of AI actions."""
    data: List[AIActionRead] = Field(...)
    meta: ResponseMeta = Field(...)


class AIAuditLogListResponse(AppBaseModel):
    """Paginated list of AI audit logs."""
    data: List[AIAuditLogRead] = Field(...)
    meta: ResponseMeta = Field(...)


class AIUsageListResponse(AppBaseModel):
    """Paginated list of AI usage records."""
    data: List[AIUsageRead] = Field(...)
    meta: ResponseMeta = Field(...)
