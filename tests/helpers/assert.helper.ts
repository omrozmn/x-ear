import { Page, expect } from '@playwright/test';

/**
 * Assertion Helper Functions
 * 
 * Provides reusable assertion utilities for E2E tests
 */

/**
 * Assert toast is visible with optional message
 * 
 * @param page - Playwright page object
 * @param type - Toast type
 * @param message - Optional message to verify
 */
export async function expectToastVisible(
  page: Page,
  type: 'success' | 'error' | 'warning' | 'info',
  message?: string
): Promise<void> {
  const toast = page.locator(`[data-testid="${type}-toast"]`);
  await expect(toast).toBeVisible({ timeout: 10000 });
  
  if (message) {
    await expect(toast).toContainText(message);
  }
}

/**
 * Assert modal is open
 * 
 * @param page - Playwright page object
 * @param modalTestId - Modal test ID
 */
export async function expectModalOpen(
  page: Page,
  modalTestId: string
): Promise<void> {
  await expect(page.locator(`[data-testid="${modalTestId}"]`)).toBeVisible({ timeout: 5000 });
}

/**
 * Assert modal is closed
 * 
 * @param page - Playwright page object
 * @param modalTestId - Modal test ID
 */
export async function expectModalClosed(
  page: Page,
  modalTestId: string
): Promise<void> {
  await expect(page.locator(`[data-testid="${modalTestId}"]`)).not.toBeVisible({ timeout: 5000 });
}

/**
 * Assert API call was successful
 * 
 * @param page - Playwright page object
 * @param endpoint - API endpoint
 * @param status - Expected status code (default: 200)
 */
export async function expectApiSuccess(
  page: Page,
  endpoint: string,
  status: number = 200
): Promise<void> {
  const response = await page.waitForResponse(
    r => r.url().includes(endpoint) && r.status() === status,
    { timeout: 30000 }
  );
  
  expect(response.status()).toBe(status);
}

/**
 * Assert element is visible
 * 
 * @param page - Playwright page object
 * @param testId - Element test ID
 */
export async function expectElementVisible(
  page: Page,
  testId: string
): Promise<void> {
  await expect(page.locator(`[data-testid="${testId}"]`)).toBeVisible({ timeout: 5000 });
}

/**
 * Assert element is not visible
 * 
 * @param page - Playwright page object
 * @param testId - Element test ID
 */
export async function expectElementNotVisible(
  page: Page,
  testId: string
): Promise<void> {
  await expect(page.locator(`[data-testid="${testId}"]`)).not.toBeVisible({ timeout: 5000 });
}

/**
 * Assert element contains text
 * 
 * @param page - Playwright page object
 * @param testId - Element test ID
 * @param text - Expected text
 */
export async function expectElementText(
  page: Page,
  testId: string,
  text: string
): Promise<void> {
  await expect(page.locator(`[data-testid="${testId}"]`)).toContainText(text);
}

/**
 * Assert element count
 * 
 * @param page - Playwright page object
 * @param testId - Element test ID
 * @param count - Expected count
 */
export async function expectElementCount(
  page: Page,
  testId: string,
  count: number
): Promise<void> {
  await expect(page.locator(`[data-testid="${testId}"]`)).toHaveCount(count);
}

/**
 * Assert URL matches pattern
 * 
 * @param page - Playwright page object
 * @param pattern - URL pattern (string or regex)
 */
export async function expectUrl(
  page: Page,
  pattern: string | RegExp
): Promise<void> {
  await expect(page).toHaveURL(pattern);
}

/**
 * Assert page title
 * 
 * @param page - Playwright page object
 * @param title - Expected title (string or regex)
 */
export async function expectTitle(
  page: Page,
  title: string | RegExp
): Promise<void> {
  await expect(page).toHaveTitle(title);
}

/**
 * Assert form validation error
 * 
 * @param page - Playwright page object
 * @param fieldTestId - Field test ID
 * @param errorMessage - Expected error message
 */
export async function expectValidationError(
  page: Page,
  fieldTestId: string,
  errorMessage: string
): Promise<void> {
  const errorElement = page.locator(`[data-testid="${fieldTestId}-error"]`);
  await expect(errorElement).toBeVisible();
  await expect(errorElement).toContainText(errorMessage);
}

/**
 * Assert button is disabled
 * 
 * @param page - Playwright page object
 * @param buttonTestId - Button test ID
 */
export async function expectButtonDisabled(
  page: Page,
  buttonTestId: string
): Promise<void> {
  await expect(page.locator(`[data-testid="${buttonTestId}"]`)).toBeDisabled();
}

/**
 * Assert button is enabled
 * 
 * @param page - Playwright page object
 * @param buttonTestId - Button test ID
 */
export async function expectButtonEnabled(
  page: Page,
  buttonTestId: string
): Promise<void> {
  await expect(page.locator(`[data-testid="${buttonTestId}"]`)).toBeEnabled();
}
