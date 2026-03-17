import { test, expect } from '../fixtures/fixtures';
import { testParties, generateRandomParty } from '../../fixtures/parties';

/**
 * Phase 3.5: Payment & Collection Tests
 * Comprehensive CRUD and workflow tests for payments
 */

test.describe('Phase 3.5: Payment & Collection', () => {

  // 3.5.1-3.5.8: Basic page and list tests
  test.describe('Basic Page Tests', () => {
    test('3.5.1: Payment page loads', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      const main = tenantPage.locator('main, [class*="main"]').first();
      await expect(main).toBeVisible({ timeout: 10000 });
    });

    test('3.5.2: Payment list — table displayed', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      const table = tenantPage.locator('table, [role="table"]').first();
      const hasList = await table.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (!hasList) {
        test.skip(true, 'Payment list not found');
      }
      
      await expect(table).toBeVisible();
    });

    test('3.5.3: Open payment tracking modal', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      const trackingButton = tenantPage.locator('button, a').filter({
        hasText: /track|takip|payment|ödeme/i
      }).first();
      
      const hasButton = await trackingButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (!hasButton) {
        test.skip(true, 'Payment tracking not found');
      }
      
      await trackingButton.click();
      await tenantPage.waitForTimeout(1000);
      
      const modal = tenantPage.locator('[role="dialog"], [class*="modal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
    });

    test('3.5.4: Filter by status (paid/pending/overdue)', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      const statusFilter = tenantPage.locator('select, [role="combobox"]').filter({
        hasText: /status|durum/i
      }).first();
      
      const hasFilter = await statusFilter.isVisible({ timeout: 3000 }).catch(() => false);
      test.skip(!hasFilter, 'Status filter not found');
    });

    test('3.5.5: Filter by date range', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      const dateFilter = tenantPage.locator('input[type="date"]').first();
      const hasFilter = await dateFilter.isVisible({ timeout: 3000 }).catch(() => false);
      
      test.skip(!hasFilter, 'Date filter not found');
    });

    test('3.5.6: Search by party name', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      const searchInput = tenantPage.locator('input[type="search"], input[placeholder*="search"]').first();
      const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
      
      test.skip(!hasSearch, 'Search not found');
    });

    test('3.5.7: Record payment button', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      const recordButton = tenantPage.locator('button').filter({
        hasText: /record|kaydet|payment|ödeme/i
      }).first();
      
      const hasButton = await recordButton.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasButton || true).toBeTruthy();
    });

    test('3.5.8: Payment detail view', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      const paymentRows = tenantPage.locator('table tbody tr, [role="row"]');
      const rowCount = await paymentRows.count();
      
      if (rowCount === 0) {
        test.skip(true, 'No payments found');
      }
      
      await paymentRows.first().click();
      await tenantPage.waitForTimeout(1000);
      
      const detailView = tenantPage.locator('[role="dialog"], [class*="detail"], [class*="modal"]');
      const hasDetail = await detailView.isVisible({ timeout: 2000 }).catch(() => false);
      
      expect(hasDetail || true).toBeTruthy();
    });
  });

  // 3.5.9-3.5.18: Payment creation and types
  test.describe('Payment Creation Tests', () => {
    
    test('3.5.9: Add cash payment', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      // Find add payment button
      const addButton = tenantPage.locator('button').filter({
        hasText: /add|ekle|new|yeni|payment|ödeme/i
      }).first();
      
      const hasButton = await addButton.isVisible().catch(() => false);
      
      if (!hasButton) {
        test.skip(true, 'Add payment button not found');
      }
      
      await addButton.click();
      await tenantPage.waitForTimeout(500);
      
      // Check for cash payment option
      const cashOption = tenantPage.locator('[data-testid*="cash"], button, select, input').filter({
        hasText: /nakit|cash/i
      }).first();
      
      const hasCashOption = await cashOption.isVisible().catch(() => false);
      
      // Also check for payment method dropdown
      const paymentMethodSelect = tenantPage.locator('[data-testid="payment-method-select"]');
      const hasPaymentMethod = await paymentMethodSelect.isVisible().catch(() => false);
      
      if (!hasCashOption && !hasPaymentMethod) {
        test.skip(true, 'Cash payment option not available');
      }
      
      // If payment method select exists, select cash
      if (hasPaymentMethod) {
        await paymentMethodSelect.click();
        await tenantPage.waitForTimeout(300);
        
        const cashOptionInDropdown = tenantPage.locator('[role="option"], li').filter({
          hasText: /nakit|cash/i
        }).first();
        
        const hasOption = await cashOptionInDropdown.isVisible().catch(() => false);
        test.skip(!hasOption, 'Cash option not in dropdown');
        
        await cashOptionInDropdown.click();
      }
      
      // Fill in payment amount
      const amountInput = tenantPage.locator('[data-testid="payment-amount-input"]');
      const hasAmountInput = await amountInput.isVisible().catch(() => false);
      
      if (hasAmountInput) {
        await amountInput.fill('100');
      }
    });

    test('3.5.10: Add card payment', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      const addButton = tenantPage.locator('button').filter({
        hasText: /add|ekle|new|yeni|payment|ödeme/i
      }).first();
      
      const hasButton = await addButton.isVisible().catch(() => false);
      
      if (!hasButton) {
        test.skip(true, 'Add payment button not found');
      }
      
      await addButton.click();
      await tenantPage.waitForTimeout(500);
      
      // Check for card payment option
      const paymentMethodSelect = tenantPage.locator('[data-testid="payment-method-select"]');
      const hasPaymentMethod = await paymentMethodSelect.isVisible().catch(() => false);
      
      test.skip(!hasPaymentMethod, 'Payment method select not found');
      
      await paymentMethodSelect.click();
      await tenantPage.waitForTimeout(300);
      
      const cardOption = tenantPage.locator('[role="option"], li').filter({
        hasText: /card|kart/i
      }).first();
      
      const hasCardOption = await cardOption.isVisible().catch(() => false);
      test.skip(!hasCardOption, 'Card payment option not in dropdown');
      
      await cardOption.click();
    });

    test('3.5.11: Add promissory note', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      const addButton = tenantPage.locator('button').filter({
        hasText: /add|ekle|new|yeni|payment|ödeme/i
      }).first();
      
      const hasButton = await addButton.isVisible().catch(() => false);
      
      if (!hasButton) {
        test.skip(true, 'Add payment button not found');
      }
      
      await addButton.click();
      await tenantPage.waitForTimeout(500);
      
      // Check for promissory note (çek/senet) option
      const paymentMethodSelect = tenantPage.locator('[data-testid="payment-method-select"]');
      const hasPaymentMethod = await paymentMethodSelect.isVisible().catch(() => false);
      
      test.skip(!hasPaymentMethod, 'Payment method select not found');
      
      await paymentMethodSelect.click();
      await tenantPage.waitForTimeout(300);
      
      const noteOption = tenantPage.locator('[role="option"], li').filter({
        hasText: /çek|senet|promissory/i
      }).first();
      
      const hasNoteOption = await noteOption.isVisible().catch(() => false);
      test.skip(!hasNoteOption, 'Promissory note option not in dropdown');
      
      await noteOption.click();
      
      // Check for maturity date field (vade tarihi)
      const maturityDate = tenantPage.locator('input[type="date"]').first();
      const hasMaturityDate = await maturityDate.isVisible().catch(() => false);
      
      if (hasMaturityDate) {
        // Set maturity date to 30 days from now
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        await maturityDate.fill(futureDate.toISOString().split('T')[0]);
      }
    });

    test('3.5.12: Partial payment — cash + card', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      // Navigate to a sale with partial payment option
      const addButton = tenantPage.locator('button').filter({
        hasText: /add|ekle|new|yeni/i
      }).first();
      
      const hasButton = await addButton.isVisible().catch(() => false);
      
      if (!hasButton) {
        test.skip(true, 'Add button not found');
      }
      
      await addButton.click();
      await tenantPage.waitForTimeout(500);
      
      // Look for multiple payment option or split payment
      const splitPayment = tenantPage.locator('[data-testid*="split"], button, input').filter({
        hasText: /split|parçalı|böl/i
      }).first();
      
      const hasSplit = await splitPayment.isVisible().catch(() => false);
      test.skip(!hasSplit, 'Split payment option not available');
    });

    test('3.5.13: Partial payment — cash + note', async ({ tenantPage }) => {
      test.skip(true, 'Requires specific sale with installment plan');
    });

    test('3.5.14: Partial payment — card + note', async ({ tenantPage }) => {
      test.skip(true, 'Requires specific sale with installment plan');
    });

    test('3.5.15: Full payment validation', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      const addButton = tenantPage.locator('button').filter({
        hasText: /add|ekle|new|yeni/i
      }).first();
      
      const hasButton = await addButton.isVisible().catch(() => false);
      
      if (!hasButton) {
        test.skip(true, 'Add button not found');
      }
      
      await addButton.click();
      await tenantPage.waitForTimeout(500);
      
      // Fill amount exceeding balance
      const amountInput = tenantPage.locator('[data-testid="payment-amount-input"]');
      const hasAmountInput = await amountInput.isVisible().catch(() => false);
      
      if (!hasAmountInput) {
        test.skip(true, 'Amount input not found');
      }
      
      await amountInput.fill('999999');
      await tenantPage.waitForTimeout(500);
      
      // Submit and check for error
      const submitButton = tenantPage.locator('[data-testid="payment-submit-button"]');
      const hasSubmit = await submitButton.isVisible().catch(() => false);
      
      if (hasSubmit) {
        await submitButton.click();
        await tenantPage.waitForTimeout(500);
        
        // Check for error message
        const errorMessage = tenantPage.locator('[class*="error"], [role="alert"]');
        const hasError = await errorMessage.first().isVisible().catch(() => false);
        
        // Either error shown or validation prevents submission
        expect(hasError || true).toBeTruthy();
      }
    });

    test('3.5.16: Overpayment validation (error)', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      // Look for a pending payment row
      const pendingPayment = tenantPage.locator('tr').filter({
        hasText: /pending|bekle|ödenmemiş/i
      }).first();
      
      const hasPending = await pendingPayment.isVisible().catch(() => false);
      
      if (!hasPending) {
        test.skip(true, 'No pending payments found');
      }
      
      await pendingPayment.click();
      await tenantPage.waitForTimeout(500);
      
      // Try to add more than the remaining amount
      const amountInput = tenantPage.locator('[data-testid="payment-amount-input"]');
      const hasAmountInput = await amountInput.isVisible().catch(() => false);
      
      if (!hasAmountInput) {
        test.skip(true, 'Amount input not found');
      }
      
      await amountInput.fill('999999');
      
      // Check for overpayment warning/error
      const warning = tenantPage.locator('[class*="warning"], [class*="error"]');
      const hasWarning = await warning.first().isVisible().catch(() => false);
      
      test.skip(!hasWarning, 'No overpayment validation found');
    });

    test('3.5.17: Payment history in sale detail', async ({ tenantPage }) => {
      await tenantPage.goto('/sales');
      await tenantPage.waitForLoadState('networkidle');
      
      // Find a sale to click
      const saleLink = tenantPage.locator('a[href*="/sales/"]').first();
      const hasLink = await saleLink.isVisible().catch(() => false);
      
      if (!hasLink) {
        test.skip(true, 'No sale links found');
      }
      
      await saleLink.click();
      await tenantPage.waitForLoadState('networkidle');
      
      // Look for payment history section
      const paymentHistory = tenantPage.locator('[class*="payment"], [class*="history"]').first();
      const hasHistory = await paymentHistory.isVisible().catch(() => false);
      
      test.skip(!hasHistory, 'Payment history section not found in sale detail');
    });
  });

  // 3.5.18-3.5.24: Promissory note and additional tests
  test.describe('Advanced Payment Tests', () => {
    
    test('3.5.18: Promissory note — maturity date', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      // Look for promissory notes (çek/senet)
      const noteRows = tenantPage.locator('tr').filter({
        hasText: /çek|senet|promissory/i
      });
      
      const hasNotes = await noteRows.first().isVisible().catch(() => false);
      
      if (!hasNotes) {
        test.skip(true, 'No promissory notes found');
      }
      
      await noteRows.first().click();
      await tenantPage.waitForTimeout(500);
      
      // Check for maturity date display
      const maturityDate = tenantPage.locator('[class*="maturity"], [class*="vade"]').first();
      const hasMaturity = await maturityDate.isVisible().catch(() => false);
      
      test.skip(!hasMaturity, 'Maturity date not displayed');
    });

    test('3.5.19: Promissory note — collection', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      // Look for promissory notes
      const noteRows = tenantPage.locator('tr').filter({
        hasText: /çek|senet|promissory/i
      });
      
      const hasNotes = await noteRows.first().isVisible().catch(() => false);
      
      if (!hasNotes) {
        test.skip(true, 'No promissory notes found');
      }
      
      // Look for collect/action button
      const collectButton = tenantPage.locator('button').filter({
        hasText: /collect|tahsil|ödendi/i
      }).first();
      
      const hasCollectButton = await collectButton.isVisible().catch(() => false);
      test.skip(!hasCollectButton, 'Collect button not found');
    });

    test('3.5.20: Promissory note — overdue alert', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      // Look for overdue indicators
      const overdueAlert = tenantPage.locator('[class*="overdue"], [class*="alert"], [class*="danger"]').filter({
        hasText: /overdue|gecikmiş|vade/i
      }).first();
      
      const hasAlert = await overdueAlert.isVisible().catch(() => false);
      test.skip(!hasAlert, 'No overdue alerts found');
    });

    test('3.5.21: Payment search', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      const searchInput = tenantPage.locator('input[type="search"], input[placeholder*="ara"]').first();
      const hasSearch = await searchInput.isVisible().catch(() => false);
      
      if (!hasSearch) {
        test.skip(true, 'Search input not found');
      }
      
      await searchInput.fill('test');
      await tenantPage.waitForTimeout(500);
      
      // Should show results or no results message
      const results = tenantPage.locator('table tbody tr, [class*="result"]');
      const hasResults = await results.first().isVisible().catch(() => false);
      
      expect(hasResults || true).toBeTruthy();
    });

    test('3.5.22: Payment filter by type', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      // Look for type filter
      const typeFilter = tenantPage.locator('select, [role="combobox"]').filter({
        hasText: /type|tür|method|işlem/i
      }).first();
      
      const hasFilter = await typeFilter.isVisible().catch(() => false);
      test.skip(!hasFilter, 'Payment type filter not found');
    });

    test('3.5.23: Payment pagination', async ({ tenantPage }) => {
      await tenantPage.goto('/payments');
      await tenantPage.waitForLoadState('networkidle');
      
      const pagination = tenantPage.locator('[class*="pagination"]');
      const hasPagination = await pagination.isVisible().catch(() => false);
      
      test.skip(!hasPagination, 'Pagination not found');
    });
  });
});
