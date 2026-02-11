"""
Admin Router - Global admin endpoints (not tenant-specific)
Provides cross-tenant admin operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging
import uuid
from jose import jwt

from core.database import get_db
from middleware.unified_access import UnifiedAccess, require_admin
from schemas.base import ResponseEnvelope
from schemas.users import UserCreate, UserRead, UserResponse
from core.models.user import User
from core.models.party import Party
from core.models.sales import Sale
from core.models.tenant import Tenant
from core.models.admin_user import AdminUser
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-jwt-key-for-development")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours
REFRESH_TOKEN_EXPIRE_DAYS = 30

# --- Request/Response Schemas ---

class AdminLoginRequest(BaseModel):
    email: str
    password: str
    mfa_token: Optional[str] = None

class AdminLoginResponse(BaseModel):
    token: str
    refresh_token: str
    user: Dict[str, Any]
    requires_mfa: bool = False

def create_access_token(subject: str, additional_claims: dict = None) -> str:
    """Create JWT access token"""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": subject, "exp": expire, "iat": datetime.utcnow()}
    if additional_claims:
        to_encode.update(additional_claims)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(subject: str, additional_claims: dict = None) -> str:
    """Create JWT refresh token"""
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"sub": subject, "exp": expire, "iat": datetime.utcnow(), "type": "refresh"}
    if additional_claims:
        to_encode.update(additional_claims)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- Admin Authentication ---

@router.post("/auth/login", operation_id="createAdminAuthLogin", response_model=ResponseEnvelope[AdminLoginResponse])
def admin_login(request_data: AdminLoginRequest, db: Session = Depends(get_db)):
    """Admin login endpoint"""
    try:
        admin = db.query(AdminUser).filter_by(email=request_data.email).first()
        if not admin or not admin.check_password(request_data.password):
            raise HTTPException(status_code=401, detail={"message": "Invalid credentials", "code": "INVALID_CREDENTIALS"})
        
        if not admin.is_active:
            raise HTTPException(status_code=403, detail={"message": "Account is disabled", "code": "ACCOUNT_DISABLED"})
        
        if admin.mfa_enabled and not request_data.mfa_token:
            return ResponseEnvelope(data=AdminLoginResponse(
                token="",
                refresh_token="",
                user={},
                requires_mfa=True
            ))
        
        admin.last_login = datetime.utcnow()
        db.commit()
        
        admin_identity = admin.id if admin.id.startswith('adm_') else f'adm_{admin.id}'
        access_token = create_access_token(admin_identity, {'role': admin.role, 'user_type': 'admin'})
        refresh_token = create_refresh_token(admin_identity, {'role': admin.role, 'user_type': 'admin'})
        
        user_data = {
            'id': admin.id,
            'email': admin.email,
            'firstName': admin.first_name,
            'lastName': admin.last_name,
            'role': admin.role,
            'isActive': admin.is_active,
            'mfaEnabled': admin.mfa_enabled,
            'lastLogin': admin.last_login.isoformat() if admin.last_login else None,
            'createdAt': admin.created_at.isoformat() if admin.created_at else None,
            'isSuperAdmin': admin.role == 'super_admin'
        }
        
        return ResponseEnvelope(data=AdminLoginResponse(
            token=access_token,
            refresh_token=refresh_token,
            user=user_data,
            requires_mfa=False
        ))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- User Management (Global) ---

@router.post("/users", operation_id="createAdminUser", response_model=ResponseEnvelope[UserRead])
def create_admin_user(
    request_data: UserCreate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Create a user (admin operation) - can specify tenant_id"""
    try:
        # Check if email already exists
        existing = db_session.query(User).filter_by(email=request_data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail={"message": "Email already exists", "code": "CONFLICT"})
        
        # Validate tenant exists if provided
        if request_data.tenant_id:
            tenant = db_session.get(Tenant, request_data.tenant_id)
            if not tenant or tenant.deleted_at:
                raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        # Create user
        user = User(
            id=f"usr_{uuid.uuid4().hex[:8]}",
            email=request_data.email,
            username=request_data.username or request_data.email.split('@')[0],
            first_name=request_data.first_name,
            last_name=request_data.last_name,
            role=request_data.role or 'TENANT_USER',
            tenant_id=request_data.tenant_id,
            is_active=request_data.is_active if request_data.is_active is not None else True
        )
        
        # Set password
        if request_data.password:
            user.set_password(request_data.password)
        
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        # Return using Pydantic schema
        return ResponseEnvelope(data=UserRead.model_validate(user).model_dump(by_alias=True))
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create admin user error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/users", operation_id="listAdminUsers")
def list_admin_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    tenant_id: Optional[str] = None,
    search: Optional[str] = None,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """List all users (admin operation)"""
    try:
        query = db_session.query(User)
        
        if tenant_id:
            query = query.filter_by(tenant_id=tenant_id)
        
        if search:
            query = query.filter(
                (User.email.ilike(f'%{search}%')) |
                (User.first_name.ilike(f'%{search}%')) |
                (User.last_name.ilike(f'%{search}%'))
            )
        
        total = query.count()
        users = query.offset((page - 1) * per_page).limit(per_page).all()
        
        users_data = [UserRead.model_validate(u).model_dump(by_alias=True) for u in users]
        
        return ResponseEnvelope(data={
            "users": users_data,
            "pagination": {
                "page": page,
                "perPage": per_page,
                "total": total,
                "totalPages": (total + per_page - 1) // per_page
            }
        })
    except Exception as e:
        logger.error(f"List admin users error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/{user_id}", operation_id="getAdminUser", response_model=ResponseEnvelope[UserRead])
def get_admin_user(
    user_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get user details (admin operation)"""
    user = db_session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail={"message": "User not found", "code": "NOT_FOUND"})
    
    return ResponseEnvelope(data=UserRead.model_validate(user).model_dump(by_alias=True))

# --- Party Management (Cross-tenant) ---

@router.get("/parties/{party_id}", operation_id="getAdminParty")
def get_admin_party(
    party_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get party details (admin operation - cross-tenant)"""
    from schemas.parties import PartyRead
    
    party = db_session.get(Party, party_id)
    if not party:
        raise HTTPException(status_code=404, detail={"message": "Party not found", "code": "NOT_FOUND"})
    
    return ResponseEnvelope(data=PartyRead.model_validate(party).model_dump(by_alias=True))


# --- Impersonation ---

class ImpersonateRequest(BaseModel):
    tenant_id: str

class ImpersonateResponse(BaseModel):
    token: str
    tenant_id: str
    user: Dict[str, Any]

@router.post("/impersonate", operation_id="createAdminImpersonate", response_model=ResponseEnvelope[ImpersonateResponse])
def impersonate_tenant(
    request_data: ImpersonateRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Impersonate a tenant - returns a token with tenant context"""
    try:
        # Verify tenant exists
        tenant = db_session.get(Tenant, request_data.tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(status_code=404, detail={"message": "Tenant not found", "code": "NOT_FOUND"})
        
        # Create impersonation token with tenant context
        admin_id = access.user.id if access.user else 'system'
        impersonation_token = create_access_token(
            admin_id,
            {
                'role': 'TENANT_ADMIN',
                'user_type': 'impersonated',
                'tenant_id': request_data.tenant_id,
                'original_admin_id': admin_id
            }
        )
        
        user_data = {
            'id': admin_id,
            'tenantId': request_data.tenant_id,
            'role': 'TENANT_ADMIN',
            'firstName': 'Admin',
            'lastName': 'Impersonated',
            'isImpersonated': True
        }
        
        return ResponseEnvelope(data=ImpersonateResponse(
            token=impersonation_token,
            tenant_id=request_data.tenant_id,
            user=user_data
        ))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Impersonate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Sales Management (Cross-tenant) ---

@router.get("/sales/{sale_id}", operation_id="getAdminSale")
def get_admin_sale(
    sale_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get sale details (admin operation - cross-tenant)"""
    from schemas.sales import SaleRead
    
    sale = db_session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail={"message": "Sale not found", "code": "NOT_FOUND"})
    
    return ResponseEnvelope(data=SaleRead.model_validate(sale).model_dump(by_alias=True))
