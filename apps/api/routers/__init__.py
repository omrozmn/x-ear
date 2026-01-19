"""
FastAPI Routers Package
All migrated routers from Flask blueprints
"""
from . import sms
from . import campaigns
from . import parties
from . import inventory
from . import sales
from . import auth
from . import appointments
from . import dashboard
from . import devices
from . import notifications
from . import branches
from . import reports
from . import roles
from . import payments
from . import users
# from . import tenant_users  # Temporarily disabled due to syntax errors
from . import suppliers
# Admin routers
from . import admin
from . import admin_tenants
from . import admin_dashboard
from . import admin_plans
from . import admin_addons
from . import admin_analytics
# Additional routers
from . import invoices
from . import sgk
# Phase 2 migrated routers
from . import activity_logs
from . import permissions
from . import ocr
from . import upload
from . import documents
from . import party_subresources
from . import cash_records
from . import unified_cash
from . import payment_integrations
# Phase 3 migrated routers
from . import timeline
from . import plans
from . import addons
from . import subscriptions
# Phase 4 migrated routers
from . import admin_settings
from . import admin_roles
from . import config
# Phase 5 migrated routers
from . import registration
from . import sms_packages
# Phase 6 migrated routers - Admin modules
from . import admin_api_keys
from . import admin_appointments
from . import admin_birfatura
from . import admin_campaigns
from . import admin_integrations
from . import admin_inventory
from . import admin_invoices
from . import admin_marketplaces
from . import admin_notifications
from . import admin_parties
from . import admin_payments
from . import admin_production
from . import admin_scan_queue
from . import admin_suppliers
from . import admin_tickets
# Phase 6 migrated routers - Other modules
from . import audit
from . import automation
from . import affiliates
from . import checkout
# from . import replacements  # Temporarily disabled due to router not defined
# from . import birfatura  # Temporarily disabled due to missing schema
from . import apps
from . import pos_commission
# from . import uts  # Temporarily disabled due to router not defined
# Phase 7 migrated routers - Final modules
from . import invoice_management
from . import invoices_actions
from . import communications
from . import sms_integration

__all__ = [
    "sms",
    "campaigns",
    "parties",
    "inventory",
    "sales",
    "auth",
    "appointments",
    "dashboard",
    "devices",
    "notifications",
    "branches",
    "reports",
    "roles",
    "payments",
    "users",
    # "tenant_users",  # Temporarily disabled
    "suppliers",
    # Admin
    "admin",
    "admin_tenants",
    "admin_dashboard",
    "admin_plans",
    "admin_addons",
    "admin_analytics",
    # Additional
    "invoices",
    "sgk",
    # Phase 2
    "activity_logs",
    "permissions",
    "ocr",
    "upload",
    "documents",
    "party_subresources",
    "cash_records",
    "unified_cash",
    "payment_integrations",
    # Phase 3
    "timeline",
    "plans",
    "addons",
    "subscriptions",
    # Phase 4
    "admin_settings",
    "admin_roles",
    "config",
    # Phase 5
    "registration",
    "sms_packages",
    # Phase 6 - Admin modules
    "admin_api_keys",
    "admin_appointments",
    "admin_birfatura",
    "admin_campaigns",
    "admin_integrations",
    "admin_inventory",
    "admin_invoices",
    "admin_marketplaces",
    "admin_notifications",
    "admin_parties",
    "admin_payments",
    "admin_production",
    "admin_scan_queue",
    "admin_suppliers",
    "admin_tickets",
    # Phase 6 - Other modules
    "audit",
    "automation",
    "affiliates",
    "checkout",
    # "replacements",  # Temporarily disabled
    # "birfatura",  # Temporarily disabled
    "apps",
    "pos_commission",
    # "uts",  # Temporarily disabled
    # Phase 7 - Final modules
    "invoice_management",
    "invoices_actions",
    "communications",
    "sms_integration",
]
