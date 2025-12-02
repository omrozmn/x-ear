from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.permission import Permission
from models.user import User
from models.role import Role
from utils.authorization import admin_required
from utils.validation import is_valid_permission_name

permissions_bp = Blueprint('permissions', __name__)


# Permission categories for frontend grouping
PERMISSION_CATEGORIES = {
    'patients': {'label': 'Hastalar', 'icon': 'users'},
    'sales': {'label': 'Satışlar', 'icon': 'shopping-cart'},
    'finance': {'label': 'Finans', 'icon': 'dollar-sign'},
    'invoices': {'label': 'Faturalar', 'icon': 'file-text'},
    'devices': {'label': 'Cihazlar', 'icon': 'headphones'},
    'inventory': {'label': 'Stok', 'icon': 'package'},
    'campaigns': {'label': 'Kampanyalar', 'icon': 'megaphone'},
    'sgk': {'label': 'SGK', 'icon': 'shield'},
    'settings': {'label': 'Ayarlar', 'icon': 'settings'},
    'team': {'label': 'Ekip', 'icon': 'users-round'},
    'reports': {'label': 'Raporlar', 'icon': 'bar-chart'},
    'dashboard': {'label': 'Dashboard', 'icon': 'layout-dashboard'},
}


@permissions_bp.route('/permissions', methods=['GET'])
@admin_required
def list_permissions():
    """List all permissions, grouped by category"""
    perms = Permission.query.order_by(Permission.name).all()
    
    # Group permissions by category
    grouped = {}
    ungrouped = []
    
    for p in perms:
        pdict = p.to_dict()
        # Extract category from permission name (e.g., 'patients.view' -> 'patients')
        if '.' in p.name:
            category = p.name.split('.')[0]
            if category in PERMISSION_CATEGORIES:
                if category not in grouped:
                    grouped[category] = {
                        'category': category,
                        'label': PERMISSION_CATEGORIES[category]['label'],
                        'icon': PERMISSION_CATEGORIES[category]['icon'],
                        'permissions': []
                    }
                grouped[category]['permissions'].append(pdict)
            else:
                ungrouped.append(pdict)
        else:
            ungrouped.append(pdict)
    
    # Convert to list
    result = list(grouped.values())
    if ungrouped:
        result.append({
            'category': 'other',
            'label': 'Diğer',
            'icon': 'more-horizontal',
            'permissions': ungrouped
        })
    
    return jsonify({
        'success': True, 
        'data': result,
        'all': [p.to_dict() for p in perms]  # Also return flat list
    })


@permissions_bp.route('/permissions/my', methods=['GET'])
@jwt_required()
def get_my_permissions():
    """Get current user's permissions based on their role"""
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    # Super admin has all permissions
    if user.role == 'admin':
        perms = Permission.query.order_by(Permission.name).all()
        return jsonify({
            'success': True,
            'data': {
                'permissions': [p.name for p in perms],
                'role': user.role,
                'isSuperAdmin': True
            }
        })
    
    # Get role and its permissions
    role = Role.query.filter_by(name=user.role).one_or_none()
    if not role:
        return jsonify({
            'success': True,
            'data': {
                'permissions': [],
                'role': user.role,
                'isSuperAdmin': False
            }
        })
    
    return jsonify({
        'success': True,
        'data': {
            'permissions': [p.name for p in role.permissions],
            'role': user.role,
            'isSuperAdmin': False
        }
    })


@permissions_bp.route('/permissions/role/<role_name>', methods=['GET'])
@admin_required
def get_role_permissions(role_name):
    """Get permissions for a specific role"""
    role = Role.query.filter_by(name=role_name).one_or_none()
    if not role:
        return jsonify({'success': False, 'error': 'Role not found'}), 404
    
    return jsonify({
        'success': True,
        'data': {
            'role': role.to_dict(),
            'permissions': [p.name for p in role.permissions]
        }
    })


@permissions_bp.route('/permissions/role/<role_name>', methods=['PUT'])
@admin_required
def update_role_permissions(role_name):
    """Update permissions for a role (bulk update)"""
    role = Role.query.filter_by(name=role_name).one_or_none()
    if not role:
        return jsonify({'success': False, 'error': 'Role not found'}), 404
    
    data = request.get_json() or {}
    permission_names = data.get('permissions', [])
    
    # Clear existing permissions
    role.permissions.clear()
    
    # Add new permissions
    for pname in permission_names:
        perm = Permission.query.filter_by(name=pname).one_or_none()
        if perm:
            role.permissions.append(perm)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'data': {
            'role': role.to_dict(),
            'permissions': [p.name for p in role.permissions]
        }
    })


@permissions_bp.route('/permissions', methods=['POST'])
@admin_required
def create_permission():
    data = request.get_json() or {}
    if not data.get('name'):
        return jsonify({'success': False, 'error': 'name required'}), 400
    if not is_valid_permission_name(data['name']):
        return jsonify({'success': False, 'error': 'invalid permission name'}), 400
    if Permission.query.filter_by(name=data['name']).first():
        return jsonify({'success': False, 'error': 'permission exists'}), 409
    p = Permission()
    p.name = data['name']
    p.description = data.get('description')
    db.session.add(p)
    db.session.commit()
    return jsonify({'success': True, 'data': p.to_dict()}), 201
