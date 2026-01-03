from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from models.tenant import Tenant, TenantStatus
from models.plan import Plan, BillingInterval
from models.user import User
from models.base import db
from datetime import datetime, timedelta
from typing import Optional

subscriptions_bp = Blueprint('subscriptions', __name__)

def serialize_tenant(tenant: Optional[Tenant]) -> Optional[dict]:
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

def serialize_plan(plan: Optional[Plan]) -> Optional[dict]:
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
@unified_access()
def subscribe(ctx):
    """Subscribe to a plan (Mock Payment)"""
    user = ctx.user
    
    # Only tenant admin or super admin can subscribe
    if user.role not in ['tenant_admin', 'super_admin']:
        return error_response('Unauthorized', code='FORBIDDEN', status_code=403)
        
    data = request.get_json()
    plan_id = data.get('plan_id')
    billing_interval = data.get('billing_interval', 'YEARLY') # Default to YEARLY as requested
    
    # Mock Payment Validation
    card_number = data.get('card_number')
    if not card_number or len(card_number) < 16:
        return error_response('Invalid card number', code='INVALID_CARD', status_code=400)
        
    if card_number.endswith('0000'):
        return error_response('Payment failed (Mock Failure)', code='PAYMENT_FAILED', status_code=400)
        
    plan = Plan.query.get(plan_id)
    if not plan:
        return error_response('Plan not found', code='NOT_FOUND', status_code=404)
        
    tenant = None
    if user.tenant_id:
        tenant = Tenant.query.get(user.tenant_id)
    
    # If no tenant, create one (Self-Service Onboarding flow)
    if not tenant:
        company_name = data.get('company_name') or f"{user.username}'s Clinic"
        tenant = Tenant(
            name=company_name,
            slug=Tenant.generate_slug(company_name),
            owner_email=user.email or f"{user.phone}@mobile.x-ear.com", # Fallback if email placeholder
            billing_email=user.email or f"{user.phone}@mobile.x-ear.com",
            status=TenantStatus.ACTIVE.value
        )
        db.session.add(tenant)
        db.session.flush() # Get ID
        
        # Link user to tenant
        user.tenant_id = tenant.id
        user.role = 'tenant_admin' # Upgrade role
        db.session.add(user) # Update user
        
    start_date = datetime.utcnow()
    if billing_interval == 'YEARLY':
        end_date = start_date + timedelta(days=365)
    elif billing_interval == 'MONTHLY':
        end_date = start_date + timedelta(days=30)
    else:
        end_date = start_date + timedelta(days=365) # Default
        
    # Update Tenant Subscription
    tenant.current_plan_id = plan.id
    tenant.current_plan = plan.slug # Legacy support
    tenant.subscription_start_date = start_date
    tenant.subscription_end_date = end_date
    tenant.status = TenantStatus.ACTIVE.value
    
    # Initialize feature usage from plan features
    feature_usage = tenant.feature_usage or {}
    
    # Process Plan Features
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

    # Process Addons (placeholder)
    addon_ids = data.get('addon_ids', [])
    
    # Process SMS Package
    sms_package_id = data.get('sms_package_id')
    if sms_package_id:
        from models.sms_package import SmsPackage
        sms_pkg = SmsPackage.query.get(sms_package_id)
        if sms_pkg:
            current_credits = feature_usage.get('sms_credits', 0)
            if isinstance(current_credits, dict):
                 current_credits = current_credits.get('limit', 0)
            
            feature_usage['sms_credits'] = current_credits + sms_pkg.sms_count
    
    tenant.feature_usage = feature_usage
    
    # Explicitly mark modified if JSON
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(tenant, "feature_usage")
    
    db.session.commit()
    
    return success_response({
        'message': 'Subscription successful',
        'tenant': tenant.to_dict(),
        'plan': plan.to_dict()
    })

@subscriptions_bp.route('/complete-signup', methods=['POST'])
@unified_access()
def complete_signup(ctx):
    """
    Complete user signup and subscribe.
    Used for both:
    1. Users coming from /register (already have phone verified)
    2. Users verifying phone inline at checkout
    """
    user = ctx.user
    
    data = request.get_json()
    
    # Update User Profile
    if data.get('email'):
        # Check if email is already taken by ANOTHER user
        existing = User.query.filter_by(email=data['email']).first()
        if existing and existing.id != user.id:
            return error_response('Bu e-posta adresi zaten kullanımda', code='EMAIL_TAKEN', status_code=400)
        user.email = data['email']
        
    if data.get('password'):
        user.set_password(data['password'])
        
    if data.get('first_name'):
        user.first_name = data['first_name']
        
    if data.get('last_name'):
        user.last_name = data['last_name']

    # Create Tenant if not exists
    tenant = None
    if user.tenant_id:
        tenant = Tenant.query.get(user.tenant_id)
    
    if not tenant:
        company_name = data.get('company_name') or f"{user.first_name}'s Clinic"
        
        slug = Tenant.generate_slug(company_name)
        
        tenant = Tenant(
            name=company_name,
            slug=slug,
            owner_email=user.email or f"{user.phone}@mobile.x-ear.com",
            billing_email=user.email or f"{user.phone}@mobile.x-ear.com",
            status=TenantStatus.ACTIVE.value
        )
        db.session.add(tenant)
        db.session.flush() # Get ID
        
        # Link user
        user.tenant_id = tenant.id
        user.role = 'tenant_admin'
    
    # Handle Subscription
    plan_id = data.get('plan_id')
    if not plan_id:
        return error_response('Plan seçimi zorunludur', code='MISSING_PLAN', status_code=400)
        
    plan = Plan.query.get(plan_id)
    if not plan:
        return error_response('Geçersiz plan', code='INVALID_PLAN', status_code=404)
        
    billing_interval = data.get('billing_interval', 'YEARLY')
    
    start_date = datetime.utcnow()
    if billing_interval == 'YEARLY':
        end_date = start_date + timedelta(days=365)
    else:
        end_date = start_date + timedelta(days=30)
        
    tenant.current_plan_id = plan.id
    tenant.current_plan = plan.slug
    tenant.subscription_start_date = start_date
    tenant.subscription_end_date = end_date
    tenant.status = TenantStatus.ACTIVE.value
    
    # Initialize features
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
        'message': 'Hesap oluşturma ve abonelik başarılı',
        'tenant': tenant.to_dict(),
        'user': user.to_dict(),
        'token': data.get('token') # Just echo back or ignore
    })

@subscriptions_bp.route('/current', methods=['GET'])
@unified_access()
def get_current(ctx):
    """Get current subscription details"""
    user = ctx.user
    
    tenant = Tenant.query.get(user.tenant_id)
    if not tenant:
        return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
        
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
    password = data.get('password')
    plan_id = data.get('plan_id')
    billing_interval = data.get('billing_interval', 'YEARLY')
    
    if not all([company_name, email, password, plan_id]):
        return error_response('Missing required fields', code='MISSING_FIELDS', status_code=400)
        
    # Check if user exists
    if User.query.filter_by(email=email).first():
        return error_response('Email already registered', code='EMAIL_TAKEN', status_code=400)
        
    # Check plan
    plan = db.session.get(Plan, plan_id)
    if not plan:
        return error_response('Plan not found', code='PLAN_NOT_FOUND', status_code=404)
        
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
        
        # Handle Referral Code
        referral_code = data.get('referral_code')
        affiliate = None
        if referral_code:
            from models.affiliate_user import AffiliateUser
            affiliate = AffiliateUser.query.filter_by(code=referral_code).first()
            if affiliate and affiliate.is_active:
                tenant.affiliate_id = affiliate.id
                tenant.referral_code = referral_code

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
        
        # Generate Referral Commission
        if affiliate and plan.price and float(plan.price) > 0:
            try:
                from services.commission_service import CommissionService
                commission_amount = float(plan.price) * 0.10  # 10% commission
                CommissionService.create_commission(
                    db=db.session,
                    affiliate_id=affiliate.id,
                    tenant_id=tenant.id,
                    event='signup_subscription',
                    amount=commission_amount,
                    status='pending'
                )
            except Exception as e:
                # Log error but don't fail registration
                print(f"Failed to create commission: {e}")
        
        # Generate Token
        from flask_jwt_extended import create_access_token
        access_token = create_access_token(identity=user.id)
        
        return success_response({
            'message': 'Registration and subscription successful',
            'token': access_token,
            'user': user.to_dict(),
            'tenant': tenant.to_dict()
        }, status_code=201)
        
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), code='REGISTRATION_FAILED', status_code=500)
