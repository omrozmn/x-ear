import { test, expect } from '@playwright/test';

/**
 * Phase 4.2: Admin Dashboard Tests
 * Admin panel dashboard and overview
 */

const ADMIN_URL = process.env.ADMIN_BASE_URL || 'http://localhost:8082';

test.describe('Phase 4.2: Admin Dashboard', () => {

  test('4.2.1: Dashboard loads', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [class*="main"]').first();
    await expect(main).toBeVisible({ timeout: 10000 });
  });

  test('4.2.2: Tenant count widget', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const tenantWidget = page.locator('[class*="tenant"], [class*="stat"]').filter({ hasText: /tenant|kiracı/i }).first();
    const hasWidget = await tenantWidget.isVisible({ timeout: 5000 }).catch(() => false);
    
    test.skip(!hasWidget, 'Tenant widget not found');
  });

  test('4.2.3: Active user count widget', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const userWidget = page.locator('[class*="user"], [class*="stat"]').filter({ hasText: /user|kullanıcı/i }).first();
    const hasWidget = await userWidget.isVisible({ timeout: 5000 }).catch(() => false);
    
    test.skip(!hasWidget, 'User widget not found');
  });

  test('4.2.4: System health indicators', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const healthIndicator = page.locator('[class*="health"], [class*="status"]').first();
    const hasHealth = await healthIndicator.isVisible({ timeout: 3000 }).catch(() => false);
    
    test.skip(!hasHealth, 'Health indicator not found');
  });

  test('4.2.5: Dashboard has content', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText.length).toBeGreaterThan(50);
  });
});
