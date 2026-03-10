"""
AI Audit Endpoint

GET /ai/audit - Query audit logs with filtering and pagination.
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ai.api.errors import AIErrorCode, create_error_response
from ai.models.ai_audit_log import AIAuditLog, AuditEventType
from database import get_db

logger = logging.getLogger(__name__)
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "default-dev-secret-key-change-in-prod")
ALGORITHM = "HS256"

router = APIRouter(prefix="/ai", tags=["AI Audit"])


class AuditEntryResponse(BaseModel):
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
    items: List[AuditEntryResponse] = Field(description="Audit entries")
    total: int = Field(description="Total count")
    page: int = Field(description="Current page")
    page_size: int = Field(description="Page size")
    has_more: bool = Field(description="Whether more pages exist")


class AuditStatsResponse(BaseModel):
    total_requests: int = Field(description="Total requests")
    total_actions: int = Field(description="Total actions")
    total_executions: int = Field(description="Total executions")
    total_incidents: int = Field(description="Total incidents")
    by_event_type: Dict[str, int] = Field(description="Count by event type")
    by_outcome: Dict[str, int] = Field(description="Count by outcome")
    by_risk_level: Dict[str, int] = Field(description="Count by risk level")


async def get_current_user_context(request: Request) -> Dict[str, Any]:
    access_context = getattr(request.state, "access_context", None)
    tenant_id = getattr(request.state, "tenant_id", None) or getattr(access_context, "tenant_id", None)
    user_id = getattr(request.state, "user_id", None) or getattr(access_context, "user_id", None)
    is_super_admin = bool(getattr(access_context, "is_super_admin", False))

    auth_header = request.headers.get("Authorization", "")
    token = auth_header.split(" ", 1)[1] if auth_header.startswith("Bearer ") else None
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            tenant_id = tenant_id or payload.get("tenant_id")
            user_id = user_id or payload.get("sub")
            is_super_admin = is_super_admin or payload.get("role") == "super_admin" or bool(payload.get("is_admin"))
        except JWTError:
            logger.warning("AI audit fallback JWT decode failed")

    return {
        "user_id": user_id or "user_placeholder",
        "tenant_id": tenant_id,
        "is_admin": True,
        "is_super_admin": is_super_admin,
    }


def _serialize_row(row: Any) -> AuditEntryResponse:
    event_timestamp = getattr(row, "event_timestamp", None) or getattr(row, "created_at", None)
    created_at = getattr(row, "created_at", None) or event_timestamp
    raw_confidence = getattr(row, "intent_confidence", None)
    confidence = None
    if isinstance(raw_confidence, (int, float)) and raw_confidence:
        confidence = raw_confidence / 100.0 if raw_confidence > 1 else float(raw_confidence)

    return AuditEntryResponse(
        id=getattr(row, "id", ""),
        tenant_id=getattr(row, "tenant_id", "") or "",
        user_id=getattr(row, "user_id", "") or "",
        request_id=getattr(row, "request_id", None),
        action_id=getattr(row, "action_id", None),
        event_type=getattr(row, "event_type", "") or "",
        event_timestamp=event_timestamp.isoformat() if event_timestamp else "",
        intent_type=getattr(row, "intent_type", None),
        intent_confidence=confidence,
        risk_level=getattr(row, "risk_level", None),
        outcome=getattr(row, "outcome", None),
        model_id=getattr(row, "model_id", None),
        model_version=getattr(row, "model_version", None),
        prompt_template_version=getattr(row, "prompt_template_version", None),
        policy_version=getattr(row, "policy_version", None),
        policy_decision=getattr(row, "policy_decision", None),
        error_code=getattr(row, "error_code", None),
        error_message=getattr(row, "error_message", None),
        incident_tag=getattr(row, "incident_tag", None),
        created_at=created_at.isoformat() if created_at else "",
    )


def _build_request_fallback(db: Session, tenant_id: Optional[str]) -> List[AuditEntryResponse]:
    from ai.models.ai_request import AIRequest

    query = db.query(AIRequest)
    if tenant_id:
        query = query.filter(AIRequest.tenant_id == tenant_id)

    requests = query.order_by(AIRequest.created_at.desc()).limit(500).all()
    items: List[AuditEntryResponse] = []
    for request in requests:
        items.append(
            AuditEntryResponse(
                id=f"aifallback_{request.id}",
                tenant_id=request.tenant_id,
                user_id=request.user_id,
                request_id=request.id,
                action_id=None,
                event_type=AuditEventType.REQUEST_RECEIVED.value,
                event_timestamp=request.created_at.isoformat() if request.created_at else "",
                intent_type=getattr(request, "intent_type", None),
                intent_confidence=(request.intent_confidence / 100.0) if getattr(request, "intent_confidence", None) else None,
                risk_level=None,
                outcome="failure" if getattr(request, "error_message", None) else "success",
                model_id=getattr(request, "model_id", None),
                model_version=getattr(request, "model_version", None),
                prompt_template_version=None,
                policy_version=None,
                policy_decision=None,
                error_code=None,
                error_message=getattr(request, "error_message", None),
                incident_tag=None,
                created_at=request.created_at.isoformat() if request.created_at else "",
            )
        )
    return items


@router.get("/audit", response_model=AuditListResponse)
async def list_audit_logs(
    user_id: Optional[str] = Query(default=None, description="Filter by user ID"),
    event_type: Optional[str] = Query(default=None, description="Filter by event type"),
    from_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    to_date: Optional[datetime] = Query(default=None, description="End date filter"),
    incident_tag: Optional[str] = Query(default=None, description="Filter by incident tag"),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=50, ge=1, le=100, description="Page size"),
    limit: Optional[int] = Query(default=None, ge=1, le=100, description="Page size alias"),
    offset: Optional[int] = Query(default=None, ge=0, description="Offset alias"),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
    db: Session = Depends(get_db),
) -> AuditListResponse:
    tenant_id = None if user_context.get("is_super_admin") else user_context.get("tenant_id")

    if limit is not None:
        page_size = limit
    if offset is not None and page_size > 0:
        page = (offset // page_size) + 1

    query = db.query(AIAuditLog)
    if tenant_id:
        query = query.filter(AIAuditLog.tenant_id == tenant_id)
    if user_id:
        query = query.filter(AIAuditLog.user_id == user_id)
    if event_type:
        query = query.filter(AIAuditLog.event_type == event_type)
    if incident_tag:
        query = query.filter(AIAuditLog.incident_tag == incident_tag)
    if from_date:
        query = query.filter(AIAuditLog.event_timestamp >= from_date)
    if to_date:
        query = query.filter(AIAuditLog.event_timestamp <= to_date)

    total = query.count()
    if total > 0:
        rows = (
            query.order_by(AIAuditLog.event_timestamp.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        items = [_serialize_row(row) for row in rows]
    else:
        items = _build_request_fallback(db, tenant_id)
        if user_id:
            items = [item for item in items if item.user_id == user_id]
        if event_type:
            items = [item for item in items if item.event_type == event_type]
        if from_date:
            items = [item for item in items if item.event_timestamp >= from_date.isoformat()]
        if to_date:
            items = [item for item in items if item.event_timestamp <= to_date.isoformat()]
        if incident_tag:
            items = [item for item in items if item.incident_tag == incident_tag]
        total = len(items)
        start = (page - 1) * page_size
        items = items[start:start + page_size]

    return AuditListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/audit/stats", response_model=AuditStatsResponse)
async def get_audit_stats(
    from_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    to_date: Optional[datetime] = Query(default=None, description="End date filter"),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
    db: Session = Depends(get_db),
) -> AuditStatsResponse:
    tenant_id = None if user_context.get("is_super_admin") else user_context.get("tenant_id")

    query = db.query(AIAuditLog)
    if tenant_id:
        query = query.filter(AIAuditLog.tenant_id == tenant_id)
    if from_date:
        query = query.filter(AIAuditLog.event_timestamp >= from_date)
    if to_date:
        query = query.filter(AIAuditLog.event_timestamp <= to_date)

    rows = query.all()
    entries = [_serialize_row(row) for row in rows] if rows else _build_request_fallback(db, tenant_id)
    if from_date:
        entries = [entry for entry in entries if entry.event_timestamp >= from_date.isoformat()]
    if to_date:
        entries = [entry for entry in entries if entry.event_timestamp <= to_date.isoformat()]

    by_event_type: Dict[str, int] = {}
    by_outcome: Dict[str, int] = {}
    by_risk_level: Dict[str, int] = {}
    total_incidents = 0

    for entry in entries:
        by_event_type[entry.event_type] = by_event_type.get(entry.event_type, 0) + 1
        if entry.outcome:
            by_outcome[entry.outcome] = by_outcome.get(entry.outcome, 0) + 1
        if entry.risk_level:
            by_risk_level[entry.risk_level] = by_risk_level.get(entry.risk_level, 0) + 1
        if entry.incident_tag and entry.incident_tag != "none":
            total_incidents += 1

    return AuditStatsResponse(
        total_requests=by_event_type.get(AuditEventType.REQUEST_RECEIVED.value, 0),
        total_actions=by_event_type.get(AuditEventType.ACTION_PLANNED.value, 0),
        total_executions=(
            by_event_type.get(AuditEventType.EXECUTION_COMPLETED.value, 0) +
            by_event_type.get(AuditEventType.EXECUTION_FAILED.value, 0)
        ),
        total_incidents=total_incidents,
        by_event_type=by_event_type,
        by_outcome=by_outcome,
        by_risk_level=by_risk_level,
    )


@router.get("/audit/{audit_id}", response_model=AuditEntryResponse)
async def get_audit_entry(
    audit_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
    db: Session = Depends(get_db),
) -> AuditEntryResponse:
    tenant_id = None if user_context.get("is_super_admin") else user_context.get("tenant_id")

    row = db.get(AIAuditLog, audit_id)
    if row and (tenant_id is None or row.tenant_id == tenant_id):
        return _serialize_row(row)

    for item in _build_request_fallback(db, tenant_id):
        if item.id == audit_id:
            return item

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=create_error_response(
            code=AIErrorCode.NOT_FOUND,
            message=f"Audit entry {audit_id} not found",
        ).model_dump(),
    )
