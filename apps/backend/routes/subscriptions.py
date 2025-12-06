from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.tenant import Tenant, TenantStatus
from models.plan import Plan, BillingInterval
from models.user import User
from models.base import db
from utils.response_envelope import success_response, error_response
from datetime import datetime, timedelta

subscriptions_bp = Blueprint('subscriptions', __name__)


def serialize_tenant(tenant: Tenant | None) -> dict | None:
    if not tenant:
        return None

    return {
        'id': tenant.id,
        'name': tenant.name,
        'slug': tenant.slug,
        'ownerEmail': tenant.owner_email,
        'billingEmail': tenant.billing_email,
        'status': tenant.status,
        'currentPlan': tenant.current_plan,
        'currentPlanId': tenant.current_plan_id,
        'subscriptionStartDate': tenant.subscription_start_date.isoformat() if tenant.subscription_start_date else None,
        'subscriptionEndDate': tenant.subscription_end_date.isoformat() if tenant.subscription_end_date else None,
        'featureUsage': tenant.feature_usage or {},
        'maxUsers': tenant.max_users,
        'currentUsers': tenant.current_users,
    }


def serialize_plan(plan: Plan | None) -> dict | None:
    if not plan:
        return None

    return {
        'id': plan.id,
        'name': plan.name,
        'slug': plan.slug,
        'description': plan.description,
        'planType': plan.plan_type.value if plan.plan_type else None,
        'price': float(plan.price) if plan.price is not None else None,
        'billingInterval': plan.billing_interval.value if plan.billing_interval else None,
        'features': plan.features or {},
        'maxUsers': plan.max_users,
        'maxStorageGb': plan.max_storage_gb,
        'isActive': plan.is_active,
        'isPublic': plan.is_public,
        'monthlyPrice': plan.get_monthly_price(),
        'yearlyPrice': plan.get_yearly_price(),
    }

@subscriptions_bp.route('/subscribe', methods=['POST'])
@jwt_required()
def subscribe():
    """Subscribe to a plan (Mock Payment)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return error_response('User not found', 404)
        
    # Only tenant admin or super admin can subscribe
    if user.role not in ['tenant_admin', 'super_admin']:
        return error_response('Unauthorized', 403)
        
    data = request.get_json()
    plan_id = data.get('plan_id')
    billing_interval = data.get('billing_interval', 'YEARLY') # Default to YEARLY as requested
    
    # Mock Payment Validation
    card_number = data.get('card_number')
    if not card_number or len(card_number) < 16:
        # Simple mock validation: if card number is short, fail
        return error_response('Invalid card number', 400)
        
    if card_number.endswith('0000'):
        return error_response('Payment failed (Mock Failure)', 400)
        
    plan = Plan.query.get(plan_id)
    if not plan:
        return error_response('Plan not found', 404)
        
    tenant = Tenant.query.get(user.tenant_id)
    if not tenant:
        return error_response('Tenant not found', 404)
        
    # Calculate subscription dates
    start_date = datetime.utcnow()
    if billing_interval == 'YEARLY':
        end_date = start_date + timedelta(days=365)
    elif billing_interval == 'MONTHLY':
        end_date = start_date + timedelta(days=30)
    else:
        end_date = start_date + timedelta(days=365) # Default
        
    # Update Tenant
    tenant.current_plan_id = plan.id
    tenant.current_plan = plan.slug # Legacy support
    tenant.subscription_start_date = start_date
    tenant.subscription_end_date = end_date
    tenant.status = TenantStatus.ACTIVE.value
    
    # Initialize feature usage from plan features
    # We assume plan.features is a list of dicts: [{'key': 'sms', 'limit': 1000}, ...]
    feature_usage = {}
    if plan.features and isinstance(plan.features, list):
        for feature in plan.features:
            key = feature.get('key')
            limit = feature.get('limit', 0)
            if key:
                feature_usage[key] = {
                    'limit': limit,
                    'used': 0,
                    'last_reset': start_date.isoformat()
                }
    
    tenant.feature_usage = feature_usage
    
    db.session.commit()
    
    return success_response({
        'message': 'Subscription successful',
        'tenant': tenant.to_dict(),
        'plan': plan.to_dict()
    })

@subscriptions_bp.route('/current', methods=['GET'])
@jwt_required()
def get_current():
    """Get current subscription details"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return error_response('User not found', 404)
        
    tenant = Tenant.query.get(user.tenant_id)
    if not tenant:
        return error_response('Tenant not found', 404)
        
    plan = None
    if tenant.current_plan_id:
        plan = Plan.query.get(tenant.current_plan_id)
        
    # Check if expired
    is_expired = False
    days_remaining = 0
    if tenant.subscription_end_date:
        now = datetime.utcnow()
        if tenant.subscription_end_date < now:
            is_expired = True
        else:
            delta = tenant.subscription_end_date - now
            days_remaining = delta.days
            
    return success_response({
        'tenant': serialize_tenant(tenant),
        'plan': serialize_plan(plan),
        'isExpired': is_expired,
        'daysRemaining': days_remaining
    })

@subscriptions_bp.route('/register-and-subscribe', methods=['POST'])
def register_and_subscribe():
    """Register new tenant and subscribe (Public)"""
    data = request.get_json()
    
    # Extract data
    company_name = data.get('company_name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')
    plan_id = data.get('plan_id')
    billing_interval = data.get('billing_interval', 'YEARLY')
    card_number = data.get('card_number', '1234123412341234') # Default mock
    
    if not all([company_name, email, password, plan_id]):
        return error_response('Missing required fields', 400)
        
    # Check if user exists
    if User.query.filter_by(email=email).first():
        return error_response('Email already registered', 400)
        
    # Check plan
    plan = Plan.query.get(plan_id)
    if not plan:
        return error_response('Plan not found', 404)
        
    try:
        # Create Tenant
        tenant = Tenant(
            name=company_name,
            slug=Tenant.generate_slug(company_name),
            owner_email=email,
            billing_email=email,
            status=TenantStatus.ACTIVE.value
        )
        
        # Subscription logic
        start_date = datetime.utcnow()
        if billing_interval == 'YEARLY':
            end_date = start_date + timedelta(days=365)
        else:
            end_date = start_date + timedelta(days=30)
            
        tenant.current_plan_id = plan.id
        tenant.current_plan = plan.slug
        tenant.subscription_start_date = start_date
        tenant.subscription_end_date = end_date
        
        # Feature usage
        feature_usage = {}
        if plan.features and isinstance(plan.features, list):
            for feature in plan.features:
                key = feature.get('key')
                limit = feature.get('limit', 0)
                if key:
                    feature_usage[key] = {
                        'limit': limit,
                        'used': 0,
                        'last_reset': start_date.isoformat()
                    }
        tenant.feature_usage = feature_usage
        
        db.session.add(tenant)
        db.session.flush() # Get ID
        
        # Create User
        user = User(
            email=email,
            username=email.split('@')[0],
            role='tenant_admin',
            tenant_id=tenant.id,
            is_active=True
        )
        user.set_password(password)
        db.session.add(user)
        
        db.session.commit()
        
        # Generate Token
        from flask_jwt_extended import create_access_token
        access_token = create_access_token(identity=user.id)
        
        return success_response({
            'message': 'Registration and subscription successful',
            'token': access_token,
            'user': user.to_dict(),
            'tenant': tenant.to_dict()
        }, 201)
        
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)
