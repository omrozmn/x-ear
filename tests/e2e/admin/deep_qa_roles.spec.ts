import { test, expect } from '@playwright/test';

test.describe('Deep QA Audit: Roles Module', () => {
    const BASE_URL = process.env.WEB_BASE_URL || 'http://localhost:8082';

    test.beforeEach(async ({ page }) => {
        // Login as admin (Global setup handles this, but we ensure we are on the right page)
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', 'admin@x-ear.com');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
        await page.goto(`${BASE_URL}/roles`);
    });

    test('Roles CRUD Lifecycle & Permissions', async ({ page }) => {
        const roleName = `Test Role ${Date.now()}`;
        const roleDesc = 'Test Role Description';

        console.log('Step 1: Create Role');
        await page.click('button:has-text("Yeni Rol")');
        await page.locator('[placeholder="Örn: Editor"]').fill(roleName);
        await page.fill('textarea', roleDesc);
        await page.click('button:has-text("Oluştur")');

        // Verify creation
        await expect(page.locator('text=Rol oluşturuldu')).toBeVisible();
        await expect(page.locator(`h3:has-text("${roleName}")`)).toBeVisible();
        console.log('✅ Role Created');

        console.log('Step 2: Assign Permissions');
        // Find our role card and click "İzinleri Düzenle"
        const roleCard = page.locator('div.bg-white').filter({ hasText: roleName });
        await roleCard.getByRole('button', { name: 'İzinleri Düzenle' }).click();

        await expect(page.getByText(`İzinleri Düzenle: ${roleName}`)).toBeVisible();

        // Toggle some permissions
        // We'll just toggle the first available checkbox in the first category
        const firstCheckbox = page.locator('input[type="checkbox"]').first();
        await firstCheckbox.check();

        await page.click('button:has-text("Kaydet")');
        await expect(page.locator('text=İzinler güncellendi')).toBeVisible();
        console.log('✅ Permissions Updated');

        console.log('Step 3: Delete Role');
        // Click trash icon in our role card
        page.on('dialog', dialog => dialog.accept());
        await roleCard.locator('button').filter({ has: page.locator('svg.w-5.h-5') }).click(); // The trash icon

        await expect(page.locator('text=Rol silindi')).toBeVisible();
        await expect(page.locator(`h3:has-text("${roleName}")`)).not.toBeVisible();
        console.log('✅ Role Deleted');
    });
});
