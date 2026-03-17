import { test, expect } from '@playwright/test';
import { WebPartyListPage } from '../../pom/web/party-list.page';
import { WebPartyDetailPage } from '../../pom/web/party-detail.page';
import { testUsers } from '../../fixtures/users';

/**
 * Party Detail Tests - Phase 3.3.12-3.3.16
 */
test.describe('Party Detail', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="login-identifier-input"]', testUsers.admin.email);
    await page.fill('[data-testid="login-password-input"]', testUsers.admin.password);
    await page.click('[data-testid="login-submit-button"]');
    await page.waitForURL(/\/(dashboard|parties)$/);
  });

  /**
   * 3.3.12 - Party detail page loads
   */
  test('3.3.12: Party detail page loads', async ({ page }) => {
    const partyPage = new WebPartyListPage(page);
    await partyPage.goto();
    
    // Wait for table to load
    await partyPage.partyTable.waitFor({ state: 'visible' });
    
    // Click first party
    const firstParty = partyPage.tableRows.first();
    const partyName = await firstParty.locator('td').first().textContent();
    
    await firstParty.locator('a, button').first().click();
    
    // Verify detail page
    const detailPage = new WebPartyDetailPage(page);
    await detailPage.isLoaded();
    await expect(detailPage.partyName).toBeVisible();
  });

  /**
   * 3.3.13 - Party detail tabs
   */
  test('3.3.13: Party detail tabs work correctly', async ({ page }) => {
    const detailPage = new WebPartyDetailPage(page);
    
    // Navigate to a party detail (assuming partyId exists)
    await detailPage.goto('test-party-id');
    await detailPage.isLoaded();
    
    // Test Info tab
    await detailPage.goToInfoTab();
    
    // Test Sales tab
    await detailPage.goToSalesTab();
    await expect(detailPage.salesTable).toBeVisible();
    
    // Test Appointments tab
    await detailPage.goToAppointmentsTab();
    await expect(detailPage.appointmentsTable).toBeVisible();
    
    // Test Notes tab
    await detailPage.goToNotesTab();
    await expect(detailPage.notesList).toBeVisible();
  });

  /**
   * 3.3.14 - Edit party from detail
   */
  test('3.3.14: Edit party from detail page', async ({ page }) => {
    const detailPage = new WebPartyDetailPage(page);
    await detailPage.goto('test-party-id');
    await detailPage.isLoaded();
    
    // Click edit button
    await detailPage.editParty();
    
    // Verify edit modal opens
    const editModal = page.locator('[data-testid="party-edit-modal"]');
    await expect(editModal).toBeVisible();
  });

  /**
   * 3.3.15 - Sale history in party detail
   */
  test('3.3.15: View sale history in party detail', async ({ page }) => {
    const detailPage = new WebPartyDetailPage(page);
    await detailPage.goto('test-party-id');
    await detailPage.isLoaded();
    
    // Go to sales tab
    await detailPage.goToSalesTab();
    
    // Verify sales table visible
    await expect(detailPage.salesTable).toBeVisible();
    
    // Get sales count
    const count = await detailPage.getSalesCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  /**
   * 3.3.16 - Appointment history in party detail
   */
  test('3.3.16: View appointment history in party detail', async ({ page }) => {
    const detailPage = new WebPartyDetailPage(page);
    await detailPage.goto('test-party-id');
    await detailPage.isLoaded();
    
    // Go to appointments tab
    await detailPage.goToAppointmentsTab();
    
    // Verify appointments table visible
    await expect(detailPage.appointmentsTable).toBeVisible();
    
    // Get appointments count
    const count = await detailPage.getAppointmentsCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
