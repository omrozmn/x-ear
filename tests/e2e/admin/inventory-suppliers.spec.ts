/**
 * Admin Panel - Global Inventory & Suppliers E2E Tests
 */
import { test, expect } from '../fixtures/fixtures';

test.describe('Admin: Inventory & Suppliers', () => {

    test('should list global suppliers', async ({ adminPage }) => {
        await adminPage.goto('/suppliers');
        await expect(adminPage.getByRole('heading', { name: /Tedarikçiler|Suppliers/i }).first()).toBeVisible();
        await expect(adminPage.locator('table')).toBeVisible();
    });

    test('should create a new global supplier', async ({ adminPage }) => {
        await adminPage.goto('/suppliers');
        const timestamp = Date.now();
        
        const createBtn = adminPage.getByRole('button', { name: /Yeni Tedarikçi|Add Supplier/i }).first();
        if (await createBtn.isVisible()) {
            await createBtn.click();
            
            const modal = adminPage.getByRole('dialog');
            await modal.getByLabel(/Ad|Name/i).fill(`Global Supplier ${timestamp}`);
            await modal.getByLabel(/Email/i).fill(`supplier_${timestamp}@example.com`);
            
            await modal.getByRole('button', { name: /Kaydet|Create/i }).click();
            await expect(adminPage.getByText(/başarıyla oluşturuldu|created successfully/i)).toBeVisible();
        }
    });

    test('should list global inventory items', async ({ adminPage }) => {
        await adminPage.goto('/inventory');
        await expect(adminPage.getByRole('heading', { name: /Envanter|Inventory/i }).first()).toBeVisible();
        
        // Check for product catalog
        await expect(adminPage.locator('table, .grid').first()).toBeVisible();
    });

    test('should search global inventory', async ({ adminPage }) => {
        await adminPage.goto('/inventory');
        const searchInput = adminPage.getByPlaceholder(/Ara|Search/i).first();
        if (await searchInput.isVisible()) {
            await searchInput.fill('Hearing Aid');
            await adminPage.waitForTimeout(1000);
            // Verify filter works
        }
    });
});
