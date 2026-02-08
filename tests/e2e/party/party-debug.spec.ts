import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { testUsers } from '../../fixtures/users';

test.describe('Party Debug', () => {
  test('Debug party page', async ({ page }) => {
    // Login
    await login(page, testUsers.admin);
    
    // Navigate to parties page
    await page.goto('/parties');
    await expect(page).toHaveURL(/\/parties/);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find the "Yeni Hasta" button and inspect its HTML
    const button = page.locator('button').filter({ hasText: 'Yeni Hasta' }).first();
    const buttonHTML = await button.evaluate(el => el.outerHTML);
    console.log('Button HTML:', buttonHTML);
    
    // Check all attributes
    const allAttrs = await button.evaluate(el => {
      const attrs: Record<string, string> = {};
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        attrs[attr.name] = attr.value;
      }
      return attrs;
    });
    console.log('Button attributes:', JSON.stringify(allAttrs, null, 2));
  });
});
