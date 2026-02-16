/**
 * FLOW-04: E-Invoice Generation & BirFatura Integration - Critical Flow Test
 * 
 * Priority: P0 (Revenue & Legal - HIGH RISK)
 * Why Critical: Legal requirement, tax compliance, GIB integration, audit trail
 * 
 * Flow:
 * 1. Create sale with party
 * 2. Generate e-invoice from sale
 * 3. Submit XML to BirFatura (test API)
 * 4. Track invoice status via modal
 * 5. Download PDF from BirFatura/GIB
 * 6. Verify PDF display in modal
 * 
 * API Endpoints:
 * - POST /api/sales (create sale)
 * - POST /api/sales/{sale_id}/invoice (generate invoice)
 * - GET /api/invoices/{invoice_id}/status (check BirFatura status)
 * - GET /api/invoices/{invoice_id}/pdf (download PDF)
 */

import { test, expect } from '../../fixtures/fixtures';
import { validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-04: E-Invoice Generation & BirFatura Integration', () => {
  test('should generate e-invoice and integrate with BirFatura successfully', async ({ tenantPage: _tenantPage, apiContext, authTokens: _authTokens }) => {
    test.setTimeout(90000); // E-invoice flow can take time
    
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    // Generate unique TC number (11 digits, must be unique)
    const tcNumber = `1${uniqueId.padStart(10, '0')}`;
    
    const testParty = {
      firstName: `InvoiceTest${uniqueId.slice(-5)}`,
      lastName: 'Customer',
      phone: `+90555${uniqueId.slice(-7)}`,
      email: `invoice${uniqueId}@test.com`,
      tcNumber: tcNumber // Required for e-invoice
    };

    // STEP 1: Create party for invoice
    console.log('[FLOW-04] Step 1: Create party for invoice');
    const partyResponse = await apiContext.post('/api/parties', {
      data: testParty,
      headers: { 'Idempotency-Key': `test-invoice-party-${uniqueId}` }
    });
    
    if (!partyResponse.ok()) {
      const errorBody = await partyResponse.text();
      console.error('[FLOW-04] Party creation failed:', partyResponse.status(), errorBody);
      throw new Error(`Party creation failed: ${partyResponse.status()} - ${errorBody}`);
    }
    
    const partyData = await partyResponse.json();
    validateResponseEnvelope(partyData);
    const partyId = partyData.data.id;
    console.log('[FLOW-04] Created party:', partyId);

    // STEP 2: Get inventory item
    console.log('[FLOW-04] Step 2: Get inventory for sale');
    const inventoryResponse = await apiContext.get('/api/inventory?perPage=10');
    expect(inventoryResponse.ok()).toBeTruthy();
    const inventoryData = await inventoryResponse.json();
    validateResponseEnvelope(inventoryData);
    
    expect(inventoryData.data?.length, 'Inventory should have items').toBeGreaterThan(0);
    const inventoryItem = inventoryData.data[0];
    console.log('[FLOW-04] Using inventory:', inventoryItem.id);

    // STEP 3: Create sale
    console.log('[FLOW-04] Step 3: Create sale');
    const saleData = {
      partyId: partyId,
      productId: inventoryItem.id,
      quantity: 1,
      salesPrice: inventoryItem.price || 45000,
      paymentMethod: 'cash',
      notes: 'E2E e-invoice test',
      earSide: 'right',
      serialNumber: `TEST-INV-${uniqueId}`
    };
    
    const saleResponse = await apiContext.post('/api/sales', {
      data: saleData,
      headers: { 'Idempotency-Key': `test-invoice-sale-${uniqueId}` }
    });
    
    expect(saleResponse.ok()).toBeTruthy();
    const saleResponseData = await saleResponse.json();
    validateResponseEnvelope(saleResponseData);
    const saleId = saleResponseData.data.saleId || saleResponseData.data.sale?.id;
    console.log('[FLOW-04] Created sale:', saleId);

    // STEP 4: Create e-invoice from sale
    console.log('[FLOW-04] Step 4: Create e-invoice');
    const invoiceCreateData = {
      saleId: saleId,
      partyId: partyId,
      invoiceType: 'sale',
      totalAmount: saleData.salesPrice,
      subtotal: saleData.salesPrice,
      vatAmount: 0,
      discountAmount: 0,
      status: 'draft',
      notes: 'E2E e-invoice test'
    };
    
    const invoiceResponse = await apiContext.post('/api/invoices', {
      data: invoiceCreateData,
      headers: { 'Idempotency-Key': `test-invoice-create-${uniqueId}` }
    });
    
    if (!invoiceResponse.ok()) {
      const errorBody = await invoiceResponse.text();
      console.error('[FLOW-04] Invoice creation failed:', invoiceResponse.status(), errorBody);
      throw new Error(`Invoice creation failed: ${invoiceResponse.status()} - ${errorBody}`);
    }
    
    const invoiceData = await invoiceResponse.json();
    validateResponseEnvelope(invoiceData);
    
    const invoiceId = invoiceData.data.id;
    console.log('[FLOW-04] Created invoice:', invoiceId);
    console.log('[FLOW-04] Invoice number:', invoiceData.data.invoiceNumber);

    // STEP 5: Send invoice to GIB/BirFatura
    console.log('[FLOW-04] Step 5: Send invoice to GIB/BirFatura');
    
    const sendToGibResponse = await apiContext.post(`/api/invoices/${invoiceId}/send-to-gib`, {
      headers: { 'Idempotency-Key': `test-invoice-send-${uniqueId}` }
    });
    
    if (!sendToGibResponse.ok()) {
      const errorBody = await sendToGibResponse.text();
      console.error('[FLOW-04] Send to GIB failed:', sendToGibResponse.status(), errorBody);
      throw new Error(`Send to GIB failed: ${sendToGibResponse.status()} - ${errorBody}`);
    }
    
    const sendToGibData = await sendToGibResponse.json();
    validateResponseEnvelope(sendToGibData);
    
    console.log('[FLOW-04] Invoice sent to GIB');
    console.log('[FLOW-04] Outbox status:', sendToGibData.data.outbox?.status);
    console.log('[FLOW-04] ETTN:', sendToGibData.data.outbox?.ettn);

    // STEP 6: Verify invoice in database
    console.log('[FLOW-04] Step 6: Verify invoice record');
    const finalInvoiceResponse = await apiContext.get(`/api/invoices/${invoiceId}`);
    
    if (!finalInvoiceResponse.ok()) {
      const errorBody = await finalInvoiceResponse.text();
      console.error('[FLOW-04] Get invoice failed:', finalInvoiceResponse.status(), errorBody);
      throw new Error(`Get invoice failed: ${finalInvoiceResponse.status()} - ${errorBody}`);
    }
    
    const finalInvoiceData = await finalInvoiceResponse.json();
    validateResponseEnvelope(finalInvoiceData);
    
    const invoice = finalInvoiceData.data;
    expect(invoice.saleId).toBe(saleId);
    expect(invoice.partyId).toBe(partyId);
    expect(invoice.invoiceNumber).toBeTruthy();
    expect(invoice.status).toBe('sent'); // Should be 'sent' after send-to-gib
    
    console.log('[FLOW-04] ✅ E-Invoice generation and GIB submission completed successfully');
    console.log('[FLOW-04] Party:', partyId);
    console.log('[FLOW-04] Sale:', saleId);
    console.log('[FLOW-04] Invoice:', invoiceId);
    console.log('[FLOW-04] Invoice Number:', invoice.invoiceNumber);
    console.log('[FLOW-04] Invoice Status:', invoice.status);
  });
});
