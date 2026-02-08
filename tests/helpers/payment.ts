import { Page } from '@playwright/test';
import { waitForModalOpen, waitForModalClose, waitForToast } from './wait';

/**
 * Payment Helper Functions
 * 
 * Provides payment tracking and collection utilities for E2E tests
 */

export interface PaymentData {
  amount: number;
  method: 'cash' | 'card' | 'promissory_note';
  note?: string;
  maturityDate?: string; // For promissory notes
}

/**
 * Open payment tracking modal
 * 
 * @param page - Playwright page object
 * @param saleId - Sale ID
 */
export async function openPaymentTrackingModal(
  page: Page,
  saleId: string
): Promise<void> {
  await page.goto(`/sales/${saleId}`);
  await page.locator('[data-testid="payment-tracking-button"]').click();
  await waitForModalOpen(page, 'payment-tracking-modal');
}

/**
 * Add payment to a sale
 * 
 * @param page - Playwright page object
 * @param saleId - Sale ID
 * @param payment - Payment data
 */
export async function addPayment(
  page: Page,
  saleId: string,
  payment: PaymentData
): Promise<void> {
  await openPaymentTrackingModal(page, saleId);
  
  // Click add payment button
  await page.locator('[data-testid="add-payment-button"]').click();
  
  // Enter amount
  await page.locator('[data-testid="payment-amount-input"]').fill(payment.amount.toString());
  
  // Select payment method
  await page.locator(`[data-testid="payment-method-${payment.method}"]`).click();
  
  // If promissory note, enter maturity date
  if (payment.method === 'promissory_note' && payment.maturityDate) {
    await page.locator('[data-testid="payment-maturity-date-input"]').fill(payment.maturityDate);
  }
  
  // Add note if provided
  if (payment.note) {
    await page.locator('[data-testid="payment-note-input"]').fill(payment.note);
  }
  
  // Submit
  await page.locator('[data-testid="payment-submit-button"]').click();
  await waitForToast(page, 'success');
}

/**
 * Add multiple payments (partial payment)
 * 
 * @param page - Playwright page object
 * @param saleId - Sale ID
 * @param payments - Array of payment data
 */
export async function addPartialPayments(
  page: Page,
  saleId: string,
  payments: PaymentData[]
): Promise<void> {
  await openPaymentTrackingModal(page, saleId);
  
  for (const payment of payments) {
    await page.locator('[data-testid="add-payment-button"]').click();
    await page.locator('[data-testid="payment-amount-input"]').fill(payment.amount.toString());
    await page.locator(`[data-testid="payment-method-${payment.method}"]`).click();
    
    if (payment.method === 'promissory_note' && payment.maturityDate) {
      await page.locator('[data-testid="payment-maturity-date-input"]').fill(payment.maturityDate);
    }
    
    if (payment.note) {
      await page.locator('[data-testid="payment-note-input"]').fill(payment.note);
    }
    
    await page.locator('[data-testid="payment-submit-button"]').click();
    await waitForToast(page, 'success');
  }
  
  await waitForModalClose(page, 'payment-tracking-modal');
}

/**
 * Get payment history for a sale
 * 
 * @param page - Playwright page object
 * @param saleId - Sale ID
 * @returns Payment history
 */
export async function getPaymentHistory(
  page: Page,
  saleId: string
): Promise<any[]> {
  await openPaymentTrackingModal(page, saleId);
  
  const response = await page.waitForResponse(
    r => r.url().includes(`/sales/${saleId}/payments`) && r.status() === 200
  );
  
  const body = await response.json();
  return body.data;
}

/**
 * Get remaining balance for a sale
 * 
 * @param page - Playwright page object
 * @param saleId - Sale ID
 * @returns Remaining balance
 */
export async function getRemainingBalance(
  page: Page,
  saleId: string
): Promise<number> {
  await openPaymentTrackingModal(page, saleId);
  
  const balanceText = await page.locator('[data-testid="remaining-balance"]').textContent();
  return parseFloat(balanceText?.replace(/[^0-9.-]+/g, '') || '0');
}

/**
 * Track promissory note
 * 
 * @param page - Playwright page object
 * @param noteId - Promissory note ID
 */
export async function trackPromissoryNote(
  page: Page,
  noteId: string
): Promise<void> {
  await page.goto('/payments/promissory-notes');
  await page.locator(`[data-testid="note-${noteId}"]`).click();
  await waitForModalOpen(page, 'promissory-note-detail-modal');
}

/**
 * Collect promissory note
 * 
 * @param page - Playwright page object
 * @param noteId - Promissory note ID
 */
export async function collectPromissoryNote(
  page: Page,
  noteId: string
): Promise<void> {
  await trackPromissoryNote(page, noteId);
  await page.locator('[data-testid="collect-note-button"]').click();
  await page.locator('[data-testid="confirm-collect-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'promissory-note-detail-modal');
}
