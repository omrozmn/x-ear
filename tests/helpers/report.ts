import { Page } from '@playwright/test';
import { waitForApiCall } from './wait';

/**
 * Report Helper Functions
 * 
 * Provides report generation and viewing utilities for E2E tests
 */

export type ReportType = 'sales' | 'collection' | 'stock' | 'sgk' | 'promissory-note' | 'customer';
export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type ExportFormat = 'excel' | 'pdf';

/**
 * Generate sales report
 * 
 * @param page - Playwright page object
 * @param period - Report period (daily, monthly)
 * @param startDate - Start date (YYYY-MM-DD) for custom period
 * @param endDate - End date (YYYY-MM-DD) for custom period
 */
export async function generateSalesReport(
  page: Page,
  period: 'daily' | 'monthly' = 'daily',
  startDate?: string,
  endDate?: string
): Promise<void> {
  await page.goto('/reports/sales');
  
  // Select period
  await page.locator('[data-testid="report-period-select"]').click();
  await page.locator(`[data-testid="period-option-${period}"]`).click();
  
  // Set custom date range if provided
  if (startDate && endDate) {
    await page.locator('[data-testid="report-start-date"]').fill(startDate);
    await page.locator('[data-testid="report-end-date"]').fill(endDate);
  }
  
  // Generate report
  await page.locator('[data-testid="report-generate-button"]').click();
  await waitForApiCall(page, '/reports/sales', 'GET');
}

/**
 * Generate collection report
 * 
 * @param page - Playwright page object
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 */
export async function generateCollectionReport(
  page: Page,
  startDate: string,
  endDate: string
): Promise<void> {
  await page.goto('/reports/collection');
  
  await page.locator('[data-testid="report-start-date"]').fill(startDate);
  await page.locator('[data-testid="report-end-date"]').fill(endDate);
  
  await page.locator('[data-testid="report-generate-button"]').click();
  await waitForApiCall(page, '/reports/collection', 'GET');
}

/**
 * Generate stock report
 * 
 * @param page - Playwright page object
 */
export async function generateStockReport(page: Page): Promise<void> {
  await page.goto('/reports/stock');
  
  await page.locator('[data-testid="report-generate-button"]').click();
  await waitForApiCall(page, '/reports/stock', 'GET');
}

/**
 * Generate SGK report tracking (device)
 * 
 * @param page - Playwright page object
 * @param reportStatus - Report status filter (all, received, pending, private)
 */
export async function generateSGKDeviceReport(
  page: Page,
  reportStatus?: 'all' | 'received' | 'pending' | 'private'
): Promise<void> {
  await page.goto('/reports/sgk-devices');
  
  // Filter by report status if provided
  if (reportStatus && reportStatus !== 'all') {
    await page.locator('[data-testid="sgk-status-filter"]').click();
    await page.locator(`[data-testid="status-option-${reportStatus}"]`).click();
  }
  
  await page.locator('[data-testid="report-generate-button"]').click();
  await waitForApiCall(page, '/reports/sgk-devices', 'GET');
}

/**
 * Generate SGK report tracking (pill)
 * 
 * @param page - Playwright page object
 * @param reportStatus - Report status filter (all, received, pending, private)
 */
export async function generateSGKPillReport(
  page: Page,
  reportStatus?: 'all' | 'received' | 'pending' | 'private'
): Promise<void> {
  await page.goto('/reports/sgk-pills');
  
  // Filter by report status if provided
  if (reportStatus && reportStatus !== 'all') {
    await page.locator('[data-testid="sgk-status-filter"]').click();
    await page.locator(`[data-testid="status-option-${reportStatus}"]`).click();
  }
  
  await page.locator('[data-testid="report-generate-button"]').click();
  await waitForApiCall(page, '/reports/sgk-pills', 'GET');
}

/**
 * Generate promissory note tracking report
 * 
 * @param page - Playwright page object
 * @param status - Note status filter (all, pending, collected, overdue)
 */
export async function generatePromissoryNoteReport(
  page: Page,
  status?: 'all' | 'pending' | 'collected' | 'overdue'
): Promise<void> {
  await page.goto('/reports/promissory-notes');
  
  // Filter by status if provided
  if (status && status !== 'all') {
    await page.locator('[data-testid="note-status-filter"]').click();
    await page.locator(`[data-testid="status-option-${status}"]`).click();
  }
  
  await page.locator('[data-testid="report-generate-button"]').click();
  await waitForApiCall(page, '/reports/promissory-notes', 'GET');
}

/**
 * Generate customer report
 * 
 * @param page - Playwright page object
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 */
export async function generateCustomerReport(
  page: Page,
  startDate: string,
  endDate: string
): Promise<void> {
  await page.goto('/reports/customers');
  
  await page.locator('[data-testid="report-start-date"]').fill(startDate);
  await page.locator('[data-testid="report-end-date"]').fill(endDate);
  
  await page.locator('[data-testid="report-generate-button"]').click();
  await waitForApiCall(page, '/reports/customers', 'GET');
}

/**
 * Export report
 * 
 * @param page - Playwright page object
 * @param format - Export format (excel, pdf)
 */
export async function exportReport(
  page: Page,
  format: ExportFormat = 'excel'
): Promise<void> {
  await page.locator('[data-testid="report-export-button"]').click();
  await page.locator(`[data-testid="export-format-${format}"]`).click();
  
  // Wait for download
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-testid="export-confirm-button"]').click();
  const download = await downloadPromise;
  await download.saveAs(`./test-results/report-export.${format === 'excel' ? 'xlsx' : 'pdf'}`);
}

/**
 * View report details
 * 
 * @param page - Playwright page object
 * @param reportType - Report type
 */
export async function viewReportDetails(
  page: Page,
  reportType: ReportType
): Promise<void> {
  await page.goto(`/reports/${reportType}`);
  await waitForApiCall(page, `/reports/${reportType}`, 'GET');
}

/**
 * Check SGK report validity (5-year tracking)
 * 
 * @param page - Playwright page object
 * @param partyId - Party ID
 * @returns True if report is still valid
 */
export async function checkSGKReportValidity(
  page: Page,
  partyId: string
): Promise<boolean> {
  await page.goto(`/parties/${partyId}`);
  await page.locator('[data-testid="party-sgk-tab"]').click();
  
  try {
    await page.locator('[data-testid="sgk-report-valid"]').waitFor({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}
