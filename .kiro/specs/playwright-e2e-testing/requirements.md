# Requirements: Playwright E2E Testing Infrastructure

**Feature**: Full-Coverage E2E Testing (Web + Admin + Landing)  
**Status**: IN PROGRESS  
**Priority**: P0 (Critical)  
**Created**: 2026-02-03  
**Updated**: 2026-02-16

---

## 1. Overview

X-Ear CRM'in 3 frontend uygulamasının tamamı için kapsamlı Playwright E2E test altyapısı. Her sayfadaki her element, her modal, her form — hiçbir şey atlanmadan test edilecek.

**Problem Statement**:
- ~470 test var ama dağınık, tutarsız ve eksik (3 farklı dizin, 2 farklı config)
- Admin Panel'in 18/37 route'unda sıfır test var
- Landing Page'de sıfır data-testid var
- CI pipeline'da `@p0`/`@p1` tag filtreleme bozuk — 0 test çalışıyor
- Migration ve refactor sonrası birçok UI kırılmış olabilir, örüntüler bilinmiyor
- TestID coverage %3 (web), %0.3 (admin), %0 (landing)
- POM (Page Object Model) yok, helper duplikasyonu var (3 ayrı sistem)

**Solution**:
- 3 app × tam kapsam = ~600+ test (79 route, 78 modal, 34 form)
- Debug-first yaklaşım: önce `--debug` ile tüm route'ları tara, örüntüleri bul
- 0 lint / 0 type error garantisi (her PR'da `tsc --noEmit` + `eslint`)
- POM pattern ile sürdürülebilir test mimarisi
- Tek birleşik config ve helper sistemi
- CI pipeline fix ve 3 app entegrasyonu

---

## 2. User Stories

### US-001: Test Infrastructure Setup
**As a** developer  
**I want** unified Playwright test infrastructure across 3 apps  
**So that** tüm uygulamaları tek config ile test edebileyim

**Acceptance Criteria**:
- AC-001.1: Tek `playwright.config.ts` ile 3 project (web, admin, landing)
- AC-001.2: Multi-browser support (Chromium primary)
- AC-001.3: Parallel execution (4 workers)
- AC-001.4: Screenshot/Video/Trace capture on failure
- AC-001.5: All test helpers consolidated in `tests/helpers/`
- AC-001.6: POM classes created for all 79 routes
- AC-001.7: 0 TypeScript error in all test files
- AC-001.8: 0 ESLint error in all test files

### US-002: Authentication Tests (Web + Admin)
**As a** QA engineer  
**I want** auth flow'ları her iki app için test edilsin  
**So that** login/logout/permission sorunları erken tespit edilsin

**Acceptance Criteria**:
- AC-002.1: Web login (valid/invalid) — 2 test
- AC-002.2: Web logout — 1 test
- AC-002.3: Token refresh — 1 test
- AC-002.4: Session timeout — 1 test
- AC-002.5: Permission checks (view/create/edit/delete) — 4 test
- AC-002.6: Role-based access — 2 test
- AC-002.7: Admin login — 2 test
- AC-002.8: Admin unauthorized redirect — 1 test

### US-003: Party Management Tests
**As a** QA engineer  
**I want** party CRUD işlemleri tam test edilsin  
**So that** müşteri yönetimi sorunsuz çalışsın

**Acceptance Criteria**:
- AC-003.1: Party oluşturma (valid + validation) — 3 test
- AC-003.2: Party güncelleme — 2 test
- AC-003.3: Party silme (single + bulk) — 2 test
- AC-003.4: Party arama (name + phone) — 2 test
- AC-003.5: Party filtreleme (role + date) — 2 test
- AC-003.6: Bulk operations (select + delete + export) — 3 test
- AC-003.7: Pagination + sorting — 2 test
- AC-003.8: Party detail view — 2 test
- AC-003.9: Party role assignment — 2 test

### US-004: Sales Tests
**As a** QA engineer  
**I want** 3 farklı satış yöntemi test edilsin  
**So that** satış flow'ları güvenilir çalışsın

**Acceptance Criteria**:
- AC-004.1: Satış modaldan (device + pill + SGK) — 5 test
- AC-004.2: Device assignment'tan satış (trial/replacement/loaner) — 5 test
- AC-004.3: Kasa kaydından satış — 3 test
- AC-004.4: SGK payment calculation (4 yaş grubu) — 4 test
- AC-004.5: Partial payment + discount — 2 test
- AC-004.6: Sale edit/delete — 2 test

### US-005: Payment & Collection Tests
**As a** QA engineer  
**I want** tahsilat ve senet takibi tam test edilsin  
**So that** ödeme süreçleri güvenilir çalışsın

**Acceptance Criteria**:
- AC-005.1: Payment tracking modal — 3 test
- AC-005.2: Partial payments (cash+card+note) — 3 test
- AC-005.3: Payment history — 2 test
- AC-005.4: Promissory note CRUD + tracking + collection — 4 test
- AC-005.5: Payment validation (overpayment, zero amount) — 3 test

### US-006: Appointment Tests
**As a** QA engineer  
**I want** randevu sistemi tam test edilsin

**Acceptance Criteria**:
- AC-006.1: Randevu CRUD — 4 test
- AC-006.2: Calendar view — 2 test
- AC-006.3: SMS reminder — 2 test
- AC-006.4: Conflict detection — 2 test
- AC-006.5: Completion + filtering — 5 test

### US-007: Communication Tests
**As a** QA engineer  
**I want** SMS/Email gönderimi tam test edilsin

**Acceptance Criteria**:
- AC-007.1: SMS single/bulk — 4 test
- AC-007.2: Email single/bulk — 4 test
- AC-007.3: Templates CRUD — 2 test
- AC-007.4: Notifications — 2 test
- AC-007.5: Credit management + history — 3 test

### US-008: Settings Tests
**As a** QA engineer  
**I want** tüm settings sayfaları test edilsin

**Acceptance Criteria**:
- AC-008.1: Company settings — 3 test
- AC-008.2: Team management — 4 test
- AC-008.3: Role & permissions — 4 test
- AC-008.4: Integration settings — 3 test
- AC-008.5: Subscription settings — 3 test

### US-009: Invoice, Device, Inventory, Cash, Reports Tests
**As a** QA engineer  
**I want** kalan web modülleri tam test edilsin

**Acceptance Criteria**:
- AC-009.1: Invoice CRUD + e-fatura + PDF — 15 test
- AC-009.2: Device assign/return/replace/trial/maintenance — 15 test
- AC-009.3: Inventory CRUD + stock in/out + bulk + alerts — 15 test
- AC-009.4: Cash register gelir/gider + search + filter — 10 test
- AC-009.5: Reports (sales, collection, stock, SGK, promissory, activity) — 12 test

### US-010: SGK, UTS, POS, Suppliers Tests
**As a** QA engineer  
**I want** SGK, UTS, POS ve Suppliers modülleri test edilsin

**Acceptance Criteria**:
- AC-010.1: SGK query + report + e-receipt + downloads — 8 test
- AC-010.2: UTS registration — 2 test
- AC-010.3: POS payment + success/fail callbacks — 4 test
- AC-010.4: Supplier CRUD + detail — 6 test

### US-011: Admin Panel Full Coverage
**As a** QA engineer  
**I want** Admin Panel'in 37 route'unun tamamı test edilsin  
**So that** admin operasyonları güvenilir çalışsın

**Acceptance Criteria**:
- AC-011.1: Admin auth (login, unauthorized) — 5 test
- AC-011.2: Dashboard widgets + stats — 5 test
- AC-011.3: Tenants CRUD + user management — 10 test
- AC-011.4: Plans CRUD + features — 6 test
- AC-011.5: Users & Roles CRUD + permissions — 10 test
- AC-011.6: Affiliates CRUD + detail — 8 test
- AC-011.7: Integrations (Vatan SMS, Email config/logs) — 10 test
- AC-011.8: SMS headers + packages — 8 test
- AC-011.9: Billing + payments — 6 test
- AC-011.10: Inventory + production — 6 test
- AC-011.11: AI management — 5 test
- AC-011.12: Marketplaces + features — 6 test
- AC-011.13: Files + OCR queue — 6 test
- AC-011.14: Notifications + campaigns — 6 test
- AC-011.15: Analytics + activity logs — 6 test
- AC-011.16: API keys + add-ons — 5 test
- AC-011.17: Support + settings — 5 test
- AC-011.18: Patients + appointments (admin) — 6 test
- AC-011.19: Suppliers (admin) — 4 test

### US-012: Landing Page Full Coverage
**As a** QA engineer  
**I want** Landing Page'in 11 route'unun tamamı test edilsin

**Acceptance Criteria**:
- AC-012.1: Home page (hero, features, header/footer, responsive) — 5 test
- AC-012.2: Pricing (plans, comparison, CTA) — 5 test
- AC-012.3: FAQ (accordion, search) — 3 test
- AC-012.4: Registration (form validation, success) — 8 test
- AC-012.5: Password setup (token, rules) — 5 test
- AC-012.6: Checkout (plan selection, payment, success) — 8 test
- AC-012.7: Affiliate (info, login, register, panel) — 8 test

### US-013: Cross-App Sync Tests
**As a** QA engineer  
**I want** web↔admin veri senkronizasyonu test edilsin

**Acceptance Criteria**:
- AC-013.1: Web'de oluşturulan party admin'de görünür — 2 test
- AC-013.2: Admin'de oluşturulan tenant web'de aktif — 2 test
- AC-013.3: Cross-app settings sync — 2 test
- AC-013.4: Tenant isolation (farklı tenant verileri izole) — 4 test

### US-014: Debug-First Exploratory Pass
**As a** QA engineer  
**I want** tüm 79 route `--debug` ile taransın  
**So that** migration/refactor sonrası kırılan yerler ve ortak hatalar tespit edilsin

**Acceptance Criteria**:
- AC-014.1: Her route yükleniyor, console error yok
- AC-014.2: API çağrıları başarılı (no 4xx/5xx)
- AC-014.3: Tüm elementler render ediliyor
- AC-014.4: Ortak hata pattern'ları belgelenmiş
- AC-014.5: Batch fix uygulanmış

### US-015: Zero Lint/Type Error Guarantee
**As a** developer  
**I want** test kodunda 0 lint, 0 type error  
**So that** test kodu production kodu kadar temiz olsun

**Acceptance Criteria**:
- AC-015.1: `tsc --noEmit` tüm test dosyalarında pass
- AC-015.2: `eslint` tüm test dosyalarında pass
- AC-015.3: 0 `as any` kullanımı
- AC-015.4: 0 `@ts-ignore` / `@ts-expect-error`
- AC-015.5: CI'da lint+type-check gate (merge blocker)

### US-016: Page Object Model (POM)
**As a** developer  
**I want** her sayfa için POM class'ı olsun  
**So that** testler sürdürülebilir ve DRY olsun

**Acceptance Criteria**:
- AC-016.1: `BasePage` class (common navigation, wait, assert)
- AC-016.2: Web POM classes (31 route = 31 veya grouped class)
- AC-016.3: Admin POM classes (37 route)
- AC-016.4: Landing POM classes (11 route)
- AC-016.5: Mevcut helper'lar POM'a migrate edilmiş

### US-017: TestID Full Coverage
**As a** test engineer  
**I want** tüm etkileşimli elementlere data-testid eklensin

**Acceptance Criteria**:
- AC-017.1: Web: 94 → 350+ unique data-testid
- AC-017.2: Admin: 8 → 200+ unique data-testid
- AC-017.3: Landing: 0 → 50+ unique data-testid
- AC-017.4: Naming convention: `{page}-{element}-{action}`
- AC-017.5: Her button, input, select, modal, table, link, form kapsanmış

### US-018: CI Pipeline Fix & Multi-App
**As a** DevOps engineer  
**I want** CI pipeline düzeltilsin ve 3 app entegrasyonu

**Acceptance Criteria**:
- AC-018.1: `e2e-p0.yml` düzeltilmiş (directory-based, tag kaldırılmış)
- AC-018.2: `e2e-p1.yml` düzeltilmiş
- AC-018.3: CI'da backend + web + admin + landing başlatılıyor
- AC-018.4: Playwright version eşitlenmiş (tek versiyon)
- AC-018.5: Artifact upload (screenshot, video, trace)
- AC-018.6: Test report HTML görünür

### US-019: Helper Consolidation
**As a** developer  
**I want** 3 helper sistemi tek bir yerde birleşsin

**Acceptance Criteria**:
- AC-019.1: `tests/helpers/` tek kaynak (12 dosya)
- AC-019.2: `apps/web/e2e/helpers/` kaldırılmış veya re-export
- AC-019.3: `tests/e2e/web/helpers/test-utils.ts` POM'a taşınmış
- AC-019.4: Tek login() fonksiyonu

### US-020: Modal & Form Complete Testing
**As a** QA engineer  
**I want** 78 modal ve 34 form'un tamamı test edilsin

**Acceptance Criteria**:
- AC-020.1: Her modal: open, close, submit, validation, cancel
- AC-020.2: Her form: happy path, validation errors, empty submit, edge cases
- AC-020.3: ConfirmDialog tüm destructive action'larda test edilmiş
- AC-020.4: Toast notifications (success, error, warning, info) doğrulanmış

---

## 3. Functional Requirements

### FR-001: Unified Test Infrastructure
- Tek `playwright.config.ts` ile 3 project (web, admin, landing)
- Multi-browser support (Chromium primary, Firefox secondary)
- Headless and headed mode
- Parallel execution (4 workers CI, unlimited local)
- Screenshot/Video/Trace capture on failure
- 0 `as any`, 0 `@ts-ignore` in test code

### FR-002: Page Object Model (POM)
- `BasePage` abstract class: navigation, waitForLoad, getTitle, assertUrl, screenshot
- Her route için concrete POM class: `LoginPage`, `PartyListPage`, `AdminDashboardPage` vb.
- POM encapsulates selectors — tests never use raw `page.locator()` directly
- POM methods return typed objects, not `any`

### FR-003: Test Helpers (Consolidated)
- Single source: `tests/helpers/` (12 files)
- Auth helpers (login, logout, getAuthToken, loginAsAdmin)
- Wait helpers (toast, API, modal, loading, navigation)
- CRUD helpers per domain (party, sale, payment, invoice, device, inventory, cash, report)
- Assertion helpers (toast, modal, API, element, URL)
- Admin helpers (superAdmin login, tenant select, impersonate)

### FR-004: Test Data Management
- Seed data scripts (multiple roles, parties, devices, settings, tenants)
- Test data cleanup after each test (afterEach hook)
- Isolated test database (CI) or seeded dev database (local)
- Reusable fixtures with factory functions

### FR-005: TestID Standard
- Naming: `{page}-{element}-{action}` (e.g., `party-create-button`, `admin-tenant-edit-modal`)
- Coverage target: Web 350+, Admin 200+, Landing 50+
- Every interactive element: buttons, inputs, selects, modals, tables, links, tabs

### FR-006: Test Categories & Counts

#### Web App (31 routes, ~310 tests)
| Category | Tests | Routes Covered |
|----------|-------|---------------|
| Authentication | 14 | `/`, `/forgot-password` |
| Party Management | 20 | `/parties`, `/parties/$partyId` |
| Sales | 21 | Party detail (sale modal) |
| Payment & Collection | 15 | Party detail (payment modal) |
| Appointment | 15 | `/appointments` |
| Communication | 15 | `/campaigns` |
| Settings | 17 | `/settings/*` (5 sub-routes) |
| Invoice | 15 | `/invoices`, `/invoices/new`, `/invoices/purchases` |
| Device | 15 | Party detail (device tabs) |
| Inventory | 15 | `/inventory`, `/inventory/$id` |
| Cash Register | 10 | `/cashflow` |
| Reports | 12 | `/reports`, `/reports/activity` |
| SGK & UTS | 10 | `/sgk`, `/sgk/downloads`, `/uts` |
| POS & Suppliers | 10 | `/pos`, `/pos/*`, `/suppliers`, `/suppliers/$id` |
| Profile & Forgot Password | 4 | `/profile`, `/forgot-password` |

#### Admin Panel (37 routes, ~220 tests)
| Category | Tests | Routes Covered |
|----------|-------|---------------|
| Admin Auth | 5 | `/login`, `/unauthorized` |
| Dashboard | 5 | `/dashboard` |
| Tenants | 10 | `/tenants` |
| Plans | 6 | `/plans` |
| Users & Roles | 10 | `/users`, `/roles` |
| Affiliates | 8 | `/affiliates`, `/affiliates/$id` |
| Integrations | 10 | `/integrations/*`, `/admin/integrations/*` |
| SMS Management | 8 | `/sms/headers`, `/sms/packages` |
| Billing & Payments | 6 | `/billing`, `/payments` |
| Inventory & Production | 6 | `/inventory`, `/production` |
| AI Management | 5 | `/ai` |
| Marketplaces & Features | 6 | `/marketplaces`, `/features` |
| Files & OCR | 6 | `/files`, `/ocr-queue` |
| Notifications & Campaigns | 6 | `/notifications`, `/campaigns` |
| Analytics & Activity | 6 | `/analytics`, `/activity-logs` |
| API Keys & Add-ons | 5 | `/api-keys`, `/addons` |
| Support & Settings | 5 | `/support`, `/settings` |
| Patients & Appointments | 6 | `/patients`, `/appointments` |
| Suppliers | 4 | `/suppliers` |

#### Landing Page (11 routes, ~55 tests)
| Category | Tests | Routes Covered |
|----------|-------|---------------|
| Home & Navigation | 5 | `/` |
| Pricing | 5 | `/pricing` |
| FAQ | 3 | `/faq` |
| Registration | 8 | `/register` |
| Password Setup | 5 | `/setup-password` |
| Checkout | 8 | `/checkout`, `/checkout/success` |
| Affiliate | 8 | `/affiliate`, `/affiliate/*` |

#### Cross-App (12 tests)
| Category | Tests |
|----------|-------|
| Web ↔ Admin Sync | 8 |
| Tenant Isolation | 4 |

**Grand Total: ~597 tests across 79 routes**

### FR-007: CI/CD Integration
- GitHub Actions workflows (fix broken p0/p1 + multi-app)
- P0 critical-flow tests on every commit (~35 min)
- Full suite on every PR (~90 min)
- Directory-based filtering (not tag-based grep)
- 3 apps started in CI (web:8080, admin:8082, landing:3000)
- HTML report generation + artifact upload (30 days retention)

### FR-008: Debug-First Approach
- Phase 1: Exploratory — `--debug` scan all 79 routes, minimal assertions
- Phase 2: Pattern Analysis — categorize failures (selector, state, timing, API)
- Phase 3: Batch Fix — fix 60-70% of common patterns in one go
- Phase 4: Hardening — detailed assertions per flow

### FR-009: Zero Technical Debt
- `as any` — BANNED in test code
- `@ts-ignore` / `@ts-expect-error` — BANNED
- `tsc --noEmit` must pass on every PR
- `eslint` must pass on every PR
- All test files use strict TypeScript
- POM methods fully typed (no implicit `any`)

---

## 4. Non-Functional Requirements

### NFR-001: Performance
- P0 critical-flows: Max 35 minutes
- Per-app suite: Max 60 minutes
- Full suite (all 3 apps): Max 2 hours
- Single test: Max 2 minutes
- Parallel execution: 4 workers CI

### NFR-002: Reliability
- Flaky test rate: < 5%
- Success rate: > 95% (stable environment)
- False positive rate: < 2%
- Auto-retry on network errors (max 2 retries in CI)

### NFR-003: Maintainability
- POM pattern for all pages
- TypeScript strict mode
- ESLint rules enforced
- Reusable helpers (DRY)
- Clear test structure (one spec per feature)

### NFR-004: Security
- No production data in tests
- Credentials in environment variables only
- Sensitive data masking in logs
- Isolated test database

### NFR-005: Code Quality (MANDATORY)
- 0 TypeScript errors in all test files
- 0 ESLint errors in all test files
- 0 `as any` usage
- 0 `@ts-ignore` / `@ts-expect-error`
- CI gate: `tsc --noEmit` + `eslint` run before test execution

---

## 5. Constraints

### C-001: Browser Support
- Chromium (primary, all CI runs)
- Firefox (weekly full suite)
- WebKit (optional, weekly full suite)

### C-002: Environment
- Node.js 18+
- Backend: localhost:5003 (FastAPI)
- Web App: localhost:8080 (React/Vite)
- Admin Panel: localhost:8082 (React/Vite)
- Landing Page: localhost:3000 (Next.js 16)

### C-003: Test Data
- Isolated test database in CI
- Seed data for all roles (admin, audiologist, receptionist, super admin)
- Seed data for tenants, parties, devices, settings
- Cleanup after each test

---

## 6. Dependencies

### D-001: TestID Implementation (PARTIAL — IN PROGRESS)
**Status**: Partially Done  
**Priority**: P0

**Current State**:
- Web: 94 unique testids in ~14 components (LoginForm, PartyForm, SaleModal, PaymentTrackingModal, AppointmentForm, MainLayout, InvoiceModal)
- Admin: 8 testids in ~3 components (mostly icons — not useful)
- Landing: 0 testids

**Remaining TestID Work**:
- Web ~256 new testids: Dashboard, Settings pages, Inventory UI, Device management, Reports, Cash register, Sidebar/navigation, Tables/data grids, Search bars, Filter controls, SGK pages, Supplier pages, POS pages, UTS pages
- Admin ~192 new testids: ALL pages (effectively zero useful coverage)
- Landing ~50 new testids: ALL pages (zero coverage)

### D-002: Backend Stability
**Status**: READY  
**Priority**: P0  
- All endpoints working
- Consistent ResponseEnvelope format

### D-003: Test Data Seeding
**Status**: PARTIAL  
**Priority**: P0  
- User accounts partial (need all roles + admin users)
- Tenant data needed for cross-app tests
- Landing page registration test data needed

### D-004: CI Pipeline Health
**Status**: BROKEN  
**Priority**: P0  
- `e2e-p0.yml` and `e2e-p1.yml` grep `@p0`/`@p1` but 0 tests tagged
- Only web app started in most workflows
- Playwright version mismatch (root vs apps/web)

---

## 7. Success Criteria

### SC-001: Route Coverage
- [ ] 31/31 Web routes tested
- [ ] 37/37 Admin routes tested
- [ ] 11/11 Landing routes tested

### SC-002: Component Coverage
- [ ] 78/78 modals tested
- [ ] 34/34 forms tested
- [ ] All tables/lists tested

### SC-003: Code Quality
- [ ] 0 TypeScript errors
- [ ] 0 ESLint errors
- [ ] 0 `as any`
- [ ] POM implemented for all pages

### SC-004: CI Integration
- [ ] P0 tests on every commit
- [ ] Full suite on every PR
- [ ] All 3 apps in CI
- [ ] Reports and artifacts uploaded

### SC-005: Test Quality
- [ ] Flaky rate < 5%
- [ ] Success rate > 95%
- [ ] False positive < 2%

---

## 8. Out of Scope

- Visual regression testing (Phase 2)
- Performance/load testing (Phase 2)
- Security penetration testing (Phase 2)
- Mobile app testing (Phase 3)
- Accessibility testing (Phase 2)

---

## 9. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Admin TestID'ler çok fazla (~192) | High | High | Sayfa bazlı önceliklendirme, batch ekleme |
| Migration sonrası kırık UI'lar | High | High | Debug-first scan ile erken tespit |
| Flaky tests | Medium | Medium | Retry, explicit waits, POM isolation |
| CI timeout (3 app) | Medium | Medium | Parallel execution, app-level sharding |
| Landing Next.js farklı stack | Low | Low | Separate POM, separate fixtures |
| Helper consolidation breaking | Medium | Low | Incremental migration, backward compat |

---

## 10. Timeline (10 Weeks from 2026-02-16)

| Phase | Duration | Start | End | Focus |
|-------|----------|-------|-----|-------|
| Phase 0 | 1 week | Feb 16 | Feb 23 | Lint/Type zero |
| Phase 1 | 2 weeks | Feb 16 | Mar 2 | TestID sprint, config, POM, helpers |
| Phase 2 | 1 week | Mar 2 | Mar 9 | Debug-first scan, pattern analysis |
| Phase 3 | 2 weeks | Mar 9 | Mar 23 | Web App full coverage (~310 tests) |
| Phase 4 | 2 weeks | Mar 23 | Apr 6 | Admin Panel full coverage (~220 tests) |
| Phase 5 | 1 week | Apr 6 | Apr 13 | Landing Page full coverage (~55 tests) |
| Phase 6 | 1 week | Apr 13 | Apr 20 | Cross-app sync, hardening (~12 tests) |
| Phase 7 | 1 week | Apr 20 | Apr 27 | Stabilization, CI optimize, docs |

**Total**: 10 weeks, ~600 tests

---

## 11. Related Documents

- [Design Document](./design.md)
- [Tasks Document](./tasks.md)
- [Test Inventory](../../docs/playwright/tests/00-TEST-INVENTORY-INDEX.md)
- [Testing Guide](../../docs/playwright/03-TESTING-GUIDE.md)
- [Debugging Guide](../../docs/playwright/04-DEBUGGING-GUIDE.md)

---

## 12. Approval

**Status**: APPROVED (Updated 2026-02-16)  
**Original**: 2026-02-03  
**Scope**: Expanded from 200 → ~600 tests, 1 app → 3 apps
