# New Models Directory - Backward Compatible Imports
# This file maintains compatibility with existing imports while enabling modular structure

from .base import db, BaseModel, now_utc, gen_id
from .patient import Patient
from .device import Device
from .appointment import Appointment
from .medical import PatientNote, EReceipt, HearingTest
from .user import User, ActivityLog
from .notification import Notification
from .sales import Sale, PaymentPlan, PaymentInstallment, DeviceAssignment, PaymentRecord
from .promissory_note import PromissoryNote
from .system import Settings
from .campaign import Campaign, SMSLog
from .communication import EmailLog, CommunicationTemplate, CommunicationHistory
from .app import App
from .role import Role, role_permissions
from .permission import Permission
from .user_app_role import UserAppRole

# Import existing models that are already modular
from .inventory import Inventory
from .suppliers import Supplier, ProductSupplier
from .device_replacement import DeviceReplacement, ReturnInvoice
from .invoice import Invoice, Proforma
from .purchase_invoice import PurchaseInvoice, PurchaseInvoiceItem, SuggestedSupplier

from .tenant import Tenant
from .branch import Branch
from .addon import AddOn
from .plan import Plan
from .admin_user import AdminUser
from .category import Category
from .brand import Brand
from .idempotency import IdempotencyKey
from .efatura_outbox import EFaturaOutbox
from .replacement import Replacement
from .subscription import Subscription, PaymentHistory

# Maintain backward compatibility - all existing imports should work
__all__ = [
    'db', 'BaseModel', 'now_utc', 'gen_id',
    'Patient', 'Device', 'Appointment', 
    'PatientNote', 'EReceipt', 'HearingTest',
    'User', 'ActivityLog', 'Notification',
    'Sale', 'PaymentPlan', 'PaymentInstallment', 'DeviceAssignment', 'PaymentRecord',
    'PromissoryNote',
    'Settings', 'Campaign', 'SMSLog',
    'EmailLog', 'CommunicationTemplate', 'CommunicationHistory',
    'Inventory', 'Supplier', 'ProductSupplier',
    'DeviceReplacement', 'ReturnInvoice',
    'Invoice', 'Proforma',
    'PurchaseInvoice', 'PurchaseInvoiceItem', 'SuggestedSupplier',
    'App', 'Role', 'Permission', 'UserAppRole', 'role_permissions',
    'Tenant', 'Branch', 'AddOn', 'Plan', 'AdminUser', 'Category', 'Brand',
    'IdempotencyKey', 'EFaturaOutbox', 'Replacement',
    'Subscription', 'PaymentHistory'
]