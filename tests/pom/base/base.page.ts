import { type Page, type Locator, expect, type APIResponse } from '@playwright/test';

/**
 * BasePage - Abstract base class for all Page Object Models
 * 
 * Provides common functionality for:
 * - Navigation
 * - Page waiting/loading
 * - TestID-based selectors
 * - Toast notifications
 * - Modal handling
 * - API response waiting
 * - Console/network error capture
 */
export abstract class BasePage {
  protected page: Page;
  protected baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'http://localhost:8080';
  }

  // ================== Navigation ==================

  /**
   * Navigate to a route relative to baseURL
   */
  async goto(route: string): Promise<void> {
    const url = route.startsWith('http') ? route : `${this.baseURL}${route}`;
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
    
    // Wait for any loading spinners to disappear
    const loadingSelector = '[data-testid="loading"], .loading, .spinner';
    await this.page.locator(loadingSelector).first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
      // Loading spinner may not exist, that's okay
    });
  }

  // ================== TestID Selectors ==================

  /**
   * Get element by TestID
   */
  testId(testId: string): Locator {
    return this.page.locator(`[data-testid="${testId}"]`);
  }

  /**
   * Get element by TestID and filter by text
   */
  testIdWithText(testId: string, text: string): Locator {
    return this.page.locator(`[data-testid="${testId}"]`, { hasText: text });
  }

  /**
   * Click element by TestID
   */
  async clickTestId(testId: string): Promise<void> {
    await this.testId(testId).click();
  }

  /**
   * Fill input by TestID
   */
  async fillTestId(testId: string, value: string): Promise<void> {
    await this.testId(testId).fill(value);
  }

  /**
   * Get text content by TestID
   */
  async getTextTestId(testId: string): Promise<string> {
    return this.testId(testId).textContent() || '';
  }

  /**
   * Check if element by TestID is visible
   */
  async isVisibleTestId(testId: string): Promise<boolean> {
    return this.testId(testId).isVisible();
  }

  // ================== Toast Notifications ==================

  /**
   * Wait for and assert success toast message
   */
  async expectSuccessToast(timeout = 5000): Promise<string> {
    // Try multiple toast selectors for compatibility
    const toastSelectors = [
      '[data-testid="toast-success"]',
      '.toast-success',
      '.Toastify__toast--success',
      '[class*="success"][class*="toast"]',
      '.ant-message-success',
      '.MuiSnackbar-root.success',
    ];
    
    for (const selector of toastSelectors) {
      const toast = this.page.locator(selector).first();
      if (await toast.isVisible().catch(() => false)) {
        const text = await toast.textContent() || '';
        await expect(toast).toBeVisible({ timeout });
        return text;
      }
    }
    
    throw new Error('Success toast not found');
  }

  /**
   * Wait for and assert error toast message
   */
  async expectErrorToast(timeout = 5000): Promise<string> {
    const toastSelectors = [
      '[data-testid="toast-error"]',
      '.toast-error',
      '.Toastify__toast--error',
      '[class*="error"][class*="toast"]',
      '.ant-message-error',
      '.MuiSnackbar-root.error',
      '.alert-error',
      '[role="alert"][class*="error"]',
    ];
    
    for (const selector of toastSelectors) {
      const toast = this.page.locator(selector).first();
      if (await toast.isVisible().catch(() => false)) {
        const text = await toast.textContent() || '';
        await expect(toast).toBeVisible({ timeout });
        return text;
      }
    }
    
    throw new Error('Error toast not found');
  }

  /**
   * Wait for and assert warning toast message
   */
  async expectWarningToast(timeout = 5000): Promise<string> {
    const toastSelectors = [
      '[data-testid="toast-warning"]',
      '.toast-warning',
      '.Toastify__toast--warning',
      '.ant-message-warning',
    ];
    
    for (const selector of toastSelectors) {
      const toast = this.page.locator(selector).first();
      if (await toast.isVisible().catch(() => false)) {
        const text = await toast.textContent() || '';
        await expect(toast).toBeVisible({ timeout });
        return text;
      }
    }
    
    throw new Error('Warning toast not found');
  }

  /**
   * Wait for and assert info toast message
   */
  async expectInfoToast(timeout = 5000): Promise<string> {
    const toastSelectors = [
      '[data-testid="toast-info"]',
      '.toast-info',
      '.Toastify__toast--info',
      '.ant-message-info',
    ];
    
    for (const selector of toastSelectors) {
      const toast = this.page.locator(selector).first();
      if (await toast.isVisible().catch(() => false)) {
        const text = await toast.textContent() || '';
        await expect(toast).toBeVisible({ timeout });
        return text;
      }
    }
    
    throw new Error('Info toast not found');
  }

  // ================== Modal Handling ==================

  /**
   * Wait for modal to open
   */
  async waitForModalOpen(modalTestId?: string): Promise<void> {
    const modalSelectors = modalTestId 
      ? `[data-testid="${modalTestId}"]`
      : '[role="dialog"], .modal, .ant-modal, [class*="modal"]:visible';
    
    await this.page.locator(modalSelectors).first().waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait for modal content to be ready
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for modal to close
   */
  async waitForModalClose(modalTestId?: string): Promise<void> {
    const modalSelectors = modalTestId 
      ? `[data-testid="${modalTestId}"]`
      : '[role="dialog"], .modal, .ant-modal';
    
    // Modal should be hidden or detached
    await this.page.locator(modalSelectors).first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // Sometimes modals are removed from DOM, which is also fine
    });
  }

  /**
   * Close modal by clicking backdrop or close button
   */
  async closeModal(modalTestId?: string): Promise<void> {
    // Try close button first
    const closeButtonSelectors = [
      '[data-testid="modal-close"]',
      '[aria-label="Close"]',
      '.modal-close',
      '.ant-modal-close',
      '[class*="close"][class*="modal"]',
    ];
    
    for (const selector of closeButtonSelectors) {
      const closeBtn = this.page.locator(selector).first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await this.waitForModalClose(modalTestId);
        return;
      }
    }
    
    // Try clicking backdrop
    const backdrop = this.page.locator('.ant-modal-mask, .modal-backdrop');
    if (await backdrop.isVisible().catch(() => false)) {
      await backdrop.click({ position: { x: 10, y: 10 } });
      await this.waitForModalClose(modalTestId);
    }
  }

  /**
   * Confirm modal action (click confirm button)
   */
  async confirmModal(): Promise<void> {
    const confirmButtonSelectors = [
      '[data-testid="modal-confirm"]',
      'button[type="submit"]',
      '.ant-modal-ok',
      '[class*="confirm"]',
      'button:has-text("Confirm")',
      'button:has-text("Save")',
      'button:has-text("Submit")',
    ];
    
    for (const selector of confirmButtonSelectors) {
      const button = this.page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        return;
      }
    }
    
    throw new Error('Confirm button not found in modal');
  }

  /**
   * Cancel modal action (click cancel button)
   */
  async cancelModal(): Promise<void> {
    const cancelButtonSelectors = [
      '[data-testid="modal-cancel"]',
      '.ant-modal-cancel',
      '[class*="cancel"]',
      'button:has-text("Cancel")',
    ];
    
    for (const selector of cancelButtonSelectors) {
      const button = this.page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await this.waitForModalClose();
        return;
      }
    }
    
    throw new Error('Cancel button not found in modal');
  }

  // ================== API Response Waiting ==================

  /**
   * Wait for API response matching URL pattern
   */
  async waitForApiResponse(urlPattern: string | RegExp, options?: {
    timeout?: number;
    method?: string;
  }): Promise<unknown> {
    return this.page.waitForResponse(
      response => {
        const url = response.url();
        const matchesUrl = typeof urlPattern === 'string' 
          ? url.includes(urlPattern)
          : urlPattern.test(url);
        
        const matchesMethod = !options?.method || 
          response.request().method() === options.method;
        
        return matchesUrl && matchesMethod;
      },
      { timeout: options?.timeout || 30000 }
    );
  }

  /**
   * Wait for API response and return JSON body
   */
  async waitForApiJson<T = unknown>(urlPattern: string | RegExp, options?: {
    timeout?: number;
    method?: string;
  }): Promise<T> {
    const response = await this.page.waitForResponse(
      r => {
        const url = r.url();
        const matchesUrl = typeof urlPattern === 'string' 
          ? url.includes(urlPattern)
          : urlPattern.test(url);
        const matchesMethod = !options?.method || 
          r.request().method() === options.method;
        return matchesUrl && matchesMethod;
      },
      { timeout: options?.timeout || 30000 }
    );
    return response.json() as Promise<T>;
  }

  /**
   * Wait for multiple API responses
   */
  async waitForApiResponses(urlPatterns: (string | RegExp)[], options?: {
    timeout?: number;
    method?: string;
  }): Promise<unknown[]> {
    const promises = urlPatterns.map(pattern => 
      this.waitForApiResponse(pattern, options)
    );
    return Promise.all(promises);
  }

  // ================== Console & Network Error Capture ==================

  /**
   * Capture console errors since method call
   */
  async captureConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    const handleConsole = (msg: { type(): string; text(): string }) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    };
    
    this.page.on('console', handleConsole);
    
    // Wait a bit for any async errors
    await this.page.waitForTimeout(500);
    
    // Remove listener
    this.page.off('console', handleConsole);
    
    return errors;
  }

  /**
   * Monitor console errors during an action
   */
  async withConsoleErrorCapture<T>(action: () => Promise<T>): Promise<{
    result: T;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    const handleConsole = (msg: { type(): string; text(): string }) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    };
    
    this.page.on('console', handleConsole);
    
    const result = await action();
    
    // Wait for potential async errors
    await this.page.waitForTimeout(1000);
    
    this.page.off('console', handleConsole);
    
    return { result, errors };
  }

  /**
   * Capture network failures (4xx, 5xx responses)
   */
  async captureNetworkFailures(): Promise<{ url: string; status: number; failure: string }[]> {
    const failures: { url: string; status: number; failure: string }[] = [];
    
    const handleResponse = (response: { url(): string; status(): number }) => {
      const status = response.status();
      if (status >= 400) {
        failures.push({
          url: response.url(),
          status,
          failure: `HTTP ${status}`,
        });
      }
    };
    
    this.page.on('response', handleResponse);
    
    // Wait for potential network activity
    await this.page.waitForTimeout(1000);
    
    this.page.off('response', handleResponse);
    
    return failures;
  }

  /**
   * Monitor network failures during an action
   */
  async withNetworkFailureCapture<T>(action: () => Promise<T>): Promise<{
    result: T;
    failures: { url: string; status: number; failure: string }[];
  }> {
    const failures: { url: string; status: number; failure: string }[] = [];
    
    const handleResponse = (response: { url(): string; status(): number }) => {
      const status = response.status();
      if (status >= 400) {
        failures.push({
          url: response.url(),
          status,
          failure: `HTTP ${status}`,
        });
      }
    };
    
    this.page.on('response', handleResponse);
    
    const result = await action();
    
    // Wait for potential async responses
    await this.page.waitForTimeout(1000);
    
    this.page.off('response', handleResponse);
    
    return { result, failures };
  }

  // ================== Form Helpers ==================

  /**
   * Fill form field by label text
   */
  async fillByLabel(label: string, value: string): Promise<void> {
    // Try various label selectors
    const labelLocator = this.page.locator(`label:has-text("${label}"), [for="${label}"]`).first();
    
    if (await labelLocator.isVisible().catch(() => false)) {
      const inputId = await labelLocator.getAttribute('for');
      if (inputId) {
        await this.page.locator(`#${inputId}`).fill(value);
        return;
      }
      
      // Try finding input inside label
      const input = labelLocator.locator('input, textarea, select');
      if (await input.count() > 0) {
        await input.fill(value);
        return;
      }
    }
    
    // Fallback: find by placeholder or aria-label
    await this.page.locator(`[placeholder*="${label}"], [aria-label="${label}"]`).fill(value);
  }

  /**
   * Click button by text
   */
  async clickButton(text: string): Promise<void> {
    await this.page.locator(`button:has-text("${text}"), a:has-text("${text}"]`).click();
  }

  /**
   * Submit form
   */
  async submitForm(): Promise<void> {
    await this.page.locator('button[type="submit"]').click();
  }

  // ================== Utility Methods ==================

  /**
   * Take a screenshot
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Get current URL
   */
  getUrl(): string {
    return this.page.url();
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Reload page
   */
  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  }

  /**
   * Wait for specific number of ms
   */
  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }
}
