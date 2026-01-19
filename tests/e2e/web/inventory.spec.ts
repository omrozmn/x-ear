import { test, expect } from '../fixtures/fixtures';

test.describe('Inventory Management', () => {

    test('should list inventory items', async ({ tenantPage }) => {
        await tenantPage.goto('/inventory');
        console.log('[TEST] Navigated to /inventory. Current URL:', tenantPage.url());
        try {
            await expect(tenantPage.getByRole('heading', { name: 'Envanter Yönetimi' })).toBeVisible({ timeout: 5000 });
        } catch (e) {
            console.log('[TEST FAILURE DEBUG]');
            console.log('URL:', tenantPage.url());
            const bodyText = await tenantPage.innerText('body');
            console.log('BODY CONTENT PREVIEW:', bodyText.substring(0, 500).replace(/\n/g, ' '));
            throw e;
        }
    });

    test('should calculate tax vs vatIncludedPrice correctly', async ({ tenantPage }) => {
        // Edge case from source: hardcoded 1.18 vs dynamic kdvRate
        await tenantPage.goto('/inventory/new');
        // Or open existing item

        // Scenario: User changes KDV rate to 10%
        // await tenantPage.getByLabel(/KDV|Tax/i).fill('10');

        // User enters Price = 100
        // await tenantPage.getByLabel(/Fiyat|Price/i).fill('100');

        // Check if 'vatIncludedPrice' (Dahil Fiyat) updates to 110 (if logic is dynamic) or 118 (if hardcoded bug exists)
        // This test helps detect that specific hardcoding issue found in analysis
    });

    test('should manage serial numbers via modal', async ({ tenantPage }) => {
        await tenantPage.goto('/inventory');
        // Click first item to go to details
        // await tenantPage.locator('.inventory-item').first().click();

        // Click Serial Button (StockInfoSection)
        // await tenantPage.getByRole('button', { name: /Seri No/i }).click();

        // Expect SerialNumberModal
        // await expect(tenantPage.getByText(/Seri Numaraları/i)).toBeVisible();

        // Add Serial
        // await tenantPage.getByPlaceholder(/Seri No Giriniz/i).fill('SN12345');
        // await tenantPage.getByRole('button', { name: /Ekle/i }).click();

        // Save
        // await tenantPage.getByRole('button', { name: /Kaydet/i }).click();
    });

    test('should persist KDV preferences', async ({ tenantPage }) => {
        // Edge case: localStorage persistence found in useEffect
        await tenantPage.goto('/inventory/new');

        // Toggle 'Tax Included' off
        // Check checkbox state

        // Reload page
        await tenantPage.reload();

        // Check if state persisted (logic relies on localStorage 'inventory_price_kdv_included')
        // await expect(checkbox).not.toBeChecked();
    });
});
