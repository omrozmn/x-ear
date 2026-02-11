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
  test('should sync data from admin panel to web app', async ({ apiContext, authTokens }) => {
    test.setTimeout(60000);
    
    // Generate unique test data
    const timestamp = Date.now();
    const uniqueId = timestamp.toString().slice(-8);
    
    const testTenant = {
      name: `Sync Test Clinic ${uniqueId.slice(-5)}`,
      ownerEmail: `syncadmin${uniqueId}@example.com`
    };
    
    const testUser = {
      email: `syncadmin${uniqueId}@example.com`,
      password: 'SyncTest123!',
      firstName: 'Sync',
      lastName: 'Admin',
      role: 'TENANT_ADMIN'
    };

    // STEP 1: Create new tenant via API
    console.log('[FLOW-16] Step 1: Create new tenant via API');
    const tenantResponse = await apiContext.post('/api/admin/tenants', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `sync-tenant-${uniqueId}`
      },
      data: {
        name: testTenant.name,
        ownerEmail: testTenant.ownerEmail,
        status: 'trial',
        productCode: 'xear_hearing'
      }
    });
    
    expect(tenantResponse.ok()).toBeTruthy();
    const tenantData = await tenantResponse.json();
    validateResponseEnvelope(tenantData);
    
    const tenantId = tenantData.data.id;
    console.log('[FLOW-16] Created tenant ID:', tenantId);

    // STEP 2: CREATE user for tenant with TENANT_ADMIN role
    console.log('[FLOW-16] Step 2: Create user for tenant');
    const userResponse = await apiContext.post('/api/admin/users', {
      headers: { 
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'Idempotency-Key': `sync-user-${uniqueId}`
      },
      data: {
        ...testUser,
        tenantId: tenantId
      }
    });
    
    expect(userResponse.ok()).toBeTruthy();
    const userData = await userResponse.json();
    validateResponseEnvelope(userData);
    
    const userId = userData.data.id;
    console.log('[FLOW-16] Created user ID:', userId);

    // STEP 3: Verify user belongs to correct tenant
    console.log('[FLOW-16] Step 3: Verify user tenant assignment');
    const usersResponse = await apiContext.get(`/api/admin/tenants/${tenantId}/users`, {
      headers: { 'Authorization': `Bearer ${authTokens.accessToken}` }
    });
    
    expect(usersResponse.ok()).toBeTruthy();
    const usersData = await usersResponse.json();
    validateResponseEnvelope(usersData);
    
    const users = usersData.data?.users || usersData.data || [];
    const createdUser = users.find((u: any) => u.id === userId);
    expect(createdUser).toBeTruthy();
    expect(createdUser.email).toBe(testUser.email);
    expect(createdUser.tenantId).toBe(tenantId);
    console.log('[FLOW-16] Verified user tenant assignment');

    // STEP 4: CREATE party in the new tenant context
    console.log('[FLOW-16] Step 4: Create party in new tenant');
    const testParty = {
      firstName: `Party${uniqueId.slice(-5)}`,
      lastName: 'SyncTest',
      phone: `+90555${uniqueId.slice(-7)}`
    };
    
    // Login as the new user to get tenant-scoped token
    const loginResponse = await apiContext.post('/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const newUserToken = loginData.data.accessToken;
    
    // Create party with new user's token
    const partyResponse = await apiContext.post('/api/parties', {
      headers: { 
        'Authorization': `Bearer ${newUserToken}`,
        'Idempotency-Key': `sync-party-${uniqueId}`
      },
      data: testParty
    });
    
    expect(partyResponse.ok()).toBeTruthy();
    const partyData = await partyResponse.json();
    validateResponseEnvelope(partyData);
    
    const partyId = partyData.data.id;
    expect(partyData.data.tenantId).toBe(tenantId);
    console.log('[FLOW-16] Created party ID:', partyId);

    // STEP 5: Verify tenant isolation - party belongs to correct tenant
    console.log('[FLOW-16] Step 5: Verify tenant isolation');
    const partiesResponse = await apiContext.get('/api/parties?page=1&perPage=50', {
      headers: { 'Authorization': `Bearer ${newUserToken}` }
    });
    
    expect(partiesResponse.ok()).toBeTruthy();
    const partiesData = await partiesResponse.json();
    validateResponseEnvelope(partiesData);
    
    const parties = partiesData.data;
    const createdParty = parties.find((p: any) => p.id === partyId);
    expect(createdParty).toBeTruthy();
    expect(createdParty.tenantId).toBe(tenantId);
    
    // Verify all parties belong to this tenant
    parties.forEach((party: any) => {
      expect(party.tenantId, `Party ${party.id} should belong to tenant ${tenantId}`).toBe(tenantId);
    });
    
    console.log('[FLOW-16] Verified tenant isolation: all', parties.length, 'parties belong to tenant', tenantId);
    
    console.log('[FLOW-16] ✅ Admin → Web sync flow completed successfully');
    console.log('[FLOW-16] Tenant:', tenantId);
    console.log('[FLOW-16] User:', userId);
    console.log('[FLOW-16] Party:', partyId);
  });
});
