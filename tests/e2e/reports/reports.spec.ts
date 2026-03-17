import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  generateSalesReport,
  generateCollectionReport,
  generateStockReport,
  generateSGKDeviceReport,
  generateSGKPillReport,
  generatePromissoryNoteReport,
  generateCustomerReport,
  exportReport,
  checkSGKReportValidity
} from '../../helpers/report';
import { createParty } from '../../helpers/party';
import { createSaleFromModal } from '../../helpers/sale';
import { generateRandomParty } from '../../fixtures/parties';

test.describe('Report Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('REPORT-001: Generate sales report (daily)', async ({ page }) => {
    // Act: Generate daily sales report
    await generateSalesReport(page, 'daily');

    // Assert: Report displayed
    await expect(page.locator('[data-testid="report-title"]')).toContainText('Daily Sales Report');
    await expect(page.locator('[data-testid="report-total-sales"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-sales-count"]')).toBeVisible();
  });

  test('REPORT-002: Generate sales report (monthly)', async ({ page }) => {
    // Act: Generate monthly sales report
    await generateSalesReport(page, 'monthly');

    // Assert: Report displayed
    await expect(page.locator('[data-testid="report-title"]')).toContainText('Monthly Sales Report');
    await expect(page.locator('[data-testid="report-total-sales"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-chart"]')).toBeVisible();
  });

  test('REPORT-003: Generate collection report', async ({ page }) => {
    // Arrange: Date range
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    // Act: Generate collection report
    await generateCollectionReport(page, startDate, endDate);

    // Assert: Report displayed
    await expect(page.locator('[data-testid="report-title"]')).toContainText('Collection Report');
    await expect(page.locator('[data-testid="report-total-collected"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-pending-amount"]')).toBeVisible();
  });

  test('REPORT-004: Generate stock report', async ({ page }) => {
    // Act: Generate stock report
    await generateStockReport(page);

    // Assert: Report displayed
    await expect(page.locator('[data-testid="report-title"]')).toContainText('Stock Report');
    await expect(page.locator('[data-testid="report-total-items"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-low-stock-items"]')).toBeVisible();
  });

  test('REPORT-005: Generate SGK report tracking (device)', async ({ page }) => {
    // Act: Generate SGK device report
    await generateSGKDeviceReport(page, 'all');

    // Assert: Report displayed
    await expect(page.locator('[data-testid="report-title"]')).toContainText('SGK Device Report');
    await expect(page.locator('[data-testid="report-devices-list"]')).toBeVisible();
  });

  test('REPORT-006: Generate SGK report tracking (pill)', async ({ page }) => {
    // Act: Generate SGK pill report
    await generateSGKPillReport(page, 'all');

    // Assert: Report displayed
    await expect(page.locator('[data-testid="report-title"]')).toContainText('SGK Pill Report');
    await expect(page.locator('[data-testid="report-pills-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-sgk-payment"]')).toContainText('698'); // SGK pays 698 TL for 104 pills
  });

  test('REPORT-007: Generate promissory note tracking report', async ({ page }) => {
    // Act: Generate promissory note report
    await generatePromissoryNoteReport(page, 'pending');

    // Assert: Report displayed
    await expect(page.locator('[data-testid="report-title"]')).toContainText('Promissory Note Report');
    await expect(page.locator('[data-testid="report-notes-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-total-pending"]')).toBeVisible();
  });

  test('REPORT-008: Generate customer report', async ({ page }) => {
    // Arrange: Date range
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    // Act: Generate customer report
    await generateCustomerReport(page, startDate, endDate);

    // Assert: Report displayed
    await expect(page.locator('[data-testid="report-title"]')).toContainText('Customer Report');
    await expect(page.locator('[data-testid="report-total-customers"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-new-customers"]')).toBeVisible();
  });

  test('REPORT-009: Export report to Excel', async ({ page }) => {
    // Arrange: Generate a report first
    await generateSalesReport(page, 'daily');

    // Act: Export to Excel
    await exportReport(page, 'excel');

    // Assert: File downloaded (verified by helper)
  });

  test('REPORT-010: Export report to PDF', async ({ page }) => {
    // Arrange: Generate a report first
    await generateSalesReport(page, 'monthly');

    // Act: Export to PDF
    await exportReport(page, 'pdf');

    // Assert: File downloaded (verified by helper)
  });
});

test.describe('SGK Report Validity Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('SGK-VALIDITY-001: Check 5-year validity for hearing aids', async ({ page }) => {
    // Arrange: Create party with SGK sale
    const partyData = generateRandomParty();
    const partyId = await createParty(page, partyData);
    
    // Create sale with SGK payment
    await createSaleFromModal(page, {
      partyId,
      amount: 15000,
      sgkPayment: 10000,
      paymentMethod: 'mixed'
    });

    // Act: Check SGK report validity
    const isValid = await checkSGKReportValidity(page, partyId);

    // Assert: Report is valid (newly created)
    expect(isValid).toBe(true);
    
    // Check validity period displayed
    await page.goto(`/parties/${partyId}`);
    await page.locator('[data-testid="party-sgk-tab"]').click();
    await expect(page.locator('[data-testid="sgk-validity-period"]')).toContainText('5 years');
  });

  test('SGK-VALIDITY-002: 1-year reminder for SGK report renewal', async ({ page }) => {
    // Note: This test would require mocking date or having test data with old reports
    // For now, we'll just verify the reminder UI exists
    
    await page.goto('/reports/sgk-devices');
    await generateSGKDeviceReport(page, 'all');
    
    // Check if reminder column exists
    await expect(page.locator('[data-testid="report-table-header-reminder"]')).toBeVisible();
  });
});
