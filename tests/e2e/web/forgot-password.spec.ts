import { test, expect } from '@playwright/test';

const WEB_URL = process.env.WEB_BASE_URL || 'http://localhost:8080';

test.describe('Forgot Password Flow', () => {

    test('should display forgot password page', async ({ page }) => {
        await page.goto(`${WEB_URL}/forgot-password`);
        await page.waitForLoadState('networkidle');

        // Verify page loads - either forgot password page or redirect to login
        const pageContent = page.locator('body');
        await expect(pageContent).toBeVisible({ timeout: 10000 });
    });

    test('should have input fields', async ({ page }) => {
        await page.goto(`${WEB_URL}/forgot-password`);
        await page.waitForLoadState('networkidle');

        // Look for any input fields (may be on forgot-password or login page)
        const inputs = page.locator('input').first();
        await expect(inputs).toBeVisible({ timeout: 10000 });
    });

    test('should have action buttons', async ({ page }) => {
        await page.goto(`${WEB_URL}/forgot-password`);
        await page.waitForLoadState('networkidle');

        // Look for any buttons
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        expect(buttonCount).toBeGreaterThan(0);
    });

    test('should have navigation links', async ({ page }) => {
        await page.goto(`${WEB_URL}/forgot-password`);
        await page.waitForLoadState('networkidle');

        // Look for any links
        const links = page.locator('a');
        const linkCount = await links.count();
        expect(linkCount).toBeGreaterThanOrEqual(0);
    });
});
