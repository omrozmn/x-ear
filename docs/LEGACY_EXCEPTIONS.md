# Legacy Router-ORM Import Exceptions
> Created: 2026-01-13
> Status: ACTIVE

The following files are exempted from **Contract #15 (Router-ORM Import Policy)**.
These routers contain direct imports from `models.*` (e.g., `from models.user import User`).

**Policy:**
1. These files are marked as **LEGACY**.
2. New code must NOT replicate this pattern.
3. Refactoring these files to use the Service Layer is scheduled for later phases.

## Exempted Files List
- apps/api/routers/activity_logs.py
- apps/api/routers/addons.py
- apps/api/routers/admin.py
- apps/api/routers/admin_addons.py
- apps/api/routers/admin_analytics.py
- apps/api/routers/admin_api_keys.py
- apps/api/routers/admin_appointments.py
- apps/api/routers/admin_birfatura.py
- apps/api/routers/admin_campaigns.py
- apps/api/routers/admin_dashboard.py
- apps/api/routers/admin_integrations.py
- apps/api/routers/admin_inventory.py
- apps/api/routers/admin_invoices.py
- apps/api/routers/admin_marketplaces.py
- apps/api/routers/admin_notifications.py
- apps/api/routers/admin_patients.py
- apps/api/routers/admin_payments.py
- apps/api/routers/admin_plans.py
- apps/api/routers/admin_production.py
- apps/api/routers/admin_roles.py
- apps/api/routers/admin_scan_queue.py
- apps/api/routers/admin_settings.py
- apps/api/routers/admin_suppliers.py
- apps/api/routers/admin_tenants.py
- apps/api/routers/affiliates.py
- apps/api/routers/appointments.py
- apps/api/routers/apps.py
- apps/api/routers/audit.py
- apps/api/routers/auth.py
- apps/api/routers/birfatura.py
- apps/api/routers/branches.py
- apps/api/routers/campaigns.py
- apps/api/routers/cash_records.py
- apps/api/routers/checkout.py
- apps/api/routers/commissions.py
- apps/api/routers/communications.py
- apps/api/routers/dashboard.py
- apps/api/routers/devices.py
- apps/api/routers/documents.py
- apps/api/routers/inventory.py
- apps/api/routers/invoice_management.py
- apps/api/routers/invoices.py
- apps/api/routers/invoices_actions.py
- apps/api/routers/notifications.py
- apps/api/routers/ocr.py
- apps/api/routers/orders.py
- apps/api/routers/patient_subresources.py
- apps/api/routers/patients.py
- apps/api/routers/payment_integrations.py
- apps/api/routers/payments.py
- apps/api/routers/permissions.py
- apps/api/routers/plans.py
- apps/api/routers/pos_commission.py
- apps/api/routers/registration.py
- apps/api/routers/replacements.py
- apps/api/routers/reports.py
- apps/api/routers/roles.py
- apps/api/routers/sales.py
- apps/api/routers/settings.py
- apps/api/routers/sgk.py
- apps/api/routers/sms.py
- apps/api/routers/sms_integration.py
- apps/api/routers/sms_packages.py
- apps/api/routers/subscriptions.py
- apps/api/routers/suppliers.py
- apps/api/routers/tenant_users.py
- apps/api/routers/timeline.py
- apps/api/routers/unified_cash.py
- apps/api/routers/upload.py
- apps/api/routers/users.py
