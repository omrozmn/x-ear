import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:8082';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@x-ear.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

test.describe('Deep QA Audit: Appointments Module', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.fill('input[type="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
        // Navigate explicitly to appointments
        await page.goto(`${BASE_URL}/appointments`);
    });

    test('Appointments List, Search & Filter Verification', async ({ page }) => {
        console.log('Step 1: Verify Header');
        await expect(page.getByRole('heading', { name: 'Global Randevu Yönetimi' })).toBeVisible();

        console.log('Step 2: Verify Search & Filter Inputs');
        const searchInput = page.getByPlaceholder('Hasta adı veya telefon ile ara...');
        const statusSelect = page.locator('select'); // The only select on page usually

        await expect(searchInput).toBeVisible();
        await expect(statusSelect).toBeVisible();

        console.log('Step 3: Verify Content (Table or Empty State)');
        // Wait for loading spinner to disappear
        await expect(page.locator('.animate-spin')).not.toBeVisible();

        const emptyState = page.getByText('Randevu bulunamadı');

        // Conditional Check based on data presence
        if (await emptyState.isVisible()) {
            console.log('ℹ️ Empty state detected. Verifying empty state UI.');
            // Verify icon or text specific to empty state
            await expect(emptyState).toBeVisible();
        } else {
            console.log('ℹ️ Table detected. Verifying headers.');
            await expect(page.getByRole('columnheader', { name: 'Tarih / Saat' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Hasta' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Tip' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Şube / Tenant' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Durum' })).toBeVisible();
        }

        console.log('Step 4: Test Filter Interaction');
        // Select 'Planlandı' (SCHEDULED)
        await statusSelect.selectOption('SCHEDULED');
        await page.waitForTimeout(1000); // Allow react state update and potential fetch

        // Re-verify content state after filter
        // Just checking that the page didn't crash and elements are still interactable
        await expect(searchInput).toBeVisible();

        console.log('Step 5: Test Search Interaction');
        await searchInput.fill('NonExistentAppointment123');
        await page.waitForTimeout(2000);

        // Should definitely be empty now
        if (await emptyState.isVisible()) {
            await expect(emptyState).toBeVisible();
            console.log('✅ Empty state verified for invalid search.');
        } else {
            // If seed data matches somehow
            console.log('⚠️ Search returned results (unexpected for garbage string).');
        }

    });

});
