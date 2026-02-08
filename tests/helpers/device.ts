import { Page } from '@playwright/test';
import { waitForModalOpen, waitForModalClose, waitForToast, waitForApiCall } from './wait';

/**
 * Device Helper Functions
 * 
 * Provides device management utilities for E2E tests
 */

export type AssignmentReason = 'sale' | 'trial' | 'loaner' | 'repair' | 'replacement';

export interface DeviceAssignmentData {
  partyId: string;
  deviceId: string;
  reason: AssignmentReason;
  notes?: string;
  returnDate?: string;
}

/**
 * Assign device to party
 * 
 * @param page - Playwright page object
 * @param data - Device assignment data
 * @returns Assignment ID
 */
export async function assignDevice(
  page: Page,
  data: DeviceAssignmentData
): Promise<string> {
  await page.goto(`/parties/${data.partyId}`);
  await page.locator('[data-testid="device-assignment-button"]').click();
  
  await waitForModalOpen(page, 'device-assignment-modal');
  
  // Select device
  await page.locator('[data-testid="device-select"]').click();
  await page.locator(`[data-testid="device-option-${data.deviceId}"]`).click();
  
  // Select reason
  await page.locator('[data-testid="assignment-reason-select"]').click();
  await page.locator(`[data-testid="reason-option-${data.reason}"]`).click();
  
  // Add notes if provided
  if (data.notes) {
    await page.locator('[data-testid="assignment-notes-input"]').fill(data.notes);
  }
  
  // Set return date if provided (for trial/loaner)
  if (data.returnDate) {
    await page.locator('[data-testid="assignment-return-date-input"]').fill(data.returnDate);
  }
  
  // Submit
  await page.locator('[data-testid="device-assignment-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'device-assignment-modal');
  
  // Extract assignment ID
  const response = await page.waitForResponse(
    r => r.url().includes('/device-assignments') && r.status() === 201
  );
  const body = await response.json();
  return body.data.id;
}

/**
 * Return device from party
 * 
 * @param page - Playwright page object
 * @param assignmentId - Assignment ID
 */
export async function returnDevice(
  page: Page,
  assignmentId: string
): Promise<void> {
  await page.goto(`/device-assignments/${assignmentId}`);
  await page.locator('[data-testid="device-return-button"]').click();
  
  // Confirm return
  await page.locator('[data-testid="confirm-return-button"]').click();
  await waitForToast(page, 'success');
  await waitForApiCall(page, `/device-assignments/${assignmentId}/return`, 'POST');
}

/**
 * Replace device
 * 
 * @param page - Playwright page object
 * @param assignmentId - Current assignment ID
 * @param newDeviceId - New device ID
 */
export async function replaceDevice(
  page: Page,
  assignmentId: string,
  newDeviceId: string
): Promise<string> {
  await page.goto(`/device-assignments/${assignmentId}`);
  await page.locator('[data-testid="device-replace-button"]').click();
  
  await waitForModalOpen(page, 'device-replacement-modal');
  
  // Select new device
  await page.locator('[data-testid="replacement-device-select"]').click();
  await page.locator(`[data-testid="device-option-${newDeviceId}"]`).click();
  
  // Submit
  await page.locator('[data-testid="replacement-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'device-replacement-modal');
  
  // Extract new assignment ID
  const response = await page.waitForResponse(
    r => r.url().includes('/device-assignments') && r.status() === 201
  );
  const body = await response.json();
  return body.data.id;
}

/**
 * View device history
 * 
 * @param page - Playwright page object
 * @param deviceId - Device ID
 */
export async function viewDeviceHistory(
  page: Page,
  deviceId: string
): Promise<void> {
  await page.goto(`/devices/${deviceId}`);
  await page.locator('[data-testid="device-history-tab"]').click();
  await waitForApiCall(page, `/devices/${deviceId}/history`, 'GET');
}

/**
 * Search devices by serial number
 * 
 * @param page - Playwright page object
 * @param serialNumber - Serial number to search
 */
export async function searchDeviceBySerial(
  page: Page,
  serialNumber: string
): Promise<void> {
  await page.goto('/devices');
  await page.locator('[data-testid="device-search-input"]').fill(serialNumber);
  await page.locator('[data-testid="device-search-button"]').click();
  await waitForApiCall(page, '/devices', 'GET');
}

/**
 * Filter devices by status
 * 
 * @param page - Playwright page object
 * @param status - Device status (available, assigned, trial, repair, loaner)
 */
export async function filterDevicesByStatus(
  page: Page,
  status: 'available' | 'assigned' | 'trial' | 'repair' | 'loaner'
): Promise<void> {
  await page.goto('/devices');
  await page.locator('[data-testid="device-status-filter"]').click();
  await page.locator(`[data-testid="status-option-${status}"]`).click();
  await waitForApiCall(page, '/devices', 'GET');
}

/**
 * Filter devices by brand
 * 
 * @param page - Playwright page object
 * @param brand - Device brand
 */
export async function filterDevicesByBrand(
  page: Page,
  brand: string
): Promise<void> {
  await page.goto('/devices');
  await page.locator('[data-testid="device-brand-filter"]').click();
  await page.locator(`[data-testid="brand-option-${brand}"]`).click();
  await waitForApiCall(page, '/devices', 'GET');
}

/**
 * Export devices
 * 
 * @param page - Playwright page object
 * @param format - Export format (csv, excel)
 */
export async function exportDevices(
  page: Page,
  format: 'csv' | 'excel' = 'csv'
): Promise<void> {
  await page.goto('/devices');
  await page.locator('[data-testid="device-export-button"]').click();
  await page.locator(`[data-testid="export-format-${format}"]`).click();
  
  // Wait for download
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-testid="export-confirm-button"]').click();
  const download = await downloadPromise;
  await download.saveAs(`./test-results/devices-export.${format === 'csv' ? 'csv' : 'xlsx'}`);
}

/**
 * Check device stock alert
 * 
 * @param page - Playwright page object
 * @returns True if stock alert is visible
 */
export async function hasStockAlert(page: Page): Promise<boolean> {
  await page.goto('/devices');
  try {
    await page.locator('[data-testid="device-stock-alert"]').waitFor({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * View device warranty info
 * 
 * @param page - Playwright page object
 * @param deviceId - Device ID
 */
export async function viewDeviceWarranty(
  page: Page,
  deviceId: string
): Promise<void> {
  await page.goto(`/devices/${deviceId}`);
  await page.locator('[data-testid="device-warranty-tab"]').click();
  await waitForApiCall(page, `/devices/${deviceId}/warranty`, 'GET');
}
