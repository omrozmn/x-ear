import { Page, Locator, expect } from '@playwright/test';

/**
 * Form Helper - Form operations and validation
 * 
 * Provides reusable patterns for:
 * - Field input operations
 * - Form validation
 * - Field-level validation
 * - Multi-step forms
 * - File uploads
 */
export class FormHelper {
  constructor(private page: Page) {}

  // ================== Input Operations ==================

  /**
   * Fill input field by test ID
   */
  async fillInput(testId: string, value: string): Promise<void> {
    const input = this.page.locator(`[data-testid="${testId}"]`);
    await input.clear();
    await input.fill(value);
  }

  /**
   * Fill input by label text
   */
  async fillByLabel(label: string, value: string): Promise<void> {
    // Try various label patterns
    let input = this.page.locator(`label:has-text("${label}") + input`);
    
    if (await input.count() === 0) {
      input = this.page.locator(`label:has-text("${label}")`).locator('..').locator('input, textarea, select');
    }
    
    if (await input.count() === 0) {
      const forId = await this.page.locator(`label:has-text("${label}")`).getAttribute('for');
      if (forId) {
        input = this.page.locator(`#${forId}`);
      }
    }
    
    if (await input.count() === 0) {
      input = this.page.locator(`[aria-label="${label}"], [placeholder="${label}"]`);
    }
    
    await input.clear();
    await input.fill(value);
  }

  /**
   * Fill multiple fields at once
   */
  async fillFields(fields: Record<string, string>): Promise<void> {
    for (const [field, value] of Object.entries(fields)) {
      await this.fillInput(field, value);
    }
  }

  /**
   * Select option from dropdown by test ID
   */
  async selectOption(testId: string, option: string | number): Promise<void> {
    const select = this.page.locator(`[data-testid="${testId}"]`);
    await select.click();
    
    // Wait for dropdown
    await this.page.waitForSelector('.ant-select-dropdown, [role="listbox"]', { state: 'visible' });
    
    // Find and click option
    const optionLocator = typeof option === 'number'
      ? `.ant-select-dropdown .ant-select-item:nth-child(${option})`
      : `.ant-select-dropdown [role="option"]:has-text("${option}")`;
    
    await this.page.locator(optionLocator).click();
  }

  /**
   * Check/uncheck checkbox
   */
  async checkCheckbox(testId: string, checked = true): Promise<void> {
    const checkbox = this.page.locator(`[data-testid="${testId}"]`);
    const isChecked = await checkbox.isChecked();
    
    if ((!isChecked && checked) || (isChecked && !checked)) {
      await checkbox.check();
    }
  }

  /**
   * Toggle switch
   */
  async toggleSwitch(testId: string, on = true): Promise<void> {
    const switchEl = this.page.locator(`[data-testid="${testId}"]`);
    const isOn = await switchEl.getAttribute('class');
    
    if ((!isOn?.includes('checked') && on) || (isOn?.includes('checked') && !on)) {
      await switchEl.click();
    }
  }

  /**
   * Upload file
   */
  async uploadFile(testId: string, filePath: string): Promise<void> {
    const input = this.page.locator(`[data-testid="${testId}"]`);
    await input.setInputFiles(filePath);
  }

  /**
   * Clear file upload
   */
  async clearFile(testId: string): Promise<void> {
    const input = this.page.locator(`[data-testid="${testId}"]`);
    await input.setInputFiles([]);
  }

  // ================== Date/Time Fields ==================

  /**
   * Fill date picker
   */
  async fillDate(testId: string, date: string): Promise<void> {
    const dateInput = this.page.locator(`[data-testid="${testId}"]`);
    await dateInput.clear();
    await dateInput.fill(date);
    await dateInput.blur();
  }

  /**
   * Select date from date picker dropdown
   */
  async selectDate(testId: string, day: number): Promise<void> {
    const dateInput = this.page.locator(`[data-testid="${testId}"]`);
    await dateInput.click();
    
    // Wait for date picker
    await this.page.waitForSelector('.ant-picker-panel-container', { state: 'visible' });
    
    // Click on day
    await this.page.locator(`.ant-picker-cell[data-day="${day}"]`).click();
  }

  /**
   * Fill time picker
   */
  async fillTime(testId: string, hours: number, minutes: number): Promise<void> {
    const timeInput = this.page.locator(`[data-testid="${testId}"]`);
    const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    await timeInput.fill(time);
  }

  // ================== Validation ==================

  /**
   * Get field validation error
   */
  async getFieldError(testId: string): Promise<string> {
    const field = this.page.locator(`[data-testid="${testId}"]`);
    const error = field.locator('.ant-form-item-explain-error, .error, [class*="error"]');
    
    if (await error.count() > 0) {
      return error.textContent() || '';
    }
    
    return '';
  }

  /**
   * Check if field has error
   */
  async hasFieldError(testId: string): Promise<boolean> {
    const field = this.page.locator(`[data-testid="${testId}"]`);
    const error = field.locator('.ant-form-item-explain-error, .error, [class*="error"]');
    return error.isVisible();
  }

  /**
   * Wait for field error to appear
   */
  async waitForFieldError(testId: string, timeout = 5000): Promise<string> {
    const field = this.page.locator(`[data-testid="${testId}"]`);
    const error = field.locator('.ant-form-item-explain-error');
    
    await expect(error).toBeVisible({ timeout });
    return error.textContent() || '';
  }

  /**
   * Get all form validation errors
   */
  async getAllErrors(): Promise<string[]> {
    const errors = this.page.locator('.ant-form-item-explain-error, [class*="form-error"]');
    const count = await errors.count();
    const errorMessages: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const text = await errors.nth(i).textContent();
      if (text) errorMessages.push(text);
    }
    
    return errorMessages;
  }

  /**
   * Submit form and wait for validation
   */
  async submitAndWaitForValidation(submitButtonTestId: string): Promise<boolean> {
    const submitBtn = this.page.locator(`[data-testid="${submitButtonTestId}"]`);
    await submitBtn.click();
    
    // Wait a bit for validation to run
    await this.page.waitForTimeout(500);
    
    // Check if there are any visible errors
    const errors = await this.getAllErrors();
    return errors.length === 0;
  }

  // ================== Field State Checks ==================

  /**
   * Check if field is disabled
   */
  async isDisabled(testId: string): Promise<boolean> {
    const field = this.page.locator(`[data-testid="${testId}"]`);
    return field.isDisabled();
  }

  /**
   * Check if field is readonly
   */
  async isReadonly(testId: string): Promise<boolean> {
    const field = this.page.locator(`[data-testid="${testId}"]`);
    const readonly = await field.getAttribute('readonly');
    return readonly !== null;
  }

  /**
   * Check if field is visible
   */
  async isVisible(testId: string): Promise<boolean> {
    const field = this.page.locator(`[data-testid="${testId}"]`);
    return field.isVisible();
  }

  /**
   * Get field value
   */
  async getValue(testId: string): Promise<string> {
    const field = this.page.locator(`[data-testid="${testId}"]`);
    return field.inputValue();
  }

  // ================== Clear Operations ==================

  /**
   * Clear input field
   */
  async clearInput(testId: string): Promise<void> {
    const input = this.page.locator(`[data-testid="${testId}"]`);
    await input.clear();
  }

  /**
   * Clear all form fields
   */
  async clearForm(fieldTestIds: string[]): Promise<void> {
    for (const testId of fieldTestIds) {
      await this.clearInput(testId);
    }
  }

  // ================== Button Operations ==================

  /**
   * Click submit button
   */
  async submit(submitButtonTestId?: string): Promise<void> {
    if (submitButtonTestId) {
      await this.page.locator(`[data-testid="${submitButtonTestId}"]`).click();
    } else {
      await this.page.locator('button[type="submit"]').click();
    }
  }

  /**
   * Click cancel button
   */
  async cancel(cancelButtonTestId?: string): Promise<void> {
    if (cancelButtonTestId) {
      await this.page.locator(`[data-testid="${cancelButtonTestId}"]`).click();
    } else {
      await this.page.locator('button:has-text("Cancel")').click();
    }
  }

  // ================== Multi-step Forms ==================

  /**
   * Navigate to next step in multi-step form
   */
  async nextStep(nextButtonTestId: string): Promise<void> {
    const nextBtn = this.page.locator(`[data-testid="${nextButtonTestId}"]`);
    await nextBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to previous step
   */
  async previousStep(prevButtonTestId: string): Promise<void> {
    const prevBtn = this.page.locator(`[data-testid="${prevButtonTestId}"]`);
    await prevBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get current step number
   */
  async getCurrentStep(stepIndicatorTestId?: string): Promise<number> {
    if (stepIndicatorTestId) {
      const indicator = this.page.locator(`[data-testid="${stepIndicatorTestId}"]`);
      const text = await indicator.textContent() || '';
      const match = text.match(/Step (\d+)/);
      if (match) return parseInt(match[1]);
    }
    
    // Try to find active step
    const activeStep = this.page.locator('.ant-steps-item-process, [class*="step"][class*="active"]');
    if (await activeStep.count() > 0) {
      return 1;
    }
    
    return 1;
  }

  /**
   * Fill and submit multi-step form
   */
  async fillMultiStepForm(steps: Record<string, string>[]): Promise<void> {
    for (let i = 0; i < steps.length; i++) {
      await this.fillFields(steps[i]);
      
      if (i < steps.length - 1) {
        await this.nextStep('next-button');
      } else {
        await this.submit('submit-button');
      }
    }
  }
}
