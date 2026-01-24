"""Bounce Management Router for Admin Panel.

Provides API endpoints for managing email bounces and blacklists.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from core.database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas import ResponseEnvelope
from core.models.email_deliverability import EmailBounce
from services.bounce_handler_service import get_bounce_handler_service
from pydantic import BaseModel, Field
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/bounces", tags=["admin"])


class BounceResponse(BaseModel):
    """Response for bounce record."""
    
    id: str = Field(..., description="Bounce ID")
    recipient: str = Field(..., description="Email address")
    bounce_type: str = Field(..., description="Bounce type (hard/soft/block)")
    bounce_reason: str = Field(..., description="Bounce reason")
    smtp_code: int = Field(..., description="SMTP error code")
    bounce_count: int = Field(..., description="Number of bounces")
    is_blacklisted: bool = Field(..., description="Whether recipient is blacklisted")
    first_bounce_at: str = Field(..., description="First bounce timestamp")
    last_bounce_at: str = Field(..., description="Last bounce timestamp")


class BounceListResponse(BaseModel):
    """Response for bounce list."""
    
    bounces: List[BounceResponse] = Field(..., description="List of bounces")
    total: int = Field(..., description="Total count")
    page: int = Field(..., description="Current page")
    per_page: int = Field(..., description="Items per page")


class BounceStatsResponse(BaseModel):
    """Response for bounce statistics."""
    
    total_bounces: int = Field(..., description="Total bounce count")
    hard_bounces: int = Field(..., description="Hard bounce count")
    soft_bounces: int = Field(..., description="Soft bounce count")
    blacklisted_count: int = Field(..., description="Blacklisted recipient count")
    bounce_rate: float = Field(..., description="Overall bounce rate percentage")


@router.get(
    "",
    response_model=ResponseEnvelope[BounceListResponse],
    operation_id="listBounces",
    summary="List email bounces",
    description="Get paginated list of email bounces with filters"
)
async def list_bounces(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    bounce_type: Optional[str] = Query(None, description="Filter by bounce type"),
    is_blacklisted: Optional[bool] = Query(None, description="Filter by blacklist status"),
    search: Optional[str] = Query(None, description="Search by recipient email"),
    access: UnifiedAccess = Depends(require_access("admin.bounces.view")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[BounceListResponse]:
    """
    List email bounces with pagination and filters.
    
    Filters:
    - bounce_type: hard, soft, block
    - is_blacklisted: true/false
    - search: partial email match
    """
    user = access.user
    tenant_id = access.tenant_id
    
    # Build query
    query = db.query(EmailBounce).filter(EmailBounce.tenant_id == tenant_id)
    
    # Apply filters
    if bounce_type:
        query = query.filter(EmailBounce.bounce_type == bounce_type)
    
    if is_blacklisted is not None:
        query = query.filter(EmailBounce.is_blacklisted == is_blacklisted)
    
    if search:
        query = query.filter(EmailBounce.recipient.ilike(f"%{search}%"))
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    bounces = query.order_by(desc(EmailBounce.last_bounce_at)).offset(offset).limit(per_page).all()
    
    # Format response
    bounce_list = []
    for bounce in bounces:
        bounce_list.append(BounceResponse(
            id=bounce.id,
            recipient=bounce.recipient,
            bounce_type=bounce.bounce_type,
            bounce_reason=bounce.bounce_reason or "",
            smtp_code=bounce.smtp_code,
            bounce_count=bounce.bounce_count,
            is_blacklisted=bounce.is_blacklisted,
            first_bounce_at=bounce.first_bounce_at.isoformat(),
            last_bounce_at=bounce.last_bounce_at.isoformat()
        ))
    
    return ResponseEnvelope(
        success=True,
        data=BounceListResponse(
            bounces=bounce_list,
            total=total,
            page=page,
            per_page=per_page
        )
    )


@router.get(
    "/stats",
    response_model=ResponseEnvelope[BounceStatsResponse],
    operation_id="getBounceStats",
    summary="Get bounce statistics",
    description="Get overall bounce statistics for tenant"
)
async def get_bounce_stats(
    access: UnifiedAccess = Depends(require_access("admin.bounces.view")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[BounceStatsResponse]:
    """
    Get bounce statistics.
    
    Returns:
    - Total bounces
    - Hard/soft bounce counts
    - Blacklisted count
    - Bounce rate
    """
    user = access.user
    tenant_id = access.tenant_id
    
    service = get_bounce_handler_service(db)
    bounce_rate = service.get_bounce_rate(tenant_id)
    
    # Count bounces by type
    total_bounces = db.query(EmailBounce).filter(EmailBounce.tenant_id == tenant_id).count()
    hard_bounces = db.query(EmailBounce).filter(
        and_(
            EmailBounce.tenant_id == tenant_id,
            EmailBounce.bounce_type == "hard"
        )
    ).count()
    soft_bounces = db.query(EmailBounce).filter(
        and_(
            EmailBounce.tenant_id == tenant_id,
            EmailBounce.bounce_type == "soft"
        )
    ).count()
    blacklisted_count = db.query(EmailBounce).filter(
        and_(
            EmailBounce.tenant_id == tenant_id,
            EmailBounce.is_blacklisted == True
        )
    ).count()
    
    return ResponseEnvelope(
        success=True,
        data=BounceStatsResponse(
            total_bounces=total_bounces,
            hard_bounces=hard_bounces,
            soft_bounces=soft_bounces,
            blacklisted_count=blacklisted_count,
            bounce_rate=bounce_rate
        )
    )


@router.post(
    "/{bounce_id}/unblacklist",
    response_model=ResponseEnvelope[dict],
    operation_id="unblacklistRecipient",
    summary="Remove recipient from blacklist",
    description="Manually unblacklist a recipient"
)
async def unblacklist_recipient(
    bounce_id: str,
    access: UnifiedAccess = Depends(require_access("admin.bounces.manage")),
    db: Session = Depends(get_db)
) -> ResponseEnvelope[dict]:
    """
    Remove recipient from blacklist.
    
    This allows sending emails to the recipient again.
    Use with caution - only unblacklist if you're sure the email is valid.
    """
    user = access.user
    tenant_id = access.tenant_id
    
    # Get bounce record
    bounce = db.query(EmailBounce).filter(
        and_(
            EmailBounce.id == bounce_id,
            EmailBounce.tenant_id == tenant_id
        )
    ).first()
    
    if not bounce:
        return ResponseEnvelope(
            success=False,
            error={
                "code": "BOUNCE_NOT_FOUND",
                "message": "Bounce record not found"
            }
        )
    
    service = get_bounce_handler_service(db)
    success = service.unblacklist_recipient(bounce.recipient, tenant_id)
    
    if success:
        return ResponseEnvelope(
            success=True,
            data={
                "recipient": bounce.recipient,
                "message": "Recipient unblacklisted successfully"
            }
        )
    else:
        return ResponseEnvelope(
            success=False,
            error={
                "code": "UNBLACKLIST_FAILED",
                "message": "Failed to unblacklist recipient"
            }
        )
