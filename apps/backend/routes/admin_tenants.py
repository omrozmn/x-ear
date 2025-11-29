"""
Admin Tenants routes for customer/organization management
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime
from models.base import db
from models.tenant import Tenant, TenantStatus
import logging
import uuid

logger = logging.getLogger(__name__)

admin_tenants_bp = Blueprint('admin_tenants', __name__, url_prefix='/api/admin/tenants')

@admin_tenants_bp.route('', methods=['GET'])
@jwt_required()
def list_tenants():
    """List all tenants"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        status = request.args.get('status', '')
        search = request.args.get('search', '')
        
        query = Tenant.query.filter(Tenant.deleted_at.is_(None))
        
        if status:
            query = query.filter_by(status=status)
        if search:
            query = query.filter(
                (Tenant.name.ilike(f'%{search}%')) |
                (Tenant.owner_email.ilike(f'%{search}%'))
            )
        
        query = query.order_by(Tenant.created_at.desc())
        
        total = query.count()
        tenants = query.offset((page - 1) * limit).limit(limit).all()
        
        # Calculate actual user counts
        from models.user import User
        from sqlalchemy import func
        
        tenant_ids = [t.id for t in tenants]
        if tenant_ids:
            user_counts = db.session.query(
                User.tenant_id, 
                func.count(User.id)
            ).filter(
                User.tenant_id.in_(tenant_ids)
            ).group_by(User.tenant_id).all()
            
            counts_map = {t_id: count for t_id, count in user_counts}
            
            # Update current_users in the response (not DB, to avoid write overhead on GET)
            tenants_list = []
            for t in tenants:
                t_dict = t.to_dict()
                t_dict['current_users'] = counts_map.get(t.id, 0)
                tenants_list.append(t_dict)
        else:
            tenants_list = []
        
        return jsonify({
            'success': True,
            'data': {
                'tenants': tenants_list,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': (total + limit - 1) // limit
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"List tenants error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500

@admin_tenants_bp.route('', methods=['POST'])
@jwt_required()
def create_tenant():
    """Create tenant"""
    try:
        data = request.get_json()
        
        if not data.get('name') or not data.get('owner_email'):
            return jsonify({
                'success': False,
                'error': {'message': 'Name and owner email are required'}
            }), 400
        
        tenant = Tenant(
            id=str(uuid.uuid4()),
            name=data['name'],
            slug=data.get('slug') or Tenant.generate_slug(data['name']),
            description=data.get('description'),
            owner_email=data['owner_email'],
            billing_email=data.get('billing_email', data['owner_email']),
            status=data.get('status', TenantStatus.TRIAL.value),
            current_plan=data.get('current_plan'),
            max_users=data.get('max_users', 5),
            current_users=data.get('current_users', 0),
            company_info=data.get('company_info', {}),
            settings=data.get('settings', {})
        )
        
        db.session.add(tenant)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {'tenant': tenant.to_dict()}
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create tenant error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e)}
        }), 500

@admin_tenants_bp.route('/<tenant_id>', methods=['GET'])
@jwt_required()
def get_tenant(tenant_id):
    """Get tenant details"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return jsonify({
                'success': False,
                'error': {'message': 'Tenant not found'}
            }), 404
        
        return jsonify({
            'success': True,
            'data': {'tenant': tenant.to_dict()}
        }), 200
        
    except Exception as e:
        logger.error(f"Get tenant error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500

@admin_tenants_bp.route('/<tenant_id>', methods=['PUT'])
@jwt_required()
def update_tenant(tenant_id):
    """Update tenant"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return jsonify({
                'success': False,
                'error': {'message': 'Tenant not found'}
            }), 404
        
        data = request.get_json()
        
        if 'name' in data:
            tenant.name = data['name']
        if 'slug' in data:
            tenant.slug = data['slug']
        if 'description' in data:
            tenant.description = data['description']
        if 'owner_email' in data:
            tenant.owner_email = data['owner_email']
        if 'billing_email' in data:
            tenant.billing_email = data['billing_email']
        if 'status' in data:
            tenant.status = data['status']
        if 'current_plan' in data:
            tenant.current_plan = data['current_plan']
        if 'max_users' in data:
            tenant.max_users = data['max_users']
        if 'current_users' in data:
            tenant.current_users = data['current_users']
        if 'company_info' in data:
            tenant.company_info = data['company_info']
        if 'settings' in data:
            tenant.settings = data['settings']
        
        tenant.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {'tenant': tenant.to_dict()}
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update tenant error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e)}
        }), 500

@admin_tenants_bp.route('/<tenant_id>', methods=['DELETE'])
@jwt_required()
def delete_tenant(tenant_id):
    """Delete tenant (soft delete)"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({
                'success': False,
                'error': {'message': 'Tenant not found'}
            }), 404
        
        tenant.soft_delete()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Tenant deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete tenant error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500

@admin_tenants_bp.route('/<tenant_id>/users', methods=['GET'])
@jwt_required()
def get_tenant_users(tenant_id):
    """Get users for a specific tenant"""
    try:
        from models.user import User
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({
                'success': False,
                'error': {'message': 'Tenant not found'}
            }), 404
            
        users = User.query.filter_by(tenant_id=tenant_id).all()
        
        return jsonify({
            'success': True,
            'data': {
                'users': [u.to_dict() for u in users]
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get tenant users error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500
