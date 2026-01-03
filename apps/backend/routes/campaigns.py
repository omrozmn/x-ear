from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from models import db, Campaign, SMSLog, Patient, SMSProviderConfig, TenantSMSCredit, User
from services.sms_service import VatanSMSService
from datetime import datetime, timezone
from config.tenant_permissions import TenantPermissions
from utils.tenant_security import UnboundSession
import logging
import json

logger = logging.getLogger(__name__)
campaigns_bp = Blueprint('campaigns', __name__)

@campaigns_bp.route('/campaigns', methods=['GET'])
@unified_access(permission=TenantPermissions.CAMPAIGN_READ)
def get_campaigns(ctx):
    user_id = ctx.principal_id
    tenant_id = ctx.tenant_id
    
    if not tenant_id:
        return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    with UnboundSession():
        query = Campaign.query.filter_by(tenant_id=tenant_id)
        
        # Filters
        status = request.args.get('status')
        if status:
            query = query.filter_by(status=status)
            
        pagination = query.order_by(Campaign.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        items = [c.to_dict() for c in pagination.items]
        total = pagination.total
        pages = pagination.pages
    
    return success_response({
        'data': items,
        'meta': {
            'total': total,
            'page': page,
            'perPage': per_page,
            'totalPages': pages
        }
    })

@campaigns_bp.route('/campaigns', methods=['POST'])
@unified_access(permission=TenantPermissions.CAMPAIGN_WRITE)
def create_campaign(ctx):
    user_id = ctx.principal_id
    tenant_id = ctx.tenant_id
    
    if not tenant_id:
        return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)
        
    data = request.get_json() or {}
    required = ['name', 'messageTemplate']
    if not all(k in data for k in required):
        return error_response('Missing required fields', code='MISSING_FIELDS', status_code=400)
        
    camp = Campaign(
        tenant_id=tenant_id,
        name=data['name'],
        description=data.get('description'),
        campaign_type='sms',
        target_segment=data.get('targetSegment'), # 'all', 'filter', 'excel'
        target_criteria_json=data.get('targetCriteria'),
        message_template=data['messageTemplate'],
        status='draft'
    )
    
    # Calculate estimated recipients if possible
    if camp.target_segment == 'all':
        camp.total_recipients = Patient.query.filter_by(tenant_id=tenant_id).count()
    elif camp.target_segment == 'filter':
        query = Patient.query.filter_by(tenant_id=tenant_id)
        # TODO: Apply filters from target_criteria
        camp.total_recipients = query.count()
    elif camp.target_segment == 'excel':
        criteria = camp.target_criteria_json or {}
        camp.total_recipients = criteria.get('count', 0)
        
    db.session.add(camp)
    db.session.commit()
    
    return success_response(data=camp.to_dict(), status_code=201)

@campaigns_bp.route('/campaigns/<campaign_id>/send', methods=['POST'])
@unified_access(permission=TenantPermissions.CAMPAIGN_WRITE)
def send_campaign(ctx, campaign_id):
    user_id = ctx.principal_id
    tenant_id = ctx.tenant_id
    
    if not tenant_id:
        return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)
        
    camp = db.session.get(Campaign, campaign_id)
    if not camp:
        return error_response('Campaign not found', code='NOT_FOUND', status_code=404)
        
    if camp.tenant_id != tenant_id:
        return error_response('Unauthorized', code='FORBIDDEN', status_code=403)
        
    if camp.status in ['sending', 'sent']:
        return error_response('Campaign already sent', code='ALREADY_SENT', status_code=400)
        
    # Check SMS Config
    config = SMSProviderConfig.query.filter_by(tenant_id=tenant_id).first()
    if not config or not config.api_username or not config.api_password:
        return error_response('SMS configuration missing', code='CONFIG_MISSING', status_code=400)
        
    # Check Credit
    credit = TenantSMSCredit.query.filter_by(tenant_id=tenant_id).first()
    if not credit or credit.balance < camp.total_recipients:
        return error_response('Insufficient SMS credit', code='INSUFFICIENT_CREDIT', status_code=400)
        
    # Get Recipients
    recipients = [] # List of {phone, name, id}
    
    if camp.target_segment == 'all':
        patients = Patient.query.filter_by(tenant_id=tenant_id).all()
        recipients = [{'phone': p.phone, 'name': f"{p.first_name} {p.last_name}", 'id': p.id} for p in patients if p.phone]
    elif camp.target_segment == 'filter':
        query = Patient.query.filter_by(tenant_id=tenant_id)
        # TODO: Apply filters
        patients = query.all()
        recipients = [{'phone': p.phone, 'name': f"{p.first_name} {p.last_name}", 'id': p.id} for p in patients if p.phone]
    elif camp.target_segment == 'excel':
        criteria = camp.target_criteria_json or {}
        numbers = criteria.get('numbers', [])
        recipients = [{'phone': n, 'name': '', 'id': None} for n in numbers]

    if not recipients:
        return error_response('No recipients found', code='NO_RECIPIENTS', status_code=400)

    # Initialize Service
    sender_id = request.get_json().get('senderId') or 'VATANSMS'
    sms_service = VatanSMSService(config.api_username, config.api_password, sender_id)
    
    phones = [r['phone'] for r in recipients]
    message = camp.message_template
    
    try:
        # Deduct credit first (optimistic)
        cost = len(recipients)
        credit.balance -= cost
        credit.total_used += cost
        
        camp.status = 'sending'
        camp.sent_at = datetime.now(timezone.utc)
        db.session.commit()
        
        # Send
        response = sms_service.send_sms(phones, message)
        
        # Update Campaign
        camp.status = 'sent'
        camp.successful_sends = len(recipients)
        camp.actual_cost = cost
        
        # Log SMS
        for r in recipients:
            log = SMSLog(
                campaign_id=camp.id,
                patient_id=r['id'],
                tenant_id=tenant_id,
                phone_number=r['phone'],
                message=message,
                status='sent',
                sent_at=datetime.now(timezone.utc),
                cost=1.0
            )
            db.session.add(log)
            
        db.session.commit()
        
        return success_response(message='Campaign sent successfully')
        
    except Exception as e:
        logger.error(f"Campaign send failed: {e}")
        camp.status = 'failed'
        db.session.commit()
        return error_response(str(e), code='SEND_FAILED', status_code=500)
