import { test, expect } from '../fixtures/fixtures';

test.describe('New Invoice Creation', () => {

    test('should display new invoice page', async ({ tenantPage }) => {
        await tenantPage.goto('/invoices/new');
        await tenantPage.waitForLoadState('networkidle');

        // Verify page loads
        const heading = tenantPage.locator('h1, h2, h3, [role="heading"]').first();
        await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('should have customer selection', async ({ tenantPage }) => {
        await tenantPage.goto('/invoices/new');
        await tenantPage.waitForLoadState('networkidle');

        // Look for customer/party selector
        const customerField = tenantPage.locator('input, select, [class*="select"], [class*="customer"]').first();
        await expect(customerField).toBeVisible({ timeout: 10000 });
    });

    test('should have add product/service button', async ({ tenantPage }) => {
        await tenantPage.goto('/invoices/new');
        await tenantPage.waitForLoadState('networkidle');

        // Look for add item button
        const addButton = tenantPage.getByRole('button', { name: /Ekle|Add|Ürün|Hizmet|Product|Service/i }).first();
        await expect(addButton).toBeVisible({ timeout: 5000 });
    });

    test('should show invoice total', async ({ tenantPage }) => {
        await tenantPage.goto('/invoices/new');
        await tenantPage.waitForLoadState('networkidle');

        // Look for total or summary section
        const totalSection = tenantPage.locator('text=/Toplam|Total|Tutar|KDV|VAT/i').first();
        await expect(totalSection).toBeVisible({ timeout: 10000 });
    });

    test('should have save/create button', async ({ tenantPage }) => {
        await tenantPage.goto('/invoices/new');
        await tenantPage.waitForLoadState('networkidle');

        // Look for save button
        // Look for save button "Fatura Oluştur"
        const saveButton = tenantPage.getByRole('button', { name: 'Fatura Oluştur' }).first();
        await expect(saveButton).toBeVisible({ timeout: 5000 });
    });
});
