"""
FastAPI Tenant Users Router - Migrated from Flask routes/tenant_users.py
Tenant user management and company settings
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import RedirectResponse
from typing import Optional, List
from pydantic import BaseModel, Field
import logging
import os
import uuid as uuid_lib
import base64
from io import BytesIO

from sqlalchemy.orm import Session

from schemas.base import ResponseEnvelope, ApiError
from schemas.users import UserRead
from schemas.tenants import (
    TenantCompanyResponse, TenantAssetResponse, TenantAssetUrlResponse
)

from models.user import User
from models.tenant import Tenant
from models.branch import Branch
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Tenant Users"])

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_BASE64_SIZE = 5 * 1024 * 1024

def _allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

def _get_storage_mode() -> str:
    return os.getenv('STORAGE_MODE', 'local')

# --- Request Schemas ---

class TenantUserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    role: str = "user"
    branch_ids: List[str] = Field(default_factory=list, alias="branchIds")

class TenantUserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    role: Optional[str] = None
    is_active: Optional[bool] = Field(None, alias="isActive")
    branch_ids: Optional[List[str]] = Field(None, alias="branchIds")

class CompanyInfoUpdate(BaseModel):
    name: Optional[str] = None
    tax_id: Optional[str] = Field(None, alias="taxId")
    tax_office: Optional[str] = Field(None, alias="taxOffice")
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    postal_code: Optional[str] = Field(None, alias="postalCode")
    phone: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    bank_name: Optional[str] = Field(None, alias="bankName")
    iban: Optional[str] = None
    account_holder: Optional[str] = Field(None, alias="accountHolder")

class AssetUpload(BaseModel):
    data: str  # Base64 encoded

# --- Routes ---

@router.get("/tenant/users", operation_id="listTenantUsers", response_model=ResponseEnvelope[List[UserRead]])
def list_tenant_users(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """List users belonging to the current tenant"""
    if not access.tenant_id and not access.is_admin and not access.is_super_admin:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="User does not belong to a tenant", code="NO_TENANT").model_dump(mode="json")
        )
    
    query = db_session.query(User)
    
    if access.tenant_id:
        query = query.filter_by(tenant_id=access.tenant_id)
        
        # Branch filtering only for non-super-admin tenant users
        if not access.is_super_admin and access.user and access.user.role == 'admin':
            user_branch_ids = [b.id for b in access.user.branches] if access.user.branches else []
            if user_branch_ids:
                from models.user import user_branches
                query = query.join(user_branches).filter(user_branches.c.branch_id.in_(user_branch_ids))
            else:
                # Use Pydantic schema for type-safe serialization (NO to_dict())
                return ResponseEnvelope(data=[UserRead.model_validate(access.user)])
    
    users = query.all()
    # Use Pydantic schema for type-safe serialization (NO to_dict())
    return ResponseEnvelope(data=[UserRead.model_validate(u) for u in users])

@router.post("/", operation_id="createTenantUser", response_model=ResponseEnvelope[UserRead])
def create_tenant_user(
    user_in: TenantUserCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Create a new user for the tenant"""
    if not access.tenant_id:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="User does not belong to a tenant", code="NO_TENANT").model_dump(mode="json")
        )
    
    # Super admin can always create users, tenant admins can create users
    if not access.is_super_admin and not access.is_tenant_admin:
        if access.user and access.user.role not in ['tenant_admin', 'admin']:
            raise HTTPException(
                status_code=403,
                detail=ApiError(message="Only admins can create users", code="FORBIDDEN").model_dump(mode="json")
            )
    
    if len(user_in.password) < 6:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="Password must be at least 6 characters", code="WEAK_PASSWORD").model_dump(mode="json")
        )
    
    if db_session.query(User).filter_by(username=user_in.username).first():
        raise HTTPException(
            status_code=409,
            detail=ApiError(message="Username already exists", code="USERNAME_EXISTS").model_dump(mode="json")
        )
    
    if user_in.email and db_session.query(User).filter_by(email=user_in.email).first():
        raise HTTPException(
            status_code=409,
            detail=ApiError(message="Email already exists", code="EMAIL_EXISTS").model_dump(mode="json")
        )
    
    new_user = User(
        username=user_in.username,
        email=user_in.email or f"{user_in.username}@{access.tenant_id}.local",
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        tenant_id=access.tenant_id,
        role=user_in.role
    )
    new_user.set_password(user_in.password)
    
    # Check User Limits (Phase 2 enforcement)
    from core.features import feature_gate
    if feature_gate.should_enforce_limits():
        # Check current usage
        current_count = db_session.query(User).filter_by(tenant_id=access.tenant_id).count()
        # Fetch tenant settings if not available in access context (access.tenant_id is string only)
        tenant = db_session.get(Tenant, access.tenant_id)
        if tenant and tenant.max_users and current_count >= tenant.max_users:
             raise HTTPException(
                 status_code=403,
                 detail=ApiError(message=f"User limit reached ({tenant.max_users})", code="LIMIT_REACHED").model_dump(mode="json")
             )

    if user_in.branch_ids:
        branches = db_session.query(Branch).filter(
            Branch.id.in_(user_in.branch_ids),
            Branch.tenant_id == access.tenant_id
        ).all()
        new_user.branches = branches
    
    db_session.add(new_user)
    db_session.commit()
    db_session.refresh(new_user)  # Refresh to get all fields after commit
    
    # Use Pydantic schema for type-safe serialization (NO to_dict())
    return ResponseEnvelope(data=UserRead.model_validate(new_user))

@router.delete("/tenant/users/{user_id}", operation_id="deleteTenantUser")
def delete_tenant_user(
    user_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Remove a user from the tenant"""
    if not access.tenant_id and not access.is_admin and not access.is_super_admin:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="User does not belong to a tenant", code="NO_TENANT").model_dump(mode="json")
        )
    
    # Super admin can always delete users
    if not access.is_super_admin and not access.is_tenant_admin:
        if access.user and access.user.role not in ['tenant_admin', 'admin']:
            raise HTTPException(
                status_code=403,
                detail=ApiError(message="Only admins can remove users", code="FORBIDDEN").model_dump(mode="json")
            )
    
    user_to_delete = db_session.get(User, user_id)
    if not user_to_delete:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="User not found", code="USER_NOT_FOUND").model_dump(mode="json")
        )
    
    if access.tenant_id and user_to_delete.tenant_id != access.tenant_id:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="User does not belong to your tenant", code="FORBIDDEN").model_dump(mode="json")
        )
    
    if access.user and user_to_delete.id == access.user.id:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="Cannot delete yourself", code="SELF_DELETE").model_dump(mode="json")
        )
    
    db_session.delete(user_to_delete)
    db_session.commit()
    
    return ResponseEnvelope(message="User removed")


@router.put("/tenant/users/{user_id}", operation_id="updateTenantUser")
def update_tenant_user(
    user_id: str,
    user_in: TenantUserUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Update a user in the tenant"""
    # Super admin can update any user
    if access.is_super_admin:
        pass  # Allow
    elif not access.tenant_id and not access.is_admin:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="User does not belong to a tenant", code="NO_TENANT").model_dump(mode="json")
        )
    elif access.user and access.user.role not in ['tenant_admin', 'admin']:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Only admins can update users", code="FORBIDDEN").model_dump(mode="json")
        )
    
    user_to_update = db_session.get(User, user_id)
    if not user_to_update:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="User not found", code="USER_NOT_FOUND").model_dump(mode="json")
        )
    
    if access.tenant_id and user_to_update.tenant_id != access.tenant_id:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="User does not belong to your tenant", code="FORBIDDEN").model_dump(mode="json")
        )
    
    if access.user and access.user.role == 'admin' and user_to_update.role == 'tenant_admin':
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Admins cannot edit Tenant Admins", code="FORBIDDEN").model_dump(mode="json")
        )
    
    data = user_in.model_dump(exclude_unset=True, by_alias=False)
    
    if 'username' in data and data['username'] != user_to_update.username:
        if db_session.query(User).filter_by(username=data['username']).first():
            raise HTTPException(
                status_code=409,
                detail=ApiError(message="Username already exists", code="USERNAME_EXISTS").model_dump(mode="json")
            )
        user_to_update.username = data['username']
    
    if 'email' in data and data['email'] != user_to_update.email:
        if db_session.query(User).filter_by(email=data['email']).first():
            raise HTTPException(
                status_code=409,
                detail=ApiError(message="Email already exists", code="EMAIL_EXISTS").model_dump(mode="json")
            )
        user_to_update.email = data['email']
    
    if 'password' in data and data['password']:
        if len(data['password']) < 6:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="Password must be at least 6 characters", code="WEAK_PASSWORD").model_dump(mode="json")
            )
        user_to_update.set_password(data['password'])
    
    if 'first_name' in data:
        user_to_update.first_name = data['first_name']
    if 'last_name' in data:
        user_to_update.last_name = data['last_name']
    if 'role' in data:
        user_to_update.role = data['role']
    if 'is_active' in data:
        user_to_update.is_active = data['is_active']
    
    if 'branch_ids' in data and data['branch_ids'] is not None:
        # For super admin without tenant_id, get branches from user being updated
        effective_tenant_id = access.tenant_id or user_to_update.tenant_id
        if effective_tenant_id:
            branches = db_session.query(Branch).filter(
                Branch.id.in_(data['branch_ids']),
                Branch.tenant_id == effective_tenant_id
            ).all()
            user_to_update.branches = branches
        else:
            # If no tenant context, just assign branches by ID
            branches = db_session.query(Branch).filter(
                Branch.id.in_(data['branch_ids'])
            ).all()
            user_to_update.branches = branches
    
    db_session.commit()
    db_session.refresh(user_to_update)  # Refresh to get all fields after commit
    
    # Use Pydantic schema for type-safe serialization (NO to_dict())
    return ResponseEnvelope(data=UserRead.model_validate(user_to_update))



@router.get("/tenant/company", operation_id="getTenantCompany", response_model=ResponseEnvelope[TenantCompanyResponse])
def get_tenant_company(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get company information for current tenant"""
    try:
        if not access.tenant_id:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="No tenant context", code="NO_TENANT").model_dump(mode="json")
            )
        
        tenant = db_session.get(Tenant, access.tenant_id)
        if not tenant:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Tenant not found", code="TENANT_NOT_FOUND").model_dump(mode="json")
            )
        
        return ResponseEnvelope(data=TenantCompanyResponse.model_validate(tenant))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get tenant company error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tenant/company", operation_id="updateTenantCompany", response_model=ResponseEnvelope[TenantCompanyResponse])
def update_tenant_company(
    company_in: CompanyInfoUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Update company information for current tenant"""
    try:
        if not access.tenant_id:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="No tenant context", code="NO_TENANT").model_dump(mode="json")
            )
        
        tenant = db_session.get(Tenant, access.tenant_id)
        if not tenant:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Tenant not found", code="TENANT_NOT_FOUND").model_dump(mode="json")
            )
        
        data = company_in.model_dump(exclude_unset=True, by_alias=False)
        for key, value in data.items():
            if hasattr(tenant, key):
                setattr(tenant, key, value)
        
        db_session.commit()
        db_session.refresh(tenant)
        
        return ResponseEnvelope(data=TenantCompanyResponse.model_validate(tenant))
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update tenant company error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
