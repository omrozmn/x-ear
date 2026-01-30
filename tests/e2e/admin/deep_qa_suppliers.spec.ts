import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:8082';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@x-ear.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

test.describe('Deep QA Audit: Suppliers Module', () => {

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.fill('input[type="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
        await page.goto(`${BASE_URL}/suppliers`);
    });

    test('Supplier CRUD Lifecycle', async ({ page }) => {
        const uniqueId = Date.now().toString();
        const supplierName = `Test Supplier ${uniqueId}`;
        const updatedName = `Test Supplier ${uniqueId} Updated`;
        const supplierEmail = `supplier${uniqueId}@test.com`;

        console.log('Step 0: Ensure Tenant Exists');
        await page.goto(`${BASE_URL}/tenants`);
        await page.waitForLoadState('networkidle');
        const tenantCount = await page.locator('table tbody tr').count();
        if (tenantCount === 0 || (await page.getByText('Kayıt bulunamadı').isVisible())) {
            console.log('No tenants found, creating one...');
            await page.getByRole('button', { name: 'Yeni Abone Ekle' }).click();
            const modal = page.locator('div[role="dialog"]');
            await modal.locator('input[type="text"]').fill(`Supplier_Test_Tenant_${uniqueId}`);
            await modal.locator('input[type="email"]').fill(`tenant_${uniqueId}@test.com`);
            await modal.getByRole('button', { name: 'Oluştur' }).click();
            await expect(page.locator('text=Abone başarıyla oluşturuldu').or(page.locator('text=Aboneler'))).toBeVisible();
        }
        await page.goto(`${BASE_URL}/suppliers`);
        await page.waitForLoadState('networkidle');

        console.log('Step 1: Open Create Modal');
        await page.getByRole('button', { name: 'Yeni Tedarikçi' }).click();
        await expect(page.getByRole('heading', { name: 'Yeni Tedarikçi Ekle' })).toBeVisible();

        // Use modal scoping for better reliability
        const modal = page.locator('.fixed.inset-0').last();

        console.log('Step 2: Create Supplier');
        // Wait for tenants to load
        const tenantSelect = modal.getByText('Abone (Tenant) *').locator('..').locator('select');
        await expect(async () => {
            const count = await tenantSelect.locator('option').count();
            expect(count).toBeGreaterThan(1);
        }).toPass({ timeout: 10000 });

        // Select Tenant (select 2nd option, index 1, as 0 is placeholder)
        await tenantSelect.selectOption({ index: 1 });

        await modal.getByText('Firma Adı *').locator('..').locator('input').fill(supplierName);
        await modal.getByText('E-posta').locator('..').locator('input').fill(supplierEmail);

        // Setup response listener for debugging
        const responsePromise = page.waitForResponse(resp => resp.url().includes('/suppliers') && resp.request().method() === 'POST', { timeout: 5000 }).catch(() => null);

        await modal.getByRole('button', { name: 'Kaydet' }).click();

        const response = await responsePromise;
        if (response) {
            console.log(`Create Response Status: ${response.status()}`);
            if (!response.ok()) {
                const body = await response.text();
                throw new Error(`API Error: ${response.status()} - ${body}`);
            }
        } else {
            console.log('⚠️ No API response captured (timeout or not triggered). Logic issue?');
        }

        // Let's try to be precise:
        // Input 1: Company Name
        // Input 2: Contact Name
        // Input 3: Email
        // Input 4: Phone


        console.log('Step 3: Verify Creation');
        await expect(page.getByText('Tedarikçi başarıyla oluşturuldu')).toBeVisible();
        await expect(modal).not.toBeVisible();

        // Verify in list
        const searchInput = page.getByPlaceholder('Tedarikçi ara...');
        await searchInput.fill(supplierName);
        await page.waitForTimeout(1000);
        await expect(page.getByRole('cell', { name: supplierName })).toBeVisible();

        console.log('Step 4: Edit Supplier');
        await page.locator('button.text-indigo-600').first().click(); // Edit button
        const editModal = page.locator('div[role="dialog"]');
        await expect(editModal.getByRole('heading', { name: 'Tedarikçi Düzenle' })).toBeVisible();

        // Update Name
        const nameInput = editModal.locator('input').nth(1); // 0 is tenant, 1 is company name
        await nameInput.fill(updatedName);
        await editModal.getByRole('button', { name: 'Kaydet' }).click();

        // Verify update
        await expect(page.locator('text=Tedarikçi güncellendi')).toBeVisible();

        // Wait for list to sync
        await searchInput.clear();
        await searchInput.fill(updatedName);
        await expect(page.locator('td').filter({ hasText: updatedName })).toBeVisible({ timeout: 10000 });
        console.log('✅ Edit Successful');

        console.log('Step 5: Delete Supplier');
        page.on('dialog', dialog => dialog.accept());
        await page.locator('button.text-red-600').first().click(); // Delete button
        await expect(page.locator('text=Tedarikçi silindi')).toBeVisible();
        await expect(page.getByRole('cell', { name: updatedName })).not.toBeVisible();
        console.log('✅ Delete Successful');
        await searchInput.fill(updatedName);
        await page.waitForTimeout(1000);
        await expect(page.getByText('Kayıt bulunamadı')).toBeVisible();
    });

});
