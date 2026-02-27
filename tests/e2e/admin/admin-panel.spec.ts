import { test, expect } from '@playwright/test';
import {
  loginAsSuperAdmin,
  selectTenant,
  impersonateRole,
  createTenant,
  updateTenant,
  createAdminUser,
  assignUserRole,
  manageRolePermissions,
  viewAuditLog,
  updateSystemSettings
} from '../../helpers/admin';

test.describe('Admin Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('ADMIN-001: Super admin login', async ({ page }) => {
    // Assert: Super admin (or admin) logged in successfully
    const isSuperVisible = await page.locator('[data-testid="super-admin-menu"]').isVisible().catch(() => false);
    const isUserVisible = await page.locator('[data-testid="user-menu"]').isVisible().catch(() => false);
    expect(isSuperVisible || isUserVisible).toBeTruthy();

    const dashboardVisible = await page.locator('[data-testid="admin-dashboard"]').isVisible().catch(() => false);
    const dashboardText = await page.locator('text=Dashboard').isVisible().catch(() => false);
    expect(dashboardVisible || dashboardText).toBeTruthy();

    // Allow either /admin/dashboard or /dashboard depending on routing
    const currentUrl = page.url();
    expect(currentUrl.includes('/dashboard')).toBeTruthy();
  });

  test('ADMIN-002: Tenant selection', async ({ page }) => {
    // Arrange: Get first tenant ID from list
    await page.goto('/admin/tenants');
    const firstTenantId = await page.locator('[data-testid="tenant-list-item"]').first().getAttribute('data-tenant-id');
    
    // Act: Select tenant
    if (firstTenantId) {
      await selectTenant(page, firstTenantId);
    }

    // Assert: Tenant selected
    await expect(page.locator('[data-testid="selected-tenant-name"]')).toBeVisible();
  });

  test('ADMIN-003: Role impersonation', async ({ page }) => {
    // Arrange: Select tenant first
    await page.goto('/admin/tenants');
    const firstTenantId = await page.locator('[data-testid="tenant-list-item"]').first().getAttribute('data-tenant-id');
    if (firstTenantId) {
      await selectTenant(page, firstTenantId);
    }

    // Act: Impersonate ADMIN role
    await impersonateRole(page, 'ADMIN');

    // Assert: Impersonation active
    await expect(page.locator('[data-testid="impersonation-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="impersonation-badge"]')).toContainText('ADMIN');
  });

  test('ADMIN-004: Create tenant', async ({ page }) => {
    // Act: Create new tenant
    const tenantId = await createTenant(page, {
      name: 'Test Clinic',
      subdomain: 'test-clinic',
      contactEmail: 'contact@testclinic.com',
      contactPhone: '+905551234567'
    });

    // Assert: Tenant created
    expect(tenantId).toBeTruthy();
    await page.goto(`/admin/tenants/${tenantId}`);
    await expect(page.locator('[data-testid="tenant-name"]')).toContainText('Test Clinic');
  });

  test('ADMIN-005: Update tenant', async ({ page }) => {
    // Arrange: Create tenant
    const tenantId = await createTenant(page, {
      name: 'Original Name',
      subdomain: 'original',
      contactEmail: 'original@example.com',
      contactPhone: '+905551111111'
    });

    // Act: Update tenant
    await updateTenant(page, tenantId, {
      name: 'Updated Name',
      contactEmail: 'updated@example.com'
    });

    // Assert: Tenant updated
    await page.goto(`/admin/tenants/${tenantId}`);
    await expect(page.locator('[data-testid="tenant-name"]')).toContainText('Updated Name');
    await expect(page.locator('[data-testid="tenant-email"]')).toContainText('updated@example.com');
  });

  test('ADMIN-006: Create user', async ({ page }) => {
    // Arrange: Select tenant first
    await page.goto('/admin/tenants');
    const firstTenantId = await page.locator('[data-testid="tenant-list-item"]').first().getAttribute('data-tenant-id');
    if (firstTenantId) {
      await selectTenant(page, firstTenantId);
    }

    // Act: Create user
    const userId = await createAdminUser(page, {
      email: 'newuser@example.com',
      password: 'NewUser123!',
      firstName: 'New',
      lastName: 'User',
      role: 'AUDIOLOGIST'
    });

    // Assert: User created
    expect(userId).toBeTruthy();
    await page.goto(`/admin/users/${userId}`);
    await expect(page.locator('[data-testid="user-email"]')).toContainText('newuser@example.com');
  });

  test('ADMIN-007: Assign user role', async ({ page }) => {
    // Arrange: Select tenant and create user
    await page.goto('/admin/tenants');
    const firstTenantId = await page.locator('[data-testid="tenant-list-item"]').first().getAttribute('data-tenant-id');
    if (firstTenantId) {
      await selectTenant(page, firstTenantId);
    }
    
    const userId = await createAdminUser(page, {
      email: 'roletest@example.com',
      password: 'RoleTest123!',
      firstName: 'Role',
      lastName: 'Test',
      role: 'RECEPTIONIST'
    });

    // Act: Assign additional role
    await assignUserRole(page, userId, 'ADMIN');

    // Assert: Role assigned
    await page.goto(`/admin/users/${userId}`);
    await expect(page.locator('[data-testid="user-roles"]')).toContainText('ADMIN');
  });

  test('ADMIN-008: Manage role permissions', async ({ page }) => {
    // Act: Manage permissions for RECEPTIONIST role
    await manageRolePermissions(page, 'RECEPTIONIST', [
      'parties.view',
      'parties.create',
      'appointments.view',
      'appointments.create'
    ]);

    // Assert: Permissions updated
    await page.goto('/admin/roles/RECEPTIONIST');
    await expect(page.locator('[data-testid="permission-parties.view"]')).toBeChecked();
    await expect(page.locator('[data-testid="permission-parties.create"]')).toBeChecked();
    await expect(page.locator('[data-testid="permission-appointments.view"]')).toBeChecked();
  });

  test('ADMIN-009: View audit log', async ({ page }) => {
    // Act: View audit log
    await viewAuditLog(page);

    // Assert: Audit log displayed
    await expect(page.locator('[data-testid="audit-log-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="audit-log-item"]')).toHaveCount(1);
  });

  test('ADMIN-010: Update system settings', async ({ page }) => {
    // Act: Update system settings
    await updateSystemSettings(page, {
      'app-name': 'X-Ear CRM Test',
      'max-upload-size': '10',
      'session-timeout': '30'
    });

    // Assert: Settings updated
    await page.goto('/admin/settings');
    await expect(page.locator('[data-testid="setting-app-name-input"]')).toHaveValue('X-Ear CRM Test');
    await expect(page.locator('[data-testid="setting-max-upload-size-input"]')).toHaveValue('10');
  });
});

test.describe('Admin Panel - Tenant Context Tests', () => {
  test('ADMIN-CONTEXT-001: CRUD operations require tenant selection', async ({ page }) => {
    // Arrange: Login as super admin (no tenant selected)
    await loginAsSuperAdmin(page);

    // Act: Try to create user without selecting tenant
    await page.goto('/admin/users');
    await page.locator('[data-testid="user-create-button"]').click();

    // Assert: Error message shown (tenant selection required)
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Please select a tenant first');
  });

  test('ADMIN-CONTEXT-002: Tenant context persists across navigation', async ({ page }) => {
    // Arrange: Login and select tenant
    await loginAsSuperAdmin(page);
    await page.goto('/admin/tenants');
    const firstTenantId = await page.locator('[data-testid="tenant-list-item"]').first().getAttribute('data-tenant-id');
    if (firstTenantId) {
      await selectTenant(page, firstTenantId);
    }

    // Act: Navigate to different pages
    await page.goto('/admin/users');
    await page.goto('/admin/roles');
    await page.goto('/admin/settings');

    // Assert: Tenant context still active
    await expect(page.locator('[data-testid="selected-tenant-name"]')).toBeVisible();
  });
});
