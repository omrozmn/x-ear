import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from '../error-utils';

describe('extractErrorMessage', () => {
  it('should extract string error from response.data.error', () => {
    const error = {
      response: { data: { error: 'Test error message' } }
    };
    expect(extractErrorMessage(error)).toBe('Test error message');
  });

  it('should extract message from error object', () => {
    const error = {
      response: { data: { error: { message: 'Object error message' } } }
    };
    expect(extractErrorMessage(error)).toBe('Object error message');
  });

  it('should extract from response.data.message', () => {
    const error = {
      response: { data: { message: 'Direct message' } }
    };
    expect(extractErrorMessage(error)).toBe('Direct message');
  });

  it('should extract from error.message', () => {
    const error = { message: 'Error message' };
    expect(extractErrorMessage(error)).toBe('Error message');
  });

  it('should return default message for unknown error', () => {
    const error = { unknown: 'structure' };
    expect(extractErrorMessage(error)).toBe('İşlem başarısız oldu');
  });

  it('should use custom default message', () => {
    const error = {};
    expect(extractErrorMessage(error, 'Custom default')).toBe('Custom default');
  });

  it('should handle null error', () => {
    expect(extractErrorMessage(null)).toBe('İşlem başarısız oldu');
  });

  it('should handle undefined error', () => {
    expect(extractErrorMessage(undefined)).toBe('İşlem başarısız oldu');
  });

  it('should prioritize response.data.error over response.data.message', () => {
    const error = {
      response: {
        data: {
          error: 'Error from error field',
          message: 'Error from message field'
        }
      }
    };
    expect(extractErrorMessage(error)).toBe('Error from error field');
  });

  it('should handle nested error structures', () => {
    const error = {
      response: {
        data: {
          error: {
            message: 'Nested error message',
            code: 'ERROR_CODE',
            details: { field: 'value' }
          }
        }
      }
    };
    expect(extractErrorMessage(error)).toBe('Nested error message');
  });
});
