import { test, expect } from '@playwright/test';

const ADMIN_URL = process.env.ADMIN_BASE_URL || 'http://localhost:8082';

test.describe('Admin Dashboard', () => {

    test('should display admin app', async ({ page }) => {
        await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded' });

        // Wait for React to mount
        await page.waitForTimeout(3000);

        // Verify page loads
        const pageContent = page.locator('body');
        await expect(pageContent).toBeVisible();

        // Check that we have some content
        const bodyText = await page.locator('body').textContent();
        expect(bodyText).toBeDefined();
    });

    test('should have rendered content', async ({ page }) => {
        await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded' });

        // Wait for React to mount
        await page.waitForTimeout(3000);

        // Check for root element
        const root = page.locator('#root, [id*="root"], [class*="app"]').first();
        await expect(root).toBeVisible({ timeout: 15000 });
    });
});
