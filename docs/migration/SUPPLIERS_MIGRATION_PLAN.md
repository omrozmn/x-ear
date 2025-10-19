## 2) Files to create and short purpose (<=500 LOC per file guaranteed)

Frontend (apps/web/src):

1. pages/suppliers/index.tsx — SuppliersPage (page wrapper, uses hooks). Purpose: list + header + primary actions.
2. components/suppliers/list/SuppliersList.tsx — virtualized table + pagination + selection.
3. components/suppliers/list/SupplierRow.tsx — single row rendering + actions.

## 3) File contents (high level) — what each file must contain (checklist style)

pages/suppliers/index.tsx

components/suppliers/list/SuppliersList.tsx
- Use react-table + virtualizer, server-side pagination via useSuppliers hook.
- Columns: select, companyName, companyCode, rating, contactPerson, productCount, isActive, actions.

components/suppliers/forms/SupplierForm.tsx
- Sections: Basic (companyName, companyCode, taxNumber, taxOffice), Contact (contactPerson, phone, email, address, city, postalCode), Commercial (paymentTerms, currency, rating, notes).
- Client-side validation using Zod schema from types/suppliers.

components/suppliers/modals/*
- Small, single-responsibility modals. Keep each < 500 LOC. All modal state controlled by parent page or hook.

hooks/suppliers/useSuppliers.ts

services/suppliers/suppliers.api.ts
- Thin wrapper re-exporting generated Orval client methods and mapping request/response shapes if necessary.
- Add guards to convert DB snake_case → camelCase if adapter layer needed (note: Orval generator should already handle shapes).

types/suppliers/supplier.types.ts
- Zod schema for Supplier and ProductSupplierRelation; types for CreateSupplierBody and UpdateSupplierBody; filters schema.
- Export TS types used by hooks and components.

constants/suppliers/constants.ts
- Storage key constants (add entries to global storage-keys.ts too; ADR required).
- DEFAULT_PAGE_SIZE=50, SEARCH_DEBOUNCE_MS=300, RATING_MIN/MAX, CURRENCY list.

backend models & migration
- models use snake_case names and follow index/FK naming conventions (ix_suppliers_company_name, fk_product_suppliers_product_id_products).
- Migration must be delivered and tested: include SQL or Alembic/Prisma migration file. Add rollback SQL.

docs/migrations/suppliers_migration_runbook.md
- Preflight checks: OpenAPI spec includes suppliers endpoints (list exact paths), backup DB snapshot command, maintenance flag instructions.
- Migration steps: apply migration, run data-migration script to map legacy supplier rows → new schema, verify counts, run frontend smoke tests.

## 4) Mapping legacy functions → new files (ensure nothing missing)

This plan is under 500 lines and follows the repository rules in `____rules______/!!RULES!!.md`. If at any implementation step a file risks exceeding 500 LOC, split the file and update this plan with the split mapping before coding.

DETAILED PER-FILE CONTENT (do not implement until this MD is accepted)
---------------------------------------------------------------

This section enumerates exact elements, controls, API calls, and behaviors each frontend file must cover. The purpose is to make sure no legacy function or UI affordance is missed during implementation. Keep each implementation file <500 LOC; if a file threatens to exceed that, split it and update this MD with the exact split mapping before coding.

pages/suppliers/index.tsx (120-220 LOC expected)
- Purpose: top-level route for `/suppliers` with header, primary actions, filters and the list.
- Imports: React, Seo/Title, useSuppliers, SuppliersFilters, SuppliersList, SuppliersStats, NewSupplierButton, keyboardShortcuts helper, toast.
- Layout:
	- Page header: title "Tedarikçiler" and subtitle "Tedarikçi yönetimi" (i18n keys required)
	- Primary actions: New (opens CreateModal), Import (CSV), Export (CSV)
	- Secondary actions: Refresh (refetch), Toggle columns
	- Stats card: total suppliers, active count, suppliers with products
- Behavior:
	- Loads URL query params (page, per_page, search, status, city) and keeps them in sync with filter component
	- Keyboard shortcuts: Cmd/Ctrl+N -> open create, Cmd/Ctrl+F -> focus search, Cmd/Ctrl+R -> refresh
	- Error banner on list fetch error with retry action

components/suppliers/filters/SuppliersFilters.tsx (80-160 LOC)
- Elements to include:
	- Search input (aria-label="Search suppliers") — debounced (SEARCH_DEBOUNCE_MS)
	- Status select (All / Active / Inactive)
	- City autocomplete (server typeahead, fallback to local cache)
	- Sort select (companyName ASC/DESC, rating DESC, createdAt DESC)
	- Reset filters button
	- Share link / copy link control (updates query params)
- Events:
	- onChange -> update query params and call onFiltersChange
	- onClear -> reset filters and call refetch

components/suppliers/list/SuppliersList.tsx (150-300 LOC)
- Table columns:
	- Checkbox select (bulk)
	- Company name (clickable link; opens EditModal)
	- Company code (copy-to-clipboard button)
	- Rating (star view + numeric)
	- Contact person with quick actions (call/email)
	- Phone (tel: link), Email (mailto: link)
	- Products supplied (numeric, clickable -> ProductsModal)
	- Active status (toggle with optimistic update)
	- Created date (formatted)
	- Actions column (Edit, Delete, Products)
- Features:
	- Virtualized rows (performance)
	- Server-side pagination and sorting (pass controls to useSuppliers.list)
	- Bulk actions toolbar when selection present (Delete selected, Export selected, Attach product to selected)
	- Empty state with CTA to create first supplier

components/suppliers/list/SupplierRow.tsx (<=140 LOC)
- Responsibilities:
	- Render single row with proper ARIA attributes
	- Expose callbacks: onEdit, onDelete, onOpenProducts
	- Handle optimistic toggle for isActive using useSuppliers.update

components/suppliers/forms/SupplierForm.tsx (split by sections if >500 LOC)
- Sections and fields (field name -> validation brief):
	- Basic
		- companyName (required, min 1)
		- companyCode (unique, optional)
		- taxNumber (optional, normalized)
		- taxOffice (optional)
	- Contact
		- contactPerson
		- email (zod.email())
		- phone (pattern or E.164 normalized using shared util)
		- mobile
		- fax
		- address (multiline)
		- city
		- postalCode
		- country (select)
	- Commercial
		- paymentTerms (select/free text)
		- currency (from constants)
		- rating (1-5 slider or stars)
		- notes (markdown/plain)
	- Flags & meta
		- isActive (toggle)
		- id, createdAt, updatedAt (hidden)
- UX rules:
	- Save disabled while zod validation fails
	- Show inline validation messages
	- Save button: calls useSuppliers.create/update with Idempotency-Key
	- On network failure: enqueue to outbox and persist temp record in IndexedDB; show toast "Saved offline — will sync"

components/suppliers/modals/CreateModal.tsx / EditModal.tsx / DeleteConfirm.tsx
- CreateModal
	- Contains SupplierForm
	- On success: close and refetch list; offer "Open created supplier" action
- EditModal
	- Loads supplier via useSuppliers.get (use cached copy if available)
	- Allows Save & Close, Save & Continue, Discard changes
- DeleteConfirm
	- Shows consequences (soft-delete) and allows Confirm/Cancel
	- On confirm: call useSuppliers.remove with Idempotency-Key

components/suppliers/modals/ProductsModal.tsx (120-300 LOC)
- Responsibilities:
	- List products for a supplier (call suppliersApi.getProducts)
	- Allow Attach Product: inline selector (product search), fields: supplierProductCode, unitCost, currency, MOQ, leadTimeDays, isPrimary
	- For each relation: Edit relation (open sub-modal), SetPrimary (idempotent call ensures single primary), Remove relation (soft remove)
	- All attach/detach operations use suppliersApi.* with Idempotency-Key and enqueue on network errors

hooks/suppliers/useSuppliers.ts (existing starter was created)
- Exposed methods and behaviors (contract):
	- list(params: {page, per_page, search, filters, sort}) => Promise<{data: Supplier[], meta: Pagination}>
	- get(id: string) => Promise<Supplier>
	- create(body: CreateSupplierBody, opts?: {idempotencyKey?: string}) => Promise<Supplier>
	- update(id: string, body: UpdateSupplierBody, opts?: {idempotencyKey?: string}) => Promise<Supplier>
	- remove(id: string, opts?: {idempotencyKey?: string}) => Promise<boolean>
	- getProducts(supplierId: string) => Promise<ProductSupplierRelation[]>
	- attachProduct(supplierId: string, productId: string, body: ProductSupplierRelationCreate) => Promise<ProductSupplierRelation>
	- detachProduct(psId: string) => Promise<boolean>
	- generateIdempotencyKey() => string
- Error and offline modes:
	- Network errors: enqueue operation to outbox.addOperation({...}) and write a local pending record to IndexedDB with an offline_status flag
	- Validation errors: return structured error {fieldErrors, message}
	- Conflict handling: mark item as 'conflict' in IndexedDB and surface to UI for manual resolution

services/suppliers/suppliers.api.ts
- Contract: re-export the Orval-generated methods (names MUST match the generated client). Examples (verify actual generated names in repo):
	- suppliersGetSuppliers(params)
	- suppliersCreateSupplier(body, opts)
	- suppliersGetSupplier(id)
	- suppliersUpdateSupplier(id, body, opts)
	- suppliersDeleteSupplier(id, opts)
	- suppliersGetSupplierProducts(id)
	- suppliersAddProductSupplier(body, opts)
	- suppliersDeleteProductSupplier(id, opts)
- The wrapper MAY map snake_case→camelCase but must not implement HTTP logic; use generated client only.

types/suppliers/supplier.types.ts
- Requirements:
	- Zod schemas: SupplierSchema, CreateSupplierSchema, UpdateSupplierSchema, ProductSupplierRelationSchema, SuppliersFiltersSchema
	- Exported TS types: Supplier, CreateSupplierBody, UpdateSupplierBody, ProductSupplierRelation, SuppliersFilters
	- Provide examples in a test file to validate parse/serialize behavior

constants/suppliers/constants.ts
- Keys:
	- STORAGE_KEYS.SUPPLIERS_LIST_V1 = 'suppliers_list_v1'
	- STORAGE_KEYS.SUPPLIER_BY_ID_V1 = 'supplier_by_id_v1'
	- DEFAULT_PAGE_SIZE = 50
	- SEARCH_DEBOUNCE_MS = 300
	- CURRENCIES = ['TRY','USD','EUR']
	- RATING_RANGE = {min:1, max:5}

backend models & migration (detailed requirements)
- suppliers table columns (snake_case): id (uuid PK), company_name, company_code, tax_number, tax_office, contact_person, email, phone, mobile, fax, address, city, postal_code, country DEFAULT 'TR', website, payment_terms, currency DEFAULT 'TRY', rating INTEGER, notes TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), deleted_at TIMESTAMPTZ NULL
- product_suppliers pivot: id (uuid), product_id FK, supplier_id FK, supplier_product_code, unit_cost BIGINT, currency, minimum_order_quantity INTEGER, lead_time_days INTEGER, is_primary BOOLEAN DEFAULT false, priority INTEGER DEFAULT 1, notes TEXT, is_active BOOLEAN DEFAULT true, created_at, updated_at, deleted_at
- Migrations must be additive and include indexes: ix_suppliers_company_name, ix_suppliers_company_code (unique?), ix_product_suppliers_product_id
- Provide seed-safe upsert path: upsert by company_code OR by (company_name + tax_number) if company_code missing

data migration script (requirements)
- Must accept CSV or DB connection to legacy data and transform to new schema
- Steps:
	- normalize phone numbers to E.164
	- map currency strings to allowed list
	- map product SKUs to product ids using product mapping file; ambiguous SKUs logged to `migration_discrepancies.csv`
	- write output as insert/upsert SQL or call backend migration API in batches with rate limiting
- Dry-run mode generates a summary report and sample rows for manual verification

tests (detailed)
- Unit tests:
	- types/suppliers: zod parse cases (valid minimal, full, invalid email, missing required)
	- normalization helpers: phone normalization, currency remap
- Integration tests (Vitest + MSW):
	- useSuppliers.list returns data and sets pagination
	- create when offline enqueues to outbox and writes IndexedDB
	- update optimistic UI then reconcile after successful API response
- Contract and CI checks:
	- Spectral rule to ensure OpenAPI contains `/suppliers` operations
	- CI job to run `orval` generation step and ensure no client generation errors
- E2E (Playwright):
	- Create supplier (form fill) -> assert supplier appears in list
	- Attach product to supplier -> assert relation visible on product details page
	- Submit same Idempotency-Key twice -> assert idempotent effect (single created resource)

runbook (expanded)
- Preflight:
	- Create DB snapshot and note the snapshot ID
	- Run schema diff: `git diff services/backend/migrations` and review
	- Dry-run data migration and inspect `migration_preview.json`
- Execution:
	- Apply DB migration
	- Run data migration in batches (monitor logs)
	- Run backend smoke tests
	- Deploy frontend behind feature toggle and run Playwright smoke tests
- Rollback:
	- If migration fails, restore DB from snapshot and revert migration commit; notify stakeholders

acceptance verification (expanded)
1. Spectral and OpenAPI checks pass
2. Orval client builds successfully and the suppliers API methods exist in generated client
3. ESLint/TypeScript checks show no manual fetch() usages in new files
4. All frontend files for suppliers are <500 LOC or split with MD updated accordingly
5. Unit + integration tests pass locally
6. Playwright smoke test on staging passes

ADR summary (detailed)
- ADR-001: Central storage keys in `src/constants/storage-keys.ts`. Benefit: single discoverable registry for cache keys, safe renames, and migration strategy. Migration impact: update cached key names in migration runbook.
- ADR-002: Orval-only FE HTTP client. Benefit: single source of truth for contract and auto-typed clients. Rejected: hand-coded fetch wrappers (error-prone, duplicative).

Split policy reminder
- When a file is split, append a new section to this MD specifying the new filenames and a 1-line responsibility for each. Example split: `components/suppliers/forms/SupplierForm.Basic.tsx` (fields: companyName, companyCode, taxNumber), `components/suppliers/forms/SupplierForm.Contact.tsx` (contact fields), `components/suppliers/forms/SupplierForm.Commercial.tsx` (commercial fields).

# SUPPLIERS - COMPLETE MIGRATION PLAN

Purpose: define exact files and contents to migrate the legacy Suppliers area into the new monorepo.

Principles (2-sentence reason + 2-sentence expected outcome):
- Reason: Suppliers are core to inventory, product relations and procurement flows; migrating them correctly preserves business logic and reporting. We must follow SPEC→CODE→RUN and repo rules (no new endpoints without OpenAPI, 500 LOC per file).
- Outcome: produce a spec-first, contract-aligned set of frontend and backend artifacts with no missing legacy functions; outcome includes verification steps, tests, and rollback notes.

## 1) Where files will live in the monorepo

All frontend code lives under apps/web (monorepo convention). Backend artifacts (models/migrations) live under services/backend (or repo backend layout).

- apps/web/src/pages/suppliers/  # page and route files
- apps/web/src/components/suppliers/  # UI components (list, forms, modals, tabs)
- apps/web/src/hooks/suppliers/  # data hooks and offline helpers
- apps/web/src/services/suppliers/  # FE-side service wrappers, normalization, storage
- apps/web/src/types/suppliers/  # Zod/TS types and API shapes
- apps/web/src/constants/suppliers/  # constants, storage-keys additions
- services/backend/src/models/  # db models (suppliers, product_suppliers)
- services/backend/migrations/  # alembic/prisma migrations
- docs/migrations/  # migration runbook snippets (for ops)

Note: names and locations mirror `PATIENTS` plan layout to keep consistency.

## 2) Files to create and short purpose (<=500 LOC per file guaranteed)

Frontend (apps/web/src):

1. pages/suppliers/index.tsx — SuppliersPage (page wrapper, uses hooks). Purpose: list + header + primary actions.
2. components/suppliers/list/SuppliersList.tsx — virtualized table + pagination + selection.
3. components/suppliers/list/SupplierRow.tsx — single row rendering + actions.
4. components/suppliers/forms/SupplierForm.tsx — create/edit form split into sections (basic, contact, commercial).
5. components/suppliers/modals/{CreateModal,EditModal,ProductsModal,DeleteConfirm}.tsx — modal UIs.
6. components/suppliers/filters/SuppliersFilters.tsx — search & filters UI.
7. hooks/suppliers/useSuppliers.ts — main hook (list/get/create/update/delete + offline sync + idempotency wrapper).
8. services/suppliers/suppliers.api.ts — thin wrapper over Orval-generated client (no manual fetch()).
9. services/suppliers/suppliers.normalize.ts — normalization helpers.
10. types/suppliers/supplier.types.ts — Zod schemas + TS types (Supplier, CreateSupplierBody, ProductSupplierRelation).
11. constants/suppliers/constants.ts — pagination, debounce, tab ids, storage key entries.

Backend (services/backend/src):

12. models/suppliers.py — DB model (snake_case columns, created_at/updated_at/deleted_at). Add index/fk names per rules.
13. models/product_suppliers.py — pivot model for product↔supplier relations.
14. migrations/xxxx_add_suppliers_tables.sql (or alembic/prisma artifact) — migration file.

Docs & ADRs:

15. docs/migrations/suppliers_migration_runbook.md — run steps for data migration, verification, rollback.
16. docs/migrations/ADR-suppliers-storage-keys.md — short ADR explaining new storage key and alternatives.

## 3) File contents (high level) — what each file must contain (checklist style)

pages/suppliers/index.tsx
- Import `useSuppliers` hook, `SuppliersFilters`, `SuppliersList`, top-level header, Stats card.
- Handle loading/error states, keyboard shortcuts (Cmd+N, Cmd+F, Cmd+R) wired to components.

components/suppliers/list/SuppliersList.tsx
- Use react-table + virtualizer, server-side pagination via useSuppliers hook.
- Columns: select, companyName, companyCode, rating, contactPerson, productCount, isActive, actions.
- Actions: open edit modal, open products modal, soft-delete (confirm), mark primary supplier for product flows.

components/suppliers/forms/SupplierForm.tsx
- Sections: Basic (companyName, companyCode, taxNumber, taxOffice), Contact (contactPerson, phone, email, address, city, postalCode), Commercial (paymentTerms, currency, rating, notes).
- Client-side validation using Zod schema from types/suppliers.
- On submit, call create/update from useSuppliers with idempotency key from common hook.

components/suppliers/modals/*
- Small, single-responsibility modals. Keep each < 500 LOC. All modal state controlled by parent page or hook.

hooks/suppliers/useSuppliers.ts
- Expose: list(params), get(id), create(data), update(id,data), delete(id), getProducts(supplierId), attachProduct(productId,supplierMeta), detachProduct(psId).
- Implement optimistic updates where safe, fallback to IndexedDB on network errors.
- Use idempotency key for create/update mutations; call storage-keys migrator where needed.
- Ensure all mutations go through Orval-generated client methods (e.g., suppliersCreateSupplier, suppliersGetSuppliers, suppliersDeleteSupplier, suppliersAddProductSupplier, suppliersDeleteProductSupplier).

services/suppliers/suppliers.api.ts
- Thin wrapper re-exporting generated Orval client methods and mapping request/response shapes if necessary.
- Add guards to convert DB snake_case → camelCase if adapter layer needed (note: Orval generator should already handle shapes).

types/suppliers/supplier.types.ts
- Zod schema for Supplier and ProductSupplierRelation; types for CreateSupplierBody and UpdateSupplierBody; filters schema.
- Export TS types used by hooks and components.

constants/suppliers/constants.ts
- Storage key constants (add entries to global storage-keys.ts too; ADR required).
- DEFAULT_PAGE_SIZE=50, SEARCH_DEBOUNCE_MS=300, RATING_MIN/MAX, CURRENCY list.

backend models & migration
- models use snake_case names and follow index/FK naming conventions (ix_suppliers_company_name, fk_product_suppliers_product_id_products).
- Migration must be delivered and tested: include SQL or Alembic/Prisma migration file. Add rollback SQL.

docs/migrations/suppliers_migration_runbook.md
- Preflight checks: OpenAPI spec includes suppliers endpoints (list exact paths), backup DB snapshot command, maintenance flag instructions.
- Migration steps: apply migration, run data-migration script to map legacy supplier rows → new schema, verify counts, run frontend smoke tests.
- Rollback: revert migration, restore snapshot, clear frontend caches.

## 4) Mapping legacy functions → new files (ensure nothing missing)

- Legacy suppliers.html UI behaviors (search, filters, pagination, keyboard shortcuts) → SuppliersPage + SuppliersFilters + SuppliersList + keyboard bindings.
- suppliers-api.js (legacy) → services/suppliers/suppliers.api.ts calling Orval client. Confirm Orval generated methods: suppliersGetSuppliers, suppliersCreateSupplier, suppliersDeleteSupplier, suppliersAddProductSupplier, suppliersDeleteProductSupplier are present (found in xEarCRMAPIAutoGenerated.ts).
- suppliers-state.js → useSuppliers hook + local IndexedDB storage service (reuse existing indexeddb outbox patterns from patients plan).
- suppliers-table.js → SuppliersList.tsx (virtualized via tanstack/react-table + virtualizer).
- suppliers-modal.js → modals files (Create/Edit/Products).
- product supplier relation features (add/remove relation, set primary) → attachProduct/detachProduct in useSuppliers; product side uses existing product pages to call product-suppliers endpoints.

Cross-checks performed: searched repo and found Orval generated client includes Suppliers methods; legacy inventory/uts code references supplier fields — ensure mapping for supplierName/supplierCode in normalization helper.

## 5) Tests and verification

- Unit tests (Vitest) for normalization helpers, zod validation schemas.
- Integration tests for useSuppliers hook with MSW mocking Orval endpoints (happy path + offline fallback).
- Contract tests: ensure OpenAPI spec includes suppliers endpoints and frontend uses generated client. Add spectral check reminder in PR template.
- E2E smoke test (Playwright): open suppliers page, create supplier (UI), search, attach product, delete supplier (soft delete), verify inventory/product pages reflect changes.

## 6) Rollback and data migration notes

- Always take DB snapshot before running migrations.
- Provide migration script with idempotent behavior (safe re-run) and a verification step that compares counts and a small sample of rows.
- Rollback: include SQL to drop tables or revert schema; guidance to restore from snapshot if data divergence.

## 7) ADRs and decisions

- ADR: No new public endpoints unless missing in OpenAPI. We will reuse existing endpoints found in generated client. If a missing endpoint is required, add OpenAPI definition first.
- ADR: Storage key added to storage-keys.ts; rationale: preserve offline cache and allow smooth migration. Alternatives rejected: encode in existing keys (complex) or avoid offline cache (bad UX).

## 8) Acceptance criteria (must all be satisfied)

1. All legacy UI behaviors are implemented (search, filters, pagination, keyboard shortcuts, modals, attach/detach product relations).
2. No manual fetch() calls; only Orval-generated client used.
3. All files <= 500 LOC. If any proposed file would exceed 500 LOC, split and update plan before implementing.
4. OpenAPI contract includes suppliers endpoints; Spectral lint passes locally.
5. Alembic/Prisma migration present and applied in staging; data migration script available and idempotent.
6. Unit + integration + contract tests green in CI for the feature branch.

## 9) Next steps (practical)

1. Create `types/suppliers/supplier.types.ts` and `constants/suppliers/constants.ts` (Phase A).
2. Add storage-keys entry and ADR doc.
3. Add backend migration skeleton (models + migration file) and request DB snapshot for staging run.
4. Implement `useSuppliers` and thin API wrapper; write unit tests for normalization and zod schemas.
5. Implement UI components in order: SuppliersPage -> Filters -> List -> Forms -> Modals.
6. Add integration tests + Playwright smoke test, run local spectral/OpenAPI checks.

---

Completion note: this plan is under 500 lines and follows the repository rules in `____rules______/!!RULES!!.md`. If at any implementation step a file risks exceeding 500 LOC, split the file and update this plan with the split mapping before coding.
