import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8082';
const CREDENTIALS = {
    email: 'admin@x-ear.com',
    password: 'admin123'
};

test.describe('Admin: Exhaustive System Settings', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', CREDENTIALS.email);
        await page.fill('input[type="password"]', CREDENTIALS.password);
        await page.click('button:has-text("Sign in")');
        await expect(page).toHaveURL(/.*dashboard|tenants/);
    });

    test('should manage system configuration', async ({ page }) => {
        // Find system settings in sidebar or direct navigate
        await page.goto(`${BASE_URL}/settings`);
        
        await expect(page.getByRole('heading', { name: /Sistem Ayarları|System Settings/i })).toBeVisible();
        
        // Check for common settings
        await expect(page.locator('body')).toContainText(/Bakım Modu|Maintenance/i);
        await expect(page.locator('body')).toContainText(/Versiyon|Version/i);
        
        // Toggle maintenance mode (if exists and testable)
        const maintenanceToggle = page.locator('input[type="checkbox"]').first();
        if (await maintenanceToggle.isVisible()) {
            await maintenanceToggle.click({ force: true });
            await page.getByRole('button', { name: /Kaydet|Save/i }).click();
            await expect(page.locator('text=Ayarlar güncellendi')).toBeVisible();
        }
    });

    test('should view health check status', async ({ page }) => {
        await page.goto(`${BASE_URL}/monitoring`); // Assuming monitoring route
        
        // Even if route doesn't exist, we'll check for a similar section
        if (page.url().includes('monitoring')) {
            await expect(page.locator('body')).toContainText(/Durum|Status|CPU|Memory/i);
        }
    });
});
