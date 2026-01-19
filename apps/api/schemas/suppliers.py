"""
Supplier Schemas - Pydantic models for Supplier domain
"""
from typing import Optional, List, Union, Any, Dict
from pydantic import Field, field_validator, model_validator
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
    name: Optional[str] = Field(None, description="Frontend alias for companyName")
    code: Optional[str] = Field(None, description="Frontend alias for companyCode")
    contact_name: Optional[str] = Field(None, alias="contactName", description="Frontend alias for contactPerson")
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

    @model_validator(mode='before')
    @classmethod
    def map_aliases_before_validation(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if 'name' in data and 'companyName' not in data:
                data['companyName'] = data['name']
            if 'code' in data and 'companyCode' not in data:
                data['companyCode'] = data['code']
            if 'contactName' in data and 'contactPerson' not in data:
                data['contactPerson'] = data['contactName']
        return data


class SupplierUpdate(AppBaseModel):
    """Schema for updating a supplier"""
    name: Optional[str] = Field(None, description="Frontend alias for companyName")
    code: Optional[str] = Field(None, description="Frontend alias for companyCode")
    contact_name: Optional[str] = Field(None, alias="contactName", description="Frontend alias for contactPerson")
    
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

    @model_validator(mode='before')
    @classmethod
    def map_aliases_before_validation(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if 'name' in data and 'companyName' not in data:
                data['companyName'] = data['name']
            if 'code' in data and 'companyCode' not in data:
                data['companyCode'] = data['code']
            if 'contactName' in data and 'contactPerson' not in data:
                data['contactPerson'] = data['contactName']
        return data


class SupplierRead(SupplierBase, TimestampMixin):
    """Schema for reading a supplier - matches Supplier.to_dict() output"""
    # ID is integer in Supplier model, not string
    id: Union[int, str] = Field(..., description="Supplier ID")
    tenant_id: str = Field(..., alias="tenantId")
    product_count: int = Field(0, alias="productCount", description="Number of products from supplier")
    total_purchases: float = Field(0.0, alias="totalPurchases", description="Total purchase amount")
    
    name: str = Field(..., description="Frontend alias for companyName")


class ProductSupplierRead(AppBaseModel, TimestampMixin):
    """Schema for reading ProductSupplier"""
    id: int
    product_id: str = Field(..., alias="productId")
    supplier_id: int = Field(..., alias="supplierId")
    tenant_id: str = Field(..., alias="tenantId")
    
    supplier_product_code: Optional[str] = Field(None, alias="supplierProductCode")
    supplier_product_name: Optional[str] = Field(None, alias="supplierProductName")
    
    unit_cost: Optional[float] = Field(None, alias="unitCost")
    currency: str = Field("TRY")
    minimum_order_quantity: int = Field(1, alias="minimumOrderQuantity")
    
    lead_time_days: Optional[int] = Field(None, alias="leadTimeDays")
    is_primary: bool = Field(False, alias="isPrimary")
    priority: int = 1
    
    is_active: bool = Field(True, alias="isActive")
    notes: Optional[str] = None
    last_order_date: Optional[str] = Field(None, alias="lastOrderDate")
    
    # Enriched fields
    product: Optional[Dict[str, Any]] = None
    supplier: Optional[Dict[str, Any]] = None

class SupplierStats(AppBaseModel):
    total_suppliers: int = Field(0, alias="totalSuppliers")
    active_suppliers: int = Field(0, alias="activeSuppliers")
    inactive_suppliers: int = Field(0, alias="inactiveSuppliers")
    total_product_relationships: int = Field(0, alias="totalProductRelationships")
    average_rating: float = Field(0.0, alias="averageRating")

class SupplierSearchResponse(AppBaseModel):
    suppliers: List[SupplierRead]

# Type aliases for frontend compatibility
Supplier = SupplierRead
SupplierInput = SupplierCreate
