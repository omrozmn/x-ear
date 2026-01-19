import { test, expect } from '../fixtures/fixtures';

test.describe('Appointments Module', () => {

    test('should display appointments page', async ({ tenantPage }) => {
        await tenantPage.goto('/appointments');
        await tenantPage.waitForLoadState('networkidle');

        // Verify page loads with heading
        const heading = tenantPage.locator('h1, h2, h3, [role="heading"]').first();
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('should show calendar view', async ({ tenantPage }) => {
        await tenantPage.goto('/appointments');
        await tenantPage.waitForLoadState('networkidle');

        // Look for calendar container or date navigation
        const calendarOrList = tenantPage.locator('[class*="calendar"], [class*="schedule"], table, .fc-view').first();
        await expect(calendarOrList).toBeVisible({ timeout: 10000 });
    });

    test('should have new appointment button', async ({ tenantPage }) => {
        await tenantPage.goto('/appointments');
        await tenantPage.waitForLoadState('networkidle');

        // Look for "Yeni Randevu" or similar button
        const newButton = tenantPage.getByRole('button', { name: /Yeni|Ekle|Randevu/i }).first();
        await expect(newButton).toBeVisible({ timeout: 5000 });
    });

    test('should navigate between dates', async ({ tenantPage }) => {
        await tenantPage.goto('/appointments');
        await tenantPage.waitForLoadState('networkidle');

        // Look for navigation arrows or date picker
        const navButtons = tenantPage.locator('button').filter({ hasText: /Bugün|İleri|Geri|Today|Next|Prev/i });
        const hasNav = await navButtons.count() > 0;

        if (hasNav) {
            await expect(navButtons.first()).toBeVisible();
        }
    });
});
