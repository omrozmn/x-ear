import { defineConfig, devices } from '@playwright/test';

/**
 * Minimal config for running web tests without auth dependencies
 */
export default defineConfig({
  testDir: './tests/e2e/web',
  
  fullyParallel: true,
  
  retries: 0,
  
  timeout: 60000,
  
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
  ],
  
  use: {
    baseURL: process.env.WEB_BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },

  projects: [
    {
      name: 'web',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
