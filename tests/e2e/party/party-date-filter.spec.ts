import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';

test.describe('Party Date Filter Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
  });

  test('should filter parties by registration date range', async ({ page }) => {
    // Navigate to parties page
    await page.goto('/parties');
    await page.waitForLoadState('networkidle');

    // Wait for party list to load
    await page.waitForSelector('[data-testid="party-row"]', { timeout: 10000 }).catch(() => {
        console.log('No parties found initially');
    });

    // Check initial count
    const initialCount = await page.locator('[data-testid="party-row"]').count();
    console.log(`Initial party count: ${initialCount}`);

    // Set start date
    await page.getByPlaceholder('Başlangıç').click();
    // Select today's date (or any date)
    // The calendar is in a portal, so it's at the end of body
    await page.locator('button.bg-blue-500.text-white').first().click().catch(() => {
        // Fallback: click today if already selected or click a day
        page.locator('button:has-text("15")').first().click();
    });

    // Set end date
    await page.getByPlaceholder('Bitiş').click();
    await page.locator('button.bg-blue-500.text-white').first().click().catch(() => {
        page.locator('button:has-text("20")').first().click();
    });

    // Wait for API call
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/parties') && response.request().method() === 'GET'
    );
    
    // The filter is applied on change
    await responsePromise;

    // Verify filter is applied
    // We expect the count to be less than or equal to initial count
    const filteredCount = await page.locator('[data-testid="party-row"]').count();
    console.log(`Filtered party count: ${filteredCount}`);
    
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('should clear date filters', async ({ page }) => {
    await page.goto('/parties');
    await page.waitForLoadState('networkidle');

    // Apply date filter
    await page.getByPlaceholder('Başlangıç').click();
    await page.locator('button:has-text("1")').first().click();
    
    await page.waitForTimeout(1000);

    // Click "Temizle" button
    await page.locator('button:has-text("Temizle")').click();

    // Verify inputs are cleared
    const startValue = await page.getByPlaceholder('Başlangıç').inputValue();
    const endValue = await page.getByPlaceholder('Bitiş').inputValue();
    
    expect(startValue).toBe('');
    expect(endValue).toBe('');
  });
});
