import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/web',
  timeout: 30000,
  fullyParallel: true,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/debug-scan-results-web.json' }],
  ],
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    actionTimeout: 10000,
    navigationTimeout: 15000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'debug-scan',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
