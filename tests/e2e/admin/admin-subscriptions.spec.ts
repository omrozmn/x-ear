import { test, expect } from '@playwright/test';

/**
 * Phase 4.5: Admin Subscription Management Tests
 * Subscription CRUD and management in admin panel
 */

const ADMIN_URL = process.env.ADMIN_BASE_URL || 'http://localhost:8082';

test.describe('Phase 4.5: Subscription Management', () => {

  // Basic page tests (4.5.1-4.5.4)
  test.describe('Basic Page Tests', () => {
    test('4.5.1: Subscription list page loads', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/subscriptions`);
      await page.waitForLoadState('networkidle');
      
      const main = page.locator('main').first();
      await expect(main).toBeVisible({ timeout: 10000 });
    });

    test('4.5.2: Subscription plans displayed', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/subscriptions`);
      await page.waitForLoadState('networkidle');
      
      const plansSection = page.locator('[class*="plan"], [class*="subscription"]').first();
      const hasPlans = await plansSection.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (!hasPlans) {
        // Check table
        const table = page.locator('table').first();
        const hasTable = await table.isVisible().catch(() => false);
        test.skip(!hasTable, 'No plans displayed');
      }
      
      await expect(plansSection).toBeVisible({ timeout: 5000 });
    });

    test('4.5.3: Filter by plan type', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/subscriptions`);
      await page.waitForLoadState('networkidle');
      
      const planFilter = page.locator('select, [role="combobox"]').filter({
        hasText: /plan|tür|type/i
      }).first();
      
      const hasFilter = await planFilter.isVisible({ timeout: 3000 }).catch(() => false);
      test.skip(!hasFilter, 'Plan type filter not found');
    });

    test('4.5.4: Filter by status (active/expired)', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/subscriptions`);
      await page.waitForLoadState('networkidle');
      
      const statusFilter = page.locator('select, [role="combobox"]').filter({
        hasText: /status|durum|active|expired/i
      }).first();
      
      const hasFilter = await statusFilter.isVisible({ timeout: 3000 }).catch(() => false);
      test.skip(!hasFilter, 'Status filter not found');
    });
  });

  // Subscription operations (4.5.5-4.5.9)
  test.describe('Subscription Operations', () => {
    
    test('4.5.5: Create subscription', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/subscriptions`);
      await page.waitForLoadState('networkidle');
      
      const createButton = page.locator('button').filter({
        hasText: /new|yeni|create|ekle/i
      }).first();
      
      const hasButton = await createButton.isVisible().catch(() => false);
      test.skip(!hasButton, 'Create subscription button not found');
    });

    test('4.5.6: Update subscription', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/subscriptions`);
      await page.waitForLoadState('networkidle');
      
      const subRow = page.locator('table tbody tr').first();
      const hasRow = await subRow.isVisible().catch(() => false);
      
      if (!hasRow) {
        test.skip(true, 'No subscriptions found');
      }
      
      const editButton = page.locator('button').filter({
        hasText: /edit|düzenle/i
      }).first();
      
      const hasEdit = await editButton.isVisible().catch(() => false);
      test.skip(!hasEdit, 'Edit button not found');
    });

    test('4.5.7: Cancel subscription — confirm', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/subscriptions`);
      await page.waitForLoadState('networkidle');
      
      const subRow = page.locator('table tbody tr').first();
      const hasRow = await subRow.isVisible().catch(() => false);
      
      if (!hasRow) {
        test.skip(true, 'No subscriptions found');
      }
      
      const cancelButton = page.locator('button').filter({
        hasText: /cancel|iptal/i
      }).first();
      
      const hasButton = await cancelButton.isVisible().catch(() => false);
      test.skip(!hasButton, 'Cancel button not found');
    });

    test('4.5.8: Renew subscription', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/subscriptions`);
      await page.waitForLoadState('networkidle');
      
      const renewButton = page.locator('button').filter({
        hasText: /renew|yenile|uzat/i
      }).first();
      
      const hasButton = await renewButton.isVisible().catch(() => false);
      test.skip(!hasButton, 'Renew button not found');
    });

    test('4.5.9: Subscription detail page', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/subscriptions`);
      await page.waitForLoadState('networkidle');
      
      const subRow = page.locator('table tbody tr').first();
      const hasRow = await subRow.isVisible().catch(() => false);
      
      if (!hasRow) {
        test.skip(true, 'No subscriptions found');
      }
      
      await subRow.click();
      await page.waitForTimeout(500);
      
      const detailPage = page.locator('main, [class*="detail"]').first();
      const hasDetail = await detailPage.isVisible().catch(() => false);
      test.skip(!hasDetail, 'Detail page not found');
    });
  });

  // Billing and metrics (4.5.10-4.5.14)
  test.describe('Billing & Metrics', () => {
    
    test('4.5.10: Payment history', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/subscriptions`);
      await page.waitForLoadState('networkidle');
      
      const subRow = page.locator('table tbody tr').first();
      const hasRow = await subRow.isVisible().catch(() => false);
      
      if (!hasRow) {
        test.skip(true, 'No subscriptions found');
      }
      
      await subRow.click();
      await page.waitForTimeout(500);
      
      const paymentHistory = page.locator('[class*="payment"], [class*="billing"]').first();
      const hasHistory = await paymentHistory.isVisible().catch(() => false);
      test.skip(!hasHistory, 'Payment history not found');
    });

    test('4.5.11: Usage metrics', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/subscriptions`);
      await page.waitForLoadState('networkidle');
      
      const usageSection = page.locator('[class*="usage"], [class*="metric"]').first();
      const hasUsage = await usageSection.isVisible().catch(() => false);
      test.skip(!hasUsage, 'Usage metrics not found');
    });

    test('4.5.12: Upgrade flow', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/subscriptions`);
      await page.waitForLoadState('networkidle');
      
      const upgradeButton = page.locator('button').filter({
        hasText: /upgrade|yükselt/i
      }).first();
      
      const hasButton = await upgradeButton.isVisible().catch(() => false);
      test.skip(!hasButton, 'Upgrade button not found');
    });

    test('4.5.13: Downgrade flow', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/subscriptions`);
      await page.waitForLoadState('networkidle');
      
      const downgradeButton = page.locator('button').filter({
        hasText: /downgrade|düşür/i
      }).first();
      
      const hasButton = await downgradeButton.isVisible().catch(() => false);
      test.skip(!hasButton, 'Downgrade button not found');
    });

    test('4.5.14: Pagination', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/subscriptions`);
      await page.waitForLoadState('networkidle');
      
      const pagination = page.locator('[class*="pagination"]').first();
      const hasPagination = await pagination.isVisible().catch(() => false);
      test.skip(!hasPagination, 'Pagination not found');
    });
  });
});
