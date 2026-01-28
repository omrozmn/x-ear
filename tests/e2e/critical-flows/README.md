# Critical Flow Regression Tests

Automated E2E tests for business-critical user flows in X-Ear CRM.

## Overview

This test suite protects 16 critical flows across web app and admin panel:
- **P0 (Revenue & Legal)**: 5 flows - Must never break
- **P1 (Core Operations)**: 5 flows - High impact
- **P2 (Admin Operations)**: 4 flows - Important
- **Cross-App Sync**: 2 flows - Data consistency

## Quick Start

```bash
# Run all critical flow tests
npm run test:critical-flows

# Run P0 tests only (required for PR merge)
npm run test:critical-flows:p0

# Run in watch mode (local development)
npm run test:critical-flows:watch

# Run in debug mode (headed browser)
npm run test:critical-flows:debug
```

## Test Structure

```
critical-flows/
├── p0-revenue-legal/           # P0: Revenue & Legal (blocks merge)
│   ├── patient-crud.critical-flow.spec.ts
│   ├── device-assignment.critical-flow.spec.ts
│   ├── sale-creation.critical-flow.spec.ts
│   ├── invoice-generation.critical-flow.spec.ts
│   └── einvoice-submission.critical-flow.spec.ts
├── p1-core-operations/         # P1: Core Operations (informational)
│   ├── appointment-scheduling.critical-flow.spec.ts
│   ├── inventory-management.critical-flow.spec.ts
│   ├── payment-recording.critical-flow.spec.ts
│   ├── sgk-submission.critical-flow.spec.ts
│   └── bulk-patient-upload.critical-flow.spec.ts
├── p2-admin-operations/        # P2: Admin Operations
│   ├── tenant-management.critical-flow.spec.ts
│   ├── user-role-assignment.critical-flow.spec.ts
│   ├── system-settings.critical-flow.spec.ts
│   └── analytics-dashboard.critical-flow.spec.ts
└── cross-app-sync/             # Cross-App Synchronization
    ├── web-to-admin-sync.critical-flow.spec.ts
    └── admin-to-web-sync.critical-flow.spec.ts
```

## Writing Tests

### Test Template

```typescript
/**
 * FLOW-XX: [Flow Name] - Critical Flow Test
 * 
 * Priority: P0/P1/P2
 * Why Critical: [Brief explanation]
 * 
 * API Endpoints:
 * - POST /api/endpoint (operationId)
 * - GET /api/endpoint (operationId)
 */
import { test, expect } from '../../fixtures/fixtures';
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-XX: [Flow Name]', () => {
  test('should complete [flow name] successfully', async ({ tenantPage, apiContext, authTokens }) => {
    // STEP 1: Navigate
    await tenantPage.goto('/path');
    await tenantPage.waitForLoadState('networkidle');
    
    // STEP 2: Interact
    await tenantPage.click('button:has-text("Action")');
    
    // STEP 3: Verify
    await expect(tenantPage.locator('text=Success')).toBeVisible();
  });
});
```

### Best Practices

1. **Use Existing Fixtures**: Leverage `tenantPage`, `adminPage`, `apiContext`
2. **Deterministic Waits**: Use `waitForLoadState`, `waitForSelector`, not `waitForTimeout`
3. **Unique Identifiers**: Use timestamp-based IDs to avoid conflicts
4. **API Verification**: Verify both UI and backend state
5. **Clear Failures**: Add descriptive error messages

## Troubleshooting

### Tests fail with "Login timeout"
Check if auth tokens are properly injected in localStorage.

### "Element not found" errors
Use flexible selectors: `getByRole`, `getByText` over CSS selectors.

### Flaky tests
Replace `waitForTimeout` with deterministic waits like `waitForApiCall`.

### Cross-tenant data leaks
Always verify `tenantId` matches in API responses.

## CI Integration

Tests run automatically on:
- Pull requests to `main` and `dev`
- Push to `main` branch
- Manual trigger via GitHub Actions

**P0 tests block PR merge** if they fail.

## Metrics

- **Target**: < 5 minutes full suite execution
- **Target**: < 1% flaky test rate
- **Target**: 100% P0 flow coverage

## Support

- **Spec**: `.kiro/specs/critical-flow-regression-protection/`
- **Slack**: #critical-flows
- **Documentation**: [Wiki Link]
