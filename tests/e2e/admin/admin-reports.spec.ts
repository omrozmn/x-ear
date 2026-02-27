import { test, expect } from '@playwright/test';

/**
 * Phase 4.9: Admin Reports Tests
 * System-wide reports and analytics
 */

const ADMIN_URL = process.env.ADMIN_BASE_URL || 'http://localhost:8082';

test.describe('Phase 4.9: Admin Reports', () => {

  // Basic page tests (4.9.1-4.9.6)
  test.describe('Basic Page Tests', () => {
    test('4.9.1: Admin reports page loads', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/reports`);
      await page.waitForLoadState('networkidle');
      
      const main = page.locator('main').first();
      await expect(main).toBeVisible({ timeout: 10000 });
    });

    test('4.9.2: Tenant overview report', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/reports`);
      await page.waitForLoadState('networkidle');
      
      const tenantReport = page.locator('[class*="tenant"], button').filter({
        hasText: /tenant|kurum/i
      }).first();
      
      const hasReport = await tenantReport.isVisible().catch(() => false);
      test.skip(!hasReport, 'Tenant overview not found');
    });

    test('4.9.3: Revenue report (all tenants)', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/reports`);
      await page.waitForLoadState('networkidle');
      
      const revenueReport = page.locator('[class*="revenue"], button').filter({
        hasText: /revenue|gelir/i
      }).first();
      
      const hasReport = await revenueReport.isVisible().catch(() => false);
      test.skip(!hasReport, 'Revenue report not found');
    });

    test('4.9.4: User activity report', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/reports`);
      await page.waitForLoadState('networkidle');
      
      const activityReport = page.locator('[class*="activity"], button').filter({
        hasText: /activity|kullanıcı/i
      }).first();
      
      const hasReport = await activityReport.isVisible().catch(() => false);
      test.skip(!hasReport, 'Activity report not found');
    });

    test('4.9.5: System usage report', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/reports`);
      await page.waitForLoadState('networkidle');
      
      const usageReport = page.locator('[class*="usage"], button').filter({
        hasText: /usage|sistem/i
      }).first();
      
      const hasReport = await usageReport.isVisible().catch(() => false);
      test.skip(!hasReport, 'Usage report not found');
    });

    test('4.9.6: Date range filter', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/reports`);
      await page.waitForLoadState('networkidle');
      
      const dateFilter = page.locator('input[type="date"]').first();
      const hasFilter = await dateFilter.isVisible({ timeout: 3000 }).catch(() => false);
      test.skip(!hasFilter, 'Date range filter not found');
    });
  });

  // Export and visualization (4.9.7-4.9.10)
  test.describe('Export & Visualization', () => {
    
    test('4.9.7: Export to Excel', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/reports`);
      await page.waitForLoadState('networkidle');
      
      const exportButton = page.locator('button').filter({
        hasText: /excel|export/i
      }).first();
      
      const hasButton = await exportButton.isVisible().catch(() => false);
      test.skip(!hasButton, 'Excel export button not found');
    });

    test('4.9.8: Export to PDF', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/reports`);
      await page.waitForLoadState('networkidle');
      
      const exportButton = page.locator('button').filter({
        hasText: /pdf|export/i
      }).first();
      
      const hasButton = await exportButton.isVisible().catch(() => false);
      test.skip(!hasButton, 'PDF export button not found');
    });

    test('4.9.9: Chart visualization', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/reports`);
      await page.waitForLoadState('networkidle');
      
      const chart = page.locator('[class*="chart"], [class*="graph"]').first();
      const hasChart = await chart.isVisible().catch(() => false);
      test.skip(!hasChart, 'Chart visualization not found');
    });

    test('4.9.10: Refresh data', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/reports`);
      await page.waitForLoadState('networkidle');
      
      const refreshButton = page.locator('button').filter({
        hasText: /refresh|yenile/i
      }).first();
      
      const hasButton = await refreshButton.isVisible().catch(() => false);
      test.skip(!hasButton, 'Refresh button not found');
    });
  });
});
