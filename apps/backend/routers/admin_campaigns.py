"""Admin Campaigns Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from datetime import datetime
import logging

from database import get_db
from models.campaign import Campaign
from models.user import User
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.campaigns import CampaignCreate, CampaignUpdate, CampaignRead
from schemas.base import ResponseEnvelope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/campaigns", tags=["Admin-Campaigns"])

# Response models for this router
class CampaignListResponse(ResponseEnvelope):
    data: Optional[dict] = None

class CampaignDetailResponse(ResponseEnvelope):
    data: Optional[dict] = None

@router.get("", response_model=CampaignListResponse)
async def get_campaigns(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("campaigns.read", admin_only=True))
):
    """Get list of campaigns"""
    try:
        query = db.query(Campaign)
        
        if search:
            query = query.filter(
                or_(
                    Campaign.name.ilike(f"%{search}%"),
                    Campaign.description.ilike(f"%{search}%")
                )
            )
        
        if status:
            if status == "active":
                query = query.filter(Campaign.is_active == True)
            elif status == "inactive":
                query = query.filter(Campaign.is_active == False)
        
        total = query.count()
        campaigns = query.order_by(Campaign.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        return {
            "success": True,
            "data": {
                "campaigns": [c.to_dict() for c in campaigns],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "totalPages": (total + limit - 1) // limit
                }
            }
        }
    except Exception as e:
        logger.error(f"Get campaigns error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=CampaignDetailResponse)
async def create_campaign(
    data: CampaignCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("campaigns.manage", admin_only=True))
):
    """Create a new campaign"""
    try:
        if not data.name:
            raise HTTPException(status_code=400, detail="Campaign name is required")
        
        user = db.get(User, access.user.get("id"))
        access.tenant_id = user.tenant_id if user else None
        
        scheduled_at = None
        if data.scheduled_at:
            scheduled_at = datetime.fromisoformat(data.scheduled_at.replace("Z", "+00:00"))
        
        new_campaign = Campaign(
            tenant_id=access.tenant_id,
            name=data.name,
            description=data.description,
            campaign_type=data.campaign_type,
            message_template=data.message_template,
            subject=data.subject,
            scheduled_at=scheduled_at,
            status=data.status,
            target_segment=data.target_segment
        )
        
        db.add(new_campaign)
        db.commit()
        db.refresh(new_campaign)
        
        return {"success": True, "data": {"campaign": new_campaign.to_dict()}}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Create campaign error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{campaign_id}", response_model=CampaignDetailResponse)
async def get_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("campaigns.read", admin_only=True))
):
    """Get single campaign"""
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        return {"success": True, "data": {"campaign": campaign.to_dict()}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get campaign error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{campaign_id}", response_model=CampaignDetailResponse)
async def update_campaign(
    campaign_id: str,
    data: CampaignUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("campaigns.manage", admin_only=True))
):
    """Update a campaign"""
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        if data.name is not None:
            campaign.name = data.name
        if data.description is not None:
            campaign.description = data.description
        if data.campaign_type is not None:
            campaign.campaign_type = data.campaign_type
        if data.message_template is not None:
            campaign.message_template = data.message_template
        if data.subject is not None:
            campaign.subject = data.subject
        if data.scheduled_at is not None:
            campaign.scheduled_at = datetime.fromisoformat(data.scheduled_at.replace("Z", "+00:00")) if data.scheduled_at else None
        if data.status is not None:
            campaign.status = data.status
        if data.target_segment is not None:
            campaign.target_segment = data.target_segment
        
        campaign.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(campaign)
        
        return {"success": True, "data": {"campaign": campaign.to_dict()}}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Update campaign error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{campaign_id}", response_model=ResponseEnvelope)
async def delete_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("campaigns.manage", admin_only=True))
):
    """Delete a campaign"""
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        db.delete(campaign)
        db.commit()
        
        return {"success": True, "message": "Campaign deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Delete campaign error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
