import { Page, Locator, expect } from '@playwright/test';

/**
 * Modal Helper - Modal/Dialog operations
 * 
 * Provides reusable patterns for:
 * - Opening/closing modals
 * - Confirm/Cancel actions
 * - Form submission in modals
 * - Backdrop click to close
 * - Escape key to close
 * - Loading states
 */
export class ModalHelper {
  constructor(private page: Page) {}

  // ================== Modal Open/Close ==================

  /**
   * Open modal by clicking trigger button
   */
  async openModal(triggerButtonTestId: string, modalTestId?: string): Promise<void> {
    const triggerBtn = this.page.locator(`[data-testid="${triggerButtonTestId}"]`);
    await triggerBtn.click();
    
    if (modalTestId) {
      await this.waitForModal(modalTestId);
    } else {
      // Wait for any modal to appear
      await this.page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
    }
  }

  /**
   * Wait for modal to be visible
   */
  async waitForModal(modalTestId: string, timeout = 5000): Promise<Locator> {
    const modal = this.page.locator(`[data-testid="${modalTestId}"]`);
    await expect(modal).toBeVisible({ timeout });
    return modal;
  }

  /**
   * Wait for modal to be hidden/removed
   */
  async waitForModalClose(modalTestId?: string, timeout = 5000): Promise<void> {
    if (modalTestId) {
      const modal = this.page.locator(`[data-testid="${modalTestId}"]`);
      await expect(modal).not.toBeVisible({ timeout });
    } else {
      await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout });
    }
  }

  /**
   * Close modal by clicking close button
   */
  async closeModalByButton(modalTestId: string, closeButtonTestId?: string): Promise<void> {
    const closeBtn = closeButtonTestId
      ? this.page.locator(`[data-testid="${closeButtonTestId}"]`)
      : this.page.locator(`[data-testid="${modalTestId}"] [aria-label="Close"], [data-testid*="close"]`);
    
    if (await closeBtn.count() > 0) {
      await closeBtn.first().click();
    }
    
    await this.waitForModalClose(modalTestId);
  }

  /**
   * Close modal by clicking backdrop
   */
  async closeModalByBackdrop(modalTestId?: string): Promise<void> {
    // Click outside modal (on backdrop)
    await this.page.mouse.click(10, 10);
    await this.page.waitForTimeout(300);
    
    if (modalTestId) {
      await this.waitForModalClose(modalTestId);
    }
  }

  /**
   * Close modal by pressing Escape
   */
  async closeModalByEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  // ================== Confirm/Cancel ==================

  /**
   * Click confirm button in modal
   */
  async confirm(modalTestId: string, confirmButtonTestId?: string): Promise<void> {
    const confirmBtn = confirmButtonTestId
      ? this.page.locator(`[data-testid="${confirmButtonTestId}"]`)
      : this.page.locator(`[data-testid="${modalTestId}"] button[type="submit"], [data-testid="${modalTestId}"] button:has-text("Confirm"), [data-testid="${modalTestId}"] button:has-text("Save")`);
    
    await confirmBtn.click();
    
    // Wait for modal to close or loading to start
    await this.page.waitForTimeout(500);
  }

  /**
   * Click cancel button in modal
   */
  async cancel(modalTestId: string, cancelButtonTestId?: string): Promise<void> {
    const cancelBtn = cancelButtonTestId
      ? this.page.locator(`[data-testid="${cancelButtonTestId}"]`)
      : this.page.locator(`[data-testid="${modalTestId}"] button:has-text("Cancel"), [data-testid="${modalTestId}"] [class*="cancel"]`);
    
    await cancelBtn.click();
    await this.waitForModalClose(modalTestId);
  }

  // ================== Form in Modal ==================

  /**
   * Fill form fields in modal
   */
  async fillForm(modalTestId: string, fields: Record<string, string>): Promise<void> {
    for (const [fieldLabel, value] of Object.entries(fields)) {
      // Try by testid first
      let input = this.page.locator(`[data-testid="${modalTestId}"] [data-testid="${fieldLabel}"]`);
      
      if (await input.count() === 0) {
        // Try by label
        input = this.page.locator(`[data-testid="${modalTestId}"] label:has-text("${fieldLabel}") + input, [data-testid="${modalTestId}"] [for="${fieldLabel}"]`);
      }
      
      if (await input.count() === 0) {
        // Try by placeholder
        input = this.page.locator(`[data-testid="${modalTestId}"] [placeholder*="${fieldLabel}"]`);
      }
      
      await input.fill(value);
    }
  }

  /**
   * Fill and submit form in modal
   */
  async fillAndSubmit(modalTestId: string, fields: Record<string, string>, submitButtonTestId?: string): Promise<void> {
    await this.fillForm(modalTestId, fields);
    await this.confirm(modalTestId, submitButtonTestId);
  }

  // ================== Modal State Checks ==================

  /**
   * Check if modal is visible
   */
  async isModalOpen(modalTestId?: string): Promise<boolean> {
    if (modalTestId) {
      return this.page.locator(`[data-testid="${modalTestId}"]`).isVisible();
    }
    return this.page.locator('[role="dialog"]').isVisible();
  }

  /**
   * Get modal title
   */
  async getModalTitle(modalTestId: string): Promise<string> {
    const title = this.page.locator(`[data-testid="${modalTestId}"] h2, [data-testid="${modalTestId}"] [class*="title"]`);
    return title.textContent() || '';
  }

  /**
   * Check for validation errors in modal
   */
  async getValidationErrors(modalTestId: string): Promise<string[]> {
    const errors = this.page.locator(`[data-testid="${modalTestId}"] [class*="error"], [data-testid="${modalTestId}"] .ant-form-item-explain-error`);
    const count = await errors.count();
    const errorMessages: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const text = await errors.nth(i).textContent();
      if (text) errorMessages.push(text);
    }
    
    return errorMessages;
  }

  // ================== Loading States ==================

  /**
   * Wait for loading to finish in modal
   */
  async waitForLoading(modalTestId: string, timeout = 10000): Promise<void> {
    // Wait for any spinner to disappear
    const spinner = this.page.locator(`[data-testid="${modalTestId}"] .loading, [data-testid="${modalTestId}"] .spinner`);
    await spinner.waitFor({ state: 'hidden', timeout }).catch(() => {});
    
    // Also wait for network idle
    await this.page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  }

  /**
   * Check if modal is in loading state
   */
  async isLoading(modalTestId: string): Promise<boolean> {
    const spinner = this.page.locator(`[data-testid="${modalTestId}"] .loading, [data-testid="${modalTestId}"] .spinner`);
    return spinner.isVisible();
  }

  // ================== Confirm Dialogs ==================

  /**
   * Accept confirmation dialog
   */
  async acceptConfirm(): Promise<void> {
    this.page.on('dialog', async dialog => {
      await dialog.accept();
    });
  }

  /**
   * Dismiss confirmation dialog
   */
  async dismissConfirm(): Promise<void> {
    this.page.on('dialog', async dialog => {
      await dialog.dismiss();
    });
  }

  /**
   * Handle confirm dialog with specific message
   */
  async handleConfirm(expectedMessage: string, accept = true): Promise<void> {
    const dialogPromise = this.page.waitForEvent('dialog');
    
    if (accept) {
      this.page.on('dialog', async dialog => {
        if (dialog.message().includes(expectedMessage)) {
          await dialog.accept();
        } else {
          await dialog.dismiss();
        }
      });
    }
  }
}
