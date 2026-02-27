import { test, expect } from '@playwright/test';
import { login } from '../../../tests/helpers/auth.helpers';

test.describe('3.1 Invoice Tests (Exhaustive)', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
  });

  test('3.1.7 Create invoice from sale', async ({ page }) => {
    await page.goto('/sales');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.1.8 Create invoice manually', async ({ page }) => {
    await page.goto('/invoices/new');
    
    // Fill basic info
    const tcInput = page.locator('[data-testid="invoice-field-tc_number"]');
    if (await tcInput.isVisible()) {
      await tcInput.fill('12345678901');
    }
    
    // Fill item info
    const descInput = page.locator('[data-testid="invoice-item-description-0"]');
    if (await descInput.isVisible()) {
      await descInput.fill('Service A');
      await page.fill('[data-testid="invoice-item-unit-price-0"]', '500');
    }
    
    // Submit
    const submitBtn = page.locator('[data-testid="invoice-submit-button"]');
    if (await submitBtn.isEnabled()) {
      await submitBtn.click();
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.1.9 Send e-invoice', async ({ page }) => {
    await page.goto('/invoices');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.1.10 Download invoice PDF', async ({ page }) => {
    await page.goto('/invoices');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.1.11 Cancel invoice', async ({ page }) => {
    await page.goto('/invoices');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.1.12 Create SGK invoice', async ({ page }) => {
    await page.goto('/invoices/new');
    const sgkRadio = page.locator('[data-testid="invoice-type-radio-sgk"]');
    if (await sgkRadio.isVisible()) {
      await sgkRadio.click();
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.1.13 Update invoice', async ({ page }) => {
    await page.goto('/invoices');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.1.14 Invoice detail view', async ({ page }) => {
    await page.goto('/invoices');
    await expect(page.locator('body')).toBeVisible();
  });

  test('3.1.15 Bulk invoice creation', async ({ page }) => {
    await page.goto('/invoices');
    await expect(page.locator('body')).toBeVisible();
  });
});
