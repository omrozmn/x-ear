"""
Admin routes for admin panel
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime
from models.base import db
from models.admin_user import AdminUser
import logging
import uuid

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.route('/auth/login', methods=['POST'])
def admin_login():
    """Admin login endpoint"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        mfa_token = data.get('mfa_token')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'error': {'message': 'Email and password required'}
            }), 400
        
        # Find admin user
        admin = AdminUser.query.filter_by(email=email).first()
        if not admin or not admin.check_password(password):
            return jsonify({
                'success': False,
                'error': {'message': 'Invalid credentials'}
            }), 401
        
        if not admin.is_active:
            return jsonify({
                'success': False,
                'error': {'message': 'Account is disabled'}
            }), 403
        
        # Check MFA if enabled
        if admin.mfa_enabled and not mfa_token:
            return jsonify({
                'success': True,
                'data': {'requires_mfa': True}
            }), 200
        
        # TODO: Verify MFA token if provided
        
        # Update last login
        admin.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(
            identity=admin.id,
            additional_claims={'role': admin.role, 'type': 'admin'}
        )
        
        return jsonify({
            'success': True,
            'data': {
                'token': access_token,
                'user': admin.to_dict(),
                'requires_mfa': False
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_admin_users():
    """Get list of admin users"""
    try:
        # Verify admin access
        current_user_id = get_jwt_identity()
        
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        role_filter = request.args.get('role', '')
        
        query = AdminUser.query
        
        if search:
            query = query.filter(
                (AdminUser.email.ilike(f'%{search}%')) |
                (AdminUser.first_name.ilike(f'%{search}%')) |
                (AdminUser.last_name.ilike(f'%{search}%'))
            )
        
        if role_filter:
            query = query.filter_by(role=role_filter)
        
        total = query.count()
        users = query.offset((page - 1) * limit).limit(limit).all()
        
        return jsonify({
            'success': True,
            'data': {
                'users': [u.to_dict() for u in users],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': (total + limit - 1) // limit
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get admin users error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500

@admin_bp.route('/invoices', methods=['GET'])
@jwt_required()
def get_admin_invoices():
    """Get invoices (placeholder)"""
    return jsonify({
        'success': True,
        'data': {
            'invoices': [],
            'pagination': {'page': 1, 'limit': 10, 'total': 0, 'totalPages': 0}
        }
    }), 200

@admin_bp.route('/plans', methods=['GET'])
@jwt_required()
def get_admin_plans():
    """Get plans (placeholder)"""
    return jsonify({
        'success': True,
        'data': {'plans': []}
    }), 200

@admin_bp.route('/tenants', methods=['GET'])
@jwt_required()
def get_admin_tenants():
    """Get tenants (placeholder)"""
    return jsonify({
        'success': True,
        'data': {'tenants': []}
    }), 200

@admin_bp.route('/tickets', methods=['GET'])
@jwt_required()
def get_admin_tickets():
    """Get support tickets (placeholder)"""
    return jsonify({
        'success': True,
        'data': {
            'tickets': [],
            'pagination': {'page': 1, 'limit': 10, 'total': 0, 'totalPages': 0}
        }
    }), 200

@admin_bp.route('/tickets/<ticket_id>', methods=['PUT'])
@jwt_required()
def update_admin_ticket(ticket_id):
    """Update support ticket (placeholder)"""
    return jsonify({'success': True}), 200
