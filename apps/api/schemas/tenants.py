"""
Tenant Schemas - Pydantic models for Tenant domain
"""
from typing import Optional, Dict, Any, List, Union
from datetime import datetime
from enum import Enum
from pydantic import Field, EmailStr, field_validator
from .base import AppBaseModel, IDMixin, TimestampMixin


class TenantStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    TRIAL = "trial"

    @classmethod
    def _missing_(cls, value):
        """Handle case-insensitive lookup"""
        if isinstance(value, str):
            lower_value = value.lower()
            for member in cls:
                if member.value == lower_value:
                    return member
        return None


from .enums import ProductCode

class TenantBase(AppBaseModel):
    """Base tenant schema"""
    name: str = Field(..., description="Tenant name")
    slug: str = Field(..., description="Tenant slug (unique identifier)")
    email: Optional[EmailStr] = Field(None, description="Contact email")
    phone: Optional[str] = Field(None, description="Contact phone")
    address: Optional[str] = Field(None, description="Address")
    city: Optional[str] = Field(None, description="City")
    owner_email: Optional[EmailStr] = Field(None, description="Owner email")
    billing_email: Optional[EmailStr] = Field(None, description="Billing email")
    description: Optional[str] = Field(None, description="Description")
    
    # Business info
    tax_number: Optional[str] = Field(None, alias="taxNumber", description="Tax number")
    tax_office: Optional[str] = Field(None, alias="taxOffice", description="Tax office")
    
    status: TenantStatus = Field(TenantStatus.ACTIVE, description="Tenant status")
    
    # Product (Strict)
    product_code: Optional[ProductCode] = Field(ProductCode.XEAR_HEARING, description="Product Code")


class TenantCreate(TenantBase):
    """Schema for creating a tenant"""
    slug: Optional[str] = Field(None, description="Tenant slug (auto-generated if empty)")
    plan_id: Optional[str] = Field(None, alias="planId", description="Subscription plan ID")
    current_plan: Optional[str] = Field(None, description="Current Plan Slug") # Admin override
    max_users: Optional[int] = Field(5, description="Max users")
    current_users: Optional[int] = Field(0, description="Current users")
    company_info: Optional[Dict[str, Any]] = Field(default={}, description="Company Info")
    settings: Optional[Dict[str, Any]] = Field(default={}, description="Settings")


class TenantUpdate(AppBaseModel):
    """Schema for updating a tenant"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    tax_number: Optional[str] = Field(None, alias="taxNumber")
    tax_office: Optional[str] = Field(None, alias="taxOffice")
    status: Optional[TenantStatus] = None
    # Admin fields
    current_plan: Optional[str] = None
    max_users: Optional[int] = None
    current_users: Optional[int] = None
    company_info: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None
    feature_usage: Optional[Dict[str, Any]] = None
    owner_email: Optional[str] = None
    billing_email: Optional[str] = None
    description: Optional[str] = None
    slug: Optional[str] = None
    product_code: Optional[ProductCode] = None


class TenantRead(TenantBase, IDMixin, TimestampMixin):
    """Schema for reading a tenant"""
    # Product Identification (Strict)
    product_code: ProductCode = Field(..., description="Product Code")

    # Subscription info
    plan_id: Optional[str] = Field(None, alias="planId")
    plan_name: Optional[str] = Field(None, alias="planName")
    subscription_end: Optional[datetime] = Field(None, alias="subscriptionEnd")
    
    # Stats
    user_count: int = Field(0, alias="userCount")
    patient_count: int = Field(0, alias="patientCount")
    branch_count: int = Field(0, alias="branchCount")
    
    # Settings
    settings: Optional[Dict[str, Any]] = Field(None, description="Tenant settings")
    max_users: int = Field(..., alias="maxUsers")
    current_users: int = Field(..., alias="currentUsers")
    owner_email: Optional[str] = Field(None, alias="ownerEmail")
    billing_email: Optional[str] = Field(None, alias="billingEmail")
    status: TenantStatus = Field(...)
    slug: str


class TenantStats(AppBaseModel):
    """Tenant statistics schema"""
    total_users: int = Field(0, alias="totalUsers")
    total_patients: int = Field(0, alias="totalPatients")
    total_sales: int = Field(0, alias="totalSales")
    total_revenue: float = Field(0.0, alias="totalRevenue")
    active_subscriptions: int = Field(0, alias="activeSubscriptions")

    active_subscriptions: int = Field(0, alias="activeSubscriptions")


# --- Subscription & Plan Schemas ---

class PlanRead(IDMixin, AppBaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    plan_type: Optional[str] = Field(None, alias="planType")
    price: Optional[float] = None
    billing_interval: Optional[str] = Field(None, alias="billingInterval")
    features: Optional[Union[Dict[str, Any], List[Any]]] = None
    max_users: Optional[int] = Field(None, alias="maxUsers")

    @field_validator('features', mode='before')
    @classmethod
    def ensure_json(cls, v):
        """Parse JSON string to dict/list if needed"""
        if v is None:
            return []
        if isinstance(v, str) and (v.startswith('{') or v.startswith('[')):
            import json
            try:
                return json.loads(v)
            except:
                return v
        return v
    max_storage_gb: Optional[int] = Field(None, alias="maxStorageGb")
    is_active: bool = Field(True, alias="isActive")
    is_public: bool = Field(True, alias="isPublic")
    monthly_price: Optional[float] = Field(None, alias="monthlyPrice")
    yearly_price: Optional[float] = Field(None, alias="yearlyPrice")

class TenantCompanyResponse(AppBaseModel):
    id: str
    name: str
    company_info: Optional[Dict[str, Any]] = Field(default_factory=dict, alias="companyInfo")
    settings: Optional[Dict[str, Any]] = None

class TenantAssetResponse(AppBaseModel):
    url: str
    type: str
    storage_mode: str = Field(..., alias="storageMode")

class TenantAssetUrlResponse(AppBaseModel):
    type: str
    url: Optional[str] = None
    exists: bool

class SubscriptionResponse(AppBaseModel):
    message: str
    tenant: Optional[Dict[str, Any]] = None 
    plan: Optional[Dict[str, Any]] = None

class SignupResponse(AppBaseModel):
    message: str
    tenant: Optional[Dict[str, Any]] = None
    user: Dict[str, Any]
    token: Optional[str] = None

class CurrentSubscriptionResponse(AppBaseModel):
    tenant: Optional[Dict[str, Any]] = None
    plan: Optional[Dict[str, Any]] = None
    is_expired: bool = Field(False, alias="isExpired")
    days_remaining: int = Field(0, alias="daysRemaining")
    message: Optional[str] = None
    is_super_admin: Optional[bool] = Field(None, alias="is_super_admin")

class TurnstileConfigResponse(AppBaseModel):
    site_key: str = Field(..., alias="siteKey")

class RegistrationVerifyResponse(AppBaseModel):
    user_id: str
    username: str
    temp_password: str
    access_token: str
    message: str
