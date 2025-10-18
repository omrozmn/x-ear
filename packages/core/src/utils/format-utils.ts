import { Money } from '../domain/types/common';

/**
 * Formats a phone number to Turkish format
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle Turkish phone numbers
  if (digits.startsWith('90')) {
    // +90 format
    const number = digits.slice(2);
    if (number.length === 10) {
      return `+90 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6, 8)} ${number.slice(8)}`;
    }
  } else if (digits.startsWith('0') && digits.length === 11) {
    // 0xxx format
    const number = digits.slice(1);
    return `0${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6, 8)} ${number.slice(8)}`;
  } else if (digits.length === 10) {
    // xxx format
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  }
  
  return phone; // Return original if can't format
};

/**
 * Formats Turkish Citizenship Number (TC Kimlik No)
 */
export const formatTcNumber = (tcNumber: string): string => {
  if (!tcNumber) return '';
  
  const digits = tcNumber.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  }
  
  return tcNumber;
};

/**
 * Formats money amount with currency
 */
export const formatMoney = (money: Money): string => {
  if (!money || money.amount === undefined) return '';
  
  const formatter = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: money.currency || 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(money.amount);
};

/**
 * Formats a number with Turkish locale
 */
export const formatNumber = (number: number, decimals: number = 0): string => {
  if (number === undefined || number === null) return '';
  
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

/**
 * Formats percentage
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  if (value === undefined || value === null) return '';
  
  return new Intl.NumberFormat('tr-TR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

/**
 * Capitalizes first letter of each word
 */
export const capitalizeWords = (text: string): string => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Truncates text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Formats file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Masks sensitive information (like TC number)
 */
export const maskSensitiveInfo = (text: string, visibleChars: number = 4): string => {
  if (!text || text.length <= visibleChars) return text;
  
  const visible = text.slice(-visibleChars);
  const masked = '*'.repeat(text.length - visibleChars);
  
  return masked + visible;
};