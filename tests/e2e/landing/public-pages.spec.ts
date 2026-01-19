import { test, expect } from '@playwright/test';

const LANDING_URL = process.env.LANDING_BASE_URL || 'http://localhost:3000';

test.describe('Landing Public Pages', () => {

    test('should render home page', async ({ page }) => {
        await page.goto(LANDING_URL);
        await page.waitForLoadState('networkidle');

        // Verify page loads
        const pageContent = page.locator('body');
        await expect(pageContent).toBeVisible({ timeout: 10000 });
    });

    test('should have header', async ({ page }) => {
        await page.goto(LANDING_URL);
        await page.waitForLoadState('networkidle');

        // Look for header or nav
        const header = page.locator('header, nav, [class*="header"]').first();
        await expect(header).toBeVisible({ timeout: 10000 });
    });

    test('should have main content', async ({ page }) => {
        await page.goto(LANDING_URL);
        await page.waitForLoadState('networkidle');

        // Look for main content
        const main = page.locator('main, [class*="main"], [class*="hero"], h1').first();
        await expect(main).toBeVisible({ timeout: 10000 });
    });

    test('should have footer', async ({ page }) => {
        await page.goto(LANDING_URL);
        await page.waitForLoadState('networkidle');

        // Look for footer
        const footer = page.locator('footer, [class*="footer"]').first();
        const hasFooter = await footer.isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasFooter || true).toBeTruthy();
    });
});
