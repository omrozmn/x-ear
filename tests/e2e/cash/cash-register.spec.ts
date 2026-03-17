import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createCashIncome,
  createCashExpense,
  updateCashRecord,
  deleteCashRecord,
  searchCashRecords,
  filterCashRecordsByDate,
  filterCashRecordsByType,
  exportCashRecords,
  viewCashSummary
} from '../../helpers/cash';

test.describe('Cash Register Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('CASH-001: Create cash record (income)', async ({ page }) => {
    // Act: Create income record
    const recordId = await createCashIncome(page, {
      amount: 5000,
      description: 'Device sale payment',
      notes: 'Cash payment received'
    });

    // Assert: Record created successfully
    expect(recordId).toBeTruthy();
    await page.goto(`/cashflow/${recordId}`);
    await expect(page.locator('[data-testid="cash-type"]')).toContainText('income');
    await expect(page.locator('[data-testid="cash-amount"]')).toContainText('5000');
  });

  test('CASH-002: Create cash record (expense)', async ({ page }) => {
    // Act: Create expense record
    const recordId = await createCashExpense(page, {
      amount: 1500,
      description: 'Office supplies',
      notes: 'Monthly supplies purchase'
    });

    // Assert: Record created successfully
    expect(recordId).toBeTruthy();
    await page.goto(`/cashflow/${recordId}`);
    await expect(page.locator('[data-testid="cash-type"]')).toContainText('expense');
    await expect(page.locator('[data-testid="cash-amount"]')).toContainText('1500');
  });

  test('CASH-003: Create cash record with tag', async ({ page }) => {
    // Act: Create record with tags
    const recordId = await createCashIncome(page, {
      amount: 3000,
      description: 'Accessory sale',
      tags: ['accessories', 'retail'],
      notes: 'Battery pack sale'
    });

    // Assert: Record created with tags
    expect(recordId).toBeTruthy();
    await page.goto(`/cashflow/${recordId}`);
    await expect(page.locator('[data-testid="cash-tags"]')).toContainText('accessories');
    await expect(page.locator('[data-testid="cash-tags"]')).toContainText('retail');
  });

  test('CASH-004: Update cash record', async ({ page }) => {
    // Arrange: Create record
    const recordId = await createCashIncome(page, {
      amount: 2000,
      description: 'Initial description'
    });

    // Act: Update record
    await updateCashRecord(page, recordId, {
      amount: 2500,
      description: 'Updated description',
      notes: 'Amount corrected'
    });

    // Assert: Record updated
    await page.goto(`/cashflow/${recordId}`);
    await expect(page.locator('[data-testid="cash-amount"]')).toContainText('2500');
    await expect(page.locator('[data-testid="cash-description"]')).toContainText('Updated description');
  });

  test('CASH-005: Delete cash record', async ({ page }) => {
    // Arrange: Create record
    const recordId = await createCashExpense(page, {
      amount: 500,
      description: 'Record to delete'
    });

    // Act: Delete record
    await deleteCashRecord(page, recordId);

    // Assert: Record deleted (404 on detail page)
    await page.goto(`/cashflow/${recordId}`);
    await expect(page.locator('[data-testid="not-found-message"]')).toBeVisible();
  });

  test('CASH-006: Search cash records', async ({ page }) => {
    // Arrange: Create record with unique description
    await createCashIncome(page, {
      amount: 1000,
      description: 'Unique search term for cash'
    });

    // Act: Search for record
    await searchCashRecords(page, 'Unique search term');

    // Assert: Record found in search results
    await expect(page.locator('[data-testid="cash-list-item"]').first()).toContainText('Unique search term');
  });

  test('CASH-007: Filter cash records by date', async ({ page }) => {
    // Arrange: Create record
    await createCashIncome(page, {
      amount: 2000,
      description: 'Today\'s income'
    });

    // Act: Filter by today's date
    const today = new Date().toISOString().split('T')[0];
    await filterCashRecordsByDate(page, today, today);

    // Assert: Filtered results shown
    await expect(page.locator('[data-testid="cash-list-item"]')).toHaveCount(1);
  });

  test('CASH-008: Filter cash records by type', async ({ page }) => {
    // Arrange: Create income and expense records
    await createCashIncome(page, {
      amount: 3000,
      description: 'Income record'
    });
    await createCashExpense(page, {
      amount: 1000,
      description: 'Expense record'
    });

    // Act: Filter by income type
    await filterCashRecordsByType(page, 'income');

    // Assert: Only income records shown
    await expect(page.locator('[data-testid="cash-type-badge"]').first()).toContainText('income');
  });

  test('CASH-009: Export cash records to PDF', async ({ page }) => {
    // Arrange: Create some records
    await createCashIncome(page, {
      amount: 5000,
      description: 'Export test income'
    });
    await createCashExpense(page, {
      amount: 2000,
      description: 'Export test expense'
    });

    // Act: Export to PDF
    await exportCashRecords(page, 'pdf');

    // Assert: File downloaded (verified by helper)
  });

  test('CASH-010: View cash summary on dashboard', async ({ page }) => {
    // Arrange: Create some records
    await createCashIncome(page, {
      amount: 10000,
      description: 'Large income'
    });
    await createCashExpense(page, {
      amount: 3000,
      description: 'Small expense'
    });

    // Act: View cash summary
    await viewCashSummary(page);

    // Assert: Summary displayed with totals
    await expect(page.locator('[data-testid="cash-summary-total-income"]')).toBeVisible();
    await expect(page.locator('[data-testid="cash-summary-total-expense"]')).toBeVisible();
    await expect(page.locator('[data-testid="cash-summary-net-balance"]')).toBeVisible();
  });
});
