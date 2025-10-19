# Randevular Migration Plan

Neden (2 cümle): Randevular sayfası legacy kodda birçok DOM-manipülasyon, modal ve calendar logic içeriyor; modern React/TypeScript ve Orval tabanlı monorepoda tek tip servis, typed client ve offline-first outbox ile taşınması gerekiyor. Beklenen sonuç (2 cümle): Tüm randevu özellikleri (liste, takvim, modal formlar, drag/drop, filtreler, keyboard nav) React bileşenleri, küçük servisler ve Orval client adaptörleri ile birebir taşınacak; her dosya ≤500 LOC ve test edilebilir olacak.

## Kapsam
- Appointments (Randevular) sayfası: liste, takvim (day/week/month), yeni/düzenle modal, filtreler, arama, drag & drop, keyboard kısayollar, appointment detay paneli, reminder/notifications hooks.
- Tüm legacy JS asset referansları ve modal/element inventory, ilgili raporlardan çıkarıldı ve bu plan bunlara göre oluşturuldu (`x-ear/docs/reports/*`).

---

## 1) Oluşturulacak dizin & dosyalar (monorepo konumu)
Kök: `x-ear/apps/web/src/pages/appointments/`

- `AppointmentsPage/`
  - `AppointmentsPage.tsx`  # route container + orchestration (≤500 LOC)
  - `AppointmentsList.tsx`  # table/list view (≤400 LOC)
  - `AppointmentsCalendar/`
    - `CalendarView.tsx`     # calendar container (≤500 LOC)
    - `CalendarDay.tsx`      # day cell renderer (≤250 LOC)
    - `CalendarWeek.tsx`     # week view (≤400 LOC)
    - `CalendarMonth.tsx`    # month view (≤400 LOC)
  - `AppointmentModals/`
    - `AppointmentFormModal.tsx`  # create/edit form (react-hook-form + zod) (≤500 LOC)
    - `AppointmentQuickModal.tsx` # quick-create modal (≤300 LOC)
  - `AppointmentFilters.tsx`      # filters & search (≤200 LOC)
  - `AppointmentRow.tsx`          # list row / actions (≤200 LOC)

Kök servisler/ortaklar (eğer yoksa `x-ear/apps/web/src/services/appointments/` altında)

- `services/appointments/`
  - `appointments.service.ts`  # Orval client adaptörleri, typed functions (≤300 LOC)
  - `appointments.model.ts`    # Type mappings (camelCase JSON ↔ snake_case DB) (≤200 LOC)
  - `appointments.hooks.ts`    # hooks: useAppointments, useAppointment, useAppointmentMutations (≤250 LOC)

Ortak UI primitives (packages/ui-web veya apps/web/src/components/ui kullan)
- `useModal.ts` (already in repo; reuse)
- `Modal.tsx`, `DatePicker.tsx`, `TimePicker.tsx` (reuse existing from `packages/ui-web`)

Note: Tüm UI bileşenlerinde `packages/ui-web` içindeki paylaşılan primitives (Modal, Table, Select, DatePicker, Toast, ikonlar) ve Orval tarafından üretilmiş TypeScript API client kullanılmalıdır — manuel fetch() çağrıları veya yeni UI kütüphaneleri ADR olmadan eklenmemelidir.

---

## 2) Her dosyanın içerik özeti (kısa contract + önemli işlevler)
Not: Her dosya tek bir sorumluluk üstlenecek; 500 LOC sınırına göre parçalandı.

1) `AppointmentsPage.tsx`
- Girdi: route params (date? viewMode?), query params
- Çıktı: render edilen sayfa, error & loading states
- Davranış: seçili viewMode yönetimi (list/calendar), lazy-load CalendarView, wiring: filters → query key, keyboard shortcut registration (useEffect + cleanup), error boundary wrapper
- Hatalar: network failure → retry, cached data gösterme (React Query)
- Edge cases: empty lists, large lists (server pagination), offline create (outbox)

2) `AppointmentsList.tsx`
- Girdi: appointments[] (paginated), onEdit, onDelete, onSelect
- Çıktı: accessible table/list, bulk actions
- Davranış: server-side pagination via hooks, debounce search
- Edge cases: concurrent edits, optimistic updates, row virtualization if >200 rows

3) `CalendarView.tsx` + sub-views
- Girdi: selectedDate, viewMode (day/week/month), appointments
- Çıktı: calendar grid with appointment slots
- Davranış: drag & drop (dnd-kit) for reschedule, double-click to open AppointmentFormModal prefilling time, keyboard navigation (arrow keys change focus), accessible labels
- Hatalar: collision detection (prevent overlapping or show conflict UI), timezone handling (ISO-8601 UTC everywhere)

4) `AppointmentFormModal.tsx`
- Girdi: optional appointment object
- Çıktı: onSubmit -> create/update via appointments.service
- Davranış: react-hook-form + zod validation (field-level errors mapped from ApiError), uses Idempotency-Key header for mutations
- Edge cases: recurring appointments (limited initial support) — if feature grows, move recurrence into separate small module

5) `appointments.service.ts`
- Girdi: Orval generated client functions
- Çıktı: typed wrapper functions: list, get, create, update, delete, bulk operations
- Davranış: add idempotency key on mutations; map snake_case↔camelCase; centralized error shaping
- Rule: No new public endpoints without OpenAPI; this file only wraps existing Orval functions or calls existing endpoints.

6) `appointments.hooks.ts`
- Exports: useAppointments(query), useAppointment(id), useCreateAppointment(), useUpdateAppointment(), useDeleteAppointment()
- Behavior: use TanStack Query for caching; optimistic updates for create/update/delete with rollback support; integrate IndexedDB outbox for offline writes

7) `AppointmentFilters.tsx`
- Contains: date range picker, provider select, patient search autocomplete (reuse shared supplier/patient-autocomplete), status filters
- Behavior: controlled inputs with debounce; show active filter pills; persist UI filter state to UI store (Zustand) using storage-key defined in `storage-keys.ts`

8) `AppointmentQuickModal.tsx`
- Minimal quick-create modal for rapid booking from calendar slot
- Prefill date/time from slot, only essential fields (patient, duration, type)

9) `AppointmentRow.tsx`
- Presents row actions: edit, reschedule, cancel, quick-print, open details
- Confirms destructive actions with ConfirmModal (shared)

---

## 3) Eksiksiz element listesi — modal/form/tab/element eşleştirmesi
Bu liste legacy raporlardan (`legacy-ui-elements-per-page.md` vb.) çıkarıldı ve her öğe yukarıdaki dosyalara eşlendi.

- Calendar (month/week/day) → `CalendarView` + `Calendar*` bileşenleri
- Yeni randevu modal (full) → `AppointmentFormModal.tsx`
- Hızlı randevu modal → `AppointmentQuickModal.tsx`
- Drag & drop handlers → in `CalendarView` (dnd-kit hooks) + small util `appointments.utils.ts` (≤120 LOC)
- Keyboard navigation → `appointments.keyboard.ts` (hook, ≤120 LOC) exported and used by `AppointmentsPage.tsx`
- Appointment search/filter UI → `AppointmentFilters.tsx` (patient autocomplete reuses existing `usePatientSearch` hook)
- Row actions (edit, delete, reschedule) → `AppointmentRow.tsx`
- Conflict warning/overlap UI → small presentational `ConflictBadge.tsx` (≤80 LOC)
- Notifications/reminders → `useReminders.ts` hook (integrates with Notification service; worker optional)

If any element above is missing in legacy reports or discovered later, this plan must be updated and files split further to keep ≤500 LOC.

---

## 4) Spec-first & OpenAPI checks
- Before adding any endpoint or mutation, update OpenAPI and run Orval generation. If Orval client already contains appointments endpoints, use them.
- Add contract note: every mutation must include Idempotency-Key and be covered by contract tests.
- ADR: `docs/adr/appointment-api-adapter.md` (short note: why adapter exists and alternative rejected). Keep ADR ≤200 LOC.

---

## 5) Tests & Quality Gates
- Unit tests (Vitest) for: `appointments.service.ts` (happy path + 2 edge cases), `appointments.hooks.ts` (mocked queries + optimistic update rollback), `AppointmentFormModal.tsx` (validation + submit flow)
- Contract tests: ensure OpenAPI / Spectral lint green and orval regeneration passes in CI
- E2E smoke (Playwright): create → edit → reschedule → delete flow on appointments page

---

## 6) LOC estimate & split plan (validation step)
- Each file listed above is sized conservatively to keep ≤500 LOC.
- If after initial implementation a file threatens to exceed 500 LOC, split suggestions (examples):
  - `CalendarView.tsx` → split into `CalendarHeader.tsx`, `CalendarGrid.tsx`, `CalendarEventRenderer.tsx`
  - `AppointmentFormModal.tsx` → split validation & recurrence into `appointment.validation.ts` and `appointment.recurrence.ts`

Action: after implementation of each file, run `wc -l` and ensure files ≤500 LOC. If any file >500 LOC, update this plan and create additional files accordingly.

### LOC measurements (existing workspace samples)

I measured representative existing files in the repo to validate the ≤500 LOC rule. These are legacy/current app files (used as a guide for splitting):

- `apps/web/src/components/appointments/AppointmentList.tsx` — 411 lines
- `apps/web/src/hooks/useAppointments.ts` — 394 lines
- `apps/web/src/components/appointments/AppointmentForm.tsx` — 457 lines  <-- exceeds 500? (close) *Note: 457 < 500 but is large; recommend splitting form helpers/validation if growth occurs*
- `apps/web/src/components/appointments/AppointmentModal.tsx` — 354 lines

Recommendations based on measurements:
- The `AppointmentForm.tsx` is the largest at 457 lines. It's under the 500-LOC rule today but contains substantial validation and UI; proactively extract validation logic (e.g., `appointment.validation.ts`), patient lookup/autocomplete, and smaller presentational pieces (clinician/location fields) into small modules to avoid surpassing 500 LOC during feature additions.
- `AppointmentList.tsx` (411 lines) is large but acceptable; extract `AppointmentRow.tsx` (actions and cell renderers) to keep list concerns separated if more features are added (bulk actions, virtualization).
- `useAppointments.ts` (394 lines) is currently a combined hook file; consider splitting specialized hooks (`useAppointmentsByPatient`, `useTodaysAppointments`) into separate files earlier in the migration to keep each file focused.

Validation status: completed — measured representative files and added split recommendations above. Update this plan if you add features that expand these files beyond 500 LOC.

---

## 7) Non-functional & infra notes
- Reuse `packages/ui-web` components; never add a new UI lib. If a needed primitive is missing (e.g., Calendar core), prefer `dnd-kit` + lightweight calendar (or implement minimal calendar UI) and justify in ADR.
- Use IndexedDB outbox for offline writes. Integrate with existing `indexeddb-outbox` service if present.
- All dates ISO-8601 UTC. All API JSON fields camelCase; DB columns snake_case (handled server-side migrations).

---

## 8) Migration checklist (pre-commit PR checklist)
- [ ] OpenAPI updated (orval generation uses existing endpoints)
- [ ] TS client regenerated & used
- [ ] No manual fetch() calls introduced
- [ ] Files ≤500 LOC (verify)
- [ ] Unit + integration tests added
- [ ] Idempotency-Key added to all mutations
- [ ] Storage keys updated if new keys introduced (add to `storage-keys.ts`)
- [ ] ADR added for any architectural decision

---

## 9) Next steps (short term)
1. Create skeleton files under `x-ear/apps/web/src/pages/appointments/` with exports and minimal implementations (contracts only). (TODO move to in-repo tasks)
2. Ensure OpenAPI has appointments endpoints; if missing, draft OpenAPI changes and run Orval generation.
3. Implement `appointments.service.ts` wrappers and unit tests.
4. Implement `appointments.hooks.ts` and basic `AppointmentsPage.tsx` UI.
5. Implement `CalendarView` and `AppointmentFormModal`.

---

Completion note: Bu plan `x-ear/docs/reports/*` ve `x-ear/COMPLETE_MIGRATION_PLAN.md` içeriğine göre hazırlandı. Eğer uygulama içinde daha önce belirlenmiş randevu özel bir edge-case (ör. third-party calendar sync veya özel recurring rules) bulunuyorsa, plan güncellenecek ve gerekli extra küçük servis dosyaları eklenecektir.
