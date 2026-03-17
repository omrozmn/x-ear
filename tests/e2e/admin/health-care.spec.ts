/**
 * Admin Panel - Global Patients & Appointments E2E Tests
 */
import { test, expect } from '../fixtures/fixtures';

test.describe('Admin: Health Care Modules', () => {

    test('should list patients across all tenants', async ({ adminPage }) => {
        await adminPage.goto('/patients');
        await expect(adminPage.getByRole('heading', { name: /Hastalar|Patients/i }).first()).toBeVisible();
        await expect(adminPage.locator('table')).toBeVisible();
    });

    test('should view patient details from admin panel', async ({ adminPage }) => {
        await adminPage.goto('/patients');
        const firstRow = adminPage.locator('table tbody tr').first();
        if (await firstRow.isVisible()) {
            await firstRow.click();
            await expect(adminPage).toHaveURL(/\/patients\/.+/);
            await expect(adminPage.getByText(/Detay|Detail|Profil/i).first()).toBeVisible();
        }
    });

    test('should list all appointments', async ({ adminPage }) => {
        await adminPage.goto('/appointments');
        await expect(adminPage.getByRole('heading', { name: /Randevular|Appointments/i }).first()).toBeVisible();
        await expect(adminPage.locator('table, .calendar').first()).toBeVisible();
    });

    test('should filter appointments by date', async ({ adminPage }) => {
        await adminPage.goto('/appointments');
        const datePicker = adminPage.locator('input[type="date"]').first();
        if (await datePicker.isVisible()) {
            await datePicker.fill('2026-02-12');
            await adminPage.waitForTimeout(500);
            // Verify filter
        }
    });
});
