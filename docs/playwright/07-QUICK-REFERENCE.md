# Playwright E2E Testing - Quick Reference Card

**Project**: X-Ear CRM  
**Last Updated**: 2026-02-02

---

## 🚀 Quick Start

```bash
# Install
npm install
npx playwright install

# Run tests
npx playwright test

# Debug mode
npx playwright test --debug

# UI mode
npx playwright test --ui

# Specific test
npx playwright test auth.spec.ts
```

---

## 📚 Documentation Quick Links

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [PLAYWRIGHT_TESTING_INDEX.md](./docs/PLAYWRIGHT_TESTING_INDEX.md) | Central hub | Start here |
| [PLAYWRIGHT_TESTING_GUIDE.md](./docs/PLAYWRIGHT_TESTING_GUIDE.md) | Quick start | Writing tests |
| [PLAYWRIGHT_FLOW_ANALYSIS.md](./docs/PLAYWRIGHT_FLOW_ANALYSIS.md) | Test scenarios | Finding flows |
| [PLAYWRIGHT_DEBUGGING_GUIDE.md](./docs/PLAYWRIGHT_DEBUGGING_GUIDE.md) | Debug help | Tests failing |
| [PLAYWRIGHT_SECURITY_TESTING_GUIDE.md](./docs/PLAYWRIGHT_SECURITY_TESTING_GUIDE.md) | Security tests | Security testing |
| [PLAYWRIGHT_PERFORMANCE_TESTING_GUIDE.md](./docs/PLAYWRIGHT_PERFORMANCE_TESTING_GUIDE.md) | Performance tests | Performance testing |

---

## 🎯 Test Categories

### Functional Tests (FLOW-*)
```bash
npx playwright test --grep "FLOW-"
```
- User flows and business logic
- CRUD operations
- Form validation

### Security Tests (SEC-*)
```bash
npx playwright test --grep "SEC-"
```
- Authentication & authorization
- Multi-tenancy isolation
- RBAC permissions
- XSS, SQL injection prevention

### Performance Tests (PERF-*)
```bash
npx playwright test --grep "PERF-"
```
- Page load performance
- API response times
- Memory usage
- Core Web Vitals

---

## 🔧 Common Commands

```bash
# Run all tests
npx playwright test

# Run specific category
npx playwright test --grep "AUTH-"
npx playwright test --grep "PARTY-"
npx playwright test --grep "SALE-"

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Generate report
npx playwright test --reporter=html

# Show report
npx playwright show-report

# Record trace
npx playwright test --trace on

# Show trace
npx playwright show-trace trace.zip
```

---

## 📝 Writing Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';

test('FLOW-AUTH-001: User can login', async ({ page }) => {
  // Navigate
  await page.goto('/login');
  
  // Fill form
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  
  // Submit
  await page.click('[data-testid="login-submit-button"]');
  
  // Assert
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
});
```

### Authentication Helper
```typescript
import { test as base } from '@playwright/test';

const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
    await page.fill('[data-testid="login-password-input"]', 'password123');
    await page.click('[data-testid="login-submit-button"]');
    await page.waitForURL('/dashboard');
    await use(page);
  }
});

test('FLOW-PARTY-001: Create party', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/parties');
  // ... rest of test
});
```

---

## 🎯 Selectors Best Practices

### ✅ Good Selectors
```typescript
// Use data-testid
await page.click('[data-testid="submit-button"]');

// Use role
await page.click('role=button[name="Submit"]');

// Use label
await page.fill('label:has-text("Email")', 'test@example.com');
```

### ❌ Bad Selectors
```typescript
// Don't use classes (can change)
await page.click('.btn-primary');

// Don't use text (can change with i18n)
await page.click('text=Submit');

// Don't use complex CSS
await page.click('div > div > button:nth-child(2)');
```

---

## 🐛 Debugging Tips

### Quick Debug
```typescript
// Pause execution
await page.pause();

// Take screenshot
await page.screenshot({ path: 'debug.png' });

// Print HTML
console.log(await page.content());

// Print element
console.log(await page.locator('[data-testid="error"]').textContent());
```

### Debug Mode
```bash
# Interactive debugging
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed

# Slow motion
npx playwright test --headed --slow-mo=1000
```

### Trace Viewer
```bash
# Record trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

---

## ⚡ Performance Tips

### Parallel Execution
```typescript
// playwright.config.ts
export default {
  workers: 4, // Run 4 tests in parallel
  fullyParallel: true
};
```

### Test Isolation
```typescript
// Each test should be independent
test.beforeEach(async ({ page }) => {
  // Setup for each test
});

test.afterEach(async ({ page }) => {
  // Cleanup after each test
});
```

### Reuse Authentication
```typescript
// Save auth state once
test('setup', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.context().storageState({ path: 'auth.json' });
});

// Reuse in other tests
test.use({ storageState: 'auth.json' });
```

---

## 📊 Assertions

### Common Assertions
```typescript
// URL
await expect(page).toHaveURL('/dashboard');

// Visibility
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

// Text content
await expect(page.locator('[data-testid="title"]')).toHaveText('Dashboard');

// Count
await expect(page.locator('[data-testid="party-row"]')).toHaveCount(10);

// Attribute
await expect(page.locator('[data-testid="input"]')).toHaveAttribute('disabled');

// Value
await expect(page.locator('[data-testid="input"]')).toHaveValue('test');
```

### Custom Assertions
```typescript
// With custom message
expect(result, 'Result should be positive').toBeGreaterThan(0);

// Soft assertions (continue on failure)
await expect.soft(page.locator('[data-testid="warning"]')).toBeVisible();
```

---

## 🔒 Security Testing

### Authentication Tests
```bash
npx playwright test --grep "SEC-AUTH-"
```

### Permission Tests
```bash
npx playwright test --grep "SEC-RBAC-"
```

### XSS Tests
```bash
npx playwright test --grep "SEC-XSS-"
```

---

## ⚡ Performance Testing

### Core Web Vitals
```bash
npx playwright test --grep "PERF-LCP-"
npx playwright test --grep "PERF-FID-"
npx playwright test --grep "PERF-CLS-"
```

### API Performance
```bash
npx playwright test --grep "PERF-API-"
```

### Load Testing
```bash
npx playwright test --grep "PERF-LOAD-"
```

---

## 🎯 Top 10 Critical Tests

1. **AUTH-001**: Login flow
2. **PARTY-001**: Create party
3. **SALE-001**: Create sale with payment
4. **INVOICE-001**: Generate e-invoice
5. **PAYMENT-001**: Record payment
6. **INVENTORY-001**: Create inventory item
7. **SALE-002**: Device assignment
8. **ADMIN-AUTH-001**: Admin login
9. **ADMIN-TENANT-001**: Create tenant
10. **ADMIN-USER-001**: Impersonate user

---

## 📈 Success Metrics

| Metric | Target |
|--------|--------|
| P0 Test Coverage | 100% |
| P1 Test Coverage | 80% |
| Test Execution Time | < 10 min |
| Flaky Test Rate | < 5% |
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| API Response | < 500ms |

---

## 🚨 Common Issues

### Issue: Test Timeout
```typescript
// Increase timeout
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... test code
});
```

### Issue: Element Not Found
```typescript
// Wait for element
await page.waitForSelector('[data-testid="element"]');

// Or use auto-waiting
await page.click('[data-testid="element"]'); // Auto-waits
```

### Issue: Flaky Test
```typescript
// Use proper waits
await page.waitForLoadState('networkidle');

// Wait for specific condition
await page.waitForFunction(() => document.querySelector('[data-testid="loaded"]'));
```

---

## 📞 Need Help?

1. Check [PLAYWRIGHT_TESTING_INDEX.md](./docs/PLAYWRIGHT_TESTING_INDEX.md)
2. Review [PLAYWRIGHT_DEBUGGING_GUIDE.md](./docs/PLAYWRIGHT_DEBUGGING_GUIDE.md)
3. Search [Playwright Docs](https://playwright.dev)
4. Ask team in chat

---

## ✅ Pre-Commit Checklist

- [ ] Test passes locally
- [ ] Test is isolated (no dependencies on other tests)
- [ ] Uses `data-testid` selectors
- [ ] Has descriptive test name
- [ ] Includes positive + negative scenarios
- [ ] Has detailed assertions with messages
- [ ] No hardcoded waits (`waitForTimeout`)
- [ ] Cleans up after itself

---

**Quick Reference Version**: 1.0  
**For Full Documentation**: See [PLAYWRIGHT_TESTING_INDEX.md](./docs/PLAYWRIGHT_TESTING_INDEX.md)
