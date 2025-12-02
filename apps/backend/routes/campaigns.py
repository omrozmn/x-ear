from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Campaign, SMSLog, Patient, SMSProviderConfig, TenantSMSCredit, User
from services.sms_service import VatanSMSService
from datetime import datetime, timezone
import logging
import json

logger = logging.getLogger(__name__)
campaigns_bp = Blueprint('campaigns', __name__)

@campaigns_bp.route('/campaigns', methods=['GET'])
@jwt_required()
def get_campaigns():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'Tenant context required'}), 400

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    query = Campaign.query.filter_by(tenant_id=user.tenant_id)
    
    # Filters
    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)
        
    pagination = query.order_by(Campaign.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'success': True,
        'data': [c.to_dict() for c in pagination.items],
        'meta': {
            'total': pagination.total,
            'page': page,
            'perPage': per_page,
            'totalPages': pagination.pages
        }
    })

@campaigns_bp.route('/campaigns', methods=['POST'])
@jwt_required()
def create_campaign():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'Tenant context required'}), 400
        
    data = request.get_json() or {}
    required = ['name', 'messageTemplate']
    if not all(k in data for k in required):
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
    camp = Campaign(
        tenant_id=user.tenant_id,
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
        camp.total_recipients = Patient.query.filter_by(tenant_id=user.tenant_id).count()
    elif camp.target_segment == 'filter':
        # Apply filters to count (simplified)
        query = Patient.query.filter_by(tenant_id=user.tenant_id)
        # TODO: Apply filters from target_criteria
        camp.total_recipients = query.count()
    elif camp.target_segment == 'excel':
        # If excel, criteria should have count or file info
        criteria = camp.target_criteria_json or {}
        camp.total_recipients = criteria.get('count', 0)
        
    db.session.add(camp)
    db.session.commit()
    
    return jsonify({'success': True, 'data': camp.to_dict()}), 201

@campaigns_bp.route('/campaigns/<campaign_id>/send', methods=['POST'])
@jwt_required()
def send_campaign(campaign_id):
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'Tenant context required'}), 400
        
    camp = db.session.get(Campaign, campaign_id)
    if not camp:
        return jsonify({'success': False, 'error': 'Campaign not found'}), 404
        
    if camp.tenant_id != user.tenant_id:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
    if camp.status in ['sending', 'sent']:
        return jsonify({'success': False, 'error': 'Campaign already sent'}), 400
        
    # Check SMS Config
    config = SMSProviderConfig.query.filter_by(tenant_id=user.tenant_id).first()
    if not config or not config.api_username or not config.api_password:
        return jsonify({'success': False, 'error': 'SMS configuration missing'}), 400
        
    # Check Credit
    credit = TenantSMSCredit.query.filter_by(tenant_id=user.tenant_id).first()
    if not credit or credit.balance < camp.total_recipients:
        return jsonify({'success': False, 'error': 'Insufficient SMS credit'}), 400
        
    # Get Recipients
    recipients = [] # List of {phone, name, id}
    
    if camp.target_segment == 'all':
        patients = Patient.query.filter_by(tenant_id=user.tenant_id).all()
        recipients = [{'phone': p.phone, 'name': f"{p.first_name} {p.last_name}", 'id': p.id} for p in patients if p.phone]
    elif camp.target_segment == 'filter':
        # Apply filters
        query = Patient.query.filter_by(tenant_id=user.tenant_id)
        # TODO: Apply filters
        patients = query.all()
        recipients = [{'phone': p.phone, 'name': f"{p.first_name} {p.last_name}", 'id': p.id} for p in patients if p.phone]
    elif camp.target_segment == 'excel':
        # Load from excel file (path in criteria)
        # For now, assume criteria has list of numbers (simplified)
        criteria = camp.target_criteria_json or {}
        numbers = criteria.get('numbers', [])
        recipients = [{'phone': n, 'name': '', 'id': None} for n in numbers]

    if not recipients:
        return jsonify({'success': False, 'error': 'No recipients found'}), 400

    # Initialize Service
    # Sender ID should be in campaign data or default
    sender_id = request.get_json().get('senderId') or 'VATANSMS' # Default fallback
    sms_service = VatanSMSService(config.api_username, config.api_password, sender_id)
    
    # Send (Batching needed for large lists, but simplified here)
    phones = [r['phone'] for r in recipients]
    message = camp.message_template # TODO: Handle dynamic fields per recipient if needed
    
    try:
        # If dynamic fields are used, we must send 1-by-1 or use provider's dynamic feature
        # For MVP, assume static message or 1-by-1 if small
        # VatanSMS supports 1toN for same message
        
        # Deduct credit first (optimistic)
        cost = len(recipients) # 1 credit per SMS (simplified)
        credit.balance -= cost
        credit.total_used += cost
        
        camp.status = 'sending'
        camp.sent_at = datetime.now(timezone.utc)
        db.session.commit()
        
        # Send
        response = sms_service.send_sms(phones, message)
        
        # Update Campaign
        camp.status = 'sent'
        camp.successful_sends = len(recipients) # Assume all success if API returns OK (naive)
        camp.actual_cost = cost
        
        # Log SMS
        for r in recipients:
            log = SMSLog(
                campaign_id=camp.id,
                patient_id=r['id'],
                tenant_id=user.tenant_id,
                phone_number=r['phone'],
                message=message,
                status='sent',
                sent_at=datetime.now(timezone.utc),
                cost=1.0
            )
            db.session.add(log)
            
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Campaign sent successfully'})
        
    except Exception as e:
        logger.error(f"Campaign send failed: {e}")
        # Refund credit?
        # credit.balance += cost
        camp.status = 'failed'
        db.session.commit()
        return jsonify({'success': False, 'error': str(e)}), 500
