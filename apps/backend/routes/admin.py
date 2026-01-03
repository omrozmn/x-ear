"""
Admin routes for admin panel
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token
from datetime import datetime, timedelta
from models.base import db
from models.admin_user import AdminUser
from models.user import User
from models.role import Role
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
from utils.tenant_security import UnboundSession
import logging
import uuid
import traceback
from os import getenv

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# Email authorized for debug role switching
DEBUG_ADMIN_EMAIL = 'admin@x-ear.com'

# Page permission mappings - which permissions apply to which pages
PAGE_PERMISSION_MAP = {
    'patients': [
        {'code': 'patients.view', 'label': 'Hasta listesini görüntüleme'},
        {'code': 'patients.create', 'label': 'Yeni hasta ekleme'},
        {'code': 'patients.edit', 'label': 'Hasta düzenleme'},
        {'code': 'patients.delete', 'label': 'Hasta silme'},
        {'code': 'patients.notes', 'label': 'Hasta notlarına erişim'},
        {'code': 'patients.history', 'label': 'Hasta geçmişini görüntüleme'},
    ],
    'sales': [
        {'code': 'sales.view', 'label': 'Satış listesini görüntüleme'},
        {'code': 'sales.create', 'label': 'Yeni satış oluşturma'},
        {'code': 'sales.edit', 'label': 'Satış düzenleme'},
        {'code': 'sales.delete', 'label': 'Satış silme'},
        {'code': 'sales.approve', 'label': 'Satış onaylama'},
    ],
    'finance': [
        {'code': 'finance.view', 'label': 'Finans bilgilerini görüntüleme'},
        {'code': 'finance.payments', 'label': 'Ödeme işlemleri'},
        {'code': 'finance.refunds', 'label': 'İade işlemleri'},
        {'code': 'finance.reports', 'label': 'Finansal raporlar'},
        {'code': 'finance.cash_register', 'label': 'Kasa işlemleri'},
    ],
    'invoices': [
        {'code': 'invoices.view', 'label': 'Faturaları görüntüleme'},
        {'code': 'invoices.create', 'label': 'Fatura oluşturma'},
        {'code': 'invoices.send', 'label': 'Fatura gönderme'},
        {'code': 'invoices.cancel', 'label': 'Fatura iptal etme'},
    ],
    'devices': [
        {'code': 'devices.view', 'label': 'Cihaz listesini görüntüleme'},
        {'code': 'devices.create', 'label': 'Yeni cihaz ekleme'},
        {'code': 'devices.edit', 'label': 'Cihaz düzenleme'},
        {'code': 'devices.delete', 'label': 'Cihaz silme'},
        {'code': 'devices.assign', 'label': 'Cihaz atama'},
    ],
    'inventory': [
        {'code': 'inventory.view', 'label': 'Stok bilgilerini görüntüleme'},
        {'code': 'inventory.manage', 'label': 'Stok yönetimi'},
    ],
    'campaigns': [
        {'code': 'campaigns.view', 'label': 'Kampanyaları görüntüleme'},
        {'code': 'campaigns.create', 'label': 'Kampanya oluşturma'},
        {'code': 'campaigns.edit', 'label': 'Kampanya düzenleme'},
        {'code': 'campaigns.delete', 'label': 'Kampanya silme'},
        {'code': 'campaigns.send_sms', 'label': 'SMS gönderme'},
    ],
    'sgk': [
        {'code': 'sgk.view', 'label': 'SGK kayıtlarını görüntüleme'},
        {'code': 'sgk.create', 'label': 'SGK provizyon oluşturma'},
        {'code': 'sgk.upload', 'label': 'SGK başvuru yükleme'},
    ],
    'settings': [
        {'code': 'settings.view', 'label': 'Ayarları görüntüleme'},
        {'code': 'settings.edit', 'label': 'Ayarları düzenleme'},
        {'code': 'settings.branches', 'label': 'Şube yönetimi'},
        {'code': 'settings.integrations', 'label': 'Entegrasyon ayarları'},
    ],
    'team': [
        {'code': 'team.view', 'label': 'Ekip üyelerini görüntüleme'},
        {'code': 'team.create', 'label': 'Ekip üyesi ekleme'},
        {'code': 'team.edit', 'label': 'Ekip üyesi düzenleme'},
        {'code': 'team.delete', 'label': 'Ekip üyesi silme'},
        {'code': 'team.permissions', 'label': 'Rol izinleri yönetimi'},
    ],
    'reports': [
        {'code': 'reports.view', 'label': 'Raporları görüntüleme'},
        {'code': 'reports.export', 'label': 'Rapor dışa aktarma'},
    ],
    'dashboard': [
        {'code': 'dashboard.view', 'label': 'Dashboard görüntüleme'},
        {'code': 'dashboard.analytics', 'label': 'Analitik verileri görüntüleme'},
    ],
}

@admin_bp.route('/auth/login', methods=['POST'])
def admin_login():
    """Admin login endpoint"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        mfa_token = data.get('mfa_token')
        
        if not email or not password:
            return error_response('Email and password required', code='MISSING_CREDENTIALS', status_code=400)
        
        # Find admin user
        admin = AdminUser.query.filter_by(email=email).first()
        if not admin or not admin.check_password(password):
            return error_response('Invalid credentials', code='INVALID_CREDENTIALS', status_code=401)
        
        if not admin.is_active:
            return error_response('Account is disabled', code='ACCOUNT_DISABLED', status_code=403)
        
        # Check MFA if enabled
        if admin.mfa_enabled and not mfa_token:
            return success_response(data={'requires_mfa': True})
        
        # TODO: Verify MFA token if provided
        
        # Update last login
        admin.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create access token with admin_ prefix for proper principal resolution
        # The auth_principal.py expects admin IDs to start with 'admin_'
        admin_identity = admin.id if admin.id.startswith('admin_') else f'admin_{admin.id}'
        access_token = create_access_token(
            identity=admin_identity,
            additional_claims={'role': admin.role, 'user_type': 'admin'}  # user_type instead of type
        )
        
        # Create refresh token for admin users
        refresh_token = create_refresh_token(
            identity=admin_identity,
            additional_claims={'role': admin.role, 'user_type': 'admin'}  # user_type instead of type
        )
        
        return success_response(data={
            'token': access_token,
            'refreshToken': refresh_token,
            'user': admin.to_dict(),
            'requires_mfa': False
        })
        
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_bp.route('/users', methods=['POST'])
@unified_access(permission=AdminPermissions.USERS_MANAGE)
def create_admin_user(ctx):
    """Create admin user or tenant user"""
    try:
        data = request.get_json()
        
        # Validation
        if not data.get('email') or not data.get('password'):
            return error_response('Email and password are required', code='MISSING_FIELDS', status_code=400)
            
        tenant_id = data.get('tenant_id')
        
        if tenant_id:
            # Create Tenant User (User model)
            # Check if user exists in User model
            if User.query.filter_by(email=data['email']).first():
                return error_response('User already exists', code='CONFLICT', status_code=400)
                
            # Generate username from email if not provided
            username = data.get('username') or data['email'].split('@')[0]
            # Ensure username is unique
            base_username = username
            counter = 1
            while User.query.filter_by(username=username).first():
                username = f"{base_username}{counter}"
                counter += 1
                
            user = User(
                id=str(uuid.uuid4()),
                email=data['email'],
                username=username,
                first_name=data.get('first_name'),
                last_name=data.get('last_name'),
                tenant_id=tenant_id,
                role=data.get('role', 'user'),
                is_active=True
            )
            user.set_password(data['password'])
            db.session.add(user)
            db.session.commit()
            
            return success_response(data={'user': user.to_dict()}, status_code=201)
            
        else:
            # Create Admin User (AdminUser model)
            # Check if user exists
            if AdminUser.query.filter_by(email=data['email']).first():
                return error_response('User already exists', code='CONFLICT', status_code=400)

            user = AdminUser(
                id=str(uuid.uuid4()),
                email=data['email'],
                first_name=data.get('first_name'),
                last_name=data.get('last_name'),
                role=data.get('role', 'support'),
                is_active=True
            )
            user.set_password(data['password'])
            db.session.add(user)
            db.session.commit()
            
            return success_response(data={'user': user.to_dict()}, status_code=201)
            
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create user error: {e}")
        return error_response(str(e), code='CREATE_FAILED', status_code=500)

@admin_bp.route('/users', methods=['GET'])
@unified_access(permission=AdminPermissions.USERS_READ)
def get_admin_users(ctx):
    """Get list of admin users"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        role_filter = request.args.get('role', '')
        
        query = AdminUser.query
        
        if search:
            query = query.filter(
                (AdminUser.email.ilike(f'%{search}%')) |
                (AdminUser.first_name.ilike(f'%{search}%')) |
                (AdminUser.last_name.ilike(f'%{search}%'))
            )
        
        if role_filter:
            query = query.filter_by(role=role_filter)
        
        total = query.count()
        users = query.offset((page - 1) * limit).limit(limit).all()
        
        return success_response(data={
            'users': [u.to_dict() for u in users],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'totalPages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        logger.error(f"Get admin users error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_bp.route('/users/all', methods=['GET'])
@unified_access(permission=AdminPermissions.USERS_READ)
def get_all_tenant_users(ctx):
    """Get list of ALL users from ALL tenants"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        
        from models.tenant import Tenant
        
        with UnboundSession():
            query = User.query
            
            if search:
                query = query.filter(
                    (User.email.ilike(f'%{search}%')) |
                    (User.first_name.ilike(f'%{search}%')) |
                    (User.last_name.ilike(f'%{search}%')) |
                    (User.username.ilike(f'%{search}%'))
                )
                
            total = query.count()
            users = query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        users_list = []
        for u in users:
            u_dict = u.to_dict()
            # Fetch tenant name
            if u.tenant_id:
                tenant = db.session.get(Tenant, u.tenant_id)
                if tenant:
                    u_dict['tenant_name'] = tenant.name
            users_list.append(u_dict)
        
        return success_response(data={
            'users': users_list,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'totalPages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        logger.error(f"Get all tenant users error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_bp.route('/users/all/<user_id>', methods=['PUT'])
@unified_access(permission=AdminPermissions.USERS_MANAGE)
def update_any_tenant_user(ctx, user_id):
    """Update any tenant user (Admin Panel)"""
    try:
        data = request.get_json()
        
        user = db.session.get(User, user_id)
        if not user:
             return error_response('User not found', code='NOT_FOUND', status_code=404)
            
        if 'isActive' in data:
            user.is_active = data['isActive']
        if 'email' in data:
            user.email = data['email']
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'role' in data:
            user.role = data['role']
        if 'password' in data and data['password']:
            user.set_password(data['password'])
            
        db.session.commit()
        
        return success_response(data=user.to_dict())
    except Exception as e:
        logger.error(f"Update any tenant user error: {e}")
        return error_response(str(e), code='UPDATE_FAILED', status_code=500)

# In-memory store for tickets (placeholder until model is created)
MOCK_TICKETS = []

@admin_bp.route('/tickets', methods=['GET'])
@unified_access(permission=AdminPermissions.TICKETS_READ)
def get_admin_tickets(ctx):
    """Get support tickets (placeholder)"""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    
    total = len(MOCK_TICKETS)
    start = (page - 1) * limit
    end = start + limit
    tickets = MOCK_TICKETS[start:end]
    
    return success_response(data={
        'tickets': tickets,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'totalPages': (total + limit - 1) // limit if limit > 0 else 0
        }
    })

@admin_bp.route('/tickets', methods=['POST'])
@unified_access(permission=AdminPermissions.TICKETS_MANAGE)
def create_admin_ticket(ctx):
    """Create support ticket (placeholder)"""
    try:
        data = request.get_json()
        
        if not data.get('subject') or not data.get('description'):
            return error_response('Subject and description are required', code='MISSING_FIELDS', status_code=400)
            
        current_user_id = ctx.principal_id
        
        ticket = {
            'id': str(uuid.uuid4()),
            'title': data['subject'], # Map subject to title for response
            'description': data['description'],
            'status': 'open',
            'priority': data.get('priority', 'medium'),
            'category': data.get('category', 'general'),
            'tenant_id': data.get('tenant_id'),
            'tenant_name': 'Demo Tenant', # Placeholder
            'created_by': current_user_id,
            'created_at': datetime.utcnow().isoformat(),
            'sla_due_date': (datetime.utcnow() + timedelta(days=1)).isoformat()
        }
        
        MOCK_TICKETS.insert(0, ticket) # Add to beginning
        
        return success_response(data={'ticket': ticket}, status_code=201)
        
    except Exception as e:
        logger.error(f"Create ticket error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_bp.route('/tickets/<ticket_id>', methods=['PUT'])
@unified_access(permission=AdminPermissions.TICKETS_MANAGE)
def update_admin_ticket(ctx, ticket_id):
    """Update support ticket (placeholder)"""
    try:
        data = request.get_json()
        
        # Find ticket in mock store
        ticket = next((t for t in MOCK_TICKETS if t['id'] == ticket_id), None)
        
        if not ticket:
             return error_response('Ticket not found', code='NOT_FOUND', status_code=404)
            
        # Update fields
        if 'status' in data:
            ticket['status'] = data['status']
        if 'assigned_to' in data:
            ticket['assigned_to'] = data['assigned_to']
            # Mock assigned admin name
            ticket['assigned_admin_name'] = 'Admin User' 
            
        return success_response(data={'ticket': ticket})
        
    except Exception as e:
        logger.error(f"Update ticket error: {e}")
        return error_response(str(e), code='UPDATE_FAILED', status_code=500)

@admin_bp.route('/tickets/<ticket_id>/responses', methods=['POST'])
@unified_access(permission=AdminPermissions.TICKETS_MANAGE)
def create_ticket_response(ctx, ticket_id):
    """Create response for support ticket (placeholder)"""
    try:
        data = request.get_json()
        message = data.get('message')
        
        if not message:
             return error_response('Message is required', code='MISSING_FIELD', status_code=400)
            
        # Find ticket in mock store
        ticket = next((t for t in MOCK_TICKETS if t['id'] == ticket_id), None)
        
        if not ticket:
             return error_response('Ticket not found', code='NOT_FOUND', status_code=404)
            
        return success_response(data={'message': 'Response added'}, status_code=201)
        
    except Exception as e:
        logger.error(f"Create ticket response error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)


# =============================================================================
# DEBUG / ROLE SWITCH ENDPOINTS (Only for admin@x-ear.com)
# =============================================================================

@admin_bp.route('/debug/switch-role', methods=['POST'])
@unified_access(permission=AdminPermissions.DEBUG_USE)
def debug_switch_role(ctx):
    """
    Switch to a different role for debugging purposes.
    Only available to admin@x-ear.com user.
    """
    # Check if debug mode is enabled (default: True for development)
    if getenv('ENABLE_DEBUG_ROLE_SWITCH', 'true').lower() != 'true':
        return error_response('Debug role switch is disabled', code='DEBUG_DISABLED', status_code=403)
    
    try:
        user_id = ctx.principal_id
        # We need to access AdminUser table to get email
        user = AdminUser.query.get(user_id)
        
        if not user:
            return error_response('User not found', 404)
        
        # Only admin@x-ear.com can use this feature (check real email if impersonating)
        real_email = ctx.claims.get('real_user_email') or user.email
        if real_email != DEBUG_ADMIN_EMAIL:
            return error_response('Bu özellik sadece sistem yöneticisi için kullanılabilir', 403)
        
        data = request.get_json() or {}
        target_role = data.get('targetRole')
        
        if not target_role:
            return error_response('targetRole is required', 400)
        
        # Validate target role exists
        role = Role.query.filter_by(name=target_role).first()
        if not role:
            return error_response(f'Role "{target_role}" not found', 404)
        
        # Get role permissions (DB)
        role_permissions_set = {p.name for p in role.permissions}

        # Merge with hardcoded tenant permissions (Code)
        try:
            from config.tenant_permissions import get_permissions_for_role
            code_permissions = get_permissions_for_role(target_role)
            logger.info(f"DEBUG: Found {len(code_permissions)} code permissions for {target_role}")
            role_permissions_set.update(code_permissions)
        except ImportError:
            logger.warning("Could not import get_permissions_for_role")
        
        role_permissions = list(role_permissions_set)
        logger.info(f"DEBUG: Final role permissions for token: {role_permissions}")
        
        # Always include debug permission for impersonating admin
        if 'platform.debug.use' not in role_permissions:
            role_permissions.append('platform.debug.use')
        
        # Create new JWT with impersonation claims
        additional_claims = {
            'effective_role': target_role,
            'real_user_id': user.id,
            'real_user_email': user.email,
            'is_impersonating': True,
            'role_permissions': role_permissions,
            # Keep admin privileges
            'user_type': 'admin',
            'role': user.role or 'super_admin',
        }
        
        # Determine tenant context
        tenant_id = user.tenant_id if hasattr(user, 'tenant_id') and user.tenant_id else None
        if not tenant_id:
            # Try to find a real tenant to use as context
            try:
                from models.tenant import Tenant
                first_tenant = Tenant.query.first()
                if first_tenant:
                    tenant_id = first_tenant.id
            except Exception as e:
                logger.warning(f"Could not fetch tenant for context: {e}")
        
        additional_claims['tenant_id'] = tenant_id or 'debug_tenant'
        
        # Preserve admin_ prefix for proper principal resolution
        admin_identity = user.id if user.id.startswith('admin_') else f'admin_{user.id}'
        
        access_token = create_access_token(
            identity=admin_identity,
            additional_claims=additional_claims
        )
        
        refresh_token = create_refresh_token(
            identity=admin_identity,
            additional_claims=additional_claims
        )
        
        logger.info(f"Role switch: {user.email} -> {target_role}")
        
        return success_response(data={
            'accessToken': access_token,
            'refreshToken': refresh_token,
            'effectiveRole': target_role,
            'roleDisplayName': {
                'tenant_admin': 'Tenant Admin',
                'admin': 'Yönetici',
                'odyolog': 'Odyolog',
                'odyometrist': 'Odyometrist',
                'secretary': 'Sekreter',
                'user': 'Kullanıcı',
            }.get(target_role, target_role),
            'permissions': role_permissions,
            'isImpersonating': True,
            'realUserEmail': user.email
        })
        
    except Exception as e:
        logger.error(f"Debug role switch error: {e}")
        return error_response(str(e), 500)


@admin_bp.route('/debug/available-roles', methods=['GET'])
@unified_access(permission=AdminPermissions.DEBUG_USE)
def debug_available_roles(ctx):
    """
    Get all available roles for debugging.
    Only available to admin@x-ear.com user.
    """
    if getenv('ENABLE_DEBUG_ROLE_SWITCH', 'true').lower() != 'true':
        return error_response('Debug role switch is disabled', 403)
    
    try:
        # Check permissions handled by unified_access already (AdminPermissions.DEBUG_USE)
        # But we still check email for extra safety as per req
        user_id = ctx.principal_id
        admin_user = AdminUser.query.get(user_id) # Using query to be safe with session attachment
        
        if not admin_user:
            return error_response('Unauthorized', 403)
        
        # Check real email if impersonating
        real_email = ctx.claims.get('real_user_email') or admin_user.email
        if real_email != DEBUG_ADMIN_EMAIL:
            return error_response('Unauthorized', 403)
        
        roles = Role.query.all()
        
        role_display_names = {
            'tenant_admin': 'Tenant Admin',
            'admin': 'Yönetici',
            'odyolog': 'Odyolog',
            'odyometrist': 'Odyometrist',
            'secretary': 'Sekreter',
            'user': 'Kullanıcı',
            'doctor': 'Doktor (Eski)',
        }
        
        return success_response(data={
            'roles': [
                {
                    'name': r.name,
                    'displayName': role_display_names.get(r.name, r.name),
                    'description': r.description,
                    'permissionCount': len(r.permissions)
                }
                for r in roles
            ]
        })
        
    except Exception as e:
        logger.error(f"Get available roles error: {e}")
        return error_response(str(e), 500)


@admin_bp.route('/debug/switch-tenant', methods=['POST'])
@unified_access(permission=AdminPermissions.DEBUG_USE)
def debug_switch_tenant(ctx):
    """
    Switch to a different tenant context for debugging purposes.
    Only available to admin@x-ear.com user.
    Returns a new JWT with the selected tenant_id.
    """
    # Check if debug mode is enabled
    if getenv('ENABLE_DEBUG_ROLE_SWITCH', 'true').lower() != 'true':
        return error_response('Debug tenant switch is disabled', code='DEBUG_DISABLED', status_code=403)
    
    try:
        user_id = ctx.principal_id
        user = AdminUser.query.get(user_id)
        
        if not user:
            return error_response('User not found', 404)
        
        # Only admin@x-ear.com can use this feature (check real email if impersonating)
        real_email = ctx.claims.get('real_user_email') or user.email
        if real_email != DEBUG_ADMIN_EMAIL:
            return error_response('Bu özellik sadece sistem yöneticisi için kullanılabilir', 403)
        
        data = request.get_json() or {}
        target_tenant_id = data.get('targetTenantId')
        
        if not target_tenant_id:
            return error_response('targetTenantId is required', 400)
        
        # Validate target tenant exists
        from models.tenant import Tenant
        tenant = Tenant.query.get(target_tenant_id)
        if not tenant:
            return error_response(f'Tenant "{target_tenant_id}" not found', 404)
        
        # Get current role permissions and add debug permission
        current_role_permissions = ctx.claims.get('role_permissions', [])
        if isinstance(current_role_permissions, list):
            role_permissions = list(current_role_permissions)
        else:
            role_permissions = []
        if 'platform.debug.use' not in role_permissions:
            role_permissions.append('platform.debug.use')
        
        # Create new JWT with tenant impersonation claims
        additional_claims = {
            'tenant_id': target_tenant_id,
            'effective_tenant_id': target_tenant_id,
            'real_user_id': user.id,
            'real_user_email': user.email,
            'is_impersonating_tenant': True,
            # Keep admin privileges
            'user_type': 'admin',
            'role': user.role or 'super_admin',
            # Keep current role if exists
            'effective_role': ctx.claims.get('effective_role', 'super_admin'),
            'is_impersonating': ctx.claims.get('is_impersonating', False),
            'role_permissions': role_permissions,
        }
        
        # Preserve admin_ prefix for proper principal resolution
        admin_identity = user.id if user.id.startswith('admin_') else f'admin_{user.id}'
        
        access_token = create_access_token(
            identity=admin_identity,
            additional_claims=additional_claims
        )
        
        refresh_token = create_refresh_token(
            identity=admin_identity,
            additional_claims=additional_claims
        )
        
        # Audit log
        logger.info(f"Tenant switch: {user.email} -> {tenant.name} ({target_tenant_id})")
        
        # Log to activity logs for audit trail
        try:
            from services.activity_logging import log_activity
            log_activity(
                action='TENANT_IMPERSONATION',
                resource_type='tenant',
                resource_id=target_tenant_id,
                details={
                    'admin_user_id': user.id,
                    'admin_email': user.email,
                    'target_tenant_id': target_tenant_id,
                    'tenant_name': tenant.name,
                    'ip': request.remote_addr,
                    'user_agent': request.headers.get('User-Agent')
                }
            )
        except Exception as log_error:
            logger.warning(f"Failed to log tenant impersonation: {log_error}")
        
        return success_response(data={
            'accessToken': access_token,
            'refreshToken': refresh_token,
            'effectiveTenantId': target_tenant_id,
            'tenantName': tenant.name,
            'tenantStatus': tenant.status,
            'isImpersonatingTenant': True,
            'realUserEmail': user.email
        })
        
    except Exception as e:
        logger.error(f"Debug tenant switch error: {e}")
        return error_response(str(e), 500)


@admin_bp.route('/debug/exit-impersonation', methods=['POST'])
@unified_access(permission=AdminPermissions.DEBUG_USE)
def debug_exit_impersonation(ctx):
    """
    Exit tenant/role impersonation and return to normal admin mode.
    Only available to admin@x-ear.com user.
    """
    try:
        user_id = ctx.principal_id
        user = AdminUser.query.get(user_id)
        
        if not user:
            return error_response('User not found', 404)
        
        # Check real email if impersonating
        real_email = ctx.claims.get('real_user_email') or user.email
        if real_email != DEBUG_ADMIN_EMAIL:
            return error_response('Bu özellik sadece sistem yöneticisi için kullanılabilir', 403)
        
        # Create clean JWT without impersonation
        additional_claims = {
            'role': 'super_admin',
            'user_type': 'admin'
        }
        
        # Preserve admin_ prefix for proper principal resolution
        admin_identity = user.id if user.id.startswith('admin_') else f'admin_{user.id}'
        
        access_token = create_access_token(
            identity=admin_identity,
            additional_claims=additional_claims
        )
        
        refresh_token = create_refresh_token(
            identity=admin_identity,
            additional_claims=additional_claims
        )
        
        logger.info(f"Exit impersonation: {user.email}")
        
        return success_response(data={
            'accessToken': access_token,
            'refreshToken': refresh_token,
            'message': 'Exited impersonation mode'
        })
        
    except Exception as e:
        logger.error(f"Exit impersonation error: {e}")
        return error_response(str(e), 500)


@admin_bp.route('/debug/page-permissions/<page_key>', methods=['GET'])
@unified_access(permission=AdminPermissions.DEBUG_USE)
def debug_page_permissions(ctx, page_key):
    """
    Get permissions for a specific page based on the effective role.
    Only available to admin@x-ear.com user.
    """
    if getenv('ENABLE_DEBUG_ROLE_SWITCH', 'true').lower() != 'true':
        return error_response('Debug role switch is disabled', 403)
    
    try:
        user_id = ctx.principal_id
        admin_user = AdminUser.query.get(user_id)
        
        # get_jwt() is replaced by ctx.claims
        jwt_claims = ctx.claims
        
        if not admin_user:
            return error_response('Unauthorized', 403)
        
        # Check real email if impersonating
        real_email = ctx.claims.get('real_user_email') or admin_user.email
        if real_email != DEBUG_ADMIN_EMAIL:
            return error_response('Unauthorized', 403)
        
        # Get role from query param or JWT
        role_name = request.args.get('role') or jwt_claims.get('effective_role') or admin_user.role
        # Note: admin_user.role might be 'SUPER_ADMIN' which doesn't map to tenant roles directly
        # But this endpoint seems to simulate tenant roles.
        
        if page_key not in PAGE_PERMISSION_MAP:
             return error_response(f'Unknown page: {page_key}', 404)
        
        # Get role permissions
        role = Role.query.filter_by(name=role_name).first()
        role_permissions = set()
        
        if role:
            role_permissions = {p.name for p in role.permissions}
        elif role_name == 'tenant_admin':
            # Tenant admin has all permissions
            from models.permission import Permission
            role_permissions = {p.name for p in Permission.query.all()}
        
        # Build response with allowed/denied status
        page_perms = PAGE_PERMISSION_MAP[page_key]
        actions = []
        
        for perm in page_perms:
            actions.append({
                'code': perm['code'],
                'label': perm['label'],
                'allowed': perm['code'] in role_permissions
            })
        
        return success_response(data={'permissions': actions})
        
    except Exception as e:
        logger.error(f"Debug permissions error: {e}")
        return error_response(str(e), 500)
