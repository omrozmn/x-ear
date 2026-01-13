# API Contract Analysis Report
Generated: 2026-01-03T23:44:12.421938Z

## Summary
- Total Endpoints: 392
- Analyzed: 392
- Critical Issues: 0 🔴
- Silent Bugs: 0 🔵
- Warnings: 192 🟠
- Info: 8 🟡

## Risk Distribution
```
🔴 CRITICAL ( 0) ░░░░░░░░░░░░░░░░░░░░
🔵 SILENT   ( 0) ░░░░░░░░░░░░░░░░░░░░
🟠 WARNING  (192) ███████████████████░
🟡 INFO     ( 8) ░░░░░░░░░░░░░░░░░░░░
```

## Info (8)

### 🟡 GET /api/inventory - Unused Pagination Metadata
**Location:** `x-ear/apps/web/src/pages/inventory/components/SupplierAutocomplete.tsx:91`
**Confidence:** MEDIUM

**Problem:** Backend provides pagination metadata but frontend doesn't use it

**Backend Response:**
```
Type: { data: [], meta: { total, page, ... } }
Nullable: False
```

**Recommendation:** Consider using pagination for better UX

**Confidence Reason:** Response has pagination but no access detected

---

### 🟡 GET /api/inventory - Unused Pagination Metadata
**Location:** `x-ear/apps/web/src/components/inventory/InventoryList.tsx:95`
**Confidence:** MEDIUM

**Problem:** Backend provides pagination metadata but frontend doesn't use it

**Backend Response:**
```
Type: { data: [], meta: { total, page, ... } }
Nullable: False
```

**Recommendation:** Consider using pagination for better UX

**Confidence Reason:** Response has pagination but no access detected

---

### 🟡 GET /api/inventory/categories - Unused Pagination Metadata
**Location:** `x-ear/apps/web/src/pages/inventory/components/CategoryAutocomplete.tsx:83`
**Confidence:** MEDIUM

**Problem:** Backend provides pagination metadata but frontend doesn't use it

**Backend Response:**
```
Type: { data: [], meta: { total, page, ... } }
Nullable: False
```

**Recommendation:** Consider using pagination for better UX

**Confidence Reason:** Response has pagination but no access detected

---

### 🟡 GET /api/patients - Unused Pagination Metadata
**Location:** `x-ear/apps/web/src/pages/campaigns/Campaigns.tsx:127`
**Confidence:** MEDIUM

**Problem:** Backend provides pagination metadata but frontend doesn't use it

**Backend Response:**
```
Type: { data: [], meta: { total, page, ... } }
Nullable: False
```

**Frontend Usage:**
```typescript
Access: data.length, data.balance
Guards: None
Normalization: None
```

**Recommendation:** Consider using pagination for better UX

**Confidence Reason:** Response has pagination but no access detected

---

### 🟡 GET /api/patients - Unused Pagination Metadata
**Location:** `x-ear/apps/web/src/pages/campaigns/BulkSmsTab.tsx:172`
**Confidence:** MEDIUM

**Problem:** Backend provides pagination metadata but frontend doesn't use it

**Backend Response:**
```
Type: { data: [], meta: { total, page, ... } }
Nullable: False
```

**Frontend Usage:**
```typescript
Access: data.length
Guards: None
Normalization: None
```

**Recommendation:** Consider using pagination for better UX

**Confidence Reason:** Response has pagination but no access detected

---

### 🟡 GET /api/suppliers - Unused Pagination Metadata
**Location:** `x-ear/apps/web/src/pages/inventory/components/SupplierAutocomplete.tsx:82`
**Confidence:** MEDIUM

**Problem:** Backend provides pagination metadata but frontend doesn't use it

**Backend Response:**
```
Type: { data: [], meta: { total, page, ... } }
Nullable: False
```

**Recommendation:** Consider using pagination for better UX

**Confidence Reason:** Response has pagination but no access detected

---

### 🟡 GET /api/reports/pos-movements - Unused Pagination Metadata
**Location:** `x-ear/apps/web/src/pages/DesktopReportsPage.tsx:520`
**Confidence:** MEDIUM

**Problem:** Backend provides pagination metadata but frontend doesn't use it

**Backend Response:**
```
Type: { data: [], meta: { total, page, ... } }
Nullable: False
```

**Recommendation:** Consider using pagination for better UX

**Confidence Reason:** Response has pagination but no access detected

---

### 🟡 GET /api/reports/pos-movements - Unused Pagination Metadata
**Location:** `x-ear/apps/web/src/pages/DesktopReportsPage.tsx:516`
**Confidence:** MEDIUM

**Problem:** Backend provides pagination metadata but frontend doesn't use it

**Backend Response:**
```
Type: { data: [], meta: { total, page, ... } }
Nullable: False
```

**Recommendation:** Consider using pagination for better UX

**Confidence Reason:** Response has pagination but no access detected

---

## Unused Endpoints (Not Called by Frontend)
- /api/ocr/initialize
- /api/tenant/users/{user_id}
- /api/sales/recalc
- /api/admin/tickets
- /api/sgk/workflow/create
- /api/invoices/efatura/submit
- /api/admin/roles/{role_id}/permissions
- /api/admin/auth/login
- /api/sgk/e-receipt/query
- /api/tenant/users
- /api/auth/lookup-phone
- /api/cash-records
- /api/health
- /api/sgk/patient-rights/query
- /api/patients/{patient_id}/devices
- /api/admin/addons
- /api/appointments
- /api/sales/{sale_id}/installments/{installment_id}/pay
- /api/sgk/documents/{document_id}
- /api/sms/documents/{documentType}
- /api/automation/logs
- /api/admin/scan-queue/{id}/retry
- /api/patients/{patient_id}/invoices
- /api/suppliers/stats
- /api/suppliers/suggested/{suggested_id}/accept
- /api/devices/{device_id}/stock-update
- /api/EFatura/Cancel/{invoice_id}
- /api/pos/commission/rates/tenant/{tenant_id}
- /api/devices/categories
- /init-db
- /api/permissions/my
- /api/users/me/password
- /api/admin/users/all/{user_id}
- /api/admin/tenants/{tenant_id}/status
- /api/roles/{role_id}/permissions/{permission_id}
- /api/admin/integrations/vatan-sms/config
- /api/admin/invoices
- /api/notifications
- /api/addons
- /api/suppliers/search
- /api/sms/documents/upload
- /api/templates
- /api/sgk/workflow/{workflow_id}
- /api/ocr/process
- /api/sgk/workflows/{workflow_id}/status
- /api/inventory/search
- /api/sgk/documents
- /api/admin/plans
- /api/admin/tickets/{ticket_id}/responses
- /api/admin/admin-users/{user_id}/roles
- /api/admin/debug/available-roles
- /api/inventory/stats
- /api/admin/admin-users/{user_id}
- /api/auth/forgot-password
- /api/pos/commission/calculate
- /api/admin/activity-logs/filter-options
- /api/patients/search
- /api/admin/suppliers/{id}
- /api/payments/pos/transactions
- /api/sms/monitoring
- /api/admin/marketplaces/integrations
- /api/suppliers/{supplier_id}/products
- /api/invoices/{invoice_id}/pdf
- /api/admin/plans/{plan_id}
- /api/plans
- /api/unified-cash-records
- /api/communications/messages/send-sms
- /api/admin/settings/backup
- /api/plans/admin
- /api/sgk/seed-test-patients
- /api/patients/{patient_id}/proformas
- /api/ocr/similarity
- /api/config/turnstile
- /api/invoices/{invoice_id}/shipping-pdf
- /api/admin/production/orders
- /api/appointments/{appointment_id}/reschedule
- /api/communications/templates/{template_id}
- /api/admin/campaigns/{id}
- /api/appointments/{appointment_id}
- /api/patients/{patient_id}/ereceipts/{ereceipt_id}
- /api/payments/pos/paytr/callback
- /api/admin/api-keys/{key_id}
- /api/admin/birfatura/logs
- /api/sales/{sale_id}/invoice
- /api/campaigns
- /metrics
- /api/auth/refresh
- /api/appointments/list
- /api/reports/financial
- /api/inventory/{item_id}
- /similarity
- /api/admin/invoices/{id}/pdf
- /api/patients/{patient_id}/sales
- /api/reports/appointments
- /api/replacements/{replacement_id}/status
- /api/admin/tenants/{tenant_id}/addons
- /api/patients/{patient_id}/replacements
- /api/dashboard/charts/revenue-trends
- /api/proformas
- /api/admin/dashboard/metrics
- /api/admin/integrations/init-db
- /api/sales/{sale_id}/promissory-notes
- /api/patients/{patient_id}/activities
- /api/pos/transactions
- /api/ocr/debug_ner
- /api/subscriptions/current
- /api/admin/scan-queue/init-db
- /api/notifications/{notification_id}/read
- /api/admin/production/init-db
- /api/admin/notifications/send
- /api/sgk/workflow/{workflow_id}/update
- /api/payments/pos/paytr/initiate
- /api/suppliers/{supplier_id}
- /api/inventory/{item_id}/movements
- /api/invoices/print-queue
- /api/ocr/extract_patient
- /api/EFatura/Retry/{invoice_id}
- /api/invoices/templates
- /api/dashboard/charts/patient-distribution
- /api/invoices/{invoice_id}/copy-cancel
- /api/unified-cash-records/summary
- /api/patients/{patient_id}/sales/{sale_id}
- /api/checkout/session
- /api/ocr/jobs
- /api/sms/audiences/upload
- /api/admin/production/orders/{id}/status
- /api/devices/brands
- /api/upload/presigned
- /api/devices/{device_id}
- /api/invoices/{invoice_id}/issue
- /api/invoices/{invoice_id}/copy
- /api/dashboard/recent-activity
- /api/promissory-notes/{note_id}
- /api/admin/debug/switch-tenant
- /api/EFatura/Create
- /extract_patient
- /api/admin/api-keys/init-db
- /api/notifications/{notification_id}
- /api/appointments/{appointment_id}/complete
- /api/sms/documents/{documentType}/download
- /api/admin/settings
- /api/auth/send-verification-otp
- /api/sales/{sale_id}/payment-plan
- /api/admin/tenants/{tenant_id}/users/{user_id}
- /api/admin/integrations/birfatura/config
- /api/settings/pricing
- /api/settings
- /api/replacements/{replacement_id}/invoice
- /api/automation/status
- /api/patients/{patient_id}/timeline
- /api/invoices/bulk_upload
- /api/patients/{patient_id}/notes
- /api/inventory/features
- /api/products/{product_id}/suppliers
- /api/affiliate/register
- /api/admin/debug/switch-role
- /api/patients/{patient_id}/hearing-tests/{test_id}
- /api/permissions
- /api/ocr/init-db
- /api/inventory/bulk_upload
- /api/admin/debug/page-permissions/{page_key}
- /api/sms/audiences
- /api/sgk/e-receipts/{receipt_id}/download-patient-form
- /api/suppliers/{supplier_id}/invoices
- /api/automation/backup
- /api/pos/commission/installment-options
- /api/admin/inventory
- /api/affiliate/me
- /api/admin/sms/packages/{pkg_id}
- /api/promissory-notes
- /api/campaigns/{campaign_id}/send
- /api/communications/templates
- /api/permissions/role/{role_name}
- /swagger.html
- /api/admin/users
- /api/admin/users/all
- /api/inventory/low-stock
- /api/affiliate/login
- /api/admin/suppliers
- /api/upload/files
- /api/timeline
- /api/admin/tenants/{tenant_id}/users
- /api/admin/birfatura/stats
- /api/patients/{patient_id}/documents
- /api/invoices
- /api/suppliers/suggested/{suggested_id}
- /api/EFatura/sendBasicInvoice
- /api/inventory/brands_old
- /entities
- /api/admin/sms/headers
- /api/auth/reset-password
- /api/admin/marketplaces/integrations/{id}/sync
- /api/return-invoices/{invoice_id}/send-to-gib
- /api/roles/{role_id}
- /api/admin/permissions/coverage
- /api/auth/login
- /api/roles
- /api/sales/{sale_id}/payments
- /api/admin/roles/{role_id}
- /api/inventory/{item_id}/serials
- /api/inventory/{item_id}/activity
- /api/subscriptions/register-and-subscribe
- /api/admin/admin-users
- /api/admin/sms/packages
- /api/templates/{template_id}
- /api/admin/invoices/{id}/payment
- /api/patients/{patient_id}/product-sales
- /api/sales/logs
- /api/communications/messages/send-email
- /api/ocr/health
- /api/appointments/{appointment_id}/cancel
- /api/admin/birfatura/invoices
- /api/automation/sgk/process
- /api/notifications/stats
- /api/appointments/availability
- /api/invoices/{invoice_id}/xml
- /api/admin/sms/headers/{header_id}/status
- /api/patients/{patient_id}/timeline/{event_id}
- /api/OutEBelgeV2/SendBasicInvoiceFromModel
- /api/plans/{plan_id}
- /api/patients/{patient_id}
- /api/roles/{role_id}/permissions
- /api/communications/messages
- /api/admin/notifications/init-db
- /api/promissory-notes/{note_id}/collect
- /api/patients/{patient_id}/promissory-notes
- /api/openapi.yaml
- /api/inventory/{item_id}/assign
- /api/tenant/assets/{tenant_id}/{filename}
- /api/admin/appointments
- /api/tenant/company
- /api/device-assignments/{assignment_id}
- /api/sales/{sale_id}
- /api/admin/notifications
- /api/admin/permissions/map
- /api/patients/{patient_id}/sgk-documents
- /api/product-suppliers/{ps_id}
- /api/ocr/entities
- /api/admin/permissions/check/{endpoint_path}
- /api/proformas/{proforma_id}
- /api/admin/features
- /api/admin/tickets/{ticket_id}
- /api/users/{user_id}
- /api/admin/notifications/templates
- /api/config
- /health
- /api/dashboard/kpis
- /api/users
- /api/EFatura/sendDocument
- /api/pos/commission/rates
- /api/reports/campaigns
- /api/inventory/units
- /api/device-assignments/{assignment_id}/return-loaner
- /api/patients/bulk_upload
- /api/admin/tenants/{tenant_id}/subscribe
- /api/admin/patients
- /api/dashboard
- /api/admin/my-permissions
- /api/patients/{patient_id}/documents/{document_id}
- /api/admin/settings/cache/clear
- /api/branches/{branch_id}
- /api/activity-logs/filter-options
- /api/admin/notifications/templates/{template_id}
- /api/admin/activity-logs/stats
- /api/patients/{patient_id}/notes/{note_id}
- /api/devices/low-stock
- /api/patients/{patient_id}/payment-records
- /api/verify-registration-otp
- /api/auth/verify-otp
- /api/invoices/{invoice_id}/send-to-gib
- /api/admin/activity-logs
- /api/pricing-preview
- /api/affiliate/{affiliate_id}
- /api/register-phone
- /api/patients/{patient_id}/assign-devices-extended
- /api/checkout/confirm
- /api/sms/documents/{document_type}/download
- /api/admin/debug/exit-impersonation
- /api/sms/documents/{document_type}
- /api/patients/{patient_id}/appointments
- /api/patients/{patient_id}/ereceipts
- /api/reports/cashflow-summary
- /api/admin/analytics
- /api/admin/api-keys
- /api/admin/tickets/{id}
- /api/patients/{patient_id}/hearing-tests
- /api/communications/stats
- /api/OutEBelgeV2/SendDocument
- /api/devices
- /api/admin/campaigns
- /api/sales/{sale_id}/invoice/pdf
- /api/sales
- /api/pos/commission/rates/system
- /api/invoices/batch-generate
- /api/notifications/settings
- /api/admin/addons/{addon_id}
- /initialize
- /api/cash-records/{record_id}
- /api/birfatura/sync-invoices
- /api/affiliate/list
- /api/communications/history
- /api/tenant/company/upload/{asset_type}
- /process
- /api/admin/settings/init-db
- /api/payment-records
- /api/admin/tenants/{tenant_id}
- /api/proformas/{proforma_id}/convert
- /api/activity-logs/{log_id}
- /api/invoices/{invoice_id}/update-gib-status
- /api/sms/config
- /api/sms/packages
- /api/patients/count
- /api/payment-records/{record_id}
- /api/admin/invoices/{id}
- /api/sgk/upload
- /api/admin/marketplaces/init-db
- /api/invoices/{invoice_id}
- /api/reports/promissory-notes/by-patient
- /api/replacements/{replacement_id}
- /api/admin/permissions


## Permission Analysis

Found **169** permission issues:

### 🔴 Critical Issues

#### GET /api/branches
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'settings.view' but decorator requires 'branches.view'

**Location:** `x-ear/apps/backend/routes/branches.py:19`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /api/branches

---

#### POST /api/branches
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'settings.branches' but decorator requires 'branches.edit'

**Location:** `x-ear/apps/backend/routes/branches.py:39`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for POST /api/branches

---

#### PUT /api/branches/<branch_id>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'settings.branches' but decorator requires 'branches.edit'

**Location:** `x-ear/apps/backend/routes/branches.py:97`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for PUT /api/branches/<branch_id>

---

#### DELETE /api/branches/<branch_id>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'settings.branches' but decorator requires 'branches.delete'

**Location:** `x-ear/apps/backend/routes/branches.py:130`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for DELETE /api/branches/<branch_id>

---

#### GET /api/users
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'team.view' but decorator requires 'users.view'

**Location:** `x-ear/apps/backend/routes/users.py:21`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /api/users

---

#### POST /api/users
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'team.create' but decorator requires 'users.edit'

**Location:** `x-ear/apps/backend/routes/users.py:45`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for POST /api/users

---

#### PUT /api/users/<user_id>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'team.edit' but decorator requires 'users.edit'

**Location:** `x-ear/apps/backend/routes/users.py:222`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for PUT /api/users/<user_id>

---

#### DELETE /api/users/<user_id>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'team.delete' but decorator requires 'users.delete'

**Location:** `x-ear/apps/backend/routes/users.py:251`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for DELETE /api/users/<user_id>

---

#### POST /api/admin/settings/cache/clear
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'platform.settings.manage' but decorator requires 'platform.system.manage'

**Location:** `x-ear/apps/backend/routes/admin_settings.py:78`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for POST /api/admin/settings/cache/clear

---

#### POST /api/cash-records
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'cash_records.write' but decorator requires 'cash_records.edit'

**Location:** `x-ear/apps/backend/routes/cash_records.py:113`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for POST /api/cash-records

---

#### GET /api/admin/suppliers/<int:id>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'admin.suppliers.view' but decorator requires 'platform.suppliers.read'

**Location:** `x-ear/apps/backend/routes/admin_suppliers.py:84`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /api/admin/suppliers/<int:id>

---

#### PUT /api/admin/suppliers/<int:id>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'admin.suppliers.edit' but decorator requires 'platform.suppliers.manage'

**Location:** `x-ear/apps/backend/routes/admin_suppliers.py:97`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for PUT /api/admin/suppliers/<int:id>

---

#### DELETE /api/admin/suppliers/<int:id>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'admin.suppliers.delete' but decorator requires 'platform.suppliers.manage'

**Location:** `x-ear/apps/backend/routes/admin_suppliers.py:133`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for DELETE /api/admin/suppliers/<int:id>

---

#### GET /api/admin/tenants/<tenant_id>/users
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'platform.tenants.read' but decorator requires 'platform.users.read'

**Location:** `x-ear/apps/backend/routes/admin_tenants.py:198`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /api/admin/tenants/<tenant_id>/users

---

#### POST /api/admin/tenants/<tenant_id>/users
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'platform.tenants.manage' but decorator requires 'platform.users.manage'

**Location:** `x-ear/apps/backend/routes/admin_tenants.py:307`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for POST /api/admin/tenants/<tenant_id>/users

---

#### PUT /api/admin/tenants/<tenant_id>/users/<user_id>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'platform.tenants.manage' but decorator requires 'platform.users.manage'

**Location:** `x-ear/apps/backend/routes/admin_tenants.py:358`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for PUT /api/admin/tenants/<tenant_id>/users/<user_id>

---

#### PUT /api/admin/tickets/<id>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'admin.tickets.manage' but decorator requires 'platform.tickets.manage'

**Location:** `x-ear/apps/backend/routes/admin_tickets.py:74`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for PUT /api/admin/tickets/<id>

---

#### GET /api/admin/tickets
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'admin.tickets.read' but decorator requires 'platform.tickets.read'

**Location:** `x-ear/apps/backend/routes/admin.py:347`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /api/admin/tickets

---

#### POST /api/admin/tickets
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'admin.tickets.manage' but decorator requires 'platform.tickets.manage'

**Location:** `x-ear/apps/backend/routes/admin.py:369`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for POST /api/admin/tickets

---

#### POST /api/admin/tickets/<ticket_id>/responses
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'admin.tickets.response' but decorator requires 'platform.tickets.manage'

**Location:** `x-ear/apps/backend/routes/admin.py:430`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for POST /api/admin/tickets/<ticket_id>/responses

---

#### POST /api/admin/debug/switch-role
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'super_admin' but decorator requires 'platform.debug.use'

**Location:** `x-ear/apps/backend/routes/admin.py:458`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for POST /api/admin/debug/switch-role

---

#### GET /api/admin/debug/available-roles
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'super_admin' but decorator requires 'platform.debug.use'

**Location:** `x-ear/apps/backend/routes/admin.py:575`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /api/admin/debug/available-roles

---

#### GET /api/admin/debug/page-permissions/<page_key>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'super_admin' but decorator requires 'platform.debug.use'

**Location:** `x-ear/apps/backend/routes/admin.py:790`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /api/admin/debug/page-permissions/<page_key>

---

#### GET /api/tenant/company/assets/<asset_type>/url
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'settings.view' but decorator requires 'users.view'

**Location:** `x-ear/apps/backend/routes/tenant_users.py:612`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /api/tenant/company/assets/<asset_type>/url

---

#### GET /api/admin/activity-logs
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'platform.activity_logs.read' but decorator requires 'activity_logs.view'

**Location:** `x-ear/apps/backend/routes/activity_logs.py:328`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /api/admin/activity-logs

---

#### GET /api/admin/activity-logs/filter-options
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'platform.activity_logs.read' but decorator requires 'activity_logs.view'

**Location:** `x-ear/apps/backend/routes/activity_logs.py:342`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /api/admin/activity-logs/filter-options

---

#### GET /api/admin/activity-logs/stats
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'platform.activity_logs.read' but decorator requires 'activity_logs.view'

**Location:** `x-ear/apps/backend/routes/activity_logs.py:352`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /api/admin/activity-logs/stats

---

#### POST /api/admin/notifications/send
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'platform.notifications.manage' but decorator requires 'platform.system.manage'

**Location:** `x-ear/apps/backend/routes/admin_notifications.py:98`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for POST /api/admin/notifications/send

---

#### GET /api/admin/notifications/templates
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'platform.notifications.read' but decorator requires 'platform.system.read'

**Location:** `x-ear/apps/backend/routes/admin_notifications.py:185`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /api/admin/notifications/templates

---

#### POST /api/admin/notifications/templates
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'platform.notifications.manage' but decorator requires 'platform.system.manage'

**Location:** `x-ear/apps/backend/routes/admin_notifications.py:206`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for POST /api/admin/notifications/templates

---

#### PUT /api/admin/notifications/templates/<template_id>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'platform.notifications.manage' but decorator requires 'platform.system.manage'

**Location:** `x-ear/apps/backend/routes/admin_notifications.py:243`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for PUT /api/admin/notifications/templates/<template_id>

---

#### DELETE /api/admin/notifications/templates/<template_id>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'platform.notifications.manage' but decorator requires 'platform.system.manage'

**Location:** `x-ear/apps/backend/routes/admin_notifications.py:302`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for DELETE /api/admin/notifications/templates/<template_id>

---

#### GET /api/permissions
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'team.permissions' but decorator requires 'role:read'

**Location:** `x-ear/apps/backend/routes/permissions.py:30`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /api/permissions

---

#### GET /api/permissions/role/<role_name>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'team.permissions' but decorator requires 'role:read'

**Location:** `x-ear/apps/backend/routes/permissions.py:128`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /api/permissions/role/<role_name>

---

#### PUT /api/permissions/role/<role_name>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'team.permissions' but decorator requires 'role:write'

**Location:** `x-ear/apps/backend/routes/permissions.py:142`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for PUT /api/permissions/role/<role_name>

---

#### POST /api/payments/pos/paytr/initiate
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'finance.payments' but decorator requires 'pos.edit'

**Location:** `x-ear/apps/backend/routes/payment_integrations.py:105`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for POST /api/payments/pos/paytr/initiate

---

#### DELETE /suppliers/<int:supplier_id>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'suppliers.edit' but decorator requires 'suppliers.delete'

**Location:** `x-ear/apps/backend/routes/suppliers/write.py:171`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for DELETE /suppliers/<int:supplier_id>

---

#### DELETE /suppliers/suggested/<int:suggested_id>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'suppliers.edit' but decorator requires 'suppliers.delete'

**Location:** `x-ear/apps/backend/routes/suppliers/suggested.py:144`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for DELETE /suppliers/suggested/<int:suggested_id>

---

#### GET /products/<product_id>/suppliers
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'suppliers.view' but decorator requires 'inventory.view'

**Location:** `x-ear/apps/backend/routes/suppliers/products.py:21`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for GET /products/<product_id>/suppliers

---

#### POST /products/<product_id>/suppliers
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'suppliers.edit' but decorator requires 'inventory.edit'

**Location:** `x-ear/apps/backend/routes/suppliers/products.py:75`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for POST /products/<product_id>/suppliers

---

#### DELETE /product-suppliers/<int:ps_id>
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'suppliers.edit' but decorator requires 'suppliers.delete'

**Location:** `x-ear/apps/backend/routes/suppliers/products.py:195`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for DELETE /product-suppliers/<int:ps_id>

---

#### POST /categories
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'inventory.manage' but decorator requires 'inventory.edit'

**Location:** `x-ear/apps/backend/routes/inventory/metadata.py:48`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for POST /categories

---

#### POST /brands
**Type:** middleware-decorator-conflict

**Problem:** Middleware requires 'inventory.manage' but decorator requires 'inventory.edit'

**Location:** `x-ear/apps/backend/routes/inventory/metadata.py:110`

**Recommendation:** Ensure permissions_map.py and @unified_access are aligned for POST /brands

---

#### GET /api/admin/my-permissions
**Type:** self-access-decorator-requires-permission

**Problem:** Self-access endpoint decorator requires 'platform.roles.read' - should use @unified_access() without args

**Location:** `x-ear/apps/backend/routes/admin_roles.py:430`

**Recommendation:** Use @unified_access() without resource/action for self-access endpoints

---

### 🟠 Warnings

- **DELETE /api/admin/roles/<role_id>**: Middleware enforces 'platform.roles.manage' but decorator has no permission check
- **PUT /api/admin/roles/<role_id>/permissions**: Middleware enforces 'platform.roles.manage' but decorator has no permission check
- **PUT /api/admin/admin-users/<user_id>/roles**: Middleware enforces 'platform.users.manage' but decorator has no permission check
- **GET /apps**: Middleware enforces 'settings.view' but decorator has no permission check
- **POST /apps**: Middleware enforces 'settings.edit' but decorator has no permission check
- **GET /api/campaigns**: Middleware enforces 'campaigns.view' but decorator has no permission check
- **POST /api/campaigns**: Middleware enforces 'campaigns.create' but decorator has no permission check
- **POST /api/EFatura/sendDocument**: Middleware enforces 'invoices.send' but decorator has no permission check
- **POST /api/EFatura/sendBasicInvoice**: Middleware enforces 'invoices.send' but decorator has no permission check
- **POST /api/OutEBelgeV2/SendDocument**: Middleware enforces 'invoices.send' but decorator has no permission check
- **POST /api/OutEBelgeV2/SendBasicInvoiceFromModel**: Middleware enforces 'invoices.send' but decorator has no permission check
- **POST /api/birfatura/sync-invoices**: Middleware enforces 'invoices.view' but decorator has no permission check

### 🟡 Info

- **POST /api/auth/send-verification-otp**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/auth/set-password**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/admin/patients/<patient_id>**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/admin/patients/<patient_id>/devices**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/admin/patients/<patient_id>/sales**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/admin/patients/<patient_id>/timeline**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/admin/patients/<patient_id>/documents**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/admin/dashboard/**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/payment-records**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/patients/<patient_id>/payment-records**: Route has decorator but no explicit permissions_map.py entry
- **PATCH /api/payment-records/<record_id>**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/patients/<patient_id>/promissory-notes**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/promissory-notes**: Route has decorator but no explicit permissions_map.py entry
- **PATCH /api/promissory-notes/<note_id>**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/promissory-notes/<note_id>/collect**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/sales/<sale_id>/promissory-notes**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/upload/presigned**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/upload/files**: Route has decorator but no explicit permissions_map.py entry
- **DELETE /api/upload/files**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/ocr/process**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/roles**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/roles**: Route has decorator but no explicit permissions_map.py entry
- **PUT /api/roles/<role_id>**: Route has decorator but no explicit permissions_map.py entry
- **DELETE /api/roles/<role_id>**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/roles/<role_id>/permissions**: Route has decorator but no explicit permissions_map.py entry
- **DELETE /api/roles/<role_id>/permissions/<permission_id>**: Route has decorator but no explicit permissions_map.py entry
- **POST /device-assignments/<assignment_id>/return-loaner**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/uts/registrations**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/uts/registrations/bulk**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/uts/jobs/<job_id>**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/uts/jobs/<job_id>/cancel**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/subscriptions/subscribe**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/subscriptions/complete-signup**: Route has decorator but no explicit permissions_map.py entry
- **DELETE /api/admin/tenants/<tenant_id>/addons**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/admin/tenants/<tenant_id>/sms-config**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/admin/tenants/<tenant_id>/sms-documents**: Route has decorator but no explicit permissions_map.py entry
- **PUT /api/admin/tenants/<tenant_id>/sms-documents/<document_type>/status**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/admin/tenants/<tenant_id>/sms-documents/send-email**: Route has decorator but no explicit permissions_map.py entry
- **PATCH /api/appointments/<appointment_id>**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/appointments/<appointment_id>/reschedule**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/appointments/<appointment_id>/cancel**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/appointments/<appointment_id>/complete**: Route has decorator but no explicit permissions_map.py entry
- **PUT /api/sms-packages/<package_id>**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/campaigns/<campaign_id>/send**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/ocr/init-db**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/ocr/initialize**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/ocr/similarity**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/ocr/entities**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/ocr/extract_patient**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/ocr/debug_ner**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/ocr/jobs**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/ocr/jobs**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/dashboard/kpis**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/dashboard/charts/patient-trends**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/dashboard/charts/revenue-trends**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/dashboard/recent-activity**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/dashboard/charts/patient-distribution**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/EFatura/Create**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/EFatura/Retry/<invoice_id>**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/EFatura/Cancel/<invoice_id>**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/admin/debug/switch-tenant**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/admin/debug/exit-impersonation**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/sms/config**: Route has decorator but no explicit permissions_map.py entry
- **PUT /api/sms/config**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/sms/headers**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/sms/headers**: Route has decorator but no explicit permissions_map.py entry
- **PUT /api/sms/headers/<header_id>/set-default**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/sms/credit**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/sms/documents/upload**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/sms/documents/<document_type>/download**: Route has decorator but no explicit permissions_map.py entry
- **DELETE /api/sms/documents/<document_type>**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/sms/documents/submit**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/sms/audiences**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/sms/audiences**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/sms/audiences/upload**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/admin/sms/packages**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/admin/sms/packages**: Route has decorator but no explicit permissions_map.py entry
- **PUT /api/admin/sms/packages/<pkg_id>**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/admin/sms/headers**: Route has decorator but no explicit permissions_map.py entry
- **PUT /api/admin/sms/headers/<header_id>/status**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/admin/payments/pos/transactions**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/tenant/users**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/tenant/users**: Route has decorator but no explicit permissions_map.py entry
- **DELETE /api/tenant/users/<user_id>**: Route has decorator but no explicit permissions_map.py entry
- **PUT /api/tenant/users/<user_id>**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/tenant/company**: Route has decorator but no explicit permissions_map.py entry
- **PUT /api/tenant/company**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/tenant/company/upload/<asset_type>**: Route has decorator but no explicit permissions_map.py entry
- **DELETE /api/tenant/company/upload/<asset_type>**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/tenant/assets/<tenant_id>/<filename>**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/reports/promissory-notes/by-patient**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/reports/promissory-notes/list**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/permissions**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/payments/pos/paytr/config**: Route has decorator but no explicit permissions_map.py entry
- **PUT /api/payments/pos/paytr/config**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/payments/pos/transactions**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/admin/campaigns/<string:id>**: Route has decorator but no explicit permissions_map.py entry
- **PUT /api/admin/campaigns/<string:id>**: Route has decorator but no explicit permissions_map.py entry
- **DELETE /api/admin/campaigns/<string:id>**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/pos/commission/calculate**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/pos/commission/rates**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/pos/commission/rates/tenant/<tenant_id>**: Route has decorator but no explicit permissions_map.py entry
- **PUT /api/pos/commission/rates/tenant/<tenant_id>**: Route has decorator but no explicit permissions_map.py entry
- **GET /api/pos/commission/rates/system**: Route has decorator but no explicit permissions_map.py entry
- **PUT /api/pos/commission/rates/system**: Route has decorator but no explicit permissions_map.py entry
- **POST /api/pos/commission/installment-options**: Route has decorator but no explicit permissions_map.py entry
- **PUT /<item_id>**: Route has decorator but no explicit permissions_map.py entry
- **PATCH /<item_id>**: Route has decorator but no explicit permissions_map.py entry
- **DELETE /<item_id>**: Route has decorator but no explicit permissions_map.py entry
- **POST /<item_id>/serials**: Route has decorator but no explicit permissions_map.py entry
- **POST /bulk_upload**: Route has decorator but no explicit permissions_map.py entry
- **GET /<item_id>**: Route has decorator but no explicit permissions_map.py entry
- **GET /stats**: Route has decorator but no explicit permissions_map.py entry



## Route Coverage Analysis

### 🔴 Missing Implementations (70)

OpenAPI endpoints with no backend implementation (will cause 404):

- `GET /api/inventory/<item_id>`
- `DELETE /api/invoices/<invoice_id>`
- `PUT /api/inventory/<item_id>`
- `GET /api/admin/permissions/check/<endpoint_path>`
- `GET /api/sales/<sale_id>/invoice`
- `GET /api/admin/patients`
- `GET /api/users/<user_id>`
- `GET /api/inventory/categories`
- `GET /api/sales/<sale_id>/invoice/pdf`
- `GET /api/inventory/search`
- `POST /api/invoices/<invoice_id>/send-to-gib`
- `DELETE /api/templates/<template_id>`
- `GET /api/templates`
- `GET /api/inventory`
- `POST /api/proformas`
- `POST /api/inventory/<item_id>/assign`
- `GET /api/inventory/features`
- `POST /api/inventory/categories`
- `POST /api/admin/suppliers`
- `GET /api/proformas/<proforma_id>`

... and 50 more

### 🟡 Undocumented Routes (57)

- `GET /audit`
- `POST /api/uts/jobs/<job_id>/cancel`
- `GET /api/sms/documents/file/<path:filepath>`
- `GET /api/affiliates/check/<code>`
- `GET /api/admin/dashboard/`
- `GET /brands`
- `DELETE /apps/<app_id>`
- `GET /<item_id>/movements`
- `GET /<item_id>`
- `GET /api/tenant/company/assets/<asset_type>/url`

... and 47 more



## Field Mapping Analysis

### 🟠 Known Problematic Mappings (39)

These fields have caused issues before and need explicit mapping:

- `Patient.createdAt` → `created_at`
- `Patient.updatedAt` → `updated_at`
- `Appointment.branchId` → `branch_id`
- `Appointment.patientId` → `patient_id`
- `Appointment.createdAt` → `created_at`
- `Appointment.updatedAt` → `updated_at`
- `Device.createdAt` → `created_at`
- `Device.updatedAt` → `updated_at`
- `Device.patientId` → `patient_id`
- `Sale.patientId` → `patient_id`
- `Sale.createdAt` → `created_at`
- `Sale.updatedAt` → `updated_at`
- `InventoryItem.createdAt` → `created_at`
- `InventoryItem.reorderLevel` → `reorder_level`
- `InventoryItem.updatedAt` → `updated_at`

... and 24 more

### 🟡 Potential Mismatches (153)

camelCase fields that may need snake_case conversion:

- `Patient.birthDate` → `birth_date`
- `Patient.conversionStep` → `conversion_step`
- `Patient.customData` → `custom_data`
- `Patient.lastName` → `last_name`
- `Patient.tcNumber` → `tc_number`
- `Patient.addressFull` → `address_full`
- `Patient.sgkInfo` → `sgk_info`
- `Patient.priorityScore` → `priority_score`
- `Patient.identityNumber` → `identity_number`
- `Patient.referredBy` → `referred_by`

... and 143 more



## Safety Analysis

✅ No safety issues detected.
