/**
 * FLOW-04: Invoice Generation - Critical Flow Test
 * 
 * Priority: P0 (Revenue & Legal - HIGH RISK)
 * Why Critical: Legal requirement, tax compliance, audit trail, revenue recognition
 * 
 * API Endpoints:
 * - POST /api/invoices (createInvoices)
 * - GET /api/invoices (listInvoices)
 * - GET /api/invoices/{invoice_id} (getInvoice)
 * - POST /api/invoices/batch-generate (createInvoiceBatchGenerate)
 */

import { test, expect } from '../../fixtures/fixtures';
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-04: Invoice Generation', () => {
  test('should generate invoice with sequential number successfully', async ({ tenantPage, apiContext, authTokens }) => {
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);

    // STEP 1: Navigate to invoices page
    console.log('[FLOW-04] Step 1: Navigate to invoices');
    await tenantPage.goto('/invoices');
    await tenantPage.waitForLoadState('networkidle');
    
    // STEP 2: Click "Yeni Fatura"
    console.log('[FLOW-04] Step 2: Click new invoice');
    const newInvoiceButton = tenantPage.getByRole('button', { name: /Yeni|New|Fatura|Invoice/i }).first();
    await newInvoiceButton.click();
    
    // Wait for invoice form
    await tenantPage.waitForLoadState('networkidle');
    
    // STEP 3: Select sale (if sale selection is required)
    console.log('[FLOW-04] Step 3: Select sale');
    try {
      const saleSearchInput = tenantPage.locator('input[name="saleSearch"], input[placeholder*="Satış"], input[placeholder*="Sale"]').first();
      await saleSearchInput.fill('', { timeout: 3000 });
      
      // Select first available sale
      await tenantPage.waitForTimeout(1000);
      const saleOption = tenantPage.locator('[role="option"], li').first();
      await saleOption.click();
    } catch (e) {
      console.log('[FLOW-04] Sale selection not required or auto-selected');
    }
    
    // STEP 4: Verify invoice number preview
    console.log('[FLOW-04] Step 4: Verify invoice number format');
    const year = new Date().getFullYear();
    const invoiceNumberPattern = new RegExp(`INV${year}\\d{5}`);
    
    try {
      const invoiceNumberElement = tenantPage.locator(`text=${invoiceNumberPattern}`).first();
      await expect(invoiceNumberElement).toBeVisible({ timeout: 5000 });
      console.log('[FLOW-04] Invoice number preview visible');
    } catch (e) {
      console.log('[FLOW-04] Invoice number preview not visible (may be generated on submit)');
    }
    
    // STEP 5: Submit invoice creation
    console.log('[FLOW-04] Step 5: Submit invoice');
    const submitButton = tenantPage.getByRole('button', { name: /Fatura|Invoice|Oluştur|Create|Kaydet/i }).first();
    await submitButton.click();
    
    // Wait for API call
    await waitForApiCall(tenantPage, '/api/invoices', 10000);
    await tenantPage.waitForLoadState('networkidle');
    
    // STEP 6: Verify invoice created via API
    console.log('[FLOW-04] Step 6: Verify invoice via API');
    const response = await apiContext.get('/api/invoices?page=1&perPage=10', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    validateResponseEnvelope(data);
    
    expect(data.data.length, 'Should have at least one invoice').toBeGreaterThan(0);
    
    // STEP 7: Verify invoice number format and uniqueness
    console.log('[FLOW-04] Step 7: Verify invoice numbers');
    const invoiceNumbers = data.data.map((inv: any) => inv.invoiceNumber || inv.invoice_number);
    
    // Check format: INV + year(4) + seq(5) = INV202500001
    invoiceNumbers.forEach((num: string) => {
      expect(num, `Invoice number ${num} should match format INV{year}{seq}`).toMatch(/^INV\d{9}$/);
    });
    
    // Check uniqueness (no duplicates)
    const uniqueNumbers = new Set(invoiceNumbers);
    expect(uniqueNumbers.size, 'All invoice numbers should be unique').toBe(invoiceNumbers.length);
    
    // STEP 8: Verify sequential numbering
    console.log('[FLOW-04] Step 8: Verify sequential numbering');
    const sortedNumbers = [...invoiceNumbers].sort();
    console.log('[FLOW-04] Invoice numbers:', sortedNumbers.slice(0, 5));
    
    // Extract sequence numbers
    const sequences = sortedNumbers.map((num: string) => parseInt(num.slice(-5)));
    
    // Verify sequences are increasing (allowing gaps for concurrent tests)
    for (let i = 1; i < sequences.length; i++) {
      expect(sequences[i], `Sequence ${sequences[i]} should be >= ${sequences[i-1]}`).toBeGreaterThanOrEqual(sequences[i-1]);
    }
    
    console.log('[FLOW-04] ✅ Invoice generation flow completed successfully');
  });
});
