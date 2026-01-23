import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';

export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: unknown;
  timestamp: Date;
}

export const useErrorHandler = () => {
  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((error: unknown) => {
    console.error('Error caught by useErrorHandler:', error);

    let appError: AppError;

    if (error instanceof AxiosError) {
      // API errors
      appError = {
        message: error.response?.data?.message || error.message || 'Bir API hatası oluştu',
        code: error.code,
        statusCode: error.response?.status,
        details: error.response?.data,
        timestamp: new Date()
      };
    } else if (error instanceof Error) {
      // JavaScript errors
      appError = {
        message: error.message || 'Beklenmeyen bir hata oluştu',
        details: error.stack,
        timestamp: new Date()
      };
    } else if (typeof error === 'string') {
      // String errors
      appError = {
        message: error,
        timestamp: new Date()
      };
    } else {
      // Unknown errors
      appError = {
        message: 'Bilinmeyen bir hata oluştu',
        details: error,
        timestamp: new Date()
      };
    }

    setError(appError);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const withErrorHandling = useCallback(
    async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await asyncFn();
        return result;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  const retry = useCallback(
    async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
      clearError();
      return withErrorHandling(asyncFn);
    },
    [clearError, withErrorHandling]
  );

  return {
    error,
    isLoading,
    handleError,
    clearError,
    withErrorHandling,
    retry
  };
};

// Utility functions for common error scenarios
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.message || 'API hatası oluştu';
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Bilinmeyen bir hata oluştu';
};

export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    return !error.response || error.code === 'NETWORK_ERROR';
  }
  return false;
};

export const isUnauthorizedError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    return error.response?.status === 401;
  }
  return false;
};

export const isForbiddenError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    return error.response?.status === 403;
  }
  return false;
};

export const isNotFoundError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    return error.response?.status === 404;
  }
  return false;
};

export const isValidationError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    return error.response?.status === 422 || error.response?.status === 400;
  }
  return false;
};