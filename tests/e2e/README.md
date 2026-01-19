# X-EAR E2E Tests

This directory contains the end-to-end test suite for the X-EAR platform, covering:
- **Web App** (`tests/e2e/web`)
- **Admin Panel** (`tests/e2e/admin`)
- **Landing & Affiliate** (`tests/e2e/landing`)

## Setup

1. **Install Dependencies**:
   ```bash
   pnpm install
   # or
   npm install
   ```

2. **Install Playwright Browsers**:
   ```bash
   npx playwright install --with-deps
   ```

3. **Environment**:
   Ensure your local servers are running or update `.env` with correct URLs:
   - `WEB_BASE_URL` (default: http://localhost:8080)
   - `ADMIN_BASE_URL` (default: http://localhost:8082)
   - `LANDING_BASE_URL` (default: http://localhost:3000)
   - `API_BASE_URL` (default: http://localhost:5003)

## Running Tests

**Run All Tests**:
```bash
npx playwright test
```

**Run Specific App**:
```bash
npx playwright test --project=web
npx playwright test --project=admin
npx playwright test --project=landing
```

**Run in UI Mode** (Recommended for debugging):
```bash
npx playwright test --ui
```

## Structure
- `fixtures/`: Shared test fixtures (User login, page setup).
- `web/`: Tests for the tenant web application.
- `admin/`: Tests for the back-office admin panel.
- `landing/`: Tests for public pages and affiliate system.
