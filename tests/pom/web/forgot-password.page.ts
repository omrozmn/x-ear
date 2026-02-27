import { Page, Locator } from '@playwright/test';

/**
 * Web Forgot Password Page Object Model
 * Phase 3.1.6 - POM for forgot password functionality
 */
export class ForgotPasswordPage {
  readonly page: Page;

  // Form elements
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly backToLoginLink: Locator;

  // Validation messages
  readonly emailError: Locator;
  readonly generalError: Locator;

  // Success state
  readonly successMessage: Locator;
  readonly successDescription: Locator;

  // Page elements
  readonly pageTitle: Locator;
  readonly pageDescription: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form elements - using common test ID patterns
    this.emailInput = page.locator('[data-testid="forgot-password-email-input"], input[name="email"], input[type="email"]').first();
    this.submitButton = page.locator('[data-testid="forgot-password-submit-button"], button[type="submit"]').first();
    this.backToLoginLink = page.locator('[data-testid="forgot-password-back-to-login"], a:has-text("Giriş"), a:has-text("login")').first();

    // Validation messages
    this.emailError = page.locator('[data-testid="forgot-password-email-error"], [class*="error"]:has(input[name="email"])').first();
    this.generalError = page.locator('[data-testid="forgot-password-general-error"], .error-message, [role="alert"]').first();

    // Success state
    this.successMessage = page.locator('[data-testid="forgot-password-success-message"], text=/şifre|başarılı|email/i').first();
    this.successDescription = page.locator('[data-testid="forgot-password-success-description"], .success-description').first();

    // Page elements
    this.pageTitle = page.locator('h1, h2:has-text("Şifre"), [data-testid="page-title"]').first();
    this.pageDescription = page.locator('text=/email|şifre|sıfırla/i').first();
  }

  /**
   * Navigate to forgot password page
   */
  async goto(): Promise<void> {
    await this.page.goto('/forgot-password');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Submit the form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Request password reset
   */
  async requestReset(email: string): Promise<void> {
    await this.goto();
    await this.fillEmail(email);
    await this.submit();
  }

  /**
   * Click back to login link
   */
  async clickBackToLogin(): Promise<void> {
    await this.backToLoginLink.click();
  }

  /**
   * Get email validation error text
   */
  async getEmailError(): Promise<string> {
    // Try multiple selectors for error message
    const errorSelectors = [
      '[data-testid="forgot-password-email-error"]',
      'input[name="email"] + span',
      'input[name="email"] + div',
      '[class*="error"]',
    ];

    for (const selector of errorSelectors) {
      const errorEl = this.page.locator(selector).first();
      if (await errorEl.isVisible().catch(() => false)) {
        return errorEl.textContent() || '';
      }
    }
    return '';
  }

  /**
   * Get general error message
   */
  async getGeneralError(): Promise<string> {
    return this.generalError.textContent() || '';
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string> {
    // Try multiple selectors for success message
    const successSelectors = [
      '[data-testid="toast-success"]',
      '.toast-success',
      '[class*="success"]',
      'text=/başarılı|email.*gönder/i',
    ];

    for (const selector of successSelectors) {
      const successEl = this.page.locator(selector).first();
      if (await successEl.isVisible().catch(() => false)) {
        return successEl.textContent() || '';
      }
    }
    return '';
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitDisabled(): Promise<boolean> {
    return this.submitButton.isDisabled();
  }

  /**
   * Check if email input is visible
   */
  async isEmailInputVisible(): Promise<boolean> {
    return this.emailInput.isVisible();
  }

  /**
   * Wait for success toast/message after submission
   */
  async waitForSuccess(timeout = 5000): Promise<void> {
    // Wait for any toast or success message
    await Promise.race([
      this.page.locator('[data-testid="toast-success"]').waitFor({ state: 'visible', timeout }).catch(() => {}),
      this.page.locator('.toast-success').waitFor({ state: 'visible', timeout }).catch(() => {}),
      this.page.locator('text=/başarılı|email.*gönder/i').waitFor({ state: 'visible', timeout }).catch(() => {}),
    ]);
  }

  /**
   * Wait for error message after submission
   */
  async waitForError(timeout = 5000): Promise<void> {
    // Wait for any error message
    await Promise.race([
      this.page.locator('[data-testid="toast-error"]').waitFor({ state: 'visible', timeout }).catch(() => {}),
      this.page.locator('.toast-error').waitFor({ state: 'visible', timeout }).catch(() => {}),
      this.page.locator('[role="alert"]').waitFor({ state: 'visible', timeout }).catch(() => {}),
    ]);
  }
}
