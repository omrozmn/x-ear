# Playwright Test Debugging & Troubleshooting Guide

**Purpose**: Comprehensive debugging strategies for failed Playwright tests  
**Audience**: QA Engineers, Developers  
**Last Updated**: 2026-02-02

---

## 📋 TABLE OF CONTENTS

1. [Debug Mode & Tools](#1-debug-mode--tools)
2. [Common Failure Patterns](#2-common-failure-patterns)
3. [Assertion Strategies](#3-assertion-strategies)
4. [Network Debugging](#4-network-debugging)
5. [State Inspection](#5-state-inspection)
6. [Screenshot & Video Analysis](#6-screenshot--video-analysis)
7. [Performance Debugging](#7-performance-debugging)
8. [CI/CD Debugging](#8-cicd-debugging)

---

## 1. DEBUG MODE & TOOLS

### 1.1 Interactive Debug Mode

```bash
# Run single test in debug mode
npx playwright test auth/login.spec.ts --debug

# Debug specific line
npx playwright test auth/login.spec.ts:15 --debug

# Debug with headed browser
npx playwright test --headed --debug
```

**Features**:
- Step through test line by line
- Inspect page state at any point
- Modify selectors in real-time
- View network requests
- Console logs visible

### 1.2 UI Mode (Recommended)

```bash
# Launch UI mode
npx playwright test --ui

# UI mode with specific project
npx playwright test --ui --project=web
```

**Features**:
- Visual test runner
- Time travel debugging
- Watch mode
- Trace viewer integrated
- Network inspector

### 1.3 Trace Viewer

```bash
# Generate trace on failure (auto-configured)
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

**Trace Contains**:
- Screenshots at each step
- DOM snapshots
- Network activity
- Console logs
- Action timeline

### 1.4 Inspector

```typescript
// Pause test execution
await page.pause();

// Opens Playwright Inspector
// - Explore page
// - Pick selectors
// - Record actions
```

---

## 2. COMMON FAILURE PATTERNS

### 2.1 Selector Not Found

**Symptom**:
```
Error: locator.click: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for locator('[data-testid="party-submit-button"]')
```

**Debug Steps**:

```typescript
// 1. Check if element exists
const element = page.locator('[data-testid="party-submit-button"]');
console.log('Element count:', await element.count());

// 2. Check if element is visible
console.log('Is visible:', await element.isVisible());

// 3. Check element state
console.log('Is enabled:', await element.isEnabled());
console.log('Is hidden:', await element.isHidden());

// 4. Get element attributes
console.log('Attributes:', await element.evaluate(el => ({
  id: el.id,
  class: el.className,
  disabled: el.disabled,
  style: el.style.cssText
})));

// 5. Screenshot before action
await page.screenshot({ path: 'before-click.png' });

// 6. Wait for element explicitly
await element.waitFor({ state: 'visible', timeout: 10000 });
```

**Common Causes**:
- TestID not added to component
- Element rendered conditionally
- Element inside iframe
- Element covered by overlay
- Animation in progress

**Solutions**:

```typescript
// Wait for network idle
await page.waitForLoadState('networkidle');

// Wait for specific element
await page.waitForSelector('[data-testid="party-submit-button"]', {
  state: 'visible',
  timeout: 10000
});

// Scroll into view
await element.scrollIntoViewIfNeeded();

// Force click (bypass visibility checks)
await element.click({ force: true }); // Use sparingly!

// Check for overlays
const overlay = page.locator('[data-testid="modal-overlay"]');
if (await overlay.isVisible()) {
  await overlay.click(); // Close overlay first
}
```

### 2.2 Timing Issues

**Symptom**:
```
Error: expect(locator).toContainText: Timeout 5000ms exceeded.
Expected string: "başarıyla eklendi"
Received string: ""
```

**Debug Steps**:

```typescript
// 1. Add explicit waits
await page.waitForResponse(resp => 
  resp.url().includes('/api/parties') && resp.status() === 201
);

// 2. Wait for state change
await expect(page.locator('[data-testid="success-toast"]'))
  .toBeVisible({ timeout: 10000 });

// 3. Poll for condition
await page.waitForFunction(() => {
  const toast = document.querySelector('[data-testid="success-toast"]');
  return toast && toast.textContent.includes('başarıyla');
}, { timeout: 10000 });

// 4. Check loading states
const spinner = page.locator('[data-testid="loading-spinner"]');
await spinner.waitFor({ state: 'hidden', timeout: 30000 });

// 5. Log timing
console.time('operation');
await page.click('[data-testid="party-submit-button"]');
await page.waitForResponse('/api/parties');
console.timeEnd('operation');
```

**Common Causes**:
- API response slow
- React Query cache stale
- Animation delays
- Debounced inputs
- Race conditions

**Solutions**:

```typescript
// Increase timeout for slow operations
test.setTimeout(60000); // 60 seconds

// Wait for specific network request
await Promise.all([
  page.waitForResponse(resp => 
    resp.url().includes('/api/parties') && 
    resp.request().method() === 'POST'
  ),
  page.click('[data-testid="party-submit-button"]')
]);

// Wait for React Query to settle
await page.waitForFunction(() => {
  // Check if React Query is idle
  return !document.querySelector('[data-state="loading"]');
});

// Disable animations in test
await page.addStyleTag({
  content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  `
});
```

### 2.3 Authentication Failures

**Symptom**:
```
Error: expect(page).toHaveURL: Timeout 30000ms exceeded.
Expected: "/"
Received: "/login"
```

**Debug Steps**:

```typescript
// 1. Check token storage
const token = await page.evaluate(() => 
  localStorage.getItem('x-ear.auth.token@v1')
);
console.log('Token exists:', !!token);
console.log('Token preview:', token?.substring(0, 50));

// 2. Check token validity
const tokenPayload = await page.evaluate(() => {
  const token = localStorage.getItem('x-ear.auth.token@v1');
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      sub: payload.sub,
      exp: payload.exp,
      tenant_id: payload.tenant_id,
      role: payload.role,
      expired: payload.exp * 1000 < Date.now()
    };
  } catch (e) {
    return { error: e.message };
  }
});
console.log('Token payload:', tokenPayload);

// 3. Check auth store state
const authState = await page.evaluate(() => {
  const persistKey = 'x-ear.auth.auth-storage-persist@v1';
  const stored = localStorage.getItem(persistKey);
  return stored ? JSON.parse(stored) : null;
});
console.log('Auth store:', authState);

// 4. Check network requests
page.on('request', req => {
  if (req.url().includes('/api/')) {
    console.log('Request:', req.method(), req.url());
    console.log('Auth header:', req.headers()['authorization']);
  }
});

page.on('response', resp => {
  if (resp.status() === 401) {
    console.log('401 Unauthorized:', resp.url());
  }
});

// 5. Verify login flow
await page.goto('/');
await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
await page.fill('[data-testid="login-password-input"]', 'password');

// Capture login response
const [response] = await Promise.all([
  page.waitForResponse('/api/auth/login'),
  page.click('[data-testid="login-submit-button"]')
]);

const loginData = await response.json();
console.log('Login response:', loginData);
```

**Common Causes**:
- Token expired
- Token not stored correctly
- CORS issues
- Backend auth middleware rejecting token
- Token refresh failed

**Solutions**:

```typescript
// Helper: Ensure fresh login
async function ensureAuthenticated(page: Page) {
  // Check if already authenticated
  const isAuthenticated = await page.evaluate(() => {
    const token = localStorage.getItem('x-ear.auth.token@v1');
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  });
  
  if (!isAuthenticated) {
    await login(page, 'test@example.com', 'password');
  }
}

// Helper: Login with retry
async function loginWithRetry(page: Page, email: string, password: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.goto('/');
      await page.fill('[data-testid="login-identifier-input"]', email);
      await page.fill('[data-testid="login-password-input"]', password);
      
      const [response] = await Promise.all([
        page.waitForResponse('/api/auth/login'),
        page.click('[data-testid="login-submit-button"]')
      ]);
      
      if (response.ok()) {
        await expect(page).toHaveURL('/');
        return;
      }
      
      console.log(`Login attempt ${i + 1} failed:`, response.status());
    } catch (error) {
      console.log(`Login attempt ${i + 1} error:`, error);
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### 2.4 State Mismatch

**Symptom**:
```
Error: expect(locator).toContainText: Expected "10" but got "9"
```

**Debug Steps**:

```typescript
// 1. Check React Query cache
const queryCache = await page.evaluate(() => {
  // Access React Query DevTools data
  return window.__REACT_QUERY_DEVTOOLS__;
});
console.log('Query cache:', queryCache);

// 2. Check Zustand store
const zustandState = await page.evaluate(() => {
  // Access Zustand store (if exposed)
  return window.__ZUSTAND_STORES__;
});
console.log('Zustand state:', zustandState);

// 3. Check localStorage
const storage = await page.evaluate(() => {
  const keys = Object.keys(localStorage);
  return keys.reduce((acc, key) => {
    if (key.startsWith('x-ear.')) {
      acc[key] = localStorage.getItem(key);
    }
    return acc;
  }, {});
});
console.log('LocalStorage:', storage);

// 4. Check DOM state
const domState = await page.evaluate(() => {
  return {
    partyCount: document.querySelectorAll('[data-testid="party-table-row"]').length,
    loadingVisible: !!document.querySelector('[data-testid="loading-spinner"]'),
    errorVisible: !!document.querySelector('[data-testid="error-message"]')
  };
});
console.log('DOM state:', domState);

// 5. Wait for state to settle
await page.waitForFunction(() => {
  const rows = document.querySelectorAll('[data-testid="party-table-row"]');
  const spinner = document.querySelector('[data-testid="loading-spinner"]');
  return rows.length > 0 && !spinner;
}, { timeout: 10000 });
```

**Common Causes**:
- Cache not invalidated
- Optimistic update not reverted
- Race condition in state updates
- Stale closure in React
- IndexedDB sync pending

**Solutions**:

```typescript
// Force cache invalidation
await page.evaluate(() => {
  // Clear React Query cache
  window.queryClient?.clear();
  
  // Clear localStorage cache
  Object.keys(localStorage).forEach(key => {
    if (key.includes('cache')) {
      localStorage.removeItem(key);
    }
  });
});

// Reload page to reset state
await page.reload({ waitUntil: 'networkidle' });

// Wait for specific state
await expect(async () => {
  const count = await page.locator('[data-testid="party-table-row"]').count();
  expect(count).toBe(10);
}).toPass({ timeout: 10000 });
```

---

## 3. ASSERTION STRATEGIES

### 3.1 Robust Assertions

```typescript
// ❌ Fragile - exact match
await expect(page.locator('[data-testid="success-toast"]'))
  .toHaveText('Hasta başarıyla eklendi');

// ✅ Robust - partial match
await expect(page.locator('[data-testid="success-toast"]'))
  .toContainText('başarıyla');

// ✅ Robust - regex
await expect(page.locator('[data-testid="success-toast"]'))
  .toHaveText(/başarıyla.*eklendi/i);

// ✅ Robust - multiple conditions
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('başarıyla');
await expect(page.locator('[data-testid="success-toast"]')).toHaveClass(/success/);
```

### 3.2 Retry Assertions

```typescript
// Auto-retry until condition met (default 5s)
await expect(page.locator('[data-testid="party-count"]'))
  .toHaveText('10', { timeout: 10000 });

// Custom retry logic
await expect(async () => {
  const count = await page.locator('[data-testid="party-table-row"]').count();
  expect(count).toBeGreaterThan(0);
}).toPass({
  intervals: [100, 250, 500, 1000],
  timeout: 10000
});
```

### 3.3 Soft Assertions

```typescript
// Continue test even if assertion fails
await expect.soft(page.locator('[data-testid="party-name"]'))
  .toContainText('Ahmet');
await expect.soft(page.locator('[data-testid="party-phone"]'))
  .toContainText('0555');
await expect.soft(page.locator('[data-testid="party-email"]'))
  .toContainText('@example.com');

// All soft assertions reported at end
```

### 3.4 Custom Matchers

```typescript
// Define custom matcher
expect.extend({
  async toHaveValidToken(page: Page) {
    const token = await page.evaluate(() => 
      localStorage.getItem('x-ear.auth.token@v1')
    );
    
    if (!token) {
      return {
        pass: false,
        message: () => 'Token not found in localStorage'
      };
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp * 1000 < Date.now();
      
      return {
        pass: !isExpired,
        message: () => isExpired 
          ? `Token expired at ${new Date(payload.exp * 1000)}`
          : 'Token is valid'
      };
    } catch (error) {
      return {
        pass: false,
        message: () => `Invalid token format: ${error.message}`
      };
    }
  }
});

// Use custom matcher
await expect(page).toHaveValidToken();
```

---

## 4. NETWORK DEBUGGING

### 4.1 Request/Response Logging

```typescript
test('debug network', async ({ page }) => {
  // Log all requests
  page.on('request', request => {
    console.log('>>', request.method(), request.url());
    console.log('   Headers:', request.headers());
    if (request.postData()) {
      console.log('   Body:', request.postData());
    }
  });
  
  // Log all responses
  page.on('response', response => {
    console.log('<<', response.status(), response.url());
    console.log('   Headers:', response.headers());
  });
  
  // Log failed requests
  page.on('requestfailed', request => {
    console.log('XX', request.method(), request.url());
    console.log('   Failure:', request.failure());
  });
  
  await page.goto('/parties');
});
```

### 4.2 Network Interception

```typescript
// Mock API response
await page.route('**/api/parties', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: [
        { id: '1', firstName: 'Test', lastName: 'User' }
      ]
    })
  });
});

// Modify request
await page.route('**/api/parties', route => {
  const request = route.request();
  route.continue({
    headers: {
      ...request.headers(),
      'X-Test-Mode': 'true'
    }
  });
});

// Abort requests
await page.route('**/api/analytics', route => route.abort());
```

### 4.3 Wait for Specific Requests

```typescript
// Wait for POST request
const [response] = await Promise.all([
  page.waitForResponse(resp => 
    resp.url().includes('/api/parties') && 
    resp.request().method() === 'POST' &&
    resp.status() === 201
  ),
  page.click('[data-testid="party-submit-button"]')
]);

const responseData = await response.json();
console.log('Created party:', responseData);

// Wait for multiple requests
const [partiesResp, rolesResp] = await Promise.all([
  page.waitForResponse('/api/parties'),
  page.waitForResponse('/api/roles'),
  page.goto('/parties')
]);
```

---

## 5. STATE INSPECTION

### 5.1 Browser Context

```typescript
// Get cookies
const cookies = await context.cookies();
console.log('Cookies:', cookies);

// Get localStorage
const storage = await page.evaluate(() => {
  return Object.keys(localStorage).reduce((acc, key) => {
    acc[key] = localStorage.getItem(key);
    return acc;
  }, {});
});
console.log('LocalStorage:', storage);

// Get sessionStorage
const session = await page.evaluate(() => {
  return Object.keys(sessionStorage).reduce((acc, key) => {
    acc[key] = sessionStorage.getItem(key);
    return acc;
  }, {});
});
console.log('SessionStorage:', session);
```

### 5.2 React DevTools

```typescript
// Access React component state (if exposed)
const componentState = await page.evaluate(() => {
  const root = document.querySelector('#root');
  // Access React Fiber (development only)
  const fiber = root?._reactRootContainer?._internalRoot?.current;
  return fiber?.memoizedState;
});
console.log('React state:', componentState);
```

### 5.3 Console Logs

```typescript
// Capture console logs
const logs: string[] = [];
page.on('console', msg => {
  logs.push(`${msg.type()}: ${msg.text()}`);
});

// Capture errors
const errors: string[] = [];
page.on('pageerror', error => {
  errors.push(error.message);
});

// Assert no errors
test.afterEach(() => {
  expect(errors).toHaveLength(0);
});
```

---

## 6. SCREENSHOT & VIDEO ANALYSIS

### 6.1 Strategic Screenshots

```typescript
// Before action
await page.screenshot({ 
  path: 'screenshots/before-submit.png',
  fullPage: true 
});

// After action
await page.click('[data-testid="party-submit-button"]');
await page.screenshot({ 
  path: 'screenshots/after-submit.png',
  fullPage: true 
});

// Element screenshot
await page.locator('[data-testid="party-form"]').screenshot({
  path: 'screenshots/form.png'
});

// Annotated screenshot
await page.evaluate(() => {
  const element = document.querySelector('[data-testid="party-submit-button"]');
  element.style.border = '3px solid red';
});
await page.screenshot({ path: 'screenshots/annotated.png' });
```

### 6.2 Video Recording

```typescript
// Configure in playwright.config.ts
use: {
  video: {
    mode: 'retain-on-failure',
    size: { width: 1280, height: 720 }
  }
}

// Access video path in test
test.afterEach(async ({}, testInfo) => {
  if (testInfo.status !== 'passed') {
    const videoPath = await testInfo.attachments.find(
      a => a.name === 'video'
    )?.path;
    console.log('Video saved:', videoPath);
  }
});
```

---

## 7. PERFORMANCE DEBUGGING

### 7.1 Timing Metrics

```typescript
// Measure operation time
console.time('party-creation');
await page.click('[data-testid="party-create-button"]');
await page.fill('[data-testid="party-first-name-input"]', 'Ahmet');
await page.click('[data-testid="party-submit-button"]');
await page.waitForResponse('/api/parties');
console.timeEnd('party-creation');

// Get performance metrics
const metrics = await page.evaluate(() => {
  const perf = performance.getEntriesByType('navigation')[0];
  return {
    domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
    loadComplete: perf.loadEventEnd - perf.loadEventStart,
    domInteractive: perf.domInteractive - perf.fetchStart
  };
});
console.log('Performance:', metrics);
```

### 7.2 Network Performance

```typescript
// Track slow requests
page.on('response', response => {
  const timing = response.timing();
  const duration = timing.responseEnd - timing.requestStart;
  
  if (duration > 1000) {
    console.warn(`Slow request (${duration}ms):`, response.url());
  }
});
```

---

## 8. CI/CD DEBUGGING

### 8.1 CI-Specific Issues

```typescript
// Detect CI environment
const isCI = process.env.CI === 'true';

if (isCI) {
  // Increase timeouts
  test.setTimeout(60000);
  
  // Disable animations
  await page.addStyleTag({
    content: '*, *::before, *::after { animation: none !important; }'
  });
  
  // Wait for fonts
  await page.waitForLoadState('networkidle');
}
```

### 8.2 Artifacts Collection

```typescript
// Save artifacts on failure
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    // Screenshot
    const screenshot = await page.screenshot();
    await testInfo.attach('screenshot', { 
      body: screenshot, 
      contentType: 'image/png' 
    });
    
    // HTML
    const html = await page.content();
    await testInfo.attach('page-html', { 
      body: html, 
      contentType: 'text/html' 
    });
    
    // Logs
    const logs = await page.evaluate(() => {
      return {
        localStorage: { ...localStorage },
        console: window.__TEST_LOGS__ || []
      };
    });
    await testInfo.attach('logs', { 
      body: JSON.stringify(logs, null, 2), 
      contentType: 'application/json' 
    });
  }
});
```

---

## 9. DEBUGGING CHECKLIST

When a test fails, follow this checklist:

- [ ] Run test in debug mode (`--debug`)
- [ ] Check test output for error message
- [ ] Review screenshot/video
- [ ] Check network tab for failed requests
- [ ] Verify element exists with correct testID
- [ ] Check element visibility and state
- [ ] Verify authentication token
- [ ] Check console logs for errors
- [ ] Review timing (is operation too slow?)
- [ ] Check for race conditions
- [ ] Verify test data setup
- [ ] Check for flakiness (run 10 times)
- [ ] Compare with passing test
- [ ] Check recent code changes

---

## 10. COMMON SOLUTIONS

### Flaky Tests
```typescript
// Use auto-retry assertions
await expect(locator).toBeVisible({ timeout: 10000 });

// Wait for network idle
await page.waitForLoadState('networkidle');

// Disable animations
await page.addStyleTag({ content: '* { animation: none !important; }' });
```

### Slow Tests
```typescript
// Run in parallel
test.describe.configure({ mode: 'parallel' });

// Use fixtures for setup
test.use({ storageState: 'auth.json' });

// Mock slow APIs
await page.route('**/api/analytics', route => route.fulfill({ body: '{}' }));
```

### Intermittent Failures
```typescript
// Add retry logic
test.describe(() => {
  test.describe.configure({ retries: 2 });
  
  test('flaky test', async ({ page }) => {
    // Test code
  });
});
```

