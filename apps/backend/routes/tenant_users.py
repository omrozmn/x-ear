from flask import Blueprint, request, jsonify
from models.base import db
from models.user import User
from models.tenant import Tenant
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.authorization import permission_required

tenant_users_bp = Blueprint('tenant_users', __name__)

@tenant_users_bp.route('/tenant/users', methods=['GET'])
@jwt_required()
def list_tenant_users():
    """
    List users belonging to the current user's tenant.
    """
    current_user_id = get_jwt_identity()
    current_user = db.session.get(User, current_user_id)
    
    if not current_user or not current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to a tenant'}), 400
        
    # Check permission (optional, or assume all tenant users can see their team)
    # if not current_user.has_permission('tenant.users.view'): ...
    
    query = User.query.filter_by(tenant_id=current_user.tenant_id)
    
    # If user is admin (branch admin), filter by assigned branches
    if current_user.role == 'admin':
        # Get IDs of branches assigned to current user
        user_branch_ids = [b.id for b in current_user.branches]
        if user_branch_ids:
            # Filter users that belong to any of the current user's branches
            from models.user import user_branches
            query = query.join(user_branches).filter(user_branches.c.branch_id.in_(user_branch_ids))
        else:
            # If admin has no branches assigned, return only themselves
            return jsonify({'success': True, 'data': [current_user.to_dict()]}), 200

    users = query.all()
    return jsonify({'success': True, 'data': [u.to_dict() for u in users]}), 200

@tenant_users_bp.route('/tenant/users', methods=['POST'])
@jwt_required()
def invite_tenant_user():
    """
    Create a new user for the tenant with username and password.
    Admin creates the user directly with credentials.
    """
    current_user_id = get_jwt_identity()
    current_user = db.session.get(User, current_user_id)
    
    if not current_user or not current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to a tenant'}), 400
        
    # Only tenant_admin or admin can create users
    if current_user.role not in ['tenant_admin', 'admin']:
         return jsonify({'success': False, 'error': 'Only admins can create users'}), 403

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')  # Optional
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    role = data.get('role', 'user') # admin, user, doctor, etc.
    branch_ids = data.get('branchIds', [])
    
    # Validate required fields
    if not username:
        return jsonify({'success': False, 'error': 'Username is required'}), 400
    if not password:
        return jsonify({'success': False, 'error': 'Password is required'}), 400
    if len(password) < 6:
        return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400
        
    # Check if username already exists
    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'error': 'Username already exists'}), 409
    
    # Check if email exists (if provided)
    if email and User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'error': 'Email already exists'}), 409
        
    # Create user with admin-provided credentials
    new_user = User(
        username=username,
        email=email or f"{username}@{current_user.tenant_id}.local",  # Generate if not provided
        first_name=first_name,
        last_name=last_name,
        tenant_id=current_user.tenant_id,
        role=role
    )
    new_user.set_password(password)
    
    if branch_ids:
        from models.branch import Branch
        branches = Branch.query.filter(Branch.id.in_(branch_ids), Branch.tenant_id == current_user.tenant_id).all()
        new_user.branches = branches

    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'success': True, 'data': new_user.to_dict()}), 201

@tenant_users_bp.route('/tenant/users/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_tenant_user(user_id):
    """
    Remove a user from the tenant.
    """
    current_user_id = get_jwt_identity()
    current_user = db.session.get(User, current_user_id)
    
    if not current_user or not current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to a tenant'}), 400
        
    if current_user.role != 'admin':
         return jsonify({'success': False, 'error': 'Only admins can remove users'}), 403
         
    user_to_delete = db.session.get(User, user_id)
    
    if not user_to_delete:
        return jsonify({'success': False, 'error': 'User not found'}), 404
        
    if user_to_delete.tenant_id != current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to your tenant'}), 403
        
    if user_to_delete.id == current_user.id:
        return jsonify({'success': False, 'error': 'Cannot delete yourself'}), 400
        
    db.session.delete(user_to_delete)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'User removed'}), 200

@tenant_users_bp.route('/tenant/users/<user_id>', methods=['PUT'])
@jwt_required()
def update_tenant_user(user_id):
    """
    Update a user in the tenant.
    """
    current_user_id = get_jwt_identity()
    current_user = db.session.get(User, current_user_id)
    
    if not current_user or not current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to a tenant'}), 400
        
    # Only tenant_admin or admin can update users
    if current_user.role not in ['tenant_admin', 'admin']:
         return jsonify({'success': False, 'error': 'Only admins can update users'}), 403
         
    user_to_update = db.session.get(User, user_id)
    
    if not user_to_update:
        return jsonify({'success': False, 'error': 'User not found'}), 404
        
    if user_to_update.tenant_id != current_user.tenant_id:
        return jsonify({'success': False, 'error': 'User does not belong to your tenant'}), 403
        
    # Restriction: Admin cannot edit Tenant Admin
    if current_user.role == 'admin' and user_to_update.role == 'tenant_admin':
        return jsonify({'success': False, 'error': 'Admins cannot edit Tenant Admins'}), 403
        
    data = request.get_json()
    
    if 'username' in data:
        # Check uniqueness if changed
        if data['username'] != user_to_update.username:
            if User.query.filter_by(username=data['username']).first():
                return jsonify({'success': False, 'error': 'Username already exists'}), 409
        user_to_update.username = data['username']
        
    if 'email' in data:
        if data['email'] != user_to_update.email:
            if User.query.filter_by(email=data['email']).first():
                return jsonify({'success': False, 'error': 'Email already exists'}), 409
        user_to_update.email = data['email']
        
    if 'password' in data and data['password']:
        if len(data['password']) < 6:
            return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400
        user_to_update.set_password(data['password'])
        
    if 'firstName' in data:
        user_to_update.first_name = data['firstName']
        
    if 'lastName' in data:
        user_to_update.last_name = data['lastName']
        
    if 'role' in data:
        user_to_update.role = data['role']
        
    if 'isActive' in data:
        user_to_update.is_active = data['isActive']
        
    if 'branchIds' in data:
        from models.branch import Branch
        branches = Branch.query.filter(Branch.id.in_(data['branchIds']), Branch.tenant_id == current_user.tenant_id).all()
        user_to_update.branches = branches
        
    db.session.commit()
    
    return jsonify({'success': True, 'data': user_to_update.to_dict()}), 200
