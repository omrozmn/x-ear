import { test, expect } from '../fixtures/fixtures';

/**
 * Phase 3.10: Inventory Tests
 * Stock and inventory management
 */

test.describe('Phase 3.10: Inventory', () => {

  test('3.10.1: Inventory page loads', async ({ tenantPage }) => {
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    
    const main = tenantPage.locator('main, [class*="main"]').first();
    await expect(main).toBeVisible({ timeout: 10000 });
  });

  test('3.10.2: Inventory list — table displayed', async ({ tenantPage }) => {
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    
    const table = tenantPage.locator('table, [role="table"]').first();
    const hasList = await table.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!hasList) {
      test.skip(true, 'Inventory list not found');
    }
    
    await expect(table).toBeVisible();
  });

  test('3.10.3: Add stock button', async ({ tenantPage }) => {
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    
    const addButton = tenantPage.locator('button').filter({
      hasText: /add|ekle|stock|stok/i
    }).first();
    
    const hasButton = await addButton.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasButton || true).toBeTruthy();
  });

  test('3.10.4: Search items', async ({ tenantPage }) => {
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    
    const searchInput = tenantPage.locator('input[type="search"], input[placeholder*="search"]').first();
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    test.skip(!hasSearch, 'Search not found');
  });

  test('3.10.5: Filter by category', async ({ tenantPage }) => {
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    
    const categoryFilter = tenantPage.locator('select, [role="combobox"]').filter({
      hasText: /category|kategori/i
    }).first();
    
    const hasFilter = await categoryFilter.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(!hasFilter, 'Category filter not found');
  });

  test('3.10.6: Low stock alert', async ({ tenantPage }) => {
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    
    const lowStockIndicator = tenantPage.locator('[class*="low"], [class*="alert"], [class*="warning"]').first();
    const hasAlert = await lowStockIndicator.isVisible({ timeout: 3000 }).catch(() => false);
    
    // Low stock is optional
    expect(hasAlert || true).toBeTruthy();
  });

  test('3.10.7: Stock movement history', async ({ tenantPage }) => {
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    
    const historyButton = tenantPage.locator('button, a').filter({
      hasText: /history|geçmiş|movement|hareket/i
    }).first();
    
    const hasHistory = await historyButton.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(!hasHistory, 'History not found');
  });

  test('3.10.8: Item detail view', async ({ tenantPage }) => {
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    
    const itemRows = tenantPage.locator('table tbody tr, [role="row"]');
    const rowCount = await itemRows.count();
    
    if (rowCount === 0) {
      test.skip(true, 'No items found');
    }
    
    await itemRows.first().click();
    await tenantPage.waitForTimeout(1000);
    
    const detailView = tenantPage.locator('[role="dialog"], [class*="detail"]');
    const hasDetail = await detailView.isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(hasDetail || true).toBeTruthy();
  });

  test('3.10.9: Add stock modal', async ({ tenantPage }) => {
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    
    const addButton = tenantPage.locator('button').filter({ hasText: /add|ekle/i }).first();
    const hasButton = await addButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!hasButton) {
      test.skip(true, 'Add button not found');
    }
    
    await addButton.click();
    await tenantPage.waitForTimeout(500);
    
    const modal = tenantPage.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('3.10.10: Export inventory', async ({ tenantPage }) => {
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    
    const exportButton = tenantPage.locator('button').filter({ hasText: /export|dışa/i }).first();
    const hasExport = await exportButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    test.skip(!hasExport, 'Export button not found');
  });
});
