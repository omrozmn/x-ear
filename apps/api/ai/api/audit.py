"""
AI Audit Endpoint

GET /ai/audit - Query audit logs with filtering and pagination

Provides searchable audit log views for compliance and debugging.

Requirements:
- 14.1: REST endpoints with OpenAPI documentation at /ai/*
- 9.4: Admin panel provides searchable audit log views
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field

from ai.config import get_ai_config
from ai.models.ai_audit_log import AIAuditLog, AuditEventType, IncidentTag
from ai.services.kill_switch import get_kill_switch, KillSwitchActiveError
from ai.api.errors import AIErrorCode, create_error_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Audit"])


# =============================================================================
# Response Models
# =============================================================================

class AuditEntryResponse(BaseModel):
    """Single audit log entry."""
    id: str = Field(description="Audit log ID")
    tenant_id: str = Field(description="Tenant ID")
    user_id: str = Field(description="User ID")
    request_id: Optional[str] = Field(default=None, description="Request ID")
    action_id: Optional[str] = Field(default=None, description="Action ID")
    event_type: str = Field(description="Event type")
    event_timestamp: str = Field(description="Event timestamp")
    intent_type: Optional[str] = Field(default=None, description="Intent type")
    intent_confidence: Optional[float] = Field(default=None, description="Intent confidence")
    risk_level: Optional[str] = Field(default=None, description="Risk level")
    outcome: Optional[str] = Field(default=None, description="Outcome")
    model_id: Optional[str] = Field(default=None, description="Model ID")
    model_version: Optional[str] = Field(default=None, description="Model version")
    prompt_template_version: Optional[str] = Field(default=None, description="Prompt template version")
    policy_version: Optional[str] = Field(default=None, description="Policy version")
    policy_decision: Optional[str] = Field(default=None, description="Policy decision")
    error_code: Optional[str] = Field(default=None, description="Error code")
    error_message: Optional[str] = Field(default=None, description="Error message")
    incident_tag: Optional[str] = Field(default=None, description="Incident tag")
    created_at: str = Field(description="Creation timestamp")


class AuditListResponse(BaseModel):
    """Response for audit log list."""
    items: List[AuditEntryResponse] = Field(description="Audit entries")
    total: int = Field(description="Total count")
    page: int = Field(description="Current page")
    page_size: int = Field(description="Page size")
    has_more: bool = Field(description="Whether more pages exist")


class AuditStatsResponse(BaseModel):
    """Audit statistics response."""
    total_requests: int = Field(description="Total requests")
    total_actions: int = Field(description="Total actions")
    total_executions: int = Field(description="Total executions")
    total_incidents: int = Field(description="Total incidents")
    by_event_type: Dict[str, int] = Field(description="Count by event type")
    by_outcome: Dict[str, int] = Field(description="Count by outcome")
    by_risk_level: Dict[str, int] = Field(description="Count by risk level")


# =============================================================================
# In-memory audit storage (in production, use database)
# =============================================================================

_audit_store: List[Dict[str, Any]] = []


def _add_audit_entry(entry: Dict[str, Any]) -> None:
    """Add an audit entry."""
    _audit_store.append(entry)


def _get_audit_entries(
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
    event_type: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    incident_tag: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[List[Dict[str, Any]], int]:
    """Get filtered audit entries with pagination."""
    filtered = _audit_store.copy()
    
    if tenant_id:
        filtered = [e for e in filtered if e.get("tenant_id") == tenant_id]
    if user_id:
        filtered = [e for e in filtered if e.get("user_id") == user_id]
    if event_type:
        filtered = [e for e in filtered if e.get("event_type") == event_type]
    if incident_tag:
        filtered = [e for e in filtered if e.get("incident_tag") == incident_tag]
    if from_date:
        filtered = [e for e in filtered if e.get("event_timestamp", "") >= from_date.isoformat()]
    if to_date:
        filtered = [e for e in filtered if e.get("event_timestamp", "") <= to_date.isoformat()]
    
    # Sort by timestamp descending
    filtered.sort(key=lambda x: x.get("event_timestamp", ""), reverse=True)
    
    total = len(filtered)
    start = (page - 1) * page_size
    end = start + page_size
    
    return filtered[start:end], total


# =============================================================================
# Dependencies
# =============================================================================

async def get_current_user_context() -> Dict[str, Any]:
    """Get current user context from request."""
    # TODO: Integrate with actual auth system
    return {
        "user_id": "user_placeholder",
        "tenant_id": "tenant_placeholder",
        "is_admin": True,
    }


# =============================================================================
# Endpoints
# =============================================================================

@router.get(
    "/audit",
    response_model=AuditListResponse,
    responses={
        200: {"description": "Audit logs retrieved"},
        403: {"description": "Access denied"},
    },
    summary="Query audit logs",
    description="""
    Query AI audit logs with filtering and pagination.
    
    Filters:
    - user_id: Filter by user
    - event_type: Filter by event type
    - from_date/to_date: Date range filter
    - incident_tag: Filter by incident tag
    
    Results are sorted by timestamp descending (newest first).
    """,
)
async def list_audit_logs(
    user_id: Optional[str] = Query(default=None, description="Filter by user ID"),
    event_type: Optional[str] = Query(default=None, description="Filter by event type"),
    from_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    to_date: Optional[datetime] = Query(default=None, description="End date filter"),
    incident_tag: Optional[str] = Query(default=None, description="Filter by incident tag"),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=50, ge=1, le=100, description="Page size"),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> AuditListResponse:
    """List audit logs with filtering and pagination."""
    tenant_id = user_context.get("tenant_id", "unknown")
    
    # Get filtered entries
    entries, total = _get_audit_entries(
        tenant_id=tenant_id,
        user_id=user_id,
        event_type=event_type,
        from_date=from_date,
        to_date=to_date,
        incident_tag=incident_tag,
        page=page,
        page_size=page_size,
    )
    
    # Convert to response format
    items = [
        AuditEntryResponse(
            id=e.get("id", ""),
            tenant_id=e.get("tenant_id", ""),
            user_id=e.get("user_id", ""),
            request_id=e.get("request_id"),
            action_id=e.get("action_id"),
            event_type=e.get("event_type", ""),
            event_timestamp=e.get("event_timestamp", ""),
            intent_type=e.get("intent_type"),
            intent_confidence=e.get("intent_confidence"),
            risk_level=e.get("risk_level"),
            outcome=e.get("outcome"),
            model_id=e.get("model_id"),
            model_version=e.get("model_version"),
            prompt_template_version=e.get("prompt_template_version"),
            policy_version=e.get("policy_version"),
            policy_decision=e.get("policy_decision"),
            error_code=e.get("error_code"),
            error_message=e.get("error_message"),
            incident_tag=e.get("incident_tag"),
            created_at=e.get("created_at", e.get("event_timestamp", "")),
        )
        for e in entries
    ]
    
    has_more = (page * page_size) < total
    
    return AuditListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=has_more,
    )


@router.get(
    "/audit/stats",
    response_model=AuditStatsResponse,
    responses={
        200: {"description": "Audit statistics retrieved"},
    },
    summary="Get audit statistics",
)
async def get_audit_stats(
    from_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    to_date: Optional[datetime] = Query(default=None, description="End date filter"),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> AuditStatsResponse:
    """Get audit statistics for the tenant."""
    tenant_id = user_context.get("tenant_id", "unknown")
    
    # Filter entries
    entries = [e for e in _audit_store if e.get("tenant_id") == tenant_id]
    
    if from_date:
        entries = [e for e in entries if e.get("event_timestamp", "") >= from_date.isoformat()]
    if to_date:
        entries = [e for e in entries if e.get("event_timestamp", "") <= to_date.isoformat()]
    
    # Calculate stats
    by_event_type: Dict[str, int] = {}
    by_outcome: Dict[str, int] = {}
    by_risk_level: Dict[str, int] = {}
    total_incidents = 0
    
    for e in entries:
        event_type = e.get("event_type", "unknown")
        by_event_type[event_type] = by_event_type.get(event_type, 0) + 1
        
        outcome = e.get("outcome")
        if outcome:
            by_outcome[outcome] = by_outcome.get(outcome, 0) + 1
        
        risk_level = e.get("risk_level")
        if risk_level:
            by_risk_level[risk_level] = by_risk_level.get(risk_level, 0) + 1
        
        if e.get("incident_tag") and e.get("incident_tag") != "none":
            total_incidents += 1
    
    # Count specific event types
    total_requests = by_event_type.get(AuditEventType.REQUEST_RECEIVED.value, 0)
    total_actions = by_event_type.get(AuditEventType.ACTION_PLANNED.value, 0)
    total_executions = (
        by_event_type.get(AuditEventType.EXECUTION_COMPLETED.value, 0) +
        by_event_type.get(AuditEventType.EXECUTION_FAILED.value, 0)
    )
    
    return AuditStatsResponse(
        total_requests=total_requests,
        total_actions=total_actions,
        total_executions=total_executions,
        total_incidents=total_incidents,
        by_event_type=by_event_type,
        by_outcome=by_outcome,
        by_risk_level=by_risk_level,
    )


@router.get(
    "/audit/{audit_id}",
    response_model=AuditEntryResponse,
    responses={
        200: {"description": "Audit entry retrieved"},
        404: {"description": "Audit entry not found"},
    },
    summary="Get audit entry details",
)
async def get_audit_entry(
    audit_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> AuditEntryResponse:
    """Get a specific audit entry by ID."""
    tenant_id = user_context.get("tenant_id", "unknown")
    
    # Find entry
    entry = None
    for e in _audit_store:
        if e.get("id") == audit_id and e.get("tenant_id") == tenant_id:
            entry = e
            break
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=create_error_response(
                code=AIErrorCode.NOT_FOUND,
                message=f"Audit entry {audit_id} not found",
            ).model_dump(),
        )
    
    return AuditEntryResponse(
        id=entry.get("id", ""),
        tenant_id=entry.get("tenant_id", ""),
        user_id=entry.get("user_id", ""),
        request_id=entry.get("request_id"),
        action_id=entry.get("action_id"),
        event_type=entry.get("event_type", ""),
        event_timestamp=entry.get("event_timestamp", ""),
        intent_type=entry.get("intent_type"),
        intent_confidence=entry.get("intent_confidence"),
        risk_level=entry.get("risk_level"),
        outcome=entry.get("outcome"),
        model_id=entry.get("model_id"),
        model_version=entry.get("model_version"),
        prompt_template_version=entry.get("prompt_template_version"),
        policy_version=entry.get("policy_version"),
        policy_decision=entry.get("policy_decision"),
        error_code=entry.get("error_code"),
        error_message=entry.get("error_message"),
        incident_tag=entry.get("incident_tag"),
        created_at=entry.get("created_at", entry.get("event_timestamp", "")),
    )


# =============================================================================
# Helper function to log audit events (used by other modules)
# =============================================================================

def log_audit_event(
    tenant_id: str,
    user_id: str,
    event_type: AuditEventType,
    request_id: Optional[str] = None,
    action_id: Optional[str] = None,
    **kwargs,
) -> str:
    """
    Log an audit event.
    
    This is a helper function for other modules to log audit events.
    
    Args:
        tenant_id: Tenant ID
        user_id: User ID
        event_type: Type of event
        request_id: Optional request ID
        action_id: Optional action ID
        **kwargs: Additional event data
        
    Returns:
        Audit entry ID
    """
    entry_id = f"ailog_{uuid4().hex}"
    now = datetime.now(timezone.utc).isoformat()
    
    entry = {
        "id": entry_id,
        "tenant_id": tenant_id,
        "user_id": user_id,
        "event_type": event_type.value,
        "event_timestamp": now,
        "created_at": now,
        "request_id": request_id,
        "action_id": action_id,
        **kwargs,
    }
    
    _add_audit_entry(entry)
    
    logger.info(
        f"Audit event logged: {event_type.value}",
        extra={
            "audit_id": entry_id,
            "tenant_id": tenant_id,
            "user_id": user_id,
            "event_type": event_type.value,
        }
    )
    
    return entry_id
