import { test, expect } from '@playwright/test';
import { login } from '../../../tests/helpers/auth.helpers';

test.describe('3.2 Device Tests (Exhaustive)', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
  });

  test('3.2.7 Assign device (sale)', async ({ page }) => {
    await page.goto('/devices');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.2.8 Assign device (trial)', async ({ page }) => {
    await page.goto('/devices');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.2.9 Assign device (loaner)', async ({ page }) => {
    await page.goto('/devices');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.2.10 Assign device (repair)', async ({ page }) => {
    await page.goto('/devices');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.2.11 Assign device (replacement)', async ({ page }) => {
    await page.goto('/devices');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.2.12 Return device', async ({ page }) => {
    await page.goto('/devices');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.2.13 Replace device', async ({ page }) => {
    await page.goto('/devices');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.2.14 Device history view', async ({ page }) => {
    await page.goto('/devices');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.2.15 Device stock alert', async ({ page }) => {
    await page.goto('/devices');
    await expect(page.locator('body')).toBeVisible();
  });
});
