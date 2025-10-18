// Invoice Form Validation Utilities
// Based on legacy validation logic

export class InvoiceValidationUtils {
  /**
   * Validate Turkish Tax Number (VKN - Vergi Kimlik Numarası)
   */
  static validateTurkishTaxNumber(taxNumber: string): boolean {
    if (!taxNumber || taxNumber.length !== 10) return false;
    
    const digits = taxNumber.split('').map(Number);
    if (digits.some(isNaN)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * (10 - i);
    }
    
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;
    
    return checkDigit === digits[9];
  }

  /**
   * Validate Turkish Citizen Number (TCKN - T.C. Kimlik Numarası)
   */
  static validateTCKN(tckn: string): boolean {
    if (!tckn || tckn.length !== 11) return false;
    
    const digits = tckn.split('').map(Number);
    if (digits.some(isNaN)) return false;
    
    // First digit cannot be 0
    if (digits[0] === 0) return false;
    
    // Calculate check digits
    const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
    
    const checkDigit10 = ((oddSum * 7) - evenSum) % 10;
    const checkDigit11 = (oddSum + evenSum + checkDigit10) % 10;
    
    return checkDigit10 === digits[9] && checkDigit11 === digits[10];
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): boolean {
    if (!email) return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate Turkish phone number
   */
  static validateTurkishPhone(phone: string): boolean {
    if (!phone) return false;
    
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Turkish mobile: 5XXXXXXXXX (10 digits) or +905XXXXXXXXX (13 digits)
    // Turkish landline: 2XX XXXXXXX or 3XX XXXXXXX (10 digits)
    if (cleanPhone.length === 10) {
      return /^[2-5]\d{9}$/.test(cleanPhone);
    } else if (cleanPhone.length === 13) {
      return /^905\d{9}$/.test(cleanPhone);
    }
    
    return false;
  }

  /**
   * Validate postal code (Turkey)
   */
  static validateTurkishPostalCode(postalCode: string): boolean {
    if (!postalCode) return false;
    
    // Turkish postal codes are 5 digits
    return /^\d{5}$/.test(postalCode);
  }

  /**
   * Validate amount (positive number with max 2 decimal places)
   */
  static validateAmount(amount: string | number): boolean {
    if (amount === '' || amount === null || amount === undefined) return false;
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount) || numAmount < 0) return false;
    
    // Check max 2 decimal places
    const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
    return decimalPlaces <= 2;
  }

  /**
   * Validate percentage (0-100)
   */
  static validatePercentage(percentage: string | number): boolean {
    if (percentage === '' || percentage === null || percentage === undefined) return false;
    
    const numPercentage = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
    return !isNaN(numPercentage) && numPercentage >= 0 && numPercentage <= 100;
  }

  /**
   * Validate date (not in future for invoice dates)
   */
  static validateInvoiceDate(date: string): boolean {
    if (!date) return false;
    
    const invoiceDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    return invoiceDate <= today && invoiceDate >= new Date('2000-01-01');
  }

  /**
   * Validate due date (must be after invoice date)
   */
  static validateDueDate(dueDate: string, invoiceDate: string): boolean {
    if (!dueDate || !invoiceDate) return false;
    
    const due = new Date(dueDate);
    const invoice = new Date(invoiceDate);
    
    return due >= invoice;
  }

  /**
   * Generate idempotency key for form submissions
   */
  static generateIdempotencyKey(): string {
    return `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format Turkish currency
   */
  static formatTurkishCurrency(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format Turkish phone number for display
   */
  static formatTurkishPhone(phone: string): string {
    if (!phone) return '';
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 10) {
      // Format as (0XXX) XXX XX XX
      return `(0${cleanPhone.substr(0, 3)}) ${cleanPhone.substr(3, 3)} ${cleanPhone.substr(6, 2)} ${cleanPhone.substr(8, 2)}`;
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('905')) {
      // Format as +90 (5XX) XXX XX XX
      return `+90 (${cleanPhone.substr(2, 3)}) ${cleanPhone.substr(5, 3)} ${cleanPhone.substr(8, 2)} ${cleanPhone.substr(10, 2)}`;
    }
    
    return phone;
  }

  /**
   * Clean and format tax number
   */
  static formatTaxNumber(taxNumber: string): string {
    if (!taxNumber) return '';
    
    const cleanTaxNumber = taxNumber.replace(/\D/g, '');
    
    if (cleanTaxNumber.length === 10) {
      // Format VKN as XXX XXX XX XX
      return `${cleanTaxNumber.substr(0, 3)} ${cleanTaxNumber.substr(3, 3)} ${cleanTaxNumber.substr(6, 2)} ${cleanTaxNumber.substr(8, 2)}`;
    } else if (cleanTaxNumber.length === 11) {
      // Format TCKN as XXX XXX XXX XX
      return `${cleanTaxNumber.substr(0, 3)} ${cleanTaxNumber.substr(3, 3)} ${cleanTaxNumber.substr(6, 3)} ${cleanTaxNumber.substr(9, 2)}`;
    }
    
    return taxNumber;
  }
}