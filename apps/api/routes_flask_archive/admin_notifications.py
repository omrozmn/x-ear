from flask import Blueprint, request, jsonify
from models.base import db
from models.notification import Notification
from models.notification_template import NotificationTemplate
from models.tenant import Tenant
from models.user import User
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
import logging
import json
from utils.tenant_security import UnboundSession

logger = logging.getLogger(__name__)

admin_notifications_bp = Blueprint('admin_notifications', __name__, url_prefix='/api/admin/notifications')

@admin_notifications_bp.route('/init-db', methods=['POST'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def init_db(ctx):
    """Initialize notification tables"""
    try:
        # Create tables if they don't exist
        engine = db.engine
        Notification.__table__.create(engine, checkfirst=True)
        NotificationTemplate.__table__.create(engine, checkfirst=True)
        
        # Create default templates
        default_templates = [
            {
                'name': 'welcome_message',
                'description': 'Welcome message for new users',
                'title_template': 'Hoşgeldiniz, {{name}}!',
                'body_template': 'X-Ear sistemine hoşgeldiniz. Hesabınız başarıyla oluşturuldu.',
                'channel': 'push',
                'variables': 'name',
                'template_category': 'platform_announcement'
            },
            {
                'name': 'system_maintenance',
                'description': 'System maintenance notification',
                'title_template': 'Sistem Bakımı Bildirimi',
                'body_template': 'Sayın {{tenant_name}}, {{date}} tarihinde sistem bakımı planlanmıştır.',
                'channel': 'email',
                'variables': 'tenant_name,date',
                'email_subject': 'X-Ear CRM - Sistem Bakımı Bildirimi',
                'email_body_html': '<p>Sayın {{tenant_name}},</p><p>{{date}} tarihinde sistem bakımı planlanmıştır.</p>',
                'template_category': 'platform_announcement'
            }
        ]
        
        for tpl in default_templates:
            if not NotificationTemplate.query.filter_by(name=tpl['name']).first():
                new_tpl = NotificationTemplate(**tpl)
                db.session.add(new_tpl)
        
        db.session.commit()
        return success_response(message='Notification tables initialized')
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_notifications_bp.route('', methods=['GET'])
@unified_access(permission=AdminPermissions.SYSTEM_READ)
def get_notifications(ctx):
    """Get list of notifications"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        user_id = request.args.get('user_id')
        type_filter = request.args.get('type')
        
        with UnboundSession():
            query = Notification.query
            
            if user_id:
                query = query.filter(Notification.user_id == user_id)
                
            if type_filter:
                query = query.filter(Notification.notification_type == type_filter)
                
            total = query.count()
            notifications = query.order_by(Notification.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        return success_response(data={
            'notifications': [n.to_dict() for n in notifications],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'totalPages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        logger.error(f"Get notifications error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_notifications_bp.route('/send', methods=['POST'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def send_notification(ctx):
    """Send a notification to tenants"""
    try:
        data = request.get_json()
        target_type = data.get('targetType') # 'tenant', 'all'
        target_id = data.get('targetId')
        title = data.get('title')
        message = data.get('message')
        notification_type = data.get('type', 'info')
        channel = data.get('channel', 'push')  # 'push', 'email', 'both'
        
        if not title or not message:
            return error_response('Title and message are required', code='MISSING_FIELDS', status_code=400)
        
        # For email channel, send via EmailService
        if channel in ['email', 'both']:
            from services.email_service import email_service
            
            # Determine recipients
            if target_type == 'tenant' and target_id:
                tenant = Tenant.query.get(target_id)
                if not tenant:
                    return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
                    
                # Get tenant admins
                admin_users = User.query.filter_by(tenant_id=target_id, role='owner').all()
                recipients = [u.email for u in admin_users if u.email]
                
            elif target_type == 'all':
                # Get all tenant owners
                admin_users = User.query.filter_by(role='owner').all()
                recipients = [u.email for u in admin_users if u.email]
            else:
                return error_response('Invalid target type', code='INVALID_TARGET', status_code=400)
            
            # Send emails
            count = 0
            for email in recipients:
                success = email_service.send_email(
                    to=email,
                    subject=title,
                    body_html=f"<html><body>{message}</body></html>",
                    body_text=message
                )
                if success:
                    count += 1
            
            return success_response(data={'count': count, 'channel': 'email'}, message=f'Email notification sent to {count} recipients', status_code=201)
        
        # For push notifications (existing logic)
        recipients = []
        
        with UnboundSession():
            if target_type == 'tenant':
                users = User.query.filter_by(tenant_id=target_id).all()
                recipients = [u.id for u in users]
            elif target_type == 'all':
                users = User.query.all()
                recipients = [u.id for u in users]
            
        count = 0
        for user_id in recipients:
            user = db.session.get(User, user_id)
            if not user:
                continue
                
            notification = Notification.create_notification(
                user_id=user_id,
                title=title,
                message=message,
                notification_type=notification_type
            )
            notification.tenant_id = user.tenant_id
            db.session.add(notification)
            count += 1
            
        db.session.commit()
        
        return success_response(data={'count': count, 'channel': 'push'}, message=f'Notification sent to {count} users', status_code=201)
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Send notification error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_notifications_bp.route('/templates', methods=['GET'])
@unified_access(permission=AdminPermissions.SYSTEM_READ)
def get_templates(ctx):
    """Get all notification templates"""
    try:
        category = request.args.get('category')
        channel = request.args.get('channel')
        
        query = NotificationTemplate.query
        
        if category:
            query = query.filter(NotificationTemplate.template_category == category)
        if channel:
            query = query.filter(NotificationTemplate.channel == channel)
        
        templates = query.all()
        return success_response(data=[t.to_dict() for t in templates])
    except Exception as e:
        logger.error(f"Get templates error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_notifications_bp.route('/templates', methods=['POST'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def create_template(ctx):
    """Create a new notification template"""
    try:
        data = request.get_json()
        
        template = NotificationTemplate(
            name=data.get('name'),
            description=data.get('description'),
            title_template=data.get('titleTemplate'),
            body_template=data.get('bodyTemplate'),
            channel=data.get('channel', 'push'),
            variables=','.join(data.get('variables', [])),
            # Email fields
            email_from_name=data.get('emailFromName'),
            email_from_address=data.get('emailFromAddress'),
            email_to_type=data.get('emailToType'),
            email_to_addresses=data.get('emailToAddresses'),
            email_subject=data.get('emailSubject'),
            email_body_html=data.get('emailBodyHtml'),
            email_body_text=data.get('emailBodyText'),
            # Trigger fields
            trigger_event=data.get('triggerEvent', 'manual'),
            trigger_conditions=data.get('triggerConditions'),
            template_category=data.get('templateCategory', 'platform_announcement')
        )
        
        db.session.add(template)
        db.session.commit()
        
        return success_response(data=template.to_dict(), status_code=201)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create template error: {e}")
        return error_response(str(e), code='CREATE_FAILED', status_code=400)

@admin_notifications_bp.route('/templates/<template_id>', methods=['PUT'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def update_template(ctx, template_id):
    """Update a notification template"""
    try:
        template = NotificationTemplate.query.get(template_id)
        if not template:
            return error_response('Template not found', code='NOT_FOUND', status_code=404)
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            template.name = data['name']
        if 'description' in data:
            template.description = data['description']
        if 'titleTemplate' in data:
            template.title_template = data['titleTemplate']
        if 'bodyTemplate' in data:
            template.body_template = data['bodyTemplate']
        if 'channel' in data:
            template.channel = data['channel']
        if 'variables' in data:
            template.variables = ','.join(data['variables'])
        
        # Email fields
        if 'emailFromName' in data:
            template.email_from_name = data['emailFromName']
        if 'emailFromAddress' in data:
            template.email_from_address = data['emailFromAddress']
        if 'emailToType' in data:
            template.email_to_type = data['emailToType']
        if 'emailToAddresses' in data:
            template.email_to_addresses = data['emailToAddresses']
        if 'emailSubject' in data:
            template.email_subject = data['emailSubject']
        if 'emailBodyHtml' in data:
            template.email_body_html = data['emailBodyHtml']
        if 'emailBodyText' in data:
            template.email_body_text = data['emailBodyText']
        
        # Trigger fields
        if 'triggerEvent' in data:
            template.trigger_event = data['triggerEvent']
        if 'triggerConditions' in data:
            template.trigger_conditions = data['triggerConditions']
        if 'templateCategory' in data:
            template.template_category = data['templateCategory']
        if 'isActive' in data:
            template.is_active = data['isActive']
        
        db.session.commit()
        
        return success_response(data=template.to_dict())
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update template error: {e}")
        return error_response(str(e), code='UPDATE_FAILED', status_code=400)

@admin_notifications_bp.route('/templates/<template_id>', methods=['DELETE'])
@unified_access(permission=AdminPermissions.SYSTEM_MANAGE)
def delete_template(ctx, template_id):
    """Delete a notification template"""
    try:
        template = NotificationTemplate.query.get(template_id)
        if not template:
            return error_response('Template not found', code='NOT_FOUND', status_code=404)
        
        db.session.delete(template)
        db.session.commit()
        
        return success_response(message='Template deleted successfully')
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete template error: {e}")
        return error_response(str(e), code='DELETE_FAILED', status_code=400)
