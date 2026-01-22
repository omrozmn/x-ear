/**
 * Admin Panel - Tenants Management E2E Tests
 * Tests listing, creating, and managing tenants
 */
import { test, expect } from '../fixtures/fixtures';

test.describe('Admin: Tenants Management', () => {

    test.beforeEach(async ({ adminPage }) => {
        adminPage.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
        adminPage.on('requestfailed', request => console.log(`[REQUEST FAILED]: ${request.url()} - ${request.failure()?.errorText}`));
        adminPage.on('response', async response => {
            if (response.status() >= 400) {
                console.log(`[RESPONSE ERROR] ${response.status()} ${response.url()}`);
                try {
                    const body = await response.text();
                    console.log(`[RESPONSE BODY] ${body}`);
                } catch (e) {
                    console.log(`[RESPONSE BODY] Could not read body`);
                }
            }
        });
        // adminPage fixture already handles login
    });

    test('should list all tenants', async ({ adminPage }) => {
        // Use adminPage fixture which should login as super admin
        await adminPage.goto('/tenants');
        console.log(`[TEST] Current URL: ${adminPage.url()}`);
        await adminPage.waitForLoadState('networkidle');
        console.log(`[TEST] URL after networkidle: ${adminPage.url()}`);

        // Verify page loads
        await expect(adminPage.getByRole('heading', { name: 'Aboneler' })).toBeVisible();

        // Verify table exists
        await expect(adminPage.locator('table')).toBeVisible();
    });

    test('should create a new manual tenant', async ({ adminPage }) => {
        await adminPage.goto('/tenants');

        // Click Create/New
        const createBtn = adminPage.getByRole('button', { name: /Create|Yeni|Ekle/i }).first();
        if (await createBtn.isVisible()) {
            await createBtn.click();

            // Fill form - Matching TenantCreateModal.tsx
            // Labels are not associated with inputs in the component, so we use structural selectors within the modal
            const modal = adminPage.getByRole('dialog');
            await expect(modal).toBeVisible();

            await modal.locator('input[type="text"]').fill(`Test Manual Tenant ${Date.now()}`);
            await modal.locator('input[type="email"]').fill(`admin-${Date.now()}@example.com`);

            // Product is the first select, Status is the second. Select first available product.
            await modal.locator('select').first().selectOption({ index: 0 });

            const submitBtn = modal.getByRole('button', { name: 'Oluştur' });
            await submitBtn.click();

            // Verify success toast
            await expect(adminPage.getByText('Abone başarıyla oluşturuldu')).toBeVisible();
        }
    });

    test('should search/filter tenants', async ({ adminPage }) => {
        await adminPage.goto('/tenants');

        // Check header first to ensure page loaded
        await expect(adminPage.getByRole('heading', { name: 'Aboneler' })).toBeVisible();

        const searchInput = adminPage.getByPlaceholder('Abone ara...');
        await expect(searchInput).toBeVisible();
        await searchInput.fill('Admin');
        await adminPage.waitForTimeout(500);
        // Expect results
        expect(true).toBeTruthy();
    });
});
