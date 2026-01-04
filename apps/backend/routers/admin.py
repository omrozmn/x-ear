"""
FastAPI Admin Router - Migrated from Flask routes/admin.py
Handles admin authentication, user management, tickets, debug endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
import logging
import uuid
import os

from sqlalchemy.orm import Session
from jose import jwt

from dependencies import get_db, SECRET_KEY, ALGORITHM, get_current_admin_user
from schemas.base import ResponseEnvelope, ApiError
from models.admin_user import AdminUser
from models.user import User
from models.role import Role
from models.tenant import Tenant
from models.base import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

DEBUG_ADMIN_EMAIL = 'admin@x-ear.com'

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
    targetRole: str

class SwitchTenantRequest(BaseModel):
    targetTenantId: str

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

@router.post("/auth/login")
async def admin_login(request_data: AdminLoginRequest):
    """Admin login endpoint"""
    from app import app
    
    try:
        with app.app_context():
            admin = AdminUser.query.filter_by(email=request_data.email).first()
            if not admin or not admin.check_password(request_data.password):
                raise HTTPException(status_code=401, detail={"message": "Invalid credentials", "code": "INVALID_CREDENTIALS"})
            
            if not admin.is_active:
                raise HTTPException(status_code=403, detail={"message": "Account is disabled", "code": "ACCOUNT_DISABLED"})
            
            if admin.mfa_enabled and not request_data.mfa_token:
                return ResponseEnvelope(data={"requires_mfa": True})
            
            admin.last_login = datetime.utcnow()
            db.session.commit()
            
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

@router.post("/users")
def create_admin_user(
    request_data: CreateAdminUserRequest,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Create admin user or tenant user"""
    try:
        if request_data.tenant_id:
            # Create Tenant User
            if db_session.query(User).filter_by(email=request_data.email).first():
                raise HTTPException(status_code=400, detail={"message": "User already exists", "code": "CONFLICT"})
            
            username = request_data.username or request_data.email.split('@')[0]
            base_username = username
            counter = 1
            while db_session.query(User).filter_by(username=username).first():
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
            db_session.add(user)
            db_session.commit()
            return ResponseEnvelope(data={"user": user.to_dict()})
        else:
            # Create Admin User
            if db_session.query(AdminUser).filter_by(email=request_data.email).first():
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
            db_session.add(admin)
            db_session.commit()
            return ResponseEnvelope(data={"user": admin.to_dict()})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create user error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/users")
def get_admin_users(
    page: int = 1,
    limit: int = 10,
    search: str = "",
    role: str = "",
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Get list of admin users"""
    try:
        query = db_session.query(AdminUser)
        
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

@router.get("/users/all")
def get_all_tenant_users(
    page: int = 1,
    limit: int = 10,
    search: str = "",
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Get list of ALL users from ALL tenants"""
    try:
        query = db_session.query(User)
        
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
                tenant = db_session.get(Tenant, u.tenant_id)
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

@router.put("/users/all/{user_id}")
def update_any_tenant_user(
    user_id: str,
    request_data: UpdateTenantUserRequest,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Update any tenant user (Admin Panel)"""
    try:
        user = db_session.get(User, user_id)
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
        
        db_session.commit()
        return ResponseEnvelope(data=user.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update tenant user error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Tickets ---

@router.get("/tickets")
def get_admin_tickets(
    page: int = 1,
    limit: int = 10,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Get support tickets"""
    total = len(MOCK_TICKETS)
    start = (page - 1) * limit
    tickets = MOCK_TICKETS[start:start + limit]
    
    return ResponseEnvelope(data={
        "tickets": tickets,
        "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit if limit > 0 else 0}
    })

@router.post("/tickets")
def create_admin_ticket(
    request_data: CreateTicketRequest,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Create support ticket"""
    ticket = {
        "id": str(uuid.uuid4()),
        "title": request_data.subject,
        "description": request_data.description,
        "status": "open",
        "priority": request_data.priority,
        "category": request_data.category,
        "tenant_id": request_data.tenant_id,
        "tenant_name": "Demo Tenant",
        "created_by": current_admin.id,
        "created_at": datetime.utcnow().isoformat(),
        "sla_due_date": (datetime.utcnow() + timedelta(days=1)).isoformat()
    }
    MOCK_TICKETS.insert(0, ticket)
    return ResponseEnvelope(data={"ticket": ticket})

@router.put("/tickets/{ticket_id}")
def update_admin_ticket(
    ticket_id: str,
    request_data: UpdateTicketRequest,
    current_admin: AdminUser = Depends(get_current_admin_user)
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

@router.post("/tickets/{ticket_id}/responses")
def create_ticket_response(
    ticket_id: str,
    request_data: TicketResponseRequest,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Create response for support ticket"""
    ticket = next((t for t in MOCK_TICKETS if t['id'] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail={"message": "Ticket not found", "code": "NOT_FOUND"})
    
    return ResponseEnvelope(message="Response added")

# --- Debug Endpoints ---

@router.post("/debug/switch-role")
def debug_switch_role(
    request_data: SwitchRoleRequest,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Switch to a different role for debugging"""
    if os.getenv('ENABLE_DEBUG_ROLE_SWITCH', 'true').lower() != 'true':
        raise HTTPException(status_code=403, detail={"message": "Debug role switch is disabled", "code": "DEBUG_DISABLED"})
    
    if current_admin.email != DEBUG_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Bu özellik sadece sistem yöneticisi için kullanılabilir")
    
    role = db_session.query(Role).filter_by(name=request_data.targetRole).first()
    if not role:
        raise HTTPException(status_code=404, detail=f'Role "{request_data.targetRole}" not found')
    
    role_permissions = [p.name for p in role.permissions]
    if 'platform.debug.use' not in role_permissions:
        role_permissions.append('platform.debug.use')
    
    admin_identity = current_admin.id if current_admin.id.startswith('admin_') else f'admin_{current_admin.id}'
    
    additional_claims = {
        'effective_role': request_data.targetRole,
        'real_user_id': current_admin.id,
        'real_user_email': current_admin.email,
        'is_impersonating': True,
        'role_permissions': role_permissions,
        'user_type': 'admin',
        'role': current_admin.role or 'super_admin',
    }
    
    access_token = create_access_token(admin_identity, additional_claims)
    refresh_token = create_refresh_token(admin_identity, additional_claims)
    
    return ResponseEnvelope(data={
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "effectiveRole": request_data.targetRole,
        "permissions": role_permissions,
        "isImpersonating": True,
        "realUserEmail": current_admin.email
    })

@router.get("/debug/available-roles")
def debug_available_roles(
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Get all available roles for debugging"""
    if os.getenv('ENABLE_DEBUG_ROLE_SWITCH', 'true').lower() != 'true':
        raise HTTPException(status_code=403, detail="Debug role switch is disabled")
    
    if current_admin.email != DEBUG_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    roles = db_session.query(Role).all()
    role_display_names = {
        'tenant_admin': 'Tenant Admin', 'admin': 'Yönetici', 'odyolog': 'Odyolog',
        'odyometrist': 'Odyometrist', 'secretary': 'Sekreter', 'user': 'Kullanıcı'
    }
    
    return ResponseEnvelope(data={
        "roles": [{"name": r.name, "displayName": role_display_names.get(r.name, r.name), "description": r.description, "permissionCount": len(r.permissions)} for r in roles]
    })

@router.post("/debug/switch-tenant")
def debug_switch_tenant(
    request_data: SwitchTenantRequest,
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Switch to a different tenant context for debugging"""
    if os.getenv('ENABLE_DEBUG_ROLE_SWITCH', 'true').lower() != 'true':
        raise HTTPException(status_code=403, detail="Debug tenant switch is disabled")
    
    if current_admin.email != DEBUG_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Bu özellik sadece sistem yöneticisi için kullanılabilir")
    
    tenant = db_session.get(Tenant, request_data.targetTenantId)
    if not tenant:
        raise HTTPException(status_code=404, detail=f'Tenant "{request_data.targetTenantId}" not found')
    
    admin_identity = current_admin.id if current_admin.id.startswith('admin_') else f'admin_{current_admin.id}'
    
    additional_claims = {
        'tenant_id': request_data.targetTenantId,
        'effective_tenant_id': request_data.targetTenantId,
        'real_user_id': current_admin.id,
        'real_user_email': current_admin.email,
        'is_impersonating_tenant': True,
        'user_type': 'admin',
        'role': current_admin.role or 'super_admin',
    }
    
    access_token = create_access_token(admin_identity, additional_claims)
    refresh_token = create_refresh_token(admin_identity, additional_claims)
    
    return ResponseEnvelope(data={
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "effectiveTenantId": request_data.targetTenantId,
        "tenantName": tenant.name,
        "tenantStatus": tenant.status,
        "isImpersonatingTenant": True,
        "realUserEmail": current_admin.email
    })

@router.post("/debug/exit-impersonation")
def debug_exit_impersonation(
    db_session: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """Exit tenant/role impersonation"""
    if current_admin.email != DEBUG_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Bu özellik sadece sistem yöneticisi için kullanılabilir")
    
    admin_identity = current_admin.id if current_admin.id.startswith('admin_') else f'admin_{current_admin.id}'
    
    access_token = create_access_token(admin_identity, {'role': 'super_admin', 'user_type': 'admin'})
    refresh_token = create_refresh_token(admin_identity, {'role': 'super_admin', 'user_type': 'admin'})
    
    return ResponseEnvelope(data={
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "user": current_admin.to_dict(),
        "isImpersonating": False
    })
