import { Page, Locator } from '@playwright/test';

/**
 * Landing Pricing Page Object Model
 * Phase 5.3.8 - POM for landing pricing page
 */
export class LandingPricingPage {
  readonly page: Page;
  
  // Plan cards
  readonly planCards: Locator;
  readonly basicPlan: Locator;
  readonly proPlan: Locator;
  readonly enterprisePlan: Locator;
  
  // Billing toggle
  readonly billingToggle: Locator;
  readonly monthlyOption: Locator;
  readonly annualOption: Locator;
  
  // CTA buttons
  readonly ctaButtons: Locator;
  
  // Comparison table
  readonly comparisonTable: Locator;
  
  // Features
  readonly featureLists: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Plan cards
    this.planCards = page.locator('[class*="plan"], [class*="pricing-card"], [data-testid="plan-card"]');
    this.basicPlan = page.locator('[data-testid="plan-basic"], [class*="basic"]');
    this.proPlan = page.locator('[data-testid="plan-pro"], [class*="pro"]');
    this.enterprisePlan = page.locator('[data-testid="plan-enterprise"], [class*="enterprise"]');
    
    // Billing toggle
    this.billingToggle = page.locator('[data-testid="billing-toggle"], [class*="toggle"]');
    this.monthlyOption = page.locator('button, [role="switch"]').filter({ hasText: /monthly|aylık/i });
    this.annualOption = page.locator('button, [role="switch"]').filter({ hasText: /annual|yıllık/i });
    
    // CTAs
    this.ctaButtons = page.locator('button, a').filter({ hasText: /başla|start|seç|choose/i });
    
    // Comparison
    this.comparisonTable = page.locator('table, [data-testid="comparison-table"]');
    
    // Features
    this.featureLists = page.locator('[class*="plan"] ul, [data-testid="features"]');
  }

  /**
   * Navigate to pricing page
   */
  async goto(): Promise<void> {
    const baseUrl = process.env.LANDING_BASE_URL || 'http://localhost:3000';
    await this.page.goto(`${baseUrl}/pricing`);
  }

  /**
   * Check if page is loaded
   */
  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('networkidle');
    return this.planCards.first().isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Get plan count
   */
  async getPlanCount(): Promise<number> {
    return this.planCards.count();
  }

  /**
   * Switch to monthly billing
   */
  async switchToMonthly(): Promise<void> {
    await this.monthlyOption.first().click();
  }

  /**
   * Switch to annual billing
   */
  async switchToAnnual(): Promise<void> {
    await this.annualOption.first().click();
  }

  /**
   * Click CTA for specific plan
   */
  async clickPlanCTA(planIndex: number = 0): Promise<void> {
    const cta = this.ctaButtons.nth(planIndex);
    await cta.click();
  }

  /**
   * Get features for plan
   */
  async getPlanFeatures(planIndex: number = 0): Promise<string[]> {
    const featureList = this.featureLists.nth(planIndex);
    const items = featureList.locator('li');
    const count = await items.count();
    
    const features: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      if (text) features.push(text.trim());
    }
    
    return features;
  }
}
