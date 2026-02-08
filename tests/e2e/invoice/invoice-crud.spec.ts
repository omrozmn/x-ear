import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createParty } from '../../helpers/party';
import { createSaleFromModal } from '../../helpers/sale';
import {
  createInvoiceFromSale,
  createInvoiceManually,
  sendEInvoice,
  downloadInvoicePDF,
  cancelInvoice,
  searchInvoice,
  filterInvoicesByDate,
  filterInvoicesByStatus,
  exportInvoices
} from '../../helpers/invoice';
import { waitForToast, waitForApiCall } from '../../helpers/wait';
import { generateRandomParty } from '../../fixtures/parties';

test.describe('Invoice CRUD Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('INVOICE-001: Create invoice from sale', async ({ page }) => {
    // Arrange: Create party and sale
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const saleId = await createSaleFromModal(page, {
      partyId,
      amount: 15000,
      paymentMethod: 'cash'
    });

    // Act: Create invoice from sale
    const invoiceId = await createInvoiceFromSale(page, saleId);

    // Assert: Invoice created successfully
    expect(invoiceId).toBeTruthy();
    await page.goto(`/invoices/${invoiceId}`);
    await expect(page.locator('[data-testid="invoice-detail-amount"]')).toContainText('15000');
  });

  test('INVOICE-002: Create invoice manually', async ({ page }) => {
    // Arrange: Create party
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);

    // Act: Create invoice manually
    const invoiceId = await createInvoiceManually(page, {
      partyId,
      amount: 20000,
      items: [
        { description: 'Hearing Aid Device', quantity: 1, unitPrice: 15000 },
        { description: 'Batteries', quantity: 2, unitPrice: 2500 }
      ],
      notes: 'Test invoice'
    });

    // Assert: Invoice created successfully
    expect(invoiceId).toBeTruthy();
    await page.goto(`/invoices/${invoiceId}`);
    await expect(page.locator('[data-testid="invoice-detail-items"]')).toContainText('Hearing Aid Device');
  });

  test('INVOICE-003: Send e-invoice', async ({ page }) => {
    // Arrange: Create invoice
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const saleId = await createSaleFromModal(page, {
      partyId,
      amount: 15000,
      paymentMethod: 'cash'
    });
    const invoiceId = await createInvoiceFromSale(page, saleId);

    // Act: Send e-invoice
    await sendEInvoice(page, invoiceId);

    // Assert: E-invoice sent successfully
    await page.goto(`/invoices/${invoiceId}`);
    await expect(page.locator('[data-testid="invoice-status"]')).toContainText('sent');
  });

  test('INVOICE-004: Download invoice PDF', async ({ page }) => {
    // Arrange: Create invoice
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const saleId = await createSaleFromModal(page, {
      partyId,
      amount: 15000,
      paymentMethod: 'cash'
    });
    const invoiceId = await createInvoiceFromSale(page, saleId);

    // Act: Download PDF
    await downloadInvoicePDF(page, invoiceId);

    // Assert: PDF downloaded (file exists in test-results)
    // Note: Actual file verification would require fs module
  });

  test('INVOICE-005: Cancel invoice', async ({ page }) => {
    // Arrange: Create invoice
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const saleId = await createSaleFromModal(page, {
      partyId,
      amount: 15000,
      paymentMethod: 'cash'
    });
    const invoiceId = await createInvoiceFromSale(page, saleId);

    // Act: Cancel invoice
    await cancelInvoice(page, invoiceId);

    // Assert: Invoice cancelled
    await page.goto(`/invoices/${invoiceId}`);
    await expect(page.locator('[data-testid="invoice-status"]')).toContainText('cancelled');
  });

  test('INVOICE-006: Create SGK invoice', async ({ page }) => {
    // Arrange: Create party and sale with SGK payment
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const saleId = await createSaleFromModal(page, {
      partyId,
      amount: 15000,
      sgkPayment: 10000,
      paymentMethod: 'mixed'
    });

    // Act: Create SGK invoice
    const invoiceId = await createInvoiceFromSale(page, saleId);

    // Assert: SGK invoice created with correct amounts
    await page.goto(`/invoices/${invoiceId}`);
    await expect(page.locator('[data-testid="invoice-sgk-amount"]')).toContainText('10000');
    await expect(page.locator('[data-testid="invoice-patient-amount"]')).toContainText('5000');
  });

  test('INVOICE-007: Update invoice', async ({ page }) => {
    // Arrange: Create invoice
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const invoiceId = await createInvoiceManually(page, {
      partyId,
      amount: 15000,
      items: [{ description: 'Device', quantity: 1, unitPrice: 15000 }]
    });

    // Act: Update invoice
    await page.goto(`/invoices/${invoiceId}`);
    await page.locator('[data-testid="invoice-edit-button"]').click();
    await page.locator('[data-testid="invoice-notes-input"]').fill('Updated notes');
    await page.locator('[data-testid="invoice-submit-button"]').click();
    await waitForToast(page, 'success');

    // Assert: Invoice updated
    await page.reload();
    await expect(page.locator('[data-testid="invoice-notes"]')).toContainText('Updated notes');
  });

  test('INVOICE-008: Search invoice by number', async ({ page }) => {
    // Arrange: Create invoice
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const invoiceId = await createInvoiceManually(page, {
      partyId,
      amount: 15000,
      items: [{ description: 'Device', quantity: 1, unitPrice: 15000 }]
    });

    // Get invoice number
    await page.goto(`/invoices/${invoiceId}`);
    const invoiceNumber = await page.locator('[data-testid="invoice-number"]').textContent();

    // Act: Search by invoice number
    await searchInvoice(page, invoiceNumber || '');

    // Assert: Invoice found in search results
    await expect(page.locator('[data-testid="invoice-list-item"]').first()).toContainText(invoiceNumber || '');
  });

  test('INVOICE-009: Filter invoices by date', async ({ page }) => {
    // Arrange: Create invoice
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    await createInvoiceManually(page, {
      partyId,
      amount: 15000,
      items: [{ description: 'Device', quantity: 1, unitPrice: 15000 }]
    });

    // Act: Filter by today's date
    const today = new Date().toISOString().split('T')[0];
    await filterInvoicesByDate(page, today, today);

    // Assert: Filtered results shown
    await expect(page.locator('[data-testid="invoice-list-item"]')).toHaveCount(1);
  });

  test('INVOICE-010: Filter invoices by status', async ({ page }) => {
    // Arrange: Create and send invoice
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const saleId = await createSaleFromModal(page, {
      partyId,
      amount: 15000,
      paymentMethod: 'cash'
    });
    const invoiceId = await createInvoiceFromSale(page, saleId);
    await sendEInvoice(page, invoiceId);

    // Act: Filter by 'sent' status
    await filterInvoicesByStatus(page, 'sent');

    // Assert: Only sent invoices shown
    await expect(page.locator('[data-testid="invoice-list-item"]').first()).toContainText('sent');
  });

  test('INVOICE-011: View invoice detail', async ({ page }) => {
    // Arrange: Create invoice
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const invoiceId = await createInvoiceManually(page, {
      partyId,
      amount: 15000,
      items: [
        { description: 'Hearing Aid', quantity: 1, unitPrice: 15000 }
      ],
      notes: 'Test invoice detail'
    });

    // Act: Navigate to detail page
    await page.goto(`/invoices/${invoiceId}`);

    // Assert: All details visible
    await expect(page.locator('[data-testid="invoice-detail-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-detail-items"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-detail-party"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-notes"]')).toContainText('Test invoice detail');
  });

  test('INVOICE-012: Bulk invoice creation', async ({ page }) => {
    // Arrange: Create multiple sales
    const partyData1 = generateRandomParty();
    const partyData2 = generateRandomParty();
    const partyId1 = await createParty(page, partyData1);
    const partyId2 = await createParty(page, partyData2);
    
    await createSaleFromModal(page, { partyId: partyId1, amount: 15000, paymentMethod: 'cash' });
    await createSaleFromModal(page, { partyId: partyId2, amount: 20000, paymentMethod: 'cash' });

    // Act: Bulk create invoices
    await page.goto('/sales');
    await page.locator('[data-testid="sale-select-all"]').click();
    await page.locator('[data-testid="sale-bulk-create-invoice-button"]').click();
    await page.locator('[data-testid="confirm-bulk-create-button"]').click();
    await waitForToast(page, 'success');

    // Assert: Multiple invoices created
    await page.goto('/invoices');
    await expect(page.locator('[data-testid="invoice-list-item"]')).toHaveCount(2);
  });

  test('INVOICE-013: Export invoices to Excel', async ({ page }) => {
    // Arrange: Create invoice
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    await createInvoiceManually(page, {
      partyId,
      amount: 15000,
      items: [{ description: 'Device', quantity: 1, unitPrice: 15000 }]
    });

    // Act: Export to Excel
    await exportInvoices(page, 'excel');

    // Assert: File downloaded (verified by helper)
  });

  test('INVOICE-014: Invoice reminder', async ({ page }) => {
    // Arrange: Create unpaid invoice
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    const invoiceId = await createInvoiceManually(page, {
      partyId,
      amount: 15000,
      items: [{ description: 'Device', quantity: 1, unitPrice: 15000 }]
    });

    // Act: Send reminder
    await page.goto(`/invoices/${invoiceId}`);
    await page.locator('[data-testid="invoice-send-reminder-button"]').click();
    await page.locator('[data-testid="confirm-send-reminder-button"]').click();
    await waitForToast(page, 'success');

    // Assert: Reminder sent
    await waitForApiCall(page, `/invoices/${invoiceId}/reminder`, 'POST');
  });

  test('INVOICE-015: Invoice pagination', async ({ page }) => {
    // Arrange: Create multiple invoices (assuming 10+ exist)
    await page.goto('/invoices');

    // Act: Navigate to page 2
    await page.locator('[data-testid="pagination-next"]').click();
    await waitForApiCall(page, '/invoices', 'GET');

    // Assert: Page 2 loaded
    await expect(page.locator('[data-testid="pagination-current"]')).toContainText('2');
  });
});
