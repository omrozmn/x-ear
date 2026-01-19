import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read from default .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    globalSetup: path.resolve(__dirname, './tests/e2e/global.setup.ts'),
    testDir: './tests/e2e',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ['html'],
        ['json', { outputFile: 'playwright-report/results.json' }],
        ['list']
    ],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        // baseURL: 'http://127.0.0.1:3000',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    /* Configure projects for major components */
    projects: [
        // Desktop - Chrome (Primary)
        {
            name: 'web',
            testDir: './tests/e2e/web',
            use: {
                ...devices['Desktop Chrome'],
                baseURL: process.env.WEB_BASE_URL || 'http://localhost:8080',
            },
        },
        // Desktop - Firefox
        {
            name: 'web-firefox',
            testDir: './tests/e2e/web',
            use: {
                ...devices['Desktop Firefox'],
                baseURL: process.env.WEB_BASE_URL || 'http://localhost:8080',
            },
        },
        // Desktop - Safari
        {
            name: 'web-webkit',
            testDir: './tests/e2e/web',
            use: {
                ...devices['Desktop Safari'],
                baseURL: process.env.WEB_BASE_URL || 'http://localhost:8080',
            },
        },
        // Mobile - iPhone 12
        {
            name: 'web-mobile-iphone',
            testDir: './tests/e2e/web',
            use: {
                ...devices['iPhone 12'],
                baseURL: process.env.WEB_BASE_URL || 'http://localhost:8080',
            },
        },
        // Mobile - Pixel 5
        {
            name: 'web-mobile-android',
            testDir: './tests/e2e/web',
            use: {
                ...devices['Pixel 5'],
                baseURL: process.env.WEB_BASE_URL || 'http://localhost:8080',
            },
        },
        // Tablet - iPad
        {
            name: 'web-tablet-ipad',
            testDir: './tests/e2e/web',
            use: {
                ...devices['iPad (gen 7)'],
                baseURL: process.env.WEB_BASE_URL || 'http://localhost:8080',
            },
        },
        {
            name: 'admin',
            testDir: './tests/e2e/admin',
            use: {
                ...devices['Desktop Chrome'],
                baseURL: process.env.ADMIN_BASE_URL || 'http://localhost:8082',
            },
        },
        {
            name: 'landing',
            testDir: './tests/e2e/landing',
            use: {
                ...devices['Desktop Chrome'],
                baseURL: process.env.LANDING_BASE_URL || 'http://localhost:3000',
            },
        },
    ],
});
