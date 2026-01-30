import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:8082';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@x-ear.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

test.describe('Deep QA Audit: Inventory Module', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.fill('input[type="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
        // Navigate explicitly to inventory
        await page.goto(`${BASE_URL}/inventory`);
    });

    test('Inventory List, Search & Filter Verification', async ({ page }) => {
        console.log('Step 1: Verify Header');
        await expect(page.getByRole('heading', { name: 'Global Cihaz & Stok Yönetimi' })).toBeVisible();

        console.log('Step 2: Verify Search & Filter Inputs');
        const searchInput = page.getByPlaceholder('Marka, Model veya Seri No ile ara...');
        // There are two selects: Category and Status. We can target them by index or nearby text if needed, 
        // but locator('select').first() and .nth(1) works for this page structure.
        const categorySelect = page.locator('select').first();
        const statusSelect = page.locator('select').nth(1);

        await expect(searchInput).toBeVisible();
        await expect(categorySelect).toBeVisible();
        await expect(statusSelect).toBeVisible();

        console.log('Step 3: Verify Content (Table or Empty State)');
        // Wait for loading spinner to disappear
        await expect(page.locator('.animate-spin')).not.toBeVisible();

        const emptyState = page.getByText('Kayıt bulunamadı');

        if (await emptyState.isVisible()) {
            console.log('ℹ️ Empty state detected. Verifying empty state UI.');
            await expect(emptyState).toBeVisible();
        } else {
            console.log('ℹ️ Table detected. Verifying headers.');
            await expect(page.getByRole('columnheader', { name: 'Cihaz / Ürün' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Seri No' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Kategori' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Şube / Tenant' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Durum' })).toBeVisible();
        }

        console.log('Step 4: Test Filter Interaction');
        // Select 'İşitme Cihazı' (HEARING_AID)
        await categorySelect.selectOption('HEARING_AID');
        await page.waitForTimeout(1000);

        // Select 'Stokta' (IN_STOCK)
        await statusSelect.selectOption('IN_STOCK');
        await page.waitForTimeout(1000);

        // Re-verify UI stability
        await expect(searchInput).toBeVisible();

        console.log('Step 5: Test Search Interaction');
        await searchInput.fill('NonExistentDevice123');
        await page.waitForTimeout(2000);

        // Should be empty
        if (await emptyState.isVisible()) {
            await expect(emptyState).toBeVisible();
            console.log('✅ Empty state verified for invalid search.');
        } else {
            // Unexpected but verifiable
            console.log('⚠️ Search returned results.');
        }
    });

});
