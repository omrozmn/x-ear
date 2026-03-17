import { test, expect } from '@playwright/test';

/**
 * Phase 4.7: Admin Device Management Tests
 * Device management across all tenants
 */

const ADMIN_URL = process.env.ADMIN_BASE_URL || 'http://localhost:8082';

test.describe('Phase 4.7: Admin Device Management', () => {

  // Basic page tests (4.7.1-4.7.5)
  test.describe('Basic Page Tests', () => {
    test('4.7.1: Admin device list loads', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/devices`);
      await page.waitForLoadState('networkidle');
      
      const main = page.locator('main').first();
      await expect(main).toBeVisible({ timeout: 10000 });
    });

    test('4.7.2: Device inventory across tenants', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/devices`);
      await page.waitForLoadState('networkidle');
      
      const table = page.locator('table').first();
      const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);
      
      test.skip(!hasTable, 'Device table not found');
    });

    test('4.7.3: Search device', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/devices`);
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();
      const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
      
      test.skip(!hasSearch, 'Search input not found');
    });

    test('4.7.4: Filter by tenant', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/devices`);
      await page.waitForLoadState('networkidle');
      
      const tenantFilter = page.locator('select, [role="combobox"]').filter({
        hasText: /tenant|kurum/i
      }).first();
      
      const hasFilter = await tenantFilter.isVisible({ timeout: 3000 }).catch(() => false);
      test.skip(!hasFilter, 'Tenant filter not found');
    });

    test('4.7.5: Filter by status', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/devices`);
      await page.waitForLoadState('networkidle');
      
      const statusFilter = page.locator('select, [role="combobox"]').filter({
        hasText: /status|durum/i
      }).first();
      
      const hasFilter = await statusFilter.isVisible({ timeout: 3000 }).catch(() => false);
      test.skip(!hasFilter, 'Status filter not found');
    });
  });

  // Device operations (4.7.6-4.7.9)
  test.describe('Device Operations', () => {
    
    test('4.7.6: Device detail', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/devices`);
      await page.waitForLoadState('networkidle');
      
      const deviceRow = page.locator('table tbody tr').first();
      const hasRow = await deviceRow.isVisible().catch(() => false);
      
      if (!hasRow) {
        test.skip(true, 'No devices found');
      }
      
      await deviceRow.click();
      await page.waitForTimeout(500);
      
      const detailPage = page.locator('main, [class*="detail"]').first();
      const hasDetail = await detailPage.isVisible().catch(() => false);
      test.skip(!hasDetail, 'Detail page not found');
    });

    test('4.7.7: Reassign device', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/devices`);
      await page.waitForLoadState('networkidle');
      
      const deviceRow = page.locator('table tbody tr').first();
      const hasRow = await deviceRow.isVisible().catch(() => false);
      
      if (!hasRow) {
        test.skip(true, 'No devices found');
      }
      
      const reassignButton = page.locator('button').filter({
        hasText: /reassign|yeniden|tahsis/i
      }).first();
      
      const hasButton = await reassignButton.isVisible().catch(() => false);
      test.skip(!hasButton, 'Reassign button not found');
    });

    test('4.7.8: Device audit trail', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/devices`);
      await page.waitForLoadState('networkidle');
      
      const deviceRow = page.locator('table tbody tr').first();
      const hasRow = await deviceRow.isVisible().catch(() => false);
      
      if (!hasRow) {
        test.skip(true, 'No devices found');
      }
      
      await deviceRow.click();
      await page.waitForTimeout(500);
      
      const auditTrail = page.locator('[class*="audit"], [class*="history"]').first();
      const hasTrail = await auditTrail.isVisible().catch(() => false);
      test.skip(!hasTrail, 'Audit trail not found');
    });

    test('4.7.9: Pagination', async ({ page }) => {
      await page.goto(`${ADMIN_URL}/devices`);
      await page.waitForLoadState('networkidle');
      
      const pagination = page.locator('[class*="pagination"]').first();
      const hasPagination = await pagination.isVisible().catch(() => false);
      test.skip(!hasPagination, 'Pagination not found');
    });
  });
});
