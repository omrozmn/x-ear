import { Page, expect } from '@playwright/test';

/**
 * Auth Helper Functions for E2E Tests
 */

const WEB_URL = process.env.WEB_BASE_URL || 'http://localhost:8080';

export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Login to the application
 * @param page - Playwright page object
 * @param credentials - Login credentials
 */
export async function login(page: Page, credentials: LoginCredentials) {
  await page.goto(WEB_URL);
  
  // Wait for login form
  await expect(page.locator('[data-testid="login-identifier-input"]')).toBeVisible({ timeout: 10000 });
  
  // Fill credentials
  await page.fill('[data-testid="login-identifier-input"]', credentials.username);
  await page.fill('[data-testid="login-password-input"]', credentials.password);
  
  // Submit
  await page.click('[data-testid="login-submit-button"]');
  
  // Wait for login to complete - login form should disappear
  await expect(page.locator('[data-testid="login-identifier-input"]')).not.toBeVisible({ timeout: 15000 });
  
  // Give more time for app to fully render
  await page.waitForTimeout(3000);
  
  // Wait for either navigation or main content to appear
  await page.waitForFunction(() => {
    const nav = document.querySelector('nav');
    const main = document.querySelector('main');
    return (nav && nav.children.length > 0) || (main && main.children.length > 0);
  }, { timeout: 10000 });
  
  // Verify we're logged in
  const hasNavigation = await page.locator('nav').count() > 0;
  const hasMainContent = await page.locator('main').count() > 0;
  
  expect(hasNavigation || hasMainContent).toBeTruthy();
}

/**
 * Logout from the application
 * @param page - Playwright page object
 */
export async function logout(page: Page) {
  // Click user menu
  await page.click('[data-testid="user-menu-button"]');
  
  // Click logout
  await page.click('[data-testid="logout-button"]');
  
  // Wait for redirect to login page
  await expect(page.locator('[data-testid="login-identifier-input"]')).toBeVisible({ timeout: 10000 });
}

/**
 * Get auth token from localStorage
 * @param page - Playwright page object
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    return localStorage.getItem('auth_token');
  });
}

/**
 * Set auth token in localStorage
 * @param page - Playwright page object
 * @param token - Auth token
 */
export async function setAuthToken(page: Page, token: string) {
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token);
  }, token);
}

/**
 * Clear all auth data
 * @param page - Playwright page object
 */
export async function clearAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
