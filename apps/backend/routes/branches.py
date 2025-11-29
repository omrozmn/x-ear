from flask import Blueprint, request, jsonify
from models.base import db
from models.user import User
from models.branch import Branch
from flask_jwt_extended import jwt_required, get_jwt_identity

branches_bp = Blueprint('branches', __name__)

@branches_bp.route('/branches', methods=['GET'])
@jwt_required()
def get_branches():
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'User not found or not in a tenant'}), 401

    query = Branch.query.filter_by(tenant_id=user.tenant_id)

    # If user is admin (branch admin), filter by assigned branches
    if user.role == 'admin':
        user_branch_ids = [b.id for b in user.branches]
        if user_branch_ids:
            query = query.filter(Branch.id.in_(user_branch_ids))
        else:
            return jsonify({'success': True, 'data': []}), 200

    branches = query.all()
    return jsonify({'success': True, 'data': [b.to_dict() for b in branches]}), 200

@branches_bp.route('/branches', methods=['POST'])
@jwt_required()
def create_branch():
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'User not found or not in a tenant'}), 401

    if user.role != 'tenant_admin':
        return jsonify({'success': False, 'error': 'Only tenant admins can create branches'}), 403

    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'success': False, 'error': 'Branch name is required'}), 400

    branch = Branch(
        tenant_id=user.tenant_id,
        name=data.get('name'),
        address=data.get('address'),
        phone=data.get('phone'),
        email=data.get('email')
    )

    db.session.add(branch)
    db.session.commit()

    return jsonify({'success': True, 'data': branch.to_dict()}), 201

@branches_bp.route('/branches/<branch_id>', methods=['PUT'])
@jwt_required()
def update_branch(branch_id):
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'User not found or not in a tenant'}), 401

    if user.role != 'tenant_admin':
        return jsonify({'success': False, 'error': 'Only tenant admins can update branches'}), 403

    branch = db.session.get(Branch, branch_id)
    if not branch or branch.tenant_id != user.tenant_id:
        return jsonify({'success': False, 'error': 'Branch not found'}), 404

    data = request.get_json()
    if 'name' in data:
        branch.name = data['name']
    if 'address' in data:
        branch.address = data['address']
    if 'phone' in data:
        branch.phone = data['phone']
    if 'email' in data:
        branch.email = data['email']

    db.session.commit()
    return jsonify({'success': True, 'data': branch.to_dict()}), 200

@branches_bp.route('/branches/<branch_id>', methods=['DELETE'])
@jwt_required()
def delete_branch(branch_id):
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user or not user.tenant_id:
        return jsonify({'success': False, 'error': 'User not found or not in a tenant'}), 401

    if user.role != 'tenant_admin':
        return jsonify({'success': False, 'error': 'Only tenant admins can delete branches'}), 403

    branch = db.session.get(Branch, branch_id)
    if not branch or branch.tenant_id != user.tenant_id:
        return jsonify({'success': False, 'error': 'Branch not found'}), 404

    db.session.delete(branch)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Branch deleted'}), 200
