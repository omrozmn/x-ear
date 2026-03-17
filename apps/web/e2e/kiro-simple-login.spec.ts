import { test, expect } from '@playwright/test';

test.describe('Kiro CLI Test - Simple Login', () => {
  test('should login successfully and navigate to dashboard', async ({ page }) => {
    // 1. Navigate to login page
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('domcontentloaded');

    // 2. Fill in credentials
    await page.locator('[data-testid="login-username-input"]').fill('testuser');
    await page.locator('[data-testid="login-password-input"]').fill('Test123!');

    // 3. Click login button
    await page.locator('[data-testid="login-submit-button"]').click();

    // 4. Verify navigation to dashboard
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');
    
    // Additional verification: check page loaded
    await expect(page).toHaveTitle(/Dashboard/i);
  });
});
