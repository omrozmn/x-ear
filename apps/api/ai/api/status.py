"""
AI Status Endpoint

GET /ai/status - Get AI layer status including phase, quota, and kill switch
GET /ai/metrics - Get SLA metrics and alerts

Provides status information for frontend integration.

Requirements:
- 14.1: REST endpoints with OpenAPI documentation at /ai/*
- 14.5: When AI is unavailable, frontend hides AI features
- 23.1: Track and expose p50/p95 inference latency, error rate, timeout rate
- 23.2: Track approval metrics
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from pydantic import BaseModel, Field

from schemas.ai import AIStatusResponse as AIStatusResponseSchema
from ai.config import get_ai_config, AIPhase
from ai.services.kill_switch import (
    KillSwitch,
    get_kill_switch,
    KillSwitchState,
    AICapability,
)
from ai.services.usage_tracker import get_usage_tracker, UsageSummary
from ai.services.metrics import (
    get_metrics_collector,
    SLAMetrics,
    MetricType,
)
from ai.services.alerting import (
    get_alerting_service,
    AlertSeverity,
    AlertType,
    check_and_alert,
)
from ai.models.ai_usage import UsageType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Status"])


# =============================================================================
# Response Models
# =============================================================================

# Using schemas.ai.AIStatusResponseSchema via alias to avoid conflict


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(description="Health status")
    ai_enabled: bool = Field(description="Whether AI is enabled")
    model_available: bool = Field(description="Whether model is available")
    kill_switch_active: bool = Field(description="Whether any kill switch is active")
    timestamp: str = Field(description="Check timestamp")


# =============================================================================
# Dependencies
# =============================================================================

async def get_current_user_context(request: Request) -> Dict[str, Any]:
    """
    Get current user context from request state.
    
    The JWT auth middleware sets tenant_id and user_id in request.state.
    This dependency extracts them for use in the endpoint.
    
    Returns:
        Dict with user_id and tenant_id
    """
    # Extract from request.state (set by JWT auth middleware)
    tenant_id = getattr(request.state, "tenant_id", None)
    user_id = getattr(request.state, "user_id", None)
    
    if not tenant_id or not user_id:
        # This should not happen if JWT middleware is working correctly
        logger.error("Missing tenant_id or user_id in request.state")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    return {
        "user_id": user_id,
        "tenant_id": tenant_id,
    }


# =============================================================================
# Endpoints
# =============================================================================

@router.get(
    "/status",
    response_model=AIStatusResponseSchema,
    responses={
        200: {"description": "AI status retrieved"},
    },
    summary="Get AI layer status",
    description="""
    Get comprehensive AI layer status including:
    - Whether AI is enabled and available
    - Current phase (A=read_only, B=proposal, C=execution)
    - Kill switch status (global, tenant, capability)
    - Usage and quota status
    - Model availability
    
    Use this endpoint to determine whether to show AI features in the UI.
    """,
)
async def get_status(
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> AIStatusResponseSchema:
    """Get AI layer status."""
    tenant_id = user_context.get("tenant_id", "unknown")
    
    config = get_ai_config()
    kill_switch = get_kill_switch()
    usage_tracker = get_usage_tracker()
    
    # Check kill switch status
    global_active = kill_switch.is_global_active()
    tenant_active = kill_switch.is_tenant_active(tenant_id)
    
    # Check which capabilities are disabled
    capabilities_disabled = []
    for cap in AICapability:
        if cap != AICapability.ALL and kill_switch.is_capability_active(cap):
            capabilities_disabled.append(cap.value)
    
    # Get kill switch reason
    kill_switch_reason = None
    if global_active:
        state = kill_switch.get_global_state()
        kill_switch_reason = state.reason
    elif tenant_active:
        state = kill_switch.get_tenant_state(tenant_id)
        if state:
            kill_switch_reason = state.reason
    
    kill_switch_status = KillSwitchStatusResponse(
        global_active=global_active,
        tenant_active=tenant_active,
        capabilities_disabled=capabilities_disabled,
        reason=kill_switch_reason,
    )
    
    # Get usage status
    usage_summary = usage_tracker.get_usage_summary(tenant_id)
    
    quotas = []
    for usage_type in UsageType:
        record = usage_summary.by_type.get(usage_type.value)
        if record:
            quotas.append(QuotaStatusResponse(
                usage_type=usage_type.value,
                current_usage=record.request_count,
                quota_limit=record.quota_limit,
                remaining=record.remaining_quota,
                exceeded=record.quota_exceeded,
            ))
        else:
            quotas.append(QuotaStatusResponse(
                usage_type=usage_type.value,
                current_usage=0,
                quota_limit=None,
                remaining=None,
                exceeded=False,
            ))
    
    usage_status = UsageStatusResponse(
        total_requests_today=usage_summary.total_requests,
        quotas=quotas,
        any_quota_exceeded=usage_summary.any_quota_exceeded,
    )
    
    # Phase status
    phase_status = PhaseStatusResponse(
        current_phase=config.phase.name,
        phase_name=config.phase.value,
        execution_allowed=config.is_execution_allowed(),
        proposal_allowed=config.is_proposal_allowed(),
    )
    
    # Model status (simplified - in production, check actual model availability)
    model_status = ModelStatusResponse(
        provider=config.model.provider,
        model_id=config.model.model_id,
        available=config.enabled,  # Simplified check
    )
    
    # Determine overall availability
    available = (
        config.enabled and
        not global_active and
        not tenant_active and
        not usage_summary.any_quota_exceeded
    )
    
    return AIStatusResponseSchema(
        enabled=config.enabled,
        available=available,
        # Field mapping (if internal names changed in schemas.ai)
        phase=config.phase.value, 
        ai_model_id=config.model.ai_model_id,
        ai_model_version=os.getenv("AI_MODEL_VERSION", "1.0.0"), # Fallback
        ai_model_available=config.enabled,
        kill_switch_active=global_active or tenant_active,
        quota_remaining=usage_summary.total_requests, # Simplified for example
        quota_limit=config.quota_limit,
    )


@router.get(
    "/health",
    response_model=HealthResponse,
    responses={
        200: {"description": "Health check passed"},
        503: {"description": "AI service unhealthy"},
    },
    summary="AI health check",
    description="Simple health check for AI layer availability.",
)
async def health_check() -> HealthResponse:
    """Simple health check for AI layer."""
    config = get_ai_config()
    kill_switch = get_kill_switch()
    
    # Check if any kill switch is active
    kill_switch_active = kill_switch.is_any_active()
    
    # Determine health status
    if not config.enabled:
        health_status = "disabled"
    elif kill_switch_active:
        health_status = "degraded"
    else:
        health_status = "healthy"
    
    return HealthResponse(
        status=health_status,
        ai_enabled=config.enabled,
        model_available=config.enabled,  # Simplified
        kill_switch_active=kill_switch_active,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get(
    "/capabilities",
    responses={
        200: {"description": "Capabilities retrieved"},
    },
    summary="Get available AI capabilities",
    description="Get list of available AI capabilities for the current tenant.",
)
async def get_capabilities(
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> Dict[str, Any]:
    """Get available AI capabilities."""
    tenant_id = user_context.get("tenant_id", "unknown")
    
    config = get_ai_config()
    kill_switch = get_kill_switch()
    
    capabilities = {}
    
    for cap in AICapability:
        if cap == AICapability.ALL:
            continue
        
        # Check if capability is available
        is_blocked = kill_switch.check(
            tenant_id=tenant_id,
            capability=cap,
        ).blocked
        
        capabilities[cap.value] = {
            "available": config.enabled and not is_blocked,
            "blocked": is_blocked,
        }
    
    return {
        "capabilities": capabilities,
        "phase": config.phase.name,
        "execution_allowed": config.is_execution_allowed(),
    }


# =============================================================================
# Metrics Response Models
# =============================================================================

class LatencyMetricsResponse(BaseModel):
    """Latency metrics."""
    count: int = Field(description="Number of samples")
    min_ms: float = Field(description="Minimum latency in ms")
    max_ms: float = Field(description="Maximum latency in ms")
    mean_ms: float = Field(description="Mean latency in ms")
    p50_ms: float = Field(description="50th percentile latency in ms")
    p95_ms: float = Field(description="95th percentile latency in ms")
    p99_ms: float = Field(description="99th percentile latency in ms")


class RateMetricsResponse(BaseModel):
    """Rate metrics (errors, timeouts, etc.)."""
    total_count: int = Field(description="Total request count")
    success_count: int = Field(description="Successful requests")
    error_count: int = Field(description="Failed requests")
    timeout_count: int = Field(description="Timed out requests")
    error_rate: float = Field(description="Error rate (0.0-1.0)")
    timeout_rate: float = Field(description="Timeout rate (0.0-1.0)")
    success_rate: float = Field(description="Success rate (0.0-1.0)")


class ApprovalMetricsResponse(BaseModel):
    """Approval metrics."""
    total_approvals_requested: int = Field(description="Total approvals requested")
    approvals_granted: int = Field(description="Approvals granted")
    approvals_rejected: int = Field(description="Approvals rejected")
    auto_approved: int = Field(description="Auto-approved actions")
    human_approval_rate: float = Field(description="Human approval rate")
    human_rejection_rate: float = Field(description="Human rejection rate")
    auto_approval_rate: float = Field(description="Auto-approval rate")
    avg_approval_latency_ms: float = Field(description="Average approval latency in ms")
    p50_approval_latency_ms: float = Field(description="P50 approval latency in ms")
    p95_approval_latency_ms: float = Field(description="P95 approval latency in ms")


class QuotaMetricsResponse(BaseModel):
    """Quota-related metrics."""
    total_requests: int = Field(description="Total requests")
    quota_rejections: int = Field(description="Quota rejections")
    rate_limited: int = Field(description="Rate limited requests")
    quota_rejection_rate: float = Field(description="Quota rejection rate")
    rate_limit_rate: float = Field(description="Rate limit rate")


class SLAMetricsResponse(BaseModel):
    """Complete SLA metrics response."""
    timestamp: str = Field(description="Metrics timestamp")
    window_minutes: int = Field(description="Aggregation window in minutes")
    inference_latency: LatencyMetricsResponse = Field(description="Inference latency metrics")
    intent_latency: LatencyMetricsResponse = Field(description="Intent classification latency")
    planning_latency: LatencyMetricsResponse = Field(description="Action planning latency")
    execution_latency: LatencyMetricsResponse = Field(description="Execution latency")
    rates: RateMetricsResponse = Field(description="Error and timeout rates")
    approvals: ApprovalMetricsResponse = Field(description="Approval metrics")
    quota: QuotaMetricsResponse = Field(description="Quota metrics")


class AlertResponse(BaseModel):
    """Alert response."""
    alert_id: str = Field(description="Alert ID")
    alert_type: str = Field(description="Alert type")
    severity: str = Field(description="Alert severity")
    message: str = Field(description="Alert message")
    timestamp: str = Field(description="Alert timestamp")
    metric_value: float = Field(description="Metric value that triggered alert")
    threshold_value: float = Field(description="Threshold that was breached")
    tenant_id: Optional[str] = Field(default=None, description="Tenant ID if applicable")
    acknowledged: bool = Field(description="Whether alert is acknowledged")
    acknowledged_by: Optional[str] = Field(default=None, description="User who acknowledged")
    acknowledged_at: Optional[str] = Field(default=None, description="Acknowledgment timestamp")


class AlertsResponse(BaseModel):
    """Alerts list response."""
    alerts: List[AlertResponse] = Field(description="List of alerts")
    total_count: int = Field(description="Total alert count")
    active_count: int = Field(description="Unacknowledged alert count")


# =============================================================================
# Metrics Endpoints
# =============================================================================

@router.get(
    "/metrics",
    response_model=SLAMetricsResponse,
    responses={
        200: {"description": "SLA metrics retrieved"},
    },
    summary="Get SLA metrics",
    description="""
    Get comprehensive SLA metrics including:
    - Inference latency (p50/p95/p99)
    - Intent classification latency
    - Action planning latency
    - Execution latency
    - Error and timeout rates
    - Approval metrics (latency, rejection rate, auto-approval rate)
    - Quota rejection metrics
    
    Metrics are aggregated over a configurable time window (default 15 minutes).
    """,
)
async def get_metrics(
    window_minutes: int = Query(default=15, ge=1, le=1440, description="Aggregation window in minutes"),
) -> SLAMetricsResponse:
    """Get SLA metrics."""
    collector = get_metrics_collector()
    metrics = collector.get_sla_metrics(window_minutes=window_minutes)
    
    return SLAMetricsResponse(
        timestamp=metrics.timestamp.isoformat(),
        window_minutes=metrics.window_minutes,
        inference_latency=LatencyMetricsResponse(
            count=metrics.inference_latency.count,
            min_ms=metrics.inference_latency.min_ms,
            max_ms=metrics.inference_latency.max_ms,
            mean_ms=metrics.inference_latency.mean_ms,
            p50_ms=metrics.inference_latency.p50_ms,
            p95_ms=metrics.inference_latency.p95_ms,
            p99_ms=metrics.inference_latency.p99_ms,
        ),
        intent_latency=LatencyMetricsResponse(
            count=metrics.intent_latency.count,
            min_ms=metrics.intent_latency.min_ms,
            max_ms=metrics.intent_latency.max_ms,
            mean_ms=metrics.intent_latency.mean_ms,
            p50_ms=metrics.intent_latency.p50_ms,
            p95_ms=metrics.intent_latency.p95_ms,
            p99_ms=metrics.intent_latency.p99_ms,
        ),
        planning_latency=LatencyMetricsResponse(
            count=metrics.planning_latency.count,
            min_ms=metrics.planning_latency.min_ms,
            max_ms=metrics.planning_latency.max_ms,
            mean_ms=metrics.planning_latency.mean_ms,
            p50_ms=metrics.planning_latency.p50_ms,
            p95_ms=metrics.planning_latency.p95_ms,
            p99_ms=metrics.planning_latency.p99_ms,
        ),
        execution_latency=LatencyMetricsResponse(
            count=metrics.execution_latency.count,
            min_ms=metrics.execution_latency.min_ms,
            max_ms=metrics.execution_latency.max_ms,
            mean_ms=metrics.execution_latency.mean_ms,
            p50_ms=metrics.execution_latency.p50_ms,
            p95_ms=metrics.execution_latency.p95_ms,
            p99_ms=metrics.execution_latency.p99_ms,
        ),
        rates=RateMetricsResponse(
            total_count=metrics.rates.total_count,
            success_count=metrics.rates.success_count,
            error_count=metrics.rates.error_count,
            timeout_count=metrics.rates.timeout_count,
            error_rate=metrics.rates.error_rate,
            timeout_rate=metrics.rates.timeout_rate,
            success_rate=metrics.rates.success_rate,
        ),
        approvals=ApprovalMetricsResponse(
            total_approvals_requested=metrics.approvals.total_approvals_requested,
            approvals_granted=metrics.approvals.approvals_granted,
            approvals_rejected=metrics.approvals.approvals_rejected,
            auto_approved=metrics.approvals.auto_approved,
            human_approval_rate=metrics.approvals.human_approval_rate,
            human_rejection_rate=metrics.approvals.human_rejection_rate,
            auto_approval_rate=metrics.approvals.auto_approval_rate,
            avg_approval_latency_ms=metrics.approvals.avg_approval_latency_ms,
            p50_approval_latency_ms=metrics.approvals.p50_approval_latency_ms,
            p95_approval_latency_ms=metrics.approvals.p95_approval_latency_ms,
        ),
        quota=QuotaMetricsResponse(
            total_requests=metrics.quota.total_requests,
            quota_rejections=metrics.quota.quota_rejections,
            rate_limited=metrics.quota.rate_limited,
            quota_rejection_rate=metrics.quota.quota_rejection_rate,
            rate_limit_rate=metrics.quota.rate_limit_rate,
        ),
    )


@router.get(
    "/alerts",
    response_model=AlertsResponse,
    responses={
        200: {"description": "Alerts retrieved"},
    },
    summary="Get AI alerts",
    description="""
    Get AI layer alerts including:
    - Error rate threshold breaches
    - Latency SLA breaches
    - Approval latency alerts
    - Circuit breaker state changes
    
    Alerts can be filtered by severity and acknowledgment status.
    """,
)
async def get_alerts(
    severity: Optional[str] = Query(default=None, description="Filter by severity (info, warning, error, critical)"),
    acknowledged: Optional[bool] = Query(default=None, description="Filter by acknowledgment status"),
    limit: int = Query(default=100, ge=1, le=1000, description="Maximum alerts to return"),
) -> AlertsResponse:
    """Get AI alerts."""
    alerting = get_alerting_service()
    
    # Parse severity filter
    severity_filter = None
    if severity:
        try:
            severity_filter = AlertSeverity(severity.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid severity: {severity}. Must be one of: info, warning, error, critical"
            )
    
    alerts = alerting.get_alerts(
        severity=severity_filter,
        acknowledged=acknowledged,
        limit=limit,
    )
    
    active_alerts = alerting.get_active_alerts()
    
    return AlertsResponse(
        alerts=[
            AlertResponse(
                alert_id=a.alert_id,
                alert_type=a.alert_type.value,
                severity=a.severity.value,
                message=a.message,
                timestamp=a.timestamp.isoformat(),
                metric_value=a.metric_value,
                threshold_value=a.threshold_value,
                tenant_id=a.tenant_id,
                acknowledged=a.acknowledged,
                acknowledged_by=a.acknowledged_by,
                acknowledged_at=a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            )
            for a in alerts
        ],
        total_count=len(alerts),
        active_count=len(active_alerts),
    )


@router.post(
    "/alerts/{alert_id}/acknowledge",
    responses={
        200: {"description": "Alert acknowledged"},
        404: {"description": "Alert not found"},
    },
    summary="Acknowledge an alert",
    description="Acknowledge an alert to mark it as handled.",
)
async def acknowledge_alert(
    alert_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> Dict[str, Any]:
    """Acknowledge an alert."""
    user_id = user_context.get("user_id", "unknown")
    
    alerting = get_alerting_service()
    success = alerting.acknowledge_alert(alert_id, user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert not found: {alert_id}"
        )
    
    return {
        "success": True,
        "alert_id": alert_id,
        "acknowledged_by": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post(
    "/alerts/check",
    responses={
        200: {"description": "Alerts checked"},
    },
    summary="Check metrics and emit alerts",
    description="Manually trigger alert checking against current metrics.",
)
async def trigger_alert_check() -> Dict[str, Any]:
    """Manually trigger alert checking."""
    alerts = check_and_alert()
    
    return {
        "alerts_emitted": len(alerts),
        "alerts": [
            {
                "alert_id": a.alert_id,
                "alert_type": a.alert_type.value,
                "severity": a.severity.value,
                "message": a.message,
            }
            for a in alerts
        ],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
