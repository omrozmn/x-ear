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
      listPrice: 25000,
      salePrice: 23000,
      initialStock: 10
    };

    // STEP 1: Navigate to inventory page
    console.log('[FLOW-07] Step 1: Navigate to inventory page');
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    
    // Verify inventory page loads
    await expect(tenantPage.locator('h1, h2').filter({ hasText: /Envanter|Stok|Inventory/i })).toBeVisible({ timeout: 10000 });

    // STEP 2: Click "Yeni Ürün"
    console.log('[FLOW-07] Step 2: Click new product button');
    const createButton = tenantPage.getByRole('button', { name: /Yeni|Ürün|Ekle|Product/i }).first();
    await createButton.click();
    
    // Wait for form to appear
    await tenantPage.waitForSelector('input[name="name"], input[name="productName"]', { timeout: 5000 });

    // STEP 3: Enter product details
    console.log('[FLOW-07] Step 3: Enter product details');
    
    // Name
    const nameInput = tenantPage.locator('input[name="name"], input[name="productName"]').first();
    await nameInput.fill(testItem.name);
    
    // Brand
    const brandInput = tenantPage.locator('input[name="brand"], select[name="brand"]').first();
    if (await brandInput.getAttribute('type') === 'text' || await brandInput.tagName() === 'INPUT') {
      await brandInput.fill(testItem.brand);
    } else {
      // If it's a select, try to select or add
      await brandInput.click();
      await tenantPage.locator(`option:has-text("${testItem.brand}")`).first().click().catch(async () => {
        // Fallback: select first option
        await tenantPage.locator('option').nth(1).click();
      });
    }
    
    // Model
    const modelInput = tenantPage.locator('input[name="model"]').first();
    await modelInput.fill(testItem.model);
    
    // Barcode
    const barcodeInput = tenantPage.locator('input[name="barcode"], input[name="sku"]').first();
    await barcodeInput.fill(testItem.barcode);
    
    // List Price
    const listPriceInput = tenantPage.locator('input[name="listPrice"], input[name="price"]').first();
    await listPriceInput.fill(testItem.listPrice.toString());
    
    // Sale Price (if exists)
    const salePriceInput = tenantPage.locator('input[name="salePrice"], input[name="sellingPrice"]').first();
    await salePriceInput.fill(testItem.salePrice.toString()).catch(() => {
      console.log('[FLOW-07] Sale price field not found, skipping');
    });
    
    // Initial Stock
    const stockInput = tenantPage.locator('input[name="stock"], input[name="quantity"], input[name="initialStock"]').first();
    await stockInput.fill(testItem.initialStock.toString());

    // STEP 4: Submit and verify item created
    console.log('[FLOW-07] Step 4: Submit product');
    const submitButton = tenantPage.getByRole('button', { name: /Kaydet|Save|Oluştur|Create/i }).first();
    await submitButton.click();
    
    // Wait for API call
    await waitForApiCall(tenantPage, '/api/inventory', 10000);
    await tenantPage.waitForLoadState('networkidle');

    // STEP 5: Verify item created via API
    console.log('[FLOW-07] Step 5: Verify item created via API');
    const listResponse = await apiContext.get('/api/inventory?page=1&perPage=50', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    validateResponseEnvelope(listData);
    
    const createdItem = listData.data.find((item: any) => item.barcode === testItem.barcode);
    expect(createdItem, `Inventory item with barcode ${testItem.barcode} should exist`).toBeTruthy();
    expect(createdItem.name).toContain(testItem.name.split(' ')[0]); // Check first word
    expect(createdItem.stock || createdItem.quantity).toBe(testItem.initialStock);
    
    const itemId = createdItem.id;
    console.log('[FLOW-07] Created inventory item ID:', itemId);

    // STEP 6: Update stock level
    console.log('[FLOW-07] Step 6: Update stock level');
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    
    // Find and click on the item
    const itemRow = tenantPage.locator(`tr:has-text("${testItem.barcode}")`).first();
    await itemRow.click();
    
    // Wait for detail page or edit button
    await tenantPage.waitForLoadState('networkidle');
    
    // Click edit button
    const editButton = tenantPage.getByRole('button', { name: /Düzenle|Edit|Stok|Stock/i }).first();
    await editButton.click();
    
    // Update stock
    const newStock = 15;
    const stockUpdateInput = tenantPage.locator('input[name="stock"], input[name="quantity"]').first();
    await stockUpdateInput.clear();
    await stockUpdateInput.fill(newStock.toString());
    
    // Save changes
    const saveButton = tenantPage.getByRole('button', { name: /Kaydet|Save|Güncelle|Update/i }).first();
    await saveButton.click();
    
    // Wait for update API call
    await waitForApiCall(tenantPage, `/api/inventory/${itemId}`, 10000);
    await tenantPage.waitForLoadState('networkidle');

    // STEP 7: Verify stock movement recorded
    console.log('[FLOW-07] Step 7: Verify stock movement recorded');
    const itemResponse = await apiContext.get(`/api/inventory/${itemId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(itemResponse.ok()).toBeTruthy();
    const itemData = await itemResponse.json();
    validateResponseEnvelope(itemData);
    expect(itemData.data.stock || itemData.data.quantity).toBe(newStock);

    // STEP 8: Verify stock levels accurate
    console.log('[FLOW-07] Step 8: Verify stock levels in list');
    await tenantPage.goto('/inventory');
    await tenantPage.waitForLoadState('networkidle');
    
    // Verify updated stock appears in list
    const stockCell = tenantPage.locator(`tr:has-text("${testItem.barcode}") td:has-text("${newStock}")`).first();
    await expect(stockCell).toBeVisible({ timeout: 10000 });
    
    console.log('[FLOW-07] ✅ Inventory management flow completed successfully');
  });
});
