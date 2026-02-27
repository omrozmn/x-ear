import { Page, expect } from '@playwright/test';

/**
 * Wait Helper Functions
 * 
 * Provides smart waiting utilities for E2E tests
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Wait for toast notification to appear and optionally disappear
 * 
 * @param page - Playwright page object
 * @param type - Toast type (success, error, warning, info)
 * @param message - Optional message to verify
 * @param waitForDisappear - Wait for toast to disappear (default: true)
 */
export async function waitForToast(
  page: Page,
  type: ToastType,
  message?: string,
  waitForDisappear: boolean = true
): Promise<void> {
  const toast = page.locator(`[data-testid="${type}-toast"]`);
  
  // Wait for toast to appear
  await expect(toast).toBeVisible({ timeout: 10000 });
  
  // Verify message if provided
  if (message) {
    await expect(toast).toContainText(message);
  }
  
  // Wait for toast to disappear (5 seconds duration + 1 second buffer)
  if (waitForDisappear) {
    await expect(toast).not.toBeVisible({ timeout: 6000 });
  }
}

/**
 * Wait for API call to complete
 * 
 * @param page - Playwright page object
 * @param endpoint - API endpoint to wait for (partial match)
 * @param method - HTTP method (default: GET)
 * @param status - Expected status code (default: 200)
 */
export async function waitForApiCall(
  page: Page,
  endpoint: string,
  method: string = 'GET',
  status: number = 200
): Promise<void> {
  await page.waitForResponse(
    response =>
      response.url().includes(endpoint) &&
      response.request().method() === method &&
      response.status() === status,
    { timeout: 30000 }
  );
}

/**
 * Wait for modal to open
 * 
 * @param page - Playwright page object
 * @param modalTestId - Modal test ID
 */
export async function waitForModalOpen(
  page: Page,
  modalTestId: string
): Promise<void> {
  await expect(page.locator(`[data-testid="${modalTestId}"]`)).toBeVisible({ timeout: 5000 });
}

/**
 * Wait for modal to close
 * 
 * @param page - Playwright page object
 * @param modalTestId - Modal test ID
 */
export async function waitForModalClose(
  page: Page,
  modalTestId: string
): Promise<void> {
  await expect(page.locator(`[data-testid="${modalTestId}"]`)).not.toBeVisible({ timeout: 5000 });
}

/**
 * Wait for loading spinner to disappear
 * 
 * @param page - Playwright page object
 * @param spinnerTestId - Spinner test ID (default: loading-spinner)
 */
export async function waitForLoadingComplete(
  page: Page,
  spinnerTestId: string = 'loading-spinner'
): Promise<void> {
  const spinner = page.locator(`[data-testid="${spinnerTestId}"]`);
  
  // Wait for spinner to appear (optional)
  try {
    await spinner.waitFor({ state: 'visible', timeout: 1000 });
  } catch {
    // Spinner might not appear if request is fast
  }
  
  // Wait for spinner to disappear
  await expect(spinner).not.toBeVisible({ timeout: 30000 });
}

/**
 * Wait for page navigation to complete
 * 
 * @param page - Playwright page object
 * @param url - Expected URL (partial match)
 */
export async function waitForNavigation(
  page: Page,
  url: string
): Promise<void> {
  await page.waitForURL(url, { timeout: 10000 });
}

/**
 * Wait for element to be visible
 * 
 * @param page - Playwright page object
 * @param testId - Element test ID
 * @param timeout - Timeout in milliseconds (default: 5000)
 */
export async function waitForElement(
  page: Page,
  testId: string,
  timeout: number = 5000
): Promise<void> {
  await expect(page.locator(`[data-testid="${testId}"]`)).toBeVisible({ timeout });
}
