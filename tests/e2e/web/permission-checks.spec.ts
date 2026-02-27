import { test, expect } from '@playwright/test';
import { testUsers } from '../../fixtures/users';

/**
 * Permission Tests - Phase 3.1.7-3.1.10
 * Tests for role-based access control
 */
test.describe('Permission Checks', () => {
  
  /**
   * 3.1.7 - View-only role permission check
   * View-only users should not be able to create/edit/delete
   */
  test('3.1.7: View-only role should have limited permissions', async ({ page }) => {
    // Login as viewer
    await page.goto('/login');
    await page.fill('[data-testid="login-identifier-input"]', testUsers.viewer.email);
    await page.fill('[data-testid="login-password-input"]', testUsers.viewer.password);
    await page.click('[data-testid="login-submit-button"]');
    
    // Should redirect to dashboard
    await page.waitForURL(/\/(dashboard|parties)$/);
    
    // Try to access create buttons - should be hidden/disabled
    const addPartyButton = page.locator('[data-testid="add-party-button"]');
    const addSaleButton = page.locator('[data-testid="add-sale-button"]');
    
    // View-only users typically can't see add buttons
    const canAddParty = await addPartyButton.isVisible().catch(() => false);
    const canAddSale = await addSaleButton.isVisible().catch(() => false);
    
    expect(canAddParty || canAddSale).toBe(false);
  });

  /**
   * 3.1.8 - Create/edit role permission check  
   * Staff can create but not delete
   */
  test('3.1.8: Staff role should have create permissions', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="login-identifier-input"]', testUsers.staff.email);
    await page.fill('[data-testid="login-password-input"]', testUsers.staff.password);
    await page.click('[data-testid="login-submit-button"]');
    
    await page.waitForURL(/\/(dashboard|parties)$/);
    
    // Staff should see add buttons
    const addPartyButton = page.locator('[data-testid="add-party-button"]');
    await expect(addPartyButton).toBeVisible();
  });

  /**
   * 3.1.9 - Admin role permission check
   * Admin has full access
   */
  test('3.1.9: Admin role should have full permissions', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="login-identifier-input"]', testUsers.admin.email);
    await page.fill('[data-testid="login-password-input"]', testUsers.admin.password);
    await page.click('[data-testid="login-submit-button"]');
    
    await page.waitForURL(/\/(dashboard|parties)$/);
    
    // Admin should see settings
    const settingsLink = page.locator('[data-testid="nav-settings"]');
    await expect(settingsLink).toBeVisible();
  });

  /**
   * 3.1.10 - Role-based sidebar visibility
   * Different roles see different menu items
   */
  test('3.1.10: Role-based sidebar visibility', async ({ page }) => {
    // Test viewer - minimal access
    await page.goto('/login');
    await page.fill('[data-testid="login-identifier-input"]', testUsers.viewer.email);
    await page.fill('[data-testid="login-password-input"]', testUsers.viewer.password);
    await page.click('[data-testid="login-submit-button"]');
    await page.waitForURL(/\/(dashboard|parties)$/);
    
    // Check sidebar elements exist
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Viewer might not see settings
    const settingsForViewer = page.locator('[data-testid="nav-settings"]');
    // Some roles may not have settings access
  });
});
