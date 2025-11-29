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
    pagination = User.query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    users = [u.to_dict() for u in pagination.items]
    return jsonify({'success': True, 'data': users, 'meta': {'total': pagination.total, 'page': page, 'perPage': per_page, 'totalPages': pagination.pages}})


@users_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json() or {}
    required = ['username', 'password']
    if not all(k in data for k in required):
        return jsonify({'success': False, 'error': 'username and password required'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'success': False, 'error': 'username already exists'}), 409

    u = User()
    u.username = data['username']
    u.email = data.get('email')
    u.first_name = data.get('firstName')
    u.last_name = data.get('lastName')
    u.role = data.get('role', 'user')
    u.set_password(data['password'])

    db.session.add(u)
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
    # Email update usually requires verification, skipping for now or allow if simple
    
    db.session.commit()
    return jsonify({'success': True, 'data': user.to_dict()})


@users_bp.route('/users/me/password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'success': False, 'error': 'Not found'}), 404

    data = request.get_json() or {}
    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')

    if not current_password or not new_password:
        return jsonify({'success': False, 'error': 'Missing fields'}), 400

    if not user.check_password(current_password):
        return jsonify({'success': False, 'error': 'Invalid current password'}), 401

    user.set_password(new_password)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Password updated'})


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
