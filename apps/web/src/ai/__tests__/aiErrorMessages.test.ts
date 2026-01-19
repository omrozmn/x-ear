/**
 * AI Error Messages Utility Tests
 * 
 * Tests for error handling utilities including:
 * - Error message mapping
 * - HTTP status categorization
 * - Retry logic with exponential backoff
 * 
 * @module ai/__tests__/aiErrorMessages.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAIErrorMessage,
  getErrorConfig,
  getHttpStatus,
  getErrorCategory,
  isClientError,
  isRateLimitError,
  isServerError,
  isRetryableError,
  getRetryDelay,
  getMaxRetries,
  withRetry,
  createAIError,
  isAIError,
  extractErrorCode,
  MAX_RETRY_ATTEMPTS,
  MAX_RETRY_DELAY_MS,
  DEFAULT_RETRY_DELAY_MS,
} from '../utils/aiErrorMessages';
import type { AIErrorCode, AIError } from '../types/ai.types';

describe('aiErrorMessages', () => {
  // ==========================================================================
  // Error Message Mapping Tests
  // ==========================================================================
  describe('getAIErrorMessage', () => {
    it('should return Turkish message for AI_DISABLED', () => {
      expect(getAIErrorMessage('AI_DISABLED')).toBe('AI şu anda devre dışı.');
    });

    it('should return Turkish message for RATE_LIMITED', () => {
      expect(getAIErrorMessage('RATE_LIMITED')).toBe(
        'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.'
      );
    });

    it('should return Turkish message for QUOTA_EXCEEDED', () => {
      expect(getAIErrorMessage('QUOTA_EXCEEDED')).toBe('Günlük AI limitinize ulaştınız.');
    });

    it('should return Turkish message for INFERENCE_ERROR', () => {
      expect(getAIErrorMessage('INFERENCE_ERROR')).toBe(
        'AI yanıt veremedi. Lütfen tekrar deneyin.'
      );
    });

    it('should return Turkish message for APPROVAL_REQUIRED', () => {
      expect(getAIErrorMessage('APPROVAL_REQUIRED')).toBe(
        'Bu işlem admin onayı gerektiriyor.'
      );
    });

    it('should return default message for unknown error code', () => {
      expect(getAIErrorMessage('UNKNOWN_ERROR' as AIErrorCode)).toBe(
        'Beklenmeyen bir hata oluştu.'
      );
    });
  });

  // ==========================================================================
  // HTTP Status Categorization Tests
  // ==========================================================================
  describe('getHttpStatus', () => {
    it('should return 403 for AI_DISABLED', () => {
      expect(getHttpStatus('AI_DISABLED')).toBe(403);
    });

    it('should return 429 for RATE_LIMITED', () => {
      expect(getHttpStatus('RATE_LIMITED')).toBe(429);
    });

    it('should return 503 for INFERENCE_ERROR', () => {
      expect(getHttpStatus('INFERENCE_ERROR')).toBe(503);
    });

    it('should return 504 for INFERENCE_TIMEOUT', () => {
      expect(getHttpStatus('INFERENCE_TIMEOUT')).toBe(504);
    });

    it('should return 500 for unknown error code', () => {
      expect(getHttpStatus('UNKNOWN_ERROR' as AIErrorCode)).toBe(500);
    });
  });

  describe('getErrorCategory', () => {
    it('should return "client" for 4xx errors', () => {
      expect(getErrorCategory('AI_DISABLED')).toBe('client');
      expect(getErrorCategory('PERMISSION_DENIED')).toBe('client');
      expect(getErrorCategory('INVALID_REQUEST')).toBe('client');
      expect(getErrorCategory('NOT_FOUND')).toBe('client');
    });

    it('should return "rate_limit" for 429 errors', () => {
      expect(getErrorCategory('RATE_LIMITED')).toBe('rate_limit');
      expect(getErrorCategory('QUOTA_EXCEEDED')).toBe('rate_limit');
    });

    it('should return "server" for 5xx errors', () => {
      expect(getErrorCategory('INFERENCE_ERROR')).toBe('server');
      expect(getErrorCategory('INFERENCE_TIMEOUT')).toBe('server');
    });
  });

  describe('isClientError', () => {
    it('should return true for client errors', () => {
      expect(isClientError('AI_DISABLED')).toBe(true);
      expect(isClientError('PERMISSION_DENIED')).toBe(true);
      expect(isClientError('APPROVAL_REQUIRED')).toBe(true);
    });

    it('should return false for non-client errors', () => {
      expect(isClientError('RATE_LIMITED')).toBe(false);
      expect(isClientError('INFERENCE_ERROR')).toBe(false);
    });
  });

  describe('isRateLimitError', () => {
    it('should return true for rate limit errors', () => {
      expect(isRateLimitError('RATE_LIMITED')).toBe(true);
      expect(isRateLimitError('QUOTA_EXCEEDED')).toBe(true);
    });

    it('should return false for non-rate-limit errors', () => {
      expect(isRateLimitError('AI_DISABLED')).toBe(false);
      expect(isRateLimitError('INFERENCE_ERROR')).toBe(false);
    });
  });

  describe('isServerError', () => {
    it('should return true for server errors', () => {
      expect(isServerError('INFERENCE_ERROR')).toBe(true);
      expect(isServerError('INFERENCE_TIMEOUT')).toBe(true);
    });

    it('should return false for non-server errors', () => {
      expect(isServerError('AI_DISABLED')).toBe(false);
      expect(isServerError('RATE_LIMITED')).toBe(false);
    });
  });

  // ==========================================================================
  // Retry Logic Tests
  // ==========================================================================
  describe('isRetryableError', () => {
    it('should return true for retryable 5xx errors', () => {
      expect(isRetryableError('INFERENCE_ERROR')).toBe(true);
      expect(isRetryableError('INFERENCE_TIMEOUT')).toBe(true);
    });

    it('should return true for retryable 429 errors', () => {
      expect(isRetryableError('RATE_LIMITED')).toBe(true);
    });

    it('should return false for QUOTA_EXCEEDED (needs quota reset)', () => {
      expect(isRetryableError('QUOTA_EXCEEDED')).toBe(false);
    });

    it('should return false for 4xx client errors', () => {
      expect(isRetryableError('AI_DISABLED')).toBe(false);
      expect(isRetryableError('PERMISSION_DENIED')).toBe(false);
      expect(isRetryableError('APPROVAL_REQUIRED')).toBe(false);
      expect(isRetryableError('INVALID_REQUEST')).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return base delay for attempt 0', () => {
      // INFERENCE_ERROR has base delay of 1000ms
      expect(getRetryDelay('INFERENCE_ERROR', 0)).toBe(1000);
    });

    it('should apply exponential backoff', () => {
      // INFERENCE_ERROR: 1000 * 2^0 = 1000, 1000 * 2^1 = 2000, 1000 * 2^2 = 4000
      expect(getRetryDelay('INFERENCE_ERROR', 0)).toBe(1000);
      expect(getRetryDelay('INFERENCE_ERROR', 1)).toBe(2000);
      expect(getRetryDelay('INFERENCE_ERROR', 2)).toBe(4000);
    });

    it('should cap delay at MAX_RETRY_DELAY_MS', () => {
      // Even with high attempt number, should not exceed 8000ms
      expect(getRetryDelay('INFERENCE_ERROR', 10)).toBe(MAX_RETRY_DELAY_MS);
    });

    it('should use different base delays for different errors', () => {
      // RATE_LIMITED has base delay of 5000ms
      expect(getRetryDelay('RATE_LIMITED', 0)).toBe(5000);
      // INFERENCE_TIMEOUT has base delay of 2000ms
      expect(getRetryDelay('INFERENCE_TIMEOUT', 0)).toBe(2000);
    });
  });

  describe('getMaxRetries', () => {
    it('should return MAX_RETRY_ATTEMPTS for retryable errors', () => {
      expect(getMaxRetries('INFERENCE_ERROR')).toBe(MAX_RETRY_ATTEMPTS);
      expect(getMaxRetries('RATE_LIMITED')).toBe(MAX_RETRY_ATTEMPTS);
    });

    it('should return 0 for non-retryable errors', () => {
      expect(getMaxRetries('AI_DISABLED')).toBe(0);
      expect(getMaxRetries('QUOTA_EXCEEDED')).toBe(0);
    });
  });

  // ==========================================================================
  // withRetry Helper Tests
  // ==========================================================================
  describe('withRetry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return result on first successful call', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const resultPromise = withRetry(fn, { errorCode: 'INFERENCE_ERROR' });
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      const error: AIError = { code: 'INFERENCE_ERROR', message: 'Error' };
      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const resultPromise = withRetry(fn, { errorCode: 'INFERENCE_ERROR' });
      
      // First call fails
      await vi.advanceTimersByTimeAsync(0);
      // Wait for retry delay
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable error', async () => {
      const error: AIError = { code: 'AI_DISABLED', message: 'Disabled' };
      const fn = vi.fn().mockRejectedValue(error);

      const resultPromise = withRetry(fn, { errorCode: 'AI_DISABLED' });

      await expect(resultPromise).rejects.toEqual(error);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback before each retry', async () => {
      const error: AIError = { code: 'INFERENCE_ERROR', message: 'Error' };
      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');
      const onRetry = vi.fn();

      const resultPromise = withRetry(fn, {
        errorCode: 'INFERENCE_ERROR',
        onRetry,
      });

      // First call fails
      await vi.advanceTimersByTimeAsync(0);
      // First retry
      await vi.advanceTimersByTimeAsync(1000);
      // Second retry
      await vi.advanceTimersByTimeAsync(2000);

      await resultPromise;

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, 1000, expect.any(Object));
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, 2000, expect.any(Object));
    });

    it('should throw after max retries exceeded', async () => {
      const error: AIError = { code: 'INFERENCE_ERROR', message: 'Error' };
      const fn = vi.fn().mockRejectedValue(error);

      const resultPromise = withRetry(fn, {
        errorCode: 'INFERENCE_ERROR',
        maxRetries: 2,
      });

      // Attach catch handler immediately to prevent unhandled rejection
      const catchPromise = resultPromise.catch((e) => e);

      // Run through all retries
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);

      const caughtError = await catchPromise;
      expect(caughtError).toEqual(error);
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should respect retryAfter from error', async () => {
      const error: AIError = {
        code: 'RATE_LIMITED',
        message: 'Rate limited',
        retryAfter: 10, // 10 seconds
      };
      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');
      const onRetry = vi.fn();

      const resultPromise = withRetry(fn, {
        errorCode: 'RATE_LIMITED',
        onRetry,
        respectRetryAfter: true,
      });

      await vi.advanceTimersByTimeAsync(0);
      // Should use max of calculated delay and retryAfter * 1000
      await vi.advanceTimersByTimeAsync(10000);

      await resultPromise;

      // Delay should be max(5000, 10000) = 10000, but capped at 8000
      expect(onRetry).toHaveBeenCalledWith(1, 8000, expect.any(Object));
    });
  });

  // ==========================================================================
  // AIError Utility Tests
  // ==========================================================================
  describe('createAIError', () => {
    it('should create AIError with correct message', () => {
      const error = createAIError('AI_DISABLED');
      expect(error.code).toBe('AI_DISABLED');
      expect(error.message).toBe('AI şu anda devre dışı.');
    });

    it('should include requestId when provided', () => {
      const error = createAIError('INFERENCE_ERROR', 'req-123');
      expect(error.requestId).toBe('req-123');
    });

    it('should include details when provided', () => {
      const details = { field: 'value' };
      const error = createAIError('INVALID_REQUEST', undefined, details);
      expect(error.details).toEqual(details);
    });

    it('should include retryAfter for retryable errors', () => {
      const error = createAIError('INFERENCE_ERROR');
      expect(error.retryAfter).toBeDefined();
    });

    it('should not include retryAfter for non-retryable errors', () => {
      const error = createAIError('AI_DISABLED');
      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('isAIError', () => {
    it('should return true for valid AIError', () => {
      const error: AIError = { code: 'AI_DISABLED', message: 'Disabled' };
      expect(isAIError(error)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isAIError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isAIError(undefined)).toBe(false);
    });

    it('should return false for plain Error', () => {
      expect(isAIError(new Error('test'))).toBe(false);
    });

    it('should return false for object without code', () => {
      expect(isAIError({ message: 'test' })).toBe(false);
    });

    it('should return false for object without message', () => {
      expect(isAIError({ code: 'AI_DISABLED' })).toBe(false);
    });
  });

  describe('extractErrorCode', () => {
    it('should extract code from AIError', () => {
      const error: AIError = { code: 'AI_DISABLED', message: 'Disabled' };
      expect(extractErrorCode(error)).toBe('AI_DISABLED');
    });

    it('should return undefined for non-AIError', () => {
      expect(extractErrorCode(new Error('test'))).toBeUndefined();
      expect(extractErrorCode(null)).toBeUndefined();
      expect(extractErrorCode({ message: 'test' })).toBeUndefined();
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================
  describe('constants', () => {
    it('should have correct MAX_RETRY_ATTEMPTS', () => {
      expect(MAX_RETRY_ATTEMPTS).toBe(3);
    });

    it('should have correct MAX_RETRY_DELAY_MS', () => {
      expect(MAX_RETRY_DELAY_MS).toBe(8000);
    });

    it('should have correct DEFAULT_RETRY_DELAY_MS', () => {
      expect(DEFAULT_RETRY_DELAY_MS).toBe(1000);
    });
  });
});
