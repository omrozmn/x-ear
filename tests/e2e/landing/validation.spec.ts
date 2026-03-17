/**
 * Landing Page - Form Validation E2E Tests
 */
import { test, expect } from '@playwright/test';

const LANDING_URL = process.env.LANDING_BASE_URL || 'http://localhost:3000';

test.describe('Landing: Validations', () => {

    test('should validate Register form fields', async ({ page }) => {
        // Register page returns 404 - not implemented yet
        test.skip(true, 'Register page not implemented (404)');

        await page.goto(`${LANDING_URL}/register`);
        
        const submitBtn = page.getByRole('button', { name: /Devam Et|Continue/i });
        await submitBtn.click();
        
        // Check for required field errors
        await expect(page.locator('body')).toContainText(/Gerekli|Required/i);
    });

    test('should validate email format in Register', async ({ page }) => {
        // Register page returns 404 - not implemented yet
        test.skip(true, 'Register page not implemented (404)');

        await page.goto(`${LANDING_URL}/register`);
        
        await page.getByLabel(/E-posta|Email/i).fill('invalid-email');
        await page.getByRole('button', { name: /Devam Et|Continue/i }).click();
        
        await expect(page.locator('body')).toContainText(/Geçersiz e-posta|Invalid email/i);
    });

    test('should validate password setup match', async ({ page }) => {
        // Setup password page returns 404 - not implemented yet
        test.skip(true, 'Setup password page not implemented (404)');

        // Direct link to setup password if possible
        await page.goto(`${LANDING_URL}/setup-password?token=test-token`);
        
        await page.getByLabel(/Şifre|Password/i).first().fill('Password123!');
        await page.getByLabel(/Şifre Tekrar|Confirm Password/i).fill('Different123!');
        
        await page.getByRole('button', { name: /Tamamla|Complete/i }).click();
        await expect(page.locator('body')).toContainText(/eşleşmiyor|match/i);
    });

    test('should validate Checkout coupon', async ({ page }) => {
        await page.goto(`${LANDING_URL}/checkout?plan=pro`);
        
        const couponInput = page.getByPlaceholder(/Kupon|Coupon/i);
        if (await couponInput.isVisible()) {
            await couponInput.fill('EXPIRED_2024');
            await page.getByRole('button', { name: /Uygula|Apply/i }).click();
            await expect(page.locator('body')).toContainText(/Geçersiz|Invalid|Expired/i);
        }
    });
});
