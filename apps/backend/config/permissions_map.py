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

LAST UPDATED: 2025-01-08
TOTAL ENDPOINTS: ~396
COVERAGE TARGET: 100%
"""

# =============================================================================
# PERMISSION MAPPING - Her endpoint için gerekli permission
# =============================================================================

# Format: (HTTP_METHOD, endpoint_pattern): required_permission
# None = jwt_required yeterli (auth kontrolü var ama permission yok)
# 'public' = auth gerekmez

ENDPOINT_PERMISSIONS = {
    # =========================================================================
    # PUBLIC ENDPOINTS - Auth Gerekmez
    # =========================================================================
    ('GET', '/health'): 'public',
    ('GET', '/api/health'): 'public',
    ('GET', '/api/config/turnstile'): 'public',
    ('POST', '/api/register-phone'): 'public',
    ('POST', '/api/verify-registration-otp'): 'public',
    
    # =========================================================================
    # AUTH - Kimlik Doğrulama
    # =========================================================================
    ('POST', '/auth/login'): 'public',
    ('POST', '/auth/forgot-password'): 'public',
    ('POST', '/auth/send-verification-otp'): 'public',
    ('POST', '/auth/verify-otp'): 'public',
    ('POST', '/auth/refresh'): None,  # JWT yeterli
    
    # =========================================================================
    # CONFIG - Genel Konfigürasyon
    # =========================================================================
    ('GET', '/config'): None,  # JWT yeterli
    
    # =========================================================================
    # PATIENTS - Hasta Yönetimi
    # =========================================================================
    ('GET', '/patients'): 'patients.view',
    ('GET', '/patients/<patient_id>'): 'patients.view',
    ('POST', '/patients'): 'patients.create',
    ('PUT', '/patients/<patient_id>'): 'patients.edit',
    ('PATCH', '/patients/<patient_id>'): 'patients.edit',
    ('DELETE', '/patients/<patient_id>'): 'patients.delete',
    ('GET', '/patients/search'): 'patients.view',
    ('GET', '/patients/export'): 'patients.view',
    ('GET', '/patients/count'): 'patients.view',
    ('POST', '/patients/bulk_upload'): 'patients.create',
    
    # Legacy /api/patients routes
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
    ('GET', '/patients/<patient_id>/notes'): 'patients.notes',
    ('POST', '/patients/<patient_id>/notes'): 'patients.notes',
    ('PUT', '/patients/<patient_id>/notes/<note_id>'): 'patients.notes',
    ('DELETE', '/patients/<patient_id>/notes/<note_id>'): 'patients.notes',
    ('GET', '/api/patients/<patient_id>/notes'): 'patients.notes',
    ('POST', '/api/patients/<patient_id>/notes'): 'patients.notes',
    ('PUT', '/api/patients/<patient_id>/notes/<note_id>'): 'patients.notes',
    ('DELETE', '/api/patients/<patient_id>/notes/<note_id>'): 'patients.notes',
    
    # Patient History & Timeline
    ('GET', '/patients/<patient_id>/history'): 'patients.history',
    ('GET', '/patients/<patient_id>/timeline'): 'patients.history',
    ('POST', '/patients/<patient_id>/timeline'): 'patients.history',
    ('POST', '/patients/<patient_id>/activities'): 'patients.history',
    ('DELETE', '/patients/<patient_id>/timeline/<event_id>'): 'patients.history',
    ('GET', '/timeline'): 'patients.history',
    ('GET', '/api/patients/<patient_id>/history'): 'patients.history',
    ('GET', '/api/patients/<patient_id>/timeline'): 'patients.history',
    
    # Patient Documents
    ('GET', '/patients/<patient_id>/documents'): 'patients.view',
    ('POST', '/patients/<patient_id>/documents'): 'patients.edit',
    ('GET', '/patients/<patient_id>/documents/<document_id>'): 'patients.view',
    ('DELETE', '/patients/<patient_id>/documents/<document_id>'): 'patients.edit',
    ('GET', '/api/patients/<patient_id>/documents'): 'patients.view',
    ('POST', '/api/patients/<patient_id>/documents'): 'patients.edit',
    ('DELETE', '/api/patients/<patient_id>/documents/<document_id>'): 'patients.edit',
    
    # Patient Hearing Tests
    ('GET', '/patients/<patient_id>/hearing-tests'): 'patients.view',
    ('POST', '/patients/<patient_id>/hearing-tests'): 'patients.edit',
    ('PUT', '/patients/<patient_id>/hearing-tests/<test_id>'): 'patients.edit',
    ('DELETE', '/patients/<patient_id>/hearing-tests/<test_id>'): 'patients.edit',
    ('GET', '/api/patients/<patient_id>/hearing-tests'): 'patients.view',
    ('POST', '/api/patients/<patient_id>/hearing-tests'): 'patients.edit',
    ('DELETE', '/api/patients/<patient_id>/hearing-tests/<test_id>'): 'patients.edit',
    
    # Patient eReceipts
    ('GET', '/patients/<patient_id>/ereceipts'): 'patients.view',
    ('POST', '/patients/<patient_id>/ereceipts'): 'patients.edit',
    ('PUT', '/patients/<patient_id>/ereceipts/<ereceipt_id>'): 'patients.edit',
    ('DELETE', '/patients/<patient_id>/ereceipts/<ereceipt_id>'): 'patients.edit',
    
    # Patient Devices
    ('GET', '/patients/<patient_id>/devices'): 'patients.view',
    ('GET', '/api/patients/<patient_id>/devices'): 'patients.view',
    
    # Patient Appointments
    ('GET', '/patients/<patient_id>/appointments'): 'patients.view',
    
    # Patient Replacements
    ('GET', '/api/patients/<patient_id>/replacements'): 'patients.view',
    ('POST', '/api/patients/<patient_id>/replacements'): 'patients.edit',
    
    # =========================================================================
    # SALES - Satış Yönetimi
    # =========================================================================
    ('GET', '/sales'): 'sales.view',
    ('GET', '/sales/<sale_id>'): 'sales.view',
    ('POST', '/sales'): 'sales.create',
    ('PUT', '/sales/<sale_id>'): 'sales.edit',
    ('PATCH', '/sales/<sale_id>'): 'sales.edit',
    ('DELETE', '/sales/<sale_id>'): 'sales.delete',
    ('POST', '/sales/logs'): 'sales.create',
    ('POST', '/sales/recalc'): 'sales.edit',
    
    # Legacy /api/sales routes
    ('GET', '/api/sales'): 'sales.view',
    ('GET', '/api/sales/<sale_id>'): 'sales.view',
    ('POST', '/api/sales'): 'sales.create',
    ('PUT', '/api/sales/<sale_id>'): 'sales.edit',
    ('PATCH', '/api/sales/<sale_id>'): 'sales.edit',
    ('DELETE', '/api/sales/<sale_id>'): 'sales.delete',
    
    # Patient Sales
    ('GET', '/patients/<patient_id>/sales'): 'sales.view',
    ('POST', '/patients/<patient_id>/sales'): 'sales.create',
    ('POST', '/patients/<patient_id>/product-sales'): 'sales.create',
    ('PATCH', '/patients/<patient_id>/sales/<sale_id>'): 'sales.edit',
    ('GET', '/api/patients/<patient_id>/sales'): 'sales.view',
    ('POST', '/api/patients/<patient_id>/sales'): 'sales.create',
    ('POST', '/api/patients/<patient_id>/product-sales'): 'sales.create',
    ('PATCH', '/api/patients/<patient_id>/sales/<sale_id>'): 'sales.edit',
    
    # Device Assignments (Satış ilişkili)
    ('POST', '/patients/<patient_id>/assign-devices-extended'): 'sales.create',
    ('PATCH', '/device-assignments/<assignment_id>'): 'sales.edit',
    ('POST', '/api/patients/<patient_id>/assign-devices-extended'): 'sales.create',
    ('PATCH', '/api/device-assignments/<assignment_id>'): 'sales.edit',
    
    # Payment Plans & Records
    ('GET', '/sales/<sale_id>/payments'): 'finance.view',
    ('POST', '/sales/<sale_id>/payments'): 'finance.payments',
    ('GET', '/sales/<sale_id>/payment-plan'): 'finance.view',
    ('POST', '/sales/<sale_id>/payment-plan'): 'finance.payments',
    ('POST', '/sales/<sale_id>/installments/<installment_id>/pay'): 'finance.payments',
    ('GET', '/api/sales/<sale_id>/payments'): 'finance.view',
    ('POST', '/api/sales/<sale_id>/payments'): 'finance.payments',
    ('GET', '/api/sales/<sale_id>/payment-plan'): 'finance.view',
    ('POST', '/api/sales/<sale_id>/payment-plan'): 'finance.payments',
    ('POST', '/api/sales/<sale_id>/installments/<installment_id>/pay'): 'finance.payments',
    
    # Pricing
    ('POST', '/pricing-preview'): 'sales.view',
    ('POST', '/api/pricing-preview'): 'sales.view',
    
    # =========================================================================
    # FINANCE - Finans Yönetimi
    # =========================================================================
    ('GET', '/api/finance/summary'): 'finance.view',
    ('GET', '/api/finance/cash-register'): 'finance.cash_register',
    ('POST', '/api/finance/cash-register'): 'finance.cash_register',
    ('GET', '/api/finance/reports'): 'finance.reports',
    ('POST', '/api/finance/refunds'): 'finance.refunds',
    
    # Cash Records
    ('GET', '/cash-records'): 'finance.cash_register',
    ('POST', '/cash-records'): 'finance.cash_register',
    ('DELETE', '/cash-records/<record_id>'): 'finance.cash_register',
    
    # Unified Cash Records
    ('GET', '/unified-cash-records'): 'finance.view',
    ('GET', '/unified-cash-records/summary'): 'finance.view',
    
    # Payment Records
    ('POST', '/payment-records'): 'finance.payments',
    ('GET', '/patients/<patient_id>/payment-records'): 'finance.view',
    ('PATCH', '/payment-records/<record_id>'): 'finance.payments',
    
    # POS Integrations
    ('POST', '/api/payments/pos/paytr/initiate'): 'finance.payments',
    ('POST', '/api/payments/pos/paytr/callback'): 'public',
    
    # Promissory Notes
    ('GET', '/patients/<patient_id>/promissory-notes'): 'finance.view',
    ('POST', '/promissory-notes'): 'finance.payments',
    ('PATCH', '/promissory-notes/<note_id>'): 'finance.payments',
    ('POST', '/promissory-notes/<note_id>/collect'): 'finance.payments',
    ('GET', '/sales/<sale_id>/promissory-notes'): 'finance.view',
    
    # =========================================================================
    # INVOICES - Fatura Yönetimi
    # =========================================================================
    ('GET', '/invoices'): 'invoices.view',
    ('POST', '/invoices'): 'invoices.create',
    ('GET', '/invoices/<int:invoice_id>'): 'invoices.view',
    ('DELETE', '/invoices/<int:invoice_id>'): 'invoices.delete',
    ('GET', '/invoices/<int:invoice_id>/pdf'): 'invoices.view',
    ('GET', '/invoices/<int:invoice_id>/xml'): 'invoices.view',
    ('POST', '/invoices/<int:invoice_id>/xml'): 'invoices.create',
    ('POST', '/invoices/<int:invoice_id>/issue'): 'invoices.send',
    ('POST', '/invoices/<int:invoice_id>/send-to-gib'): 'invoices.send',
    ('POST', '/invoices/<int:invoice_id>/update-gib-status'): 'invoices.send',
    ('POST', '/invoices/batch-generate'): 'invoices.create',
    ('GET', '/invoices/templates'): 'invoices.view',
    ('POST', '/invoices/templates'): 'invoices.create',
    ('GET', '/invoices/print-queue'): 'invoices.view',
    ('POST', '/invoices/print-queue'): 'invoices.create',
    ('POST', '/invoices/bulk_upload'): 'invoices.create',
    ('POST', '/invoices/create-dynamic'): 'invoices.create',
    
    # Patient Invoices
    ('GET', '/patients/<patient_id>/invoices'): 'invoices.view',
    
    # Sale Invoices
    ('GET', '/sales/<sale_id>/invoice'): 'invoices.view',
    ('POST', '/sales/<sale_id>/invoice'): 'invoices.create',
    ('OPTIONS', '/sales/<sale_id>/invoice'): None,  # CORS preflight
    ('GET', '/sales/<sale_id>/invoice/pdf'): 'invoices.view',
    
    # Legacy /api/invoices routes
    ('GET', '/api/invoices'): 'invoices.view',
    ('GET', '/api/invoices/<invoice_id>'): 'invoices.view',
    ('POST', '/api/invoices'): 'invoices.create',
    ('POST', '/api/invoices/create'): 'invoices.create',
    ('PUT', '/api/invoices/<invoice_id>'): 'invoices.create',
    ('POST', '/api/invoices/<invoice_id>/send'): 'invoices.send',
    ('POST', '/api/invoices/<invoice_id>/cancel'): 'invoices.cancel',
    ('GET', '/api/invoices/<invoice_id>/pdf'): 'invoices.view',
    ('POST', '/api/invoices/<invoice_id>/send-gib'): 'invoices.send',
    ('POST', '/api/invoices/<int:invoice_id>/issue'): 'invoices.send',
    ('POST', '/api/invoices/<int:invoice_id>/copy'): 'invoices.create',
    ('POST', '/api/invoices/<int:invoice_id>/copy-cancel'): 'invoices.cancel',
    ('GET', '/api/invoices/<int:invoice_id>/shipping-pdf'): 'invoices.view',
    
    # Invoice Settings & Schema
    ('GET', '/invoice-settings'): 'settings.view',
    ('POST', '/invoice-settings'): 'settings.edit',
    ('GET', '/invoice-schema'): 'invoices.view',
    ('GET', '/api/invoice-settings'): 'settings.view',
    ('PUT', '/api/invoice-settings'): 'settings.edit',
    
    # Proformas
    ('GET', '/proformas'): 'invoices.view',
    ('POST', '/proformas'): 'invoices.create',
    ('GET', '/proformas/<int:proforma_id>'): 'invoices.view',
    ('GET', '/patients/<patient_id>/proformas'): 'invoices.view',
    ('POST', '/proformas/<int:proforma_id>/convert'): 'invoices.create',
    
    # Return Invoices
    ('POST', '/api/return-invoices/<invoice_id>/send-to-gib'): 'invoices.send',
    
    # Replacements Invoices
    ('GET', '/api/replacements/<replacement_id>'): 'invoices.view',
    ('PATCH', '/api/replacements/<replacement_id>/status'): 'invoices.edit',
    ('POST', '/api/replacements/<replacement_id>/invoice'): 'invoices.create',
    
    # =========================================================================
    # DEVICES - Cihaz Yönetimi
    # =========================================================================
    ('GET', '/api/devices'): 'devices.view',
    ('GET', '/api/devices/<device_id>'): 'devices.view',
    ('POST', '/api/devices'): 'devices.create',
    ('PUT', '/api/devices/<device_id>'): 'devices.edit',
    ('PATCH', '/api/devices/<device_id>'): 'devices.edit',
    ('DELETE', '/api/devices/<device_id>'): 'devices.delete',
    ('POST', '/api/devices/<device_id>/stock-update'): 'devices.edit',
    ('POST', '/api/devices/brands'): 'devices.create',
    
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
    ('POST', '/api/inventory'): 'inventory.manage',
    ('GET', '/api/inventory/<item_id>'): 'inventory.view',
    ('PUT', '/api/inventory/<item_id>'): 'inventory.manage',
    ('PATCH', '/api/inventory/<item_id>'): 'inventory.manage',
    ('DELETE', '/api/inventory/<item_id>'): 'inventory.manage',
    ('POST', '/api/inventory/<item_id>/adjust'): 'inventory.manage',
    ('POST', '/api/inventory/<item_id>/activity'): 'inventory.manage',
    ('GET', '/api/inventory/<item_id>/activity'): 'inventory.view',
    ('POST', '/api/inventory/<item_id>/serials'): 'inventory.manage',
    ('POST', '/api/inventory/<item_id>/assign'): 'inventory.manage',
    ('POST', '/api/inventory/bulk_upload'): 'inventory.manage',
    ('POST', '/api/inventory/brands'): 'inventory.manage',
    ('POST', '/api/inventory/categories'): 'inventory.manage',
    ('GET', '/api/inventory/movements'): 'inventory.view',
    
    # Products
    ('GET', '/api/products'): 'inventory.view',
    ('GET', '/api/products/<product_id>'): 'inventory.view',
    ('POST', '/api/products'): 'inventory.manage',
    ('PUT', '/api/products/<product_id>'): 'inventory.manage',
    ('DELETE', '/api/products/<product_id>'): 'inventory.manage',
    ('GET', '/api/products/<product_id>/suppliers'): 'inventory.view',
    ('POST', '/api/products/<product_id>/suppliers'): 'inventory.manage',
    
    # =========================================================================
    # SUPPLIERS - Tedarikçi Yönetimi
    # =========================================================================
    ('GET', '/api/suppliers'): 'inventory.view',
    ('GET', '/api/suppliers/search'): 'inventory.view',
    ('GET', '/api/suppliers/<int:supplier_id>'): 'inventory.view',
    ('POST', '/api/suppliers'): 'inventory.manage',
    ('PUT', '/api/suppliers/<int:supplier_id>'): 'inventory.manage',
    ('DELETE', '/api/suppliers/<int:supplier_id>'): 'inventory.manage',
    ('POST', '/api/suppliers/bulk_upload'): 'inventory.manage',
    ('GET', '/api/suppliers/<int:supplier_id>/products'): 'inventory.view',
    ('GET', '/api/suppliers/stats'): 'inventory.view',
    ('GET', '/api/suppliers/<int:supplier_id>/invoices'): 'invoices.view',
    ('GET', '/api/suppliers/suggested'): 'inventory.view',
    ('POST', '/api/suppliers/suggested/<int:suggested_id>/accept'): 'inventory.manage',
    ('DELETE', '/api/suppliers/suggested/<int:suggested_id>'): 'inventory.manage',
    ('PUT', '/api/product-suppliers/<int:ps_id>'): 'inventory.manage',
    ('DELETE', '/api/product-suppliers/<int:ps_id>'): 'inventory.manage',
    
    # =========================================================================
    # CAMPAIGNS - Kampanya Yönetimi
    # =========================================================================
    ('GET', '/campaigns'): 'campaigns.view',
    ('POST', '/campaigns'): 'campaigns.create',
    ('POST', '/campaigns/<campaign_id>/send'): 'campaigns.send_sms',
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
    ('GET', '/sgk/documents'): 'sgk.view',
    ('POST', '/sgk/documents'): 'sgk.create',
    ('GET', '/sgk/documents/<document_id>'): 'sgk.view',
    ('DELETE', '/sgk/documents/<document_id>'): 'sgk.delete',
    ('POST', '/sgk/upload'): 'sgk.upload',
    ('GET', '/patients/<patient_id>/sgk-documents'): 'sgk.view',
    ('POST', '/sgk/seed-test-patients'): 'sgk.create',
    ('POST', '/sgk/e-receipt/query'): 'sgk.view',
    ('POST', '/sgk/patient-rights/query'): 'sgk.view',
    ('POST', '/sgk/workflow/create'): 'sgk.create',
    ('PUT', '/sgk/workflow/<workflow_id>/update'): 'sgk.edit',
    ('GET', '/sgk/workflow/<workflow_id>'): 'sgk.view',
    ('POST', '/ocr/process'): 'sgk.upload',
    
    # Legacy /api/sgk routes
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
    ('GET', '/branches'): 'settings.view',  # Herkes branch görebilir
    ('POST', '/branches'): 'settings.branches',
    ('PUT', '/branches/<branch_id>'): 'settings.branches',
    ('DELETE', '/branches/<branch_id>'): 'settings.branches',
    ('GET', '/api/branches'): 'settings.view',
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
    ('GET', '/users'): 'team.view',
    ('POST', '/users'): 'team.create',
    ('GET', '/users/me'): None,  # Herkes kendi bilgilerini görebilir
    ('PUT', '/users/me'): None,  # Herkes kendi bilgilerini düzenleyebilir
    ('POST', '/users/me/password'): None,
    ('PUT', '/users/<user_id>'): 'team.edit',
    ('DELETE', '/users/<user_id>'): 'team.delete',
    ('GET', '/api/users'): 'team.view',
    ('GET', '/api/users/<user_id>'): 'team.view',
    ('POST', '/api/users'): 'team.create',
    ('PUT', '/api/users/<user_id>'): 'team.edit',
    ('PATCH', '/api/users/<user_id>'): 'team.edit',
    ('DELETE', '/api/users/<user_id>'): 'team.delete',
    
    # Roles Management
    ('GET', '/roles'): 'team.view',
    ('POST', '/roles'): 'team.permissions',
    ('PUT', '/roles/<role_id>'): 'team.permissions',
    ('DELETE', '/roles/<role_id>'): 'team.permissions',
    ('POST', '/roles/<role_id>/permissions'): 'team.permissions',
    ('DELETE', '/roles/<role_id>/permissions/<permission_id>'): 'team.permissions',
    
    # Permissions
    ('GET', '/permissions'): 'team.permissions',
    ('POST', '/permissions'): 'team.permissions',
    ('GET', '/permissions/my'): None,  # Herkes kendi izinlerini görebilir
    ('GET', '/permissions/role/<role_name>'): 'team.permissions',
    ('PUT', '/permissions/role/<role_name>'): 'team.permissions',
    ('GET', '/api/permissions'): 'team.permissions',
    ('GET', '/api/permissions/role/<role_name>'): 'team.permissions',
    ('PUT', '/api/permissions/role/<role_name>'): 'team.permissions',
    ('GET', '/api/permissions/my'): None,
    
    # Tenant Users
    ('GET', '/tenant/users'): 'team.view',
    ('POST', '/tenant/users'): 'team.create',
    ('PUT', '/tenant/users/<user_id>'): 'team.edit',
    ('DELETE', '/tenant/users/<user_id>'): 'team.delete',
    ('GET', '/tenant/company'): 'settings.view',
    ('PUT', '/tenant/company'): 'settings.edit',
    ('POST', '/tenant/company/upload/<asset_type>'): 'settings.edit',
    ('DELETE', '/tenant/company/upload/<asset_type>'): 'settings.edit',
    ('GET', '/tenant/assets/<tenant_id>/<filename>'): None,
    
    # =========================================================================
    # REPORTS - Raporlar
    # =========================================================================
    ('GET', '/reports/overview'): 'reports.view',
    ('GET', '/reports/patients'): 'reports.view',
    ('GET', '/reports/financial'): 'reports.view',
    ('GET', '/reports/campaigns'): 'reports.view',
    ('GET', '/reports/revenue'): 'reports.view',
    ('GET', '/reports/appointments'): 'reports.view',
    ('GET', '/reports/promissory-notes'): 'reports.view',
    ('GET', '/reports/promissory-notes/by-patient'): 'reports.view',
    ('GET', '/reports/promissory-notes/list'): 'reports.view',
    ('GET', '/reports/remaining-payments'): 'reports.view',
    ('GET', '/reports/cashflow-summary'): 'reports.view',
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
    ('GET', '/dashboard'): 'dashboard.view',
    ('GET', '/dashboard/kpis'): 'dashboard.view',
    ('GET', '/dashboard/charts/patient-trends'): 'dashboard.view',
    ('GET', '/dashboard/charts/revenue-trends'): 'dashboard.view',
    ('GET', '/dashboard/recent-activity'): 'dashboard.view',
    ('GET', '/dashboard/charts/patient-distribution'): 'dashboard.view',
    ('GET', '/api/dashboard'): 'dashboard.view',
    ('GET', '/api/dashboard/stats'): 'dashboard.view',
    ('GET', '/api/dashboard/analytics'): 'dashboard.analytics',
    
    # =========================================================================
    # APPOINTMENTS - Randevular
    # =========================================================================
    ('GET', '/appointments'): 'appointments.view',
    ('POST', '/appointments'): 'appointments.create',
    ('GET', '/appointments/<appointment_id>'): 'appointments.view',
    ('PUT', '/appointments/<appointment_id>'): 'appointments.edit',
    ('PATCH', '/appointments/<appointment_id>'): 'appointments.edit',
    ('DELETE', '/appointments/<appointment_id>'): 'appointments.delete',
    ('POST', '/appointments/<appointment_id>/reschedule'): 'appointments.edit',
    ('POST', '/appointments/<appointment_id>/cancel'): 'appointments.edit',
    ('POST', '/appointments/<appointment_id>/complete'): 'appointments.edit',
    ('GET', '/appointments/availability'): 'appointments.view',
    ('GET', '/appointments/list'): 'appointments.view',
    ('GET', '/api/appointments'): 'appointments.view',
    ('GET', '/api/appointments/<appointment_id>'): 'appointments.view',
    ('POST', '/api/appointments'): 'appointments.create',
    ('PUT', '/api/appointments/<appointment_id>'): 'appointments.edit',
    ('DELETE', '/api/appointments/<appointment_id>'): 'appointments.delete',
    ('GET', '/api/appointments/list'): 'appointments.view',
    
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
    
    # Subscriptions
    ('POST', '/subscribe'): None,
    ('GET', '/current'): None,
    ('POST', '/register-and-subscribe'): 'public',
    
    # Debug endpoints (admin@x-ear.com only - kendi kontrolü var)
    ('GET', '/api/admin/debug/available-roles'): None,
    ('POST', '/api/admin/debug/switch-role'): None,
    ('GET', '/api/admin/debug/page-permissions/<page_key>'): None,
    
    # =========================================================================
    # COMMUNICATIONS - İletişim
    # =========================================================================
    ('GET', '/communications/messages'): 'campaigns.view',
    ('POST', '/communications/messages/send-sms'): 'campaigns.send_sms',
    ('POST', '/communications/messages/send-email'): 'campaigns.send_sms',
    ('GET', '/communications/templates'): 'campaigns.view',
    ('POST', '/communications/templates'): 'campaigns.create',
    ('GET', '/communications/templates/<template_id>'): 'campaigns.view',
    ('PUT', '/communications/templates/<template_id>'): 'campaigns.edit',
    ('DELETE', '/communications/templates/<template_id>'): 'campaigns.delete',
    ('GET', '/communications/history'): 'campaigns.view',
    ('POST', '/communications/history'): 'campaigns.create',
    ('GET', '/communications/stats'): 'campaigns.view',
    
    # =========================================================================
    # SMS INTEGRATION
    # =========================================================================
    ('GET', '/sms/config'): 'settings.integrations',
    ('PUT', '/sms/config'): 'settings.integrations',
    ('GET', '/sms/headers'): 'settings.integrations',
    ('POST', '/sms/headers'): 'settings.integrations',
    ('GET', '/sms/packages'): 'settings.integrations',
    ('GET', '/sms/credit'): 'settings.integrations',
    ('POST', '/sms/documents/upload'): 'settings.integrations',
    ('GET', '/sms/documents/<document_type>/download'): 'settings.integrations',
    ('DELETE', '/sms/documents/<document_type>'): 'settings.integrations',
    ('GET', '/sms/audiences'): 'campaigns.view',
    ('POST', '/sms/audiences'): 'campaigns.create',
    ('POST', '/sms/audiences/upload'): 'campaigns.create',
    
    # =========================================================================
    # NOTIFICATIONS
    # =========================================================================
    ('POST', '/notifications'): None,
    ('GET', '/notifications'): None,
    ('PUT', '/notifications/<notification_id>/read'): None,
    ('GET', '/notifications/stats'): None,
    ('DELETE', '/notifications/<notification_id>'): None,
    ('GET', '/notifications/settings'): None,
    ('PUT', '/notifications/settings'): None,
    
    # =========================================================================
    # UPLOAD / FILES
    # =========================================================================
    ('POST', '/presigned'): None,  # JWT yeterli
    ('GET', '/files'): None,
    ('DELETE', '/files'): None,
    
    # =========================================================================
    # AUDIT
    # =========================================================================
    ('GET', '/audit'): 'activity_logs.view',
    
    # =========================================================================
    # APPS - Uygulama Yönetimi
    # =========================================================================
    ('GET', '/apps'): 'settings.view',
    ('POST', '/apps'): 'settings.edit',
    ('GET', '/apps/<app_id>'): 'settings.view',
    ('PUT', '/apps/<app_id>'): 'settings.edit',
    ('POST', '/apps/<app_id>/assign'): 'settings.edit',
    ('POST', '/apps/<app_id>/transfer_ownership'): 'settings.edit',
    ('DELETE', '/apps/<app_id>'): 'settings.edit',
    
    # =========================================================================
    # ADDONS
    # =========================================================================
    ('GET', '/addons'): 'settings.view',
    ('POST', '/addons'): 'settings.edit',
    
    # =========================================================================
    # AUTOMATION
    # =========================================================================
    ('GET', '/automation/status'): 'settings.view',
    ('POST', '/automation/sgk/process'): 'sgk.create',
    ('POST', '/automation/backup'): 'admin.system.backup',
    ('GET', '/automation/logs'): 'activity_logs.view',
    
    # =========================================================================
    # CHECKOUT (Ödeme)
    # =========================================================================
    ('POST', '/api/checkout/session'): None,
    ('POST', '/api/checkout/confirm'): None,
    
    # =========================================================================
    # BİRFATURA INTEGRATION
    # =========================================================================
    ('POST', '/api/EFatura/sendDocument'): 'invoices.send',
    ('POST', '/api/EFatura/sendBasicInvoice'): 'invoices.send',
    ('POST', '/api/OutEBelgeV2/SendDocument'): 'invoices.send',
    ('POST', '/api/OutEBelgeV2/SendBasicInvoiceFromModel'): 'invoices.send',
    ('POST', '/api/birfatura/sync-invoices'): 'invoices.view',
    ('POST', '/api/OutEBelgeV2/ReceiveDocument'): 'invoices.view',
    ('GET', '/api/birfatura/inbox/list'): 'invoices.view',
    ('GET', '/api/birfatura/inbox/file'): 'invoices.view',
    ('POST', '/api/OutEBelgeV2/GetInBoxDocuments'): 'invoices.view',
    ('POST', '/api/OutEBelgeV2/GetInBoxDocumentsWithDetail'): 'invoices.view',
    ('POST', '/api/OutEBelgeV2/PreviewDocumentReturnPDF'): 'invoices.view',
    ('POST', '/api/OutEBelgeV2/DocumentDownloadByUUID'): 'invoices.view',
    
    # =========================================================================
    # OCR
    # =========================================================================
    ('GET', '/health'): 'public',
    ('POST', '/init-db'): 'admin.system.manage',
    ('POST', '/initialize'): 'admin.system.manage',
    ('POST', '/process'): 'sgk.upload',
    ('POST', '/similarity'): 'sgk.view',
    ('POST', '/entities'): 'sgk.view',
    ('POST', '/extract_patient'): 'sgk.view',
    ('POST', '/debug_ner'): 'admin.system.manage',
    ('GET', '/jobs'): 'sgk.view',
    ('POST', '/jobs'): 'sgk.create',
    
    # =========================================================================
    # ADMIN PANEL - Platform Yönetimi (Super Admin Only)
    # =========================================================================
    # Admin Authentication (Public)
    ('POST', '/api/admin/auth/login'): 'public',
    ('POST', '/api/admin/auth/logout'): 'public',
    ('POST', '/api/admin/auth/refresh'): 'public',
    
    # Admin Dashboard
    ('GET', '/api/admin/dashboard/metrics'): 'admin.dashboard.view',
    
    # Admin User Management (Super Admin)
    ('GET', '/api/admin/users'): 'admin.users.view',
    ('POST', '/api/admin/users'): 'admin.users.create',
    ('GET', '/api/admin/users/all'): 'admin.users.view',
    ('PUT', '/api/admin/users/all/<user_id>'): 'admin.users.edit',
    ('DELETE', '/api/admin/users/<user_id>'): 'admin.users.delete',
    
    # Admin Patients
    ('GET', '/api/admin/patients'): 'admin.patients.view',
    
    # Admin Roles & Permissions
    ('GET', '/api/admin/roles'): 'admin.roles.view',
    ('GET', '/api/admin/roles/<role_id>'): 'admin.roles.view',
    ('POST', '/api/admin/roles'): 'admin.roles.create',
    ('PUT', '/api/admin/roles/<role_id>'): 'admin.roles.edit',
    ('DELETE', '/api/admin/roles/<role_id>'): 'admin.roles.delete',
    ('GET', '/api/admin/roles/<role_id>/permissions'): 'admin.roles.view',
    ('PUT', '/api/admin/roles/<role_id>/permissions'): 'admin.roles.edit',
    ('GET', '/api/admin/permissions'): 'admin.roles.view',
    ('GET', '/api/admin/admin-users'): 'admin.users.view',
    ('GET', '/api/admin/admin-users/<user_id>'): 'admin.users.view',
    ('PUT', '/api/admin/admin-users/<user_id>/roles'): 'admin.users.edit',
    ('GET', '/api/admin/my-permissions'): None,  # JWT yeterli
    
    # Admin Addons
    ('GET', '/api/admin/addons/<addon_id>'): 'admin.addons.view',
    ('PUT', '/api/admin/addons/<addon_id>'): 'admin.addons.edit',
    ('DELETE', '/api/admin/addons/<addon_id>'): 'admin.addons.delete',
    
    # Admin API Keys
    ('POST', '/api/admin/api-keys/init-db'): 'admin.system.manage',
    ('DELETE', '/api/admin/api-keys/<key_id>'): 'admin.api_keys.delete',
    
    # Admin BirFatura
    ('GET', '/api/admin/birfatura/stats'): 'admin.birfatura.view',
    ('GET', '/api/admin/birfatura/invoices'): 'admin.birfatura.view',
    ('GET', '/api/admin/birfatura/logs'): 'admin.birfatura.view',
    
    # Admin Integrations
    ('POST', '/api/admin/integrations/init-db'): 'admin.system.manage',
    ('GET', '/api/admin/integrations/vatan-sms/config'): 'admin.integrations.view',
    ('PUT', '/api/admin/integrations/vatan-sms/config'): 'admin.integrations.edit',
    ('GET', '/api/admin/integrations/birfatura/config'): 'admin.integrations.view',
    ('PUT', '/api/admin/integrations/birfatura/config'): 'admin.integrations.edit',
    
    # Admin Invoices
    ('GET', '/api/admin/invoices/<id>'): 'admin.invoices.view',
    ('POST', '/api/admin/invoices/<id>/payment'): 'admin.invoices.edit',
    ('GET', '/api/admin/invoices/<id>/pdf'): 'admin.invoices.view',
    
    # Admin Marketplaces
    ('POST', '/api/admin/marketplaces/init-db'): 'admin.system.manage',
    ('GET', '/api/admin/marketplaces/integrations'): 'admin.marketplaces.view',
    ('POST', '/api/admin/marketplaces/integrations'): 'admin.marketplaces.create',
    ('POST', '/api/admin/marketplaces/integrations/<id>/sync'): 'admin.marketplaces.edit',
    
    # Admin Notifications
    ('POST', '/api/admin/notifications/init-db'): 'admin.system.manage',
    ('POST', '/api/admin/notifications/send'): 'admin.notifications.send',
    ('GET', '/api/admin/notifications/templates'): 'admin.notifications.view',
    ('POST', '/api/admin/notifications/templates'): 'admin.notifications.create',
    ('PUT', '/api/admin/notifications/templates/<template_id>'): 'admin.notifications.edit',
    ('DELETE', '/api/admin/notifications/templates/<template_id>'): 'admin.notifications.delete',
    
    # Admin Plans
    ('GET', '/api/admin/plans/<plan_id>'): 'admin.plans.view',
    ('PUT', '/api/admin/plans/<plan_id>'): 'admin.plans.edit',
    ('DELETE', '/api/admin/plans/<plan_id>'): 'admin.plans.delete',
    
    # Admin Production
    ('POST', '/api/admin/production/init-db'): 'admin.system.manage',
    ('GET', '/api/admin/production/orders'): 'admin.production.view',
    ('PUT', '/api/admin/production/orders/<id>/status'): 'admin.production.edit',
    
    # Admin Scan Queue
    ('POST', '/api/admin/scan-queue/init-db'): 'admin.system.manage',
    ('POST', '/api/admin/scan-queue/<id>/retry'): 'admin.scan_queue.edit',
    
    # Admin Settings
    ('POST', '/api/admin/settings/init-db'): 'admin.system.manage',
    ('POST', '/api/admin/settings/cache/clear'): 'admin.settings.edit',
    ('POST', '/api/admin/settings/backup'): 'admin.system.backup',
    
    # Admin SMS
    ('GET', '/admin/sms/packages'): 'admin.sms.view',
    ('POST', '/admin/sms/packages'): 'admin.sms.create',
    ('PUT', '/admin/sms/packages/<pkg_id>'): 'admin.sms.edit',
    ('GET', '/admin/sms/headers'): 'admin.sms.view',
    ('PUT', '/admin/sms/headers/<header_id>/status'): 'admin.sms.edit',
    
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
    ('GET', '/api/admin/tenants/<tenant_id>'): 'admin.tenants.view',
    ('PUT', '/api/admin/tenants/<tenant_id>'): 'admin.tenants.edit',
    ('DELETE', '/api/admin/tenants/<tenant_id>'): 'admin.tenants.delete',
    ('POST', '/api/admin/tenants/<tenant_id>/suspend'): 'admin.tenants.manage',
    ('POST', '/api/admin/tenants/<tenant_id>/activate'): 'admin.tenants.manage',
    ('GET', '/api/admin/tenants/<tenant_id>/users'): 'admin.tenants.view',
    ('POST', '/api/admin/tenants/<tenant_id>/subscribe'): 'admin.tenants.manage',
    ('POST', '/api/admin/tenants/<tenant_id>/users'): 'admin.tenants.edit',
    ('PUT', '/api/admin/tenants/<tenant_id>/users/<user_id>'): 'admin.tenants.edit',
    ('POST', '/api/admin/tenants/<tenant_id>/addons'): 'admin.tenants.edit',
    ('PUT', '/api/admin/tenants/<tenant_id>/status'): 'admin.tenants.manage',
    
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
    ('GET', '/activity-logs'): 'activity_logs.view',
    ('GET', '/activity-logs/<log_id>'): 'activity_logs.view',
    ('POST', '/activity-logs'): 'activity_logs.view',
    ('GET', '/activity-logs/filter-options'): 'activity_logs.view',
    ('GET', '/api/activity-logs'): 'activity_logs.view',
    ('GET', '/api/activity-logs/filter-options'): 'activity_logs.view',
    ('GET', '/api/activity-logs/stats'): 'activity_logs.view',
    ('GET', '/api/activity-logs/<log_id>'): 'activity_logs.view',
    ('POST', '/api/activity-logs/export'): 'activity_logs.export',
    
    # Admin Activity Logs (with /admin prefix)
    ('GET', '/admin/activity-logs'): 'admin.activity_logs.view',
    ('GET', '/admin/activity-logs/filter-options'): 'admin.activity_logs.view',
    ('GET', '/admin/activity-logs/stats'): 'admin.activity_logs.view',
    
    # =========================================================================
    # ADMIN CAMPAIGNS
    # =========================================================================
    ('GET', '/api/admin/campaigns/<int:id>'): 'admin.campaigns.view',
    ('PUT', '/api/admin/campaigns/<int:id>'): 'admin.campaigns.edit',
    ('DELETE', '/api/admin/campaigns/<int:id>'): 'admin.campaigns.delete',
    
    # =========================================================================
    # ADMIN SUPPLIERS
    # =========================================================================
    ('GET', '/api/admin/suppliers/<int:id>'): 'admin.suppliers.view',
    ('PUT', '/api/admin/suppliers/<int:id>'): 'admin.suppliers.edit',
    ('DELETE', '/api/admin/suppliers/<int:id>'): 'admin.suppliers.delete',
    
    # =========================================================================
    # PLANS (Subscription Plans)
    # =========================================================================
    ('GET', '/api/plans'): 'public',  # Public plans listing
    ('POST', '/api/plans'): 'admin.plans.create',
    ('GET', '/api/plans/admin'): 'admin.plans.view',
    ('PUT', '/api/plans/<plan_id>'): 'admin.plans.edit',
    # Without /api prefix (for blueprint resolution)
    ('GET', '/admin'): 'admin.plans.view',
    ('PUT', '/<plan_id>'): 'admin.plans.edit',
    
    # =========================================================================
    # INVOICE MANAGEMENT - Additional
    # =========================================================================
    ('POST', '/invoices/<int:invoice_id>/send-gib'): 'invoices.send',
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


from typing import Optional

def get_permission_for_endpoint(method: str, path: str) -> Optional[str]:
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
