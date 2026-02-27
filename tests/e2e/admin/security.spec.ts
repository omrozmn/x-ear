/**
 * Admin Panel - Security & Unauthorized Access E2E Tests
 */
import { test, expect } from '@playwright/test';

const ADMIN_URL = process.env.ADMIN_BASE_URL || 'http://localhost:8082';

test.describe('Admin: Security', () => {

    test('should reject login with invalid credentials', async ({ page }) => {
        await page.goto(`${ADMIN_URL}/login`);
        await page.getByLabel(/E-posta|Email/i).fill('wrong@example.com');
        await page.getByLabel(/Şifre|Password/i).fill('WrongPass123!');
        await page.getByRole('button', { name: /Giriş|Sign in|Login/i }).click();
        
        await expect(page.getByText(/Hatalı|Invalid|Error/i)).toBeVisible();
        await expect(page).toHaveURL(/.*login/);
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
        // Clear storage to ensure not logged in
        await page.context().clearCookies();
        await page.goto(`${ADMIN_URL}/tenants`);
        await expect(page).toHaveURL(/.*login/);
    });

    test('should show 404 for non-existent routes', async ({ page }) => {
        // We need to be logged in for some 404s depending on router setup
        await page.goto(`${ADMIN_URL}/non-existent-page-random-123`);
        await expect(page.locator('body')).toContainText(/404|bulunamadı|not found/i);
    });
});
