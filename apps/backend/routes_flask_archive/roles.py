from flask import Blueprint, request, jsonify
from models.base import db
from models.role import Role
from models.permission import Permission
from utils.decorators import unified_access
from utils.validation import is_valid_role_name

roles_bp = Blueprint('roles', __name__)


@roles_bp.route('/roles', methods=['GET'])
@unified_access(permission='role:read')
def list_roles(ctx):
    """
    Get all roles
    ---
    tags:
      - Roles
    responses:
      200:
        description: List of roles
    """
    roles = Role.query.order_by(Role.name).all()
    return jsonify({'success': True, 'data': [r.to_dict() for r in roles]})


@roles_bp.route('/roles', methods=['POST'])
@unified_access(permission='role:write')
def create_role(ctx):
    """
    Create a new role
    ---
    tags:
      - Roles
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
            description:
              type: string
    responses:
      201:
        description: Role created
    """
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


@roles_bp.route('/roles/<role_id>', methods=['PUT'])
@unified_access(permission='role:write')
def update_role(ctx, role_id):
    """
    Update a role
    ---
    tags:
      - Roles
    parameters:
      - name: role_id
        in: path
        type: string
        required: true
      - name: body
        in: body
        schema:
          type: object
    responses:
      200:
        description: Role updated
    """
    role = db.session.get(Role, role_id)
    if not role:
        return jsonify({'success': False, 'error': 'role not found'}), 404
    
    data = request.get_json() or {}
    if 'name' in data:
        if not is_valid_role_name(data['name']):
            return jsonify({'success': False, 'error': 'invalid role name'}), 400
        # Check if another role with this name exists
        existing = Role.query.filter_by(name=data['name']).first()
        if existing and existing.id != role_id:
            return jsonify({'success': False, 'error': 'role name already exists'}), 409
        role.name = data['name']
    
    if 'description' in data:
        role.description = data['description']
    
    db.session.add(role)
    db.session.commit()
    return jsonify({'success': True, 'data': role.to_dict()})


@roles_bp.route('/roles/<role_id>', methods=['DELETE'])
@unified_access(permission='role:write')
def delete_role(ctx, role_id):
    """
    Delete a role
    ---
    tags:
      - Roles
    parameters:
      - name: role_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Role deleted
    """
    role = db.session.get(Role, role_id)
    if not role:
        return jsonify({'success': False, 'error': 'role not found'}), 404
    
    if role.is_system:
        # Prevent deletion of system roles, even by admin
        return jsonify({'success': False, 'error': 'cannot delete system role'}), 403
    
    db.session.delete(role)
    db.session.commit()
    return jsonify({'success': True, 'message': 'role deleted'})


@roles_bp.route('/roles/<role_id>/permissions', methods=['POST'])
@unified_access(permission='role:write')
def add_permission_to_role(ctx, role_id):
    """
    Add permission to role
    ---
    tags:
      - Roles
    parameters:
      - name: role_id
        in: path
        type: string
        required: true
      - name: body
        in: body
        schema:
          type: object
    responses:
      200:
        description: Permission added
    """
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
@unified_access(permission='role:write')
def remove_permission_from_role(ctx, role_id, permission_id):
    """
    Remove permission from role
    ---
    tags:
      - Roles
    parameters:
      - name: role_id
        in: path
        type: string
        required: true
      - name: permission_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Permission removed
    """
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
