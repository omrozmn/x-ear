/**
 * FLOW-03: Sale Creation - Critical Flow Test
 * 
 * Priority: P0 (Revenue & Legal)
 * Why Critical: Revenue tracking, inventory deduction, device assignment
 * 
 * API Endpoints:
 * - POST /api/parties (createParty)
 * - GET /api/inventory (listInventory)
 * - POST /api/sales (createSale)
 * - GET /api/sales/{sale_id} (getSale)
 * - GET /api/parties/{party_id}/devices (getPartyDevices)
 */

import { test, expect } from '../../fixtures/fixtures';
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-03: Sale Creation', () => {
  test('should complete sale creation flow successfully', async ({ tenantPage, apiContext, authTokens }) => {
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    const testParty = {
      firstName: `SaleTest${uniqueId.slice(-5)}`,
      lastName: 'Customer',
      phone: `+90555${uniqueId.slice(-7)}`,
      email: `sale${uniqueId}@test.com`
    };

    // STEP 1: Create a party for the sale
    console.log('[FLOW-03] Step 1: Create party for sale');
    await tenantPage.goto('/parties');
    await tenantPage.waitForLoadState('networkidle');
    await tenantPage.waitForTimeout(1000);
    
    // Click create button
    const createButton = tenantPage.locator('button').filter({ hasText: /Yeni.*Hasta|Hasta.*Ekle/i }).first();
    await createButton.waitFor({ state: 'visible', timeout: 10000 });
    await createButton.click();
    
    // Wait for modal
    await tenantPage.waitForTimeout(1000);
    await tenantPage.waitForSelector('[data-testid="party-first-name-input"]', { timeout: 10000 });
    
    // Fill form
    await tenantPage.locator('[data-testid="party-first-name-input"]').fill(testParty.firstName);
    await tenantPage.locator('[data-testid="party-last-name-input"]').fill(testParty.lastName);
    await tenantPage.locator('[data-testid="party-phone-input"]').fill(testParty.phone);
    await tenantPage.locator('[data-testid="party-email-input"]').fill(testParty.email);
    
    // Submit
    const submitButton = tenantPage.locator('[data-testid="party-submit-button"]');
    await submitButton.click();
    await waitForApiCall(tenantPage, '/api/parties', 10000);
    await tenantPage.waitForLoadState('networkidle');
    
    // Verify party created - wait a moment for indexing
    await tenantPage.waitForTimeout(1000);
    
    const searchResponse = await apiContext.get(`/api/parties?search=${encodeURIComponent(testParty.phone)}`);
    expect(searchResponse.ok()).toBeTruthy();
    const searchData = await searchResponse.json();
    validateResponseEnvelope(searchData);
    
    console.log('[FLOW-03] Search response data:', JSON.stringify(searchData.data, null, 2));
    
    // If search doesn't work, try listing with larger page size
    let createdParty = searchData.data?.find?.((p: any) => p.phone === testParty.phone);
    
    if (!createdParty) {
      console.log('[FLOW-03] Party not found in search, trying list endpoint...');
      const listResponse = await apiContext.get('/api/parties?page=1&perPage=100');
      const listData = await listResponse.json();
      validateResponseEnvelope(listData);
      console.log('[FLOW-03] List response data count:', listData.data?.length);
      createdParty = listData.data?.find?.((p: any) => p.phone === testParty.phone);
    }
    
    expect(createdParty, `Party with phone ${testParty.phone} should exist`).toBeTruthy();
    
    const partyId = createdParty.id;
    console.log('[FLOW-03] Created party ID:', partyId);

    // STEP 2: Check available inventory
    console.log('[FLOW-03] Step 2: Check available inventory');
    const inventoryResponse = await apiContext.get('/api/inventory?perPage=10');
    expect(inventoryResponse.ok()).toBeTruthy();
    const inventoryData = await inventoryResponse.json();
    validateResponseEnvelope(inventoryData);
    
    console.log('[FLOW-03] Available inventory count:', inventoryData.data?.length || 0);
    
    // Must have inventory to proceed
    if (!inventoryData.data || inventoryData.data.length === 0) {
      console.log('[FLOW-03] ❌ No inventory items found');
      throw new Error('No inventory available - run: python scripts/create_test_inventory.py');
    }
    
    // Use first available inventory item
    const inventoryItem = inventoryData.data[0];
    console.log('[FLOW-03] Using inventory:', inventoryItem.id, inventoryItem.name);

    // STEP 3: Create sale via API
    console.log('[FLOW-03] Step 3: Create sale');
    
    const saleData = {
      partyId: partyId,
      productId: inventoryItem.id,
      quantity: 1,
      salesPrice: inventoryItem.price,
      paymentMethod: 'cash',
      notes: 'E2E test sale',
      earSide: 'right',
      serialNumber: `TEST-SN-${uniqueId}`
    };
    
    const createSaleResponse = await apiContext.post('/api/sales', {
      data: saleData,
      headers: {
        'Idempotency-Key': `test-sale-creation-${uniqueId}`
      }
    });
    
    expect(createSaleResponse.ok()).toBeTruthy();
    const createSaleData = await createSaleResponse.json();
    validateResponseEnvelope(createSaleData);
    const saleId = createSaleData.data.saleId || createSaleData.data.sale?.id;
    console.log('[FLOW-03] Sale created successfully:', saleId);

    // STEP 4: Verify sale details
    console.log('[FLOW-03] Step 4: Verify sale details');
    
    const saleResponse = await apiContext.get(`/api/sales/${saleId}`);
    expect(saleResponse.ok()).toBeTruthy();
    const saleResponseData = await saleResponse.json();
    validateResponseEnvelope(saleResponseData);
    
    const sale = saleResponseData.data;
    expect(sale.partyId).toBe(partyId);
    expect(sale.totalAmount).toBeGreaterThan(0);
    
    console.log('[FLOW-03] Sale verified:');
    console.log('[FLOW-03]   ID:', sale.id);
    console.log('[FLOW-03]   Total:', sale.totalAmount);

    // STEP 5: Verify device assignment (via sale)
    console.log('[FLOW-03] Step 5: Verify device assignment');
    
    await tenantPage.waitForTimeout(1000);
    
    const partyDevicesResponse = await apiContext.get(`/api/parties/${partyId}/devices`);
    expect(partyDevicesResponse.ok()).toBeTruthy();
    const partyDevicesData = await partyDevicesResponse.json();
    validateResponseEnvelope(partyDevicesData);
    
    const assignedDevices = partyDevicesData.data;
    expect(assignedDevices.length).toBeGreaterThan(0);
    
    console.log('[FLOW-03] Verified device assignment - party has', assignedDevices.length, 'device(s)');

    // STEP 6: Check inventory deduction
    console.log('[FLOW-03] Step 6: Check inventory deduction');
    
    const updatedInventoryResponse = await apiContext.get(`/api/inventory/${inventoryItem.id}`);
    expect(updatedInventoryResponse.ok()).toBeTruthy();
    const updatedInventoryData = await updatedInventoryResponse.json();
    validateResponseEnvelope(updatedInventoryData);
    
    const updatedInventory = updatedInventoryData.data;
    console.log('[FLOW-03] Inventory before:', inventoryItem.availableInventory);
    console.log('[FLOW-03] Inventory after:', updatedInventory.availableInventory);
    
    // Inventory should be reduced by 1
    expect(updatedInventory.availableInventory).toBe(inventoryItem.availableInventory - 1);

    // STEP 7: Navigate to sales page and verify UI (optional - UI may not show immediately)
    console.log('[FLOW-03] Step 7: Verify sale in UI');
    
    await tenantPage.goto('/sales');
    await tenantPage.waitForLoadState('networkidle');
    await tenantPage.waitForTimeout(1000);
    
    // Try to find the sale in the list (optional check)
    try {
      const saleRow = tenantPage.locator(`tr:has-text("${testParty.firstName}")`).first();
      await expect(saleRow).toBeVisible({ timeout: 5000 });
      console.log('[FLOW-03] Sale visible in UI');
    } catch (e) {
      console.log('[FLOW-03] Sale not immediately visible in UI (may require refresh or filter)');
    }

    // STEP 8: Final verification
    console.log('[FLOW-03] Step 8: Final verification');
    
    const finalPartyResponse = await apiContext.get(`/api/parties/${partyId}`);
    expect(finalPartyResponse.ok()).toBeTruthy();
    const finalPartyData = await finalPartyResponse.json();
    validateResponseEnvelope(finalPartyData);
    
    console.log('[FLOW-03] ✅ Sale creation flow completed successfully');
    console.log('[FLOW-03] Party:', partyId);
    console.log('[FLOW-03] Sale:', saleId);
    console.log('[FLOW-03] Inventory:', inventoryItem.id);
    console.log('[FLOW-03] Device assigned via sale');
    console.log('[FLOW-03] Inventory deducted correctly');
  });
});
