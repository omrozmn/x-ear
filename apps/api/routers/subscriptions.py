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
    SubscriptionResponse, SignupResponse, CurrentSubscriptionResponse
)
from middleware.unified_access import UnifiedAccess, require_access
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
            if isinstance(feature, dict):
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
    
    # Generate Referral Commission
    if tenant.affiliate_id and plan.price and float(plan.price) > 0:
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
            logger.error(f"Failed to create commission for tenant {tenant.id}: {e}")
            # Do not fail subscription if commission fails

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
    # Check if user has tenant_id attribute (User model has it, AdminUser doesn't)
    user_tenant_id = getattr(user, 'tenant_id', None)
    if user_tenant_id:
        tenant = db.get(Tenant, user_tenant_id)
    
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

# ── Feature-flag definitions ──────────────────────────────────────
# Every sidebar menu item maps to a feature key.  Plan.features JSON
# stores the enabled keys: {"invoices": true, "sgk": true, ...}
# Features NOT listed in a plan are disabled by default.
# Super-admin / impersonating always get ALL features.

# Core features always available (no plan restriction)
ALL_FEATURE_DEFAULTS = {
    # Hastalar / Müşteriler
    'patients': True,
    'patients.devices': True, 'patients.sales': True, 'patients.timeline': True,
    'patients.documents': True, 'patients.hearing_tests': True, 'patients.notes': True,
    # Randevular
    'appointments': True,
    # Envanter
    'inventory': True,
    # Tedarikçiler
    'suppliers': True, 'suppliers.all': True, 'suppliers.suggested': True,
    # Satış & Alış & Ödeme
    'sales': True, 'purchases': True, 'payments': True,
    # Kampanyalar
    'campaigns': True,
    'campaigns.sms': True, 'campaigns.whatsapp': True, 'campaigns.email': True,
    # Web Sitesi
    'website_builder': True,
    'website_builder.content': True, 'website_builder.appearance': True,
    'website_builder.pages': True, 'website_builder.publishing': True,
    'website_builder.blog': True, 'website_builder.products': True,
    'website_builder.orders': True, 'website_builder.commerce': True,
    'website_builder.appointments': True, 'website_builder.chatbot': True,
    'website_builder.marketplace': True,
    # Faturalar
    'invoices': True,
    'invoices.outgoing': True, 'invoices.incoming': True,
    'invoices.proformas': True, 'invoices.summary': True, 'invoices.new': True,
    # SGK
    'sgk': True,
    'sgk.documents': True, 'sgk.upload': True, 'sgk.downloads': True,
    'sgk.stats': True, 'sgk.workflow': True, 'sgk.reports': True,
    # Raporlar
    'reports': True,
    'reports.overview': True, 'reports.sales': True, 'reports.parties': True,
    'reports.promissory': True, 'reports.remaining': True, 'reports.pos_movements': True,
    'reports.report_tracking': True, 'reports.activity': True,
    # Diğer modüller
    'uts': True, 'invoice_normalizer': True, 'cashflow': True,
    'pos': True, 'automation': True, 'ai_chat': True,
    # Personel
    'personnel': True,
    'personnel.employees': True, 'personnel.leave': True,
    'personnel.documents': True, 'personnel.compensation': True,
    # Ayarlar
    'settings': True,
    'settings.company': True, 'settings.integration': True,
    'settings.team': True, 'settings.parties': True,
    'settings.sgk': True, 'settings.subscription': True,
    # Barkod
    'barcode': True,
    'barcode.scanner': True, 'barcode.camera': True, 'barcode.generator': True,
    'barcode.validation': True, 'barcode.labels': True, 'barcode.gs1': False,
    # E-Ticaret
    'ecommerce': False,
    # Gizli özellikler
    'integrations_ui': False, 'pricing_ui': False, 'security_ui': False,
}


class FeaturesResponse(BaseModel):
    features: dict  # {feature_key: bool}
    plan_name: Optional[str] = None
    is_super_admin: bool = False
    sector: str = "hearing"
    enabled_modules: list[str] = []


@router.get("/features", operation_id="listSubscriptionFeatures", response_model=ResponseEnvelope[FeaturesResponse])
def get_enabled_features(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Return enabled feature flags for the current tenant's plan.
    
    Reads admin-configured flags from SystemSetting table (key='features').
    Each flag has mode='visible' or 'hidden', and optional plan restrictions.
    """
    import json
    from models.tenant import Tenant
    from models.plan import Plan
    from core.models.system_setting import SystemSetting

    # Super-admin or impersonating admin → everything enabled
    if access.is_super_admin or (access.is_admin and access.is_impersonating):
        from config.module_registry import get_all_modules
        return ResponseEnvelope(data=FeaturesResponse(
            features={f: True for f in ALL_FEATURE_DEFAULTS},
            plan_name='Super Admin',
            is_super_admin=True,
            sector='hearing',
            enabled_modules=[m.module_id for m in get_all_modules()],
        ))

    # Read admin-configured feature flags from SystemSetting
    setting = db.query(SystemSetting).filter_by(key='features').first()
    admin_flags = {}
    if setting and setting.value:
        try:
            admin_flags = json.loads(setting.value) if isinstance(setting.value, str) else setting.value
        except Exception:
            admin_flags = {}

    # Determine tenant's plan
    tenant = db.get(Tenant, access.tenant_id) if access.tenant_id else None
    plan = None
    plan_id = None
    if tenant:
        plan_id = getattr(tenant, 'current_plan_id', None)
        if plan_id:
            plan = db.get(Plan, plan_id)

    plan_name = plan.name if plan else (getattr(tenant, 'current_plan', None) if tenant else None)

    # Derive sector and country before feature evaluation
    from config.module_registry import get_enabled_module_ids
    tenant_sector = getattr(tenant, 'sector', None) or 'hearing'
    tenant_country = getattr(tenant, 'country_code', None)

    # Build final feature map
    features: dict = {}
    for key, default_val in ALL_FEATURE_DEFAULTS.items():
        flag = admin_flags.get(key)
        if flag and isinstance(flag, dict):
            mode = flag.get('mode', 'visible')
            if mode == 'hidden':
                features[key] = False
                continue
            # Check plan restriction
            allowed_plans = flag.get('plans', [])
            if allowed_plans and plan_id:
                features[key] = plan_id in allowed_plans
            elif allowed_plans and not plan_id:
                features[key] = False
            else:
                features[key] = True
            # Check country restriction
            allowed_countries = flag.get('countries', [])
            if allowed_countries and features[key]:
                if not tenant_country or tenant_country not in allowed_countries:
                    features[key] = False
            # Check sector restriction
            allowed_sectors = flag.get('sectors', [])
            if allowed_sectors and features[key]:
                if tenant_sector not in allowed_sectors:
                    features[key] = False
        else:
            features[key] = default_val

    # Parent→child inheritance: if parent hidden, all children hidden too
    parent_keys = [k for k in ALL_FEATURE_DEFAULTS if '.' not in k]
    for parent_key in parent_keys:
        if not features.get(parent_key, True):
            for child_key in [k for k in features if k.startswith(parent_key + '.')]:
                features[child_key] = False
    enabled_module_ids = list(get_enabled_module_ids(tenant_sector))

    return ResponseEnvelope(data=FeaturesResponse(
        features=features,
        plan_name=plan_name,
        is_super_admin=False,
        sector=tenant_sector,
        enabled_modules=enabled_module_ids,
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
        end_date = tenant.subscription_end_date
        # Ensure both datetimes are offset-aware for comparison
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)
        if end_date < now:
            is_expired = True
        else:
            delta = end_date - now
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
        raise HTTPException(status_code=500, detail="Internal server error")
