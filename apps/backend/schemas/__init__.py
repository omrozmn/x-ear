"""
Pydantic Schemas Package - All domain models for OpenAPI generation
"""

# Base schemas
from .base import (
    AppBaseModel,
    IDMixin,
    TimestampMixin,
    ResponseMeta,
    ResponseEnvelope,
    ApiError,
    EmptyResponse,
)

# Patient schemas
from .patients import (
    PatientStatus,
    Gender,
    AddressSchema,
    PatientBase,
    PatientCreate,
    PatientUpdate,
    PatientRead,
    PatientSearchFilters,
)

# Inventory schemas
from .inventory import (
    InventoryItemBase,
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryItemRead,
    InventoryStats,
    StockMovementRead,
)

# Sales schemas
from .sales import (
    PaymentRecordBase,
    PaymentRecordRead,
    PaymentRecordCreate,
    PaymentInstallmentRead,
    PaymentPlanBase,
    PaymentPlanRead,
    PaymentPlanCreate,
    InstallmentPayment,
    DeviceAssignmentBase,
    DeviceAssignmentRead,
    DeviceAssignmentUpdate,
    SaleBase,
    SaleRead,
    SaleCreate,
    SaleUpdate,
)

# Device schemas
from .devices import (
    DeviceBase,
    DeviceCreate,
    DeviceUpdate,
    DeviceRead,
)

# User schemas
from .users import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserRead,
    UserProfile,
    RoleBase,
    RoleRead,
    PermissionRead,
)

# Branch schemas
from .branches import (
    BranchBase,
    BranchCreate,
    BranchUpdate,
    BranchRead,
)

# Supplier schemas
from .suppliers import (
    SupplierBase,
    SupplierCreate,
    SupplierUpdate,
    SupplierRead,
    Supplier,
    SupplierInput,
)

# Invoice schemas
from .invoices import (
    InvoiceStatus,
    InvoiceType,
    InvoiceItemBase,
    InvoiceItemRead,
    InvoiceBase,
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceRead,
    Invoice,
    InvoiceInput,
)

# Notification schemas
from .notifications import (
    NotificationType,
    NotificationChannel,
    NotificationBase,
    NotificationCreate,
    NotificationUpdate,
    NotificationRead,
    NotificationStats,
    NotificationSettings,
    Notification,
)

# Tenant schemas
from .tenants import (
    TenantStatus,
    TenantBase,
    TenantCreate,
    TenantUpdate,
    TenantRead,
    TenantStats,
)

# Auth schemas
from .auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenResponse,
    PasswordChangeRequest,
    OTPVerifyRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)

# Appointment schemas
from .appointments import *

# Campaign schemas
from .campaigns import (
    CampaignType,
    CampaignStatus,
    TargetSegment,
    CampaignBase,
    CampaignCreate,
    CampaignUpdate,
    CampaignRead,
    CampaignSendRequest,
    Campaign,
    CampaignInput,
    SMSLogStatus,
    SMSLogRead,
)

# SMS schemas
from .sms import *

# Plan schemas
from .plans import (
    PlanBase,
    PlanCreate,
    PlanUpdate,
    PlanRead,
    Plan,
    PlanInput,
)

# Addon schemas
from .addons import *

# Affiliate schemas
from .affiliates import *

# Role schemas
from .roles import (
    RoleBase,
    RoleCreate,
    RoleUpdate,
    RoleRead,
    PermissionBase,
    PermissionRead,
    Role,
    Permission,
)

# Activity Log schemas
from .activity_logs import (
    ActivityLogBase,
    ActivityLogCreate,
    ActivityLogRead,
    ActivityLogStats,
    ActivityLog,
)

__all__ = [
    # Base
    "AppBaseModel",
    "IDMixin",
    "TimestampMixin",
    "ResponseMeta",
    "ResponseEnvelope",
    "ApiError",
    "EmptyResponse",
    # Patient
    "PatientStatus",
    "Gender",
    "AddressSchema",
    "PatientBase",
    "PatientCreate",
    "PatientUpdate",
    "PatientRead",
    "PatientSearchFilters",
    # Inventory
    "InventoryItemBase",
    "InventoryItemCreate",
    "InventoryItemUpdate",
    "InventoryItemRead",
    "InventoryStats",
    "StockMovementRead",
    # Sales
    "PaymentRecordBase",
    "PaymentRecordRead",
    "PaymentRecordCreate",
    "PaymentInstallmentRead",
    "PaymentPlanBase",
    "PaymentPlanRead",
    "PaymentPlanCreate",
    "InstallmentPayment",
    "DeviceAssignmentBase",
    "DeviceAssignmentRead",
    "DeviceAssignmentUpdate",
    "SaleBase",
    "SaleRead",
    "SaleCreate",
    "SaleUpdate",
    # Device
    "DeviceBase",
    "DeviceCreate",
    "DeviceUpdate",
    "DeviceRead",
    # User
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserRead",
    "UserProfile",
    "RoleBase",
    "RoleRead",
    "PermissionRead",
    # Branch
    "BranchBase",
    "BranchCreate",
    "BranchUpdate",
    "BranchRead",
    # Supplier
    "SupplierBase",
    "SupplierCreate",
    "SupplierUpdate",
    "SupplierRead",
    # Invoice
    "InvoiceStatus",
    "InvoiceType",
    "InvoiceItemBase",
    "InvoiceItemRead",
    "InvoiceBase",
    "InvoiceCreate",
    "InvoiceUpdate",
    "InvoiceRead",
    # Notification
    "NotificationType",
    "NotificationChannel",
    "NotificationBase",
    "NotificationCreate",
    "NotificationUpdate",
    "NotificationRead",
    # Tenant
    "TenantStatus",
    "TenantBase",
    "TenantCreate",
    "TenantUpdate",
    "TenantRead",
    "TenantStats",
    # Auth
    "LoginRequest",
    "TokenResponse",
    "RefreshTokenResponse",
    "PasswordChangeRequest",
    "OTPVerifyRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    # Campaign
    "CampaignType",
    "CampaignStatus",
    "TargetSegment",
    "CampaignBase",
    "CampaignCreate",
    "CampaignUpdate",
    "CampaignRead",
    "CampaignSendRequest",
    "Campaign",
    "CampaignInput",
    "SMSLogStatus",
    "SMSLogRead",
    # Plan
    "PlanBase",
    "PlanCreate",
    "PlanUpdate",
    "PlanRead",
    "Plan",
    "PlanInput",
    # Role
    "RoleCreate",
    "RoleUpdate",
    "Role",
    "Permission",
    # Activity Log
    "ActivityLogBase",
    "ActivityLogCreate",
    "ActivityLogRead",
    "ActivityLogStats",
    "ActivityLog",
]
