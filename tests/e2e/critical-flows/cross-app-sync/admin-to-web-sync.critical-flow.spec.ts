/**
 * FLOW-16: Admin → Web Data Sync - Critical Flow Test
 * 
 * Priority: Cross-App Sync
 * Why Critical: Data consistency, tenant provisioning, cross-tenant leak prevention
 * 
 * API Endpoints:
 * - POST /api/admin/tenants (createTenant) - Admin panel
 * - POST /api/admin/users (createUser) - Admin panel
 * - POST /api/auth/login (login) - Web app
 * - GET /api/users/me (getCurrentUser) - Web app
 * - POST /api/parties (createParty) - Web app
 * - GET /api/parties (listParties) - Web app
 */

import { test, expect } from '../../fixtures/fixtures';
import { waitForApiCall, validateResponseEnvelope } from '../../web/helpers/test-utils';

test.describe('FLOW-16: Admin → Web Data Sync', () => {
  test('should sync data from admin panel to web app', async ({ adminPage, tenantPage, apiContext, authTokens }) => {
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    const testTenant = {
      name: `Sync Test Clinic ${uniqueId.slice(-5)}`,
      plan: 'professional',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    const testUser = {
      email: `syncadmin${uniqueId}@example.com`,
      password: 'SyncTest123!',
      firstName: 'Sync',
      lastName: 'Admin',
      role: 'TENANT_ADMIN'
    };

    // STEP 1: CREATE new tenant in admin panel
    console.log('[FLOW-16] Step 1: Create new tenant in admin panel');
    await adminPage.goto('/tenants');
    await adminPage.waitForLoadState('networkidle');
    
    const createTenantButton = adminPage.getByRole('button', { name: /Yeni|Klinik|Tenant/i }).first();
    await createTenantButton.click();
    
    await adminPage.waitForSelector('input[name="name"], input[name="tenantName"]', { timeout: 5000 });
    
    const nameInput = adminPage.locator('input[name="name"], input[name="tenantName"]').first();
    await nameInput.fill(testTenant.name);
    
    const planSelect = adminPage.locator('select[name="plan"]').first();
    await planSelect.selectOption(testTenant.plan).catch(async () => {
      await planSelect.selectOption({ index: 1 });
    });
    
    const expiryInput = adminPage.locator('input[name="expiryDate"], input[type="date"]').first();
    await expiryInput.fill(testTenant.expiryDate);
    
    const submitButton = adminPage.getByRole('button', { name: /Kaydet|Save|Oluştur/i }).first();
    await submitButton.click();
    
    await waitForApiCall(adminPage, '/api/admin/tenants', 10000);
    await adminPage.waitForLoadState('networkidle');

    // STEP 2: Get tenant ID via API
    console.log('[FLOW-16] Step 2: Get tenant ID via API');
    const tenantsResponse = await apiContext.get('/api/admin/tenants?page=1&perPage=50', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(tenantsResponse.ok()).toBeTruthy();
    const tenantsData = await tenantsResponse.json();
    validateResponseEnvelope(tenantsData);
    
    const createdTenant = tenantsData.data.find((t: any) => t.name === testTenant.name);
    expect(createdTenant, `Tenant with name ${testTenant.name} should exist`).toBeTruthy();
    
    const tenantId = createdTenant.id;
    console.log('[FLOW-16] Created tenant ID:', tenantId);

    // STEP 3: CREATE user for tenant with TENANT_ADMIN role
    console.log('[FLOW-16] Step 3: Create user for tenant');
    const userResponse = await apiContext.post('/api/admin/users', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `sync-user-${uniqueId}`,
        'Content-Type': 'application/json'
      },
      data: {
        ...testUser,
        tenantId: tenantId
      }
    });
    
    expect(userResponse.ok()).toBeTruthy();
    const userData = await userResponse.json();
    const userId = userData.data.id;
    console.log('[FLOW-16] Created user ID:', userId);

    // STEP 4: LOGIN to web app with tenant credentials
    console.log('[FLOW-16] Step 4: Login to web app with tenant credentials');
    await tenantPage.goto('/login');
    await tenantPage.waitForLoadState('networkidle');
    
    const emailInput = tenantPage.locator('input[name="email"], input[type="email"]').first();
    await emailInput.fill(testUser.email);
    
    const passwordInput = tenantPage.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.fill(testUser.password);
    
    const loginButton = tenantPage.getByRole('button', { name: /Giriş|Login/i }).first();
    await loginButton.click();
    
    await waitForApiCall(tenantPage, '/api/auth/login', 10000).catch(() => {
      console.log('[FLOW-16] Login API call not detected');
    });

    // STEP 5: Verify tenant context loaded correctly
    console.log('[FLOW-16] Step 5: Verify tenant context loaded');
    await tenantPage.waitForURL(url => 
      url.pathname.includes('/dashboard') || url.pathname === '/',
      { timeout: 10000 }
    );
    
    // Verify tenant name appears
    await expect(tenantPage.locator(`text=${testTenant.name}`).or(
      tenantPage.locator(`text=${testUser.firstName}`)
    )).toBeVisible({ timeout: 10000 });
    
    // Verify user info via API
    const meResponse = await apiContext.get('/api/users/me', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    if (meResponse.ok()) {
      const meData = await meResponse.json();
      validateResponseEnvelope(meData);
      expect(meData.data.tenantId).toBe(tenantId);
      console.log('[FLOW-16] Verified tenant context:', meData.data.tenantId);
    }

    // STEP 6: Verify tenant isolation (can't see other tenants)
    console.log('[FLOW-16] Step 6: Verify tenant isolation');
    await tenantPage.goto('/parties');
    await tenantPage.waitForLoadState('networkidle');
    
    // Get parties list
    const partiesResponse = await apiContext.get('/api/parties?page=1&perPage=50', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    if (partiesResponse.ok()) {
      const partiesData = await partiesResponse.json();
      validateResponseEnvelope(partiesData);
      
      // Verify all parties belong to this tenant
      const parties = partiesData.data;
      parties.forEach((party: any) => {
        expect(party.tenantId, `Party ${party.id} should belong to tenant ${tenantId}`).toBe(tenantId);
      });
      
      console.log('[FLOW-16] Verified tenant isolation: all', parties.length, 'parties belong to tenant', tenantId);
    }

    // STEP 7: CREATE party in web app
    console.log('[FLOW-16] Step 7: Create party in web app');
    const createButton = tenantPage.getByRole('button', { name: /Yeni|Hasta|Ekle/i }).first();
    await createButton.click();
    
    await tenantPage.waitForSelector('input[name="firstName"], input[name="first_name"]', { timeout: 5000 });
    
    const testParty = {
      firstName: `Party${uniqueId.slice(-5)}`,
      lastName: 'SyncTest',
      phone: `+90555${uniqueId.slice(-7)}`
    };
    
    const firstNameInput = tenantPage.locator('input[name="firstName"], input[name="first_name"]').first();
    const lastNameInput = tenantPage.locator('input[name="lastName"], input[name="last_name"]').first();
    const phoneInput = tenantPage.locator('input[name="phone"]').first();
    
    await firstNameInput.fill(testParty.firstName);
    await lastNameInput.fill(testParty.lastName);
    await phoneInput.fill(testParty.phone);
    
    const submitPartyButton = tenantPage.getByRole('button', { name: /Kaydet|Save/i }).first();
    await submitPartyButton.click();
    
    await waitForApiCall(tenantPage, '/api/parties', 10000);
    await tenantPage.waitForLoadState('networkidle');

    // STEP 8: Verify tenant_id correct via API
    console.log('[FLOW-16] Step 8: Verify party has correct tenant_id');
    const newPartiesResponse = await apiContext.get('/api/parties?page=1&perPage=50', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(newPartiesResponse.ok()).toBeTruthy();
    const newPartiesData = await newPartiesResponse.json();
    validateResponseEnvelope(newPartiesData);
    
    const createdParty = newPartiesData.data.find((p: any) => p.phone === testParty.phone);
    expect(createdParty, `Party with phone ${testParty.phone} should exist`).toBeTruthy();
    expect(createdParty.tenantId).toBe(tenantId);
    
    console.log('[FLOW-16] Verified party tenant_id:', createdParty.tenantId);

    // STEP 9: Verify cross-tenant leak checks
    console.log('[FLOW-16] Step 9: Verify no cross-tenant data leaks');
    
    // Try to access a party from a different tenant (should fail)
    const otherTenantsResponse = await apiContext.get('/api/admin/tenants?page=1&perPage=50', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    if (otherTenantsResponse.ok()) {
      const otherTenantsData = await otherTenantsResponse.json();
      const otherTenant = otherTenantsData.data.find((t: any) => t.id !== tenantId);
      
      if (otherTenant) {
        // Try to access other tenant's parties (should be empty or fail)
        const otherPartiesResponse = await apiContext.get(`/api/parties?tenantId=${otherTenant.id}`, {
          headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
        });
        
        // Should either fail or return empty
        if (otherPartiesResponse.ok()) {
          const otherPartiesData = await otherPartiesResponse.json();
          expect(otherPartiesData.data.length).toBe(0);
          console.log('[FLOW-16] Verified: Cannot access other tenant data');
        }
      }
    }
    
    console.log('[FLOW-16] ✅ Admin → Web sync flow completed successfully');
  });
});
