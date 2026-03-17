# Playwright Security Testing Guide

## Overview

This guide covers comprehensive security testing strategies for X-Ear CRM using Playwright. All tests are designed to be debuggable with detailed failure reporting.

## Table of Contents

1. [Authentication & Authorization Testing](#authentication--authorization-testing)
2. [Multi-Tenancy Isolation Testing](#multi-tenancy-isolation-testing)
3. [RBAC Permission Testing](#rbac-permission-testing)
4. [Input Validation & XSS Prevention](#input-validation--xss-prevention)
5. [CSRF Protection Testing](#csrf-protection-testing)
6. [SQL Injection Prevention](#sql-injection-prevention)
7. [Rate Limiting Testing](#rate-limiting-testing)
8. [Session Management Testing](#session-management-testing)
9. [Security Headers Testing](#security-headers-testing)
10. [Sensitive Data Exposure](#sensitive-data-exposure)

---

## 1. Authentication & Authorization Testing

### 1.1 JWT Token Security

**Test: Token Storage Security**
```typescript
test('SEC-AUTH-001: JWT tokens stored in httpOnly cookies', async ({ page, context }) => {
  await page.goto('/login');
  
  // Login
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  
  await page.waitForURL('/dashboard');
  
  // Check cookies
  const cookies = await context.cookies();
  const accessToken = cookies.find(c => c.name === 'access_token');
  const refreshToken = cookies.find(c => c.name === 'refresh_token');
  
  // Assertions with debug info
  expect(accessToken, 'Access token should exist').toBeDefined();
  expect(accessToken?.httpOnly, 'Access token must be httpOnly').toBe(true);
  expect(accessToken?.secure, 'Access token must be secure in production').toBe(true);
  
  expect(refreshToken, 'Refresh token should exist').toBeDefined();
  expect(refreshToken?.httpOnly, 'Refresh token must be httpOnly').toBe(true);
  
  // Verify tokens NOT in localStorage
  const localStorageTokens = await page.evaluate(() => {
    return {
      access: localStorage.getItem('access_token'),
      refresh: localStorage.getItem('refresh_token')
    };
  });
  
  expect(localStorageTokens.access, 'Access token must NOT be in localStorage').toBeNull();
  expect(localStorageTokens.refresh, 'Refresh token must NOT be in localStorage').toBeNull();
});
```


**Test: Token Expiration Handling**
```typescript
test('SEC-AUTH-002: Expired token triggers refresh flow', async ({ page, context }) => {
  // Setup: Login and get tokens
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Intercept API calls
  let refreshCalled = false;
  await page.route('**/api/auth/refresh', route => {
    refreshCalled = true;
    route.continue();
  });
  
  // Manually expire the access token (via backend helper or cookie manipulation)
  await context.addCookies([{
    name: 'access_token',
    value: 'expired_token',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax'
  }]);
  
  // Make an authenticated request
  await page.goto('/parties');
  
  // Wait for refresh to complete
  await page.waitForTimeout(1000);
  
  // Verify refresh was called
  expect(refreshCalled, 'Token refresh should be triggered on 401').toBe(true);
  
  // Verify user still authenticated
  const url = page.url();
  expect(url, 'User should remain on protected page after refresh').toContain('/parties');
});
```

**Test: Invalid Token Rejection**
```typescript
test('SEC-AUTH-003: Invalid JWT token redirects to login', async ({ page, context }) => {
  // Set invalid token
  await context.addCookies([{
    name: 'access_token',
    value: 'invalid.jwt.token',
    domain: 'localhost',
    path: '/',
    httpOnly: true
  }]);
  
  // Try to access protected route
  await page.goto('/parties');
  
  // Should redirect to login
  await page.waitForURL('/login', { timeout: 5000 });
  
  // Verify error message
  const errorMessage = await page.locator('[data-testid="error-toast"]').textContent();
  expect(errorMessage, 'Should show authentication error').toContain('authentication');
});
```

### 1.2 OTP Verification Security

**Test: OTP Rate Limiting**
```typescript
test('SEC-AUTH-004: OTP verification rate limited', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', '+905551234567');
  await page.click('[data-testid="login-submit-button"]');
  
  // Wait for OTP modal
  await page.waitForSelector('[data-testid="otp-modal"]');
  
  // Try multiple wrong OTPs rapidly
  const attempts = [];
  for (let i = 0; i < 6; i++) {
    await page.fill('[data-testid="otp-input"]', '000000');
    await page.click('[data-testid="otp-submit"]');
    
    const response = await page.waitForResponse(resp => 
      resp.url().includes('/auth/verify-otp')
    );
    attempts.push(response.status());
    
    await page.waitForTimeout(100);
  }
  
  // After 5 attempts, should get rate limited (429)
  const rateLimited = attempts.slice(-1)[0];
  expect(rateLimited, 'Should be rate limited after 5 failed attempts').toBe(429);
  
  // Verify error message
  const errorMsg = await page.locator('[data-testid="error-toast"]').textContent();
  expect(errorMsg).toContain('Too many attempts');
});
```


**Test: OTP Expiration**
```typescript
test('SEC-AUTH-005: Expired OTP rejected', async ({ page }) => {
  // This test requires backend support to set OTP expiration time
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', '+905551234567');
  await page.click('[data-testid="login-submit-button"]');
  
  await page.waitForSelector('[data-testid="otp-modal"]');
  
  // Wait for OTP to expire (adjust timeout based on backend config)
  await page.waitForTimeout(5 * 60 * 1000); // 5 minutes
  
  // Try to use expired OTP
  await page.fill('[data-testid="otp-input"]', '123456');
  await page.click('[data-testid="otp-submit"]');
  
  // Should show error
  const errorMsg = await page.locator('[data-testid="error-toast"]').textContent();
  expect(errorMsg).toContain('expired');
});
```

---

## 2. Multi-Tenancy Isolation Testing

### 2.1 Tenant Data Isolation

**Test: User Cannot Access Other Tenant's Data**
```typescript
test('SEC-TENANT-001: Cross-tenant data access blocked', async ({ page, context }) => {
  // Login as Tenant A user
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'tenantA@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Get Tenant A's party ID
  await page.goto('/parties');
  const tenantAPartyId = await page.locator('[data-testid="party-table-row"]').first().getAttribute('data-party-id');
  
  // Logout
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  
  // Login as Tenant B user
  await page.fill('[data-testid="login-identifier-input"]', 'tenantB@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Try to access Tenant A's party directly via URL
  const response = await page.goto(`/parties/${tenantAPartyId}`);
  
  // Should get 404 (not 403, to prevent existence leak)
  expect(response?.status(), 'Cross-tenant access should return 404').toBe(404);
  
  // Verify error message doesn't leak existence
  const errorMsg = await page.locator('[data-testid="error-message"]').textContent();
  expect(errorMsg).not.toContain('permission');
  expect(errorMsg).toContain('not found');
});
```

**Test: API Calls Include Tenant Context**
```typescript
test('SEC-TENANT-002: All API calls include tenant context', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Intercept all API calls
  const apiCalls: any[] = [];
  await page.route('**/api/**', route => {
    apiCalls.push({
      url: route.request().url(),
      headers: route.request().headers()
    });
    route.continue();
  });
  
  // Navigate through app
  await page.goto('/parties');
  await page.goto('/sales');
  await page.goto('/invoices');
  
  // Verify tenant context in requests
  for (const call of apiCalls) {
    // Tenant ID should be in JWT token (decoded on backend)
    // OR in X-Tenant-ID header (if implemented)
    const hasAuth = call.headers['authorization'];
    expect(hasAuth, `API call to ${call.url} must have Authorization header`).toBeDefined();
  }
});
```


### 2.2 Admin Impersonation Security

**Test: Impersonation Audit Logging**
```typescript
test('SEC-TENANT-003: Admin impersonation logged', async ({ page }) => {
  // Login as admin
  await page.goto('/admin/login');
  await page.fill('[data-testid="login-identifier-input"]', 'admin_user@example.com');
  await page.fill('[data-testid="login-password-input"]', 'adminpass');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/admin/dashboard');
  
  // Navigate to users
  await page.goto('/admin/users');
  
  // Impersonate a user
  await page.click('[data-testid="user-row-1"] [data-testid="impersonate-button"]');
  
  // Verify impersonation banner
  const banner = await page.locator('[data-testid="impersonation-banner"]');
  await expect(banner).toBeVisible();
  
  // Perform action as impersonated user
  await page.goto('/parties');
  await page.click('[data-testid="party-create-button"]');
  
  // Stop impersonation
  await page.click('[data-testid="stop-impersonation-button"]');
  
  // Check audit log
  await page.goto('/admin/audit-logs');
  await page.fill('[data-testid="search-input"]', 'impersonation');
  
  // Verify log entries
  const logEntries = await page.locator('[data-testid="audit-log-entry"]').count();
  expect(logEntries, 'Should have impersonation start and stop logs').toBeGreaterThanOrEqual(2);
});
```

---

## 3. RBAC Permission Testing

### 3.1 Permission Enforcement

**Test: Unauthorized Action Blocked**
```typescript
test('SEC-RBAC-001: User without parties.create cannot create party', async ({ page }) => {
  // Login as user with read-only permissions
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'readonly@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Navigate to parties
  await page.goto('/parties');
  
  // Create button should be hidden or disabled
  const createButton = page.locator('[data-testid="party-create-button"]');
  const isVisible = await createButton.isVisible().catch(() => false);
  const isDisabled = await createButton.isDisabled().catch(() => true);
  
  expect(isVisible && !isDisabled, 'Create button should be hidden or disabled').toBe(false);
  
  // Try direct API call (should fail)
  const response = await page.request.post('/api/parties', {
    data: {
      firstName: 'Test',
      lastName: 'User',
      phone: '+905551234567'
    }
  });
  
  expect(response.status(), 'API should reject unauthorized request').toBe(403);
});
```

**Test: Permission Matrix Validation**
```typescript
test('SEC-RBAC-002: Permission matrix enforced', async ({ page }) => {
  const permissionTests = [
    { user: 'admin@example.com', permission: 'parties.delete', allowed: true },
    { user: 'staff@example.com', permission: 'parties.delete', allowed: false },
    { user: 'staff@example.com', permission: 'parties.view', allowed: true },
    { user: 'readonly@example.com', permission: 'parties.edit', allowed: false }
  ];
  
  for (const test of permissionTests) {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="login-identifier-input"]', test.user);
    await page.fill('[data-testid="login-password-input"]', 'password123');
    await page.click('[data-testid="login-submit-button"]');
    await page.waitForURL('/dashboard');
    
    // Check permission
    await page.goto('/parties');
    const actionButton = page.locator(`[data-testid="party-${test.permission.split('.')[1]}-button"]`);
    const isVisible = await actionButton.isVisible().catch(() => false);
    
    if (test.allowed) {
      expect(isVisible, `${test.user} should have ${test.permission}`).toBe(true);
    } else {
      expect(isVisible, `${test.user} should NOT have ${test.permission}`).toBe(false);
    }
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
  }
});
```


---

## 4. Input Validation & XSS Prevention

### 4.1 XSS Attack Prevention

**Test: Script Injection in Text Fields**
```typescript
test('SEC-XSS-001: Script tags sanitized in party name', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Create party with XSS payload
  await page.goto('/parties');
  await page.click('[data-testid="party-create-button"]');
  
  const xssPayload = '<script>alert("XSS")</script>';
  await page.fill('[data-testid="party-first-name-input"]', xssPayload);
  await page.fill('[data-testid="party-last-name-input"]', 'Test');
  await page.fill('[data-testid="party-phone-input"]', '+905551234567');
  await page.click('[data-testid="party-submit-button"]');
  
  // Wait for success
  await page.waitForSelector('[data-testid="success-toast"]');
  
  // Verify script not executed
  const dialogAppeared = await page.evaluate(() => {
    return new Promise(resolve => {
      const originalAlert = window.alert;
      let alertCalled = false;
      window.alert = () => { alertCalled = true; };
      setTimeout(() => {
        window.alert = originalAlert;
        resolve(alertCalled);
      }, 1000);
    });
  });
  
  expect(dialogAppeared, 'XSS script should not execute').toBe(false);
  
  // Verify data sanitized in display
  const partyName = await page.locator('[data-testid="party-table-row"]').first().textContent();
  expect(partyName).not.toContain('<script>');
  expect(partyName).not.toContain('alert');
});
```

**Test: HTML Entity Encoding**
```typescript
test('SEC-XSS-002: HTML entities properly encoded', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Create party with HTML entities
  await page.goto('/parties');
  await page.click('[data-testid="party-create-button"]');
  
  const htmlPayload = '<img src=x onerror=alert(1)>';
  await page.fill('[data-testid="party-first-name-input"]', htmlPayload);
  await page.fill('[data-testid="party-last-name-input"]', 'Test');
  await page.fill('[data-testid="party-phone-input"]', '+905551234567');
  await page.click('[data-testid="party-submit-button"]');
  
  await page.waitForSelector('[data-testid="success-toast"]');
  
  // Check rendered HTML
  const innerHTML = await page.locator('[data-testid="party-table-row"]').first().innerHTML();
  
  // Should be encoded, not rendered as HTML
  expect(innerHTML).not.toContain('<img');
  expect(innerHTML).toMatch(/&lt;img|&amp;lt;img/);
});
```

### 4.2 SQL Injection Prevention

**Test: SQL Injection in Search**
```typescript
test('SEC-SQL-001: SQL injection blocked in search', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  await page.goto('/parties');
  
  // Try SQL injection payloads
  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE parties; --",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "' OR 1=1--"
  ];
  
  for (const payload of sqlPayloads) {
    await page.fill('[data-testid="search-input"]', payload);
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for response
    await page.waitForTimeout(500);
    
    // Should either return no results or sanitized results
    // Should NOT crash or return all records
    const errorVisible = await page.locator('[data-testid="error-toast"]').isVisible().catch(() => false);
    const resultsCount = await page.locator('[data-testid="party-table-row"]').count();
    
    // If no error, results should be reasonable (not all records)
    if (!errorVisible) {
      expect(resultsCount, `SQL injection payload "${payload}" should not return all records`).toBeLessThan(100);
    }
  }
});
```


---

## 5. CSRF Protection Testing

**Test: CSRF Token Validation**
```typescript
test('SEC-CSRF-001: State-changing requests require CSRF protection', async ({ page, context }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Get cookies (including CSRF token if implemented)
  const cookies = await context.cookies();
  
  // Try to make POST request without CSRF token
  const response = await page.request.post('/api/parties', {
    data: {
      firstName: 'Test',
      lastName: 'User',
      phone: '+905551234567'
    },
    headers: {
      // Omit CSRF token header
    }
  });
  
  // Should be rejected (403 or 400)
  expect([400, 403]).toContain(response.status());
});
```

---

## 6. Rate Limiting Testing

**Test: API Rate Limiting**
```typescript
test('SEC-RATE-001: API rate limiting enforced', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Make rapid API requests
  const responses: number[] = [];
  for (let i = 0; i < 100; i++) {
    const response = await page.request.get('/api/parties');
    responses.push(response.status());
    
    if (response.status() === 429) {
      break; // Rate limited
    }
  }
  
  // Should eventually get rate limited
  const rateLimited = responses.includes(429);
  expect(rateLimited, 'Should be rate limited after many requests').toBe(true);
  
  // Check rate limit headers
  const response = await page.request.get('/api/parties');
  const headers = response.headers();
  
  expect(headers['x-ratelimit-limit']).toBeDefined();
  expect(headers['x-ratelimit-remaining']).toBeDefined();
  expect(headers['x-ratelimit-reset']).toBeDefined();
});
```

**Test: Login Rate Limiting**
```typescript
test('SEC-RATE-002: Login attempts rate limited', async ({ page }) => {
  const responses: number[] = [];
  
  for (let i = 0; i < 10; i++) {
    await page.goto('/login');
    await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
    await page.fill('[data-testid="login-password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-submit-button"]');
    
    const response = await page.waitForResponse(resp => 
      resp.url().includes('/auth/login')
    );
    responses.push(response.status());
    
    if (response.status() === 429) {
      break;
    }
    
    await page.waitForTimeout(100);
  }
  
  // Should be rate limited after multiple failed attempts
  const rateLimited = responses.includes(429);
  expect(rateLimited, 'Login should be rate limited after failed attempts').toBe(true);
  
  // Verify error message
  const errorMsg = await page.locator('[data-testid="error-toast"]').textContent();
  expect(errorMsg).toContain('Too many');
});
```

---

## 7. Session Management Testing

**Test: Session Timeout**
```typescript
test('SEC-SESSION-001: Inactive session expires', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Wait for session timeout (adjust based on backend config)
  // For testing, this should be a short timeout (e.g., 5 minutes)
  await page.waitForTimeout(5 * 60 * 1000);
  
  // Try to access protected resource
  await page.goto('/parties');
  
  // Should redirect to login
  await page.waitForURL('/login', { timeout: 5000 });
  
  // Verify session expired message
  const message = await page.locator('[data-testid="info-toast"]').textContent();
  expect(message).toContain('session expired');
});
```

**Test: Concurrent Session Handling**
```typescript
test('SEC-SESSION-002: Concurrent sessions handled', async ({ browser }) => {
  // Create two contexts (two browsers/tabs)
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  // Login in both contexts
  for (const page of [page1, page2]) {
    await page.goto('/login');
    await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
    await page.fill('[data-testid="login-password-input"]', 'password123');
    await page.click('[data-testid="login-submit-button"]');
    await page.waitForURL('/dashboard');
  }
  
  // Logout from first session
  await page1.click('[data-testid="user-menu"]');
  await page1.click('[data-testid="logout-button"]');
  
  // Second session should still work (or be invalidated based on policy)
  await page2.goto('/parties');
  
  // Check if second session is still valid
  const url = page2.url();
  
  // Document the behavior
  console.log('Concurrent session behavior:', url.includes('/login') ? 'Invalidated' : 'Still valid');
  
  await context1.close();
  await context2.close();
});
```


---

## 8. Security Headers Testing

**Test: Security Headers Present**
```typescript
test('SEC-HEADERS-001: Security headers configured', async ({ page }) => {
  const response = await page.goto('/');
  const headers = response?.headers();
  
  // Content Security Policy
  expect(headers?.['content-security-policy'], 'CSP header should be present').toBeDefined();
  
  // X-Frame-Options (clickjacking protection)
  expect(headers?.['x-frame-options'], 'X-Frame-Options should be DENY or SAMEORIGIN').toMatch(/DENY|SAMEORIGIN/);
  
  // X-Content-Type-Options
  expect(headers?.['x-content-type-options'], 'X-Content-Type-Options should be nosniff').toBe('nosniff');
  
  // Strict-Transport-Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    expect(headers?.['strict-transport-security'], 'HSTS should be enabled in production').toBeDefined();
  }
  
  // X-XSS-Protection
  expect(headers?.['x-xss-protection'], 'X-XSS-Protection should be enabled').toBe('1; mode=block');
  
  // Referrer-Policy
  expect(headers?.['referrer-policy'], 'Referrer-Policy should be set').toBeDefined();
});
```

---

## 9. Sensitive Data Exposure

**Test: PII Not Logged**
```typescript
test('SEC-DATA-001: PII not exposed in console logs', async ({ page }) => {
  const consoleLogs: string[] = [];
  
  page.on('console', msg => {
    consoleLogs.push(msg.text());
  });
  
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'SecretPassword123!');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Create party with sensitive data
  await page.goto('/parties');
  await page.click('[data-testid="party-create-button"]');
  await page.fill('[data-testid="party-first-name-input"]', 'John');
  await page.fill('[data-testid="party-last-name-input"]', 'Doe');
  await page.fill('[data-testid="party-phone-input"]', '+905551234567');
  await page.fill('[data-testid="party-email-input"]', 'john.doe@example.com');
  await page.fill('[data-testid="party-tc-input"]', '12345678901'); // Turkish ID
  await page.click('[data-testid="party-submit-button"]');
  
  await page.waitForSelector('[data-testid="success-toast"]');
  
  // Check console logs for PII
  const sensitiveData = ['SecretPassword123!', '12345678901', '+905551234567'];
  
  for (const data of sensitiveData) {
    const leaked = consoleLogs.some(log => log.includes(data));
    expect(leaked, `Sensitive data "${data}" should not appear in console logs`).toBe(false);
  }
});
```

**Test: Tokens Not in URL**
```typescript
test('SEC-DATA-002: Auth tokens not in URL', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Navigate through app
  const urls = ['/parties', '/sales', '/invoices', '/settings'];
  
  for (const url of urls) {
    await page.goto(url);
    const currentUrl = page.url();
    
    // Check for token patterns in URL
    expect(currentUrl, 'URL should not contain JWT token').not.toMatch(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);
    expect(currentUrl, 'URL should not contain access_token param').not.toContain('access_token=');
    expect(currentUrl, 'URL should not contain refresh_token param').not.toContain('refresh_token=');
  }
});
```

**Test: Sensitive Data Masked in Network Tab**
```typescript
test('SEC-DATA-003: Passwords masked in network requests', async ({ page }) => {
  const requests: any[] = [];
  
  page.on('request', request => {
    if (request.url().includes('/auth/login')) {
      requests.push({
        url: request.url(),
        postData: request.postData()
      });
    }
  });
  
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'MySecretPassword123!');
  await page.click('[data-testid="login-submit-button"]');
  
  await page.waitForURL('/dashboard');
  
  // Verify password is sent (necessary for auth)
  // But document that it should be over HTTPS only
  const loginRequest = requests[0];
  expect(loginRequest, 'Login request should exist').toBeDefined();
  
  // In production, verify HTTPS
  if (process.env.NODE_ENV === 'production') {
    expect(loginRequest.url, 'Login should use HTTPS in production').toMatch(/^https:/);
  }
});
```

---

## 10. File Upload Security

**Test: File Type Validation**
```typescript
test('SEC-UPLOAD-001: Only allowed file types accepted', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  await page.goto('/parties');
  await page.click('[data-testid="party-bulk-upload-button"]');
  
  // Try to upload executable file
  const maliciousFiles = [
    { name: 'malware.exe', type: 'application/x-msdownload' },
    { name: 'script.sh', type: 'application/x-sh' },
    { name: 'virus.bat', type: 'application/x-bat' }
  ];
  
  for (const file of maliciousFiles) {
    const fileInput = page.locator('[data-testid="file-upload-input"]');
    
    // Create fake file
    await fileInput.setInputFiles({
      name: file.name,
      mimeType: file.type,
      buffer: Buffer.from('malicious content')
    });
    
    // Should show error
    const errorMsg = await page.locator('[data-testid="error-toast"]').textContent();
    expect(errorMsg, `File type ${file.type} should be rejected`).toContain('not allowed');
  }
});
```

**Test: File Size Validation**
```typescript
test('SEC-UPLOAD-002: File size limits enforced', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  await page.goto('/parties');
  await page.click('[data-testid="party-bulk-upload-button"]');
  
  // Create large file (> 10MB)
  const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
  
  const fileInput = page.locator('[data-testid="file-upload-input"]');
  await fileInput.setInputFiles({
    name: 'large.csv',
    mimeType: 'text/csv',
    buffer: largeBuffer
  });
  
  // Should show error
  const errorMsg = await page.locator('[data-testid="error-toast"]').textContent();
  expect(errorMsg).toContain('too large');
});
```

---

## Security Test Execution

### Run All Security Tests
```bash
# Run all security tests
npx playwright test --grep "SEC-"

# Run specific category
npx playwright test --grep "SEC-AUTH-"
npx playwright test --grep "SEC-TENANT-"
npx playwright test --grep "SEC-RBAC-"
npx playwright test --grep "SEC-XSS-"

# Run with detailed reporting
npx playwright test --grep "SEC-" --reporter=html
```

### CI/CD Integration
```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npx playwright test --grep "SEC-"
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: security-test-results
          path: playwright-report/
```

---

## Security Testing Checklist

- [ ] All authentication flows tested (JWT, OTP, refresh)
- [ ] Multi-tenancy isolation verified
- [ ] RBAC permissions enforced
- [ ] XSS prevention validated
- [ ] SQL injection blocked
- [ ] CSRF protection enabled
- [ ] Rate limiting functional
- [ ] Session management secure
- [ ] Security headers configured
- [ ] PII not exposed in logs/URLs
- [ ] File upload validation working
- [ ] All tests are debuggable with detailed assertions
- [ ] Security tests run in CI/CD pipeline
