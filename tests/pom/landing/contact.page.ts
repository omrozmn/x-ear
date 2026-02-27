import { Page, Locator } from '@playwright/test';

/**
 * Landing Contact Page Object Model
 * Phase 5.4.8 - POM for landing contact page
 */
export class LandingContactPage {
  readonly page: Page;
  
  // Form
  readonly contactForm: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly messageInput: Locator;
  readonly submitButton: Locator;
  
  // Messages
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  
  // Contact info
  readonly contactInfo: Locator;
  readonly emailLink: Locator;
  readonly phoneLink: Locator;
  readonly addressText: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Form
    this.contactForm = page.locator('form, [data-testid="contact-form"]').first();
    this.nameInput = page.locator('input[name="name"], input[placeholder*="name"], input[placeholder*="isim"]').first();
    this.emailInput = page.locator('input[type="email"], input[name="email"]').first();
    this.phoneInput = page.locator('input[type="tel"], input[name="phone"]').first();
    this.messageInput = page.locator('textarea, input[name="message"]').first();
    this.submitButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Gönder")').first();
    
    // Messages
    this.successMessage = page.locator('[class*="success"], [role="alert"]:has-text("success")');
    this.errorMessage = page.locator('[class*="error"], [class*="invalid"]');
    
    // Contact info
    this.contactInfo = page.locator('[class*="contact-info"], [class*="info"]');
    this.emailLink = page.locator('a[href^="mailto:"]');
    this.phoneLink = page.locator('a[href^="tel:"]');
    this.addressText = page.locator('[class*="address"]');
  }

  /**
   * Navigate to contact page
   */
  async goto(): Promise<void> {
    const baseUrl = process.env.LANDING_BASE_URL || 'http://localhost:3000';
    await this.page.goto(`${baseUrl}/contact`);
  }

  /**
   * Check if page is loaded
   */
  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('networkidle');
    const hasForm = await this.contactForm.isVisible({ timeout: 5000 }).catch(() => false);
    const hasContent = await this.page.locator('body').isVisible();
    return hasForm || hasContent;
  }

  /**
   * Fill contact form
   */
  async fillForm(data: { name: string; email: string; message: string; phone?: string }): Promise<void> {
    if (await this.nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.nameInput.fill(data.name);
    }
    
    if (await this.emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.emailInput.fill(data.email);
    }
    
    if (data.phone && await this.phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.phoneInput.fill(data.phone);
    }
    
    if (await this.messageInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.messageInput.fill(data.message);
    }
  }

  /**
   * Submit form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Check if form has validation errors
   */
  async hasValidationErrors(): Promise<boolean> {
    return this.errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Check if success message is shown
   */
  async hasSuccessMessage(): Promise<boolean> {
    return this.successMessage.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Get contact email
   */
  async getContactEmail(): Promise<string | null> {
    const href = await this.emailLink.getAttribute('href').catch(() => null);
    return href?.replace('mailto:', '') || null;
  }

  /**
   * Get contact phone
   */
  async getContactPhone(): Promise<string | null> {
    const href = await this.phoneLink.getAttribute('href').catch(() => null);
    return href?.replace('tel:', '') || null;
  }
}
