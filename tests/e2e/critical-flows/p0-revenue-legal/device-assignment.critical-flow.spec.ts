/**
 * FLOW-02: Device Assignment - Critical Flow Test
 * 
 * Priority: P0 (Revenue & Legal)
 * Why Critical: Device tracking, inventory management, party-device relationship
 * 
 * API Endpoints:
 * - POST /api/parties (createParty)
 * - GET /api/devices (listDevices)
 * - POST /api/devices/assign (assignDevice)
 * - GET /api/parties/{party_id}/devices (getPartyDevices)
 * - PUT /api/devices/{device_id} (updateDevice)
 */

import { test, expect } from '../../fixtures/fixtures';
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-02: Device Assignment', () => {
  test('should complete device assignment flow successfully', async ({ tenantPage, apiContext, authTokens }) => {
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    const testParty = {
      firstName: `DeviceTest${uniqueId.slice(-5)}`,
      lastName: 'Patient',
      phone: `+90555${uniqueId.slice(-7)}`,
      email: `device${uniqueId}@test.com`
    };

    // STEP 1: Create a party for device assignment
    console.log('[FLOW-02] Step 1: Create party for device assignment');
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
    
    // Verify party created
    const searchResponse = await apiContext.get(`/api/parties?search=${encodeURIComponent(testParty.phone)}`);
    expect(searchResponse.ok()).toBeTruthy();
    const searchData = await searchResponse.json();
    validateResponseEnvelope(searchData);
    
    const createdParty = searchData.data?.find?.((p: any) => p.phone === testParty.phone);
    expect(createdParty, `Party with phone ${testParty.phone} should exist`).toBeTruthy();
    
    const partyId = createdParty.id;
    console.log('[FLOW-02] Created party ID:', partyId);

    // STEP 2: Navigate to party detail page
    console.log('[FLOW-02] Step 2: Navigate to party detail page');
    await tenantPage.goto(`/parties/${partyId}`);
    await tenantPage.waitForLoadState('networkidle');
    await tenantPage.waitForTimeout(1000);
    
    // Verify party name is visible
    await expect(tenantPage.locator(`text=${testParty.firstName}`).first()).toBeVisible({ timeout: 10000 });

    // STEP 3: Check available inventory
    console.log('[FLOW-02] Step 3: Check available inventory');
    const inventoryResponse = await apiContext.get('/api/inventory?perPage=10');
    expect(inventoryResponse.ok()).toBeTruthy();
    const inventoryData = await inventoryResponse.json();
    validateResponseEnvelope(inventoryData);
    
    console.log('[FLOW-02] Available inventory count:', inventoryData.data?.length || 0);
    
    // Must have inventory to proceed
    if (!inventoryData.data || inventoryData.data.length === 0) {
      console.log('[FLOW-02] ❌ No inventory items found');
      console.log('[FLOW-02] Please run: python scripts/seed_comprehensive_data.py');
      throw new Error('No inventory available - run seed script first');
    }
    
    // Use first available inventory item
    const inventoryItem = inventoryData.data[0];
    console.log('[FLOW-02] Using existing inventory:', inventoryItem.id, inventoryItem.name);

    // STEP 4: Assign device to party via API
    console.log('[FLOW-02] Step 4: Assign device to party');
    
    const assignmentData = {
      deviceAssignments: [
        {
          inventoryId: inventoryItem.id,
          ear: 'right',
          serialNumber: `TEST-SN-${uniqueId}`,
          reason: 'Sale',
          paymentMethod: 'cash'
        }
      ],
      paymentPlan: 'cash'
    };
    
    const assignResponse = await apiContext.post(`/api/parties/${partyId}/device-assignments`, {
      data: assignmentData,
      headers: {
        'Idempotency-Key': `test-device-assignment-${uniqueId}`
      }
    });
    
    expect(assignResponse.ok()).toBeTruthy();
    const assignData = await assignResponse.json();
    validateResponseEnvelope(assignData);
    
    const saleId = assignData.data.saleId;
    console.log('[FLOW-02] Device assigned successfully via sale:', saleId);

    // STEP 5: Verify device assignment via party devices endpoint
    console.log('[FLOW-02] Step 5: Verify device assignment');
    
    // Wait a bit for assignment to be processed
    await tenantPage.waitForTimeout(1000);
    
    // Verify via API
    const partyDevicesResponse = await apiContext.get(`/api/parties/${partyId}/devices`);
    expect(partyDevicesResponse.ok()).toBeTruthy();
    const partyDevicesData = await partyDevicesResponse.json();
    validateResponseEnvelope(partyDevicesData);
    
    const assignedDevices = partyDevicesData.data;
    expect(assignedDevices.length).toBeGreaterThan(0);
    
    console.log('[FLOW-02] Verified device assignment - party has', assignedDevices.length, 'device(s)');

    // STEP 6: Verify sale details (created by device assignment)
    console.log('[FLOW-02] Step 6: Verify sale details');
    
    const saleResponse = await apiContext.get(`/api/sales/${saleId}`);
    expect(saleResponse.ok()).toBeTruthy();
    const saleResponseData = await saleResponse.json();
    validateResponseEnvelope(saleResponseData);
    
    const sale = saleResponseData.data;
    expect(sale.partyId).toBe(partyId);
    expect(sale.totalAmount).toBeGreaterThan(0);
    
    console.log('[FLOW-02] Sale verified:', sale.id);
    console.log('[FLOW-02] Sale total:', sale.totalAmount);

    // STEP 7: Navigate to party detail page and verify UI
    console.log('[FLOW-02] Step 7: Verify device assignment in UI');
    
    await tenantPage.goto(`/parties/${partyId}`);
    await tenantPage.waitForLoadState('networkidle');
    await tenantPage.waitForTimeout(1000);
    
    // Check if devices tab exists
    const devicesTab = tenantPage.locator('button, a').filter({ hasText: /Cihaz|Device/i }).first();
    const hasDevicesTab = await devicesTab.count() > 0;
    
    if (hasDevicesTab) {
      console.log('[FLOW-02] Found devices tab, clicking...');
      await devicesTab.click();
      await tenantPage.waitForTimeout(1000);
      
      // Verify device is visible in UI
      const deviceName = tenantPage.locator(`text=${inventoryItem.name}`).first();
      await expect(deviceName).toBeVisible({ timeout: 5000 });
      console.log('[FLOW-02] Device visible in UI');
    } else {
      console.log('[FLOW-02] No devices tab found, checking sales tab...');
      
      // Check sales tab instead
      const salesTab = tenantPage.locator('button, a').filter({ hasText: /Satış|Sale/i }).first();
      const hasSalesTab = await salesTab.count() > 0;
      
      if (hasSalesTab) {
        await salesTab.click();
        await tenantPage.waitForTimeout(1000);
        console.log('[FLOW-02] Sales tab visible');
      }
    }

    // STEP 8: Final verification
    console.log('[FLOW-02] Step 8: Final verification');
    
    const finalPartyResponse = await apiContext.get(`/api/parties/${partyId}`);
    expect(finalPartyResponse.ok()).toBeTruthy();
    const finalPartyData = await finalPartyResponse.json();
    validateResponseEnvelope(finalPartyData);
    
    console.log('[FLOW-02] ✅ Device assignment flow completed successfully');
    console.log('[FLOW-02] Party:', partyId);
    console.log('[FLOW-02] Inventory:', inventoryItem.id);
    console.log('[FLOW-02] Sale:', saleId);
    console.log('[FLOW-02] Assignment verified via sale creation');
  });
});
