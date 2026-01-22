import { test, expect } from '@playwright/test';

const WEB_URL = process.env.WEB_BASE_URL || 'http://localhost:8080';

test('should login with invalid credentials and show error', async ({ page }) => {
  await page.goto(WEB_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Fill invalid credentials
  await page.fill('input[name="username"]', 'invalid_user');
  await page.fill('input[name="password"]', 'wrongpassword');

  // Submit
  await page.click('button[type="submit"]');

  // Should show error message
  await expect(page.locator('text=/geçersiz|hatalı|başarısız/i')).toBeVisible({ timeout: 5000 });
});

test('should login with valid credentials', async ({ page }) => {
  await page.goto(WEB_URL);

  // Wait for login form
  await expect(page.locator('input[name="username"]')).toBeVisible({ timeout: 10000 });

  // Fill valid credentials
  await page.fill('input[name="username"]', 'admin@x-ear.com'); // Using known admin user
  await page.fill('input[name="password"]', 'admin123');

  // Submit
  await page.click('button[type="submit"]');

  // Should NOT redirect to /dashboard (AuthProvider renders in-place at /)
  // Instead, wait for Dashboard content to appear
  await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Hastalar')).toBeVisible();

  // Check if we're logged in (URL might stay same)
  const url = page.url();
  console.log('After login URL:', url);
});
