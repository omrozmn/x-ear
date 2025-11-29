from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.plan import Plan, PlanType, BillingInterval
from models.user import User
from models.base import db
from utils.response_envelope import success_response, error_response
from datetime import datetime

plans_bp = Blueprint('plans', __name__)

@plans_bp.route('', methods=['GET'])
def get_plans():
    """Get all active plans (Public)"""
    # If admin, maybe show inactive too? For now, let's just show active public plans for public endpoint
    # We can add query params to filter
    
    is_admin = False
    # Check if user is admin (optional, if we want to show hidden plans to admin)
    # For now, let's keep it simple: Public endpoint returns active public plans
    
    plans = Plan.query.filter_by(is_active=True, is_public=True).all()
    
    # We might want to filter features based on visibility here if we want to be strict
    # But usually it's fine to send all and hide in frontend, unless it's sensitive.
    # The user requirement says "görünmez ise kapanmalı", so we should probably filter.
    
    results = []
    for plan in plans:
        plan_dict = plan.to_dict()
        # Filter features if they are a list of dicts
        if isinstance(plan_dict.get('features'), list):
            plan_dict['features'] = [f for f in plan_dict['features'] if f.get('is_visible', True)]
        results.append(plan_dict)
        
    return success_response(results)

@plans_bp.route('/admin', methods=['GET'])
@jwt_required()
def get_admin_plans():
    """Get all plans for admin (including inactive/private)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role not in ['super_admin', 'tenant_admin']: # Assuming tenant_admin might see them? No, probably super_admin only for creating plans.
        # Wait, who creates plans? Super Admin.
        if user.role != 'super_admin':
             return error_response('Unauthorized', 403)

    plans = Plan.query.all()
    return success_response([p.to_dict() for p in plans])

@plans_bp.route('', methods=['POST'])
@jwt_required()
def create_plan():
    """Create a new plan (Super Admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role != 'super_admin':
        return error_response('Unauthorized', 403)
        
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
        
        return success_response(plan.to_dict(), 201)
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 400)

@plans_bp.route('/<plan_id>', methods=['PUT'])
@jwt_required()
def update_plan(plan_id):
    """Update a plan (Super Admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role != 'super_admin':
        return error_response('Unauthorized', 403)
        
    plan = Plan.query.get(plan_id)
    if not plan:
        return error_response('Plan not found', 404)
        
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
        return success_response(plan.to_dict())
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 400)
