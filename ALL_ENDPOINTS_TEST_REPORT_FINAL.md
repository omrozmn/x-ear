=========================================
  X-Ear CRM - COMPREHENSIVE SECURITY & API TESTS
  Testing ALL 513 Operations with RBAC Check
=========================================

[0;35m[AUTH][0m Authenticating Personas...
[0;32m✓ Admin Authenticated[0m
[0;35m[RBAC][0m Performing Tenant Impersonation...
[0;32m✓ Tenant Context Established[0m

[0;34m[ADMIN_PANEL][0m Running ADMIN_PANEL Tests...
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/campaigns
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/auth/login
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/users
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/users
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/users/all
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/users/all/{user_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/tickets
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/tickets
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/tickets/{ticket_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/tickets/{ticket_id}/responses
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/debug/switch-role
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/debug/available-roles
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/debug/switch-tenant
    [0;34mℹ INFO[0m (HTTP 400) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/debug/exit-impersonation
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/debug/page-permissions/{page_key}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/tenants
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/tenants
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/tenants/{tenant_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/tenants/{tenant_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] DELETE /api/admin/tenants/{tenant_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/tenants/{tenant_id}/users
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/tenants/{tenant_id}/users
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/tenants/{tenant_id}/users/{user_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/tenants/{tenant_id}/subscribe
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/tenants/{tenant_id}/addons
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] DELETE /api/admin/tenants/{tenant_id}/addons
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/tenants/{tenant_id}/status
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/tenants/{tenant_id}/sms-config
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/tenants/{tenant_id}/sms-documents
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/tenants/{tenant_id}/sms-documents/{document_type}/download
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/tenants/{tenant_id}/sms-documents/{document_type}/status
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/tenants/{tenant_id}/sms-documents/send-email
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/dashboard
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/dashboard/stats
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/plans
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/plans
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/plans/{plan_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/plans/{plan_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] DELETE /api/admin/plans/{plan_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/addons
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/addons
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/addons/{addon_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/addons/{addon_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] DELETE /api/admin/addons/{addon_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/analytics/overview
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/analytics
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/analytics/revenue
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/analytics/users
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/analytics/tenants
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/bounces
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/bounces/stats
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/bounces/{bounce_id}/unblacklist
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/spam-preview
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/unsubscribes
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/unsubscribes/stats
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] DELETE /api/admin/unsubscribes/{unsubscribe_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/email-approvals
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/email-approvals/stats
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/email-approvals/{approval_id}/approve
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/email-approvals/{approval_id}/reject
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/complaints
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/complaints/stats
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/complaints/process-fbl
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/settings/init-db
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/settings
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/settings
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/settings/cache/clear
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/settings/backup
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/roles
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/roles
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/roles/{role_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/roles/{role_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] DELETE /api/admin/roles/{role_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/roles/{role_id}/permissions
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/roles/{role_id}/permissions
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/permissions
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/admin-users
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/admin-users/{user_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/admin-users/{user_id}/roles
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/my-permissions
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/api-keys/init-db
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/api-keys
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/api-keys
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] DELETE /api/admin/api-keys/{key_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/appointments
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/birfatura/stats
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/birfatura/invoices
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/birfatura/logs
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/integrations
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/integrations/init-db
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/integrations/vatan-sms/config
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/integrations/vatan-sms/config
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/integrations/birfatura/config
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/integrations/birfatura/config
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/inventory
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/invoices
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/invoices
    [0;34mℹ INFO[0m (HTTP 400) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/invoices/{invoice_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/invoices/{invoice_id}/payment
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/invoices/{invoice_id}/pdf
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/marketplaces/init-db
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/marketplaces/integrations
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/marketplaces/integrations
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/marketplaces/integrations/{integration_id}/sync
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/notifications/init-db
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/notifications
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/notifications/send
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/notifications/templates
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/notifications/templates
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/notifications/templates/{template_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] DELETE /api/admin/notifications/templates/{template_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/parties
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/parties/{party_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/parties/{party_id}/devices
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/parties/{party_id}/sales
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/parties/{party_id}/timeline
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/parties/{party_id}/documents
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/payments/pos/transactions
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/production/init-db
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/production/orders
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/production/orders/{order_id}/status
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/scan-queue/init-db
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/scan-queue
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/scan-queue/{scan_id}/retry
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/suppliers
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/suppliers
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/suppliers/{supplier_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/suppliers/{supplier_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] DELETE /api/admin/suppliers/{supplier_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] GET /api/admin/sms/packages
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] POST /api/admin/sms/packages
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] PUT /api/admin/sms/packages/{package_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [ADMIN_PANEL] DELETE /api/admin/sms/packages/{package_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable

[0;34m[AFFILIATE][0m Running AFFILIATE Tests...
  [1;33m→[0m [AFFILIATE] GET /api/affiliates/check/{code}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [AFFILIATE] POST /api/affiliates/register
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AFFILIATE] POST /api/affiliates/login
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AFFILIATE] GET /api/affiliates/me
    [0;31m✗ FAIL[0m (HTTP 500) - SERVER ERROR
  [1;33m→[0m [AFFILIATE] PATCH /api/affiliates/{affiliate_id}
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AFFILIATE] GET /api/affiliates/{affiliate_id}/commissions
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AFFILIATE] GET /api/affiliates/{affiliate_id}/details
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AFFILIATE] PATCH /api/affiliates/{affiliate_id}/toggle-status
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AFFILIATE] GET /api/affiliates/list
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AFFILIATE] GET /api/affiliates/lookup
    [0;34mℹ INFO[0m (HTTP 400) - Logic reachable

[0;34m[AI][0m Running AI Tests...
  [1;33m→[0m [AI] POST /api/ai/chat
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AI] POST /api/ai/actions
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AI] GET /api/ai/actions/{action_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [AI] POST /api/ai/actions/{action_id}/approve
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AI] POST /api/ai/actions/{action_id}/execute
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [AI] GET /api/ai/audit
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AI] GET /api/ai/audit/stats
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AI] GET /api/ai/audit/{audit_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [AI] GET /api/ai/status
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AI] GET /api/ai/health
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AI] GET /api/ai/capabilities
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AI] GET /api/ai/metrics
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AI] GET /api/ai/alerts
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AI] POST /api/ai/alerts/{alert_id}/acknowledge
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [AI] POST /api/ai/alerts/check
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AI] GET /api/ai/admin/kill-switch
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AI] POST /api/ai/admin/kill-switch
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AI] GET /api/ai/admin/pending-approvals
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AI] POST /api/ai/admin/cleanup-expired
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AI] GET /api/ai/admin/settings
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AI] GET /api/ai/composer/autocomplete
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AI] POST /api/ai/composer/execute
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AI] POST /api/ai/composer/analyze
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable

[0;34m[AUTH][0m Running AUTH Tests...
  [1;33m→[0m [AUTH] POST /api/auth/lookup-phone
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AUTH] POST /api/auth/forgot-password
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AUTH] POST /api/auth/verify-otp
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AUTH] POST /api/auth/reset-password
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AUTH] POST /api/auth/login
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [AUTH] POST /api/auth/refresh
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [AUTH] GET /api/auth/me
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [AUTH] POST /api/auth/send-verification-otp
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [AUTH] POST /api/auth/set-password
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable

[0;34m[SYSTEM][0m Running SYSTEM Tests...
  [1;33m→[0m [SYSTEM] GET /health
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [SYSTEM] GET /readiness
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [SYSTEM] GET /parties/{party_id}/replacements
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /parties/{party_id}/replacements
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] GET /replacements/{replacement_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] PATCH /replacements/{replacement_id}/status
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /replacements/{replacement_id}/invoice
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /return-invoices/{invoice_id}/send-to-gib
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /EFatura/sendDocument
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /EFatura/sendBasicInvoice
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /EFatura/Create
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /EFatura/Retry/{invoice_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /EFatura/Cancel/{invoice_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /birfatura/sync-invoices
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /OutEBelgeV2/SendDocument
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /OutEBelgeV2/SendBasicInvoiceFromModel
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /OutEBelgeV2/GetOutBoxDocuments
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /OutEBelgeV2/GetPDFLinkByUUID
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /Musteri/FirmaMusteriGetir
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /Firma/FirmaPKBilgisiGetir
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /Firma/FirmaAdresBilgisiGetir
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] GET /registrations
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /registrations/bulk
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] GET /jobs/{job_id}
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /jobs/{job_id}/cancel
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] GET /admin/integrations/smtp/config
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /admin/integrations/smtp/config
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /admin/integrations/smtp/test
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] GET /admin/integrations/smtp/metrics
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] GET /admin/integrations/smtp/logs
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /admin/emails/send
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable
  [1;33m→[0m [SYSTEM] POST /tool-api/email/notify
    [0;34mℹ INFO[0m (HTTP 401) - Logic reachable

[0;34m[TENANT_WEB_APP][0m Running TENANT_WEB_APP Tests...
  [1;33m→[0m [TENANT_WEB_APP] GET /api/campaigns
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/campaigns
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/campaigns/{campaign_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/campaigns/{campaign_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/campaigns/{campaign_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/campaigns/{campaign_id}/send
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/parties
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/export
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/count
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/{party_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/parties/{party_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/parties/{party_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/parties/bulk-upload
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/parties/bulk-update
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/parties/bulk-email
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/inventory
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/inventory
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/inventory/stats
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/inventory/search
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/inventory/low-stock
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/inventory/units
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/inventory/{item_id}/activity
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/inventory/categories
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/inventory/brands
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/inventory/{item_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/inventory/{item_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/inventory/{item_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/inventory/{item_id}/serials
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/inventory/{item_id}/movements
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sales
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sales
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sales/{sale_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/sales/{sale_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sales/{sale_id}/payments
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sales/{sale_id}/payments
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sales/{sale_id}/payment-plan
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sales/{sale_id}/payment-plan
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sales/{sale_id}/installments/{installment_id}/pay
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sales/recalc
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/parties/{party_id}/device-assignments
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PATCH /api/device-assignments/{assignment_id}
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/device-assignments/{assignment_id}/return-loaner
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/pricing-preview
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/appointments
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/appointments
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/appointments/availability
    [0;31m✗ FAIL[0m (HTTP 500) - SERVER ERROR
  [1;33m→[0m [TENANT_WEB_APP] GET /api/appointments/list
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/appointments/{appointment_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/appointments/{appointment_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/appointments/{appointment_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/appointments/{appointment_id}/reschedule
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/appointments/{appointment_id}/cancel
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/appointments/{appointment_id}/complete
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/dashboard
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/dashboard/kpis
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/dashboard/charts/patient-trends
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/dashboard/charts/revenue-trends
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/dashboard/recent-activity
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/dashboard/charts/patient-distribution
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/devices
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/devices
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/devices/categories
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/devices/brands
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/devices/brands
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/devices/low-stock
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/devices/{device_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/devices/{device_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/devices/{device_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/devices/{device_id}/stock-update
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/notifications
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/notifications
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/notifications/{notification_id}/read
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/notifications/{notification_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/notifications/{notification_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/notifications/stats
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/notifications/settings
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/notifications/settings
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/branches
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/branches
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/branches/{branch_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/branches/{branch_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/reports/overview
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/reports/patients
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/reports/financial
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/reports/campaigns
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/reports/revenue
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/reports/appointments
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/reports/promissory-notes
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/reports/promissory-notes/by-patient
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/reports/promissory-notes/list
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/reports/remaining-payments
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/reports/cashflow-summary
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/reports/pos-movements
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/roles
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/roles
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/roles/{role_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/roles/{role_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/roles/{role_id}/permissions
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/roles/{role_id}/permissions
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/roles/{role_id}/permissions/{permission_name}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/payment-records
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/payment-records
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/{party_id}/payment-records
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] PATCH /api/payment-records/{record_id}
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/{party_id}/promissory-notes
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/promissory-notes
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PATCH /api/promissory-notes/{note_id}
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/promissory-notes/{note_id}/collect
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sales/{sale_id}/promissory-notes
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/users
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/users
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/users/me
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/users/me
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/users/me/password
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/users/{user_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/users/{user_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/tenant/users
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/tenant/users/{user_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/tenant/users/{user_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/tenant/company
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/tenant/company
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/suppliers
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/suppliers
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/suppliers/search
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/suppliers/stats
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/suppliers/{supplier_id}
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/suppliers/{supplier_id}
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/suppliers/{supplier_id}
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/settings/pricing
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/settings
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/settings
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/invoices
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/invoices
    [0;34mℹ INFO[0m (HTTP 400) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/invoices/print-queue
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/invoices/print-queue
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/invoices/templates
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/invoices/templates
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/invoices/batch-generate
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/invoices/{invoice_id}
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/invoices/{invoice_id}
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/invoices/{invoice_id}
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/{party_id}/invoices
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/invoices/{invoice_id}/send-to-gib
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/invoices/bulk-upload
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sgk/documents
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sgk/documents
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sgk/documents/{document_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/sgk/documents/{document_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sgk/upload
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/{party_id}/sgk-documents
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sgk/e-receipt/query
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sgk/e-receipts/delivered
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sgk/patient-rights/query
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sgk/workflow/create
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/sgk/workflow/{workflow_id}/update
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sgk/workflow/{workflow_id}
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/sgk/workflows/{workflow_id}/status
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sgk/e-receipts/{receipt_id}/download-patient-form
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sgk/seed-test-patients
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/unsubscribe
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/deliverability/metrics
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/deliverability/alerts/check
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/deliverability/trend
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/deliverability/snapshot
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/activity-logs
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/activity-logs/stats
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/activity-logs/filter-options
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/audit
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/permissions
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/permissions
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/permissions/my
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/permissions/role/{role_name}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/permissions/role/{role_name}
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/ocr/health
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/ocr/init-db
    [0;31m✗ FAIL[0m (HTTP 500) - SERVER ERROR
  [1;33m→[0m [TENANT_WEB_APP] POST /api/ocr/initialize
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/ocr/process
    [0;34mℹ INFO[0m (HTTP 400) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/ocr/similarity
    [0;34mℹ INFO[0m (HTTP 400) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/ocr/entities
    [0;34mℹ INFO[0m (HTTP 400) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/ocr/extract_patient
    [0;34mℹ INFO[0m (HTTP 400) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/ocr/debug_ner
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/ocr/jobs
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/ocr/jobs
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/ocr/jobs/{job_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/upload/presigned
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/upload/files
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/upload/files
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/{party_id}/documents
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/parties/{party_id}/documents
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/{party_id}/documents/{document_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/parties/{party_id}/documents/{document_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/{party_id}/devices
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/{party_id}/notes
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/parties/{party_id}/notes
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/parties/{party_id}/notes/{note_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/parties/{party_id}/notes/{note_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/{party_id}/sales
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/{party_id}/appointments
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/{party_id}/profiles/hearing/tests
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/parties/{party_id}/profiles/hearing/tests
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/parties/{party_id}/profiles/hearing/tests/{test_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/parties/{party_id}/profiles/hearing/tests/{test_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/{party_id}/profiles/hearing/ereceipts
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/parties/{party_id}/profiles/hearing/ereceipts
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/parties/{party_id}/profiles/hearing/ereceipts/{ereceipt_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/parties/{party_id}/profiles/hearing/ereceipts/{ereceipt_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/cash-records
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/cash-records
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/cash-records/{record_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/unified-cash-records
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/unified-cash-records/summary
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/payments/pos/paytr/config
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/payments/pos/paytr/config
    [0;34mℹ INFO[0m (HTTP 403) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/payments/pos/paytr/initiate
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/payments/pos/paytr/callback
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/payments/pos/transactions
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/timeline
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/parties/{party_id}/timeline
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/parties/{party_id}/timeline
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/parties/{party_id}/activities
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/parties/{party_id}/timeline/{event_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/plans
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/plans
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/plans/admin
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/plans/{plan_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/plans/{plan_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/addons
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/addons
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/addons/admin
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/addons/{addon_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/addons/{addon_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/subscriptions/subscribe
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/subscriptions/complete-signup
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/subscriptions/current
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/subscriptions/register-and-subscribe
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/config
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/config/turnstile
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/register-phone
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/verify-registration-otp
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/automation/status
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/automation/sgk/process
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/automation/backup
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/automation/logs
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/checkout/session
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/checkout/confirm
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/apps
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/apps
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/apps/{app_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/apps/{app_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/apps/{app_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/apps/{app_id}/assign
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/apps/{app_id}/transfer_ownership
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/pos/commission/calculate
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/pos/commission/rates
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/pos/commission/installment-options
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/pos/commission/rates/tenant/{tenant_id}
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/pos/commission/rates/tenant/{tenant_id}
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/pos/commission/rates/system
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/pos/commission/rates/system
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sms-packages
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sms/config
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/sms/config
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sms/headers
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sms/headers
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/sms/headers/{header_id}/set-default
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sms/packages
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sms/credit
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sms/audiences
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sms/audiences
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sms/documents/upload
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sms/documents/{document_type}/download
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/sms/documents/{document_type}
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sms/documents/submit
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/sms/audiences/upload
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sms/admin/headers
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/sms/admin/headers/{header_id}/status
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/sms/documents/file/{filepath}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/invoice-schema
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/invoices/create-dynamic
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/invoices/{invoice_id}/xml
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/invoices/{invoice_id}/send-gib
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/invoice-settings
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/invoice-settings
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/invoices/{invoice_id}/issue
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/invoices/{invoice_id}/copy
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/invoices/{invoice_id}/copy-cancel
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/invoices/{invoice_id}/pdf
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/invoices/{invoice_id}/shipping-pdf
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/communications/messages
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/communications/messages/send-sms
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/communications/messages/send-email
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/communications/templates
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/communications/templates
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/communications/templates/{template_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] PUT /api/communications/templates/{template_id}
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] DELETE /api/communications/templates/{template_id}
    [0;34mℹ INFO[0m (HTTP 404) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/communications/history
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/communications/history
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/communications/stats
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] POST /api/commissions/create
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] POST /api/commissions/update-status
    [0;34mℹ INFO[0m (HTTP 422) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/commissions/by-affiliate
    [0;32m✓ PASS[0m (HTTP 200)
  [1;33m→[0m [TENANT_WEB_APP] GET /api/commissions/audit
    [0;34mℹ INFO[0m (HTTP 400) - Logic reachable
  [1;33m→[0m [TENANT_WEB_APP] GET /api/developer/schema-registry
    [0;32m✓ PASS[0m (HTTP 200)

=========================================
  [0;34mFINAL TEST RESULTS (513 ENDPOINTS)[0m
=========================================
Total Operations: 513
[0;32mFunctional Check: 510[0m
[0;31mSystem Errors:    3[0m
Reliability:      99%
=========================================
[0;31m✗ SYSTEM INSTABILITY DETECTED[0m
