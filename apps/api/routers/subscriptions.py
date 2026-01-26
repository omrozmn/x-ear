"""
FastAPI Subscriptions Router - Migrated from Flask routes/subscriptions.py
Handles tenant subscriptions and billing
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
import logging

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from database import get_db
from schemas.base import ResponseEnvelope
from schemas.tenants import (
    SubscriptionResponse, SignupResponse, CurrentSubscriptionResponse,
    TenantRead, PlanRead
)
from middleware.unified_access import UnifiedAccess, require_access, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

# --- Schemas ---

class SubscribeRequest(BaseModel):
    plan_id: str
    billing_interval: str = "YEARLY"
    card_number: Optional[str] = None
    company_name: Optional[str] = None
    addon_ids: Optional[List[str]] = None
    sms_package_id: Optional[str] = None

class CompleteSignupRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    plan_id: str
    billing_interval: str = "YEARLY"
    token: Optional[str] = None

class RegisterAndSubscribeRequest(BaseModel):
    company_name: str
    email: str
    password: str
    plan_id: str
    billing_interval: str = "YEARLY"
    referral_code: Optional[str] = None

# --- Helper Functions ---

def serialize_tenant(tenant) -> Optional[dict]:
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

def serialize_plan(plan) -> Optional[dict]:
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
        'monthlyPrice': plan.get_monthly_price() if hasattr(plan, 'get_monthly_price') else None,
        'yearlyPrice': plan.get_yearly_price() if hasattr(plan, 'get_yearly_price') else None,
    }

# --- Routes ---

@router.post("/subscribe", operation_id="createSubscriptionSubscribe", response_model=ResponseEnvelope[SubscriptionResponse])
def subscribe(
    request_data: SubscribeRequest,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Subscribe to a plan (Mock Payment)"""
    from models.tenant import Tenant, TenantStatus
    from models.plan import Plan
    from models.user import User
    
    user = access.user
    if not user:
        raise HTTPException(status_code=401, detail="User context required")
    
    # Only tenant admin or super admin can subscribe
    if user.role not in ['tenant_admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Mock Payment Validation
    card_number = request_data.card_number
    if card_number:
        if len(card_number) < 16:
            raise HTTPException(status_code=400, detail="Invalid card number")
        if card_number.endswith('0000'):
            raise HTTPException(status_code=400, detail="Payment failed (Mock Failure)")
    
    plan = db.get(Plan, request_data.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    tenant = None
    if user.tenant_id:
        tenant = db.get(Tenant, user.tenant_id)
    
    # If no tenant, create one
    if not tenant:
        company_name = request_data.company_name or f"{user.username}'s Clinic"
        tenant = Tenant(
            name=company_name,
            slug=Tenant.generate_slug(company_name),
            owner_email=user.email or f"{user.phone}@mobile.x-ear.com",
            billing_email=user.email or f"{user.phone}@mobile.x-ear.com",
            status=TenantStatus.ACTIVE.value
        )
        db.add(tenant)
        db.flush()
        
        user.tenant_id = tenant.id
        user.role = 'tenant_admin'
    
    start_date = datetime.now(timezone.utc)
    if request_data.billing_interval == 'YEARLY':
        end_date = start_date + timedelta(days=365)
    elif request_data.billing_interval == 'MONTHLY':
        end_date = start_date + timedelta(days=30)
    else:
        end_date = start_date + timedelta(days=365)
    
    # Update Tenant Subscription
    tenant.current_plan_id = plan.id
    tenant.current_plan = plan.slug
    tenant.subscription_start_date = start_date
    tenant.subscription_end_date = end_date
    tenant.status = TenantStatus.ACTIVE.value
    
    # Initialize feature usage
    feature_usage = tenant.feature_usage or {}
    
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
    
    # Process SMS Package
    if request_data.sms_package_id:
        from models.sms_package import SmsPackage
        sms_pkg = db.get(SmsPackage, request_data.sms_package_id)
        if sms_pkg:
            current_credits = feature_usage.get('sms_credits', 0)
            if isinstance(current_credits, dict):
                current_credits = current_credits.get('limit', 0)
            feature_usage['sms_credits'] = current_credits + sms_pkg.sms_count
    
    tenant.feature_usage = feature_usage
    flag_modified(tenant, "feature_usage")
    
    db.commit()
    
    return ResponseEnvelope(data=SubscriptionResponse(
        message='Subscription successful',
        tenant=serialize_tenant(tenant),
        plan=serialize_plan(plan)
    ))

@router.post("/complete-signup", operation_id="createSubscriptionCompleteSignup", response_model=ResponseEnvelope[SignupResponse])
def complete_signup(
    request_data: CompleteSignupRequest,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Complete user signup and subscribe"""
    from models.tenant import Tenant, TenantStatus
    from models.plan import Plan
    from models.user import User
    
    user = access.user
    if not user:
        raise HTTPException(status_code=401, detail="User context required")
    
    # Update User Profile
    if request_data.email:
        existing = db.query(User).filter_by(email=request_data.email).first()
        if existing and existing.id != user.id:
            raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kullanımda")
        user.email = request_data.email
    
    if request_data.password:
        user.set_password(request_data.password)
    
    if request_data.first_name:
        user.first_name = request_data.first_name
    
    if request_data.last_name:
        user.last_name = request_data.last_name
    
    # Create Tenant if not exists
    tenant = None
    if user.tenant_id:
        tenant = db.get(Tenant, user.tenant_id)
    
    if not tenant:
        company_name = request_data.company_name or f"{user.first_name}'s Clinic"
        slug = Tenant.generate_slug(company_name)
        
        tenant = Tenant(
            name=company_name,
            slug=slug,
            owner_email=user.email or f"{user.phone}@mobile.x-ear.com",
            billing_email=user.email or f"{user.phone}@mobile.x-ear.com",
            status=TenantStatus.ACTIVE.value
        )
        db.add(tenant)
        db.flush()
        
        user.tenant_id = tenant.id
        user.role = 'tenant_admin'
    
    # Handle Subscription
    plan = db.get(Plan, request_data.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Geçersiz plan")
    
    start_date = datetime.now(timezone.utc)
    if request_data.billing_interval == 'YEARLY':
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
    
    db.commit()
    
    return ResponseEnvelope(data=SignupResponse(
        message='Hesap oluşturma ve abonelik başarılı',
        tenant=serialize_tenant(tenant),
        user={'id': user.id, 'email': user.email, 'role': user.role},
        token=request_data.token
    ))

@router.get("/current", operation_id="listSubscriptionCurrent", response_model=ResponseEnvelope[CurrentSubscriptionResponse])
def get_current(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get current subscription details"""
    from models.tenant import Tenant
    from models.plan import Plan
    
    user = access.user
    
    # Super admin doesn't have tenant subscription
    if not user or access.is_admin or access.is_super_admin:
        return ResponseEnvelope(data=CurrentSubscriptionResponse(
            tenant=None,
            plan=None,
            is_super_admin=True,
            message='Admin context - no tenant subscription'
        ))
    
    tenant = db.get(Tenant, access.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    plan = None
    if tenant.current_plan_id:
        plan = db.get(Plan, tenant.current_plan_id)
    
    # Check if expired
    is_expired = False
    days_remaining = 0
    if tenant.subscription_end_date:
        now = datetime.now(timezone.utc)
        if tenant.subscription_end_date < now:
            is_expired = True
        else:
            delta = tenant.subscription_end_date - now
            days_remaining = delta.days
    
    return ResponseEnvelope(data=CurrentSubscriptionResponse(
        tenant=serialize_tenant(tenant),
        plan=serialize_plan(plan),
        is_expired=is_expired,
        days_remaining=days_remaining
    ))

@router.post("/register-and-subscribe", operation_id="createSubscriptionRegisterAndSubscribe", response_model=ResponseEnvelope[SignupResponse], status_code=201)
def register_and_subscribe(
    request_data: RegisterAndSubscribeRequest,
    db: Session = Depends(get_db)
):
    """Register new tenant and subscribe (Public)"""
    from models.tenant import Tenant, TenantStatus
    from models.plan import Plan
    from models.user import User
    from routers.auth import create_access_token
    
    # Check if user exists
    if db.query(User).filter_by(email=request_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check plan
    plan = db.get(Plan, request_data.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    try:
        # Create Tenant
        tenant = Tenant(
            name=request_data.company_name,
            slug=Tenant.generate_slug(request_data.company_name),
            owner_email=request_data.email,
            billing_email=request_data.email,
            status=TenantStatus.ACTIVE.value
        )
        
        # Subscription logic
        start_date = datetime.now(timezone.utc)
        if request_data.billing_interval == 'YEARLY':
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
        if request_data.referral_code:
            from models.affiliate_user import AffiliateUser
            affiliate = db.query(AffiliateUser).filter_by(code=request_data.referral_code).first()
            if affiliate and affiliate.is_active:
                tenant.affiliate_id = affiliate.id
                tenant.referral_code = request_data.referral_code
        
        db.add(tenant)
        db.flush()
        
        # Create User
        user = User(
            email=request_data.email,
            username=request_data.email.split('@')[0],
            role='tenant_admin',
            tenant_id=tenant.id,
            is_active=True
        )
        user.set_password(request_data.password)
        db.commit()
        
        # Generate Referral Commission (Regression Fix)
        if request_data.referral_code and plan.price and float(plan.price) > 0:
            try:
                from services.commission_service import CommissionService
                commission_amount = float(plan.price) * 0.10  # 10% commission
                CommissionService.create_commission(
                    db=db,
                    affiliate_id=tenant.affiliate_id,
                    tenant_id=tenant.id,
                    event='signup_subscription',
                    amount=commission_amount
                )
            except Exception as e:
                # Log error but don't fail registration
                logger.error(f"Failed to create commission: {e}")
        
        # Generate Token
        access_token = create_access_token(identity=user.id)
        
        return ResponseEnvelope(data=SignupResponse(
            message='Registration and subscription successful',
            token=access_token,
            user={'id': user.id, 'email': user.email, 'role': user.role},
            tenant=serialize_tenant(tenant)
        ))
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Registration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
