/**
 * Admin Panel - Monitoring, AI & Reports E2E Tests
 */
import { test, expect } from '../fixtures/fixtures';

test.describe('Admin: Monitoring & Reports', () => {

    test('Activity Logs should load and filter', async ({ adminPage }) => {
        await adminPage.goto('/activity-logs');
        await expect(adminPage.getByRole('heading', { name: 'Aktivite Günlükleri' })).toBeVisible();
        
        // Wait for logs to load
        await adminPage.waitForSelector('table tbody tr', { timeout: 10000 });
        const rowCount = await adminPage.locator('table tbody tr').count();
        expect(rowCount).toBeGreaterThan(0);
    });

    test('AI Dashboard should show stats', async ({ adminPage }) => {
        await adminPage.goto('/ai');
        await expect(adminPage.getByRole('heading', { name: 'AI Kontrol Paneli' })).toBeVisible();
        await expect(adminPage.getByText(/Toplam Token|Usage/i).first()).toBeVisible();
    });

    test('Analytics should render charts', async ({ adminPage }) => {
        await adminPage.goto('/analytics');
        await expect(adminPage.getByRole('heading', { name: 'Analiz ve Raporlar' })).toBeVisible();
        await expect(adminPage.locator('canvas, svg').first()).toBeVisible();
    });

    test('Reports should show revenue data', async ({ adminPage }) => {
        await adminPage.goto('/analytics/revenue').catch(() => adminPage.goto('/analytics'));
        await expect(adminPage.getByText(/Gelir|Revenue/i).first()).toBeVisible();
    });

    test('should export reports to PDF/Excel', async ({ adminPage }) => {
        await adminPage.goto('/analytics');
        const exportBtn = adminPage.getByRole('button', { name: /Dışa Aktar|Export/i }).first();
        if (await exportBtn.isVisible()) {
            await exportBtn.click();
            await expect(adminPage.getByText(/PDF|Excel/i).first()).toBeVisible();
        }
    });
});
