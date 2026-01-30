/**
 * FLOW-02: Device Assignment - Critical Flow Test
 * 
 * Priority: P0 (Revenue & Legal)
 * Why Critical: Medical device tracking, inventory management, regulatory compliance
 * 
 * API Endpoints:
 * - POST /api/device-assignments (createDeviceAssignments)
 * - GET /api/device-assignments (listDeviceAssignments)
 * - GET /api/parties/{party_id}/device-assignments
 * - PUT /api/device-assignments/{id} (updateDeviceAssignment)
 */

import { test, expect } from '../../fixtures/fixtures';
import { createTestParty, waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-02: Device Assignment', () => {
  test('should assign hearing aid to patient successfully', async ({ tenantPage, request, authTokens }) => {
    // Prerequisites: Create test party
    const timestamp = Date.now();
    const partyId = await createTestParty(request, authTokens.accessToken, {
      firstName: 'Mehmet',
      lastName: 'Kaya',
      phone: `+90555${timestamp.toString().slice(-7)}`
    });
    
    console.log('[FLOW-02] Created test party:', partyId);

    // STEP 1: Navigate to party detail
    console.log('[FLOW-02] Step 1: Navigate to party detail');
    await tenantPage.goto(`/parties/${partyId}`);
    await tenantPage.waitForLoadState('networkidle');
    
    // STEP 2: Click assign device button
    console.log('[FLOW-02] Step 2: Click assign device');
    const assignButton = tenantPage.getByRole('button', { name: /Cihaz|Device|Ata|Assign/i }).first();
    await assignButton.click();
    
    // Wait for assignment form/modal
    await tenantPage.waitForSelector('select[name="inventoryId"], select[name="inventory_id"]', { timeout: 5000 });
    
    // STEP 3: Select device from inventory
    console.log('[FLOW-02] Step 3: Select device');
    const inventorySelect = tenantPage.locator('select[name="inventoryId"], select[name="inventory_id"]').first();
    await inventorySelect.selectOption({ index: 1 }); // Select first available device
    
    // STEP 4: Select ear
    console.log('[FLOW-02] Step 4: Select ear');
    const rightEarRadio = tenantPage.locator('input[value="right"], input[value="RIGHT"]').first();
    await rightEarRadio.click();
    
    // STEP 5: Enter pricing
    console.log('[FLOW-02] Step 5: Enter pricing');
    const listPriceInput = tenantPage.locator('input[name="listPrice"], input[name="list_price"]').first();
    const salePriceInput = tenantPage.locator('input[name="salePrice"], input[name="sale_price"]').first();
    const sgkSupportInput = tenantPage.locator('input[name="sgkSupport"], input[name="sgk_support"]').first();
    
    await listPriceInput.fill('25000');
    await salePriceInput.fill('23000');
    await sgkSupportInput.fill('5000');
    
    // STEP 6: Submit assignment
    console.log('[FLOW-02] Step 6: Submit assignment');
    const submitButton = tenantPage.getByRole('button', { name: /Kaydet|Save|Ata/i }).first();
    await submitButton.click();
    
    // Wait for API call
    await waitForApiCall(tenantPage, '/api/device-assignments', 10000);
    await tenantPage.waitForLoadState('networkidle');
    
    // STEP 7: Verify assignment via API
    console.log('[FLOW-02] Step 7: Verify assignment via API');
    const response = await request.get(`/api/parties/${partyId}/device-assignments`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    validateResponseEnvelope(data);
    
    expect(data.data.length, 'Should have at least one device assignment').toBeGreaterThan(0);
    const assignment = data.data[0];
    expect(assignment.ear).toMatch(/right|RIGHT/);
    
    console.log('[FLOW-02] ✅ Device assignment flow completed successfully');
  });
});
