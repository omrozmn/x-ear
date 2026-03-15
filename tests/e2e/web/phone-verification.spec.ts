import { test, expect, APIRequestContext, Page } from '@playwright/test';

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

async function loginViaUi(page: Page, username: string, password: string) {
  await page.goto(`${WEB_URL}/login`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
}

async function readAccessToken(page: Page) {
  return page.evaluate(() => {
    const direct = localStorage.getItem('x-ear.auth.token@v1');
    if (direct) return direct;

    const persisted = localStorage.getItem('x-ear.auth.auth-storage-persist@v1');
    if (!persisted) return null;

    try {
      const parsed = JSON.parse(persisted);
      return parsed?.state?.token || parsed?.state?.accessToken || null;
    } catch {
      return null;
    }
  });
}

test.describe('Web Phone Verification Flow', () => {
  test.beforeEach(async ({ request }) => {
    await prepareOtpUsers(request);
  });

  test('verifies a user that already has a phone number', async ({ page, request }) => {
    await loginViaUi(page, 'unverified_phone_user', 'testpass123');

    const modalTitle = page.locator('text=Telefon Doğrulama');
    await expect(modalTitle).toBeVisible({ timeout: 10000 });

    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible();
    await expect(phoneInput).toHaveValue('5551234567');

    await page.locator('button:has-text("Doğrulama Kodu Gönder")').click();

    const otpInput = page.locator('input[placeholder="000000"]');
    await expect(otpInput).toBeVisible({ timeout: 5000 });
    await otpInput.fill('123456');

    await page.locator('button:has-text("Doğrula")').click();
    await expect(modalTitle).toBeHidden({ timeout: 10000 });

    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const me = await request.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBeTruthy();
    const meBody = await me.json();
    expect(meBody.data.isPhoneVerified).toBe(true);
    expect(meBody.data.phone).toContain('5551234567');
  });

  test('collects a missing phone number and completes verification', async ({ page, request }) => {
    await loginViaUi(page, 'no_phone_user', 'testpass123');

    const modalTitle = page.locator('text=Telefon Doğrulama');
    await expect(modalTitle).toBeVisible({ timeout: 10000 });

    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible();
    await expect(phoneInput).toHaveValue('');

    await phoneInput.fill('5552223344');
    await page.locator('button:has-text("Doğrulama Kodu Gönder")').click();

    const otpInput = page.locator('input[placeholder="000000"]');
    await expect(otpInput).toBeVisible({ timeout: 5000 });
    await otpInput.fill('123456');

    await page.locator('button:has-text("Doğrula")').click();
    await expect(modalTitle).toBeHidden({ timeout: 10000 });

    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const me = await request.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBeTruthy();
    const meBody = await me.json();
    expect(meBody.data.isPhoneVerified).toBe(true);
    expect(meBody.data.phone).toContain('5552223344');
  });
});
