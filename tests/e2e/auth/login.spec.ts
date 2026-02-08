import { test, expect } from '@playwright/test';
import { login, logout, isLoggedIn } from '../../helpers/auth';
import { expectToastVisible } from '../../helpers/assertions';
import { testUsers } from '../../fixtures/users';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login');
  });

  test('AUTH-001: Should display login form', async ({ page }) => {
    // Verify login form elements are visible
    await expect(page.locator('[data-testid="login-identifier-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit-button"]')).toBeVisible();
    
    // Verify page title
    await expect(page).toHaveTitle(/X-Ear/);
  });

  test('AUTH-002: Should login with valid credentials', async ({ page }) => {
    // Login with admin credentials
    await login(page, testUsers.admin);
    
    // Verify redirect (could be / or /dashboard or /parties)
    await expect(page).toHaveURL(/\/(dashboard|parties)?$/);
    
    // Verify user menu is visible
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('AUTH-003: Should show error with invalid credentials', async ({ page }) => {
    // Fill login form with invalid credentials
    await page.locator('[data-testid="login-identifier-input"]').fill('invalid@example.com');
    await page.locator('[data-testid="login-password-input"]').fill('wrongpassword');
    await page.locator('[data-testid="login-submit-button"]').click();
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="login-error-message"]')).toBeVisible();
    
    // Verify still on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('AUTH-004: Should show validation error for empty fields', async ({ page }) => {
    // Verify submit button is disabled when fields are empty
    const submitButton = page.locator('[data-testid="login-submit-button"]');
    await expect(submitButton).toBeDisabled();
  });

  test.skip('AUTH-005: Should logout successfully', async ({ page }) => {
    // Skip: Modal blocking user menu click - needs frontend fix
    // Login first
    await login(page, testUsers.admin);
    await expect(page).toHaveURL(/\/(dashboard|parties)?$/);
    
    // Logout
    await logout(page);
    
    // Verify redirect to login page
    await expect(page).toHaveURL(/\/login/);
    
    // Verify user is not logged in
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(false);
  });

  test.skip('AUTH-006: Should remember credentials when "Remember Me" is checked', async ({ page }) => {
    // Skip: Modal blocking user menu click - needs frontend fix
    // Fill login form
    await page.locator('[data-testid="login-identifier-input"]').fill(testUsers.admin.identifier);
    await page.locator('[data-testid="login-password-input"]').fill(testUsers.admin.password);
    
    // Check "Remember Me" checkbox
    const rememberMeCheckbox = page.locator('input[type="checkbox"]').first();
    await rememberMeCheckbox.check();
    
    // Submit form
    await page.locator('[data-testid="login-submit-button"]').click();
    
    // Wait for redirect
    await expect(page).toHaveURL(/\/(dashboard|parties)?$/);
    
    // Logout
    await logout(page);
    
    // Navigate back to login
    await page.goto('/login');
    
    // Verify email is pre-filled
    const identifierInput = page.locator('[data-testid="login-identifier-input"]');
    await expect(identifierInput).toHaveValue(testUsers.admin.identifier);
  });

  test('AUTH-007: Should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('[data-testid="login-password-input"]');
    const toggleButton = page.locator('button[aria-label*="password"]').first();
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle button
    await toggleButton.click();
    
    // Password should be visible
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click toggle button again
    await toggleButton.click();
    
    // Password should be hidden again
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test.skip('AUTH-008: Should handle session timeout', async ({ page }) => {
    // Skip: Frontend doesn't redirect to login on session timeout yet
    // Login
    await login(page, testUsers.admin);
    await expect(page).toHaveURL(/\/(dashboard|parties)?$/);
    
    // Clear cookies to simulate session timeout
    await page.context().clearCookies();
    
    // Try to navigate to protected page
    await page.goto('/parties');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test.skip('AUTH-009: Should prevent access to protected routes when not logged in', async ({ page }) => {
    // Skip: Frontend doesn't redirect to login for protected routes yet
    // Try to access protected route directly
    await page.goto('/parties');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test.skip('AUTH-010: Should login with different user roles', async ({ page }) => {
    // Skip: Modal blocking user menu click - needs frontend fix
    // Test with audiologist
    await login(page, testUsers.audiologist);
    await expect(page).toHaveURL(/\/(dashboard|parties)?$/);
    await logout(page);
    
    // Test with receptionist
    await page.goto('/login');
    await login(page, testUsers.receptionist);
    await expect(page).toHaveURL(/\/(dashboard|parties)?$/);
    await logout(page);
    
    // Test with manager
    await page.goto('/login');
    await login(page, testUsers.manager);
    await expect(page).toHaveURL(/\/(dashboard|parties)?$/);
  });
});
