/**
 * FLOW-15: Web → Admin Data Sync - Critical Flow Test
 * 
 * Priority: Cross-App Sync
 * Why Critical: Data consistency, multi-app architecture, tenant isolation
 * 
 * API Endpoints:
 * - POST /api/parties (createParty) - Web app
 * - GET /api/admin/tenants/{tenant_id}/parties (getTenantParties) - Admin panel
 * - PUT /api/admin/parties/{party_id} (updateParty) - Admin panel
 * - GET /api/parties/{party_id} (getParty) - Web app
 */

import { test, expect } from '../../fixtures/fixtures';
import { validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-15: Web → Admin Data Sync', () => {
  test('should sync data from web app to admin panel', async ({ apiContext, authTokens }) => {
    test.setTimeout(60000);
    
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    // STEP 1: Create party in web app (as regular tenant user)
    console.log('[FLOW-15] Step 1: Create party in web app');
    const testParty = {
      firstName: `WebParty${uniqueId.slice(-5)}`,
      lastName: 'SyncTest',
      phone: `+90555${uniqueId.slice(-7)}`,
      email: `webparty${uniqueId}@test.com`
    };
    
    const partyResponse = await apiContext.post('/api/parties', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `web-party-${uniqueId}`
      },
      data: testParty
    });
    
    expect(partyResponse.ok()).toBeTruthy();
    const partyData = await partyResponse.json();
    validateResponseEnvelope(partyData);
    
    const partyId = partyData.data.id;
    const tenantId = partyData.data.tenantId;
    console.log('[FLOW-15] Created party ID:', partyId);
    console.log('[FLOW-15] Tenant ID:', tenantId);

    // STEP 2: Verify party appears in admin panel via API
    console.log('[FLOW-15] Step 2: Verify party visible in admin panel');
    const adminPartiesResponse = await apiContext.get(`/api/admin/tenants/${tenantId}/parties?page=1&perPage=50`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(adminPartiesResponse.ok()).toBeTruthy();
    const adminPartiesData = await adminPartiesResponse.json();
    validateResponseEnvelope(adminPartiesData);
    
    const parties = adminPartiesData.data?.parties || adminPartiesData.data || [];
    const createdParty = parties.find((p: any) => p.id === partyId);
    expect(createdParty, `Party ${partyId} should be visible in admin panel`).toBeTruthy();
    expect(createdParty.firstName).toBe(testParty.firstName);
    expect(createdParty.phone).toBe(testParty.phone);
    console.log('[FLOW-15] Party verified in admin panel');

    // STEP 3: Update party in web app
    console.log('[FLOW-15] Step 3: Update party in web app');
    const updatedData = {
      firstName: testParty.firstName,
      lastName: 'UpdatedSyncTest',
      phone: testParty.phone,
      email: testParty.email
    };
    
    const updateResponse = await apiContext.put(`/api/parties/${partyId}`, {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `web-party-update-${uniqueId}`
      },
      data: updatedData
    });
    
    expect(updateResponse.ok()).toBeTruthy();
    const updateData = await updateResponse.json();
    validateResponseEnvelope(updateData);
    console.log('[FLOW-15] Party updated in web app');

    // STEP 4: Verify update synced to admin panel
    console.log('[FLOW-15] Step 4: Verify update synced to admin panel');
    const adminPartyResponse = await apiContext.get(`/api/admin/parties/${partyId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(adminPartyResponse.ok()).toBeTruthy();
    const adminPartyData = await adminPartyResponse.json();
    validateResponseEnvelope(adminPartyData);
    
    expect(adminPartyData.data.lastName).toBe('UpdatedSyncTest');
    console.log('[FLOW-15] Update verified in admin panel');

    // STEP 5: Create sale in web app
    console.log('[FLOW-15] Step 5: Create sale in web app');
    
    // Get inventory item
    const inventoryResponse = await apiContext.get('/api/inventory?perPage=10', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    expect(inventoryResponse.ok()).toBeTruthy();
    const inventoryData = await inventoryResponse.json();
    const inventoryItem = inventoryData.data[0];
    
    const saleData = {
      partyId: partyId,
      productId: inventoryItem.id,
      quantity: 1,
      salesPrice: inventoryItem.price || 25000,
      paymentMethod: 'cash',
      earSide: 'right',
      serialNumber: `SYNC-${uniqueId}`
    };
    
    const saleResponse = await apiContext.post('/api/sales', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `web-sale-${uniqueId}`
      },
      data: saleData
    });
    
    expect(saleResponse.ok()).toBeTruthy();
    const saleResponseData = await saleResponse.json();
    validateResponseEnvelope(saleResponseData);
    
    const saleId = saleResponseData.data.saleId || saleResponseData.data.sale?.id;
    console.log('[FLOW-15] Created sale ID:', saleId);

    // STEP 6: Verify sale visible in admin panel
    console.log('[FLOW-15] Step 6: Verify sale visible in admin panel');
    const adminSalesResponse = await apiContext.get(`/api/admin/tenants/${tenantId}/sales?page=1&perPage=50`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(adminSalesResponse.ok()).toBeTruthy();
    const adminSalesData = await adminSalesResponse.json();
    validateResponseEnvelope(adminSalesData);
    
    const sales = adminSalesData.data?.sales || adminSalesData.data || [];
    const createdSale = sales.find((s: any) => s.id === saleId || s.saleId === saleId);
    expect(createdSale, `Sale ${saleId} should be visible in admin panel`).toBeTruthy();
    console.log('[FLOW-15] Sale verified in admin panel');
    
    console.log('[FLOW-15] ✅ Web → Admin sync flow completed successfully');
    console.log('[FLOW-15] Party:', partyId);
    console.log('[FLOW-15] Sale:', saleId);
  });
});
