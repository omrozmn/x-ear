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

from schemas.base import ResponseEnvelope
from models.admin_user import AdminUser
from models.tenant import Tenant, TenantStatus
from models.user import User
from models.plan import Plan
from models.plan import Plan
from models.addon import AddOn
from schemas.tenants import TenantCreate, TenantUpdate, TenantRead, TenantStatus
from schemas.users import UserRead, UserListResponse, UserResponse
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db
from core.models.enums import ProductCode

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/tenants", tags=["Admin Tenants"])

# --- Request Schemas ---

# Local request schems removed/replaced with canonical ones. 
# Keeping generic helpers for strictness if needed, but for now we map direct.

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

@router.get("", operation_id="listAdminTenants")
def list_tenants(
    page: int = 1,
    limit: int = 20,
    status: str = "",
    search: str = "",
    product_code: Optional[ProductCode] = None,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """List all tenants"""
    try:
        query = db_session.query(Tenant).filter(Tenant.deleted_at.is_(None))
        
        if status:
            query = query.filter_by(status=status)
        if product_code:
            query = query.filter_by(product_code=product_code.value)
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
                # Use Pydantic schema for type-safe serialization (NO to_dict())
                t_dict = TenantRead.model_validate(t).model_dump(by_alias=True)
                t_dict['currentUsers'] = counts_map.get(t.id, 0)
                tenants_list.append(t_dict)
        
        return ResponseEnvelope(data={
            "tenants": tenants_list,
            "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}
        })
    except Exception as e:
        logger.error(f"List tenants error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", operation_id="createAdminTenant", response_model=ResponseEnvelope[TenantRead])
def create_tenant(
    request_data: TenantCreate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
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
            status=request_data.status.value if request_data.status else TenantStatus.TRIAL.value,
            current_plan=request_data.current_plan,
            max_users=request_data.max_users,
            current_users=request_data.current_users,
            company_info=request_data.company_info,
            settings=request_data.settings,
            product_code=request_data.product_code.value if request_data.product_code else ProductCode.XEAR_HEARING.value
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)

        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=TenantRead.model_validate(tenant).model_dump(by_alias=True))
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create tenant error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{tenant_id}", operation_id="getAdminTenant")
def get_tenant(
    tenant_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get tenant details"""
    tenant = db_session.get(Tenant, tenant_id)
    if not tenant or tenant.deleted_at:
        raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
    # Use Pydantic schema for type-safe serialization (NO to_dict())
    return ResponseEnvelope(data={"tenant": TenantRead.model_validate(tenant).model_dump(by_alias=True)})

@router.put("/{tenant_id}", operation_id="updateAdminTenant", response_model=ResponseEnvelope[TenantRead])
def update_tenant(
    tenant_id: str,
    request_data: TenantUpdate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
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
        db_session.refresh(tenant)
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=TenantRead.model_validate(tenant).model_dump(by_alias=True))
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update tenant error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{tenant_id}", operation_id="deleteAdminTenant")
def delete_tenant(
    tenant_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
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

@router.get("/{tenant_id}/users", operation_id="listAdminTenantUsers", response_model=ResponseEnvelope[UserListResponse])
def get_tenant_users(
    tenant_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get users for a specific tenant"""
    tenant = db_session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
    
    users = db_session.query(User).filter_by(tenant_id=tenant_id).all()
    
    return ResponseEnvelope(data=UserListResponse(users=users))

@router.post("/{tenant_id}/users", operation_id="createAdminTenantUsers", response_model=ResponseEnvelope[UserResponse])
def create_tenant_user(
    tenant_id: str,
    request_data: CreateTenantUserRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
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
        
        return ResponseEnvelope(data=UserResponse(user=user))
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create tenant user error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{tenant_id}/users/{user_id}", operation_id="updateAdminTenantUser", response_model=ResponseEnvelope[UserResponse])
def update_tenant_user(
    tenant_id: str,
    user_id: str,
    request_data: UpdateTenantUserRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
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
        return ResponseEnvelope(data=UserResponse(user=user))
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update tenant user error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{tenant_id}/subscribe", operation_id="createAdminTenantSubscribe")
def subscribe_tenant(
    tenant_id: str,
    request_data: SubscribeTenantRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
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
        db_session.refresh(tenant)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(message="Subscription updated successfully", data={"tenant": TenantRead.model_validate(tenant).model_dump(by_alias=True)})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Subscribe tenant error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{tenant_id}/addons", operation_id="createAdminTenantAddons")
def add_tenant_addon(
    tenant_id: str,
    request_data: AddAddonRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
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
        db_session.refresh(tenant)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(message="Addon added successfully", data={"tenant": TenantRead.model_validate(tenant).model_dump(by_alias=True), "addedAddon": purchased_addons[-1]})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Add tenant addon error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{tenant_id}/addons", operation_id="deleteAdminTenantAddons")
def remove_tenant_addon(
    tenant_id: str,
    addon_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
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
        db_session.refresh(tenant)
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(message="Addon removed and limits decreased", data={"tenant": TenantRead.model_validate(tenant).model_dump(by_alias=True)})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Remove tenant addon error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{tenant_id}/status", operation_id="updateAdminTenantStatus")
def update_tenant_status(
    tenant_id: str,
    request_data: UpdateStatusRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Update tenant status"""
    try:
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        tenant.status = request_data.status
        tenant.updated_at = datetime.utcnow()
        db_session.commit()
        db_session.refresh(tenant)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data={"tenant": TenantRead.model_validate(tenant).model_dump(by_alias=True)})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update tenant status error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# --- SMS Config Endpoints (Migrated from Flask - Full Implementation) ---

@router.get("/{tenant_id}/sms-config", operation_id="listAdminTenantSmsConfig")
def get_tenant_sms_config(
    tenant_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get SMS configuration for a tenant (admin view) - Flask parity"""
    try:
        from models.sms_integration import SMSProviderConfig
        
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        config = db_session.query(SMSProviderConfig).filter_by(tenant_id=tenant_id).first()
        if not config:
            return ResponseEnvelope(data=None)
        
        return ResponseEnvelope(data={
            'apiUsername': config.api_username,
            'documentsEmail': config.documents_email,
            'documentsSubmitted': config.documents_submitted,
            'allDocumentsApproved': config.all_documents_approved
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get tenant SMS config error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{tenant_id}/sms-documents", operation_id="listAdminTenantSmsDocuments")
def get_tenant_sms_documents(
    tenant_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get SMS documents for a tenant - Flask parity"""
    try:
        from models.sms_integration import SMSProviderConfig
        
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        config = db_session.query(SMSProviderConfig).filter_by(tenant_id=tenant_id).first()
        if not config:
            return ResponseEnvelope(data={'documents': [], 'documentsSubmitted': False})
        
        documents = config.documents_json or []
        
        return ResponseEnvelope(data={
            'documents': documents,
            'documentsSubmitted': config.documents_submitted or False,
            'documentsSubmittedAt': config.documents_submitted_at.isoformat() if config.documents_submitted_at else None,
            'allDocumentsApproved': config.all_documents_approved or False
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get tenant SMS documents error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import Response
import os

@router.get("/{tenant_id}/sms-documents/{document_type}/download", operation_id="listAdminTenantSmsDocumentDownload")
def download_tenant_sms_document(
    tenant_id: str,
    document_type: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get download URL for a tenant's SMS document - Flask parity"""
    try:
        from models.sms_integration import SMSProviderConfig
        
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        config = db_session.query(SMSProviderConfig).filter_by(tenant_id=tenant_id).first()
        if not config:
            raise HTTPException(status_code=404, detail={"message": "No SMS configuration found", "code": "NOT_FOUND"})
        
        docs = config.documents_json or []
        doc = next((d for d in docs if d.get('type') == document_type), None)
        
        if not doc:
            raise HTTPException(status_code=404, detail={"message": "Document not found", "code": "NOT_FOUND"})
        
        filepath = doc.get('filepath')
        if not filepath:
            raise HTTPException(status_code=404, detail={"message": "File path not found", "code": "NOT_FOUND"})
        
        # Return URL for static file serving (same as Flask)
        url = f"/api/sms/documents/file/{filepath}"
        
        return ResponseEnvelope(data={'url': url, 'filename': doc.get('filename', 'document')})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download tenant SMS document error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class DocumentStatusUpdate(BaseModel):
    status: str  # 'approved' or 'revision_requested'
    note: Optional[str] = None

@router.put("/{tenant_id}/sms-documents/{document_type}/status", operation_id="updateAdminTenantSmsDocumentStatus")
def update_tenant_sms_document_status(
    tenant_id: str,
    document_type: str,
    request_data: DocumentStatusUpdate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Update SMS document status (approve/request revision) - Flask parity"""
    try:
        from models.sms_integration import SMSProviderConfig
        
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        config = db_session.query(SMSProviderConfig).filter_by(tenant_id=tenant_id).first()
        if not config:
            raise HTTPException(status_code=404, detail={"message": "No SMS configuration found", "code": "NOT_FOUND"})
        
        if request_data.status not in ['approved', 'revision_requested']:
            raise HTTPException(status_code=400, detail={"message": "Invalid status", "code": "INVALID_STATUS"})
        
        docs = config.documents_json or []
        doc = next((d for d in docs if d.get('type') == document_type), None)
        
        if not doc:
            raise HTTPException(status_code=404, detail={"message": "Document not found", "code": "NOT_FOUND"})
        
        doc['status'] = request_data.status
        doc['reviewedAt'] = datetime.utcnow().isoformat()
        doc['reviewedBy'] = access.principal_id
        
        if request_data.status == 'revision_requested':
            doc['revisionNote'] = request_data.note or ''
        
        config.documents_json = docs
        
        # Check if all documents are approved
        all_approved = all(d.get('status') == 'approved' for d in docs)
        config.all_documents_approved = all_approved
        
        db_session.commit()
        
        return ResponseEnvelope(data={
            'document': doc,
            'allDocumentsApproved': all_approved
        })
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update SMS document status error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{tenant_id}/sms-documents/send-email", operation_id="createAdminTenantSmsDocumentSendEmail")
def send_tenant_sms_documents_email(
    tenant_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Send all approved SMS documents via email - Flask parity"""
    try:
        from models.sms_integration import SMSProviderConfig
        from services.email_service import email_service
        
        tenant = db_session.get(Tenant, tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        config = db_session.query(SMSProviderConfig).filter_by(tenant_id=tenant_id).first()
        if not config:
            raise HTTPException(status_code=404, detail={"message": "No SMS configuration found", "code": "NOT_FOUND"})
        
        if not config.all_documents_approved:
            raise HTTPException(status_code=400, detail={"message": "Not all documents are approved", "code": "NOT_APPROVED"})
        
        if not config.documents_email:
            raise HTTPException(status_code=400, detail={"message": "No email address configured", "code": "NO_EMAIL"})
        
        docs = config.documents_json or []
        if not docs:
            raise HTTPException(status_code=400, detail={"message": "No documents to send", "code": "NO_DOCUMENTS"})
        
        # Prepare email body
        subject = f"SMS Başvuru Belgeleri - {tenant.name}"
        body = f"""
Merhaba,

{tenant.name} firması için SMS başvuru belgelerini ekte bulabilirsiniz.

Firma Bilgileri:
- Firma Adı: {tenant.name}
- Yönetici Email: {tenant.owner_email}
- API Username: {config.api_username}

Belgeler:
"""
        for doc in docs:
            body += f"\n- {doc.get('filename', 'Belge')} ({doc.get('type', 'unknown')})"
        
        body += "\n\nİyi çalışmalar."
        
        # Send email
        is_dev = os.getenv('ENVIRONMENT', 'production') == 'development'
        
        if is_dev:
            # Development mode - simulate email sending
            logger.info("=" * 80)
            logger.info("📧 EMAIL SIMULATION (Development Mode)")
            logger.info("=" * 80)
            logger.info(f"To: {config.documents_email}")
            logger.info(f"Subject: {subject}")
            logger.info("-" * 80)
            logger.info(f"Body: {body}")
            logger.info("=" * 80)
            
            return ResponseEnvelope(data={
                'message': 'E-posta başarıyla gönderildi (Development: Simulated)',
                'simulated': True,
                'recipient': config.documents_email,
                'attachments': len(docs)
            })
        else:
            # Production mode - send real email
            success = email_service.send_email(
                to=config.documents_email,
                subject=subject,
                body_html=f"<html><body><pre>{body}</pre></body></html>",
                body_text=body
            )
            
            if success:
                logger.info(f"SMS documents email sent to {config.documents_email} for tenant {tenant_id}")
                return ResponseEnvelope(data={
                    'message': 'E-posta başarıyla gönderildi',
                    'simulated': False,
                    'recipient': config.documents_email,
                    'attachments': len(docs)
                })
            else:
                raise HTTPException(status_code=500, detail={"message": "E-posta gönderilemedi", "code": "MAIL_FAILED"})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send SMS documents email error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
