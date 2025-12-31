from flask import Blueprint, request, jsonify
from models.base import db
from models.user import User
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction
from utils.authorization import admin_required
from flask_jwt_extended import jwt_required, get_jwt_identity

users_bp = Blueprint('users', __name__)


@users_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    
    # Get current user's tenant_id to filter users
    user_id = get_jwt_identity()
    current_user = db.session.get(User, user_id)
    if not current_user:
        return jsonify({'success': False, 'error': 'User not found'}), 401
    
    # Build query - filter by tenant first, then paginate
    # Use select() for SQLAlchemy 2.x style
    from sqlalchemy import select, func
    
    # Base filter for tenant
    base_filter = User.tenant_id == current_user.tenant_id if current_user.tenant_id else True
    
    # Get total count
    count_stmt = select(func.count()).select_from(User).where(base_filter)
    total = db.session.execute(count_stmt).scalar()
    
    # Get paginated results
    offset = (page - 1) * per_page
    stmt = select(User).where(base_filter).order_by(User.created_at.desc()).limit(per_page).offset(offset)
    users_list = db.session.execute(stmt).scalars().all()
    users = [u.to_dict() for u in users_list]
    
    total_pages = (total + per_page - 1) // per_page
    return jsonify({'success': True, 'data': users, 'meta': {'total': total, 'page': page, 'perPage': per_page, 'totalPages': total_pages}})


@users_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json() or {}
    required = ['username', 'password']
    if not all(k in data for k in required):
        return jsonify({'success': False, 'error': 'username and password required'}), 400

    current_user_id = get_jwt_identity()
    current_user = db.session.get(User, current_user_id)
    if not current_user:
         return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    # Check Tenant limits if applicable
    if current_user.tenant_id:
        try:
            from models.tenant import Tenant
            tenant = db.session.get(Tenant, current_user.tenant_id)
            if tenant:
                existing_users_count = User.query.filter_by(tenant_id=current_user.tenant_id).count()
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
    u.tenant_id = current_user.tenant_id # Ensure tenant inheritance
    u.set_password(data['password'])
    
    # Handle branch assignment if provided and user is tenant_admin
    if 'branchId' in data and current_user.tenant_id:
         # Basic branch validation logic could go here
         pass

    db.session.add(u)
    if current_user.tenant_id and tenant:
        tenant.current_users = existing_users_count + 1
        
    db.session.commit()
    return jsonify({'success': True, 'data': u.to_dict()}), 201


@users_bp.route('/users/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'success': False, 'error': 'Not found'}), 404

    # Build app-scoped roles and permissions
    apps = {}
    for ur in user.app_roles:
        a = ur.app
        if not a:
            continue
        entry = apps.get(a.id) or {'appId': a.id, 'appSlug': a.slug, 'roles': [], 'permissions': []}
        entry['roles'].append(ur.role.name if ur.role else ur.role_id)
        # collect permissions via role
        if ur.role and ur.role.permissions:
            entry['permissions'].extend([p.name for p in ur.role.permissions])
        apps[a.id] = entry

    # dedupe permission lists
    for k in apps:
        apps[k]['permissions'] = sorted(list(set(apps[k]['permissions'])))

    # global permissions derived from user.role (admin shortcut)
    global_permissions = []
    if user.role == 'admin':
        global_permissions = ['*']

    payload = user.to_dict()
    payload['apps'] = list(apps.values())
    payload['globalPermissions'] = global_permissions
    return jsonify({'success': True, 'data': payload}), 200


@users_bp.route('/users/me', methods=['PUT'])
@jwt_required()
def update_me():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'success': False, 'error': 'Not found'}), 404

    data = request.get_json() or {}
    
    if 'firstName' in data: user.first_name = data['firstName']
    if 'lastName' in data: user.last_name = data['lastName']
    if 'email' in data: user.email = data['email']
    if 'username' in data: user.username = data['username']
    
    db.session.commit()
    return jsonify({'success': True, 'data': user.to_dict()})


@users_bp.route('/users/me/password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'success': False, 'error': 'Not found'}), 404

    try:
        data = request.get_json() or {}
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')

        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Password change attempt for user_id={user_id}")

        if not current_password or not new_password:
            return jsonify({'success': False, 'error': 'Missing fields'}), 400

        # Debug check
        is_valid = user.check_password(current_password)
        logger.info(f"Password check result for {user.username}: {is_valid}")
        
        if not is_valid:
            # Helper to see what current hash looks like (first few chars)
            hash_preview = user.password_hash[:10] if user.password_hash else 'NONE'
            logger.info(f"Invalid password. Stored hash starts with: {hash_preview}")
            return jsonify({'success': False, 'error': 'Invalid current password'}), 403

        user.set_password(new_password)
        db.session.commit()
        logger.info("Password updated successfully.")
        return jsonify({'success': True, 'message': 'Password updated'})
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Change password error: {e}")
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@users_bp.route('/users/<user_id>', methods=['PUT'])
@jwt_required()
@idempotent(methods=['PUT'])
@optimistic_lock(User, id_param='user_id')
@with_transaction
def update_user(user_id):
    current_id = get_jwt_identity()
    current = db.session.get(User, current_id)
    if not current:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    # Only admin or the owner can update
    if current.role != 'admin' and current_id != user_id:
        return jsonify({'success': False, 'error': 'Forbidden'}), 403

    data = request.get_json() or {}
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'success': False, 'error': 'Not found'}), 404

    # Allow limited fields
    if 'firstName' in data: user.first_name = data['firstName']
    if 'lastName' in data: user.last_name = data['lastName']
    if 'email' in data: user.email = data['email']
    if 'role' in data and current.role == 'admin': user.role = data['role']
    if 'password' in data:
        user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()
    return jsonify({'success': True, 'data': user.to_dict()})


@users_bp.route('/users/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'success': False, 'error': 'Not found'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Deleted'})
