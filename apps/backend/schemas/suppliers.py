"""
Supplier Schemas - Pydantic models for Supplier domain
"""
from typing import Optional, List, Union
from pydantic import Field, field_validator
from .base import AppBaseModel, IDMixin, TimestampMixin


class SupplierBase(AppBaseModel):
    """Base supplier schema - matches Supplier.to_dict() output"""
    company_name: str = Field(..., alias="companyName", description="Supplier company name")
    company_code: Optional[str] = Field(None, alias="companyCode", description="Supplier code")
    contact_person: Optional[str] = Field(None, alias="contactPerson", description="Contact person name")
    # Use str instead of EmailStr to allow empty strings from database
    email: Optional[str] = Field(None, description="Email")
    phone: Optional[str] = Field(None, description="Phone number")
    mobile: Optional[str] = Field(None, description="Mobile number")
    fax: Optional[str] = Field(None, description="Fax number")
    website: Optional[str] = Field(None, description="Website")
    address: Optional[str] = Field(None, description="Address")
    city: Optional[str] = Field(None, description="City")
    country: Optional[str] = Field("Türkiye", description="Country")
    postal_code: Optional[str] = Field(None, alias="postalCode", description="Postal code")
    tax_number: Optional[str] = Field(None, alias="taxNumber", description="Tax number")
    tax_office: Optional[str] = Field(None, alias="taxOffice", description="Tax office")
    payment_terms: Optional[str] = Field(None, alias="paymentTerms", description="Payment terms")
    currency: Optional[str] = Field("TRY", description="Currency")
    rating: Optional[int] = Field(None, description="Rating 1-5")
    is_active: bool = Field(True, alias="isActive", description="Is supplier active")
    notes: Optional[str] = Field(None, description="Notes")
    
    @field_validator('email', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        """Convert empty string to None for email field"""
        if v == '':
            return None
        return v


class SupplierCreate(AppBaseModel):
    """Schema for creating a supplier"""
    company_name: str = Field(..., alias="companyName", description="Supplier company name")
    company_code: Optional[str] = Field(None, alias="companyCode")
    contact_person: Optional[str] = Field(None, alias="contactPerson")
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    tax_number: Optional[str] = Field(None, alias="taxNumber")
    tax_office: Optional[str] = Field(None, alias="taxOffice")
    is_active: bool = Field(True, alias="isActive")
    notes: Optional[str] = None
    
    @field_validator('email', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == '':
            return None
        return v


class SupplierUpdate(AppBaseModel):
    """Schema for updating a supplier"""
    company_name: Optional[str] = Field(None, alias="companyName")
    company_code: Optional[str] = Field(None, alias="companyCode")
    contact_person: Optional[str] = Field(None, alias="contactPerson")
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    fax: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = Field(None, alias="postalCode")
    tax_number: Optional[str] = Field(None, alias="taxNumber")
    tax_office: Optional[str] = Field(None, alias="taxOffice")
    payment_terms: Optional[str] = Field(None, alias="paymentTerms")
    currency: Optional[str] = None
    rating: Optional[int] = None
    is_active: Optional[bool] = Field(None, alias="isActive")
    notes: Optional[str] = None
    
    @field_validator('email', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == '':
            return None
        return v


class SupplierRead(SupplierBase, TimestampMixin):
    """Schema for reading a supplier - matches Supplier.to_dict() output"""
    # ID is integer in Supplier model, not string
    id: Union[int, str] = Field(..., description="Supplier ID")
    tenant_id: str = Field(..., alias="tenantId")
    product_count: int = Field(0, alias="productCount", description="Number of products from supplier")


# Type aliases for frontend compatibility
Supplier = SupplierRead
SupplierInput = SupplierCreate
