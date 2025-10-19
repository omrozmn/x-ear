# Inventory & Product Details — Migration Plan

Neden (2 cümle): Legacy envanter ve ürün detayları sayfaları birçok DOM-manipülasyonu, büyük monolitik JS modülleri ve inline form logic içeriyor; modern monorepoda bu özelliklerin tipli servisler, küçük React bileşenleri ve Orval tabanlı API çağrıları ile taşınması gerekiyor. Beklenen sonuç (2 cümle): Envanter listesi, bulk upload, ürün modal/form, seri yönetimi ve product-detail sayfaları tam fonksiyonel, test edilebilir React modülleri olarak taşınacak; her dosya ≤500 LOC ve mevcut shared UI/primitives yeniden kullanılacak.

---

## Kapsam
- Inventory Page: list, filters, bulk upload, bulk actions, stats, stock update flows
- Product Details Page: product header, serials management, pricing, purchase/sale history, documents, modals (edit, stock, serial assign), barcode/print
- Integrations: CSV parsing (worker), bulk operations, inventory-service adapters (Orval), IndexedDB outbox for offline mutations

---

## 1) Yeni dizin & dosyalar (monorepo konumu)
Kök: `x-ear/apps/web/src/pages/inventory/`

- `InventoryPage/`
  - `InventoryPage.tsx`               # route container + orchestration (≤400 LOC)
  - `InventoryList.tsx`               # main table + virtualized rows (≤400 LOC)
  - `InventoryFilters.tsx`            # filters & advanced filters (≤200 LOC)
  - `InventoryStats.tsx`              # KPI cards (≤120 LOC)
  - `InventoryBulk/`
    - `BulkUpload.tsx`                # CSV uploader UI (≤200 LOC)
    - `BulkSerialUpload.tsx`          # serials bulk (≤200 LOC)
    - `BulkOperationsModal.tsx`       # confirm bulk actions (≤200 LOC)
  - `InventoryModals/`
    - `ProductEditModal.tsx`          # create/edit product (react-hook-form + zod) (≤500 LOC)
    - `StockUpdateModal.tsx`          # update stock form (≤200 LOC)
    - `DeleteConfirmModal.tsx`        # deletion confirm (≤80 LOC)
  - `InventoryTable/`
    - `InventoryTable.tsx`            # table wrapper (≤300 LOC)
    - `InventoryRow.tsx`              # per-row actions (≤200 LOC)

- `ProductDetails/`
  - `ProductDetailsPage.tsx`          # header + tabs (≤400 LOC)
  - `ProductHeader.tsx`               # product card (≤200 LOC)
  - `ProductTabs.tsx`                 # tabs nav (General, Serials, Sales, Documents) (≤120 LOC)
  - `tabs/`
    - `GeneralTab.tsx`                # general product info & edit actions (≤300 LOC)
    - `SerialsTab.tsx`                # serial list, assign/unassign (≤350 LOC)
    - `SalesTab.tsx`                  # sales history & quick actions (≤300 LOC)
    - `DocumentsTab.tsx`              # product docs (≤200 LOC)
  - `ProductModals/`
    - `SerialAssignModal.tsx`         # assign serial to patient/sale (≤200 LOC)
    - `SerialEditModal.tsx`           # edit serial (≤150 LOC)

- Services (if not present): `x-ear/apps/web/src/services/inventory/`
  - `inventory.service.ts`            # Orval client adapters, typed functions (≤300 LOC)
  - `product.model.ts`                # mappings and helpers (≤150 LOC)
  - `inventory.hooks.ts`              # useInventory, useProduct, useBulkOperations (≤300 LOC)
  - `csv.worker.ts`                   # CSV parsing worker (small entry + worker file) (≤150 LOC each chunk)

- Shared small utils
  - `inventory.utils.ts`              # helpers: csv-normalize, barcode helpers (≤120 LOC)
  - `serials.utils.ts`                # serial-specific helpers (≤120 LOC)

Reuse paths
- Use existing `packages/ui-web` for `Modal`, `Table`, `Select`, `DatePicker`, `Toast`, icons (Heroicons)

Note: Tüm UI bileşenlerinde `packages/ui-web` içindeki paylaşılan primitives (Modal, Table, Select, DatePicker, Toast, ikonlar) ve Orval tarafından üretilmiş TypeScript API client kullanılmalıdır — manuel fetch() çağrıları veya yeni UI kütüphaneleri ADR olmadan eklenmemelidir.
- Use existing `storage-keys.ts` to add any new keys (must add new keys before usage)

---

## 2) Dosya bazlı kontratlar (inputs/outputs/behavior/error modes)
(Öne çıkan dosyalardan seçilmiş, her biri tek sorumluluk prensibine uygun)

1) `InventoryPage.tsx`
- Inputs: URL query (page, filters)
- Outputs: renders `InventoryList`, filters, stats and bulk controls
- Behavior: orchestrates fetch via `useInventory()`, lazy-load bulk uploader, keyboard shortcut for bulk actions
- Error: network failure → show cached data + retry button

2) `InventoryList.tsx`
- Inputs: paginated items, sort/filter options
- Outputs: virtualized table body + selection
- Behavior: server-driven pagination, virtualization, row selection, bulk action toolbar
- Edge cases: >10k items → server cursor pagination; concurrent stock updates show optimistic state and resolve on query invalidate

3) `ProductEditModal.tsx`
- Inputs: optional product object
- Outputs: call create/update mutation with Idempotency-Key
- Behavior: react-hook-form + zod, field-level server error mapping
- Edge cases: SKU uniqueness violation (server error mapped to field), offline create saved to outbox

4) `BulkUpload.tsx` + `csv.worker.ts`
- Inputs: CSV file
- Outputs: parsed rows preview, validated rows and a confirmation to apply bulk operations
- Behavior: worker parses & normalizes CSV, client displays preview (max 100 rows preview), on confirm run bulk API with chunking
- Error modes: bad CSV rows → show per-row error; worker failure → fallback to client small-batch parsing with user warning

5) `SerialsTab.tsx`
- Inputs: productId, serials list
- Outputs: serials table with assign/unassign/edit actions
- Behavior: allow per-serial actions, bulk serial import, show serial status (in stock / assigned / returned), integrate with device assignment modal
- Edge cases: duplicate serials in import -> validation and dedupe before submit

6) `inventory.service.ts`
- Exposes typed functions: listProducts, getProduct, createProduct, updateProduct, deleteProduct, bulkCreate, bulkUpdate, exportCSV, getSerials, assignSerial, unassignSerial
- Behavior: wraps Orval client (do not call fetch directly), map snake_case ↔ camelCase, include Idempotency-Key header for mutations

7) `inventory.hooks.ts`
- Exports: useInventory(filters, page), useProduct(productId), useCreateProduct(), useBulkUpload(), useSerials(productId)
- Behavior: TanStack Query usage, optimistic updates for stock changes with rollback, integration with IndexedDB outbox for offline writes

---

## 3) Legacy element mapping (from reports)
(Issues found in `x-ear/docs/reports/*` and `legacy` folder were mapped)

- `inventory-main.js` → `InventoryPage.tsx` + `InventoryList.tsx`
- `inventory-table.js` → `InventoryTable.tsx` & `InventoryRow.tsx`
- `inventory-modal.js` → `ProductEditModal.tsx`
- `inventory-bulk.js` & `bulk upload` → `BulkUpload.tsx` + `csv.worker.ts`
- `inventory-utils.js` → `inventory.utils.ts`
- `product-serials.js` / `product-activity.js` → `SerialsTab.tsx`, `SalesTab.tsx`
- Buttons (Add Product, Bulk Upload, Update Stock) → toolbar actions in `InventoryPage.tsx`
- Row actions (Stock, Edit, Delete) → `InventoryRow.tsx` actions
- Barcode/print preview → small `BarcodePreview.tsx` (≤120 LOC) in product details

If any legacy function referenced in the reports is missing here, tell me and I'll add the mapping in the plan.

---

## 4) Spec-first & OpenAPI
- Check `x-ear/openapi.yaml` for inventory endpoints (list, create, update, delete, bulk, serials). If an endpoint is missing, prepare a small OpenAPI patch and run Orval regeneration.
- All API calls must come via generated Orval client. No manual fetch().
- Contract tests: ensure OpenAPI / Spectral lint green and Orval regeneration passes in CI.
- Add ADR `docs/adr/inventory-api-adapter.md` when adapter decisions are made.

---

## 5) Tests & Quality Gates
- Unit tests (Vitest) for service layer (`inventory.service.ts`) with mocked Orval client (happy path + 2 edge cases per function)
- Hook tests for `inventory.hooks.ts` (mock TanStack Query + optimistic update rollbacks)
- Component tests (React Testing Library) for `BulkUpload.tsx` (parsing preview) and `ProductEditModal.tsx` (validation and submit)
- E2E (Playwright) for critical flows: create product → add serial → bulk upload → stock update → delete
- CI checks: Lint → Typecheck → Unit tests → Orval regeneration → Migrations check

---

## 6) LOC estimate & splitting guidance
- All files are planned under 500 LOC. If implementation approaches 500 LOC, split as follows examples:
  - `InventoryPage.tsx` → split `InventoryToolbar.tsx`, `InventoryBody.tsx`
  - `ProductEditModal.tsx` → split `product.form.fields.tsx` & `product.validation.ts`
  - `SerialsTab.tsx` → split `SerialList.tsx`, `SerialFilters.tsx` and `SerialActions.tsx`

During implementation, run `wc -l` and enforce splits. If you want, I can add a small script to check file LOC pre-commit.

---

## 7) Non-functional notes
- Reuse `@x-ear/ui-web` primitives; avoid adding libraries except dnd-kit for drag-drop or a tiny CSV worker library if necessary (first check if repo already includes a CSV parser). Document any new dependency in ADR.
- Offline-first: use indexedDB outbox for stock changes and bulk operations.
- Dates and number formats must follow project rules (ISO-8601, amountMinor + currency code where applicable).
- Security: bulk upload endpoints must validate and rate-limit (server-side); do not store large binary data in localStorage.

---

## 8) Checklist for PRs
- [ ] OpenAPI updated & Orval regenerated (if endpoints changed)
- [ ] No manual fetch() calls
- [ ] Files ≤500 LOC
- [ ] Unit + Integration tests added and passing
- [ ] Storage keys added to `storage-keys.ts` if needed
- [ ] ADR for architectural deviations

---

## 9) Next steps (practical short-term plan)
1. Create skeleton files under `x-ear/apps/web/src/pages/inventory/` and `x-ear/apps/web/src/services/inventory/` (contracts only). I can create these now if you'd like. (I will not implement heavy logic in this step.)
2. Verify OpenAPI endpoints for inventory & serials; if missing, draft OpenAPI additions.
3. Implement `inventory.service.ts` + unit tests.
4. Implement `inventory.hooks.ts` + optimistic stock update flows and outbox integration.
5. Implement UI: InventoryPage → InventoryList → ProductEditModal → BulkUpload.

---

Completion note: Bu plan `x-ear/docs/reports/*` ve `x-ear/COMPLETE_MIGRATION_PLAN.md` referans alınarak hazırlandı. Tüm legacy elementler envanter/product akışları için eşlendi; eğer ek legacy fonksiyon veya missing-js girdisi varsa, planı hemen güncellerim.
