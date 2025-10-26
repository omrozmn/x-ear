import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique idempotency key for API requests
 * This ensures that duplicate requests don't create duplicate resources
 */
export const generateIdempotencyKey = (): string => {
  return `idem_${Date.now()}_${uuidv4()}`;
};

/**
 * Create a deterministic idempotency key based on operation and data
 * Useful for retries where we want the same key for the same operation
 */
export const createDeterministicKey = (
  operation: string,
  data: any,
  userId?: string
): string => {
  const dataHash = btoa(JSON.stringify(data)).replace(/[^a-zA-Z0-9]/g, '');
  const userPart = userId ? `_${userId}` : '';
  return `idem_${operation}_${dataHash}${userPart}`;
};

/**
 * Validate idempotency key format
 */
export const isValidIdempotencyKey = (key: string): boolean => {
  return /^idem_[a-zA-Z0-9_-]+$/.test(key);
};

/**
 * Extract timestamp from idempotency key (if generated with generateIdempotencyKey)
 */
export const extractTimestampFromKey = (key: string): number | null => {
  const match = key.match(/^idem_(\d+)_/);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Check if idempotency key is expired (older than specified minutes)
 */
export const isKeyExpired = (key: string, expiryMinutes: number = 60): boolean => {
  const timestamp = extractTimestampFromKey(key);
  if (!timestamp) return false;
  
  const now = Date.now();
  const expiryTime = timestamp + (expiryMinutes * 60 * 1000);
  
  return now > expiryTime;
};