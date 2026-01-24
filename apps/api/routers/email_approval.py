"""Email Approval Router for Admin Panel.

Provides API endpoints for managing AI email approval workflow.
"""

import logging
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from core.database import get_db
from core.database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas import ResponseEnvelope
from core.models.email_deliverability import EmailApproval
from services.email_approval_service import get_email_approval_service
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/email-approvals", tags=["admin"])


class ApprovalResponse(BaseModel):
    """Response for approval record."""
    
    id: str = Field(..., description="Approval ID")
    recipient: str = Field(..., description="Email recipient")
    subject: str = Field(..., description="Email subject")
    body_text: str = Field(..., description="Email body (plain text)")
    body_html: Optional[str] = Field(None, description="Email body (HTML)")
    scenario: str = Field(..., description="Email scenario")
    risk_level: str = Field(..., description="Risk level (LOW/MEDIUM/HIGH/CRITICAL)")
    risk_reasons: List[str] = Field(..., description="Risk reasons")
    spam_score: Optional[float] = Field(None, description="Spam score")
    status: str = Field(..., description="Status (pending/approved/rejected)")
    action_plan_hash: Optional[str] = Field(None, description="Action plan hash")
    requested_at: str = Field(..., description="Request timestamp")
    reviewed_at: Optional[str] = Field(None, description="Review timestamp")
    reviewed_by: Optional[str] = Field(None, description="Reviewer user ID")
    review_notes: Optional[str] = Field(None, description="Review notes")


class ApprovalListResponse(BaseModel):
    """Response for approval list."""
    
    approvals: List[ApprovalResponse] = Field(..., description="List of approvals")
    total: int = Field(..., description="Total count")
    page: int = Field(..., description="Current page")
    per_page: int = Field(..., description="Items per page")


class ApprovalStatsResponse(BaseModel):
    """Response for approval statistics."""
    
    pending: int = Field(..., description="Pending approval count")
    approved: int = Field(..., description="Approved count")
    rejected: int = Field(..., description="Rejected count")
    by_risk_level: dict = Field(..., description="Counts by risk level")


class ApprovalActionRequest(BaseModel):
    """Request for approval action."""
    
    review_notes: Optional[str] = Field(None, description="Review notes")


@router.get(
    "",
    response_model=ResponseEnvelope[ApprovalListResponse],
    operation_id="listEmailApprovals",
    summary="List email approval requests",
    description="Get paginated list of email approval requests with filters"
)
async def list_email_approvals(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status (pending/approved/rejected)"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    search: Optional[str] = Query(None, description="Search by recipient or subject"),
    access: UnifiedAccess = Depends(require_access("admin.emails.approve")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[ApprovalListResponse]:
    """
    List email approval requests with pagination and filters.
    
    Filters:
    - status: pending, approved, rejected
    - risk_level: LOW, MEDIUM, HIGH, CRITICAL
    - search: partial match on recipient or subject
    """
    user = access.user
    tenant_id = access.tenant_id
    
    # Build query
    query = db.query(EmailApproval).filter(EmailApproval.tenant_id == tenant_id)
    
    # Apply filters
    if status:
        query = query.filter(EmailApproval.status == status)
    
    if risk_level:
        query = query.filter(EmailApproval.risk_level == risk_level)
    
    if search:
        query = query.filter(
            (EmailApproval.recipient.ilike(f"%{search}%")) |
            (EmailApproval.subject.ilike(f"%{search}%"))
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    approvals = query.order_by(desc(EmailApproval.requested_at)).offset(offset).limit(per_page).all()
    
    # Format response
    approval_list = []
    for approval in approvals:
        # Parse risk reasons from JSON
        risk_reasons = []
        if approval.risk_reasons:
            try:
                risk_reasons = json.loads(approval.risk_reasons)
            except json.JSONDecodeError:
                risk_reasons = []
        
        approval_list.append(ApprovalResponse(
            id=approval.id,
            recipient=approval.recipient,
            subject=approval.subject,
            body_text=approval.body_text,
            body_html=approval.body_html,
            scenario=approval.scenario,
            risk_level=approval.risk_level,
            risk_reasons=risk_reasons,
            spam_score=approval.spam_score,
            status=approval.status,
            action_plan_hash=approval.action_plan_hash,
            requested_at=approval.requested_at.isoformat(),
            reviewed_at=approval.reviewed_at.isoformat() if approval.reviewed_at else None,
            reviewed_by=approval.reviewed_by,
            review_notes=approval.review_notes
        ))
    
    return ResponseEnvelope(
        success=True,
        data=ApprovalListResponse(
            approvals=approval_list,
            total=total,
            page=page,
            per_page=per_page
        )
    )


@router.get(
    "/stats",
    response_model=ResponseEnvelope[ApprovalStatsResponse],
    operation_id="getEmailApprovalStats",
    summary="Get email approval statistics",
    description="Get overall email approval statistics for tenant"
)
async def get_email_approval_stats(
    access: UnifiedAccess = Depends(require_access("admin.emails.approve")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[ApprovalStatsResponse]:
    """
    Get email approval statistics.
    
    Returns:
    - Pending/approved/rejected counts
    - Counts by risk level
    """
    user = access.user
    tenant_id = access.tenant_id
    
    service = get_email_approval_service(db)
    stats = service.get_approval_stats(tenant_id)
    
    return ResponseEnvelope(
        success=True,
        data=ApprovalStatsResponse(
            pending=stats['pending'],
            approved=stats['approved'],
            rejected=stats['rejected'],
            by_risk_level=stats['by_risk_level']
        )
    )


@router.post(
    "/{approval_id}/approve",
    response_model=ResponseEnvelope[dict],
    operation_id="approveEmail",
    summary="Approve email for sending",
    description="Approve HIGH/CRITICAL risk email for sending"
)
async def approve_email(
    approval_id: str,
    request: ApprovalActionRequest = Body(...),
    access: UnifiedAccess = Depends(require_access("admin.emails.approve")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[dict]:
    """
    Approve email for sending.
    
    This allows the email to be sent despite HIGH/CRITICAL risk classification.
    Use with caution - ensure email content is appropriate.
    """
    user = access.user
    tenant_id = access.tenant_id
    
    service = get_email_approval_service(db)
    success = service.approve_email(
        approval_id=approval_id,
        tenant_id=tenant_id,
        reviewed_by=user.id,
        review_notes=request.review_notes
    )
    
    if success:
        return ResponseEnvelope(
            success=True,
            data={
                "approval_id": approval_id,
                "message": "Email approved successfully"
            }
        )
    else:
        return ResponseEnvelope(
            success=False,
            error={
                "code": "APPROVAL_FAILED",
                "message": "Failed to approve email. Request may not exist or already processed."
            }
        )


@router.post(
    "/{approval_id}/reject",
    response_model=ResponseEnvelope[dict],
    operation_id="rejectEmail",
    summary="Reject email",
    description="Reject HIGH/CRITICAL risk email (will not be sent)"
)
async def reject_email(
    approval_id: str,
    request: ApprovalActionRequest = Body(...),
    access: UnifiedAccess = Depends(require_access("admin.emails.approve")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[dict]:
    """
    Reject email.
    
    This prevents the email from being sent.
    """
    user = access.user
    tenant_id = access.tenant_id
    
    service = get_email_approval_service(db)
    success = service.reject_email(
        approval_id=approval_id,
        tenant_id=tenant_id,
        reviewed_by=user.id,
        review_notes=request.review_notes
    )
    
    if success:
        return ResponseEnvelope(
            success=True,
            data={
                "approval_id": approval_id,
                "message": "Email rejected successfully"
            }
        )
    else:
        return ResponseEnvelope(
            success=False,
            error={
                "code": "REJECTION_FAILED",
                "message": "Failed to reject email. Request may not exist or already processed."
            }
        )
