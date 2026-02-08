import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createParty } from '../../helpers/party';
import { openPaymentTrackingModal, addPayment, addPartialPayments } from '../../helpers/payment';
import { waitForToast, waitForModalOpen, waitForModalClose } from '../../helpers/wait';
import { expectToastVisible, expectModalOpen, expectModalClosed } from '../../helpers/assertions';
import { testUsers, generateRandomParty } from '../../fixtures';

test.describe('Payment Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, testUsers.admin);
  });

  test('PAYMENT-001: Should open payment tracking modal', async ({ page }) => {
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
    
    // Click on sale to view details
    await page.locator('[data-testid="sale-list-item"]').first().click();
    
    // Click Payment button
    await page.locator('[data-testid="sale-payment-button"]').click();
    
    // Verify payment tracking modal opened
    await expectModalOpen(page, 'payment-tracking-modal');
    
    // Verify sale info displayed
    await expect(page.locator('[data-testid="payment-sale-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-total-amount"]')).toBeVisible();
    
    // Verify remaining amount displayed
    await expect(page.locator('[data-testid="payment-remaining-amount"]')).toBeVisible();
    
    // Verify payment history empty
    await expect(page.locator('[data-testid="payment-history-empty"]')).toBeVisible();
  });
});

  test('PAYMENT-002: Should add cash payment', async ({ page }) => {
    // Create a test party and sale first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Navigate to party detail → Sales → Create sale
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Open payment tracking modal
    await page.locator('[data-testid="sale-list-item"]').first().click();
    await page.locator('[data-testid="sale-payment-button"]').click();
    await waitForModalOpen(page, 'payment-tracking-modal');
    
    // Click Add Payment button
    await page.locator('[data-testid="payment-add-button"]').click();
    
    // Enter amount: 5000 TL
    await page.locator('[data-testid="payment-amount-input"]').fill('5000');
    
    // Select payment method: Cash
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Nakit').first().click();
    
    // Enter date: Today
    await page.locator('[data-testid="payment-date-input"]').fill(new Date().toISOString().split('T')[0]);
    
    // Submit
    await page.locator('[data-testid="payment-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify payment in history
    await expect(page.locator('[data-testid="payment-history-item"]').first()).toContainText('5000');
    await expect(page.locator('[data-testid="payment-history-item"]').first()).toContainText('Nakit');
    
    // Verify remaining amount updated
    await expect(page.locator('[data-testid="payment-remaining-amount"]')).toContainText(/10000|7000/);
  });

  test('PAYMENT-003: Should add credit card payment with installments', async ({ page }) => {
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
    
    // Open payment tracking modal
    await page.locator('[data-testid="sale-list-item"]').first().click();
    await page.locator('[data-testid="sale-payment-button"]').click();
    await waitForModalOpen(page, 'payment-tracking-modal');
    
    // Click Add Payment button
    await page.locator('[data-testid="payment-add-button"]').click();
    
    // Enter amount: 6000 TL
    await page.locator('[data-testid="payment-amount-input"]').fill('6000');
    
    // Select payment method: Credit Card
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Kredi Kartı').first().click();
    
    // Select installments: 3
    await page.locator('[data-testid="payment-installment-select"]').click();
    await page.locator('text=3 taksit').first().click();
    
    // Verify commission calculated (5%)
    await expect(page.locator('[data-testid="payment-commission-rate-input"]')).toHaveValue('5');
    await expect(page.locator('[data-testid="payment-commission-amount-display"]')).toContainText('300');
    await expect(page.locator('[data-testid="payment-net-amount-display"]')).toContainText('5700');
    
    // Submit
    await page.locator('[data-testid="payment-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify payment in history with installment info
    await expect(page.locator('[data-testid="payment-history-item"]').first()).toContainText('3 taksit');
  });

  test('PAYMENT-004: Should add bank transfer payment', async ({ page }) => {
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
    
    // Open payment tracking modal
    await page.locator('[data-testid="sale-list-item"]').first().click();
    await page.locator('[data-testid="sale-payment-button"]').click();
    await waitForModalOpen(page, 'payment-tracking-modal');
    
    // Click Add Payment button
    await page.locator('[data-testid="payment-add-button"]').click();
    
    // Enter amount: 4000 TL
    await page.locator('[data-testid="payment-amount-input"]').fill('4000');
    
    // Select payment method: Bank Transfer
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Havale').first().click();
    
    // Enter bank name
    await page.locator('[data-testid="payment-bank-input"]').fill('Ziraat Bankası');
    
    // Enter reference number
    await page.locator('[data-testid="payment-reference-input"]').fill('REF123456');
    
    // Submit
    await page.locator('[data-testid="payment-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Verify payment in history
    await expect(page.locator('[data-testid="payment-history-item"]').first()).toContainText('Havale');
  });

  test('PAYMENT-005: Should add promissory note payment', async ({ page }) => {
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
    
    // Open payment tracking modal
    await page.locator('[data-testid="sale-list-item"]').first().click();
    await page.locator('[data-testid="sale-payment-button"]').click();
    await waitForModalOpen(page, 'payment-tracking-modal');
    
    // Click Add Payment button
    await page.locator('[data-testid="payment-add-button"]').click();
    
    // Enter amount: 5000 TL
    await page.locator('[data-testid="payment-amount-input"]').fill('5000');
    
    // Select payment method: Promissory Note
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Senet').first().click();
    
    // Enter note number
    await page.locator('[data-testid="payment-promissory-note-number-input"]').fill('SN-001');
    
    // Enter due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    await page.locator('[data-testid="payment-promissory-note-due-date-input"]').fill(dueDate.toISOString().split('T')[0]);
    
    // Enter bank
    await page.locator('[data-testid="payment-promissory-note-bank-input"]').fill('İş Bankası');
    
    // Submit
    await page.locator('[data-testid="payment-submit-button"]').click();
    
    // Verify success toast
    await expectToastVisible(page, 'success');
    
    // Navigate to Promissory Notes tab
    await page.locator('[data-testid="promissory-notes-tab"]').click();
    
    // Verify note appears with status "Pending"
    await expect(page.locator('[data-testid="promissory-note-item"]').first()).toContainText('SN-001');
    await expect(page.locator('[data-testid="promissory-note-item"]').first()).toContainText('Beklemede');
  });

  test('PAYMENT-006: Should add partial payments (cash + card + note)', async ({ page }) => {
    // Create a test party and sale first
    const testParty = generateRandomParty();
    const partyId = await createParty(page, testParty);
    
    // Create sale with 15000 TL
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="sales-tab"]').click();
    await page.locator('[data-testid="sale-create-button"]').click();
    await waitForModalOpen(page, 'sale-modal');
    await page.locator('[data-testid="sale-product-search-input"]').fill('Phonak Audeo');
    await page.locator('text=Phonak Audeo').first().click();
    await page.locator('[data-testid="sale-payment-cash-button"]').click();
    await page.locator('[data-testid="sale-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Open payment tracking modal
    await page.locator('[data-testid="sale-list-item"]').first().click();
    await page.locator('[data-testid="sale-payment-button"]').click();
    await waitForModalOpen(page, 'payment-tracking-modal');
    
    // Payment 1: 3000 TL Cash
    await page.locator('[data-testid="payment-add-button"]').click();
    await page.locator('[data-testid="payment-amount-input"]').fill('3000');
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Nakit').first().click();
    await page.locator('[data-testid="payment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Verify remaining: 12000 TL (or less with SGK)
    await expect(page.locator('[data-testid="payment-remaining-amount"]')).toContainText(/12000|9000/);
    
    // Payment 2: 7000 TL Credit Card (3 installments)
    await page.locator('[data-testid="payment-add-button"]').click();
    await page.locator('[data-testid="payment-amount-input"]').fill('7000');
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Kredi Kartı').first().click();
    await page.locator('[data-testid="payment-installment-select"]').click();
    await page.locator('text=3 taksit').first().click();
    await page.locator('[data-testid="payment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Verify remaining: 5000 TL (or less)
    await expect(page.locator('[data-testid="payment-remaining-amount"]')).toContainText(/5000|2000/);
    
    // Payment 3: 5000 TL Promissory Note
    await page.locator('[data-testid="payment-add-button"]').click();
    await page.locator('[data-testid="payment-amount-input"]').fill('5000');
    await page.locator('[data-testid="payment-method-select"]').click();
    await page.locator('text=Senet').first().click();
    await page.locator('[data-testid="payment-promissory-note-number-input"]').fill('SN-002');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    await page.locator('[data-testid="payment-promissory-note-due-date-input"]').fill(dueDate.toISOString().split('T')[0]);
    await page.locator('[data-testid="payment-submit-button"]').click();
    await waitForToast(page, 'success');
    
    // Verify remaining: 0 TL (payment completed)
    await expect(page.locator('[data-testid="payment-remaining-amount"]')).toContainText('0');
    
    // Verify success toast with "tamamlandı" message
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('tamamlandı');
    
    // Verify 3 payments in history
    await expect(page.locator('[data-testid="payment-history-item"]')).toHaveCount(3);
  });
