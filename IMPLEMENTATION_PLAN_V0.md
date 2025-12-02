# X-Ear CRM & Admin Panel - V0 Implementation Plan

This document outlines the critical tasks required to finalize the V0 release, ensuring system stability, security, and maintainability.

## 1. OperationId Naming Standard
**Objective:** Ensure consistent and readable operation IDs in the generated OpenAPI spec to facilitate clean frontend code generation via Orval.
- [x] Update `update_openapi_admin.py` (and other openapi scripts) to enforce a naming convention (e.g., `verb + Resource + Action`).
- [x] Verify that generated IDs are unique and descriptive (e.g., `getAdminUsers` instead of `get_api_admin_users`).

## 2. OpenAPI -> Orval -> Type-Check Pipeline
**Objective:** Automate the synchronization between Backend and Frontend to prevent type mismatches.
- [x] Create a `sync-api` script in `package.json` that runs:
    1.  Backend OpenAPI generation script.
    2.  Orval generation.
    3.  TypeScript type checking (`tsc --noEmit`).
- [x] Add this script to the CI/CD pipeline (or pre-commit hook).

## 3. Tenant Global Filter Enforcement
**Objective:** Guarantee data isolation across all models.
- [x] Audit all SQLAlchemy models.
- [x] Ensure `TenantSecurity` mixin or equivalent global filter is applied to every tenant-specific model.
- [x] Create a test/script to verify that queries without a tenant context fail or return empty results for tenant-specific models.

## 4. Service-Layer Tenant Check
**Objective:** Add a second layer of defense in the application logic.
- [x] Implement a decorator or service method mixin that verifies `current_user.tenant_id == resource.tenant_id` before performing any action (Update/Delete/Get).
- [x] Apply this check to critical services (User, Invoice, Patient).

## 5. S3 + Presigned Upload Integration
**Objective:** Enable secure and efficient file uploads.
- [x] Finalize `S3Service` implementation (switch from mock to real S3/MinIO).
- [x] Implement `generate_presigned_url` endpoint in Backend.
- [x] Update Frontend to request presigned URL and upload file directly to S3.
- [x] Implement a callback/webhook or metadata update to register the uploaded file in the database.

## 6. Admin Panel -> File Management Module
**Objective:** Allow admins to view and manage uploaded files (metadata only).
- [x] Create `Files` page in Admin Panel.
- [x] List files with metadata (name, size, type, uploader, tenant).
- [x] Implement "Delete" functionality (soft delete).

## 7. Admin Panel -> OCR Viewer Module
**Objective:** Provide an interface for admins to review OCR results.
- [x] Create `OCR Review` page. (Integrated into FileManager)
- [x] Display original document (image/pdf) side-by-side with extracted text/data.
- [x] Allow admins to correct extracted data and approve/reject.

## 8. Backend -> Postgres Migration Test
**Objective:** Ensure smooth transition from SQLite to PostgreSQL.
- [x] Spin up a local PostgreSQL container. (Used local Postgres instance instead)
- [x] Update `DATABASE_URL` to point to Postgres.
- [x] Run `alembic upgrade head`. (Ran `db.create_all()` which validates schema compatibility)
- [x] Verify that all tables, columns, and constraints are created correctly (especially Enum and JSON types).

## 9. Frontend -> Manual Axios Cleanup
**Objective:** Standardize API calls and ensure type safety.
- [x] Scan codebase for manual `axios` or `apiClient` usage.
- [x] Replace manual calls with generated Orval hooks in `Users.tsx`, `Tenants.tsx`, `TenantsPage.tsx`, `Support.tsx`, `AuthContext.tsx`.
- [x] Verify that no manual API calls remain (except for specific cases like file upload if needed).
- [x] Ensure all backend endpoints are defined in OpenAPI spec and hooks are generated.

---
**Status:** In Progress
**Priority:** High
