# Tasks: Playwright E2E Testing Infrastructure

**Feature**: Playwright E2E Testing  
**Status**: IN PROGRESS  
**Created**: 2026-02-03

---

## Phase 1: Infrastructure Setup (Week 1)

### 1.1 Playwright Installation & Configuration
- [x] 1.1.1 Install Playwright 1.40+
- [x] 1.1.2 Configure playwright.config.ts
- [x] 1.1.3 Setup multi-browser support (Chromium, Firefox, WebKit)
- [x] 1.1.4 Configure parallel execution (4 workers)
- [x] 1.1.5 Setup screenshot/video/trace capture

### 1.2 Test Helper Implementation
- [x] 1.2.1 Create auth helpers (login, logout, getAuthToken)
- [x] 1.2.2 Create wait helpers (toast, API, modal)
- [x] 1.2.3 Create party helpers (create, search, delete) - createTestParty, deleteTestParty exist
- [x] 1.2.4 Create sale helpers (3 methods)
- [x] 1.2.5 Create payment helpers (tracking, partial)
- [x] 1.2.6 Create assertion helpers (toast, modal, API)

### 1.3 Test Data Management
- [x] 1.3.1 Create seed data scripts (users, parties, devices)
- [x] 1.3.2 Setup test database isolation
- [ ] 1.3.3 Implement test data cleanup
- [x] 1.3.4 Create reusable fixtures

### 1.4 TestID Implementation (BLOCKER)
- [x] 1.4.1 Add TestIDs to Login form
- [x] 1.4.2 Add TestIDs to Party form
- [ ] 1.4.3 Add TestIDs to Sale form
- [ ] 1.4.4 Add TestIDs to Payment modal
- [ ] 1.4.5 Add TestIDs to Toast notifications
- [ ] 1.4.6 Add TestIDs to Loading spinners
- [ ] 1.4.7 Add TestIDs to Modals

### 1.5 CI/CD Pipeline Setup
- [ ] 1.5.1 Create GitHub Actions workflow (P0 tests)
- [ ] 1.5.2 Create GitHub Actions workflow (P1 tests)
- [ ] 1.5.3 Create GitHub Actions workflow (Full suite)
- [ ] 1.5.4 Configure artifact upload
- [ ] 1.5.5 Setup test reporting

---

## Phase 2: Core Test Implementation (Week 2-4)

### 2.1 Authentication Tests (10 tests)
- [x] 2.1.1 Login with valid credentials
- [x] 2.1.2 Login with invalid credentials
- [x] 2.1.3 Logout
- [x] 2.1.4 Token refresh
- [x] 2.1.5 Session timeout
- [ ] 2.1.6 Permission check (view)
- [ ] 2.1.7 Permission check (create)
- [ ] 2.1.8 Permission check (edit)
- [ ] 2.1.9 Permission check (delete)
- [ ] 2.1.10 Role-based access

### 2.2 Party Management Tests (15 tests)
- [x] 2.2.1 Create party (valid data) - PARTY-003 ✅
- [x] 2.2.2 Create party (validation errors) - PARTY-004 ✅
- [x] 2.2.3 Update party - PARTY-009 ✅
- [x] 2.2.4 Delete party - PARTY-010 ✅
- [x] 2.2.5 Search party (name) - PARTY-007 ✅
- [ ] 2.2.6 Search party (phone) - PARTY-008 ❌ (TestID missing)
- [x] 2.2.7 Filter party (role) - PARTY-013 ✅
- [x] 2.2.8 Filter party (date) - ✅ (party-filters.spec.ts - multiple filter tests)
- [ ] 2.2.9 Bulk select parties
- [ ] 2.2.10 Bulk delete parties
- [x] 2.2.11 Bulk export parties - PARTY-015 ✅
- [x] 2.2.12 Party pagination - PARTY-014 ✅ (party-filters.spec.ts)
- [ ] 2.2.13 Party sorting
- [ ] 2.2.14 Party detail view - PARTY-012 ❌
- [ ] 2.2.15 Party role assignment

### 2.3 Sales Tests (20 tests)
- [x] 2.3.1 Navigate to sales page ✅
- [x] 2.3.2 Display sales list ✅
- [x] 2.3.3 Open new sale modal ✅
- [x] 2.3.4 Search sales ✅
- [x] 2.3.5 Filter sales by date ✅
- [ ] 2.3.6 Create sale from modal (device only)
- [ ] 2.3.7 Create sale from modal (device + SGK)
- [ ] 2.3.8 Create sale from modal (pill only)
- [ ] 2.3.9 Create sale from modal (pill + SGK)
- [ ] 2.3.10 Create sale from modal (partial payment)
- [ ] 2.3.11 Create sale from device assignment
- [ ] 2.3.12 Create sale from device assignment (trial)
- [ ] 2.3.13 SGK payment calculation (0-18 age)
- [ ] 2.3.14 SGK payment calculation (18+ working)
- [ ] 2.3.15 SGK payment calculation (18+ retired)
- [ ] 2.3.16 SGK payment calculation (65+ age)
- [ ] 2.3.17 Sale with invoice generation
- [ ] 2.3.18 Sale detail view
- [ ] 2.3.19 Update sale
- [ ] 2.3.20 Delete sale

### 2.4 Payment & Collection Tests (15 tests)
- [ ] 2.4.1 Open payment tracking modal
- [ ] 2.4.2 Add cash payment
- [ ] 2.4.3 Add card payment
- [ ] 2.4.4 Add promissory note
- [ ] 2.4.5 Partial payment (cash + card)
- [ ] 2.4.6 Partial payment (cash + note)
- [ ] 2.4.7 Partial payment (card + note)
- [ ] 2.4.8 Full payment validation
- [ ] 2.4.9 Overpayment validation
- [ ] 2.4.10 Payment history view
- [ ] 2.4.11 Promissory note tracking
- [ ] 2.4.12 Promissory note maturity date
- [ ] 2.4.13 Promissory note collection
- [ ] 2.4.14 Payment search
- [ ] 2.4.15 Payment filter (date)

### 2.5 Appointment Tests (15 tests)
- [x] 2.5.1 Navigate to appointments page ✅
- [x] 2.5.2 Display calendar view ✅
- [x] 2.5.3 Open new appointment modal ✅
- [x] 2.5.4 Filter appointments by date ✅
- [x] 2.5.5 Filter appointments by status ✅
- [ ] 2.5.6 Create appointment
- [ ] 2.5.7 Update appointment
- [ ] 2.5.8 Cancel appointment
- [ ] 2.5.9 Send SMS reminder
- [ ] 2.5.10 Appointment conflict detection
- [ ] 2.5.11 Complete appointment
- [ ] 2.5.12 Search appointments (patient name)
- [ ] 2.5.13 Bulk appointment creation
- [ ] 2.5.14 Export appointments
- [ ] 2.5.15 Appointment history

### 2.6 Communication Tests (15 tests)
- [x] 2.6.1 Navigate to communication center ✅
- [x] 2.6.2 Display message composition interface ✅
- [x] 2.6.3 Open compose message modal ✅
- [x] 2.6.4 Display message templates ✅
- [x] 2.6.5 Display message history ✅
- [x] 2.6.6 Filter messages by channel ✅
- [ ] 2.6.7 Send SMS (single)
- [ ] 2.6.8 Send SMS (bulk)
- [ ] 2.6.9 Send Email (single)
- [ ] 2.6.10 Send Email (bulk)
- [ ] 2.6.11 Create SMS template
- [ ] 2.6.12 Create Email template
- [ ] 2.6.13 In-app notification
- [ ] 2.6.14 Notification settings
- [ ] 2.6.15 SMS credit loading

### 2.7 Settings & User Management Tests (20 tests)
- [ ] 2.7.1 Update user profile
- [ ] 2.7.2 Change password
- [ ] 2.7.3 Create user
- [ ] 2.7.4 Assign user role
- [ ] 2.7.5 Deactivate user
- [ ] 2.7.6 Create branch
- [ ] 2.7.7 Update branch
- [ ] 2.7.8 Manage role permissions
- [ ] 2.7.9 Create new role
- [ ] 2.7.10 System settings (general)
- [ ] 2.7.11 SGK settings
- [ ] 2.7.12 E-invoice settings
- [ ] 2.7.13 SMS settings
- [ ] 2.7.14 Email settings (SMTP)
- [ ] 2.7.15 Backup settings
- [ ] 2.7.16 Audit log view
- [ ] 2.7.17 User activity report
- [ ] 2.7.18 Theme settings
- [ ] 2.7.19 Language settings
- [ ] 2.7.20 Two-factor authentication (2FA)

---

## Phase 3: Remaining Tests (Week 5-6)

### 3.1 Invoice Tests (15 tests)
- [x] 3.1.1 Navigate to invoices page ✅
- [x] 3.1.2 Display invoice list ✅
- [x] 3.1.3 Search invoice by number ✅
- [x] 3.1.4 Filter invoice by date ✅
- [x] 3.1.5 Filter invoice by status ✅
- [x] 3.1.6 Display invoice pagination ✅
- [ ] 3.1.7 Create invoice from sale
- [ ] 3.1.8 Create invoice manually
- [ ] 3.1.9 Send e-invoice
- [ ] 3.1.10 Download invoice PDF
- [ ] 3.1.11 Cancel invoice
- [ ] 3.1.12 Create SGK invoice
- [ ] 3.1.13 Update invoice
- [ ] 3.1.14 Invoice detail view
- [ ] 3.1.15 Bulk invoice creation

### 3.2 Device Tests (15 tests)
- [x] 3.2.1 Navigate to devices page ✅
- [x] 3.2.2 Display device list ✅
- [x] 3.2.3 Search device by serial number ✅
- [x] 3.2.4 Filter device by status ✅
- [x] 3.2.5 Filter device by brand ✅
- [x] 3.2.6 Display device pagination ✅
- [ ] 3.2.7 Assign device (sale)
- [ ] 3.2.8 Assign device (trial)
- [ ] 3.2.9 Assign device (loaner)
- [ ] 3.2.10 Assign device (repair)
- [ ] 3.2.11 Assign device (replacement)
- [ ] 3.2.12 Return device
- [ ] 3.2.13 Replace device
- [ ] 3.2.14 Device history view
- [ ] 3.2.15 Device stock alert

### 3.3 Inventory Tests (10 tests)
- [x] 3.3.1 Navigate to inventory page ✅
- [x] 3.3.2 Display inventory list ✅
- [x] 3.3.3 Open add inventory item modal ✅
- [x] 3.3.4 Search inventory ✅
- [x] 3.3.5 Filter inventory by category ✅
- [x] 3.3.6 Display stock alerts ✅
- [ ] 3.3.7 Add inventory item
- [ ] 3.3.8 Update inventory item
- [ ] 3.3.9 Delete inventory item
- [ ] 3.3.10 Export inventory

### 3.4 Cash Register Tests (10 tests)
- [x] 3.4.1 Navigate to cash register page ✅
- [x] 3.4.2 Display cash transactions list ✅
- [x] 3.4.3 Open add transaction modal ✅
- [x] 3.4.4 Filter transactions by type ✅
- [x] 3.4.5 Filter transactions by date ✅
- [x] 3.4.6 Display cash summary ✅
- [ ] 3.4.7 Create cash record (income)
- [ ] 3.4.8 Create cash record (expense)
- [ ] 3.4.9 Update cash record
- [ ] 3.4.10 Delete cash record

### 3.5 Report Tests (10 tests)
- [x] 3.5.1 Navigate to reports page ✅
- [x] 3.5.2 Display sales report ✅
- [x] 3.5.3 Display collection report ✅
- [x] 3.5.4 Filter reports by date range ✅
- [x] 3.5.5 Export report to Excel ✅
- [x] 3.5.6 Display SGK tracking report ✅
- [ ] 3.5.7 Sales report (daily)
- [ ] 3.5.8 Sales report (monthly)
- [ ] 3.5.9 Stock report
- [ ] 3.5.10 Promissory note tracking report

### 3.6 Admin Panel Tests (10 tests - summary)
- [ ] 3.6.1 Super admin login
- [ ] 3.6.2 Tenant selection
- [ ] 3.6.3 Role impersonation
- [ ] 3.6.4 Create tenant
- [ ] 3.6.5 Update tenant
- [ ] 3.6.6 Create user
- [ ] 3.6.7 Assign user role
- [ ] 3.6.8 Permission management
- [ ] 3.6.9 Audit log view
- [ ] 3.6.10 System settings

---

## Phase 4: Stabilization & Optimization (Week 7)

### 4.1 Test Hardening
- [ ] 4.1.1 Fix flaky tests (< 5% flaky rate)
- [ ] 4.1.2 Optimize test execution time
- [ ] 4.1.3 Add retry logic for network errors
- [ ] 4.1.4 Improve error messages
- [ ] 4.1.5 Add detailed assertions (Phase 4)

### 4.2 CI/CD Optimization
- [ ] 4.2.1 Optimize parallel execution
- [ ] 4.2.2 Reduce CI pipeline time
- [ ] 4.2.3 Improve artifact management
- [ ] 4.2.4 Add test result caching
- [ ] 4.2.5 Setup test result dashboard

### 4.3 Documentation Updates
- [ ] 4.3.1 Update test inventory
- [ ] 4.3.2 Update testing guide
- [ ] 4.3.3 Update debugging guide
- [ ] 4.3.4 Update quick reference
- [ ] 4.3.5 Create troubleshooting guide

### 4.4 Quality Metrics
- [ ] 4.4.1 Measure test coverage
- [ ] 4.4.2 Track flaky test rate
- [ ] 4.4.3 Track test execution time
- [ ] 4.4.4 Track false positive rate
- [ ] 4.4.5 Generate quality report

---

## Progress Tracking

### Overall Progress
- **Total Tasks**: 200
- **Completed**: 87
- **In Progress**: 0
- **Blocked**: 5 (TestID missing for some features)
- **Not Started**: 108

### Phase Progress
- **Phase 1**: 20/27 (74%)
- **Phase 2**: 47/110 (43%)
- **Phase 3**: 20/60 (33%)
- **Phase 4**: 0/20 (0%)

### Priority Progress
- **P0 Tasks**: 25/55 (45%)
- **P1 Tasks**: 42/85 (49%)
- **P2 Tasks**: 20/45 (44%)
- **P3 Tasks**: 0/15 (0%)

---

## Blockers

### BLOCKER-001: TestID Implementation
**Status**: NOT STARTED  
**Priority**: P0  
**Impact**: Cannot write tests without TestIDs  
**Tasks Blocked**: All test implementation tasks (2.1-3.6)

**Required Actions**:
1. Add TestIDs to Login form (1.4.1)
2. Add TestIDs to Party form (1.4.2)
3. Add TestIDs to Sale form (1.4.3)
4. Add TestIDs to Payment modal (1.4.4)
5. Add TestIDs to Toast notifications (1.4.5)
6. Add TestIDs to Loading spinners (1.4.6)
7. Add TestIDs to Modals (1.4.7)

---

## Dependencies

### External Dependencies
- Playwright 1.40+
- Node.js 18+
- npm 9+
- Backend running (localhost:5003)
- Frontend running (localhost:8080)
- Test database

### Internal Dependencies
- TestID implementation (BLOCKER)
- Test data seeding
- Backend stability
- Frontend stability

---

## Timeline

| Phase | Duration | Start Date | End Date | Status |
|-------|----------|------------|----------|--------|
| Phase 1 | 1 week | 2026-02-03 | 2026-02-10 | NOT STARTED |
| Phase 2 | 3 weeks | 2026-02-10 | 2026-03-03 | NOT STARTED |
| Phase 3 | 2 weeks | 2026-03-03 | 2026-03-17 | NOT STARTED |
| Phase 4 | 1 week | 2026-03-17 | 2026-03-24 | NOT STARTED |

**Total Duration**: 7 weeks

---

## Related Documents

- [Requirements](./requirements.md)
- [Design](./design.md)
- [Test Inventory](../../docs/playwright/tests/00-TEST-INVENTORY-INDEX.md)
- [Testing Guide](../../docs/playwright/03-TESTING-GUIDE.md)
- [Debugging Guide](../../docs/playwright/04-DEBUGGING-GUIDE.md)
