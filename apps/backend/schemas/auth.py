from typing import Optional, List, Any, Dict
from datetime import datetime
from pydantic import Field, EmailStr
from .base import AppBaseModel, IDMixin, TimestampMixin

# --- User Schemas ---
class UserBase(AppBaseModel):
    username: str
    email: EmailStr
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    phone: Optional[str] = None
    role: str = "user"
    is_active: bool = Field(True, alias="isActive")

class UserCreate(UserBase):
    tenant_id: str = Field(..., alias="tenantId")
    password: str

class UserUpdate(AppBaseModel):
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = Field(None, alias="isActive")
    is_phone_verified: Optional[bool] = Field(None, alias="isPhoneVerified")

class UserRead(UserBase, IDMixin):
    tenant_id: str = Field(..., alias="tenantId")
    full_name: str = Field(..., alias="fullName")
    is_phone_verified: bool = Field(False, alias="isPhoneVerified")
    last_login: Optional[datetime] = Field(None, alias="lastLogin")
    branches: List[Dict[str, Any]] = [] # Simplified branch info

# --- Auth Schemas ---
class LoginRequest(AppBaseModel):
    username: str
    password: str

class TokenResponse(AppBaseModel):
    access_token: str = Field(..., alias="accessToken")
    refresh_token: Optional[str] = Field(None, alias="refreshToken")
    user: UserRead

class PasswordChangeRequest(AppBaseModel):
    current_password: str = Field(..., alias="currentPassword")
    new_password: str = Field(..., alias="newPassword")

# --- Activity Log Schemas ---
class ActivityLogBase(AppBaseModel):
    action: str
    message: Optional[str] = None
    entity_type: Optional[str] = Field(None, alias="entityType")
    entity_id: Optional[str] = Field(None, alias="entityId")
    data: Optional[Dict[str, Any]] = None
    is_critical: bool = Field(False, alias="isCritical")

class ActivityLogCreate(ActivityLogBase):
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    ip_address: Optional[str] = Field(None, alias="ipAddress")
    user_agent: Optional[str] = Field(None, alias="userAgent")

class ActivityLogRead(ActivityLogBase, IDMixin, TimestampMixin):
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    user_id: Optional[str] = Field(None, alias="userId")
    user_name: Optional[str] = Field(None, alias="userName")
    user_email: Optional[str] = Field(None, alias="userEmail")
    tenant_name: Optional[str] = Field(None, alias="tenantName")
    branch_name: Optional[str] = Field(None, alias="branchName")
