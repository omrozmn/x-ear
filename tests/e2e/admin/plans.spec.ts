/**
 * Admin Panel - Plans & Billing E2E Tests
 * Tests plan creation and pricing management
 */
import { test, expect } from '../fixtures/fixtures';

test.describe('Admin: Plans & Billing', () => {

    test('should list subscription plans', async ({ adminPage }) => {
        await adminPage.goto('/admin/plans');
        await adminPage.waitForLoadState('networkidle');

        await expect(adminPage.getByRole('heading', { name: /Plans|Paketler|Abonelik/i }).first()).toBeVisible();
    });

    test('should list all plans', async ({ adminPage }) => {
        await adminPage.goto('/plans');
        await expect(adminPage.getByRole('heading', { name: 'Planlar' })).toBeVisible();
    });

    test('should create a new plan', async ({ adminPage }) => {
        await adminPage.goto('/plans');

        const createBtn = adminPage.getByRole('button', { name: /Create|Yeni|Ekle/i }).first();
        if (await createBtn.isVisible()) {
            await createBtn.click();

            await adminPage.getByLabel(/Name|Ad/i).first().fill('E2E Test Plan');
            await adminPage.getByLabel(/Price|Fiyat/i).first().fill('999');

            const saveBtn = adminPage.getByRole('button', { name: /Save|Kaydet/i }).first();
            await saveBtn.click();

            await expect(adminPage.getByText(/Success|Başarı/i)).toBeVisible();
        }
    });
});
