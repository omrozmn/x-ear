/**
 * Validates Turkish Citizenship Number (TC Kimlik No)
 */
export const validateTcNumber = (tcNumber: string): boolean => {
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
};

/**
 * Validates Turkish phone number
 */
export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  
  const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validates email address
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 */
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates required field
 */
export const validateRequired = (value: any, fieldName: string): string | null => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * Validates string length
 */
export const validateLength = (
  value: string, 
  min: number, 
  max: number, 
  fieldName: string
): string | null => {
  if (!value) return null;
  
  if (value.length < min) {
    return `${fieldName} must be at least ${min} characters long`;
  }
  
  if (value.length > max) {
    return `${fieldName} must not exceed ${max} characters`;
  }
  
  return null;
};

/**
 * Validates numeric range
 */
export const validateRange = (
  value: number, 
  min: number, 
  max: number, 
  fieldName: string
): string | null => {
  if (value === null || value === undefined) return null;
  
  if (value < min) {
    return `${fieldName} must be at least ${min}`;
  }
  
  if (value > max) {
    return `${fieldName} must not exceed ${max}`;
  }
  
  return null;
};

/**
 * Validates date format and range
 */
export const validateDate = (
  dateString: string, 
  fieldName: string,
  options?: {
    minDate?: Date;
    maxDate?: Date;
    allowFuture?: boolean;
    allowPast?: boolean;
  }
): string | null => {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return `${fieldName} must be a valid date`;
  }
  
  const now = new Date();
  
  if (options?.allowFuture === false && date > now) {
    return `${fieldName} cannot be in the future`;
  }
  
  if (options?.allowPast === false && date < now) {
    return `${fieldName} cannot be in the past`;
  }
  
  if (options?.minDate && date < options.minDate) {
    return `${fieldName} cannot be before ${options.minDate.toDateString()}`;
  }
  
  if (options?.maxDate && date > options.maxDate) {
    return `${fieldName} cannot be after ${options.maxDate.toDateString()}`;
  }
  
  return null;
};

/**
 * Validates URL format
 */
export const validateUrl = (url: string): boolean => {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};