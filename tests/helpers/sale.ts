import { Page } from '@playwright/test';
import { waitForModalOpen, waitForModalClose, waitForToast } from './wait';

/**
 * Sale Helper Functions
 * 
 * Provides sales management utilities for E2E tests
 * Supports 3 sale creation methods: Modal, Device Assignment, Cash Register
 */

export interface SaleData {
  partyId: string;
  deviceId?: string;
  amount: number;
  sgkPayment?: number;
  paymentMethod?: 'cash' | 'card' | 'mixed';
  notes?: string;
}

/**
 * Create sale from modal (Method 1)
 * 
 * @param page - Playwright page object
 * @param data - Sale data
 * @returns Sale ID
 */
export async function createSaleFromModal(
  page: Page,
  data: SaleData
): Promise<string> {
  await page.goto('/sales');
  await page.locator('[data-testid="sale-create-button"]').click();
  
  await waitForModalOpen(page, 'sale-modal');
  
  // Select party
  await page.locator('[data-testid="sale-party-select"]').click();
  await page.locator(`[data-testid="party-option-${data.partyId}"]`).click();
  
  // Select device if provided
  if (data.deviceId) {
    await page.locator('[data-testid="sale-device-select"]').click();
    await page.locator(`[data-testid="device-option-${data.deviceId}"]`).click();
  }
  
  // Enter amount
  await page.locator('[data-testid="sale-amount-input"]').fill(data.amount.toString());
  
  // Enter SGK payment if provided
  if (data.sgkPayment) {
    await page.locator('[data-testid="sale-sgk-payment-input"]').fill(data.sgkPayment.toString());
  }
  
  // Select payment method
  if (data.paymentMethod) {
    await page.locator(`[data-testid="sale-payment-${data.paymentMethod}"]`).click();
  }
  
  // Add notes if provided
  if (data.notes) {
    await page.locator('[data-testid="sale-notes-input"]').fill(data.notes);
  }
  
  // Submit
  await page.locator('[data-testid="sale-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'sale-modal');
  
  // Extract sale ID from response
  const response = await page.waitForResponse(
    r => r.url().includes('/sales') && r.status() === 201
  );
  const body = await response.json();
  return body.data.id;
}

/**
 * Create sale from device assignment (Method 2)
 * 
 * @param page - Playwright page object
 * @param partyId - Party ID
 * @param deviceId - Device ID
 * @param reason - Assignment reason (sale, trial, replacement, loaner, repair)
 * @returns Sale ID (if reason is 'sale')
 */
export async function createSaleFromDeviceAssignment(
  page: Page,
  partyId: string,
  deviceId: string,
  reason: 'sale' | 'trial' | 'replacement' | 'loaner' | 'repair' = 'sale'
): Promise<string | null> {
  await page.goto(`/parties/${partyId}`);
  await page.locator('[data-testid="device-assignment-button"]').click();
  
  await waitForModalOpen(page, 'device-assignment-modal');
  
  // Select device
  await page.locator('[data-testid="device-select"]').click();
  await page.locator(`[data-testid="device-option-${deviceId}"]`).click();
  
  // Select reason
  await page.locator('[data-testid="assignment-reason-select"]').click();
  await page.locator(`[data-testid="reason-option-${reason}"]`).click();
  
  // Submit
  await page.locator('[data-testid="device-assignment-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'device-assignment-modal');
  
  // If reason is 'sale', extract sale ID
  if (reason === 'sale') {
    const response = await page.waitForResponse(
      r => r.url().includes('/sales') && r.status() === 201
    );
    const body = await response.json();
    return body.data.id;
  }
  
  return null;
}

/**
 * Create sale from cash register (Method 3)
 * 
 * @param page - Playwright page object
 * @param partyName - Party name (creates both cash record and sale)
 * @param amount - Sale amount
 * @returns Sale ID
 */
export async function createSaleFromCashRegister(
  page: Page,
  partyName: string,
  amount: number
): Promise<string> {
  await page.goto('/cashflow');
  await page.locator('[data-testid="cash-record-create-button"]').click();
  
  await waitForModalOpen(page, 'cash-record-modal');
  
  // Enter party name (this creates a sale)
  await page.locator('[data-testid="cash-party-name-input"]').fill(partyName);
  
  // Enter amount
  await page.locator('[data-testid="cash-amount-input"]').fill(amount.toString());
  
  // Submit
  await page.locator('[data-testid="cash-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'cash-record-modal');
  
  // Extract sale ID from response
  const response = await page.waitForResponse(
    r => r.url().includes('/sales') && r.status() === 201
  );
  const body = await response.json();
  return body.data.id;
}

/**
 * Get sale details
 * 
 * @param page - Playwright page object
 * @param saleId - Sale ID
 * @returns Sale details
 */
export async function getSaleDetails(
  page: Page,
  saleId: string
): Promise<Record<string, unknown>> {
  await page.goto(`/sales/${saleId}`);
  
  const response = await page.waitForResponse(
    r => r.url().includes(`/sales/${saleId}`) && r.status() === 200
  );
  
  return await response.json();
}
