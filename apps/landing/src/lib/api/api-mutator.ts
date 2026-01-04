import axios, { AxiosRequestConfig } from 'axios';
import { apiClient } from './api-client';

/**
 * Orval Mutator for Landing App
 * 
 * This function is used by Orval-generated hooks to make API requests.
 * It uses the centralized apiClient which includes:
 * - Token management
 * - Auto token refresh
 * - Retry mechanism
 * - Idempotency keys
 * - Request tracing
 */
export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const source = axios.CancelToken.source();
  
  const promise = apiClient({
    ...config,
    cancelToken: source.token,
  }).then(({ data }) => data) as Promise<T> & { cancel: () => void };

  // Add cancel method for React Query
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};

// Export apiClient for direct usage if needed
export { apiClient };
