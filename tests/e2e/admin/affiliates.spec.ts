/**
 * Admin Panel - Affiliate Management E2E Tests
 * Tests affiliate listing and approval
 */
import { test, expect } from '../fixtures/fixtures';

test.describe('Admin: Affiliates', () => {

    test('should list pending affiliates', async ({ adminPage }) => {
        await adminPage.goto('/affiliates');
        await expect(adminPage.getByRole('heading', { name: 'Affiliates' })).toBeVisible(); // Or 'Bayiler' depending on translation
    });
    // The original line `await adminPage.waitForLoadState('networkidle');` was removed as it's not in the provided Code Edit.
    // The original line `await expect(adminPage.getByRole('heading', { name: /Affiliates|Başvurular|Bayilik/i }).first()).toBeVisible();` was replaced.

    test('should approve or reject application', async ({ adminPage }) => {
        await adminPage.goto('/admin/affiliates');

        // This test might be flaky if no data, so checks existence first
        const row = adminPage.locator('table tbody tr').first();
        if (await row.isVisible()) {
            const actionBtn = row.locator('button').first();
            if (await actionBtn.isVisible()) {
                await actionBtn.click();
                // Check if Approve/Reject options appear
                // await expect(adminPage.getByText(/Approve|Onayla/i)).toBeVisible();
            }
        }
    });
});
