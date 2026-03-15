import { test, expect } from '@playwright/test';

const LANDING_URL = process.env.LANDING_BASE_URL || 'http://127.0.0.1:3000';

function uniqueTestPhone() {
  const suffix = `${Date.now()}`.slice(-7);
  return `555${suffix}`;
}

test.describe('Landing Registration OTP Flow', () => {
  test('submits phone step, verifies OTP, and proceeds to checkout flow', async ({ page }) => {
    const phone = uniqueTestPhone();

    await page.goto(`${LANDING_URL}/register`);
    await page.waitForLoadState('networkidle');

    await page.locator('input[autocomplete="given-name"]').fill('OTP');
    await page.locator('input[autocomplete="family-name"]').fill('Tester');
    await page.locator('input[autocomplete="tel"]').fill(phone);

    await page.locator('button:has-text("Ücretsiz Başlat")').click();

    await expect(page.locator('text=Doğrulama')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${phone}`)).toBeVisible();

    const digits = '123456'.split('');
    for (let index = 0; index < digits.length; index += 1) {
      await page.locator(`#otp-${index}`).fill(digits[index]);
    }

    await page.locator('button:has-text("Doğrula ve Bitir")').click();

    await expect.poll(() => page.url(), { timeout: 15000 }).toMatch(/\/checkout/);
  });
});
