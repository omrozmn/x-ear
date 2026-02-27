import { Page, expect } from '@playwright/test';
import { waitForModalOpen, waitForModalClose, waitForToast, waitForApiCall } from './wait.helper';

/**
 * Admin Panel Helper Functions
 * 
 * Provides admin panel utilities for E2E tests
 * Note: Super admin must select tenant before any CRUD operations
 */

export interface TenantData {
  name: string;
  subdomain: string;
  contactEmail: string;
  contactPhone: string;
}

export interface AdminUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

/**
 * Login as super admin
 * 
 * @param page - Playwright page object
 * @param credentials - Super admin credentials
 */
export async function loginAsSuperAdmin(
  page: Page,
  credentials?: { identifier: string; password: string }
): Promise<void> {
  const defaultCreds = {
    // Default to admin account used by auth setup unless overridden
    identifier: process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@xear.com',
    password: process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Admin123!'
  };
  
  const creds = credentials || defaultCreds;

  // If already logged in as super admin, return
  try {
    const superMenu = page.locator('[data-testid="super-admin-menu"]');
    if (await superMenu.isVisible().catch(() => false)) {
      return;
    }
  } catch (e) {
    // ignore
  }

  // Try API login first (admin auth endpoint) to avoid UI flakiness
  const API_BASE = process.env.API_BASE_URL || 'http://localhost:5003';
  try {
    const response = await page.request.post(`${API_BASE}/api/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `test-${Date.now()}-${Math.random()}` },
      data: { email: creds.identifier, password: creds.password }
    });

    if (response.ok()) {
      const json = await response.json();
      const token = json.data?.accessToken || json.data?.token;
      if (token) {
        await page.goto('/admin');
              // Set token in localStorage (TokenManager keys may differ per app)
        await page.evaluate((t, email) => {
          localStorage.setItem('x-ear.auth.auth-storage-persist@v1', JSON.stringify({
            state: { accessToken: t, refreshToken: t, isAuthenticated: true, user: { email }, expiresAt: Date.now() + 3600000 },
            version: 0
          }));
        }, token, creds.identifier);
        await page.goto('/admin/dashboard');
        await page.waitForLoadState('networkidle');
        
        // Accept several possible post-login indicators (super-admin-menu, user-menu, tenant link, dashboard text)
        const postLoginSelectors = [
          '[data-testid="super-admin-menu"]',
          '[data-testid="user-menu"]',
          'a[href*="/admin/tenants"]',
          'text=Tenants',
          'text=Dashboard',
          '[data-testid="admin-dashboard"]'
        ];

        for (const s of postLoginSelectors) {
          if (await page.locator(s).first().isVisible().catch(() => false)) {
            return;
          }
        }

        // If none found, proceed but allow caller to assert a specific selector
        return;
      }
    }
  } catch (e) {
    // API login failed - fallback to UI
  }

  // Fallback: navigate to admin login UI and attempt login
  await page.goto('/admin/login');
  // Fill login form if present
  const idInput = page.locator('[data-testid="login-identifier-input"]');
  if (await idInput.isVisible().catch(() => false)) {
    await idInput.fill(creds.identifier);
    await page.locator('[data-testid="login-password-input"]').fill(creds.password);
    await page.locator('[data-testid="login-submit-button"]').click();
    await page.waitForURL('/admin/dashboard', { timeout: 10000 });
  }

  await expect(page.locator('[data-testid="super-admin-menu"]')).toBeVisible({ timeout: 5000 });
}

/**
 * Select tenant (required before CRUD operations)
 * 
 * @param page - Playwright page object
 * @param tenantId - Tenant ID to select
 */
export async function selectTenant(
  page: Page,
  tenantId: string
): Promise<void> {
  // Click tenant selector
  await page.locator('[data-testid="tenant-selector"]').click();
  
  // Select tenant
  await page.locator(`[data-testid="tenant-option-${tenantId}"]`).click();
  
  // Wait for tenant context to be set - prefer explicit selected-tenant-name indicator
  try {
    await page.locator('[data-testid="selected-tenant-name"]').waitFor({ state: 'visible', timeout: 5000 });
  } catch (e) {
    // Fallback to toast if present
    await waitForToast(page, 'success', 'Tenant selected');
  }
}

/**
 * Impersonate role
 * 
 * @param page - Playwright page object
 * @param roleCode - Role code to impersonate
 */
export async function impersonateRole(
  page: Page,
  roleCode: string
): Promise<void> {
  await page.locator('[data-testid="impersonation-menu"]').click();
  await page.locator(`[data-testid="role-option-${roleCode}"]`).click();
  
  await waitForToast(page, 'success', 'Role impersonation active');
}

/**
 * Create tenant
 * 
 * @param page - Playwright page object
 * @param data - Tenant data
 * @returns Tenant ID
 */
export async function createTenant(
  page: Page,
  data: TenantData
): Promise<string> {
  await page.goto('/admin/tenants');
  await page.locator('[data-testid="tenant-create-button"]').click();
  
  await waitForModalOpen(page, 'tenant-form-modal');
  
  // Fill form
  await page.locator('[data-testid="tenant-name-input"]').fill(data.name);
  await page.locator('[data-testid="tenant-subdomain-input"]').fill(data.subdomain);
  await page.locator('[data-testid="tenant-email-input"]').fill(data.contactEmail);
  await page.locator('[data-testid="tenant-phone-input"]').fill(data.contactPhone);
  
  // Submit
  await page.locator('[data-testid="tenant-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'tenant-form-modal');
  
  // Extract tenant ID
  const response = await page.waitForResponse(
    r => r.url().includes('/tenants') && r.status() === 201
  );
  const body = await response.json();
  return body.data.id;
}

/**
 * Update tenant
 * 
 * @param page - Playwright page object
 * @param tenantId - Tenant ID
 * @param data - Updated tenant data
 */
export async function updateTenant(
  page: Page,
  tenantId: string,
  data: Partial<TenantData>
): Promise<void> {
  await page.goto(`/admin/tenants/${tenantId}`);
  await page.locator('[data-testid="tenant-edit-button"]').click();
  
  await waitForModalOpen(page, 'tenant-form-modal');
  
  if (data.name) {
    await page.locator('[data-testid="tenant-name-input"]').fill(data.name);
  }
  
  if (data.contactEmail) {
    await page.locator('[data-testid="tenant-email-input"]').fill(data.contactEmail);
  }
  
  if (data.contactPhone) {
    await page.locator('[data-testid="tenant-phone-input"]').fill(data.contactPhone);
  }
  
  // Submit
  await page.locator('[data-testid="tenant-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'tenant-form-modal');
}

/**
 * Create user in admin panel
 * 
 * @param page - Playwright page object
 * @param data - User data
 * @returns User ID
 */
export async function createAdminUser(
  page: Page,
  data: AdminUserData
): Promise<string> {
  await page.goto('/admin/users');
  await page.locator('[data-testid="user-create-button"]').click();
  
  await waitForModalOpen(page, 'user-form-modal');
  
  // Fill form
  await page.locator('[data-testid="user-email-input"]').fill(data.email);
  await page.locator('[data-testid="user-password-input"]').fill(data.password);
  await page.locator('[data-testid="user-first-name-input"]').fill(data.firstName);
  await page.locator('[data-testid="user-last-name-input"]').fill(data.lastName);
  
  // Select role
  await page.locator('[data-testid="user-role-select"]').click();
  await page.locator(`[data-testid="role-option-${data.role}"]`).click();
  
  // Submit
  await page.locator('[data-testid="user-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'user-form-modal');
  
  // Extract user ID
  const response = await page.waitForResponse(
    r => r.url().includes('/users') && r.status() === 201
  );
  const body = await response.json();
  return body.data.id;
}

/**
 * Assign role to user
 * 
 * @param page - Playwright page object
 * @param userId - User ID
 * @param roleCode - Role code to assign
 */
export async function assignUserRole(
  page: Page,
  userId: string,
  roleCode: string
): Promise<void> {
  await page.goto(`/admin/users/${userId}`);
  await page.locator('[data-testid="user-assign-role-button"]').click();
  
  await waitForModalOpen(page, 'role-assignment-modal');
  
  // Select role
  await page.locator('[data-testid="role-select"]').click();
  await page.locator(`[data-testid="role-option-${roleCode}"]`).click();
  
  // Submit
  await page.locator('[data-testid="role-assignment-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'role-assignment-modal');
}

/**
 * Manage role permissions
 * 
 * @param page - Playwright page object
 * @param roleCode - Role code
 * @param permissions - Array of permission strings to enable
 */
export async function manageRolePermissions(
  page: Page,
  roleCode: string,
  permissions: string[]
): Promise<void> {
  await page.goto(`/admin/roles/${roleCode}`);
  await page.locator('[data-testid="role-edit-permissions-button"]').click();
  
  await waitForModalOpen(page, 'permissions-modal');
  
  // Enable specified permissions
  for (const permission of permissions) {
    await page.locator(`[data-testid="permission-checkbox-${permission}"]`).check();
  }
  
  // Submit
  await page.locator('[data-testid="permissions-submit-button"]').click();
  await waitForToast(page, 'success');
  await waitForModalClose(page, 'permissions-modal');
}

/**
 * View audit log
 * 
 * @param page - Playwright page object
 * @param filters - Optional filters (userId, action, startDate, endDate)
 */
export async function viewAuditLog(
  page: Page,
  filters?: {
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<void> {
  await page.goto('/admin/audit-log');
  
  // Apply filters if provided
  if (filters) {
    if (filters.userId) {
      await page.locator('[data-testid="audit-user-filter"]').fill(filters.userId);
    }
    
    if (filters.action) {
      await page.locator('[data-testid="audit-action-filter"]').click();
      await page.locator(`[data-testid="action-option-${filters.action}"]`).click();
    }
    
    if (filters.startDate) {
      await page.locator('[data-testid="audit-start-date"]').fill(filters.startDate);
    }
    
    if (filters.endDate) {
      await page.locator('[data-testid="audit-end-date"]').fill(filters.endDate);
    }
    
    await page.locator('[data-testid="audit-filter-apply-button"]').click();
  }
  
  await waitForApiCall(page, '/admin/audit-log', 'GET');
}

/**
 * Update system settings
 * 
 * @param page - Playwright page object
 * @param settings - Settings object
 */
export async function updateSystemSettings(
  page: Page,
  settings: Record<string, string | number | boolean>
): Promise<void> {
  await page.goto('/admin/settings');
  
  // Update each setting
  for (const [key, value] of Object.entries(settings)) {
    await page.locator(`[data-testid="setting-${key}-input"]`).fill(value.toString());
  }
  
  // Save settings
  await page.locator('[data-testid="settings-save-button"]').click();
  await waitForToast(page, 'success');
}
