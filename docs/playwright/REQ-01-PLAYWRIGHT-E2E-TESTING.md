# REQ-01: Playwright E2E Testing Infrastructure

**Tarih**: 2026-02-03  
**Durum**: APPROVED  
**Öncelik**: P0 (Critical)  
**Kategori**: Testing Infrastructure

---

## 1. Executive Summary

X-Ear CRM için kapsamlı Playwright E2E test altyapısı kurulacak. 200 test senaryosu ile tüm kritik iş akışları otomatize edilecek. CI/CD pipeline'a entegre edilecek.

**Hedefler**:
- %100 kritik flow coverage (P0 testler)
- CI pipeline'da otomatik test çalıştırma
- Test fail'lerinde detaylı debugging bilgisi
- Production-ready test suite

---

## 2. Business Requirements

### 2.1 Test Coverage Gereksinimleri

**BR-001**: Tüm kritik iş akışları test edilmeli
- Login/Logout/Auth
- Party (Müşteri) CRUD
- Sales (3 farklı yöntem)
- Payment & Collection
- Invoice Management
- Device Assignment
- Appointment Management
- Communication (SMS/Email)
- Settings & User Management

**BR-002**: Test önceliklendirmesi
- P0 (CI Blocker): 55 test - Her commit'te çalışmalı
- P1 (High): 85 test - Her PR'da çalışmalı
- P2 (Medium): 45 test - Günlük çalışmalı
- P3 (Low): 15 test - Haftalık çalışmalı

**BR-003**: Test execution süresi
- P0 testler: Max 35 dakika (CI blocker olmamalı)
- Full suite: Max 2 saat

### 2.2 Quality Requirements

**BR-004**: Test güvenilirliği
- Flaky test oranı: < %5
- Test başarı oranı: > %95 (stable environment'ta)
- False positive oranı: < %2

**BR-005**: Test maintainability
- Her test bağımsız çalışabilmeli
- Test data cleanup otomatik olmalı
- Test helper'ları reusable olmalı

**BR-006**: Debugging capability
- Her fail'de screenshot + video + trace
- Console log'ları kaydedilmeli
- Network request/response loglanmalı
- Test execution timeline görünür olmalı

---

## 3. Functional Requirements

### 3.1 Test Infrastructure

**FR-001**: Playwright kurulumu ve konfigürasyonu
- Playwright 1.40+ kurulumu
- Multi-browser support (Chromium, Firefox, WebKit)
- Headless ve headed mode desteği
- Paralel test execution (4 worker)

**FR-002**: Test helper'ları
```typescript
// Auth helpers
login(page, credentials)
logout(page)
getAuthToken(page)

// Wait helpers
waitForToast(page, type)
waitForApiCall(page, endpoint, method)
waitForModalOpen(page, modalTestId)
waitForModalClose(page, modalTestId)

// Party helpers
createParty(page, data)
searchParty(page, query)
deleteParty(page, partyId)

// Sale helpers
createSale(page, saleData)
createSaleFromCashRegister(page, data)
assignDeviceAsSale(page, deviceId, partyId)

// Payment helpers
addPayment(page, paymentData)
trackPayment(page, saleId)

// Assertion helpers
expectToastVisible(page, type, message?)
expectModalOpen(page, modalTestId)
expectApiSuccess(page, endpoint)
```

**FR-003**: Test data management
- Seed data script'leri (users, parties, devices, inventory)
- Test data cleanup after each test
- Isolated test database (test environment)
- Fixture'lar (reusable test data)

**FR-004**: TestID standardı
```typescript
// Naming convention
{component}-{element}-{action}

// Examples
party-create-button
party-form-modal
party-first-name-input
party-submit-button
success-toast
error-toast
loading-spinner
```

### 3.2 Test Categories

**FR-005**: Authentication Tests (10 test)
- Login (valid/invalid credentials)
- Logout
- Token refresh
- Session timeout
- Permission checks
- Role-based access

**FR-006**: Party Management Tests (15 test)
- CRUD operations
- Search & filter
- Bulk operations
- Export
- Validation

**FR-007**: Sales Tests (20 test)
- 3 satış yöntemi (modal, device assignment, cash register)
- SGK payment calculation
- Partial payment
- Device assignment
- Invoice generation

**FR-008**: Payment Tests (15 test)
- Payment tracking modal
- Partial payments (cash + card + promissory note)
- Payment history
- Promissory note tracking

**FR-009**: Appointment Tests (15 test)
- CRUD operations
- Calendar view
- SMS reminder
- Conflict detection
- Completion

**FR-010**: Communication Tests (15 test)
- SMS (single/bulk)
- Email (single/bulk)
- Templates
- Notifications
- Credit management

**FR-011**: Settings Tests (20 test)
- User management
- Branch management
- Role & permissions
- System settings (SGK, e-invoice, SMS, email)

**FR-012**: Invoice Tests (15 test - summary)
**FR-013**: Device Tests (15 test - summary)
**FR-014**: Inventory Tests (10 test - summary)
**FR-015**: Cash Register Tests (10 test - summary)
**FR-016**: Report Tests (10 test - summary)
**FR-017**: Admin Panel Tests (10 test - summary)

### 3.3 CI/CD Integration

**FR-018**: GitHub Actions workflow
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e-p0:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Node.js
      - Install dependencies
      - Start backend (test mode)
      - Start frontend (test mode)
      - Run P0 tests (55 tests)
      - Upload artifacts (screenshots, videos, traces)
      
  e2e-p1:
    runs-on: ubuntu-latest
    needs: e2e-p0
    steps:
      - Run P1 tests (85 tests)
```

**FR-019**: Test reporting
- HTML report generation
- Test execution summary
- Fail rate tracking
- Performance metrics
- Trend analysis

**FR-020**: Artifact management
- Screenshot'lar (her fail'de)
- Video recording (her test için)
- Trace files (debugging için)
- Console logs
- Network logs

---

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-001**: Test execution speed
- P0 testler: Max 35 dakika (paralel execution ile)
- Full suite: Max 2 saat
- Single test: Max 2 dakika

**NFR-002**: Resource usage
- Max 4 parallel workers
- Max 4GB RAM per worker
- Disk space: Max 10GB (artifacts)

### 4.2 Reliability

**NFR-003**: Test stability
- Flaky test rate: < %5
- Auto-retry on network errors (max 3 retries)
- Timeout handling (30s default, 60s for slow operations)

**NFR-004**: Error handling
- Graceful failure (test suite devam etmeli)
- Detailed error messages
- Stack traces
- Context information (URL, state, cookies)

### 4.3 Maintainability

**NFR-005**: Code quality
- TypeScript strict mode
- ESLint rules
- Reusable helpers
- DRY principle

**NFR-006**: Documentation
- Test inventory (200 test)
- Testing guide
- Debugging guide
- Quick reference

### 4.4 Security

**NFR-007**: Test data security
- No production data in tests
- Credentials in environment variables
- Sensitive data masking in logs
- Test database isolation

---

## 5. Constraints

**C-001**: Browser support
- Chromium (primary)
- Firefox (secondary)
- WebKit (optional)

**C-002**: Environment
- Node.js 18+
- npm 9+
- Backend running on localhost:5003
- Frontend running on localhost:8080

**C-003**: Test data
- Isolated test database
- Seed data required
- Cleanup after each test

---

## 6. Assumptions

**A-001**: Backend API stability
- All endpoints working
- Consistent response format
- Error handling implemented

**A-002**: Frontend TestID coverage
- TestID'ler eklenecek (şu anda %99 eksik)
- TestID standardına uyulacak
- P0 komponentler öncelikli

**A-003**: Test environment
- Dedicated test environment
- Isolated database
- No external dependencies (mock'lanacak)

---

## 7. Dependencies

**D-001**: Frontend TestID implementation
- Tüm P0 komponentlere TestID eklenmeli
- Öncelik: Login, Party, Sale, Payment, Appointment

**D-002**: Backend stability
- All endpoints must be working
- Consistent error responses
- Proper validation

**D-003**: Test data seeding
- User accounts (different roles)
- Parties (customers, patients)
- Devices (inventory)
- Settings (SGK, branches)

---

## 8. Success Criteria

**SC-001**: Test coverage
- ✅ 200 test senaryosu oluşturuldu
- ⏳ 110 detaylı test yazılacak
- ⏳ 90 özet test yazılacak

**SC-002**: CI integration
- ⏳ P0 testler CI'da çalışıyor
- ⏳ PR'larda otomatik test
- ⏳ Test report'ları görünür

**SC-003**: Test quality
- ⏳ Flaky rate < %5
- ⏳ Success rate > %95
- ⏳ False positive < %2

**SC-004**: Documentation
- ✅ Test inventory complete
- ✅ Testing guide
- ✅ Debugging guide
- ⏳ Quick reference updated

---

## 9. Out of Scope

**OS-001**: Visual regression testing (Phase 2)
**OS-002**: Performance testing (Phase 2)
**OS-003**: Security testing (Phase 2)
**OS-004**: Mobile app testing (Phase 3)
**OS-005**: Load testing (Phase 3)

---

## 10. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| TestID'ler eksik | High | High | Öncelikli TestID ekleme task'ı |
| Flaky tests | Medium | Medium | Retry mechanism, wait helpers |
| CI timeout | Medium | Low | Paralel execution, test optimization |
| Test data conflicts | High | Medium | Isolated database, cleanup |
| Backend instability | High | Low | Mock'lama, error handling |

---

## 11. Timeline

**Phase 1: Infrastructure (1 hafta)**
- Playwright kurulumu
- Test helper'ları
- CI pipeline
- TestID ekleme (P0 komponentler)

**Phase 2: Test Implementation (3 hafta)**
- Week 1: AUTH, PARTY, SALE testleri (45 test)
- Week 2: PAYMENT, APPOINTMENT, COMMUNICATION testleri (45 test)
- Week 3: SETTINGS, INVOICE, DEVICE testleri (50 test)

**Phase 3: Remaining Tests (2 hafta)**
- Week 4: INVENTORY, CASH, REPORT, ADMIN testleri (60 test)
- Week 5: Test hardening, CI optimization

**Phase 4: Stabilization (1 hafta)**
- Flaky test fixes
- Performance optimization
- Documentation updates

**Total: 7 hafta**

---

## 12. Approval

**Prepared by**: AI Assistant  
**Date**: 2026-02-03  
**Status**: APPROVED

**Stakeholders**:
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
- [ ] DevOps Lead

---

## 13. Related Documents

- [DES-01: Playwright E2E Testing Design](./DES-01-PLAYWRIGHT-E2E-TESTING.md)
- [Test Inventory](./tests/00-TEST-INVENTORY-INDEX.md)
- [Testing Guide](./03-TESTING-GUIDE.md)
- [Debugging Guide](./04-DEBUGGING-GUIDE.md)
