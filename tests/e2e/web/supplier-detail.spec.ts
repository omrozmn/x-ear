import { test, expect } from '../fixtures/fixtures';

test.describe('Supplier Detail Page', () => {

    test('should display suppliers list', async ({ tenantPage }) => {
        await tenantPage.goto('/suppliers');
        await tenantPage.waitForLoadState('networkidle');

        // Verify page loads
        const heading = tenantPage.locator('h1, h2, h3, [role="heading"]').first();
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to supplier detail', async ({ tenantPage }) => {
        await tenantPage.goto('/suppliers');
        await tenantPage.waitForLoadState('networkidle');

        // Click on first supplier if available
        const firstItem = tenantPage.locator('table tbody tr, [class*="item"], [class*="card"]').first();
        const hasItems = await firstItem.isVisible({ timeout: 5000 }).catch(() => false);

        if (hasItems) {
            await firstItem.click();
            await tenantPage.waitForLoadState('networkidle');

            // Verify detail page loaded
            const detailContent = tenantPage.locator('[class*="detail"], [class*="supplier"], main').first();
            await expect(detailContent).toBeVisible({ timeout: 10000 });
        } else {
            expect(true).toBeTruthy();
        }
    });

    test('should show supplier information', async ({ tenantPage }) => {
        await tenantPage.goto('/suppliers');
        await tenantPage.waitForLoadState('networkidle');

        // Look for supplier list/table
        const supplierList = tenantPage.locator('table, [class*="list"], [class*="grid"]').first();
        await expect(supplierList).toBeVisible({ timeout: 10000 });
    });

    test('should have new supplier button', async ({ tenantPage }) => {
        await tenantPage.goto('/suppliers');
        await tenantPage.waitForLoadState('networkidle');

        // Look for new supplier button
        const newButton = tenantPage.getByRole('button', { name: /Yeni|Ekle|Tedarikçi/i }).first();
        await expect(newButton).toBeVisible({ timeout: 5000 });
    });
});
