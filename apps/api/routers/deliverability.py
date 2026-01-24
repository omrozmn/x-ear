"""Deliverability Dashboard Router.

Provides API endpoints for email deliverability monitoring and metrics.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas import ResponseEnvelope
from services.deliverability_metrics_service import get_deliverability_metrics_service
from services.deliverability_alert_service import get_deliverability_alert_service
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/deliverability", tags=["admin"])


class DeliverabilityMetricsResponse(BaseModel):
    """Response for deliverability metrics."""
    
    sent_count: int = Field(..., description="Number of emails sent")
    bounce_count: int = Field(..., description="Number of bounces")
    spam_count: int = Field(..., description="Number of spam complaints")
    bounce_rate: float = Field(..., description="Bounce rate percentage")
    spam_rate: float = Field(..., description="Spam complaint rate percentage")
    deliverability_rate: float = Field(..., description="Deliverability rate percentage")
    time_window_hours: int = Field(..., description="Time window in hours")
    calculated_at: str = Field(..., description="Calculation timestamp")


class AlertCheckResponse(BaseModel):
    """Response for alert check."""
    
    should_alert: bool = Field(..., description="Whether alerts should be triggered")
    alerts: list = Field(..., description="List of active alerts")
    metrics: dict = Field(..., description="Current metrics")


class TrendResponse(BaseModel):
    """Response for deliverability trend."""
    
    tenant_id: str = Field(..., description="Tenant ID")
    days: int = Field(..., description="Number of days")
    data: list = Field(..., description="Daily metrics data")


@router.get(
    "/metrics",
    response_model=ResponseEnvelope[DeliverabilityMetricsResponse],
    operation_id="getDeliverabilityMetrics",
    summary="Get deliverability metrics",
    description="Get email deliverability metrics for time window"
)
async def get_deliverability_metrics(
    time_window_hours: int = Query(24, description="Time window in hours", ge=1, le=168),
    access: UnifiedAccess = Depends(require_access("admin.deliverability.view")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[DeliverabilityMetricsResponse]:
    """
    Get deliverability metrics for tenant.
    
    Calculates:
    - Sent count
    - Bounce rate
    - Spam complaint rate
    - Deliverability rate
    """
    user = access.user
    tenant_id = access.tenant_id
    
    service = get_deliverability_metrics_service(db)
    metrics = service.calculate_metrics(tenant_id, time_window_hours)
    
    return ResponseEnvelope(
        success=True,
        data=DeliverabilityMetricsResponse(**metrics)
    )


@router.get(
    "/alerts/check",
    response_model=ResponseEnvelope[AlertCheckResponse],
    operation_id="checkDeliverabilityAlerts",
    summary="Check deliverability alerts",
    description="Check if metrics exceed alert thresholds"
)
async def check_deliverability_alerts(
    time_window_hours: int = Query(1, description="Time window in hours", ge=1, le=24),
    access: UnifiedAccess = Depends(require_access("admin.deliverability.view")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[AlertCheckResponse]:
    """
    Check if deliverability metrics exceed alert thresholds.
    
    Thresholds:
    - Bounce rate > 5%
    - Spam rate > 0.1%
    - Deliverability rate < 95%
    """
    user = access.user
    tenant_id = access.tenant_id
    
    service = get_deliverability_metrics_service(db)
    result = service.check_alert_thresholds(tenant_id, time_window_hours)
    
    # Send alerts if needed
    if result["should_alert"]:
        alert_service = get_deliverability_alert_service()
        alert_service.send_alert(
            tenant_id=tenant_id,
            alerts=result["alerts"],
            metrics=result["metrics"]
        )
    
    return ResponseEnvelope(
        success=True,
        data=AlertCheckResponse(**result)
    )


@router.get(
    "/trend",
    response_model=ResponseEnvelope[TrendResponse],
    operation_id="getDeliverabilityTrend",
    summary="Get deliverability trend",
    description="Get deliverability metrics trend over time"
)
async def get_deliverability_trend(
    days: int = Query(7, description="Number of days", ge=1, le=30),
    access: UnifiedAccess = Depends(require_access("admin.deliverability.view")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[TrendResponse]:
    """
    Get deliverability trend over time.
    
    Returns daily metrics for the specified number of days.
    """
    user = access.user
    tenant_id = access.tenant_id
    
    service = get_deliverability_metrics_service(db)
    trend = service.get_trend(tenant_id, days)
    
    return ResponseEnvelope(
        success=True,
        data=TrendResponse(**trend)
    )


@router.post(
    "/snapshot",
    response_model=ResponseEnvelope[dict],
    operation_id="createDeliverabilitySnapshot",
    summary="Create daily metrics snapshot",
    description="Store daily deliverability metrics snapshot"
)
async def create_deliverability_snapshot(
    access: UnifiedAccess = Depends(require_access("admin.deliverability.manage")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[dict]:
    """
    Create daily deliverability metrics snapshot.
    
    This should be called daily (e.g., via cron job) to store metrics history.
    """
    user = access.user
    tenant_id = access.tenant_id
    
    service = get_deliverability_metrics_service(db)
    snapshot_id = service.store_daily_snapshot(tenant_id)
    
    return ResponseEnvelope(
        success=True,
        data={
            "snapshot_id": snapshot_id,
            "tenant_id": tenant_id
        }
    )
