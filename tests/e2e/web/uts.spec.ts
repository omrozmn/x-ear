import { test, expect } from '../fixtures/fixtures';

test.describe('UTS Integration', () => {

    test('should display UTS page', async ({ tenantPage }) => {
        await tenantPage.goto('/uts');
        await tenantPage.waitForLoadState('networkidle');

        // Verify page loads
        const heading = tenantPage.locator('h1, h2, h3, [role="heading"]').first();
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('should show UTS status or configuration', async ({ tenantPage }) => {
        await tenantPage.goto('/uts');
        await tenantPage.waitForLoadState('networkidle');

        // Look for status or config section
        const statusSection = tenantPage.locator('[class*="status"], [class*="config"], [class*="card"]').first();
        await expect(statusSection).toBeVisible({ timeout: 10000 });
    });

    test('should have action buttons', async ({ tenantPage }) => {
        await tenantPage.goto('/uts');
        await tenantPage.waitForLoadState('networkidle');

        // Look for action buttons
        const buttons = tenantPage.locator('button');
        const buttonCount = await buttons.count();
        expect(buttonCount).toBeGreaterThan(0);
    });

    test('should display product/device list', async ({ tenantPage }) => {
        await tenantPage.goto('/uts');
        await tenantPage.waitForLoadState('networkidle');

        // Look for data display
        const dataSection = tenantPage.locator('table, [class*="list"], [class*="grid"]').first();
        await expect(dataSection).toBeVisible({ timeout: 10000 });
    });
});
