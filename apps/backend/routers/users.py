"""
FastAPI Users Router - Migrated from Flask routes/users.py
User profile and management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from pydantic import BaseModel, Field
import logging

from sqlalchemy.orm import Session

from dependencies import get_db, get_current_context, AccessContext
from schemas.base import ResponseEnvelope, ApiError
from models.base import db
from models.user import User
from models.tenant import Tenant

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Users"])

# --- Helper Functions ---

def tenant_scoped_query(ctx: AccessContext, model):
    """Apply tenant scoping to query"""
    query = model.query
    if ctx.tenant_id:
        query = query.filter_by(tenant_id=ctx.tenant_id)
    return query

def get_or_404_scoped(ctx: AccessContext, model, record_id: str):
    """Get record with tenant scoping or raise 404"""
    record = db.session.get(model, record_id)
    if not record:
        return None
    if ctx.tenant_id and hasattr(record, 'tenant_id') and record.tenant_id != ctx.tenant_id:
        return None
    return record

# --- Request Schemas ---

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    role: str = "user"
    tenant_id: Optional[str] = Field(None, alias="tenantId")

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    email: Optional[str] = None
    username: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str = Field(..., alias="currentPassword")
    new_password: str = Field(..., alias="newPassword")

# --- Routes ---

@router.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """List users"""
    if not ctx.is_super_admin and not ctx.is_tenant_admin:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Forbidden", code="FORBIDDEN").model_dump(mode="json")
        )
    
    query = tenant_scoped_query(ctx, User)
    total = query.count()
    
    offset = (page - 1) * per_page
    users_list = query.order_by(User.created_at.desc()).limit(per_page).offset(offset).all()
    
    return ResponseEnvelope(
        data=[u.to_dict() for u in users_list],
        meta={
            "total": total,
            "page": page,
            "perPage": per_page,
            "totalPages": (total + per_page - 1) // per_page
        }
    )

@router.post("/users", status_code=201)
def create_user(
    user_in: UserCreate,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Create user"""
    if not ctx.is_super_admin and not ctx.is_tenant_admin:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Forbidden", code="FORBIDDEN").model_dump(mode="json")
        )
    
    tenant_id = ctx.tenant_id or user_in.tenant_id
    if not tenant_id:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="tenant_id is required", code="TENANT_REQUIRED").model_dump(mode="json")
        )
    
    # Check tenant limits
    try:
        tenant = db_session.get(Tenant, tenant_id)
        if tenant:
            existing_users_count = User.query.filter_by(tenant_id=tenant_id).count()
            max_users = tenant.max_users or 5
            if existing_users_count >= max_users:
                raise HTTPException(
                    status_code=403,
                    detail=ApiError(
                        message=f"User limit reached. Your plan allows {max_users} users.",
                        code="USER_LIMIT_REACHED"
                    ).model_dump(mode="json")
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    if User.query.filter_by(username=user_in.username).first():
        raise HTTPException(
            status_code=409,
            detail=ApiError(message="username already exists", code="USERNAME_EXISTS").model_dump(mode="json")
        )
    
    user = User()
    user.username = user_in.username
    user.email = user_in.email
    user.first_name = user_in.first_name
    user.last_name = user_in.last_name
    user.role = user_in.role
    user.tenant_id = tenant_id
    user.set_password(user_in.password)
    
    db_session.add(user)
    if tenant:
        tenant.current_users = existing_users_count + 1
    
    db_session.commit()
    
    logger.info(f"User created: {user.id}")
    return ResponseEnvelope(data=user.to_dict())

@router.get("/users/me")
def get_me(
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Get current user profile"""
    def build_payload(u_obj, is_admin_user=False):
        payload = u_obj.to_dict()
        
        if is_admin_user:
            payload['role'] = 'super_admin'
            payload['globalPermissions'] = ['*']
            payload['apps'] = []
            return payload
        
        apps = {}
        if hasattr(u_obj, 'app_roles'):
            for ur in u_obj.app_roles:
                a = ur.app
                if not a:
                    continue
                entry = apps.get(a.id) or {'appId': a.id, 'appSlug': a.slug, 'roles': [], 'permissions': []}
                entry['roles'].append(ur.role.name if ur.role else ur.role_id)
                if ur.role and ur.role.permissions:
                    entry['permissions'].extend([p.name for p in ur.role.permissions])
                apps[a.id] = entry
        
        for k in apps:
            apps[k]['permissions'] = sorted(list(set(apps[k]['permissions'])))
        
        global_permissions = []
        if u_obj.role == 'admin':
            global_permissions = ['*']
        
        payload['apps'] = list(apps.values())
        payload['globalPermissions'] = global_permissions
        return payload
    
    user = ctx.user
    if user:
        return ResponseEnvelope(data=build_payload(user, is_admin_user=False))
    
    # Check for admin
    if hasattr(ctx, 'admin') and ctx.admin:
        return ResponseEnvelope(data=build_payload(ctx.admin, is_admin_user=True))
    
    if ctx.is_super_admin and ctx.user:
        return ResponseEnvelope(data=build_payload(ctx.user, is_admin_user=True))
    
    raise HTTPException(
        status_code=404,
        detail=ApiError(message="Not found", code="USER_NOT_FOUND").model_dump(mode="json")
    )

@router.put("/users/me")
def update_me(
    user_in: UserUpdate,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Update current user profile"""
    user = ctx.user
    if user:
        data = user_in.model_dump(exclude_unset=True, by_alias=False)
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            user.email = data['email']
        if 'username' in data:
            user.username = data['username']
        db_session.commit()
        return ResponseEnvelope(data=user.to_dict())
    
    raise HTTPException(
        status_code=404,
        detail=ApiError(message="Not found", code="USER_NOT_FOUND").model_dump(mode="json")
    )

@router.post("/users/me/password")
def change_password(
    password_in: PasswordChange,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Change password"""
    user = ctx.user
    if not user:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Not found", code="USER_NOT_FOUND").model_dump(mode="json")
        )
    
    if not user.check_password(password_in.current_password):
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Invalid current password", code="INVALID_PASSWORD").model_dump(mode="json")
        )
    
    user.set_password(password_in.new_password)
    db_session.commit()
    
    return ResponseEnvelope(message="Password updated")

@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    user_in: UserUpdate,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Update user"""
    if not ctx.is_super_admin and not ctx.is_tenant_admin and ctx.principal_id != user_id:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Forbidden", code="FORBIDDEN").model_dump(mode="json")
        )
    
    user = get_or_404_scoped(ctx, User, user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Not found", code="USER_NOT_FOUND").model_dump(mode="json")
        )
    
    data = user_in.model_dump(exclude_unset=True, by_alias=False)
    
    if 'first_name' in data:
        user.first_name = data['first_name']
    if 'last_name' in data:
        user.last_name = data['last_name']
    if 'email' in data:
        user.email = data['email']
    if 'role' in data and (ctx.is_super_admin or ctx.is_tenant_admin):
        user.role = data['role']
    if 'password' in data and data['password']:
        user.set_password(data['password'])
    
    db_session.add(user)
    db_session.commit()
    
    return ResponseEnvelope(data=user.to_dict())

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Delete user"""
    if not ctx.is_super_admin and not ctx.is_tenant_admin:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Forbidden", code="FORBIDDEN").model_dump(mode="json")
        )
    
    user = get_or_404_scoped(ctx, User, user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Not found", code="USER_NOT_FOUND").model_dump(mode="json")
        )
    
    db_session.delete(user)
    db_session.commit()
    
    logger.info(f"User deleted: {user_id}")
    return ResponseEnvelope(message="Deleted")
