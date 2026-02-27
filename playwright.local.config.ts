import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';

// Load storage state file into memory to avoid path resolution issues
let webStorage = undefined;
try {
  const p = process.env.WEB_AUTH_STATE_PATH || '/Users/ozmen/Desktop/x-ear web app/x-ear/test-results/.auth-web.json';
  const raw = fs.readFileSync(p, 'utf8');
  webStorage = JSON.parse(raw);
  console.log('Loaded web storage state from', p);
} catch (e) {
  console.warn('Could not load web storage state:', e.message);
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 60000,
  reporter: [['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 30000,
    headless: true,
  },
  projects: [
    {
      name: 'web',
      testDir: './tests/e2e/web',
      use: {
        baseURL: process.env.WEB_BASE_URL || 'http://localhost:8080',
        ...devices['Desktop Chrome'],
        // Use in-memory storageState object if loaded, otherwise fallback to file path
        storageState: webStorage || 'test-results/.auth-web.json',
      }
    }
  ],
  webServer: [],
  outputDir: 'test-results'
});
