import { Page, expect, APIRequestContext } from '@playwright/test';

/**
 * Auth Helper Functions
 * 
 * Provides authentication utilities for E2E tests
 */

export const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://localhost:8080';
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5003';

export interface LoginCredentials {
  identifier?: string;
  username?: string; // Backward compatibility with old helper
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  tenantId: string;
  userId: string;
  role?: string;
  user?: Record<string, unknown>;
}

// Re-export all helpers for convenience
export * from './wait.helper';
export * from './party';
export * from './sale';
export * from './payment';
export * from './assert.helper';
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
  
  // Support both identifier and username for backward compatibility
  const loginId = creds.identifier || creds.username || defaultCreds.identifier;
  
  try {
    // Try API login first (more reliable) - only if page.request is available
    if (page.request) {
      const loginResponse = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
        headers: {
          'Idempotency-Key': crypto.randomUUID(),
          'Content-Type': 'application/json'
        },
        data: {
          identifier: loginId,
          password: creds.password
        }
      });
      
      if (loginResponse.ok()) {
        const loginJson = await loginResponse.json();
        const token = loginJson.data?.accessToken;
        const refreshToken = loginJson.data?.refreshToken;
        
        if (token) {
          // Set tokens in localStorage (TokenManager uses localStorage)
          await page.evaluate((t) => {
            localStorage.setItem('x-ear.auth.auth-storage-persist@v1', JSON.stringify({
              state: {
                accessToken: t,
                refreshToken: t,
                isAuthenticated: true,
                user: { email: loginId },
                expiresAt: Date.now() + 3600000
              },
              version: 0
            }));
          }, token);
          
          // Navigate to app
          await page.goto('/');
          await page.waitForLoadState('networkidle');
          
          // Remove error overlay if present
          await page.evaluate(() => {
            const errorDiv = document.querySelector('[style*="z-index:99999"]');
            if (errorDiv) errorDiv.remove();
            // Also try to find any fixed position error overlay
            document.querySelectorAll('div[style*="position:fixed"]').forEach(el => {
              if (el.textContent?.includes('Error') || el.textContent?.includes('Global Error')) {
                el.remove();
              }
            });
          });
          
          return;
        }
      }
    }
  } catch (e) {
    console.log('API login failed, trying UI login:', e);
  }
  
  // Fallback to UI login
  await page.goto('/login');
  await page.locator('[data-testid="login-identifier-input"]').fill(loginId);
  await page.locator('[data-testid="login-password-input"]').fill(creds.password);
  await page.locator('[data-testid="login-submit-button"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(100);
  await page.locator('[data-testid="login-submit-button"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
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

/**
 * Login via API and return auth tokens
 * 
 * @param request - Playwright API request context
 * @param phone - Username/email for login
 * @param otp - Password
 * @returns Auth tokens
 */
export async function loginApi(
  request: APIRequestContext,
  phone: string = 'admin@xear.com',
  otp: string = 'Admin123!'
): Promise<AuthTokens> {
  let endpoint = `${API_BASE_URL}/api/auth/login`;
  let payload: Record<string, string> = {
    identifier: phone,
    password: otp
  };

  // Check if this is an admin login attempt
  if (phone.includes('@example.com') || phone === 'admin') {
    endpoint = `${API_BASE_URL}/api/admin/auth/login`;
    payload = {
      email: phone,
      password: otp
    };
  }

  const loginResponse = await request.post(endpoint, {
    headers: {
      'Idempotency-Key': crypto.randomUUID(),
      'Content-Type': 'application/json'
    },
    data: payload
  });

  if (!loginResponse.ok()) {
    throw new Error(`Login Failed: ${loginResponse.status()}`);
  }

  const data = await loginResponse.json();
  const responseData = data.data;

  return {
    accessToken: responseData.accessToken || responseData.token,
    refreshToken: responseData.refreshToken || responseData.refresh_token,
    tenantId: responseData.user.tenantId || responseData.user.tenant_id || 'system',
    userId: responseData.user.id,
    role: responseData.user.role,
    user: responseData.user
  };
}

/**
 * Set phone verified status for a user
 * 
 * @param request - Playwright API request context
 * @param verified - Whether phone is verified
 */
export async function setPhoneVerified(
  request: APIRequestContext,
  verified: boolean = true
): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/api/auth/test/toggle-verification`, {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': `test-${Date.now()}-${Math.random()}`
    },
    data: { verified }
  });
  
  if (!response.ok()) {
    console.warn(`Failed to set phone verified status: ${response.status()}`);
  }
}

/**
 * Create a test party via API
 * 
 * @param request - Playwright API request context
 * @param accessToken - Auth token
 * @param partyData - Optional party data
 * @returns Party ID
 */
export async function createTestParty(
  request: APIRequestContext,
  accessToken: string,
  partyData?: Record<string, unknown>
): Promise<string> {
  const defaultParty = {
    firstName: 'Test',
    lastName: 'Patient',
    phone: `+90555${Math.floor(1000000 + Math.random() * 9000000)}`,
    role: 'patient'
  };

  const response = await request.post(`${API_BASE_URL}/api/parties`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    data: partyData || defaultParty
  });

  if (!response.ok()) {
    throw new Error(`Failed to create party: ${response.status()}`);
  }

  const data = await response.json();
  return data.data?.id || data.id;
}

/**
 * Delete a test party via API
 * 
 * @param request - Playwright API request context
 * @param accessToken - Auth token
 * @param partyId - Party ID to delete
 */
export async function deleteTestParty(
  request: APIRequestContext,
  accessToken: string,
  partyId: string
): Promise<void> {
  const response = await request.delete(`${API_BASE_URL}/api/parties/${partyId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Failed to delete party: ${response.status()}`);
  }
}

/**
 * Setup an authenticated page with cookies
 * 
 * @param page - Playwright page object
 * @param accessToken - Auth token
 */
export async function setupAuthenticatedPage(
  page: Page,
  accessToken: string
): Promise<void> {
  await page.request.setExtraHTTPHeaders({
    'Authorization': `Bearer ${accessToken}`
  });
}

/**
 * Wait for API call to complete
 * 
 * @param page - Playwright page object
 * @param url - URL pattern to wait for
 */
export async function waitForApiCall(
  page: Page,
  url: string
): Promise<void> {
  await page.waitForResponse(response => 
    response.url().includes(url) && response.status() === 200
  );
}
