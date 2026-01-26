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
    ('POST', '/auth/send-verification-otp'): None,
    ('POST', '/api/auth/send-verification-otp'): None,
    ('POST', '/auth/verify-otp'): 'public',
    ('POST', '/auth/refresh'): None,  # JWT yeterli
    
    # =========================================================================
    # CONFIG - Genel Konfigürasyon
    # =========================================================================
    ('GET', '/config'): None,  # JWT yeterli
    
    # =========================================================================
    # PATIENTS - Hasta Yönetimi
    # =========================================================================
    ('GET', '/patients'): 'patient:read',
    ('GET', '/patients/<patient_id>'): 'patient:read',
    ('POST', '/patients'): 'patient:write',
    ('PUT', '/patients/<patient_id>'): 'patient:write',
    ('PATCH', '/patients/<patient_id>'): 'patient:write',
    ('DELETE', '/patients/<patient_id>'): 'patient:delete',
    ('GET', '/patients/search'): 'patient:read',
    ('GET', '/patients/export'): 'patient:export',
    ('GET', '/patients/count'): 'patient:read',
    ('POST', '/patients/bulk_upload'): 'patient:write',
    
    # Modern /api/parties routes
    ('GET', '/api/parties'): 'patient:read',
    ('GET', '/api/parties/<party_id>'): 'patient:read',
    ('POST', '/api/parties'): 'patient:write',
    ('PUT', '/api/parties/<party_id>'): 'patient:write',
    ('PATCH', '/api/parties/<party_id>'): 'patient:write',
    ('DELETE', '/api/parties/<party_id>'): 'patient:delete',
    ('GET', '/api/parties/search'): 'patient:read',
    ('GET', '/api/parties/export'): 'patient:export',
    
    # Legacy /api/patients routes
    ('GET', '/api/patients'): 'patient:read',
    ('GET', '/api/patients/<patient_id>'): 'patient:read',
    ('POST', '/api/patients'): 'patient:write',
    ('PUT', '/api/patients/<patient_id>'): 'patient:write',
    ('PATCH', '/api/patients/<patient_id>'): 'patient:write',
    ('DELETE', '/api/patients/<patient_id>'): 'patient:delete',
    ('GET', '/api/patients/search'): 'patient:read',
    ('GET', '/api/patients/export'): 'patient:export',
    ('POST', '/api/patients/import'): 'patient:write',
    
    # Patient Notes
    ('GET', '/patients/<patient_id>/notes'): 'patient:notes',
    ('POST', '/patients/<patient_id>/notes'): 'patient:notes',
    ('PUT', '/patients/<patient_id>/notes/<note_id>'): 'patient:notes',
    ('DELETE', '/patients/<patient_id>/notes/<note_id>'): 'patient:notes',
    ('GET', '/api/patients/<patient_id>/notes'): 'patient:notes',
    ('POST', '/api/patients/<patient_id>/notes'): 'patient:notes',
    ('PUT', '/api/patients/<patient_id>/notes/<note_id>'): 'patient:notes',
    ('DELETE', '/api/patients/<patient_id>/notes/<note_id>'): 'patient:notes',
    
    # Patient History & Timeline
    ('GET', '/patients/<patient_id>/history'): 'patient:history',
    ('GET', '/patients/<patient_id>/timeline'): 'patient:history',
    ('POST', '/patients/<patient_id>/timeline'): 'patient:history',
    ('POST', '/patients/<patient_id>/activities'): 'patient:history',
    ('DELETE', '/patients/<patient_id>/timeline/<event_id>'): 'patient:history',
    ('GET', '/timeline'): 'patient:history',
    ('GET', '/api/patients/<patient_id>/history'): 'patient:history',
    ('GET', '/api/patients/<patient_id>/timeline'): 'patient:history',
    
    # Patient Documents
    ('GET', '/patients/<patient_id>/documents'): 'patient:read',
    ('POST', '/patients/<patient_id>/documents'): 'patient:write',
    ('GET', '/patients/<patient_id>/documents/<document_id>'): 'patient:read',
    ('DELETE', '/patients/<patient_id>/documents/<document_id>'): 'patient:write',
    ('GET', '/api/patients/<patient_id>/documents'): 'patient:read',
    ('POST', '/api/patients/<patient_id>/documents'): 'patient:write',
    ('DELETE', '/api/patients/<patient_id>/documents/<document_id>'): 'patient:write',
    
    # Patient Hearing Tests
    ('GET', '/patients/<patient_id>/hearing-tests'): 'patient:read',
    ('POST', '/patients/<patient_id>/hearing-tests'): 'patient:write',
    ('PUT', '/patients/<patient_id>/hearing-tests/<test_id>'): 'patient:write',
    ('DELETE', '/patients/<patient_id>/hearing-tests/<test_id>'): 'patient:write',
    ('GET', '/api/patients/<patient_id>/hearing-tests'): 'patient:read',
    ('POST', '/api/patients/<patient_id>/hearing-tests'): 'patient:write',
    ('DELETE', '/api/patients/<patient_id>/hearing-tests/<test_id>'): 'patient:write',
    
    # Patient eReceipts
    ('GET', '/patients/<patient_id>/ereceipts'): 'patient:read',
    ('POST', '/patients/<patient_id>/ereceipts'): 'patient:write',
    ('PUT', '/patients/<patient_id>/ereceipts/<ereceipt_id>'): 'patient:write',
    ('DELETE', '/patients/<patient_id>/ereceipts/<ereceipt_id>'): 'patient:write',
    
    # Patient Devices
    ('GET', '/patients/<patient_id>/devices'): 'patient:read',
    ('GET', '/api/patients/<patient_id>/devices'): 'patient:read',
    
    # Patient Appointments
    ('GET', '/patients/<patient_id>/appointments'): 'patient:read',
    
    # Patient Replacements
    ('GET', '/api/patients/<patient_id>/replacements'): 'replacements:view',
    ('POST', '/api/patients/<patient_id>/replacements'): 'replacements:edit',
    
    # =========================================================================
    # SALES - Satış Yönetimi
    # =========================================================================
    ('GET', '/sales'): 'sale:read',
    ('GET', '/sales/<sale_id>'): 'sale:read',
    ('POST', '/sales'): 'sale:write',
    ('PUT', '/sales/<sale_id>'): 'sale:write',
    ('PATCH', '/sales/<sale_id>'): 'sale:write',
    ('DELETE', '/sales/<sale_id>'): 'sale:delete',
    ('POST', '/sales/logs'): 'sale:write',
    ('POST', '/sales/recalc'): 'sale:write',
    
    # Legacy /api/sales routes
    ('GET', '/api/sales'): 'sale:read',
    ('GET', '/api/sales/<sale_id>'): 'sale:read',
    ('POST', '/api/sales'): 'sale:write',
    ('PUT', '/api/sales/<sale_id>'): 'sale:write',
    ('PATCH', '/api/sales/<sale_id>'): 'sale:write',
    ('DELETE', '/api/sales/<sale_id>'): 'sale:delete',
    
    # Patient Sales
    ('GET', '/patients/<patient_id>/sales'): 'patient:read',
    ('POST', '/patients/<patient_id>/sales'): 'sale:write',
    ('POST', '/patients/<patient_id>/product-sales'): 'sale:write',
    ('PATCH', '/patients/<patient_id>/sales/<sale_id>'): 'sale:write',
    ('GET', '/api/patients/<patient_id>/sales'): 'patient:read',
    ('POST', '/api/patients/<patient_id>/sales'): 'sale:write',
    ('POST', '/api/patients/<patient_id>/product-sales'): 'sale:write',
    ('PATCH', '/api/patients/<patient_id>/sales/<sale_id>'): 'sale:write',
    
    # Device Assignments (Satış ilişkili)
    ('POST', '/patients/<patient_id>/assign-devices-extended'): 'sale:write',
    ('PATCH', '/device-assignments/<assignment_id>'): 'sale:write',
    ('POST', '/api/patients/<patient_id>/assign-devices-extended'): 'sale:write',
    ('PATCH', '/api/device-assignments/<assignment_id>'): 'sale:write',
    
    # Payment Plans & Records
    ('GET', '/sales/<sale_id>/payments'): 'sale:read',
    ('POST', '/sales/<sale_id>/payments'): 'sale:write',
    ('GET', '/sales/<sale_id>/payment-plan'): 'sale:read',
    ('POST', '/sales/<sale_id>/payment-plan'): 'sale:write',
    ('POST', '/sales/<sale_id>/installments/<installment_id>/pay'): 'payments:write',
    ('GET', '/api/sales/<sale_id>/payments'): 'finance:read',
    ('POST', '/api/sales/<sale_id>/payments'): 'payments:write',
    ('GET', '/api/sales/<sale_id>/payment-plan'): 'finance:read',
    ('POST', '/api/sales/<sale_id>/payment-plan'): 'sale:write',
    ('POST', '/api/sales/<sale_id>/installments/<installment_id>/pay'): 'payments:write',
    
    # Pricing
    ('POST', '/pricing-preview'): 'sale:read',
    ('POST', '/api/pricing-preview'): 'sale:read',
    
    # =========================================================================
    # FINANCE - Finans Yönetimi
    # =========================================================================
    ('GET', '/api/finance/summary'): 'finance:read',
    ('GET', '/api/finance/cash-register'): 'cash_records:write',
    ('POST', '/api/finance/cash-register'): 'cash_records:write',
    ('GET', '/api/finance/reports'): 'finance:reports',
    ('POST', '/api/finance/refunds'): 'finance:refunds',
    
    # Cash Records
    ('GET', '/cash-records'): 'cash_records:read',
    ('POST', '/cash-records'): 'cash_records:write',
    ('DELETE', '/cash-records/<record_id>'): 'cash_records:delete',
    
    # Unified Cash Records
    ('GET', '/unified-cash-records'): 'finance:read',
    ('GET', '/unified-cash-records/summary'): 'finance:read',
    
    # Payment Records
    ('POST', '/payment-records'): 'payments:write',
    ('GET', '/patients/<patient_id>/payment-records'): 'patient:read',
    ('PATCH', '/payment-records/<record_id>'): 'payments:write',
    
    # POS Integrations
    ('GET', '/api/paytr/config'): 'pos:view',
    ('POST', '/api/payments/pos/paytr/initiate'): 'payments:write',
    ('POST', '/api/payments/pos/paytr/callback'): 'public',
    ('POST', '/api/pos/commission/installment-options'): 'sale:read',
    
    # Promissory Notes
    ('GET', '/patients/<patient_id>/promissory-notes'): 'patient:read',
    ('POST', '/promissory-notes'): 'payments:write',
    ('PATCH', '/promissory-notes/<note_id>'): 'payments:write',
    ('POST', '/promissory-notes/<note_id>/collect'): 'payments:write',
    ('GET', '/sales/<sale_id>/promissory-notes'): 'payments:read',
    
    # =========================================================================
    # INVOICES - Fatura Yönetimi
    # =========================================================================
    ('GET', '/invoices'): 'invoice:read',
    ('POST', '/invoices'): 'invoice:write',
    ('GET', '/invoices/<int:invoice_id>'): 'invoice:read',
    ('DELETE', '/invoices/<int:invoice_id>'): 'invoice:delete',
    ('GET', '/invoices/<int:invoice_id>/pdf'): 'invoice:read',
    ('GET', '/invoices/<int:invoice_id>/xml'): 'invoice:read',
    ('POST', '/invoices/<int:invoice_id>/xml'): 'invoice:write',
    ('POST', '/invoices/<int:invoice_id>/issue'): 'invoice:write',
    ('POST', '/invoices/<int:invoice_id>/send-to-gib'): 'invoice:write',
    ('POST', '/invoices/<int:invoice_id>/update-gib-status'): 'invoice:write',
    ('POST', '/invoices/batch-generate'): 'invoice:write',
    ('GET', '/invoices/templates'): 'invoice:read',
    ('POST', '/invoices/templates'): 'invoice:write',
    ('GET', '/invoices/print-queue'): 'invoice:read',
    ('POST', '/invoices/print-queue'): 'invoice:write',
    ('POST', '/invoices/bulk_upload'): 'invoice:write',
    ('POST', '/invoices/create-dynamic'): 'invoice:write',
    
    # Patient Invoices
    ('GET', '/patients/<patient_id>/invoices'): 'invoice:read',
    
    # Sale Invoices
    ('GET', '/sales/<sale_id>/invoice'): 'invoice:read',
    ('POST', '/sales/<sale_id>/invoice'): 'invoice:write',
    ('OPTIONS', '/sales/<sale_id>/invoice'): 'invoice:write',  # CORS preflight
    ('GET', '/sales/<sale_id>/invoice/pdf'): 'invoice:read',
    
    # Legacy /api/invoices routes
    ('GET', '/api/invoices'): 'invoice:read',
    ('GET', '/api/invoices/<invoice_id>'): 'invoice:read',
    ('POST', '/api/invoices'): 'invoice:write',
    ('POST', '/api/invoices/create'): 'invoice:write',
    ('PUT', '/api/invoices/<invoice_id>'): 'invoice:write',
    ('POST', '/api/invoices/<invoice_id>/send'): 'invoice:write',
    ('POST', '/api/invoices/<invoice_id>/cancel'): 'invoice:delete',
    ('GET', '/api/invoices/<invoice_id>/pdf'): 'invoice:read',
    ('POST', '/api/invoices/<invoice_id>/send-gib'): 'invoice:write',
    ('POST', '/api/invoices/<int:invoice_id>/issue'): 'invoice:write',
    ('POST', '/api/invoices/<int:invoice_id>/copy'): 'invoice:write',
    ('POST', '/api/invoices/<int:invoice_id>/copy-cancel'): 'invoice:delete',
    ('GET', '/api/invoices/<int:invoice_id>/shipping-pdf'): 'invoice:read',
    
    # Invoice Settings & Schema
    ('GET', '/invoice-settings'): 'settings:view',
    ('POST', '/invoice-settings'): 'settings:edit',
    ('GET', '/invoice-schema'): 'invoice:read',
    ('GET', '/api/invoice-settings'): 'settings:view',
    ('PUT', '/api/invoice-settings'): 'settings:edit',
    
    # Proformas
    ('GET', '/proformas'): 'invoice:read',
    ('POST', '/proformas'): 'invoice:write',
    ('GET', '/proformas/<int:proforma_id>'): 'invoice:read',
    ('GET', '/patients/<patient_id>/proformas'): 'invoice:read',
    ('POST', '/proformas/<int:proforma_id>/convert'): 'invoice:write',
    
    # Return Invoices
    ('POST', '/api/return-invoices/<invoice_id>/send-to-gib'): 'replacements:edit',
    
    # Replacements Invoices
    ('GET', '/api/replacements/<replacement_id>'): 'replacements:view',
    ('PATCH', '/api/replacements/<replacement_id>/status'): 'replacements:edit',
    ('POST', '/api/replacements/<replacement_id>/invoice'): 'replacements:edit',
    
    # =========================================================================
    # CASH RECORDS - Kasa Yönetimi
    # =========================================================================
    ('GET', '/api/cash-records'): 'cash_records:read',
    ('POST', '/api/cash-records'): 'cash_records:write',
    ('PUT', '/api/cash-records/<record_id>'): 'cash_records:write',
    ('DELETE', '/api/cash-records/<record_id>'): 'cash_records:delete',
    ('GET', '/api/unified-cash-records'): 'cash_records:read',
    ('GET', '/api/unified-cash-records/summary'): 'cash_records:read',
    
    # =========================================================================
    # DEVICES - Cihaz Yönetimi
    # =========================================================================
    ('GET', '/api/devices'): 'devices:view',
    ('GET', '/api/devices/<device_id>'): 'devices:view',
    ('POST', '/api/devices'): 'devices:create',
    ('PUT', '/api/devices/<device_id>'): 'devices:edit',
    ('PATCH', '/api/devices/<device_id>'): 'devices:edit',
    ('DELETE', '/api/devices/<device_id>'): 'devices:delete',
    ('POST', '/api/devices/<device_id>/stock-update'): 'devices:edit',
    ('POST', '/api/devices/brands'): 'devices:create',
    
    # Device Assignment
    ('POST', '/api/devices/<device_id>/assign'): 'devices:assign',
    ('POST', '/api/devices/<device_id>/unassign'): 'devices:assign',
    
    # Device Types & Brands
    ('GET', '/api/device-types'): 'devices:view',
    ('GET', '/api/device-brands'): 'devices:view',
    ('POST', '/api/device-types'): 'devices:create',
    ('POST', '/api/device-brands'): 'devices:create',
    
    # =========================================================================
    # INVENTORY - Stok Yönetimi
    # =========================================================================
    ('GET', '/api/inventory'): 'inventory:read',
    ('POST', '/api/inventory'): 'inventory:write',
    ('GET', '/api/inventory/<item_id>'): 'inventory:read',
    ('PUT', '/api/inventory/<item_id>'): 'inventory:write',
    ('PATCH', '/api/inventory/<item_id>'): 'inventory:write',
    ('DELETE', '/api/inventory/<item_id>'): 'inventory:write',
    ('POST', '/api/inventory/<item_id>/adjust'): 'inventory:write',
    ('POST', '/api/inventory/<item_id>/activity'): 'inventory:write',
    ('GET', '/api/inventory/<item_id>/activity'): 'inventory:read',
    ('POST', '/api/inventory/<item_id>/serials'): 'inventory:write',
    ('POST', '/api/inventory/<item_id>/assign'): 'inventory:write',
    ('POST', '/api/inventory/bulk_upload'): 'inventory:write',
    ('POST', '/api/inventory/brands'): 'inventory:write',
    ('POST', '/api/inventory/categories'): 'inventory:write',
    ('GET', '/api/inventory/movements'): 'inventory:read',
    
    # Products
    ('GET', '/api/products'): 'inventory:read',
    ('GET', '/api/products/<product_id>'): 'inventory:read',
    ('POST', '/api/products'): 'inventory:write',
    ('PUT', '/api/products/<product_id>'): 'inventory:write',
    ('DELETE', '/api/products/<product_id>'): 'inventory:write',
    ('GET', '/api/products/<product_id>/suppliers'): 'inventory:read',
    ('POST', '/api/products/<product_id>/suppliers'): 'inventory:write',
    
    # =========================================================================
    # SUPPLIERS - Tedarikçi Yönetimi
    # =========================================================================
    ('GET', '/api/suppliers'): 'supplier:read',
    ('GET', '/api/suppliers/search'): 'supplier:read',
    ('GET', '/api/suppliers/<int:supplier_id>'): 'supplier:read',
    ('POST', '/api/suppliers'): 'supplier:write',
    ('PUT', '/api/suppliers/<int:supplier_id>'): 'supplier:write',
    ('DELETE', '/api/suppliers/<int:supplier_id>'): 'supplier:delete',
    ('POST', '/api/suppliers/bulk_upload'): 'inventory:write',
    ('GET', '/api/suppliers/<int:supplier_id>/products'): 'supplier:read',
    ('GET', '/api/suppliers/stats'): 'supplier:read',
    ('GET', '/api/suppliers/<int:supplier_id>/invoices'): 'supplier:read',
    ('GET', '/api/suppliers/suggested'): 'supplier:read',
    ('POST', '/api/suppliers/suggested/<int:suggested_id>/accept'): 'supplier:write',
    ('DELETE', '/api/suppliers/suggested/<int:suggested_id>'): 'supplier:delete',
    ('PUT', '/api/product-suppliers/<int:ps_id>'): 'supplier:write',
    ('DELETE', '/api/product-suppliers/<int:ps_id>'): 'supplier:delete',
    
    # =========================================================================
    # CAMPAIGNS - Kampanya Yönetimi
    # =========================================================================
    ('GET', '/campaigns'): 'campaign:read',
    ('POST', '/campaigns'): 'campaign:write',
    ('POST', '/campaigns/<campaign_id>/send'): 'sms:write',
    ('GET', '/api/campaigns'): 'campaign:read',
    ('GET', '/api/campaigns/<campaign_id>'): 'campaign:read',

    # =========================================================================
    # PURCHASES - Alışlar
    # =========================================================================
    ('GET', '/api/purchases'): 'purchases:view',
    ('POST', '/api/purchases'): 'purchases:create',
    ('GET', '/api/purchases/<purchase_id>'): 'purchases:view',
    ('PUT', '/api/purchases/<purchase_id>'): 'purchases:edit',
    ('DELETE', '/api/purchases/<purchase_id>'): 'purchases:delete',
    ('POST', '/api/campaigns'): 'campaign:write',
    ('PUT', '/api/campaigns/<campaign_id>'): 'campaign:write',
    ('DELETE', '/api/campaigns/<campaign_id>'): 'campaign:delete',
    ('POST', '/api/campaigns/<campaign_id>/send-sms'): 'sms:write',
    ('POST', '/api/sms/send'): 'sms:write',
    
    # =========================================================================
    # SGK - SGK İşlemleri
    # =========================================================================
    ('GET', '/sgk/documents'): 'sgk:view',
    ('POST', '/sgk/documents'): 'sgk:create',
    ('GET', '/sgk/documents/<document_id>'): 'sgk:view',
    ('DELETE', '/sgk/documents/<document_id>'): 'sgk:delete',
    ('POST', '/sgk/upload'): 'sgk:upload',
    ('GET', '/patients/<patient_id>/sgk-documents'): 'sgk:view',
    ('POST', '/sgk/seed-test-patients'): 'sgk:create',
    ('POST', '/sgk/e-receipt/query'): 'sgk:view',
    ('POST', '/sgk/patient-rights/query'): 'sgk:view',
    ('POST', '/sgk/workflow/create'): 'sgk:create',
    ('PUT', '/sgk/workflow/<workflow_id>/update'): 'sgk:edit',
    ('GET', '/sgk/workflow/<workflow_id>'): 'sgk:view',
    ('POST', '/ocr/process'): 'sgk:upload',
    
    # Legacy /api/sgk routes
    ('GET', '/api/sgk/provisions'): 'sgk:view',
    ('GET', '/api/sgk/provisions/<provision_id>'): 'sgk:view',
    ('POST', '/api/sgk/provisions'): 'sgk:create',
    ('PUT', '/api/sgk/provisions/<provision_id>'): 'sgk:create',
    ('POST', '/api/sgk/upload'): 'sgk:upload',
    ('GET', '/api/sgk/applications'): 'sgk:view',
    
    # =========================================================================
    # SETTINGS - Ayarlar
    # =========================================================================
    ('GET', '/api/settings'): 'settings:view',
    ('PUT', '/api/settings'): 'settings:edit',
    ('PATCH', '/api/settings'): 'settings:edit',
    
    # Branches
    ('GET', '/branches'): 'branches:read',  # Herkes branch görebilir
    ('POST', '/branches'): 'branches:write',
    ('PUT', '/branches/<branch_id>'): 'branches:write',
    ('DELETE', '/branches/<branch_id>'): 'branches:delete',
    ('GET', '/api/branches'): 'branches:read',
    ('POST', '/api/branches'): 'branches:write',
    ('PUT', '/api/branches/<branch_id>'): 'branches:write',
    ('DELETE', '/api/branches/<branch_id>'): 'branches:delete',
    
    # Integrations
    ('GET', '/api/integrations'): 'settings:integrations',
    ('POST', '/api/integrations'): 'settings:integrations',
    ('PUT', '/api/integrations/<integration_id>'): 'settings:integrations',
    
    # =========================================================================
    # TEAM - Ekip Yönetimi
    # =========================================================================
    ('GET', '/users'): 'users:read',
    ('POST', '/users'): 'users:write',
    ('GET', '/users/me'): None,  # Herkes kendi bilgilerini görebilir
    ('PUT', '/users/me'): None,  # Herkes kendi bilgilerini düzenleyebilir
    ('POST', '/users/me/password'): None,
    ('PUT', '/users/<user_id>'): 'users:write',
    ('DELETE', '/users/<user_id>'): 'users:delete',
    ('GET', '/api/users/me'): None,  # Herkes kendi bilgilerini görebilir
    ('PUT', '/api/users/me'): None,  # Herkes kendi bilgilerini düzenleyebilir
    ('POST', '/api/users/me/password'): None,  # Herkes kendi şifresini değiştirebilir
    ('GET', '/api/users'): 'users:read',
    ('GET', '/api/users/<user_id>'): 'users:read',
    ('POST', '/api/users'): 'users:write',
    ('PUT', '/api/users/<user_id>'): 'users:write',
    ('PATCH', '/api/users/<user_id>'): 'users:write',
    ('DELETE', '/api/users/<user_id>'): 'users:delete',
    
    # Roles Management
    ('GET', '/roles'): 'role:read',
    ('POST', '/roles'): 'role:write',
    ('PUT', '/roles/<role_id>'): 'role:write',
    ('DELETE', '/roles/<role_id>'): 'role:write',
    ('POST', '/roles/<role_id>/permissions'): 'role:write',
    ('DELETE', '/roles/<role_id>/permissions/<permission_id>'): 'role:write',
    
    # Permissions
    ('GET', '/permissions'): 'role:read',
    ('POST', '/permissions'): 'role:write',
    ('GET', '/permissions/my'): None,  # Herkes kendi izinlerini görebilir
    ('GET', '/permissions/role/<role_name>'): 'role:read',
    ('PUT', '/permissions/role/<role_name>'): 'role:write',
    ('GET', '/api/permissions'): 'role:write',
    ('GET', '/api/permissions/role/<role_name>'): 'role:write',
    ('PUT', '/api/permissions/role/<role_name>'): 'role:write',
    ('GET', '/api/permissions/my'): None,
    
    # Tenant Users
    ('GET', '/tenant/users'): 'users:read',
    ('POST', '/tenant/users'): 'users:write',
    ('PUT', '/tenant/users/<user_id>'): 'users:write',
    ('DELETE', '/tenant/users/<user_id>'): 'users:delete',
    ('GET', '/tenant/company'): 'users:read',
    ('PUT', '/tenant/company'): 'users:write',
    ('POST', '/tenant/company/upload/<asset_type>'): 'users:write',
    ('DELETE', '/tenant/company/upload/<asset_type>'): 'users:delete',
    ('GET', '/tenant/assets/<tenant_id>/<filename>'): 'users:read',
    
    # =========================================================================
    # REPORTS - Raporlar
    # =========================================================================
    ('GET', '/reports/overview'): 'reports:view',
    ('GET', '/reports/patients'): 'reports:view',
    ('GET', '/reports/financial'): 'reports:view',
    ('GET', '/reports/campaigns'): 'reports:view',
    ('GET', '/reports/revenue'): 'reports:view',
    ('GET', '/reports/appointments'): 'reports:view',
    ('GET', '/reports/promissory-notes'): 'reports:view',
    ('GET', '/reports/promissory-notes/by-patient'): 'reports:view',
    ('GET', '/reports/promissory-notes/list'): 'reports:view',
    ('GET', '/reports/remaining-payments'): 'reports:view',
    ('GET', '/reports/cashflow-summary'): 'reports:view',
    ('GET', '/api/reports'): 'reports:view',
    ('GET', '/api/reports/<report_type>'): 'reports:view',
    ('GET', '/api/reports/overview'): 'reports:view',
    ('GET', '/api/reports/patients'): 'reports:view',
    ('GET', '/api/reports/financial'): 'reports:view',
    ('GET', '/api/reports/campaigns'): 'reports:view',
    ('GET', '/api/reports/revenue'): 'reports:view',
    ('GET', '/api/reports/appointments'): 'reports:view',
    ('GET', '/api/reports/sales'): 'reports:view',
    ('POST', '/api/reports/export'): 'reports:export',
    ('GET', '/api/reports/export/<export_id>'): 'reports:export',
    
    # =========================================================================
    # DASHBOARD - Dashboard
    # =========================================================================
    ('GET', '/dashboard'): 'dashboard:read',
    ('GET', '/dashboard/kpis'): 'dashboard:read',
    ('GET', '/api/dashboard/kpis'): 'dashboard:read',
    ('GET', '/dashboard/charts/patient-trends'): 'dashboard:read',
    ('GET', '/dashboard/charts/revenue-trends'): 'dashboard:read',
    ('GET', '/dashboard/recent-activity'): 'dashboard:read',
    ('GET', '/dashboard/charts/patient-distribution'): 'dashboard:read',
    ('GET', '/api/dashboard'): 'dashboard:read',
    ('GET', '/api/dashboard/stats'): 'dashboard:read',
    ('GET', '/api/dashboard/analytics'): 'dashboard:read',
    
    # =========================================================================
    # APPOINTMENTS - Randevular
    # =========================================================================
    ('GET', '/appointments'): 'appointment:read',
    ('POST', '/appointments'): 'appointment:write',
    ('GET', '/appointments/<appointment_id>'): 'appointment:read',
    ('PUT', '/appointments/<appointment_id>'): 'appointment:write',
    ('PATCH', '/appointments/<appointment_id>'): 'appointment:write',
    ('DELETE', '/appointments/<appointment_id>'): 'appointment:delete',
    ('POST', '/appointments/<appointment_id>/reschedule'): 'appointment:write',
    ('POST', '/appointments/<appointment_id>/cancel'): 'appointment:write',
    ('POST', '/appointments/<appointment_id>/complete'): 'appointment:write',
    ('GET', '/appointments/availability'): 'appointment:read',
    ('GET', '/appointments/list'): 'appointment:read',
    ('GET', '/api/appointments'): 'appointment:read',
    ('GET', '/api/appointments/<appointment_id>'): 'appointment:read',
    ('POST', '/api/appointments'): 'appointment:write',
    ('PUT', '/api/appointments/<appointment_id>'): 'appointment:write',
    ('DELETE', '/api/appointments/<appointment_id>'): 'appointment:delete',
    ('GET', '/api/appointments/list'): 'appointment:read',
    
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
    ('GET', '/communications/messages'): 'campaign:read',
    ('POST', '/communications/messages/send-sms'): 'sms:write',
    ('POST', '/communications/messages/send-email'): 'sms:write',
    ('GET', '/communications/templates'): 'campaign:read',
    ('POST', '/communications/templates'): 'campaign:write',
    ('GET', '/communications/templates/<template_id>'): 'campaign:read',
    ('PUT', '/communications/templates/<template_id>'): 'campaign:write',
    ('DELETE', '/communications/templates/<template_id>'): 'campaign:delete',
    ('GET', '/communications/history'): 'campaign:read',
    ('POST', '/communications/history'): 'campaign:write',
    ('GET', '/communications/stats'): 'campaign:read',
    
    # =========================================================================
    # SMS INTEGRATION
    # =========================================================================
    ('GET', '/sms/config'): 'sms:read',
    ('PUT', '/sms/config'): 'sms:write',
    ('GET', '/sms/headers'): 'sms:read',
    ('POST', '/sms/headers'): 'sms:write',
    ('GET', '/sms/packages'): 'settings:integrations',
    ('GET', '/sms/credit'): 'sms:read',
    ('POST', '/sms/documents/upload'): 'sms:write',
    ('GET', '/sms/documents/<document_type>/download'): 'sms:read',
    ('DELETE', '/sms/documents/<document_type>'): 'sms:write',
    ('GET', '/sms/audiences'): 'sms:read',
    ('POST', '/sms/audiences'): 'sms:write',
    ('POST', '/sms/audiences/upload'): 'sms:write',
    
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
    ('POST', '/api/upload/presigned'): 'upload:write',
    ('GET', '/api/upload/files'): 'upload:read',
    ('POST', '/presigned'): 'upload:write',  # JWT yeterli
    ('GET', '/files'): 'upload:read',
    ('DELETE', '/files'): 'upload:delete',
    
    # =========================================================================
    # AUDIT
    # =========================================================================
    ('GET', '/audit'): 'activity_logs:read',
    
    # =========================================================================
    # APPS - Uygulama Yönetimi
    # =========================================================================
    ('GET', '/apps'): 'admin.apps.view',
    ('POST', '/apps'): 'admin.apps.edit',
    ('GET', '/apps/<app_id>'): 'apps:view',
    ('PUT', '/apps/<app_id>'): 'apps:edit',
    ('POST', '/apps/<app_id>/assign'): 'apps:edit',
    ('POST', '/apps/<app_id>/transfer_ownership'): 'apps:edit',
    ('DELETE', '/apps/<app_id>'): 'apps:edit',
    
    # =========================================================================
    # ADDONS
    # =========================================================================
    ('GET', '/addons'): 'settings:view',
    ('POST', '/addons'): 'settings:edit',
    
    # =========================================================================
    # AUTOMATION
    # =========================================================================
    ('GET', '/automation/status'): 'settings:view',
    ('POST', '/automation/sgk/process'): 'sgk:create',
    ('POST', '/automation/backup'): 'admin.system.backup',
    ('GET', '/automation/logs'): 'activity_logs:read',
    
    # =========================================================================
    # CHECKOUT (Ödeme)
    # =========================================================================
    ('POST', '/api/checkout/session'): None,
    ('POST', '/api/checkout/confirm'): None,
    
    # =========================================================================
    # BİRFATURA INTEGRATION
    # =========================================================================
    ('POST', '/api/EFatura/sendDocument'): 'integration.birfatura.edit',
    ('POST', '/api/EFatura/sendBasicInvoice'): 'integration.birfatura.edit',
    ('POST', '/api/OutEBelgeV2/SendDocument'): 'integration.birfatura.edit',
    ('POST', '/api/OutEBelgeV2/SendBasicInvoiceFromModel'): 'integration.birfatura.edit',
    ('POST', '/api/birfatura/sync-invoices'): 'integration.birfatura.sync',
    ('POST', '/api/OutEBelgeV2/ReceiveDocument'): 'invoice:read',
    ('GET', '/api/birfatura/inbox/list'): 'invoice:read',
    ('GET', '/api/birfatura/inbox/file'): 'invoice:read',
    ('POST', '/api/OutEBelgeV2/GetInBoxDocuments'): 'invoice:read',
    ('POST', '/api/OutEBelgeV2/GetInBoxDocumentsWithDetail'): 'invoice:read',
    ('POST', '/api/OutEBelgeV2/PreviewDocumentReturnPDF'): 'invoice:read',
    ('POST', '/api/OutEBelgeV2/DocumentDownloadByUUID'): 'invoice:read',
    
    # =========================================================================
    # OCR
    # =========================================================================
    ('GET', '/health'): 'public',
    ('POST', '/init-db'): 'admin.system.manage',
    ('POST', '/initialize'): 'admin.system.manage',
    ('POST', '/process'): 'sgk:upload',
    ('POST', '/similarity'): 'sgk:view',
    ('POST', '/entities'): 'sgk:view',
    ('POST', '/extract_patient'): 'sgk:view',
    ('POST', '/debug_ner'): 'admin.system.manage',
    ('GET', '/jobs'): 'sgk:view',
    ('POST', '/jobs'): 'sgk:create',
    
    # =========================================================================
    # ADMIN PANEL - Platform Yönetimi (Super Admin Only)
    # =========================================================================
    # Admin Authentication (Public)
    ('POST', '/api/admin/auth/login'): 'public',
    ('POST', '/api/admin/auth/logout'): 'public',
    ('POST', '/api/admin/auth/refresh'): 'public',
    
    # Admin Dashboard
    ('GET', '/api/admin/dashboard/metrics'): 'platform.dashboard.view',
    
    # Admin User Management (Super Admin)
    ('GET', '/api/admin/users'): 'platform.users.read',
    ('POST', '/api/admin/users'): 'platform.users.manage',
    ('GET', '/api/admin/users/all'): 'platform.users.read',
    ('PUT', '/api/admin/users/all/<user_id>'): 'platform.users.manage',
    ('DELETE', '/api/admin/users/<user_id>'): 'users:delete',
    
    # Admin Patients
    ('GET', '/api/admin/patients'): 'platform.patients.read',
    
    # Admin Roles & Permissions
    ('GET', '/api/admin/roles'): 'platform.roles.read',
    ('GET', '/api/admin/roles/<role_id>'): 'platform.roles.read',
    ('POST', '/api/admin/roles'): 'platform.roles.manage',
    ('PUT', '/api/admin/roles/<role_id>'): 'platform.roles.manage',
    ('DELETE', '/api/admin/roles/<role_id>'): 'platform.roles.manage',
    ('GET', '/api/admin/roles/<role_id>/permissions'): 'platform.roles.read',
    ('PUT', '/api/admin/roles/<role_id>/permissions'): 'platform.roles.manage',
    ('GET', '/api/admin/permissions'): 'platform.roles.read',
    ('GET', '/api/admin/admin-users'): 'platform.users.read',
    ('GET', '/api/admin/admin-users/<user_id>'): 'platform.users.read',
    ('PUT', '/api/admin/admin-users/<user_id>/roles'): 'platform.users.manage',
    ('GET', '/api/admin/my-permissions'): None,  # JWT yeterli
    
    # Admin Addons
    ('GET', '/api/admin/addons/<addon_id>'): 'platform.addons.read',
    ('PUT', '/api/admin/addons/<addon_id>'): 'platform.addons.manage',
    ('DELETE', '/api/admin/addons/<addon_id>'): 'platform.addons.manage',
    
    # Admin API Keys
    ('POST', '/api/admin/api-keys/init-db'): 'platform.system.manage',
    ('DELETE', '/api/admin/api-keys/<key_id>'): 'platform.apikeys.manage',
    
    # Admin BirFatura
    ('GET', '/api/admin/birfatura/stats'): 'platform.birfatura.read',
    ('GET', '/api/admin/birfatura/invoices'): 'platform.birfatura.read',
    ('GET', '/api/admin/birfatura/logs'): 'platform.birfatura.read',
    
    # Admin Integrations
    ('POST', '/api/admin/integrations/init-db'): 'platform.system.manage',
    ('GET', '/api/admin/integrations/vatan-sms/config'): 'platform.integrations.read',
    ('PUT', '/api/admin/integrations/vatan-sms/config'): 'platform.integrations.manage',
    ('GET', '/api/admin/integrations/birfatura/config'): 'platform.integrations.read',
    ('PUT', '/api/admin/integrations/birfatura/config'): 'platform.integrations.manage',
    
    # Admin Invoices
    ('GET', '/api/admin/invoices/<id>'): 'platform.invoices.read',
    ('POST', '/api/admin/invoices/<id>/payment'): 'platform.invoices.manage',
    ('GET', '/api/admin/invoices/<id>/pdf'): 'platform.invoices.read',
    
    # Admin Marketplaces
    ('POST', '/api/admin/marketplaces/init-db'): 'platform.system.manage',
    ('GET', '/api/admin/marketplaces/integrations'): 'platform.marketplaces.read',
    ('POST', '/api/admin/marketplaces/integrations'): 'platform.marketplaces.manage',
    ('POST', '/api/admin/marketplaces/integrations/<id>/sync'): 'platform.marketplaces.manage',
    
    # Admin Notifications
    ('POST', '/api/admin/notifications/init-db'): 'platform.system.manage',
    ('POST', '/api/admin/notifications/send'): 'platform.notifications.manage',
    ('GET', '/api/admin/notifications/templates'): 'platform.notifications.read',
    ('POST', '/api/admin/notifications/templates'): 'platform.notifications.manage',
    ('PUT', '/api/admin/notifications/templates/<template_id>'): 'platform.notifications.manage',
    ('DELETE', '/api/admin/notifications/templates/<template_id>'): 'platform.notifications.manage',
    
    # Admin Plans
    ('GET', '/api/admin/plans/<plan_id>'): 'platform.plans.read',
    ('PUT', '/api/admin/plans/<plan_id>'): 'platform.plans.manage',
    ('DELETE', '/api/admin/plans/<plan_id>'): 'platform.plans.manage',
    
    # Admin Production
    ('POST', '/api/admin/production/init-db'): 'platform.system.manage',
    ('GET', '/api/admin/production/orders'): 'platform.production.read',
    ('PUT', '/api/admin/production/orders/<id>/status'): 'platform.production.manage',
    
    # Admin Scan Queue
    ('POST', '/api/admin/scan-queue/init-db'): 'platform.system.manage',
    ('POST', '/api/admin/scan-queue/<id>/retry'): 'platform.scan_queue.manage',
    
    # Admin Settings
    ('POST', '/api/admin/settings/init-db'): 'platform.system.manage',
    ('POST', '/api/admin/settings/cache/clear'): 'platform.settings.manage',
    ('POST', '/api/admin/settings/backup'): 'platform.system.manage',
    
    # Admin SMS
    ('GET', '/admin/sms/packages'): 'admin.sms.view',
    ('POST', '/admin/sms/packages'): 'admin.sms.edit',
    ('PUT', '/admin/sms/packages/<pkg_id>'): 'admin.sms.edit',
    ('GET', '/admin/sms/headers'): 'sms:read',
    ('PUT', '/admin/sms/headers/<header_id>/status'): 'admin.sms.edit',
    
    # Support Tickets (Super Admin)
    ('GET', '/api/admin/tickets'): 'platform.tickets.read',
    ('POST', '/api/admin/tickets'): 'platform.tickets.manage',
    ('PUT', '/api/admin/tickets/<ticket_id>'): 'platform.tickets.manage',
    ('POST', '/api/admin/tickets/<ticket_id>/responses'): 'platform.tickets.manage',
    
    # Activity Logs - Platform Level (Super Admin)
    ('GET', '/api/admin/activity-logs'): 'activity_logs:read',
    ('GET', '/api/admin/activity-logs/filter-options'): 'activity_logs:read',
    ('GET', '/api/admin/activity-logs/stats'): 'activity_logs:read',
    
    # Tenant Management (Super Admin)
    ('GET', '/api/admin/tenants'): 'platform.tenants.read',
    ('POST', '/api/admin/tenants'): 'platform.tenants.manage',
    ('GET', '/api/admin/tenants/<tenant_id>'): 'platform.tenants.read',
    ('PUT', '/api/admin/tenants/<tenant_id>'): 'platform.tenants.manage',
    ('DELETE', '/api/admin/tenants/<tenant_id>'): 'platform.tenants.manage',
    ('POST', '/api/admin/tenants/<tenant_id>/suspend'): 'platform.tenants.manage',
    ('POST', '/api/admin/tenants/<tenant_id>/activate'): 'platform.tenants.manage',
    ('GET', '/api/admin/tenants/<tenant_id>/users'): 'platform.tenants.read',
    ('POST', '/api/admin/tenants/<tenant_id>/subscribe'): 'platform.tenants.manage',
    ('POST', '/api/admin/tenants/<tenant_id>/users'): 'platform.tenants.manage',
    ('PUT', '/api/admin/tenants/<tenant_id>/users/<user_id>'): 'users:write',
    ('POST', '/api/admin/tenants/<tenant_id>/addons'): 'platform.tenants.manage',
    ('PUT', '/api/admin/tenants/<tenant_id>/status'): 'platform.tenants.manage',
    
    # System Settings (Super Admin)
    ('GET', '/api/admin/settings'): 'platform.settings.read',
    ('PUT', '/api/admin/settings'): 'platform.settings.manage',
    
    # System Monitoring (Super Admin)
    ('GET', '/api/admin/system/health'): 'platform.system.read',
    ('GET', '/api/admin/system/metrics'): 'platform.system.read',
    ('GET', '/api/admin/system/logs'): 'platform.system.read',
    
    # =========================================================================
    # CRM ACTIVITY LOGS - Tenant Level (Tenant Admin)
    # =========================================================================
    ('GET', '/activity-logs'): 'activity_logs:read',
    ('GET', '/activity-logs/<log_id>'): 'activity_logs:read',
    ('POST', '/activity-logs'): 'activity_logs:read',
    ('GET', '/activity-logs/filter-options'): 'activity_logs:read',
    ('GET', '/api/activity-logs'): 'activity_logs:read',
    ('GET', '/api/activity-logs/filter-options'): 'activity_logs:read',
    ('GET', '/api/activity-logs/stats'): 'activity_logs:read',
    ('GET', '/api/activity-logs/<log_id>'): 'activity_logs:read',
    ('POST', '/api/activity-logs/export'): 'activity_logs:export',
    
    # Admin Activity Logs (with /admin prefix)
    ('GET', '/admin/activity-logs'): 'activity_logs:read',
    ('GET', '/admin/activity-logs/filter-options'): 'activity_logs:read',
    ('GET', '/admin/activity-logs/stats'): 'activity_logs:read',
    
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
    ('POST', '/api/plans'): 'platform.plans.manage',
    ('GET', '/api/plans/admin'): 'platform.plans.read',
    ('PUT', '/api/plans/<plan_id>'): 'platform.plans.manage',
    ('GET', '/api/plans/admin'): 'platform.plans.read',
    ('PUT', '/api/plans/<plan_id>'): 'platform.plans.manage',
    
    # =========================================================================
    # INVOICE MANAGEMENT - Additional
    # =========================================================================
    ('POST', '/invoices/<int:invoice_id>/send-gib'): 'invoice:write',
    
    # =========================================================================
    # MISSING ENTRIES (Manually Added)
    # =========================================================================
    ('POST', '/api/admin/tickets'): 'admin.tickets.manage',
    ('PUT', '/api/admin/tickets/<id>'): 'admin.tickets.manage',
    ('GET', '/api/admin/tickets'): 'admin.tickets.read',
    ('POST', '/api/admin/tickets/<ticket_id>/responses'): 'admin.tickets.response', 
    ('POST', '/api/admin/debug/switch-role'): 'super_admin',
    ('GET', '/api/admin/debug/available-roles'): 'super_admin',
    ('GET', '/api/admin/debug/page-permissions/<page_key>'): 'super_admin',
    ('GET', '/api/pos/transactions'): 'finance:read', 
    ('GET', '/api/tenant/company/assets/<asset_type>/url'): 'users:read',
    ('GET', '/api/templates'): 'campaign:write', 
    ('POST', '/api/templates'): 'campaign:write',
    ('PUT', '/api/templates/<template_id>'): 'campaign:write',
    ('DELETE', '/api/templates/<template_id>'): 'campaign:write',
    
    # =========================================================================
    # ANALYZER ALIASES (Due to Blueprint Prefixes)
    # =========================================================================
    ('GET', '/categories'): 'inventory:read',
    ('POST', '/categories'): 'inventory:write',
    ('GET', '/brands'): 'inventory:read',
    ('POST', '/brands'): 'inventory:write',
    ('GET', '/units'): 'inventory:read',
    ('GET', '/search'): 'inventory:read',
    ('GET', '/<item_id>/movements'): 'inventory:read',
    ('GET', '/low-stock'): 'inventory:read',
    ('GET', '/<item_id>/activity'): 'inventory:read',
    ('GET', '/paytr/config'): 'pos:view',
    ('PUT', '/paytr/config'): 'pos:edit',
    ('GET', '/vatan-sms/config'): 'settings:integrations',
    ('PUT', '/vatan-sms/config'): 'settings:integrations',
    ('GET', '/birfatura/config'): 'settings:integrations',
    ('PUT', '/birfatura/config'): 'settings:integrations',
    ('POST', '/installment-options'): 'pos:view',
    ('GET', '/transactions'): 'admin.payments.view',
    ('POST', '/send'): 'sms:write', # Assuming /api/sms/send
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
            endpoints.append(f"{method} {path
    # Auto-added missing entries

}")
    return endpoints
