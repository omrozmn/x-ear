"""
Merkezi Permission Mapping Konfigürasyonu

Bu dosya tüm endpoint'lerin hangi permission'a ihtiyaç duyduğunu tanımlar.
Format: 'endpoint_pattern': 'required_permission'

Endpoint pattern'ler:
- Tam eşleşme: '/api/patients'
- Parametre ile: '/api/patients/<patient_id>'
- Wildcard: '/api/patients/*'

NOT: Bu mapping'ler middleware tarafından otomatik kontrol edilir.
Decorator kullanmak yerine bu dosyayı güncelleyin.
"""

# =============================================================================
# PERMISSION MAPPING - Her endpoint için gerekli permission
# =============================================================================

# Format: (HTTP_METHOD, endpoint_pattern): required_permission
# None = jwt_required yeterli (auth kontrolü var ama permission yok)
# 'public' = auth gerekmez

ENDPOINT_PERMISSIONS = {
    # =========================================================================
    # PATIENTS - Hasta Yönetimi
    # =========================================================================
    ('GET', '/api/patients'): 'patients.view',
    ('GET', '/api/patients/<patient_id>'): 'patients.view',
    ('POST', '/api/patients'): 'patients.create',
    ('PUT', '/api/patients/<patient_id>'): 'patients.edit',
    ('PATCH', '/api/patients/<patient_id>'): 'patients.edit',
    ('DELETE', '/api/patients/<patient_id>'): 'patients.delete',
    ('GET', '/api/patients/search'): 'patients.view',
    ('GET', '/api/patients/export'): 'patients.view',
    ('POST', '/api/patients/import'): 'patients.create',
    
    # Patient Notes
    ('GET', '/api/patients/<patient_id>/notes'): 'patients.notes',
    ('POST', '/api/patients/<patient_id>/notes'): 'patients.notes',
    ('PUT', '/api/patients/<patient_id>/notes/<note_id>'): 'patients.notes',
    ('DELETE', '/api/patients/<patient_id>/notes/<note_id>'): 'patients.notes',
    
    # Patient History
    ('GET', '/api/patients/<patient_id>/history'): 'patients.history',
    ('GET', '/api/patients/<patient_id>/timeline'): 'patients.history',
    
    # Patient Documents
    ('GET', '/api/patients/<patient_id>/documents'): 'patients.view',
    ('POST', '/api/patients/<patient_id>/documents'): 'patients.edit',
    ('DELETE', '/api/patients/<patient_id>/documents/<document_id>'): 'patients.edit',
    
    # Patient Hearing Tests
    ('GET', '/api/patients/<patient_id>/hearing-tests'): 'patients.view',
    ('POST', '/api/patients/<patient_id>/hearing-tests'): 'patients.edit',
    ('DELETE', '/api/patients/<patient_id>/hearing-tests/<test_id>'): 'patients.edit',
    
    # =========================================================================
    # SALES - Satış Yönetimi
    # =========================================================================
    ('GET', '/api/sales'): 'sales.view',
    ('GET', '/api/sales/<sale_id>'): 'sales.view',
    ('POST', '/api/sales'): 'sales.create',
    ('PUT', '/api/sales/<sale_id>'): 'sales.edit',
    ('PATCH', '/api/sales/<sale_id>'): 'sales.edit',
    ('DELETE', '/api/sales/<sale_id>'): 'sales.delete',
    
    # Patient Sales
    ('GET', '/api/patients/<patient_id>/sales'): 'sales.view',
    ('POST', '/api/patients/<patient_id>/sales'): 'sales.create',
    ('POST', '/api/patients/<patient_id>/product-sales'): 'sales.create',
    ('PATCH', '/api/patients/<patient_id>/sales/<sale_id>'): 'sales.edit',
    
    # Device Assignments (Satış ilişkili)
    ('POST', '/api/patients/<patient_id>/assign-devices-extended'): 'sales.create',
    ('PATCH', '/api/device-assignments/<assignment_id>'): 'sales.edit',
    
    # Payment Plans & Records
    ('GET', '/api/sales/<sale_id>/payments'): 'finance.view',
    ('POST', '/api/sales/<sale_id>/payments'): 'finance.payments',
    ('GET', '/api/sales/<sale_id>/payment-plan'): 'finance.view',
    ('POST', '/api/sales/<sale_id>/payment-plan'): 'finance.payments',
    ('POST', '/api/sales/<sale_id>/installments/<installment_id>/pay'): 'finance.payments',
    
    # Pricing
    ('POST', '/api/pricing-preview'): 'sales.view',
    
    # =========================================================================
    # FINANCE - Finans Yönetimi
    # =========================================================================
    ('GET', '/api/finance/summary'): 'finance.view',
    ('GET', '/api/finance/cash-register'): 'finance.cash_register',
    ('POST', '/api/finance/cash-register'): 'finance.cash_register',
    ('GET', '/api/finance/reports'): 'finance.reports',
    ('POST', '/api/finance/refunds'): 'finance.refunds',
    
    # =========================================================================
    # INVOICES - Fatura Yönetimi
    # =========================================================================
    ('GET', '/api/invoices'): 'invoices.view',
    ('GET', '/api/invoices/<invoice_id>'): 'invoices.view',
    ('POST', '/api/invoices'): 'invoices.create',
    ('POST', '/api/invoices/create'): 'invoices.create',
    ('PUT', '/api/invoices/<invoice_id>'): 'invoices.create',
    ('POST', '/api/invoices/<invoice_id>/send'): 'invoices.send',
    ('POST', '/api/invoices/<invoice_id>/cancel'): 'invoices.cancel',
    ('GET', '/api/invoices/<invoice_id>/pdf'): 'invoices.view',
    ('POST', '/api/invoices/<invoice_id>/send-gib'): 'invoices.send',
    
    # Invoice Settings
    ('GET', '/api/invoice-settings'): 'settings.view',
    ('PUT', '/api/invoice-settings'): 'settings.edit',
    
    # =========================================================================
    # DEVICES - Cihaz Yönetimi
    # =========================================================================
    ('GET', '/api/devices'): 'devices.view',
    ('GET', '/api/devices/<device_id>'): 'devices.view',
    ('POST', '/api/devices'): 'devices.create',
    ('PUT', '/api/devices/<device_id>'): 'devices.edit',
    ('PATCH', '/api/devices/<device_id>'): 'devices.edit',
    ('DELETE', '/api/devices/<device_id>'): 'devices.delete',
    
    # Device Assignment
    ('POST', '/api/devices/<device_id>/assign'): 'devices.assign',
    ('POST', '/api/devices/<device_id>/unassign'): 'devices.assign',
    
    # Device Types & Brands
    ('GET', '/api/device-types'): 'devices.view',
    ('GET', '/api/device-brands'): 'devices.view',
    ('POST', '/api/device-types'): 'devices.create',
    ('POST', '/api/device-brands'): 'devices.create',
    
    # =========================================================================
    # INVENTORY - Stok Yönetimi
    # =========================================================================
    ('GET', '/api/inventory'): 'inventory.view',
    ('GET', '/api/inventory/<item_id>'): 'inventory.view',
    ('POST', '/api/inventory'): 'inventory.manage',
    ('PUT', '/api/inventory/<item_id>'): 'inventory.manage',
    ('DELETE', '/api/inventory/<item_id>'): 'inventory.manage',
    ('POST', '/api/inventory/<item_id>/adjust'): 'inventory.manage',
    ('GET', '/api/inventory/movements'): 'inventory.view',
    
    # Products
    ('GET', '/api/products'): 'inventory.view',
    ('GET', '/api/products/<product_id>'): 'inventory.view',
    ('POST', '/api/products'): 'inventory.manage',
    ('PUT', '/api/products/<product_id>'): 'inventory.manage',
    ('DELETE', '/api/products/<product_id>'): 'inventory.manage',
    
    # =========================================================================
    # CAMPAIGNS - Kampanya Yönetimi
    # =========================================================================
    ('GET', '/api/campaigns'): 'campaigns.view',
    ('GET', '/api/campaigns/<campaign_id>'): 'campaigns.view',
    ('POST', '/api/campaigns'): 'campaigns.create',
    ('PUT', '/api/campaigns/<campaign_id>'): 'campaigns.edit',
    ('DELETE', '/api/campaigns/<campaign_id>'): 'campaigns.delete',
    ('POST', '/api/campaigns/<campaign_id>/send-sms'): 'campaigns.send_sms',
    ('POST', '/api/sms/send'): 'campaigns.send_sms',
    
    # =========================================================================
    # SGK - SGK İşlemleri
    # =========================================================================
    ('GET', '/api/sgk/provisions'): 'sgk.view',
    ('GET', '/api/sgk/provisions/<provision_id>'): 'sgk.view',
    ('POST', '/api/sgk/provisions'): 'sgk.create',
    ('PUT', '/api/sgk/provisions/<provision_id>'): 'sgk.create',
    ('POST', '/api/sgk/upload'): 'sgk.upload',
    ('GET', '/api/sgk/applications'): 'sgk.view',
    
    # =========================================================================
    # SETTINGS - Ayarlar
    # =========================================================================
    ('GET', '/api/settings'): 'settings.view',
    ('PUT', '/api/settings'): 'settings.edit',
    ('PATCH', '/api/settings'): 'settings.edit',
    
    # Branches
    ('GET', '/api/branches'): 'settings.view',  # Herkes branch görebilir
    ('POST', '/api/branches'): 'settings.branches',
    ('PUT', '/api/branches/<branch_id>'): 'settings.branches',
    ('DELETE', '/api/branches/<branch_id>'): 'settings.branches',
    
    # Integrations
    ('GET', '/api/integrations'): 'settings.integrations',
    ('POST', '/api/integrations'): 'settings.integrations',
    ('PUT', '/api/integrations/<integration_id>'): 'settings.integrations',
    
    # =========================================================================
    # TEAM - Ekip Yönetimi
    # =========================================================================
    ('GET', '/api/users'): 'team.view',
    ('GET', '/api/users/<user_id>'): 'team.view',
    ('POST', '/api/users'): 'team.create',
    ('PUT', '/api/users/<user_id>'): 'team.edit',
    ('PATCH', '/api/users/<user_id>'): 'team.edit',
    ('DELETE', '/api/users/<user_id>'): 'team.delete',
    
    # Role Permissions
    ('GET', '/api/permissions'): 'team.permissions',
    ('GET', '/api/permissions/role/<role_name>'): 'team.permissions',
    ('PUT', '/api/permissions/role/<role_name>'): 'team.permissions',
    ('GET', '/api/permissions/my'): None,  # Herkes kendi izinlerini görebilir
    
    # =========================================================================
    # REPORTS - Raporlar
    # =========================================================================
    ('GET', '/api/reports'): 'reports.view',
    ('GET', '/api/reports/<report_type>'): 'reports.view',
    ('GET', '/api/reports/overview'): 'reports.view',
    ('GET', '/api/reports/patients'): 'reports.view',
    ('GET', '/api/reports/financial'): 'reports.view',
    ('GET', '/api/reports/campaigns'): 'reports.view',
    ('GET', '/api/reports/revenue'): 'reports.view',
    ('GET', '/api/reports/appointments'): 'reports.view',
    ('GET', '/api/reports/sales'): 'reports.view',
    ('POST', '/api/reports/export'): 'reports.export',
    ('GET', '/api/reports/export/<export_id>'): 'reports.export',
    
    # =========================================================================
    # DASHBOARD - Dashboard
    # =========================================================================
    ('GET', '/api/dashboard'): 'dashboard.view',
    ('GET', '/api/dashboard/stats'): 'dashboard.view',
    ('GET', '/api/dashboard/analytics'): 'dashboard.analytics',
    
    # =========================================================================
    # APPOINTMENTS - Randevular (patients.view ile ilişkili)
    # =========================================================================
    ('GET', '/api/appointments'): 'patients.view',
    ('GET', '/api/appointments/<appointment_id>'): 'patients.view',
    ('POST', '/api/appointments'): 'patients.edit',
    ('PUT', '/api/appointments/<appointment_id>'): 'patients.edit',
    ('DELETE', '/api/appointments/<appointment_id>'): 'patients.edit',
    ('GET', '/api/appointments/list'): 'patients.view',
    
    # =========================================================================
    # PUBLIC / NO PERMISSION REQUIRED (Sadece JWT)
    # =========================================================================
    ('GET', '/api/health'): 'public',
    ('POST', '/api/auth/login'): 'public',
    ('POST', '/api/auth/logout'): 'public',
    ('POST', '/api/auth/refresh'): 'public',
    ('POST', '/api/auth/forgot-password'): 'public',
    ('POST', '/api/auth/verify-otp'): 'public',
    ('GET', '/api/subscriptions/current'): None,  # JWT yeterli
    
    # Debug endpoints (admin@x-ear.com only - kendi kontrolü var)
    ('GET', '/api/admin/debug/available-roles'): None,
    ('POST', '/api/admin/debug/switch-role'): None,
    ('GET', '/api/admin/debug/page-permissions/<page_key>'): None,
    
    # =========================================================================
    # ADMIN PANEL - Platform Yönetimi (Super Admin Only)
    # =========================================================================
    # Admin Authentication (Public)
    ('POST', '/api/admin/auth/login'): 'public',
    ('POST', '/api/admin/auth/logout'): 'public',
    ('POST', '/api/admin/auth/refresh'): 'public',
    
    # Admin User Management (Super Admin)
    ('GET', '/api/admin/users'): 'admin.users.view',
    ('POST', '/api/admin/users'): 'admin.users.create',
    ('GET', '/api/admin/users/all'): 'admin.users.view',
    ('PUT', '/api/admin/users/all/<user_id>'): 'admin.users.edit',
    ('DELETE', '/api/admin/users/<user_id>'): 'admin.users.delete',
    
    # Support Tickets (Super Admin)
    ('GET', '/api/admin/tickets'): 'admin.tickets.view',
    ('POST', '/api/admin/tickets'): 'admin.tickets.create',
    ('PUT', '/api/admin/tickets/<ticket_id>'): 'admin.tickets.edit',
    ('POST', '/api/admin/tickets/<ticket_id>/responses'): 'admin.tickets.respond',
    
    # Activity Logs - Platform Level (Super Admin)
    ('GET', '/api/admin/activity-logs'): 'admin.activity_logs.view',
    ('GET', '/api/admin/activity-logs/filter-options'): 'admin.activity_logs.view',
    ('GET', '/api/admin/activity-logs/stats'): 'admin.activity_logs.view',
    
    # Tenant Management (Super Admin)
    ('GET', '/api/admin/tenants'): 'admin.tenants.view',
    ('POST', '/api/admin/tenants'): 'admin.tenants.create',
    ('PUT', '/api/admin/tenants/<tenant_id>'): 'admin.tenants.edit',
    ('DELETE', '/api/admin/tenants/<tenant_id>'): 'admin.tenants.delete',
    ('POST', '/api/admin/tenants/<tenant_id>/suspend'): 'admin.tenants.manage',
    ('POST', '/api/admin/tenants/<tenant_id>/activate'): 'admin.tenants.manage',
    
    # System Settings (Super Admin)
    ('GET', '/api/admin/settings'): 'admin.settings.view',
    ('PUT', '/api/admin/settings'): 'admin.settings.edit',
    
    # System Monitoring (Super Admin)
    ('GET', '/api/admin/system/health'): 'admin.system.view',
    ('GET', '/api/admin/system/metrics'): 'admin.system.view',
    ('GET', '/api/admin/system/logs'): 'admin.system.logs',
    
    # =========================================================================
    # CRM ACTIVITY LOGS - Tenant Level (Tenant Admin)
    # =========================================================================
    ('GET', '/api/activity-logs'): 'activity_logs.view',
    ('GET', '/api/activity-logs/filter-options'): 'activity_logs.view',
    ('GET', '/api/activity-logs/stats'): 'activity_logs.view',
    ('GET', '/api/activity-logs/<log_id>'): 'activity_logs.view',
    ('POST', '/api/activity-logs/export'): 'activity_logs.export',
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_permission_for_endpoint(method: str, path: str) -> str | None:
    """
    Verilen HTTP method ve path için gerekli permission'ı döndürür.
    
    Args:
        method: HTTP method (GET, POST, PUT, DELETE, PATCH)
        path: Request path (örn: /api/patients/123)
    
    Returns:
        Permission adı veya None (JWT yeterli) veya 'public' (auth gerekmez)
    """
    # Önce exact match dene
    key = (method.upper(), path)
    if key in ENDPOINT_PERMISSIONS:
        return ENDPOINT_PERMISSIONS[key]
    
    # Parametre içeren pattern'leri dene
    for (m, pattern), permission in ENDPOINT_PERMISSIONS.items():
        if m != method.upper():
            continue
        
        # Pattern matching
        if _match_pattern(pattern, path):
            return permission
    
    # Bulunamadı - varsayılan olarak None (JWT yeterli ama log'la)
    return None


def _match_pattern(pattern: str, path: str) -> bool:
    """
    URL pattern'i path ile eşleştir.
    <param> formatındaki parametreleri destekler.
    """
    pattern_parts = pattern.split('/')
    path_parts = path.split('/')
    
    if len(pattern_parts) != len(path_parts):
        return False
    
    for pp, pathp in zip(pattern_parts, path_parts):
        if pp.startswith('<') and pp.endswith('>'):
            # Parametre - herhangi bir değerle eşleşir
            continue
        if pp != pathp:
            return False
    
    return True


def get_all_permissions() -> set:
    """Tüm benzersiz permission'ları döndürür."""
    perms = set()
    for perm in ENDPOINT_PERMISSIONS.values():
        if perm and perm != 'public':
            perms.add(perm)
    return perms


def get_endpoints_for_permission(permission: str) -> list:
    """Belirli bir permission gerektiren tüm endpoint'leri döndürür."""
    endpoints = []
    for (method, path), perm in ENDPOINT_PERMISSIONS.items():
        if perm == permission:
            endpoints.append(f"{method} {path}")
    return endpoints
