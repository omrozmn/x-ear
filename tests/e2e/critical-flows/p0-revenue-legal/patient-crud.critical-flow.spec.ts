/**
 * FLOW-01: Patient CRUD - Critical Flow Test
 * 
 * Priority: P0 (Revenue & Legal)
 * Why Critical: Foundation for all other flows, medical records, legal requirement
 * 
 * API Endpoints:
 * - GET /api/parties (listParties)
 * - POST /api/parties (createParties)
 * - GET /api/parties/{party_id} (getParty)
 * - PUT /api/parties/{party_id} (updateParty)
 * - DELETE /api/parties/{party_id} (deleteParty)
 */

import { test, expect } from '../../fixtures/fixtures';
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-01: Patient CRUD', () => {
  test('should complete patient CRUD lifecycle successfully', async ({ tenantPage, apiContext, authTokens }) => {
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    const testParty = {
      firstName: `Ahmet${uniqueId.slice(-5)}`,
      lastName: 'Yılmaz',
      phone: `+90555${uniqueId.slice(-7)}`,
      email: `test${uniqueId}@example.com`
    };

    // STEP 1: Navigate to parties list
    console.log('[FLOW-01] Step 1: Navigate to parties list');
    await tenantPage.goto('/parties');
    await tenantPage.waitForLoadState('networkidle');
    
    // Verify list loads
    await expect(tenantPage.locator('h1, h2').filter({ hasText: /Hasta|Party/i })).toBeVisible({ timeout: 10000 });

    // STEP 2: CREATE - Click "Yeni Hasta" and fill form
    console.log('[FLOW-01] Step 2: Create new patient');
    const createButton = tenantPage.getByRole('button', { name: /Yeni|Ekle|Hasta/i }).first();
    await createButton.click();
    
    // Wait for form to appear
    await tenantPage.waitForSelector('input[name="firstName"], input[name="first_name"]', { timeout: 5000 });
    
    // Fill form (handle both camelCase and snake_case field names)
    const firstNameInput = tenantPage.locator('input[name="firstName"], input[name="first_name"]').first();
    const lastNameInput = tenantPage.locator('input[name="lastName"], input[name="last_name"]').first();
    const phoneInput = tenantPage.locator('input[name="phone"]').first();
    
    await firstNameInput.fill(testParty.firstName);
    await lastNameInput.fill(testParty.lastName);
    await phoneInput.fill(testParty.phone);
    
    // Submit form
    const submitButton = tenantPage.getByRole('button', { name: /Kaydet|Save|Oluştur/i }).first();
    await submitButton.click();
    
    // Wait for API call to complete
    await waitForApiCall(tenantPage, '/api/parties', 10000);
    
    // Verify success (toast or redirect)
    await tenantPage.waitForLoadState('networkidle');
    
    // STEP 3: Verify creation via API
    console.log('[FLOW-01] Step 3: Verify party created via API');
    const listResponse = await apiContext.get('/api/parties?page=1&perPage=50', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    validateResponseEnvelope(listData);
    
    const createdParty = listData.data.find((p: any) => p.phone === testParty.phone);
    expect(createdParty, `Party with phone ${testParty.phone} should exist`).toBeTruthy();
    expect(createdParty.firstName).toBe(testParty.firstName);
    expect(createdParty.lastName).toBe(testParty.lastName);
    
    const partyId = createdParty.id;
    console.log('[FLOW-01] Created party ID:', partyId);

    // STEP 4: READ - Navigate to party detail
    console.log('[FLOW-01] Step 4: Navigate to party detail');
    await tenantPage.goto(`/parties/${partyId}`);
    await tenantPage.waitForLoadState('networkidle');
    
    // Verify detail page loads with correct data
    await expect(tenantPage.locator(`text=${testParty.firstName}`)).toBeVisible({ timeout: 10000 });
    await expect(tenantPage.locator(`text=${testParty.lastName}`)).toBeVisible();
    await expect(tenantPage.locator(`text=${testParty.phone}`)).toBeVisible();

    // STEP 5: UPDATE - Edit party
    console.log('[FLOW-01] Step 5: Update party');
    const editButton = tenantPage.getByRole('button', { name: /Düzenle|Edit/i }).first();
    await editButton.click();
    
    // Wait for edit form
    await tenantPage.waitForSelector('input[name="email"]', { timeout: 5000 });
    
    // Update email
    const emailInput = tenantPage.locator('input[name="email"]').first();
    await emailInput.fill(testParty.email);
    
    // Save changes
    const saveButton = tenantPage.getByRole('button', { name: /Kaydet|Save|Güncelle/i }).first();
    await saveButton.click();
    
    // Wait for update API call
    await waitForApiCall(tenantPage, `/api/parties/${partyId}`, 10000);
    await tenantPage.waitForLoadState('networkidle');
    
    // Verify update via API
    const getResponse = await apiContext.get(`/api/parties/${partyId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(getResponse.ok()).toBeTruthy();
    const getData = await getResponse.json();
    validateResponseEnvelope(getData);
    expect(getData.data.email).toBe(testParty.email);
    console.log('[FLOW-01] Party updated successfully');

    // STEP 6: DELETE - Remove party
    console.log('[FLOW-01] Step 6: Delete party');
    const deleteButton = tenantPage.getByRole('button', { name: /Sil|Delete/i }).first();
    await deleteButton.click();
    
    // Confirm deletion (if confirmation dialog appears)
    try {
      const confirmButton = tenantPage.getByRole('button', { name: /Onayla|Confirm|Evet|Yes/i }).first();
      await confirmButton.click({ timeout: 3000 });
    } catch (e) {
      console.log('[FLOW-01] No confirmation dialog, proceeding...');
    }
    
    // Wait for delete API call
    await waitForApiCall(tenantPage, `/api/parties/${partyId}`, 10000);
    
    // STEP 7: Verify deletion
    console.log('[FLOW-01] Step 7: Verify party deleted');
    await tenantPage.goto('/parties');
    await tenantPage.waitForLoadState('networkidle');
    
    // Verify party no longer appears in list
    const deletedPartyElement = tenantPage.locator(`text=${testParty.phone}`);
    await expect(deletedPartyElement).not.toBeVisible({ timeout: 5000 });
    
    // Verify via API (should return 404)
    const verifyDeleteResponse = await apiContext.get(`/api/parties/${partyId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(verifyDeleteResponse.status()).toBe(404);
    
    console.log('[FLOW-01] ✅ Patient CRUD flow completed successfully');
  });
});
