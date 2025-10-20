# SGK Migration Checklist

This checklist tracks Phase 1 work for the SGK page migration.

## Goals
- Use Orval-generated client as single source of truth (no direct fetch/axios from components)
- Implement thin service wrappers under `apps/web/src/services/sgk`
- Implement TanStack Query hooks for documents and processing under `apps/web/src/hooks/sgk`
- Wire simple UI components (`components/sgk/DocumentList`, `components/sgk/DocumentUploadModal`) using `packages/ui-web`, `react-hook-form` + `zod`
- Add IndexedDB outbox fallback for uploads and replay worker
- Ensure Idempotency-Key header is sent for mutation requests
- Add unit/component tests (Vitest + RTL) and mock services

## Phase 1 checklist
- [x] Confirm OpenAPI coverage and locate Orval-generated client (`apps/web/src/generated/orval-api.ts`)
- [x] Add thin service wrapper `apps/web/src/services/sgk/sgk.service.ts` (calls generated client)
- [x] Add hooks: `apps/web/src/hooks/sgk/useSgkDocuments.ts`, `apps/web/src/hooks/sgk/useSgk.ts`
- [x] Add unit tests for hooks (Vitest)
- [ ] Create UI components: `components/sgk/DocumentList.tsx`, `components/sgk/DocumentUploadModal.tsx`
- [ ] Add IndexedDB outbox and replay worker
- [ ] Add E2E test or integration test for upload+outbox flow
- [ ] Add migration branch and open draft PR
- [ ] Add CI steps to regenerate Orval and run Spectral OpenAPI lints

## Notes
- Keep files small (< ~500 LOC) and follow existing naming/query-key conventions.
- Prefer `packages/ui-web` primitives for UI.
- Use `Idempotency-Key` header for uploads/deletes where appropriate.
