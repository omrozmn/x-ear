import { test, expect } from '@playwright/test';
import { login } from '../../../tests/helpers/auth.helpers';

test.describe('Patient Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });
    // Navigate to patients page
    await page.goto('/parties');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new patient successfully', async ({ page }) => {
    // 1. Click "Yeni Hasta" button
    await page.click('[data-testid="party-create-button"]');
    
    // 2. Fill the form
    const timestamp = Date.now();
    const firstName = `Test-${timestamp}`;
    const lastName = 'User';
    const phone = `555${String(timestamp).slice(-7)}`;

    await page.fill('[data-testid="party-first-name-input"]', firstName);
    await page.fill('[data-testid="party-last-name-input"]', lastName);
    await page.fill('[data-testid="party-phone-input"]', phone);
    
    // Select gender
    await page.click('[data-testid="party-gender-male-button"]');
    
    // Select status & segment (already have defaults but let's be explicit)
    await page.selectOption('[data-testid="party-status-select"]', 'active');
    await page.selectOption('[data-testid="party-segment-select"]', 'NEW');

    // 3. Submit
    await page.click('[data-testid="party-submit-button"]');

    // 4. Verify success
    // Modal should close
    await expect(page.locator('[data-testid="party-form-modal"]')).not.toBeVisible();
    
    // Search for the new patient
    await page.fill('input[placeholder*="ara"]', firstName);
    await page.waitForTimeout(1000);
    
    // Should see at least one row with the name
    const row = page.locator(`[data-testid="party-table-row"]:has-text("${firstName}")`);
    await expect(row).toBeVisible();
  });

  test('should edit an existing patient', async ({ page }) => {
    // 1. Find the first patient in the list
    const firstRow = page.locator('[data-testid="party-table-row"]').first();
    await expect(firstRow).toBeVisible();
    
    // 2. Click Edit button in that row
    await firstRow.locator('[data-testid="party-edit-button"]').click();
    
    // 3. Update a field
    const newLastName = 'Updated-LastName';
    await page.fill('[data-testid="party-last-name-input"]', newLastName);
    
    // 4. Save
    await page.click('[data-testid="party-submit-button"]');
    
    // 5. Verify change
    await expect(page.locator('[data-testid="party-form-modal"]')).not.toBeVisible();
    await expect(page.locator(`[data-testid="party-table-row"]:has-text("${newLastName}")`).first()).toBeVisible();
  });

  test('should open delete confirmation modal', async ({ page }) => {
    const firstRow = page.locator('[data-testid="party-table-row"]').first();
    await expect(firstRow).toBeVisible();
    
    // Click Delete button
    await firstRow.locator('[data-testid="party-delete-button"]').click();
    
    // Check if modal title "Hastayı Sil" is visible
    await expect(page.locator('#modal-title:has-text("Hastayı Sil")')).toBeVisible();
    
    // Close modal
    await page.click('text=İptal');
  });
});
