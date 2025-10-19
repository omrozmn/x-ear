# SGK Page Migration Plan

This document describes the migration plan for the SGK page ("Sosyal Güvenlik Kurumu" integrations) from legacy frontend to the new `x-ear` React + TypeScript frontend. It follows the repository rules and migration conventions: spec-first API using OpenAPI + Orval, use of shared UI primitives in `packages/ui-web`, TanStack Query for server state, react-hook-form + zod for forms, IndexedDB outbox for offline writes where applicable, and idempotency for mutations.

## Contract & API

- The SGK page's backend surface must be exercised via the OpenAPI contract. Regenerate Orval client and use the generated TypeScript client for all API calls.
- Contract tests: ensure Spectral/OpenAPI lints pass and Orval regeneration passes in CI before merging.
- No manual fetch() calls or ad-hoc HTTP clients in page-level code. If a deviation is required, record an ADR.

## UI primitives and reuse

- All UI should reuse components from `packages/ui-web` (Modal, Table, Form primitives, Select, DatePicker, Toasts). Avoid adding new UI libraries without an ADR.
- Prefer shared components for lists, filters, and detail views. Extract cross-page components to `packages/ui-web` when needed.

## Data fetching and state

- Use TanStack Query (react-query) for data fetching, caching, pagination, and optimistic updates.
- Implement thin service wrappers around the Orval client in `src/services/sgk/sgk.service.ts`. Service should accept an optional options object where `idempotencyKey` may be passed and set the appropriate header for mutations.
- Use a consistent query key namespace: `['sgk', ...]`.

## Offline and Idempotency

- If SGK has any create/update/delete mutations that need offline resilience, use the existing IndexedDB outbox pattern: write to outbox and sync in background.
- All mutations must include an Idempotency-Key header when sent to the server. Provide `useIdempotency` hook in `src/hooks/common` and wire the generated idempotency key into the service layer.

## Forms and validation

- Use `react-hook-form` for form state and `zod` for schema validation. Keep form components small and testable.
- Validate data shapes against the OpenAPI schema where possible (use generated types from Orval).

## Testing and QA

- Unit tests (Vitest + React Testing Library) for components and hooks. Use MSW to mock API responses using Orval-generated types.
- E2E tests (Playwright) for critical flows (SGK data listing, creation, sync/outbox behavior).
- Contract tests: Spectral lint + Orval regeneration must be green in CI.

## File size and structure constraints

- Keep each file under 500 LOC. Split the page into small components: `SGKList`, `SGKFilters`, `SGKDetail`, `SGKFormModal`.
- Place services under `apps/web/src/services/sgk/` and hooks under `apps/web/src/hooks/sgk/`.

## Migration steps (high level)

1. Add OpenAPI endpoints or confirm existing contract covers SGK endpoints. Regenerate Orval client.
2. Create thin service wrapper: `sgk.service.ts`.
3. Create react-query hooks: `useSGKList`, `useSGK`, `useCreateSGK`, `useUpdateSGK`, `useDeleteSGK`.
4. Build UI components using `packages/ui-web` primitives, starting with list + filters.
5. Implement SGKFormModal using react-hook-form + zod and wire create/update mutations with idempotency keys.
6. If offline required, implement outbox writes and background sync.
7. Add unit tests + MSW mocks, run Spectral/OpenAPI and Orval regen in CI.
8. Iterate on UX and extract shared components into `packages/ui-web` as needed.

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
