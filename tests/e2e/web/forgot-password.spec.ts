import { test, expect, APIRequestContext } from '@playwright/test';

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

test.describe('Forgot Password OTP Flow', () => {
  test.beforeEach(async ({ request, page }) => {
    await prepareOtpUsers(request);
    await page.goto(`${WEB_URL}/forgot-password`);
    await page.waitForLoadState('networkidle');
  });

  test('moves from direct phone input to OTP verification and new password step', async ({ page }) => {
    await page.locator('input[placeholder*="Kullanıcı adı"]').fill('5559876543');
    await page.locator('button:has-text("Devam Et")').click();

    await expect(page.getByRole('heading', { name: 'Doğrulama Kodu' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/5559876543 numarasına gönderilen/i')).toBeVisible();

    const otpInput = page.locator('input#otp');
    await otpInput.fill('123456');
    await page.locator('button:has-text("Kodu Doğrula")').click();

    await expect(page.getByRole('heading', { name: 'Yeni Şifre' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input#newPassword')).toBeVisible();
  });

  test('supports username lookup and phone confirmation before OTP', async ({ page }) => {
    await page.locator('input[placeholder*="Kullanıcı adı"]').fill('forgot_password_user');
    await page.locator('button:has-text("Devam Et")').click();

    await expect(page.locator('text=Güvenlik Doğrulaması')).toBeVisible({ timeout: 10000 });

    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('5559876543');
    await page.locator('button:has-text("Kod Gönder")').click();

    await expect(page.getByRole('heading', { name: 'Doğrulama Kodu' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input#otp')).toBeVisible();
  });
});
