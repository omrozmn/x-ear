import { test, expect } from '../fixtures/fixtures';

test.describe('Web Settings', () => {

    test('should manage roles and permissions', async ({ tenantPage }) => {
        // RBAC: Only admin/owner can see this, tenantPage assumes owner
        await tenantPage.goto('/settings/roles');

        // Create new role "Sales Staff"
        await tenantPage.getByRole('button', { name: /Yeni Rol/i }).click();
        await tenantPage.getByLabel(/Rol Adı/i).fill('Sales Staff');

        // Check specific permissions
        // await tenantPage.getByLabel('POS Access').check();

        await tenantPage.getByRole('button', { name: 'Oluştur', exact: true }).click();
    });

    test('should config print settings', async ({ tenantPage }) => {
        await tenantPage.goto('/settings/printers');
        // Select default printer template (A4 / Thermal)
        // Verify preview
    });

    test('should update notification preferences', async ({ tenantPage }) => {
        await tenantPage.goto('/settings/notifications');
        // Toggle Email notifications
        // Toggle SMS notifications
    });
});
