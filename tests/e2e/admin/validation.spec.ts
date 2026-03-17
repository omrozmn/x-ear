/**
 * Admin Panel - Form Validation E2E Tests
 */
import { test, expect } from '../fixtures/fixtures';

test.describe('Admin: Form Validations', () => {

    test('should validate Tenant Creation form', async ({ adminPage }) => {
        await adminPage.goto('/tenants');
        const createBtn = adminPage.getByRole('button', { name: /Yeni|Create/i }).first();
        if (await createBtn.isVisible()) {
            await createBtn.click();
            
            const submitBtn = adminPage.getByRole('button', { name: /Oluştur|Save/i });
            await submitBtn.click();
            
            // Should show error messages
            await expect(adminPage.locator('.text-red-500, .error-message').first()).toBeVisible();
        }
    });

    test('should validate User Creation form', async ({ adminPage }) => {
        await adminPage.goto('/users');
        await adminPage.getByRole('button', { name: /Kullanıcı Ekle|Add User/i }).click();
        
        const saveBtn = adminPage.getByRole('button', { name: /Kaydet|Save/i });
        await saveBtn.click();
        
        await expect(adminPage.locator('.text-red-500, .error-message').first()).toBeVisible();
    });

    test('should validate Role Creation form', async ({ adminPage }) => {
        await adminPage.goto('/roles');
        await adminPage.getByRole('button', { name: /Yeni Rol|Add Role/i }).click();
        
        const saveBtn = adminPage.getByRole('button', { name: /Kaydet|Save/i });
        await saveBtn.click();
        
        await expect(adminPage.locator('.text-red-500, .error-message').first()).toBeVisible();
    });

    test('should validate Plan Creation form', async ({ adminPage }) => {
        await adminPage.goto('/plans');
        const createBtn = adminPage.getByRole('button', { name: /Paket Ekle|New Plan/i }).first();
        if (await createBtn.isVisible()) {
            await createBtn.click();
            
            const saveBtn = adminPage.getByRole('button', { name: /Kaydet|Save/i }).first();
            await saveBtn.click();
            
            await expect(adminPage.locator('.text-red-500, .error-message').first()).toBeVisible();
        }
    });
});
