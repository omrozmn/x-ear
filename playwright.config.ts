import { defineConfig, devices } from '@playwright/test';

/**
 * Unified Playwright E2E Test Configuration
 * 
 * Supports 3 applications:
 * - Web App (localhost:8080)
 * - Admin Panel (localhost:8082)
 * - Landing Page (localhost:3000)
 * 
 * Also requires Backend API (localhost:5003)
 * 
 * Usage:
 *   npx playwright test                    # Run all projects
 *   npx playwright test --project=web       # Run web tests only
 *   npx playwright test --project=admin     # Run admin tests only
 *   npx playwright test --project=landing  # Run landing tests only
 *   npx playwright test --list --project=web # List web tests
 */

// Storage state paths for authentication reuse
const webStorageState = 'test-results/.auth-web.json';
const adminStorageState = 'test-results/.auth-admin.json';

export default defineConfig({
  // Root test directory
  testDir: './tests/e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 4 : undefined,
  
  /* Global timeout for each test */
  timeout: 60000,
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list']
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
    
    /* Maximum time each action can take */
    actionTimeout: 30000,
    
    /* Maximum time for navigation */
    navigationTimeout: 30000,
    
    /* Run in headless mode for speed */
    headless: true,
  },

  /* Configure projects for all 3 apps */
  projects: [
    // ================== WEB APP ==================
    {
      name: 'web-auth-setup',
      testDir: './tests/e2e/auth',
      use: {
        baseURL: process.env.WEB_BASE_URL || 'http://localhost:8080',
        /* Store auth state for reuse by web tests - will be created on first run */
        storageState: { cookies: [], origins: [] },
      },
      fullyParallel: false,
      retries: 0,
      /* This project sets up auth state - must run first */
    },
    {
      name: 'web',
      testDir: './tests/e2e/web',
      use: {
        baseURL: process.env.WEB_BASE_URL || 'http://localhost:8080',
        ...devices['Desktop Chrome'],
        /* Reuse auth state from web-auth-setup */
        storageState: webStorageState,
      },
      dependencies: ['web-auth-setup'],
    },
    
    // ================== ADMIN PANEL ==================
    {
      name: 'admin-auth-setup',
      testDir: './tests/e2e/auth',
      use: {
        baseURL: process.env.ADMIN_BASE_URL || 'http://localhost:8082',
        /* Do not pre-load storageState for auth setup; tests will create it */
        storageState: undefined,
      },
      fullyParallel: false,
      retries: 0,
      /* This project sets up auth state - must run first */
    },
    {
      name: 'admin',
      testDir: './tests/e2e/admin',
      use: {
        baseURL: process.env.ADMIN_BASE_URL || 'http://localhost:8082',
        ...devices['Desktop Chrome'],
        /* Do not preload storage state here; auth setup will login programmatically when needed */
        storageState: undefined,
      },
      dependencies: ['admin-auth-setup'],
    },
    
    // ================== LANDING PAGE ==================
    {
      name: 'landing',
      testDir: './tests/e2e/landing',
      use: {
        baseURL: process.env.LANDING_BASE_URL || 'http://localhost:3000',
        ...devices['Desktop Chrome'],
      },
      /* Landing page typically doesn't need auth */
    },

    // ================== PUBLIC WEB (No Auth Required) ==================
    {
      name: 'web-public',
      testDir: './tests/e2e/web/auth',
      use: {
        baseURL: process.env.WEB_BASE_URL || 'http://localhost:8080',
        ...devices['Desktop Chrome'],
        /* No auth state needed for public pages */
        storageState: undefined,
      },
      /* Independent - no auth setup needed */
    },
  ],

  /* Run local dev servers before starting the tests - DISABLED for manual testing */
  // webServer: [
  //   // Backend API
  //   {
  //     command: 'cd apps/api && .venv/bin/python main.py',
  //     url: 'http://localhost:5003/health',
  //     reuseExistingServer: true, // Always reuse for manual testing
  //     timeout: 120 * 1000,
  //   },
  //   // Web App
  //   {
  //     command: 'cd apps/web && npm run dev',
  //     url: 'http://localhost:8080',
  //     reuseExistingServer: true, // Always reuse for manual testing
  //     timeout: 120 * 1000,
  //   },
  //   // Admin Panel
  //   {
  //     command: 'cd apps/admin && npm run dev',
  //     url: 'http://localhost:8082',
  //     reuseExistingServer: true, // Always reuse for manual testing
  //     timeout: 120 * 1000,
  //   },
  //   // Landing Page
  //   {
  //     command: 'cd apps/landing && npm run dev',
  //     url: 'http://localhost:3000',
  //     reuseExistingServer: true, // Always reuse for manual testing
  //     timeout: 120 * 1000,
  //   },
  // ],
  
  /* Output directory for test artifacts */
  outputDir: 'test-results',
});
