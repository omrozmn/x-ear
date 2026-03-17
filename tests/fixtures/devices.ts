/**
 * Device Test Fixtures
 * 
 * Provides test data for device-related E2E tests
 */

export interface DeviceFixture {
  id?: string; // Optional for fixtures, will be set after creation
  serialNumber: string;
  brand: string;
  model: string;
  type: 'BTE' | 'ITE' | 'CIC' | 'RIC';
  side: 'left' | 'right' | 'both';
  purchasePrice?: number;
  salePrice?: number;
  warrantyMonths?: number;
  status?: 'in_stock' | 'assigned' | 'trial' | 'loaner' | 'repair' | 'returned';
}

/**
 * Test device data
 */
export const testDevices: Record<string, DeviceFixture> = {
  device1: {
    id: 'device-test-001',
    serialNumber: 'SN001234567',
    brand: 'Phonak',
    model: 'Audeo Paradise P90',
    type: 'RIC',
    side: 'both',
    purchasePrice: 15000,
    salePrice: 25000,
    warrantyMonths: 24,
    status: 'in_stock'
  },
  
  device2: {
    id: 'device-test-002',
    serialNumber: 'SN002345678',
    brand: 'Oticon',
    model: 'More 1',
    type: 'RIC',
    side: 'both',
    purchasePrice: 18000,
    salePrice: 30000,
    warrantyMonths: 24,
    status: 'in_stock'
  },
  
  device3: {
    id: 'device-test-003',
    serialNumber: 'SN003456789',
    brand: 'Widex',
    model: 'Moment 440',
    type: 'RIC',
    side: 'both',
    purchasePrice: 16000,
    salePrice: 28000,
    warrantyMonths: 24,
    status: 'in_stock'
  },
  
  device4: {
    serialNumber: 'SN004567890',
    brand: 'Signia',
    model: 'Pure Charge&Go 7X',
    type: 'RIC',
    side: 'both',
    purchasePrice: 14000,
    salePrice: 24000,
    warrantyMonths: 24,
    status: 'in_stock'
  },
  
  device5: {
    serialNumber: 'SN005678901',
    brand: 'Starkey',
    model: 'Livio Edge AI 2400',
    type: 'RIC',
    side: 'both',
    purchasePrice: 17000,
    salePrice: 29000,
    warrantyMonths: 24,
    status: 'in_stock'
  },
  
  trialDevice: {
    serialNumber: 'SN-TRIAL-001',
    brand: 'Phonak',
    model: 'Audeo Paradise P70',
    type: 'RIC',
    side: 'both',
    purchasePrice: 12000,
    salePrice: 20000,
    warrantyMonths: 24,
    status: 'trial'
  },
  
  loanerDevice: {
    serialNumber: 'SN-LOANER-001',
    brand: 'Oticon',
    model: 'Opn S 1',
    type: 'RIC',
    side: 'both',
    purchasePrice: 10000,
    salePrice: 18000,
    warrantyMonths: 24,
    status: 'loaner'
  },
  
  repairDevice: {
    serialNumber: 'SN-REPAIR-001',
    brand: 'Widex',
    model: 'Evoke 440',
    type: 'RIC',
    side: 'both',
    purchasePrice: 11000,
    salePrice: 19000,
    warrantyMonths: 24,
    status: 'repair'
  },
  
  leftDevice: {
    serialNumber: 'SN-LEFT-001',
    brand: 'Signia',
    model: 'Styletto 7X',
    type: 'RIC',
    side: 'left',
    purchasePrice: 7000,
    salePrice: 12000,
    warrantyMonths: 24,
    status: 'in_stock'
  },
  
  rightDevice: {
    serialNumber: 'SN-RIGHT-001',
    brand: 'Starkey',
    model: 'Livio 2400',
    type: 'RIC',
    side: 'right',
    purchasePrice: 7000,
    salePrice: 12000,
    warrantyMonths: 24,
    status: 'in_stock'
  }
};

/**
 * Device assignment reasons
 */
export const assignmentReasons = {
  sale: 'Sale',
  trial: 'Trial',
  replacement: 'Replacement',
  loaner: 'Loaner',
  repair: 'Tamir'
} as const;

/**
 * Generate random device data
 */
export function generateRandomDevice(): DeviceFixture {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  
  const brands = ['Phonak', 'Oticon', 'Widex', 'Signia', 'Starkey'];
  const types: Array<'BTE' | 'ITE' | 'CIC' | 'RIC'> = ['BTE', 'ITE', 'CIC', 'RIC'];
  const sides: Array<'left' | 'right' | 'both'> = ['left', 'right', 'both'];
  
  return {
    serialNumber: `SN${timestamp}${random}`,
    brand: brands[Math.floor(Math.random() * brands.length)],
    model: `Test Model ${random}`,
    type: types[Math.floor(Math.random() * types.length)],
    side: sides[Math.floor(Math.random() * sides.length)],
    purchasePrice: Math.floor(Math.random() * 10000) + 10000,
    salePrice: Math.floor(Math.random() * 15000) + 20000,
    warrantyMonths: 24,
    status: 'in_stock'
  };
}

/**
 * Generate bulk device data
 */
export function generateBulkDevices(count: number): DeviceFixture[] {
  return Array.from({ length: count }, () => generateRandomDevice());
}
