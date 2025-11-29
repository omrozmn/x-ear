// Utility Functions for API Client

import { ApiResponse, ApiError } from './types';

// Case conversion utilities
export function toCamelCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  
  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
    }
  }
  return result;
}

export function toSnakeCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  
  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(obj[key]);
    }
  }
  return result;
}

// Error normalization
export function normalizeError(error: any): ApiError {
  return {
    code: error?.response?.status?.toString() ?? error?.status?.toString() ?? 'NETWORK',
    message: error?.response?.data?.error?.message ?? 
             error?.response?.data?.message ?? 
             error?.message ?? 
             'Unknown error',
    details: error?.response?.data,
    status: error?.response?.status ?? error?.status
  };
}

// Response wrapper for consistent envelope
export function wrapResponse<T>(promise: Promise<any>): Promise<ApiResponse<T>> {
  return promise
    .then(res => ({
      success: true,
      data: res as T,
      timestamp: new Date().toISOString()
    }))
    .catch(err => ({
      success: false,
      error: normalizeError(err).message,
      timestamp: new Date().toISOString()
    }));
}

// Retry utility
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError;
}

// Timeout utility
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// Shadow validation utility (development only)
export async function shadowValidation(
  operation: string, 
  generatedResult: Promise<any>, 
  legacyResult: Promise<any>
): Promise<void> {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return;
  }
  
  try {
    const [gen, leg] = await Promise.allSettled([generatedResult, legacyResult]);
    
    const genValue = gen.status === 'fulfilled' ? gen.value : gen.reason;
    const legValue = leg.status === 'fulfilled' ? leg.value : leg.reason;
    
    console.log(`[Shadow Validation] ${operation}:`, {
      generated: { status: gen.status, value: genValue },
      legacy: { status: leg.status, value: legValue },
      match: JSON.stringify(genValue) === JSON.stringify(legValue)
    });
  } catch (error) {
    console.warn(`[Shadow Validation] ${operation} failed:`, error);
  }
}

// URL builder utility
export function buildUrl(baseUrl: string, endpoint: string, params?: Record<string, any>): string {
  const url = new URL(endpoint, baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });
  }
  
  return url.toString();
}

// Headers utility
export function buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add authentication if available
  if (typeof window !== 'undefined') {
    const token = window.localStorage?.getItem('authToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  // Merge custom headers
  if (customHeaders) {
    Object.assign(headers, customHeaders);
  }
  
  return headers;
}