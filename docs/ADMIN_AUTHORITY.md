# Admin Authority & Super-Admin Policy

> **Status:** Active
> **Last Updated:** 2026-01-13

This document defines the separation of powers between **Platform Admins (Super Admins)** and **Tenant Admins**.

## 1. Core Principles

1.  **Super Admin Supremacy:** Platform Admins have unrestricted access to all data across all tenants for maintenance, support, and legal compliance.
2.  **Tenant Isolation:** Tenant Admins can ONLY access data belonging to their own tenant. They must never be able to access other tenants' data.
3.  **No "God Mode" in UI:** While the API allows cross-tenant access for Super Admins, the standard UI should generally default to a specific tenant context unless explicitly in a "Global View".

## 2. Admin Roles

### 2.1 Platform Admin (Super Admin)
*   **Role Key:** `SUPER_ADMIN` (or `admin_user` table entry)
*   **Scope:** Global
*   **Capabilities:**
    *   Create/Delete Tenants
    *   Manage Plans & Subscriptions
    *   Access any Tenant's backend data via `X-Tenant-ID` header override (if implemented) or Admin APIs.
    *   Manage Feature Flags (FeatureGate)
    *   View Global Analytics

### 2.2 Tenant Admin
*   **Role Key:** `TENANT_ADMIN`
*   **Scope:** Single Tenant
*   **Capabilities:**
    *   Manage Users within their Tenant
    *   Manage Tenant Settings (branding, working hours)
    *   View Tenant Analytics
    *   **CANNOT:** Change their own Plan limits, access other tenants.

## 3. Technical Enforcement

### 3.1 Middleware Level
*   **Tenant Resolution:**
    *   Public/Tenant APIs -> Identify Tenant via Subdomain or Header.
    *   Admin APIs -> Authenticate as AdminUser.
*   **Permission Checks:**
    *   `@unified_access` decorator ensures that if a user is a Tenant User, queries are automatically filtered by `tenant_id`.

### 3.2 Database Level (ORM)
*   Global `with_loader_criteria` in `database.py` enforces tenant isolation for all `select` queries unless `_skip_tenant_filter` is explicitly set (which only Super Admin endpoints should do).

## 4. Emergency Access
In case of critical support issues, a Super Admin may "impersonate" a tenant context. This must be logged in the `AuditLog`.

## 5. Migration Impact
*   **Phase 1:** `AdminUser` table remains authoritative for Super Admins.
*   **Future:** May merge into a unified `User` table with a global `is_superuser` flag, but distinction remains logic-wise.
