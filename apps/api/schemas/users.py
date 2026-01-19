"""
User Schemas
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

from schemas.base import AppBaseModel, IDMixin, TimestampMixin


class UserBase(AppBaseModel):
    """Base User schema"""
    email: str
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    phone: Optional[str] = None


class UserProfile(AppBaseModel):
    """User profile schema"""
    email: str
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    phone: Optional[str] = None
    role: Optional[str] = None


class UserRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading User - replaces to_dict()"""
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    email: str
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    phone: Optional[str] = None
    role: Optional[str] = None
    is_phone_verified: bool = Field(False, alias="isPhoneVerified")
    is_active: Optional[bool] = Field(None, alias="isActive")
    last_login: Optional[datetime] = Field(None, alias="lastLogin")


class AdminUserRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading AdminUser - replaces to_dict()"""
    email: str
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    role: Optional[str] = None
    is_phone_verified: bool = Field(False, alias="isPhoneVerified")
    is_active: Optional[bool] = Field(None, alias="isActive")
    last_login: Optional[datetime] = Field(None, alias="lastLogin")


class UserCreate(AppBaseModel):
    """Schema for creating User"""
    email: str
    password: str
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    phone: Optional[str] = None
    role: Optional[str] = None


class UserUpdate(AppBaseModel):
    """Schema for updating User"""
    email: Optional[str] = None
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    phone: Optional[str] = None
    role: Optional[str] = None
    is_phone_verified: bool = Field(False, alias="isPhoneVerified")
    is_active: Optional[bool] = Field(None, alias="isActive")


class RoleBase(AppBaseModel):
    """Base Role schema"""
    name: str
    description: Optional[str] = None


class RoleRead(AppBaseModel, IDMixin):
    """Schema for reading Role"""
    name: str
    description: Optional[str] = None
    permissions: Optional[list] = []


class PermissionRead(AppBaseModel):
    """Schema for reading Permission"""
    code: str
    description: Optional[str] = None
    category: Optional[str] = None


class UserMeRead(AppBaseModel, IDMixin):
    """Schema for /me endpoint"""
    email: str
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    phone: Optional[str] = None
    role: Optional[str] = None
    is_phone_verified: bool = Field(False, alias="isPhoneVerified")
    permissions: Optional[list] = []


class UserListResponse(AppBaseModel):
    """Schema for user list response"""
    users: list[UserRead]
    total: int


class UserResponse(AppBaseModel):
    """Schema for single user response"""
    user: UserRead