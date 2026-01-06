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
    pass


class RoleUpdate(AppBaseModel):
    """Schema for updating a role"""
    name: Optional[str] = None
    description: Optional[str] = None


class PermissionBase(AppBaseModel):
    """Base permission schema"""
    name: str = Field(..., description="Permission name")
    description: Optional[str] = Field(None, description="Permission description")
    category: Optional[str] = Field(None, description="Permission category")


class PermissionRead(PermissionBase, IDMixin):
    """Schema for reading a permission"""
    pass


class RoleRead(IDMixin, TimestampMixin, AppBaseModel):
    """Schema for reading a role - matches Role.to_dict() output"""
    name: str = Field(..., description="Role name")
    description: Optional[str] = Field(None, description="Role description")
    is_system: bool = Field(False, alias="isSystem", description="Is system role")
    permissions: List[PermissionRead] = Field(default_factory=list, description="Role permissions")


# Type aliases for frontend compatibility
Role = RoleRead
Permission = PermissionRead
