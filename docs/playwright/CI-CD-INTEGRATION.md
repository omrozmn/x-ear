# CI/CD Integration Guide

**Status**: Ready for Integration  
**Last Updated**: 2026-02-03

---

## 📋 Overview

This guide explains how to integrate Playwright E2E tests into your CI/CD pipeline using GitHub Actions.

---

## 🚀 GitHub Actions Workflows

### 1. P0 Tests (Critical) - `e2e-p0.yml`

**Trigger**: Every push and PR to `main` or `develop`  
**Duration**: ~35 minutes  
**Tests**: 55 critical tests  
**Browser**: Chromium only

**Purpose**: Block merges if critical functionality is broken.

```yaml
# Runs on:
- push to main/develop
- pull_request to main/develop

# Tests:
- Authentication
- Party CRUD
- Sales creation
- Invoice generation
- Device assignment
```

**Usage**:
```bash
# Manually trigger
gh workflow run e2e-p0.yml

# View status
gh run list --workflow=e2e-p0.yml
```

---

### 2. P1 Tests (High Priority) - `e2e-p1.yml`

**Trigger**: Every PR + Daily at 2 AM UTC  
**Duration**: ~50 minutes  
**Tests**: 85 high-priority tests  
**Browser**: Chromium only

**Purpose**: Catch high-priority issues before merge.

```yaml
# Runs on:
- pull_request to main/develop
- schedule: daily at 2 AM UTC

# Tests:
- Payment tracking
- Appointments
- Communication (SMS/Email)
- Settings
- Inventory
- Cash register
```

**Usage**:
```bash
# Manually trigger
gh workflow run e2e-p1.yml

# View latest run
gh run view --workflow=e2e-p1.yml
```

---

### 3. Full Suite - `e2e-full.yml`

**Trigger**: Weekly on Sunday + Manual  
**Duration**: ~2 hours  
**Tests**: All 190 tests  
**Browsers**: Chromium, Firefox, WebKit

**Purpose**: Comprehensive cross-browser testing.

```yaml
# Runs on:
- schedule: weekly on Sunday at midnight UTC
- workflow_dispatch: manual trigger

# Tests:
- All 190 tests
- 3 browsers (Chromium, Firefox, WebKit)
- Matrix strategy for parallel execution
```

**Usage**:
```bash
# Manually trigger
gh workflow run e2e-full.yml

# View results
gh run view --workflow=e2e-full.yml
```

---

## 🔧 Setup Requirements

### 1. Environment Variables

Add these secrets to your GitHub repository:

```bash
# Required secrets (Settings → Secrets → Actions)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
SUPER_ADMIN_EMAIL=superadmin@xear.com
SUPER_ADMIN_PASSWORD=SuperAdmin123!
```

### 2. Database Setup

The workflows automatically set up PostgreSQL and Redis using GitHub Actions services:

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: xear_test
    ports:
      - 5432:5432
  
  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
```

### 3. Test Data Seeding

The workflows run seed scripts before tests:

```bash
# In workflow
python scripts/seed_comprehensive_data.py
```

**Required seed script**: `x-ear/apps/api/scripts/seed_comprehensive_data.py`

---

## 📊 Test Artifacts

### Uploaded Artifacts

Each workflow uploads test results and reports:

1. **Playwright HTML Report**
   - Path: `playwright-report/`
   - Retention: 30 days
   - Contains: Screenshots, videos, traces

2. **Test Results**
   - Path: `test-results/`
   - Retention: 30 days
   - Contains: JSON, JUnit XML reports

### Accessing Artifacts

```bash
# List artifacts
gh run view <run-id> --log

# Download artifacts
gh run download <run-id>

# View in browser
# Go to Actions → Select workflow run → Artifacts section
```

---

## 🎯 Test Priority Tags

### Adding Priority Tags

Tag tests with priority levels for selective execution:

```typescript
// P0 - Critical (blocks merge)
test('AUTH-001: Login with valid credentials @p0', async ({ page }) => {
  // ...
});

// P1 - High (runs on PR)
test('PAYMENT-001: Track payment @p1', async ({ page }) => {
  // ...
});

// P2 - Medium (runs weekly)
test('REPORT-001: Generate sales report @p2', async ({ page }) => {
  // ...
});
```

### Running by Priority

```bash
# Run P0 tests only
npx playwright test --grep "@p0"

# Run P1 tests only
npx playwright test --grep "@p1"

# Run P0 and P1 tests
npx playwright test --grep "@p0|@p1"
```

---

## 🔍 Debugging Failed Tests

### 1. View Trace

```bash
# Download artifacts
gh run download <run-id>

# Open trace viewer
npx playwright show-trace test-results/trace.zip
```

### 2. View Screenshots

Screenshots are automatically captured on failure:

```
test-results/
  ├── auth-login-chromium/
  │   ├── test-failed-1.png
  │   └── trace.zip
```

### 3. View Logs

```bash
# View workflow logs
gh run view <run-id> --log

# View specific job logs
gh run view <run-id> --job=<job-id> --log
```

---

## 🚦 Status Badges

Add status badges to your README:

```markdown
![E2E Tests (P0)](https://github.com/your-org/x-ear/workflows/E2E%20Tests%20(P0%20-%20Critical)/badge.svg)
![E2E Tests (P1)](https://github.com/your-org/x-ear/workflows/E2E%20Tests%20(P1%20-%20High%20Priority)/badge.svg)
![E2E Tests (Full)](https://github.com/your-org/x-ear/workflows/E2E%20Tests%20(Full%20Suite)/badge.svg)
```

---

## 📈 Performance Optimization

### 1. Parallel Execution

Tests run in parallel with 4 workers:

```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 4 : undefined,
  fullyParallel: true,
});
```

### 2. Retry Strategy

Failed tests are automatically retried:

```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
});
```

### 3. Caching

Dependencies are cached to speed up workflow:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: x-ear/package-lock.json
```

---

## 🔒 Security Best Practices

### 1. Secrets Management

- Never commit credentials to repository
- Use GitHub Secrets for sensitive data
- Rotate secrets regularly

### 2. Test Isolation

- Each test creates its own data
- Tests don't share state
- Database is reset between runs

### 3. Environment Separation

- Use separate test database
- Use test-specific JWT secrets
- Set `ENVIRONMENT=test`

---

## 📝 Troubleshooting

### Common Issues

#### 1. Services Not Ready

**Error**: `ECONNREFUSED localhost:5003`

**Solution**: Increase wait timeout
```yaml
- name: Wait for services
  run: |
    npx wait-on http://localhost:5003/health --timeout 180000
```

#### 2. Database Migration Failed

**Error**: `alembic.util.exc.CommandError`

**Solution**: Check migration scripts
```bash
# Test migrations locally
cd x-ear/apps/api
alembic upgrade head
```

#### 3. Test Timeout

**Error**: `Test timeout of 30000ms exceeded`

**Solution**: Increase test timeout
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});
```

#### 4. Flaky Tests

**Error**: Test passes locally but fails in CI

**Solution**: 
- Add explicit waits
- Use `waitForResponse` instead of `waitForTimeout`
- Check for race conditions

---

## 📊 Monitoring & Metrics

### Key Metrics to Track

1. **Test Execution Time**
   - P0: < 35 minutes
   - P1: < 50 minutes
   - Full: < 120 minutes

2. **Flaky Test Rate**
   - Target: < 5%
   - Track: Tests that fail intermittently

3. **Success Rate**
   - Target: > 95%
   - Track: Percentage of passing runs

4. **False Positive Rate**
   - Target: < 2%
   - Track: Tests that fail due to test issues, not code issues

### Viewing Metrics

```bash
# View recent runs
gh run list --workflow=e2e-p0.yml --limit=10

# View success rate
gh run list --workflow=e2e-p0.yml --json conclusion | jq '[.[] | .conclusion] | group_by(.) | map({key: .[0], count: length})'
```

---

## 🔄 Maintenance

### Weekly Tasks

- [ ] Review failed test runs
- [ ] Update flaky test list
- [ ] Check artifact storage usage
- [ ] Review execution time trends

### Monthly Tasks

- [ ] Update Playwright version
- [ ] Review and optimize slow tests
- [ ] Update test data seeds
- [ ] Review and update documentation

---

## 📚 Related Documents

- [Testing Guide](./03-TESTING-GUIDE.md)
- [Debugging Guide](./04-DEBUGGING-GUIDE.md)
- [Test Inventory](./08-TEST-INVENTORY.md)
- [Phase 3 Complete](./PHASE-3-SUMMARY.md)

---

## 🆘 Support

### Getting Help

1. **Check Documentation**: Review testing guides
2. **View Logs**: Check workflow logs for errors
3. **Ask Team**: Post in #testing Slack channel
4. **Create Issue**: Open GitHub issue with `ci/cd` label

### Useful Commands

```bash
# View workflow status
gh workflow view e2e-p0.yml

# List recent runs
gh run list --workflow=e2e-p0.yml

# View specific run
gh run view <run-id>

# Download artifacts
gh run download <run-id>

# Re-run failed jobs
gh run rerun <run-id> --failed
```

---

**Status**: ✅ Ready for Integration  
**Next Steps**: Add test priority tags, create seed script, test workflows

