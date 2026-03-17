/**
 * Admin Panel - Payments & Integrations E2E Tests
 */
import { test, expect } from '../fixtures/fixtures';

test.describe('Admin: Payments & Integrations', () => {

    test('should list payments across all tenants', async ({ adminPage }) => {
        await adminPage.goto('/payments');
        await expect(adminPage.getByRole('heading', { name: /Ödemeler|Payments/i }).first()).toBeVisible();
        await expect(adminPage.locator('table')).toBeVisible();
    });

    test('should list and manage API keys', async ({ adminPage }) => {
        await adminPage.goto('/api-keys');
        await expect(adminPage.getByRole('heading', { name: /API Anahtarları|API Keys/i }).first()).toBeVisible();
        
        const createBtn = adminPage.getByRole('button', { name: /Yeni Anahtar|Create Key/i }).first();
        if (await createBtn.isVisible()) {
            await createBtn.click();
            await expect(adminPage.getByRole('dialog')).toBeVisible();
        }
    });

    test('should list integrations', async ({ adminPage }) => {
        await adminPage.goto('/integrations');
        await expect(adminPage.getByRole('heading', { name: /Entegrasyonlar|Integrations/i }).first()).toBeVisible();
        
        // Check for integration cards
        await expect(adminPage.locator('.card, .integration-item').first()).toBeVisible();
    });
});
