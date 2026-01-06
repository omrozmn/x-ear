"""
Affiliate Schemas - Pydantic models for Affiliate domain
"""
from typing import Optional
from datetime import datetime
from pydantic import Field, EmailStr
from .base import AppBaseModel, IDMixin, TimestampMixin


class AffiliateBase(AppBaseModel):
    """Base affiliate schema"""
    name: str = Field(..., description="Affiliate name")
    email: EmailStr = Field(..., description="Email")
    phone: Optional[str] = Field(None, description="Phone number")
    company_name: Optional[str] = Field(None, alias="companyName", description="Company name")
    tax_number: Optional[str] = Field(None, alias="taxNumber", description="Tax number")
    iban: Optional[str] = Field(None, description="IBAN")
    commission_rate: float = Field(10.0, alias="commissionRate", description="Commission rate %")
    is_active: bool = Field(True, alias="isActive", description="Is affiliate active")


class AffiliateCreate(AffiliateBase):
    """Schema for creating an affiliate"""
    password: str = Field(..., description="Password")


class AffiliateUpdate(AppBaseModel):
    """Schema for updating an affiliate"""
    name: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = Field(None, alias="companyName")
    tax_number: Optional[str] = Field(None, alias="taxNumber")
    iban: Optional[str] = None
    commission_rate: Optional[float] = Field(None, alias="commissionRate")
    is_active: Optional[bool] = Field(None, alias="isActive")


class AffiliateRead(AffiliateBase, IDMixin, TimestampMixin):
    """Schema for reading an affiliate"""
    referral_code: str = Field(..., alias="referralCode", description="Referral code")
    total_referrals: int = Field(0, alias="totalReferrals", description="Total referrals")
    total_earnings: float = Field(0.0, alias="totalEarnings", description="Total earnings")
    pending_earnings: float = Field(0.0, alias="pendingEarnings", description="Pending earnings")
    paid_earnings: float = Field(0.0, alias="paidEarnings", description="Paid earnings")
    last_login: Optional[datetime] = Field(None, alias="lastLogin", description="Last login")


class CommissionBase(AppBaseModel):
    """Base commission schema"""
    affiliate_id: str = Field(..., alias="affiliateId", description="Affiliate ID")
    tenant_id: str = Field(..., alias="tenantId", description="Tenant ID")
    amount: float = Field(..., description="Commission amount")
    status: str = Field("pending", description="Commission status")


class CommissionRead(CommissionBase, IDMixin, TimestampMixin):
    """Schema for reading a commission"""
    tenant_name: Optional[str] = Field(None, alias="tenantName", description="Tenant name")
    paid_at: Optional[datetime] = Field(None, alias="paidAt", description="Paid at")


# Type aliases for frontend compatibility
Affiliate = AffiliateRead
AffiliateInput = AffiliateCreate
Commission = CommissionRead
