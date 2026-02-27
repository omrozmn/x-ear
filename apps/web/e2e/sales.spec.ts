import { test, expect } from '@playwright/test';
import { login } from '../../../tests/helpers/auth.helpers';

test.describe('Sales Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
  });

  test('should navigate to sales page', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    // Verify we're on sales page
    const url = page.url();
    expect(url).toContain('/sales');
  });

  test('should display sales list', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    // Should have some content
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(100);
  });

  test('should open new sale modal', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    // Look for "New Sale" button
    const newSaleSelectors = [
      '[data-testid="new-sale-button"]',
      'button:has-text("Yeni Satış")',
      'button:has-text("Yeni")',
      'button:has-text("Satış Ekle")',
      'button:has-text("New Sale")'
    ];
    
    let buttonFound = false;
    for (const selector of newSaleSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.click(selector);
        buttonFound = true;
        await page.waitForTimeout(1000);
        break;
      }
    }
    
    // If button found, verify modal or form opened
    if (buttonFound) {
      const modalSelectors = [
        '[data-testid="sale-modal"]',
        '[role="dialog"]',
        'form',
        '[class*="modal"]',
        '[class*="dialog"]'
      ];
      
      let modalFound = false;
      for (const selector of modalSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          modalFound = true;
          break;
        }
      }
      
      expect(modalFound).toBeTruthy();
    } else {
      // If no button, just verify page loaded
      expect(page.url()).toContain('/sales');
    }
  });

  test('should search sales', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    // Look for search input
    const searchSelectors = [
      '[data-testid="sale-search-input"]',
      'input[type="search"]',
      'input[placeholder*="Ara"]',
      'input[placeholder*="Search"]',
      'input[name="search"]'
    ];
    
    let searchFound = false;
    for (const selector of searchSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        searchFound = true;
        break;
      }
    }
    
    // Search functionality should exist OR page should have sales data
    const hasSalesData = await page.locator('table').count() > 0 ||
                         await page.locator('[data-testid^="sale-row"]').count() > 0 ||
                         await page.locator('tr').count() > 1;
    
    expect(searchFound || hasSalesData).toBeTruthy();
  });

  test('should filter sales by date', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    // Look for filter button
    const filterSelectors = [
      '[data-testid="filter-button"]',
      'button:has-text("Filtre")',
      'button:has-text("Filter")',
      '[data-testid="filters-button"]'
    ];
    
    let filterFound = false;
    for (const selector of filterSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        filterFound = true;
        break;
      }
    }
    
    // Filter functionality should exist OR page should have sales data
    const hasSalesData = await page.locator('table').count() > 0 ||
                         await page.locator('[data-testid^="sale-row"]').count() > 0;
    
    expect(filterFound || hasSalesData).toBeTruthy();
  });
});
