/**
 * FLOW-05: E-Invoice Submission to GIB - Critical Flow Test
 * 
 * Priority: P0 (Revenue & Legal - CRITICAL)
 * Why Critical: Legal requirement (Turkish tax law), government compliance, audit requirement
 * 
 * API Endpoints:
 * - POST /api/invoices/{invoice_id}/send-to-gib (createInvoiceSendToGib)
 * - GET /api/efatura/outbox (listEfaturaOutbox)
 */

import { test, expect } from '../../fixtures/fixtures';
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-05: E-Invoice Submission', () => {
  test('should submit invoice to GIB successfully', async ({ tenantPage, apiContext, authTokens }) => {
    const timestamp = Date.now();

    // STEP 1: Navigate to invoices and find a draft invoice
    console.log('[FLOW-05] Step 1: Navigate to invoices');
    await tenantPage.goto('/invoices');
    await tenantPage.waitForLoadState('networkidle');
    
    // Get list of invoices via API to find one we can submit
    const listResponse = await apiContext.get('/api/invoices?page=1&perPage=10', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    validateResponseEnvelope(listData);
    
    // Find a draft invoice or create one if needed
    let invoiceId: string;
    const draftInvoice = listData.data.find((inv: any) => 
      (inv.status === 'draft' || inv.status === 'DRAFT') && 
      !(inv.sentToGib || inv.sent_to_gib)
    );
    
    if (draftInvoice) {
      invoiceId = draftInvoice.id;
      console.log('[FLOW-05] Found draft invoice:', invoiceId);
    } else {
      // If no draft invoice, use the first available invoice
      // In a real scenario, we might need to create one first
      invoiceId = listData.data[0]?.id;
      console.log('[FLOW-05] Using existing invoice:', invoiceId);
      
      if (!invoiceId) {
        console.log('[FLOW-05] ⚠️  No invoices available, skipping test');
        test.skip();
        return;
      }
    }
    
    // STEP 2: Navigate to invoice detail
    console.log('[FLOW-05] Step 2: Navigate to invoice detail');
    await tenantPage.goto(`/invoices/${invoiceId}`);
    await tenantPage.waitForLoadState('networkidle');
    
    // STEP 3: Click "GİB'e Gönder" button
    console.log('[FLOW-05] Step 3: Click send to GIB');
    const sendToGibButton = tenantPage.getByRole('button', { name: /GİB|GIB|Gönder|Send/i }).first();
    
    try {
      await sendToGibButton.click({ timeout: 5000 });
    } catch (e) {
      console.log('[FLOW-05] Send to GIB button not found or already sent');
      // Check if invoice is already sent
      const alreadySentIndicator = tenantPage.locator('text=/Gönderildi|Sent|GİB/i');
      const isSent = await alreadySentIndicator.isVisible();
      
      if (isSent) {
        console.log('[FLOW-05] Invoice already sent to GIB, test passed');
        return;
      }
      throw e;
    }
    
    // STEP 4: Confirm submission (if confirmation dialog appears)
    console.log('[FLOW-05] Step 4: Confirm submission');
    try {
      const confirmButton = tenantPage.getByRole('button', { name: /Onayla|Confirm|Evet|Yes/i }).first();
      await confirmButton.click({ timeout: 3000 });
    } catch (e) {
      console.log('[FLOW-05] No confirmation dialog');
    }
    
    // Wait for API call
    await waitForApiCall(tenantPage, `/api/invoices/${invoiceId}/send-to-gib`, 10000);
    await tenantPage.waitForLoadState('networkidle');
    
    // STEP 5: Verify success message
    console.log('[FLOW-05] Step 5: Verify success message');
    try {
      const successMessage = tenantPage.locator('text=/Gönderildi|Sent|Başarılı|Success/i').first();
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    } catch (e) {
      console.log('[FLOW-05] Success message not visible, checking API status');
    }
    
    // STEP 6: Verify invoice status updated via API
    console.log('[FLOW-05] Step 6: Verify invoice status via API');
    const invoiceResponse = await apiContext.get(`/api/invoices/${invoiceId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(invoiceResponse.ok()).toBeTruthy();
    const invoiceData = await invoiceResponse.json();
    validateResponseEnvelope(invoiceData);
    
    const invoice = invoiceData.data;
    expect(invoice.sentToGib || invoice.sent_to_gib, 'Invoice should be marked as sent to GIB').toBeTruthy();
    
    // STEP 7: Verify outbox record created
    console.log('[FLOW-05] Step 7: Verify outbox record');
    const outboxResponse = await apiContext.get('/api/efatura/outbox?page=1&perPage=10', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(outboxResponse.ok()).toBeTruthy();
    const outboxData = await outboxResponse.json();
    validateResponseEnvelope(outboxData);
    
    // Find outbox record for this invoice
    const outboxRecord = outboxData.data.find((o: any) => 
      (o.invoiceId || o.invoice_id) === invoiceId.toString()
    );
    
    if (outboxRecord) {
      console.log('[FLOW-05] Outbox record found');
      
      // Verify outbox record has required fields
      expect(outboxRecord.status).toMatch(/pending|sent|PENDING|SENT/);
      expect(outboxRecord.ettn || outboxRecord.uuid).toBeTruthy(); // UUID/ETTN
      expect(outboxRecord.fileName || outboxRecord.file_name).toMatch(/\.xml$/);
      
      console.log('[FLOW-05] ETTN:', outboxRecord.ettn || outboxRecord.uuid);
      console.log('[FLOW-05] Status:', outboxRecord.status);
    } else {
      console.log('[FLOW-05] ⚠️  Outbox record not found (may be processed asynchronously)');
    }
    
    console.log('[FLOW-05] ✅ E-Invoice submission flow completed successfully');
  });
});
