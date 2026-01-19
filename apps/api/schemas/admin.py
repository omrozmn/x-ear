"""
Admin Schemas
"""
from typing import Optional, List, Dict, Any, Union
from pydantic import Field
from .base import AppBaseModel
from .users import UserRead, AdminUserRead

# --- Auth/Debug ---

class AdminLoginResponse(AppBaseModel):
    token: Optional[str] = None
    refresh_token: Optional[str] = Field(None, alias="refreshToken")
    user: Optional[Union[AdminUserRead, Dict[str, Any]]] = None
    requires_mfa: bool = False

class DebugRoleSwitchResponse(AppBaseModel):
    access_token: str = Field(..., alias="accessToken")
    refresh_token: str = Field(..., alias="refreshToken")
    effective_role: str = Field(..., alias="effectiveRole")
    permissions: List[str]
    is_impersonating: bool = Field(..., alias="isImpersonating")
    real_user_email: str = Field(..., alias="realUserEmail")

class DebugTenantSwitchResponse(AppBaseModel):
    access_token: str = Field(..., alias="accessToken")
    refresh_token: str = Field(..., alias="refreshToken")
    effective_tenant_id: str = Field(..., alias="effectiveTenantId")
    tenant_name: str = Field(..., alias="tenantName")
    tenant_status: str = Field(..., alias="tenantStatus")
    is_impersonating_tenant: bool = Field(..., alias="isImpersonatingTenant")
    real_user_email: str = Field(..., alias="realUserEmail")

class DebugPagePermissionResponse(AppBaseModel):
    page_key: str = Field(..., alias="pageKey")
    required_permissions: List[str] = Field(..., alias="requiredPermissions")
    found: bool

class AvailableRole(AppBaseModel):
    id: str
    name: str
    display_name: str = Field(..., alias="displayName")
    description: Optional[str] = None
    permission_count: int = Field(0, alias="permissionCount")

class AvailableRolesResponse(AppBaseModel):
    roles: List[AvailableRole]

# --- Analytics ---

class RevenueTrendItem(AppBaseModel):
    month: str
    revenue: float
    growth: Optional[float] = None

class UserEngagementItem(AppBaseModel):
    date: str
    dau: int
    wau: int
    mau: int

class PlanDistributionItem(AppBaseModel):
    name: str
    value: int
    color: str

class TopTenantItem(AppBaseModel):
    id: str
    name: str
    revenue: float
    growth: float
    users: int

class AnalyticsOverview(AppBaseModel):
    total_revenue: float
    revenue_growth: float
    active_tenants: int
    tenants_growth: float
    monthly_active_users: int
    mau_growth: float
    churn_rate: float
    churn_growth: float

class AdminAnalyticsData(AppBaseModel):
    overview: AnalyticsOverview
    revenue_trend: List[RevenueTrendItem]
    user_engagement: List[UserEngagementItem]
    plan_distribution: List[PlanDistributionItem]
    top_tenants: List[TopTenantItem]
    domain_metrics: Dict[str, Any]

class RevenueAnalytics(AppBaseModel):
    total_revenue: float
    revenue_trend: List[RevenueTrendItem]

class UserAnalytics(AppBaseModel):
    total_users: int
    active_users: int
    monthly_active_users: int

class TenantAnalytics(AppBaseModel):
    total_tenants: int
    active_tenants: int
    by_status: Dict[str, int]

# --- Dashboard ---

class DashboardOverview(AppBaseModel):
    total_tenants: int
    active_tenants: int
    total_users: int
    active_users: int
    total_plans: int

class DashboardDailyStats(AppBaseModel):
    today_appointments: int
    fitted_patients: int
    daily_uploads: int
    pending_ocr: int
    sgk_processed: int

class RecentErrorItem(AppBaseModel):
    id: int
    action: str
    details: Any
    created_at: str
    user_id: Optional[str] = None
    user_name: str
    user_email: Optional[str] = None
    tenant_name: str

class RecentTenantItem(AppBaseModel):
    id: str
    name: str
    status: str
    current_plan: Optional[str] = None
    created_at: str

class AdminDashboardMetrics(AppBaseModel):
    metrics: Dict[str, Any] # Complex nested structure
    recent_tenants: List[RecentTenantItem]

class AdminDashboardStats(AppBaseModel):
    total_tenants: int = Field(..., alias="totalTenants")
    active_tenants: int = Field(..., alias="activeTenants")
    total_users: int = Field(..., alias="totalUsers")
    total_patients: int = Field(..., alias="totalPatients")
    today_appointments: int = Field(..., alias="todayAppointments")
    monthly_revenue: float = Field(..., alias="monthlyRevenue")
