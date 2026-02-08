# Design: Playwright E2E Testing Infrastructure

**Feature**: Playwright E2E Testing  
**Status**: APPROVED  
**Related**: requirements.md  
**Created**: 2026-02-03

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CI/CD Pipeline (GitHub Actions)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  P0 Tests    │  │  P1 Tests    │  │  P2-P3 Tests │          │
│  │  (55 tests)  │  │  (85 tests)  │  │  (60 tests)  │          │
│  │  ~35 min     │  │  ~50 min     │  │  ~35 min     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Playwright Test Runner                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Test Execution (4 parallel workers)                     │  │
│  │  - Browser automation (Chromium/Firefox/WebKit)          │  │
│  │  - Screenshot/Video/Trace capture                        │  │
│  │  - Network interception                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Test Helpers & Utilities                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Auth   │  │   Wait   │  │  Party   │  │   Sale   │       │
│  │ Helpers  │  │ Helpers  │  │ Helpers  │  │ Helpers  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Application Under Test                       │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │  Frontend (React)    │  │  Backend (FastAPI)   │            │
│  │  localhost:8080      │  │  localhost:5003      │            │
│  └──────────────────────┘  └──────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Test Execution Flow

```
Test Start
    ↓
Setup (beforeEach)
    ├─ Start browser
    ├─ Navigate to app
    ├─ Login (if needed)
    └─ Setup test data
    ↓
Test Execution
    ├─ User interactions
    ├─ Wait for responses
    ├─ Assertions
    └─ Capture artifacts
    ↓
Cleanup (afterEach)
    ├─ Delete test data
    ├─ Clear cookies
    ├─ Close browser
    └─ Save artifacts (if failed)
    ↓
Test End
```

---

## 2. Directory Structure

```
x-ear/
├── tests/
│   └── e2e/
│       ├── auth/
│       │   ├── login.spec.ts
│       │   ├── logout.spec.ts
│       │   ├── token-refresh.spec.ts
│       │   └── permissions.spec.ts
│       ├── party/
│       │   ├── party-create.spec.ts
│       │   ├── party-update.spec.ts
│       │   ├── party-delete.spec.ts
│       │   ├── party-search.spec.ts
│       │   └── party-bulk.spec.ts
│       ├── sale/
│       │   ├── sale-modal.spec.ts
│       │   ├── sale-device-assignment.spec.ts
│       │   └── sale-cash-register.spec.ts
│       ├── payment/
│       ├── appointment/
│       ├── communication/
│       ├── settings/
│       ├── invoice/
│       ├── device/
│       ├── inventory/
│       ├── cash/
│       ├── report/
│       └── admin/
├── tests/
│   ├── helpers/
│   │   ├── auth.ts
│   │   ├── wait.ts
│   │   ├── party.ts
│   │   ├── sale.ts
│   │   ├── payment.ts
│   │   └── assertions.ts
│   ├── fixtures/
│   │   ├── users.ts
│   │   ├── parties.ts
│   │   ├── devices.ts
│   │   └── settings.ts
│   └── config/
│       └── playwright.config.ts
├── .github/
│   └── workflows/
│       ├── e2e-p0.yml
│       ├── e2e-p1.yml
│       └── e2e-full.yml
└── playwright-report/
```

---

## 3. Component Design

### 3.1 Test Helpers

#### 3.1.1 Auth Helpers (`tests/helpers/auth.ts`)

```typescript
export async function login(
  page: Page,
  credentials?: { identifier: string; password: string }
): Promise<void> {
  const defaultCreds = {
    identifier: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'password123'
  };
  
  const creds = credentials || defaultCreds;
  
  await page.goto('/login');
  await page.locator('[data-testid="login-identifier-input"]').fill(creds.identifier);
  await page.locator('[data-testid="login-password-input"]').fill(creds.password);
  await page.locator('[data-testid="login-submit-button"]').click();
  
  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard');
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}

export async function logout(page: Page): Promise<void> {
  await page.locator('[data-testid="user-menu"]').click();
  await page.locator('[data-testid="logout-button"]').click();
  await page.waitForURL('/login');
}

export async function getAuthToken(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  const tokenCookie = cookies.find(c => c.name === 'access_token');
  return tokenCookie?.value || '';
}
```

#### 3.1.2 Wait Helpers (`tests/helpers/wait.ts`)

```typescript
export async function waitForToast(
  page: Page,
  type: 'success' | 'error' | 'warning' | 'info',
  message?: string
): Promise<void> {
  const toast = page.locator(`[data-testid="${type}-toast"]`);
  await expect(toast).toBeVisible({ timeout: 10000 });
  
  if (message) {
    await expect(toast).toContainText(message);
  }
  
  // Wait for toast to disappear (5 seconds duration)
  await expect(toast).not.toBeVisible({ timeout: 6000 });
}

export async function waitForApiCall(
  page: Page,
  endpoint: string,
  method: string = 'GET',
  status: number = 200
): Promise<void> {
  await page.waitForResponse(
    response =>
      response.url().includes(endpoint) &&
      response.request().method() === method &&
      response.status() === status,
    { timeout: 30000 }
  );
}

export async function waitForModalOpen(
  page: Page,
  modalTestId: string
): Promise<void> {
  await expect(page.locator(`[data-testid="${modalTestId}"]`)).toBeVisible();
}

export async function waitForModalClose(
  page: Page,
  modalTestId: string
): Promise<void> {
  await expect(page.locator(`[data-testid="${modalTestId}"]`)).not.toBeVisible();
}
```

#### 3.1.3 Party Helpers (`tests/helpers/party.ts`)

```typescript
export async function createParty(
  page: Page,
  data: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  }
): Promise<string> {
  await page.goto('/parties');
  await page.locator('[data-testid="party-create-button"]').click();
  await waitForModalOpen(page, 'party-form-modal');
  
  await page.locator('[data-testid="party-first-name-input"]').fill(data.firstName);
  await page.locator('[data-testid="party-last-name-input"]').fill(data.lastName);
  await page.locator('[data-testid="party-phone-input"]').fill(data.phone);
  
  if (data.email) {
    await page.locator('[data-testid="party-email-input"]').fill(data.email);
  }
  
  await page.locator('[data-testid="party-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'party-form-modal');
  
  // Extract party ID from URL or response
  const response = await page.waitForResponse(r => r.url().includes('/parties') && r.status() === 201);
  const body = await response.json();
  return body.data.id;
}

export async function searchParty(
  page: Page,
  query: string
): Promise<void> {
  await page.goto('/parties');
  await page.locator('[data-testid="party-search-input"]').fill(query);
  await page.locator('[data-testid="party-search-button"]').click();
  await waitForApiCall(page, '/parties', 'GET');
}

export async function deleteParty(
  page: Page,
  partyId: string
): Promise<void> {
  await page.goto(`/parties/${partyId}`);
  await page.locator('[data-testid="party-delete-button"]').click();
  await page.locator('[data-testid="confirm-delete-button"]').click();
  await waitForToast(page, 'success');
}
```

### 3.2 Test Fixtures

#### 3.2.1 User Fixtures (`tests/fixtures/users.ts`)

```typescript
export const testUsers = {
  admin: {
    identifier: 'admin@xear.com',
    password: 'Admin123!',
    role: 'ADMIN'
  },
  audiologist: {
    identifier: 'audiologist@xear.com',
    password: 'Audio123!',
    role: 'AUDIOLOGIST'
  },
  receptionist: {
    identifier: 'receptionist@xear.com',
    password: 'Recep123!',
    role: 'RECEPTIONIST'
  }
};
```

#### 3.2.2 Party Fixtures (`tests/fixtures/parties.ts`)

```typescript
export const testParties = {
  customer1: {
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    phone: '+905551234567',
    email: 'ahmet@example.com'
  },
  customer2: {
    firstName: 'Ayşe',
    lastName: 'Demir',
    phone: '+905559876543',
    email: 'ayse@example.com'
  }
};
```

---

## 4. Configuration

### 4.1 Playwright Config (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 30000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
```

---

## 5. CI/CD Integration

### 5.1 GitHub Actions Workflow (`.github/workflows/e2e-p0.yml`)

```yaml
name: E2E Tests (P0)

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      
      - name: Setup test database
        run: |
          npm run db:migrate
          npm run db:seed:test
      
      - name: Start backend
        run: npm run dev:backend &
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/xear_test
          JWT_SECRET: test-secret
      
      - name: Start frontend
        run: npm run dev:web &
      
      - name: Wait for services
        run: |
          npx wait-on http://localhost:5003/health
          npx wait-on http://localhost:8080
      
      - name: Run P0 tests
        run: npx playwright test --grep @p0
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
          retention-days: 30
```

---

## 6. Test Strategy

### 6.1 4-Phase Approach

**Phase 1: Exploratory Pass (Week 1)**
- Goal: Scan system, find breaking points
- Assertion: Minimal (page loads?)
- Output: Fail patterns + trace/video/log
- Tests: ~130 tests

**Phase 2: Pattern Analysis (Week 2)**
- Goal: Identify common issues
- Output: Root cause list (selector, state, timing)
- Tests: ~50 tests

**Phase 3: Fix Common Issues (Week 3)** ⭐ MOST CRITICAL
- Goal: Fix 60-70% of failures in one go
- Examples: TestID standard, auth helper, toast handler, API wait helper
- Tests: ~15 tests

**Phase 4: Flow-by-Flow Hardening (Week 4-7)**
- Goal: Make each flow production-ready
- Assertion: Detailed (state, visual, backend)
- Tests: ~5 tests

### 6.2 Test Prioritization

**P0 (CI Blocker)** - 55 tests (~35 min)
- Run on every commit
- Must pass before merge
- Examples: Login, Party CRUD, Sale creation

**P1 (High)** - 85 tests (~50 min)
- Run on every PR
- Should pass before merge
- Examples: Payment tracking, Appointments, Settings

**P2 (Medium)** - 45 tests (~35 min)
- Run daily
- Can be fixed later
- Examples: Bulk operations, Export, Reports

**P3 (Low)** - 15 tests (~20 min)
- Run weekly
- Nice to have
- Examples: Theme settings, Language settings

---

## 7. TestID Implementation

### 7.1 Naming Convention

```
{component}-{element}-{action}
```

**Examples**:
- `party-create-button`
- `party-form-modal`
- `party-first-name-input`
- `party-submit-button`
- `success-toast`
- `error-toast`

### 7.2 Priority Components (P0)

1. **Login Form**
   - `login-identifier-input`
   - `login-password-input`
   - `login-submit-button`
   - `login-error-message`

2. **Party Form**
   - `party-create-button`
   - `party-form-modal`
   - `party-first-name-input`
   - `party-last-name-input`
   - `party-phone-input`
   - `party-email-input`
   - `party-submit-button`
   - `party-cancel-button`

3. **Toast Notifications**
   - `success-toast`
   - `error-toast`
   - `warning-toast`
   - `info-toast`

4. **Loading States**
   - `loading-spinner`
   - `button-loading-spinner`

5. **Modals**
   - `{modal-name}-modal`
   - `{modal-name}-close-button`

---

## 8. Error Handling & Debugging

### 8.1 Artifact Capture

**On Test Failure**:
- Screenshot (full page)
- Video recording (entire test)
- Trace file (timeline + network + console)
- Console logs
- Network logs

**Storage**:
- Local: `playwright-report/`
- CI: GitHub Actions artifacts (30 days retention)

### 8.2 Debugging Checklist

1. **TestID Missing?**
   - Check component has `data-testid`
   - Verify TestID spelling

2. **Timing Issue?**
   - API call not finished?
   - Modal not opened yet?
   - Toast disappeared?

3. **State Issue?**
   - Previous test state not cleaned?
   - Auth token expired?
   - Tenant not selected?

4. **Selector Issue?**
   - Element in DOM?
   - Element visible?
   - Element not disabled?

5. **Backend Issue?**
   - API endpoint working?
   - Database seed data exists?
   - Permissions correct?

---

## 9. Performance Optimization

### 9.1 Parallel Execution

- 4 workers in CI
- Unlimited workers locally
- Test isolation (no shared state)

### 9.2 Test Data Management

- Seed data once (before all tests)
- Cleanup after each test
- Reuse fixtures

### 9.3 Smart Waiting

- Use `waitForResponse` instead of `waitForTimeout`
- Use `waitForSelector` with proper timeout
- Avoid unnecessary waits

---

## 10. Maintenance Strategy

### 10.1 Test Updates

- Update tests when features change
- Keep test helpers DRY
- Refactor common patterns

### 10.2 Flaky Test Handling

- Identify flaky tests (< 95% success rate)
- Add retry logic
- Fix root cause (timing, state, selector)

### 10.3 Documentation

- Keep test inventory updated
- Document new patterns
- Update debugging guide

---

## 11. Related Documents

- [Requirements](./requirements.md)
- [Tasks](./tasks.md)
- [Test Inventory](../../docs/playwright/tests/00-TEST-INVENTORY-INDEX.md)
- [Testing Guide](../../docs/playwright/03-TESTING-GUIDE.md)
- [Debugging Guide](../../docs/playwright/04-DEBUGGING-GUIDE.md)
