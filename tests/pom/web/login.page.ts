import { Page, Locator } from '@playwright/test';

/**
 * Web Login Page Object Model
 * Phase 3.1.12 - POM for login functionality
 */
export class WebLoginPage {
  readonly page: Page;
  
  // Form elements
  readonly identifierInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly forgotPasswordLink: Locator;
  readonly passwordToggle: Locator;
  
  // Error messages
  readonly errorMessage: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Form elements
    this.identifierInput = page.locator('[data-testid="login-identifier-input"]');
    this.passwordInput = page.locator('[data-testid="login-password-input"]');
    this.submitButton = page.locator('[data-testid="login-submit-button"]');
    this.rememberMeCheckbox = page.locator('[data-testid="login-remember-me"]');
    this.forgotPasswordLink = page.locator('[data-testid="login-forgot-password"]');
    this.passwordToggle = page.locator('[data-testid="login-password-toggle"]');
    
    // Error messages
    this.errorMessage = page.locator('[data-testid="login-error-message"]');
  }

  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  /**
   * Fill login form
   */
  async fillLoginForm(identifier: string, password: string): Promise<void> {
    await this.identifierInput.fill(identifier);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit login form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Login with credentials
   */
  async login(identifier: string, password: string): Promise<void> {
    await this.goto();
    await this.fillLoginForm(identifier, password);
    await this.submit();
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    await this.passwordToggle.click();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return this.errorMessage.textContent() || '';
  }

  /**
   * Check if login was successful (redirected away from login)
   */
  async isLoggedIn(): Promise<boolean> {
    const url = this.page.url();
    return !url.includes('/login');
  }
}
