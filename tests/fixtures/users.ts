/**
 * User Fixtures
 * 
 * Test user accounts for different roles
 */

export interface TestUser {
  identifier: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
}

export const testUsers: Record<string, TestUser> = {
  admin: {
    identifier: 'admin@xear.com',
    password: 'Admin123!',
    role: 'ADMIN',
    firstName: 'Admin',
    lastName: 'User'
  },
  
  audiologist: {
    identifier: 'audiologist@xear.com',
    password: 'Audio123!',
    role: 'AUDIOLOGIST',
    firstName: 'Audiologist',
    lastName: 'User'
  },
  
  receptionist: {
    identifier: 'receptionist@xear.com',
    password: 'Recep123!',
    role: 'RECEPTIONIST',
    firstName: 'Receptionist',
    lastName: 'User'
  },
  
  manager: {
    identifier: 'manager@xear.com',
    password: 'Manager123!',
    role: 'MANAGER',
    firstName: 'Manager',
    lastName: 'User'
  },
  
  superAdmin: {
    identifier: 'superadmin@xear.com',
    password: 'SuperAdmin123!',
    role: 'SUPER_ADMIN',
    firstName: 'Super',
    lastName: 'Admin'
  }
};

/**
 * Get test user by role
 * 
 * @param role - User role
 * @returns Test user
 */
export function getTestUser(role: keyof typeof testUsers): TestUser {
  return testUsers[role];
}

/**
 * Get default test user (admin)
 * 
 * @returns Default test user
 */
export function getDefaultTestUser(): TestUser {
  return testUsers.admin;
}
