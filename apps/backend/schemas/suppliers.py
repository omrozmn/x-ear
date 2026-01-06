"""
Supplier Schemas - Pydantic models for Supplier domain
"""
from typing import Optional, List
from pydantic import Field, EmailStr
from .base import AppBaseModel, IDMixin, TimestampMixin


class SupplierBase(AppBaseModel):
    """Base supplier schema"""
    name: str = Field(..., description="Supplier name")
    code: Optional[str] = Field(None, description="Supplier code")
    contact_name: Optional[str] = Field(None, alias="contactName", description="Contact person name")
    email: Optional[EmailStr] = Field(None, description="Email")
    phone: Optional[str] = Field(None, description="Phone number")
    address: Optional[str] = Field(None, description="Address")
    city: Optional[str] = Field(None, description="City")
    tax_number: Optional[str] = Field(None, alias="taxNumber", description="Tax number")
    tax_office: Optional[str] = Field(None, alias="taxOffice", description="Tax office")
    is_active: bool = Field(True, alias="isActive", description="Is supplier active")
    notes: Optional[str] = Field(None, description="Notes")


class SupplierCreate(SupplierBase):
    """Schema for creating a supplier"""
    pass


class SupplierUpdate(AppBaseModel):
    """Schema for updating a supplier"""
    name: Optional[str] = None
    code: Optional[str] = None
    contact_name: Optional[str] = Field(None, alias="contactName")
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    tax_number: Optional[str] = Field(None, alias="taxNumber")
    tax_office: Optional[str] = Field(None, alias="taxOffice")
    is_active: Optional[bool] = Field(None, alias="isActive")
    notes: Optional[str] = None


class SupplierRead(SupplierBase, IDMixin, TimestampMixin):
    """Schema for reading a supplier"""
    tenant_id: str = Field(..., alias="tenantId")
    product_count: int = Field(0, alias="productCount", description="Number of products from supplier")
    total_purchases: float = Field(0.0, alias="totalPurchases", description="Total purchase amount")


# Type aliases for frontend compatibility
Supplier = SupplierRead
SupplierInput = SupplierCreate
