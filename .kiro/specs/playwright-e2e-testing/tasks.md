# Tasks: Playwright E2E Testing Infrastructure

**Feature**: Full-Coverage E2E Testing (Web + Admin + Landing)  
**Status**: IN PROGRESS  
**Created**: 2026-02-03  
**Updated**: 2026-02-16  
**Total Phases**: 8 (10 weeks)  
**Target Tests**: ~600+

---

## Phase 0: Zero Tech Debt (Week 1)

### 0.1 TypeScript — Zero Errors
- [x] 0.1.1 Run `npx tsc --noEmit` on all test files, record baseline error count
- [x] 0.1.2 Fix all type errors in `tests/helpers/*.ts`
- [x] 0.1.3 Fix all type errors in `tests/e2e/**/*.spec.ts`
- [x] 0.1.4 Fix all type errors in `apps/web/e2e/**/*.spec.ts`
- [x] 0.1.5 Add `tests/` to root `tsconfig.json` include
- [x] 0.1.6 Verify `npx tsc --noEmit` → 0 errors

### 0.2 ESLint — Zero Warnings
- [x] 0.2.1 Run `npx eslint tests/` and record baseline
- [x] 0.2.2 Create `.eslintrc.cjs` for `tests/` with Playwright rules
- [x] 0.2.3 Fix all lint errors in helpers
- [x] 0.2.4 Fix all lint errors in spec files
- [x] 0.2.5 Add `eslint-plugin-playwright` to devDependencies
- [x] 0.2.6 Verify `npx eslint tests/` → 0 errors, 0 warnings

### 0.3 Playwright Version Alignment
- [x] 0.3.1 Pin `@playwright/test` to single version in root `package.json`
- [x] 0.3.2 Remove duplicate Playwright dependency from `apps/web/package.json`
- [x] 0.3.3 Run `npx playwright install` to sync browsers
- [x] 0.3.4 Verify `npx playwright --version` returns single version

---

## Phase 1: Infrastructure (Week 1-2)

### 1.1 Unified Playwright Config
- [x] 1.1.1 Install Playwright (already installed)
- [ ] 1.1.2 Replace root `playwright.config.ts` with 3-project config (web, admin, landing)
- [ ] 1.1.3 Delete `apps/web/playwright.config.ts`
- [ ] 1.1.4 Add `webServer` array (3 apps + backend)
- [ ] 1.1.5 Add auth setup projects (web-auth-setup, admin-auth-setup)
- [ ] 1.1.6 Configure `storageState` paths for auth reuse
- [ ] 1.1.7 Verify `npx playwright test --list --project=web` lists tests
- [ ] 1.1.8 Verify `npx playwright test --list --project=admin` lists tests
- [ ] 1.1.9 Verify `npx playwright test --list --project=landing` lists tests

### 1.2 Page Object Model (POM) — Base
- [ ] 1.2.1 Create `tests/pom/base.page.ts` (BasePage abstract class)
- [ ] 1.2.2 Implement `goto()`, `waitForPageLoad()`, `testId()` in BasePage
- [ ] 1.2.3 Implement `expectSuccessToast()`, `expectErrorToast()` in BasePage
- [ ] 1.2.4 Implement `waitForModalOpen()`, `waitForModalClose()` in BasePage
- [ ] 1.2.5 Implement `waitForApiResponse()` in BasePage
- [ ] 1.2.6 Implement `captureConsoleErrors()`, `captureNetworkFailures()` in BasePage
- [ ] 1.2.7 Create `tests/pom/web/` directory
- [ ] 1.2.8 Create `tests/pom/admin/` directory
- [ ] 1.2.9 Create `tests/pom/landing/` directory

### 1.3 Helper Consolidation
- [x] 1.3.1 Audit existing helpers: `tests/helpers/` (12 files)
- [x] 1.3.2 Audit existing helpers: `apps/web/e2e/helpers/` (7 files)
- [x] 1.3.3 Audit existing helpers: `tests/e2e/web/helpers/` (1 file)
- [ ] 1.3.4 Create `tests/helpers/auth.helper.ts` (multi-app)
- [ ] 1.3.5 Create `tests/helpers/wait.helper.ts`
- [ ] 1.3.6 Create `tests/helpers/crud.helper.ts`
- [ ] 1.3.7 Create `tests/helpers/assert.helper.ts`
- [ ] 1.3.8 Create `tests/helpers/modal.helper.ts`
- [ ] 1.3.9 Create `tests/helpers/form.helper.ts`
- [ ] 1.3.10 Create `tests/helpers/table.helper.ts`
- [ ] 1.3.11 Create `tests/helpers/debug.helper.ts`
- [ ] 1.3.12 Create `tests/helpers/navigation.helper.ts`
- [ ] 1.3.13 Migrate old helper imports to new paths in all spec files
- [ ] 1.3.14 Delete `apps/web/e2e/helpers/` (after migration)
- [ ] 1.3.15 Delete `tests/e2e/web/helpers/` (after migration)

### 1.4 Test Fixtures
- [x] 1.4.1 Create `tests/fixtures/users.fixture.ts` (web + admin users)
- [ ] 1.4.2 Create `tests/fixtures/parties.fixture.ts`
- [ ] 1.4.3 Create `tests/fixtures/devices.fixture.ts`
- [ ] 1.4.4 Create `tests/fixtures/tenants.fixture.ts`
- [ ] 1.4.5 Create `tests/fixtures/settings.fixture.ts`
- [ ] 1.4.6 Create `tests/config/test-data.ts` (shared constants)
- [ ] 1.4.7 Create `tests/config/env.ts` (environment loader)

### 1.5 TestID Sprint — Priority 1 (Revenue-Critical)
- [x] 1.5.1 Add TestIDs to Login form (Web)
- [x] 1.5.2 Add TestIDs to Login form (Admin)
- [x] 1.5.3 Add TestIDs to Party list page
- [x] 1.5.4 Add TestIDs to Party form modal
- [ ] 1.5.5 Add TestIDs to Sale list page
- [ ] 1.5.6 Add TestIDs to Sale form modal
- [ ] 1.5.7 Add TestIDs to Payment tracking modal
- [ ] 1.5.8 Add TestIDs to Toast notifications (success, error, warning, info)
- [ ] 1.5.9 Add TestIDs to Loading spinners
- [ ] 1.5.10 Add TestIDs to Sidebar/TopNav
- [ ] 1.5.11 Add TestIDs to User menu / Logout
- [ ] 1.5.12 Add TestIDs to Dashboard widgets

### 1.6 CI/CD Fix
- [ ] 1.6.1 Replace `e2e-p0.yml` with `e2e-critical.yml` (project-based, not grep)
- [ ] 1.6.2 Replace `e2e-p1.yml` with `e2e-pr.yml` (matrix strategy)
- [ ] 1.6.3 Create `e2e-weekly.yml` (3-browser)
- [ ] 1.6.4 Update checkout + node + python actions to v4/v5
- [ ] 1.6.5 Add concurrency groups to prevent duplicate runs
- [ ] 1.6.6 Verify CI runs and reports artifacts

---

## Phase 2: Debug-First Scan (Week 2-3)

### 2.1 Web App Route Scan (31 routes)
- [ ] 2.1.1 `/login` — navigate + screenshot + console scan
- [ ] 2.1.2 `/forgot-password` — navigate + screenshot + console scan
- [ ] 2.1.3 `/dashboard` — navigate + screenshot + console scan
- [ ] 2.1.4 `/parties` — navigate + screenshot + console scan
- [ ] 2.1.5 `/parties/:id` — navigate + screenshot + console scan
- [ ] 2.1.6 `/sales` — navigate + screenshot + console scan
- [ ] 2.1.7 `/sales/:id` — navigate + screenshot + console scan
- [ ] 2.1.8 `/payments` — navigate + screenshot + console scan
- [ ] 2.1.9 `/appointments` — navigate + screenshot + console scan
- [ ] 2.1.10 `/communication` — navigate + screenshot + console scan
- [ ] 2.1.11 `/settings` — navigate + screenshot + console scan
- [ ] 2.1.12 `/settings/users` — navigate + screenshot + console scan
- [ ] 2.1.13 `/settings/branches` — navigate + screenshot + console scan
- [ ] 2.1.14 `/settings/roles` — navigate + screenshot + console scan
- [ ] 2.1.15 `/settings/general` — navigate + screenshot + console scan
- [ ] 2.1.16 `/invoices` — navigate + screenshot + console scan
- [ ] 2.1.17 `/devices` — navigate + screenshot + console scan
- [ ] 2.1.18 `/inventory` — navigate + screenshot + console scan
- [ ] 2.1.19 `/cash-register` — navigate + screenshot + console scan
- [ ] 2.1.20 `/reports` — navigate + screenshot + console scan
- [ ] 2.1.21 `/reports/sales` — navigate + screenshot + console scan
- [ ] 2.1.22 `/reports/collections` — navigate + screenshot + console scan
- [ ] 2.1.23 `/reports/sgk` — navigate + screenshot + console scan
- [ ] 2.1.24 `/profile` — navigate + screenshot + console scan
- [ ] 2.1.25 Remaining routes (7) — navigate + screenshot + console scan
- [ ] 2.1.26 Generate `debug-scan-report-web.json`

### 2.2 Admin Panel Route Scan (37 routes)
- [ ] 2.2.1 `/login` — navigate + screenshot + console scan
- [ ] 2.2.2 `/dashboard` — navigate + screenshot + console scan
- [ ] 2.2.3 `/tenants` — navigate + screenshot + console scan
- [ ] 2.2.4 `/tenants/:id` — navigate + screenshot + console scan
- [ ] 2.2.5 `/users` — navigate + screenshot + console scan
- [ ] 2.2.6 `/users/:id` — navigate + screenshot + console scan
- [ ] 2.2.7 `/subscriptions` — navigate + screenshot + console scan
- [ ] 2.2.8 `/activity-logs` — navigate + screenshot + console scan
- [ ] 2.2.9 `/devices` — navigate + screenshot + console scan
- [ ] 2.2.10 `/settings` — navigate + screenshot + console scan
- [ ] 2.2.11 `/reports` — navigate + screenshot + console scan
- [ ] 2.2.12 Remaining routes (26) — navigate + screenshot + console scan
- [ ] 2.2.13 Generate `debug-scan-report-admin.json`

### 2.3 Landing Page Route Scan (11 routes)
- [ ] 2.3.1 `/` (home) — navigate + screenshot + console scan
- [ ] 2.3.2 `/about` — navigate + screenshot + console scan
- [ ] 2.3.3 `/pricing` — navigate + screenshot + console scan
- [ ] 2.3.4 `/contact` — navigate + screenshot + console scan
- [ ] 2.3.5 `/blog` — navigate + screenshot + console scan
- [ ] 2.3.6 `/blog/:slug` — navigate + screenshot + console scan
- [ ] 2.3.7 `/features` — navigate + screenshot + console scan
- [ ] 2.3.8 `/faq` — navigate + screenshot + console scan
- [ ] 2.3.9 `/privacy` — navigate + screenshot + console scan
- [ ] 2.3.10 `/terms` — navigate + screenshot + console scan
- [ ] 2.3.11 Remaining routes — navigate + screenshot + console scan
- [ ] 2.3.12 Generate `debug-scan-report-landing.json`

### 2.4 Pattern Analysis
- [ ] 2.4.1 Analyze all 3 scan reports — classify failures
- [ ] 2.4.2 List missing TestIDs per route
- [ ] 2.4.3 List console errors per route
- [ ] 2.4.4 List network 4xx/5xx per route
- [ ] 2.4.5 Identify common failure patterns (timing, state, selector)
- [ ] 2.4.6 Create priority fix list ordered by impact
- [ ] 2.4.7 Generate `debug-analysis-report.md`

---

## Phase 3: Web App Full Coverage (Week 3-6) — ~310 tests

### 3.1 Auth Tests (12 tests)
- [x] 3.1.1 Login with valid credentials
- [x] 3.1.2 Login with invalid credentials
- [x] 3.1.3 Logout
- [x] 3.1.4 Token refresh
- [x] 3.1.5 Session timeout
- [ ] 3.1.6 Forgot password flow
- [ ] 3.1.7 Permission check — view-only role
- [ ] 3.1.8 Permission check — create/edit role
- [ ] 3.1.9 Permission check — admin role
- [ ] 3.1.10 Role-based sidebar visibility
- [ ] 3.1.11 Unauthorized redirect to login
- [ ] 3.1.12 POM: Create `WebLoginPage`

### 3.2 Dashboard Tests (8 tests)
- [ ] 3.2.1 Dashboard loads with all widgets
- [ ] 3.2.2 Revenue summary widget — data displayed
- [ ] 3.2.3 Today's appointments widget — data displayed
- [ ] 3.2.4 Recent sales widget — data displayed
- [ ] 3.2.5 Quick action buttons functional
- [ ] 3.2.6 Dashboard date range filter
- [ ] 3.2.7 Dashboard responsive layout
- [ ] 3.2.8 POM: Create `WebDashboardPage`

### 3.3 Party Management Tests (25 tests)
- [x] 3.3.1 Party list page loads
- [x] 3.3.2 Party list — table displayed with data
- [x] 3.3.3 Create party — open modal
- [x] 3.3.4 Create party — valid data → success toast
- [x] 3.3.5 Create party — validation errors shown
- [x] 3.3.6 Update party
- [x] 3.3.7 Delete party — confirm dialog
- [x] 3.3.8 Search party by name
- [ ] 3.3.9 Search party by phone
- [x] 3.3.10 Filter by role
- [x] 3.3.11 Filter by date range
- [ ] 3.3.12 Party detail page loads
- [ ] 3.3.13 Party detail — tabs (info, sales, appointments, notes)
- [ ] 3.3.14 Party detail — edit from detail
- [ ] 3.3.15 Party detail — sale history
- [ ] 3.3.16 Party detail — appointment history
- [x] 3.3.17 Pagination — next/prev
- [ ] 3.3.18 Sorting by column
- [ ] 3.3.19 Bulk select parties
- [ ] 3.3.20 Bulk delete parties
- [x] 3.3.21 Bulk export to CSV
- [ ] 3.3.22 Bulk import from CSV
- [ ] 3.3.23 Party role assignment modal
- [ ] 3.3.24 Duplicate party detection
- [ ] 3.3.25 POM: Create `WebPartyListPage`, `WebPartyDetailPage`

### 3.4 Sales Tests (30 tests)
- [x] 3.4.1 Sales page loads
- [x] 3.4.2 Sales list — table displayed
- [x] 3.4.3 Open new sale modal
- [x] 3.4.4 Search sales
- [x] 3.4.5 Filter sales by date
- [ ] 3.4.6 Create sale — device only
- [ ] 3.4.7 Create sale — device + SGK
- [ ] 3.4.8 Create sale — pill only
- [ ] 3.4.9 Create sale — pill + SGK
- [ ] 3.4.10 Create sale — partial payment
- [ ] 3.4.11 Create sale — from device assignment
- [ ] 3.4.12 Create sale — trial device
- [ ] 3.4.13 SGK calculation — 0-18 age
- [ ] 3.4.14 SGK calculation — 18+ working
- [ ] 3.4.15 SGK calculation — 18+ retired
- [ ] 3.4.16 SGK calculation — 65+ age
- [ ] 3.4.17 Sale with auto-invoice
- [ ] 3.4.18 Sale detail page loads
- [ ] 3.4.19 Sale detail — payment info
- [ ] 3.4.20 Sale detail — device info
- [ ] 3.4.21 Update sale
- [ ] 3.4.22 Delete sale — confirm
- [ ] 3.4.23 Sale pagination
- [ ] 3.4.24 Sale sorting
- [ ] 3.4.25 Sale status filter
- [ ] 3.4.26 Sale modal — party search & select
- [ ] 3.4.27 Sale modal — device search & select
- [ ] 3.4.28 Sale modal — validation errors
- [ ] 3.4.29 Sale modal — cancel/close
- [ ] 3.4.30 POM: Create `WebSaleListPage`, `WebSaleDetailPage`

### 3.5 Payment & Collection Tests (20 tests)
- [ ] 3.5.1 Payment page loads
- [ ] 3.5.2 Payment list — table displayed
- [ ] 3.5.3 Open payment tracking modal
- [ ] 3.5.4 Add cash payment
- [ ] 3.5.5 Add card payment
- [ ] 3.5.6 Add promissory note
- [ ] 3.5.7 Partial payment — cash + card
- [ ] 3.5.8 Partial payment — cash + note
- [ ] 3.5.9 Partial payment — card + note
- [ ] 3.5.10 Full payment validation
- [ ] 3.5.11 Overpayment validation (error)
- [ ] 3.5.12 Payment history in sale detail
- [ ] 3.5.13 Promissory note — maturity date
- [ ] 3.5.14 Promissory note — collection
- [ ] 3.5.15 Promissory note — overdue alert
- [ ] 3.5.16 Payment search
- [ ] 3.5.17 Payment filter by date
- [ ] 3.5.18 Payment filter by type
- [ ] 3.5.19 Payment pagination
- [ ] 3.5.20 POM: Create `WebPaymentListPage`

### 3.6 Appointment Tests (20 tests)
- [x] 3.6.1 Appointments page loads
- [x] 3.6.2 Calendar view displayed
- [x] 3.6.3 Open new appointment modal
- [x] 3.6.4 Filter by date
- [x] 3.6.5 Filter by status
- [ ] 3.6.6 Create appointment — valid data
- [ ] 3.6.7 Create appointment — validation errors
- [ ] 3.6.8 Update appointment (drag/resize)
- [ ] 3.6.9 Cancel appointment — confirm
- [ ] 3.6.10 Complete appointment
- [ ] 3.6.11 Appointment conflict detection
- [ ] 3.6.12 SMS reminder trigger
- [ ] 3.6.13 Search by patient name
- [ ] 3.6.14 Bulk appointment creation
- [ ] 3.6.15 Export appointments
- [ ] 3.6.16 Appointment history
- [ ] 3.6.17 Calendar week/month toggle
- [ ] 3.6.18 Calendar navigate prev/next
- [ ] 3.6.19 Recurring appointment
- [ ] 3.6.20 POM: Create `WebAppointmentPage`

### 3.7 Communication Tests (18 tests)
- [x] 3.7.1 Communication center loads
- [x] 3.7.2 Message composition interface
- [x] 3.7.3 Open compose modal
- [x] 3.7.4 Display templates
- [x] 3.7.5 Display message history
- [x] 3.7.6 Filter by channel
- [ ] 3.7.7 Send SMS — single recipient
- [ ] 3.7.8 Send SMS — bulk
- [ ] 3.7.9 Send Email — single
- [ ] 3.7.10 Send Email — bulk
- [ ] 3.7.11 Create SMS template
- [ ] 3.7.12 Edit SMS template
- [ ] 3.7.13 Delete SMS template
- [ ] 3.7.14 Create Email template
- [ ] 3.7.15 In-app notification
- [ ] 3.7.16 Notification settings
- [ ] 3.7.17 SMS credit check
- [ ] 3.7.18 POM: Create `WebCommunicationPage`

### 3.8 Invoice Tests (18 tests)
- [x] 3.8.1 Invoice page loads
- [x] 3.8.2 Invoice list — table displayed
- [x] 3.8.3 Search by invoice number
- [x] 3.8.4 Filter by date
- [x] 3.8.5 Filter by status
- [x] 3.8.6 Pagination
- [ ] 3.8.7 Create invoice from sale
- [ ] 3.8.8 Create invoice manually
- [ ] 3.8.9 Send e-invoice
- [ ] 3.8.10 Download invoice PDF
- [ ] 3.8.11 Cancel invoice
- [ ] 3.8.12 Create SGK invoice
- [ ] 3.8.13 Update invoice
- [ ] 3.8.14 Invoice detail page
- [ ] 3.8.15 Bulk invoice creation
- [ ] 3.8.16 Invoice print preview
- [ ] 3.8.17 Invoice export
- [ ] 3.8.18 POM: Create `WebInvoiceListPage`

### 3.9 Device Tests (18 tests)
- [x] 3.9.1 Device page loads
- [x] 3.9.2 Device list — table displayed
- [x] 3.9.3 Search by serial number
- [x] 3.9.4 Filter by status
- [x] 3.9.5 Filter by brand
- [x] 3.9.6 Pagination
- [ ] 3.9.7 Assign device — sale
- [ ] 3.9.8 Assign device — trial
- [ ] 3.9.9 Assign device — loaner
- [ ] 3.9.10 Assign device — repair
- [ ] 3.9.11 Assign device — replacement
- [ ] 3.9.12 Return device
- [ ] 3.9.13 Replace device
- [ ] 3.9.14 Device history view
- [ ] 3.9.15 Device stock alert
- [ ] 3.9.16 Device detail page
- [ ] 3.9.17 Device batch import
- [ ] 3.9.18 POM: Create `WebDevicePage`

### 3.10 Inventory Tests (12 tests)
- [x] 3.10.1 Inventory page loads
- [x] 3.10.2 Inventory list — table displayed
- [x] 3.10.3 Open add item modal
- [x] 3.10.4 Search inventory
- [x] 3.10.5 Filter by category
- [x] 3.10.6 Stock alerts displayed
- [ ] 3.10.7 Add inventory item
- [ ] 3.10.8 Update inventory item
- [ ] 3.10.9 Delete inventory item
- [ ] 3.10.10 Export inventory
- [ ] 3.10.11 Low stock notifications
- [ ] 3.10.12 POM: Create `WebInventoryPage`

### 3.11 Cash Register Tests (12 tests)
- [x] 3.11.1 Cash register page loads
- [x] 3.11.2 Transaction list displayed
- [x] 3.11.3 Open add transaction modal
- [x] 3.11.4 Filter by type
- [x] 3.11.5 Filter by date
- [x] 3.11.6 Cash summary displayed
- [ ] 3.11.7 Create income record
- [ ] 3.11.8 Create expense record
- [ ] 3.11.9 Update record
- [ ] 3.11.10 Delete record — confirm
- [ ] 3.11.11 Cash balance validation
- [ ] 3.11.12 POM: Create `WebCashRegisterPage`

### 3.12 Report Tests (15 tests)
- [x] 3.12.1 Reports page loads
- [x] 3.12.2 Sales report displayed
- [x] 3.12.3 Collection report displayed
- [x] 3.12.4 Filter by date range
- [x] 3.12.5 Export to Excel
- [x] 3.12.6 SGK tracking report
- [ ] 3.12.7 Sales report — daily breakdown
- [ ] 3.12.8 Sales report — monthly breakdown
- [ ] 3.12.9 Stock report
- [ ] 3.12.10 Promissory note report
- [ ] 3.12.11 Revenue chart
- [ ] 3.12.12 Report print
- [ ] 3.12.13 Report PDF export
- [ ] 3.12.14 Custom date range
- [ ] 3.12.15 POM: Create `WebReportPage`

### 3.13 Settings & Profile Tests (25 tests)
- [ ] 3.13.1 Settings page loads
- [ ] 3.13.2 General settings tab
- [ ] 3.13.3 User management — list
- [ ] 3.13.4 User management — create
- [ ] 3.13.5 User management — edit
- [ ] 3.13.6 User management — deactivate
- [ ] 3.13.7 Role management — list
- [ ] 3.13.8 Role management — create
- [ ] 3.13.9 Role management — permissions grid
- [ ] 3.13.10 Branch management — list
- [ ] 3.13.11 Branch management — create
- [ ] 3.13.12 Branch management — edit
- [ ] 3.13.13 SGK settings form
- [ ] 3.13.14 E-invoice settings form
- [ ] 3.13.15 SMS settings form
- [ ] 3.13.16 Email/SMTP settings form
- [ ] 3.13.17 Backup settings
- [ ] 3.13.18 Theme toggle
- [ ] 3.13.19 Language selector
- [ ] 3.13.20 Profile page loads
- [ ] 3.13.21 Update profile
- [ ] 3.13.22 Change password
- [ ] 3.13.23 Two-factor authentication
- [ ] 3.13.24 Audit log view
- [ ] 3.13.25 POM: Create `WebSettingsPage`, `WebProfilePage`

### 3.14 Web Modal Tests (55 modals)
- [ ] 3.14.1 Party create modal — open/close/submit/cancel
- [ ] 3.14.2 Party edit modal — open/close/submit/cancel
- [ ] 3.14.3 Party delete confirm modal
- [ ] 3.14.4 Party bulk import modal
- [ ] 3.14.5 Sale create modal — open/close/submit/cancel
- [ ] 3.14.6 Sale edit modal
- [ ] 3.14.7 Sale delete confirm modal
- [ ] 3.14.8 Device assignment modal
- [ ] 3.14.9 Payment tracking modal
- [ ] 3.14.10 Payment add modal
- [ ] 3.14.11 Appointment create modal
- [ ] 3.14.12 Appointment edit modal
- [ ] 3.14.13 Appointment cancel modal
- [ ] 3.14.14 SMS compose modal
- [ ] 3.14.15 Email compose modal
- [ ] 3.14.16 Template create modal
- [ ] 3.14.17 Invoice create modal
- [ ] 3.14.18 Invoice cancel modal
- [ ] 3.14.19 Device assign modal
- [ ] 3.14.20 Device return modal
- [ ] 3.14.21 Inventory add modal
- [ ] 3.14.22 Inventory edit modal
- [ ] 3.14.23 Cash register add modal
- [ ] 3.14.24 User create modal
- [ ] 3.14.25 User edit modal
- [ ] 3.14.26 Role create modal
- [ ] 3.14.27 Branch create modal
- [ ] 3.14.28 All modals — backdrop click closes
- [ ] 3.14.29 All modals — Escape key closes
- [ ] 3.14.30 All modals — loading state on submit
- [ ] 3.14.31-55 Remaining modals (test each: open, fill, submit, cancel, validation)

### 3.15 Web Form Validation Tests (~28 forms)
- [ ] 3.15.1 Login form — required fields
- [ ] 3.15.2 Party form — required fields, phone format, email format
- [ ] 3.15.3 Sale form — required fields, amount validation
- [ ] 3.15.4 Payment form — amount > 0, type required
- [ ] 3.15.5 Appointment form — date required, conflict check
- [ ] 3.15.6 SMS form — recipient + message required, character limit
- [ ] 3.15.7 Invoice form — required fields
- [ ] 3.15.8 Settings forms — save + cancel behavior
- [ ] 3.15.9 Profile form — name required, email format
- [ ] 3.15.10 Password form — strength requirements, match
- [ ] 3.15.11 Each form: submit with empty → validation errors shown
- [ ] 3.15.12 Each form: field-level error clears on input

---

## Phase 4: Admin Panel Full Coverage (Week 6-8) — ~220 tests

### 4.1 Admin Auth Tests (8 tests)
- [ ] 4.1.1 Admin login — valid credentials
- [ ] 4.1.2 Admin login — invalid credentials
- [ ] 4.1.3 Admin logout
- [ ] 4.1.4 Session management
- [ ] 4.1.5 Super admin vs admin access
- [ ] 4.1.6 Unauthorized redirect
- [ ] 4.1.7 POM: Create `AdminLoginPage`
- [ ] 4.1.8 storageState auth setup

### 4.2 Admin Dashboard Tests (8 tests)
- [ ] 4.2.1 Dashboard loads
- [ ] 4.2.2 Tenant count widget
- [ ] 4.2.3 Active user count widget
- [ ] 4.2.4 Revenue summary widget
- [ ] 4.2.5 Recent activity feed
- [ ] 4.2.6 System health indicators
- [ ] 4.2.7 Quick action buttons
- [ ] 4.2.8 POM: Create `AdminDashboardPage`

### 4.3 Tenant Management Tests (25 tests)
- [ ] 4.3.1 Tenant list page loads
- [ ] 4.3.2 Tenant list — table displayed
- [ ] 4.3.3 Search tenant by name
- [ ] 4.3.4 Filter by status (active/inactive)
- [ ] 4.3.5 Filter by subscription plan
- [ ] 4.3.6 Pagination
- [ ] 4.3.7 Create tenant modal — open/close
- [ ] 4.3.8 Create tenant — valid data
- [ ] 4.3.9 Create tenant — validation errors
- [ ] 4.3.10 Tenant detail page loads
- [ ] 4.3.11 Tenant detail — info tab
- [ ] 4.3.12 Tenant detail — users tab
- [ ] 4.3.13 Tenant detail — subscription tab
- [ ] 4.3.14 Tenant detail — activity tab
- [ ] 4.3.15 Update tenant
- [ ] 4.3.16 Deactivate tenant — confirm
- [ ] 4.3.17 Activate tenant
- [ ] 4.3.18 Tenant impersonation
- [ ] 4.3.19 Tenant subscription upgrade
- [ ] 4.3.20 Tenant subscription downgrade
- [ ] 4.3.21 Tenant data export
- [ ] 4.3.22 Tenant billing history
- [ ] 4.3.23 Tenant limits display
- [ ] 4.3.24 Sorting by column
- [ ] 4.3.25 POM: Create `AdminTenantListPage`, `AdminTenantDetailPage`

### 4.4 Admin User Management Tests (20 tests)
- [ ] 4.4.1 User list page loads
- [ ] 4.4.2 User list — table displayed
- [ ] 4.4.3 Search user by name/email
- [ ] 4.4.4 Filter by role
- [ ] 4.4.5 Filter by status
- [ ] 4.4.6 Filter by tenant
- [ ] 4.4.7 Pagination
- [ ] 4.4.8 Create user modal — open/close
- [ ] 4.4.9 Create user — valid data
- [ ] 4.4.10 Create user — validation errors
- [ ] 4.4.11 User detail page
- [ ] 4.4.12 Update user
- [ ] 4.4.13 Deactivate user
- [ ] 4.4.14 Reset user password
- [ ] 4.4.15 Assign role
- [ ] 4.4.16 Remove role
- [ ] 4.4.17 User activity log
- [ ] 4.4.18 User login history
- [ ] 4.4.19 Sorting by column
- [ ] 4.4.20 POM: Create `AdminUserListPage`, `AdminUserDetailPage`

### 4.5 Subscription Management Tests (15 tests)
- [ ] 4.5.1 Subscription list page loads
- [ ] 4.5.2 Subscription plans displayed
- [ ] 4.5.3 Filter by plan type
- [ ] 4.5.4 Filter by status (active/expired)
- [ ] 4.5.5 Create subscription
- [ ] 4.5.6 Update subscription
- [ ] 4.5.7 Cancel subscription — confirm
- [ ] 4.5.8 Renew subscription
- [ ] 4.5.9 Subscription detail page
- [ ] 4.5.10 Payment history
- [ ] 4.5.11 Usage metrics
- [ ] 4.5.12 Upgrade flow
- [ ] 4.5.13 Downgrade flow
- [ ] 4.5.14 Pagination
- [ ] 4.5.15 POM: Create `AdminSubscriptionPage`

### 4.6 Activity Logs Tests (10 tests)
- [ ] 4.6.1 Activity log page loads
- [ ] 4.6.2 Log entries displayed
- [ ] 4.6.3 Filter by user
- [ ] 4.6.4 Filter by action type
- [ ] 4.6.5 Filter by date range
- [ ] 4.6.6 Filter by tenant
- [ ] 4.6.7 Search logs
- [ ] 4.6.8 Pagination
- [ ] 4.6.9 Log detail expand
- [ ] 4.6.10 POM: Create `AdminActivityLogPage`

### 4.7 Admin Device Management Tests (10 tests)
- [ ] 4.7.1 Admin device list loads
- [ ] 4.7.2 Device inventory across tenants
- [ ] 4.7.3 Search device
- [ ] 4.7.4 Filter by tenant
- [ ] 4.7.5 Filter by status
- [ ] 4.7.6 Device detail
- [ ] 4.7.7 Reassign device
- [ ] 4.7.8 Device audit trail
- [ ] 4.7.9 Pagination
- [ ] 4.7.10 POM: Create `AdminDevicePage`

### 4.8 Admin Settings Tests (10 tests)
- [ ] 4.8.1 Admin settings page loads
- [ ] 4.8.2 System-wide settings
- [ ] 4.8.3 Default plan configuration
- [ ] 4.8.4 Feature flags
- [ ] 4.8.5 Maintenance mode toggle
- [ ] 4.8.6 Email configuration
- [ ] 4.8.7 SMS gateway configuration
- [ ] 4.8.8 Security settings
- [ ] 4.8.9 Backup configuration
- [ ] 4.8.10 POM: Create `AdminSettingsPage`

### 4.9 Admin Reports Tests (10 tests)
- [ ] 4.9.1 Admin reports page loads
- [ ] 4.9.2 Tenant overview report
- [ ] 4.9.3 Revenue report (all tenants)
- [ ] 4.9.4 User activity report
- [ ] 4.9.5 System usage report
- [ ] 4.9.6 Date range filter
- [ ] 4.9.7 Export to Excel
- [ ] 4.9.8 Export to PDF
- [ ] 4.9.9 Chart visualization
- [ ] 4.9.10 POM: Create `AdminReportPage`

### 4.10 Admin Modal & Form Tests (~12 modals)
- [ ] 4.10.1 Tenant create modal — open/close/submit/validation
- [ ] 4.10.2 Tenant edit modal
- [ ] 4.10.3 Tenant deactivate confirm modal
- [ ] 4.10.4 User create modal — open/close/submit/validation
- [ ] 4.10.5 User edit modal
- [ ] 4.10.6 Subscription create modal
- [ ] 4.10.7 Subscription cancel confirm modal
- [ ] 4.10.8 Password reset confirm modal
- [ ] 4.10.9 Feature flag toggle confirm
- [ ] 4.10.10 All admin modals — backdrop/Escape/loading
- [ ] 4.10.11 All admin forms — required field validation
- [ ] 4.10.12 All admin forms — error clear on input

---

## Phase 5: Landing Page Full Coverage (Week 8-9) — ~55 tests

### 5.1 TestID Sprint — Landing Page
- [ ] 5.1.1 Add TestIDs to Header/Navbar
- [ ] 5.1.2 Add TestIDs to Footer
- [ ] 5.1.3 Add TestIDs to Hero section
- [ ] 5.1.4 Add TestIDs to Pricing cards
- [ ] 5.1.5 Add TestIDs to Contact form
- [ ] 5.1.6 Add TestIDs to Blog cards
- [ ] 5.1.7 Add TestIDs to FAQ accordion
- [ ] 5.1.8 Add TestIDs to CTAs

### 5.2 Home Page Tests (8 tests)
- [ ] 5.2.1 Home page loads
- [ ] 5.2.2 Hero section visible
- [ ] 5.2.3 Features section visible
- [ ] 5.2.4 CTA buttons functional
- [ ] 5.2.5 Trusted by / stats section
- [ ] 5.2.6 Testimonials section
- [ ] 5.2.7 Responsive layout (mobile/tablet)
- [ ] 5.2.8 POM: Create `LandingHomePage`

### 5.3 Pricing Page Tests (8 tests)
- [ ] 5.3.1 Pricing page loads
- [ ] 5.3.2 All plan cards displayed
- [ ] 5.3.3 Plan comparison table
- [ ] 5.3.4 CTA buttons → signup/contact
- [ ] 5.3.5 Monthly/Annual toggle
- [ ] 5.3.6 Feature list per plan
- [ ] 5.3.7 Responsive layout
- [ ] 5.3.8 POM: Create `LandingPricingPage`

### 5.4 Contact Page Tests (8 tests)
- [ ] 5.4.1 Contact page loads
- [ ] 5.4.2 Contact form visible
- [ ] 5.4.3 Submit with valid data
- [ ] 5.4.4 Submit with empty fields → validation
- [ ] 5.4.5 Email format validation
- [ ] 5.4.6 Success message after submit
- [ ] 5.4.7 Contact info displayed (phone, email, address)
- [ ] 5.4.8 POM: Create `LandingContactPage`

### 5.5 Blog Tests (8 tests)
- [ ] 5.5.1 Blog list page loads
- [ ] 5.5.2 Blog cards displayed
- [ ] 5.5.3 Blog card → detail link
- [ ] 5.5.4 Blog detail page loads
- [ ] 5.5.5 Blog content rendered
- [ ] 5.5.6 Related posts section
- [ ] 5.5.7 Pagination
- [ ] 5.5.8 POM: Create `LandingBlogPage`

### 5.6 Navigation & Footer Tests (8 tests)
- [ ] 5.6.1 Navbar links work (all routes)
- [ ] 5.6.2 Mobile hamburger menu
- [ ] 5.6.3 Logo → home link
- [ ] 5.6.4 Footer links work
- [ ] 5.6.5 Footer social media links
- [ ] 5.6.6 Login/Signup CTA in navbar
- [ ] 5.6.7 Sticky navbar on scroll
- [ ] 5.6.8 Active link highlight

### 5.7 SEO & Meta Tests (8 tests)
- [ ] 5.7.1 Each page has unique `<title>`
- [ ] 5.7.2 Each page has `<meta description>`
- [ ] 5.7.3 OG tags present (og:title, og:description, og:image)
- [ ] 5.7.4 Canonical URL present
- [ ] 5.7.5 No broken links (crawl all internal links)
- [ ] 5.7.6 Page load performance (< 3s)
- [ ] 5.7.7 Image alt tags present
- [ ] 5.7.8 robots.txt accessible

### 5.8 Static Pages Tests (7 tests)
- [ ] 5.8.1 About page loads + content visible
- [ ] 5.8.2 Features page loads + content visible
- [ ] 5.8.3 FAQ page loads + accordion works
- [ ] 5.8.4 Privacy policy page loads
- [ ] 5.8.5 Terms of service page loads
- [ ] 5.8.6 404 page for invalid routes
- [ ] 5.8.7 POM: Create remaining landing POMs

---

## Phase 6: Cross-App & Hardening (Week 9-10) — ~40 tests

### 6.1 Cross-App Sync Tests (10 tests)
- [ ] 6.1.1 Create tenant in Admin → visible in Admin tenant list
- [ ] 6.1.2 Create user in Admin → can login in Web
- [ ] 6.1.3 Deactivate user in Admin → cannot login in Web
- [ ] 6.1.4 Change subscription in Admin → reflected in Web settings
- [ ] 6.1.5 Create party in Web → visible in Admin reports
- [ ] 6.1.6 Create sale in Web → reflected in Admin revenue report
- [ ] 6.1.7 Landing signup CTA → redirects to correct onboarding
- [ ] 6.1.8 Admin tenant impersonation → sees correct Web data
- [ ] 6.1.9 Role change in Admin → immediate effect in Web sidebar
- [ ] 6.1.10 Data consistency across apps after CRUD operations

### 6.2 Visual Regression Tests (10 tests)
- [ ] 6.2.1 Web dashboard screenshot comparison
- [ ] 6.2.2 Web party list screenshot comparison
- [ ] 6.2.3 Web sale modal screenshot comparison
- [ ] 6.2.4 Admin dashboard screenshot comparison
- [ ] 6.2.5 Admin tenant list screenshot comparison
- [ ] 6.2.6 Landing home screenshot comparison
- [ ] 6.2.7 Landing pricing screenshot comparison
- [ ] 6.2.8 Dark theme comparison (Web)
- [ ] 6.2.9 Mobile layout comparison (Landing)
- [ ] 6.2.10 Establish baseline screenshots

### 6.3 Accessibility Tests (10 tests)
- [ ] 6.3.1 Web — keyboard navigation (Tab/Enter/Escape)
- [ ] 6.3.2 Web — ARIA labels on interactive elements
- [ ] 6.3.3 Web — focus indicators visible
- [ ] 6.3.4 Web — form label associations
- [ ] 6.3.5 Admin — keyboard navigation
- [ ] 6.3.6 Admin — ARIA labels
- [ ] 6.3.7 Landing — keyboard navigation
- [ ] 6.3.8 Landing — screen reader compatibility
- [ ] 6.3.9 Color contrast check (all 3 apps)
- [ ] 6.3.10 axe-core integration for automated a11y audit

### 6.4 Performance & Edge Cases (10 tests)
- [ ] 6.4.1 Large dataset pagination (1000+ records)
- [ ] 6.4.2 Concurrent user simulation (multi-tab)
- [ ] 6.4.3 Network offline handling
- [ ] 6.4.4 Slow network simulation (3G)
- [ ] 6.4.5 Session expiry mid-form
- [ ] 6.4.6 URL manipulation / route guard
- [ ] 6.4.7 Browser back button behavior
- [ ] 6.4.8 Duplicate form submission prevention
- [ ] 6.4.9 File upload (CSV, image)
- [ ] 6.4.10 Empty state displays (no data)

---

## Phase 7: Stabilization (Week 10) — housekeeping

### 7.1 Flaky Test Resolution
- [ ] 7.1.1 Run full suite 10x — identify flaky tests
- [ ] 7.1.2 Fix all flaky tests (target: < 2% flaky rate)
- [ ] 7.1.3 Remove all `waitForTimeout` calls
- [ ] 7.1.4 Remove all `test.skip()` without linked issue
- [ ] 7.1.5 Verify 95%+ pass rate on 10 consecutive runs

### 7.2 CI/CD Green
- [ ] 7.2.1 All 3 workflows passing (critical, PR, weekly)
- [ ] 7.2.2 PR merge requires all e2e pass
- [ ] 7.2.3 Weekly 3-browser run green
- [ ] 7.2.4 Artifact retention configured
- [ ] 7.2.5 Test result dashboard accessible

### 7.3 Documentation
- [ ] 7.3.1 Update test inventory index
- [ ] 7.3.2 Update testing guide (POM usage)
- [ ] 7.3.3 Update debugging guide (new helpers)
- [ ] 7.3.4 Create quick reference card
- [ ] 7.3.5 Create troubleshooting FAQ

### 7.4 Final Quality Gate
- [ ] 7.4.1 `npx tsc --noEmit` → 0 errors
- [ ] 7.4.2 `npx eslint tests/` → 0 errors, 0 warnings
- [ ] 7.4.3 `npx playwright test --project=web` → 100% pass
- [ ] 7.4.4 `npx playwright test --project=admin` → 100% pass
- [ ] 7.4.5 `npx playwright test --project=landing` → 100% pass
- [ ] 7.4.6 All POM classes created (79 total)
- [ ] 7.4.7 All helpers consolidated (9 files, 0 duplicates)
- [ ] 7.4.8 TestID coverage > 80%
- [ ] 7.4.9 Test count ≥ 600
- [ ] 7.4.10 Generate final quality report

---

## Progress Tracking

### Overall Progress
- **Total Tasks**: ~620
- **Completed**: 87 (existing tests that pass)
- **In Progress**: 0
- **Blocked**: 0
- **Not Started**: ~533

### Phase Progress
| Phase | Tasks | Done | % |
|-------|-------|------|---|
| Phase 0: Zero Tech Debt | 13 | 0 | 0% |
| Phase 1: Infrastructure | 55 | 12 | 22% |
| Phase 2: Debug Scan | 41 | 0 | 0% |
| Phase 3: Web Coverage | ~310 | 75 | 24% |
| Phase 4: Admin Coverage | ~220 | 0 | 0% |
| Phase 5: Landing Coverage | ~55 | 0 | 0% |
| Phase 6: Cross-App | ~40 | 0 | 0% |
| Phase 7: Stabilization | 25 | 0 | 0% |

### App Coverage
| App | Routes | Routes with Tests | Full Coverage |
|-----|--------|-------------------|---------------|
| Web | 31 | 13 (42%) | 0% |
| Admin | 37 | 0 (0%) | 0% |
| Landing | 11 | 0 (0%) | 0% |

---

## Blockers & Risks

### BLOCKER-001: TestID Coverage Critical
**Status**: PARTIALLY RESOLVED  
**Impact**: Cannot write reliable selectors without TestIDs  
**Current**: 102 TestIDs across Web+Admin (8% of ~1300 target)  
**Action**: TestID sprints in Phase 1 (1.5.x) and Phase 5 (5.1.x)

### BLOCKER-002: Playwright Version Mismatch
**Status**: NOT RESOLVED  
**Impact**: Inconsistent test behavior between root and apps/web  
**Current**: Root v1.58.1, apps/web v1.57.0  
**Action**: Phase 0.3 — pin single version

### RISK-001: CI Workflows Broken
**Status**: NOT RESOLVED  
**Impact**: No automated test verification on push/PR  
**Current**: `e2e-p0.yml` and `e2e-p1.yml` grep for tags that don't exist  
**Action**: Phase 1.6 — replace with project-based workflows

### RISK-002: Helper Duplication
**Status**: KNOWN  
**Impact**: Maintenance burden, inconsistent patterns  
**Current**: 3 separate helper systems (20 files)  
**Action**: Phase 1.3 — consolidate to 9 files

### RISK-003: No POM Pattern
**Status**: KNOWN  
**Impact**: Fragile selectors, high maintenance cost  
**Current**: All tests use raw locators  
**Action**: Phase 1.2 + incrementally in Phase 3-5

---

## Dependencies

### External
- Playwright ≥ 1.58.0
- Node.js 20+
- Python 3.11+ (backend)
- PostgreSQL 15+ (test DB)

### Internal
- Backend running (localhost:5003)
- Web app running (localhost:8080)
- Admin panel running (localhost:8082)
- Landing page running (localhost:3000)
- Test database seeded

---

## Timeline

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| Phase 0 | 3 days | Week 1 | Week 1 | NOT STARTED |
| Phase 1 | 1 week | Week 1 | Week 2 | IN PROGRESS (22%) |
| Phase 2 | 1 week | Week 2 | Week 3 | NOT STARTED |
| Phase 3 | 3 weeks | Week 3 | Week 6 | IN PROGRESS (24%) |
| Phase 4 | 2 weeks | Week 6 | Week 8 | NOT STARTED |
| Phase 5 | 1 week | Week 8 | Week 9 | NOT STARTED |
| Phase 6 | 1 week | Week 9 | Week 10 | NOT STARTED |
| Phase 7 | 3 days | Week 10 | Week 10 | NOT STARTED |

**Total Duration**: 10 weeks

---

## Related Documents

- [Requirements](./requirements.md) — User stories, acceptance criteria
- [Design](./design.md) — Architecture, POM design, config
- [README](./README.md) — Spec overview and golden rules
- [Test Inventory](../../docs/playwright/tests/00-TEST-INVENTORY-INDEX.md) — Current test catalog
- [Testing Guide](../../docs/playwright/03-TESTING-GUIDE.md) — Developer onboarding
- [Debugging Guide](../../docs/playwright/04-DEBUGGING-GUIDE.md) — Troubleshooting reference
