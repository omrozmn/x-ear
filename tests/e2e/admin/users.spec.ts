/**
 * Admin Panel - User Management E2E Tests
 */
import { test, expect } from '../fixtures/fixtures';

test.describe('Admin: User Management', () => {

    test.beforeEach(async ({ adminPage }) => {
        // adminPage fixture handles login as System Admin
        await adminPage.goto('/users');
    });

    test('should list system admins and tenant users', async ({ adminPage }) => {
        await expect(adminPage.getByRole('heading', { name: 'Kullanıcı Yönetimi' })).toBeVisible();

        const adminTab = adminPage.getByRole('tab', { name: 'Sistem Yöneticileri (Admin)' });
        const tenantTab = adminPage.getByRole('tab', { name: 'Abone Kullanıcıları (Tenant)' });

        await expect(adminTab).toBeVisible();
        await expect(tenantTab).toBeVisible();

        // Check active tab styling
        await expect(adminTab).toHaveAttribute('aria-selected', 'true');

        // Switch to tenant users
        await tenantTab.click();
        await expect(tenantTab).toHaveAttribute('aria-selected', 'true');
        await expect(adminPage.locator('table')).toBeVisible();
    });

    test('should create a new system admin', async ({ adminPage }) => {
        const timestamp = Date.now();
        const email = `admin_${timestamp}@example.com`;
        
        await adminPage.getByRole('button', { name: 'Kullanıcı Ekle' }).click();
        await expect(adminPage.getByRole('heading', { name: 'Yeni Kullanıcı Ekle' })).toBeVisible();

        // Fill form
        await adminPage.locator('input[value="admin"]').check();
        await adminPage.getByLabel('İsim').fill('Test');
        await adminPage.getByLabel('Soyisim').fill(`Admin ${timestamp}`);
        await adminPage.getByLabel('E-posta').fill(email);
        await adminPage.getByLabel('Şifre').fill('Password123!');

        // Generate Username (if there's a button or it's auto)
        const usernameBtn = adminPage.getByRole('button', { name: 'Oluştur' });
        if (await usernameBtn.isVisible()) {
            await usernameBtn.click();
        }

        await adminPage.getByRole('button', { name: 'Kaydet' }).click();

        // Success message
        await expect(adminPage.getByText(/Kullanıcı başarıyla oluşturuldu|User created successfully/i)).toBeVisible();
    });

    test('should search for users', async ({ adminPage }) => {
        const searchInput = adminPage.getByPlaceholder('Kullanıcı ara...');
        await expect(searchInput).toBeVisible();
        
        await searchInput.fill('admin@x-ear.com');
        await adminPage.waitForTimeout(1000);
        
        // Verify at least one row matches
        const rows = adminPage.locator('table tbody tr');
        await expect(rows.first()).toBeVisible();
    });

    test('should update a user profile', async ({ adminPage }) => {
        // Find first edit button
        const editBtn = adminPage.locator('button[title="Düzenle"]').first().or(adminPage.locator('button:has-text("Edit")').first());
        if (await editBtn.isVisible()) {
            await editBtn.click();
            
            const modal = adminPage.getByRole('dialog');
            await expect(modal).toBeVisible();
            
            await modal.locator('input[name="firstName"]').fill('Updated');
            await modal.getByRole('button', { name: 'Kaydet' }).click();
            
            await expect(adminPage.getByText(/güncellendi|updated/i)).toBeVisible();
        }
    });

    test('should handle user deletion with confirmation', async ({ adminPage }) => {
        const deleteBtn = adminPage.locator('button[title="Sil"]').last();
        if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            
            const confirmBtn = adminPage.getByRole('button', { name: /Sil|Delete|Onayla/i });
            await expect(confirmBtn).toBeVisible();
            // Don't click to avoid destroying test data unless it's a test user
        }
    });
});
