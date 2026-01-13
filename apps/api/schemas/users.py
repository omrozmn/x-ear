"""
User Schemas - Pydantic models for User domain
"""
from typing import Optional, List
from datetime import datetime
from pydantic import Field, EmailStr
from .base import AppBaseModel, IDMixin, TimestampMixin


class UserBase(AppBaseModel):
    """Base user schema"""
    email: EmailStr = Field(..., description="User email")
    first_name: str = Field(..., alias="firstName", description="First name")
    last_name: str = Field(..., alias="lastName", description="Last name")
    phone: Optional[str] = Field(None, description="Phone number")
    role: str = Field("user", description="User role")
    is_active: bool = Field(True, alias="isActive", description="Is user active")


class UserCreate(UserBase):
    """Schema for creating a user"""
    password: str = Field(..., min_length=6, description="Password")
    branch_id: Optional[str] = Field(None, alias="branchId")


class UserUpdate(AppBaseModel):
    """Schema for updating a user"""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = Field(None, alias="isActive")
    password: Optional[str] = Field(None, min_length=6)


class UserRead(UserBase, IDMixin, TimestampMixin):
    """Schema for reading a user"""
    tenant_id: str = Field(..., alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    full_name: str = Field(..., alias="fullName", description="Full name")
    last_login: Optional[datetime] = Field(None, alias="lastLogin")
    username: Optional[str] = Field(None, description="Username")
    
    # Permissions
    permissions: List[str] = Field(default=[], description="User permissions")


class UserProfile(AppBaseModel):
    """User profile schema"""
    id: str
    email: EmailStr
    first_name: str = Field(..., alias="firstName")
    last_name: str = Field(..., alias="lastName")
    full_name: str = Field(..., alias="fullName")
    role: str
    tenant_id: str = Field(..., alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    permissions: List[str] = []


class RoleBase(AppBaseModel):
    """Base role schema"""
    name: str = Field(..., description="Role name")
    description: Optional[str] = Field(None, description="Role description")
    permissions: List[str] = Field(default=[], description="Role permissions")


class RoleRead(RoleBase, IDMixin, TimestampMixin):
    """Schema for reading a role"""
    tenant_id: str = Field(..., alias="tenantId")
    user_count: int = Field(0, alias="userCount", description="Number of users with this role")


class PermissionRead(IDMixin, AppBaseModel):
    """Schema for reading a permission"""
    name: str = Field(..., description="Permission name")
    description: Optional[str] = Field(None, description="Permission description")
    category: Optional[str] = Field(None, description="Permission category")


class UserListResponse(AppBaseModel):
    """Schema for user list response"""
    users: List[UserRead]


class UserResponse(AppBaseModel):
    """Schema for single user response"""
    user: UserRead
