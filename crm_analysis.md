# API Contract Analysis Report
Generated: 2026-01-03T23:43:51.479956Z

## Summary
- Total Endpoints: 392
- Analyzed: 392
- Critical Issues: 0 🔴
- Silent Bugs: 0 🔵
- Warnings: 0 🟠
- Info: 8 🟡

## Risk Distribution
```
🔴 CRITICAL ( 0) ░░░░░░░░░░░░░░░░░░░░
🔵 SILENT   ( 0) ░░░░░░░░░░░░░░░░░░░░
🟠 WARNING  ( 0) ░░░░░░░░░░░░░░░░░░░░
🟡 INFO     ( 8) ████████████████████
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
- /api/invoices/{invoice_id}/issue
- /api/branches/{branch_id}
- /api/campaigns
- /api/patients/{patient_id}/promissory-notes
- /api/tenant/company/upload/{asset_type}
- /api/suppliers/{supplier_id}
- /api/admin/campaigns
- /api/payment-records
- /api/patients/{patient_id}/documents/{document_id}
- /api/proformas/{proforma_id}
- /api/admin/activity-logs/stats
- /api/timeline
- /process
- /api/patients/{patient_id}/product-sales
- /api/admin/appointments
- /api/ocr/entities
- /api/suppliers/suggested/{suggested_id}/accept
- /api/sgk/upload
- /api/inventory/{item_id}/movements
- /api/admin/debug/switch-tenant
- /api/ocr/extract_patient
- /api/sales/{sale_id}
- /api/inventory/bulk_upload
- /api/patients/{patient_id}/payment-records
- /initialize
- /api/suppliers/{supplier_id}/invoices
- /api/sms/documents/upload
- /api/sms/documents/{document_type}/download
- /api/inventory/{item_id}/assign
- /api/roles/{role_id}/permissions/{permission_id}
- /api/roles/{role_id}
- /api/patients/{patient_id}/sales
- /api/invoices/{invoice_id}/copy-cancel
- /api/auth/refresh
- /api/appointments/availability
- /api/pos/commission/installment-options
- /api/upload/files
- /api/affiliate/{affiliate_id}
- /api/payments/pos/transactions
- /api/admin/plans
- /api/affiliate/list
- /api/admin/sms/packages/{pkg_id}
- /api/admin/debug/available-roles
- /extract_patient
- /api/tenant/company
- /api/sgk/patient-rights/query
- /api/unified-cash-records
- /api/patients/{patient_id}/sgk-documents
- /api/proformas
- /api/inventory/{item_id}
- /api/subscriptions/current
- /api/payments/pos/paytr/initiate
- /api/patients/{patient_id}/activities
- /api/admin/notifications
- /api/invoices/{invoice_id}/send-to-gib
- /api/inventory/{item_id}/serials
- /api/admin/tenants/{tenant_id}/users
- /api/checkout/session
- /api/inventory/units
- /api/admin/permissions/map
- /api/OutEBelgeV2/SendBasicInvoiceFromModel
- /api/admin/production/orders/{id}/status
- /api/communications/templates
- /api/register-phone
- /api/admin/notifications/templates
- /api/EFatura/sendDocument
- /api/subscriptions/register-and-subscribe
- /api/settings/pricing
- /api/appointments
- /api/notifications/{notification_id}/read
- /api/admin/invoices/{id}/payment
- /api/sms/documents/{document_type}
- /metrics
- /api/patients/{patient_id}/sales/{sale_id}
- /api/admin/api-keys
- /api/invoices/{invoice_id}
- /api/automation/status
- /api/admin/debug/switch-role
- /api/invoices/{invoice_id}/update-gib-status
- /api/tenant/users
- /api/invoices/templates
- /api/plans/{plan_id}
- /api/verify-registration-otp
- /api/invoices
- /api/pos/commission/rates/tenant/{tenant_id}
- /api/admin/api-keys/{key_id}
- /api/admin/invoices/{id}/pdf
- /api/inventory/features
- /api/campaigns/{campaign_id}/send
- /api/communications/stats
- /api/notifications
- /api/dashboard/kpis
- /api/admin/sms/headers/{header_id}/status
- /api/admin/admin-users/{user_id}
- /api/dashboard/recent-activity
- /api/patients/{patient_id}/ereceipts
- /api/devices/low-stock
- /api/admin/users
- /api/devices/categories
- /api/inventory/search
- /api/admin/addons/{addon_id}
- /api/pricing-preview
- /api/sms/audiences
- /api/sales/recalc
- /api/patients/{patient_id}/appointments
- /api/suppliers/suggested/{suggested_id}
- /api/auth/forgot-password
- /api/admin/invoices/{id}
- /api/OutEBelgeV2/SendDocument
- /api/admin/notifications/templates/{template_id}
- /api/sms/documents/{documentType}/download
- /api/products/{product_id}/suppliers
- /api/admin/settings/cache/clear
- /api/config/turnstile
- /api/admin/tickets/{ticket_id}/responses
- /api/admin/addons
- /api/appointments/{appointment_id}/cancel
- /api/patients/{patient_id}/invoices
- /api/patients/{patient_id}/timeline/{event_id}
- /api/affiliate/me
- /api/health
- /api/admin/debug/exit-impersonation
- /api/plans
- /api/addons
- /api/admin/tickets
- /api/invoices/{invoice_id}/xml
- /api/admin/settings
- /api/plans/admin
- /api/admin/birfatura/logs
- /api/roles/{role_id}/permissions
- /api/permissions/my
- /api/communications/messages
- /api/admin/integrations/init-db
- /api/admin/admin-users
- /api/patients/{patient_id}
- /api/admin/users/all/{user_id}
- /api/devices/{device_id}
- /api/product-suppliers/{ps_id}
- /api/replacements/{replacement_id}/status
- /api/admin/sms/headers
- /api/admin/campaigns/{id}
- /api/tenant/assets/{tenant_id}/{filename}
- /api/admin/birfatura/invoices
- /api/notifications/stats
- /api/pos/commission/rates/system
- /api/promissory-notes/{note_id}/collect
- /api/sms/monitoring
- /api/sgk/documents/{document_id}
- /api/patients/bulk_upload
- /api/EFatura/Create
- /api/sms/packages
- /api/users/{user_id}
- /api/sales/logs
- /entities
- /api/notifications/settings
- /api/reports/campaigns
- /api/ocr/init-db
- /api/device-assignments/{assignment_id}
- /api/inventory/brands_old
- /api/appointments/{appointment_id}
- /api/dashboard/charts/patient-distribution
- /api/affiliate/login
- /api/sgk/seed-test-patients
- /api/inventory/stats
- /api/reports/appointments
- /api/admin/notifications/init-db
- /api/reports/cashflow-summary
- /api/invoices/{invoice_id}/pdf
- /api/appointments/{appointment_id}/complete
- /api/notifications/{notification_id}
- /api/sgk/workflow/create
- /api/cash-records
- /api/EFatura/Retry/{invoice_id}
- /api/communications/templates/{template_id}
- /api/replacements/{replacement_id}
- /api/admin/scan-queue/init-db
- /init-db
- /api/openapi.yaml
- /api/EFatura/Cancel/{invoice_id}
- /api/admin/activity-logs/filter-options
- /api/admin/patients
- /api/invoices/bulk_upload
- /api/auth/login
- /api/automation/sgk/process
- /api/settings
- /api/admin/settings/init-db
- /api/return-invoices/{invoice_id}/send-to-gib
- /api/promissory-notes
- /api/auth/send-verification-otp
- /api/payment-records/{record_id}
- /api/auth/verify-otp
- /api/reports/financial
- /api/devices/{device_id}/stock-update
- /api/admin/roles/{role_id}
- /api/invoices/{invoice_id}/shipping-pdf
- /api/admin/tenants/{tenant_id}/subscribe
- /api/patients/{patient_id}/assign-devices-extended
- /api/admin/tickets/{ticket_id}
- /api/patients/{patient_id}/devices
- /api/pos/transactions
- /api/patients/{patient_id}/hearing-tests
- /swagger.html
- /api/appointments/{appointment_id}/reschedule
- /api/sms/config
- /api/admin/plans/{plan_id}
- /api/birfatura/sync-invoices
- /api/admin/analytics
- /api/patients/{patient_id}/documents
- /api/admin/birfatura/stats
- /api/admin/notifications/send
- /api/cash-records/{record_id}
- /api/sales/{sale_id}/payments
- /api/templates/{template_id}
- /api/pos/commission/rates
- /api/reports/promissory-notes/by-patient
- /api/devices/brands
- /api/sgk/workflow/{workflow_id}/update
- /api/auth/lookup-phone
- /similarity
- /api/admin/scan-queue/{id}/retry
- /health
- /api/patients/{patient_id}/ereceipts/{ereceipt_id}
- /api/admin/admin-users/{user_id}/roles
- /api/sgk/workflow/{workflow_id}
- /api/admin/sms/packages
- /api/admin/suppliers/{id}
- /api/sms/audiences/upload
- /api/sgk/e-receipt/query
- /api/proformas/{proforma_id}/convert
- /api/sgk/documents
- /api/activity-logs/filter-options
- /api/checkout/confirm
- /api/admin/marketplaces/init-db
- /api/patients/{patient_id}/notes/{note_id}
- /api/admin/tenants/{tenant_id}/addons
- /api/tenant/users/{user_id}
- /api/admin/integrations/vatan-sms/config
- /api/sales/{sale_id}/installments/{installment_id}/pay
- /api/ocr/health
- /api/admin/tenants/{tenant_id}/status
- /api/admin/features
- /api/admin/marketplaces/integrations
- /api/admin/users/all
- /api/sales/{sale_id}/promissory-notes
- /api/invoices/{invoice_id}/copy
- /api/admin/permissions
- /api/admin/production/orders
- /api/suppliers/{supplier_id}/products
- /api/sgk/e-receipts/{receipt_id}/download-patient-form
- /api/suppliers/search
- /api/patients/{patient_id}/timeline
- /api/admin/settings/backup
- /api/sales
- /api/invoices/efatura/submit
- /api/admin/invoices
- /api/automation/logs
- /api/upload/presigned
- /api/admin/api-keys/init-db
- /api/permissions/role/{role_name}
- /api/users
- /api/inventory/low-stock
- /api/invoices/print-queue
- /api/communications/messages/send-email
- /api/admin/inventory
- /api/config
- /api/patients/count
- /api/devices
- /api/activity-logs/{log_id}
- /api/patients/search
- /api/patients/{patient_id}/hearing-tests/{test_id}
- /api/admin/debug/page-permissions/{page_key}
- /api/communications/messages/send-sms
- /api/ocr/initialize
- /api/patients/{patient_id}/proformas
- /api/affiliate/register
- /api/sales/{sale_id}/payment-plan
- /api/sgk/workflows/{workflow_id}/status
- /api/automation/backup
- /api/sms/documents/{documentType}
- /api/admin/auth/login
- /api/ocr/process
- /api/admin/roles/{role_id}/permissions
- /api/admin/activity-logs
- /api/templates
- /api/admin/my-permissions
- /api/admin/tenants/{tenant_id}
- /api/admin/permissions/check/{endpoint_path}
- /api/dashboard
- /api/replacements/{replacement_id}/invoice
- /api/EFatura/sendBasicInvoice
- /api/suppliers/stats
- /api/admin/marketplaces/integrations/{id}/sync
- /api/unified-cash-records/summary
- /api/sales/{sale_id}/invoice/pdf
- /api/roles
- /api/ocr/debug_ner
- /api/permissions
- /api/admin/tickets/{id}
- /api/payments/pos/paytr/callback
- /api/dashboard/charts/revenue-trends
- /api/appointments/list
- /api/communications/history
- /api/ocr/jobs
- /api/patients/{patient_id}/notes
- /api/pos/commission/calculate
- /api/sales/{sale_id}/invoice
- /api/auth/reset-password
- /api/admin/permissions/coverage
- /api/promissory-notes/{note_id}
- /api/invoices/batch-generate
- /api/users/me/password
- /api/admin/production/init-db
- /api/patients/{patient_id}/replacements
- /api/admin/dashboard/metrics
- /api/inventory/{item_id}/activity
- /api/admin/tenants/{tenant_id}/users/{user_id}
- /api/admin/integrations/birfatura/config
- /api/ocr/similarity
- /api/device-assignments/{assignment_id}/return-loaner
- /api/admin/suppliers
