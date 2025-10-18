import { format, parseISO, isValid, differenceInYears, addDays, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';

/**
 * Formats a date string or Date object to Turkish locale format
 */
export const formatDate = (date: string | Date, formatStr: string = 'dd.MM.yyyy'): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return format(dateObj, formatStr, { locale: tr });
  } catch {
    return '';
  }
};

/**
 * Formats a date for display in Turkish format
 */
export const formatDateTurkish = (date: string | Date): string => {
  return formatDate(date, 'dd MMMM yyyy');
};

/**
 * Formats a date and time for display
 */
export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'dd.MM.yyyy HH:mm');
};

/**
 * Calculates age from birth date
 */
export const calculateAge = (birthDate: string | Date): number => {
  try {
    const birth = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate;
    if (!isValid(birth)) return 0;
    return differenceInYears(new Date(), birth);
  } catch {
    return 0;
  }
};

/**
 * Checks if a date is today
 */
export const isToday = (date: string | Date): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return false;
    const today = new Date();
    return formatDate(dateObj, 'yyyy-MM-dd') === formatDate(today, 'yyyy-MM-dd');
  } catch {
    return false;
  }
};

/**
 * Gets the start of day for a date
 */
export const getStartOfDay = (date: string | Date): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return startOfDay(dateObj);
};

/**
 * Gets the end of day for a date
 */
export const getEndOfDay = (date: string | Date): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return endOfDay(dateObj);
};

/**
 * Adds days to a date
 */
export const addDaysToDate = (date: string | Date, days: number): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addDays(dateObj, days);
};

/**
 * Converts a date to ISO string format
 */
export const toISOString = (date: Date): string => {
  return date.toISOString();
};

/**
 * Validates if a string is a valid date
 */
export const isValidDate = (dateString: string): boolean => {
  try {
    const date = parseISO(dateString);
    return isValid(date);
  } catch {
    return false;
  }
};