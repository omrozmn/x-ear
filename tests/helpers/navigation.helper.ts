import { Page, Locator } from '@playwright/test';

/**
 * Navigation Helper - Navigation and routing utilities
 * 
 * Provides reusable patterns for:
 * - URL navigation
 * - Menu navigation
 * - Breadcrumb navigation
 * - Sidebar navigation
 * - Browser history navigation
 * - Route validation
 */
export class NavigationHelper {
  constructor(private page: Page) {}

  // ================== URL Navigation ==================

  /**
   * Navigate to URL
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.waitForPageReady();
  }

  /**
   * Navigate to route relative to base URL
   */
  async navigateToRoute(route: string, baseUrl?: string): Promise<void> {
    const base = baseUrl || process.env.BASE_URL || 'http://localhost:8080';
    const url = route.startsWith('http') ? route : `${base}${route}`;
    await this.goto(url);
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Get current path
   */
  getCurrentPath(): string {
    const url = this.page.url();
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }

  /**
   * Wait for page to be ready
   */
  async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle');
  }

  // ================== Menu Navigation ==================

  /**
   * Click menu item by text
   */
  async clickMenuItem(menuItemText: string): Promise<void> {
    const menuItem = this.page.locator(`nav a:has-text("${menuItemText}"), nav button:has-text("${menuItemText}"), [class*="menu"] a:has-text("${menuItemText}"]`);
    await menuItem.click();
    await this.waitForPageReady();
  }

  /**
   * Click sidebar menu item
   */
  async clickSidebarMenu(menuItemText: string): Promise<void> {
    const menuItem = this.page.locator(
      `[class*="sidebar"] a:has-text("${menuItemText}"), [class*="sidebar"] button:has-text("${menuItemText}"), [data-testid="sidebar-${menuItemText.toLowerCase().replace(/\s+/g, '-')}"]`
    );
    await menuItem.click();
    await this.waitForPageReady();
  }

  /**
   * Expand sidebar menu item
   */
  async expandSidebarMenu(menuItemText: string): Promise<void> {
    const menuItem = this.page.locator(`[class*="sidebar"] .ant-menu-item:has-text("${menuItemText}"), [class*="sidebar"] .ant-menu-submenu-title:has-text("${menuItemText}")`);
    await menuItem.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Click top navigation item
   */
  async clickTopNav(itemText: string): Promise<void> {
    const navItem = this.page.locator(
      `[class*="header"] a:has-text("${itemText}"), [class*="topbar"] a:has-text("${itemText}"), [data-testid="nav-${itemText.toLowerCase().replace(/\s+/g, '-')}"]`
    );
    await navItem.click();
    await this.waitForPageReady();
  }

  // ================== Dropdown Navigation ==================

  /**
   * Click dropdown menu item
   */
  async clickDropdownMenu(triggerTestId: string, menuItemText: string): Promise<void> {
    // Open dropdown
    const trigger = this.page.locator(`[data-testid="${triggerTestId}"]`);
    await trigger.click();
    
    // Wait for dropdown
    await this.page.waitForSelector('[role="menu"], .ant-dropdown-menu', { state: 'visible' });
    
    // Click menu item
    const menuItem = this.page.locator(`[role="menu"] :has-text("${menuItemText}"), .ant-dropdown-menu-item:has-text("${menuItemText}")`);
    await menuItem.click();
    
    await this.waitForPageReady();
  }

  /**
   * Navigate through breadcrumb
   */
  async clickBreadcrumb(itemText: string): Promise<void> {
    const breadcrumb = this.page.locator(`[class*="breadcrumb"] a:has-text("${itemText}")`);
    await breadcrumb.click();
    await this.waitForPageReady();
  }

  // ================== Tab Navigation ==================

  /**
   * Click tab by text
   */
  async clickTab(tabText: string): Promise<void> {
    const tab = this.page.locator(
      `[role="tab"]:has-text("${tabText}"), .ant-tabs-tab:has-text("${tabText}"), [class*="tabs"] button:has-text("${tabText}")`
    );
    await tab.click();
    await this.page.waitForTimeout(500);
    await this.waitForPageReady();
  }

  /**
   * Get active tab text
   */
  async getActiveTab(): Promise<string> {
    const activeTab = this.page.locator(`[role="tab"][aria-selected="true"], .ant-tabs-tab-active`);
    return activeTab.textContent() || '';
  }

  /**
   * Check if tab is active
   */
  async isTabActive(tabText: string): Promise<boolean> {
    const tab = this.page.locator(`[role="tab"]:has-text("${tabText}")`);
    const ariaSelected = await tab.getAttribute('aria-selected');
    return ariaSelected === 'true';
  }

  // ================== Button Navigation ==================

  /**
   * Click primary action button
   */
  async clickPrimaryButton(buttonText?: string): Promise<void> {
    const button = buttonText
      ? this.page.locator(`button:has-text("${buttonText}")`)
      : this.page.locator('button.primary, button.ant-btn-primary, [class*="primary"] button');
    await button.click();
    await this.waitForPageReady();
  }

  /**
   * Click secondary action button
   */
  async clickSecondaryButton(buttonText: string): Promise<void> {
    const button = this.page.locator(`button:has-text("${buttonText}")`);
    await button.click();
    await this.waitForPageReady();
  }

  // ================== Browser History ==================

  /**
   * Go back
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
    await this.waitForPageReady();
  }

  /**
   * Go forward
   */
  async goForward(): Promise<void> {
    await this.page.goForward();
    await this.waitForPageReady();
  }

  /**
   * Reload page
   */
  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.waitForPageReady();
  }

  /**
   * Verify URL contains path
   */
  async verifyUrlContains(path: string): Promise<boolean> {
    const url = this.page.url();
    return url.includes(path);
  }

  /**
   * Verify URL matches pattern
   */
  async verifyUrlMatches(pattern: string | RegExp): Promise<boolean> {
    const url = this.page.url();
    if (typeof pattern === 'string') {
      return url === pattern || url.endsWith(pattern);
    }
    return pattern.test(url);
  }

  // ================== Route Guards ==================

  /**
   * Wait for redirect to login
   */
  async waitForLoginRedirect(): Promise<void> {
    await this.page.waitForURL('**/login**', { timeout: 10000 }).catch(() => {});
    await this.waitForPageReady();
  }

  /**
   * Check if unauthorized (redirected to login)
   */
  async isUnauthorized(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/login') || url.includes('/unauthorized');
  }

  /**
   * Wait for specific path
   */
  async waitForPath(path: string, timeout = 10000): Promise<void> {
    await this.page.waitForURL(`**${path}**`, { timeout });
  }

  // ================== Link Navigation ==================

  /**
   * Click link by text
   */
  async clickLink(linkText: string): Promise<void> {
    const link = this.page.locator(`a:has-text("${linkText}")`);
    await link.click();
    await this.waitForPageReady();
  }

  /**
   * Click link by test ID
   */
  async clickLinkByTestId(testId: string): Promise<void> {
    const link = this.page.locator(`[data-testid="${testId}"]`);
    await link.click();
    await this.waitForPageReady();
  }

  /**
   * Get all links on page
   */
  async getAllLinks(): Promise<string[]> {
    const links = this.page.locator('a[href]');
    const count = await links.count();
    const hrefs: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (href) hrefs.push(href);
    }
    
    return hrefs;
  }

  // ================== Loading States ==================

  /**
   * Wait for navigation to complete (no loading spinner)
   */
  async waitForNavigationComplete(): Promise<void> {
    // Wait for loading to disappear
    const loading = this.page.locator('.loading, .spinner, [data-testid="loading"]');
    await loading.waitFor({ state: 'hidden' }).catch(() => {});
    
    // Wait for network idle
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if page is loading
   */
  async isLoading(): Promise<boolean> {
    const loading = this.page.locator('.loading, .spinner, [data-testid="loading"]');
    return loading.isVisible();
  }

  // ================== Footer Navigation ==================

  /**
   * Click footer link
   */
  async clickFooterLink(linkText: string): Promise<void> {
    const link = this.page.locator(`footer a:has-text("${linkText}"), [class*="footer"] a:has-text("${linkText}")`);
    await link.click();
    await this.waitForPageReady();
  }

  // ================== Quick Nav Methods ==================

  /**
   * Navigate to dashboard
   */
  async goToDashboard(): Promise<void> {
    await this.clickSidebarMenu('Dashboard');
  }

  /**
   * Navigate to parties
   */
  async goToParties(): Promise<void> {
    await this.clickSidebarMenu('Parties');
  }

  /**
   * Navigate to sales
   */
  async goToSales(): Promise<void> {
    await this.clickSidebarMenu('Sales');
  }

  /**
   * Navigate to settings
   */
  async goToSettings(): Promise<void> {
    await this.clickSidebarMenu('Settings');
  }

  /**
   * Navigate to profile
   */
  async goToProfile(): Promise<void> {
    await this.clickTopNav('Profile');
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    // Try various logout selectors
    const logoutSelectors = [
      '[data-testid="logout-button"]',
      'button:has-text("Logout")',
      'button:has-text("Sign Out")',
      '[class*="user-menu"] button:has-text("Logout")',
      '[class*="profile-dropdown"] a:has-text("Logout")',
    ];
    
    for (const selector of logoutSelectors) {
      const button = this.page.locator(selector);
      if (await button.count() > 0) {
        await button.click();
        await this.waitForLoginRedirect();
        return;
      }
    }
    
    throw new Error('Logout button not found');
  }
}
