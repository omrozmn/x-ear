"""
FastAPI Campaigns Router
Campaign CRUD and SMS sending
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy import or_, desc
from sqlalchemy.orm import Session
import logging

from schemas.base import ResponseEnvelope, ApiError
from schemas.campaigns import CampaignCreate, CampaignUpdate, CampaignRead, CampaignSendRequest
from models.campaign import Campaign as CampaignModel, SMSLog
from models.sms_integration import SMSProviderConfig, TenantSMSCredit
from services.sms_service import VatanSMSService
from models.patient import Patient

from middleware.unified_access import UnifiedAccess, require_access
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Campaigns"])


@router.get("/campaigns", operation_id="listCampaigns", response_model=ResponseEnvelope[List[CampaignRead]])
def get_campaigns(
    page: int = 1,
    per_page: int = 20,
    status_filter: Optional[str] = Query(None, alias="status"),
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """List campaigns for the current tenant"""
    try:
        query = db.query(CampaignModel)
        
        if access.tenant_id:
            query = query.filter(CampaignModel.tenant_id == access.tenant_id)
        
        if status_filter:
            query = query.filter(CampaignModel.status == status_filter)
        
        query = query.order_by(desc(CampaignModel.created_at))
        
        total = query.count()
        campaigns = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return ResponseEnvelope(
            data=[c.to_dict() for c in campaigns],
            meta={
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": (total + per_page - 1) // per_page
            }
        )
    except Exception as e:
        logger.error(f"Get campaigns error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns", operation_id="createCampaigns", response_model=ResponseEnvelope[CampaignRead], status_code=201)
def create_campaign(
    campaign_in: CampaignCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Create a new campaign"""
    try:
        if not access.tenant_id:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="Tenant context required", code="TENANT_REQUIRED").model_dump(mode="json"),
            )

        camp = CampaignModel(
            tenant_id=access.tenant_id,
            name=campaign_in.name,
            description=campaign_in.description,
            campaign_type=campaign_in.campaign_type,
            target_segment=campaign_in.target_segment,
            message_template=campaign_in.message_template,
            status='draft'
        )

        # Calculate recipients
        if camp.target_segment == 'all':
            camp.total_recipients = db.query(Patient).filter_by(tenant_id=access.tenant_id).count()
        else:
            camp.total_recipients = 0

        db.add(camp)
        db.commit()
        
        return ResponseEnvelope(data=camp.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Create campaign error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/{campaign_id}", operation_id="getCampaign", response_model=ResponseEnvelope[CampaignRead])
def get_campaign(
    campaign_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get a single campaign"""
    try:
        camp = db.get(CampaignModel, campaign_id)
        if not camp:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Campaign not found", code="CAMPAIGN_NOT_FOUND").model_dump(mode="json"),
            )
        
        if access.tenant_id and camp.tenant_id != access.tenant_id:
            raise HTTPException(
                status_code=403,
                detail=ApiError(message="Unauthorized", code="AUTH_FORBIDDEN").model_dump(mode="json"),
            )
        
        return ResponseEnvelope(data=camp.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get campaign error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/campaigns/{campaign_id}", operation_id="updateCampaign", response_model=ResponseEnvelope[CampaignRead])
def update_campaign(
    campaign_id: str,
    campaign_in: CampaignUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update a campaign"""
    try:
        camp = db.get(CampaignModel, campaign_id)
        if not camp:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Campaign not found", code="CAMPAIGN_NOT_FOUND").model_dump(mode="json"),
            )
        
        if access.tenant_id and camp.tenant_id != access.tenant_id:
            raise HTTPException(
                status_code=403,
                detail=ApiError(message="Unauthorized", code="AUTH_FORBIDDEN").model_dump(mode="json"),
            )

        if campaign_in.name is not None:
            camp.name = campaign_in.name
        if campaign_in.description is not None:
            camp.description = campaign_in.description
        if campaign_in.target_segment is not None:
            camp.target_segment = campaign_in.target_segment
        if campaign_in.message_template is not None:
            camp.message_template = campaign_in.message_template
        
        db.commit()
        return ResponseEnvelope(data=camp.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Update campaign error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/campaigns/{campaign_id}", operation_id="deleteCampaign")
def delete_campaign(
    campaign_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete a campaign"""
    try:
        camp = db.get(CampaignModel, campaign_id)
        if not camp:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Campaign not found", code="CAMPAIGN_NOT_FOUND").model_dump(mode="json"),
            )
        
        if access.tenant_id and camp.tenant_id != access.tenant_id:
            raise HTTPException(
                status_code=403,
                detail=ApiError(message="Unauthorized", code="AUTH_FORBIDDEN").model_dump(mode="json"),
            )
        
        db.delete(camp)
        db.commit()
        return ResponseEnvelope(message="Campaign deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Delete campaign error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns/{campaign_id}/send", operation_id="createCampaignSend")
def send_campaign(
    campaign_id: str,
    payload: CampaignSendRequest,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Send a campaign via SMS"""
    try:
        if not access.tenant_id:
             raise HTTPException(status_code=400, detail="Tenant context required")
             
        camp = db.get(CampaignModel, campaign_id)
        if not camp:
            raise HTTPException(status_code=404, detail="Campaign not found")
            
        if camp.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
            
        if camp.status in ['sending', 'sent']:
            raise HTTPException(status_code=400, detail="Campaign already sent")
            
        # Check SMS Config
        config = db.query(SMSProviderConfig).filter_by(tenant_id=access.tenant_id).first()
        if not config or not config.api_username or not config.api_password:
             raise HTTPException(status_code=400, detail="SMS configuration missing")
             
        # Check Credit (Pre-check)
        credit = db.query(TenantSMSCredit).filter_by(tenant_id=access.tenant_id).first()
        if not credit:
             raise HTTPException(status_code=400, detail="No SMS credit account found")
             
        # Resolve Recipients
        recipients = [] # List of {phone, name, id}
        
        if camp.target_segment == 'all':
            patients = db.query(Patient).filter_by(tenant_id=access.tenant_id).all()
            recipients = [{'phone': p.phone, 'name': f"{p.first_name} {p.last_name}", 'id': p.id} for p in patients if p.phone]
        elif camp.target_segment == 'filter':
            # TODO: Implement complex filtering
             patients = db.query(Patient).filter_by(tenant_id=access.tenant_id).all()
             recipients = [{'phone': p.phone, 'name': f"{p.first_name} {p.last_name}", 'id': p.id} for p in patients if p.phone]
        elif camp.target_segment == 'excel':
             criteria = camp.target_criteria_json or {}
             numbers = criteria.get('numbers', [])
             recipients = [{'phone': n, 'name': '', 'id': None} for n in numbers]
             
        if not recipients:
             raise HTTPException(status_code=400, detail="No valid recipients found")
             
        # Credit Check
        cost = len(recipients)
        if credit.balance < cost:
             raise HTTPException(status_code=400, detail="Insufficient SMS credit")
             
        # Initialize Service
        sender_id = payload.sender_id or 'VATANSMS'
        sms_service = VatanSMSService(config.api_username, config.api_password, sender_id)
        
        phones = [r['phone'] for r in recipients]
        message = camp.message_template
        
        # Deduct Credit & Update Status
        credit.balance -= cost
        credit.total_used += cost
        
        camp.status = 'sending'
        camp.sent_at = datetime.now(timezone.utc)
        db.commit()
        
        try:
             # Send SMS
             # Note: VatanSMS 1toN blocks if large list? Usually async or fast enough.
             # Ideally background task. Following Flask pattern (sync).
             response = sms_service.send_sms(phones, message)
             
             camp.status = 'sent'
             camp.successful_sends = len(recipients)
             camp.actual_cost = cost
             
             # Log SMS
             for r in recipients:
                 log = SMSLog(
                     campaign_id=camp.id,
                     patient_id=r['id'],
                     tenant_id=access.tenant_id,
                     phone_number=r['phone'],
                     message=message,
                     status='sent',
                     sent_at=datetime.now(timezone.utc),
                     cost=1.0
                 )
                 db.add(log)
                 
             db.commit()
             
             return ResponseEnvelope(message="Campaign sent successfully")
             
        except Exception as e:
             logger.error(f"SMS Service failed: {e}")
             camp.status = 'failed'
             # Refund credit? Or simplistic fail state?
             # Flask logic didn't refund explicitly in catch block shown, just set failed.
             # I'll stick to simple fail state update.
             db.commit() 
             raise HTTPException(status_code=500, detail=f"SMS Provider Error: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Send campaign error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- ADMIN ROUTES ---

@router.get("/admin/campaigns", operation_id="listAdminCampaigns", response_model=ResponseEnvelope[List[CampaignRead]])
def admin_get_campaigns(
    page: int = 1,
    limit: int = 10,
    search: str = "",
    status: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """List all campaigns (Admin)"""
    try:
        query = db.query(CampaignModel)
        
        if search:
            query = query.filter(
                or_(
                    CampaignModel.name.ilike(f'%{search}%'),
                    CampaignModel.description.ilike(f'%{search}%')
                )
            )
        
        if status:
            query = query.filter(CampaignModel.status == status)

        query = query.order_by(desc(CampaignModel.created_at))
        
        total = query.count()
        campaigns = query.offset((page - 1) * limit).limit(limit).all()
        
        return ResponseEnvelope(
            data=[c.to_dict() for c in campaigns],
            meta={
                "total": total,
                "page": page,
                "perPage": limit,
                "totalPages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        logger.error(f"Admin get campaigns error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
