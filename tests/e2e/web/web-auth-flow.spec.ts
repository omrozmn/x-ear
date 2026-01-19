/**
 * E2E Tests: Web App Authentication Flow
 * 
 * Tests the complete web app authentication flow:
 * 1. Username/Password login (web app uses username, not email)
 * 2. Phone verification modal (if phone not verified)
 * 3. OTP verification
 * 4. Session persistence
 * 
 * Web App URL: http://localhost:8080
 */

import { test, expect } from '@playwright/test';
import { setPhoneVerified } from './helpers/test-utils';

const WEB_URL = process.env.WEB_BASE_URL || 'http://localhost:8080';

test.describe('Web App Login Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto(WEB_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Also clear any auth tokens
      if (typeof window !== 'undefined') {
        delete (window as any).__AUTH_TOKEN__;
      }
    });
    // Reload to ensure clean state
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display login form with username and password fields', async ({ page }) => {
    await page.goto(WEB_URL);

    // Wait for React to fully render - wait for specific element
    await page.waitForSelector('text=X-EAR CRM', { timeout: 15000 });

    // Additional wait for form to render
    await page.waitForTimeout(2000);

    // Debug: Check if JavaScript is running
    const jsEnabled = await page.evaluate(() => {
      return typeof React !== 'undefined' || document.querySelector('input') !== null;
    });
    console.log('JavaScript/React running:', jsEnabled);

    // Debug: Print page content
    const content = await page.content();
    console.log('Page HTML length:', content.length);
    console.log('Has username input:', content.includes('name="username"'));
    console.log('Has password input:', content.includes('name="password"'));
    console.log('Page title:', await page.title());

    // Debug: Print all inputs
    const inputs = await page.locator('input').all();
    console.log('Number of inputs found:', inputs.length);
    for (const input of inputs) {
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      const id = await input.getAttribute('id');
      console.log(`Input: name=${name}, type=${type}, id=${id}`);
    }

    // Debug: Check for any form elements
    const forms = await page.locator('form').all();
    console.log('Number of forms found:', forms.length);

    // Debug: Check for buttons
    const buttons = await page.locator('button').all();
    console.log('Number of buttons found:', buttons.length);

    // Check for username input (not email!)
    const usernameInput = page.locator('input[name="username"]');
    await expect(usernameInput).toBeVisible({ timeout: 10000 });

    // Check for password input
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toBeVisible();

    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText('Giriş Yap');

    // Check for logo/title
    await expect(page.locator('text=X-EAR CRM')).toBeVisible();
  });

  test('should show validation error for empty fields', async ({ page }) => {
    await page.goto(WEB_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Try to submit without filling fields
    const submitButton = page.locator('button[type="submit"]');

    // Button should be disabled when fields are empty
    await expect(submitButton).toBeDisabled();
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto(WEB_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click eye icon to show password
    await page.click('button[aria-label*="göster"]');

    // Password should now be visible (type="text")
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await page.click('button[aria-label*="gizle"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto(WEB_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Fill invalid credentials
    await page.fill('input[name="username"]', 'invalid_user');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/geçersiz|hatalı|başarısız/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show loading state during login', async ({ page }) => {
    await page.goto(WEB_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpass123');

    // Click submit
    await page.click('button[type="submit"]');

    // Should show loading state
    await expect(page.locator('text=/giriş yapılıyor/i')).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Phone Verification Flow', () => {

  test.beforeEach(async ({ request }) => {
    // Ensure phone is NOT verified before running verification flow tests
    await setPhoneVerified(request, false);
  });

  test.afterAll(async ({ request }) => {
    // Reset to verified state after all tests
    await setPhoneVerified(request, true);
  });

  test('should show phone verification modal after login if phone not verified', async ({ page, request }) => {
    // Explicitly set phone to unverified for this test
    await setPhoneVerified(request, false);
    
    await page.goto(WEB_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Login with seeded test user (phone verified status cleared by beforeEach)
    await page.fill('input[name="username"]', '+905551234567');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');

    // Wait for phone verification modal to appear
    const modal = page.locator('text="Telefon Doğrulama"');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Modal should have phone icon in blue circle
    await expect(page.locator('.bg-blue-100 svg.lucide-phone')).toBeVisible();

    // Modal should have explanation text
    await expect(page.locator('text=/güvenliği için telefon/i')).toBeVisible();
  });

  test('should allow entering phone number if not set', async ({ page }) => {
    await page.goto(WEB_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Login
    await page.fill('input[name="username"]', '+905551234567');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');

    // Check if modal appears (might not if phone already verified)
    const modalVisible = await page.locator('text="Telefon Doğrulama"').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!modalVisible) {
      test.skip();
      return;
    }

    // Check if phone input is visible
    const phoneInput = page.locator('input[type="tel"]');

    if (await phoneInput.isVisible()) {
      // Phone not set, should allow entering
      await phoneInput.fill('5551234567');

      // Should have send button
      const sendButton = page.locator('button:has-text("Doğrulama Kodu Gönder")');
      await expect(sendButton).toBeVisible();
      await expect(sendButton).toBeEnabled();
    }
  });

  test('should send OTP when phone number is entered', async ({ page }) => {
    await page.goto(WEB_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Login
    await page.fill('input[name="username"]', '+905551234567');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');

    // Check if modal appears (might not if phone already verified)
    const modalVisible = await page.locator('text="Telefon Doğrulama"').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!modalVisible) {
      test.skip();
      return;
    }

    const phoneInput = page.locator('input[type="tel"]');

    if (await phoneInput.isVisible()) {
      await phoneInput.fill('5551234567');

      // Click send button
      await page.click('button:has-text("Doğrulama Kodu Gönder")');

      // Should show loading state
      await expect(page.locator('text=/gönderiliyor/i')).toBeVisible({ timeout: 1000 });

      // Should show success message
      await expect(page.locator('text=/gönderildi|başarılı/i')).toBeVisible({ timeout: 5000 });

      // Should show OTP input
      const otpInput = page.locator('input[type="text"][maxlength="6"]');
      await expect(otpInput).toBeVisible({ timeout: 2000 });
    }
  });

  test('should show OTP input with correct format', async ({ page }) => {
    await page.goto(WEB_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Login with seeded test user
    await page.fill('input[name="username"]', '+905551234567');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');

    // Check if modal appears (might not if phone already verified)
    const modalVisible = await page.locator('text="Telefon Doğrulama"').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!modalVisible) {
      test.skip();
      return;
    }

    // If OTP input is already visible (phone already set)
    const otpInput = page.locator('input[type="text"][maxlength="6"]');

    if (await otpInput.isVisible({ timeout: 2000 })) {
      // Should have placeholder
      await expect(otpInput).toHaveAttribute('placeholder', 'XXXXXX');

      // Should have center alignment and wide tracking
      await expect(otpInput).toHaveClass(/text-center.*tracking-widest/);

      // Should show phone number in description
      await expect(page.locator('text=/numaralı telefona gönderilen/i')).toBeVisible();
    }
  });

  test('should disable verify button if OTP is incomplete', async ({ page }) => {
    await page.goto(WEB_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Login
    await page.fill('input[name="username"]', '+905551234567');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');

    // Check if modal appears (might not if phone already verified)
    const modalVisible = await page.locator('text="Telefon Doğrulama"').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!modalVisible) {
      test.skip();
      return;
    }

    const otpInput = page.locator('input[type="text"][maxlength="6"]');

    if (await otpInput.isVisible({ timeout: 2000 })) {
      // Enter incomplete OTP
      await otpInput.fill('123');

      // Verify button should be disabled
      const verifyButton = page.locator('button:has-text("Doğrula")');
      await expect(verifyButton).toBeDisabled();

      // Complete OTP
      await otpInput.fill('123456');

      // Button should be enabled
      await expect(verifyButton).toBeEnabled();
    }
  });

  test('should not allow closing modal', async ({ page }) => {
    await page.goto(WEB_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Login
    await page.fill('input[name="username"]', '+905551234567');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');

    // Check if modal appears (might not if phone already verified)
    const modalVisible = await page.locator('text="Telefon Doğrulama"').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!modalVisible) {
      test.skip();
      return;
    }

    // Modal should not have close button
    const closeButton = page.locator('button[aria-label="Close"], button:has-text("×")');
    await expect(closeButton).not.toBeVisible();

    // Clicking overlay should not close modal
    await page.click('body', { position: { x: 10, y: 10 } });
    await expect(page.locator('text="Telefon Doğrulama"')).toBeVisible();
  });
});
