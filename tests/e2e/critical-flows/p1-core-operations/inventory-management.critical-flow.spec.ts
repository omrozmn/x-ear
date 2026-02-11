/**
 * FLOW-07: Inventory Management - Critical Flow Test
 * 
 * Priority: P1 (Core Operations)
 * Why Critical: Stock tracking, device availability, financial accuracy
 * 
 * FULL E2E TEST - NO GRACEFUL SKIPS!
 * Tests: Create → Read → Update → Delete inventory items
 * Verifies: API calls and DB persistence (UI test pending due to modal issues)
 * 
 * API Endpoints:
 * - GET /api/inventory (listInventory)
 * - POST /api/inventory (createInventory)
 * - PUT /api/inventory/{item_id} (updateInventory)
 * - DELETE /api/inventory/{item_id} (deleteInventory)
 * - GET /api/inventory/stats (listInventoryStats)
 */

import { test, expect } from '../../fixtures/fixtures';
import { validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-07: Inventory Management', () => {
  test('should create, read, update, and delete inventory item via API', async ({ apiContext, authTokens }) => {
    test.setTimeout(60000);
    
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-6);
    
    const testItem = {
      name: `Test Phonak P90-${uniqueId}`,
      brand: 'Phonak',
      model: `P90-R-${uniqueId}`,
      barcode: `BAR${uniqueId}`,
      price: 25000,
      availableInventory: 10,
      category: 'hearing_aid',
      reorderLevel: 5
    };

    console.log('[FLOW-07] Testing inventory CRUD via API');
    console.log('[FLOW-07] Test item:', testItem);

    // STEP 1: Create inventory item via API
    console.log('[FLOW-07] Step 1: Create inventory item via API');
    const idempotencyKey = `test-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    const createResponse = await apiContext.post('/api/inventory', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': idempotencyKey
      },
      data: testItem
    });
    
    if (!createResponse.ok()) {
      const errorData = await createResponse.json();
      console.log('[FLOW-07] ❌ Create failed:', createResponse.status(), errorData);
    }
    
    expect(createResponse.ok(), `Create inventory should succeed: ${createResponse.status()}`).toBeTruthy();
    const createData = await createResponse.json();
    validateResponseEnvelope(createData);
    expect(createData.data).toBeTruthy();
    expect(createData.data.name).toBe(testItem.name);
    expect(createData.data.brand).toBe(testItem.brand);
    expect(createData.data.barcode).toBe(testItem.barcode);
    expect(createData.data.price).toBe(testItem.price);
    expect(createData.data.availableInventory).toBe(testItem.availableInventory);
    
    const itemId = createData.data.id;
    console.log('[FLOW-07] ✓ Item created, ID:', itemId);
    
    // STEP 2: Read item via API
    console.log('[FLOW-07] Step 2: Read item via API');
    const getResponse = await apiContext.get(`/api/inventory/${itemId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(getResponse.ok()).toBeTruthy();
    const getData = await getResponse.json();
    validateResponseEnvelope(getData);
    expect(getData.data.id).toBe(itemId);
    expect(getData.data.name).toBe(testItem.name);
    console.log('[FLOW-07] ✓ Item read successfully');
    
    // STEP 3: List items and verify our item exists
    console.log('[FLOW-07] Step 3: List items and verify');
    const listResponse = await apiContext.get('/api/inventory?page=1&perPage=50', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    validateResponseEnvelope(listData);
    const foundItem = listData.data.find((item: any) => item.id === itemId);
    expect(foundItem, 'Item should exist in list').toBeTruthy();
    console.log('[FLOW-07] ✓ Item found in list');
    
    // STEP 4: Update item via API
    console.log('[FLOW-07] Step 4: Update item via API');
    const newStock = 15;
    const updateIdempotencyKey = `test-update-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    const updateResponse = await apiContext.put(`/api/inventory/${itemId}`, {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': updateIdempotencyKey
      },
      data: {
        availableInventory: newStock
      }
    });
    
    expect(updateResponse.ok()).toBeTruthy();
    const updateData = await updateResponse.json();
    validateResponseEnvelope(updateData);
    expect(updateData.data.availableInventory).toBe(newStock);
    console.log('[FLOW-07] ✓ Item updated, new stock:', newStock);
    
    // STEP 5: Verify update persisted
    console.log('[FLOW-07] Step 5: Verify update persisted');
    const verifyResponse = await apiContext.get(`/api/inventory/${itemId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(verifyResponse.ok()).toBeTruthy();
    const verifyData = await verifyResponse.json();
    validateResponseEnvelope(verifyData);
    expect(verifyData.data.availableInventory).toBe(newStock);
    console.log('[FLOW-07] ✓ Update persisted to database');
    
    // STEP 6: Check inventory stats
    console.log('[FLOW-07] Step 6: Check inventory stats');
    const statsResponse = await apiContext.get('/api/inventory/stats', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(statsResponse.ok()).toBeTruthy();
    const statsData = await statsResponse.json();
    validateResponseEnvelope(statsData);
    expect(statsData.data.totalItems).toBeGreaterThan(0);
    console.log('[FLOW-07] ✓ Stats retrieved:', statsData.data);
    
    // STEP 7: Delete item via API
    console.log('[FLOW-07] Step 7: Delete item via API');
    const deleteResponse = await apiContext.delete(`/api/inventory/${itemId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(deleteResponse.ok()).toBeTruthy();
    console.log('[FLOW-07] ✓ Item deleted');
    
    // STEP 8: Verify deletion
    console.log('[FLOW-07] Step 8: Verify deletion');
    const deletedResponse = await apiContext.get(`/api/inventory/${itemId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(deletedResponse.status()).toBe(404);
    console.log('[FLOW-07] ✓ Item not found (404) - deletion confirmed');
    
    console.log('[FLOW-07] ✅ FULL INVENTORY CRUD FLOW COMPLETED SUCCESSFULLY');
    console.log('[FLOW-07] ✅ All operations persisted to database correctly');
    console.log('[FLOW-07] ℹ️  UI test pending - modal form has rendering issues');
  });
});
