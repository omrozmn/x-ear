import { Page, Locator } from '@playwright/test';

/**
 * Web Dashboard Page Object Model
 * Phase 3.2.8 - POM for dashboard functionality
 */
export class WebDashboardPage {
  readonly page: Page;
  
  // Header elements
  readonly sidebar: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  
  // Dashboard widgets
  readonly revenueSummaryWidget: Locator;
  readonly todayAppointmentsWidget: Locator;
  readonly recentSalesWidget: Locator;
  readonly quickActionsWidget: Locator;
  
  // Filters
  readonly dateRangeFilter: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Header
    this.sidebar = page.locator('[data-testid="sidebar"]');
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.logoutButton = page.locator('[data-testid="logout-button"]');
    
    // Widgets
    this.revenueSummaryWidget = page.locator('[data-testid="revenue-summary-widget"]');
    this.todayAppointmentsWidget = page.locator('[data-testid="today-appointments-widget"]');
    this.recentSalesWidget = page.locator('[data-testid="recent-sales-widget"]');
    this.quickActionsWidget = page.locator('[data-testid="quick-actions-widget"]');
    
    // Filters
    this.dateRangeFilter = page.locator('[data-testid="date-range-filter"]');
  }

  /**
   * Navigate to dashboard
   */
  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
  }

  /**
   * Check if page is loaded
   */
  async isLoaded(): Promise<boolean> {
    await this.page.waitForLoadState('networkidle');
    return this.revenueSummaryWidget.isVisible().catch(() => false);
  }

  /**
   * Get revenue summary value
   */
  async getRevenueSummary(): Promise<string> {
    const widget = this.revenueSummaryWidget.locator('[data-testid="revenue-value"]');
    return widget.textContent() || '';
  }

  /**
   * Get today's appointments count
   */
  async getTodayAppointmentsCount(): Promise<number> {
    const widget = this.todayAppointmentsWidget.locator('[data-testid="appointments-count"]');
    const text = await widget.textContent() || '0';
    return parseInt(text, 10);
  }

  /**
   * Get recent sales count
   */
  async getRecentSalesCount(): Promise<number> {
    const widget = this.recentSalesWidget.locator('[data-testid="sales-count"]');
    const text = await widget.textContent() || '0';
    return parseInt(text, 10);
  }

  /**
   * Set date range filter
   */
  async setDateRange(startDate: string, endDate: string): Promise<void> {
    await this.dateRangeFilter.click();
    // Add date selection logic based on actual implementation
  }

  /**
   * Click quick action button
   */
  async clickQuickAction(action: string): Promise<void> {
    const button = this.quickActionsWidget.locator(`[data-testid="quick-action-${action}"]`);
    await button.click();
  }

  /**
   * Logout from dashboard
   */
  async logout(): Promise<void> {
    await this.userMenu.click();
    await this.logoutButton.click();
  }
}
