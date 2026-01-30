import { test, expect } from '../fixtures/fixtures';

test.describe('Dashboard Module', () => {

    test('should display dashboard page', async ({ tenantPage }) => {
        await tenantPage.goto('/');
        await tenantPage.waitForLoadState('networkidle');

        // Dashboard is usually the home page after login
        // Check for main layout elements
        const mainContent = tenantPage.locator('main, [class*="dashboard"], [class*="main"]').first();
        await expect(mainContent).toBeVisible({ timeout: 10000 });
    });

    test('should show statistics/KPI cards', async ({ tenantPage }) => {
        await tenantPage.goto('/');
        await tenantPage.waitForLoadState('networkidle');

        // Look for stat cards or widgets
        const cards = tenantPage.locator('[class*="card"], [class*="stat"], [class*="widget"]');
        await expect(cards.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show recent activity or appointments', async ({ tenantPage }) => {
        await tenantPage.goto('/');
        await tenantPage.waitForLoadState('networkidle');

        // Look for lists or tables showing recent data
        const listOrTable = tenantPage.locator('table, ul, [class*="list"], [class*="activity"]').first();
        await expect(listOrTable).toBeVisible({ timeout: 10000 });
    });

    test('should have quick action buttons', async ({ tenantPage }) => {
        await tenantPage.goto('/');
        await tenantPage.waitForLoadState('networkidle');

        // Look for action buttons
        // Look for action buttons, role="button", or known icons like Refresh
        const buttons = tenantPage.locator('button, [role="button"], .lucide-refresh-cw');
        const buttonCount = await buttons.count();
        expect(buttonCount).toBeGreaterThan(0);
    });
});
