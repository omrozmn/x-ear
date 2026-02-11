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
  test('should create and manage tenant successfully', async ({ apiContext, authTokens }) => {
    test.setTimeout(60000);
    
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    const testTenant = {
      name: `Test Klinik ${uniqueId.slice(-5)}`,
      contactEmail: `clinic${uniqueId}@example.com`
    };

    // STEP 1: Create tenant via API
    console.log('[FLOW-11] Step 1: Create tenant via API');
    const createResponse = await apiContext.post('/api/admin/tenants', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `test-tenant-${uniqueId}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: testTenant.name,
        ownerEmail: testTenant.contactEmail,
        status: 'trial',
        productCode: 'xear_hearing'
      }
    });
    
    if (!createResponse.ok()) {
      const errorData = await createResponse.json().catch(() => null);
      console.error('[FLOW-11] API Error:', createResponse.status(), errorData);
      throw new Error(`Failed to create tenant: ${createResponse.status()} - ${JSON.stringify(errorData)}`);
    }
    
    const createData = await createResponse.json();
    validateResponseEnvelope(createData);
    console.log('[FLOW-11] Tenant created via API');
    
    const tenantId = createData.data?.id;
    expect(tenantId, 'Tenant ID should be present').toBeTruthy();
    console.log('[FLOW-11] Created tenant ID:', tenantId);

    // STEP 2: Verify tenant appears in list
    console.log('[FLOW-11] Step 2: Verify tenant appears in list');
    const listResponse = await apiContext.get('/api/admin/tenants?page=1&perPage=50', {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    validateResponseEnvelope(listData);
    
    const tenants = listData.data?.tenants || listData.data || [];
    const createdTenant = tenants.find((t: any) => t.id === tenantId);
    expect(createdTenant, `Tenant with ID ${tenantId} should exist in list`).toBeTruthy();
    expect(createdTenant.name).toBe(testTenant.name);
    expect(createdTenant.ownerEmail).toBe(testTenant.contactEmail);
    console.log('[FLOW-11] Tenant verified in list');

    // STEP 3: Get tenant details
    console.log('[FLOW-11] Step 3: Get tenant details');
    const getResponse = await apiContext.get(`/api/admin/tenants/${tenantId}`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(getResponse.ok()).toBeTruthy();
    const getData = await getResponse.json();
    validateResponseEnvelope(getData);
    
    expect(getData.data.id).toBe(tenantId);
    expect(getData.data.name).toBe(testTenant.name);
    expect(getData.data.status).toBe('trial');
    console.log('[FLOW-11] Tenant details verified');

    // STEP 4: Create test user for the tenant
    console.log('[FLOW-11] Step 4: Create test user for tenant');
    const testUser = {
      email: `admin${uniqueId}@testklinik.com`,
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
    validateResponseEnvelope(userData);
    
    const userId = userData.data?.id;
    expect(userId, 'User ID should be present').toBeTruthy();
    console.log('[FLOW-11] Created user ID:', userId);

    // STEP 5: Verify user belongs to tenant
    console.log('[FLOW-11] Step 5: Verify user belongs to tenant');
    const usersResponse = await apiContext.get(`/api/admin/tenants/${tenantId}/users`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(usersResponse.ok()).toBeTruthy();
    const usersData = await usersResponse.json();
    validateResponseEnvelope(usersData);
    
    const users = usersData.data?.users || usersData.data || [];
    const createdUser = users.find((u: any) => u.id === userId);
    expect(createdUser, `User with ID ${userId} should exist in tenant users`).toBeTruthy();
    expect(createdUser.email).toBe(testUser.email);
    expect(createdUser.role).toBe('TENANT_ADMIN');
    console.log('[FLOW-11] User verified in tenant users list');
    
    console.log('[FLOW-11] ✅ Tenant management flow completed successfully');
    console.log('[FLOW-11] Tenant:', tenantId);
    console.log('[FLOW-11] User:', userId);
  });
});
