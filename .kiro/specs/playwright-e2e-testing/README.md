# Playwright E2E Testing Infrastructure - Spec

**Feature**: Comprehensive E2E Testing with Playwright  
**Status**: APPROVED  
**Priority**: P0 (Critical)  
**Created**: 2026-02-03

---

## 📋 Quick Links

- [Requirements](./requirements.md) - User stories, acceptance criteria, success metrics
- [Design](./design.md) - Architecture, component design, configuration
- [Tasks](./tasks.md) - Implementation tasks, timeline, progress tracking

---

## 🎯 Overview

X-Ear CRM için kapsamlı Playwright E2E test altyapısı. 200 test senaryosu ile tüm kritik iş akışları otomatize edilecek ve CI/CD pipeline'a entegre edilecek.

### Key Metrics

- **Total Tests**: 200 test scenarios
- **Test Coverage**: 13 categories
- **Timeline**: 7 weeks
- **CI Pipeline**: P0 tests in 35 minutes

### Test Categories

1. **Authentication** (10 tests) - Login, logout, permissions
2. **Party Management** (15 tests) - CRUD, search, bulk operations
3. **Sales** (20 tests) - 3 satış yöntemi, SGK, partial payment
4. **Payment & Collection** (15 tests) - Tahsilat, senet takibi
5. **Appointment** (15 tests) - Randevu CRUD, takvim, hatırlatıcı
6. **Communication** (15 tests) - SMS/Email, templates, notifications
7. **Settings** (20 tests) - User, branch, role, system settings
8. **Invoice** (15 tests) - Fatura CRUD, e-fatura, SGK
9. **Device** (15 tests) - Cihaz atama, geri alma, geçmiş
10. **Inventory** (10 tests) - Envanter CRUD, stok giriş/çıkış
11. **Cash Register** (10 tests) - Kasa gelir/gider, etiket
12. **Reports** (10 tests) - Satış, tahsilat, stok raporları
13. **Admin Panel** (10 tests) - Super admin, tenant, impersonation

---

## 🚀 Getting Started

### Prerequisites

```bash
# Node.js 18+
node --version

# npm 9+
npm --version

# Backend running
curl http://localhost:5003/health

# Frontend running
curl http://localhost:8080
```

### Installation

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install

# Install dependencies
npm install
```

### Running Tests

```bash
# All tests
npx playwright test

# P0 tests only
npx playwright test --grep @p0

# Specific category
npx playwright test tests/e2e/auth

# Debug mode
npx playwright test --debug

# UI mode
npx playwright test --ui
```

---

## 📊 Current Status

### Documentation
- ✅ Test Inventory (200 tests)
- ✅ Testing Guide
- ✅ Debugging Guide
- ✅ Requirements Document
- ✅ Design Document
- ✅ Tasks Document

### Implementation
- ⏳ Infrastructure Setup (0/27 tasks)
- ⏳ Core Tests (0/110 tasks)
- ⏳ Remaining Tests (0/60 tasks)
- ⏳ Stabilization (0/20 tasks)

### Blockers
- 🚫 **BLOCKER**: TestID implementation (7 tasks)
  - Frontend components need `data-testid` attributes
  - Priority: P0 components first (Login, Party, Sale, Payment)

---

## 📁 Project Structure

```
x-ear/
├── .kiro/
│   └── specs/
│       └── playwright-e2e-testing/
│           ├── README.md          ← This file
│           ├── requirements.md    ← User stories, acceptance criteria
│           ├── design.md          ← Architecture, component design
│           └── tasks.md           ← Implementation tasks
├── tests/
│   └── e2e/
│       ├── auth/                  ← Authentication tests
│       ├── party/                 ← Party management tests
│       ├── sale/                  ← Sales tests
│       ├── payment/               ← Payment tests
│       ├── appointment/           ← Appointment tests
│       ├── communication/         ← Communication tests
│       └── settings/              ← Settings tests
├── tests/
│   ├── helpers/                   ← Test helper functions
│   ├── fixtures/                  ← Test data fixtures
│   └── config/                    ← Playwright configuration
├── docs/
│   └── playwright/
│       ├── tests/                 ← Test inventory (200 tests)
│       ├── 03-TESTING-GUIDE.md    ← Testing guide
│       └── 04-DEBUGGING-GUIDE.md  ← Debugging guide
└── playwright-report/             ← Test reports
```

---

## 🎯 Success Criteria

### Test Coverage
- ✅ 200 test scenarios documented
- ⏳ 110 detailed tests implemented
- ⏳ 90 summary tests implemented

### CI Integration
- ⏳ P0 tests running in CI
- ⏳ Automatic PR testing
- ⏳ Test reports visible

### Test Quality
- ⏳ Flaky rate < 5%
- ⏳ Success rate > 95%
- ⏳ False positive < 2%

---

## 📅 Timeline

| Phase | Duration | Tasks | Status |
|-------|----------|-------|--------|
| **Phase 1**: Infrastructure | 1 week | 27 | NOT STARTED |
| **Phase 2**: Core Tests | 3 weeks | 110 | NOT STARTED |
| **Phase 3**: Remaining Tests | 2 weeks | 60 | NOT STARTED |
| **Phase 4**: Stabilization | 1 week | 20 | NOT STARTED |

**Total**: 7 weeks (217 tasks)

---

## 🔗 Related Documentation

### Test Documentation
- [Test Inventory Index](../../docs/playwright/tests/00-TEST-INVENTORY-INDEX.md)
- [AUTH Tests](../../docs/playwright/tests/01-AUTH-TESTS.md)
- [PARTY Tests](../../docs/playwright/tests/02-PARTY-TESTS.md)
- [SALE Tests](../../docs/playwright/tests/03-SALE-TESTS.md)
- [PAYMENT Tests](../../docs/playwright/tests/04-PAYMENT-TESTS.md)
- [APPOINTMENT Tests](../../docs/playwright/tests/11-APPOINTMENT-TESTS.md)
- [COMMUNICATION Tests](../../docs/playwright/tests/12-COMMUNICATION-TESTS.md)
- [SETTINGS Tests](../../docs/playwright/tests/13-SETTINGS-TESTS.md)

### Guides
- [Testing Guide](../../docs/playwright/03-TESTING-GUIDE.md)
- [Debugging Guide](../../docs/playwright/04-DEBUGGING-GUIDE.md)
- [Quick Reference](../../docs/playwright/07-QUICK-REFERENCE.md)

---

## 🚧 Next Steps

### Immediate Actions (Week 1)
1. **Install Playwright** (Task 1.1.1)
2. **Configure playwright.config.ts** (Task 1.1.2)
3. **Create test helpers** (Tasks 1.2.1-1.2.6)
4. **Add TestIDs to P0 components** (Tasks 1.4.1-1.4.7) ⚠️ BLOCKER

### Short Term (Week 2-4)
1. Implement AUTH tests (10 tests)
2. Implement PARTY tests (15 tests)
3. Implement SALE tests (20 tests)
4. Implement PAYMENT tests (15 tests)
5. Setup CI pipeline

### Medium Term (Week 5-6)
1. Implement remaining tests (90 tests)
2. Test hardening
3. CI optimization

### Long Term (Week 7)
1. Stabilization
2. Documentation updates
3. Quality metrics

---

## 📞 Support

**Questions?**
- Check [Testing Guide](../../docs/playwright/03-TESTING-GUIDE.md)
- Check [Debugging Guide](../../docs/playwright/04-DEBUGGING-GUIDE.md)
- Review [Test Inventory](../../docs/playwright/tests/00-TEST-INVENTORY-INDEX.md)

**Issues?**
- Check [Tasks](./tasks.md) for blockers
- Review [Design](./design.md) for architecture
- Check [Requirements](./requirements.md) for acceptance criteria

---

## ✅ Approval

**Status**: APPROVED  
**Date**: 2026-02-03

**Stakeholders**:
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
- [ ] DevOps Lead
