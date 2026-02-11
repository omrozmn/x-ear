import { Page, expect } from '@playwright/test';

/**
 * Wait Helper Functions for E2E Tests
 */

/**
 * Wait for toast notification
 * @param page - Playwright page object
 * @param type - Toast type (success, error, info, warning)
 * @param timeout - Timeout in milliseconds
 */
export async function waitForToast(page: Page, type: 'success' | 'error' | 'info' | 'warning' = 'success', timeout = 5000) {
  await expect(page.locator(`[data-testid="toast-${type}"]`)).toBeVisible({ timeout });
}

/**
 * Wait for API call to complete
 * @param page - Playwright page object
 * @param urlPattern - URL pattern to match
 * @param timeout - Timeout in milliseconds
 */
export async function waitForAPI(page: Page, urlPattern: string | RegExp, timeout = 10000) {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Wait for modal to open
 * @param page - Playwright page object
 * @param modalTestId - Modal test ID
 * @param timeout - Timeout in milliseconds
 */
export async function waitForModal(page: Page, modalTestId: string, timeout = 5000) {
  await expect(page.locator(`[data-testid="${modalTestId}"]`)).toBeVisible({ timeout });
}

/**
 * Wait for modal to close
 * @param page - Playwright page object
 * @param modalTestId - Modal test ID
 * @param timeout - Timeout in milliseconds
 */
export async function waitForModalClose(page: Page, modalTestId: string, timeout = 5000) {
  await expect(page.locator(`[data-testid="${modalTestId}"]`)).not.toBeVisible({ timeout });
}

/**
 * Wait for loading spinner to disappear
 * @param page - Playwright page object
 * @param timeout - Timeout in milliseconds
 */
export async function waitForLoadingComplete(page: Page, timeout = 10000) {
  await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible({ timeout });
}

/**
 * Wait for page navigation
 * @param page - Playwright page object
 * @param urlPattern - URL pattern to match
 * @param timeout - Timeout in milliseconds
 */
export async function waitForNavigation(page: Page, urlPattern: string | RegExp, timeout = 10000) {
  await page.waitForURL(urlPattern, { timeout });
}

/**
 * Wait for element to be visible
 * @param page - Playwright page object
 * @param selector - Element selector
 * @param timeout - Timeout in milliseconds
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000) {
  await expect(page.locator(selector)).toBeVisible({ timeout });
}

/**
 * Wait for element to disappear
 * @param page - Playwright page object
 * @param selector - Element selector
 * @param timeout - Timeout in milliseconds
 */
export async function waitForElementGone(page: Page, selector: string, timeout = 10000) {
  await expect(page.locator(selector)).not.toBeVisible({ timeout });
}
