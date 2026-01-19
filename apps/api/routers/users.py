"""
FastAPI Users Router - Migrated from Flask routes/users.py
User profile and management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel, Field
import logging

from sqlalchemy.orm import Session

from schemas.base import ResponseEnvelope, ApiError
from schemas.users import UserRead, UserMeRead

from models.user import User
from models.tenant import Tenant
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Users"])

# --- Helper Functions ---

def tenant_scoped_query(access: UnifiedAccess, model, session: Session):
    """Apply tenant scoping to query"""
    query = session.query(model)
    if access.tenant_id:
        query = query.filter_by(tenant_id=access.tenant_id)
    return query

def get_or_404_scoped(session: Session, access: UnifiedAccess, model, record_id: str):
    """Get record with tenant scoping or raise 404"""
    record = session.get(model, record_id)
    if not record:
        return None
    if access.tenant_id and hasattr(record, 'tenant_id') and record.tenant_id != access.tenant_id:
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

@router.get("/users", operation_id="listUsers", response_model=ResponseEnvelope[List[UserRead]])
def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access("users.view")),
    db_session: Session = Depends(get_db)
):
    """List users"""
    
    query = tenant_scoped_query(access, User, db_session)
    total = query.count()
    
    offset = (page - 1) * per_page
    users_list = query.order_by(User.created_at.desc()).limit(per_page).offset(offset).all()
    
    return ResponseEnvelope(
        data=[UserRead.model_validate(u) for u in users_list],
        meta={
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
    )

@router.post("/users", operation_id="createUsers", status_code=201, response_model=ResponseEnvelope[UserRead])
def create_user(
    user_in: UserCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Create user"""
    if not access.is_super_admin and not access.is_tenant_admin:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Forbidden", code="FORBIDDEN").model_dump(mode="json")
        )
    
    access.tenant_id = access.tenant_id or user_in.tenant_id
    if not access.tenant_id:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="access.tenant_id is required", code="TENANT_REQUIRED").model_dump(mode="json")
        )
    
    # Check tenant limits
    try:
        tenant = db_session.get(Tenant, access.tenant_id)
        if tenant:
            existing_users_count = db_session.query(User).filter_by(tenant_id=access.tenant_id).count()
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
    
    if db_session.query(User).filter_by(username=user_in.username).first():
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
    user.tenant_id = access.tenant_id
    user.set_password(user_in.password)
    
    db_session.add(user)
    if tenant:
        tenant.current_users = existing_users_count + 1
    
    db_session.commit()
    
    logger.info(f"User created: {user.id}")
    return ResponseEnvelope(data=UserRead.model_validate(user))

@router.get("/users/me", operation_id="listUserMe", response_model=ResponseEnvelope[UserMeRead])
def get_me(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get current user profile"""
    def build_payload(u_obj, is_admin_user=False):
        # Manual dict construction to avoid to_dict()
        payload = {
            'id': u_obj.id,
            'tenantId': getattr(u_obj, 'tenant_id', None), # admin user might not have tenant_id?
            'username': getattr(u_obj, 'username', u_obj.email),
            'email': u_obj.email,
            'firstName': u_obj.first_name,
            'lastName': u_obj.last_name,
            'fullName': getattr(u_obj, 'full_name', f"{u_obj.first_name} {u_obj.last_name}"),
            'role': u_obj.role,
            'phone': getattr(u_obj, 'phone', None),
            'isPhoneVerified': getattr(u_obj, 'is_phone_verified', False),
            'isActive': u_obj.is_active,
            'lastLogin': u_obj.last_login.isoformat() if u_obj.last_login else None,
            'createdAt': u_obj.created_at.isoformat() if getattr(u_obj, 'created_at', None) else None,
            'updatedAt': u_obj.updated_at.isoformat() if getattr(u_obj, 'updated_at', None) else None,
            'branchId': getattr(u_obj, 'branch_id', None), # If user model has this? core/models/user.py doesn't show branch_id directly, it uses M2M branches.
            # But schema has branchId. Let's start with None or check access context. 
            # In auth.py `get_current_user`, it constructs from `AuthUserRead.from_user_model`.
            # User model in core/models/user.py doesn't have `branch_id` column, it has `branches` relation.
            # But `UserRead` schema asks for `branchId`.
        }
        
        if is_admin_user:
            # Handle impersonation
            effective_role = access.claims.get('effective_role')
            impersonating = access.claims.get('is_impersonating') or access.claims.get('is_impersonating_tenant')
            
            payload['role'] = effective_role if effective_role else 'super_admin'
            
            if impersonating and 'role_permissions' in access.claims:
                payload['globalPermissions'] = access.claims['role_permissions']
            else:
                payload['globalPermissions'] = ['*']
            
            payload['apps'] = []
            
            # Tenant ID handling for impersonation
            eff_tenant = access.claims.get('effective_tenant_id') or access.claims.get('tenant_id')
            payload['tenantId'] = eff_tenant if eff_tenant else (payload.get('tenant_id') or 'admin')
            payload['tenant_id'] = payload['tenantId']
            
            payload['fullName'] = f"{payload.get('first_name', '')} {payload.get('last_name', '')}".strip() or payload.get('email', '')
            payload['full_name'] = payload['fullName']
            payload['firstName'] = payload.get('first_name', '')
            payload['lastName'] = payload.get('last_name', '')
            payload['isActive'] = payload.get('is_active', True)
            payload['permissions'] = list(payload.get('globalPermissions'))
            
            if impersonating:
                payload['isImpersonating'] = True
                payload['realUserEmail'] = access.claims.get('real_user_email')
                
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
    
    user = access.user
    
    # Check if this is an admin user - access.is_admin is set for admin tokens
    if access.is_admin and user:
        payload = build_payload(user, is_admin_user=True)
        return ResponseEnvelope(data=UserMeRead(**payload))
    
    # Regular tenant user
    if user:
        payload = build_payload(user, is_admin_user=False)
        return ResponseEnvelope(data=UserMeRead(**payload))
    
    raise HTTPException(
        status_code=404,
        detail=ApiError(message="Not found", code="USER_NOT_FOUND").model_dump(mode="json")
    )

@router.put("/users/me", operation_id="updateUserMe", response_model=ResponseEnvelope[UserRead])
def update_me(
    user_in: UserUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Update current user profile"""
    user = access.user
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
        return ResponseEnvelope(data=UserRead.model_validate(user))
    
    raise HTTPException(
        status_code=404,
        detail=ApiError(message="Not found", code="USER_NOT_FOUND").model_dump(mode="json")
    )

@router.post("/users/me/password", operation_id="createUserMePassword")
def change_password(
    password_in: PasswordChange,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Change password"""
    user = access.user
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

@router.put("/users/{user_id}", operation_id="updateUser", response_model=ResponseEnvelope[UserRead])
def update_user(
    user_id: str,
    user_in: UserUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Update user"""
    if not access.is_super_admin and not access.is_tenant_admin and access.principal_id != user_id:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Forbidden", code="FORBIDDEN").model_dump(mode="json")
        )
    
    user = get_or_404_scoped(db_session, access, User, user_id)
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
    if 'role' in data and (access.is_super_admin or access.is_tenant_admin):
        user.role = data['role']
    if 'password' in data and data['password']:
        user.set_password(data['password'])
    
    db_session.add(user)
    db_session.commit()
    
    return ResponseEnvelope(data=UserRead.model_validate(user))

@router.delete("/users/{user_id}", operation_id="deleteUser")
def delete_user(
    user_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Delete user"""
    if not access.is_super_admin and not access.is_tenant_admin:
        raise HTTPException(
            status_code=403,
            detail=ApiError(message="Forbidden", code="FORBIDDEN").model_dump(mode="json")
        )
    
    user = get_or_404_scoped(db_session, access, User, user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Not found", code="USER_NOT_FOUND").model_dump(mode="json")
        )
    
    db_session.delete(user)
    db_session.commit()
    
    logger.info(f"User deleted: {user_id}")
    return ResponseEnvelope(message="Deleted")
