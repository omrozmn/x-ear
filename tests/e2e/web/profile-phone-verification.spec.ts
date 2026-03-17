import { test, expect, APIRequestContext, Page } from '@playwright/test';
import { loginApi } from '../../helpers/auth.helper';

const WEB_URL = process.env.WEB_BASE_URL || 'http://127.0.0.1:8080';
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5003';

async function prepareOtpUsers(request: APIRequestContext) {
  const response = await request.post(`${API_BASE_URL}/api/auth/test/prepare-otp-users`, {
    headers: {
      'Idempotency-Key': `otp-prepare-${Date.now()}-${Math.random()}`,
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function loginViaApi(page: Page, request: APIRequestContext, username: string, password: string) {
  const tokens = await loginApi(request, username, password);
  const token = tokens.accessToken;
  const refreshToken = tokens.refreshToken || token;
  const tenantId = tokens.tenantId;
  const user = {
    ...(tokens.user || {}),
    id: tokens.userId,
    tenantId,
    tenant_id: tenantId,
    role: tokens.role || (tokens.user?.role as string) || 'tenant_admin',
    isPhoneVerified: true,
  };

  await page.addInitScript(([authToken, authRefreshToken, authTenantId, authUser]) => {
    localStorage.clear();
    sessionStorage.clear();

    localStorage.setItem('x-ear.auth.token@v1', authToken as string);
    localStorage.setItem('x-ear.auth.refresh@v1', authRefreshToken as string);
    localStorage.setItem('x-ear.auth.currentTenantId@v1', authTenantId as string);

    localStorage.setItem('x-ear.auth.auth-storage-persist@v1', JSON.stringify({
      state: {
        user: authUser,
        token: authToken,
        refreshToken: authRefreshToken,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
        requiresOtp: false,
        requiresPhone: false,
        maskedPhone: null,
        subscription: {
          isExpired: false,
          daysRemaining: 30,
          planName: 'PRO',
        },
      },
      version: 0,
    }));
  }, [token, refreshToken, tenantId, user]);

  await page.goto(`${WEB_URL}/profile`);
}

test.describe('Profile Phone Verification Flow', () => {
  test.beforeEach(async ({ request }) => {
    await prepareOtpUsers(request);
  });

  test('allows a verified user to change phone and verify it again from profile', async ({ page, request }) => {
    await loginViaApi(page, request, 'profile_phone_user', 'testpass123');

    await expect(page.locator('text=İletişim Bilgileri')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Numaranız doğrulanmış')).toBeVisible();

    await page.locator('//label[contains(normalize-space(.), "Telefon Numarası")]/following::button[1]').click();

    const phoneInput = page.locator('input[placeholder="5XX XXX XX XX"]');
    await phoneInput.fill('5558886666');
    await page.locator('button:has-text("Doğrula")').click();

    const otpInput = page.locator('input[placeholder="XXXXXX"]');
    await expect(otpInput).toBeVisible({ timeout: 5000 });
    await otpInput.fill('123456');
    await page.locator('button:has-text("Onayla")').click();

    await expect(page.locator('text=Numaranız doğrulanmış')).toBeVisible({ timeout: 10000 });
  });
});
