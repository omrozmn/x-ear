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

# Party schemas
from .parties import (
    PartyStatus,
    Gender,
    AddressSchema,
    PartyBase,
    PartyCreate,
    PartyUpdate,
    PartyRead,
    PartySearchFilters,

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
    UserRoleRead,
    UserPermissionRead,
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
    AuthAdminUserRead,
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
    SmsLogStatus,
    SmsLogRead,
)
from .notification_templates import EmailTemplateRead

# SMS schemas
from .sms import *

# Plan schemas
from .plans import (
    PlanBase,
    PlanCreate,
    PlanUpdate,
    DetailedPlanRead,
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
    ActivityLogStats,
    ActivityLog,
)
from .audit import AuditLogRead
from .sms_packages import DetailedSmsPackageRead

# AI Layer schemas
from .ai import (
    # Enums
    AiPhaseEnum,
    RequestStatusEnum,
    ActionStatusEnum,
    RiskLevelEnum,
    IncidentTagEnum,
    UsageTypeEnum,
    AuditEventTypeEnum,
    # Chat
    AiChatRequest,
    AiChatResponse,
    # Request
    AiRequestBase,
    AiRequestRead,
    # Action
    ToolOperation,
    ActionPlan,
    RollbackPlan,
    AiActionCreate,
    AiActionRead,
    AiActionApproveRequest,
    AiActionRejectRequest,
    AiActionExecuteRequest,
    AiActionExecuteResponse,
    # Audit
    AiAuditLogRead,
    AiAuditLogFilters,
    # Usage
    AiUsageRead,
    AiUsageSummary,
    # Status
    AiStatusResponse,
    # Admin
    AiKillSwitchRequest,
    AiKillSwitchResponse,
    AiConfigUpdate,
    # Incident
    AiIncidentTagRequest,
    AiIncidentBundleExport,
    # List responses
    AiRequestListResponse,
    AiActionListResponse,
    AiAuditLogListResponse,
    AiUsageListResponse,
)

# Email Integration schemas
from .email import (
    EmailStatus,
    SmtpConfigBase,
    SmtpConfigCreate,
    SmtpConfigUpdate,
    SmtpConfigResponse,
    SendTestEmailRequest,
    SendTestEmailResponse,
    SendEmailRequest,
    SendEmailResponse,
    EmailLogResponse,
    EmailLogListRequest,
    EmailLogListResponse,
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
    # Party
    "PartyStatus",
    "Gender",
    "AddressSchema",
    "PartyBase",
    "PartyCreate",
    "PartyUpdate",
    "PartyRead",
    "PartySearchFilters",
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
    "Supplier",
    "SupplierInput",
    # Invoice
    "InvoiceStatus",
    "InvoiceType",
    "InvoiceItemBase",
    "InvoiceItemRead",
    "InvoiceBase",
    "InvoiceCreate",
    "InvoiceUpdate",
    "InvoiceRead",
    "Invoice",
    "InvoiceInput",
    # Notification
    "NotificationType",
    "NotificationChannel",
    "NotificationBase",
    "NotificationCreate",
    "NotificationUpdate",
    "NotificationRead",
    "NotificationStats",
    "NotificationSettings",
    "Notification",
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
    "SmsLogStatus",
    "SmsLogRead",
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
    # AI Layer
    "AIPhaseEnum",
    "RequestStatusEnum",
    "ActionStatusEnum",
    "RiskLevelEnum",
    "IncidentTagEnum",
    "UsageTypeEnum",
    "AuditEventTypeEnum",
    "AIChatRequest",
    "AIChatResponse",
    "AIRequestBase",
    "AIRequestRead",
    "ToolOperation",
    "ActionPlan",
    "RollbackPlan",
    "AIActionCreate",
    "AIActionRead",
    "AIActionApproveRequest",
    "AIActionRejectRequest",
    "AIActionExecuteRequest",
    "AIActionExecuteResponse",
    "AIAuditLogRead",
    "AIAuditLogFilters",
    "AIUsageRead",
    "AIUsageSummary",
    "AIStatusResponse",
    "AIKillSwitchRequest",
    "AIKillSwitchResponse",
    "AIConfigUpdate",
    "AIIncidentTagRequest",
    "AIIncidentBundleExport",
    "AIRequestListResponse",
    "AIActionListResponse",
    "AIAuditLogListResponse",
    "AIUsageListResponse",
    # Email Integration
    "EmailStatus",
    "SmtpConfigBase",
    "SmtpConfigCreate",
    "SmtpConfigUpdate",
    "SmtpConfigResponse",
    "SendTestEmailRequest",
    "SendTestEmailResponse",
    "SendEmailRequest",
    "SendEmailResponse",
    "EmailLogResponse",
    "EmailLogListRequest",
    "EmailLogListResponse",
    "AuthAdminUserRead",
    "AuditLogRead",
    "EmailTemplateRead",
    "DetailedPlanRead",
    "DetailedSmsPackageRead",
    "UserRoleRead",
    "UserPermissionRead",
]
