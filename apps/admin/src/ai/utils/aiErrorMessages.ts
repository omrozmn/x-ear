/**
 * AI Error Messages Utility
 * 
 * This module provides error handling utilities for AI-related operations.
 * It maps backend error codes to user-friendly Turkish messages and provides
 * retry logic with exponential backoff for retryable errors.
 * 
 * @module ai/utils/aiErrorMessages
 * 
 * Requirements: 10, 15
 * - Maps AIErrorCode values to Turkish messages
 * - HTTP status categorization (4xx, 5xx, 429)
 * - Retry logic with exponential backoff
 */

import type { AIErrorCode, AIError } from '../types/ai.types';

// =============================================================================
// Error Configuration Types
// =============================================================================

/**
 * Configuration for each error code
 */
interface ErrorConfig {
  /** User-friendly Turkish message */
  message: string;
  /** HTTP status code associated with this error */
  httpStatus: number;
  /** Whether this error can be retried */
  retryable: boolean;
  /** Base delay in milliseconds for retry (if retryable) */
  retryAfterMs?: number;
  /** HTTP status category */
  category: 'client' | 'rate_limit' | 'server';
}

// =============================================================================
// Error Configuration Map
// =============================================================================

/**
 * Complete mapping of AI error codes to their configurations
 * 
 * Categories:
 * - 4xx (Client Errors): NOT retryable - user/request issues
 * - 429 (Rate Limiting): Conditionally retryable with backoff
 * - 5xx (Server Errors): Retryable with exponential backoff
 */
const ERROR_CONFIG: Record<AIErrorCode, ErrorConfig> = {
  // -------------------------------------------------------------------------
  // 4xx - Client Errors (NOT retryable)
  // -------------------------------------------------------------------------
  AI_DISABLED: {
    message: 'AI şu anda devre dışı.',
    httpStatus: 403,
    retryable: false,
    category: 'client',
  },
  PHASE_BLOCKED: {
    message: 'Bu işlem mevcut AI fazında desteklenmiyor.',
    httpStatus: 409,
    retryable: false,
    category: 'client',
  },
  PERMISSION_DENIED: {
    message: 'Bu işlem için yetkiniz yok.',
    httpStatus: 403,
    retryable: false,
    category: 'client',
  },
  APPROVAL_REQUIRED: {
    message: 'Bu işlem admin onayı gerektiriyor.',
    httpStatus: 403,
    retryable: false,
    category: 'client',
  },
  APPROVAL_EXPIRED: {
    message: 'Onay süresi doldu. Lütfen yeni bir istek oluşturun.',
    httpStatus: 400,
    retryable: false,
    category: 'client',
  },
  APPROVAL_INVALID: {
    message: 'Geçersiz onay tokeni.',
    httpStatus: 400,
    retryable: false,
    category: 'client',
  },
  PLAN_DRIFT: {
    message: 'İşlem planı değişti. Lütfen yeni bir plan oluşturun.',
    httpStatus: 409,
    retryable: false,
    category: 'client',
  },
  TENANT_VIOLATION: {
    message: 'Tenant erişim ihlali.',
    httpStatus: 403,
    retryable: false,
    category: 'client',
  },
  GUARDRAIL_VIOLATION: {
    message: 'Mesajınız güvenlik filtreleri tarafından engellendi.',
    httpStatus: 400,
    retryable: false,
    category: 'client',
  },
  NOT_FOUND: {
    message: 'İstenen kaynak bulunamadı.',
    httpStatus: 404,
    retryable: false,
    category: 'client',
  },
  INVALID_REQUEST: {
    message: 'Geçersiz istek.',
    httpStatus: 400,
    retryable: false,
    category: 'client',
  },

  // -------------------------------------------------------------------------
  // 429 - Rate Limiting (conditionally retryable)
  // -------------------------------------------------------------------------
  RATE_LIMITED: {
    message: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.',
    httpStatus: 429,
    retryable: true,
    retryAfterMs: 5000,
    category: 'rate_limit',
  },
  QUOTA_EXCEEDED: {
    message: 'Günlük AI limitinize ulaştınız.',
    httpStatus: 429,
    retryable: false, // Quota reset requires time, not immediate retry
    category: 'rate_limit',
  },

  // -------------------------------------------------------------------------
  // 5xx - Server Errors (retryable with exponential backoff)
  // -------------------------------------------------------------------------
  INFERENCE_ERROR: {
    message: 'AI yanıt veremedi. Lütfen tekrar deneyin.',
    httpStatus: 503,
    retryable: true,
    retryAfterMs: 1000,
    category: 'server',
  },
  INFERENCE_TIMEOUT: {
    message: 'AI yanıt süresi aşıldı. Lütfen tekrar deneyin.',
    httpStatus: 504,
    retryable: true,
    retryAfterMs: 2000,
    category: 'server',
  },
};

// =============================================================================
// Default/Fallback Configuration
// =============================================================================

const DEFAULT_ERROR_CONFIG: ErrorConfig = {
  message: 'Beklenmeyen bir hata oluştu.',
  httpStatus: 500,
  retryable: false,
  category: 'server',
};

// =============================================================================
// Retry Configuration Constants
// =============================================================================

/** Maximum number of retry attempts */
const MAX_RETRY_ATTEMPTS = 3;

/** Maximum delay between retries in milliseconds */
const MAX_RETRY_DELAY_MS = 8000;

/** Default base delay for retries in milliseconds */
const DEFAULT_RETRY_DELAY_MS = 1000;

// =============================================================================
// Error Message Functions
// =============================================================================

/**
 * Get user-friendly Turkish error message for an AI error code
 * 
 * @param code - The AI error code from backend
 * @returns User-friendly Turkish message
 * 
 * @example
 * ```ts
 * const message = getAIErrorMessage('RATE_LIMITED');
 * // Returns: "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin."
 * ```
 */
export function getAIErrorMessage(code: AIErrorCode): string {
  return ERROR_CONFIG[code]?.message ?? DEFAULT_ERROR_CONFIG.message;
}

/**
 * Get the full error configuration for an error code
 * 
 * @param code - The AI error code
 * @returns Full error configuration object
 */
export function getErrorConfig(code: AIErrorCode): ErrorConfig {
  return ERROR_CONFIG[code] ?? DEFAULT_ERROR_CONFIG;
}

// =============================================================================
// HTTP Status Categorization Functions
// =============================================================================

/**
 * Get the HTTP status code associated with an error code
 * 
 * @param code - The AI error code
 * @returns HTTP status code (e.g., 400, 403, 429, 503)
 */
export function getHttpStatus(code: AIErrorCode): number {
  return ERROR_CONFIG[code]?.httpStatus ?? DEFAULT_ERROR_CONFIG.httpStatus;
}

/**
 * Get the error category for an error code
 * 
 * @param code - The AI error code
 * @returns Error category: 'client' (4xx), 'rate_limit' (429), or 'server' (5xx)
 */
export function getErrorCategory(code: AIErrorCode): 'client' | 'rate_limit' | 'server' {
  return ERROR_CONFIG[code]?.category ?? DEFAULT_ERROR_CONFIG.category;
}

/**
 * Check if an error is a client error (4xx)
 * 
 * @param code - The AI error code
 * @returns true if this is a client error
 */
export function isClientError(code: AIErrorCode): boolean {
  return getErrorCategory(code) === 'client';
}

/**
 * Check if an error is a rate limit error (429)
 * 
 * @param code - The AI error code
 * @returns true if this is a rate limit error
 */
export function isRateLimitError(code: AIErrorCode): boolean {
  return getErrorCategory(code) === 'rate_limit';
}

/**
 * Check if an error is a server error (5xx)
 * 
 * @param code - The AI error code
 * @returns true if this is a server error
 */
export function isServerError(code: AIErrorCode): boolean {
  return getErrorCategory(code) === 'server';
}

// =============================================================================
// Retry Logic Functions
// =============================================================================

/**
 * Check if an error is retryable
 * 
 * Only 5xx server errors and some 429 rate limit errors are retryable.
 * Client errors (4xx) are NOT retryable as they indicate user/request issues.
 * 
 * @param code - The AI error code
 * @returns true if the error can be retried
 * 
 * @example
 * ```ts
 * isRetryableError('INFERENCE_ERROR'); // true (5xx)
 * isRetryableError('RATE_LIMITED');    // true (429)
 * isRetryableError('QUOTA_EXCEEDED');  // false (429 but needs quota reset)
 * isRetryableError('AI_DISABLED');     // false (4xx)
 * ```
 */
export function isRetryableError(code: AIErrorCode): boolean {
  return ERROR_CONFIG[code]?.retryable ?? false;
}

/**
 * Calculate retry delay with exponential backoff
 * 
 * Uses the formula: baseDelay * 2^attempt
 * Capped at MAX_RETRY_DELAY_MS (8 seconds)
 * 
 * @param code - The AI error code
 * @param attempt - The current retry attempt (0-indexed)
 * @returns Delay in milliseconds before next retry
 * 
 * @example
 * ```ts
 * getRetryDelay('INFERENCE_ERROR', 0); // 1000ms (1s)
 * getRetryDelay('INFERENCE_ERROR', 1); // 2000ms (2s)
 * getRetryDelay('INFERENCE_ERROR', 2); // 4000ms (4s)
 * getRetryDelay('RATE_LIMITED', 0);    // 5000ms (5s base)
 * ```
 */
export function getRetryDelay(code: AIErrorCode, attempt: number): number {
  const baseDelay = ERROR_CONFIG[code]?.retryAfterMs ?? DEFAULT_RETRY_DELAY_MS;
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  return Math.min(exponentialDelay, MAX_RETRY_DELAY_MS);
}

/**
 * Get the maximum number of retry attempts for an error code
 * 
 * @param code - The AI error code
 * @returns Maximum retry attempts (0 if not retryable)
 */
export function getMaxRetries(code: AIErrorCode): number {
  if (!isRetryableError(code)) return 0;
  return MAX_RETRY_ATTEMPTS;
}

// =============================================================================
// Retry Helper Function
// =============================================================================

/**
 * Options for the withRetry helper
 */
export interface WithRetryOptions {
  /** Callback called before each retry attempt */
  onRetry?: (attempt: number, delay: number, error: Error) => void;
  /** Override the error code for retry logic (useful when error code is unknown initially) */
  errorCode?: AIErrorCode;
  /** Custom maximum retry attempts (defaults to MAX_RETRY_ATTEMPTS) */
  maxRetries?: number;
  /** Whether to respect retry-after header from server */
  respectRetryAfter?: boolean;
}

/**
 * Execute a function with automatic retry logic and exponential backoff
 * 
 * This helper wraps an async function and automatically retries it on
 * retryable errors (5xx and some 429 errors) with exponential backoff.
 * 
 * @param fn - The async function to execute
 * @param options - Retry options
 * @returns The result of the function
 * @throws The last error if all retries fail
 * 
 * @example
 * ```ts
 * // Basic usage
 * const result = await withRetry(
 *   () => apiClient.post('/ai/chat', { prompt: 'Hello' }),
 *   { errorCode: 'INFERENCE_ERROR' }
 * );
 * 
 * // With retry callback
 * const result = await withRetry(
 *   () => sendChatMessage(prompt),
 *   {
 *     errorCode: 'INFERENCE_ERROR',
 *     onRetry: (attempt, delay) => {
 *       console.log(`Retry ${attempt} in ${delay}ms`);
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: WithRetryOptions = {}
): Promise<T> {
  const {
    onRetry,
    errorCode,
    maxRetries: customMaxRetries,
    respectRetryAfter = true,
  } = options;

  // Determine max retries
  const maxRetries = customMaxRetries ?? (errorCode ? getMaxRetries(errorCode) : MAX_RETRY_ATTEMPTS);
  
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Extract error code from AIError if available
      const aiError = error as AIError;
      const currentErrorCode = aiError?.code ?? errorCode;

      // Check if we should retry
      const shouldRetry = 
        attempt < maxRetries && 
        currentErrorCode && 
        isRetryableError(currentErrorCode);

      if (!shouldRetry) {
        throw lastError;
      }

      // Calculate delay
      let delay = currentErrorCode 
        ? getRetryDelay(currentErrorCode, attempt)
        : DEFAULT_RETRY_DELAY_MS * Math.pow(2, attempt);

      // Respect retry-after header if present
      if (respectRetryAfter && aiError?.retryAfter) {
        delay = Math.max(delay, aiError.retryAfter * 1000);
      }

      // Cap the delay
      delay = Math.min(delay, MAX_RETRY_DELAY_MS);

      // Call retry callback
      onRetry?.(attempt + 1, delay, lastError);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError ?? new Error('Unknown error in withRetry');
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Sleep for a specified duration
 * 
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create an AIError object from an error code
 * 
 * @param code - The AI error code
 * @param requestId - Optional request ID
 * @param details - Optional additional details
 * @returns Structured AIError object
 */
export function createAIError(
  code: AIErrorCode,
  requestId?: string,
  details?: Record<string, unknown>
): AIError {
  const config = getErrorConfig(code);
  return {
    code,
    message: config.message,
    requestId,
    retryAfter: config.retryable ? config.retryAfterMs : undefined,
    details,
  };
}

/**
 * Check if an unknown error is an AIError
 * 
 * @param error - The error to check
 * @returns true if the error is an AIError
 */
export function isAIError(error: unknown): error is AIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as AIError).code === 'string' &&
    'message' in error
  );
}

/**
 * Extract error code from an unknown error
 * 
 * @param error - The error to extract from
 * @returns The AIErrorCode if found, undefined otherwise
 */
export function extractErrorCode(error: unknown): AIErrorCode | undefined {
  if (isAIError(error)) {
    return error.code;
  }
  return undefined;
}

// =============================================================================
// Export Constants for External Use
// =============================================================================

export { MAX_RETRY_ATTEMPTS, MAX_RETRY_DELAY_MS, DEFAULT_RETRY_DELAY_MS };
