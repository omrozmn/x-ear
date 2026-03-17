/**
 * Party Test Fixtures
 * 
 * Provides test data for party-related E2E tests
 */

export interface PartyFixture {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  tcNo?: string;
  address?: string;
  city?: string;
  district?: string;
  birthDate?: string;
}

/**
 * Test party data
 */
export const testParties: Record<string, PartyFixture> = {
  customer1: {
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    phone: '+905551234567',
    email: 'ahmet.yilmaz@example.com',
    tcNo: '12345678901',
    address: 'Test Mahallesi, Test Sokak No:1',
    city: 'İstanbul',
    district: 'Kadıköy',
    birthDate: '1985-05-15'
  },
  
  customer2: {
    firstName: 'Ayşe',
    lastName: 'Demir',
    phone: '+905559876543',
    email: 'ayse.demir@example.com',
    tcNo: '98765432109',
    address: 'Örnek Mahallesi, Örnek Sokak No:5',
    city: 'Ankara',
    district: 'Çankaya',
    birthDate: '1990-08-20'
  },
  
  customer3: {
    firstName: 'Mehmet',
    lastName: 'Kaya',
    phone: '+905551112233',
    email: 'mehmet.kaya@example.com',
    tcNo: '11223344556',
    address: 'Deneme Mahallesi, Deneme Sokak No:10',
    city: 'İzmir',
    district: 'Konak',
    birthDate: '1978-03-10'
  },
  
  vipCustomer: {
    firstName: 'Fatma',
    lastName: 'Şahin',
    phone: '+905554445566',
    email: 'fatma.sahin@example.com',
    tcNo: '66778899001',
    address: 'VIP Mahallesi, VIP Sokak No:1',
    city: 'Bursa',
    district: 'Nilüfer',
    birthDate: '1982-12-25'
  },
  
  leadCustomer: {
    firstName: 'Ali',
    lastName: 'Yıldız',
    phone: '+905557778899',
    email: 'ali.yildiz@example.com',
    tcNo: '22334455667',
    address: 'Potansiyel Mahallesi, Potansiyel Sokak No:3',
    city: 'Antalya',
    district: 'Muratpaşa',
    birthDate: '1995-07-18'
  },
  
  minimalCustomer: {
    firstName: 'Zeynep',
    lastName: 'Arslan',
    phone: '+905553334455'
  },
  
  sgkCustomer0to18: {
    firstName: 'Çocuk',
    lastName: 'Test',
    phone: '+905551231234',
    email: 'cocuk.test@example.com',
    tcNo: '33445566778',
    birthDate: '2015-01-01' // 0-18 age group
  },
  
  sgkCustomer18Plus: {
    firstName: 'Çalışan',
    lastName: 'Test',
    phone: '+905554564567',
    email: 'calisan.test@example.com',
    tcNo: '44556677889',
    birthDate: '1990-01-01' // 18+ working
  },
  
  sgkCustomer65Plus: {
    firstName: 'Emekli',
    lastName: 'Test',
    phone: '+905557897890',
    email: 'emekli.test@example.com',
    tcNo: '55667788990',
    birthDate: '1950-01-01' // 65+ age group
  }
};

/**
 * Generate random party data
 */
export function generateRandomParty(): PartyFixture {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  
  return {
    firstName: `Test${random}`,
    lastName: `User${timestamp}`,
    phone: `+9055512${String(random).padStart(5, '0')}`,
    email: `test${random}@example.com`,
    tcNo: String(random).padStart(11, '0')
  };
}

/**
 * Generate bulk party data
 */
export function generateBulkParties(count: number): PartyFixture[] {
  return Array.from({ length: count }, () => generateRandomParty());
}
