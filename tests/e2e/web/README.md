# E2E Tests - Playwright

Comprehensive end-to-end tests validating backend-frontend integration for X-Ear CRM.

## 📋 Test Coverage

### 1. Authentication Flow (`auth.spec.ts`)
- ✅ Complete login flow (phone + OTP)
- ✅ Token management
- ✅ Session persistence
- ✅ Logout
- ✅ Token refresh
- ✅ Invalid OTP handling
- ✅ API response format validation

### 2. Party CRUD Operations (`party-crud.spec.ts`)
- ✅ Create party
- ✅ Read party details
- ✅ Update party
- ✅ Delete party
- ✅ List parties with pagination
- ✅ Search parties
- ✅ Filter parties
- ✅ Form validation
- ✅ API response format validation

### 3. Party Role Management (`party-roles.spec.ts`)
- ✅ Assign single role
- ✅ Assign multiple roles (N:N)
- ✅ Remove role
- ✅ View roles
- ✅ Role-based filtering
- ✅ Prevent duplicate role assignment
- ✅ Role assignment history
- ✅ API response format validation

### 4. Multi-Tenancy Isolation (`multi-tenancy.spec.ts`)
- ✅ Tenant context isolation
- ✅ Cross-tenant access prevention (404, not 403)
- ✅ Tenant-scoped queries
- ✅ Concurrent requests from different tenants
- ✅ Search result isolation
- ✅ JWT token validation
- ✅ Tenant context headers

### 5. API Contract Validation (`api-contract.spec.ts`)
- ✅ ResponseEnvelope format
- ✅ camelCase consistency (no snake_case)
- ✅ Pagination meta format
- ✅ Error response format
- ✅ Idempotency-Key handling
- ✅ X-Request-ID tracing
- ✅ Timestamp format (ISO-8601)
- ✅ Date field validation
- ✅ Validation error format
- ✅ Rate limiting
- ✅ CORS headers

## 🚀 Running Tests

### Prerequisites

```bash
# Install dependencies
cd x-ear/apps/web
npm install

# Install Playwright browsers
npx playwright install
```

### Run All Tests

```bash
npm run test:e2e
```

### Run Specific Test Suite

```bash
# Auth tests only
npx playwright test auth.spec.ts

# Party CRUD tests only
npx playwright test party-crud.spec.ts

# Role management tests only
npx playwright test party-roles.spec.ts

# Multi-tenancy tests only
npx playwright test multi-tenancy.spec.ts

# API contract tests only
npx playwright test api-contract.spec.ts
```

### Run Tests in UI Mode

```bash
npm run test:e2e:ui
```

### Run Tests in Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

### Debug Tests

```bash
npm run test:e2e:debug
```

### Run Tests in Specific Browser

```bash
# Chromium only
npm run test:e2e:chromium

# Firefox only
npx playwright test --project=firefox

# WebKit only
npx playwright test --project=webkit

# Mobile Chrome
npx playwright test --project="Mobile Chrome"

# Mobile Safari
npx playwright test --project="Mobile Safari"
```

### View Test Report

```bash
npm run test:e2e:report
```

## 🔧 Configuration

### Environment Variables

```bash
# Backend API URL
API_BASE_URL=http://localhost:5003

# Frontend URL
WEB_BASE_URL=http://localhost:8080
```

### Playwright Config

See `playwright.config.ts` for full configuration:
- Test directory: `./e2e`
- Parallel execution: Enabled
- Retries: 2 on CI, 0 locally
- Reporters: HTML, JSON, JUnit
- Screenshots: On failure
- Videos: On failure
- Trace: On first retry

## 📝 Writing New Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import {
  login,
  setupAuthenticatedPage,
  createTestParty,
  deleteTestParty,
  validateResponseEnvelope,
  API_BASE_URL,
  WEB_BASE_URL,
} from './helpers/test-utils';

test.describe('Feature Name', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const tokens = await login(request);
    authToken = tokens.accessToken;
  });

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page, {
      accessToken: authToken,
      tenantId: 'test-tenant',
      userId: 'test-user',
    });
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

### Helper Functions

Available in `helpers/test-utils.ts`:

- `login(request, phone?, otp?)` - Login and get auth tokens
- `setupAuthenticatedPage(page, tokens)` - Setup authenticated page
- `createTestParty(request, authToken, data)` - Create test party
- `deleteTestParty(request, authToken, partyId)` - Delete test party
- `assignRole(request, authToken, partyId, roleCode)` - Assign role
- `validateResponseEnvelope(data)` - Validate ResponseEnvelope format
- `validateNoCamelCase(obj)` - Validate no snake_case keys
- `waitForApiCall(page, urlPattern)` - Wait for API call

## 🎯 Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` to setup test data
- Use `afterEach` to cleanup test data
- Don't rely on test execution order

### 2. Cleanup
- Always cleanup created test data
- Use `try/finally` or `afterEach` hooks
- Delete parties, roles, etc. after tests

### 3. Assertions
- Use specific assertions (`toHaveProperty`, `toBe`, etc.)
- Validate both positive and negative cases
- Check API response format
- Verify no snake_case in responses

### 4. Timeouts
- Use reasonable timeouts (5-10 seconds)
- Don't use fixed `waitForTimeout` unless necessary
- Prefer `waitForResponse`, `waitForSelector`, etc.

### 5. Selectors
- Use semantic selectors (text, aria-label, data-testid)
- Avoid CSS selectors when possible
- Use `has-text` for button text matching

### 6. API Testing
- Test both UI and API directly
- Validate ResponseEnvelope format
- Check for camelCase consistency
- Verify tenant isolation

## 🔍 Debugging

### View Test Trace

```bash
# Run test with trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Screenshots

Screenshots are automatically captured on failure in `test-results/`.

### Videos

Videos are recorded on failure in `test-results/`.

### Console Logs

```typescript
// Listen to console messages
page.on('console', msg => console.log(msg.text()));

// Listen to page errors
page.on('pageerror', err => console.error(err));
```

## 📊 CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

See `.github/workflows/e2e-tests.yml` for CI configuration.

### CI Jobs

1. **e2e-tests** - Run all E2E tests
2. **e2e-contract-validation** - Validate API contract compliance
3. **e2e-security-validation** - Validate multi-tenancy security
4. **e2e-summary** - Generate test summary

### Artifacts

- Playwright HTML report (30 days retention)
- Test results (30 days retention)
- Screenshots (on failure)
- Videos (on failure)

## 🐛 Troubleshooting

### Tests Fail Locally

1. Check backend is running: `curl http://localhost:5003/health`
2. Check frontend is running: `curl http://localhost:8080`
3. Check database is running
4. Run migrations: `alembic upgrade head`
5. Clear browser cache: `npx playwright clean`

### Tests Pass Locally but Fail on CI

1. Check environment variables
2. Check database setup
3. Check service dependencies
4. Review CI logs
5. Download artifacts from CI

### Flaky Tests

1. Increase timeouts
2. Add explicit waits
3. Check for race conditions
4. Use `test.retry()` for known flaky tests

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [X-Ear Project Rules](../../../____rules______/project-rules.md)
- [Party Architecture Guide](../../../____rules______/party-role-profile-architecture.md)
- [Tenant Security Rules](../../../____rules______/tenant-security-rules.md)

## 🎉 Test Statistics

- **Total Test Files**: 5
- **Total Tests**: 50+
- **Test Coverage**:
  - Auth: 7 tests
  - Party CRUD: 11 tests
  - Party Roles: 8 tests
  - Multi-Tenancy: 8 tests
  - API Contract: 12 tests
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Execution Time**: ~5-10 minutes (all browsers)
