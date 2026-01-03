"""
Tenant Permissions Configuration
--------------------------------
Defines RBAC permissions and role mappings for Tenant users.
This acts as the single source of truth for what tenant users/admins can do.
"""

class TenantPermissions:
    # Generic Read/Write
    READ = "read"
    WRITE = "write"
    DELETE = "delete"

    # Patient Permissions
    PATIENT_READ = "patient:read"
    PATIENT_WRITE = "patient:write"
    PATIENT_DELETE = "patient:delete"
    PATIENT_EXPORT = "patient:export"

    # Inventory Permissions
    INVENTORY_READ = "inventory:read"
    INVENTORY_WRITE = "inventory:write"
    
    # Sales Permissions
    SALE_READ = "sale:read"
    SALE_WRITE = "sale:write"
    
    # Appointment Permissions
    APPOINTMENT_READ = "appointment:read"
    APPOINTMENT_WRITE = "appointment:write"

    # Supplier Permissions (Phase 2)
    SUPPLIER_READ = "supplier:read"
    SUPPLIER_WRITE = "supplier:write"
    SUPPLIER_DELETE = "supplier:delete"

    # Invoice Permissions (Phase 2)
    INVOICE_READ = "invoice:read"
    INVOICE_WRITE = "invoice:write"
    INVOICE_DELETE = "invoice:delete"
    INVOICE_EXPORT = "invoice:export"

    # Tenant Management (Admin only)
    TENANT_MANAGE = "tenant:manage"
    USER_MANAGE = "user:manage"
    
    # Dashboard Permissions
    DASHBOARD_READ = "dashboard:read"
    
    # Branch Permissions
    BRANCHES_READ = "branches:read"
    BRANCHES_WRITE = "branches:write"
    BRANCHES_DELETE = "branches:delete"
    
    # Payment Permissions
    PAYMENTS_READ = "payments:read"
    PAYMENTS_WRITE = "payments:write"
    
    # User Permissions
    USERS_READ = "users:read"
    USERS_WRITE = "users:write"
    USERS_DELETE = "users:delete"
    
    # Cash Records Permissions
    CASH_RECORDS_READ = "cash_records:read"
    CASH_RECORDS_WRITE = "cash_records:write"
    CASH_RECORDS_DELETE = "cash_records:delete"

    # Campaign Permissions
    CAMPAIGN_READ = "campaign:read"
    CAMPAIGN_WRITE = "campaign:write"

    # OCR Permissions
    OCR_READ = "ocr:read"
    OCR_WRITE = "ocr:write"

    # Role Permissions
    ROLE_READ = "role:read"
    ROLE_WRITE = "role:write"

    # Activity Logs
    ACTIVITY_LOGS_READ = "activity_logs:read"


# Full admin permissions set
_FULL_ADMIN_PERMISSIONS = {
    TenantPermissions.PATIENT_READ,
    TenantPermissions.PATIENT_WRITE,
    TenantPermissions.PATIENT_DELETE,
    TenantPermissions.PATIENT_EXPORT,
    TenantPermissions.INVENTORY_READ,
    TenantPermissions.INVENTORY_WRITE,
    TenantPermissions.SALE_READ,
    TenantPermissions.SALE_WRITE,
    TenantPermissions.APPOINTMENT_READ,
    TenantPermissions.APPOINTMENT_WRITE,
    TenantPermissions.SUPPLIER_READ,
    TenantPermissions.SUPPLIER_WRITE,
    TenantPermissions.SUPPLIER_DELETE,
    TenantPermissions.INVOICE_READ,
    TenantPermissions.INVOICE_WRITE,
    TenantPermissions.INVOICE_DELETE,
    TenantPermissions.INVOICE_EXPORT,
    TenantPermissions.TENANT_MANAGE,
    TenantPermissions.USER_MANAGE,
    TenantPermissions.DASHBOARD_READ,
    TenantPermissions.BRANCHES_READ,
    TenantPermissions.BRANCHES_WRITE,
    TenantPermissions.BRANCHES_DELETE,
    TenantPermissions.PAYMENTS_READ,
    TenantPermissions.PAYMENTS_WRITE,
    TenantPermissions.USERS_READ,
    TenantPermissions.USERS_WRITE,
    TenantPermissions.USERS_DELETE,
    TenantPermissions.CASH_RECORDS_READ,
    TenantPermissions.CASH_RECORDS_WRITE,
    TenantPermissions.CASH_RECORDS_DELETE,
    TenantPermissions.CAMPAIGN_READ,
    TenantPermissions.CAMPAIGN_WRITE,
    TenantPermissions.OCR_READ,
    TenantPermissions.OCR_WRITE,
    TenantPermissions.ROLE_READ,
    TenantPermissions.ROLE_WRITE,
    TenantPermissions.ACTIVITY_LOGS_READ,
}

# Role-to-Permission Mapping
# Valid roles: 'admin', 'tenant_admin', 'owner', 'manager', 'user'
TENANT_ROLE_MAP = {
    # Full Tenant Admin Access
    "tenant_admin": _FULL_ADMIN_PERMISSIONS,
    "admin": _FULL_ADMIN_PERMISSIONS,
    "owner": _FULL_ADMIN_PERMISSIONS,
    
    # Manager Access (No user/tenant management, no delete)
    "manager": {
        TenantPermissions.PATIENT_READ,
        TenantPermissions.PATIENT_WRITE,
        TenantPermissions.PATIENT_DELETE,
        TenantPermissions.PATIENT_EXPORT,
        TenantPermissions.INVENTORY_READ,
        TenantPermissions.INVENTORY_WRITE,
        TenantPermissions.SALE_READ,
        TenantPermissions.SALE_WRITE,
        TenantPermissions.APPOINTMENT_READ,
        TenantPermissions.APPOINTMENT_WRITE,
        TenantPermissions.SUPPLIER_READ,
        TenantPermissions.SUPPLIER_WRITE,
        TenantPermissions.INVOICE_READ,
        TenantPermissions.INVOICE_WRITE,
        TenantPermissions.INVOICE_EXPORT,
        TenantPermissions.DASHBOARD_READ,
        TenantPermissions.BRANCHES_READ,
        TenantPermissions.PAYMENTS_READ,
        TenantPermissions.PAYMENTS_WRITE,
        TenantPermissions.CASH_RECORDS_READ,
        TenantPermissions.CASH_RECORDS_WRITE,
        TenantPermissions.CAMPAIGN_READ,
        TenantPermissions.CAMPAIGN_WRITE,
        TenantPermissions.OCR_READ,
        TenantPermissions.OCR_WRITE,
    },

    # Standard User Access (Read-heavy, limited write)
    "user": {
        TenantPermissions.PATIENT_READ,
        TenantPermissions.PATIENT_WRITE,
        TenantPermissions.INVENTORY_READ,
        TenantPermissions.SALE_READ,
        TenantPermissions.SALE_WRITE,
        TenantPermissions.APPOINTMENT_READ,
        TenantPermissions.APPOINTMENT_WRITE,
        TenantPermissions.SUPPLIER_READ,
        TenantPermissions.INVOICE_READ,
        TenantPermissions.DASHBOARD_READ,
        TenantPermissions.BRANCHES_READ,
        TenantPermissions.PAYMENTS_READ,
        TenantPermissions.CASH_RECORDS_READ,
        TenantPermissions.OCR_READ, # Allow users to view OCR jobs? Maybe write too if they scan?
        TenantPermissions.OCR_WRITE,
    }
}

def get_permissions_for_role(role: str) -> set[str]:
    """Resolve permissions for a given tenant role string."""
    role_key = (role or "").lower()
    return TENANT_ROLE_MAP.get(role_key, set())
