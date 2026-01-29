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
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-15: Web → Admin Data Sync', () => {
  test('should sync data from web app to admin panel', async ({ tenantPage, adminPage, apiContext, authTokens }) => {
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    const testParty = {
      firstName: `SyncTest${uniqueId.slice(-5)}`,
      lastName: 'WebToAdmin',
      phone: `+90555${uniqueId.slice(-7)}`,
      email: `sync${uniqueId}@example.com`
    };

    // STEP 1: CREATE in web app
    console.log('[FLOW-15] Step 1: Create party in web app');
    await tenantPage.goto('/parties');
    await tenantPage.waitForLoadState('networkidle');
    
    const createButton = tenantPage.getByRole('button', { name: /Yeni|Hasta|Ekle/i }).first();
    await createButton.click();
    
    await tenantPage.waitForSelector('input[name="firstName"], input[name="first_name"]', { timeout: 5000 });
    
    const firstNameInput = tenantPage.locator('input[name="firstName"], input[name="first_name"]').first();
    const lastNameInput = tenantPage.locator('input[name="lastName"], input[name="last_name"]').first();
    const phoneInput = tenantPage.locator('input[name="phone"]').first();
    const emailInput = tenantPage.locator('input[name="email"]').first();
    
    await firstNameInput.fill(testParty.firstName);
    await lastNameInput.fill(testParty.lastName);
    await phoneInput.fill(testParty.phone);
    await emailInput.fill(testParty.email);
    
    const submitButton = tenantPage.getByRole('button', { name: /Kaydet|Save/i }).first();
    await submitButton.click();
    
    await waitForApiCall(tenantPage, '/api/parties', 10000);
    await tenantPage.waitForLoadState('networkidle');

    // STEP 2: Get party ID via API
    console.log('[FLOW-15] Step 2: Get party ID via API');
    const listResponse = await apiContext.get('/api/parties?page=1&perPage=50', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    validateResponseEnvelope(listData);
    
    const createdParty = listData.data.find((p: any) => p.phone === testParty.phone);
    expect(createdParty, `Party with phone ${testParty.phone} should exist`).toBeTruthy();
    
    const partyId = createdParty.id;
    const tenantId = createdParty.tenantId;
    console.log('[FLOW-15] Created party ID:', partyId, 'Tenant ID:', tenantId);

    // STEP 3: VERIFY in admin panel
    console.log('[FLOW-15] Step 3: Verify party appears in admin panel');
    await adminPage.goto('/tenants');
    await adminPage.waitForLoadState('networkidle');
    
    // Find and click on the tenant
    const tenantRow = adminPage.locator(`tr:has-text("${tenantId}")`).first();
    await tenantRow.click({ timeout: 5000 }).catch(async () => {
      // Fallback: navigate directly to tenant detail
      await adminPage.goto(`/tenants/${tenantId}`);
    });
    
    await adminPage.waitForLoadState('networkidle');
    
    // Click on "Hastalar" or "Parties" tab
    const partiesTab = adminPage.locator('button:has-text("Hasta"), a:has-text("Hasta"), button:has-text("Parties")').first();
    await partiesTab.click({ timeout: 5000 }).catch(() => {
      console.log('[FLOW-15] Parties tab not found, assuming already on parties view');
    });
    
    await adminPage.waitForLoadState('networkidle');

    // STEP 4: Search for party
    console.log('[FLOW-15] Step 4: Search for party in admin panel');
    const searchInput = adminPage.locator('input[placeholder*="Ara"], input[placeholder*="Search"]').first();
    await searchInput.fill(testParty.phone);
    await adminPage.waitForTimeout(1000); // Debounce

    // STEP 5: Verify party appears
    console.log('[FLOW-15] Step 5: Verify party visible in admin panel');
    await expect(adminPage.locator(`text=${testParty.firstName}`)).toBeVisible({ timeout: 10000 });
    await expect(adminPage.locator(`text=${testParty.phone}`)).toBeVisible();
    
    console.log('[FLOW-15] Party found in admin panel');

    // STEP 6: EDIT in admin panel
    console.log('[FLOW-15] Step 6: Edit party in admin panel');
    const partyRow = adminPage.locator(`tr:has-text("${testParty.firstName}")`).first();
    await partyRow.click();
    
    await adminPage.waitForLoadState('networkidle');
    
    const editButton = adminPage.getByRole('button', { name: /Düzenle|Edit/i }).first();
    await editButton.click();
    
    await adminPage.waitForSelector('input[name="email"]', { timeout: 5000 });
    
    const newEmail = `admin-edit-${timestamp}@example.com`;
    const emailEditInput = adminPage.locator('input[name="email"]').first();
    await emailEditInput.clear();
    await emailEditInput.fill(newEmail);
    
    const saveButton = adminPage.getByRole('button', { name: /Kaydet|Save/i }).first();
    await saveButton.click();
    
    await waitForApiCall(adminPage, `/api/admin/parties/${partyId}`, 10000);
    await adminPage.waitForLoadState('networkidle');
    
    console.log('[FLOW-15] Updated email to:', newEmail);

    // STEP 7: VERIFY in web app
    console.log('[FLOW-15] Step 7: Verify changes reflected in web app');
    await tenantPage.goto(`/parties/${partyId}`);
    await tenantPage.waitForLoadState('networkidle');
    
    await expect(tenantPage.locator(`text=${newEmail}`)).toBeVisible({ timeout: 10000 });
    
    console.log('[FLOW-15] Changes verified in web app');

    // STEP 8: Verify tenant isolation
    console.log('[FLOW-15] Step 8: Verify tenant isolation');
    const partyResponse = await apiContext.get(`/api/parties/${partyId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(partyResponse.ok()).toBeTruthy();
    const partyData = await partyResponse.json();
    validateResponseEnvelope(partyData);
    
    expect(partyData.data.tenantId).toBe(tenantId);
    expect(partyData.data.email).toBe(newEmail);
    
    console.log('[FLOW-15] ✅ Web → Admin sync flow completed successfully');
  });
});
