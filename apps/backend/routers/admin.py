"""
FastAPI Admin Router - Pure SQLAlchemy (No Flask)
Handles admin authentication, user management, tickets, debug endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, model_validator
import logging
import uuid
import os

from sqlalchemy.orm import Session
from jose import jwt

from database import get_db
from schemas.base import ResponseEnvelope
from models.admin_user import AdminUser
from models.user import User
from models.role import Role
from models.tenant import Tenant
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

# JWT Configuration
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-dev-secret-key-change-in-prod')
ALGORITHM = "HS256"

DEBUG_ADMIN_EMAIL = 'admin@x-ear.com'

def _is_debug_authorized(access: UnifiedAccess) -> bool:
    """Check if user is authorized for debug operations"""
    # Super admins can always use debug features
    if access.is_super_admin:
        return True
    # Legacy: specific email check
    if access.user and access.user.email == DEBUG_ADMIN_EMAIL:
        return True
    return False

# --- Request/Response Schemas ---

class AdminLoginRequest(BaseModel):
    email: str
    password: str
    mfa_token: Optional[str] = None

class CreateAdminUserRequest(BaseModel):
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = "support"
    tenant_id: Optional[str] = None
    username: Optional[str] = None

class UpdateTenantUserRequest(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    isActive: Optional[bool] = None

class CreateTicketRequest(BaseModel):
    subject: str
    description: str
    priority: Optional[str] = "medium"
    category: Optional[str] = "general"
    tenant_id: Optional[str] = None

class UpdateTicketRequest(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None

class TicketResponseRequest(BaseModel):
    message: str

class SwitchRoleRequest(BaseModel):
    target_role: str = Field(default=None, alias="targetRole")
    
    @model_validator(mode='before')
    @classmethod
    def accept_both_formats(cls, data):
        if isinstance(data, dict):
            # Accept both snake_case and camelCase
            if 'target_role' in data and 'targetRole' not in data:
                data['targetRole'] = data['target_role']
            elif 'targetRole' in data and 'target_role' not in data:
                data['target_role'] = data['targetRole']
        return data
    
    model_config = {"populate_by_name": True}

class SwitchTenantRequest(BaseModel):
    target_tenant_id: str = Field(default=None, alias="targetTenantId")
    
    @model_validator(mode='before')
    @classmethod
    def accept_both_formats(cls, data):
        if isinstance(data, dict):
            # Accept both snake_case and camelCase
            if 'target_tenant_id' in data and 'targetTenantId' not in data:
                data['targetTenantId'] = data['target_tenant_id']
            elif 'targetTenantId' in data and 'target_tenant_id' not in data:
                data['target_tenant_id'] = data['targetTenantId']
        return data
    
    model_config = {"populate_by_name": True}

# In-memory ticket store
MOCK_TICKETS: List[Dict[str, Any]] = []

# --- Helper Functions ---

def create_access_token(identity: str, additional_claims: dict = None, expires_delta: timedelta = None) -> str:
    if expires_delta is None:
        expires_delta = timedelta(hours=8)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"sub": identity, "exp": expire, "iat": datetime.now(timezone.utc), **(additional_claims or {})}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(identity: str, additional_claims: dict = None, expires_delta: timedelta = None) -> str:
    if expires_delta is None:
        expires_delta = timedelta(days=30)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"sub": identity, "exp": expire, "iat": datetime.now(timezone.utc), "type": "refresh", **(additional_claims or {})}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- Routes ---

@router.post("/auth/login", operation_id="createAdminAuthLogin")
def admin_login(request_data: AdminLoginRequest, db: Session = Depends(get_db)):
    """Admin login endpoint"""
    try:
        admin = db.query(AdminUser).filter_by(email=request_data.email).first()
        if not admin or not admin.check_password(request_data.password):
            raise HTTPException(status_code=401, detail={"message": "Invalid credentials", "code": "INVALID_CREDENTIALS"})
        
        if not admin.is_active:
            raise HTTPException(status_code=403, detail={"message": "Account is disabled", "code": "ACCOUNT_DISABLED"})
        
        if admin.mfa_enabled and not request_data.mfa_token:
            return ResponseEnvelope(data={"requires_mfa": True})
        
        admin.last_login = datetime.utcnow()
        db.commit()
        
        admin_identity = admin.id if admin.id.startswith('admin_') else f'admin_{admin.id}'
        access_token = create_access_token(admin_identity, {'role': admin.role, 'user_type': 'admin'})
        refresh_token = create_refresh_token(admin_identity, {'role': admin.role, 'user_type': 'admin'})
        
        user_data = {
            'id': admin.id,
            'email': admin.email,
            'first_name': admin.first_name,
            'last_name': admin.last_name,
            'role': admin.role,
            'is_active': admin.is_active,
            'mfa_enabled': admin.mfa_enabled,
            'last_login': admin.last_login.isoformat() if admin.last_login else None,
            'created_at': admin.created_at.isoformat() if admin.created_at else None,
            'is_super_admin': admin.role == 'super_admin'
        }
        
        return ResponseEnvelope(data={
            "token": access_token,
            "refreshToken": refresh_token,
            "user": user_data,
            "requires_mfa": False
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users", operation_id="createAdminUsers")
def create_admin_user(
    request_data: CreateAdminUserRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Create admin user or tenant user"""
    try:
        if request_data.tenant_id:
            # Create Tenant User
            if db.query(User).filter_by(email=request_data.email).first():
                raise HTTPException(status_code=400, detail={"message": "User already exists", "code": "CONFLICT"})
            
            username = request_data.username or request_data.email.split('@')[0]
            base_username = username
            counter = 1
            while db.query(User).filter_by(username=username).first():
                username = f"{base_username}{counter}"
                counter += 1
            
            user = User(
                id=str(uuid.uuid4()),
                email=request_data.email,
                username=username,
                first_name=request_data.first_name,
                last_name=request_data.last_name,
                tenant_id=request_data.tenant_id,
                role=request_data.role or 'user',
                is_active=True
            )
            user.set_password(request_data.password)
            db.add(user)
            db.commit()
            return ResponseEnvelope(data={"user": user.to_dict()})
        else:
            # Create Admin User
            if db.query(AdminUser).filter_by(email=request_data.email).first():
                raise HTTPException(status_code=400, detail={"message": "User already exists", "code": "CONFLICT"})
            
            admin = AdminUser(
                id=str(uuid.uuid4()),
                email=request_data.email,
                first_name=request_data.first_name,
                last_name=request_data.last_name,
                role=request_data.role or 'support',
                is_active=True
            )
            admin.set_password(request_data.password)
            db.add(admin)
            db.commit()
            return ResponseEnvelope(data={"user": admin.to_dict()})
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Create user error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/users", operation_id="listAdminUsers")
def get_admin_users(
    page: int = 1,
    limit: int = 10,
    search: str = "",
    role: str = "",
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get list of admin users"""
    try:
        query = db.query(AdminUser)
        
        if search:
            query = query.filter(
                (AdminUser.email.ilike(f'%{search}%')) |
                (AdminUser.first_name.ilike(f'%{search}%')) |
                (AdminUser.last_name.ilike(f'%{search}%'))
            )
        if role:
            query = query.filter_by(role=role)
        
        total = query.count()
        users = query.offset((page - 1) * limit).limit(limit).all()
        
        return ResponseEnvelope(data={
            "users": [u.to_dict() for u in users],
            "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}
        })
    except Exception as e:
        logger.error(f"Get admin users error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/all", operation_id="listAdminUserAll")
def get_all_tenant_users(
    page: int = 1,
    limit: int = 10,
    search: str = "",
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get list of ALL users from ALL tenants"""
    try:
        query = db.query(User)
        
        if search:
            query = query.filter(
                (User.email.ilike(f'%{search}%')) |
                (User.first_name.ilike(f'%{search}%')) |
                (User.last_name.ilike(f'%{search}%')) |
                (User.username.ilike(f'%{search}%'))
            )
        
        total = query.count()
        users = query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        users_list = []
        for u in users:
            u_dict = u.to_dict()
            if u.tenant_id:
                tenant = db.get(Tenant, u.tenant_id)
                if tenant:
                    u_dict['tenant_name'] = tenant.name
            users_list.append(u_dict)
        
        return ResponseEnvelope(data={
            "users": users_list,
            "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}
        })
    except Exception as e:
        logger.error(f"Get all tenant users error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/users/all/{user_id}", operation_id="updateAdminUserAll")
def update_any_tenant_user(
    user_id: str,
    request_data: UpdateTenantUserRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Update any tenant user (Admin Panel)"""
    try:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail={"message": "User not found", "code": "NOT_FOUND"})
        
        if request_data.isActive is not None:
            user.is_active = request_data.isActive
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
        
        db.commit()
        return ResponseEnvelope(data=user.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update tenant user error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Tickets ---

@router.get("/tickets", operation_id="listAdminTickets")
def get_admin_tickets(
    page: int = 1,
    limit: int = 10,
    access: UnifiedAccess = Depends(require_admin())
):
    """Get support tickets"""
    total = len(MOCK_TICKETS)
    start = (page - 1) * limit
    tickets = MOCK_TICKETS[start:start + limit]
    
    return ResponseEnvelope(data={
        "tickets": tickets,
        "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit if limit > 0 else 0}
    })

@router.post("/tickets", operation_id="createAdminTickets")
def create_admin_ticket(
    request_data: CreateTicketRequest,
    access: UnifiedAccess = Depends(require_admin())
):
    """Create support ticket"""
    ticket = {
        "id": str(uuid.uuid4()),
        "title": request_data.subject,
        "description": request_data.description,
        "status": "open",
        "priority": request_data.priority,
        "category": request_data.category,
        "access.tenant_id": request_data.tenant_id,
        "tenant_name": "Demo Tenant",
        "created_by": access.user_id,
        "created_at": datetime.utcnow().isoformat(),
        "sla_due_date": (datetime.utcnow() + timedelta(days=1)).isoformat()
    }
    MOCK_TICKETS.insert(0, ticket)
    return ResponseEnvelope(data={"ticket": ticket})

@router.put("/tickets/{ticket_id}", operation_id="updateAdminTicket")
def update_admin_ticket(
    ticket_id: str,
    request_data: UpdateTicketRequest,
    access: UnifiedAccess = Depends(require_admin())
):
    """Update support ticket"""
    ticket = next((t for t in MOCK_TICKETS if t['id'] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail={"message": "Ticket not found", "code": "NOT_FOUND"})
    
    if request_data.status:
        ticket['status'] = request_data.status
    if request_data.assigned_to:
        ticket['assigned_to'] = request_data.assigned_to
        ticket['assigned_admin_name'] = 'Admin User'
    
    return ResponseEnvelope(data={"ticket": ticket})

@router.post("/tickets/{ticket_id}/responses", operation_id="createAdminTicketResponses")
def create_ticket_response(
    ticket_id: str,
    request_data: TicketResponseRequest,
    access: UnifiedAccess = Depends(require_admin())
):
    """Create response for support ticket"""
    ticket = next((t for t in MOCK_TICKETS if t['id'] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail={"message": "Ticket not found", "code": "NOT_FOUND"})
    
    return ResponseEnvelope(message="Response added")

# --- Debug Endpoints ---

@router.post("/debug/switch-role", operation_id="createAdminDebugSwitchRole")
def debug_switch_role(
    request_data: SwitchRoleRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Switch to a different role for debugging"""
    if os.getenv('ENABLE_DEBUG_ROLE_SWITCH', 'true').lower() != 'true':
        raise HTTPException(status_code=403, detail={"message": "Debug role switch is disabled", "code": "DEBUG_DISABLED"})
    
    if not _is_debug_authorized(access):
        raise HTTPException(status_code=403, detail="Bu özellik sadece sistem yöneticisi için kullanılabilir")
    
    target_role = request_data.target_role
    
    # Try to find role by name first, then by id
    role = db_session.query(Role).filter_by(name=target_role).first()
    if not role:
        role = db_session.query(Role).filter_by(id=target_role).first()
    if not role:
        raise HTTPException(status_code=404, detail=f'Role "{target_role}" not found')
    
    # Use the actual role name from database
    effective_role_name = role.name
    
    role_permissions = [p.name for p in role.permissions]
    if 'platform.debug.use' not in role_permissions:
        role_permissions.append('platform.debug.use')
    
    admin_identity = access.user_id if access.user_id.startswith('admin_') else f'admin_{access.user_id}'
    
    additional_claims = {
        'effective_role': effective_role_name,
        'real_user_id': access.user_id,
        'real_user_email': access.user.email,
        'is_impersonating': True,
        'role_permissions': role_permissions,
        'user_type': 'admin',
        'role': access.role or 'super_admin',
    }
    
    access_token = create_access_token(admin_identity, additional_claims)
    refresh_token = create_refresh_token(admin_identity, additional_claims)
    
    return ResponseEnvelope(data={
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "effectiveRole": effective_role_name,
        "permissions": role_permissions,
        "isImpersonating": True,
        "realUserEmail": access.user.email
    })

@router.get("/debug/available-roles", operation_id="listAdminDebugAvailableRoles")
def debug_available_roles(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get all available roles for debugging"""
    if os.getenv('ENABLE_DEBUG_ROLE_SWITCH', 'true').lower() != 'true':
        raise HTTPException(status_code=403, detail="Debug role switch is disabled")
    
    if not _is_debug_authorized(access):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    roles = db_session.query(Role).all()
    
    # Display name mapping - use role name if not in mapping
    role_display_names = {
        'tenant_admin': 'Tenant Admin',
        'admin': 'Yönetici',
        'manager': 'Yönetici',
        'staff': 'Personel',
        'clinician': 'Klinisyen',
        'odyolog': 'Odyolog',
        'odyometrist': 'Odyometrist',
        'secretary': 'Sekreter',
        'user': 'Kullanıcı',
        'super_admin': 'Super Admin',
    }
    
    return ResponseEnvelope(data={
        "roles": [{
            "id": r.id,
            "name": r.name,
            "displayName": role_display_names.get(r.name, r.name.replace('_', ' ').title()),
            "description": r.description,
            "permissionCount": len(r.permissions)
        } for r in roles]
    })

@router.post("/debug/switch-tenant", operation_id="createAdminDebugSwitchTenant")
def debug_switch_tenant(
    request_data: SwitchTenantRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Switch to a different tenant context for debugging"""
    if os.getenv('ENABLE_DEBUG_ROLE_SWITCH', 'true').lower() != 'true':
        raise HTTPException(status_code=403, detail="Debug tenant switch is disabled")
    
    if not _is_debug_authorized(access):
        raise HTTPException(status_code=403, detail="Bu özellik sadece sistem yöneticisi için kullanılabilir")
    
    tenant = db_session.get(Tenant, request_data.target_tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail=f'Tenant "{request_data.target_tenant_id}" not found')
    
    admin_identity = access.user_id if access.user_id.startswith('admin_') else f'admin_{access.user_id}'
    
    additional_claims = {
        'tenant_id': request_data.target_tenant_id,
        'effective_tenant_id': request_data.target_tenant_id,
        'real_user_id': access.user_id,
        'real_user_email': access.user.email,
        'is_impersonating_tenant': True,
        'user_type': 'admin',
        'role': access.role or 'super_admin',
    }
    
    access_token = create_access_token(admin_identity, additional_claims)
    refresh_token = create_refresh_token(admin_identity, additional_claims)
    
    return ResponseEnvelope(data={
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "effectiveTenantId": request_data.target_tenant_id,
        "tenantName": tenant.name,
        "tenantStatus": tenant.status,
        "isImpersonatingTenant": True,
        "realUserEmail": access.user.email
    })

@router.post("/debug/exit-impersonation", operation_id="createAdminDebugExitImpersonation")
def debug_exit_impersonation(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Exit tenant/role impersonation"""
    if not _is_debug_authorized(access):
        raise HTTPException(status_code=403, detail="Bu özellik sadece sistem yöneticisi için kullanılabilir")
    
    admin_identity = access.user_id if access.user_id.startswith('admin_') else f'admin_{access.user_id}'
    
    access_token = create_access_token(admin_identity, {'role': 'super_admin', 'user_type': 'admin'})
    refresh_token = create_refresh_token(admin_identity, {'role': 'super_admin', 'user_type': 'admin'})
    
    return ResponseEnvelope(data={
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "user": access.user.to_dict(),
        "isImpersonating": False
    })

@router.get("/debug/page-permissions/{page_key}", operation_id="getAdminDebugPagePermission")
def debug_page_permissions(
    page_key: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get permissions required for a specific page"""
    if os.getenv('ENABLE_DEBUG_ROLE_SWITCH', 'true').lower() != 'true':
        raise HTTPException(status_code=403, detail="Debug mode is disabled")
    
    # Page permission mappings
    PAGE_PERMISSIONS = {
        'dashboard': ['dashboard.view'],
        'patients': ['patients.view', 'patients.read'],
        'appointments': ['appointments.view', 'appointments.read'],
        'inventory': ['inventory.view', 'inventory.read'],
        'sales': ['sales.view', 'sales.read'],
        'reports': ['reports.view', 'reports.read'],
        'settings': ['settings.view', 'settings.read'],
        'users': ['users.view', 'users.read'],
        'admin': ['admin.view', 'admin.read'],
    }
    
    permissions = PAGE_PERMISSIONS.get(page_key, [])
    
    return ResponseEnvelope(data={
        "pageKey": page_key,
        "requiredPermissions": permissions,
        "found": len(permissions) > 0
    })
