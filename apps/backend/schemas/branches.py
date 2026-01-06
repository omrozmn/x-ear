"""
Branch Schemas - Pydantic models for Branch domain
"""
from typing import Optional
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin


class BranchBase(AppBaseModel):
    """Base branch schema"""
    name: str = Field(..., description="Branch name")
    code: Optional[str] = Field(None, description="Branch code")
    address: Optional[str] = Field(None, description="Branch address")
    city: Optional[str] = Field(None, description="City")
    district: Optional[str] = Field(None, description="District")
    phone: Optional[str] = Field(None, description="Phone number")
    email: Optional[str] = Field(None, description="Email")
    is_active: bool = Field(True, alias="isActive", description="Is branch active")
    is_main: bool = Field(False, alias="isMain", description="Is main branch")


class BranchCreate(BranchBase):
    """Schema for creating a branch"""
    pass


class BranchUpdate(AppBaseModel):
    """Schema for updating a branch"""
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = Field(None, alias="isActive")


class BranchRead(BranchBase, IDMixin, TimestampMixin):
    """Schema for reading a branch"""
    tenant_id: str = Field(..., alias="tenantId")
    user_count: int = Field(0, alias="userCount", description="Number of users in branch")
    patient_count: int = Field(0, alias="patientCount", description="Number of patients in branch")
