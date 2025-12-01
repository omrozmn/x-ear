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
                'users': [{
                    'id': u.id,
                    'username': u.username,
                    'email': u.email,
                    'first_name': u.first_name,
                    'last_name': u.last_name,
                    'role': u.role,
                    'is_active': u.is_active,
                    'last_login': u.last_login.isoformat() if u.last_login else None,
                    'tenant_id': u.tenant_id
                } for u in users]
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get tenant users error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500
@admin_tenants_bp.route('/<tenant_id>/subscribe', methods=['POST'])
@jwt_required()
def subscribe_tenant(tenant_id):
    """Subscribe tenant to a plan (Admin override)"""
    try:
        from models.plan import Plan
        from datetime import timedelta
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return jsonify({
                'success': False,
                'error': {'message': 'Tenant not found'}
            }), 404
            
        data = request.get_json()
        plan_id = data.get('plan_id')
        billing_interval = data.get('billing_interval', 'YEARLY')
        
        if not plan_id:
            return jsonify({
                'success': False,
                'error': {'message': 'Plan ID is required'}
            }), 400
            
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({
                'success': False,
                'error': {'message': 'Plan not found'}
            }), 404
            
        # Calculate subscription dates
        start_date = datetime.utcnow()
        if billing_interval == 'YEARLY':
            end_date = start_date + timedelta(days=365)
        elif billing_interval == 'MONTHLY':
            end_date = start_date + timedelta(days=30)
        else:
            end_date = start_date + timedelta(days=365)
            
        tenant.current_plan_id = plan.id
        tenant.current_plan = plan.slug
        tenant.subscription_start_date = start_date
        tenant.subscription_end_date = end_date
        tenant.status = TenantStatus.ACTIVE.value
        
        # Initialize feature usage
        feature_usage = {}
        if plan.features:
            if isinstance(plan.features, list):
                for feature in plan.features:
                    key = feature.get('key')
                    limit = feature.get('limit', 0)
                    if key:
                        feature_usage[key] = {
                            'limit': limit,
                            'used': 0,
                            'last_reset': start_date.isoformat()
                        }
            elif isinstance(plan.features, dict):
                for key, value in plan.features.items():
                    limit = 0
                    if isinstance(value, dict):
                        limit = value.get('limit', 0)
                    elif isinstance(value, (int, float)):
                        limit = value
                    
                    feature_usage[key] = {
                        'limit': limit,
                        'used': 0,
                        'last_reset': start_date.isoformat()
                    }
        
        tenant.feature_usage = feature_usage
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Subscription updated successfully',
            'data': {'tenant': tenant.to_dict()}
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Subscribe tenant error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e)}
        }), 500

@admin_tenants_bp.route('/<tenant_id>/users', methods=['POST'])
@jwt_required()
def create_tenant_user(tenant_id):
    """Create a user for a specific tenant"""
    try:
        from models.user import User
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return jsonify({
                'success': False,
                'error': {'message': 'Tenant not found'}
            }), 404
            
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({
                'success': False,
                'error': {'message': 'Email and password are required'}
            }), 400
            
        if User.query.filter_by(email=data['email']).first():
            return jsonify({
                'success': False,
                'error': {'message': 'Email already exists'}
            }), 400
            
        user = User(
            email=data['email'],
            username=data.get('username', data['email'].split('@')[0]),
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            role=data.get('role', 'tenant_user'),
            tenant_id=tenant_id,
            is_active=data.get('is_active', True)
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'is_active': user.is_active,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'tenant_id': user.tenant_id
            }}
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create tenant user error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e)}
        }), 500

@admin_tenants_bp.route('/<tenant_id>/users/<user_id>', methods=['PUT'])
@jwt_required()
def update_tenant_user(tenant_id, user_id):
    """Update a tenant user"""
    try:
        from models.user import User
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return jsonify({
                'success': False,
                'error': {'message': 'Tenant not found'}
            }), 404
            
        user = User.query.filter_by(id=user_id, tenant_id=tenant_id).first()
        if not user:
            return jsonify({
                'success': False,
                'error': {'message': 'User not found in this tenant'}
            }), 404
            
        data = request.get_json()
        
        if 'email' in data:
            # Check if email is taken by another user
            existing = User.query.filter(User.email == data['email'], User.id != user_id).first()
            if existing:
                return jsonify({
                    'success': False,
                    'error': {'message': 'Email already in use'}
                }), 400
            user.email = data['email']
            
        if 'username' in data:
            # Check if username is taken by another user
            existing = User.query.filter(User.username == data['username'], User.id != user_id).first()
            if existing:
                return jsonify({
                    'success': False,
                    'error': {'message': 'Username already in use'}
                }), 400
            user.username = data['username']
            
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'role' in data:
            user.role = data['role']
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'password' in data and data['password']:
            user.set_password(data['password'])
            
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'is_active': user.is_active,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'tenant_id': user.tenant_id
            }}
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update tenant user error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e)}
        }), 500

@admin_tenants_bp.route('/<tenant_id>/addons', methods=['POST'])
@jwt_required()
def add_tenant_addon(tenant_id):
    """Add addon to tenant (Admin override)"""
    try:
        from models.addon import AddOn
        
        tenant = Tenant.query.get(tenant_id)
        if not tenant or tenant.deleted_at:
            return jsonify({
                'success': False,
                'error': {'message': 'Tenant not found'}
            }), 404
            
        data = request.get_json()
        addon_id = data.get('addon_id')
        
        if not addon_id:
            return jsonify({
                'success': False,
                'error': {'message': 'Addon ID is required'}
            }), 400
            
        addon = AddOn.query.get(addon_id)
        if not addon:
            return jsonify({
                'success': False,
                'error': {'message': 'Addon not found'}
            }), 404
            
        # Update feature usage based on addon
        key = addon.unit_name or addon.slug
        
        if not tenant.feature_usage:
            tenant.feature_usage = {}
            
        usage = dict(tenant.feature_usage)
        
        if key in usage:
            current_limit = usage[key].get('limit', 0)
            usage[key]['limit'] = current_limit + (addon.limit_amount or 0)
        else:
            usage[key] = {
                'limit': addon.limit_amount or 0,
                'used': 0,
                'last_reset': datetime.utcnow().isoformat()
            }
            
        tenant.feature_usage = usage
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Addon added successfully',
            'data': {'tenant': tenant.to_dict()}
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Add tenant addon error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e)}
        }), 500
