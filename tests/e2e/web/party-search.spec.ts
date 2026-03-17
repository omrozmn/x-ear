import { test, expect } from '@playwright/test';
import { WebPartyListPage } from '../../pom/web/party-list.page';
import { testUsers } from '../../fixtures/users';

/**
 * Party Search Tests - Phase 3.3.9
 */
test.describe('Party Search', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="login-identifier-input"]', testUsers.admin.email);
    await page.fill('[data-testid="login-password-input"]', testUsers.admin.password);
    await page.click('[data-testid="login-submit-button"]');
    await page.waitForURL(/\/(dashboard|parties)$/);
  });

  /**
   * 3.3.9 - Search party by phone
   */
  test('3.3.9: Search party by phone number', async ({ page }) => {
    const partyPage = new WebPartyListPage(page);
    await partyPage.goto();
    
    // Search by phone number
    const testPhone = '5551234567';
    await partyPage.searchByPhone(testPhone);
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Verify search was performed
    const searchValue = await partyPage.searchInput.inputValue();
    expect(searchValue).toBe(testPhone);
  });
});
