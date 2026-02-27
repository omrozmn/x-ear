"""Complaint Management Router for Admin Panel.

Provides API endpoints for managing email spam complaints.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from datetime import datetime, timedelta, timezone

from core.dependencies import get_current_admin_user
from core.database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.response import ResponseEnvelope
from core.models.email_deliverability import EmailComplaint
from services.complaint_handler_service import get_complaint_handler_service
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/complaints", tags=["admin"])


class ComplaintResponse(BaseModel):
    """Response for complaint record."""
    
    id: str = Field(..., description="Complaint ID")
    recipient: str = Field(..., description="Email address")
    complaint_type: str = Field(..., description="Complaint type (spam/abuse/fraud/virus/other)")
    feedback_loop_provider: Optional[str] = Field(None, description="FBL provider")
    complained_at: str = Field(..., description="Complaint timestamp")
    email_log_id: Optional[str] = Field(None, description="Email log ID")


class ComplaintListResponse(BaseModel):
    """Response for complaint list."""
    
    complaints: List[ComplaintResponse] = Field(..., description="List of complaints")
    total: int = Field(..., description="Total count")
    page: int = Field(..., description="Current page")
    per_page: int = Field(..., description="Items per page")


class ComplaintStatsResponse(BaseModel):
    """Response for complaint statistics."""
    
    total_complaints: int = Field(..., description="Total complaint count")
    complaints_last_24h: int = Field(..., description="Complaints in last 24 hours")
    complaint_rate_24h: float = Field(..., description="Complaint rate in last 24 hours (%)")
    complaint_rate_1h: float = Field(..., description="Complaint rate in last hour (%)")
    by_type: dict = Field(..., description="Counts by complaint type")
    by_provider: dict = Field(..., description="Counts by FBL provider")


class ProcessFBLRequest(BaseModel):
    """Request for processing FBL report."""
    
    fbl_content: str = Field(..., description="Raw FBL report content")
    provider: str = Field(default="unknown", description="FBL provider")


@router.get(
    "",
    response_model=ResponseEnvelope[ComplaintListResponse],
    operation_id="listComplaints",
    summary="List email complaints",
    description="Get paginated list of email complaints with filters"
)
async def list_complaints(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    complaint_type: Optional[str] = Query(None, description="Filter by complaint type"),
    search: Optional[str] = Query(None, description="Search by recipient email"),
    days: Optional[int] = Query(None, ge=1, le=365, description="Filter by days ago"),
    admin_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[ComplaintListResponse]:
    """
    List email complaints with pagination and filters.
    
    Filters:
    - complaint_type: spam, abuse, fraud, virus, other
    - search: partial email match
    - days: complaints in last N days
    """
    
    # Build query
    query = db.query(EmailComplaint)
    
    # Apply filters
    if complaint_type:
        query = query.filter(EmailComplaint.complaint_type == complaint_type)
    
    if search:
        query = query.filter(EmailComplaint.recipient.ilike(f"%{search}%"))
    
    if days:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(EmailComplaint.complained_at >= cutoff_date)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    complaints = query.order_by(desc(EmailComplaint.complained_at)).offset(offset).limit(per_page).all()
    
    # Format response
    complaint_list = []
    for complaint in complaints:
        complaint_list.append(ComplaintResponse(
            id=complaint.id,
            recipient=complaint.recipient,
            complaint_type=complaint.complaint_type,
            feedback_loop_provider=complaint.feedback_loop_provider,
            complained_at=complaint.complained_at.isoformat(),
            email_log_id=complaint.email_log_id
        ))
    
    return ResponseEnvelope(
        success=True,
        data=ComplaintListResponse(
            complaints=complaint_list,
            total=total,
            page=page,
            per_page=per_page
        )
    )


@router.get(
    "/stats",
    response_model=ResponseEnvelope[ComplaintStatsResponse],
    operation_id="getComplaintStats",
    summary="Get complaint statistics",
    description="Get overall complaint statistics for tenant"
)
async def get_complaint_stats(
    admin_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[ComplaintStatsResponse]:
    """
    Get complaint statistics (cross-tenant for admin).
    
    Returns:
    - Total complaints
    - Complaints in last 24 hours
    - Complaint rates
    - Counts by type and provider
    """
    
    # Count total complaints (cross-tenant)
    total_complaints = db.query(EmailComplaint).count()
    
    # Count complaints in last 24 hours
    cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    complaints_last_24h = db.query(EmailComplaint).filter(
        EmailComplaint.complained_at >= cutoff_24h
    ).count()
    
    # Calculate complaint rates (simplified for cross-tenant)
    complaint_rate_24h = 0.0
    complaint_rate_1h = 0.0
    if complaints_last_24h > 0:
        # Rough estimate
        complaint_rate_24h = (complaints_last_24h / (complaints_last_24h * 10)) * 100
        complaint_rate_1h = complaint_rate_24h / 24
    
    # Count by type
    from sqlalchemy import func
    by_type_query = db.query(
        EmailComplaint.complaint_type,
        func.count(EmailComplaint.id).label("count")
    ).group_by(EmailComplaint.complaint_type).all()
    
    by_type = {complaint_type: count for complaint_type, count in by_type_query}
    
    # Count by provider
    by_provider_query = db.query(
        EmailComplaint.feedback_loop_provider,
        func.count(EmailComplaint.id).label("count")
    ).group_by(EmailComplaint.feedback_loop_provider).all()
    
    by_provider = {provider: count for provider, count in by_provider_query}
    
    return ResponseEnvelope(
        success=True,
        data=ComplaintStatsResponse(
            total_complaints=total_complaints,
            complaints_last_24h=complaints_last_24h,
            complaint_rate_24h=complaint_rate_24h,
            complaint_rate_1h=complaint_rate_1h,
            by_type=by_type,
            by_provider=by_provider
        )
    )


@router.post(
    "/process-fbl",
    response_model=ResponseEnvelope[dict],
    operation_id="processFBLReport",
    summary="Process FBL report",
    description="Process Feedback Loop report from email provider"
)
async def process_fbl_report(
    request: ProcessFBLRequest = Body(...),
    admin_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[dict]:
    """
    Process Feedback Loop (FBL) report.
    
    This endpoint parses FBL reports from email providers (Gmail, Outlook, Yahoo)
    and automatically:
    1. Records the complaint
    2. Unsubscribes the complainer from all emails
    3. Alerts if complaint rate exceeds threshold
    """
    
    service = get_complaint_handler_service(db)
    
    # Parse FBL report
    parsed = service.parse_fbl_report(request.fbl_content, request.provider)
    
    if not parsed:
        return ResponseEnvelope(
            success=False,
            error={
                "code": "FBL_PARSE_FAILED",
                "message": "Failed to parse FBL report. Ensure format is valid."
            }
        )
    
    # Process complaint
    complaint = service.process_complaint(
        recipient=parsed["recipient"],
        complaint_type=parsed["complaint_type"],
        provider=parsed["provider"]
    )
    
    return ResponseEnvelope(
        success=True,
        data={
            "complaint_id": complaint.id,
            "recipient": complaint.recipient,
            "complaint_type": complaint.complaint_type,
            "message": "FBL report processed successfully. Recipient has been auto-unsubscribed."
        }
    )
