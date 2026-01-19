import { test, expect } from '@playwright/test';

const ADMIN_URL = process.env.ADMIN_BASE_URL || 'http://localhost:8082';

test.describe('Admin System Monitoring', () => {

    test('should display system or login', async ({ page }) => {
        await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const pageContent = page.locator('body');
        await expect(pageContent).toBeVisible();
    });

    test('should have root element', async ({ page }) => {
        await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const root = page.locator('#root, [id*="root"]').first();
        await expect(root).toBeVisible({ timeout: 15000 });
    });
});
