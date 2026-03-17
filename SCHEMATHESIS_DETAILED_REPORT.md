# Schemathesis Test Results - Detailed Analysis
Generated: 2026-02-17

## 1. Server Errors (500) - 69 issues

### Error: `Internal server error`
**Affected endpoints (28):**
- POST /EFatura/sendBasicInvoice
- POST /EFatura/Create
- POST /OutEBelgeV2/SendBasicInvoiceFromModel
- POST /OutEBelgeV2/SendDocument
- POST /OutEBelgeV2/GetOutBoxDocuments
- POST /api/admin/bounces/{bounce_id}/unblacklist
- POST /api/admin/complaints/process-fbl
- POST /api/affiliates/register
- POST /api/auth/refresh
- POST /api/auth/reset-password
- ... and 18 more

### Error: `{"success":false,"data":null,"message":null,"error":{"success":false,"message":"(sqlite3.IntegrityEr`
**Affected endpoints (5):**
- POST /api/invoices/{invoice_id}/copy-cancel
- POST /api/ocr/similarity
- GET /api/admin/birfatura/logs
- DELETE /api/upload/files
- POST /api/devices

### Error: `1 validation error for SmsHeaderRequestRead
documents
  Input should be a valid list [type=list_type`
**Affected endpoints (3):**
- POST /api/users/me/password
- GET /api/admin/tenants
- GET /api/sgk/e-receipts/{receipt_id}/download-patient-form

### Error: `Invalid isoformat string: 'null'`
**Affected endpoints (3):**
- GET /api/ocr/jobs/{job_id}
- GET /api/communications/history
- GET /api/invoices

### Error: `{"success":false,"data":null,"message":null,"error":{"success":false,"message":"(sqlite3.Programming`
**Affected endpoints (2):**
- POST /admin/emails/send
- POST /api/communications/messages/send-email

### Error: `name 'timezone' is not defined`
**Affected endpoints (2):**
- POST /api/invoices/create-dynamic
- DELETE /api/apps/{app_id}

### Error: `1 validation error for TargetAudienceRead
filter_criteria
  Input should be a valid dictionary [type`
**Affected endpoints (2):**
- POST /api/invoices/{invoice_id}/send-gib
- GET /api/sms/admin/headers

### Error: `'NULL'`
**Affected endpoints (2):**
- PUT /api/admin/production/orders/{order_id}/status
- GET /api/admin/sms/packages

### Error: `1 validation error for InvoiceRead
metadata
  Input should be a valid dictionary [type=dict_type, in`
**Affected endpoints (2):**
- PUT /api/invoices/{invoice_id}
- GET /api/admin/inventory

### Error: `1 validation error for DeviceRead
price
  Input should be a valid number [type=float_type, input_val`
**Affected endpoints (2):**
- GET /api/appointments/availability
- PUT /api/users/{user_id}

### Error: `Invalid isoformat string: ''`
**Affected endpoints (2):**
- GET /api/ocr/jobs
- POST /api/parties/{party_id}/notes

### Error: `No module named 'models.sgk'`
**Affected endpoints (2):**
- DELETE /api/addons/{addon_id}
- DELETE /api/parties/{party_id}/documents/{document_id}

### Error: `Failed to save SMTP configuration: "Attempt to overwrite 'message' in LogRecord"`
**Affected endpoints (1):**
- POST /EFatura/Cancel/{invoice_id}

### Error: `Failed to send test email: error`
**Affected endpoints (1):**
- POST /api/admin/debug/switch-tenant

### Error: `'TemplateCreate' object has no attribute 'templateType'`
**Affected endpoints (1):**
- POST /api/campaigns

### Error: `'AdminUser' object has no attribute 'get'`
**Affected endpoints (1):**
- POST /api/invoices/print-queue

### Error: `name 'sync_service' is not defined`
**Affected endpoints (1):**
- POST /api/verify-registration-otp

### Error: `1 validation error for TargetAudienceRead
source_type
  Input should be 'excel' or 'filter' [type=en`
**Affected endpoints (1):**
- PUT /api/settings

### Error: `{"success":false,"data":null,"message":null,"error":{"success":false,"message":"2 validation errors `
**Affected endpoints (1):**
- GET /admin/integrations/smtp/config

### Error: `Failed to retrieve SMTP configuration: success`
**Affected endpoints (1):**
- POST /api/sms/documents/upload

### Error: `Failed to retrieve email metrics: success`
**Affected endpoints (1):**
- PUT /api/users/me

### Error: `PDF generation failed: 'Invoice' object has no attribute 'patient'`
**Affected endpoints (1):**
- GET /api/invoices/{invoice_id}/shipping-pdf

### Error: `unbound prefix: line 1, column 72`
**Affected endpoints (1):**
- GET /api/reports/pos-movements

### Error: `'SendSms' object has no attribute 'partyId'`
**Affected endpoints (1):**
- POST /api/hearing-profiles

### Error: `'HistoryCreate' object has no attribute 'partyId'`
**Affected endpoints (1):**
- POST /api/apps/{app_id}/assign

### Error: `'SendEmail' object has no attribute 'partyId'`
**Affected endpoints (1):**
- POST /api/notifications

## 2. Response Schema Violations - 22 issues

- POST /api/devices/brands
- POST /api/ocr/init-db
- POST /api/invoices/{invoice_id}/copy
- GET /api/addons/admin
- GET /api/admin/unsubscribes
- GET /api/ai/audit/stats
- GET /api/affiliates/{affiliate_id}/commissions
- GET /api/commissions/audit
- GET /api/invoices/{invoice_id}
- GET /api/plans/admin
- GET /api/suppliers/{supplier_id}
- PATCH /api/affiliates/{affiliate_id}/toggle-status
- PATCH /api/payment-records/{record_id}
- DELETE /api/admin/unsubscribes/{unsubscribe_id}
- POST /api/parties
- POST /api/appointments/{appointment_id}/reschedule
- POST /api/inventory
- POST /api/sales
- GET /api/appointments/list
- GET /api/admin/tenants/{tenant_id}/users
- ... and 2 more

## 3. API Accepted Invalid Requests - 23 issues

- POST /api/addons
- POST /api/ai/chat
- POST /api/devices/brands
- POST /api/auth/verify-otp
- PUT /api/admin/integrations/vatan-sms/config
- POST /api/payments/pos/paytr/callback
- PUT /api/pos/commission/rates/system
- GET /api/admin/bounces/stats
- GET /api/admin/unsubscribes
- GET /api/invoices/{invoice_id}/xml
- GET /api/settings
- GET /api/sms/documents/file/{filepath}
- GET /api/users/me
- GET /replacements/{replacement_id}
- POST /api/parties
- POST /api/campaigns/{campaign_id}/send
- POST /api/appointments/{appointment_id}/reschedule
- POST /api/communications/messages/send-sms
- POST /api/inventory
- POST /api/sales
- ... and 3 more

## 4. API Rejected Valid Requests - 53 issues

- POST /admin/integrations/smtp/config
- POST /api/admin/auth/login
- POST /api/admin/notifications/templates
- POST /api/admin/plans
- POST /api/admin/roles
- POST /api/admin/invoices/{invoice_id}/payment
- POST /api/ai/admin/kill-switch
- POST /api/admin/scan-queue/{scan_id}/retry
- POST /api/ai/composer/execute
- POST /api/auth/forgot-password
- POST /api/auth/set-password
- POST /api/communications/templates
- POST /api/invoices/batch-generate
- POST /api/device-assignments/{assignment_id}/return-loaner
- POST /api/ocr/initialize
- POST /api/ocr/process
- POST /api/ocr/jobs
- POST /api/invoices/{invoice_id}/issue
- POST /api/permissions
- POST /api/pos/commission/installment-options
- ... and 33 more

## 5. Undocumented Status Codes - 320 issues

### Status 400 - 49 endpoints
- POST /admin/integrations/smtp/config
- POST /api/admin/auth/login
- POST /api/admin/notifications/templates
- POST /api/admin/plans
- POST /api/admin/roles
- POST /api/admin/invoices/{invoice_id}/payment
- POST /api/ai/composer/execute
- POST /api/ai/chat
- POST /api/auth/forgot-password
- POST /api/auth/set-password
- ... and 39 more

### Status 401 - 8 endpoints
- POST /api/
- POST /admin/integrations/smtp/test
- POST /api/auth/lookup-phone
- POST /api/auth/login
- POST /api/deliverability/snapshot
- GET /api/admin/bounces
- GET /api/admin/permissions
- POST /api/parties/bulk-update

### Status 403 - 40 endpoints
- POST /api/admin/addons
- POST /api/admin/settings
- POST /api/admin/settings/backup
- POST /api/admin/settings/cache/clear
- POST /api/admin/settings/init-db
- POST /api/admin/sms/packages
- POST /api/admin/spam-preview
- POST /api/invoices/bulk-upload
- POST /api/ocr/entities
- POST /api/ocr/extract_patient
- ... and 30 more

### Status 404 - 158 endpoints
- POST /api/admin/notifications/send
- POST /api/admin/marketplaces/integrations/{integration_id}/sync
- POST /api/ai/actions
- POST /api/admin/example-documents/upload
- POST /api/apps
- POST /api/auth/send-verification-otp
- POST /api/commissions/update-status
- POST /api/inventory/bulk-upload
- POST /api/invoices/{invoice_id}/copy-cancel
- POST /api/ocr/similarity
- ... and 148 more

### Status 409 - 1 endpoints
- POST /api/sgk/workflow/create

### Status 500 - 63 endpoints
- POST /EFatura/sendBasicInvoice
- POST /EFatura/Create
- POST /OutEBelgeV2/SendBasicInvoiceFromModel
- POST /OutEBelgeV2/SendDocument
- POST /OutEBelgeV2/GetOutBoxDocuments
- POST /EFatura/Cancel/{invoice_id}
- POST /api/admin/bounces/{bounce_id}/unblacklist
- POST /api/admin/complaints/process-fbl
- POST /api/admin/debug/switch-tenant
- POST /admin/emails/send
- ... and 53 more

### Status 501 - 1 endpoints
- POST /api/sms/audiences/upload

## Summary

- **Total Server Errors:** 69
- **Total Schema Violations:** 22
- **Total Accepted Invalid:** 23
- **Total Rejected Valid:** 53
- **Total Undocumented Status:** 320
