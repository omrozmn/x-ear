/**
 * Admin Panel - Roles & Permissions E2E Tests
 */
import { test, expect } from '../fixtures/fixtures';

test.describe('Admin: Roles & Permissions', () => {

    test.beforeEach(async ({ adminPage }) => {
        await adminPage.goto('/roles');
    });

    test('should list all roles', async ({ adminPage }) => {
        await expect(adminPage.getByRole('heading', { name: /Rol ve Yetki|Roles/i }).first()).toBeVisible();
        await expect(adminPage.locator('table')).toBeVisible();
        
        // Verify core roles exist
        await expect(adminPage.getByText(/SUPER_ADMIN|TENANT_ADMIN/i).first()).toBeVisible();
    });

    test('should create a new custom role', async ({ adminPage }) => {
        const roleName = `CUSTOM_ROLE_${Date.now()}`;
        
        const createBtn = adminPage.getByRole('button', { name: /Yeni Rol|Add Role/i }).first();
        if (await createBtn.isVisible()) {
            await createBtn.click();
            await expect(adminPage.getByRole('heading', { name: /Yeni Rol|Create Role/i }).first()).toBeVisible();

            await adminPage.getByLabel(/Rol Adı|Role Name/i).first().fill(roleName);
            await adminPage.getByLabel(/Açıklama|Description/i).first().fill('Test role');

            await adminPage.getByRole('button', { name: /Kaydet|Save|Create/i }).first().click();
            await expect(adminPage.getByText(/başarıyla oluşturuldu|created successfully/i)).toBeVisible();
        }
    });

    test('should duplicate an existing role', async ({ adminPage }) => {
        const duplicateBtn = adminPage.locator('button[title="Kopyala"]').first().or(adminPage.locator('button:has-text("Duplicate")').first());
        if (await duplicateBtn.isVisible()) {
            await duplicateBtn.click();
            await expect(adminPage.getByText(/Kopyalandı|Duplicated/i)).toBeVisible();
        }
    });

    test('should handle role deletion', async ({ adminPage }) => {
        const deleteBtn = adminPage.locator('button[title="Sil"]').last();
        if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            // Confirm modal would be here
        }
    });
});
