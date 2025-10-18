from flask import Blueprint, request, jsonify
from models.base import db
from utils.authorization import admin_required
from utils.validation import is_valid_role_name

roles_bp = Blueprint('roles', __name__)


@roles_bp.route('/roles', methods=['GET'])
@admin_required
def list_roles():
    roles = Role.query.order_by(Role.name).all()
    return jsonify({'success': True, 'data': [r.to_dict() for r in roles]})


@roles_bp.route('/roles', methods=['POST'])
@admin_required
def create_role():
    data = request.get_json() or {}
    if not data.get('name'):
        return jsonify({'success': False, 'error': 'name required'}), 400
    if not is_valid_role_name(data['name']):
        return jsonify({'success': False, 'error': 'invalid role name'}), 400
    if Role.query.filter_by(name=data['name']).first():
        return jsonify({'success': False, 'error': 'role exists'}), 409
    r = Role()
    r.name = data['name']
    r.description = data.get('description')
    r.is_system = data.get('isSystem', False)
    db.session.add(r)
    db.session.commit()
    return jsonify({'success': True, 'data': r.to_dict()}), 201


@roles_bp.route('/roles/<role_id>/permissions', methods=['POST'])
@admin_required
def add_permission_to_role(role_id):
    data = request.get_json() or {}
    pname = data.get('permission')
    if not pname:
        return jsonify({'success': False, 'error': 'permission required'}), 400
    
    role = db.session.get(Role, role_id)
    if not role:
        return jsonify({'success': False, 'error': 'role not found'}), 404
    perm = Permission.query.filter_by(name=pname).one_or_none()
    if not perm:
        return jsonify({'success': False, 'error': 'permission not found'}), 404
    if perm in role.permissions:
        return jsonify({'success': False, 'error': 'permission already assigned'}), 409
    role.permissions.append(perm)
    db.session.add(role)
    db.session.commit()
    return jsonify({'success': True, 'data': role.to_dict()})


@roles_bp.route('/roles/<role_id>/permissions/<permission_id>', methods=['DELETE'])
@admin_required
def remove_permission_from_role(role_id, permission_id):
    role = db.session.get(Role, role_id)
    if not role:
        return jsonify({'success': False, 'error': 'role not found'}), 404
    
    perm = db.session.get(Permission, permission_id)
    if not perm:
        return jsonify({'success': False, 'error': 'permission not found'}), 404
    if perm not in role.permissions:
        return jsonify({'success': False, 'error': 'permission not assigned'}), 404
    role.permissions.remove(perm)
    db.session.add(role)
    db.session.commit()
    return jsonify({'success': True, 'data': role.to_dict()})
