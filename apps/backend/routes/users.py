"""
Users Management
----------------
User profile and management with unified access control.
"""

from flask import Blueprint, request, jsonify
from models.base import db
from models.user import User
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction
from utils.decorators import unified_access
from utils.query_policy import tenant_scoped_query, get_or_404_scoped
import logging

logger = logging.getLogger(__name__)

users_bp = Blueprint('users', __name__)


@users_bp.route('/users', methods=['GET'])
@unified_access(resource='users', action='read')
def list_users(ctx):
    """List users - Unified Access"""
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    
    # Only admins can list users
    if not ctx.is_super_admin and not ctx.is_tenant_admin:
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    
    from sqlalchemy import select, func
    
    query = tenant_scoped_query(ctx, User)
    total = query.count()
    
    offset = (page - 1) * per_page
    users_list = query.order_by(User.created_at.desc()).limit(per_page).offset(offset).all()
    users = [u.to_dict() for u in users_list]
    
    total_pages = (total + per_page - 1) // per_page
    return jsonify({'success': True, 'data': users, 'meta': {'total': total, 'page': page, 'perPage': per_page, 'totalPages': total_pages}})


@users_bp.route('/users', methods=['POST'])
@unified_access(resource='users', action='write')
def create_user(ctx):
    """Create user - Unified Access"""
    # Only admins can create users
    if not ctx.is_super_admin and not ctx.is_tenant_admin:
        return jsonify({'success': False, 'error': 'Forbidden'}), 403

    data = request.get_json() or {}
    required = ['username', 'password']
    if not all(k in data for k in required):
        return jsonify({'success': False, 'error': 'username and password required'}), 400

    tenant_id = ctx.tenant_id
    if not tenant_id:
        tenant_id = data.get('tenant_id')
        if not tenant_id:
            return jsonify({'success': False, 'error': 'tenant_id is required for super admin operations'}), 400

    # Check Tenant limits
    try:
        from models.tenant import Tenant
        tenant = db.session.get(Tenant, tenant_id)
        if tenant:
            existing_users_count = User.query.filter_by(tenant_id=tenant_id).count()
            if existing_users_count >= (tenant.max_users or 5):
                return jsonify({'success': False, 'error': f'User limit reached. Your plan allows {tenant.max_users} users.'}), 403
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error checking user limits: {str(e)}'}), 500

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'success': False, 'error': 'username already exists'}), 409

    u = User()
    u.username = data['username']
    u.email = data.get('email')
    u.first_name = data.get('firstName')
    u.last_name = data.get('lastName')
    u.role = data.get('role', 'user')
    u.tenant_id = tenant_id
    u.set_password(data['password'])

    db.session.add(u)
    if tenant:
        tenant.current_users = existing_users_count + 1
        
    db.session.commit()
    
    logger.info(f"User created: {u.id} by {ctx.principal_id}")
    return jsonify({'success': True, 'data': u.to_dict()}), 201


@users_bp.route('/users/me', methods=['GET'])
@unified_access()  # No permission required - self access
def get_me(ctx):
    """Get current user profile - Unified Access"""
    # 1. Helper function to build response
    def build_payload(u_obj, is_admin_user=False):
        payload = u_obj.to_dict()
        
        # Super Admins (AdminUser) might not have 'username' or 'role' fields in to_dict() depending on model
        if is_admin_user:
            payload['role'] = 'super_admin'
            payload['globalPermissions'] = ['*']
            payload['apps'] = [] # Admin has access to everything, no specific app roles needed for now
            return payload

        # Tenant Users
        apps = {}
        if hasattr(u_obj, 'app_roles'):
            for ur in u_obj.app_roles:
                a = ur.app
                if not a:
                    continue
                entry = apps.get(a.id) or {'appId': a.id, 'appSlug': a.slug, 'roles': [], 'permissions': []}
                entry['roles'].append(ur.role.name if ur.role else ur.role_id)
                if ur.role and ur.role.permissions:
                    entry['permissions'].extend([p.name for p in ur.role.permissions])
                apps[a.id] = entry

        for k in apps:
            apps[k]['permissions'] = sorted(list(set(apps[k]['permissions'])))

        global_permissions = []
        if u_obj.role == 'admin':
            global_permissions = ['*']

        payload['apps'] = list(apps.values())
        payload['globalPermissions'] = global_permissions
        return payload

    # 2. Check if Standard User
    user = ctx.user
    if user:
        return jsonify({'success': True, 'data': build_payload(user, is_admin_user=False)}), 200
        
    # 3. Check if Super Admin (AdminUser)
    admin = ctx.admin
    if admin:
        return jsonify({'success': True, 'data': build_payload(admin, is_admin_user=True)}), 200

    # If is_super_admin but ctx.admin is None, user might be in users table with role='super_admin'
    if ctx.is_super_admin and ctx._principal and ctx._principal.user:
        return jsonify({'success': True, 'data': build_payload(ctx._principal.user, is_admin_user=True)}), 200

    return jsonify({'success': False, 'error': 'Not found'}), 404



@users_bp.route('/users/me', methods=['PUT'])
@unified_access()  # No permission required - self access
def update_me(ctx):
    """Update current user profile - Unified Access"""
    data = request.get_json() or {}
    
    # 1. Update Standard User
    user = ctx.user
    if user:
        if 'firstName' in data: user.first_name = data['firstName']
        if 'lastName' in data: user.last_name = data['lastName']
        if 'email' in data: user.email = data['email']
        if 'username' in data: user.username = data['username']
        db.session.commit()
        return jsonify({'success': True, 'data': user.to_dict()})

    # 2. Update Super Admin
    admin = ctx.admin
    if admin:
        # Check what fields AdminUser supports. Assuming basics.
        if 'firstName' in data: admin.first_name = data['firstName']
        if 'lastName' in data: admin.last_name = data['lastName']
        if 'email' in data: admin.email = data['email']
        if 'username' in data: admin.username = data['username'] # If AdminUser has username
        db.session.commit()
        return jsonify({'success': True, 'data': admin.to_dict()})

    return jsonify({'success': False, 'error': 'Not found'}), 404


@users_bp.route('/users/me/password', methods=['POST'])
@unified_access()  # No permission required - self access
def change_password(ctx):
    """Change password - Unified Access"""
    user = ctx.user
    admin = ctx.admin
    
    subject = user or admin
    if not subject:
        return jsonify({'success': False, 'error': 'Not found'}), 404

    try:
        data = request.get_json() or {}
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')

        username = getattr(subject, 'username', getattr(subject, 'email', 'unknown'))
        logger.info(f"Password change attempt for {username}")

        if not current_password or not new_password:
            return jsonify({'success': False, 'error': 'Missing fields'}), 400

        is_valid = subject.check_password(current_password)
        logger.info(f"Password check result for {username}: {is_valid}")
        
        if not is_valid:
            return jsonify({'success': False, 'error': 'Invalid current password'}), 403

        subject.set_password(new_password)
        db.session.commit()
        logger.info("Password updated successfully.")
        return jsonify({'success': True, 'message': 'Password updated'})
    except Exception as e:
        logger.error(f"Change password error: {e}")
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@users_bp.route('/users/<user_id>', methods=['PUT'])
@unified_access(resource='users', action='write')
@idempotent(methods=['PUT'])
@optimistic_lock(User, id_param='user_id')
@with_transaction
def update_user(ctx, user_id):
    """Update user - Unified Access"""
    # Only admin or the user themselves can update
    if not ctx.is_super_admin and not ctx.is_tenant_admin and ctx.principal_id != user_id:
        return jsonify({'success': False, 'error': 'Forbidden'}), 403

    data = request.get_json() or {}
    user = get_or_404_scoped(ctx, User, user_id)
    if not user:
        return jsonify({'success': False, 'error': 'Not found'}), 404

    if 'firstName' in data: user.first_name = data['firstName']
    if 'lastName' in data: user.last_name = data['lastName']
    if 'email' in data: user.email = data['email']
    if 'role' in data and (ctx.is_super_admin or ctx.is_tenant_admin): 
        user.role = data['role']
    if 'password' in data:
        user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()
    return jsonify({'success': True, 'data': user.to_dict()})


@users_bp.route('/users/<user_id>', methods=['DELETE'])
@unified_access(resource='users', action='delete')
def delete_user(ctx, user_id):
    """Delete user - Unified Access"""
    if not ctx.is_super_admin and not ctx.is_tenant_admin:
        return jsonify({'success': False, 'error': 'Forbidden'}), 403

    user = get_or_404_scoped(ctx, User, user_id)
    if not user:
        return jsonify({'success': False, 'error': 'Not found'}), 404
        
    db.session.delete(user)
    db.session.commit()
    
    logger.info(f"User deleted: {user_id} by {ctx.principal_id}")
    return jsonify({'success': True, 'message': 'Deleted'})
