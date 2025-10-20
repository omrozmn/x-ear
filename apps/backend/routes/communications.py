"""
Communication API Routes
Handles SMS, Email, Templates, and Communication History endpoints
"""
from flask import Blueprint, request, jsonify, make_response
from sqlalchemy import or_, func, desc, and_
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.base import db
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction

# Import models
from models.communication import EmailLog, CommunicationTemplate, CommunicationHistory
from models.campaign import SMSLog
from models.patient import Patient

communications_bp = Blueprint('communications', __name__)

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

# ============================================================================
# MESSAGE ENDPOINTS (SMS & EMAIL)
# ============================================================================

@communications_bp.route('/communications/messages', methods=['GET'])
def list_messages():
    """List all communication messages (SMS and Email) with filtering"""
    try:
        # Query parameters
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        message_type = request.args.get('type')  # sms, email
        status = request.args.get('status')
        patient_id = request.args.get('patient_id')
        campaign_id = request.args.get('campaign_id')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        search = request.args.get('search')

        messages = []

        # Get SMS messages
        if not message_type or message_type == 'sms':
            sms_query = SMSLog.query
            
            if status:
                sms_query = sms_query.filter(SMSLog.status == status)
            if patient_id:
                sms_query = sms_query.filter(SMSLog.patient_id == patient_id)
            if campaign_id:
                sms_query = sms_query.filter(SMSLog.campaign_id == campaign_id)
            if date_from:
                sms_query = sms_query.filter(SMSLog.created_at >= datetime.fromisoformat(date_from))
            if date_to:
                sms_query = sms_query.filter(SMSLog.created_at <= datetime.fromisoformat(date_to))
            if search:
                sms_query = sms_query.filter(or_(
                    SMSLog.message.ilike(f'%{search}%'),
                    SMSLog.phone_number.ilike(f'%{search}%')
                ))

            sms_messages = sms_query.order_by(desc(SMSLog.created_at)).all()
            for sms in sms_messages:
                msg_dict = sms.to_dict()
                msg_dict['messageType'] = 'sms'
                messages.append(msg_dict)

        # Get Email messages
        if not message_type or message_type == 'email':
            email_query = EmailLog.query
            
            if status:
                email_query = email_query.filter(EmailLog.status == status)
            if patient_id:
                email_query = email_query.filter(EmailLog.patient_id == patient_id)
            if campaign_id:
                email_query = email_query.filter(EmailLog.campaign_id == campaign_id)
            if date_from:
                email_query = email_query.filter(EmailLog.created_at >= datetime.fromisoformat(date_from))
            if date_to:
                email_query = email_query.filter(EmailLog.created_at <= datetime.fromisoformat(date_to))
            if search:
                email_query = email_query.filter(or_(
                    EmailLog.subject.ilike(f'%{search}%'),
                    EmailLog.body_text.ilike(f'%{search}%'),
                    EmailLog.to_email.ilike(f'%{search}%')
                ))

            email_messages = email_query.order_by(desc(EmailLog.created_at)).all()
            for email in email_messages:
                msg_dict = email.to_dict()
                msg_dict['messageType'] = 'email'
                messages.append(msg_dict)

        # Sort by created_at and paginate
        messages.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        
        # Manual pagination
        start = (page - 1) * per_page
        end = start + per_page
        paginated_messages = messages[start:end]
        total = len(messages)

        return jsonify({
            "success": True,
            "data": paginated_messages,
            "meta": {
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": (total + per_page - 1) // per_page
            },
            "timestamp": now_utc().isoformat()
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": now_utc().isoformat()
        }), 500


@communications_bp.route('/communications/messages/send-sms', methods=['POST'])
@idempotent(methods=['POST'])
def send_sms():
    """Send SMS message"""
    try:
        data = request.get_json() or {}
        
        # Validate required fields
        required_fields = ['phoneNumber', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "success": False,
                    "error": f"Missing required field: {field}",
                    "timestamp": now_utc().isoformat()
                }), 400

        # Create SMS log entry
        sms_log = SMSLog()
        sms_log.patient_id = data.get('patientId')
        sms_log.campaign_id = data.get('campaignId')
        sms_log.phone_number = data['phoneNumber']
        sms_log.message = data['message']
        sms_log.status = 'pending'

        db.session.add(sms_log)
        db.session.commit()

        # TODO: Integrate with actual SMS provider
        # For now, mark as sent
        sms_log.status = 'sent'
        sms_log.sent_at = now_utc()
        db.session.commit()

        # Actually send SMS using communication service
        from services.communication_service import communication_service
        
        send_result = communication_service.send_sms(
            phone_number=sms_log.phone_number,
            message=sms_log.message,
            patient_id=sms_log.patient_id,
            campaign_id=sms_log.campaign_id
        )
        
        if send_result['success']:
            sms_log.status = 'sent'
            sms_log.sent_at = now_utc()
            sms_log.provider_response = send_result.get('provider_response', {})
        else:
            sms_log.status = 'failed'
            sms_log.error_message = send_result.get('error', 'Unknown error')
        
        db.session.commit()

        # Create communication history entry
        if sms_log.patient_id:
            comm_history = CommunicationHistory()
            comm_history.patient_id = sms_log.patient_id
            comm_history.sms_log_id = sms_log.id
            comm_history.communication_type = 'sms'
            comm_history.direction = 'outbound'
            comm_history.content = sms_log.message
            comm_history.contact_method = sms_log.phone_number
            comm_history.status = 'completed'
            
            db.session.add(comm_history)
            db.session.commit()

        return jsonify({
            "success": True,
            "data": sms_log.to_dict(),
            "timestamp": now_utc().isoformat()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": now_utc().isoformat()
        }), 500


@communications_bp.route('/communications/messages/send-email', methods=['POST'])
@idempotent(methods=['POST'])
def send_email():
    """Send Email message"""
    try:
        data = request.get_json() or {}
        
        # Validate required fields
        required_fields = ['toEmail', 'subject', 'bodyText']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "success": False,
                    "error": f"Missing required field: {field}",
                    "timestamp": now_utc().isoformat()
                }), 400

        # Create Email log entry
        email_log = EmailLog()
        email_log.patient_id = data.get('patientId')
        email_log.campaign_id = data.get('campaignId')
        email_log.template_id = data.get('templateId')
        email_log.to_email = data['toEmail']
        email_log.from_email = data.get('fromEmail', 'noreply@x-ear.com')
        email_log.cc_emails_json = data.get('ccEmails', [])
        email_log.bcc_emails_json = data.get('bccEmails', [])
        email_log.subject = data['subject']
        email_log.body_text = data['bodyText']
        email_log.body_html = data.get('bodyHtml')
        email_log.attachments_json = data.get('attachments', [])
        email_log.status = 'pending'

        db.session.add(email_log)
        db.session.commit()

        # TODO: Integrate with actual Email provider
        # For now, mark as sent
        email_log.status = 'sent'
        email_log.sent_at = now_utc()
        db.session.commit()

        # Actually send Email using communication service
        from services.communication_service import communication_service
        
        send_result = communication_service.send_email(
            to_email=email_log.to_email,
            subject=email_log.subject,
            body_text=email_log.body_text,
            body_html=email_log.body_html,
            cc_emails=email_log.cc_emails_json,
            bcc_emails=email_log.bcc_emails_json,
            attachments=email_log.attachments_json,
            patient_id=email_log.patient_id,
            campaign_id=email_log.campaign_id
        )
        
        if send_result['success']:
            email_log.status = 'sent'
            email_log.sent_at = now_utc()
            email_log.provider_response = send_result.get('provider_response', {})
        else:
            email_log.status = 'failed'
            email_log.error_message = send_result.get('error', 'Unknown error')
        
        db.session.commit()

        # Create communication history entry
        if email_log.patient_id:
            comm_history = CommunicationHistory()
            comm_history.patient_id = email_log.patient_id
            comm_history.email_log_id = email_log.id
            comm_history.communication_type = 'email'
            comm_history.direction = 'outbound'
            comm_history.subject = email_log.subject
            comm_history.content = email_log.body_text
            comm_history.contact_method = email_log.to_email
            comm_history.status = 'completed'
            
            db.session.add(comm_history)
            db.session.commit()

        return jsonify({
            "success": True,
            "data": email_log.to_dict(),
            "timestamp": now_utc().isoformat()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": now_utc().isoformat()
        }), 500


# ============================================================================
# TEMPLATE ENDPOINTS
# ============================================================================

@communications_bp.route('/communications/templates', methods=['GET'])
def list_templates():
    """List communication templates with filtering"""
    try:
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        template_type = request.args.get('type')  # sms, email
        category = request.args.get('category')
        is_active = request.args.get('is_active')
        search = request.args.get('search')

        query = CommunicationTemplate.query

        if template_type:
            query = query.filter(CommunicationTemplate.template_type == template_type)
        if category:
            query = query.filter(CommunicationTemplate.category == category)
        if is_active is not None:
            query = query.filter(CommunicationTemplate.is_active == (is_active.lower() == 'true'))
        if search:
            query = query.filter(or_(
                CommunicationTemplate.name.ilike(f'%{search}%'),
                CommunicationTemplate.description.ilike(f'%{search}%'),
                CommunicationTemplate.body_text.ilike(f'%{search}%')
            ))

        pagination = query.order_by(CommunicationTemplate.name).paginate(
            page=page, per_page=per_page, error_out=False
        )

        templates = [template.to_dict() for template in pagination.items]

        return jsonify({
            "success": True,
            "data": templates,
            "meta": {
                "total": pagination.total,
                "page": page,
                "perPage": per_page,
                "totalPages": pagination.pages
            },
            "timestamp": now_utc().isoformat()
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": now_utc().isoformat()
        }), 500


@communications_bp.route('/communications/templates', methods=['POST'])
@idempotent(methods=['POST'])
def create_template():
    """Create a new communication template"""
    try:
        data = request.get_json() or {}
        
        # Validate required fields
        required_fields = ['name', 'templateType', 'bodyText']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "success": False,
                    "error": f"Missing required field: {field}",
                    "timestamp": now_utc().isoformat()
                }), 400

        # Check if template name already exists
        existing = CommunicationTemplate.query.filter_by(name=data['name']).first()
        if existing:
            return jsonify({
                "success": False,
                "error": "Template name already exists",
                "timestamp": now_utc().isoformat()
            }), 400

        template = CommunicationTemplate()
        template.name = data['name']
        template.description = data.get('description')
        template.template_type = data['templateType']
        template.category = data.get('category')
        template.subject = data.get('subject')
        template.body_text = data['bodyText']
        template.body_html = data.get('bodyHtml')
        template.variables_json = data.get('variables', [])
        template.is_active = data.get('isActive', True)

        db.session.add(template)
        db.session.commit()

        return jsonify({
            "success": True,
            "data": template.to_dict(),
            "timestamp": now_utc().isoformat()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": now_utc().isoformat()
        }), 500


@communications_bp.route('/communications/templates/<template_id>', methods=['GET'])
def get_template(template_id):
    """Get a specific template"""
    try:
        template = db.session.get(CommunicationTemplate, template_id)
        if not template:
            return jsonify({
                "success": False,
                "error": "Template not found",
                "timestamp": now_utc().isoformat()
            }), 404

        return jsonify({
            "success": True,
            "data": template.to_dict(),
            "timestamp": now_utc().isoformat()
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": now_utc().isoformat()
        }), 500


@communications_bp.route('/communications/templates/<template_id>', methods=['PUT'])
@idempotent(methods=['PUT'])
@optimistic_lock(CommunicationTemplate, id_param='template_id')
@with_transaction
def update_template(template_id):
    """Update a communication template"""
    try:
        template = db.session.get(CommunicationTemplate, template_id)
        if not template:
            return jsonify({
                "success": False,
                "error": "Template not found",
                "timestamp": now_utc().isoformat()
            }), 404

        # Check if it's a system template
        if template.is_system:
            return jsonify({
                "success": False,
                "error": "Cannot modify system templates",
                "timestamp": now_utc().isoformat()
            }), 403

        data = request.get_json() or {}

        # Update fields
        if 'name' in data:
            # Check for name conflicts
            existing = CommunicationTemplate.query.filter(
                and_(CommunicationTemplate.name == data['name'], 
                     CommunicationTemplate.id != template_id)
            ).first()
            if existing:
                return jsonify({
                    "success": False,
                    "error": "Template name already exists",
                    "timestamp": now_utc().isoformat()
                }), 400
            template.name = data['name']

        if 'description' in data:
            template.description = data['description']
        if 'templateType' in data:
            template.template_type = data['templateType']
        if 'category' in data:
            template.category = data['category']
        if 'subject' in data:
            template.subject = data['subject']
        if 'bodyText' in data:
            template.body_text = data['bodyText']
        if 'bodyHtml' in data:
            template.body_html = data['bodyHtml']
        if 'variables' in data:
            template.variables_json = data['variables']
        if 'isActive' in data:
            template.is_active = data['isActive']

        db.session.commit()

        return jsonify({
            "success": True,
            "data": template.to_dict(),
            "timestamp": now_utc().isoformat()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": now_utc().isoformat()
        }), 500


@communications_bp.route('/communications/templates/<template_id>', methods=['DELETE'])
def delete_template(template_id):
    """Delete a communication template"""
    try:
        template = db.session.get(CommunicationTemplate, template_id)
        if not template:
            return jsonify({
                "success": False,
                "error": "Template not found",
                "timestamp": now_utc().isoformat()
            }), 404

        # Check if it's a system template
        if template.is_system:
            return jsonify({
                "success": False,
                "error": "Cannot delete system templates",
                "timestamp": now_utc().isoformat()
            }), 403

        db.session.delete(template)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Template deleted successfully",
            "timestamp": now_utc().isoformat()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": now_utc().isoformat()
        }), 500


# ============================================================================
# COMMUNICATION HISTORY ENDPOINTS
# ============================================================================

@communications_bp.route('/communications/history', methods=['GET'])
def list_communication_history():
    """List communication history with filtering"""
    try:
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        patient_id = request.args.get('patient_id')
        communication_type = request.args.get('type')  # sms, email, call, in_person
        direction = request.args.get('direction')  # inbound, outbound
        status = request.args.get('status')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        search = request.args.get('search')

        query = CommunicationHistory.query

        if patient_id:
            query = query.filter(CommunicationHistory.patient_id == patient_id)
        if communication_type:
            query = query.filter(CommunicationHistory.communication_type == communication_type)
        if direction:
            query = query.filter(CommunicationHistory.direction == direction)
        if status:
            query = query.filter(CommunicationHistory.status == status)
        if date_from:
            query = query.filter(CommunicationHistory.created_at >= datetime.fromisoformat(date_from))
        if date_to:
            query = query.filter(CommunicationHistory.created_at <= datetime.fromisoformat(date_to))
        if search:
            query = query.filter(or_(
                CommunicationHistory.subject.ilike(f'%{search}%'),
                CommunicationHistory.content.ilike(f'%{search}%'),
                CommunicationHistory.contact_method.ilike(f'%{search}%')
            ))

        pagination = query.order_by(desc(CommunicationHistory.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )

        history = [record.to_dict() for record in pagination.items]

        return jsonify({
            "success": True,
            "data": history,
            "meta": {
                "total": pagination.total,
                "page": page,
                "perPage": per_page,
                "totalPages": pagination.pages
            },
            "timestamp": now_utc().isoformat()
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": now_utc().isoformat()
        }), 500


@communications_bp.route('/communications/history', methods=['POST'])
@idempotent(methods=['POST'])
def create_communication_history():
    """Create a manual communication history entry"""
    try:
        data = request.get_json() or {}
        
        # Validate required fields
        required_fields = ['patientId', 'communicationType', 'direction']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "success": False,
                    "error": f"Missing required field: {field}",
                    "timestamp": now_utc().isoformat()
                }), 400

        # Verify patient exists
        patient = db.session.get(Patient, data['patientId'])
        if not patient:
            return jsonify({
                "success": False,
                "error": "Patient not found",
                "timestamp": now_utc().isoformat()
            }), 404

        history = CommunicationHistory()
        history.patient_id = data['patientId']
        history.communication_type = data['communicationType']
        history.direction = data['direction']
        history.subject = data.get('subject')
        history.content = data.get('content')
        history.contact_method = data.get('contactMethod')
        history.status = data.get('status', 'completed')
        history.priority = data.get('priority', 'normal')
        history.metadata_json = data.get('metadata', {})
        history.initiated_by = data.get('initiatedBy')

        db.session.add(history)
        db.session.commit()

        return jsonify({
            "success": True,
            "data": history.to_dict(),
            "timestamp": now_utc().isoformat()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": now_utc().isoformat()
        }), 500


# ============================================================================
# STATISTICS ENDPOINTS
# ============================================================================

@communications_bp.route('/communications/stats', methods=['GET'])
def communication_stats():
    """Get communication statistics"""
    try:
        # Date range for stats
        days = int(request.args.get('days', 30))
        date_from = now_utc() - timedelta(days=days)

        # SMS stats
        sms_total = SMSLog.query.filter(SMSLog.created_at >= date_from).count()
        sms_sent = SMSLog.query.filter(
            and_(SMSLog.created_at >= date_from, SMSLog.status == 'sent')
        ).count()
        sms_failed = SMSLog.query.filter(
            and_(SMSLog.created_at >= date_from, SMSLog.status == 'failed')
        ).count()

        # Email stats
        email_total = EmailLog.query.filter(EmailLog.created_at >= date_from).count()
        email_sent = EmailLog.query.filter(
            and_(EmailLog.created_at >= date_from, EmailLog.status == 'sent')
        ).count()
        email_failed = EmailLog.query.filter(
            and_(EmailLog.created_at >= date_from, EmailLog.status == 'failed')
        ).count()

        # Template stats
        template_count = CommunicationTemplate.query.filter(
            CommunicationTemplate.is_active == True
        ).count()

        # Communication history stats
        history_total = CommunicationHistory.query.filter(
            CommunicationHistory.created_at >= date_from
        ).count()

        stats = {
            'sms': {
                'total': sms_total,
                'sent': sms_sent,
                'failed': sms_failed,
                'successRate': (sms_sent / sms_total * 100) if sms_total > 0 else 0
            },
            'email': {
                'total': email_total,
                'sent': email_sent,
                'failed': email_failed,
                'successRate': (email_sent / email_total * 100) if email_total > 0 else 0
            },
            'templates': {
                'active': template_count
            },
            'history': {
                'total': history_total
            },
            'period': {
                'days': days,
                'from': date_from.isoformat(),
                'to': now_utc().isoformat()
            }
        }

        return jsonify({
            "success": True,
            "data": stats,
            "timestamp": now_utc().isoformat()
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": now_utc().isoformat()
        }), 500