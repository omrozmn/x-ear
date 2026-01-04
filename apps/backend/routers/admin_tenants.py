"""
FastAPI Admin Tenants Router - Migrated from Flask routes/admin_tenants.py
Handles tenant/organization management for admin panel
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
import logging
import uuid

from sqlalchemy.orm import Session
from sqlalchemy import func

from dependencies import get_db, get_current_admin_user
from schemas.base import ResponseEnvelope
from models.admin_user import AdminUser
from models.tenant import Tenant, TenantStatus
from models.user import User
from models.plan import Plan
from models.addon import AddOn

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/tenants", tags=["Admin Tenants"])

# --- Request Schemas ---

class CreateTenantRequest(BaseModel):
    name: str
    owner_email: str
    slug: Optional[str] = None
    description: Optional[str] = None
    billing_email: Optional[str] = None
    status: Optional[str] = "trial"
    current_plan: Optional[str] = None
    max_users: Optional[int] = 5
    current_users: Optional[int] = 0
    company_info: Optional[Dict[str, Any]] = {}
    settings: Optional[Dict[str, Any]] = {}

class UpdateTenantRequest(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    owner_email: Optional[str] = None
    billing_email: Optional[str] = None
    status: Optional[str] = None
    current_plan: Optional[str] = None
    max_users: Optional[int] = None
    current_users: Optional[int] = None
    company_info: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None
    feature_usage: Optional[Dict[str, Any]] = None

class SubscribeTenantRequest(BaseModel):
    plan_id: str
    billing_interval: Optional[str] = "YEARLY"

class CreateTenantUserRequest(BaseModel):
    email: str
    password: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = "tenant_user"
    is_active: Optional[bool] = True

class UpdateTenantUserRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class AddAddonRequest(BaseModel):
    addon_id: str

class UpdateStatusRequest(BaseModel):
    status: str

class UpdateDocumentStatusRequest(BaseModel):
    status: str
    note: Optional[str] = None

# --- Routes ---

@router.get("")
def list_tenants(
    page: int = 1,
    limit: int = 20,
    status: str = "",
    search: str = "",
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """List all tenants"""
    try:
        query = db_session.query(Tenant).filter(Tenant.deleted_at.is_(None))
        
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
        
        # Get user counts
        tenant_ids = [t.id for t in tenants]
        tenants_list = []
        
        if tenant_ids:
            user_counts = db_session.query(
                User.tenant_id, func.count(User.id)
            ).filter(User.tenant_id.in_(tenant_ids)).group_by(User.tenant_id).all()
            counts_map = {t_id: count for t_id, count in user_counts}
            
            for t in tenants:
                t_dict = t.to_dict()
                t_dict['current_users'] = counts_map.get(t.id, 0)
                tenants_list.append(t_dict)
        
        return ResponseEnvelope(data={
            "tenants": tenants_list,
            "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}
        })
    except Exception as e:
        logger.error(f"List tenants error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
def create_tenant(
    request_data: CreateTenantRequest,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Create tenant"""
    try:
        tenant = Tenant(
            id=str(uuid.uuid4()),
            name=request_data.name,
            slug=request_data.slug or Tenant.generate_slug(request_data.name),
            description=request_data.description,
            owner_email=request_data.owner_email,
            billing_email=request_data.billing_email or request_data.owner_email,
            status=request_data.status or TenantStatus.TRIAL.value,
            current_plan=request_data.current_plan,
            max_users=request_data.max_users,
            current_users=request_data.current_users,
            company_info=request_data.company_info,
            settings=request_data.settings
        )
        db_session.add(tenant)
        db_session.commit()
        return ResponseEnvelope(data={"tenant": tenant.to_dict()})
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create tenant error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{tenant_id}")
def get_tenant(
    tenant_id: str,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Get tenant details"""
    tenant = db_session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
    return ResponseEnvelope(data={"tenant": tenant.to_dict()})

@router.put("/{tenant_id}")
def update_tenant(
    tenant_id: str,
    request_data: UpdateTenantRequest,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Update tenant"""
    try:
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        update_data = request_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(tenant, key, value)
        
        tenant.updated_at = datetime.utcnow()
        db_session.commit()
        return ResponseEnvelope(data={"tenant": tenant.to_dict()})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update tenant error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{tenant_id}")
def delete_tenant(
    tenant_id: str,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Delete tenant (soft delete)"""
    try:
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        tenant.soft_delete()
        db_session.commit()
        return ResponseEnvelope(message="Tenant deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Delete tenant error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{tenant_id}/users")
def get_tenant_users(
    tenant_id: str,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Get users for a specific tenant"""
    tenant = db_session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
    
    users = db_session.query(User).filter_by(tenant_id=tenant_id).all()
    
    return ResponseEnvelope(data={
        "users": [{
            "id": u.id, "username": u.username, "email": u.email,
            "first_name": u.first_name, "last_name": u.last_name,
            "role": u.role, "is_active": u.is_active,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "tenant_id": u.tenant_id
        } for u in users]
    })

@router.post("/{tenant_id}/users")
def create_tenant_user(
    tenant_id: str,
    request_data: CreateTenantUserRequest,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Create a user for a specific tenant"""
    try:
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        if db_session.query(User).filter_by(email=request_data.email).first():
            raise HTTPException(status_code=400, detail={"message": "Email already exists", "code": "CONFLICT"})
        
        user = User(
            email=request_data.email,
            username=request_data.username or request_data.email.split('@')[0],
            first_name=request_data.first_name,
            last_name=request_data.last_name,
            role=request_data.role,
            tenant_id=tenant_id,
            is_active=request_data.is_active
        )
        user.set_password(request_data.password)
        db_session.add(user)
        db_session.commit()
        
        return ResponseEnvelope(data={"user": {
            "id": user.id, "username": user.username, "email": user.email,
            "first_name": user.first_name, "last_name": user.last_name,
            "role": user.role, "is_active": user.is_active, "tenant_id": user.tenant_id
        }})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create tenant user error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{tenant_id}/users/{user_id}")
def update_tenant_user(
    tenant_id: str,
    user_id: str,
    request_data: UpdateTenantUserRequest,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Update a tenant user"""
    try:
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        user = db_session.query(User).filter_by(id=user_id, tenant_id=tenant_id).first()
        if not user:
            raise HTTPException(status_code=404, detail={"message": "User not found in this tenant", "code": "NOT_FOUND"})
        
        if request_data.email:
            existing = db_session.query(User).filter(User.email == request_data.email, User.id != user_id).first()
            if existing:
                raise HTTPException(status_code=400, detail={"message": "Email already in use", "code": "CONFLICT"})
            user.email = request_data.email
        
        if request_data.username:
            existing = db_session.query(User).filter(User.username == request_data.username, User.id != user_id).first()
            if existing:
                raise HTTPException(status_code=400, detail={"message": "Username already in use", "code": "CONFLICT"})
            user.username = request_data.username
        
        if request_data.first_name is not None:
            user.first_name = request_data.first_name
        if request_data.last_name is not None:
            user.last_name = request_data.last_name
        if request_data.role is not None:
            user.role = request_data.role
        if request_data.is_active is not None:
            user.is_active = request_data.is_active
        if request_data.password:
            user.set_password(request_data.password)
        
        db_session.commit()
        return ResponseEnvelope(data={"user": {
            "id": user.id, "username": user.username, "email": user.email,
            "first_name": user.first_name, "last_name": user.last_name,
            "role": user.role, "is_active": user.is_active, "tenant_id": user.tenant_id
        }})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update tenant user error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{tenant_id}/subscribe")
def subscribe_tenant(
    tenant_id: str,
    request_data: SubscribeTenantRequest,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Subscribe tenant to a plan"""
    try:
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        plan = db_session.get(Plan, request_data.plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail={"message": "Plan not found", "code": "NOT_FOUND"})
        
        start_date = datetime.utcnow()
        if request_data.billing_interval == 'YEARLY':
            end_date = start_date + timedelta(days=365)
        else:
            end_date = start_date + timedelta(days=30)
        
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
                    key = (feature.get('key', '') or '').lower()
                    if key:
                        feature_usage[key] = {'limit': feature.get('limit', 0), 'used': 0, 'last_reset': start_date.isoformat()}
            elif isinstance(plan.features, dict):
                for raw_key, value in plan.features.items():
                    key = raw_key.lower()
                    limit = value.get('limit', 0) if isinstance(value, dict) else (value if isinstance(value, (int, float)) else 0)
                    feature_usage[key] = {'limit': limit, 'used': 0, 'last_reset': start_date.isoformat()}
        
        tenant.feature_usage = feature_usage
        db_session.commit()
        
        return ResponseEnvelope(message="Subscription updated successfully", data={"tenant": tenant.to_dict()})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Subscribe tenant error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{tenant_id}/addons")
def add_tenant_addon(
    tenant_id: str,
    request_data: AddAddonRequest,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Add addon to tenant"""
    try:
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        addon = db_session.get(AddOn, request_data.addon_id)
        if not addon:
            raise HTTPException(status_code=404, detail={"message": "Addon not found", "code": "NOT_FOUND"})
        
        key = addon.unit_name or addon.slug or 'unknown'
        settings = dict(tenant.settings or {})
        purchased_addons = list(settings.get('addons', []))
        
        purchased_addons.append({
            'addon_id': addon.id, 'name': addon.name,
            'price': float(addon.price) if addon.price else 0,
            'limit_amount': addon.limit_amount, 'unit_name': addon.unit_name,
            'added_at': datetime.utcnow().isoformat(), 'added_by_admin': True
        })
        
        settings['addons'] = purchased_addons
        tenant.settings = settings
        
        if not tenant.feature_usage:
            tenant.feature_usage = {}
        
        usage = dict(tenant.feature_usage)
        if key in usage:
            usage[key]['limit'] = usage[key].get('limit', 0) + (addon.limit_amount or 0)
        else:
            usage[key] = {'limit': addon.limit_amount or 0, 'used': 0, 'last_reset': datetime.utcnow().isoformat()}
        
        tenant.feature_usage = usage
        db_session.commit()
        
        return ResponseEnvelope(message="Addon added successfully", data={"tenant": tenant.to_dict(), "added_addon": purchased_addons[-1]})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Add tenant addon error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{tenant_id}/addons")
def remove_tenant_addon(
    tenant_id: str,
    addon_id: str,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Remove addon from tenant"""
    try:
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        addon = db_session.get(AddOn, addon_id)
        if not addon:
            raise HTTPException(status_code=404, detail={"message": "Addon not found", "code": "NOT_FOUND"})
        
        settings = dict(tenant.settings or {})
        purchased_addons = list(settings.get('addons', []))
        
        removed_addon = None
        for i, a in enumerate(purchased_addons):
            if a.get('addon_id') == addon_id or a.get('id') == addon_id:
                removed_addon = purchased_addons.pop(i)
                break
        
        if not removed_addon:
            raise HTTPException(status_code=400, detail={"message": "This addon is not active for this tenant", "code": "INVALID_OPERATION"})
        
        settings['addons'] = purchased_addons
        tenant.settings = settings
        
        key = addon.unit_name or addon.slug or 'unknown'
        usage = dict(tenant.feature_usage or {})
        if key in usage:
            usage[key]['limit'] = max(0, usage[key].get('limit', 0) - (addon.limit_amount or 0))
            tenant.feature_usage = usage
        
        db_session.commit()
        return ResponseEnvelope(message="Addon removed and limits decreased", data={"tenant": tenant.to_dict()})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Remove tenant addon error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{tenant_id}/status")
def update_tenant_status(
    tenant_id: str,
    request_data: UpdateStatusRequest,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Update tenant status"""
    try:
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        tenant.status = request_data.status
        tenant.updated_at = datetime.utcnow()
        db_session.commit()
        
        return ResponseEnvelope(data={"tenant": tenant.to_dict()})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update tenant status error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
