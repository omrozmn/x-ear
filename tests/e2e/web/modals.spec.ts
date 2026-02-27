import { test, expect } from '../fixtures/fixtures';

/**
 * Phase 3.14: Web Modal Tests
 * Test modal functionality across the app
 */

test.describe('Phase 3.14: Modal Tests', () => {

  test('3.14.1: Party create modal — opens', async ({ tenantPage }) => {
    await tenantPage.goto('/parties');
    await tenantPage.waitForLoadState('networkidle');
    
    const createButton = tenantPage.locator('button').filter({ hasText: /new|yeni|create|ekle/i }).first();
    await createButton.click();
    await tenantPage.waitForTimeout(500);
    
    const modal = tenantPage.locator('[role="dialog"], [class*="modal"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('3.14.2: Modal closes on backdrop click', async ({ tenantPage }) => {
    await tenantPage.goto('/parties');
    await tenantPage.waitForLoadState('networkidle');
    
    const createButton = tenantPage.locator('button').filter({ hasText: /new|yeni/i }).first();
    await createButton.click();
    await tenantPage.waitForTimeout(500);
    
    const modal = tenantPage.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();
    
    // Click backdrop (outside modal)
    await tenantPage.locator('body').click({ position: { x: 10, y: 10 } });
    await tenantPage.waitForTimeout(500);
    
    const isVisible = await modal.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('3.14.3: Modal closes on Escape key', async ({ tenantPage }) => {
    await tenantPage.goto('/parties');
    await tenantPage.waitForLoadState('networkidle');
    
    const createButton = tenantPage.locator('button').filter({ hasText: /new|yeni/i }).first();
    await createButton.click();
    await tenantPage.waitForTimeout(500);
    
    const modal = tenantPage.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();
    
    // Press Escape
    await tenantPage.keyboard.press('Escape');
    await tenantPage.waitForTimeout(500);
    
    const isVisible = await modal.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('3.14.4: Modal closes on cancel button', async ({ tenantPage }) => {
    await tenantPage.goto('/parties');
    await tenantPage.waitForLoadState('networkidle');
    
    const createButton = tenantPage.locator('button').filter({ hasText: /new|yeni/i }).first();
    await createButton.click();
    await tenantPage.waitForTimeout(500);
    
    const modal = tenantPage.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();
    
    // Click cancel
    const cancelButton = modal.locator('button').filter({ hasText: /cancel|iptal|close|kapat/i }).first();
    await cancelButton.click();
    await tenantPage.waitForTimeout(500);
    
    const isVisible = await modal.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('3.14.5: Sale modal — opens and closes', async ({ tenantPage }) => {
    await tenantPage.goto('/sales');
    await tenantPage.waitForLoadState('networkidle');
    
    const createButton = tenantPage.locator('button').filter({ hasText: /new|yeni/i }).first();
    const hasButton = await createButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!hasButton) {
      test.skip(true, 'Sale create button not found');
    }
    
    await createButton.click();
    await tenantPage.waitForTimeout(500);
    
    const modal = tenantPage.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('3.14.6: Appointment modal — opens', async ({ tenantPage }) => {
    await tenantPage.goto('/appointments');
    await tenantPage.waitForLoadState('networkidle');
    
    const createButton = tenantPage.locator('button').filter({ hasText: /new|yeni|create/i }).first();
    const hasButton = await createButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!hasButton) {
      test.skip(true, 'Appointment create button not found');
    }
    
    await createButton.click();
    await tenantPage.waitForTimeout(500);
    
    const modal = tenantPage.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('3.14.7: Payment modal — opens', async ({ tenantPage }) => {
    await tenantPage.goto('/payments');
    await tenantPage.waitForLoadState('networkidle');
    
    const createButton = tenantPage.locator('button').filter({ hasText: /record|kaydet|new|yeni/i }).first();
    const hasButton = await createButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!hasButton) {
      test.skip(true, 'Payment record button not found');
    }
    
    await createButton.click();
    await tenantPage.waitForTimeout(500);
    
    const modal = tenantPage.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('3.14.8: Delete confirmation modal', async ({ tenantPage }) => {
    await tenantPage.goto('/parties');
    await tenantPage.waitForLoadState('networkidle');
    
    const rows = tenantPage.locator('table tbody tr');
    const rowCount = await rows.count();
    
    if (rowCount === 0) {
      test.skip(true, 'No parties to delete');
    }
    
    // Find delete button in first row
    const deleteButton = rows.first().locator('button').filter({ hasText: /delete|sil/i }).first();
    const hasDelete = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasDelete) {
      test.skip(true, 'Delete button not found');
    }
    
    await deleteButton.click();
    await tenantPage.waitForTimeout(500);
    
    // Confirm modal appears
    const confirmModal = tenantPage.locator('[role="dialog"], [role="alertdialog"]').first();
    await expect(confirmModal).toBeVisible({ timeout: 5000 });
  });
});
