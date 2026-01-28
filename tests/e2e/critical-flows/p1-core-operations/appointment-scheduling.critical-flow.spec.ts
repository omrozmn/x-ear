/**
 * FLOW-06: Appointment Scheduling - Critical Flow Test
 * 
 * Priority: P1 (Core Operations)
 * Why Critical: Core clinic workflow, patient experience, resource planning
 * 
 * API Endpoints:
 * - GET /api/appointments (listAppointments)
 * - POST /api/appointments (createAppointment)
 * - GET /api/appointments/{appointment_id} (getAppointment)
 */

import { test, expect } from '../../fixtures/fixtures';
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-06: Appointment Scheduling', () => {
  test('should schedule appointment successfully', async ({ tenantPage, apiContext, authTokens }) => {
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    // STEP 1: Create test party via API (setup)
    console.log('[FLOW-06] Step 1: Create test party via API');
    const partyResponse = await apiContext.post('/api/parties', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `test-${uniqueId}`,
        'Content-Type': 'application/json'
      },
      data: {
        firstName: `Mehmet${uniqueId.slice(-5)}`,
        lastName: 'Kaya',
        phone: `+90555${uniqueId.slice(-7)}`,
        email: `test${uniqueId}@example.com`
      }
    });
    
    expect(partyResponse.ok()).toBeTruthy();
    const partyData = await partyResponse.json();
    validateResponseEnvelope(partyData);
    const partyId = partyData.data.id;
    console.log('[FLOW-06] Created party ID:', partyId);

    // STEP 2: Navigate to appointments page
    console.log('[FLOW-06] Step 2: Navigate to appointments page');
    await tenantPage.goto('/appointments');
    await tenantPage.waitForLoadState('networkidle');
    
    // Verify appointments page loads
    await expect(tenantPage.locator('h1, h2').filter({ hasText: /Randevu|Appointment/i })).toBeVisible({ timeout: 10000 });

    // STEP 3: Click "Yeni Randevu"
    console.log('[FLOW-06] Step 3: Click new appointment button');
    const createButton = tenantPage.getByRole('button', { name: /Yeni|Randevu|Ekle/i }).first();
    await createButton.click();
    
    // Wait for form to appear
    await tenantPage.waitForSelector('input[name="date"], input[name="appointmentDate"]', { timeout: 5000 });

    // STEP 4: Select patient
    console.log('[FLOW-06] Step 4: Select patient');
    const patientSearch = tenantPage.locator('input[name="partyId"], input[name="patientSearch"], input[placeholder*="Hasta"]').first();
    await patientSearch.fill(`Mehmet${uniqueId.slice(-5)}`);
    await tenantPage.waitForTimeout(500); // Wait for search results
    
    // Click on the patient from search results
    const patientOption = tenantPage.locator(`li:has-text("Mehmet${uniqueId.slice(-5)}")`).first();
    await patientOption.click({ timeout: 3000 }).catch(async () => {
      // Fallback: If dropdown doesn't work, try direct selection
      console.log('[FLOW-06] Fallback: Using direct party ID');
      const partyIdInput = tenantPage.locator('input[name="partyId"]').first();
      await partyIdInput.fill(partyId);
    });

    // STEP 5: Set date/time
    console.log('[FLOW-06] Step 5: Set appointment date and time');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeString = '14:00'; // 2 PM
    
    const dateInput = tenantPage.locator('input[name="date"], input[name="appointmentDate"], input[type="date"]').first();
    await dateInput.fill(dateString);
    
    const timeInput = tenantPage.locator('input[name="time"], input[name="appointmentTime"], input[type="time"]').first();
    await timeInput.fill(timeString);

    // STEP 6: Select service type
    console.log('[FLOW-06] Step 6: Select service type');
    const serviceSelect = tenantPage.locator('select[name="serviceType"], select[name="service"]').first();
    await serviceSelect.selectOption({ index: 1 }).catch(async () => {
      // Fallback: If select doesn't work, try clicking option
      await serviceSelect.click();
      await tenantPage.locator('option').nth(1).click();
    });

    // STEP 7: Submit appointment
    console.log('[FLOW-06] Step 7: Submit appointment');
    const submitButton = tenantPage.getByRole('button', { name: /Kaydet|Save|Oluştur|Create/i }).first();
    await submitButton.click();
    
    // Wait for API call
    await waitForApiCall(tenantPage, '/api/appointments', 10000);
    await tenantPage.waitForLoadState('networkidle');

    // STEP 8: Verify appointment created via API
    console.log('[FLOW-06] Step 8: Verify appointment created via API');
    const listResponse = await apiContext.get('/api/appointments?page=1&perPage=50', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    validateResponseEnvelope(listData);
    
    const createdAppointment = listData.data.find((a: any) => a.partyId === partyId);
    expect(createdAppointment, `Appointment for party ${partyId} should exist`).toBeTruthy();
    expect(createdAppointment.date).toContain(dateString);
    
    console.log('[FLOW-06] Created appointment ID:', createdAppointment.id);

    // STEP 9: Verify appointment in calendar view
    console.log('[FLOW-06] Step 9: Verify appointment in calendar view');
    await tenantPage.goto('/appointments');
    await tenantPage.waitForLoadState('networkidle');
    
    // Look for the patient name in the appointments list/calendar
    await expect(tenantPage.locator(`text=Mehmet${uniqueId.slice(-5)}`)).toBeVisible({ timeout: 10000 });

    // STEP 10: Verify appointment in list view
    console.log('[FLOW-06] Step 10: Verify appointment in list view');
    // Switch to list view if there's a toggle
    const listViewButton = tenantPage.getByRole('button', { name: /Liste|List/i }).first();
    await listViewButton.click({ timeout: 3000 }).catch(() => {
      console.log('[FLOW-06] No list view toggle found, assuming already in list view');
    });
    
    // Verify appointment appears
    await expect(tenantPage.locator(`text=Mehmet${uniqueId.slice(-5)}`)).toBeVisible();
    await expect(tenantPage.locator(`text=${dateString}`).or(tenantPage.locator(`text=${tomorrow.toLocaleDateString('tr-TR')}`))).toBeVisible();
    
    console.log('[FLOW-06] ✅ Appointment scheduling flow completed successfully');
  });
});
