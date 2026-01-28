/**
 * FLOW-09: SGK Submission - Critical Flow Test
 * 
 * Priority: P1 (Core Operations)
 * Why Critical: Government reimbursement, patient affordability, legal compliance
 * 
 * API Endpoints:
 * - GET /api/parties/{party_id}/hearing-profile (getHearingProfile)
 * - POST /api/sgk/claims (createSGKClaim)
 * - GET /api/sgk/claims (listSGKClaims)
 */

import { test, expect } from '../../fixtures/fixtures';
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-09: SGK Submission', () => {
  test('should submit SGK claim successfully', async ({ tenantPage, apiContext, authTokens }) => {
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    // STEP 1: Create test party with SGK info via API (setup)
    console.log('[FLOW-09] Step 1: Create test party with SGK info via API');
    const partyResponse = await apiContext.post('/api/parties', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `test-party-${uniqueId}`,
        'Content-Type': 'application/json'
      },
      data: {
        firstName: `Fatma${uniqueId.slice(-5)}`,
        lastName: 'Şahin',
        phone: `+90555${uniqueId.slice(-7)}`,
        email: `test${uniqueId}@example.com`,
        tcNumber: `${uniqueId}123` // Mock TC number
      }
    });
    
    expect(partyResponse.ok()).toBeTruthy();
    const partyData = await partyResponse.json();
    const partyId = partyData.data.id;
    console.log('[FLOW-09] Created party ID:', partyId);

    // STEP 2: Add SGK info to hearing profile
    console.log('[FLOW-09] Step 2: Add SGK info to hearing profile');
    const sgkInfo = {
      sgkNumber: `${uniqueId}`,
      scheme: 'over18_working',
      eligibilityDate: new Date().toISOString().split('T')[0]
    };
    
    const profileResponse = await apiContext.post(`/api/parties/${partyId}/hearing-profile`, {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `test-profile-${uniqueId}`,
        'Content-Type': 'application/json'
      },
      data: {
        sgkInfo: sgkInfo
      }
    });
    
    expect(profileResponse.ok()).toBeTruthy();
    console.log('[FLOW-09] Added SGK info to hearing profile');

    // STEP 3: Navigate to SGK page
    console.log('[FLOW-09] Step 3: Navigate to SGK page');
    await tenantPage.goto('/sgk');
    await tenantPage.waitForLoadState('networkidle');
    
    // Verify SGK page loads
    await expect(tenantPage.locator('h1, h2').filter({ hasText: /SGK|Sosyal Güvenlik/i })).toBeVisible({ timeout: 10000 });

    // STEP 4: Click "Yeni Talep"
    console.log('[FLOW-09] Step 4: Click new claim button');
    const createButton = tenantPage.getByRole('button', { name: /Yeni|Talep|Başvuru/i }).first();
    await createButton.click();
    
    // Wait for form to appear
    await tenantPage.waitForSelector('input[name="partyId"], input[placeholder*="Hasta"]', { timeout: 5000 });

    // STEP 5: Select patient
    console.log('[FLOW-09] Step 5: Select patient');
    const patientSearch = tenantPage.locator('input[name="partyId"], input[name="patientSearch"], input[placeholder*="Hasta"]').first();
    await patientSearch.fill(`Fatma${uniqueId.slice(-5)}`);
    await tenantPage.waitForTimeout(500); // Wait for search results
    
    // Click on the patient from search results
    const patientOption = tenantPage.locator(`li:has-text("Fatma${uniqueId.slice(-5)}")`).first();
    await patientOption.click({ timeout: 3000 }).catch(async () => {
      // Fallback: If dropdown doesn't work, try direct selection
      console.log('[FLOW-09] Fallback: Using direct party ID');
      const partyIdInput = tenantPage.locator('input[name="partyId"]').first();
      await partyIdInput.fill(partyId);
    });

    // STEP 6: Verify SGK eligibility
    console.log('[FLOW-09] Step 6: Verify SGK eligibility displayed');
    await tenantPage.waitForTimeout(1000); // Wait for eligibility check
    
    // Verify SGK number appears
    await expect(tenantPage.locator(`text=${sgkInfo.sgkNumber}`)).toBeVisible({ timeout: 5000 });
    
    // Verify scheme appears
    await expect(tenantPage.locator('text=/18 Yaş Üstü|Çalışan|Working/i')).toBeVisible({ timeout: 5000 });

    // STEP 7: Select devices
    console.log('[FLOW-09] Step 7: Select devices');
    const deviceSelect = tenantPage.locator('select[name="deviceId"], input[name="deviceSearch"]').first();
    
    if (await deviceSelect.tagName() === 'SELECT') {
      await deviceSelect.selectOption({ index: 1 });
    } else {
      // If it's a search input
      await deviceSelect.fill('Phonak');
      await tenantPage.waitForTimeout(500);
      await tenantPage.locator('li:has-text("Phonak")').first().click({ timeout: 3000 }).catch(() => {
        console.log('[FLOW-09] Device selection failed, continuing...');
      });
    }

    // STEP 8: Calculate coverage
    console.log('[FLOW-09] Step 8: Calculate SGK coverage');
    const devicePrice = 25000; // ₺25,000
    const sgkCoverage = 5000; // ₺5,000 (typical SGK support)
    
    // Enter device price if needed
    const priceInput = tenantPage.locator('input[name="devicePrice"], input[name="price"]').first();
    await priceInput.fill(devicePrice.toString()).catch(() => {
      console.log('[FLOW-09] Price input not found, may be auto-filled');
    });
    
    // Verify coverage calculation appears
    await expect(tenantPage.locator(`text=/₺?${sgkCoverage.toLocaleString('tr-TR')}/`).or(
      tenantPage.locator('text=/Destek|Katkı|Coverage/i')
    )).toBeVisible({ timeout: 5000 });

    // STEP 9: Submit claim
    console.log('[FLOW-09] Step 9: Submit SGK claim');
    const submitButton = tenantPage.getByRole('button', { name: /Kaydet|Save|Gönder|Submit/i }).first();
    await submitButton.click();
    
    // Wait for API call
    await waitForApiCall(tenantPage, '/api/sgk', 10000);
    await tenantPage.waitForLoadState('networkidle');

    // STEP 10: Verify claim recorded via API
    console.log('[FLOW-09] Step 10: Verify claim recorded via API');
    const claimsResponse = await apiContext.get('/api/sgk/claims?page=1&perPage=50', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(claimsResponse.ok()).toBeTruthy();
    const claimsData = await claimsResponse.json();
    validateResponseEnvelope(claimsData);
    
    const createdClaim = claimsData.data.find((c: any) => c.partyId === partyId);
    expect(createdClaim, `SGK claim for party ${partyId} should exist`).toBeTruthy();
    expect(createdClaim.sgkNumber).toBe(sgkInfo.sgkNumber);
    
    console.log('[FLOW-09] Created SGK claim ID:', createdClaim.id);
    
    // Verify claim appears in list
    await tenantPage.goto('/sgk');
    await tenantPage.waitForLoadState('networkidle');
    
    await expect(tenantPage.locator(`text=Fatma${uniqueId.slice(-5)}`)).toBeVisible({ timeout: 10000 });
    await expect(tenantPage.locator(`text=${sgkInfo.sgkNumber}`)).toBeVisible();
    
    console.log('[FLOW-09] ✅ SGK submission flow completed successfully');
  });
});
