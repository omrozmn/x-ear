"""
Admin Plans routes for subscription plan management
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from models.base import db
from models.plan import Plan, PlanType, BillingInterval
from utils.admin_permissions import require_admin_permission, AdminPermissions
import logging
import uuid

logger = logging.getLogger(__name__)

admin_plans_bp = Blueprint('admin_plans', __name__, url_prefix='/api/admin/plans')

@admin_plans_bp.route('', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.PLANS_READ)
def list_plans():
    """List all plans with optional filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        plan_type = request.args.get('type', '')
        is_active = request.args.get('is_active', '')
        is_public = request.args.get('is_public', '')
        
        query = Plan.query
        
        if plan_type:
            query = query.filter_by(plan_type=PlanType[plan_type.upper()])
        if is_active:
            query = query.filter_by(is_active=is_active.lower() == 'true')
        if is_public:
            query = query.filter_by(is_public=is_public.lower() == 'true')
        
        query = query.order_by(Plan.created_at.desc())
        
        total = query.count()
        plans = query.offset((page - 1) * limit).limit(limit).all()
        
        return jsonify({
            'success': True,
            'data': {
                'plans': [p.to_dict() for p in plans],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': (total + limit - 1) // limit
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"List plans error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500

@admin_plans_bp.route('', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.PLANS_MANAGE)
def create_plan():
    """Create a new plan"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name') or data.get('price') is None:
            return jsonify({
                'success': False,
                'error': {'message': 'Name and price are required'}
            }), 400
        
        # Create plan
        plan = Plan(
            id=str(uuid.uuid4()),
            name=data['name'],
            slug=data.get('slug') or Plan.generate_slug(data['name']),
            description=data.get('description'),
            plan_type=PlanType[data.get('plan_type', 'BASIC').upper()],
            price=data['price'],
            billing_interval=BillingInterval[data.get('billing_interval', 'MONTHLY').upper()],
            features=data.get('features', {}),
            max_users=data.get('max_users'),
            max_storage_gb=data.get('max_storage_gb'),
            is_active=data.get('is_active', True),
            is_public=data.get('is_public', True)
        )
        
        db.session.add(plan)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {'plan': plan.to_dict()}
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create plan error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e)}
        }), 500

@admin_plans_bp.route('/<plan_id>', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.PLANS_READ)
def get_plan(plan_id):
    """Get plan details"""
    try:
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({
                'success': False,
                'error': {'message': 'Plan not found'}
            }), 404
        
        return jsonify({
            'success': True,
            'data': {'plan': plan.to_dict(include_relationships=True)}
        }), 200
        
    except Exception as e:
        logger.error(f"Get plan error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500

@admin_plans_bp.route('/<plan_id>', methods=['PUT'])
@jwt_required()
@require_admin_permission(AdminPermissions.PLANS_MANAGE)
def update_plan(plan_id):
    """Update plan"""
    try:
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({
                'success': False,
                'error': {'message': 'Plan not found'}
            }), 404
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            plan.name = data['name']
        if 'slug' in data:
            plan.slug = data['slug']
        if 'description' in data:
            plan.description = data['description']
        if 'plan_type' in data:
            plan.plan_type = PlanType[data['plan_type'].upper()]
        if 'price' in data:
            plan.price = data['price']
        if 'billing_interval' in data:
            plan.billing_interval = BillingInterval[data['billing_interval'].upper()]
        if 'features' in data:
            plan.features = data['features']
        if 'max_users' in data:
            plan.max_users = data['max_users']
        if 'max_storage_gb' in data:
            plan.max_storage_gb = data['max_storage_gb']
        if 'is_active' in data:
            plan.is_active = data['is_active']
        if 'is_public' in data:
            plan.is_public = data['is_public']
        
        plan.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {'plan': plan.to_dict()}
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update plan error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e)}
        }), 500

@admin_plans_bp.route('/<plan_id>', methods=['DELETE'])
@jwt_required()
@require_admin_permission(AdminPermissions.PLANS_MANAGE)
def delete_plan(plan_id):
    """Delete plan (soft delete by setting is_active=False)"""
    try:
        plan = Plan.query.get(plan_id)
        if not plan:
            return jsonify({
                'success': False,
                'error': {'message': 'Plan not found'}
            }), 404
        
        # Soft delete
        plan.is_active = False
        plan.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Plan deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete plan error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500
