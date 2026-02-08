# Playwright E2E Tests - Quick Start Guide

**Last Updated**: 2026-02-03  
**Status**: ✅ Ready to Run  
**Test Coverage**: 87.6% (190/217 tests)

---

## 🚀 QUICK START (5 Steps)

### Step 1: Setup Test Database (5 minutes)

```bash
# Create test database
createdb xear_test

# Navigate to API directory
cd x-ear/apps/api

# Run migrations
alembic upgrade head

# Verify database created
psql -l | grep xear_test
```

### Step 2: Seed Test Data (2 minutes)

```bash
# Still in x-ear/apps/api directory
python scripts/seed_comprehensive_data.py

# Expected output:
# ✅ Created 5 users
# ✅ Created 10 parties
# ✅ Created 10 devices
# ✅ Created 3 branches
# ✅ Created 7 system settings
```

### Step 3: Start Backend Server (Terminal 1)

```bash
cd x-ear/apps/api

# Activate virtual environment (if needed)
source .venv/bin/activate

# Start server
python main.py

# Server should start on http://localhost:5003
# Wait for: "Uvicorn running on http://0.0.0.0:5003"
```

### Step 4: Start Frontend Server (Terminal 2)

```bash
cd x-ear/apps/web

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev

# App should start on http://localhost:8080
# Wait for: "Local: http://localhost:8080/"
```

### Step 5: Run Tests (Terminal 3)

```bash
cd x-ear

# Run P0 tests (critical path - 55 tests)
npx playwright test --grep @p0

# OR run all tests (190 tests)
npx playwright test

# OR run specific test file
npx playwright test tests/e2e/auth/login.spec.ts

# OR run with UI mode (interactive)
npx playwright test --ui
```

---

## 📋 TEST CREDENTIALS

Use these credentials to test manually or debug:

```
Admin:        admin@xear.com / Admin123!
Audiologist:  audiologist@xear.com / Audio123!
Receptionist: receptionist@xear.com / Recep123!
Sales:        sales@xear.com / Sales123!
Support:      support@xear.com / Support123!
```

---

## 🎯 TEST PRIORITIES

### P0 - Critical Path (55 tests) ⚡
**Run First**: These tests cover the most critical user flows.

```bash
npx playwright test --grep @p0
```

**Includes**:
- Authentication (login, logout, session)
- Party CRUD (create, read, update, delete)
- Sale creation (3 methods)
- Payment tracking
- Device assignment
- Invoice generation

**Expected Duration**: ~5 minutes

---

### P1 - Important Features (75 tests) 📊
**Run Second**: These tests cover important but non-critical features.

```bash
npx playwright test --grep @p1
```

**Includes**:
- Appointments
- Communication (SMS, email)
- Reports
- Settings
- Inventory management
- Cash register

**Expected Duration**: ~8 minutes

---

### P2 - Edge Cases (60 tests) 🔍
**Run Last**: These tests cover edge cases and error handling.

```bash
npx playwright test --grep @p2
```

**Includes**:
- Validation errors
- Permission checks
- Concurrent operations
- Data integrity
- Error recovery

**Expected Duration**: ~6 minutes

---

## 🐛 DEBUGGING TESTS

### Run Tests in Debug Mode

```bash
# Debug specific test
npx playwright test tests/e2e/auth/login.spec.ts --debug

# Debug with headed browser
npx playwright test --headed

# Debug with slow motion
npx playwright test --headed --slow-mo=1000
```

### View Test Report

```bash
# Generate HTML report
npx playwright show-report

# Opens browser with detailed test results
```

### View Test Traces

```bash
# Traces are automatically captured on failure
# View trace for failed test:
npx playwright show-trace test-results/[test-name]/trace.zip
```

---

## 📊 TEST STRUCTURE

### Test Organization

```
x-ear/tests/
├── e2e/                    # E2E test specs
│   ├── auth/              # Authentication tests
│   ├── party/             # Party management tests
│   ├── sale/              # Sales tests
│   ├── payment/           # Payment tests
│   ├── appointment/       # Appointment tests
│   ├── device/            # Device tests
│   ├── invoice/           # Invoice tests
│   ├── communication/     # SMS/Email tests
│   ├── settings/          # Settings tests
│   ├── cash/              # Cash register tests
│   ├── reports/           # Reports tests
│   └── admin/             # Admin panel tests
├── helpers/               # Test helper functions
│   ├── auth.ts           # Authentication helpers
│   ├── party.ts          # Party helpers
│   ├── sale.ts           # Sale helpers
│   ├── payment.ts        # Payment helpers
│   ├── wait.ts           # Wait utilities
│   └── assertions.ts     # Custom assertions
└── fixtures/              # Test fixtures
    ├── users.ts          # User fixtures
    ├── parties.ts        # Party fixtures
    ├── devices.ts        # Device fixtures
    └── settings.ts       # Settings fixtures
```

---

## 🔧 COMMON ISSUES & SOLUTIONS

### Issue 1: Backend Not Running
**Error**: `connect ECONNREFUSED 127.0.0.1:5003`

**Solution**:
```bash
# Check if backend is running
curl http://localhost:5003/health

# If not, start backend
cd x-ear/apps/api
python main.py
```

---

### Issue 2: Frontend Not Running
**Error**: `net::ERR_CONNECTION_REFUSED http://localhost:8080`

**Solution**:
```bash
# Check if frontend is running
curl http://localhost:8080

# If not, start frontend
cd x-ear/apps/web
npm run dev
```

---

### Issue 3: Database Not Seeded
**Error**: `User not found: admin@xear.com`

**Solution**:
```bash
# Re-run seed script
cd x-ear/apps/api
python scripts/seed_comprehensive_data.py
```

---

### Issue 4: Test Timeout
**Error**: `Test timeout of 30000ms exceeded`

**Solution**:
```bash
# Increase timeout in playwright.config.ts
# OR run with longer timeout
npx playwright test --timeout=60000
```

---

### Issue 5: Element Not Found
**Error**: `locator.click: Target closed`

**Solution**:
1. Check if TestID exists in component
2. Check if component is rendered
3. Add wait before action:
```typescript
await page.waitForSelector('[data-testid="element"]');
await page.click('[data-testid="element"]');
```

---

## 📈 TEST COVERAGE

### Current Status
- **Total Tests**: 217
- **Tests Written**: 190 (87.6%)
- **Tests Passing**: TBD (run tests to find out)
- **TestID Coverage**: 80% (48/60)

### By Phase
- **Phase 1**: 85% complete (23/27 tasks)
- **Phase 2**: 100% complete (110/110 tests)
- **Phase 3**: 100% complete (60/60 tests)
- **Phase 4**: 0% complete (0/20 tasks)

### By Priority
- **P0 Tests**: 55 tests (critical path)
- **P1 Tests**: 75 tests (important features)
- **P2 Tests**: 60 tests (edge cases)

---

## 🎓 BEST PRACTICES

### 1. Use TestIDs
```typescript
// ✅ GOOD - Use TestID
await page.click('[data-testid="login-submit-button"]');

// ❌ BAD - Use text or CSS selector
await page.click('button:has-text("Login")');
```

### 2. Wait for Elements
```typescript
// ✅ GOOD - Wait for element
await page.waitForSelector('[data-testid="success-toast"]');

// ❌ BAD - No wait
await page.click('[data-testid="button"]');
```

### 3. Use Helper Functions
```typescript
// ✅ GOOD - Use helper
await loginAsAdmin(page);

// ❌ BAD - Duplicate code
await page.fill('[data-testid="login-identifier-input"]', 'admin@xear.com');
await page.fill('[data-testid="login-password-input"]', 'Admin123!');
await page.click('[data-testid="login-submit-button"]');
```

### 4. Clean Up After Tests
```typescript
test.afterEach(async ({ page }) => {
  // Clean up test data
  await deleteTestParty(page, testPartyId);
});
```

### 5. Use Descriptive Test Names
```typescript
// ✅ GOOD
test('should create party with valid data and show success toast', async ({ page }) => {

// ❌ BAD
test('create party', async ({ page }) => {
```

---

## 🔗 RELATED DOCUMENTS

### Progress Reports
- [Session 4 Final Summary](./SESSION-4-FINAL-SUMMARY.md)
- [Context Transfer Summary](./CONTEXT-TRANSFER-SUMMARY.md)
- [Current Status and Next Steps](./CURRENT-STATUS-AND-NEXT-STEPS.md)

### Implementation Docs
- [TestID Implementation Progress](./TESTID-IMPLEMENTATION-PROGRESS.md)
- [Seed Script Fix](./SEED-SCRIPT-FIX.md)
- [Financial Logic Analysis](./FINANCIAL-LOGIC-ANALYSIS.md)

### Spec Files
- [Requirements](../../.kiro/specs/playwright-e2e-testing/requirements.md)
- [Design](../../.kiro/specs/playwright-e2e-testing/design.md)
- [Tasks](../../.kiro/specs/playwright-e2e-testing/tasks.md)

---

## 📞 SUPPORT

### Need Help?
1. Check [Common Issues](#-common-issues--solutions)
2. Review test logs: `npx playwright show-report`
3. Check documentation in `x-ear/docs/playwright/`
4. Review test examples in `x-ear/tests/e2e/`

### Reporting Issues
When reporting test failures, include:
1. Test name and file
2. Error message
3. Screenshot (if available)
4. Test trace (if available)
5. Steps to reproduce

---

**Status**: ✅ Ready to Run  
**Test Coverage**: 87.6% (190/217)  
**Next Action**: Run `npx playwright test --grep @p0`
