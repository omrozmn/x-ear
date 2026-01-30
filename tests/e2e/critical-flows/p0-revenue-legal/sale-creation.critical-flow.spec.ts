/**
 * FLOW-03: Sale Creation - Critical Flow Test
 * 
 * Priority: P0 (Revenue & Legal)
 * Why Critical: Revenue generation, financial records, cash flow tracking
 * 
 * API Endpoints:
 * - POST /api/sales (createSales)
 * - GET /api/sales (listSales)
 * - GET /api/sales/{sale_id} (getSale)
 * - POST /api/sales/{sale_id}/payments (createSalePayments)
 */

import { test, expect } from '../../fixtures/fixtures';
import { createTestParty, waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-03: Sale Creation', () => {
  test('should create sale with payment successfully', async ({ tenantPage, request, authTokens }) => {
    // Prerequisites: Create test party
    const timestamp = Date.now();
    const partyId = await createTestParty(request, authTokens.accessToken, {
      firstName: 'Ayşe',
      lastName: 'Demir',
      phone: `+90555${timestamp.toString().slice(-7)}`
    });
    
    console.log('[FLOW-03] Created test party:', partyId);

    // STEP 1: Navigate to sales page
    console.log('[FLOW-03] Step 1: Navigate to sales');
    await tenantPage.goto('/sales');
    await tenantPage.waitForLoadState('networkidle');
    
    // STEP 2: Click "Yeni Satış"
    console.log('[FLOW-03] Step 2: Click new sale');
    const newSaleButton = tenantPage.getByRole('button', { name: /Yeni|New|Satış|Sale/i }).first();
    await newSaleButton.click();
    
    // Wait for sale form
    await tenantPage.waitForLoadState('networkidle');
    
    // STEP 3: Select patient
    console.log('[FLOW-03] Step 3: Select patient');
    const partySearchInput = tenantPage.locator('input[name="partySearch"], input[placeholder*="Hasta"], input[placeholder*="Patient"]').first();
    await partySearchInput.fill('Ayşe');
    
    // Wait for search results and select
    await tenantPage.waitForTimeout(1000); // Debounce
    const partyOption = tenantPage.locator(`text=/Ayşe.*Demir/i`).first();
    await partyOption.click();
    
    // STEP 4: Select device (if device selection is required)
    console.log('[FLOW-03] Step 4: Select device');
    try {
      const deviceButton = tenantPage.getByRole('button', { name: /Cihaz|Device|Seç|Select/i }).first();
      await deviceButton.click({ timeout: 3000 });
      
      // Select first device
      const deviceCheckbox = tenantPage.locator('input[type="checkbox"]').first();
      await deviceCheckbox.click();
      
      const addDevicesButton = tenantPage.getByRole('button', { name: /Ekle|Add|Seçilenleri/i }).first();
      await addDevicesButton.click();
    } catch (e) {
      console.log('[FLOW-03] Device selection not required or already selected');
    }
    
    // STEP 5: Enter pricing
    console.log('[FLOW-03] Step 5: Enter pricing');
    const listPriceInput = tenantPage.locator('input[name="listPrice"], input[name="list_price"]').first();
    const discountInput = tenantPage.locator('input[name="discount"], input[name="discount_amount"]').first();
    const sgkCoverageInput = tenantPage.locator('input[name="sgkCoverage"], input[name="sgk_coverage"]').first();
    
    await listPriceInput.fill('25000');
    await discountInput.fill('2000');
    await sgkCoverageInput.fill('5000');
    
    // STEP 6: Select payment method
    console.log('[FLOW-03] Step 6: Select payment method');
    const paymentMethodSelect = tenantPage.locator('select[name="paymentMethod"], select[name="payment_method"]').first();
    await paymentMethodSelect.selectOption('cash');
    
    // STEP 7: Enter down payment
    console.log('[FLOW-03] Step 7: Enter down payment');
    const paidAmountInput = tenantPage.locator('input[name="paidAmount"], input[name="paid_amount"]').first();
    await paidAmountInput.fill('5000');
    
    // STEP 8: Submit sale
    console.log('[FLOW-03] Step 8: Submit sale');
    const submitButton = tenantPage.getByRole('button', { name: /Satış|Sale|Oluştur|Create|Kaydet/i }).first();
    await submitButton.click();
    
    // Wait for API call
    await waitForApiCall(tenantPage, '/api/sales', 10000);
    await tenantPage.waitForLoadState('networkidle');
    
    // STEP 9: Verify sale created via API
    console.log('[FLOW-03] Step 9: Verify sale via API');
    const response = await request.get('/api/sales?page=1&perPage=10', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    validateResponseEnvelope(data);
    
    // Find the sale we just created
    const sale = data.data.find((s: any) => s.partyId === partyId);
    expect(sale, 'Sale should exist for the party').toBeTruthy();
    
    // Verify amounts
    expect(sale.listPriceTotal || sale.list_price_total).toBe(25000);
    expect(sale.discountAmount || sale.discount_amount).toBe(2000);
    expect(sale.sgkCoverage || sale.sgk_coverage).toBe(5000);
    expect(sale.paidAmount || sale.paid_amount).toBe(5000);
    
    // Final amount should be: 25000 - 2000 - 5000 = 18000
    const expectedFinalAmount = 18000;
    expect(sale.finalAmount || sale.final_amount).toBe(expectedFinalAmount);
    
    console.log('[FLOW-03] ✅ Sale creation flow completed successfully');
  });
});
