/**
 * E2E Test Utilities
 * 
 * Shared helpers for Playwright tests
 */

import { Page, APIRequestContext, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5003';
const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://127.0.0.1:8080';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  tenantId: string;
  userId: string;
  role?: string;
}

/**
 * Login helper - returns auth tokens
 */
export async function login(
  request: APIRequestContext,
  phone: string = '+905551234567',
  otp: string = '123456' // In this context used as password
): Promise<AuthTokens> {
  const loginResponse = await request.post(`${API_BASE_URL}/api/auth/login`, {
    headers: {
      'Idempotency-Key': crypto.randomUUID(),
      'Content-Type': 'application/json'
    },
    data: {
      identifier: phone,
      password: otp
    }
  });

  if (!loginResponse.ok()) {
    console.error('[LOGIN FAILURE] Login Endpoint Failed');
    console.error('URL:', loginResponse.url());
    console.error('Status:', loginResponse.status());
    console.error('Body:', await loginResponse.text());
    throw new Error(`Login Failed: ${loginResponse.status()}`);
  }
  expect(loginResponse.ok()).toBeTruthy();

  const data = await loginResponse.json();

  return {
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken,
    tenantId: data.data.user.tenantId,
    userId: data.data.user.id,
    role: data.data.user.role
  };
}

/**
 * Setup authenticated page
 */
export async function setupAuthenticatedPage(
  page: Page,
  tokens: AuthTokens
): Promise<void> {
  // Use addInitScript to ensure storage is populated BEFORE app loads
  await page.addInitScript((data) => {
    console.log('[Test Setup] Init Script Running...');

    // Install Spy Immediately
    const originalRemove = localStorage.removeItem;
    localStorage.removeItem = function (key) {
      console.warn('[Test Spy] removeItem called for:', key);
      return originalRemove.apply(this, arguments as any);
    };
    const originalClear = localStorage.clear;
    localStorage.clear = function () {
      console.warn('[Test Spy] clear called');
      return originalClear.apply(this, arguments as any);
    };

    // Set Keys
    console.log('[Test Setup] Setting tokens...', data.accessToken.substring(0, 10));
    localStorage.setItem('x-ear.auth.token@v1', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('x-ear.auth.refresh@v1', data.refreshToken);
    }
    // Legacy
    localStorage.setItem('auth_token', data.accessToken);

    const user = {
      id: data.userId,
      tenantId: data.tenantId,
      firstName: 'Test',
      lastName: 'User',
      fullName: 'Test User',
      email: 'test@example.com',
      role: data.role || 'TENANT_ADMIN',
      permissions: [],
      roles: [],
      is_active: true,
      isPhoneVerified: true,
      is_phone_verified: true
    };

    const authState = {
      state: {
        user: user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
        subscription: { isExpired: false, daysRemaining: 30, planName: 'PRO' }
      },
      version: 0
    };
    localStorage.setItem('auth-storage', JSON.stringify(authState));
    console.log('[Test Setup] Storage set complete.');
  }, tokens);

  // Navigate
  await page.goto('/');

  // Fallback: If still on login page (injection failed), perform UI login
  try {
    // Wait for either the App content OR the Login Form
    // This race handles the case where we are already logged in (injection worked) vs not.
    // However, simplest valid attempt is just to check for login form with a timeout.
    // If injection worked, this will timeout and throw (caught below), which is fine.
    // If injection failed, this will find the element after the Spinner clears.
    console.log('[Setup] Checking for Login Form...');
    await page.waitForSelector('input[name="username"]', { timeout: 5000 });

    console.log('[Setup] Login Form found. performing UI login...');
    const userPhone = process.env.TEST_USER_PHONE || '+905551234567';
    const userOtp = process.env.TEST_USER_OTP || '123456';

    await page.fill('input[name="username"]', userPhone);
    await page.fill('input[name="password"]', userOtp);
    await page.click('button[type="submit"]');

    // Wait for redirection to dashboard or away from login
    await page.waitForURL((url) => {
      const path = url.pathname;
      return path !== '/' && !path.includes('login');
    }, { timeout: 10000 });
    console.log('[Setup] UI Login successful');

  } catch (e) {
    console.log('[Setup] Login Form not found (likely already authenticated):');
  }

  // Verification
  const storageCheck = await page.evaluate(() => ({
    token: localStorage.getItem('x-ear.auth.token@v1'),
    legacy: localStorage.getItem('auth_token'),
    zustand: localStorage.getItem('auth-storage')
  }));
  console.log('[Test Setup] Post-Nav Storage Check:', {
    hasToken: !!storageCheck.token,
    hasLegacy: !!storageCheck.legacy,
    hasZustand: !!storageCheck.zustand
  });
}

/**
 * Create a test party
 */
export async function createTestParty(
  request: APIRequestContext,
  authToken: string,
  data: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  }
): Promise<string> {
  const response = await request.post(`${API_BASE_URL}/api/parties`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    data
  });

  expect(response.ok()).toBeTruthy();

  const responseData = await response.json();
  return responseData.data.id;
}

/**
 * Delete a test party
 */
export async function deleteTestParty(
  request: APIRequestContext,
  authToken: string,
  partyId: string
): Promise<void> {
  const response = await request.delete(`${API_BASE_URL}/api/parties/${partyId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  expect(response.ok()).toBeTruthy();
}

/**
 * Assign role to party
 */
export async function assignRole(
  request: APIRequestContext,
  authToken: string,
  partyId: string,
  roleCode: string
): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/api/parties/${partyId}/roles`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    data: { roleCode }
  });

  expect(response.ok()).toBeTruthy();
}

/**
 * Validate ResponseEnvelope format
 */
export function validateResponseEnvelope(data: any): void {
  expect(data).toHaveProperty('success');
  expect(data).toHaveProperty('data');
  expect(data).toHaveProperty('requestId');
  expect(data).toHaveProperty('timestamp');

  // Validate camelCase
  expect(data.requestId).toBeTruthy();
  expect(data).not.toHaveProperty('request_id');
}

/**
 * Validate no snake_case in response
 */
export function validateNoCamelCase(obj: any, path: string = 'root'): void {
  if (typeof obj !== 'object' || obj === null) {
    return;
  }

  for (const key in obj) {
    // Check for snake_case keys
    if (key.includes('_')) {
      throw new Error(`Found snake_case key "${key}" at path: ${path}`);
    }

    // Recursively check nested objects
    validateNoCamelCase(obj[key], `${path}.${key}`);
  }
}

/**
 * Wait for API call to complete
 */
export async function waitForApiCall(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 5000
): Promise<void> {
  await page.waitForResponse(
    response => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Toggle phone verification status (Test utility)
 */
export async function setPhoneVerified(
  request: APIRequestContext,
  verified: boolean
): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/api/auth/test/toggle-verification`, {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID()
    },
    data: { verified }
  });
  expect(response.ok()).toBeTruthy();
}

export { API_BASE_URL, WEB_BASE_URL };
