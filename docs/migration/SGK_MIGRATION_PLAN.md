# SGK (Sosyal Güvenlik Kurumu) — COMPLETE MIGRATION PLAN

This document is an implementation-grade migration plan for SGK features. It mirrors the structure and level of detail used in `PATIENTS_MIGRATION_PLAN_COMPLETE.md` to make the work estimable and runnable by any engineer on the team.

NOTE: This plan assumes the repository rules: OpenAPI-first (Orval-generated client), reuse `packages/ui-web` primitives, keep files < 500 LOC, use react-hook-form + zod, use TanStack Query for server state, and persist offline tasks to IndexedDB outbox when required.

---

## 1) CURRENT MIGRATION STATUS

PHASE 1 - BASIC SGK LIST + VIEW: NOT STARTED / initial audit complete
- Current: no dedicated SGK page implemented in monorepo; legacy files and mappings exist in `legacy/` and `docs/reports/COMPLETE_MIGRATION_PLAN.md` (see `uts-kayitlari.html` and `uts/` mappings).
- Action: confirm OpenAPI coverage (SGK and UTS endpoints) and regenerate Orval before implementing code.

PHASE 2 - SGK DOCUMENTS & UTS REGISTRATION: PLANNED
- Implement document upload flows, UTS registration pages and background sync/outbox.

PHASE 3 - ADVANCED WORKFLOWS & INTEGRATION: PLANNED
- Background processing, retries, status polling, bulk registrations, audit logs.

---

## 2) HIGH-LEVEL GOALS

- Provide a robust, testable SGK UI surface for listing SGK records, uploading and managing SGK-related documents, and performing ÜTS registrations.
- Ensure all API interactions use Orval-generated client and pass Spectral/OpenAPI lint checks.
- Implement offline-resilient uploads/registrations using the IndexedDB outbox.
- Keep files small and components reusable; extract shared UI into `packages/ui-web` when needed.

---

## 3) NEW DIRECTORY STRUCTURE (500 LOC COMPLIANT)

```
apps/web/src/
├── pages/
│   └── sgk/
│       ├── SGKPage.tsx               # Main SGK list page (container)
│       └── UTSPage.tsx               # ÜTS registrations page
├── components/
│   └── sgk/
│       ├── SGKList.tsx               # List/table of SGK records
│       ├── SGKFilters.tsx            # Filters and search
│       ├── SGKDetail.tsx             # Detail drawer or panel
│       ├── SGKFormModal.tsx          # Create/Edit SGK record
│       ├── DocumentList.tsx          # Documents list for a record
│       ├── DocumentUploadModal.tsx   # File upload modal with preview
│       ├── UTSRegisterModal.tsx      # Modal for starting UTS registrations
│       └── UTSBulkUpload.tsx         # CSV bulk registration UI
├── services/
│   ├── sgk/
│   │   ├── sgk.service.ts            # Orval thin wrapper for SGK endpoints
│   │   └── sgk-documents.service.ts  # Orval wrapper for document endpoints
│   └── uts/
│       └── uts.service.ts            # Orval wrapper for UTS endpoints
├── hooks/
│   ├── sgk/
│   │   ├── useSgk.ts                 # list/get/create/update/delete
│   │   └── useSgkDocuments.ts        # list/upload/delete documents
│   └── uts/
│       └── useUts.ts                 # list registrations, start, poll status
├── types/
│   ├── sgk.ts                         # SGK domain types
│   └── sgk-documents.ts               # Document types
└── utils/
		├── sgk-normalization.ts          # Normalizers between legacy and new shapes
		└── uts-mapping.ts                # Mapping helpers for UTS payloads
```

---

## 4) DETAILED FILE MAP & EXAMPLES

4.1 Services (thin Orval adapters)

- `apps/web/src/services/sgk/sgk.service.ts`
	- Purpose: thin wrapper around Orval-generated SGK client. Keep small; attach Idempotency-Key for mutations.
	- Example:
		```ts
		import { api } from '@/generated/orval';

		export const sgkService = {
			list: (params?: any) => api.sgk.getSgkRecords({ query: params }),
			get: (id: string) => api.sgk.getSgkRecord({ path: { id } }),
			create: (body: any, opts?: { idempotencyKey?: string }) => api.sgk.createSgkRecord({ body, headers: { 'Idempotency-Key': opts?.idempotencyKey } }),
			update: (id: string, body: any, opts?: { idempotencyKey?: string }) => api.sgk.updateSgkRecord({ path: { id }, body, headers: { 'Idempotency-Key': opts?.idempotencyKey } }),
			remove: (id: string, opts?: { idempotencyKey?: string }) => api.sgk.deleteSgkRecord({ path: { id }, headers: { 'Idempotency-Key': opts?.idempotencyKey } }),
		};
		```

- `apps/web/src/services/sgk/sgk-documents.service.ts`
	- Purpose: multipart upload handling, download streaming, delete.
	- Example:
		```ts
		export const sgkDocumentsService = {
			upload: (recordId: string, file: File, opts?: any) => api.sgk.uploadDocument({ path: { recordId }, body: file, headers: { 'Content-Type': 'multipart/form-data', 'Idempotency-Key': opts?.idempotencyKey } }),
			list: (recordId: string) => api.sgk.listDocuments({ path: { recordId } }),
			download: (recordId: string, docId: string) => api.sgk.downloadDocument({ path: { recordId, docId } }),
			remove: (recordId: string, docId: string, opts?: any) => api.sgk.deleteDocument({ path: { recordId, docId }, headers: { 'Idempotency-Key': opts?.idempotencyKey } }),
		};
		```

- `apps/web/src/services/uts/uts.service.ts`
	- Purpose: thin wrapper for UTS endpoints and async job control (startJob, jobStatus, cancel).

4.2 Hooks (react-query wrappers)

- `apps/web/src/hooks/sgk/useSgk.ts`
	- Exposes: `useSgkList(params)`, `useSgk(id)`, `useCreateSgk()`, `useUpdateSgk()`, `useDeleteSgk()`.
	- Implements optimistic updates where safe and invalidates `['sgk']` query key after mutations.

- `apps/web/src/hooks/sgk/useSgkDocuments.ts`
	- Exposes: `useSgkDocuments(recordId)`, `useUploadDocument()`, `useDeleteDocument()`.
	- Upload mutation: when offline, serialize file metadata/blobs to outbox and resume upload in background sync.

- `apps/web/src/hooks/uts/useUts.ts`
	- Exposes UTS-specific flows: `useUtsRegistrations`, `useStartUtsRegistration`, `useUtsJobStatus` (polling), `useBulkRegisterCsv`.

4.3 Pages & Components

- `apps/web/src/pages/sgk/SGKPage.tsx`
	- Container: filters, list, actions (create, upload document, start UTS registration), keyboard shortcuts.

- `apps/web/src/components/sgk/DocumentUploadModal.tsx`
	- Form using `react-hook-form` + zod; file input, previews (image/pdf), client-side validation (type/size), shows progress.
	- On submit: generate idempotency key, call `useUploadDocument().mutate({ file, recordId, idempotencyKey })` or write to outbox when offline.

- `apps/web/src/components/uts/UTSBulkUpload.tsx`
	- CSV parser, preview rows, validation schema, then call `useBulkRegisterCsv` to enqueue or send.

---

## 5) Testing & QA (detailed)

- Unit tests (Vitest)
	- `sgk.service.spec.ts` — mock Orval client to assert correct headers (Idempotency-Key), multipart handling, and error handling.
	- `sgk-documents.service.spec.ts` — test upload pre-processing and fallback to outbox when offline.
	- `uts.service.spec.ts` — test job start/status/retry/backoff.

- Hooks tests (RTL + @testing-library/react-hooks pattern)
	- `useSgk.spec.ts` — query key shapes, optimistic update rollbacks, invalidations.
	- `useSgkDocuments.spec.ts` — upload flows, onError branches, and outbox enqueue.

- Component tests (React Testing Library)
	- `DocumentUploadModal.spec.tsx` — file selection, validation, submit, progress UI.
	- `UTSBulkUpload.spec.tsx` — CSV parsing and validation.

- Integration & E2E (Playwright)
	- End-to-end scenario: Upload document -> offline -> resume sync -> document appears in list.
	- UTS bulk registration: upload CSV -> background job -> status polling -> success.

- Contract tests (CI)
	- Spectral lint must pass for any OpenAPI changes.
	- Orval generation must run in CI; the generated client should be type-checked in CI.

---

## 6) Security & Privacy

- GDPR / PHI: documents may contain sensitive patient data — ensure uploads are sent over TLS, do not cache files in unsafe storage, and redact logs.
- Access control: check user's permissions before showing upload/delete actions.
- Virus scanning: mark an integration point for server-side virus/MIME check; add UI state for `quarantine` or `failed_validation`.

---

## 7) Offline & Reliability

- Use IndexedDB outbox for uploads and UTS job enqueue. Outbox entry should include: operation type, payload metadata (file name, size, MIME), idempotencyKey, and a reference to the file blob stored in IDB.
- Background sync process: attempt network call with exponential backoff; on permanent failure surface an error that suggests manual retry.
- Idempotency: all mutation requests must include a stable Idempotency-Key to avoid duplicates on retries.

---

## 8) Phase Plan & Estimates

- Phase 1 (2–4 days)
	- Confirm OpenAPI coverage for SGK/UTS and add any required contract entries.
	- Regenerate Orval and commit in CI or add generation step.
	- Implement `sgk.service.ts` and `useSgk.ts` hooks.
	- Implement `SGKPage` with `SGKList` and `SGKFilters` using `packages/ui-web` primitives.

- Phase 2 (2–3 days)
	- Implement document upload UI and `sgk-documents.service.ts` with outbox fallback.
	- Add `useSgkDocuments.ts` hooks and unit/component tests.

- Phase 3 (2–3 days)
	- Implement UTS registration flows (bulk CSV, per-item registration), job status polling, backoff/retry.
	- Add integration tests and Playwright scenarios.

- Phase 4 (1–2 days)
	- Hardening: security/privacy review, virus-scan integration, CI contract checks, extract shared components.

---

## 9) Acceptance Criteria (expanded)

1. All SGK and UTS API interactions use Orval-generated client and pass type-checking.
2. Spectral/OpenAPI lint is green for any OpenAPI changes.
3. Document upload: client-side validation, progress, server response handling, ability to download/delete documents.
4. Offline resilience: uploads and UTS registrations enqueue to outbox and resume on connectivity.
5. Idempotency implemented for all mutations to avoid duplicates.
6. Tests: unit + component tests for core flows; critical Playwright E2E tests for upload and UTS bulk registration.
7. Files split to respect the 500 LOC rule.

---

## 10) Implementation notes & developer checklist

- Always add small, focused unit tests together with code changes.
- If an OpenAPI endpoint is missing, add a minimal OpenAPI patch and discuss with backend; include examples in PR description.
- Prefer adding Orval generation to CI over committing generated artifacts. If temporary generated files land in a branch, mark them as generated in PR and follow-up to remove.
- Reuse normalization helpers from `inventory`/`patients` migrations where mapping exists.

---

If you'd like, I'll now start Phase 1: (A) confirm OpenAPI coverage and run Orval regeneration, (B) implement `sgk.service.ts` and `useSgk.ts` hooks, then open a draft PR with the changes. Tell me to proceed and I'll begin.

## Acceptance criteria

- All API calls use Orval-generated client.
- Spectral/OpenAPI lint and Orval generation pass in CI.
- No manual fetch() calls in new SGK code.
- Forms use react-hook-form + zod and render via `packages/ui-web` primitives.
- Mutations include Idempotency-Key and support IndexedDB outbox if offline is required.
- Files are split so no source file exceeds 500 LOC.

---

Notes:
- If an endpoint is not present in OpenAPI, add an OpenAPI patch and discuss with backend; prefer adding the contract rather than writing ad-hoc clients.
- Reuse the `useIdempotency` hook and outbox utilities already present in the codebase.

## Belge Yükleme (Document upload)

- Scope: patient-related SGK documents and standalone SGK attachments used in claims/registrations.
- File map:
	- `apps/web/src/services/sgk/sgk-documents.service.ts` — Orval wrapper for document endpoints (upload, list, download, delete).
	- `apps/web/src/hooks/sgk/useSgkDocuments.ts` — hooks for listing documents, uploading, deleting.
	- `apps/web/src/components/sgk/DocumentUploadModal.tsx` — react-hook-form + file input; preview + client-side validation (size/type) using zod.
	- `apps/web/src/components/sgk/DocumentList.tsx` — table/list for documents with download/delete actions.

- Implementation notes:
	- Use multipart/form-data upload via Orval-generated client where possible. If OpenAPI doesn't specify file upload schemas, add a contract patch and coordinate with backend.
	- Client-side validation: file type whitelist, max size (e.g., 10MB), image preview for images, PDF preview for PDFs.
	- For reliability and offline: write upload tasks to the IndexedDB outbox (store file metadata and a reference to blob/ArrayBuffer) and run background sync; show upload state in UI.
	- Use idempotency keys for upload mutations to avoid duplicate documents on retry.

- Tests:
	- `sgk-documents.service.spec.ts` — mock multipart uploads and response handling.
	- `DocumentUploadModal.spec.tsx` — simulate file selection, validation, and submit, using MSW to mock upload responses.

## ÜTS kayıtları (UTS registrations)

- Scope: registering device/product codes to the ÜTS system as part of SGK flows (bulk or per-item registrations).
- File map:
	- `apps/web/src/services/uts/uts.service.ts` — Orval wrapper for UTS-related endpoints.
	- `apps/web/src/hooks/uts/useUts.ts` — hooks for listing UTS registrations, creating registrations, checking status.
	- `apps/web/src/pages/uts/UTSPage.tsx` — list + bulk registration UI.
	- `apps/web/src/components/uts/UTSRegisterModal.tsx` — modal to start registrations with options and mapping helpers.

- Implementation notes:
	- UTS interactions can be slow or asynchronous; implement polling or status endpoints to track registrations.
	- Support bulk registration via CSV upload (validate rows client-side, then send to service). If long-running, enqueue to outbox and show background sync status.
	- Provide mapping helpers to normalize local product fields to UTS-required fields (e.g., manufacturer, model, serials). Reuse normalization utils from inventory migration where possible.
	- Respect rate limits and error codes from UTS API; implement exponential backoff and retries in service layer.

- Tests:
	- `uts.service.spec.ts` — mock UTS endpoints, test retry/backoff behavior.
	- `UTSRegisterModal.spec.tsx` — validation and bulk CSV flow.

## Acceptance additions

- Document upload and UTS flows must use Orval-generated client and be covered by unit/component tests and MSW mocks.
- Outbox must persist pending uploads/registrations and resume on network availability.

