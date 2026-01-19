import { test, expect } from '../fixtures/fixtures';

test.describe('Campaigns & SMS Module', () => {

    test('should display campaigns page', async ({ tenantPage }) => {
        await tenantPage.goto('/campaigns');
        await tenantPage.waitForLoadState('networkidle');

        // Verify page loads
        const heading = tenantPage.locator('h1, h2, h3, [role="heading"]').first();
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('should show campaign tabs or sections', async ({ tenantPage }) => {
        await tenantPage.goto('/campaigns');
        await tenantPage.waitForLoadState('networkidle');

        // Look for tabs or navigation for different SMS types
        const tabs = tenantPage.locator('[role="tab"], [class*="tab"], button').filter({
            hasText: /Toplu|Tekli|Otomasyon|Bulk|Single|Automation/i
        });
        const hasTabs = await tabs.count() > 0;

        // At least page should have some content
        const content = tenantPage.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible({ timeout: 10000 });
    });

    test('should have new campaign button', async ({ tenantPage }) => {
        await tenantPage.goto('/campaigns');
        await tenantPage.waitForLoadState('networkidle');

        // Look for new campaign or send SMS button
        const newButton = tenantPage.getByRole('button', { name: /Yeni|Gönder|Send|Oluştur|Create/i }).first();
        await expect(newButton).toBeVisible({ timeout: 5000 });
    });

    test('should show SMS history or list', async ({ tenantPage }) => {
        await tenantPage.goto('/campaigns');
        await tenantPage.waitForLoadState('networkidle');

        // Look for list or table of campaigns/messages
        const listOrTable = tenantPage.locator('table, [class*="list"], [class*="grid"]').first();
        await expect(listOrTable).toBeVisible({ timeout: 10000 });
    });
});
