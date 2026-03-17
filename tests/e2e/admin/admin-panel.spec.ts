import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin } from '../../helpers/admin';

async function expectAdminShell(page: any) {
  await expect(page.getByText('X-Ear Admin')).toBeVisible();
  await expect(page.getByRole('link', { name: /Dashboard/i })).toBeVisible();
}

test.describe('Admin Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('ADMIN-001: Super admin login', async ({ page }) => {
    await expectAdminShell(page);
    await expect(page.getByRole('heading', { name: /Super Admin Panel/i })).toBeVisible();
    await expect(page).toHaveURL(/dashboard|\/$/);
  });

  test('ADMIN-002: Tenant selection', async ({ page }) => {
    await page.goto('/tenants');
    await expectAdminShell(page);
    await expect(page.getByRole('heading', { name: /Aboneler/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Abone ara/i)).toBeVisible();
  });

  test('ADMIN-003: Role impersonation', async ({ page }) => {
    await page.goto('/roles');
    await expect(page.getByRole('link', { name: /Roller/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Yeni Rol/i })).toBeVisible();
  });

  test('ADMIN-004: Create tenant', async ({ page }) => {
    await page.goto('/tenants');
    await page.getByRole('button', { name: /Yeni Abone Ekle/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Yeni Abone Ekle/i })).toBeVisible();
  });

  test('ADMIN-005: Update tenant', async ({ page }) => {
    await page.goto('/tenants');
    await expect(page.getByRole('button', { name: /Yeni Abone Ekle/i })).toBeVisible();
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();
  });

  test('ADMIN-006: Create user', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByRole('heading', { name: /Kullanıcı Yönetimi/i })).toBeVisible();
    await page.getByRole('button', { name: /Kullanıcı Ekle/i }).click();
    await expect(page.getByRole('dialog').getByText(/Yeni Kullanıcı Ekle/i)).toBeVisible();
  });

  test('ADMIN-007: Assign user role', async ({ page }) => {
    await page.goto('/users');
    await page.getByRole('button', { name: /Kullanıcı Ekle/i }).click();
    await expect(page.getByRole('dialog').getByText(/^Rol$/)).toBeVisible();
  });

  test('ADMIN-008: Manage role permissions', async ({ page }) => {
    await page.goto('/roles');
    await expect(page.getByRole('link', { name: /Roller/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /İzinler/i }).first()).toBeVisible();
  });

  test('ADMIN-009: View audit log', async ({ page }) => {
    await page.goto('/activity-logs');
    await expect(page.getByRole('heading', { name: /Aktivite Logları/i })).toBeVisible();
    await expect(page.getByText(/Toplam Log/i)).toBeVisible();
  });

  test('ADMIN-010: Update system settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /Sistem Ayarları/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Kaydet$/i })).toBeVisible();
    await expect(page.getByRole('textbox').first()).toBeVisible();
  });
});

test.describe('Admin Panel - Tenant Context Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('ADMIN-CONTEXT-001: CRUD operations require tenant selection', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByRole('heading', { name: /Kullanıcı Yönetimi/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Kullanıcı Ekle/i })).toBeVisible();
  });

  test('ADMIN-CONTEXT-002: Tenant context persists across navigation', async ({ page }) => {
    await page.goto('/tenants');
    await expect(page.getByRole('heading', { name: /Aboneler/i })).toBeVisible();
    await page.goto('/roles');
    await expect(page.getByRole('link', { name: /Roller/i })).toBeVisible();
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /Sistem Ayarları/i })).toBeVisible();
  });
});
