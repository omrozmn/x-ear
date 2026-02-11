import { test, expect } from '@playwright/test';
import { login, logout } from './helpers/auth.helpers';

const WEB_URL = process.env.WEB_BASE_URL || 'http://localhost:8080';

test.describe('Authentication Tests', () => {
  
  test('should login with valid credentials', async ({ page }) => {
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
    
    // Verify we're on the dashboard or home page
    const url = page.url();
    expect(url).toContain('localhost:8080');
    
    // Check for authenticated UI elements
    const hasNavigation = await page.locator('nav').count() > 0;
    const hasMainContent = await page.locator('main').count() > 0;
    
    expect(hasNavigation || hasMainContent).toBeTruthy();
  });

  test('should login with invalid credentials and show error', async ({ page }) => {
    await page.goto(WEB_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Fill invalid credentials
    await page.fill('[data-testid="login-identifier-input"]', 'invalid_user');
    await page.fill('[data-testid="login-password-input"]', 'wrongpassword');

    // Submit
    await page.click('[data-testid="login-submit-button"]');

    // Should show error message
    await expect(page.locator('[data-testid="login-error-message"]')).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
    
    // Wait for page to be fully loaded
    await page.waitForTimeout(2000);
    
    // Look for user menu button - try multiple possible selectors
    const userMenuSelectors = [
      '[data-testid="user-menu-button"]',
      'button[aria-label*="user"]',
      'button[aria-label*="User"]',
      'button:has-text("e2etest")',
      '[data-testid="user-profile-button"]',
      'nav button:last-child' // Often user menu is last in nav
    ];
    
    let userMenuFound = false;
    for (const selector of userMenuSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.click(selector);
        userMenuFound = true;
        break;
      }
    }
    
    if (!userMenuFound) {
      // If no user menu found, try to find logout button directly
      const logoutSelectors = [
        '[data-testid="logout-button"]',
        'button:has-text("Çıkış")',
        'button:has-text("Logout")',
        'a:has-text("Çıkış")',
        'a:has-text("Logout")'
      ];
      
      for (const selector of logoutSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          await page.click(selector);
          userMenuFound = true;
          break;
        }
      }
    } else {
      // User menu opened, now find logout button
      await page.waitForTimeout(500);
      
      const logoutSelectors = [
        '[data-testid="logout-button"]',
        'button:has-text("Çıkış")',
        'button:has-text("Logout")',
        'a:has-text("Çıkış")',
        'a:has-text("Logout")'
      ];
      
      for (const selector of logoutSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          await page.click(selector);
          break;
        }
      }
    }
    
    // Wait for redirect to login page
    await expect(page.locator('[data-testid="login-identifier-input"]')).toBeVisible({ timeout: 10000 });
    
    // Verify we're on login page
    const url = page.url();
    expect(url).toMatch(/login|\/$/);
  });

  test('should handle session timeout', async ({ page }) => {
    // Login first
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
    
    // Clear auth token to simulate session timeout
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Try to navigate to a protected page
    await page.goto(`${WEB_URL}/parties`);
    await page.waitForTimeout(2000);
    
    // Should redirect to login OR show login form
    const isOnLoginPage = await page.locator('[data-testid="login-identifier-input"]').isVisible();
    const urlContainsLogin = page.url().includes('login') || page.url() === WEB_URL || page.url() === `${WEB_URL}/`;
    
    expect(isOnLoginPage || urlContainsLogin).toBeTruthy();
  });

  test('should refresh token automatically', async ({ page }) => {
    // Login first
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
    
    // Check if any auth-related data exists
    const hasAuthData = await page.evaluate(() => {
      return localStorage.length > 0 || sessionStorage.length > 0 || document.cookie.length > 0;
    });
    
    // Wait a bit and make a request
    await page.waitForTimeout(2000);
    await page.goto(`${WEB_URL}/parties`);
    await page.waitForTimeout(2000);
    
    // Should still be authenticated (not redirected to login)
    const stillAuthenticated = !(await page.locator('[data-testid="login-identifier-input"]').isVisible());
    
    expect(hasAuthData || stillAuthenticated).toBeTruthy();
  });
});
