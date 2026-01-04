"""
FastAPI Routers Package
All migrated routers from Flask blueprints
"""
from . import sms
from . import campaigns
from . import patients
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
from . import tenant_users
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

__all__ = [
    "sms",
    "campaigns",
    "patients",
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
    "tenant_users",
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
]
