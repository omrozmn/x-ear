/**
 * FLOW-08: Payment Recording - Critical Flow Test
 * 
 * Priority: P1 (Core Operations)
 * Why Critical: Cash flow tracking, financial accuracy, customer balance
 * 
 * API Endpoints:
 * - GET /api/sales/{sale_id} (getSale)
 * - POST /api/payments (createPayment)
 * - GET /api/payments (listPayments)
 */

import { test, expect } from '../../fixtures/fixtures';
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-08: Payment Recording', () => {
  test('should record payment successfully', async ({ tenantPage, apiContext, authTokens }) => {
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    // STEP 1: Create test party via API (setup)
    console.log('[FLOW-08] Step 1: Create test party via API');
    const partyResponse = await apiContext.post('/api/parties', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `test-party-${uniqueId}`,
        'Content-Type': 'application/json'
      },
      data: {
        firstName: `Ayşe${uniqueId.slice(-5)}`,
        lastName: 'Demir',
        phone: `+90555${uniqueId.slice(-7)}`,
        email: `test${uniqueId}@example.com`
      }
    });
    
    expect(partyResponse.ok()).toBeTruthy();
    const partyData = await partyResponse.json();
    const partyId = partyData.data.id;
    console.log('[FLOW-08] Created party ID:', partyId);

    // STEP 2: Create test sale via API (setup)
    console.log('[FLOW-08] Step 2: Create test sale via API');
    const saleAmount = 18000; // ₺18,000
    const downPayment = 5000; // ₺5,000
    
    const saleResponse = await apiContext.post('/api/sales', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `test-sale-${uniqueId}`,
        'Content-Type': 'application/json'
      },
      data: {
        partyId: partyId,
        totalAmount: saleAmount,
        paidAmount: downPayment,
        paymentMethod: 'cash',
        status: 'active'
      }
    });
    
    expect(saleResponse.ok()).toBeTruthy();
    const saleData = await saleResponse.json();
    const saleId = saleData.data.id;
    const initialBalance = saleAmount - downPayment; // ₺13,000
    console.log('[FLOW-08] Created sale ID:', saleId, 'Initial balance:', initialBalance);

    // STEP 3: Navigate to sale detail
    console.log('[FLOW-08] Step 3: Navigate to sale detail');
    await tenantPage.goto(`/sales/${saleId}`);
    await tenantPage.waitForLoadState('networkidle');
    
    // Verify sale detail page loads
    await expect(tenantPage.locator('h1, h2').filter({ hasText: /Satış|Sale/i })).toBeVisible({ timeout: 10000 });
    
    // Verify initial balance
    await expect(tenantPage.locator(`text=/₺?${initialBalance.toLocaleString('tr-TR')}/`)).toBeVisible({ timeout: 5000 });

    // STEP 4: Click "Ödeme Kaydet"
    console.log('[FLOW-08] Step 4: Click record payment button');
    const paymentButton = tenantPage.getByRole('button', { name: /Ödeme|Payment|Tahsilat/i }).first();
    await paymentButton.click();
    
    // Wait for payment form to appear
    await tenantPage.waitForSelector('input[name="amount"], input[name="paymentAmount"]', { timeout: 5000 });

    // STEP 5: Enter payment amount
    console.log('[FLOW-08] Step 5: Enter payment amount');
    const paymentAmount = 3000; // ₺3,000
    
    const amountInput = tenantPage.locator('input[name="amount"], input[name="paymentAmount"]').first();
    await amountInput.fill(paymentAmount.toString());

    // STEP 6: Select payment method
    console.log('[FLOW-08] Step 6: Select payment method');
    const methodSelect = tenantPage.locator('select[name="paymentMethod"], select[name="method"]').first();
    await methodSelect.selectOption('credit_card').catch(async () => {
      // Fallback: try bank transfer
      await methodSelect.selectOption('bank_transfer').catch(async () => {
        // Fallback: select any option
        await methodSelect.selectOption({ index: 1 });
      });
    });

    // STEP 7: Submit payment
    console.log('[FLOW-08] Step 7: Submit payment');
    const submitButton = tenantPage.getByRole('button', { name: /Kaydet|Save|Onayla|Confirm/i }).first();
    await submitButton.click();
    
    // Wait for API call
    await waitForApiCall(tenantPage, '/api/payments', 10000);
    await tenantPage.waitForLoadState('networkidle');

    // STEP 8: Verify payment recorded via API
    console.log('[FLOW-08] Step 8: Verify payment recorded via API');
    const paymentsResponse = await apiContext.get(`/api/payments?saleId=${saleId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(paymentsResponse.ok()).toBeTruthy();
    const paymentsData = await paymentsResponse.json();
    validateResponseEnvelope(paymentsData);
    
    const payments = paymentsData.data;
    const totalPaid = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    expect(totalPaid).toBeGreaterThanOrEqual(downPayment + paymentAmount);
    
    console.log('[FLOW-08] Total paid:', totalPaid);

    // STEP 9: Verify sale balance updated
    console.log('[FLOW-08] Step 9: Verify sale balance updated');
    const saleResponse2 = await apiContext.get(`/api/sales/${saleId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(saleResponse2.ok()).toBeTruthy();
    const saleData2 = await saleResponse2.json();
    validateResponseEnvelope(saleData2);
    
    const updatedSale = saleData2.data;
    const expectedBalance = saleAmount - totalPaid;
    const actualBalance = updatedSale.remainingAmount || updatedSale.balance || (updatedSale.totalAmount - updatedSale.paidAmount);
    
    expect(actualBalance).toBe(expectedBalance);
    console.log('[FLOW-08] Updated balance:', actualBalance, 'Expected:', expectedBalance);

    // STEP 10: Verify remaining = total - paid
    console.log('[FLOW-08] Step 10: Verify balance calculation');
    await tenantPage.goto(`/sales/${saleId}`);
    await tenantPage.waitForLoadState('networkidle');
    
    // Verify updated balance appears on page
    const newBalance = saleAmount - totalPaid;
    await expect(tenantPage.locator(`text=/₺?${newBalance.toLocaleString('tr-TR')}/`)).toBeVisible({ timeout: 10000 });
    
    // Verify payment appears in payment history
    await expect(tenantPage.locator(`text=/₺?${paymentAmount.toLocaleString('tr-TR')}/`)).toBeVisible();
    
    console.log('[FLOW-08] ✅ Payment recording flow completed successfully');
  });
});
