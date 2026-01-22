import { test as base, Page, APIRequestContext } from '@playwright/test';
import { login, setupAuthenticatedPage, AuthTokens } from '../web/helpers/test-utils';

/**
 * Extended test fixtures
 */
export type TestOptions = {
    // Define any project-specific options here
};

export type TestFixtures = {
    tenantPage: Page;
    adminPage: Page;
    affiliatePage: Page;
    apiContext: APIRequestContext;
    authTokens: AuthTokens;
    // Add other fixtures like invoiceData, inventoryData etc.
};

export const test = base.extend<TestFixtures & TestOptions>({
    // Fixture for a standard tenant user
    tenantPage: async ({ page, request }, use) => {
        // 0. Enable Console Logging for Debugging
        page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));

        // 1. Login via API
        const tokens = await login(request, process.env.TEST_USER_PHONE || '+905551234567', process.env.TEST_USER_OTP || 'password123');

        // 2. Real Backend Mode - No Mocks
        console.log('[Fixture] Running against REAL BACKEND (No Mocks)');

        // 3. Inject Tokens via Init Script
        console.log('[Fixture] Injecting auth script...');
        await page.addInitScript((data) => {
            console.log('[Init] Setting storage keys...');
            localStorage.setItem('x-ear.auth.token@v1', data.accessToken);
            localStorage.setItem('auth_token', data.accessToken);
            if (data.refreshToken) localStorage.setItem('x-ear.auth.refresh@v1', data.refreshToken);

            const authState = {
                state: {
                    user: {
                        id: data.userId,
                        tenantId: data.tenantId,
                        role: data.role || 'TENANT_ADMIN',
                        firstName: 'Test',
                        is_active: true,
                        isPhoneVerified: true,
                        is_phone_verified: true
                    },
                    token: data.accessToken,
                    isAuthenticated: true,
                    isInitialized: true,
                    isLoading: false,
                    error: null,
                    subscription: { isExpired: false, daysRemaining: 30, planName: 'PRO' }
                },
                version: 0
            };
            localStorage.setItem('auth-storage', JSON.stringify(authState));
        }, tokens);

        // 4. Navigate
        await page.goto('/');

        // 5. Wait for stable state
        try {
            await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 15000 });
        } catch (e) {
            console.log('[Fixture] Error: Timed out waiting for dashboard. Current URL:', page.url());
        }

        await use(page);
    },

    // Fixture for an admin user
    adminPage: async ({ browser, request }, use) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        // Login as admin
        const tokens = await login(request, process.env.ADMIN_USER_EMAIL || 'admin@example.com', process.env.ADMIN_USER_PASSWORD || 'Password123!');
        // NOTE: Admin uses email/password. Login helper handles "identifier" which accepts email.

        // If admin is on a different port (8082), we should probably respect that in setupAuthenticatedPage or manually do it.
        // For now, let's assume we can set localStorage on the admin origin.
        const adminUrl = process.env.ADMIN_BASE_URL || 'http://localhost:8082';
        await page.goto(adminUrl);

        await page.evaluate((data) => {
            // Set Zustand persistent storage for AuthStore
            // This is the primary source of truth for the Admin App
            const authState = {
                state: {
                    user: data.user,
                    token: data.accessToken,
                    isAuthenticated: true,
                    _hasHydrated: true
                },
                version: 0
            };
            localStorage.setItem('admin-auth-storage', JSON.stringify(authState));

            console.log('[FIXTURE] Setting admin_token:', data.accessToken ? 'PRESENT' : 'MISSING');
            if (!data.accessToken) console.error('[FIXTURE] Access Token is MISSING!');

            // Critical: The axios interceptor reads from 'admin_token' key directly, 
            // while Zustand uses 'admin-auth-storage'. We must bridge this by setting both.
            localStorage.setItem('admin_token', data.accessToken);
            if (data.refreshToken) {
                localStorage.setItem('admin_refresh_token', data.refreshToken);
            }
        }, { user: tokens.user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken || '' });

        await use(page);
        await context.close();
    },

    // Fixture for affiliate
    affiliatePage: async ({ browser, request }, use) => {
        // TODO: Implement affiliate login flow
        const context = await browser.newContext();
        const page = await context.newPage();
        await use(page);
        await context.close();
    },

    // Shared auth tokens if needed directly
    authTokens: async ({ request }, use) => {
        const tokens = await login(request);
        await use(tokens);
    },
});

export { expect } from '@playwright/test';
