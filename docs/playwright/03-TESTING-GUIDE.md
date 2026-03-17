# Playwright E2E Testing Guide - X-EAR CRM

**Quick Start Guide for Implementing Playwright Tests**

---

## 📚 Documentation Structure

1. **[PLAYWRIGHT_FLOW_ANALYSIS.md](./PLAYWRIGHT_FLOW_ANALYSIS.md)** - Complete flow extraction (50+ flows)
2. **This file** - Quick start guide and best practices

---

## 🚀 Quick Start

### Prerequisites
```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install
```

### Run Tests
```bash
# All tests
npm run test:e2e

# Specific project
npx playwright test --project=web
npx playwright test --project=admin
npx playwright test --project=critical-flows-p0

# Debug mode
npx playwright test --debug

# UI mode
npx playwright test --ui
```

---

## ⚠️ CRITICAL: TestID Requirements

**99% of components lack test selectors!** Before writing tests, add `data-testid` attributes:

### Priority 1 (P0) - Required for Critical Tests
```typescript
// Auth
'login-identifier-input'
'login-password-input'
'login-submit-button'

// Party
'party-create-button'
'party-form-modal'
'party-first-name-input'
'party-last-name-input'
'party-phone-input'
'party-submit-button'

// Sale
'sale-create-button'
'sale-device-select'
'sale-price-input'
'sale-submit'

// Common
'success-toast'
'error-toast'
'loading-spinner'
```

### How to Add TestIDs
```tsx
// ❌ Before
<button onClick={handleSubmit}>Kaydet</button>

// ✅ After
<button data-testid="party-submit-button" onClick={handleSubmit}>
  Kaydet
</button>
```

---

## 📋 Test Structure

### File Organization
```
tests/e2e/
├── web/                    # Web app tests
│   ├── auth/
│   │   ├── login.spec.ts
│   │   └── otp.spec.ts
│   ├── parties/
│   │   ├── create.spec.ts
│   │   └── bulk-upload.spec.ts
│   └── sales/
│       └── create-sale.spec.ts
├── admin/                  # Admin panel tests
│   ├── auth/
│   └── tenants/
├── critical-flows/         # CI blocker tests
│   ├── p0-revenue-legal/
│   ├── p1-core-operations/
│   └── p2-admin-operations/
└── fixtures/               # Test data
    ├── auth.ts
    └── parties.ts
```

### Test Template
```typescript
import { test, expect } from '@playwright/test';

test.describe('Party Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
    await page.fill('[data-testid="login-password-input"]', 'password');
    await page.click('[data-testid="login-submit-button"]');
    await expect(page).toHaveURL('/');
  });

  test('should create new party successfully', async ({ page }) => {
    // Navigate to parties
    await page.goto('/parties');
    
    // Open create modal
    await page.click('[data-testid="party-create-button"]');
    await expect(page.locator('[data-testid="party-form-modal"]')).toBeVisible();
    
    // Fill form
    await page.fill('[data-testid="party-first-name-input"]', 'Ahmet');
    await page.fill('[data-testid="party-last-name-input"]', 'Yılmaz');
    await page.fill('[data-testid="party-phone-input"]', '05551234567');
    
    // Submit
    await page.click('[data-testid="party-submit-button"]');
    
    // Verify
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('başarıyla');
    await expect(page.locator('[data-testid="party-table-row"]').first()).toContainText('Ahmet Yılmaz');
  });

  test('should show validation error for missing required fields', async ({ page }) => {
    await page.goto('/parties');
    await page.click('[data-testid="party-create-button"]');
    
    // Try to submit without filling required fields
    await page.click('[data-testid="party-submit-button"]');
    
    // Verify validation
    await expect(page.locator('[data-testid="party-first-name-input"]')).toHaveAttribute('aria-invalid', 'true');
  });
});
```

---

## 🎯 Critical Tests (CI Blockers)

### P0 - Revenue & Legal
```typescript
// tests/e2e/critical-flows/p0-revenue-legal/sale-invoice-payment.spec.ts
test('complete sale to invoice to payment flow', async ({ page }) => {
  // 1. Create sale
  // 2. Generate invoice
  // 3. Record payment
  // 4. Verify all states
});
```

### P1 - Core Operations
```typescript
// tests/e2e/critical-flows/p1-core-operations/party-lifecycle.spec.ts
test('party creation to device assignment', async ({ page }) => {
  // 1. Create party
  // 2. Assign device
  // 3. Verify inventory updated
});
```

---

## 🔧 Helper Functions

### Auth Helper
```typescript
// tests/e2e/fixtures/auth.ts
export async function login(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.fill('[data-testid="login-identifier-input"]', email);
  await page.fill('[data-testid="login-password-input"]', password);
  await page.click('[data-testid="login-submit-button"]');
  await expect(page).toHaveURL('/');
  
  // Wait for auth token
  await page.waitForFunction(() => {
    return localStorage.getItem('x-ear.auth.token@v1') !== null;
  });
}

export async function loginAsAdmin(page: Page) {
  await page.goto('http://localhost:8082/login');
  await page.fill('[data-testid="admin-login-email"]', 'admin@xear.com');
  await page.fill('[data-testid="admin-login-password"]', 'admin123');
  await page.click('[data-testid="admin-login-submit"]');
  await expect(page).toHaveURL('http://localhost:8082/dashboard');
}
```

### Data Factory
```typescript
// tests/e2e/fixtures/parties.ts
export function generatePartyData() {
  return {
    firstName: `Test${Date.now()}`,
    lastName: 'User',
    phone: `0555${Math.floor(Math.random() * 10000000)}`,
    email: `test${Date.now()}@example.com`,
  };
}
```

---

## 📊 Test Reporting

### View Results
```bash
# HTML report
npx playwright show-report

# JSON report
cat playwright-report/results.json | jq
```

### CI Integration
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e:ci
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 🐛 Debugging Tips

### Visual Debugging
```bash
# Run with headed browser
npx playwright test --headed

# Run with slow motion
npx playwright test --headed --slow-mo=1000

# Debug specific test
npx playwright test auth/login.spec.ts --debug
```

### Screenshots & Videos
```typescript
// Automatic on failure (configured in playwright.config.ts)
screenshot: 'only-on-failure'
video: 'retain-on-failure'

// Manual screenshot
await page.screenshot({ path: 'debug.png' });
```

### Console Logs
```typescript
// Capture console logs
page.on('console', msg => console.log('PAGE LOG:', msg.text()));

// Capture network requests
page.on('request', request => console.log('>>', request.method(), request.url()));
page.on('response', response => console.log('<<', response.status(), response.url()));
```

---

## ✅ Best Practices

### 1. Use TestIDs, Not Text or Classes
```typescript
// ❌ Bad - Fragile
await page.click('button:has-text("Kaydet")');
await page.click('.btn-primary');

// ✅ Good - Stable
await page.click('[data-testid="party-submit-button"]');
```

### 2. Wait for State, Not Time
```typescript
// ❌ Bad
await page.waitForTimeout(3000);

// ✅ Good
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
```

### 3. Isolate Tests
```typescript
// Each test should be independent
test.beforeEach(async ({ page }) => {
  // Fresh login for each test
  await login(page, 'test@example.com', 'password');
});
```

### 4. Clean Up After Tests
```typescript
test.afterEach(async ({ page }) => {
  // Delete test data if needed
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});
```

---

## 📈 Coverage Goals

| Priority | Coverage Target | Timeline |
|----------|----------------|----------|
| P0 (Critical) | 100% | Week 2 |
| P1 (Core) | 80% | Week 3 |
| P2 (Admin) | 60% | Week 4 |
| P3 (Nice-to-have) | 40% | Week 5+ |

---

## 🚨 Common Issues

### Issue: Test Flakiness
**Solution**: Use proper waits, avoid timeouts, ensure test isolation

### Issue: Slow Tests
**Solution**: Run in parallel, use test fixtures, mock external APIs

### Issue: Selector Not Found
**Solution**: Add missing testIDs, check element visibility

---

## 📞 Support

- **Documentation**: [PLAYWRIGHT_FLOW_ANALYSIS.md](./PLAYWRIGHT_FLOW_ANALYSIS.md)
- **Playwright Docs**: https://playwright.dev
- **Project Rules**: [project-rules.md](../.kiro/steering/project-rules.md)

