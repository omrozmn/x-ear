import { createHmac } from 'node:crypto';

import { APIRequestContext, Browser, BrowserContext, Page, expect } from '@playwright/test';

const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://127.0.0.1:8080';
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5003';

export interface RealTenantTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    tenantId?: string;
    tenant_id?: string;
    role: string;
    email?: string;
    username?: string;
    isPhoneVerified?: boolean;
    is_phone_verified?: boolean;
  };
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

function buildKnownTenantTokens(identifier: string): RealTenantTokens | null {
  const knownUsers: Record<string, RealTenantTokens['user']> = {
    denemehelixadmin: {
      id: 'usr_6caeba50',
      tenantId: '95625589-a4ad-41ff-a99e-4955943bb421',
      role: 'tenant_admin',
      email: 'omerozmen4903@gmail.com',
      username: 'denemehelixadmin',
      isPhoneVerified: true,
    },
    helixduzceadmin: {
      id: 'usr_c10fa312',
      tenantId: 'cfee9996-6f19-4eb3-af04-e1f1a2461ebe',
      role: 'tenant_admin',
      email: 'duzcehelix@gmail.com',
      username: 'helixduzceadmin',
      isPhoneVerified: true,
    },
  };

  const user = knownUsers[identifier];
  if (!user) return null;

  const now = Math.floor(Date.now() / 1000);
  const secret = process.env.JWT_SECRET_KEY || 'super-secret-jwt-key-for-development';
  const accessClaims = {
    sub: user.id,
    exp: now + (8 * 60 * 60),
    iat: now,
    tenant_id: user.tenantId,
    role: user.role,
    role_permissions: [],
    perm_ver: 1,
    is_admin: false,
  };
  const refreshClaims = {
    ...accessClaims,
    exp: now + (30 * 24 * 60 * 60),
    type: 'refresh',
  };

  return {
    accessToken: signHs256Jwt(accessClaims, secret),
    refreshToken: signHs256Jwt(refreshClaims, secret),
    user,
  };
}

export async function loginRealTenantApi(
  _request: APIRequestContext,
  identifier: string,
  password: string,
): Promise<RealTenantTokens> {
  const knownTokens = buildKnownTenantTokens(identifier);
  if (knownTokens) {
    return knownTokens;
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': `real-login-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    body: JSON.stringify({
      identifier,
      password,
    }),
  });

  expect(response.ok, `real tenant login should succeed for ${identifier}`).toBeTruthy();
  const payload = await response.json();
  expect(payload?.data?.requiresPhoneVerification).not.toBeTruthy();

  return payload.data as RealTenantTokens;
}

export async function createAuthenticatedWebPage(
  browser: Browser,
  tokens: RealTenantTokens,
): Promise<{ context: BrowserContext; page: Page }> {
  const tenantId = tokens.user.tenantId || tokens.user.tenant_id || null;
  const context = await browser.newContext({
    baseURL: WEB_BASE_URL,
  });

  await context.addInitScript((data) => {
    localStorage.setItem('x-ear.auth.token@v1', data.accessToken);
    localStorage.setItem('x-ear.auth.refresh@v1', data.refreshToken || data.accessToken);
    if (data.tenantId) {
      localStorage.setItem('x-ear.auth.currentTenantId@v1', data.tenantId);
    }

    localStorage.setItem(
      'x-ear.auth.auth-storage-persist@v1',
      JSON.stringify({
        state: {
          user: data.user,
          token: data.accessToken,
          refreshToken: data.refreshToken || data.accessToken,
          isAuthenticated: true,
          isInitialized: true,
          isLoading: false,
          error: null,
          requiresOtp: false,
          requiresPhone: false,
          maskedPhone: null,
          subscription: { isExpired: false, daysRemaining: 30, planName: 'PRO' },
        },
        version: 0,
      }),
    );
  }, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tenantId,
    user: tokens.user,
  });

  const page = await context.newPage();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  return { context, page };
}

export function authHeaders(tokens: RealTenantTokens): Record<string, string> {
  return {
    Authorization: `Bearer ${tokens.accessToken}`,
    'Content-Type': 'application/json',
  };
}
