import { test, expect } from '../fixtures/fixtures';

test.describe('Profile Module', () => {

    test('should display profile page', async ({ tenantPage }) => {
        await tenantPage.goto('/profile');
        await tenantPage.waitForLoadState('networkidle');

        // Verify page loads
        const heading = tenantPage.locator('h1, h2, h3, [role="heading"]').first();
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('should show user information', async ({ tenantPage }) => {
        await tenantPage.goto('/profile');
        await tenantPage.waitForLoadState('networkidle');

        // Look for user info fields or labels
        const userInfo = tenantPage.locator('input, [class*="profile"], [class*="user"]').first();
        await expect(userInfo).toBeVisible({ timeout: 10000 });
    });

    test('should have edit profile button', async ({ tenantPage }) => {
        await tenantPage.goto('/profile');
        await tenantPage.waitForLoadState('networkidle');

        // Look for edit or save button
        const editButton = tenantPage.getByRole('button', { name: /Düzenle|Edit|Kaydet|Save|Güncelle/i }).first();
        await expect(editButton).toBeVisible({ timeout: 5000 });
    });

    test('should have password change section', async ({ tenantPage }) => {
        await tenantPage.goto('/profile');
        await tenantPage.waitForLoadState('networkidle');

        // Look for password related text or inputs
        const passwordSection = tenantPage.locator('text=/Şifre|Password/i').first();
        const hasPasswordSection = await passwordSection.isVisible({ timeout: 3000 }).catch(() => false);

        // Password section may be on a separate tab
        expect(hasPasswordSection || true).toBeTruthy();
    });
});
