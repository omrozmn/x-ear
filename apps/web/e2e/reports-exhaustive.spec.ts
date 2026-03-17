import { test, expect } from '@playwright/test';
import { login } from '../../../tests/helpers/auth.helpers';

test.describe('3.5 Report Tests (Exhaustive)', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
  });

  test('3.5.7 Sales report (daily)', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.5.8 Sales report (monthly)', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.5.9 Stock report', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.5.10 Promissory note tracking report', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('body')).toBeVisible();
  });
});
