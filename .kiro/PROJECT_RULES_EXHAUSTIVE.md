# Project Rules (Exhaustive) — X-Ear CRM MVP
Generated: 2026-01-22

This document codifies current, observed system rules (what the codebase actually enforces or expects) and anchors each rule to repository evidence so owners can approve and lock them.

**Guidance:** rules are written as "Rule: ..." followed by Evidence: repository file links. Lines/specific snippets are included in followups on request.

---

## 0) Global Invariants (System-wide)

### 0.1 API Contract Invariants
- Rule: `openapi.yaml` is the primary source-of-truth for API shapes and operationIds; all frontend clients are generated from it.
  Evidence:
  - OpenAPI source: [x-ear/openapi.yaml](x-ear/openapi.yaml)
  - Generation scripts referenced in [x-ear/package.json](x-ear/package.json) (`gen:api`, `sync:api:web`) and backend script [x-ear/apps/api/scripts/generate_openapi.py](x-ear/apps/api/scripts/generate_openapi.py)
  - Orval configuration: [x-ear/apps/web/orval.config.mjs](x-ear/apps/web/orval.config.mjs)
  - Generated clients: [x-ear/apps/web/src/api/generated](x-ear/apps/web/src/api/generated)

- Rule: OperationId stability is required — changing `operationId` must be an explicit, owner-approved change.
  Evidence:
  - OperationId guidance and rules: [.kiro/steering/architectural-analysis.md](.kiro/steering/architectural-analysis.md)
  - OpenAPI generated snapshot guidance: [x-ear/.operation-ids-snapshot.txt](x-ear/.operation-ids-snapshot.txt)
  - CI expectations in [x-ear/.github/workflows/ci.yml](x-ear/.github/workflows/ci.yml) (api-sync-check job uses generation and diff checks)

### 0.2 Envelope & Case Rules (as implemented)
- Rule: API JSON fields are canonicalized to `camelCase` at the public boundary; backend Pydantic schemas use snake_case attributes with aliasing.
  Evidence:
  - Schema aliasing & canonical case specs: [.kiro/specs/canonical-case-conversion/design.md](.kiro/specs/canonical-case-conversion/design.md)
  - Implementation references: `hybridCamelize` / `camelizeKeys` notes in [COMPREHENSIVE_SPEC_TASK_VALIDATION.md](COMPREHENSIVE_SPEC_TASK_VALIDATION.md) and many mutator references in `apps/web/src/api/orval-mutator.ts`.
  - Reports showing historical mismatch and mitigation: [gap_analysis.md](gap_analysis.md)

- Rule (implementation caveat): Frontend uses an adapter/mutator that camelizes response payloads and extracts `data` from `ResponseEnvelope` when present.
  Evidence:
  - FE mutator: [x-ear/apps/web/src/api/orval-mutator.ts](x-ear/apps/web/src/api/orval-mutator.ts)
  - Generated client barrel & aliases: [x-ear/apps/web/src/api/generated/aliases.ts](x-ear/apps/web/src/api/generated/aliases.ts)

### 0.3 Auth / Session Invariants
- Rule: Authentication endpoints and tokens follow OpenAPI definitions (accessToken/refreshToken camelCase). Backend must serialize auth responses using schemas with `by_alias=True`.
  Evidence:
  - Auth schema examples and requirements: [.kiro/specs/auth-boundary-migration/requirements.md](.kiro/specs/auth-boundary-migration/requirements.md)
  - OpenAPI auth endpoints: [x-ear/apps/openapi.generated.yaml](x-ear/apps/openapi.generated.yaml) and [x-ear/openapi.yaml](x-ear/openapi.yaml)

---

## 1) Web App — Pages (Route-by-Route)
Note: I scanned `x-ear/apps/web/src/pages` and `x-ear/apps/web/src/routes` and mapped pages that perform queries/mutations; below are prioritized pages and rules. Full per-page extraction is available on demand.

### 1.1 /campaigns — Campaigns Page
#### Purpose
- List & manage tenant campaigns (read + create/update/delete by tenant admins).
#### Data sources (queries/mutations)
- Uses generated client endpoints under `campaigns` tag via Orval. See [x-ear/apps/web/src/api/generated/campaigns](x-ear/apps/web/src/api/generated/campaigns).
#### Business rules (explicit)
- Tenant-scoped: only returns campaigns for current tenant (enforced by backend middleware).
#### Implicit rules / assumptions
- Query paging uses `page`/`perPage` camelCase form (adapter normalizes where necessary).
#### Evidence
- Page files: `x-ear/apps/web/src/pages/campaigns` (search result references) and generated API: [x-ear/apps/web/src/api/generated/campaigns](x-ear/apps/web/src/api/generated/campaigns)

### 1.2 /invoices — Invoice Management (critical)
#### Purpose
- Create, issue, PDF, send-to-GIB, SGK interactions.
#### Data sources (queries/mutations)
- Uses endpoints: `/api/invoices`, `/api/invoices/{id}/issue`, `/api/invoices/{id}/send-to-gib`, `/api/invoices/bulk_upload`. See [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md) for list.
#### Business rules (explicit)
- Invoices must include `items[]`, `sgkScheme`/`sgkSupport` when SGK is selected; currency rules: TRY for SGK scenarios.
#### Evidence
- UI components: [x-ear/apps/web/src/components/invoices/](x-ear/apps/web/src/components/invoices)
- Orval-generated client usage and endpoints: [birfatura-entegrasyon/generated/ts-client](birfatura-entegrasyon/generated/ts-client)
- SGK pages/components referenced in [HANDOFF_AND_JOB.md](HANDOFF_AND_JOB.md)

### 1.3 /settings/subscription — Subscription Page
- Purpose: manage tenant subscription and plan changes.
- Evidence: `x-ear/apps/web/src/pages/settings/subscription` (scan), OpenAPI subscription endpoints in [x-ear/apps/openapi.generated.yaml](x-ear/apps/openapi.generated.yaml)

### 1.4 Parties / Patients / Patient Details
- Purpose: patient CRUD and subresources (hearing tests, e-receipts).
- Evidence: FE adapter `@/api/client/parties.client` (see [x-ear/apps/web/src/api/client/parties.client.ts](x-ear/apps/web/src/api/client/parties.client.ts)) and OpenAPI routes [x-ear/apps/openapi.generated.yaml](x-ear/apps/openapi.generated.yaml)

> Note: This section is intentionally focused on high-impact pages (invoices, payments, auth, parties, SGK). If you want a full per-file extraction for every single page, I can generate it next — it will create a lengthy document mapping each page to specific lines and hooks.

---

## 2) Web App — Modals (Modal-by-Modal)
We cataloged modal components that perform mutations (create/update/delete). Sample entries below; full scan available.

### 2.1 InvoiceCreateModal / InvoiceFormExtended
#### Trigger conditions
- Triggered from invoice list "Create" or from patient page "Create Invoice".
#### Payload construction rules
- `items[]` required; SGK fields included when SGK selected; currency MUST be TRY for SGK flows.
#### Fail behavior
- Show toast with server error; do not auto-retry on idempotency error.
#### Evidence
- Components: [x-ear/apps/web/src/components/invoices/InvoiceScenarioSection.tsx](x-ear/apps/web/src/components/invoices)
- Hand-off notes: [HANDOFF_AND_JOB.md](HANDOFF_AND_JOB.md)

---

## 3) Web App — Shared Business Components
(Only components with mapping/business logic shown)
- `PartySalesTab` — uses generated `sales` endpoints; evidence: [x-ear/apps/web/src/api/generated/sales](x-ear/apps/web/src/api/generated/sales)
- `ProductLinesSection` — deep-import risk noted in [COMPREHENSIVE_SPEC_TASK_VALIDATION.md](.kiro/specs/frontend-adapter-layer/tasks.md)

---

## 4) Admin App — Pages & Flows
Major admin flows: Billing, Plans, Tenants, Invoices. Admin clients also use Orval-generated `admin-*` tags. Evidence:
- Admin generated clients: [x-ear/apps/web/src/api/generated/admin-*](x-ear/apps/web/src/api/generated)
- Admin usage examples: `x-ear/apps/admin/src/lib/api/*` (see `apps_admin_usequery.txt` report)

---

## 5) Backend — API Rules (Router-by-Router)
I scanned `x-ear/apps/api/routers` and `x-ear/apps/api/routes` and prioritized critical routers.

### Example: /api/payments/paytr/initiate
- Response shape: OpenAPI defines a `PaymentsInitiate` response. FE expects a stable `operationId` and shape.
- Auth: tenant-level auth required (OAuth2/JWT)
- Evidence: OpenAPI entries in [x-ear/openapi.yaml](x-ear/openapi.yaml) and router implementations under [x-ear/apps/api/routers](x-ear/apps/api/routers)

### Example: /api/invoices
- Response envelope: endpoints return `ResponseEnvelope` in OpenAPI, but runtime historically returned mixed shapes. FE adapter must handle both.
- Evidence: OpenAPI and gap analysis: [x-ear/openapi.yaml](x-ear/openapi.yaml), [gap_analysis.md](gap_analysis.md), generated clients in `birfatura-entegrasyon` and [x-ear/apps/web/src/api/generated/invoices](x-ear/apps/web/src/api/generated/invoices)

> Full router-by-router extraction is possible; I recommend generating a focused list for the top 50 endpoints (auth, payments, invoices, sgk, subscriptions, parties, sales, inventory) next.

---

## 6) Backend — Cross-cutting Rules

### Multi-tenancy
- Rule: Tenant context must be set per-request and reset using token-based reset pattern (no `set_current_tenant_id(None)`).
  Evidence:
  - Spec & tests: [.kiro/steering/tenant-security-rules.md](.kiro/steering/tenant-security-rules.md)
  - Validation in comprehensive spec: [COMPREHENSIVE_SPEC_TASK_VALIDATION.md](COMPREHENSIVE_SPEC_TASK_VALIDATION.md)
  - Tests: `x-ear/apps/api/tests/test_tenant_isolation.py` and similar.

### Serialization
- Rule: Do not return raw ORM `to_dict()` from routers; use Pydantic schema serialization with `by_alias=True`.
  Evidence:
  - CI check in [x-ear/.github/workflows/ci.yml](x-ear/.github/workflows/ci.yml) (backend-lint job checks for `.to_dict()` usage)
  - Gap analysis documenting mismatch: [gap_analysis.md](gap_analysis.md)

### RBAC & permissions
- Rule: Use `require_access(...)` for admin-level endpoints; tenant-level endpoints check tenant-affinity and roles.
  Evidence: references in `.kiro` steering docs and router implementations under `x-ear/apps/api/routers`.

---

## 7) OpenAPI / Orval / Client Rules (as implemented)
- Rule: Use single Orval config per site; generate clients into `apps/web/src/api/generated` and import via adapter barrels (`@/api/generated/index`).
  Evidence:
  - Orval config: [x-ear/apps/web/orval.config.mjs](x-ear/apps/web/orval.config.mjs)
  - Generated clients: [x-ear/apps/web/src/api/generated](x-ear/apps/web/src/api/generated)
  - Deep-import guard in CI: [x-ear/.github/workflows/ci.yml](x-ear/.github/workflows/ci.yml) (Check deep imports step)

---

## 8) CI / Testing Gates (as implemented)
- Blocking checks (intended): TypeScript typecheck, lint, backend tests, api-sync-check. Evidence: [x-ear/.github/workflows/ci.yml](.github/workflows/ci.yml)
- Non-blocking / suppressed patterns observed: several commands use `|| echo "... skipped"` or `|| echo "OpenAPI generation skipped"`, allowing passes despite failure. Evidence: search results in CI file.
- Playwright: Playwright dependency present and smoke tests exist, but Playwright stage currently optional in final gate. Evidence: [x-ear/package.json](x-ear/package.json) devDependencies and CI job `frontend-tests` marked optional in final gate.

---

## 9) DUPLICATE / CONFLICT RULES (CRITICAL SECTION)
List of known conflicting rules discovered during analysis (high priority):

- Conflict-ID: CONF-001
  Rule A:
  - `ResponseEnvelope` expected in OpenAPI (camelCase `data` wrapper)
  - Location: [x-ear/openapi.yaml](x-ear/openapi.yaml)
  Rule B:
  - Some routers return raw non-enveloped JSON or direct `to_dict()` objects (snake_case)
  - Location: multiple router implementations under [x-ear/apps/api/routers](x-ear/apps/api/routers) and GAP analysis: [gap_analysis.md](gap_analysis.md)
  Why conflict matters:
  - FE must tolerate multiple shapes leading to duplicated keys and subtle bugs (payment/invoice flows are fragile).
  Suggested resolution (NO refactor):
  - Canonical owner: Backend Lead. Acceptance: enforce Pydantic `by_alias=True` serialization and add contract integration tests for critical endpoints.

- Conflict-ID: CONF-002
  Rule A:
  - FE should import from barrel `@/api/generated/index` (adapter layer) to insulate operationId changes.
  - Location: CI deep-import check in [x-ear/.github/workflows/ci.yml](x-ear/.github/workflows/ci.yml)
  Rule B:
  - Some UI components use deep imports into generated subpaths (e.g., `@/api/generated/parties/parties`).
  - Location: `COMPREHENSIVE_SPEC_TASK_VALIDATION.md` notes and `ProductLinesSection` deep import references.
  Why conflict matters:
  - OperationId / generation changes break deep imports in many files; adapter exists but adoption is incomplete.
  Suggested resolution:
  - Canonical owner: Frontend Lead. Acceptance: block CI on deep-import detection and require migration PRs for files flagged.

- Conflict-ID: CONF-003
  Rule A:
  - Case conversion should only emit camelCase (remove snake_case duplicates).
  - Location: canonical-case conversion spec (.kiro)
  Rule B:
  - `hybridCamelize` historical behavior preserved snake_case and camelCase duplicates; some FE code expects hybrid behavior.
  - Location: references in [COMPREHENSIVE_SPEC_TASK_VALIDATION.md](COMPREHENSIVE_SPEC_TASK_VALIDATION.md) and mutator code.
  Why conflict matters:
  - Memory bloat, duplicated keys, ambiguity for downstream systems and analytics.
  Suggested resolution:
  - Canonical owner: API/Adapter owner. Acceptance: replace `hybridCamelize` with `camelizeKeys` and add unit tests; deprecate hybrid behavior with adapters that provide compatibility only when explicitly enabled.

---

## Next Actions / Owner Checklist
- For each canonical owner below, please comment/approve the linked decision docs in `.kiro/decisions/` and sign-off on the acceptance criteria:
  - Backend Lead: [x-ear/.kiro/decisions/01-contract-stability-decision.md](.kiro/decisions/01-contract-stability-decision.md)
  - CI Owner: [x-ear/.kiro/decisions/02-ci-hardening-decision.md](.kiro/decisions/02-ci-hardening-decision.md)
  - Security Owner: [x-ear/.kiro/decisions/03-multi-tenancy-decision.md](.kiro/decisions/03-multi-tenancy-decision.md)

---

## Appendix & Evidence Index (quick links)
- OpenAPI: [x-ear/openapi.yaml](x-ear/openapi.yaml)
- Orval FE config: [x-ear/apps/web/orval.config.mjs](x-ear/apps/web/orval.config.mjs)
- FE generated clients: [x-ear/apps/web/src/api/generated](x-ear/apps/web/src/api/generated)
- FE adapters: [x-ear/apps/web/src/api/client.ts](x-ear/apps/web/src/api/client.ts), [x-ear/apps/web/src/api/client/parties.client.ts](x-ear/apps/web/src/api/client/parties.client.ts)
- CI: [x-ear/.github/workflows/ci.yml](x-ear/.github/workflows/ci.yml)
- Case/camelize specs: [.kiro/specs/canonical-case-conversion/design.md](.kiro/specs/canonical-case-conversion/design.md)
- Tenant rules: [.kiro/steering/tenant-security-rules.md](.kiro/steering/tenant-security-rules.md) and [COMPREHENSIVE_SPEC_TASK_VALIDATION.md](COMPREHENSIVE_SPEC_TASK_VALIDATION.md)
- Gap analysis and high-risk reports: [gap_analysis.md](gap_analysis.md), [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md), [SCRIPT_COMPATIBILITY_REPORT.md](SCRIPT_COMPATIBILITY_REPORT.md)

---

## 10) Expanded High-Impact Rules — Top-50 Endpoints (daha derin)
The list below enumerates the highest-risk endpoints found across the repo (see [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md)). For each endpoint group I capture the concrete rule(s) the UI/backend expect and quick evidence links. This is the focused "top-50" expansion requested for deeper research.
Below are expanded rules for the highest-impact endpoints (concise, owner-ready). Each entry lists: Rule, Request highlights, Response highlights, Auth/permissions, Error/edge cases to assert, Evidence links.

- **/api/invoices**
  - Rule: Create/patch invoice must include `items[]`; if `sgk` is selected then `sgkScheme` and `sgkSupport` are required and currency must equal `TRY`.
  - Request highlights: `items[]` (array of {productId, quantity, unitPrice}), `patientId` when requested for SGK; webhook/idempotency headers allowed for bulk upload.
  - Response highlights: Standard `ResponseEnvelope` wrapping invoice DTO in camelCase (invoiceId, issuedAt, totalAmount, currency).
  - Auth: tenant-scoped; only tenant admin or authorized clinician may create/issue.
  - Errors/edge: Missing items -> 400; SGK validation -> 422 with `sgkErrorCode`. Bulk uploads return per-item statuses.
  - Evidence: [x-ear/openapi.yaml](x-ear/openapi.yaml) (invoices tag), UI: [x-ear/apps/web/src/components/invoices](x-ear/apps/web/src/components/invoices), analysis: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md)

- **/api/invoices/{invoice_id}/issue** and **/api/invoices/{invoice_id}/send-to-gib**
  - Rule: Issue/send endpoints must return a `ResponseEnvelope` with `data.issueResult` object; failure codes are explicit for tax/GIB errors.
  - Request highlights: POST with invoice_id path param; optional `testMode` flag.
  - Response highlights: `issueResult {status, gibsReference?, errors?}` inside `data`.
  - Auth: tenant-scoped, role: invoice.issue.
  - Errors/edge: GIB rejection -> 409 with `gibError` payload; network failures -> retryable 502/504.
  - Evidence: [x-ear/openapi.yaml](x-ear/openapi.yaml) (invoices.issue), generated client: [x-ear/apps/web/src/api/generated/invoices](x-ear/apps/web/src/api/generated/invoices)

- **/api/invoices/{invoice_id}/pdf**
  - Rule: Returns binary `application/pdf`; endpoints must set content-disposition for attachment when requested.
  - Request highlights: GET path param `invoice_id`, optional `download=true` query.
  - Response highlights: binary stream, stable Content-Type `application/pdf`.
  - Auth: tenant-scoped read permission.
  - Errors/edge: Missing PDF -> 404; corrupted generation -> 500 with diagnostic id.
  - Evidence: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md), FE download flows in `x-ear/apps/web/src/components/invoices`

- **/api/sales/{sale_id}/invoice** and **/api/sales/{sale_id}/invoice/pdf**
  - Rule: Sales -> invoice conversion preserves numeric `sgkCoverage` and returns invoice metadata aliased to camelCase.
  - Request highlights: POST to convert sale -> invoice; may include `forceRecalc`.
  - Response highlights: sale + embedded invoice metadata in `data` envelope.
  - Auth: tenant-scoped; sale owner or billing role.
  - Errors/edge: price recalculation mismatch -> 409; missing serials -> 422.
  - Evidence: `fix_sale_data.py`, `debug_sale_db.py`, generated clients under [x-ear/apps/web/src/api/generated/sales](x-ear/apps/web/src/api/generated/sales)

- **/api/sales/{sale_id}/payments** and **/api/sales/{sale_id}/installments/{id}/pay**
  - Rule: Payment endpoints produce a payment session payload matching `PaymentsInitiate` schema; server enforces idempotency keys.
  - Request highlights: POST with amount, currency, idempotency-key header.
  - Response highlights: `redirectUrl` or `gatewayToken` in `data`.
  - Auth: tenant-scoped; payment-init role.
  - Errors/edge: insufficient funds -> 402; duplicate idempotency -> 200 with existing session.
  - Evidence: [x-ear/openapi.yaml](x-ear/openapi.yaml), tests referenced in [.kiro/decisions/02-ci-hardening-decision.md]

- **/api/payments/paytr/initiate**
  - Rule: Stable `operationId` and JSON shape; FE expects `redirectUrl` or `gatewayToken` in camelCase.
  - Request highlights: amount, returnUrl, cancelUrl, metadata.
  - Response highlights: `data {redirectUrl?, gatewayToken?, expiresAt?}`.
  - Auth: tenant-level; authenticated merchant.
  - Errors/edge: gateway downtime -> 502, validation -> 400.
  - Evidence: [x-ear/apps/web/src/api/generated/payments](x-ear/apps/web/src/api/generated/payments), [x-ear/openapi.yaml](x-ear/openapi.yaml)

- **/api/sgk/** (documents, workflow, upload, e-receipt query)
  - Rule: SGK endpoints model a stateful workflow (create -> upload -> process -> e-receipt); endpoints are tenant-scoped and require a patientId for patient-specific actions.
  - Request highlights: multipart for uploads, workflow actions as PATCHs with `workflowId`.
  - Response highlights: workflow `status` (created, uploaded, processed, failed) and `documentUrls`.
  - Auth: tenant + patient-affinity; extra validation for SGK-certified roles.
  - Errors/edge: upload virus detection -> 422; rate-limit patient-rights queries -> 429.
  - Evidence: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md), birfatura integrations in `birfatura-entegrasyon`, FE hooks: [x-ear/apps/web/src/hooks/sgk]

- **/api/subscriptions/** (register-and-subscribe, complete-signup, current, subscribe)
  - Rule: Subscription endpoints return `customerId`/`subscriptionId` in camelCase and accept plan/payment payloads per OpenAPI schema.
  - Request highlights: planId, paymentMethod, coupon (optional).
  - Response highlights: `data {customerId, subscriptionId, status}`.
  - Auth: public for initial register+subscribe, tenant-auth for `current`.
  - Errors/edge: payment rejection -> 402; plan not available -> 404.
  - Evidence: [x-ear/apps/openapi.generated.yaml](x-ear/apps/openapi.generated.yaml), FE page: [x-ear/apps/web/src/pages/settings/subscription](x-ear/apps/web/src/pages/settings/subscription)

- **/api/parties/** and subresources
  - Rule: Migration from `patients.*` to `parties.*` is complete at API surface; front-end must use `parties.client` adapter to avoid deep-imports.
  - Request highlights: partyCRUD, subresources (hearings, receipts) via nested routes.
  - Response highlights: canonical party DTO in camelCase; `id` stable UUID.
  - Auth: tenant-scoped; patient-affinity where required.
  - Errors/edge: legacy `patients.*` routes may still exist; client must normalize both shapes when encountered.
  - Evidence: [x-ear/apps/web/src/api/client/parties.client.ts](x-ear/apps/web/src/api/client/parties.client.ts), [COMPREHENSIVE_SPEC_TASK_VALIDATION.md](COMPREHENSIVE_SPEC_TASK_VALIDATION.md)

- **/api/inventory/** (listing, assign, serials, low-stock, stats)
  - Rule: Inventory endpoints return arrays inside `ResponseEnvelope` and `inventoryItem` must use camelCase; assignment endpoints require `assigneeId` and `serials[]` where relevant.
  - Request highlights: filters (warehouseId, lowStock boolean), POST assign with `itemId` and `assigneeId`.
  - Response highlights: paged envelope with `items[]`, `total`.
  - Auth: tenant + inventory role.
  - Errors/edge: serial duplication -> 409; negative stock -> 422.
  - Evidence: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md), FE hooks: [x-ear/apps/web/src/hooks/useInventory.ts]

- **/api/reports/** (remaining-payments, aggregates)
  - Rule: Reports must return typed numeric fields (no stringified numbers or nulls); clients assert types in contract tests.
  - Request highlights: date ranges, groupBy, filters.
  - Response highlights: aggregated numeric metrics under `data` object.
  - Auth: tenant-scoped, report-read role.
  - Errors/edge: division-by-zero aggregations -> 500 with safe defaults; missing date range -> 400.
  - Evidence: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md#L270-L280)

- **/api/sgk/patient-rights/query** and **/api/sgk/documents/{id}**
  - Rule: Patient rights queries require tenant+patient authorization and are rate-limited; document endpoints return signed URLs with expiry.
  - Request highlights: patientId, identity info for rights query.
  - Response highlights: `rights[]` structure and `documentUrl` with `expiresAt`.
  - Auth: tenant-scoped, extra validation for identity.
  - Errors/edge: unauthorized patient -> 403; rate-limit -> 429.
  - Evidence: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md#L390-L410), FE hooks

- **/api/admin/{id}/sales**
  - Rule: Admin sales endpoints produce tenant-agnostic aggregates and require elevated RBAC via `require_access`.
  - Request highlights: admin-token, tenantId optional for scoping.
  - Response highlights: aggregated numbers in `data`.
  - Auth: admin RBAC only.
  - Errors/edge: insufficient privileges -> 403; malformed tenant filter -> 400.
  - Evidence: admin generated clients under [x-ear/apps/web/src/api/generated/admin-*](x-ear/apps/web/src/api/generated)

For the remaining prioritized endpoints referenced in the master list (sales, appointments, devices, etc.) apply the same template: assert request required fields, response envelope presence, camelCase aliasing, tenant scoping, and explicit errors. Critical evidence sources are:

- OpenAPI canonical: [x-ear/openapi.yaml](x-ear/openapi.yaml)
- Generated FE clients: [x-ear/apps/web/src/api/generated](x-ear/apps/web/src/api/generated)
- Backend routers: [x-ear/apps/api/routers](x-ear/apps/api/routers)
- Analysis & migration notes: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md), [COMPREHENSIVE_SPEC_TASK_VALIDATION.md](COMPREHENSIVE_SPEC_TASK_VALIDATION.md), [gap_analysis.md](gap_analysis.md)

If you want a literal line-by-line snippet mapping for each endpoint (file + exact lines + snippet), I can produce that as a follow-up export (long). Recommended immediate next step: generate a PR that adds contract tests for the endpoints above and enforces `by_alias=True` serialization on invoice/payment/sgk endpoints.

- **/api/invoices/{invoice_id}/issue** and **/api/invoices/{invoice_id}/send-to-gib**
  - Rule: Operation must return standardized `ResponseEnvelope` with `data` containing `issueResult` (camelCase) and error codes for tax/GIB failures.
  - Evidence: OpenAPI and generation artifacts: [x-ear/openapi.yaml](x-ear/openapi.yaml), [x-ear/apps/web/src/api/generated/invoices](x-ear/apps/web/src/api/generated/invoices)

- **/api/invoices/{invoice_id}/pdf**
  - Rule: Returns a binary PDF; client expects stable Content-Type and `application/pdf` streaming behavior.
  - Evidence: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md#L150-L160), FE usage (invoice PDF download flows)

- **/api/sales/{sale_id}/invoice** and **/api/sales/{sale_id}/invoice/pdf**
  - Rule: Sales -> invoice relationship must preserve `sgk_coverage` as numeric per-unit aggregation; API returns sale with embedded invoice metadata (camelCase aliases).
  - Evidence: `fix_sale_data.py` and `debug_sale_db.py` (data migration & debugging), [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md)

- **/api/sales/{sale_id}/payments** and **/api/sales/{sale_id}/installments/{id}/pay**
  - Rule: Payment initiation returns payment session payload (PayTR) matching `PaymentsInitiate` OpenAPI schema; idempotency must be enforced server-side.
  - Evidence: [x-ear/openapi.yaml](x-ear/openapi.yaml), CI Playwright smoke tests reference (auth + payments) in [.kiro/decisions/02-ci-hardening-decision.md](.kiro/decisions/02-ci-hardening-decision.md)

- **/api/payments/paytr/initiate**
  - Rule: Stable `operationId` and JSON shape; FE expects `redirectUrl` or `gatewayToken` fields in camelCase.
  - Evidence: Generated client in [x-ear/apps/web/src/api/generated/payments](x-ear/apps/web/src/api/generated/payments)

- **/api/sgk/** (documents, workflow, upload, e-receipt query)
  - Rule: SGK flows are stateful workflows (create -> upload -> process -> e-receipt). Currency/field constraints apply; endpoints must be tenant-scoped and require patientId in path or query.
  - Evidence: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md#L100-L140), [birfatura-entegrasyon/resources](birfatura-entegrasyon/resources), FE hooks: `x-ear/apps/web/src/hooks/sgk/*`

- **/api/subscriptions/** (register-and-subscribe, complete-signup, current, subscribe)
  - Rule: Subscription onboarding must accept payment and plan selection; responses must match OpenAPI subscription schemas and include `customerId`/`subscriptionId` camelCase fields.
  - Evidence: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md#L150-L170), FE page: `x-ear/apps/web/src/pages/settings/subscription`

- **/api/parties/** and subresources (patients → parties migration)
  - Rule: All references moved from `patients.*` → `parties.*`; adapter `parties.client` must be used instead of deep imports into generated clients.
  - Evidence: Migration verification in [COMPREHENSIVE_SPEC_TASK_VALIDATION.md](COMPREHENSIVE_SPEC_TASK_VALIDATION.md), adapter: [x-ear/apps/web/src/api/client/parties.client.ts](x-ear/apps/web/src/api/client/parties.client.ts)

- **/api/inventory/** (listing, assign, serials, low-stock, stats)
  - Rule: Inventory endpoints return arrays wrapped in `ResponseEnvelope`; `inventoryItem` fields must use camelCase names for client consumption; deep imports exist and should be migrated to adapters.
  - Evidence: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md#L130-L140), SCRIPT_COMPATIBILITY_REPORT.md, FE hooks: `x-ear/apps/web/src/hooks/useInventory.ts`

- **/api/reports/remaining-payments, /api/reports/**
  - Rule: Reports endpoints return aggregated numeric fields; clients expect consistent numeric types (no null strings). Add contract tests to assert numeric typing.
  - Evidence: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md#L270-L280)

- **/api/sgk/patient-rights/query** and **/api/sgk/documents/{id}**
  - Rule: Patient rights queries must be rate-limited and authorize only tenant-scoped patients; responses require stable `rights` structure.
  - Evidence: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md#L390-L410), FE hooks in `x-ear/apps/web/src/hooks/sgk`

- **/api/admin/{id}/sales**
  - Rule: Admin endpoints return tenant-agnostic aggregated data; require elevated permissions and clear RBAC enforcement.
  - Evidence: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md#L260-L270), admin client modules

- Remaining prioritized endpoints (summary list; full mapping available on request):
  - `/api/sales`, `/api/sales/{id}`, `/api/sales/{id}/payment-plan`, `/api/sales/recalc`, `/api/sales/logs`
  - `/api/invoices/{id}/send-to-gib`, `/api/invoices/bulk_upload`, `/api/invoices/{id}/pdf`
  - `/api/subscriptions/subscribe`, `/api/subscriptions/current`, `/api/subscriptions/complete-signup`
  - `/api/inventory/{item_id}/assign`, `/api/inventory/{item_id}/serials`, `/api/inventory/stats`, `/api/inventory/low-stock`
  - `/api/sgk/workflow/{id}`, `/api/sgk/workflow/{id}/update`, `/api/sgk/upload`, `/api/sgk/e-receipts/query`
  - `/api/appointments/*`, `/api/devices/*`, `/api/reports/*`
  - Evidence index for these: [NEW_ANALYSIS_REPORT.md](NEW_ANALYSIS_REPORT.md) (master list), router implementations under [x-ear/apps/api/routers](x-ear/apps/api/routers), FE generated clients under [x-ear/apps/web/src/api/generated](x-ear/apps/web/src/api/generated)

---

If you want, I can now:
- (B) Fully expand each of the listed endpoints above into a line-by-line mapping (file + line refs + short snippet) — this will create a long dump but gives precise owner-ready approvals, OR
- (C) Generate a PR that contains these rule changes plus the three decision docs and create CI blockers for deep-imports and operationId snapshot checks.

Which next step do you want? (B = full line-by-line expansion, C = open PR with rules + blockers)

If you approve this structure I will:
- (A) Expand the per-page and per-router sections into a line-by-line mapping (every page, modal, router) and attach snippets/line references, or
- (B) Limit to the top-50 business-critical items (invoices, payments, auth, SGK, subscriptions, parties, sales, inventory) and fully lock the decisions for those.

Which expansion do you want me to do next? (A or B)

## 11) OperationId Evidence — Codebase Snippets
Below are direct codebase evidences (router decorator + function signature snippets) for the endpoints asserted in this document. Each entry includes a file link and a short snippet copied from the router implementation.

- **listInvoices**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py#L40-L46)
  - Snippet:
    ```py
    @router.get("/invoices", operation_id="listInvoices", response_model=ResponseEnvelope[List[InvoiceRead]])
    def get_invoices(
        page: int = 1,
    ```

- **createInvoices**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py#L328-L334)
  - Snippet:
    ```py
    @router.post("/invoices", operation_id="createInvoices", response_model=ResponseEnvelope[InvoiceRead], status_code=201)
    def create_invoice(
        request_data: InvoiceCreate,
    ```

- **createInvoiceSendToGib**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py#L476-L482)
  - Snippet:
    ```py
    @router.post("/invoices/{invoice_id}/send-to-gib", operation_id="createInvoiceSendToGib", response_model=ResponseEnvelope[dict])
    def send_to_gib(
        invoice_id: int,
    ```

- **createInvoiceBulkUpload**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py#L572-L578)
  - Snippet:
    ```py
    @router.post("/invoices/bulk-upload", operation_id="createInvoiceBulkUpload", response_model=ResponseEnvelope[BulkUploadResponse])
    async def bulk_upload_invoices(
        file: UploadFile = File(...),
    ```

- **createInvoiceIssue**
  - Evidence: [x-ear/apps/api/routers/invoices_actions.py](x-ear/apps/api/routers/invoices_actions.py#L24-L30)
  - Snippet:
    ```py
    @router.post("/{invoice_id}/issue", operation_id="createInvoiceIssue", response_model=ResponseEnvelope[InvoiceIssueResponse])
    async def issue_invoice(
        invoice_id: int,
    ```

- **listInvoicePdf**
  - Evidence: [x-ear/apps/api/routers/invoices_actions.py](x-ear/apps/api/routers/invoices_actions.py#L168-L174)
  - Snippet:
    ```py
    @router.get("/{invoice_id}/pdf", operation_id="listInvoicePdf")
    async def serve_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    ```

- **listInvoicePrintQueue**
  - Evidence: [x-ear/apps/api/routers/invoices.py](x-ear/apps/api/routers/invoices.py#L72-L84)
  - Snippet:
    ```py
    @router.get("/invoices/print-queue", operation_id="listInvoicePrintQueue", response_model=ResponseEnvelope[InvoicePrintQueueResponse])
    def get_print_queue(
        access: UnifiedAccess = Depends(require_access("invoices.read")),
    ```

- **listInvoiceSchema**
  - Evidence: [x-ear/apps/api/routers/invoice_management.py](x-ear/apps/api/routers/invoice_management.py#L40-L48)
  - Snippet:
    ```py
    @router.get("/invoice-schema", operation_id="listInvoiceSchema")
    async def get_invoice_schema(db: Session = Depends(get_db)):
    ```

- **createInvoiceSettings**
  - Evidence: [x-ear/apps/api/routers/invoice_management.py](x-ear/apps/api/routers/invoice_management.py#L232-L238)
  - Snippet:
    ```py
    @router.post("/invoice-settings", operation_id="createInvoiceSettings")
    async def update_invoice_settings(
        data: InvoiceSettingsUpdate,
    ```

- **listSales**
  - Evidence: [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py#L256-L262)
  - Snippet:
    ```py
    @router.get("/sales", operation_id="listSales", response_model=ResponseEnvelope[List[SaleRead]])
    def get_sales(
        page: int = Query(1, ge=1),
    ```

- **createPaymentPoPaytrInitiate**
  - Evidence: [x-ear/apps/api/routers/payment_integrations.py](x-ear/apps/api/routers/payment_integrations.py#L136-L142)
  - Snippet:
    ```py
    @router.post("/paytr/initiate", operation_id="createPaymentPoPaytrInitiate", response_model=ResponseEnvelope[PayTRInitiateResponse])
    def initiate_paytr_payment(
        request_data: PayTRInitiateRequest,
    ```

- **createPaymentPoPaytrCallback**
  - Evidence: [x-ear/apps/api/routers/payment_integrations.py](x-ear/apps/api/routers/payment_integrations.py#L274-L282)
  - Snippet:
    ```py
    @router.post("/paytr/callback", operation_id="createPaymentPoPaytrCallback", response_class=PlainTextResponse)
    async def paytr_callback(
        merchant_oid: str = Form(...),
    ```

- **listParties**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py#L40-L46)
  - Snippet:
    ```py
    @router.get("/parties", operation_id="listParties", response_model=ResponseEnvelope[List[PartyRead]])
    def list_parties(
        page: int = 1,
    ```

- **createParties**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py#L98-L104)
  - Snippet:
    ```py
    @router.post("/parties", operation_id="createParties", response_model=ResponseEnvelope[PartyRead], status_code=201)
    def create_party(
        patient_in: PartyCreate,
    ```

- **listInventory**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py#L36-L42)
  - Snippet:
    ```py
    @router.get("/inventory", operation_id="listInventory", response_model=ResponseEnvelope[List[InventoryItemRead]])
    def get_all_inventory(
        page: int = 1,
    ```

- **listReportOverview**
  - Evidence: [x-ear/apps/api/routers/reports.py](x-ear/apps/api/routers/reports.py#L80-L86)
  - Snippet:
    ```py
    @router.get("/reports/overview", operation_id="listReportOverview", response_model=ResponseEnvelope[ReportOverviewResponse])
    def report_overview(
        days: int = Query(30, ge=1, le=365),
    ```

If you want, I can (a) expand this to every `operationId` present in the OpenAPI file (full export), or (b) create a dedicated `x-ear/.kiro/operation_id_evidence.md` that lists every operationId with snippet and an automated check to ensure OpenAPI operationIds match router `operation_id` values. Which do you prefer? 
