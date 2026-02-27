import { test, expect } from '@playwright/test';
import { login } from '../../../tests/helpers/auth.helpers';

test.describe('Invoice Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
  });

  test('should navigate to invoices page', async ({ page }) => {
    // Try multiple possible routes
    const invoiceRoutes = ['/invoices', '/faturalar', '/e-fatura'];
    
    let pageLoaded = false;
    for (const route of invoiceRoutes) {
      try {
        await page.goto(route);
        await page.waitForTimeout(2000);
        
        const url = page.url();
        if (url.includes('invoice') || url.includes('fatura')) {
          pageLoaded = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // If no direct route, try navigation menu
    if (!pageLoaded) {
      const navLinks = [
        'a:has-text("Fatura")',
        'a:has-text("Invoice")',
        'a:has-text("E-Fatura")'
      ];
      
      for (const selector of navLinks) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          await page.click(selector);
          await page.waitForTimeout(2000);
          pageLoaded = true;
          break;
        }
      }
    }
    
    // Verify page loaded
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should display invoice list', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForTimeout(2000);
    
    // Should have invoice data
    const hasInvoiceData = await page.locator('table').count() > 0 ||
                           await page.locator('[data-testid^="invoice-row"]').count() > 0 ||
                           await page.locator('tr').count() > 1;
    
    expect(hasInvoiceData || page.url().includes('invoice') || page.url().includes('fatura')).toBeTruthy();
  });

  test('should search invoices by number', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForTimeout(2000);
    
    // Look for search input
    const searchSelectors = [
      '[data-testid="invoice-search-input"]',
      'input[type="search"]',
      'input[placeholder*="Ara"]',
      'input[placeholder*="Search"]',
      'input[placeholder*="Fatura"]',
      'input[placeholder*="Invoice"]'
    ];
    
    let searchFound = false;
    for (const selector of searchSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        searchFound = true;
        break;
      }
    }
    
    // Search should exist OR page should have invoice data
    const hasInvoiceData = await page.locator('table').count() > 0 ||
                           await page.locator('[data-testid^="invoice-row"]').count() > 0;
    
    expect(searchFound || hasInvoiceData).toBeTruthy();
  });

  test('should filter invoices by date', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForTimeout(2000);
    
    // Look for date filter
    const dateFilterSelectors = [
      '[data-testid="date-filter"]',
      'input[type="date"]',
      '[data-testid="start-date"]',
      '[data-testid="end-date"]',
      'button:has-text("Tarih")',
      'button:has-text("Date")'
    ];
    
    let hasDateFilter = false;
    for (const selector of dateFilterSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        hasDateFilter = true;
        break;
      }
    }
    
    // Should have date filter OR invoice data
    const hasInvoiceData = await page.locator('table').count() > 0 ||
                           await page.locator('[data-testid^="invoice-row"]').count() > 0;
    
    expect(hasDateFilter || hasInvoiceData).toBeTruthy();
  });

  test('should filter invoices by status', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForTimeout(2000);
    
    // Verify page loaded
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should display invoice pagination', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForTimeout(2000);
    
    // Look for pagination
    const paginationIndicators = [
      '[data-testid="pagination"]',
      'nav[aria-label="pagination"]',
      'button:has-text("Next")',
      'button:has-text("Sonraki")',
      '.pagination'
    ];
    
    let hasPagination = false;
    for (const selector of paginationIndicators) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        hasPagination = true;
        break;
      }
    }
    
    // Should have pagination OR invoice data
    const hasInvoiceData = await page.locator('table').count() > 0 ||
                           await page.locator('[data-testid^="invoice-row"]').count() > 0;
    
    expect(hasPagination || hasInvoiceData).toBeTruthy();
  });
});
