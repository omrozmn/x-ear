from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.base import db
from models.integration_config import IntegrationConfig
from models.notification_template import NotificationTemplate
from utils.admin_permissions import require_admin_permission, AdminPermissions
import logging
import json

logger = logging.getLogger(__name__)

admin_integrations_bp = Blueprint('admin_integrations', __name__, url_prefix='/api/admin/integrations')

@admin_integrations_bp.route('/init-db', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.SYSTEM_MANAGE)
def init_db():
    """Initialize integration config tables"""
    try:
        engine = db.engine
        IntegrationConfig.__table__.create(engine, checkfirst=True)
        
        return jsonify({'success': True, 'message': 'Integration config tables initialized'}), 200
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_integrations_bp.route('/vatan-sms/config', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.INTEGRATIONS_READ)
def get_vatan_sms_config():
    """Get VatanSMS integration configuration"""
    try:
        # Get approval email config
        email_config = IntegrationConfig.query.filter_by(
            integration_type='vatan_sms',
            config_key='document_approval_email'
        ).first()
        
        # Get email template
        template = NotificationTemplate.query.filter_by(
            trigger_event='vatan_sms_document_uploaded',
            is_active=True
        ).first()
        
        return jsonify({
            'success': True,
            'data': {
                'approvalEmail': email_config.config_value if email_config else '',
                'emailTemplate': template.to_dict() if template else None
            }
        }), 200
    except Exception as e:
        logger.error(f"Get VatanSMS config error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_integrations_bp.route('/vatan-sms/config', methods=['PUT'])
@jwt_required()
@require_admin_permission(AdminPermissions.INTEGRATIONS_MANAGE)
def update_vatan_sms_config():
    """Update VatanSMS integration configuration"""
    try:
        data = request.get_json()
        
        # Update or create approval email config
        email_config = IntegrationConfig.query.filter_by(
            integration_type='vatan_sms',
            config_key='document_approval_email'
        ).first()
        
        if email_config:
            email_config.config_value = data.get('approvalEmail', '')
        else:
            email_config = IntegrationConfig(
                integration_type='vatan_sms',
                config_key='document_approval_email',
                config_value=data.get('approvalEmail', ''),
                description='VatanSMS document approval email address'
            )
            db.session.add(email_config)
        
        # Update or create email template
        if 'emailTemplate' in data:
            tpl_data = data['emailTemplate']
            template = NotificationTemplate.query.filter_by(
                trigger_event='vatan_sms_document_uploaded'
            ).first()
            
            if template:
                # Update existing
                template.name = tpl_data.get('name', 'VatanSMS Document Approval')
                template.description = tpl_data.get('description', 'Automatic email sent to VatanSMS for document approval')
                template.channel = 'email'
                template.email_from_name = tpl_data.get('emailFromName', 'X-Ear CRM')
                template.email_from_address = tpl_data.get('emailFromAddress', 'noreply@x-ear.com')
                template.email_subject = tpl_data.get('emailSubject', '')
                template.email_body_html = tpl_data.get('emailBodyHtml', '')
                template.email_body_text = tpl_data.get('emailBodyText', '')
                template.template_category = 'integration'
                template.is_active = tpl_data.get('isActive', True)
            else:
                # Create new
                template = NotificationTemplate(
                    name='VatanSMS Document Approval',
                    description='Automatic email sent to VatanSMS for document approval',
                    channel='email',
                    trigger_event='vatan_sms_document_uploaded',
                    email_from_name=tpl_data.get('emailFromName', 'X-Ear CRM'),
                    email_from_address=tpl_data.get('emailFromAddress', 'noreply@x-ear.com'),
                    email_subject=tpl_data.get('emailSubject', ''),
                    email_body_html=tpl_data.get('emailBodyHtml', ''),
                    email_body_text=tpl_data.get('emailBodyText', ''),
                    template_category='integration',
                    is_active=True
                )
                db.session.add(template)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'VatanSMS configuration updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update VatanSMS config error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_integrations_bp.route('/birfatura/config', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.INTEGRATIONS_READ)
def get_birfatura_config():
    """Get BirFatura integration configuration"""
    try:
        # Get notification email config
        email_config = IntegrationConfig.query.filter_by(
            integration_type='birfatura',
            config_key='notification_email'
        ).first()
        
        # Get email template
        template = NotificationTemplate.query.filter_by(
            trigger_event='birfatura_invoice_sent',
            is_active=True
        ).first()
        
        return jsonify({
            'success': True,
            'data': {
                'notificationEmail': email_config.config_value if email_config else '',
                'emailTemplate': template.to_dict() if template else None
            }
        }), 200
    except Exception as e:
        logger.error(f"Get BirFatura config error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_integrations_bp.route('/birfatura/config', methods=['PUT'])
@jwt_required()
@require_admin_permission(AdminPermissions.INTEGRATIONS_MANAGE)
def update_birfatura_config():
    """Update BirFatura integration configuration"""
    try:
        data = request.get_json()
        
        # Update or create notification email config
        email_config = IntegrationConfig.query.filter_by(
            integration_type='birfatura',
            config_key='notification_email'
        ).first()
        
        if email_config:
            email_config.config_value = data.get('notificationEmail', '')
        else:
            email_config = IntegrationConfig(
                integration_type='birfatura',
                config_key='notification_email',
                config_value=data.get('notificationEmail', ''),
                description='BirFatura notification email address'
            )
            db.session.add(email_config)
        
        # Update or create email template (similar to VatanSMS)
        if 'emailTemplate' in data:
            tpl_data = data['emailTemplate']
            template = NotificationTemplate.query.filter_by(
                trigger_event='birfatura_invoice_sent'
            ).first()
            
            if template:
                template.name = tpl_data.get('name', 'BirFatura Invoice Notification')
                template.description = tpl_data.get('description', 'Automatic email for BirFatura invoice notifications')
                template.channel = 'email'
                template.email_from_name = tpl_data.get('emailFromName', 'X-Ear CRM')
                template.email_from_address = tpl_data.get('emailFromAddress', 'noreply@x-ear.com')
                template.email_subject = tpl_data.get('emailSubject', '')
                template.email_body_html = tpl_data.get('emailBodyHtml', '')
                template.email_body_text = tpl_data.get('emailBodyText', '')
                template.template_category = 'integration'
                template.is_active = tpl_data.get('isActive', True)
            else:
                template = NotificationTemplate(
                    name='BirFatura Invoice Notification',
                    description='Automatic email for BirFatura invoice notifications',
                    channel='email',
                    trigger_event='birfatura_invoice_sent',
                    email_from_name=tpl_data.get('emailFromName', 'X-Ear CRM'),
                    email_from_address=tpl_data.get('emailFromAddress', 'noreply@x-ear.com'),
                    email_subject=tpl_data.get('emailSubject', ''),
                    email_body_html=tpl_data.get('emailBodyHtml', ''),
                    email_body_text=tpl_data.get('emailBodyText', ''),
                    template_category='integration',
                    is_active=True
                )
                db.session.add(template)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'BirFatura configuration updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update BirFatura config error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500
