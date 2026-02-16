import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createParty } from '../../helpers/party';
import { waitForModalOpen } from '../../helpers/wait';
import { expectToastVisible, expectModalOpen, expectModalClosed } from '../../helpers/assertions';
import { testUsers, generateRandomParty } from '../../fixtures';

test.describe('Sale Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, testUsers.admin);
  });

  test('SALE-001: Should create sale from modal with device only', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail
    await page.goto(`/parties/${partyId}`);
    
    // Click Sales tab
    await page.locator('[data-testid="sales-tab"]').click();
    
    // Click New Sale button
    await page.locator('[data-testid="sale-create-button"]').click();
    
    // Verify modal opened
    await expectModalOpen(page, 'sale-modal');
    
    // Select device (autocomplete)
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    
    // Verify price auto-filled
    const priceInput = page.locator('[data-testid="sale-price-input"]');
    await expect(priceInput).toHaveValue(/\d+/);
    
    // Select payment method: Cash
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    
    // Submit
    await page.locator('[data-testid="sale-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify modal closed
    await expectModalClosed(page, 'sale-modal');
    
    // Verify sale appears in list
    await expect(page.locator('[data-testid="sale-list-item"]').first()).toContainText('Phonak Audeo');
  });

  test('SALE-002: Should create sale from device assignment', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail
    await page.goto(`/parties/${partyId}`);
    
    // Click Devices tab
    await page.locator('[data-testid="devices-tab"]').click();
    
    // Click Assign Device button
    await page.locator('[data-testid="device-assign-button"]').click();
    
    // Verify modal opened
    await expectModalOpen(page, 'device-assignment-modal');
    
    // Select device
    await page.locator('[data-testid="device-select"]').click();
    await page.locator('text=Phonak Audeo').first().click();
    
    // Select assignment reason: Sale
    await page.locator('[data-testid="assignment-reason-select"]').click();
    await page.locator('[data-testid="reason-option-sale"]').click();
    
    // Verify price fields auto-filled
    await expect(page.locator('[data-testid="device-price-input"]')).toHaveValue(/\d+/);
    
    // Select payment method: Card
    await page.locator('[data-testid="device-payment-method-select"]').click();
    await page.locator('text=Kredi Kartı').first().click();
    
    // Submit
    await page.locator('[data-testid="device-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify device assigned
    await expect(page.locator('[data-testid="device-assignment-row"]').first()).toContainText('Phonak Audeo');
    await expect(page.locator('[data-testid="device-assignment-row"]').first()).toContainText('Sale');
  });

  test('SALE-003: Should create sale from cash register with party name', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    await createParty(page, testParty);
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Click Add Cash Record button
    await page.locator('[data-testid="cash-record-create-button"]').click();
    
    // Verify modal opened
    await expectModalOpen(page, 'cash-record-modal');
    
    // Select party (autocomplete)
    await page.locator('[data-testid="cash-record-party-autocomplete"]').fill(testParty.firstName);
    await page.locator(`text=${testParty.firstName} ${testParty.lastName}`).first().click();
    
    // Enter amount
    await page.locator('[data-testid="cash-record-amount-input"]').fill('5000');
    
    // Select product (optional): Pil
    await page.locator('[data-testid="cash-record-product-select"]').click();
    await page.locator('text=Pil').first().click();
    
    // Submit
    await page.locator('[data-testid="cash-record-submit-button"]').click();
    
    // Verify success toast with "satış olarak kaydedildi" message
    await expectToastVisible(page, 'success');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('satış olarak kaydedildi');
    
    // Navigate to party detail → Sales tab
    await page.goto('/parties');
    await page.locator(`text=${testParty.firstName}`).first().click();
    await page.locator('[data-testid="sales-tab"]').click();
    
    // Verify sale record exists
    await expect(page.locator('[data-testid="sale-list-item"]').first()).toContainText('5000');
  });

  test('SALE-004: Should create cash record without party name (no sale)', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Click Add Cash Record button
    await page.locator('[data-testid="cash-record-create-button"]').click();
    
    // Verify modal opened
    await expectModalOpen(page, 'cash-record-modal');
    
    // Leave party empty
    // Enter amount
    await page.locator('[data-testid="cash-record-amount-input"]').fill('500');
    
    // Select tag: Kargo
    await page.locator('[data-testid="cash-record-tag-select"]').click();
    await page.locator('text=Kargo').first().click();
    
    // Submit
    await page.locator('[data-testid="cash-record-submit-button"]').click();
    
    // Verify success toast WITHOUT "satış" message
    await expectToastVisible(page, 'success');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Kasa kaydı oluşturuldu');
    await expect(page.locator('[data-testid="success-toast"]')).not.toContainText('satış');
  });

  test('SALE-005: Should create pill sale with SGK report', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Sales
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    
    // Click New Sale button
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    
    // Select product: Duracell Pil
    await page.locator('[data-testid="sale-product-select"]').click();
    await page.locator('text=Duracell Pil').first().click();
    
    // Select package: 60'lı Paket
    await page.locator('[data-testid="sale-package-select"]').click();
    await page.locator('text=60\'lı Paket').first().click();
    
    // Enter quantity: 2 packages
    await page.locator('[data-testid="sale-quantity-input"]').fill('2');
    
    // Verify total pieces calculated: 120
    await expect(page.locator('[data-testid="sale-total-pieces-display"]')).toContainText('120');
    
    // Select report status: Rapor alındı
    await page.locator('[data-testid="sale-report-status-select"]').click();
    await page.locator('text=Rapor alındı').first().click();
    
    // Verify SGK payment calculated: (120/104) * 698 = 805 TL
    await expect(page.locator('[data-testid="sale-sgk-discount-display"]')).toContainText('805');
    
    // Submit
    await page.locator('[data-testid="sale-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
  });

  test('SALE-006: Should create pill sale with report pending', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Sales
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    
    // Click New Sale button
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    
    // Select product: Duracell Pil
    await page.locator('[data-testid="sale-product-select"]').click();
    await page.locator('text=Duracell Pil').first().click();
    
    // Enter quantity: 104
    await page.locator('[data-testid="sale-quantity-input"]').fill('104');
    
    // Select report status: Rapor bekliyor
    await page.locator('[data-testid="sale-report-status-select"]').click();
    await page.locator('text=Rapor bekliyor').first().click();
    
    // Verify SGK payment: 698 TL
    await expect(page.locator('[data-testid="sale-sgk-discount-display"]')).toContainText('698');
    
    // Submit
    await page.locator('[data-testid="sale-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
  });

  test('SALE-007: Should create pill sale as private (no SGK)', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Sales
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    
    // Click New Sale button
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    
    // Select product: Duracell Pil
    await page.locator('[data-testid="sale-product-select"]').click();
    await page.locator('text=Duracell Pil').first().click();
    
    // Enter quantity: 104
    await page.locator('[data-testid="sale-quantity-input"]').fill('104');
    
    // Select report status: Özel satış
    await page.locator('[data-testid="sale-report-status-select"]').click();
    await page.locator('text=Özel satış').first().click();
    
    // Verify SGK payment: 0 TL
    await expect(page.locator('[data-testid="sale-sgk-discount-display"]')).toContainText('0');
    
    // Submit
    await page.locator('[data-testid="sale-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
  });

  test('SALE-008: Should create sale with percentage discount', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Sales
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    
    // Click New Sale button
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    
    // Select device: Phonak Audeo (15000 TL)
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    
    // Select discount type: Percentage
    await page.locator('[data-testid="sale-discount-type-select"]').click();
    await page.locator('text=Yüzde').first().click();
    
    // Enter discount: 10%
    await page.locator('[data-testid="sale-discount-input"]').fill('10');
    
    // Verify discount amount calculated: 1500 TL
    await expect(page.locator('[data-testid="sale-discount-amount-display"]')).toContainText('1500');
    
    // Submit
    await page.locator('[data-testid="sale-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
  });

  test('SALE-009: Should create sale with fixed amount discount', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Sales
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    
    // Click New Sale button
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    
    // Select device: Phonak Audeo (15000 TL)
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    
    // Select discount type: Amount
    await page.locator('[data-testid="sale-discount-type-select"]').click();
    await page.locator('text=Tutar').first().click();
    
    // Enter discount: 2000 TL
    await page.locator('[data-testid="sale-discount-input"]').fill('2000');
    
    // Verify total amount: 15000 - 2000 = 13000 TL (minus SGK)
    await expect(page.locator('[data-testid="sale-total-amount-display"]')).toContainText(/1[0-3]000/);
    
    // Submit
    await page.locator('[data-testid="sale-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
  });

  test('SALE-010: Should create sale with prepayment', async ({ page }) => {
    // Create a test party first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Sales
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    
    // Click New Sale button
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    
    // Select device: Phonak Audeo (15000 TL)
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    
    // Enter prepayment: 5000 TL
    await page.locator('[data-testid="sale-prepayment-input"]').fill('5000');
    
    // Verify remaining amount calculated
    await expect(page.locator('[data-testid="sale-remaining-amount-display"]')).toContainText(/10000|7000/);
    
    // Submit
    await page.locator('[data-testid="sale-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Open payment tracking modal
    await page.locator('[data-testid="sale-list-item"]').first().click();
    await page.locator('[data-testid="sale-payment-button"]').click();
    
    // Verify prepayment shown
    await expect(page.locator('[data-testid="payment-history-item"]').first()).toContainText('5000');
  });
});
