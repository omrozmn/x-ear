import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.helpers';

test.describe('Navigation Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
  });

  test('should navigate to parties page', async ({ page }) => {
    // Try multiple ways to navigate to parties
    const navigationAttempts = [
      async () => await page.goto('/parties'),
      async () => {
        const link = page.locator('a[href="/parties"]');
        if (await link.count() > 0) {
          await link.first().click();
        }
      },
      async () => {
        const link = page.locator('text=/Hasta|Party|Patient/i');
        if (await link.count() > 0) {
          await link.first().click();
        }
      }
    ];
    
    for (const attempt of navigationAttempts) {
      try {
        await attempt();
        await page.waitForTimeout(2000);
        const url = page.url();
        if (url.includes('parties') || url.includes('hasta')) {
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Take screenshot to see what's on the page
    await page.screenshot({ path: 'test-results/parties-page.png', fullPage: true });
    
    // Log all buttons on the page
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on parties page`);
    
    for (let i = 0; i < Math.min(buttons.length, 20); i++) {
      const text = await buttons[i].textContent();
      const testId = await buttons[i].getAttribute('data-testid');
      console.log(`Button ${i}: text="${text?.trim()}", testid="${testId}"`);
    }
    
    // Verify we're on parties page
    const url = page.url();
    expect(url).toMatch(/parties|hasta/i);
  });

  test('should display dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
    
    // Should have some content
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(100);
  });
});
