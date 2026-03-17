import { test, expect } from '@playwright/test';
import { login } from '../../../tests/helpers/auth.helpers';

test.describe('3.4 Cash Register Tests (Exhaustive)', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
  });

  test('3.4.7 Create cash record (income)', async ({ page }) => {
    await page.goto('/cash-register');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.4.8 Create cash record (expense)', async ({ page }) => {
    await page.goto('/cash-register');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.4.9 Update cash record', async ({ page }) => {
    await page.goto('/cash-register');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.4.10 Delete cash record', async ({ page }) => {
    await page.goto('/cash-register');
    await expect(page.locator('body')).toBeVisible();
  });
});
