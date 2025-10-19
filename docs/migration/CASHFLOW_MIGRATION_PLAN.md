# Cashflow (Kasa) — Migration Plan

Neden (2 cümle): Kasa / cashflow modülü legacy’de çeşitli DOM-intense sayfalar, export/import ve finansal hesaplama mantıkları içeriyor; doğru şekilde migrate edilmezse finansal doğruluk ve izlenebilirlik risk altına girer. Beklenen sonuç (2 cümle): Cashflow sayfası modern React/TypeScript mimarisine taşınacak, hesaplama ve export iş mantığı servis katmanına alınacak, tüm UI bileşenleri test edilebilir ve her dosya ≤500 LOC olacak şekilde düzenlenecek.

---

## Kapsam
- Cashflow dashboard: günlük/aylık kasa hareketleri, filtreler, arama, export
- Cash register flows: open/close register, cash operations (income/expense), reconciliation
- Transaction details: create/edit transaction modal, categories, payment methods
- Integrations: export CSV/PDF, printer, reconciliation reports, Orval API usage
- Offline & audit logging: every write must be auditable and can be queued (outbox)

---

## 1) Yeni dizin & dosyalar (monorepo konumu)
Kök: `x-ear/apps/web/src/pages/cashflow/`

- `CashflowPage/`
  - `CashflowPage.tsx`                # main container + orchestration (≤400 LOC)
  - `CashflowDashboard.tsx`           # KPI cards & charts (≤300 LOC)
  - `CashRegister/`
    - `RegisterList.tsx`              # list of registers / open sessions (≤200 LOC)
    - `RegisterDetail.tsx`            # register detail + reconciliation (≤300 LOC)
  - `TransactionList.tsx`             # transactions table with filters (≤400 LOC)
  - `TransactionModals/`
    - `TransactionFormModal.tsx`      # create/edit transaction (≤400 LOC)
    - `OpenRegisterModal.tsx`         # open register flow (≤150 LOC)
    - `CloseRegisterModal.tsx`        # close + reconcile (≤250 LOC)
  - `CashflowFilters.tsx`             # date ranges, branches, payment methods (≤200 LOC)
  - `CashflowExport.tsx`              # export controls & presets (≤150 LOC)

- Services: `x-ear/apps/web/src/services/cashflow/`
  - `cashflow.service.ts`             # Orval adapters: list, createTx, updateTx, openRegister, closeRegister, reports (≤300 LOC)
  - `cashflow.hooks.ts`               # useCashflow, useRegisters, useTransactions (≤250 LOC)
  - `reconciliation.utils.ts`         # reconcile algorithms (deterministic, testable) (≤200 LOC)

- Reports: `x-ear/apps/web/src/pages/cashflow/reports/`
  - `DailyReport.tsx`                 # daily reconciliation report UI (≤200 LOC)
  - `MonthlyReport.tsx`               # monthly summary (≤200 LOC)

- Utils & audit
  - `cashflow.utils.ts`               # currency formatting, amountMinor helpers (≤120 LOC)
  - `audit.service.ts`                # local audit log writer + outbox integration (≤200 LOC)

Reuse
- Charts from existing components (chart library indicated in repo)
- Shared `Modal`, `Table`, `Select`, `DatePicker` from `packages/ui-web`

Note: Tüm UI bileşenlerinde `packages/ui-web` içindeki paylaşılan primitives (Modal, Table, Select, DatePicker, Toast, ikonlar) ve Orval tarafından üretilmiş TypeScript API client kullanılmalıdır — manuel fetch() çağrıları veya yeni UI kütüphaneleri ADR olmadan eklenmemelidir.

---

## 2) Dosya kontratları (kısa)
1) `CashflowPage.tsx`
- Inputs: route params, initial filters
- Outputs: rendered dashboard, transaction list and controls
- Behavior: orchestrates queries, shows alerts for register states, lazy-loads heavy reports
- Error: show last-known data + allow offline operations queued to outbox

2) `TransactionList.tsx`
- Inputs: transactions[] paginated, active filters
- Outputs: table with actions (edit, delete, export, reconcile)
- Behavior: server pagination, selectable rows for bulk export, quick edit inline
- Edge cases: partial data for huge exports → server-side export preferable

3) `TransactionFormModal.tsx`
- Inputs: optional transaction
- Outputs: mutation create/update via `cashflow.service` with Idempotency-Key
- Behavior: react-hook-form + zod validation; category selection; currency amount minor units
- Edge cases: concurrent transaction updates → show conflict UI and allow merge or override

4) `OpenRegisterModal.tsx` / `CloseRegisterModal.tsx`
- Open: create register session (user, opening amount)
- Close: compute expected vs actual (reconciliation.utils), create closure record, optionally create discrepancy adjustments
- Must create audit log entries for open/close operations

5) `cashflow.service.ts`
- Wrap Orval client endpoints (do not add new endpoints without OpenAPI)
- Provide typed functions and map server response envelope to app models
- All mutations add Idempotency-Key header; wrap errors for UI mapping

6) `reconciliation.utils.ts`
- Deterministic algorithm to compute expected cash vs actual; unit-tested with edge cases (partial payments, refunds, multi-currency)

---

## 3) Legacy mapping (from reports)
- `cashflow.js` and `dashboard-cashflow.js` → `CashflowPage.tsx` + `CashflowDashboard.tsx`
- `cash-register.js` / `cashflow` widgets → `RegisterList.tsx` / `RegisterDetail.tsx`
- `data-export-import.js` → `CashflowExport.tsx`
- `audit logging` legacy helpers → `audit.service.ts` + outbox integration

If a legacy JS file referenced in reports is missing in mapping, tell me and I’ll add it.

---

## 4) Spec-first & OpenAPI
- Verify cashflow endpoints in `x-ear/openapi.yaml` (transactions, registers, reports). If endpoints are missing, prepare OpenAPI changes and run Orval generation.
- Enforce Orval usage for all API calls.
- Contract tests: ensure OpenAPI / Spectral lint green and Orval regeneration passes in CI.

---

## 5) Tests & QA
- Unit tests for `reconciliation.utils.ts` covering normal, refund, partial, and multi-currency cases
- Unit tests for `cashflow.service.ts` (mocked Orval client) includes idempotency header expectations
- Hook tests for `cashflow.hooks.ts` (react-query behavior + optimistic updates)
- Component tests for `TransactionFormModal.tsx` and `CloseRegisterModal.tsx`
- E2E: open register → add txs → close register → verify reconciliation and report export

---

## 6) LOC estimates & splitting guidance
- Keep every file ≤500 LOC
- Split `TransactionList.tsx` into `TransactionToolbar.tsx`, `TransactionTable.tsx` if it grows
- Split `CashflowPage.tsx` into `CashflowHeader.tsx` and `CashflowBody.tsx` if needed

---

## 7) Non-functional & security
- Financial flows must be auditable: every write operation creates an audit entry (immutable) and a reconcile record
- Use amount stored in minor units (e.g., cents) + currency code to avoid floating point errors
- Sensitive operations should require sufficient user permission (RBAC) and be logged
- Export endpoints must be server-generated for large datasets; front-end only triggers server-export

---

## 8) PR Checklist
- [ ] OpenAPI updated & Orval regenerated (if any API added)
- [ ] TS client used (no manual fetch())
- [ ] Unit + integration tests added
- [ ] Files ≤500 LOC
- [ ] Audit logging + outbox integration implemented for writes
- [ ] ADR (if any) created under `docs/adr/`

---

## 9) Next steps (short-term)
1. Create skeleton files for `cashflow` directory (contracts only) — I can scaffold these now.  
2. Verify OpenAPI endpoints and Orval generation.  
3. Implement `cashflow.service.ts` and `reconciliation.utils.ts` with unit tests.  
4. Implement `TransactionFormModal` and `CloseRegisterModal`.  

---

Completion note: Bu plan `x-ear/docs/reports/*` ve `x-ear/COMPLETE_MIGRATION_PLAN.md` referans alınarak hazırlandı. Her finansal akış ve audit gereksinimi hesaba katıldı; ek legacy fonksiyon bulunursa planı güncelleyip gerekli küçük servisleri ekleyeceğim.
