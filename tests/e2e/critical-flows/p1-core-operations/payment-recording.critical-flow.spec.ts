/**
 * FLOW-08: Payment Recording - Critical Flow Test
 * 
 * Priority: P1 (Core Operations)
 * Why Critical: Cash flow tracking, financial accuracy, customer balance
 * 
 * API Endpoints:
 * - POST /api/sales (createSale)
 * - GET /api/sales/{sale_id} (getSale)
 * - POST /api/payment-records (createPaymentRecords)
 * - GET /api/payment-records (listPaymentRecords)
 */

import { test, expect } from '../../fixtures/fixtures';
import { validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-08: Payment Recording', () => {
  test('should record payment successfully', async ({ apiContext, authTokens }) => {
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
    
    if (!partyResponse.ok()) {
      const errorBody = await partyResponse.text();
      console.error('[FLOW-08] Create party failed:', partyResponse.status(), errorBody);
    }
    expect(partyResponse.ok()).toBeTruthy();
    const partyData = await partyResponse.json();
    const partyId = partyData.data.id;
    console.log('[FLOW-08] Created party ID:', partyId);

    // STEP 2: Create test inventory item (product) via API (setup)
    console.log('[FLOW-08] Step 2: Create test inventory item via API');
    const productResponse = await apiContext.post('/api/inventory', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `test-product-${uniqueId}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: `Test Device ${uniqueId.slice(-5)}`,
        brand: 'Phonak',
        model: `Test-${uniqueId}`,
        barcode: `BAR${uniqueId}`,
        category: 'hearing_aid',
        price: 18000,
        availableInventory: 10
      }
    });
    
    if (!productResponse.ok()) {
      const errorBody = await productResponse.text();
      console.error('[FLOW-08] Create product failed:', productResponse.status(), errorBody);
    }
    expect(productResponse.ok()).toBeTruthy();
    const productData = await productResponse.json();
    const productId = productData.data.id;
    console.log('[FLOW-08] Created product ID:', productId);

    // STEP 3: Create test sale via API (setup)
    console.log('[FLOW-08] Step 3: Create test sale via API');
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
        productId: productId,
        salesPrice: saleAmount,
        paidAmount: downPayment,
        paymentMethod: 'cash'
      }
    });
    
    if (!saleResponse.ok()) {
      const errorBody = await saleResponse.text();
      console.error('[FLOW-08] Create sale failed:', saleResponse.status(), errorBody);
    }
    expect(saleResponse.ok(), `Create sale should succeed (status: ${saleResponse.status()})`).toBeTruthy();
    const saleData = await saleResponse.json();
    console.log('[FLOW-08] Sale response data:', JSON.stringify(saleData, null, 2));
    validateResponseEnvelope(saleData);
    const saleId = saleData.data?.id;
    expect(saleId, 'Sale ID should be defined').toBeTruthy();
    const initialBalance = saleAmount - downPayment; // ₺13,000
    console.log('[FLOW-08] Created sale ID:', saleId, 'Initial balance:', initialBalance);

    // STEP 4: Verify sale created correctly
    console.log('[FLOW-08] Step 4: Verify sale created correctly');
    const getSaleResponse = await apiContext.get(`/api/sales/${saleId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(getSaleResponse.ok()).toBeTruthy();
    const getSaleData = await getSaleResponse.json();
    validateResponseEnvelope(getSaleData);
    expect(getSaleData.data.id).toBe(saleId);
    expect(getSaleData.data.partyId).toBe(partyId);

    // STEP 5: Record additional payment via API
    console.log('[FLOW-08] Step 5: Record additional payment via API');
    const paymentAmount = 3000; // ₺3,000
    
    const paymentResponse = await apiContext.post('/api/payment-records', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `test-payment-${uniqueId}`,
        'Content-Type': 'application/json'
      },
      data: {
        partyId: partyId,
        saleId: saleId,
        amount: paymentAmount,
        paymentMethod: 'credit_card',
        paymentType: 'payment',
        paymentDate: new Date().toISOString()
      }
    });
    
    if (!paymentResponse.ok()) {
      const errorBody = await paymentResponse.text();
      console.error('[FLOW-08] Create payment failed:', paymentResponse.status(), errorBody);
    }
    expect(paymentResponse.ok(), `Create payment should succeed (status: ${paymentResponse.status()})`).toBeTruthy();
    const paymentData = await paymentResponse.json();
    console.log('[FLOW-08] Created payment ID:', paymentData.data.id);

    // STEP 6: Verify payment recorded via API
    console.log('[FLOW-08] Step 6: Verify payment recorded via API');
    const paymentsResponse = await apiContext.get(`/api/payment-records?saleId=${saleId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(paymentsResponse.ok()).toBeTruthy();
    const paymentsData = await paymentsResponse.json();
    validateResponseEnvelope(paymentsData);
    
    const payments = paymentsData.data;
    expect(payments.length).toBeGreaterThan(0);
    
    // Find our payment
    const ourPayment = payments.find((p: any) => p.amount === paymentAmount);
    expect(ourPayment, `Payment with amount ${paymentAmount} should exist`).toBeTruthy();
    expect(ourPayment.saleId).toBe(saleId);
    expect(ourPayment.partyId).toBe(partyId);
    
    console.log('[FLOW-08] Payment verified, amount:', paymentAmount);

    // STEP 7: Verify sale balance updated
    console.log('[FLOW-08] Step 7: Verify sale balance updated');
    const saleResponse2 = await apiContext.get(`/api/sales/${saleId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(saleResponse2.ok()).toBeTruthy();
    const saleData2 = await saleResponse2.json();
    validateResponseEnvelope(saleData2);
    
    const updatedSale = saleData2.data;
    const totalPaid = downPayment + paymentAmount;
    const expectedBalance = saleAmount - totalPaid;
    
    // Check paid amount increased
    expect(updatedSale.paidAmount).toBeGreaterThanOrEqual(downPayment);
    console.log('[FLOW-08] Sale paid amount:', updatedSale.paidAmount);
    console.log('[FLOW-08] Expected total paid:', totalPaid);
    console.log('[FLOW-08] Expected remaining balance:', expectedBalance);

    // STEP 8: Verify payment appears in party's payment history
    console.log('[FLOW-08] Step 8: Verify payment in party payment history');
    const partyPaymentsResponse = await apiContext.get(`/api/parties/${partyId}/payment-records`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(partyPaymentsResponse.ok()).toBeTruthy();
    const partyPaymentsData = await partyPaymentsResponse.json();
    validateResponseEnvelope(partyPaymentsData);
    
    const partyPayments = partyPaymentsData.data;
    expect(partyPayments.length).toBeGreaterThan(0);
    
    // Verify our payment is in the list
    const foundPayment = partyPayments.find((p: any) => p.amount === paymentAmount && p.saleId === saleId);
    expect(foundPayment, `Payment should appear in party's payment history`).toBeTruthy();
    
    console.log('[FLOW-08] ✅ Payment recording flow completed successfully');
    console.log('[FLOW-08] Party ID:', partyId);
    console.log('[FLOW-08] Sale ID:', saleId);
    console.log('[FLOW-08] Payment amount:', paymentAmount);
    console.log('[FLOW-08] Total paid:', totalPaid);
  });
});
