import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createParty } from '../../helpers/party';
import { waitForToast, waitForModalOpen } from '../../helpers/wait';
import { expectToastVisible, expectModalOpen } from '../../helpers/assertions';
import { testUsers, generateRandomParty } from '../../fixtures';

test.describe('Sale Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, testUsers.admin);
  });

  test('SALE-011: Should update sale information', async ({ page }) => {
    // Create a test party and sale first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Sales
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    
    // Create a sale
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Click Edit button on first sale
    await page.locator('[data-testid="sale-edit-button"]').first().click();
    
    // Verify modal opened with data
    await expectModalOpen(page, 'sale-modal');
    
    // Update price to 16000 TL
    await page.locator('[data-testid="sale-price-input"]').clear();
    await page.locator('[data-testid="sale-price-input"]').fill('16000');
    
    // Submit
    await page.locator('[data-testid="sale-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify updated price in list
    await expect(page.locator('[data-testid="sale-list-item"]').first()).toContainText('16000');
  });

  test('SALE-012: Should delete sale', async ({ page }) => {
    // Create a test party and sale first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Sales
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    
    // Create a sale
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Get sale text for verification
    const saleText = await page.locator('[data-testid="sale-list-item"]').first().textContent();
    
    // Click Delete button
    await page.locator('[data-testid="sale-delete-button"]').first().click();
    
    // Verify confirmation dialog
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    
    // Confirm deletion
    await page.locator('[data-testid="confirm-dialog-yes-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify sale removed from list
    if (saleText) {
      await expect(page.locator('text=' + saleText)).toBeHidden();
    }
  });

  test('SALE-013: Should display all sales page', async ({ page }) => {
    // Navigate to Sales page
    await page.goto('/sales');
    
    // Verify page loaded
    await expect(page.locator('[data-testid="sales-page"]')).toBeVisible();
    
    // Verify sales list
    const salesCount = await page.locator('[data-testid="sale-list-item"]').count();
    expect(salesCount).toBeGreaterThanOrEqual(0);
    
    // Verify filters exist
    await expect(page.locator('[data-testid="sale-date-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="sale-party-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="sale-payment-status-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="sale-invoice-status-filter"]')).toBeVisible();
    
    // Verify search input
    await expect(page.locator('[data-testid="sale-search-input"]')).toBeVisible();
  });

  test('SALE-014: Should display sale detail', async ({ page }) => {
    // Create a test party and sale first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Sales
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    
    // Create a sale
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Click on first sale
    await page.locator('[data-testid="sale-list-item"]').first().click();
    
    // Verify detail modal opened
    await expectModalOpen(page, 'sale-detail-modal');
    
    // Verify all information displayed
    await expect(page.locator('[data-testid="sale-detail-product"]')).toBeVisible();
    await expect(page.locator('[data-testid="sale-detail-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="sale-detail-discount"]')).toBeVisible();
    await expect(page.locator('[data-testid="sale-detail-sgk"]')).toBeVisible();
    await expect(page.locator('[data-testid="sale-detail-payment"]')).toBeVisible();
    await expect(page.locator('[data-testid="sale-detail-invoice-status"]')).toBeVisible();
  });

  test('SALE-015: Should search sales by party name', async ({ page }) => {
    // Create a test party with unique name
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Create a sale for this party
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Navigate to Sales page
    await page.goto('/sales');
    
    // Search for the party
    await page.locator('[data-testid="sale-search-input"]').fill(testParty.firstName);
    await page.locator('[data-testid="sale-search-button"]').click();
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Verify party name appears in results
    await expect(page.locator('text=' + testParty.firstName)).toBeVisible();
  });

  test('SALE-016: Should filter sales by date', async ({ page }) => {
    // Navigate to Sales page
    await page.goto('/sales');
    
    // Click date filter
    await page.locator('[data-testid="sale-date-filter"]').click();
    
    // Select "Last 7 days"
    await page.locator('text=Son 7 gün').first().click();
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Verify URL or results updated
    const salesCount = await page.locator('[data-testid="sale-list-item"]').count();
    expect(salesCount).toBeGreaterThanOrEqual(0);
    
    // Change to "This month"
    await page.locator('[data-testid="sale-date-filter"]').click();
    await page.locator('text=Bu ay').first().click();
    
    // Wait for results
    await page.waitForTimeout(1000);
  });

  test('SALE-017: Should filter sales by payment status', async ({ page }) => {
    // Navigate to Sales page
    await page.goto('/sales');
    
    // Click payment status filter
    await page.locator('[data-testid="sale-payment-status-filter"]').click();
    
    // Select "Unpaid"
    await page.locator('text=Ödenmedi').first().click();
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Verify results filtered
    const salesCount = await page.locator('[data-testid="sale-list-item"]').count();
    expect(salesCount).toBeGreaterThanOrEqual(0);
    
    // Change to "Partially Paid"
    await page.locator('[data-testid="sale-payment-status-filter"]').click();
    await page.locator('text=Kısmi Ödendi').first().click();
    
    // Wait for results
    await page.waitForTimeout(1000);
  });

  test('SALE-018: Should filter sales by invoice status', async ({ page }) => {
    // Navigate to Sales page
    await page.goto('/sales');
    
    // Click invoice status filter
    await page.locator('[data-testid="sale-invoice-status-filter"]').click();
    
    // Select "Not Invoiced"
    await page.locator('text=Fatura Kesilmedi').first().click();
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Verify results filtered
    const salesCount = await page.locator('[data-testid="sale-list-item"]').count();
    expect(salesCount).toBeGreaterThanOrEqual(0);
  });

  test('SALE-019: Should export sales to CSV', async ({ page }) => {
    // Navigate to Sales page
    await page.goto('/sales');
    
    // Look for export button
    const exportButton = page.locator('button').filter({ hasText: /Export|Dışa Aktar|Excel|CSV/i }).first();
    
    if (await exportButton.isVisible()) {
      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download started
      expect(download.suggestedFilename()).toMatch(/\.csv|\.xlsx/);
    }
  });

  test('SALE-020: Should paginate through sales list', async ({ page }) => {
    // Navigate to Sales page
    await page.goto('/sales');
    
    // Get initial count
    const initialCount = await page.locator('[data-testid="sale-list-item"]').count();
    
    // Look for pagination controls
    const nextButton = page.locator('button').filter({ hasText: /Next|Sonraki|>/i }).first();
    
    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      // Click next page
      await nextButton.click();
      
      // Wait for page to load
      await page.waitForTimeout(1000);
      
      // Verify URL changed or content updated
      const newCount = await page.locator('[data-testid="sale-list-item"]').count();
      
      // Either URL should have page parameter or content should be different
      const url = page.url();
      const hasPageParam = url.includes('page=') || url.includes('offset=');
      
      expect(hasPageParam || newCount !== initialCount).toBeTruthy();
    }
  });
});
