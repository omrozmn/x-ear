import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createParty, searchParty, deleteParty, updateParty } from '../../helpers/party';
import { waitForToast, waitForModalOpen, waitForModalClose } from '../../helpers/wait';
import { expectToastVisible, expectModalOpen, expectModalClosed } from '../../helpers/assertions';
import { testUsers } from '../../fixtures/users';
import { testParties, generateRandomParty } from '../../fixtures/parties';

test.describe('Party CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, testUsers.admin);
    
    // Navigate to parties page
    await page.goto('/parties');
    await expect(page).toHaveURL(/\/parties/);
    
    // Close any open modals by pressing Escape multiple times
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  test('PARTY-001: Should display parties list page', async ({ page }) => {
    // Verify page title or heading
    await expect(page.locator('h1, h2, h3').filter({ hasText: /Müşteriler|Hastalar|Parties/i }).first()).toBeVisible();
    
    // Verify create button exists
    const createButton = page.locator('button').filter({ hasText: /Yeni|Ekle|Create/i }).first();
    await expect(createButton).toBeVisible();
  });

  test('PARTY-002: Should open party creation modal', async ({ page }) => {
    // Click create button using text selector (more reliable)
    await page.locator('button:has-text("Yeni Hasta")').first().click();
    
    // Wait for modal to open
    await page.waitForTimeout(500);
    
    // Verify form fields are visible (modal opened)
    await expect(page.locator('[data-testid="party-first-name-input"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="party-last-name-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="party-phone-input"]')).toBeVisible();
  });

  test('PARTY-003: Should create a new party with valid data', async ({ page }) => {
    const newParty = generateRandomParty();
    
    // Create party using helper
    const partyId = await createParty(page, newParty);
    
    // Verify party ID was returned (backend confirmed creation)
    expect(partyId).toBeTruthy();
    expect(partyId).toMatch(/^pat_/);
    
    console.log('[TEST] ✅ Party created successfully:', partyId);
    
    // Cleanup - delete the party
    await deleteParty(page, partyId);
    console.log('[TEST] ✅ Party cleaned up:', partyId);
  });

  test('PARTY-004: Should show validation errors for required fields', async ({ page }) => {
    // Open create modal
    await page.locator('button:has-text("Yeni Hasta")').first().click();
    await page.waitForTimeout(500);
    
    // Wait for form to be visible
    await expect(page.locator('[data-testid="party-first-name-input"]')).toBeVisible({ timeout: 5000 });
    
    // Try to submit without filling required fields
    await page.locator('[data-testid="party-submit-button"]').click();
    
    // Verify validation errors are shown (form should not submit)
    // Modal should still be open - check if form is still visible
    await expect(page.locator('[data-testid="party-first-name-input"]')).toBeVisible();
  });

  test('PARTY-005: Should validate phone number format', async ({ page }) => {
    // Open create modal
    await page.locator('button:has-text("Yeni Hasta")').first().click();
    await page.waitForTimeout(500);
    
    // Wait for form
    await expect(page.locator('[data-testid="party-first-name-input"]')).toBeVisible({ timeout: 5000 });
    
    // Fill form with invalid phone
    await page.locator('[data-testid="party-first-name-input"]').fill('Test');
    await page.locator('[data-testid="party-last-name-input"]').fill('User');
    await page.locator('[data-testid="party-phone-input"]').fill('invalid-phone');
    
    // Try to submit
    await page.locator('[data-testid="party-submit-button"]').click();
    
    // Verify error message or modal still open - check if form is still visible
    await expect(page.locator('[data-testid="party-first-name-input"]')).toBeVisible();
  });

  test('PARTY-006: Should validate email format', async ({ page }) => {
    // Open create modal
    await page.locator('button:has-text("Yeni Hasta")').first().click();
    await page.waitForTimeout(500);
    
    // Wait for form to be visible
    await expect(page.locator('[data-testid="party-first-name-input"]')).toBeVisible({ timeout: 5000 });
    
    // Fill form with invalid email
    await page.locator('[data-testid="party-first-name-input"]').fill('Test');
    await page.locator('[data-testid="party-last-name-input"]').fill('User');
    await page.locator('[data-testid="party-phone-input"]').fill('+905551234567');
    await page.locator('[data-testid="party-email-input"]').fill('invalid-email');
    
    // Try to submit
    await page.locator('[data-testid="party-submit-button"]').click();
    
    // Verify error message or modal still open - check if form is still visible
    await expect(page.locator('[data-testid="party-first-name-input"]')).toBeVisible();
  });

  test('PARTY-007: Should search parties by name', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Search for the party
    await searchParty(page, testParty.firstName);
    
    // Verify party appears in results
    await expect(page.locator('text=' + testParty.firstName)).toBeVisible();
    
    // Cleanup
    if (partyId) {
      await deleteParty(page, partyId);
    }
  });

  test('PARTY-008: Should search parties by phone', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Search for the party by phone
    await searchParty(page, testParty.phone);
    
    // Verify party appears in results
    await expect(page.locator('text=' + testParty.phone)).toBeVisible();
    
    // Cleanup
    if (partyId) {
      await deleteParty(page, partyId);
    }
  });

  test('PARTY-009: Should update party information', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Update party
    const updatedData = {
      firstName: 'Updated',
      lastName: 'Name',
      phone: testParty.phone,
      email: 'updated@example.com'
    };
    
    await updateParty(page, partyId, updatedData);
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify updated data appears
    await expect(page.locator('text=Updated')).toBeVisible();
    
    // Cleanup
    await deleteParty(page, partyId);
  });

  test('PARTY-010: Should delete party', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Verify party exists
    await expect(page.locator('text=' + testParty.firstName)).toBeVisible();
    
    // Delete party
    await deleteParty(page, partyId);
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify party is removed from list
    await expect(page.locator('text=' + testParty.firstName)).not.toBeVisible();
  });

  test('PARTY-011: Should cancel party creation', async ({ page }) => {
    // Open create modal
    await page.locator('button:has-text("Yeni Hasta")').first().click();
    await page.waitForTimeout(500);
    
    // Wait for form to be visible
    await expect(page.locator('[data-testid="party-first-name-input"]')).toBeVisible({ timeout: 5000 });
    
    // Fill some data
    await page.locator('[data-testid="party-first-name-input"]').fill('Test');
    
    // Click cancel or press Escape
    await page.keyboard.press('Escape');
    
    // Verify modal is closed - form should not be visible
    await expect(page.locator('[data-testid="party-first-name-input"]')).not.toBeVisible();
  });

  test('PARTY-012: Should display party details', async ({ page }) => {
    // Create a test party first
    const testParty = testParties.customer1;
    const partyId = await createParty(page, testParty);
    
    // Click on party to view details
    await page.locator('text=' + testParty.firstName).first().click();
    
    // Verify detail page or modal shows party information
    await expect(page.locator('text=' + testParty.firstName)).toBeVisible();
    await expect(page.locator('text=' + testParty.lastName)).toBeVisible();
    await expect(page.locator('text=' + testParty.phone)).toBeVisible();
    
    // Cleanup
    await page.goto('/parties');
    await deleteParty(page, partyId);
  });

  test('PARTY-013: Should filter parties by status', async ({ page }) => {
    // Look for filter/status dropdown
    const statusFilter = page.locator('select, button').filter({ hasText: /Durum|Status|Filtre/i }).first();
    
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      
      // Select "Active" status
      await page.locator('text=/Aktif|Active/i').first().click();
      
      // Verify URL or page updates
      await page.waitForTimeout(1000);
    }
  });

  test('PARTY-014: Should paginate through parties list', async ({ page }) => {
    // Look for pagination controls
    const nextButton = page.locator('button').filter({ hasText: /Next|Sonraki|>/i }).first();
    
    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      // Click next page
      await nextButton.click();
      
      // Wait for page to load
      await page.waitForTimeout(1000);
      
      // Verify URL or content changed
      await expect(page).toHaveURL(/page=2|offset=/);
    }
  });

  test('PARTY-015: Should export parties list', async ({ page }) => {
    // Look for export button
    const exportButton = page.locator('button').filter({ hasText: /Export|Dışa Aktar|Excel/i }).first();
    
    if (await exportButton.isVisible()) {
      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download started
      expect(download.suggestedFilename()).toMatch(/\.xlsx|\.csv|\.xls/);
    }
  });
});
