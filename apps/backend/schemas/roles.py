"""
Role Schemas - Pydantic models for Role domain
"""
from typing import Optional, List
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin


class RoleBase(AppBaseModel):
    """Base role schema"""
    name: str = Field(..., description="Role name")
    description: Optional[str] = Field(None, description="Role description")
    is_system: bool = Field(False, alias="isSystem", description="Is system role")


class RoleCreate(RoleBase):
    """Schema for creating a role"""
    permissions: Optional[List[str]] = Field(None, description="List of permission codes")


class RoleUpdate(AppBaseModel):
    """Schema for updating a role"""
    name: Optional[str] = None
    description: Optional[str] = None


class RolePermissionsUpdate(AppBaseModel):
    """Schema for updating role permissions"""
    permissions: List[str]


class PermissionBase(AppBaseModel):
    """Base permission schema"""
    code: str = Field(..., description="Permission code")
    label: str = Field(..., description="Permission label")
    description: Optional[str] = Field(None, description="Permission description")
    category: Optional[str] = Field(None, description="Permission category")


class PermissionRead(PermissionBase, IDMixin):
    """Schema for reading a permission"""
    pass


class RoleRead(IDMixin, TimestampMixin, AppBaseModel):
    """Schema for reading a role - matches Role.to_dict() output"""
    name: str = Field(..., description="Role name")
    description: Optional[str] = Field(None, description="Role description")
    is_system_role: bool = Field(False, alias="isSystem", description="Is system role")
    permissions: List[PermissionRead] = Field(default_factory=list, description="Role permissions")


class RoleListResponse(AppBaseModel):
    """Schema for role list response"""
    roles: List[RoleRead]
    total: int


class RoleResponse(AppBaseModel):
    """Schema for single role response"""
    role: RoleRead


class PermissionGroup(AppBaseModel):
    """Schema for permission group"""
    category: str
    label: str
    icon: Optional[str] = None
    permissions: List[PermissionRead]


class PermissionListResponse(AppBaseModel):
    """Schema for permission list response"""
    data: List[PermissionGroup]
    all: List[PermissionRead]
    total: int


# Type aliases for frontend compatibility
Role = RoleRead
Permission = PermissionRead
