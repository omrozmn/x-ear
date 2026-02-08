import { Page, expect } from '@playwright/test';

/**
 * Auth Helper Functions
 * 
 * Provides authentication utilities for E2E tests
 */

export interface LoginCredentials {
  identifier: string;
  password: string;
}

// Re-export all helpers for convenience
export * from './wait';
export * from './party';
export * from './sale';
export * from './payment';
export * from './assertions';
export * from './invoice';
export * from './device';
export * from './inventory';
export * from './cash';
export * from './report';
export * from './admin';

/**
 * Login to the application
 * 
 * @param page - Playwright page object
 * @param credentials - Optional login credentials (defaults to test user)
 */
export async function login(
  page: Page,
  credentials?: LoginCredentials
): Promise<void> {
  const defaultCreds: LoginCredentials = {
    identifier: 'admin@xear.com',
    password: 'Admin123!'
  };
  
  const creds = credentials || defaultCreds;
  
  // Navigate to login page
  await page.goto('/login');
  
  // Fill login form
  await page.locator('[data-testid="login-identifier-input"]').fill(creds.identifier);
  await page.locator('[data-testid="login-password-input"]').fill(creds.password);
  
  // Wait for button to be enabled (React state update)
  await page.locator('[data-testid="login-submit-button"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(100); // Small delay for React state update
  
  // Submit form
  await page.locator('[data-testid="login-submit-button"]').click();
  
  // Wait for redirect (could be / or /dashboard or /parties)
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  
  // Verify user menu is visible
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}

/**
 * Logout from the application
 * 
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  // Try to close any modals by clicking outside or pressing Escape multiple times
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  // Force click user menu to open dropdown (bypass any overlays)
  await page.locator('[data-testid="user-menu"]').click({ force: true, timeout: 5000 });
  
  // Wait for logout button to be visible in dropdown
  await page.locator('[data-testid="logout-button"]').waitFor({ state: 'visible', timeout: 5000 });
  
  // Click logout button
  await page.locator('[data-testid="logout-button"]').click();
  
  // Wait for redirect to login
  await page.waitForURL('/login', { timeout: 10000 });
}

/**
 * Get authentication token from cookies
 * 
 * @param page - Playwright page object
 * @returns Access token string
 */
export async function getAuthToken(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  const tokenCookie = cookies.find(c => c.name === 'access_token');
  return tokenCookie?.value || '';
}

/**
 * Check if user is logged in
 * 
 * @param page - Playwright page object
 * @returns True if logged in, false otherwise
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.locator('[data-testid="user-menu"]').waitFor({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}
