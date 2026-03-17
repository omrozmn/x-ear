# Design: Playwright E2E Testing Infrastructure

**Feature**: Full-Coverage E2E Testing (Web + Admin + Landing)  
**Status**: IN PROGRESS  
**Related**: requirements.md, tasks.md  
**Created**: 2026-02-03  
**Updated**: 2026-02-16

---

## 1. Architecture Overview

### 1.1 Multi-App System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    CI/CD Pipeline (GitHub Actions)                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │
│  │ Critical Flows  │  │  Full Suite    │  │  Weekly Full   │         │
│  │ (p0-revenue)   │  │  (per PR)      │  │  (3 browsers)  │         │
│  │ ~35 min        │  │  ~90 min       │  │  ~2 hours      │         │
│  └────────────────┘  └────────────────┘  └────────────────┘         │
└──────────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    Playwright Test Runner                              │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  3 Projects × 4 Workers = Parallel Execution                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │  │
│  │  │ web      │  │ admin    │  │ landing  │                    │  │
│  │  │ :8080    │  │ :8082    │  │ :3000    │                    │  │
│  │  └──────────┘  └──────────┘  └──────────┘                    │  │
│  │  Screenshot / Video / Trace on failure                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    Page Object Model (POM)                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ BasePage │  │ WebPages │  │AdminPages│  │LandPages │           │
│  │ (shared) │  │ (31 POM) │  │ (37 POM) │  │ (11 POM) │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└──────────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    Consolidated Helpers & Fixtures                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Auth    │  │  Wait    │  │  CRUD    │  │ Assert   │           │
│  │ Helpers  │  │ Helpers  │  │ Helpers  │  │ Helpers  │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└──────────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    Applications Under Test                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Web App      │  │ Admin Panel  │  │ Landing Page │              │
│  │ React/Vite   │  │ React/Vite   │  │ Next.js 16   │              │
│  │ :8080        │  │ :8082        │  │ :3000        │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                    ┌──────────────┐                                   │
│                    │ Backend API  │                                   │
│                    │ FastAPI :5003│                                   │
│                    └──────────────┘                                   │
└──────────────────────────────────────────────────────────────────────┘
```
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Test Helpers & Utilities                     │
### 1.2 Test Execution Flow

```
Test Start
    ↓
Global Setup
    ├─ Start backend (FastAPI :5003) if not running
    ├─ Start web (:8080), admin (:8082), landing (:3000) if not running
    ├─ Health check all 4 services
    └─ Seed test database
    ↓
Per-Project Setup (web | admin | landing)
    ├─ Launch browser (Chromium default, Firefox/WebKit weekly)
    ├─ Set baseURL for target app
    ├─ Login via storageState (if auth required)
    └─ Select test tenant
    ↓
beforeEach
    ├─ Navigate to page
    ├─ Wait for network idle
    └─ Verify page loaded (key TestID visible)
    ↓
Test Execution
    ├─ User interactions via POM methods
    ├─ Wait for API responses (waitForResponse)
    ├─ Assertions (visible, text, count, URL)
    └─ Capture trace on failure
    ↓
afterEach
    ├─ Clean test data (API delete, not UI)
    ├─ Screenshot on failure (full page)
    └─ Console error collection
    ↓
Test End
```

---

## 2. Directory Structure (Target)

```
x-ear/
├── playwright.config.ts                   # UNIFIED — 3 projects: web, admin, landing
├── tests/
│   ├── e2e/
│   │   ├── web/                           # Web App tests (31 routes)
│   │   │   ├── auth/
│   │   │   │   ├── login.spec.ts
│   │   │   │   ├── logout.spec.ts
│   │   │   │   ├── forgot-password.spec.ts
│   │   │   │   └── token-refresh.spec.ts
│   │   │   ├── dashboard/
│   │   │   │   └── dashboard.spec.ts
│   │   │   ├── party/
│   │   │   │   ├── party-list.spec.ts
│   │   │   │   ├── party-create.spec.ts
│   │   │   │   ├── party-detail.spec.ts
│   │   │   │   ├── party-update.spec.ts
│   │   │   │   ├── party-delete.spec.ts
│   │   │   │   ├── party-search.spec.ts
│   │   │   │   ├── party-bulk-import.spec.ts
│   │   │   │   └── party-modals.spec.ts
│   │   │   ├── sale/
│   │   │   │   ├── sale-list.spec.ts
│   │   │   │   ├── sale-create.spec.ts
│   │   │   │   ├── sale-detail.spec.ts
│   │   │   │   ├── sale-modal.spec.ts
│   │   │   │   ├── sale-device-assignment.spec.ts
│   │   │   │   └── sale-cash-register.spec.ts
│   │   │   ├── payment/
│   │   │   ├── appointment/
│   │   │   ├── communication/
│   │   │   ├── settings/
│   │   │   ├── invoice/
│   │   │   ├── device/
│   │   │   ├── inventory/
│   │   │   ├── cash-register/
│   │   │   ├── report/
│   │   │   └── profile/
│   │   ├── admin/                         # Admin Panel tests (37 routes)
│   │   │   ├── auth/
│   │   │   │   ├── admin-login.spec.ts
│   │   │   │   └── admin-logout.spec.ts
│   │   │   ├── dashboard/
│   │   │   │   └── admin-dashboard.spec.ts
│   │   │   ├── tenants/
│   │   │   │   ├── tenant-list.spec.ts
│   │   │   │   ├── tenant-create.spec.ts
│   │   │   │   └── tenant-detail.spec.ts
│   │   │   ├── users/
│   │   │   │   ├── user-list.spec.ts
│   │   │   │   ├── user-create.spec.ts
│   │   │   │   └── user-detail.spec.ts
│   │   │   ├── subscriptions/
│   │   │   ├── activity-logs/
│   │   │   ├── devices/
│   │   │   ├── settings/
│   │   │   └── reports/
│   │   └── landing/                       # Landing Page tests (11 routes)
│   │       ├── home/
│   │       │   └── home.spec.ts
│   │       ├── about/
│   │       │   └── about.spec.ts
│   │       ├── pricing/
│   │       │   └── pricing.spec.ts
│   │       ├── contact/
│   │       │   └── contact.spec.ts
│   │       ├── blog/
│   │       │   ├── blog-list.spec.ts
│   │       │   └── blog-detail.spec.ts
│   │       ├── navigation/
│   │       │   └── nav-footer.spec.ts
│   │       └── seo/
│   │           └── meta-og.spec.ts
│   ├── helpers/                           # CONSOLIDATED (single system)
│   │   ├── auth.helper.ts                 # Login/logout/token for all 3 apps
│   │   ├── wait.helper.ts                 # Toast, modal, API, network idle
│   │   ├── crud.helper.ts                 # Generic CRUD via API (not UI)
│   │   ├── assert.helper.ts              # Custom assertion matchers
│   │   ├── navigation.helper.ts          # Route helpers per app
│   │   ├── modal.helper.ts               # Open/close/fill modal patterns
│   │   ├── table.helper.ts              # Pagination, sort, filter, search
│   │   ├── form.helper.ts              # Fill, validate, submit, error check
│   │   └── debug.helper.ts             # Console log capture, network audit
│   ├── fixtures/
│   │   ├── users.fixture.ts
│   │   ├── parties.fixture.ts
│   │   ├── devices.fixture.ts
│   │   ├── tenants.fixture.ts
│   │   └── settings.fixture.ts
│   ├── pom/                               # Page Object Models
│   │   ├── base.page.ts                   # Abstract base page
│   │   ├── web/                           # Web POM classes
│   │   │   ├── login.page.ts
│   │   │   ├── dashboard.page.ts
│   │   │   ├── party-list.page.ts
│   │   │   ├── party-detail.page.ts
│   │   │   ├── sale-list.page.ts
│   │   │   ├── sale-detail.page.ts
│   │   │   ├── appointment-list.page.ts
│   │   │   ├── payment-list.page.ts
│   │   │   ├── settings.page.ts
│   │   │   └── ...                        # 1 POM per route (31 total)
│   │   ├── admin/                         # Admin POM classes
│   │   │   ├── admin-login.page.ts
│   │   │   ├── admin-dashboard.page.ts
│   │   │   ├── tenant-list.page.ts
│   │   │   ├── user-list.page.ts
│   │   │   └── ...                        # 1 POM per route (37 total)
│   │   └── landing/                       # Landing POM classes
│   │       ├── home.page.ts
│   │       ├── pricing.page.ts
│   │       ├── contact.page.ts
│   │       └── ...                        # 1 POM per route (11 total)
│   └── config/
│       ├── test-data.ts                   # Shared test data constants
│       └── env.ts                         # Environment config loader
├── .github/
│   └── workflows/
│       ├── e2e-critical.yml               # Revenue-critical flows (on push)
│       ├── e2e-pr.yml                     # Full suite (on PR)
│       └── e2e-weekly.yml                 # 3-browser matrix (weekly)
└── playwright-report/
```

**Key Differences from Current State**:
- Old: 3 separate helper systems → New: 1 consolidated `tests/helpers/`
- Old: No POM → New: `tests/pom/` with `BasePage` + per-route classes
- Old: Tests only for web → New: `tests/e2e/{web,admin,landing}/`
- Old: 3 broken CI workflows → New: 3 working workflows with proper tagging
- Old: 2 `playwright.config.ts` files → New: 1 unified config with 3 projects

---

## 3. Page Object Model (POM) Design

### 3.1 BasePage (Abstract)

```typescript
// tests/pom/base.page.ts
import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** App identifier — override in subclass */
  abstract readonly app: 'web' | 'admin' | 'landing';
  
  /** Route path relative to app baseURL */
  abstract readonly path: string;
  
  /** TestID of a key element that confirms page loaded */
  abstract readonly loadedIndicator: string;

  // ── Navigation ─────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await expect(
      this.page.locator(`[data-testid="${this.loadedIndicator}"]`)
    ).toBeVisible({ timeout: 15_000 });
  }

  // ── Common Selectors ──────────────────────────

  testId(id: string): Locator {
    return this.page.locator(`[data-testid="${id}"]`);
  }

  // ── Toast ─────────────────────────────────────

  async expectSuccessToast(message?: string): Promise<void> {
    const toast = this.testId('success-toast');
    await expect(toast).toBeVisible({ timeout: 10_000 });
    if (message) await expect(toast).toContainText(message);
  }

  async expectErrorToast(message?: string): Promise<void> {
    const toast = this.testId('error-toast');
    await expect(toast).toBeVisible({ timeout: 10_000 });
    if (message) await expect(toast).toContainText(message);
  }

  // ── Modal ─────────────────────────────────────

  async waitForModalOpen(modalTestId: string): Promise<void> {
    await expect(this.testId(modalTestId)).toBeVisible({ timeout: 5_000 });
  }

  async waitForModalClose(modalTestId: string): Promise<void> {
    await expect(this.testId(modalTestId)).not.toBeVisible({ timeout: 5_000 });
  }

  // ── Table ─────────────────────────────────────

  async getTableRowCount(tableTestId: string): Promise<number> {
    return this.page.locator(`[data-testid="${tableTestId}"] tbody tr`).count();
  }

  async clickTableRow(tableTestId: string, rowIndex: number): Promise<void> {
    await this.page
      .locator(`[data-testid="${tableTestId}"] tbody tr`)
      .nth(rowIndex)
      .click();
  }

  // ── Wait Helpers ──────────────────────────────

  async waitForApiResponse(
    urlPattern: string,
    method = 'GET',
    status = 200
  ): Promise<void> {
    await this.page.waitForResponse(
      (r) =>
        r.url().includes(urlPattern) &&
        r.request().method() === method &&
        r.status() === status,
      { timeout: 30_000 }
    );
  }

  // ── Debug ─────────────────────────────────────

  async captureConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    return errors;
  }

  async captureNetworkFailures(): Promise<string[]> {
    const failures: string[] = [];
    this.page.on('response', (response) => {
      if (response.status() >= 400) {
        failures.push(`${response.status()} ${response.url()}`);
      }
    });
    return failures;
  }
}
```

### 3.2 Concrete POM Example — Web Login

```typescript
// tests/pom/web/login.page.ts
import { BasePage } from '../base.page';

export class WebLoginPage extends BasePage {
  readonly app = 'web' as const;
  readonly path = '/login';
  readonly loadedIndicator = 'login-submit-button';

  // ── Locators ──────────────────────────────────

  get identifierInput() { return this.testId('login-identifier-input'); }
  get passwordInput()   { return this.testId('login-password-input'); }
  get submitButton()    { return this.testId('login-submit-button'); }
  get errorMessage()    { return this.testId('login-error-message'); }
  get forgotPassLink()  { return this.testId('login-forgot-password-link'); }

  // ── Actions ───────────────────────────────────

  async login(identifier: string, password: string): Promise<void> {
    await this.identifierInput.fill(identifier);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForURL('/dashboard', { timeout: 15_000 });
  }

  async loginExpectError(identifier: string, password: string): Promise<void> {
    await this.identifierInput.fill(identifier);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.errorMessage.waitFor({ state: 'visible' });
  }
}
```

### 3.3 Concrete POM Example — Admin Tenant List

```typescript
// tests/pom/admin/tenant-list.page.ts
import { BasePage } from '../base.page';

export class AdminTenantListPage extends BasePage {
  readonly app = 'admin' as const;
  readonly path = '/tenants';
  readonly loadedIndicator = 'tenant-list-table';

  get searchInput()    { return this.testId('tenant-search-input'); }
  get createButton()   { return this.testId('tenant-create-button'); }
  get tableBody()      { return this.testId('tenant-list-table'); }
  get paginationNext() { return this.testId('pagination-next'); }
  get paginationPrev() { return this.testId('pagination-prev'); }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.waitForApiResponse('/tenants', 'GET');
  }

  async openCreateModal(): Promise<void> {
    await this.createButton.click();
    await this.waitForModalOpen('tenant-form-modal');
  }

  async getTenantCount(): Promise<number> {
    return this.getTableRowCount('tenant-list-table');
  }
}
```

### 3.4 POM Coverage Target

| App     | Routes | POM Classes | Priority |
|---------|--------|-------------|----------|
| Web     | 31     | 31          | Phase 3-4 |
| Admin   | 37     | 37          | Phase 4-5 |
| Landing | 11     | 11          | Phase 5   |
| **Total** | **79** | **79**    |          |

---

## 4. Consolidated Helpers Design

### 4.1 Auth Helper (Multi-App)

```typescript
// tests/helpers/auth.helper.ts
import { Page, BrowserContext } from '@playwright/test';

type AppTarget = 'web' | 'admin';

interface Credentials {
  identifier: string;
  password: string;
}

const defaultCredentials: Record<AppTarget, Credentials> = {
  web: {
    identifier: process.env.WEB_TEST_USER || 'test@xear.com',
    password: process.env.WEB_TEST_PASS || 'Test123!'
  },
  admin: {
    identifier: process.env.ADMIN_TEST_USER || 'admin@xear.com',
    password: process.env.ADMIN_TEST_PASS || 'Admin123!'
  }
};

/**
 * Login via UI — use only for login tests.
 * For other tests, prefer storageState auth.
 */
export async function loginViaUI(
  page: Page,
  app: AppTarget,
  credentials?: Credentials
): Promise<void> {
  const creds = credentials || defaultCredentials[app];
  await page.goto('/login');
  await page.locator('[data-testid="login-identifier-input"]').fill(creds.identifier);
  await page.locator('[data-testid="login-password-input"]').fill(creds.password);
  await page.locator('[data-testid="login-submit-button"]').click();
  await page.waitForURL('/dashboard', { timeout: 15_000 });
}

/**
 * Save auth state to file for reuse — called in global setup.
 */
export async function saveAuthState(
  page: Page,
  app: AppTarget,
  outputPath: string
): Promise<void> {
  await loginViaUI(page, app);
  await page.context().storageState({ path: outputPath });
}

/**
 * Logout via UI
 */
export async function logout(page: Page): Promise<void> {
  await page.locator('[data-testid="user-menu"]').click();
  await page.locator('[data-testid="logout-button"]').click();
  await page.waitForURL('/login');
}
```

### 4.2 Form Helper

```typescript
// tests/helpers/form.helper.ts
import { Page, Locator, expect } from '@playwright/test';

/**
 * Fill a form by mapping TestID → value.
 * Supports input, select, checkbox, radio.
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string | boolean>
): Promise<void> {
  for (const [testId, value] of Object.entries(fields)) {
    const locator = page.locator(`[data-testid="${testId}"]`);
    const tagName = await locator.evaluate((el) => el.tagName.toLowerCase());
    const inputType = await locator.getAttribute('type');

    if (tagName === 'select') {
      await locator.selectOption(String(value));
    } else if (inputType === 'checkbox') {
      if (value) await locator.check();
      else await locator.uncheck();
    } else if (inputType === 'radio') {
      await locator.check();
    } else {
      await locator.fill(String(value));
    }
  }
}

/**
 * Submit form and wait for API response.
 */
export async function submitForm(
  page: Page,
  submitTestId: string,
  apiUrl: string,
  method = 'POST'
): Promise<void> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(apiUrl) && r.request().method() === method,
      { timeout: 30_000 }
    ),
    page.locator(`[data-testid="${submitTestId}"]`).click()
  ]);
}

/**
 * Validate form field errors are displayed.
 */
export async function expectFieldErrors(
  page: Page,
  fieldTestIds: string[]
): Promise<void> {
  for (const testId of fieldTestIds) {
    await expect(
      page.locator(`[data-testid="${testId}-error"]`)
    ).toBeVisible();
  }
}
```

### 4.3 Debug Helper

```typescript
// tests/helpers/debug.helper.ts
import { Page, TestInfo } from '@playwright/test';

interface DebugReport {
  consoleErrors: string[];
  networkFailures: { status: number; url: string; method: string }[];
  jsExceptions: string[];
  brokenImages: string[];
}

/**
 * Attach to page and collect all errors during test execution.
 * Call in beforeEach, retrieve in afterEach.
 */
export function attachDebugListeners(page: Page): DebugReport {
  const report: DebugReport = {
    consoleErrors: [],
    networkFailures: [],
    jsExceptions: [],
    brokenImages: []
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') report.consoleErrors.push(msg.text());
  });

  page.on('pageerror', (err) => {
    report.jsExceptions.push(err.message);
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      report.networkFailures.push({
        status: response.status(),
        url: response.url(),
        method: response.request().method()
      });
    }
  });

  return report;
}

/**
 * Scan page for broken images after load.
 */
export async function scanBrokenImages(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const images = document.querySelectorAll('img');
    return Array.from(images)
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.src);
  });
}

/**
 * Attach debug report to test artifacts on failure.
 */
export async function attachDebugReport(
  report: DebugReport,
  testInfo: TestInfo
): Promise<void> {
  if (testInfo.status !== testInfo.expectedStatus) {
    await testInfo.attach('debug-report', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json'
    });
  }
}
```

### 4.4 Helper Migration Map

| Old Location | File Count | New Location | Status |
|---|---|---|---|
| `tests/helpers/` | 12 files | `tests/helpers/*.helper.ts` | Consolidate & rename |
| `apps/web/e2e/helpers/` | 7 files | Merge into above | Delete after merge |
| `tests/e2e/web/helpers/` | 1 file | Merge into above | Delete after merge |
| **Total** | **20 files** | **9 files** | |

---

## 5. Unified Playwright Configuration

### 5.1 Root Config (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 4 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: isCI
    ? [
        ['github'],
        ['html', { open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/results.xml' }]
      ]
    : [['html', { open: 'on-failure' }]],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul'
  },

  projects: [
    // ── Auth Setup ────────────────────────────────
    {
      name: 'web-auth-setup',
      testMatch: /web\/.*\.setup\.ts/,
      use: {
        baseURL: 'http://localhost:8080',
        ...devices['Desktop Chrome']
      }
    },
    {
      name: 'admin-auth-setup',
      testMatch: /admin\/.*\.setup\.ts/,
      use: {
        baseURL: 'http://localhost:8082',
        ...devices['Desktop Chrome']
      }
    },

    // ── Web App ───────────────────────────────────
    {
      name: 'web',
      testDir: './tests/e2e/web',
      dependencies: ['web-auth-setup'],
      use: {
        baseURL: 'http://localhost:8080',
        storageState: path.join(__dirname, 'tests/.auth/web.json'),
        ...devices['Desktop Chrome']
      }
    },

    // ── Admin Panel ───────────────────────────────
    {
      name: 'admin',
      testDir: './tests/e2e/admin',
      dependencies: ['admin-auth-setup'],
      use: {
        baseURL: 'http://localhost:8082',
        storageState: path.join(__dirname, 'tests/.auth/admin.json'),
        ...devices['Desktop Chrome']
      }
    },

    // ── Landing Page ──────────────────────────────
    {
      name: 'landing',
      testDir: './tests/e2e/landing',
      use: {
        baseURL: 'http://localhost:3000',
        ...devices['Desktop Chrome']
      }
      // No auth dependency — landing is public
    },

    // ── Cross-Browser (Weekly) ────────────────────
    {
      name: 'web-firefox',
      testDir: './tests/e2e/web',
      dependencies: ['web-auth-setup'],
      use: {
        baseURL: 'http://localhost:8080',
        storageState: path.join(__dirname, 'tests/.auth/web.json'),
        ...devices['Desktop Firefox']
      }
    },
    {
      name: 'web-webkit',
      testDir: './tests/e2e/web',
      dependencies: ['web-auth-setup'],
      use: {
        baseURL: 'http://localhost:8080',
        storageState: path.join(__dirname, 'tests/.auth/web.json'),
        ...devices['Desktop Safari']
      }
    }
  ],

  webServer: [
    {
      command: 'cd apps/web && npm run dev',
      url: 'http://localhost:8080',
      reuseExistingServer: !isCI,
      timeout: 120_000
    },
    {
      command: 'cd apps/admin && npm run dev',
      url: 'http://localhost:8082',
      reuseExistingServer: !isCI,
      timeout: 120_000
    },
    {
      command: 'cd apps/landing && npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !isCI,
      timeout: 120_000
    }
  ]
});
```

### 5.2 Config Migration Plan

| Current Config | Location | Action |
|---|---|---|
| Root `playwright.config.ts` | `x-ear/playwright.config.ts` | **REPLACE** with unified above |
| Web-specific config | `apps/web/playwright.config.ts` | **DELETE** after migration |
| Any other configs | Search codebase | **DELETE** |

---

## 6. CI/CD Integration

### 6.1 Workflow: Critical (On Push)

```yaml
# .github/workflows/e2e-critical.yml
name: E2E Critical Flows

on:
  push:
    branches: [main, develop]

concurrency:
  group: e2e-critical-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    timeout-minutes: 45
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: xear_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      
      - name: Setup backend
        run: |
          pip install -r requirements.txt
          alembic upgrade head
          python -m seed.test_seed
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/xear_test
      
      - name: Run critical tests
        run: npx playwright test --project=web --project=admin --grep @critical
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/xear_test
      
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: critical-report
          path: playwright-report/
          retention-days: 14
```

### 6.2 Workflow: PR Full Suite

```yaml
# .github/workflows/e2e-pr.yml  
name: E2E Full Suite

on:
  pull_request:
    branches: [main, develop]

concurrency:
  group: e2e-pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  test:
    timeout-minutes: 90
    runs-on: ubuntu-latest
    strategy:
      matrix:
        project: [web, admin, landing]
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      
      - name: Run ${{ matrix.project }} tests
        run: npx playwright test --project=${{ matrix.project }}
      
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: report-${{ matrix.project }}
          path: playwright-report/
          retention-days: 14
```

### 6.3 CI Fix — Current Issues

| Issue | Root Cause | Fix |
|---|---|---|
| `e2e-p0.yml` always passes (0 tests) | `--grep @p0` but no tests tagged `@p0` | Replace with `--grep @critical` + tag tests |
| `e2e-p1.yml` always passes (0 tests) | Same — `--grep @p1` with no tagged tests | Replace with project-based filtering |
| Version mismatch | Root uses v1.58.1, web uses v1.57.0 | Pin single version in root `package.json` |
| Node version outdated | CI uses Node 18, project uses 20 | Update to Node 20 |
| actions/checkout@v3 | Deprecated | Update to v4 |

---

## 7. Test Strategy (8-Phase)

### 7.1 Phase Overview

```
Phase 0: Zero Tech Debt          (Week 1)     — 0 lint, 0 type errors
Phase 1: Infrastructure          (Week 1-2)   — Config, POM, helpers, TestIDs
Phase 2: Debug-First Scan        (Week 2-3)   — Exploratory pass, all 79 routes
Phase 3: Web Full Coverage       (Week 3-6)   — 31 routes, ~310 tests
Phase 4: Admin Full Coverage     (Week 6-8)   — 37 routes, ~220 tests
Phase 5: Landing Full Coverage   (Week 8-9)   — 11 routes, ~55 tests
Phase 6: Cross-App + Hardening   (Week 9-10)  — Sync tests, visual regression
Phase 7: Stabilization           (Week 10)    — Flaky fix, CI green, docs
```

### 7.2 Debug-First Strategy (Phase 2)

The debug-first approach scans EVERY route before writing detailed tests:

```
For each route in {web, admin, landing}:
  1. Navigate to route
  2. Screenshot (page loaded? or error?)
  3. Collect console errors
  4. Collect network 4xx/5xx
  5. Scan for broken images
  6. Check key interactive elements exist
  7. Record: PASS / FAIL / PARTIAL
  8. Output: debug-scan-report.json
```

**Expected Output** (JSON per route):
```json
{
  "route": "/parties",
  "app": "web",
  "status": "PARTIAL",
  "pageLoads": true,
  "consoleErrors": ["TypeError: Cannot read property 'map' of undefined"],
  "networkFailures": [{"status": 404, "url": "/api/v1/parties?limit=10"}],
  "brokenImages": [],
  "missingTestIds": ["party-create-button", "party-search-input"],
  "screenshot": "debug-screenshots/web-parties.png"
}
```

### 7.3 Test Prioritization

| Tag | Count | Trigger | Timeout | Scope |
|-----|-------|---------|---------|-------|
| `@critical` | ~60 | Every push | 35 min | Revenue flows (Sale, Payment, Party CRUD) |
| `@smoke` | ~120 | Every PR | 45 min | All routes load + basic CRUD |
| `@full` | ~600+ | PR (matrix) | 90 min | Complete coverage |
| `@visual` | ~30 | Weekly | 20 min | Screenshot comparison |
| `@a11y` | ~40 | Weekly | 15 min | Accessibility audit |

### 7.4 Test Naming Convention

```
{app}/{module}/{feature}.spec.ts
```

**Test Block Naming**:
```typescript
test.describe('Web > Parties > Create Party Modal', () => {
  test('should open modal when create button clicked', ...);
  test('should show validation errors for empty required fields', ...);
  test('should create party with valid data', ...);
  test('should close modal on cancel', ...);
  test('should close modal on backdrop click', ...);
});
```

---

## 8. TestID Implementation Strategy

### 8.1 Naming Convention

```
{module}-{element}-{variant?}-{action?}
```

**Rules**:
- kebab-case only
- Max 4 segments
- Module = page/feature name
- Element = semantic element name
- Variant = optional differentiator
- Action = optional verb

**Examples**:
```
party-list-table
party-create-button
party-form-modal
party-firstname-input
party-submit-button
party-delete-confirm-button
sale-device-assignment-modal
payment-amount-input
settings-theme-toggle
admin-tenant-search-input
```

### 8.2 Current TestID Inventory

| App | Current TestIDs | Target TestIDs | Coverage |
|-----|----------------|----------------|----------|
| Web | 94 unique | ~800 | 12% |
| Admin | 8 unique | ~400 | 2% |
| Landing | 0 | ~100 | 0% |
| **Total** | **102** | **~1300** | **8%** |

### 8.3 TestID Sprint Plan

**Priority 1** (Critical flows — Week 1-2):
- Login/Logout forms (both apps)
- Party CRUD (list, create modal, detail, edit, delete confirm)
- Sale flow (list, create modal, device assignment)
- Payment (list, create, tracking)
- Toast notifications (success, error, warning, info)
- Loading spinners
- Navigation elements (sidebar, topbar)

**Priority 2** (High-usage pages — Week 3-4):
- Appointment scheduling
- Device management
- Cash register
- Invoice
- Settings pages
- All modals

**Priority 3** (Complete coverage — Week 5+):
- Reports
- Communication (SMS/Email)
- Profile
- Bulk operations
- Admin-only pages
- Landing page

---

## 9. Test Data Management

### 9.1 Strategy

```
Production DB ──────────── NEVER touched by tests
                           
Test DB (xear_test) ────── Seeded before test suite
                           Cleaned after each test file
                           Reset between CI runs

Test Data Creation:
  ✅ API calls in beforeAll (fast, reliable)
  ❌ UI interactions (slow, flaky)
  ✅ Direct DB seed scripts (for complex state)
```

### 9.2 Fixture Design

```typescript
// tests/fixtures/users.fixture.ts
export const TEST_USERS = {
  webAdmin: {
    identifier: 'e2e-admin@xear-test.com',
    password: 'E2eTest123!',
    role: 'ADMIN',
    tenantId: 'e2e-test-tenant'
  },
  webAudiologist: {
    identifier: 'e2e-audio@xear-test.com',
    password: 'E2eTest123!',
    role: 'AUDIOLOGIST',
    tenantId: 'e2e-test-tenant'
  },
  superAdmin: {
    identifier: 'e2e-super@xear-test.com',
    password: 'E2eSuper123!',
    role: 'SUPER_ADMIN'
  }
};
```

---

## 10. Error Handling & Debugging

### 10.1 Artifact Matrix

| Artifact | When Captured | Storage | Retention |
|----------|--------------|---------|-----------|
| Screenshot (full page) | On failure | `test-results/` | 14 days CI |
| Video (entire test) | On failure | `test-results/` | 14 days CI |
| Trace (timeline+network) | First retry | `test-results/` | 14 days CI |
| Console logs | Always | `test-results/` | 14 days CI |
| Debug report (JSON) | On failure | `test-results/` | 14 days CI |
| HTML report | Always | `playwright-report/` | 30 days CI |

### 10.2 Debugging Workflow

```
Test Fails
    ↓
1. Check HTML report → see screenshot + error message
    ↓
2. Open trace viewer → see timeline + network + DOM snapshot
    ↓
3. Check debug-report.json → console errors + network failures
    ↓
4. Classify failure:
    ├─ TestID missing → Add data-testid to component
    ├─ Timing issue → Add proper waitFor (never waitForTimeout)
    ├─ State issue → Fix beforeEach / cleanup
    ├─ Selector issue → Use POM locator
    ├─ Backend issue → Check API + DB
    └─ Flaky → Add retry OR fix root cause
    ↓
5. Fix + re-run locally → `npx playwright test --project=web --grep "test name"`
    ↓
6. Push → CI verifies
```

### 10.3 Flaky Test Protocol

1. Test fails intermittently (< 95% pass rate over 10 runs)
2. Tag with `@flaky` annotation
3. Investigate root cause (timing, race condition, test isolation)
4. Fix root cause — do NOT just add retries
5. Run 10x locally: `for i in {1..10}; do npx playwright test <file>; done`
6. If 10/10 pass, remove `@flaky` tag
7. If still flaky, isolate to dedicated CI job with `--repeat-each=5`

---

## 11. Performance Optimization

### 11.1 Parallel Execution

- **CI**: 4 workers per project × 3 projects (matrix) = 12 parallel
- **Local**: Unlimited workers (CPU count)
- **Isolation**: Each test has own browser context (no shared cookies/state)

### 11.2 Auth Optimization

- Login once per project in setup → save `storageState`
- All tests reuse `storageState` (no repeated login)
- Estimated savings: ~3 min per 100 tests (vs login per test)

### 11.3 Smart Waiting Rules

```
✅ DO:
  await page.waitForResponse(urlPattern)
  await expect(locator).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.waitForURL(pattern)

❌ DON'T:
  await page.waitForTimeout(3000)    // NEVER hardcode waits
  await new Promise(r => setTimeout(r, 1000))  // NEVER
```

---

## 12. Quality Gates

### 12.1 Merge Blockers

All PRs must pass before merge:
- [ ] `npx playwright test --project=web` — 100% pass
- [ ] `npx playwright test --project=admin` — 100% pass
- [ ] `npx playwright test --project=landing` — 100% pass
- [ ] `npx tsc --noEmit` — 0 errors (test files included)
- [ ] `npx eslint tests/` — 0 warnings, 0 errors
- [ ] No `test.skip()` without linked issue
- [ ] No `waitForTimeout()` calls
- [ ] All new tests use POM pattern
- [ ] All selectors use `data-testid` (no CSS/XPath)

### 12.2 Weekly Health Check

- Run 3-browser matrix (Chromium + Firefox + WebKit)
- Check flaky test rate (target: < 2%)
- Review test execution time (target: < 90 min full suite)
- Audit new routes without test coverage
- Verify TestID coverage trending up

---

## 13. Maintenance Strategy

### 13.1 When to Update Tests

- New feature added → Write tests before merge
- Feature changed → Update affected POM + tests
- Bug fixed → Add regression test
- Route added → POM class + route test required
- Modal added → Modal test required
- Component TestID changed → Update POM locator

### 13.2 Code Review Checklist for Tests

- [ ] Uses POM (not raw selectors)
- [ ] Data-testid selectors (no CSS class/XPath)
- [ ] No `waitForTimeout` calls
- [ ] Proper cleanup in afterEach
- [ ] Test isolated (no dependency on other tests)
- [ ] Named descriptively (reads like specification)
- [ ] Tagged appropriately (@critical, @smoke, etc.)
- [ ] TypeScript strict — zero errors

---

## 14. Related Documents

- [Requirements](./requirements.md) — User stories, acceptance criteria
- [Tasks](./tasks.md) — Phase-by-phase implementation plan
- [README](./README.md) — Spec overview and golden rules
- [Test Inventory](../../docs/playwright/tests/00-TEST-INVENTORY-INDEX.md) — Current test catalog
- [Testing Guide](../../docs/playwright/03-TESTING-GUIDE.md) — Developer onboarding
- [Debugging Guide](../../docs/playwright/04-DEBUGGING-GUIDE.md) — Troubleshooting reference
