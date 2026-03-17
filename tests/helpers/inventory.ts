import { Page } from '@playwright/test';
import { waitForModalOpen, waitForModalClose, waitForToast, waitForApiCall } from './wait.helper';

/**
 * Inventory Helper Functions
 * 
 * Provides inventory management utilities for E2E tests
 */

export interface InventoryItemData {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  minimumStock?: number;
  description?: string;
}

/**
 * Add inventory item
 * 
 * @param page - Playwright page object
 * @param data - Inventory item data
 * @returns Item ID
 */
export async function addInventoryItem(
  page: Page,
  data: InventoryItemData
): Promise<string> {
  await page.goto('/inventory');
  await page.locator('[data-testid="inventory-add-button"]').click();
  
  await waitForModalOpen(page, 'inventory-modal');
  
  // Fill form
  await page.locator('[data-testid="inventory-name-input"]').fill(data.name);
  await page.locator('[data-testid="inventory-category-select"]').click();
  await page.locator(`[data-testid="category-option-${data.category}"]`).click();
  await page.locator('[data-testid="inventory-quantity-input"]').fill(data.quantity.toString());
  await page.locator('[data-testid="inventory-price-input"]').fill(data.unitPrice.toString());
  
  if (data.minimumStock) {
    await page.locator('[data-testid="inventory-minimum-stock-input"]').fill(data.minimumStock.toString());
  }
  
  if (data.description) {
    await page.locator('[data-testid="inventory-description-input"]').fill(data.description);
  }
  
  // Submit
  await page.locator('[data-testid="inventory-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'inventory-modal');
  
  // Extract item ID
  const response = await page.waitForResponse(
    r => r.url().includes('/inventory') && r.status() === 201
  );
  const body = await response.json();
  return body.data.id;
}

/**
 * Update inventory item
 * 
 * @param page - Playwright page object
 * @param itemId - Item ID
 * @param data - Updated data
 */
export async function updateInventoryItem(
  page: Page,
  itemId: string,
  data: Partial<InventoryItemData>
): Promise<void> {
  await page.goto(`/inventory/${itemId}`);
  await page.locator('[data-testid="inventory-edit-button"]').click();
  
  await waitForModalOpen(page, 'inventory-modal');
  
  if (data.name) {
    await page.locator('[data-testid="inventory-name-input"]').fill(data.name);
  }
  
  if (data.quantity !== undefined) {
    await page.locator('[data-testid="inventory-quantity-input"]').fill(data.quantity.toString());
  }
  
  if (data.unitPrice !== undefined) {
    await page.locator('[data-testid="inventory-price-input"]').fill(data.unitPrice.toString());
  }
  
  // Submit
  await page.locator('[data-testid="inventory-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'inventory-modal');
}

/**
 * Delete inventory item
 * 
 * @param page - Playwright page object
 * @param itemId - Item ID
 */
export async function deleteInventoryItem(
  page: Page,
  itemId: string
): Promise<void> {
  await page.goto(`/inventory/${itemId}`);
  await page.locator('[data-testid="inventory-delete-button"]').click();
  
  // Confirm deletion
  await page.locator('[data-testid="confirm-delete-button"]').click();
  await waitForToast(page, 'success');
}

/**
 * Stock in operation
 * 
 * @param page - Playwright page object
 * @param itemId - Item ID
 * @param quantity - Quantity to add
 */
export async function stockIn(
  page: Page,
  itemId: string,
  quantity: number
): Promise<void> {
  await page.goto(`/inventory/${itemId}`);
  await page.locator('[data-testid="inventory-stock-in-button"]').click();
  
  await waitForModalOpen(page, 'stock-in-modal');
  
  await page.locator('[data-testid="stock-in-quantity-input"]').fill(quantity.toString());
  await page.locator('[data-testid="stock-in-submit-button"]').click();
  
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'stock-in-modal');
}

/**
 * Stock out operation
 * 
 * @param page - Playwright page object
 * @param itemId - Item ID
 * @param quantity - Quantity to remove
 */
export async function stockOut(
  page: Page,
  itemId: string,
  quantity: number
): Promise<void> {
  await page.goto(`/inventory/${itemId}`);
  await page.locator('[data-testid="inventory-stock-out-button"]').click();
  
  await waitForModalOpen(page, 'stock-out-modal');
  
  await page.locator('[data-testid="stock-out-quantity-input"]').fill(quantity.toString());
  await page.locator('[data-testid="stock-out-submit-button"]').click();
  
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'stock-out-modal');
}

/**
 * Search inventory
 * 
 * @param page - Playwright page object
 * @param query - Search query
 */
export async function searchInventory(
  page: Page,
  query: string
): Promise<void> {
  await page.goto('/inventory');
  await page.locator('[data-testid="inventory-search-input"]').fill(query);
  await page.locator('[data-testid="inventory-search-button"]').click();
  await waitForApiCall(page, '/inventory', 'GET');
}

/**
 * Filter inventory by category
 * 
 * @param page - Playwright page object
 * @param category - Category name
 */
export async function filterInventoryByCategory(
  page: Page,
  category: string
): Promise<void> {
  await page.goto('/inventory');
  await page.locator('[data-testid="inventory-category-filter"]').click();
  await page.locator(`[data-testid="category-option-${category}"]`).click();
  await waitForApiCall(page, '/inventory', 'GET');
}

/**
 * Check stock alert
 * 
 * @param page - Playwright page object
 * @returns True if stock alert is visible
 */
export async function hasInventoryStockAlert(page: Page): Promise<boolean> {
  await page.goto('/inventory');
  try {
    await page.locator('[data-testid="inventory-stock-alert"]').waitFor({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Export inventory
 * 
 * @param page - Playwright page object
 * @param format - Export format (excel, csv)
 */
export async function exportInventory(
  page: Page,
  format: 'excel' | 'csv' = 'excel'
): Promise<void> {
  await page.goto('/inventory');
  await page.locator('[data-testid="inventory-export-button"]').click();
  await page.locator(`[data-testid="export-format-${format}"]`).click();
  
  // Wait for download
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-testid="export-confirm-button"]').click();
  const download = await downloadPromise;
  await download.saveAs(`./test-results/inventory-export.${format === 'excel' ? 'xlsx' : 'csv'}`);
}
