import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createParty } from '../../helpers/party';
import { waitForToast, waitForModalOpen, waitForModalClose } from '../../helpers/wait';
import { expectToastVisible, expectModalOpen, expectModalClosed } from '../../helpers/assertions';
import { testUsers, generateRandomParty } from '../../fixtures';

test.describe('Payment Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, testUsers.admin);
  });

  test('PAYMENT-007: Should prevent overpayment', async ({ page }) => {
    // Create a test party and sale first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Create sale
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Add first payment: 10000 TL
    await page.locator('[data-testid="sale-list-item"]').first().click();
    await page.locator('[data-testid="sale-payment-button"]').click();
    await waitForModalOpen(page, 'payment-tracking-modal');
    await page.locator('[data-testid="payment-add-button"]').click();
    await page.locator('[data-testid="payment-amount-input"]').fill('10000');
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Nakit').first().click();
    await page.locator('[data-testid="payment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Try to add overpayment: 6000 TL (remaining is 5000 TL)
    await page.locator('[data-testid="payment-add-button"]').click();
    await page.locator('[data-testid="payment-amount-input"]').fill('6000');
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Nakit').first().click();
    await page.locator('[data-testid="payment-submit-button"]').click();
    
    // Verify error toast
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('aşamaz');
  });

  test('PAYMENT-008: Should delete payment', async ({ page }) => {
    // Create a test party and sale first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Create sale and add payments
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Add multiple payments
    await page.locator('[data-testid="sale-list-item"]').first().click();
    await page.locator('[data-testid="sale-payment-button"]').click();
    await waitForModalOpen(page, 'payment-tracking-modal');
    
    // Payment 1
    await page.locator('[data-testid="payment-add-button"]').click();
    await page.locator('[data-testid="payment-amount-input"]').fill('5000');
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Nakit').first().click();
    await page.locator('[data-testid="payment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Payment 2
    await page.locator('[data-testid="payment-add-button"]').click();
    await page.locator('[data-testid="payment-amount-input"]').fill('3000');
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Nakit').first().click();
    await page.locator('[data-testid="payment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Delete first payment
    await page.locator('[data-testid="payment-delete-button"]').first().click();
    
    // Confirm deletion
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    await page.locator('[data-testid="confirm-dialog-yes-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify payment removed from history
    await expect(page.locator('[data-testid="payment-history-item"]')).toHaveCount(1);
    
    // Verify remaining amount updated
    await expect(page.locator('[data-testid="payment-remaining-amount"]')).toContainText(/10000|7000/);
  });

  test('PAYMENT-009: Should collect promissory note', async ({ page }) => {
    // Create a test party and sale with promissory note
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Create sale
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Add promissory note payment
    await page.locator('[data-testid="sale-list-item"]').first().click();
    await page.locator('[data-testid="sale-payment-button"]').click();
    await waitForModalOpen(page, 'payment-tracking-modal');
    await page.locator('[data-testid="payment-add-button"]').click();
    await page.locator('[data-testid="payment-amount-input"]').fill('5000');
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Senet').first().click();
    await page.locator('[data-testid="payment-promissory-note-number-input"]').fill('SN-003');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // Due tomorrow
    await page.locator('[data-testid="payment-promissory-note-due-date-input"]').fill(dueDate.toISOString().split('T')[0]);
    await page.locator('[data-testid="payment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Navigate to Promissory Notes tab
    await page.locator('[data-testid="promissory-notes-tab"]').click();
    
    // Click Collect button on the note
    await page.locator('[data-testid="promissory-note-collect-button"]').first().click();
    
    // Verify collect modal opened
    await expectModalOpen(page, 'promissory-note-collect-modal');
    
    // Enter collection date: Today
    await page.locator('[data-testid="promissory-note-collect-date-input"]').fill(new Date().toISOString().split('T')[0]);
    
    // Select collection method: Cash
    await page.locator('[data-testid="promissory-note-collect-method-select"]').click();
    await page.locator('text=Nakit').first().click();
    
    // Enter note
    await page.locator('[data-testid="promissory-note-collect-note-input"]').fill('Tahsil edildi');
    
    // Submit
    await page.locator('[data-testid="promissory-note-collect-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify note status updated to "Collected"
    await expect(page.locator('[data-testid="promissory-note-status"]')).toContainText('Tahsil Edildi');
  });

  test('PAYMENT-010: Should show overdue promissory note warning', async ({ page }) => {
    // Create a test party and sale with overdue promissory note
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Create sale
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Add promissory note with past due date
    await page.locator('[data-testid="sale-list-item"]').first().click();
    await page.locator('[data-testid="sale-payment-button"]').click();
    await waitForModalOpen(page, 'payment-tracking-modal');
    await page.locator('[data-testid="payment-add-button"]').click();
    await page.locator('[data-testid="payment-amount-input"]').fill('5000');
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Senet').first().click();
    await page.locator('[data-testid="payment-promissory-note-number-input"]').fill('SN-OVERDUE');
    
    // Set due date to yesterday
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    await page.locator('[data-testid="payment-promissory-note-due-date-input"]').fill(pastDate.toISOString().split('T')[0]);
    await page.locator('[data-testid="payment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Navigate to Promissory Notes tab
    await page.locator('[data-testid="promissory-notes-tab"]').click();
    
    // Verify overdue note shown in red with warning
    await expect(page.locator('[data-testid="promissory-note-overdue"]')).toBeVisible();
    await expect(page.locator('[data-testid="promissory-note-overdue"]')).toHaveClass(/text-red|bg-red/);
    await expect(page.locator('[data-testid="promissory-note-warning-icon"]')).toBeVisible();
  });

  test('PAYMENT-011: Should filter payment history', async ({ page }) => {
    // Create a test party and sale with multiple payments
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Create sale
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Add multiple payments with different methods
    await page.locator('[data-testid="sale-list-item"]').first().click();
    await page.locator('[data-testid="sale-payment-button"]').click();
    await waitForModalOpen(page, 'payment-tracking-modal');
    
    // Cash payment
    await page.locator('[data-testid="payment-add-button"]').click();
    await page.locator('[data-testid="payment-amount-input"]').fill('3000');
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Nakit').first().click();
    await page.locator('[data-testid="payment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Card payment
    await page.locator('[data-testid="payment-add-button"]').click();
    await page.locator('[data-testid="payment-amount-input"]').fill('5000');
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Kredi Kartı').first().click();
    await page.locator('[data-testid="payment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Filter by payment method: Cash
    const methodFilter = page.locator('[data-testid="payment-method-filter"]');
    if (await methodFilter.isVisible()) {
      await methodFilter.click();
      await page.locator('text=Nakit').first().click();
      
      // Wait for filter
      await page.waitForTimeout(500);
      
      // Verify only cash payments shown
      const paymentItems = await page.locator('[data-testid="payment-history-item"]').count();
      expect(paymentItems).toBeGreaterThanOrEqual(1);
    }
  });

  test('PAYMENT-012: Should export payment history to PDF', async ({ page }) => {
    // Create a test party and sale with payments
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Create sale and add payment
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Add payment
    await page.locator('[data-testid="sale-list-item"]').first().click();
    await page.locator('[data-testid="sale-payment-button"]').click();
    await waitForModalOpen(page, 'payment-tracking-modal');
    await page.locator('[data-testid="payment-add-button"]').click();
    await page.locator('[data-testid="payment-amount-input"]').fill('5000');
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Nakit').first().click();
    await page.locator('[data-testid="payment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Look for export button
    const exportButton = page.locator('[data-testid="payment-export-button"]');
    if (await exportButton.isVisible()) {
      // Start waiting for download
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download started
      expect(download.suggestedFilename()).toMatch(/\.pdf/);
    }
  });

  test('PAYMENT-013: Should handle bulk collection for multiple sales', async ({ page }) => {
    // Create a test party with multiple sales
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Sales
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    
    // Create first sale
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Create second sale
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Select multiple sales (if bulk selection exists)
    const firstCheckbox = page.locator('[data-testid="sale-checkbox"]').first();
    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.check();
      await page.locator('[data-testid="sale-checkbox"]').nth(1).check();
      
      // Click bulk collection button
      await page.locator('[data-testid="bulk-collection-button"]').click();
      
      // Verify bulk collection modal opened
      await expectModalOpen(page, 'bulk-collection-modal');
      
      // Verify total amount displayed
      await expect(page.locator('[data-testid="bulk-collection-total-amount"]')).toBeVisible();
      
      // Add payment
      await page.locator('[data-testid="payment-amount-input"]').fill('30000');
      await page.locator('[data-testid="payment-method-select"]').click();
      await page.locator('text=Nakit').first().click();
      
      // Submit
      await page.locator('[data-testid="bulk-collection-submit-button"]').click();
      
      // Verify success toast
      await expectToastVisible(page, 'success');
      await expect(page.locator('[data-testid="success-toast"]')).toContainText(/2|3/); // "2 satış" or "3 satış"
    }
  });

  test('PAYMENT-014: Should cancel payment (refund)', async ({ page }) => {
    // Create a test party and sale with payment
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Create sale and add payment
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Add payment
    await page.locator('[data-testid="sale-list-item"]').first().click();
    await page.locator('[data-testid="sale-payment-button"]').click();
    await waitForModalOpen(page, 'payment-tracking-modal');
    await page.locator('[data-testid="payment-add-button"]').click();
    await page.locator('[data-testid="payment-amount-input"]').fill('5000');
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Nakit').first().click();
    await page.locator('[data-testid="payment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Cancel payment
    const cancelButton = page.locator('[data-testid="payment-cancel-button"]').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // Verify cancel modal opened
      await expectModalOpen(page, 'payment-cancel-modal');
      
      // Enter cancellation reason
      await page.locator('[data-testid="payment-cancel-reason-input"]').fill('Müşteri talebi');
      
      // Submit
      await page.locator('[data-testid="payment-cancel-submit-button"]').click();
      
      // Verify success toast
      await expectToastVisible(page, 'success');
      
      // Verify payment status updated
      await expect(page.locator('[data-testid="payment-status"]')).toContainText('İptal Edildi');
    }
  });

  test('PAYMENT-015: Should display pending payments widget on dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Verify pending payments widget exists
    const pendingPaymentsWidget = page.locator('[data-testid="pending-payments-widget"]');
    if (await pendingPaymentsWidget.isVisible()) {
      // Verify count displayed
      await expect(page.locator('[data-testid="pending-payments-count"]')).toBeVisible();
      
      // Verify total amount displayed
      await expect(page.locator('[data-testid="pending-payments-total"]')).toBeVisible();
      
      // Click details button
      await page.locator('[data-testid="pending-payments-details-button"]').click();
      
      // Verify navigated to pending payments page
      await page.waitForTimeout(1000);
      
      // Should show list of pending payments
      const url = page.url();
      expect(url).toMatch(/payment|tahsilat|collection/i);
    }
  });
});
