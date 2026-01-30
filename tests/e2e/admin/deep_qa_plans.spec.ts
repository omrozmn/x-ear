import { test, expect } from '@playwright/test';

test.describe('Deep QA Audit: Plans Module', () => {
    const BASE_URL = process.env.WEB_BASE_URL || 'http://localhost:8082';

    test.beforeEach(async ({ page }) => {
        // Login as admin
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', 'admin@x-ear.com');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
        await page.goto(`${BASE_URL}/plans`);
    });

    test('Plans CRUD Lifecycle', async ({ page }) => {
        const planName = `Test Plan ${Date.now()}`;
        const planDesc = 'Standard test plan description';
        const updatedName = `Updated Plan ${Date.now()}`;

        console.log('Step 1: Create Plan');
        await page.click('button:has-text("Plan Ekle")');

        await page.fill('label:has-text("Plan Adı") + input', planName);
        await page.fill('label:has-text("Fiyat") + input', '150');
        await page.fill('label:has-text("Açıklama") + textarea', planDesc);

        await page.click('button[type="submit"]:has-text("Oluştur")');

        // Verify creation
        await expect(page.locator('text=Plan oluşturuldu')).toBeVisible();
        // Plans table usually shows name in a div
        await expect(page.locator(`div:has-text("${planName}")`).first()).toBeVisible();
        console.log('✅ Plan Created');

        console.log('Step 2: Update Plan');
        // Find Edit button for our plan
        const row = page.locator('tr').filter({ hasText: planName });
        await row.locator('button[title="Düzenle"]').click();

        await page.fill('label:has-text("Plan Adı") + input', updatedName);
        await page.click('button[type="submit"]:has-text("Güncelle")');

        await expect(page.locator('text=Plan güncellendi')).toBeVisible();
        await expect(page.locator(`div:has-text("${updatedName}")`).first()).toBeVisible();
        console.log('✅ Plan Updated');

        console.log('Step 3: Toggle Status');
        const updatedRow = page.locator('tr').filter({ hasText: updatedName });
        await updatedRow.locator('button:has-text("Pasife Al")').click();

        // Wait for confirmation modal
        await page.click('button:has-text("Onayla")');
        await expect(page.locator('text=Plan durumu güncellendi')).toBeVisible();
        await expect(updatedRow.locator('text=Pasif')).toBeVisible();
        console.log('✅ Status Toggled');

        console.log('Step 4: Delete Plan');
        await updatedRow.locator('button[title="Sil"]').click();
        await page.click('button:has-text("Sil")');

        await expect(page.locator('text=Plan silindi')).toBeVisible();
        await expect(page.locator(`div:has-text("${updatedName}")`)).not.toBeVisible();
        console.log('✅ Plan Deleted');
    });
});
