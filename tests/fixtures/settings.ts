/**
 * Settings Test Fixtures
 * 
 * Provides test data for settings-related E2E tests
 */

export interface SGKSettingsFixture {
  scheme: 'over18_working' | 'over18_retired' | 'under18' | 'over65';
  devicePayment: number;
  pillPayment: number;
  pillQuantity: number;
}

export interface SMSSettingsFixture {
  provider: 'vatansms' | 'mobilisim';
  username: string;
  password: string;
  sender: string;
  enabled: boolean;
}

export interface EmailSettingsFixture {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

export interface BranchFixture {
  name: string;
  code: string;
  address: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  taxOffice: string;
  taxNumber: string;
}

export interface RoleFixture {
  code: string;
  name: string;
  permissions: string[];
}

/**
 * SGK payment schemes
 */
export const sgkSchemes: Record<string, SGKSettingsFixture> = {
  over18_working: {
    scheme: 'over18_working',
    devicePayment: 5000,
    pillPayment: 698,
    pillQuantity: 104
  },
  
  over18_retired: {
    scheme: 'over18_retired',
    devicePayment: 6000,
    pillPayment: 698,
    pillQuantity: 104
  },
  
  under18: {
    scheme: 'under18',
    devicePayment: 7000,
    pillPayment: 698,
    pillQuantity: 104
  },
  
  over65: {
    scheme: 'over65',
    devicePayment: 8000,
    pillPayment: 698,
    pillQuantity: 104
  }
};

/**
 * SMS settings
 */
export const smsSettings: SMSSettingsFixture = {
  provider: 'vatansms',
  username: 'test_user',
  password: 'test_password',
  sender: 'XEAR',
  enabled: true
};

/**
 * Email settings
 */
export const emailSettings: EmailSettingsFixture = {
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpUser: 'test@xear.com',
  smtpPassword: 'test_password',
  fromEmail: 'noreply@xear.com',
  fromName: 'X-EAR CRM',
  enabled: true
};

/**
 * Test branches
 */
export const testBranches: Record<string, BranchFixture> = {
  branch1: {
    name: 'Kadıköy Şubesi',
    code: 'KDK001',
    address: 'Test Mahallesi, Test Sokak No:1',
    city: 'İstanbul',
    district: 'Kadıköy',
    phone: '+902161234567',
    email: 'kadikoy@xear.com',
    taxOffice: 'Kadıköy Vergi Dairesi',
    taxNumber: '1234567890'
  },
  
  branch2: {
    name: 'Çankaya Şubesi',
    code: 'CNK001',
    address: 'Örnek Mahallesi, Örnek Sokak No:5',
    city: 'Ankara',
    district: 'Çankaya',
    phone: '+903121234567',
    email: 'cankaya@xear.com',
    taxOffice: 'Çankaya Vergi Dairesi',
    taxNumber: '0987654321'
  },
  
  branch3: {
    name: 'Konak Şubesi',
    code: 'KNK001',
    address: 'Deneme Mahallesi, Deneme Sokak No:10',
    city: 'İzmir',
    district: 'Konak',
    phone: '+902321234567',
    email: 'konak@xear.com',
    taxOffice: 'Konak Vergi Dairesi',
    taxNumber: '1122334455'
  }
};

/**
 * Test roles
 */
export const testRoles: Record<string, RoleFixture> = {
  admin: {
    code: 'ADMIN',
    name: 'Administrator',
    permissions: [
      'parties.*',
      'sales.*',
      'devices.*',
      'inventory.*',
      'reports.*',
      'settings.*',
      'users.*'
    ]
  },
  
  audiologist: {
    code: 'AUDIOLOGIST',
    name: 'Audiologist',
    permissions: [
      'parties.view',
      'parties.create',
      'parties.edit',
      'sales.view',
      'sales.create',
      'devices.view',
      'devices.assign',
      'reports.view'
    ]
  },
  
  receptionist: {
    code: 'RECEPTIONIST',
    name: 'Receptionist',
    permissions: [
      'parties.view',
      'parties.create',
      'sales.view',
      'appointments.*',
      'communication.*'
    ]
  },
  
  manager: {
    code: 'MANAGER',
    name: 'Manager',
    permissions: [
      'parties.*',
      'sales.*',
      'devices.*',
      'inventory.*',
      'reports.*',
      'appointments.*',
      'communication.*'
    ]
  }
};

/**
 * Cash record tags
 */
export const cashRecordTags = [
  'Pil',
  'Filtre',
  'Tamir',
  'Kaparo',
  'Kalıp',
  'Teslimat',
  'Diğer'
] as const;

/**
 * Report statuses
 */
export const reportStatuses = {
  pending: 'Rapor bekliyor',
  received: 'Rapor alındı',
  none: 'Özel satış'
} as const;

/**
 * Payment methods
 */
export const paymentMethods = {
  cash: 'Nakit',
  card: 'Kredi Kartı',
  promissoryNote: 'Senet',
  transfer: 'Havale/EFT'
} as const;
