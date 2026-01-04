from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy import or_
from sqlalchemy.orm import Session

from schemas.campaigns import (
    CampaignRead, CampaignCreate, CampaignUpdate, CampaignSendRequest,
    SMSLogRead
)
from schemas.base import ResponseEnvelope, ResponseMeta, ApiError
from models.campaign import Campaign, SMSLog
from models.patient import Patient
from models.sms_integration import SMSProviderConfig, TenantSMSCredit
from models.base import db
from services.sms_service import VatanSMSService
from dependencies import get_db, get_current_context, AccessContext

import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Campaigns"])

# --- TENANT ROUTES ---

@router.get("/campaigns", response_model=ResponseEnvelope[List[CampaignRead]])
def get_campaigns(
    page: int = 1,
    per_page: int = 20,
    status_filter: Optional[str] = Query(None, alias="status"),
    ctx: AccessContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """List campaigns for the current tenant"""
    if not ctx.tenant_id:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="Tenant context required", code="TENANT_REQUIRED").model_dump(mode="json"),
        )

    query = Campaign.query.filter_by(tenant_id=ctx.tenant_id)
    
    if status_filter:
        query = query.filter_by(status=status_filter)
        
    pagination = query.order_by(Campaign.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    return ResponseEnvelope(
        data=pagination.items,
        meta={
            "total": pagination.total,
            "page": pagination.page,
            "perPage": pagination.per_page,
            "totalPages": pagination.pages
        }
    )

@router.post("/campaigns", response_model=ResponseEnvelope[CampaignRead], status_code=201)
def create_campaign(
    campaign_in: CampaignCreate,
    ctx: AccessContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Create a new campaign"""
    if not ctx.tenant_id:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="Tenant context required", code="TENANT_REQUIRED").model_dump(mode="json"),
        )

    # Business Logic mirroring routes/campaigns.py
    camp = Campaign(
        tenant_id=ctx.tenant_id,
        name=campaign_in.name,
        description=campaign_in.description,
        campaign_type=campaign_in.campaign_type.value, # Enum to str
        target_segment=campaign_in.target_segment,
        target_criteria_json=campaign_in.target_criteria,
        message_template=campaign_in.message_template,
        status='draft'
    )

    # Calculate recipients
    if camp.target_segment == 'all':
        camp.total_recipients = Patient.query.filter_by(tenant_id=ctx.tenant_id).count()
    elif camp.target_segment == 'filter':
        # Placeholder for complex filtering
        camp.total_recipients = Patient.query.filter_by(tenant_id=ctx.tenant_id).count()
    elif camp.target_segment == 'excel':
        criteria = camp.target_criteria_json or {}
        camp.total_recipients = criteria.get('count', 0)

    db.session.add(camp)
    db.session.commit()
    
    return ResponseEnvelope(data=camp)

@router.post("/campaigns/{campaign_id}/send")
def send_campaign(
    campaign_id: str,
    send_req: CampaignSendRequest,
    ctx: AccessContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Send a campaign (SMS)"""
    if not ctx.tenant_id:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="Tenant context required", code="TENANT_REQUIRED").model_dump(mode="json"),
        )
        
    camp = db.session.get(Campaign, campaign_id)
    if not camp:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Campaign not found", code="CAMPAIGN_NOT_FOUND").model_dump(mode="json"),
        )
        
    if camp.tenant_id != ctx.tenant_id:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Unauthorized", code="AUTH_FORBIDDEN").model_dump(mode="json"),
        )
        
    if camp.status in ['sending', 'sent']:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="Campaign already sent", code="CAMPAIGN_ALREADY_SENT").model_dump(mode="json"),
        )
        
    # Check SMS Config
    config = SMSProviderConfig.query.filter_by(tenant_id=ctx.tenant_id).first()
    if not config or not config.api_username or not config.api_password:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="SMS configuration missing", code="SMS_CONFIG_MISSING").model_dump(mode="json"),
        )
        
    # Check Credit
    credit = TenantSMSCredit.query.filter_by(tenant_id=ctx.tenant_id).first()
    if not credit or credit.balance < camp.total_recipients:
         raise HTTPException(
             status_code=400,
             detail=ApiError(message="Insufficient SMS credit", code="SMS_INSUFFICIENT_CREDIT").model_dump(mode="json"),
         )

    # Get Recipients logic (simplified for migration)
    recipients = [] 
    if camp.target_segment == 'all':
        patients = Patient.query.filter_by(tenant_id=ctx.tenant_id).all()
        recipients = [{'phone': p.phone, 'name': f"{p.first_name} {p.last_name}", 'id': p.id} for p in patients if p.phone]
    elif camp.target_segment == 'filter':
        patients = Patient.query.filter_by(tenant_id=ctx.tenant_id).all() # Todo filters
        recipients = [{'phone': p.phone, 'name': f"{p.first_name} {p.last_name}", 'id': p.id} for p in patients if p.phone]
    elif camp.target_segment == 'excel':
        criteria = camp.target_criteria_json or {}
        numbers = criteria.get('numbers', [])
        recipients = [{'phone': n, 'name': '', 'id': None} for n in numbers]

    if not recipients:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="No recipients found", code="CAMPAIGN_NO_RECIPIENTS").model_dump(mode="json"),
        )

    sender_id = send_req.sender_id or 'VATANSMS'
    sms_service = VatanSMSService(config.api_username, config.api_password, sender_id)
    
    phones = [r['phone'] for r in recipients]
    message = camp.message_template
    
    try:
        # Deduct credit
        cost = len(recipients)
        credit.balance -= cost
        credit.total_used += cost
        
        camp.status = 'sending'
        camp.sent_at = datetime.now(timezone.utc)
        db.session.commit()
        
        # Send
        # Note: VatanSMSService might be sync or async. Existing Flask code assumes sync.
        response = sms_service.send_sms(phones, message)
        
        camp.status = 'sent'
        camp.successful_sends = len(recipients)
        camp.actual_cost = cost
        
        # Log SMS
        for r in recipients:
            log = SMSLog(
                campaign_id=camp.id,
                patient_id=r['id'],
                tenant_id=ctx.tenant_id,
                phone_number=r['phone'],
                message=message,
                status='sent',
                sent_at=datetime.now(timezone.utc),
                cost=1.0
            )
            db.session.add(log)
            
        db.session.commit()
        return ResponseEnvelope(message="Campaign sent successfully")
        
    except Exception as e:
        logger.error(f"Campaign send failed: {e}")
        camp.status = 'failed'
        db.session.commit()
        raise HTTPException(status_code=500, detail=str(e))

# --- ADMIN ROUTES ---

@router.get("/admin/campaigns", response_model=ResponseEnvelope[List[CampaignRead]])
def admin_get_campaigns(
    page: int = 1,
    limit: int = 10,
    search: str = "",
    status: Optional[str] = None,
    ctx: AccessContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """List all campaigns (Admin)"""
    # Assuming standard admin check is done inside get_current_context or added via Depends
    # For now relying on ctx.is_admin
    if not ctx.is_admin:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Admin access required", code="AUTH_ADMIN_REQUIRED").model_dump(mode="json"),
        )

    query = Campaign.query # Unbound query for admin
    
    if search:
        query = query.filter(
            or_(
                Campaign.name.ilike(f'%{search}%'),
                Campaign.description.ilike(f'%{search}%')
            )
        )
    
    if status:
         # Map active/inactive to boolean if needed, or status string
         if status == 'active':
             query = query.filter(Campaign.is_active == True)
         elif status == 'inactive':
             query = query.filter(Campaign.is_active == False)
         else:
             query = query.filter(Campaign.status == status)

    pagination = query.order_by(Campaign.created_at.desc()).paginate(page=page, per_page=limit, error_out=False)
    
    return ResponseEnvelope(
        data=pagination.items,
        meta={
             "total": pagination.total,
             "page": pagination.page,
             "perPage": pagination.per_page,
             "totalPages": pagination.pages
        }
    )

@router.delete("/admin/campaigns/{campaign_id}")
def admin_delete_campaign(
    campaign_id: str,
    ctx: AccessContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Delete a campaign (Admin)"""
    if not ctx.is_admin:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Admin access required", code="AUTH_ADMIN_REQUIRED").model_dump(mode="json"),
        )
        
    camp = db.session.get(Campaign, campaign_id)
    if not camp:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Campaign not found", code="CAMPAIGN_NOT_FOUND").model_dump(mode="json"),
        )
        
    db.session.delete(camp)
    db.session.commit()
    return ResponseEnvelope(message="Campaign deleted successfully")
