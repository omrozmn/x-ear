"""
Admin Router - Global admin endpoints (not tenant-specific)
Provides cross-tenant admin operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging
import uuid
from jose import jwt

from core.database import get_db
from middleware.unified_access import UnifiedAccess, require_admin
from schemas.base import ResponseEnvelope
from schemas.sales import SaleRead
from schemas.users import UserCreate, UserRead
from core.models.user import User
from core.models.party import Party
from core.models.sales import Sale
from core.models.tenant import Tenant
from core.models.admin_user import AdminUser
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

# JWT Configuration
from core.security import get_jwt_secret, JWT_ALGORITHM
SECRET_KEY = get_jwt_secret()
ALGORITHM = JWT_ALGORITHM
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


def normalize_admin_identity(admin_id: str) -> str:
    """Use the canonical admin JWT subject format expected by unified access."""
    return admin_id if str(admin_id).startswith(("admin_", "adm_")) else f"adm_{admin_id}"


def build_admin_claims(admin: AdminUser) -> dict[str, Any]:
    """Build a consistent admin JWT payload across all admin auth flows."""
    role_permissions = ["*"]
    permissions_version = getattr(admin, "permissions_version", 1) or 1
    return {
        "tenant_id": "system",
        "role": admin.role,
        "role_permissions": role_permissions,
        "perm_ver": permissions_version,
        "is_admin": True,
        "user_type": "admin",
    }

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
        
        admin_identity = normalize_admin_identity(admin.id)
        admin_claims = build_admin_claims(admin)
        access_token = create_access_token(admin_identity, admin_claims)
        refresh_token = create_refresh_token(admin_identity, admin_claims)
        
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
        raise HTTPException(status_code=500, detail="Internal server error")

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
        raise HTTPException(status_code=400, detail="Internal server error")

@router.get("/users", operation_id="listAdminUsers")
def list_admin_users(
    page: int = Query(1, ge=1, le=10000),
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
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/users/all", operation_id="listAdminUserAll")
def list_all_tenant_users(
    page: int = Query(1, ge=1, le=10000),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """List ALL tenant users from ALL tenants (admin operation)"""
    try:
        # Query users with tenant_id (exclude admin users)
        query = db_session.query(User).filter(User.tenant_id.isnot(None))

        if search:
            query = query.filter(
                (User.email.ilike(f'%{search}%')) |
                (User.first_name.ilike(f'%{search}%')) |
                (User.last_name.ilike(f'%{search}%'))
            )

        if role:
            query = query.filter_by(role=role)

        if status:
            if status == 'active':
                query = query.filter_by(is_active=True)
            elif status == 'inactive':
                query = query.filter_by(is_active=False)

        total = query.count()
        users = query.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

        # Add tenant name by looking up tenant separately
        users_data = []
        tenant_cache = {}
        for u in users:
            user_dict = UserRead.model_validate(u).model_dump(by_alias=True)
            if u.tenant_id:
                if u.tenant_id not in tenant_cache:
                    t = db_session.get(Tenant, u.tenant_id)
                    tenant_cache[u.tenant_id] = t.name if t else None
                user_dict['tenantName'] = tenant_cache.get(u.tenant_id)
            users_data.append(user_dict)

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
        logger.error(f"List all tenant users error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/users/{user_id}", operation_id="getAdminUser", response_model=ResponseEnvelope[UserRead])
def get_admin_user(
    user_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get user details (admin operation)"""
    if not user_id or len(user_id) > 200 or not user_id.isprintable():
        raise HTTPException(status_code=400, detail={"message": "Invalid user ID", "code": "INVALID_ID"})
    try:
        user = db_session.get(User, user_id)
    except Exception:
        raise HTTPException(status_code=404, detail={"message": "User not found", "code": "NOT_FOUND"})
    if not user:
        raise HTTPException(status_code=404, detail={"message": "User not found", "code": "NOT_FOUND"})

    return ResponseEnvelope(data=UserRead.model_validate(user).model_dump(by_alias=True))

@router.put("/users/all/{user_id}", operation_id="updateAdminUserAll")
def update_any_tenant_user(
    user_id: str,
    request_data: UserCreate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Update any tenant user (admin operation)"""
    try:
        user = db_session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail={"message": "User not found", "code": "NOT_FOUND"})
        
        # Update fields
        if request_data.email:
            user.email = request_data.email
        if request_data.first_name:
            user.first_name = request_data.first_name
        if request_data.last_name:
            user.last_name = request_data.last_name
        if request_data.role:
            user.role = request_data.role
        if request_data.password:
            user.set_password(request_data.password)
        if request_data.is_active is not None:
            user.is_active = request_data.is_active
        
        db_session.commit()
        db_session.refresh(user)
        
        return ResponseEnvelope(data=UserRead.model_validate(user).model_dump(by_alias=True))
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update any tenant user error: {e}")
        raise HTTPException(status_code=400, detail="Internal server error")

# --- Party Management (Cross-tenant) ---

@router.get("/parties/{party_id}", operation_id="getAdminParty")
def get_admin_party(
    party_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get party details (admin operation - cross-tenant)"""
    from schemas.parties import PartyRead
    from core.database import unbound_session
    
    if not party_id or len(party_id) > 200 or not party_id.isprintable():
        raise HTTPException(status_code=400, detail={"message": "Invalid party ID", "code": "INVALID_ID"})
    with unbound_session(reason="admin-get-party"):
        try:
            party = db_session.get(Party, party_id)
        except Exception:
            raise HTTPException(status_code=404, detail={"message": "Party not found", "code": "NOT_FOUND"})
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
        
        # Check impersonation consent: at least one tenant user must allow it
        from core.models.user import User
        consenting_user = (
            db_session.query(User)
            .filter(
                User.tenant_id == request_data.tenant_id,
                User.allow_impersonation == True,  # noqa: E712
                User.is_active == True,  # noqa: E712
            )
            .first()
        )
        if not consenting_user:
            raise HTTPException(
                status_code=403,
                detail={
                    "message": "Impersonation not allowed — no tenant user has granted consent",
                    "code": "IMPERSONATION_NOT_ALLOWED",
                },
            )
        
        # Create impersonation token with tenant context
        admin_id = access.user.id if access.user else 'system'
        admin_identity = normalize_admin_identity(admin_id)
        impersonation_token = create_access_token(
            admin_identity,
            {
                'role': 'TENANT_ADMIN',
                'user_type': 'impersonated',
                'tenant_id': request_data.tenant_id,
                'original_admin_id': admin_id,
                'is_impersonating_tenant': True,  # CRITICAL: Flag for tenant impersonation
                'effective_tenant_id': request_data.tenant_id  # Explicit tenant context
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
        raise HTTPException(status_code=500, detail="Internal server error")

# --- Debug Tenant Switch ---

class SwitchTenantRequest(BaseModel):
    target_tenant_id: str = None
    targetTenantId: str = None  # Support both snake_case and camelCase

class SwitchTenantResponse(BaseModel):
    access_token: str
    accessToken: str  # Alias for frontend compatibility
    refresh_token: str
    refreshToken: str  # Alias for frontend compatibility
    tenant_id: str
    tenantId: str  # Alias for frontend compatibility
    tenant_name: str
    tenantName: str  # Alias for frontend compatibility

@router.post("/debug/switch-tenant", operation_id="createAdminDebugSwitchTenant", response_model=ResponseEnvelope[SwitchTenantResponse])
def debug_switch_tenant(
    request_data: SwitchTenantRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Switch to a different tenant context (admin impersonation)"""
    try:
        # Get target tenant ID (support both formats)
        target_tenant_id = request_data.target_tenant_id or request_data.targetTenantId
        
        if not target_tenant_id:
            raise HTTPException(
                status_code=400,
                detail={"message": "Target tenant ID is required", "code": "MISSING_TENANT_ID"}
            )
        
        # Verify tenant exists
        tenant = db_session.get(Tenant, target_tenant_id)
        if not tenant or tenant.deleted_at:
            raise HTTPException(
                status_code=404,
                detail={"message": "Tenant not found", "code": "TENANT_NOT_FOUND"}
            )
        
        # Check impersonation consent
        # Must use unbound_session to bypass global tenant filter —
        # admin's tenant_id is 'system', so the filter would exclude
        # all users from the target tenant.
        from core.models.user import User
        from core.database import unbound_session
        with unbound_session(reason="admin-impersonation-consent-check"):
            consenting = (
                db_session.query(User)
                .filter(
                    User.tenant_id == target_tenant_id,
                    User.allow_impersonation == True,  # noqa: E712
                    User.is_active == True,  # noqa: E712
                )
                .first()
            )
        if not consenting:
            raise HTTPException(
                status_code=403,
                detail={
                    "message": "Impersonation not allowed — no tenant user has granted consent",
                    "code": "IMPERSONATION_NOT_ALLOWED",
                },
            )
        
        # Get admin user
        admin_id = access.user_id
        admin_identity = normalize_admin_identity(admin_id)
        admin_email = access.user.email if access.user else 'unknown'
        
        # Create new token with tenant impersonation
        # CRITICAL: Set tenant_id to target tenant for proper isolation
        access_token = create_access_token(
            admin_identity,
            {
                'tenant_id': target_tenant_id,  # Set to target tenant for isolation
                'effective_tenant_id': target_tenant_id,  # Backward compatibility
                'role': 'tenant_admin',
                'role_permissions': ['*'],
                'is_admin': True,
                'is_impersonating_tenant': True,
                'real_tenant_id': 'system',  # Original admin tenant
                'perm_ver': 1
            }
        )
        
        refresh_token = create_refresh_token(
            admin_identity,
            {
                'tenant_id': target_tenant_id,  # Set to target tenant for isolation
                'effective_tenant_id': target_tenant_id,  # Backward compatibility
                'role': 'tenant_admin',
                'role_permissions': ['*'],
                'is_admin': True,
                'is_impersonating_tenant': True,
                'real_tenant_id': 'system',  # Original admin tenant
                'perm_ver': 1
            }
        )
        
        logger.info(f"Tenant switch: {admin_email} -> {tenant.name} ({target_tenant_id})")
        
        response_data = SwitchTenantResponse(
            access_token=access_token,
            accessToken=access_token,
            refresh_token=refresh_token,
            refreshToken=refresh_token,
            tenant_id=target_tenant_id,
            tenantId=target_tenant_id,
            tenant_name=tenant.name,
            tenantName=tenant.name
        )
        
        return ResponseEnvelope(data=response_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tenant switch error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/debug/exit-impersonation", operation_id="createAdminDebugExitImpersonation")
def debug_exit_impersonation(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Exit tenant impersonation and return to normal admin mode"""
    try:
        admin_id = access.user_id
        
        # Create normal admin token without impersonation
        admin = access.user
        if not admin:
            raise HTTPException(status_code=401, detail={"message": "Admin user not found", "code": "AUTH_REQUIRED"})

        access_token = create_access_token(
            normalize_admin_identity(str(admin_id)),
            build_admin_claims(admin)
        )

        refresh_token = create_refresh_token(
            normalize_admin_identity(str(admin_id)),
            build_admin_claims(admin)
        )
        
        return ResponseEnvelope(data={
            'accessToken': access_token,
            'refreshToken': refresh_token,
            'message': 'Exited impersonation mode'
        })
    except Exception as e:
        logger.error(f"Exit impersonation error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# --- Sales Management (Cross-tenant) ---

@router.get("/sales/{sale_id}", operation_id="getAdminSale", response_model=ResponseEnvelope[SaleRead])
def get_admin_sale(
    sale_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get sale details (admin operation - cross-tenant)"""
    from schemas.sales import SaleRead
    from core.database import unbound_session
    from routers.sales import _build_full_sale_data
    
    if not sale_id or len(sale_id) > 200 or not sale_id.isprintable():
        raise HTTPException(status_code=400, detail={"message": "Invalid sale ID", "code": "INVALID_ID"})
    with unbound_session(reason="admin-get-sale"):
        try:
            sale = db_session.get(Sale, sale_id)
        except Exception:
            raise HTTPException(status_code=404, detail={"message": "Sale not found", "code": "NOT_FOUND"})
        if not sale:
            raise HTTPException(status_code=404, detail={"message": "Sale not found", "code": "NOT_FOUND"})
        
        try:
            sale_data = _build_full_sale_data(db_session, sale)
        except Exception as e:
            logger.warning(f"Failed to build full sale data for {sale_id}: {e}")
            sale_data = SaleRead.model_validate(sale).model_dump(by_alias=True)
        return ResponseEnvelope(data=sale_data)
