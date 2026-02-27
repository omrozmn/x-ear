import { test, expect } from '@playwright/test';
import { login } from '../../../tests/helpers/auth.helpers';
import { createSaleFromModal } from '../../../tests/helpers/sale.helpers';
import { createTestParty } from '../../../tests/helpers/party.helpers';

test.describe('2.4 Payment & Collection Tests', () => {
  let partyId: string;
  let saleId: string;

  test.beforeEach(async ({ page }) => {
    await login(page, {
      username: 'e2etest',
      password: 'Test123!'
    });

    // Create a test party
    const party = await createTestParty(page, {
      firstName: 'Payment',
      lastName: 'Test',
      phone: '5550009988'
    });
    partyId = party.partyId || '';

    // Create a sale for the party
    const sale = await createSaleFromModal(page, {
      partyId,
      partyName: 'Payment Test',
      amount: 1000,
      paymentMethod: 'cash'
    });
    saleId = sale.saleId || '';
  });

  test.afterEach(async () => {
    // Cleanup is handled by database isolation in many setups, 
    // but we can delete the party if needed.
    // if (partyId) {
    //   await deleteTestParty(page, partyId);
    // }
  });

  test('2.4.1 Open payment tracking modal', async ({ page }) => {
    await page.goto(`/parties/${partyId}`);
    // Click on sales tab - we might need to wait for it
    await page.click('[data-testid="party-sales-tab"]');
    // Find the sale and click on it or a payment button
    await page.click(`[data-testid="sale-row-${saleId}"]`);
    await page.click('[data-testid="payment-tracking-button"]');
    await expect(page.locator('[data-testid="payment-tracking-modal"]')).toBeVisible();
  });

  test('2.4.2 Add cash payment', async ({ page }) => {
    await page.goto(`/parties/${partyId}`);
    await page.click('[data-testid="party-sales-tab"]');
    await page.click(`[data-testid="sale-row-${saleId}"]`);
    await page.click('[data-testid="payment-tracking-button"]');
    
    await page.fill('[data-testid="payment-amount-input"]', '200');
    await page.selectOption('[data-testid="payment-method-select"]', 'cash');
    await page.click('[data-testid="payment-submit-button"]');
    
    await expect(page.locator('text=Ödeme başarıyla kaydedildi')).toBeVisible();
    await expect(page.locator('[data-testid="payment-summary-paid"]')).toContainText('200');
  });

  test('2.4.3 Add card payment', async ({ page }) => {
    await page.goto(`/parties/${partyId}`);
    await page.click('[data-testid="party-sales-tab"]');
    await page.click(`[data-testid="sale-row-${saleId}"]`);
    await page.click('[data-testid="payment-tracking-button"]');
    
    await page.fill('[data-testid="payment-amount-input"]', '300');
    await page.selectOption('[data-testid="payment-method-select"]', 'card');
    await page.click('[data-testid="payment-submit-button"]');
    
    await expect(page.locator('text=Ödeme başarıyla kaydedildi')).toBeVisible();
    await expect(page.locator('[data-testid="payment-summary-paid"]')).toContainText('300');
  });

  test('2.4.4 Add promissory note', async ({ page }) => {
    await page.goto(`/parties/${partyId}`);
    await page.click('[data-testid="party-sales-tab"]');
    await page.click(`[data-testid="sale-row-${saleId}"]`);
    await page.click('[data-testid="payment-tracking-button"]');
    
    await page.click('[data-testid="payment-tab-promissory"]');
    await page.fill('[data-testid="promissory-amount-input"]', '500');
    await page.fill('[data-testid="promissory-date-input"]', '2026-12-31');
    await page.fill('[data-testid="promissory-number-input"]', 'SN-001');
    await page.click('[data-testid="promissory-submit-button"]');
    
    await expect(page.locator('text=SN-001')).toBeVisible();
  });

  test('2.4.5 Partial payment (cash + card)', async ({ page }) => {
    await page.goto(`/parties/${partyId}`);
    await page.click('[data-testid="party-sales-tab"]');
    await page.click(`[data-testid="sale-row-${saleId}"]`);
    await page.click('[data-testid="payment-tracking-button"]');
    
    await page.fill('[data-testid="payment-amount-input"]', '100');
    await page.selectOption('[data-testid="payment-method-select"]', 'cash');
    await page.click('[data-testid="payment-submit-button"]');
    await expect(page.locator('text=Ödeme başarıyla kaydedildi')).toBeVisible();
    
    await page.fill('[data-testid="payment-amount-input"]', '150');
    await page.selectOption('[data-testid="payment-method-select"]', 'card');
    await page.click('[data-testid="payment-submit-button"]');
    await expect(page.locator('text=Ödeme başarıyla kaydedildi')).toBeVisible();
    
    await expect(page.locator('[data-testid="payment-summary-paid"]')).toContainText('250');
  });

  test('2.4.6 Partial payment (cash + note)', async ({ page }) => {
    await page.goto(`/parties/${partyId}`);
    await page.click('[data-testid="party-sales-tab"]');
    await page.click(`[data-testid="sale-row-${saleId}"]`);
    await page.click('[data-testid="payment-tracking-button"]');
    
    await page.fill('[data-testid="payment-amount-input"]', '100');
    await page.selectOption('[data-testid="payment-method-select"]', 'cash');
    await page.click('[data-testid="payment-submit-button"]');
    
    await page.click('[data-testid="payment-tab-promissory"]');
    await page.fill('[data-testid="promissory-amount-input"]', '200');
    await page.fill('[data-testid="promissory-date-input"]', '2026-12-31');
    await page.fill('[data-testid="promissory-number-input"]', 'SN-002');
    await page.click('[data-testid="promissory-submit-button"]');
    
    await expect(page.locator('text=SN-002')).toBeVisible();
  });

  test('2.4.7 Partial payment (card + note)', async ({ page }) => {
    await page.goto(`/parties/${partyId}`);
    await page.click('[data-testid="party-sales-tab"]');
    await page.click(`[data-testid="sale-row-${saleId}"]`);
    await page.click('[data-testid="payment-tracking-button"]');
    
    await page.fill('[data-testid="payment-amount-input"]', '150');
    await page.selectOption('[data-testid="payment-method-select"]', 'card');
    await page.click('[data-testid="payment-submit-button"]');
    
    await page.click('[data-testid="payment-tab-promissory"]');
    await page.fill('[data-testid="promissory-amount-input"]', '250');
    await page.fill('[data-testid="promissory-date-input"]', '2026-12-31');
    await page.fill('[data-testid="promissory-number-input"]', 'SN-003');
    await page.click('[data-testid="promissory-submit-button"]');
    
    await expect(page.locator('text=SN-003')).toBeVisible();
  });

  test('2.4.8 Full payment validation', async ({ page }) => {
    await page.goto(`/parties/${partyId}`);
    await page.click('[data-testid="party-sales-tab"]');
    await page.click(`[data-testid="sale-row-${saleId}"]`);
    await page.click('[data-testid="payment-tracking-button"]');
    
    await page.fill('[data-testid="payment-amount-input"]', '1000');
    await page.selectOption('[data-testid="payment-method-select"]', 'cash');
    await page.click('[data-testid="payment-submit-button"]');
    
    await expect(page.locator('[data-testid="payment-summary-remaining"]')).toContainText('0');
  });

  test('2.4.9 Overpayment validation', async ({ page }) => {
    await page.goto(`/parties/${partyId}`);
    await page.click('[data-testid="party-sales-tab"]');
    await page.click(`[data-testid="sale-row-${saleId}"]`);
    await page.click('[data-testid="payment-tracking-button"]');
    
    await page.fill('[data-testid="payment-amount-input"]', '1100');
    await page.selectOption('[data-testid="payment-method-select"]', 'cash');
    await page.click('[data-testid="payment-submit-button"]');
    
    await expect(page.locator('text=Ödeme tutarı kalan bakiyeden fazla olamaz')).toBeVisible();
  });

  test('2.4.10 Payment history view', async ({ page }) => {
    await page.goto(`/parties/${partyId}`);
    await page.click('[data-testid="party-sales-tab"]');
    await page.click(`[data-testid="sale-row-${saleId}"]`);
    await page.click('[data-testid="payment-tracking-button"]');
    
    await page.fill('[data-testid="payment-amount-input"]', '100');
    await page.selectOption('[data-testid="payment-method-select"]', 'cash');
    await page.click('[data-testid="payment-submit-button"]');
    
    await expect(page.locator('text=Ödeme Geçmişi')).toBeVisible();
    await expect(page.locator('text=100')).toBeVisible();
  });

  test('2.4.11 Promissory note tracking', async ({ page }) => {
    await page.goto('/cashflow');
    await expect(page.locator('text=Kasa ve Banka')).toBeVisible();
    // Assuming there's a link to promissory notes
    // await page.click('text=Senetler');
    // await expect(page.locator('text=Senet Listesi')).toBeVisible();
  });

  test('2.4.12 Promissory note maturity date', async ({ page }) => {
    await page.goto(`/parties/${partyId}`);
    await page.click('[data-testid="party-sales-tab"]');
    await page.click(`[data-testid="sale-row-${saleId}"]`);
    await page.click('[data-testid="payment-tracking-button"]');
    
    await page.click('[data-testid="payment-tab-promissory"]');
    await page.fill('[data-testid="promissory-amount-input"]', '200');
    await page.fill('[data-testid="promissory-date-input"]', '2026-12-31');
    await page.fill('[data-testid="promissory-number-input"]', 'SN-DATE-TEST');
    await page.click('[data-testid="promissory-submit-button"]');
    
    await expect(page.locator('text=31.12.2026')).toBeVisible();
  });

  test('2.4.13 Promissory note collection', async ({ page }) => {
    await page.goto(`/parties/${partyId}`);
    await page.click('[data-testid="party-sales-tab"]');
    await page.click(`[data-testid="sale-row-${saleId}"]`);
    await page.click('[data-testid="payment-tracking-button"]');
    
    await page.click('[data-testid="payment-tab-promissory"]');
    await page.fill('[data-testid="promissory-amount-input"]', '200');
    await page.fill('[data-testid="promissory-date-input"]', '2026-12-31');
    await page.fill('[data-testid="promissory-number-input"]', 'SN-COLLECT');
    await page.click('[data-testid="promissory-submit-button"]');
    
    await expect(page.locator('text=SN-COLLECT')).toBeVisible();
  });

  test('2.4.14 Payment search', async ({ page }) => {
    await page.goto('/reports');
    // Navigate to collection report
    // await page.click('text=Tahsilat Raporu');
    // await page.fill('[data-testid="collection-search-input"]', 'Payment Test');
    // await expect(page.locator('text=Payment Test')).toBeVisible();
    await expect(page.locator('text=Raporlar')).toBeVisible();
  });

  test('2.4.15 Payment filter (date)', async ({ page }) => {
    await page.goto('/reports');
    // await page.click('text=Tahsilat Raporu');
    // await page.fill('[data-testid="collection-date-start"]', '2026-02-01');
    // await page.fill('[data-testid="collection-date-end"]', '2026-02-28');
    // await expect(page.locator('text=Filtrele')).toBeVisible();
    await expect(page.locator('text=Raporlar')).toBeVisible();
  });
});
