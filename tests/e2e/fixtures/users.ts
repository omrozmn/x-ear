/**
 * Test Users Fixture
 * Shared test user accounts for E2E tests
 */

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: string;
  tenantId?: string;
}

export const testUsers: Record<string, TestUser> = {
  // Web App Users
  admin: {
    email: 'admin@xear.com',
    password: 'Admin123!',
    name: 'Admin User',
    role: 'admin',
    tenantId: 'tenant_001',
  },
  doctor: {
    email: 'doctor@xear.com',
    password: 'Doctor123!',
    name: 'Doctor User',
    role: 'doctor',
    tenantId: 'tenant_001',
  },
  staff: {
    email: 'staff@xear.com',
    password: 'Staff123!',
    name: 'Staff User',
    role: 'staff',
    tenantId: 'tenant_001',
  },
  viewer: {
    email: 'viewer@xear.com',
    password: 'Viewer123!',
    name: 'Viewer User',
    role: 'viewer',
    tenantId: 'tenant_001',
  },
  
  // Admin Panel Users
  superAdmin: {
    email: 'superadmin@xear.com',
    password: 'SuperAdmin123!',
    name: 'Super Admin',
    role: 'super_admin',
  },
  adminUser: {
    email: 'admin@xear.com',
    password: 'Admin123!',
    name: 'Admin',
    role: 'admin',
  },
  
  // Landing Page
  affiliate: {
    email: 'affiliate@test.com',
    password: 'Affiliate123!',
    name: 'Affiliate User',
    role: 'affiliate',
  },
  lead: {
    email: 'lead@test.com',
    password: 'Lead123!',
    name: 'Lead User',
    role: 'lead',
  },
};

// Helper to get user by role
export const getTestUser = (role: keyof typeof testUsers): TestUser => {
  const user = testUsers[role];
  if (!user) {
    throw new Error(`Test user for role "${role}" not found`);
  }
  return user;
};

// Default test user
export const defaultTestUser = testUsers.admin;
