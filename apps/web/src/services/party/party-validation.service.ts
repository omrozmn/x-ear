/**
 * Party Validation Service
 * @fileoverview Handles party data validation and business rules
 * @version 1.0.0
 */

import type { PartyRead as OrvalParty } from '@/api/generated/schemas';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

export class PartyValidationService {

  validateParty(party: Partial<OrvalParty>, existingParties: OrvalParty[] = []): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field validations
    this.validateRequiredFields(party, errors);

    // Format validations
    this.validateFormats(party, errors, warnings);

    // Business rule validations
    this.validateBusinessRules(party, errors, warnings);

    // Uniqueness validations
    this.validateUniqueness(party, existingParties, errors);

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings
    };
  }

  validateTcNumber(tcNumber: string, excludePartyId?: string, existingParties: OrvalParty[] = []): boolean {
    // Basic format check
    if (!tcNumber || tcNumber.length !== 11) {
      return false;
    }

    // Must be all digits
    if (!/^\d{11}$/.test(tcNumber)) {
      return false;
    }

    // TC Number algorithm validation
    if (!this.isValidTcNumberAlgorithm(tcNumber)) {
      return false;
    }

    // Check uniqueness
    const existingParty = existingParties.find(p =>
      p.tcNumber === tcNumber && p.id !== excludePartyId
    );

    return !existingParty;
  }

  validatePhone(phone: string): boolean {
    if (!phone) return false;

    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');

    // Turkish phone number validation
    // Mobile: 5XX XXX XX XX (10 digits starting with 5)
    // Landline: 2XX XXX XX XX or 3XX XXX XX XX (10 digits starting with 2 or 3)
    // With country code: +90 or 0090 prefix

    if (cleanPhone.length === 10) {
      // Local format: 5XXXXXXXXX or 2XXXXXXXXX or 3XXXXXXXXX
      return /^[235]\d{9}$/.test(cleanPhone);
    } else if (cleanPhone.length === 11) {
      // With leading 0: 05XXXXXXXXX or 02XXXXXXXXX or 03XXXXXXXXX
      return /^0[235]\d{9}$/.test(cleanPhone);
    } else if (cleanPhone.length === 12) {
      // With country code: 905XXXXXXXXX or 902XXXXXXXXX or 903XXXXXXXXX
      return /^90[235]\d{9}$/.test(cleanPhone);
    } else if (cleanPhone.length === 13) {
      // With 00 prefix: 0090XXXXXXXXXX
      return /^0090[235]\d{9}$/.test(cleanPhone);
    }

    return false;
  }

  validateEmail(email: string): boolean {
    if (!email) return true; // Email is optional

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateBirthDate(birthDate: string): boolean {
    if (!birthDate) return true; // Birth date is optional

    const date = new Date(birthDate);
    const now = new Date();

    // Must be a valid date
    if (isNaN(date.getTime())) {
      return false;
    }

    // Must be in the past
    if (date >= now) {
      return false;
    }

    // Must be reasonable (not more than 120 years ago)
    const maxAge = new Date();
    maxAge.setFullYear(maxAge.getFullYear() - 120);

    return date >= maxAge;
  }

  private validateRequiredFields(party: Partial<OrvalParty>, errors: ValidationError[]): void {
    // Phone is required
    if (!party.phone || !party.phone.trim()) {
      errors.push({
        field: 'phone',
        code: 'REQUIRED',
        message: 'Telefon numarası zorunludur',
        severity: 'error'
      });
    }

    // Name is required (firstName and lastName)
    if (!party.firstName || !party.firstName.trim()) {
      errors.push({
        field: 'firstName',
        code: 'REQUIRED',
        message: 'Hasta adı zorunludur',
        severity: 'error'
      });
    }

    if (!party.lastName || !party.lastName.trim()) {
      errors.push({
        field: 'lastName',
        code: 'REQUIRED',
        message: 'Hasta soyadı zorunludur',
        severity: 'error'
      });
    }
  }

  private validateFormats(party: Partial<OrvalParty>, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Phone format validation
    if (party.phone && !this.validatePhone(party.phone)) {
      errors.push({
        field: 'phone',
        code: 'INVALID_FORMAT',
        message: 'Geçersiz telefon numarası formatı',
        severity: 'error'
      });
    }

    // TC Number format validation
    if (party.tcNumber && !this.isValidTcNumberAlgorithm(party.tcNumber)) {
      errors.push({
        field: 'tcNumber',
        code: 'INVALID_FORMAT',
        message: 'Geçersiz TC Kimlik Numarası',
        severity: 'error'
      });
    }

    // Email format validation
    if (party.email && !this.validateEmail(party.email)) {
      errors.push({
        field: 'email',
        code: 'INVALID_FORMAT',
        message: 'Geçersiz e-posta adresi formatı',
        severity: 'error'
      });
    }

    // Birth date validation
    if (party.birthDate && !this.validateBirthDate(party.birthDate)) {
      errors.push({
        field: 'birthDate',
        code: 'INVALID_DATE',
        message: 'Geçersiz doğum tarihi',
        severity: 'error'
      });
    }
  }

  private validateBusinessRules(party: Partial<OrvalParty>, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Age-related warnings
    if (party.birthDate) {
      const age = this.calculateAge(party.birthDate);

      if (age < 18) {
        warnings.push({
          field: 'birthDate',
          code: 'MINOR_PARTY',
          message: 'Hasta 18 yaşından küçük',
          suggestion: 'Veli bilgilerini eklemeyi unutmayın'
        });
      }

      if (age > 90) {
        warnings.push({
          field: 'birthDate',
          code: 'ELDERLY_PARTY',
          message: 'Hasta 90 yaşından büyük',
          suggestion: 'Yaş bilgisini kontrol edin'
        });
      }
    }

    // Status consistency checks - archived status no longer exists
    // if (party.status === 'archived' && party.segment !== 'renewal') {
    //   warnings.push({
    //     field: 'status',
    //     code: 'STATUS_SEGMENT_MISMATCH',
    //     message: 'Arşivlenmiş hasta için segment uyumsuzluğu',
    //     suggestion: 'Segment bilgisini kontrol edin'
    //   });
    // }

    // Device-related validations are now handled separately
    // These fields no longer exist in Orval Party
  }

  private validateUniqueness(party: Partial<OrvalParty>, existingParties: OrvalParty[], errors: ValidationError[]): void {
    // TC Number uniqueness
    if (party.tcNumber) {
      const duplicate = existingParties.find(p =>
        p.tcNumber === party.tcNumber && p.id !== party.id
      );

      if (duplicate) {
        const duplicateName = `${duplicate.firstName || ''} ${duplicate.lastName || ''}`.trim();
        errors.push({
          field: 'tcNumber',
          code: 'DUPLICATE',
          message: `Bu TC Kimlik Numarası başka bir hasta tarafından kullanılıyor: ${duplicateName}`,
          severity: 'error'
        });
      }
    }

    // Phone uniqueness (warning only, as family members might share phones)
    if (party.phone) {
      const duplicate = existingParties.find(p =>
        p.phone === party.phone && p.id !== party.id
      );

      if (duplicate) {
        const duplicateName = `${duplicate.firstName || ''} ${duplicate.lastName || ''}`.trim();
        errors.push({
          field: 'phone',
          code: 'DUPLICATE_WARNING',
          message: `Bu telefon numarası başka bir hasta tarafından kullanılıyor: ${duplicateName}`,
          severity: 'warning'
        });
      }
    }
  }

  private isValidTcNumberAlgorithm(tcNumber: string): boolean {
    if (!tcNumber || tcNumber.length !== 11) return false;

    const digits = tcNumber.split('').map(Number);

    // First digit cannot be 0
    if (digits[0] === 0) return false;

    // Calculate check digits
    const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const evenSum = digits[1] + digits[3] + digits[5] + digits[7];

    const check1 = ((oddSum * 7) - evenSum) % 10;
    const check2 = (oddSum + evenSum + digits[9]) % 10;

    return digits[9] === check1 && digits[10] === check2;
  }

  private calculateAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }
}

export const partyValidationService = new PartyValidationService();
