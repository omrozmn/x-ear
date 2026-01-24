# Models Package - All SQLAlchemy models
from .base import db, Base, BaseModel, JSONMixin, gen_sale_id, gen_id, now_utc

# Core models
from .tenant import Tenant
from .user import User, ActivityLog
from .role import Role
from .permission import Permission
from .branch import Branch

# Patient & Medical
from .party import Party
from .party_role import PartyRole
from .hearing_profile import HearingProfile
from .medical import PatientNote, EReceipt
from .appointment import Appointment

# Inventory & Products
from .inventory import InventoryItem
from .device import Device
from .category import Category
from .brand import Brand
from .suppliers import Supplier
from .stock_movement import StockMovement

# Sales & Payments
from .sales import Sale, DeviceAssignment, PaymentPlan, PaymentInstallment
from .invoice import Invoice
from .purchase_invoice import PurchaseInvoice
from .promissory_note import PromissoryNote

# Subscriptions & Plans
from .plan import Plan
from .addon import AddOn
from .subscription import Subscription

# Communication
from .communication import Communication
from .campaign import Campaign, SMSLog
from .notification import Notification
from .notification_template import NotificationTemplate

# SMS Integration
from .sms_integration import SMSProviderConfig, TenantSMSCredit, SMSPackage, SMSHeaderRequest, TargetAudience
from .sms_package import SmsPackage

# Admin
from .admin_user import AdminUser
from .admin_permission import AdminRoleModel, AdminPermissionModel
from .api_key import ApiKey

# Integrations
from .integration_config import IntegrationConfig
from .efatura_outbox import EFaturaOutbox
from .marketplace import MarketplaceIntegration, MarketplaceProduct

# Production & Operations
from .production_order import ProductionOrder
from .scan_queue import ScanQueue
from .ocr_job import OCRJob, OCRJobStatus
from .device_replacement import DeviceReplacement
from .replacement import Replacement

# System
from .system import Settings
from .system_setting import SystemSetting
from .idempotency import IdempotencyKey
from .commission_ledger import CommissionLedger

# Affiliates
from .affiliate_user import AffiliateUser

# Apps
from .app import App
from .user_app_role import UserAppRole

# Enums
from .enums import *

# Email System
from .email import TenantSMTPConfig, SMTPEmailLog, EmailTemplate
from .email_deliverability import EmailBounce, EmailUnsubscribe, DMARCReport, EmailComplaint, DeliverabilityMetrics
