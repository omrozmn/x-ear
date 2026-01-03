from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from models.plan import Plan, PlanType, BillingInterval
from models.user import User
from models.base import db
from utils.admin_permissions import AdminPermissions
from datetime import datetime

plans_bp = Blueprint('plans', __name__)

@plans_bp.route('', methods=['GET'])
def get_plans():
    """Get all active plans (Public)"""
    # Public endpoint returns active public plans
    
    plans = Plan.query.filter_by(is_active=True, is_public=True).all()
    
    results = []
    for plan in plans:
        plan_dict = plan.to_dict()
        # Filter features if they are a list of dicts
        if isinstance(plan_dict.get('features'), list):
            plan_dict['features'] = [f for f in plan_dict['features'] if f.get('is_visible', True)]
        results.append(plan_dict)
        
    return success_response(results)

@plans_bp.route('/admin', methods=['GET'])
@unified_access(permission=AdminPermissions.PLANS_READ)
def get_admin_plans(ctx):
    """Get all plans for admin (including inactive/private)"""
    # Requires Plans Read permission (usually admin or super admin)
    plans = Plan.query.all()
    return success_response([p.to_dict() for p in plans])

@plans_bp.route('', methods=['POST'])
@unified_access(permission=AdminPermissions.PLANS_MANAGE)
def create_plan(ctx):
    """Create a new plan (Super Admin only - via Permission)"""
    # Using AdminPermissions.PLANS_MANAGE covers authorization
    data = request.get_json()
    
    try:
        plan = Plan(
            name=data['name'],
            description=data.get('description'),
            plan_type=PlanType(data.get('plan_type', 'BASIC')),
            price=data['price'],
            billing_interval=BillingInterval(data.get('billing_interval', 'YEARLY')),
            features=data.get('features', []),
            max_users=data.get('max_users'),
            max_storage_gb=data.get('max_storage_gb'),
            is_active=data.get('is_active', True),
            is_public=data.get('is_public', True)
        )
        
        db.session.add(plan)
        db.session.commit()
        
        return success_response(data=plan.to_dict(), status_code=201)
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), code='CREATE_FAILED', status_code=400)

@plans_bp.route('/<plan_id>', methods=['PUT'])
@unified_access(permission=AdminPermissions.PLANS_MANAGE)
def update_plan(ctx, plan_id):
    """Update a plan (Super Admin only - via Permission)"""
    plan = Plan.query.get(plan_id)
    if not plan:
        return error_response('Plan not found', code='NOT_FOUND', status_code=404)
        
    data = request.get_json()
    
    try:
        if 'name' in data: plan.name = data['name']
        if 'description' in data: plan.description = data['description']
        if 'price' in data: plan.price = data['price']
        if 'features' in data: plan.features = data['features']
        if 'is_active' in data: plan.is_active = data['is_active']
        if 'is_public' in data: plan.is_public = data['is_public']
        if 'max_users' in data: plan.max_users = data['max_users']
        
        db.session.commit()
        return success_response(data=plan.to_dict())
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), code='UPDATE_FAILED', status_code=400)
