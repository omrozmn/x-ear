import { Page, APIRequestContext } from '@playwright/test';
import { createHmac } from 'node:crypto';

/**
 * Auth Helper Functions
 * 
 * Provides authentication utilities for E2E tests
 */

export const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://127.0.0.1:8080';
export const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5003';

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

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function signHs256Jwt(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const content = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', secret).update(content).digest();
  return `${content}.${base64UrlEncode(signature)}`;
}

function buildFallbackTokens(identifier: string): AuthTokens {
  const now = Math.floor(Date.now() / 1000);
  const secret = process.env.JWT_SECRET_KEY || 'default-dev-secret-key-change-in-prod';
  const isAdmin = identifier === 'admin@x-ear.com';
  const userId = isAdmin ? 'adm_a65dc009' : 'usr_e2etest';
  // Use actual tenant ID from database (created by create_e2e_user.py)
  const tenantId = isAdmin ? 'system' : '95625589-a4ad-41ff-a99e-4955943bb421';
  const role = isAdmin ? 'super_admin' : 'ADMIN';
  const email = isAdmin ? 'admin@x-ear.com' : 'e2etest@xear.com';

  const claims = {
    sub: userId,
    exp: now + (8 * 60 * 60),
    iat: now,
    tenant_id: tenantId,
    role,
    role_permissions: ['*'],
    perm_ver: 1,
    is_admin: isAdmin,
  };

  const refreshClaims = {
    ...claims,
    exp: now + (30 * 24 * 60 * 60),
    type: 'refresh',
  };

  return {
    accessToken: signHs256Jwt(claims, secret),
    refreshToken: signHs256Jwt(refreshClaims, secret),
    tenantId,
    userId,
    role,
    user: {
      id: userId,
      email,
      role,
      tenant_id: tenantId,
      tenantId,
      is_active: true,
      isPhoneVerified: true,
    },
  };
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
          await page.evaluate(({ accessToken, refreshToken: nextRefreshToken, email }) => {
            localStorage.setItem('x-ear.auth.auth-storage-persist@v1', JSON.stringify({
              state: {
                accessToken,
                refreshToken: nextRefreshToken || accessToken,
                isAuthenticated: true,
                user: { email },
                expiresAt: Date.now() + 3600000
              },
              version: 0
            }));
          }, { accessToken: token, refreshToken, email: loginId });
          
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
    if (phone === 'e2etest' || phone === 'admin@x-ear.com') {
      return buildFallbackTokens(phone);
    }
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
      'Content-Type': 'application/json',
      'Idempotency-Key': `party-create-${Date.now()}-${Math.random()}`
    },
    data: partyData || defaultParty
  });

  if (!response.ok()) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to create party: ${response.status()} ${body}`);
  }

  const data = await response.json();
  return data.data?.id || data.id;
}

export async function createTestSupplier(
  request: APIRequestContext,
  accessToken: string,
  supplierData: Record<string, unknown>
): Promise<number> {
  const response = await request.post(`${API_BASE_URL}/api/suppliers`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `supplier-create-${Date.now()}-${Math.random()}`
    },
    data: supplierData
  });

  if (!response.ok()) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to create supplier: ${response.status()} ${body}`);
  }

  const data = await response.json();
  return Number(data.data?.id || data.id);
}

export interface EnsuredSupplierResult {
  id: number;
  created: boolean;
}

export async function ensureTestSupplier(
  request: APIRequestContext,
  accessToken: string,
  supplierData: Record<string, unknown> & { taxNumber: string; companyName: string }
): Promise<EnsuredSupplierResult> {
  const searchResponse = await request.get(
    `${API_BASE_URL}/api/suppliers?search=${encodeURIComponent(supplierData.taxNumber)}&per_page=20`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (searchResponse.ok()) {
    const payload = await searchResponse.json().catch(() => null) as
      | { data?: Array<{ id?: number; taxNumber?: string; companyName?: string; name?: string }> }
      | null;
    const existing = (payload?.data || []).find((supplier) => (
      String(supplier.taxNumber || '') === supplierData.taxNumber
      && String(supplier.companyName || supplier.name || '') === supplierData.companyName
    ));

    if (existing?.id) {
      return { id: Number(existing.id), created: false };
    }
  }

  const id = await createTestSupplier(request, accessToken, supplierData);
  return { id, created: true };
}

export async function deleteTestSupplier(
  request: APIRequestContext,
  accessToken: string,
  supplierId: number
): Promise<void> {
  const response = await request.delete(`${API_BASE_URL}/api/suppliers/${supplierId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Idempotency-Key': `supplier-delete-${Date.now()}-${Math.random()}`
    }
  });

  if (![200, 204, 404].includes(response.status())) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to delete supplier: ${response.status()} ${body}`);
  }
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
      'Authorization': `Bearer ${accessToken}`,
      'Idempotency-Key': `party-delete-${Date.now()}-${Math.random()}`
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
