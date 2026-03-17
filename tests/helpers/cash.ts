import { Page } from '@playwright/test';
import { waitForModalOpen, waitForModalClose, waitForToast, waitForApiCall } from './wait.helper';

/**
 * Cash Register Helper Functions
 * 
 * Provides cash register management utilities for E2E tests
 * Note: Every sale is a cash record, but NOT every cash record is a sale
 */

export interface CashRecordData {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  partyName?: string; // If provided, creates both cash record AND sale
  tags?: string[];
  notes?: string;
}

/**
 * Create cash record (income)
 * 
 * @param page - Playwright page object
 * @param data - Cash record data
 * @returns Cash record ID
 */
export async function createCashIncome(
  page: Page,
  data: Omit<CashRecordData, 'type'>
): Promise<string> {
  await page.goto('/cashflow');
  await page.locator('[data-testid="cash-record-create-button"]').click();
  
  await waitForModalOpen(page, 'cash-record-modal');
  
  // Select income type
  await page.locator('[data-testid="cash-type-income"]').click();
  
  // Fill form
  await page.locator('[data-testid="cash-amount-input"]').fill(data.amount.toString());
  await page.locator('[data-testid="cash-description-input"]').fill(data.description);
  
  // Add party name if provided (creates sale)
  if (data.partyName) {
    await page.locator('[data-testid="cash-party-name-input"]').fill(data.partyName);
  }
  
  // Add tags if provided
  if (data.tags && data.tags.length > 0) {
    for (const tag of data.tags) {
      await page.locator('[data-testid="cash-tag-input"]').fill(tag);
      await page.locator('[data-testid="cash-tag-add-button"]').click();
    }
  }
  
  // Add notes if provided
  if (data.notes) {
    await page.locator('[data-testid="cash-notes-input"]').fill(data.notes);
  }
  
  // Submit
  await page.locator('[data-testid="cash-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'cash-record-modal');
  
  // Extract cash record ID
  const response = await page.waitForResponse(
    r => r.url().includes('/cash-records') && r.status() === 201
  );
  const body = await response.json();
  return body.data.id;
}

/**
 * Create cash record (expense)
 * 
 * @param page - Playwright page object
 * @param data - Cash record data
 * @returns Cash record ID
 */
export async function createCashExpense(
  page: Page,
  data: Omit<CashRecordData, 'type'>
): Promise<string> {
  await page.goto('/cashflow');
  await page.locator('[data-testid="cash-record-create-button"]').click();
  
  await waitForModalOpen(page, 'cash-record-modal');
  
  // Select expense type
  await page.locator('[data-testid="cash-type-expense"]').click();
  
  // Fill form
  await page.locator('[data-testid="cash-amount-input"]').fill(data.amount.toString());
  await page.locator('[data-testid="cash-description-input"]').fill(data.description);
  
  // Add tags if provided
  if (data.tags && data.tags.length > 0) {
    for (const tag of data.tags) {
      await page.locator('[data-testid="cash-tag-input"]').fill(tag);
      await page.locator('[data-testid="cash-tag-add-button"]').click();
    }
  }
  
  // Add notes if provided
  if (data.notes) {
    await page.locator('[data-testid="cash-notes-input"]').fill(data.notes);
  }
  
  // Submit
  await page.locator('[data-testid="cash-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'cash-record-modal');
  
  // Extract cash record ID
  const response = await page.waitForResponse(
    r => r.url().includes('/cash-records') && r.status() === 201
  );
  const body = await response.json();
  return body.data.id;
}

/**
 * Update cash record
 * 
 * @param page - Playwright page object
 * @param recordId - Cash record ID
 * @param data - Updated data
 */
export async function updateCashRecord(
  page: Page,
  recordId: string,
  data: Partial<Omit<CashRecordData, 'type'>>
): Promise<void> {
  await page.goto(`/cashflow/${recordId}`);
  await page.locator('[data-testid="cash-edit-button"]').click();
  
  await waitForModalOpen(page, 'cash-record-modal');
  
  if (data.amount !== undefined) {
    await page.locator('[data-testid="cash-amount-input"]').fill(data.amount.toString());
  }
  
  if (data.description) {
    await page.locator('[data-testid="cash-description-input"]').fill(data.description);
  }
  
  if (data.notes) {
    await page.locator('[data-testid="cash-notes-input"]').fill(data.notes);
  }
  
  // Submit
  await page.locator('[data-testid="cash-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'cash-record-modal');
}

/**
 * Delete cash record
 * 
 * @param page - Playwright page object
 * @param recordId - Cash record ID
 */
export async function deleteCashRecord(
  page: Page,
  recordId: string
): Promise<void> {
  await page.goto(`/cashflow/${recordId}`);
  await page.locator('[data-testid="cash-delete-button"]').click();
  
  // Confirm deletion
  await page.locator('[data-testid="confirm-delete-button"]').click();
  await waitForToast(page, 'success');
}

/**
 * Search cash records
 * 
 * @param page - Playwright page object
 * @param query - Search query
 */
export async function searchCashRecords(
  page: Page,
  query: string
): Promise<void> {
  await page.goto('/cashflow');
  await page.locator('[data-testid="cash-search-input"]').fill(query);
  await page.locator('[data-testid="cash-search-button"]').click();
  await waitForApiCall(page, '/cash-records', 'GET');
}

/**
 * Filter cash records by date
 * 
 * @param page - Playwright page object
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 */
export async function filterCashRecordsByDate(
  page: Page,
  startDate: string,
  endDate: string
): Promise<void> {
  await page.goto('/cashflow');
  await page.locator('[data-testid="cash-date-filter-start"]').fill(startDate);
  await page.locator('[data-testid="cash-date-filter-end"]').fill(endDate);
  await page.locator('[data-testid="cash-filter-apply-button"]').click();
  await waitForApiCall(page, '/cash-records', 'GET');
}

/**
 * Filter cash records by type
 * 
 * @param page - Playwright page object
 * @param type - Record type (income, expense)
 */
export async function filterCashRecordsByType(
  page: Page,
  type: 'income' | 'expense'
): Promise<void> {
  await page.goto('/cashflow');
  await page.locator('[data-testid="cash-type-filter"]').click();
  await page.locator(`[data-testid="type-option-${type}"]`).click();
  await waitForApiCall(page, '/cash-records', 'GET');
}

/**
 * Export cash records
 * 
 * @param page - Playwright page object
 * @param format - Export format (pdf, excel)
 */
export async function exportCashRecords(
  page: Page,
  format: 'pdf' | 'excel' = 'pdf'
): Promise<void> {
  await page.goto('/cashflow');
  await page.locator('[data-testid="cash-export-button"]').click();
  await page.locator(`[data-testid="export-format-${format}"]`).click();
  
  // Wait for download
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-testid="export-confirm-button"]').click();
  const download = await downloadPromise;
  await download.saveAs(`./test-results/cash-records-export.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
}

/**
 * View cash summary on dashboard
 * 
 * @param page - Playwright page object
 */
export async function viewCashSummary(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await page.locator('[data-testid="cash-summary-widget"]').click();
  await waitForApiCall(page, '/cash-records/summary', 'GET');
}
