/**
 * FLOW-11: Tenant Management - Critical Flow Test
 * 
 * Priority: P2 (Admin Operations)
 * Why Critical: Multi-tenancy foundation, clinic onboarding, subscription management
 * 
 * API Endpoints:
 * - GET /api/admin/tenants (listTenants)
 * - POST /api/admin/tenants (createTenant)
 * - GET /api/admin/tenants/{tenant_id} (getTenant)
 */

import { test, expect } from '../../fixtures/fixtures';
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-11: Tenant Management (Admin)', () => {
  test('should create and manage tenant successfully', async ({ adminPage, tenantPage, apiContext, authTokens }) => {
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    const testTenant = {
      name: `Test Klinik ${uniqueId.slice(-5)}`,
      plan: 'professional',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
      contactEmail: `clinic${uniqueId}@example.com`,
      contactPhone: `+90555${uniqueId.slice(-7)}`
    };

    // STEP 1: Login to admin panel
    console.log('[FLOW-11] Step 1: Navigate to admin panel tenants page');
    await adminPage.goto('/tenants');
    await adminPage.waitForLoadState('networkidle');
    
    // Verify tenants page loads
    await expect(adminPage.locator('h1, h2').filter({ hasText: /Klinik|Tenant/i })).toBeVisible({ timeout: 10000 });

    // STEP 2: Click "Yeni Klinik"
    console.log('[FLOW-11] Step 2: Click new tenant button');
    const createButton = adminPage.getByRole('button', { name: /Yeni|Klinik|Tenant|Ekle/i }).first();
    await createButton.click();
    
    // Wait for form to appear
    await adminPage.waitForSelector('input[name="name"], input[name="tenantName"]', { timeout: 5000 });

    // STEP 3: Enter tenant details
    console.log('[FLOW-11] Step 3: Enter tenant details');
    
    // Name
    const nameInput = adminPage.locator('input[name="name"], input[name="tenantName"]').first();
    await nameInput.fill(testTenant.name);
    
    // Plan
    const planSelect = adminPage.locator('select[name="plan"], select[name="subscriptionPlan"]').first();
    await planSelect.selectOption(testTenant.plan).catch(async () => {
      // Fallback: select any option
      await planSelect.selectOption({ index: 1 });
    });
    
    // Expiry Date
    const expiryInput = adminPage.locator('input[name="expiryDate"], input[name="subscriptionExpiry"], input[type="date"]').first();
    await expiryInput.fill(testTenant.expiryDate);
    
    // Contact Email
    const emailInput = adminPage.locator('input[name="contactEmail"], input[name="email"]').first();
    await emailInput.fill(testTenant.contactEmail);
    
    // Contact Phone
    const phoneInput = adminPage.locator('input[name="contactPhone"], input[name="phone"]').first();
    await phoneInput.fill(testTenant.contactPhone);

    // STEP 4: Submit and verify tenant created
    console.log('[FLOW-11] Step 4: Submit tenant creation');
    const submitButton = adminPage.getByRole('button', { name: /Kaydet|Save|Oluştur|Create/i }).first();
    await submitButton.click();
    
    // Wait for API call
    await waitForApiCall(adminPage, '/api/admin/tenants', 10000);
    await adminPage.waitForLoadState('networkidle');

    // STEP 5: Verify tenant created via API
    console.log('[FLOW-11] Step 5: Verify tenant created via API');
    const listResponse = await apiContext.get('/api/admin/tenants?page=1&perPage=50', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    validateResponseEnvelope(listData);
    
    const createdTenant = listData.data.find((t: any) => t.name === testTenant.name);
    expect(createdTenant, `Tenant with name ${testTenant.name} should exist`).toBeTruthy();
    expect(createdTenant.plan || createdTenant.subscriptionPlan).toBe(testTenant.plan);
    
    const tenantId = createdTenant.id;
    console.log('[FLOW-11] Created tenant ID:', tenantId);

    // STEP 6: Create test user for the tenant
    console.log('[FLOW-11] Step 6: Create test user for tenant');
    const testUser = {
      email: `admin${uniqueId}@${testTenant.name.toLowerCase().replace(/\s+/g, '')}.com`,
      password: 'TestPassword123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'TENANT_ADMIN'
    };
    
    const userResponse = await apiContext.post('/api/admin/users', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `test-user-${uniqueId}`,
        'Content-Type': 'application/json'
      },
      data: {
        ...testUser,
        tenantId: tenantId
      }
    });
    
    expect(userResponse.ok()).toBeTruthy();
    const userData = await userResponse.json();
    console.log('[FLOW-11] Created user ID:', userData.data.id);

    // STEP 7: Verify tenant can login to web app
    console.log('[FLOW-11] Step 7: Verify tenant can login to web app');
    
    // Navigate to web app login
    await tenantPage.goto('/login');
    await tenantPage.waitForLoadState('networkidle');
    
    // Fill login form
    const emailLoginInput = tenantPage.locator('input[name="email"], input[type="email"]').first();
    await emailLoginInput.fill(testUser.email);
    
    const passwordInput = tenantPage.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.fill(testUser.password);
    
    // Submit login
    const loginButton = tenantPage.getByRole('button', { name: /Giriş|Login|Sign In/i }).first();
    await loginButton.click();
    
    // Wait for login to complete
    await waitForApiCall(tenantPage, '/api/auth/login', 10000).catch(() => {
      console.log('[FLOW-11] Login API call not detected, checking for redirect...');
    });
    
    // Verify redirect to dashboard or home
    await tenantPage.waitForURL(url => 
      url.pathname.includes('/dashboard') || 
      url.pathname.includes('/home') || 
      url.pathname === '/',
      { timeout: 10000 }
    );
    
    // Verify tenant context loaded
    await expect(tenantPage.locator(`text=${testTenant.name}`).or(
      tenantPage.locator(`text=${testUser.firstName}`)
    )).toBeVisible({ timeout: 10000 });
    
    console.log('[FLOW-11] ✅ Tenant management flow completed successfully');
  });
});
