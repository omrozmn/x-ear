/**
 * FLOW-12: User Role Assignment - Critical Flow Test
 * 
 * Priority: P2 (Admin Operations)
 * Why Critical: Access control, security, permission management
 * 
 * API Endpoints:
 * - GET /api/admin/users (listUsers)
 * - PUT /api/admin/users/{user_id}/role (updateUserRole)
 * - GET /api/users/me (getCurrentUser)
 */

import { test, expect } from '../../fixtures/fixtures';
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-12: User Role Assignment (Admin)', () => {
  test('should assign user role successfully', async ({ adminPage, tenantPage, apiContext, authTokens }) => {
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    // STEP 1: Create test user via API (setup)
    console.log('[FLOW-12] Step 1: Create test user via API');
    const testUser = {
      email: `testuser${uniqueId}@example.com`,
      password: 'TestPassword123!',
      firstName: `User${uniqueId.slice(-5)}`,
      lastName: 'Test',
      role: 'CLINIC_STAFF' // Initial role
    };
    
    const userResponse = await apiContext.post('/api/admin/users', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `test-user-${uniqueId}`,
        'Content-Type': 'application/json'
      },
      data: {
        ...testUser,
        tenantId: authTokens.tenantId
      }
    });
    
    expect(userResponse.ok()).toBeTruthy();
    const userData = await userResponse.json();
    const userId = userData.data.id;
    console.log('[FLOW-12] Created user ID:', userId);

    // STEP 2: Login to admin panel
    console.log('[FLOW-12] Step 2: Navigate to admin users page');
    await adminPage.goto('/users');
    await adminPage.waitForLoadState('networkidle');
    
    // Verify users page loads
    await expect(adminPage.locator('h1, h2').filter({ hasText: /Kullanıcı|User/i })).toBeVisible({ timeout: 10000 });

    // STEP 3: Select user
    console.log('[FLOW-12] Step 3: Select user');
    const userRow = adminPage.locator(`tr:has-text("${testUser.email}")`).first();
    await userRow.click();
    
    // Wait for user detail or edit form
    await adminPage.waitForLoadState('networkidle');

    // STEP 4: Click "Rol Ata"
    console.log('[FLOW-12] Step 4: Click assign role button');
    const roleButton = adminPage.getByRole('button', { name: /Rol|Role|Düzenle|Edit/i }).first();
    await roleButton.click();
    
    // Wait for role selection form
    await adminPage.waitForSelector('select[name="role"], input[name="role"]', { timeout: 5000 });

    // STEP 5: Select role (TENANT_ADMIN)
    console.log('[FLOW-12] Step 5: Select new role');
    const newRole = 'TENANT_ADMIN';
    
    const roleSelect = adminPage.locator('select[name="role"]').first();
    await roleSelect.selectOption(newRole).catch(async () => {
      // Fallback: try radio buttons
      const roleRadio = adminPage.locator(`input[value="${newRole}"]`).first();
      await roleRadio.click();
    });

    // STEP 6: Submit role assignment
    console.log('[FLOW-12] Step 6: Submit role assignment');
    const submitButton = adminPage.getByRole('button', { name: /Kaydet|Save|Ata|Assign/i }).first();
    await submitButton.click();
    
    // Wait for API call
    await waitForApiCall(adminPage, `/api/admin/users/${userId}`, 10000);
    await adminPage.waitForLoadState('networkidle');

    // STEP 7: Verify role assigned via API
    console.log('[FLOW-12] Step 7: Verify role assigned via API');
    const getUserResponse = await apiContext.get(`/api/admin/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(getUserResponse.ok()).toBeTruthy();
    const getUserData = await getUserResponse.json();
    validateResponseEnvelope(getUserData);
    expect(getUserData.data.role).toBe(newRole);
    console.log('[FLOW-12] Role updated to:', getUserData.data.role);

    // STEP 8: Verify user has correct permissions in web app
    console.log('[FLOW-12] Step 8: Verify permissions in web app');
    
    // Login as the test user
    await tenantPage.goto('/login');
    await tenantPage.waitForLoadState('networkidle');
    
    const emailInput = tenantPage.locator('input[name="email"], input[type="email"]').first();
    await emailInput.fill(testUser.email);
    
    const passwordInput = tenantPage.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.fill(testUser.password);
    
    const loginButton = tenantPage.getByRole('button', { name: /Giriş|Login/i }).first();
    await loginButton.click();
    
    // Wait for login
    await waitForApiCall(tenantPage, '/api/auth/login', 10000).catch(() => {
      console.log('[FLOW-12] Login API call not detected');
    });
    
    // Verify redirect
    await tenantPage.waitForURL(url => 
      url.pathname.includes('/dashboard') || url.pathname === '/',
      { timeout: 10000 }
    );
    
    // Verify admin-level access (e.g., settings menu visible)
    const settingsLink = tenantPage.locator('a:has-text("Ayarlar"), a:has-text("Settings")').first();
    await expect(settingsLink).toBeVisible({ timeout: 10000 });
    
    console.log('[FLOW-12] ✅ User role assignment flow completed successfully');
  });
});
