from flask import Blueprint, request, jsonify
from models.base import db
from models.user import User
from models.app import App
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction
from utils.authorization import admin_required, permission_required, can
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.validation import normalize_slug, is_valid_slug

apps_bp = Blueprint('apps', __name__)


@apps_bp.route('/apps', methods=['GET'])
@admin_required
def list_apps():
    apps = App.query.order_by(App.name).all()
    return jsonify({'success': True, 'data': [a.to_dict() for a in apps]})


@apps_bp.route('/apps', methods=['POST'])
@admin_required
def create_app():
    data = request.get_json() or {}
    if not data.get('name') or not data.get('slug'):
        return jsonify({'success': False, 'error': 'name and slug required'}), 400
    slug = normalize_slug(data['slug'])
    if not is_valid_slug(slug):
        return jsonify({'success': False, 'error': 'invalid slug format'}), 400
    if App.query.filter_by(slug=slug).first():
        return jsonify({'success': False, 'error': 'slug already exists'}), 409
    a = App()
    a.name = data['name']
    a.slug = slug
    a.description = data.get('description')
    db.session.add(a)
    db.session.commit()
    return jsonify({'success': True, 'data': a.to_dict()}), 201


@apps_bp.route('/apps/<app_id>', methods=['GET'])
@jwt_required()
def get_app(app_id):
    app_rec = db.session.get(App, app_id)
    if not app_rec:
        return jsonify({'success': False, 'error': 'Not found'}), 404
    return jsonify({'success': True, 'data': app_rec.to_dict()})


@apps_bp.route('/apps/<app_id>', methods=['PUT'])
@jwt_required()
@idempotent(methods=['PUT'])
@optimistic_lock(App, id_param='app_id')
@with_transaction
def update_app(app_id):
    # Only app owner or global admin can update
    user_id = get_jwt_identity()
    current = db.session.get(User, user_id)
    app_rec = db.session.get(App, app_id)
    if not app_rec:
        return jsonify({'success': False, 'error': 'Not found'}), 404
    # Owner or global admin
    if current.role != 'admin' and app_rec.owner_user_id != current.id:
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    data = request.get_json() or {}
    if 'name' in data: app_rec.name = data['name']
    if 'description' in data: app_rec.description = data['description']
    if 'ownerUserId' in data and current.role == 'admin':
        app_rec.owner_user_id = data['ownerUserId']
    db.session.add(app_rec)
    db.session.commit()
    return jsonify({'success': True, 'data': app_rec.to_dict()})


@apps_bp.route('/apps/<app_id>/assign', methods=['POST'])
@permission_required('users:manage', app_id_arg='app_id')
def assign_role_to_user(app_id):
    data = request.get_json() or {}
    user_id = data.get('userId')
    role_name = data.get('role')
    if not user_id or not role_name:
        return jsonify({'success': False, 'error': 'userId and role required'}), 400
    u = db.session.get(User, user_id)
    if not u:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    role = Role.query.filter_by(name=role_name).one_or_none()
    if not role:
        return jsonify({'success': False, 'error': 'Role not found'}), 404
    existing = UserAppRole.query.filter_by(user_id=user_id, app_id=app_id, role_id=role.id).one_or_none()
    if existing:
        return jsonify({'success': False, 'error': 'Assignment already exists'}), 409
    uar = UserAppRole()
    uar.user_id = user_id
    uar.app_id = app_id
    uar.role_id = role.id
    db.session.add(uar)
    db.session.commit()
    # Activity log: role assignment
    try:
        from backend.app import log_activity
        log_activity(get_jwt_identity(), 'assign_role', 'app', entity_id=app_id, details={'assignedUser': user_id, 'role': role_name})
    except Exception:
        pass
    return jsonify({'success': True, 'data': uar.to_dict()}), 201


@apps_bp.route('/apps/<app_id>/transfer_ownership', methods=['POST'])
@jwt_required()
def transfer_ownership(app_id):
    user_id = get_jwt_identity()
    current = db.session.get(User, user_id)
    app_rec = db.session.get(App, app_id)
    if not app_rec:
        return jsonify({'success': False, 'error': 'Not found'}), 404
    # Only current owner or admin can transfer
    if current.role != 'admin' and app_rec.owner_user_id != current.id:
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    data = request.get_json() or {}
    new_owner = data.get('ownerUserId')
    if not new_owner:
        return jsonify({'success': False, 'error': 'ownerUserId required'}), 400
    u = db.session.get(User, new_owner)
    if not u:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    app_rec.owner_user_id = new_owner
    db.session.add(app_rec)
    db.session.commit()
    try:
        from backend.app import log_activity
        log_activity(user_id, 'transfer_ownership', 'app', entity_id=app_id, details={'from': current.id, 'to': new_owner})
    except Exception:
        pass
    return jsonify({'success': True, 'data': app_rec.to_dict()})


@apps_bp.route('/apps/<app_id>', methods=['DELETE'])
@jwt_required()
def delete_app(app_id):
    user_id = get_jwt_identity()
    current = db.session.get(User, user_id)
    app_rec = db.session.get(App, app_id)
    if not app_rec:
        return jsonify({'success': False, 'error': 'Not found'}), 404
    # Only owner or global admin can delete an app
    if current.role != 'admin' and app_rec.owner_user_id != current.id:
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    db.session.delete(app_rec)
    db.session.commit()
    try:
        from backend.app import log_activity
        log_activity(user_id, 'delete_app', 'app', entity_id=app_id, details={'deletedBy': user_id})
    except Exception:
        pass
    return jsonify({'success': True, 'message': 'Deleted'})
