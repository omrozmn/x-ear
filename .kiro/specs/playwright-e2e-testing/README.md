# Playwright E2E Testing Infrastructure - Spec

**Feature**: Full-Coverage E2E Testing with Playwright (Web + Admin + Landing)  
**Status**: IN PROGRESS (Spec Updated 2026-02-16)  
**Priority**: P0 (Critical)  
**Created**: 2026-02-03  
**Updated**: 2026-02-16

---

## Quick Links

- [Requirements](./requirements.md) - User stories, acceptance criteria, success metrics
- [Design](./design.md) - Architecture, POM, multi-app config, debug-first strategy
- [Tasks](./tasks.md) - Implementation tasks, timeline, progress tracking

---

## Overview

X-Ear CRM'in **3 frontend uygulamasının tamamı** (Web App, Admin Panel, Landing Page) için kapsamlı Playwright E2E test altyapısı. Her sayfadaki her element, her modal, her form — hiçbir şey atlanmadan — debug-first yaklaşımıyla test edilecek, örüntüler gözlemlenecek ve tüm UI'ın %100 çalıştığından emin olunacak.

### Golden Rules
- **0 TypeScript error** — `tsc --noEmit` her PR'da pass etmeli
- **0 ESLint error** — `eslint` her PR'da pass etmeli
- **0 `as any`** — Strict typing, test kodunda bile
- **%100 Route Coverage** — 79 route'un tamamı test edilecek
- **%100 Modal Coverage** — 78 modal'ın tamamı test edilecek
- **%100 Form Coverage** — 34 form'un tamamı test edilecek
- **Debug-first** — Önce `--debug` ile tara, örüntüleri bul, toplu çöz

### Key Metrics

| Metric | Value |
|--------|-------|
| **Target Apps** | 3 (Web, Admin, Landing) |
| **Total Routes** | 79 (Web: 31, Admin: 37, Landing: 11) |
| **Total Modals** | 78 (Web: ~55, Admin: ~12, Shared: ~3, Landing: ~8 inline) |
| **Total Forms** | 34 (Web: ~28, Admin: inline, Landing: ~3, Shared: ~3) |
| **Total Target Tests** | ~600+ |
| **Existing Tests** | ~470 across 109 spec files |
| **Test Categories** | 25+ |
| **Timeline** | 10 weeks (from 2026-02-16) |
| **CI Pipeline** | P0 critical-flows ~35 min |

### App Endpoints

| App | URL | Router | Auth |
|-----|-----|--------|------|
| **Web App (Hearing)** | localhost:8080 | TanStack Router (file-based) | AuthProvider → LoginForm |
| **Admin Panel** | localhost:8082 | TanStack Router (file-based) | AuthContext |
| **Landing Page** | localhost:3000 | Next.js 16 App Router | Public (affiliate panel auth-gated) |
| **Backend API** | localhost:5003 | FastAPI | JWT + Refresh |

### Test Categories

#### Web App (14 categories, ~310 tests)
1. **Authentication** (10) — Login, logout, token refresh, permissions, RBAC
2. **Party Management** (20) — CRUD, search, filter, bulk, export, pagination, detail, role assignment
3. **Sales** (20) — 3 satış yöntemi (modal, device assignment, cash register), SGK, partial payment
4. **Payment & Collection** (15) — Tahsilat tracking, partial payments, senet takibi
5. **Appointment** (15) — CRUD, calendar, SMS reminder, conflict, completion
6. **Communication** (15) — SMS/Email sending, templates, notifications, credits
7. **Settings** (20) — Company, team, roles, integration, subscription
8. **Invoice** (15) — CRUD, e-fatura, download PDF, SGK invoice, purchases
9. **Device** (15) — Assign, return, replace, trial, maintenance, history
10. **Inventory** (15) — CRUD, stock in/out, serial numbers, bulk ops, alerts
11. **Cash Register** (10) — Gelir/gider, search, filter, export, dashboard
12. **Reports** (12) — Sales, collection, stock, SGK, promissory, activity logs
13. **SGK & UTS** (10) — SGK query, report, e-receipt, UTS registration, downloads
14. **POS & Suppliers** (10) — POS payment, success/fail, supplier CRUD, detail

#### Admin Panel (22 categories, ~220 tests)
15. **Admin Auth** (5) — Login, unauthorized, session
16. **Admin Dashboard** (5) — Widgets, stats, quick actions
17. **Tenants** (10) — CRUD, user management, detail, confirmation
18. **Plans** (6) — CRUD, features toggle
19. **Users & Roles** (10) — CRUD, role assignment, permissions
20. **Affiliates** (8) — CRUD, detail, commission
21. **Integrations** (10) — Vatan SMS, email config/logs
22. **SMS Management** (8) — Headers, packages
23. **Billing & Payments** (6) — Billing history, payment tracking
24. **Inventory & Production** (6) — Admin inventory, production pipeline
25. **AI Management** (5) — AI config, model management
26. **Marketplaces & Features** (6) — Marketplace config, feature flags
27. **Files & OCR** (6) — File manager, OCR queue
28. **Notifications & Campaigns** (6) — Push notifications, campaign management
29. **Analytics & Activity** (6) — Analytics dashboard, activity logs
30. **API Keys & Add-ons** (5) — API key management, add-on config
31. **Support & Settings** (5) — Support tickets, system settings
32. **Patients & Appointments** (6) — Admin-level patient/appointment management
33. **Suppliers** (4) — Admin supplier management

#### Landing Page (7 categories, ~55 tests)
34. **Home & Navigation** (5) — Hero, features, header/footer, responsive
35. **Pricing** (5) — Plans, comparison, CTA
36. **FAQ** (3) — Q&A accordion, search
37. **Registration** (8) — Form validation, success, email verification
38. **Password Setup** (5) — Token validation, password rules, confirmation
39. **Checkout** (8) — Plan selection, payment, success
40. **Affiliate** (8) — Info page, login, register, panel dashboard

#### Cross-App (2 categories, ~12 tests)
41. **Web ↔ Admin Sync** (8) — Data created in web visible in admin, vice versa
42. **Tenant Isolation** (4) — Cross-tenant data isolation verification

---

## Getting Started

### Prerequisites

```bash
# Node.js 18+
node --version

# Backend running
curl http://localhost:5003/health

# Web App running
curl http://localhost:8080

# Admin Panel running
curl http://localhost:8082

# Landing Page running
curl http://localhost:3000
```

### Installation

```bash
cd x-ear

# Install Playwright (root)
npm install -D @playwright/test

# Install browsers
npx playwright install --with-deps chromium

# Install all dependencies
npm install
```

### Running Tests

```bash
# All tests (all 3 apps)
npx playwright test

# By app
npx playwright test --project=web
npx playwright test --project=admin
npx playwright test --project=landing

# Critical flows (P0)
npx playwright test tests/e2e/critical-flows/p0-revenue-legal/

# Debug mode (pattern discovery)
npx playwright test --debug

# UI mode
npx playwright test --ui

# Specific category
npx playwright test tests/e2e/auth
npx playwright test tests/e2e/admin

# With trace
npx playwright test --trace on
```

---

## Current Status (Updated 2026-02-16)

### Codebase Reality
- **109 spec files** exist across 4 locations
- **~470 test() calls** already written
- **12 helper files** in `tests/helpers/`
- **5 fixture files** in `tests/fixtures/`
- **5 CI workflow files** exist (2 broken)

### TestID Coverage (CRITICAL GAP)

| App | Unique TestIDs | Components w/ TestID | Total Components | Coverage |
|-----|---------------|---------------------|-----------------|----------|
| Web | 94 | ~14 | ~442 | ~3% |
| Admin | 8 | ~3 | ~150+ | <1% |
| Landing | 0 | 0 | ~30+ | 0% |

### CI Pipeline Status
- ✅ `e2e-tests.yml` — Works (web only)
- ✅ `critical-flows.yml` — Works (starts admin too)
- ❌ `e2e-p0.yml` — BROKEN (uses `--grep @p0` but no tests tagged)
- ❌ `e2e-p1.yml` — BROKEN (uses `--grep @p1` but no tests tagged)
- ⚠️ `e2e-full.yml` — Works but missing admin/landing

### Known Issues
1. CI tag filtering broken — `@p0`/`@p1` tags don't exist in any test
2. Config fragmentation — 2 playwright configs, root points to `apps/web/e2e` only
3. Helper duplication — 3 separate helper systems with overlapping code
4. Ghost TestIDs — `communication.e2e.spec.ts` references 60+ testids that don't exist
5. Test scatter — Tests in 4 different directories
6. Playwright version mismatch — Root: `^1.58.1`, Web: `^1.57.0`
7. No POM pattern — Tests use raw `page` object, no abstraction

---

## Project Structure

```
x-ear/
├── .kiro/specs/playwright-e2e-testing/
│   ├── README.md              ← This file
│   ├── requirements.md        ← User stories, acceptance criteria
│   ├── design.md              ← Architecture, POM, config, strategy
│   └── tasks.md               ← Implementation tasks with phases
├── tests/
│   ├── e2e/
│   │   ├── auth/              ← Auth tests (1 spec, 5 tests)
│   │   ├── party/             ← Party tests (2 specs, 16 tests)
│   │   ├── sale/              ← Sale tests (2 specs, 20 tests)
│   │   ├── payment/           ← Payment tests (2 specs, 15 tests)
│   │   ├── appointment/       ← Appointment tests (2 specs, 15 tests)
│   │   ├── communication/     ← Communication tests (3 specs, 15 tests)
│   │   ├── settings/          ← Settings tests (2 specs, 20 tests)
│   │   ├── invoice/           ← Invoice tests (1 spec, 15 tests)
│   │   ├── device/            ← Device tests (1 spec, 15 tests)
│   │   ├── inventory/         ← Inventory tests (1 spec, 10 tests)
│   │   ├── cash/              ← Cash register tests (1 spec, 10 tests)
│   │   ├── reports/           ← Report tests (1 spec, 12 tests)
│   │   ├── smoke/             ← Smoke tests (1 spec, 2 tests)
│   │   ├── landing/           ← Landing tests (2 specs, 7 tests)
│   │   ├── admin/             ← Admin tests (16 specs, ~40 tests)
│   │   ├── web/               ← Web-specific tests (32 specs, ~110 tests)
│   │   ├── critical-flows/    ← Priority-organized flows (16 specs)
│   │   │   ├── p0-revenue-legal/
│   │   │   ├── p1-core-operations/
│   │   │   ├── p2-admin-operations/
│   │   │   └── cross-app-sync/
│   │   ├── fixtures/          ← Custom Playwright fixtures
│   │   └── pages/             ← POM classes (TO BE CREATED)
│   ├── helpers/               ← 12 helper files
│   └── fixtures/              ← 5 fixture files
├── apps/web/e2e/              ← Web-specific E2E (12 specs, ~63 tests)
│   └── helpers/               ← 7 web-specific helpers
├── playwright.config.ts       ← Root config (TO BE UNIFIED)
└── .github/workflows/         ← CI workflows (5 files)
```

---

## Success Criteria

### Code Quality (MANDATORY — Merge Blockers)
- [ ] 0 TypeScript errors across all test files
- [ ] 0 ESLint errors across all test files
- [ ] 0 `as any` usage in test code
- [ ] 0 `@ts-ignore` / `@ts-expect-error` in test code

### Route Coverage
- [ ] 31/31 Web App routes tested
- [ ] 37/37 Admin Panel routes tested
- [ ] 11/11 Landing Page routes tested

### Component Coverage
- [ ] 78/78 modals tested (open, close, submit, validation)
- [ ] 34/34 forms tested (happy path, validation, edge cases)

### TestID Coverage
- [ ] Web: 94 → 350+ unique data-testid
- [ ] Admin: 8 → 200+ unique data-testid
- [ ] Landing: 0 → 50+ unique data-testid

### CI Integration
- [ ] P0 critical-flows on every commit
- [ ] Full suite on every PR
- [ ] All 3 apps started in CI
- [ ] Broken `@p0`/`@p1` grep filtering fixed

### Test Quality
- [ ] Flaky rate < 5%
- [ ] Success rate > 95%
- [ ] False positive < 2%

---

## Timeline (10 Weeks from 2026-02-16)

| Phase | Duration | Focus | Target |
|-------|----------|-------|--------|
| **Phase 0**: Lint/Type Zero | Week 1 | 0 lint, 0 type errors | Clean baseline |
| **Phase 1**: Infrastructure | Week 1-2 | TestID sprint, config unify, POM scaffold | Foundation |
| **Phase 2**: Debug-First Scan | Week 3 | `--debug` every route, pattern analysis | Patterns documented |
| **Phase 3**: Web App Full | Week 4-5 | 31 routes, 55 modals, 28 forms | ~310 tests |
| **Phase 4**: Admin Panel Full | Week 6-7 | 37 routes, 12 modals | ~220 tests |
| **Phase 5**: Landing Page Full | Week 8 | 11 routes | ~55 tests |
| **Phase 6**: Cross-App | Week 9 | Web↔Admin sync, tenant isolation | ~12 tests |
| **Phase 7**: Stabilization | Week 10 | Flaky fix, CI optimize, docs | Production-ready |

---

## Related Documentation

- [Test Inventory](../../docs/playwright/tests/00-TEST-INVENTORY-INDEX.md)
- [Testing Guide](../../docs/playwright/03-TESTING-GUIDE.md)
- [Debugging Guide](../../docs/playwright/04-DEBUGGING-GUIDE.md)

---

## Approval

**Status**: APPROVED (Updated 2026-02-16)  
**Original Approval**: 2026-02-03  
**Scope Expansion**: 200 tests → ~600+ tests, 1 app → 3 apps
