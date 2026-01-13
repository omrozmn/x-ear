"""
Tenant Schemas - Pydantic models for Tenant domain
"""
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import Field, EmailStr
from .base import AppBaseModel, IDMixin, TimestampMixin


class TenantStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    TRIAL = "trial"


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


class TenantCreate(TenantBase):
    """Schema for creating a tenant"""
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


class TenantRead(TenantBase, IDMixin, TimestampMixin):
    """Schema for reading a tenant"""
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
    max_users: int = Field(5, alias="maxUsers")
    current_users: int = Field(0, alias="currentUsers")
    owner_email: Optional[str] = Field(None, alias="ownerEmail")
    billing_email: Optional[str] = Field(None, alias="billingEmail")
    status: TenantStatus = Field(TenantStatus.ACTIVE)
    slug: str


class TenantStats(AppBaseModel):
    """Tenant statistics schema"""
    total_users: int = Field(0, alias="totalUsers")
    total_patients: int = Field(0, alias="totalPatients")
    total_sales: int = Field(0, alias="totalSales")
    total_revenue: float = Field(0.0, alias="totalRevenue")
    active_subscriptions: int = Field(0, alias="activeSubscriptions")
