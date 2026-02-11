import { Page, expect } from '@playwright/test';

/**
 * Sale Helper Functions for E2E Tests
 * 
 * These helpers provide reusable functions for sale-related test operations.
 */

export interface CreateSaleOptions {
  partyId?: string;
  partyName?: string;
  deviceId?: string;
  deviceName?: string;
  amount?: number;
  paymentMethod?: 'cash' | 'card' | 'promissory_note';
  notes?: string;
}

/**
 * Create a sale from the sales modal
 * @param page - Playwright page object
 * @param options - Sale creation options
 */
export async function createSaleFromModal(page: Page, options: CreateSaleOptions) {
  // Navigate to sales page
  await page.goto('/sales');
  
  // Click "New Sale" button
  await page.click('[data-testid="new-sale-button"]');
  
  // Wait for modal to open
  await expect(page.locator('[data-testid="sale-modal"]')).toBeVisible();
  
  // Fill party information
  if (options.partyName) {
    await page.fill('[data-testid="sale-party-search"]', options.partyName);
    await page.click(`[data-testid="party-option-${options.partyId}"]`);
  }
  
  // Fill device information
  if (options.deviceName) {
    await page.fill('[data-testid="sale-device-search"]', options.deviceName);
    await page.click(`[data-testid="device-option-${options.deviceId}"]`);
  }
  
  // Fill amount
  if (options.amount) {
    await page.fill('[data-testid="sale-amount-input"]', options.amount.toString());
  }
  
  // Select payment method
  if (options.paymentMethod) {
    await page.selectOption('[data-testid="sale-payment-method"]', options.paymentMethod);
  }
  
  // Fill notes
  if (options.notes) {
    await page.fill('[data-testid="sale-notes-input"]', options.notes);
  }
  
  // Submit form
  await page.click('[data-testid="sale-submit-button"]');
  
  // Wait for success toast
  await expect(page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 5000 });
  
  // Return sale ID from toast or URL
  const url = page.url();
  const saleId = url.match(/\/sales\/([^/]+)/)?.[1];
  
  return { saleId };
}

/**
 * Search for a sale by criteria
 * @param page - Playwright page object
 * @param searchTerm - Search term (party name, sale ID, etc.)
 */
export async function searchSale(page: Page, searchTerm: string) {
  await page.goto('/sales');
  
  // Fill search input
  await page.fill('[data-testid="sale-search-input"]', searchTerm);
  
  // Wait for search results
  await page.waitForTimeout(500); // Debounce
  
  // Return first result
  const firstResult = page.locator('[data-testid^="sale-row-"]').first();
  await expect(firstResult).toBeVisible();
  
  return firstResult;
}

/**
 * Delete a sale
 * @param page - Playwright page object
 * @param saleId - Sale ID to delete
 */
export async function deleteSale(page: Page, saleId: string) {
  await page.goto(`/sales/${saleId}`);
  
  // Click delete button
  await page.click('[data-testid="sale-delete-button"]');
  
  // Confirm deletion
  await page.click('[data-testid="confirm-delete-button"]');
  
  // Wait for success toast
  await expect(page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 5000 });
}
