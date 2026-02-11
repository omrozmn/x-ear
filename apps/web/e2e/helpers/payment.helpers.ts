import { Page, expect } from '@playwright/test';

/**
 * Payment Helper Functions for E2E Tests
 */

export interface AddPaymentOptions {
  amount: number;
  method: 'cash' | 'card' | 'promissory_note';
  notes?: string;
  promissoryNoteDate?: string; // For promissory notes
}

/**
 * Open payment tracking modal for a sale
 * @param page - Playwright page object
 * @param saleId - Sale ID
 */
export async function openPaymentTracking(page: Page, saleId: string) {
  await page.goto(`/sales/${saleId}`);
  
  // Click payment tracking button
  await page.click('[data-testid="payment-tracking-button"]');
  
  // Wait for modal
  await expect(page.locator('[data-testid="payment-modal"]')).toBeVisible();
}

/**
 * Add a payment to a sale
 * @param page - Playwright page object
 * @param saleId - Sale ID
 * @param payment - Payment details
 */
export async function addPayment(page: Page, saleId: string, payment: AddPaymentOptions) {
  // Open payment modal if not already open
  const modalVisible = await page.locator('[data-testid="payment-modal"]').isVisible();
  if (!modalVisible) {
    await openPaymentTracking(page, saleId);
  }
  
  // Click "Add Payment" button
  await page.click('[data-testid="add-payment-button"]');
  
  // Fill amount
  await page.fill('[data-testid="payment-amount-input"]', payment.amount.toString());
  
  // Select payment method
  await page.selectOption('[data-testid="payment-method-select"]', payment.method);
  
  // Fill promissory note date if applicable
  if (payment.method === 'promissory_note' && payment.promissoryNoteDate) {
    await page.fill('[data-testid="promissory-note-date-input"]', payment.promissoryNoteDate);
  }
  
  // Fill notes
  if (payment.notes) {
    await page.fill('[data-testid="payment-notes-input"]', payment.notes);
  }
  
  // Submit
  await page.click('[data-testid="payment-submit-button"]');
  
  // Wait for success
  await expect(page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 5000 });
}

/**
 * Add a partial payment (multiple payment methods)
 * @param page - Playwright page object
 * @param saleId - Sale ID
 * @param payments - Array of payments
 */
export async function addPartialPayment(page: Page, saleId: string, payments: AddPaymentOptions[]) {
  await openPaymentTracking(page, saleId);
  
  for (const payment of payments) {
    await addPayment(page, saleId, payment);
  }
}

/**
 * Track promissory note collection
 * @param page - Playwright page object
 * @param promissoryNoteId - Promissory note ID
 */
export async function trackPromissoryNote(page: Page, promissoryNoteId: string) {
  await page.goto('/payments/promissory-notes');
  
  // Find promissory note row
  const noteRow = page.locator(`[data-testid="promissory-note-row-${promissoryNoteId}"]`);
  await expect(noteRow).toBeVisible();
  
  // Click track button
  await noteRow.locator('[data-testid="track-button"]').click();
  
  // Wait for tracking modal
  await expect(page.locator('[data-testid="tracking-modal"]')).toBeVisible();
}
