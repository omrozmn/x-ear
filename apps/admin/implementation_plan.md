# Full Admin Panel Completion

## Goal
Refactor and complete all admin panel pages, ensure all Orval‑generated API hooks are used, fix type mismatches, add missing UI (Plans), resolve UI‑Web type conflicts, add unit/integration tests, add end‑to‑end verification, run database migrations, and produce a clean production build.

## Tasks

1. **Fix invoice status type**
   - Replace `GetAdminInvoicesStatus` import with the generated enum `InvoiceStatus`.
   - Update status filter dropdown values to match enum members.
2. **Implement Plans page**
   - List plans using `useGetAdminPlans`.
   - Add create/edit/delete modals using `usePostAdminPlans`, `usePutAdminPlansId`, `useDeleteAdminPlansId` (generated hooks).
   - Include validation with `react-hook-form`.
   - Ensure UI matches Tailwind design system.
3. **Add missing UI components** (if any) for plan features, status badges, etc.
4. **Resolve UI‑Web csstype conflict**
   - Add `resolutions` in `package.json` (already added) and run `npm install`.
   - Verify that all UI‑Web components compile without type errors.
5. **Add unit & integration tests** (Vitest + React Testing Library)
   - Test each admin page renders correctly with mocked API data.
   - Test form submissions and mutation hooks.
6. **Add end‑to‑end Playwright test**
   - Log in as admin, create a plan, create an invoice, record a payment, verify DB via backend API.
7. **Run database migrations**
   - Execute backend migration scripts to ensure new columns (`plan.is_active`, `plan.billing_cycle`, etc.) exist.
   - Verify schema matches OpenAPI definitions.
8. **Regenerate API client**
   - Run `npm run gen:api` to ensure client reflects any OpenAPI changes.
9. **Full build verification**
   - Run `npm run build` for the admin app.
   - Ensure no TypeScript or lint errors.
10. **Documentation update**
    - Update `walkthrough.md` with summary of completed work.

## Verification Plan

- **Automated tests**: `npm test`, `npm run test:ui`, `npm run test:coverage` must all pass.
- **E2E test**: Playwright script must finish with exit code 0.
- **Build**: `npm run build` must succeed.
- **Manual sanity check**: Run `npm run dev` and navigate through all admin pages to confirm UI works.

## Dependencies
- Backend must be running with latest migrations applied.
- Environment variable `VITE_API_BASE_URL` should point to the backend API.

---

**User Review Required**

Please confirm that this plan covers all required work. If you would like any adjustments, let me know. Otherwise I will proceed with the implementation.
