# API Contract Analysis Report
Generated: 2026-01-03T23:44:14.227815Z

## Summary
- Total Endpoints: 183
- Analyzed: 183
- Critical Issues: 0 🔴
- Silent Bugs: 0 🔵
- Warnings: 226 🟠
- Info: 0 🟡

## Risk Distribution
```
🔴 CRITICAL ( 0) ░░░░░░░░░░░░░░░░░░░░
🔵 SILENT   ( 0) ░░░░░░░░░░░░░░░░░░░░
🟠 WARNING  (226) ████████████████████
🟡 INFO     ( 0) ░░░░░░░░░░░░░░░░░░░░
```

## Unused Endpoints (Not Called by Frontend)
- /api/appointments/{appointment_id}/complete
- /api/sms/audiences
- /api/invoices/{invoice_id}/pdf
- /api/verify-registration-otp
- /api/admin/tenants/{id}/sms-documents/send-email
- /api/sales/{sale_id}/promissory-notes
- /api/roles/{role_id}/permissions/{permission_id}
- /api/sales/{sale_id}/invoice/pdf
- /api/affiliate/register
- /api/auth/lookup-phone
- /api/sms/monitoring
- /api/appointments/list
- /api/sgk/documents/{document_id}
- /api/patients/{patient_id}/ereceipts/{ereceipt_id}
- /similarity
- /api/communications/templates
- /api/admin/sms/headers
- /api/patients/{patient_id}/activities
- /api/patients/search
- /api/sms/credit
- /api/dashboard/charts/revenue-trends
- /api/inventory/{item_id}/activity
- /api/inventory
- /api/admin/sms/headers/{header_id}/status
- /api/invoices/{invoice_id}
- /api/devices/{device_id}/stock-update
- /api/register-phone
- /api/campaigns/{campaign_id}/send
- /api/devices
- /api/inventory/{item_id}/assign
- /api/EFatura/Cancel/{invoice_id}
- /api/patients/{patient_id}/hearing-tests/{test_id}
- /api/dashboard
- /api/EFatura/Retry/{invoice_id}
- /api/patients/{patient_id}/sales
- /api/users/me
- /api/subscriptions/current
- /api/reports/appointments
- /api/sms/headers
- /api/automation/status
- /api/admin/tenants/{id}/sms-config
- /init-db
- /api/appointments/{appointment_id}
- /api/automation/backup
- /api/sales
- /api/sales/{sale_id}/payment-plan
- /initialize
- /api/invoices
- /api/EFatura/Create
- /api/sms/audiences/upload
- /api/notifications
- /api/automation/logs
- /api/patients/{patient_id}/assign-devices-extended
- /api/suppliers/{supplier_id}/products
- /api/campaigns
- /api/devices/low-stock
- /api/pricing-preview
- /api/dashboard/kpis
- /api/patients/{patient_id}/ereceipts
- /api/sgk/documents
- /api/appointments/{appointment_id}/reschedule
- /api/suppliers/{supplier_id}/invoices
- /api/reports/financial
- /api/patients/{patient_id}/notes
- /process
- /api/dashboard/charts/patient-trends
- /api/patients/{patient_id}/promissory-notes
- /api/reports/patients
- /api/reports/revenue
- /api/communications/templates/{template_id}
- /api/payment-records
- /api/patients/{patient_id}/timeline/{event_id}
- /api/appointments/{appointment_id}/cancel
- /api/suppliers/{supplier_id}
- /api/patients/{patient_id}
- /api/appointments/availability
- /api/affiliate/me
- /api/sms/packages
- /api/health
- /api/communications/stats
- /api/sales/{sale_id}/invoice
- /api/admin/tenants/{id}/sms-documents
- /api/sales/{sale_id}
- /health
- /api/sms/documents/upload
- /api/settings
- /swagger.html
- /api/reports/campaigns
- /api/auth/forgot-password
- /api/roles
- /api/roles/{role_id}/permissions
- /api/inventory/stats
- /api/suppliers
- /api/patients/bulk_upload
- /api/birfatura/sync-invoices
- /api/auth/verify-otp
- /api/patients/{patient_id}/timeline
- /api/invoices/{invoice_id}/send-to-gib
- /api/devices/brands
- /api/users/{user_id}
- /api/patients/{patient_id}/notes/{note_id}
- /api/admin/tenants/{id}/sms-documents/{documentType}/status
- /api/users
- /api/activity-logs
- /api/suppliers/suggested
- /api/promissory-notes
- /api/notifications/{notification_id}/read
- /api/roles/{role_id}
- /api/dashboard/charts/patient-distribution
- /api/admin/sms/packages/{pkg_id}
- /api/patients
- /api/ocr/process
- /api/notifications/{notification_id}
- /api/automation/sgk/process
- /api/patients/{patient_id}/sgk-documents
- /api/sms/documents/{documentType}
- /api/promissory-notes/{note_id}
- /api/devices/{device_id}
- /api/patients/{patient_id}/devices
- /api/patients/{patient_id}/hearing-tests
- /api/suppliers/suggested/{suggested_id}
- /api/affiliate/{affiliate_id}
- /api/appointments
- /extract_patient
- /api/users/me/password
- /api/affiliate/login
- /api/sms/config
- /api/config/turnstile
- /api/invoices/{invoice_id}/issue
- /api/admin/sms/packages
- /api/inventory/{item_id}/serials
- /entities
- /api/patients/export
- /api/inventory/categories
- /api/product-suppliers/{ps_id}
- /api/auth/reset-password
- /api/dashboard/recent-activity
- /api/inventory/low-stock
- /api/reports/overview
- /api/products/{product_id}/suppliers
- /api/sms/documents/{documentType}/download
- /api/affiliate/list
- /api/suppliers/stats
- /api/auth/send-verification-otp
- /api/communications/messages
- /api/promissory-notes/{note_id}/collect
- /api/inventory/{item_id}
- /api/suppliers/suggested/{suggested_id}/accept
- /api/sms/documents/{document_type}
- /api/openapi.yaml
- /api/notifications/stats
- /api/devices/categories


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

### 🔴 Missing Implementations (25)

OpenAPI endpoints with no backend implementation (will cause 404):

- `GET /api/inventory/<item_id>/activity`
- `POST /similarity`
- `POST /api/inventory/<item_id>/serials`
- `POST /api/invoices/<invoice_id>/send-to-gib`
- `POST /initialize`
- `POST /api/inventory/<item_id>/assign`
- `GET /api/sales/<sale_id>`
- `GET /api/inventory`
- `GET /api/sales/<sale_id>/invoice/pdf`
- `DELETE /api/sales/<sale_id>`
- `PUT /api/inventory/<item_id>`
- `GET /api/inventory/<item_id>`
- `POST /init-db`
- `GET /api/inventory/categories`
- `DELETE /api/invoices/<invoice_id>`
- `POST /process`
- `GET /api/sales/<sale_id>/invoice`
- `GET /api/users/<user_id>`
- `POST /api/inventory/categories`
- `GET /api/inventory/stats`

... and 5 more

### 🟡 Undocumented Routes (252)

- `PUT /api/sms/headers/<header_id>/set-default`
- `GET /api/activity-logs/filter-options`
- `POST /apps`
- `GET /search`
- `GET /api/sgk/e-receipts/<receipt_id>/download-patient-form`
- `POST /api/ocr/jobs`
- `GET /api/sms/documents/file/<path:filepath>`
- `GET /api/communications/history`
- `GET /suppliers/search`
- `GET /api/affiliate/<int:affiliate_id>/details`

... and 242 more



## Field Mapping Analysis

### 🟠 Known Problematic Mappings (44)

These fields have caused issues before and need explicit mapping:

- `Patient.createdAt` → `created_at`
- `Patient.updatedAt` → `updated_at`
- `Role.createdAt` → `created_at`
- `Role.updatedAt` → `updated_at`
- `Permission.createdAt` → `created_at`
- `Appointment.patientId` → `patient_id`
- `Appointment.branchId` → `branch_id`
- `Appointment.createdAt` → `created_at`
- `Appointment.updatedAt` → `updated_at`
- `Device.createdAt` → `created_at`
- `Device.patientId` → `patient_id`
- `Device.updatedAt` → `updated_at`
- `Sale.patientId` → `patient_id`
- `Sale.createdAt` → `created_at`
- `Sale.updatedAt` → `updated_at`

... and 29 more

### 🟡 Potential Mismatches (182)

camelCase fields that may need snake_case conversion:

- `Patient.sgkInfo` → `sgk_info`
- `Patient.customData` → `custom_data`
- `Patient.birthDate` → `birth_date`
- `Patient.priorityScore` → `priority_score`
- `Patient.addressDistrict` → `address_district`
- `Patient.firstName` → `first_name`
- `Patient.acquisitionType` → `acquisition_type`
- `Patient.referredBy` → `referred_by`
- `Patient.conversionStep` → `conversion_step`
- `Patient.addressFull` → `address_full`

... and 172 more

