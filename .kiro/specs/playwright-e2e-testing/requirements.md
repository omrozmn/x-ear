# Requirements: Playwright E2E Testing Infrastructure

**Feature**: Comprehensive E2E Testing with Playwright  
**Status**: APPROVED  
**Priority**: P0 (Critical)  
**Created**: 2026-02-03

---

## 1. Overview

X-Ear CRM için kapsamlı Playwright E2E test altyapısı kurulacak. 200 test senaryosu ile tüm kritik iş akışları otomatize edilecek ve CI/CD pipeline'a entegre edilecek.

**Problem Statement**: 
- Şu anda E2E test coverage yok
- Manuel test süreçleri yavaş ve hata prone
- Regression'lar production'a kadar gidebiliyor
- CI/CD pipeline'da otomatik test yok

**Solution**:
- Playwright ile 200 test senaryosu
- 4 fazlı test stratejisi (Exploratory → Pattern Analysis → Fix → Harden)
- CI/CD entegrasyonu (P0 testler her commit'te)
- Comprehensive test documentation

---

## 2. User Stories

### US-001: Test Infrastructure Setup
**As a** developer  
**I want** Playwright test infrastructure kurulu olsun  
**So that** E2E testler yazıp çalıştırabilirim

**Acceptance Criteria**:
- AC-001.1: Playwright 1.40+ kurulu
- AC-001.2: Multi-browser support (Chromium, Firefox, WebKit)
- AC-001.3: Paralel execution (4 workers)
- AC-001.4: Screenshot/Video/Trace capture
- AC-001.5: Test helper'ları hazır

### US-002: Authentication Tests
**As a** QA engineer  
**I want** authentication flow'ları test edilsin  
**So that** login/logout/permission sorunları erken tespit edilsin

**Acceptance Criteria**:
- AC-002.1: Login (valid/invalid credentials) - 2 test
- AC-002.2: Logout - 1 test
- AC-002.3: Token refresh - 1 test
- AC-002.4: Session timeout - 1 test
- AC-002.5: Permission checks - 3 test
- AC-002.6: Role-based access - 2 test

### US-003: Party Management Tests
**As a** QA engineer  
**I want** party (müşteri) CRUD işlemleri test edilsin  
**So that** müşteri yönetimi sorunsuz çalışsın

**Acceptance Criteria**:
- AC-003.1: Party oluşturma - 2 test
- AC-003.2: Party güncelleme - 2 test
- AC-003.3: Party silme - 1 test
- AC-003.4: Party arama - 2 test
- AC-003.5: Party filtreleme - 2 test
- AC-003.6: Bulk operations - 3 test
- AC-003.7: Export - 1 test
- AC-003.8: Validation - 2 test

### US-004: Sales Tests
**As a** QA engineer  
**I want** satış flow'ları test edilsin  
**So that** 3 farklı satış yöntemi sorunsuz çalışsın

**Acceptance Criteria**:
- AC-004.1: Satış modaldan - 5 test
- AC-004.2: Device assignment'tan satış - 5 test
- AC-004.3: Kasa kaydından satış - 5 test
- AC-004.4: SGK payment calculation - 2 test
- AC-004.5: Partial payment - 2 test
- AC-004.6: Invoice generation - 1 test

### US-005: Payment & Collection Tests
**As a** QA engineer  
**I want** tahsilat ve senet takibi test edilsin  
**So that** ödeme süreçleri güvenilir çalışsın

**Acceptance Criteria**:
- AC-005.1: Payment tracking modal - 3 test
- AC-005.2: Partial payments (cash+card+note) - 3 test
- AC-005.3: Payment history - 2 test
- AC-005.4: Promissory note tracking - 4 test
- AC-005.5: Payment validation - 3 test

### US-006: Appointment Tests
**As a** QA engineer  
**I want** randevu yönetimi test edilsin  
**So that** randevu sistemi sorunsuz çalışsın

**Acceptance Criteria**:
- AC-006.1: Randevu CRUD - 4 test
- AC-006.2: Calendar view - 2 test
- AC-006.3: SMS reminder - 2 test
- AC-006.4: Conflict detection - 2 test
- AC-006.5: Completion - 2 test
- AC-006.6: Filtering & search - 3 test

### US-007: Communication Tests
**As a** QA engineer  
**I want** SMS/Email gönderimi test edilsin  
**So that** iletişim özellikleri güvenilir çalışsın

**Acceptance Criteria**:
- AC-007.1: SMS single/bulk - 4 test
- AC-007.2: Email single/bulk - 4 test
- AC-007.3: Templates - 2 test
- AC-007.4: Notifications - 2 test
- AC-007.5: Credit management - 2 test
- AC-007.6: History & filtering - 1 test

### US-008: Settings & User Management Tests
**As a** QA engineer  
**I want** sistem ayarları test edilsin  
**So that** konfigürasyon değişiklikleri güvenli olsun

**Acceptance Criteria**:
- AC-008.1: User management - 5 test
- AC-008.2: Branch management - 3 test
- AC-008.3: Role & permissions - 4 test
- AC-008.4: System settings (SGK, e-invoice, SMS, email) - 8 test

### US-009: CI/CD Integration
**As a** DevOps engineer  
**I want** testler CI/CD pipeline'da otomatik çalışsın  
**So that** her commit/PR otomatik test edilsin

**Acceptance Criteria**:
- AC-009.1: GitHub Actions workflow kurulu
- AC-009.2: P0 testler her commit'te çalışıyor
- AC-009.3: P1 testler her PR'da çalışıyor
- AC-009.4: Test report'ları görünür
- AC-009.5: Artifact'lar (screenshot, video, trace) kaydediliyor

### US-010: Test Documentation
**As a** developer  
**I want** test dökümanları güncel olsun  
**So that** test yazma ve debugging kolay olsun

**Acceptance Criteria**:
- AC-010.1: Test inventory (200 test) ✅
- AC-010.2: Testing guide ✅
- AC-010.3: Debugging guide ✅
- AC-010.4: Quick reference ✅
- AC-010.5: Requirements document ✅
- AC-010.6: Design document ⏳
- AC-010.7: Tasks document ⏳

---

## 3. Functional Requirements

### FR-001: Test Infrastructure
- Playwright 1.40+ installation
- Multi-browser support (Chromium primary, Firefox/WebKit secondary)
- Headless and headed mode
- Parallel execution (4 workers)
- Screenshot/Video/Trace capture on failure

### FR-002: Test Helpers
- Auth helpers (login, logout, getAuthToken)
- Wait helpers (toast, API, modal)
- Party helpers (create, search, delete)
- Sale helpers (3 methods)
- Payment helpers (tracking, partial)
- Assertion helpers (toast, modal, API)

### FR-003: Test Data Management
- Seed data scripts (users, parties, devices)
- Test data cleanup after each test
- Isolated test database
- Reusable fixtures

### FR-004: TestID Standard
- Naming: `{component}-{element}-{action}`
- Coverage: 100% for P0 components
- Examples: `party-create-button`, `success-toast`

### FR-005: Test Categories
- Authentication (10 tests)
- Party Management (15 tests)
- Sales (20 tests)
- Payment & Collection (15 tests)
- Appointment (15 tests)
- Communication (15 tests)
- Settings (20 tests)
- Invoice (15 tests - summary)
- Device (15 tests - summary)
- Inventory (10 tests - summary)
- Cash Register (10 tests - summary)
- Reports (10 tests - summary)
- Admin Panel (10 tests - summary)

**Total: 200 tests**

### FR-006: CI/CD Integration
- GitHub Actions workflow
- P0 tests on every commit (~35 min)
- P1 tests on every PR (~50 min)
- P2-P3 tests daily/weekly
- HTML report generation
- Artifact upload (screenshots, videos, traces)

---

## 4. Non-Functional Requirements

### NFR-001: Performance
- P0 tests: Max 35 minutes
- Full suite: Max 2 hours
- Single test: Max 2 minutes
- Parallel execution: 4 workers

### NFR-002: Reliability
- Flaky test rate: < 5%
- Success rate: > 95% (stable environment)
- False positive rate: < 2%
- Auto-retry on network errors (max 3)

### NFR-003: Maintainability
- TypeScript strict mode
- ESLint rules enforced
- Reusable helpers (DRY)
- Clear test structure

### NFR-004: Security
- No production data in tests
- Credentials in environment variables
- Sensitive data masking in logs
- Isolated test database

---

## 5. Constraints

### C-001: Browser Support
- Chromium (primary)
- Firefox (secondary)
- WebKit (optional)

### C-002: Environment
- Node.js 18+
- npm 9+
- Backend: localhost:5003
- Frontend: localhost:8080

### C-003: Test Data
- Isolated test database required
- Seed data required
- Cleanup after each test

---

## 6. Dependencies

### D-001: Frontend TestID Implementation (BLOCKER)
**Status**: ⏳ NOT STARTED  
**Priority**: P0  
**Description**: TestID'ler %99 eksik, önce eklenmeli

**Required TestIDs**:
- Login form (identifier, password, submit)
- Party form (all inputs, submit)
- Sale form (all inputs, submit)
- Payment modal (all inputs, submit)
- Toast notifications (success, error, warning, info)
- Loading spinners
- Confirmation dialogs

### D-002: Backend Stability
**Status**: ✅ READY  
**Priority**: P0  
**Description**: All endpoints working, consistent responses

### D-003: Test Data Seeding
**Status**: ⏳ PARTIAL  
**Priority**: P0  
**Description**: Seed scripts for test data

**Required Data**:
- User accounts (different roles)
- Parties (customers, patients)
- Devices (inventory)
- Settings (SGK, branches)

---

## 7. Success Criteria

### SC-001: Test Coverage
- ✅ 200 test scenarios documented
- ⏳ 110 detailed tests implemented
- ⏳ 90 summary tests implemented

### SC-002: CI Integration
- ⏳ P0 tests running in CI
- ⏳ Automatic PR testing
- ⏳ Test reports visible

### SC-003: Test Quality
- ⏳ Flaky rate < 5%
- ⏳ Success rate > 95%
- ⏳ False positive < 2%

### SC-004: Documentation
- ✅ Test inventory complete
- ✅ Testing guide complete
- ✅ Debugging guide complete
- ✅ Requirements complete
- ⏳ Design complete
- ⏳ Tasks complete

---

## 8. Out of Scope

- Visual regression testing (Phase 2)
- Performance testing (Phase 2)
- Security testing (Phase 2)
- Mobile app testing (Phase 3)
- Load testing (Phase 3)

---

## 9. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| TestID'ler eksik | High | High | Öncelikli TestID task'ı |
| Flaky tests | Medium | Medium | Retry mechanism, wait helpers |
| CI timeout | Medium | Low | Parallel execution, optimization |
| Test data conflicts | High | Medium | Isolated DB, cleanup |
| Backend instability | High | Low | Mocking, error handling |

---

## 10. Timeline

**Phase 1: Infrastructure (1 week)**
- Playwright setup
- Test helpers
- CI pipeline
- TestID implementation (P0 components)

**Phase 2: Core Tests (3 weeks)**
- Week 1: AUTH, PARTY, SALE (45 tests)
- Week 2: PAYMENT, APPOINTMENT, COMM (45 tests)
- Week 3: SETTINGS, INVOICE, DEVICE (50 tests)

**Phase 3: Remaining Tests (2 weeks)**
- Week 4: INVENTORY, CASH, REPORT, ADMIN (60 tests)
- Week 5: Test hardening, CI optimization

**Phase 4: Stabilization (1 week)**
- Flaky test fixes
- Performance optimization
- Documentation updates

**Total: 7 weeks**

---

## 11. Related Documents

- [Design Document](./design.md)
- [Tasks Document](./tasks.md)
- [Test Inventory](../../docs/playwright/tests/00-TEST-INVENTORY-INDEX.md)
- [Testing Guide](../../docs/playwright/03-TESTING-GUIDE.md)
- [Debugging Guide](../../docs/playwright/04-DEBUGGING-GUIDE.md)

---

## 12. Approval

**Status**: APPROVED  
**Date**: 2026-02-03

**Stakeholders**:
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
- [ ] DevOps Lead
