"""Unsubscribe Management Router for Admin Panel.

Provides API endpoints for managing email unsubscribe preferences.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from datetime import datetime, timedelta, timezone

from core.database import get_db
from core.database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas import ResponseEnvelope
from core.models.email_deliverability import EmailUnsubscribe
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/unsubscribes", tags=["admin"])


class UnsubscribeResponse(BaseModel):
    """Response for unsubscribe record."""
    
    id: str = Field(..., description="Unsubscribe ID")
    recipient: str = Field(..., description="Email address")
    scenario: str = Field(..., description="Email scenario")
    unsubscribed_at: str = Field(..., description="Unsubscribe timestamp")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")


class UnsubscribeListResponse(BaseModel):
    """Response for unsubscribe list."""
    
    unsubscribes: List[UnsubscribeResponse] = Field(..., description="List of unsubscribes")
    total: int = Field(..., description="Total count")
    page: int = Field(..., description="Current page")
    per_page: int = Field(..., description="Items per page")


class UnsubscribeStatsResponse(BaseModel):
    """Response for unsubscribe statistics."""
    
    total_unsubscribes: int = Field(..., description="Total unsubscribe count")
    unsubscribes_last_7_days: int = Field(..., description="Unsubscribes in last 7 days")
    unsubscribes_last_30_days: int = Field(..., description="Unsubscribes in last 30 days")
    unsubscribe_rate: float = Field(..., description="Unsubscribe rate percentage")
    top_scenarios: List[dict] = Field(..., description="Top scenarios by unsubscribe count")


@router.get(
    "",
    response_model=ResponseEnvelope[UnsubscribeListResponse],
    operation_id="listUnsubscribes",
    summary="List email unsubscribes",
    description="Get paginated list of email unsubscribes with filters"
)
async def list_unsubscribes(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    scenario: Optional[str] = Query(None, description="Filter by scenario"),
    search: Optional[str] = Query(None, description="Search by recipient email"),
    days: Optional[int] = Query(None, ge=1, le=365, description="Filter by days ago"),
    access: UnifiedAccess = Depends(require_access("admin.emails.view")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[UnsubscribeListResponse]:
    """
    List email unsubscribes with pagination and filters.
    
    Filters:
    - scenario: email scenario (e.g., APPOINTMENT_REMINDER)
    - search: partial email match
    - days: unsubscribes in last N days
    """
    user = access.user
    tenant_id = access.tenant_id
    
    # Build query
    query = db.query(EmailUnsubscribe).filter(EmailUnsubscribe.tenant_id == tenant_id)
    
    # Apply filters
    if scenario:
        query = query.filter(EmailUnsubscribe.scenario == scenario)
    
    if search:
        query = query.filter(EmailUnsubscribe.recipient.ilike(f"%{search}%"))
    
    if days:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(EmailUnsubscribe.unsubscribed_at >= cutoff_date)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    unsubscribes = query.order_by(desc(EmailUnsubscribe.unsubscribed_at)).offset(offset).limit(per_page).all()
    
    # Format response
    unsubscribe_list = []
    for unsub in unsubscribes:
        unsubscribe_list.append(UnsubscribeResponse(
            id=unsub.id,
            recipient=unsub.recipient,
            scenario=unsub.scenario,
            unsubscribed_at=unsub.unsubscribed_at.isoformat(),
            ip_address=unsub.ip_address,
            user_agent=unsub.user_agent
        ))
    
    return ResponseEnvelope(
        success=True,
        data=UnsubscribeListResponse(
            unsubscribes=unsubscribe_list,
            total=total,
            page=page,
            per_page=per_page
        )
    )


@router.get(
    "/stats",
    response_model=ResponseEnvelope[UnsubscribeStatsResponse],
    operation_id="getUnsubscribeStats",
    summary="Get unsubscribe statistics",
    description="Get overall unsubscribe statistics for tenant"
)
async def get_unsubscribe_stats(
    access: UnifiedAccess = Depends(require_access("admin.emails.view")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[UnsubscribeStatsResponse]:
    """
    Get unsubscribe statistics.
    
    Returns:
    - Total unsubscribes
    - Unsubscribes in last 7/30 days
    - Unsubscribe rate
    - Top scenarios by unsubscribe count
    """
    user = access.user
    tenant_id = access.tenant_id
    
    # Count total unsubscribes
    total_unsubscribes = db.query(EmailUnsubscribe).filter(
        EmailUnsubscribe.tenant_id == tenant_id
    ).count()
    
    # Count unsubscribes in last 7 days
    cutoff_7_days = datetime.now(timezone.utc) - timedelta(days=7)
    unsubscribes_last_7_days = db.query(EmailUnsubscribe).filter(
        and_(
            EmailUnsubscribe.tenant_id == tenant_id,
            EmailUnsubscribe.unsubscribed_at >= cutoff_7_days
        )
    ).count()
    
    # Count unsubscribes in last 30 days
    cutoff_30_days = datetime.now(timezone.utc) - timedelta(days=30)
    unsubscribes_last_30_days = db.query(EmailUnsubscribe).filter(
        and_(
            EmailUnsubscribe.tenant_id == tenant_id,
            EmailUnsubscribe.unsubscribed_at >= cutoff_30_days
        )
    ).count()
    
    # Calculate unsubscribe rate (unsubscribes / total emails sent)
    # This is a simplified calculation - in production, you'd want to track total emails sent
    from core.models.communication import EmailLog
    total_emails_sent = db.query(EmailLog).filter(
        and_(
            EmailLog.tenant_id == tenant_id,
            EmailLog.status == "sent"
        )
    ).count()
    
    unsubscribe_rate = 0.0
    if total_emails_sent > 0:
        unsubscribe_rate = (total_unsubscribes / total_emails_sent) * 100
    
    # Get top scenarios by unsubscribe count
    from sqlalchemy import func
    top_scenarios_query = db.query(
        EmailUnsubscribe.scenario,
        func.count(EmailUnsubscribe.id).label("count")
    ).filter(
        EmailUnsubscribe.tenant_id == tenant_id
    ).group_by(
        EmailUnsubscribe.scenario
    ).order_by(
        desc("count")
    ).limit(5).all()
    
    top_scenarios = [
        {"scenario": scenario, "count": count}
        for scenario, count in top_scenarios_query
    ]
    
    return ResponseEnvelope(
        success=True,
        data=UnsubscribeStatsResponse(
            total_unsubscribes=total_unsubscribes,
            unsubscribes_last_7_days=unsubscribes_last_7_days,
            unsubscribes_last_30_days=unsubscribes_last_30_days,
            unsubscribe_rate=unsubscribe_rate,
            top_scenarios=top_scenarios
        )
    )


@router.delete(
    "/{unsubscribe_id}",
    response_model=ResponseEnvelope[dict],
    operation_id="deleteUnsubscribe",
    summary="Delete unsubscribe record",
    description="Remove unsubscribe preference (allows sending emails again)"
)
async def delete_unsubscribe(
    unsubscribe_id: str,
    access: UnifiedAccess = Depends(require_access("admin.emails.manage")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[dict]:
    """
    Delete unsubscribe record.
    
    This allows sending emails to the recipient again for the specified scenario.
    Use with caution - only delete if the recipient has explicitly requested to resubscribe.
    """
    user = access.user
    tenant_id = access.tenant_id
    
    # Get unsubscribe record
    unsubscribe = db.query(EmailUnsubscribe).filter(
        and_(
            EmailUnsubscribe.id == unsubscribe_id,
            EmailUnsubscribe.tenant_id == tenant_id
        )
    ).first()
    
    if not unsubscribe:
        return ResponseEnvelope(
            success=False,
            error={
                "code": "UNSUBSCRIBE_NOT_FOUND",
                "message": "Unsubscribe record not found"
            }
        )
    
    # Delete record
    recipient = unsubscribe.recipient
    scenario = unsubscribe.scenario
    db.delete(unsubscribe)
    db.commit()
    
    logger.info(
        f"Unsubscribe record deleted by admin",
        extra={
            "tenant_id": tenant_id,
            "recipient": recipient,
            "scenario": scenario,
            "admin_user_id": user.id
        }
    )
    
    return ResponseEnvelope(
        success=True,
        data={
            "recipient": recipient,
            "scenario": scenario,
            "message": "Unsubscribe record deleted successfully"
        }
    )
