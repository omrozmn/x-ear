import { Page, Locator } from '@playwright/test';

/**
 * Landing Home Page Object Model
 * Phase 5.2.8 - POM for landing home page
 */
export class LandingHomePage {
  readonly page: Page;
  
  // Hero section
  readonly heroHeading: Locator;
  readonly heroSubtitle: Locator;
  readonly heroCTA: Locator;
  
  // Navigation
  readonly header: Locator;
  readonly navLinks: Locator;
  readonly loginButton: Locator;
  readonly signupButton: Locator;
  
  // Sections
  readonly featuresSection: Locator;
  readonly statsSection: Locator;
  readonly testimonialsSection: Locator;
  readonly footer: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Hero
    this.heroHeading = page.locator('h1, [data-testid="hero-heading"]').first();
    this.heroSubtitle = page.locator('[data-testid="hero-subtitle"], h2').first();
    this.heroCTA = page.locator('[data-testid="hero-cta"], button, a[href*="signup"]').first();
    
    // Navigation
    this.header = page.locator('header, nav, [data-testid="header"]').first();
    this.navLinks = page.locator('nav a, header a');
    this.loginButton = page.locator('a[href*="login"], button:has-text("Login")');
    this.signupButton = page.locator('a[href*="signup"], button:has-text("Sign")');
    
    // Sections
    this.featuresSection = page.locator('[data-testid="features"], [class*="feature"]');
    this.statsSection = page.locator('[data-testid="stats"], [class*="stat"]');
    this.testimonialsSection = page.locator('[data-testid="testimonials"], [class*="testimonial"]');
    this.footer = page.locator('footer, [data-testid="footer"]').first();
  }

  /**
   * Navigate to home page
   */
  async goto(): Promise<void> {
    const url = process.env.LANDING_BASE_URL || 'http://localhost:3000';
    await this.page.goto(url);
  }

  /**
   * Check if page is loaded
   */
  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('networkidle');
    return this.heroHeading.isVisible().catch(() => false);
  }

  /**
   * Click hero CTA
   */
  async clickHeroCTA(): Promise<void> {
    await this.heroCTA.click();
  }

  /**
   * Get features count
   */
  async getFeaturesCount(): Promise<number> {
    return this.featuresSection.count();
  }

  /**
   * Get testimonials count
   */
  async getTestimonialsCount(): Promise<number> {
    return this.testimonialsSection.count();
  }

  /**
   * Navigate to login
   */
  async goToLogin(): Promise<void> {
    await this.loginButton.first().click();
  }

  /**
   * Navigate to signup
   */
  async goToSignup(): Promise<void> {
    await this.signupButton.first().click();
  }
}
