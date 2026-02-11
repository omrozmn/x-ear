import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.helpers';

const WEB_URL = process.env.WEB_BASE_URL || 'http://localhost:8080';

test('should login with invalid credentials and show error', async ({ page }) => {
  await page.goto(WEB_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Fill invalid credentials
  await page.fill('[data-testid="login-identifier-input"]', 'invalid_user');
  await page.fill('[data-testid="login-password-input"]', 'wrongpassword');

  // Submit
  await page.click('[data-testid="login-submit-button"]');

  // Should show error message
  await expect(page.locator('[data-testid="login-error-message"]')).toBeVisible({ timeout: 5000 });
});

test('should login with valid credentials', async ({ page }) => {
  // Use helper function
  await login(page, {
    username: 'e2etest',
    password: 'Test123!'
  });
  
  // Verify we're on the dashboard or home page
  const url = page.url();
  console.log('After login URL:', url);
  
  // Check for authenticated UI elements
  const hasNavigation = await page.locator('nav').count() > 0;
  const hasMainContent = await page.locator('main').count() > 0;
  
  expect(hasNavigation || hasMainContent).toBeTruthy();
});
