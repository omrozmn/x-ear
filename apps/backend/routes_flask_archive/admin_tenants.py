"""
Admin Tenants routes for customer/organization management
"""
from flask import Blueprint, request, jsonify, current_app
from flask_mail import Message
from datetime import datetime
from models.base import db
from models.tenant import Tenant, TenantStatus
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
from utils.tenant_security import UnboundSession
import logging
import uuid
import os

logger = logging.getLogger(__name__)

admin_tenants_bp = Blueprint('admin_tenants', __name__, url_prefix='/api/admin/tenants')

@admin_tenants_bp.route('', methods=['GET'])
@unified_access(permission=AdminPermissions.TENANTS_READ)
def list_tenants(ctx):
    """List all tenants"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        status = request.args.get('status', '')
        search = request.args.get('search', '')
        
        query = Tenant.query.filter(Tenant.deleted_at.is_(None))
        
        if status:
            query = query.filter_by(status=status)
        if search:
            query = query.filter(
                (Tenant.name.ilike(f'%{search}%')) |
                (Tenant.owner_email.ilike(f'%{search}%'))
            )
        
        query = query.order_by(Tenant.created_at.desc())
        
        total = query.count()
        tenants = query.offset((page - 1) * limit).limit(limit).all()
        
        # Calculate actual user counts
        from models.user import User
        from sqlalchemy import func
        
        tenant_ids = [t.id for t in tenants]
        tenants_list = []
        
        if tenant_ids:
            with UnboundSession():
                user_counts = db.session.query(
                    User.tenant_id, 
                    func.count(User.id)
                ).filter(
                    User.tenant_id.in_(tenant_ids)
                ).group_by(User.tenant_id).all()
            
            counts_map = {t_id: count for t_id, count in user_counts}
            
            for t in tenants:
                t_dict = t.to_dict()
                t_dict['current_users'] = counts_map.get(t.id, 0)
                tenants_list.append(t_dict)
        else:
            tenants_list = []
        
        return success_response(data={
            'tenants': tenants_list,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'totalPages': (total + limit - 1) // limit
            }
        })
        
    except Exception as e:
        logger.error(f"List tenants error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_tenants_bp.route('', methods=['POST'])
@unified_access(permission=AdminPermissions.TENANTS_MANAGE)
def create_tenant(ctx):
    """Create tenant"""
    try:
        data = request.get_json()
        
        if not data.get('name') or not data.get('owner_email'):
            return error_response('Name and owner email are required', code='MISSING_FIELDS', status_code=400)
        
        tenant = Tenant(
            id=str(uuid.uuid4()),
            name=data['name'],
            slug=data.get('slug') or Tenant.generate_slug(data['name']),
            description=data.get('description'),
            owner_email=data['owner_email'],
            billing_email=data.get('billing_email', data['owner_email']),
            status=data.get('status', TenantStatus.TRIAL.value),
            current_plan=data.get('current_plan'),
            max_users=data.get('max_users', 5),
            current_users=data.get('current_users', 0),
            company_info=data.get('company_info', {}),
            settings=data.get('settings', {})
        )
        
        db.session.add(tenant)
        db.session.commit()
        
        return success_response(data={'tenant': tenant.to_dict()}, status_code=201)
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create tenant error: {e}")
        return error_response(str(e), code='CREATE_FAILED', status_code=400)

@admin_tenants_bp.route('/<tenant_id>', methods=['GET'])
@unified_access(permission=AdminPermissions.TENANTS_READ)
def get_tenant(ctx, tenant_id):
    """Get tenant details"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
        
        return success_response(data={'tenant': tenant.to_dict()})
        
    except Exception as e:
        logger.error(f"Get tenant error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_tenants_bp.route('/<tenant_id>', methods=['PUT'])
@unified_access(permission=AdminPermissions.TENANTS_MANAGE)
def update_tenant(ctx, tenant_id):
    """Update tenant"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
        
        data = request.get_json()
        
        if 'name' in data:
            tenant.name = data['name']
        if 'slug' in data:
            tenant.slug = data['slug']
        if 'description' in data:
            tenant.description = data['description']
        if 'owner_email' in data:
            tenant.owner_email = data['owner_email']
        if 'billing_email' in data:
            tenant.billing_email = data['billing_email']
        if 'status' in data:
            tenant.status = data['status']
        if 'current_plan' in data:
            tenant.current_plan = data['current_plan']
        if 'max_users' in data:
            tenant.max_users = data['max_users']
        if 'current_users' in data:
            tenant.current_users = data['current_users']
        if 'company_info' in data:
            tenant.company_info = data['company_info']
        if 'settings' in data:
            tenant.settings = data['settings']
        if 'feature_usage' in data:
            tenant.feature_usage = data['feature_usage']
        
        tenant.updated_at = datetime.utcnow()
        db.session.commit()
        
        return success_response(data={'tenant': tenant.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update tenant error: {e}")
        return error_response(str(e), code='UPDATE_FAILED', status_code=400)

@admin_tenants_bp.route('/<tenant_id>', methods=['DELETE'])
@unified_access(permission=AdminPermissions.TENANTS_MANAGE)
def delete_tenant(ctx, tenant_id):
    """Delete tenant (soft delete)"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
        
        tenant.soft_delete()
        db.session.commit()
        
        return success_response(message='Tenant deleted successfully')
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete tenant error: {e}")
        return error_response(str(e), code='DELETE_FAILED', status_code=400)

@admin_tenants_bp.route('/<tenant_id>/users', methods=['GET'])
@unified_access(permission=AdminPermissions.USERS_READ)
def get_tenant_users(ctx, tenant_id):
    """Get users for a specific tenant"""
    try:
        from models.user import User
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
            
        with UnboundSession():
            users = User.query.filter_by(tenant_id=tenant_id).all()
        
        return success_response(data={
            'users': [{
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'role': u.role,
                'is_active': u.is_active,
                'last_login': u.last_login.isoformat() if u.last_login else None,
                'tenant_id': u.tenant_id
            } for u in users]
        })
        
    except Exception as e:
        logger.error(f"Get tenant users error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_tenants_bp.route('/<tenant_id>/subscribe', methods=['POST'])
@unified_access(permission=AdminPermissions.TENANTS_MANAGE)
def subscribe_tenant(ctx, tenant_id):
    """Subscribe tenant to a plan (Admin override)"""
    try:
        from models.plan import Plan
        from datetime import timedelta
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
            
        data = request.get_json()
        plan_id = data.get('plan_id')
        billing_interval = data.get('billing_interval', 'YEARLY')
        
        if not plan_id:
            return error_response('Plan ID is required', code='MISSING_FIELD', status_code=400)
            
        plan = Plan.query.get(plan_id)
        if not plan:
            return error_response('Plan not found', code='NOT_FOUND', status_code=404)
            
        # Calculate subscription dates
        start_date = datetime.utcnow()
        if billing_interval == 'YEARLY':
            end_date = start_date + timedelta(days=365)
        elif billing_interval == 'MONTHLY':
            end_date = start_date + timedelta(days=30)
        else:
            end_date = start_date + timedelta(days=365)
            
        tenant.current_plan_id = plan.id
        tenant.current_plan = plan.slug
        tenant.subscription_start_date = start_date
        tenant.subscription_end_date = end_date
        tenant.status = TenantStatus.ACTIVE.value
        
        # Initialize feature usage
        feature_usage = {}
        if plan.features:
            if isinstance(plan.features, list):
                for feature in plan.features:
                    raw_key = feature.get('key', '')
                    key = raw_key.lower() if raw_key else ''
                    limit = feature.get('limit', 0)
                    if key:
                        feature_usage[key] = {
                            'limit': limit,
                            'used': 0,
                            'last_reset': start_date.isoformat()
                        }
            elif isinstance(plan.features, dict):
                for raw_key, value in plan.features.items():
                    key = raw_key.lower()
                    limit = 0
                    if isinstance(value, dict):
                        limit = value.get('limit', 0)
                    elif isinstance(value, (int, float)):
                        limit = value
                    
                    feature_usage[key] = {
                        'limit': limit,
                        'used': 0,
                        'last_reset': start_date.isoformat()
                    }
        
        tenant.feature_usage = feature_usage
        db.session.commit()
        
        return success_response(message='Subscription updated successfully', data={'tenant': tenant.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Subscribe tenant error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_tenants_bp.route('/<tenant_id>/users', methods=['POST'])
@unified_access(permission=AdminPermissions.USERS_MANAGE)
def create_tenant_user(ctx, tenant_id):
    """Create a user for a specific tenant"""
    try:
        from models.user import User
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
            
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return error_response('Email and password are required', code='MISSING_FIELDS', status_code=400)
            
        with UnboundSession():
            if User.query.filter_by(email=data['email']).first():
                return error_response('Email already exists', code='CONFLICT', status_code=400)
            
        user = User(
            email=data['email'],
            username=data.get('username', data['email'].split('@')[0]),
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            role=data.get('role', 'tenant_user'),
            tenant_id=tenant_id,
            is_active=data.get('is_active', True)
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        return success_response(data={'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'is_active': user.is_active,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'tenant_id': user.tenant_id
        }}, status_code=201)
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create tenant user error: {e}")
        return error_response(str(e), code='CREATE_FAILED', status_code=400)

@admin_tenants_bp.route('/<tenant_id>/users/<user_id>', methods=['PUT'])
@unified_access(permission=AdminPermissions.USERS_MANAGE)
def update_tenant_user(ctx, tenant_id, user_id):
    """Update a tenant user"""
    try:
        from models.user import User
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
            
        with UnboundSession():
            user = User.query.filter_by(id=user_id, tenant_id=tenant_id).first()
        if not user:
            return error_response('User not found in this tenant', code='NOT_FOUND', status_code=404)
            
        data = request.get_json()
        
        if 'email' in data:
            with UnboundSession():
                existing = User.query.filter(User.email == data['email'], User.id != user_id).first()
            if existing:
                return error_response('Email already in use', code='CONFLICT', status_code=400)
            user.email = data['email']
            
        if 'username' in data:
            with UnboundSession():
                existing = User.query.filter(User.username == data['username'], User.id != user_id).first()
            if existing:
                return error_response('Username already in use', code='CONFLICT', status_code=400)
            user.username = data['username']
            
        if 'first_name' in data: user.first_name = data['first_name']
        if 'last_name' in data: user.last_name = data['last_name']
        if 'role' in data: user.role = data['role']
        if 'is_active' in data: user.is_active = data['is_active']
        if 'password' in data and data['password']: user.set_password(data['password'])
            
        db.session.commit()
        
        return success_response(data={'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'is_active': user.is_active,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'tenant_id': user.tenant_id
        }})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update tenant user error: {e}")
        return error_response(str(e), code='UPDATE_FAILED', status_code=400)

@admin_tenants_bp.route('/<tenant_id>/addons', methods=['POST'])
@unified_access(permission=AdminPermissions.TENANTS_MANAGE)
def add_tenant_addon(ctx, tenant_id):
    """Add addon to tenant (Admin override)"""
    try:
        from models.addon import AddOn
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
            
        data = request.get_json()
        addon_id = data.get('addon_id')
        
        if not addon_id:
            return error_response('Addon ID is required', code='MISSING_FIELD', status_code=400)
            
        addon = AddOn.query.get(addon_id)
        if not addon:
            return error_response('Addon not found', code='NOT_FOUND', status_code=404)
            
        # Update feature usage based on addon
        key = addon.unit_name or addon.slug or 'unknown'
        
        settings = dict(tenant.settings or {})
        purchased_addons = list(settings.get('addons', []))
        
        purchased_addons.append({
            'addon_id': addon.id,
            'name': addon.name,
            'price': float(addon.price) if addon.price else 0,
            'limit_amount': addon.limit_amount,
            'unit_name': addon.unit_name,
            'added_at': datetime.utcnow().isoformat(),
            'added_by_admin': True
        })
        
        settings['addons'] = purchased_addons
        tenant.settings = settings

        if not tenant.feature_usage:
            tenant.feature_usage = {}
            
        usage = dict(tenant.feature_usage)
        
        if key in usage:
            current_limit = usage[key].get('limit', 0)
            usage[key]['limit'] = current_limit + (addon.limit_amount or 0)
        else:
            usage[key] = {
                'limit': addon.limit_amount or 0,
                'used': 0,
                'last_reset': datetime.utcnow().isoformat()
            }
            
        tenant.feature_usage = usage
        db.session.commit()
        
        return success_response(message='Addon added successfully', data={
            'tenant': tenant.to_dict(),
            'added_addon': purchased_addons[-1]
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Add tenant addon error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_tenants_bp.route('/<tenant_id>/addons', methods=['DELETE'])
@unified_access(permission=AdminPermissions.TENANTS_MANAGE)
def remove_tenant_addon(ctx, tenant_id):
    """Remove addon from tenant (decrease limits)"""
    try:
        from models.addon import AddOn
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
            
        data = request.get_json() or {} # Handle potential empty body if using args
        addon_id = data.get('addon_id')
        
        if not addon_id:
             addon_id = request.args.get('addon_id')
             
        if not addon_id:
            return error_response('Addon ID required', code='MISSING_FIELD', status_code=400)
            
        addon = AddOn.query.get(addon_id)
        if not addon:
             return error_response('Addon definition not found', code='NOT_FOUND', status_code=404)

        # 1. Update Settings (Remove from list)
        settings = dict(tenant.settings or {})
        purchased_addons = list(settings.get('addons', []))
        
        removed_addon = None
        for i, a in enumerate(purchased_addons):
            if a.get('addon_id') == addon_id or a.get('id') == addon_id:
                removed_addon = purchased_addons.pop(i)
                break
        
        if not removed_addon:
             return error_response('This addon is not active for this tenant', code='INVALID_OPERATION', status_code=400)
             
        settings['addons'] = purchased_addons
        tenant.settings = settings
        
        # 2. Decrease Feature Usage
        key = addon.unit_name or addon.slug or 'unknown'
        usage = dict(tenant.feature_usage or {})
        
        if key in usage:
            current_limit = usage[key].get('limit', 0)
            reduction = addon.limit_amount or 0
            new_limit = max(0, current_limit - reduction)
            usage[key]['limit'] = new_limit
            tenant.feature_usage = usage
            
        db.session.commit()
        
        return success_response(message='Addon removed and limits decreased', data={'tenant': tenant.to_dict()})

    except Exception as e:
        db.session.rollback()
        logger.error(f"Remove tenant addon error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_tenants_bp.route('/<tenant_id>/status', methods=['PUT'])
@unified_access(permission=AdminPermissions.TENANTS_MANAGE)
def update_tenant_status(ctx, tenant_id):
    """Update tenant status"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
            
        data = request.get_json()
        status = data.get('status')
        
        if not status:
            return error_response('Status is required', code='MISSING_FIELD', status_code=400)
            
        tenant.status = status
        tenant.updated_at = datetime.utcnow()
        db.session.commit()
        
        return success_response(data={'tenant': tenant.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update tenant status error: {e}")
        return error_response(str(e), code='UPDATE_FAILED', status_code=400)


@admin_tenants_bp.route('/<tenant_id>/sms-config', methods=['GET'])
@unified_access(permission=AdminPermissions.TENANTS_READ)
def get_tenant_sms_config(ctx, tenant_id):
    """Get SMS configuration for a tenant (admin view)"""
    try:
        from models.sms_integration import SMSProviderConfig
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
        
        config = SMSProviderConfig.query.filter_by(tenant_id=tenant_id).first()
        if not config:
            return success_response(data=None)
        
        return success_response(data={
            'apiUsername': config.api_username,
            'documentsEmail': config.documents_email,
            'documentsSubmitted': config.documents_submitted,
            'allDocumentsApproved': config.all_documents_approved
        })
        
    except Exception as e:
        logger.error(f"Get tenant SMS config error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_tenants_bp.route('/<tenant_id>/sms-documents', methods=['GET'])
@unified_access(permission=AdminPermissions.TENANTS_READ)
def get_tenant_sms_documents(ctx, tenant_id):
    """Get SMS documents for a tenant"""
    try:
        from models.sms_integration import SMSProviderConfig
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
        
        config = SMSProviderConfig.query.filter_by(tenant_id=tenant_id).first()
        if not config:
            return success_response(data={'documents': [], 'documentsSubmitted': False})
        
        documents = config.documents_json or []
        
        return success_response(data={
            'documents': documents,
            'documentsSubmitted': config.documents_submitted or False,
            'documentsSubmittedAt': config.documents_submitted_at.isoformat() if config.documents_submitted_at else None,
            'allDocumentsApproved': config.all_documents_approved or False
        })
        
    except Exception as e:
        logger.error(f"Get tenant SMS documents error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_tenants_bp.route('/<tenant_id>/sms-documents/<document_type>/download', methods=['GET'])
@unified_access(permission=AdminPermissions.TENANTS_READ)
def download_tenant_sms_document(ctx, tenant_id, document_type):
    """Get download URL for a tenant's SMS document"""
    try:
        import os
        from models.sms_integration import SMSProviderConfig
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
        
        config = SMSProviderConfig.query.filter_by(tenant_id=tenant_id).first()
        if not config:
            return error_response('No SMS configuration found', code='NOT_FOUND', status_code=404)
        
        docs = config.documents_json or []
        doc = next((d for d in docs if d.get('type') == document_type), None)
        
        if not doc:
            return error_response('Document not found', code='NOT_FOUND', status_code=404)
        
        filepath = doc.get('filepath')
        if not filepath:
            return error_response('File path not found', code='NOT_FOUND', status_code=404)
        
        SMS_DOCUMENTS_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'sms-documents')
        full_path = os.path.join(SMS_DOCUMENTS_FOLDER, filepath)
        
        if not os.path.exists(full_path):
            logger.error(f"File not found: {full_path}")
            return error_response('File not found on disk', code='NOT_FOUND', status_code=404)
        
        # Return URL for static file serving
        url = f"/api/sms/documents/file/{filepath}"
        
        return success_response(data={'url': url, 'filename': doc.get('filename', 'document')})
        
    except Exception as e:
        logger.error(f"Download tenant SMS document error: {e}")
        return error_response(str(e), code='DOWNLOAD_FAILED', status_code=500)
        logger.error(f"Get tenant SMS documents error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_tenants_bp.route('/<tenant_id>/sms-documents/<document_type>/status', methods=['PUT'])
@unified_access(permission=AdminPermissions.TENANTS_MANAGE)
def update_sms_document_status(ctx, tenant_id, document_type):
    """Update SMS document status (approve/request revision)"""
    try:
        from models.sms_integration import SMSProviderConfig
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
        
        config = SMSProviderConfig.query.filter_by(tenant_id=tenant_id).first()
        if not config:
            return error_response('No SMS configuration found', code='NOT_FOUND', status_code=404)
        
        data = request.get_json() or {}
        status = data.get('status')  # 'approved' or 'revision_requested'
        
        if status not in ['approved', 'revision_requested']:
            return error_response('Invalid status', code='INVALID_STATUS', status_code=400)
        
        docs = config.documents_json or []
        doc = next((d for d in docs if d.get('type') == document_type), None)
        
        if not doc:
            return error_response('Document not found', code='NOT_FOUND', status_code=404)
        
        doc['status'] = status
        doc['reviewedAt'] = datetime.utcnow().isoformat()
        doc['reviewedBy'] = ctx.principal_id
        
        if status == 'revision_requested':
            doc['revisionNote'] = data.get('note', '')
        
        config.documents_json = docs
        
        # Check if all documents are approved
        all_approved = all(d.get('status') == 'approved' for d in docs)
        config.all_documents_approved = all_approved
        
        db.session.commit()
        
        return success_response(data={
            'document': doc,
            'allDocumentsApproved': all_approved
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update SMS document status error: {e}")
        return error_response(str(e), code='UPDATE_FAILED', status_code=400)

@admin_tenants_bp.route('/<tenant_id>/sms-documents/send-email', methods=['POST'])
@unified_access(permission=AdminPermissions.TENANTS_MANAGE)
def send_sms_documents_email(ctx, tenant_id):
    """Send all approved SMS documents via email"""
    try:
        from models.sms_integration import SMSProviderConfig
        from extensions import mail
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
        
        config = SMSProviderConfig.query.filter_by(tenant_id=tenant_id).first()
        if not config:
            return error_response('No SMS configuration found', code='NOT_FOUND', status_code=404)
        
        if not config.all_documents_approved:
            return error_response('Not all documents are approved', code='NOT_APPROVED', status_code=400)
        
        if not config.documents_email:
            return error_response('No email address configured', code='NO_EMAIL', status_code=400)
        
        docs = config.documents_json or []
        if not docs:
            return error_response('No documents to send', code='NO_DOCUMENTS', status_code=400)
        
        # Prepare email
        subject = f"SMS Başvuru Belgeleri - {tenant.name}"
        body = f"""
Merhaba,

{tenant.name} firması için SMS başvuru belgelerini ekte bulabilirsiniz.

Firma Bilgileri:
- Firma Adı: {tenant.name}
- Yönetici Email: {tenant.owner_email}
- API Username: {config.api_username}

Belgeler:
"""
        
        for doc in docs:
            body += f"\n- {doc.get('filename', 'Belge')} ({doc.get('type', 'unknown')})"
        
        body += "\n\nİyi çalışmalar."
        
        # Create message
        msg = Message(
            subject=subject,
            recipients=[config.documents_email],
            body=body,
            sender=current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@x-ear.com')
        )
        
        # Attach documents
        SMS_DOCUMENTS_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'sms-documents')
        
        for doc in docs:
            if doc.get('filepath'):
                filepath = os.path.join(SMS_DOCUMENTS_FOLDER, doc['filepath'])
                if os.path.exists(filepath):
                    with open(filepath, 'rb') as f:
                        msg.attach(
                            filename=doc.get('filename', 'document'),
                            content_type='application/octet-stream',
                            data=f.read()
                        )
                else:
                    logger.warning(f"Document file not found: {filepath}")
        
        # Send email
        try:
            from extensions import mail
            
            # Check if we're in development mode
            is_dev = os.getenv('FLASK_ENV', 'production') == 'development'
            mail_username = current_app.config.get('MAIL_USERNAME', '')
            mail_configured = mail_username and mail_username != 'your-email@gmail.com'
            
            if is_dev and not mail_configured:
                # Development mode without SMTP - simulate email sending
                logger.info("=" * 80)
                logger.info("📧 EMAIL SIMULATION (Development Mode)")
                logger.info("=" * 80)
                logger.info(f"To: {config.documents_email}")
                logger.info(f"From: {msg.sender}")
                logger.info(f"Subject: {subject}")
                logger.info("-" * 80)
                logger.info("Body:")
                logger.info(body)
                logger.info("-" * 80)
                logger.info(f"Attachments: {len(msg.attachments)}")
                for attachment in msg.attachments:
                    logger.info(f"  - {attachment.filename} ({len(attachment.data)} bytes)")
                logger.info("=" * 80)
                logger.info("✅ Email simulated successfully (no actual email sent)")
                logger.info("=" * 80)
                
                return success_response(
                    data={
                        'message': 'E-posta başarıyla gönderildi (Development: Simulated)',
                        'simulated': True,
                        'recipient': config.documents_email,
                        'attachments': len(msg.attachments)
                    }
                )
            else:
                # Production mode or SMTP configured - send real email
                mail.send(msg)
                logger.info(f"SMS documents email sent to {config.documents_email} for tenant {tenant_id}")
                return success_response(
                    data={
                        'message': 'E-posta başarıyla gönderildi',
                        'simulated': False,
                        'recipient': config.documents_email,
                        'attachments': len(msg.attachments)
                    }
                )
        except Exception as mail_error:
            logger.error(f"Failed to send email: {mail_error}", exc_info=True)
            return error_response(f'E-posta gönderilemedi: {str(mail_error)}', code='MAIL_FAILED', status_code=500)
        
    except Exception as e:
        logger.error(f"Send SMS documents email error: {e}", exc_info=True)
        return error_response(str(e), code='SEND_FAILED', status_code=500)
