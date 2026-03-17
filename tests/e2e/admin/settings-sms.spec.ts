/**
 * Admin Panel - System Settings & SMS E2E Tests
 */
import { test, expect } from '../fixtures/fixtures';

test.describe('Admin: System Settings', () => {

    test('should load system settings', async ({ adminPage }) => {
        await adminPage.goto('/settings');
        await expect(adminPage.getByRole('heading', { name: /Ayarlar|Settings/i }).first()).toBeVisible();
    });

    test('should manage SMS campaigns', async ({ adminPage }) => {
        await adminPage.goto('/sms/campaigns').catch(() => adminPage.goto('/campaigns'));
        await expect(adminPage.getByRole('heading', { name: /Kampanyalar|Campaigns/i }).first()).toBeVisible();
        
        const createBtn = adminPage.getByRole('button', { name: /Yeni Kampanya|Create Campaign/i }).first();
        if (await createBtn.isVisible()) {
            await createBtn.click();
            await expect(adminPage.getByRole('dialog')).toBeVisible();
        }
    });

    test('should view SMS logs', async ({ adminPage }) => {
        await adminPage.goto('/sms/logs').catch(() => adminPage.goto('/sms'));
        await expect(adminPage.getByRole('heading', { name: /SMS/i }).first()).toBeVisible();
    });
});
