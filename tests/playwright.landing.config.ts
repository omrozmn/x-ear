import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/landing',
  timeout: 60000,
  expect: { timeout: 8000 },
  retries: 0,
  reporter: [['list'], ['json', { outputFile: './e2e/test-results/landing-results.json' }]],
  use: {
    baseURL: process.env.LANDING_BASE_URL || 'http://127.0.0.1:3000',
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
