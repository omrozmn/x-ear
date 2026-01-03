from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
from models.base import db
from models.integration_config import IntegrationConfig
from models.notification_template import NotificationTemplate
import logging
import json

logger = logging.getLogger(__name__)

admin_integrations_bp = Blueprint('admin_integrations', __name__, url_prefix='/api/admin/integrations')

@admin_integrations_bp.route('/init-db', methods=['POST'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def init_db(ctx):
    """Initialize integration config tables"""
    try:
        engine = db.engine
        IntegrationConfig.__table__.create(engine, checkfirst=True)
        return success_response(message='Integration config tables initialized')
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_integrations_bp.route('/vatan-sms/config', methods=['GET'])
@unified_access(permission=AdminPermissions.INTEGRATIONS_READ)
def get_vatan_sms_config(ctx):
    """Get VatanSMS integration configuration"""
    try:
        # Get config values
        email_config = IntegrationConfig.query.filter_by(
            integration_type='vatan_sms',
            config_key='document_approval_email'
        ).first()

        username_config = IntegrationConfig.query.filter_by(
            integration_type='vatan_sms',
            config_key='username'
        ).first()

        password_config = IntegrationConfig.query.filter_by(
            integration_type='vatan_sms',
            config_key='password'
        ).first()

        sender_id_config = IntegrationConfig.query.filter_by(
            integration_type='vatan_sms',
            config_key='sender_id'
        ).first()

        is_active_config = IntegrationConfig.query.filter_by(
            integration_type='vatan_sms',
            config_key='is_active'
        ).first()
        
        # Get email template
        template = NotificationTemplate.query.filter_by(
            trigger_event='vatan_sms_document_uploaded',
            is_active=True
        ).first()
        
        return success_response(data={
            'approvalEmail': email_config.config_value if email_config else '',
            'username': username_config.config_value if username_config else '',
            'password': password_config.config_value if password_config else '',
            'senderId': sender_id_config.config_value if sender_id_config else '',
            'isActive': is_active_config.config_value == 'true' if is_active_config else False,
            'emailTemplate': template.to_dict() if template else None
        })
    except Exception as e:
        logger.error(f"Get VatanSMS config error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_integrations_bp.route('/vatan-sms/config', methods=['PUT'])
@unified_access(permission=AdminPermissions.INTEGRATIONS_MANAGE)
def update_vatan_sms_config(ctx):
    """Update VatanSMS integration configuration"""
    try:
        data = request.get_json()
        
        def update_or_create_config(key, value, description):
            config = IntegrationConfig.query.filter_by(
                integration_type='vatan_sms',
                config_key=key
            ).first()
            
            if config:
                config.config_value = value
            else:
                config = IntegrationConfig(
                    integration_type='vatan_sms',
                    config_key=key,
                    config_value=value,
                    description=description
                )
                db.session.add(config)

        # Update configs
        update_or_create_config('document_approval_email', data.get('approvalEmail', ''), 'VatanSMS document approval email address')
        update_or_create_config('username', data.get('username', ''), 'VatanSMS Username')
        update_or_create_config('password', data.get('password', ''), 'VatanSMS Password')
        update_or_create_config('sender_id', data.get('senderId', ''), 'VatanSMS Sender ID')
        update_or_create_config('is_active', 'true' if data.get('isActive') else 'false', 'VatanSMS Integration Active Status')
        
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
        
        return success_response(message='VatanSMS configuration updated successfully')
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update VatanSMS config error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_integrations_bp.route('/birfatura/config', methods=['GET'])
@unified_access(permission=AdminPermissions.INTEGRATIONS_READ)
def get_birfatura_config(ctx):
    """Get BirFatura integration configuration"""
    try:
        # Get notification email config
        email_config = IntegrationConfig.query.filter_by(
            integration_type='birfatura',
            config_key='notification_email'
        ).first()
        
        # Get connection keys
        integration_key = IntegrationConfig.query.filter_by(
            integration_type='birfatura',
            config_key='integration_key'
        ).first()
        
        app_api_key = IntegrationConfig.query.filter_by(
            integration_type='birfatura',
            config_key='app_api_key'
        ).first()
        
        app_secret_key = IntegrationConfig.query.filter_by(
            integration_type='birfatura',
            config_key='app_secret_key'
        ).first()
        
        # Get email template
        template = NotificationTemplate.query.filter_by(
            trigger_event='birfatura_invoice_sent',
            is_active=True
        ).first()
        
        return success_response(data={
            'notificationEmail': email_config.config_value if email_config else '',
            'integrationKey': integration_key.config_value if integration_key else '',
            'appApiKey': app_api_key.config_value if app_api_key else '',
            'appSecretKey': app_secret_key.config_value if app_secret_key else '',
            'emailTemplate': template.to_dict() if template else None
        })
    except Exception as e:
        logger.error(f"Get BirFatura config error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_integrations_bp.route('/birfatura/config', methods=['PUT'])
@unified_access(permission=AdminPermissions.INTEGRATIONS_MANAGE)
def update_birfatura_config(ctx):
    """Update BirFatura integration configuration"""
    try:
        data = request.get_json()
        
        def update_or_create_config(key, value, description):
            config = IntegrationConfig.query.filter_by(
                integration_type='birfatura',
                config_key=key
            ).first()
            
            if config:
                config.config_value = value
            else:
                config = IntegrationConfig(
                    integration_type='birfatura',
                    config_key=key,
                    config_value=value,
                    description=description
                )
                db.session.add(config)
        
        # Update configs
        update_or_create_config('notification_email', data.get('notificationEmail', ''), 'BirFatura notification email address')
        update_or_create_config('integration_key', data.get('integrationKey', ''), 'BirFatura Global Integration Key')
        update_or_create_config('app_api_key', data.get('appApiKey', ''), 'BirFatura App API Key')
        update_or_create_config('app_secret_key', data.get('appSecretKey', ''), 'BirFatura App Secret Key')
        
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
        
        return success_response(message='BirFatura configuration updated successfully')
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update BirFatura config error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)
