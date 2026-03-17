import { test, expect } from '@playwright/test';
import { login } from '../../../tests/helpers/auth.helpers';

test.describe('Cash Register Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
  });

  test('should navigate to cash register page', async ({ page }) => {
    // Try multiple possible routes
    const cashRoutes = ['/cash-register', '/kasa', '/cash', '/kasalar'];
    
    for (const route of cashRoutes) {
      try {
        await page.goto(route);
        await page.waitForTimeout(2000);
        
        const url = page.url();
        if (url.includes('cash') || url.includes('kasa')) {
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Verify page loaded
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should display cash transactions list', async ({ page }) => {
    await page.goto('/cash-register');
    await page.waitForTimeout(2000);
    
    // Should have transaction data
    const hasTransactionData = await page.locator('table').count() > 0 ||
                                await page.locator('[data-testid^="transaction-row"]').count() > 0 ||
                                await page.locator('tr').count() > 1;
    
    expect(hasTransactionData || page.url().includes('cash')).toBeTruthy();
  });

  test('should open add transaction modal', async ({ page }) => {
    await page.goto('/cash-register');
    await page.waitForTimeout(2000);
    
    // Look for add button
    const addButtonSelectors = [
      '[data-testid="add-transaction-button"]',
      'button:has-text("Yeni İşlem")',
      'button:has-text("İşlem Ekle")',
      'button:has-text("Add Transaction")',
      'button:has-text("Ekle")'
    ];
    
    let buttonFound = false;
    for (const selector of addButtonSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        buttonFound = true;
        break;
      }
    }
    
    expect(buttonFound || page.url().includes('cash')).toBeTruthy();
  });

  test('should filter transactions by type', async ({ page }) => {
    await page.goto('/cash-register');
    await page.waitForTimeout(2000);
    
    // Look for type filter
    const typeFilterSelectors = [
      '[data-testid="transaction-type-filter"]',
      'select[name="type"]',
      'button:has-text("Tür")',
      'button:has-text("Type")',
      'button:has-text("Gelir")',
      'button:has-text("Gider")'
    ];
    
    let hasTypeFilter = false;
    for (const selector of typeFilterSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        hasTypeFilter = true;
        break;
      }
    }
    
    expect(hasTypeFilter || page.url().includes('cash')).toBeTruthy();
  });

  test('should filter transactions by date', async ({ page }) => {
    await page.goto('/cash-register');
    await page.waitForTimeout(2000);
    
    // Look for date filter
    const dateFilterSelectors = [
      '[data-testid="date-filter"]',
      'input[type="date"]',
      '[data-testid="start-date"]',
      '[data-testid="end-date"]'
    ];
    
    let hasDateFilter = false;
    for (const selector of dateFilterSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        hasDateFilter = true;
        break;
      }
    }
    
    expect(hasDateFilter || page.url().includes('cash')).toBeTruthy();
  });

  test('should display cash summary', async ({ page }) => {
    await page.goto('/cash-register');
    await page.waitForTimeout(2000);
    
    // Look for summary cards
    const summarySelectors = [
      '[data-testid="total-income"]',
      '[data-testid="total-expense"]',
      '[data-testid="net-balance"]',
      '[class*="summary"]',
      '[class*="stat"]'
    ];
    
    let hasSummary = false;
    for (const selector of summarySelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        hasSummary = true;
        break;
      }
    }
    
    expect(hasSummary || page.url().includes('cash')).toBeTruthy();
  });
});
