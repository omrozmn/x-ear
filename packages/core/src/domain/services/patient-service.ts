import { 
  Patient, 
  PatientCreateRequest, 
  PatientUpdateRequest, 
  PatientSearchFilters,
  PaginatedResponse 
} from '../types';

export class PatientService {
  /**
   * Validates Turkish Citizenship Number (TC Kimlik No)
   */
  static validateTcNumber(tcNumber: string): boolean {
    if (!tcNumber || tcNumber.length !== 11) return false;
    
    const digits = tcNumber.split('').map(Number);
    
    // First digit cannot be 0
    if (digits[0] === 0) return false;
    
    // TC Number algorithm validation
    const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
    const check1 = (sum1 * 7 - sum2) % 10;
    const check2 = (sum1 + sum2 + digits[9]) % 10;
    
    return digits[9] === check1 && digits[10] === check2;
  }

  /**
   * Calculates age from birth date
   */
  static calculateAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Validates patient data before creation/update
   */
  static validatePatientData(data: PatientCreateRequest | PatientUpdateRequest): string[] {
    const errors: string[] = [];

    if ('tcNumber' in data && data.tcNumber && !this.validateTcNumber(data.tcNumber)) {
      errors.push('Invalid TC Number format');
    }

    if ('birthDate' in data && data.birthDate) {
      const birthDate = new Date(data.birthDate);
      const today = new Date();
      
      if (birthDate > today) {
        errors.push('Birth date cannot be in the future');
      }
      
      const age = this.calculateAge(data.birthDate);
      if (age > 150) {
        errors.push('Invalid birth date - age cannot exceed 150 years');
      }
    }

    if ('contactInfo' in data && data.contactInfo?.phone) {
      const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
      if (!phoneRegex.test(data.contactInfo.phone.replace(/\s/g, ''))) {
        errors.push('Invalid Turkish phone number format');
      }
    }

    if ('contactInfo' in data && data.contactInfo?.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.contactInfo.email)) {
        errors.push('Invalid email format');
      }
    }

    return errors;
  }

  /**
   * Formats patient name for display
   */
  static formatPatientName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.trim();
  }

  /**
   * Generates patient display ID
   */
  static generateDisplayId(patient: Patient): string {
    const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase();
    const idSuffix = patient.id.slice(-4);
    return `${initials}-${idSuffix}`;
  }

  /**
   * Checks if patient data needs verification
   */
  static needsVerification(patient: Patient): boolean {
    return !patient.contactInfo.phone || 
           !patient.contactInfo.email || 
           !patient.tcNumber;
  }
}