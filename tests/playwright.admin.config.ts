import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/admin',
  timeout: 45000,
  globalTimeout: 600000,
  expect: { timeout: 8000 },
  retries: 0,
  reporter: [['list'], ['json', { outputFile: './e2e/test-results/admin-results.json' }]],
  use: {
    baseURL: process.env.ADMIN_BASE_URL || 'http://127.0.0.1:8082',
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
