import { Page, expect } from '@playwright/test';

/**
 * Assertion Helper Functions for E2E Tests
 */

/**
 * Assert toast message is visible
 * @param page - Playwright page object
 * @param type - Toast type
 * @param message - Expected message (optional)
 */
export async function assertToast(page: Page, type: 'success' | 'error' | 'info' | 'warning', message?: string) {
  const toast = page.locator(`[data-testid="toast-${type}"]`);
  await expect(toast).toBeVisible();
  
  if (message) {
    await expect(toast).toContainText(message);
  }
}

/**
 * Assert modal is visible
 * @param page - Playwright page object
 * @param modalTestId - Modal test ID
 */
export async function assertModal(page: Page, modalTestId: string) {
  await expect(page.locator(`[data-testid="${modalTestId}"]`)).toBeVisible();
}

/**
 * Assert modal is closed
 * @param page - Playwright page object
 * @param modalTestId - Modal test ID
 */
export async function assertModalClosed(page: Page, modalTestId: string) {
  await expect(page.locator(`[data-testid="${modalTestId}"]`)).not.toBeVisible();
}

/**
 * Assert API response
 * @param page - Playwright page object
 * @param urlPattern - URL pattern to match
 * @param expectedStatus - Expected status code
 */
export async function assertAPIResponse(page: Page, urlPattern: string | RegExp, expectedStatus: number) {
  const response = await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    }
  );
  
  expect(response.status()).toBe(expectedStatus);
}

/**
 * Assert element contains text
 * @param page - Playwright page object
 * @param selector - Element selector
 * @param text - Expected text
 */
export async function assertElementText(page: Page, selector: string, text: string) {
  await expect(page.locator(selector)).toContainText(text);
}

/**
 * Assert element is visible
 * @param page - Playwright page object
 * @param selector - Element selector
 */
export async function assertElementVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
}

/**
 * Assert element is hidden
 * @param page - Playwright page object
 * @param selector - Element selector
 */
export async function assertElementHidden(page: Page, selector: string) {
  await expect(page.locator(selector)).not.toBeVisible();
}

/**
 * Assert element is enabled
 * @param page - Playwright page object
 * @param selector - Element selector
 */
export async function assertElementEnabled(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeEnabled();
}

/**
 * Assert element is disabled
 * @param page - Playwright page object
 * @param selector - Element selector
 */
export async function assertElementDisabled(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeDisabled();
}

/**
 * Assert URL matches pattern
 * @param page - Playwright page object
 * @param pattern - URL pattern
 */
export async function assertURL(page: Page, pattern: string | RegExp) {
  await expect(page).toHaveURL(pattern);
}

/**
 * Assert page title
 * @param page - Playwright page object
 * @param title - Expected title
 */
export async function assertPageTitle(page: Page, title: string | RegExp) {
  await expect(page).toHaveTitle(title);
}
