/**
 * FLOW-07: Inventory Management - Critical Flow Test
 * 
 * Priority: P1 (Core Operations)
 * Why Critical: Stock tracking, device availability, financial accuracy
 * 
 * API Endpoints:
 * - GET /api/inventory (listInventory)
 * - POST /api/inventory (createInventoryItem)
 * - PUT /api/inventory/{item_id} (updateInventoryItem)
 * - GET /api/inventory/{item_id}/movements (getStockMovements)
 */

import { test, expect } from '../../fixtures/fixtures';
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-07: Inventory Management', () => {
  test('should manage inventory item successfully', async ({ tenantPage, apiContext, authTokens }) => {
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    const testItem = {
      name: `Phonak Audeo P90-R Test${uniqueId.slice(-5)}`,
      brand: 'Phonak',
      model: `P90-R-${uniqueId}`,
      barcode: `BARCODE${uniqueId}`,
      price: '25000',
      stock: '10'
    };

    // STEP 1: Navigate to inventory page
    console.log('[FLOW-07] Step 1: Navigate to inventory page');
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    await tenantPage.waitForTimeout(2000);
    
    // Verify inventory page loads
    const pageHeading = tenantPage.locator('h1, h2, [data-testid="page-title"]').first();
    await pageHeading.waitFor({ state: 'visible', timeout: 15000 });
    console.log('[FLOW-07] Page heading:', await pageHeading.textContent());

    // STEP 2: Click "Yeni Ürün" button
    console.log('[FLOW-07] Step 2: Click new product button');
    
    // Try data-testid first, then fallback to text
    let createButton = tenantPage.locator('[data-testid="inventory-create-button"]').first();
    const buttonExists = await createButton.count() > 0;
    
    if (!buttonExists) {
      console.log('[FLOW-07] data-testid button not found, trying text-based selector');
      createButton = tenantPage.locator('button').filter({ hasText: /Yeni.*Ürün|Ürün.*Ekle|Yeni.*Stok/i }).first();
    }
    
    await createButton.waitFor({ state: 'visible', timeout: 10000 });
    await createButton.click();
    
    // Wait for form to appear
    await tenantPage.waitForTimeout(1000);
    await tenantPage.waitForSelector('[data-testid="inventory-name-input"], input[name="name"]', { timeout: 10000 });

    // STEP 3: Fill product form
    console.log('[FLOW-07] Step 3: Fill product form');
    
    // Name
    const nameInput = tenantPage.locator('[data-testid="inventory-name-input"], input[name="name"]').first();
    await nameInput.fill(testItem.name);
    
    // Brand
    const brandInput = tenantPage.locator('[data-testid="inventory-brand-input"], input[name="brand"]').first();
    await brandInput.fill(testItem.brand);
    
    // Model
    const modelInput = tenantPage.locator('[data-testid="inventory-model-input"], input[name="model"]').first();
    await modelInput.fill(testItem.model);
    
    // Barcode
    const barcodeInput = tenantPage.locator('[data-testid="inventory-barcode-input"], input[name="barcode"]').first();
    await barcodeInput.fill(testItem.barcode);
    
    // Price
    const priceInput = tenantPage.locator('[data-testid="inventory-price-input"], input[name="price"]').first();
    await priceInput.fill(testItem.price);
    
    // Stock
    const stockInput = tenantPage.locator('[data-testid="inventory-stock-input"], input[name="stock"], input[name="availableInventory"]').first();
    await stockInput.fill(testItem.stock);

    // STEP 4: Submit form
    console.log('[FLOW-07] Step 4: Submit product form');
    const submitButton = tenantPage.locator('[data-testid="inventory-submit-button"]').or(
      tenantPage.getByRole('button', { name: /Kaydet|Save|Oluştur|Create/i })
    ).first();
    await submitButton.click();
    
    // Wait for API call
    await waitForApiCall(tenantPage, '/api/inventory', 10000);
    await tenantPage.waitForLoadState('networkidle');

    // STEP 5: Verify item created via API
    console.log('[FLOW-07] Step 5: Verify item created via API');
    await tenantPage.waitForTimeout(1000);
    
    const listResponse = await apiContext.get('/api/inventory?page=1&perPage=100', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    validateResponseEnvelope(listData);
    
    const createdItem = listData.data.find((item: any) => item.barcode === testItem.barcode);
    expect(createdItem, `Inventory item with barcode ${testItem.barcode} should exist`).toBeTruthy();
    
    const itemId = createdItem.id;
    console.log('[FLOW-07] Created inventory item ID:', itemId);

    // STEP 6: Navigate to item detail and update stock
    console.log('[FLOW-07] Step 6: Navigate to item detail');
    await tenantPage.goto(`/inventory/${itemId}`);
    await tenantPage.waitForLoadState('networkidle');
    await tenantPage.waitForTimeout(1000);
    
    // Verify item details visible
    await expect(tenantPage.locator(`text=${testItem.name}`).first()).toBeVisible({ timeout: 10000 });

    // STEP 7: Click edit button
    console.log('[FLOW-07] Step 7: Click edit button');
    const editButton = tenantPage.locator('[data-testid="inventory-edit-button"]').or(
      tenantPage.locator('button').filter({ hasText: /Düzenle|Edit/i })
    ).first();
    await editButton.waitFor({ state: 'visible', timeout: 10000 });
    await editButton.click();
    
    // Wait for edit form
    await tenantPage.waitForTimeout(1000);
    await tenantPage.waitForSelector('[data-testid="inventory-stock-input"], input[name="stock"], input[name="availableInventory"]', { timeout: 10000 });

    // STEP 8: Update stock level
    console.log('[FLOW-07] Step 8: Update stock level');
    const newStock = '15';
    const stockUpdateInput = tenantPage.locator('[data-testid="inventory-stock-input"], input[name="stock"], input[name="availableInventory"]').first();
    await stockUpdateInput.clear();
    await stockUpdateInput.fill(newStock);
    
    // Save changes
    const saveButton = tenantPage.locator('[data-testid="inventory-submit-button"]').or(
      tenantPage.getByRole('button', { name: /Kaydet|Save|Güncelle|Update/i })
    ).first();
    await saveButton.click();
    
    // Wait for update API call
    await waitForApiCall(tenantPage, `/api/inventory/${itemId}`, 10000);
    await tenantPage.waitForLoadState('networkidle');

    // STEP 9: Verify stock updated via API
    console.log('[FLOW-07] Step 9: Verify stock updated via API');
    const itemResponse = await apiContext.get(`/api/inventory/${itemId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(itemResponse.ok()).toBeTruthy();
    const itemData = await itemResponse.json();
    validateResponseEnvelope(itemData);
    expect(itemData.data.availableInventory || itemData.data.stock).toBe(parseInt(newStock));
    console.log('[FLOW-07] Stock updated successfully to:', newStock);

    // STEP 10: Verify in list view
    console.log('[FLOW-07] Step 10: Verify updated stock in list view');
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    await tenantPage.waitForTimeout(1000);
    
    // Verify updated stock appears in list
    await expect(tenantPage.locator(`text=${testItem.barcode}`).first()).toBeVisible({ timeout: 10000 });
    await expect(tenantPage.locator(`text=${newStock}`).first()).toBeVisible({ timeout: 5000 });
    
    console.log('[FLOW-07] ✅ Inventory management flow completed successfully');
    console.log('[FLOW-07] Item ID:', itemId);
    console.log('[FLOW-07] Final stock:', newStock);
  });
});
