import { test, expect } from '../fixtures/fixtures';

test.describe('Invoices', () => {

    test('should create a new invoice', async ({ tenantPage }) => {
        await tenantPage.goto('/invoices/new');

        // Select Customer
        // Mock selection

        // add items

        // Verify Totals
        // await expect(tenantPage.getByTestId('total-amount')).toContainText('100.00');

        // Save
    });

    test('should calculate taxes correctly', async ({ tenantPage }) => {
        // Edge case: Tax inclusive vs exclusive
        await tenantPage.goto('/invoices/new');

        // Select product with 18% (or 20%) tax
        // Check calculated tax amount
    });

    test('should allow cancellation of draft invoice', async ({ tenantPage }) => {
        // Create draft
        // Click Cancel
        // Verify status change
    });
});
