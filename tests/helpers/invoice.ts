import { Page } from '@playwright/test';
import { waitForModalOpen, waitForModalClose, waitForToast, waitForApiCall } from './wait.helper';

/**
 * Invoice Helper Functions
 * 
 * Provides invoice management utilities for E2E tests
 */

export interface InvoiceData {
  saleId?: string;
  partyId?: string;
  amount: number;
  invoiceType?: 'standard' | 'sgk' | 'quick';
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  notes?: string;
}

/**
 * Create invoice from sale
 * 
 * @param page - Playwright page object
 * @param saleId - Sale ID
 * @returns Invoice ID
 */
export async function createInvoiceFromSale(
  page: Page,
  saleId: string
): Promise<string> {
  await page.goto(`/sales/${saleId}`);
  await page.locator('[data-testid="sale-create-invoice-button"]').click();
  
  await waitForModalOpen(page, 'invoice-modal');
  
  // Submit (data pre-filled from sale)
  await page.locator('[data-testid="invoice-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'invoice-modal');
  
  // Extract invoice ID from response
  const response = await page.waitForResponse(
    r => r.url().includes('/invoices') && r.status() === 201
  );
  const body = await response.json();
  return body.data.id;
}

/**
 * Create invoice manually
 * 
 * @param page - Playwright page object
 * @param data - Invoice data
 * @returns Invoice ID
 */
export async function createInvoiceManually(
  page: Page,
  data: InvoiceData
): Promise<string> {
  await page.goto('/invoices');
  await page.locator('[data-testid="invoice-create-button"]').click();
  
  await waitForModalOpen(page, 'invoice-modal');
  
  // Select party
  if (data.partyId) {
    await page.locator('[data-testid="invoice-party-select"]').click();
    await page.locator(`[data-testid="party-option-${data.partyId}"]`).click();
  }
  
  // Add items
  if (data.items) {
    for (const item of data.items) {
      await page.locator('[data-testid="invoice-add-item-button"]').click();
      await page.locator('[data-testid="invoice-item-description-input"]').last().fill(item.description);
      await page.locator('[data-testid="invoice-item-quantity-input"]').last().fill(item.quantity.toString());
      await page.locator('[data-testid="invoice-item-price-input"]').last().fill(item.unitPrice.toString());
    }
  }
  
  // Add notes
  if (data.notes) {
    await page.locator('[data-testid="invoice-notes-input"]').fill(data.notes);
  }
  
  // Submit
  await page.locator('[data-testid="invoice-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'invoice-modal');
  
  // Extract invoice ID
  const response = await page.waitForResponse(
    r => r.url().includes('/invoices') && r.status() === 201
  );
  const body = await response.json();
  return body.data.id;
}

/**
 * Send e-invoice
 * 
 * @param page - Playwright page object
 * @param invoiceId - Invoice ID
 */
export async function sendEInvoice(
  page: Page,
  invoiceId: string
): Promise<void> {
  await page.goto(`/invoices/${invoiceId}`);
  await page.locator('[data-testid="invoice-send-einvoice-button"]').click();
  
  // Confirm send
  await page.locator('[data-testid="confirm-send-button"]').click();
  await waitForToast(page, 'success');
  await waitForApiCall(page, `/invoices/${invoiceId}/send`, 'POST');
}

/**
 * Download invoice PDF
 * 
 * @param page - Playwright page object
 * @param invoiceId - Invoice ID
 */
export async function downloadInvoicePDF(
  page: Page,
  invoiceId: string
): Promise<void> {
  await page.goto(`/invoices/${invoiceId}`);
  
  // Start waiting for download before clicking
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-testid="invoice-download-pdf-button"]').click();
  
  // Wait for download to complete
  const download = await downloadPromise;
  await download.saveAs(`./test-results/invoice-${invoiceId}.pdf`);
}

/**
 * Cancel invoice
 * 
 * @param page - Playwright page object
 * @param invoiceId - Invoice ID
 */
export async function cancelInvoice(
  page: Page,
  invoiceId: string
): Promise<void> {
  await page.goto(`/invoices/${invoiceId}`);
  await page.locator('[data-testid="invoice-cancel-button"]').click();
  
  // Confirm cancellation
  await page.locator('[data-testid="confirm-cancel-button"]').click();
  await waitForToast(page, 'success');
  await waitForApiCall(page, `/invoices/${invoiceId}/cancel`, 'POST');
}

/**
 * Search invoices
 * 
 * @param page - Playwright page object
 * @param query - Search query (invoice number)
 */
export async function searchInvoice(
  page: Page,
  query: string
): Promise<void> {
  await page.goto('/invoices');
  await page.locator('[data-testid="invoice-search-input"]').fill(query);
  await page.locator('[data-testid="invoice-search-button"]').click();
  await waitForApiCall(page, '/invoices', 'GET');
}

/**
 * Filter invoices by date
 * 
 * @param page - Playwright page object
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 */
export async function filterInvoicesByDate(
  page: Page,
  startDate: string,
  endDate: string
): Promise<void> {
  await page.goto('/invoices');
  await page.locator('[data-testid="invoice-date-filter-start"]').fill(startDate);
  await page.locator('[data-testid="invoice-date-filter-end"]').fill(endDate);
  await page.locator('[data-testid="invoice-filter-apply-button"]').click();
  await waitForApiCall(page, '/invoices', 'GET');
}

/**
 * Filter invoices by status
 * 
 * @param page - Playwright page object
 * @param status - Invoice status (draft, sent, paid, cancelled)
 */
export async function filterInvoicesByStatus(
  page: Page,
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
): Promise<void> {
  await page.goto('/invoices');
  await page.locator('[data-testid="invoice-status-filter"]').click();
  await page.locator(`[data-testid="status-option-${status}"]`).click();
  await waitForApiCall(page, '/invoices', 'GET');
}

/**
 * Export invoices
 * 
 * @param page - Playwright page object
 * @param format - Export format (excel, pdf)
 */
export async function exportInvoices(
  page: Page,
  format: 'excel' | 'pdf' = 'excel'
): Promise<void> {
  await page.goto('/invoices');
  await page.locator('[data-testid="invoice-export-button"]').click();
  await page.locator(`[data-testid="export-format-${format}"]`).click();
  
  // Wait for download
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-testid="export-confirm-button"]').click();
  const download = await downloadPromise;
  await download.saveAs(`./test-results/invoices-export.${format === 'excel' ? 'xlsx' : 'pdf'}`);
}
