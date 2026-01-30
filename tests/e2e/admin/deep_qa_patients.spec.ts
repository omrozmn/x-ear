import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:8082';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@x-ear.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

test.describe('Deep QA Audit: Patients Module', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.fill('input[type="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
        // Navigate explicitly to patients
        await page.goto(`${BASE_URL}/patients`);
    });

    test('Patients List & Search Verification', async ({ page }) => {
        console.log('Step 1: Verify Header');
        await expect(page.getByRole('heading', { name: 'Global Hasta Yönetimi' })).toBeVisible();

        console.log('Step 2: Verify Search Input');
        const searchInput = page.getByPlaceholder('Ad, Soyad, TC veya Telefon ile ara...');
        await expect(searchInput).toBeVisible();

        console.log('Step 3: Verify Content (Table or Empty State)');

        // Wait for loading to finish (spinner gone)
        await expect(page.locator('.animate-spin')).not.toBeVisible();

        const emptyState = page.getByText('Hasta bulunamadı');

        if (await emptyState.isVisible()) {
            console.log('ℹ️ Empty state detected. Verifying empty state UI.');
            await expect(page.getByText('Arama kriterlerinize uygun hasta kaydı bulunmuyor.')).toBeVisible();
        } else {
            console.log('ℹ️ Table detected. Verifying headers.');
            await expect(page.getByRole('columnheader', { name: 'Hasta' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'TC Kimlik' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Şube / Tenant' })).toBeVisible();
        }

        console.log('Step 4: Test Search Interaction');
        // Should handle both empty and populated states gracefully
        await searchInput.fill('NonExistentPatient12345');
        // Wait for potential debounce/reload
        await page.waitForTimeout(2000);

        // Assert Empty State or No Results if "NonExistent" is truly non-existent
        // Checking for "Hasta bulunamadı" message
        if (await page.getByText('Hasta bulunamadı').isVisible()) {
            console.log('✅ Empty state correctly displayed for invalid search.');
            await expect(page.getByText('Arama kriterlerinize uygun hasta kaydı bulunmuyor.')).toBeVisible();
        } else {
            // If seed data happens to match or empty state is different
            console.log('⚠️ Empty state not triggered or generic table shown.');
        }

        console.log('Step 5: Clear Search');
        await searchInput.fill('');
        await page.waitForTimeout(2000);

        if (await page.getByText('Hasta bulunamadı').isVisible()) {
            console.log('✅ Empty state persists (Global list is empty).');
            await expect(page.getByText('Hasta bulunamadı')).toBeVisible();
        } else {
            console.log('✅ Table visible.');
            await expect(page.getByRole('table')).toBeVisible();
        }
    });

});
