from flask import Blueprint, request, jsonify
from models.base import db
from utils.authorization import admin_required
from utils.validation import is_valid_permission_name

permissions_bp = Blueprint('permissions', __name__)


@permissions_bp.route('/permissions', methods=['GET'])
@admin_required
def list_permissions():
    perms = Permission.query.order_by(Permission.name).all()
    return jsonify({'success': True, 'data': [p.to_dict() for p in perms]})


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
