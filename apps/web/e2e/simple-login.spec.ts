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
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Fill valid credentials
  await page.fill('input[name="username"]', 'testuser');
  await page.fill('input[name="password"]', 'testpass123');

  // Submit
  await page.click('button[type="submit"]');

  // Should redirect or show dashboard
  await page.waitForTimeout(3000);
  
  // Check if we're logged in (URL changed or dashboard visible)
  const url = page.url();
  console.log('After login URL:', url);
  
  // Should not be on login page anymore
  expect(url).not.toContain('/login');
});
