import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  stockIn,
  stockOut,
  searchInventory,
  filterInventoryByCategory,
  hasInventoryStockAlert,
  exportInventory
} from '../../helpers/inventory';
import { waitForApiCall } from '../../helpers/wait';

test.describe('Inventory Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('INVENTORY-001: Add inventory item', async ({ page }) => {
    // Act: Add new inventory item
    const itemId = await addInventoryItem(page, {
      name: 'Hearing Aid Batteries',
      category: 'accessories',
      quantity: 100,
      unitPrice: 50,
      minimumStock: 20,
      description: 'Size 312 batteries'
    });

    // Assert: Item added successfully
    expect(itemId).toBeTruthy();
    await page.goto(`/inventory/${itemId}`);
    await expect(page.locator('[data-testid="inventory-name"]')).toContainText('Hearing Aid Batteries');
    await expect(page.locator('[data-testid="inventory-quantity"]')).toContainText('100');
  });

  test('INVENTORY-002: Update inventory item', async ({ page }) => {
    // Arrange: Add item
    const itemId = await addInventoryItem(page, {
      name: 'Test Item',
      category: 'accessories',
      quantity: 50,
      unitPrice: 100
    });

    // Act: Update item
    await updateInventoryItem(page, itemId, {
      name: 'Updated Test Item',
      quantity: 75,
      unitPrice: 120
    });

    // Assert: Item updated
    await page.goto(`/inventory/${itemId}`);
    await expect(page.locator('[data-testid="inventory-name"]')).toContainText('Updated Test Item');
    await expect(page.locator('[data-testid="inventory-quantity"]')).toContainText('75');
  });

  test('INVENTORY-003: Delete inventory item', async ({ page }) => {
    // Arrange: Add item
    const itemId = await addInventoryItem(page, {
      name: 'Item to Delete',
      category: 'accessories',
      quantity: 10,
      unitPrice: 50
    });

    // Act: Delete item
    await deleteInventoryItem(page, itemId);

    // Assert: Item deleted (404 on detail page)
    await page.goto(`/inventory/${itemId}`);
    await expect(page.locator('[data-testid="not-found-message"]')).toBeVisible();
  });

  test('INVENTORY-004: Stock in operation', async ({ page }) => {
    // Arrange: Add item with low stock
    const itemId = await addInventoryItem(page, {
      name: 'Low Stock Item',
      category: 'accessories',
      quantity: 10,
      unitPrice: 50
    });

    // Act: Stock in 50 units
    await stockIn(page, itemId, 50);

    // Assert: Stock increased
    await page.goto(`/inventory/${itemId}`);
    await expect(page.locator('[data-testid="inventory-quantity"]')).toContainText('60');
  });

  test('INVENTORY-005: Stock out operation', async ({ page }) => {
    // Arrange: Add item with sufficient stock
    const itemId = await addInventoryItem(page, {
      name: 'High Stock Item',
      category: 'accessories',
      quantity: 100,
      unitPrice: 50
    });

    // Act: Stock out 30 units
    await stockOut(page, itemId, 30);

    // Assert: Stock decreased
    await page.goto(`/inventory/${itemId}`);
    await expect(page.locator('[data-testid="inventory-quantity"]')).toContainText('70');
  });

  test('INVENTORY-006: Search inventory', async ({ page }) => {
    // Arrange: Add item
    await addInventoryItem(page, {
      name: 'Unique Search Item',
      category: 'accessories',
      quantity: 50,
      unitPrice: 100
    });

    // Act: Search for item
    await searchInventory(page, 'Unique Search Item');

    // Assert: Item found in search results
    await expect(page.locator('[data-testid="inventory-list-item"]').first()).toContainText('Unique Search Item');
  });

  test('INVENTORY-007: Filter inventory by category', async ({ page }) => {
    // Arrange: Add items in different categories
    await addInventoryItem(page, {
      name: 'Accessory Item',
      category: 'accessories',
      quantity: 50,
      unitPrice: 100
    });
    await addInventoryItem(page, {
      name: 'Device Item',
      category: 'devices',
      quantity: 10,
      unitPrice: 5000
    });

    // Act: Filter by accessories category
    await filterInventoryByCategory(page, 'accessories');

    // Assert: Only accessories shown
    await expect(page.locator('[data-testid="inventory-list-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="inventory-category"]').first()).toContainText('accessories');
  });

  test('INVENTORY-008: Stock alert (minimum level)', async ({ page }) => {
    // Arrange: Add item below minimum stock
    await addInventoryItem(page, {
      name: 'Low Stock Alert Item',
      category: 'accessories',
      quantity: 5,
      unitPrice: 50,
      minimumStock: 20
    });

    // Act: Check for stock alert
    const hasAlert = await hasInventoryStockAlert(page);

    // Assert: Alert shown
    expect(hasAlert).toBe(true);
    await expect(page.locator('[data-testid="inventory-stock-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="inventory-stock-alert"]')).toContainText('Low stock');
  });

  test('INVENTORY-009: Export inventory to Excel', async ({ page }) => {
    // Arrange: Add some items
    await addInventoryItem(page, {
      name: 'Export Item 1',
      category: 'accessories',
      quantity: 50,
      unitPrice: 100
    });

    // Act: Export inventory
    await exportInventory(page, 'excel');

    // Assert: File downloaded (verified by helper)
  });

  test('INVENTORY-010: Inventory pagination', async ({ page }) => {
    // Arrange: Navigate to inventory page
    await page.goto('/inventory');

    // Act: Navigate to page 2
    await page.locator('[data-testid="pagination-next"]').click();
    await waitForApiCall(page, '/inventory', 'GET');

    // Assert: Page 2 loaded
    await expect(page.locator('[data-testid="pagination-current"]')).toContainText('2');
  });
});
