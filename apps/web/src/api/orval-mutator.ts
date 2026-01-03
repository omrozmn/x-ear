import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { outbox, OutboxOperation } from '../utils/outbox';
import { tokenManager } from '../utils/token-manager';

// API Configuration - NO /api suffix because Orval paths already include it
const API_BASE_URL = typeof window !== 'undefined' && import.meta?.env?.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') // Remove trailing /api if present
  : 'http://localhost:5003'; // Just host+port, Orval adds /api

// Connection pooling and retry configuration
const CONNECTION_CONFIG = {
  timeout: 15000,
  maxRedirects: 3,
  maxContentLength: 50 * 1024 * 1024, // 50MB
  // Connection pooling settings
  maxSockets: 10, // Limit concurrent connections
  maxFreeSockets: 5,
  keepAlive: true,
  keepAliveMsecs: 30000,
};

// Retry configuration with exponential backoff
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryableErrors: [
    'ERR_INSUFFICIENT_RESOURCES',
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNREFUSED'
  ],
  retryableStatusCodes: [429, 503, 502, 504]
};

// Create axios instance with proper configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: CONNECTION_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
  // ensure cookies (refresh-token cookies, samesite etc.) are sent with requests
  withCredentials: true,
  maxRedirects: CONNECTION_CONFIG.maxRedirects,
  maxContentLength: CONNECTION_CONFIG.maxContentLength,
});

// Exponential backoff utility
function calculateBackoffDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

// Sleep utility for delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if error is retryable
function isRetryableError(error: any): boolean {
  // Check error codes
  if (error.code && RETRY_CONFIG.retryableErrors.includes(error.code)) {
    return true;
  }

  // Check HTTP status codes
  if (error.response?.status && RETRY_CONFIG.retryableStatusCodes.includes(error.response.status)) {
    return true;
  }

  return false;
}

// Retry wrapper with exponential backoff
async function retryRequest<T>(
  requestFn: () => Promise<T>,
  config: AxiosRequestConfig,
  attempt: number = 1
): Promise<T> {
  try {
    return await requestFn();
  } catch (error: any) {
    // Don't retry if we've exceeded max attempts
    if (attempt >= RETRY_CONFIG.maxRetries) {
      throw error;
    }

    // Don't retry if error is not retryable
    if (!isRetryableError(error)) {
      throw error;
    }

    // Calculate delay and wait
    const delay = calculateBackoffDelay(attempt);
    console.warn(`Request failed (attempt ${attempt}/${RETRY_CONFIG.maxRetries}), retrying in ${delay}ms:`, {
      url: config.url,
      method: config.method,
      error: error.code || error.message
    });

    await sleep(delay);

    // Retry the request
    return retryRequest(requestFn, config, attempt + 1);
  }
}

// Idempotency manager for request deduplication
class IdempotencyManager {
  private cache = new Map<string, Promise<unknown>>();

  getCachedRequest(key: string): Promise<unknown> | null {
    return this.cache.get(key) || null;
  }

  setCachedRequest(key: string, promise: Promise<unknown>): void {
    this.cache.set(key, promise);

    // Clean up after 5 minutes
    setTimeout(() => {
      this.cache.delete(key);
    }, 5 * 60 * 1000);
  }

  generateKey(config: AxiosRequestConfig): string {
    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url || '';
    const dataHash = config.data ? JSON.stringify(config.data) : '';
    return `${method}:${url}:${dataHash}`;
  }
}

// Create instance but don't use it yet - will be used for future idempotency features
// eslint-disable-next-line @typescript-eslint/no-unused-vars

// Queue request in outbox for offline support
async function queueOfflineRequest(config: AxiosRequestConfig): Promise<void> {
  try {
    const operation: OutboxOperation = {
      method: (config.method?.toUpperCase() as OutboxOperation['method']) || 'GET',
      endpoint: `${config.url}`,
      data: config.data,
      headers: config.headers as Record<string, string>,
      priority: 'normal'
    };

    await outbox.addOperation(operation);

    // Dispatch event for UI feedback
    window.dispatchEvent(new CustomEvent('api:queued', { detail: { config } }));
  } catch (error) {
    console.error('Failed to queue offline request:', error);
  }
}

// Enhanced error handling for resource constraints
function handleResourceError(error: any, config: AxiosRequestConfig): Error {
  const resourceError = new Error('Resource limit exceeded. Please try again in a moment.');
  resourceError.name = 'ResourceError';

  // Add retry suggestion
  (resourceError as any).retryAfter = 5000; // Suggest retry after 5 seconds
  (resourceError as any).originalError = error;

  console.warn('Resource constraint detected:', {
    url: config.url,
    method: config.method,
    error: error.code || error.message
  });

  return resourceError;
}

// Request interceptor for authentication and idempotency
apiClient.interceptors.request.use(
  (config) => {
    // Get token from TokenManager (single source of truth)
    const token = tokenManager.accessToken;
    const isAdmin = tokenManager.isAdmin();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;

      // DEBUG LOG
      console.log('[orval-mutator] Request interceptor:', {
        url: config.url,
        method: config.method,
        tokenSource: 'TokenManager',
        tokenPreview: token.substring(0, 50) + '...',
        tokenIdentity: tokenManager.getUserId(),
        isAdmin,
        tokenTTL: tokenManager.getAccessTokenTTL(),
        isExpired: tokenManager.isAccessTokenExpired()
      });
    } else {
      console.warn('[orval-mutator] No token found for request:', config.url);
    }

    // URL rewriting logic has been removed as backend now supports Unified Endpoints.
    // All roles (Tenant Admin, Super Admin) access the same endpoints.
    // Sub-resource filtering and permission checks are handled by AccessContext on the backend.

    // Add idempotency key for non-GET requests
    if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
      const idempotencyKey = config.headers['Idempotency-Key'] ||
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      config.headers['Idempotency-Key'] = idempotencyKey;
    }

    // Add request ID for tracing
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    config.headers['X-Request-ID'] = requestId;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and offline support
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const config = error.config;

    // Skip 401 handling for auth endpoints where 401 is expected (login, register, etc.)
    const isAuthEndpoint = config?.url?.includes('/auth/login') ||
      config?.url?.includes('/auth/register') ||
      config?.url?.includes('/auth/verify-otp') ||
      config?.url?.includes('/auth/forgot-password');

    // Handle 401 by attempting a silent refresh and replaying the original request
    try {
      if (error.response?.status === 401 && config && !config.__isRetryRequest && !isAuthEndpoint) {
        const refreshToken = tokenManager.refreshToken;
        
        console.log('[orval-mutator] 401 error detected:', {
          url: config.url,
          isAuthEndpoint,
          hasRefreshToken: !!refreshToken
        });
        
        if (!(apiClient as any)._refreshing) {
          (apiClient as any)._refreshing = true;
          (apiClient as any)._refreshSubscribers = [] as Array<(token: string | null) => void>;
          try {
            if (!refreshToken) {
              console.error('[orval-mutator] No refresh token available');
              throw new Error('No refresh token available');
            }

            console.log('[orval-mutator] Attempting token refresh...');
            
            // Bypass apiClient to avoid attaching the expired access token
            const refreshUrl = `${API_BASE_URL}/api/auth/refresh`;
            let refreshResp: { status: number; data: any };
            
            try {
              // Try with Authorization header first (preferred by backend)
              console.log('[orval-mutator] Trying refresh with Authorization header...');
              refreshResp = await axios.post(refreshUrl, {}, {
                headers: { Authorization: `Bearer ${refreshToken}` },
                withCredentials: true,
              });
            } catch (err) {
              console.log('[orval-mutator] Header refresh failed, trying with token in body...');
              // Fallback to body-based refresh
              try {
                refreshResp = await axios.post(refreshUrl, { refreshToken }, { withCredentials: false });
              } catch (err2) {
                console.error('[orval-mutator] Both refresh attempts failed:', err);
                throw err;
              }
            }

            console.log('[orval-mutator] Refresh response:', {
              status: refreshResp.status,
              hasAccessToken: !!(refreshResp.data as any).access_token || !!(refreshResp.data as any).accessToken
            });

            if (refreshResp.status === 200 && refreshResp.data) {
              const newToken = (refreshResp.data as any).access_token || (refreshResp.data as any).accessToken || null;
              if (newToken) {
                console.log('[orval-mutator] Token refresh successful, updating via TokenManager...');
                // Use TokenManager to update token (single source of truth)
                tokenManager.updateAccessToken(newToken);
                (apiClient as any)._refreshSubscribers.forEach((cb: any) => cb(newToken));
              } else {
                console.error('[orval-mutator] No access token in refresh response');
                (apiClient as any)._refreshSubscribers.forEach((cb: any) => cb(null));
              }
            } else {
              console.error('[orval-mutator] Refresh failed with status:', refreshResp.status);
              (apiClient as any)._refreshSubscribers.forEach((cb: any) => cb(null));
              // Clear tokens via TokenManager
              tokenManager.clearTokens();
            }
          } catch (e) {
            console.error('[orval-mutator] Token refresh error:', e);
            (apiClient as any)._refreshSubscribers.forEach((cb: any) => cb(null));
            // Clear tokens via TokenManager
            tokenManager.clearTokens();
          } finally {
            (apiClient as any)._refreshing = false;
            (apiClient as any)._refreshSubscribers = [];
          }
        } else {
          console.log('[orval-mutator] Refresh already in progress, waiting...');
        }

        return new Promise((resolve, reject) => {
          (apiClient as any)._refreshSubscribers.push((token: string | null) => {
            if (token) {
              config.__isRetryRequest = true;
              config.headers = config.headers || {};
              config.headers['Authorization'] = `Bearer ${token}`;
              resolve(apiClient(config));
            } else {
              // Failed to refresh - tokens already cleared by TokenManager
              reject(error);
            }
          });
        });
      }
    } catch (e) {
      console.warn('[orval-mutator] error during refresh handling', e);
    }

    // Handle resource constraint errors (ERR_INSUFFICIENT_RESOURCES, connection limits, etc.)
    if (error.code === 'ERR_INSUFFICIENT_RESOURCES' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND' ||
      (error.response?.status === 429) || // Too Many Requests
      (error.response?.status === 503)) { // Service Unavailable
      return Promise.reject(handleResourceError(error, config));
    }

    // Handle network errors (offline scenarios)
    if (!error.response && error.code === 'ERR_NETWORK') {
      console.warn('Network error detected, queuing request for offline processing');
      await queueOfflineRequest(config);

      // Return a rejected promise with offline error
      const offlineError = new Error('Request queued for offline processing');
      offlineError.name = 'OfflineError';
      return Promise.reject(offlineError);
    }

    // Handle other errors normally
    return Promise.reject(error);
  }
);

// Orval mutator function - customInstance must be a function that returns axios instance or promise
export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  // Fix for FormData: If data is FormData, remove Content-Type: application/json
  // so that axios can set the correct multipart/form-data header with boundary.
  if (config.data instanceof FormData && config.headers?.['Content-Type'] === 'application/json') {
    delete config.headers['Content-Type'];
  }

  const source = axios.CancelToken.source();
  const promise = apiClient({
    ...config,
    cancelToken: source.token,
  }).then(({ data }) => data) as Promise<T> & { cancel: () => void };

  // Add cancel property for react-query
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};

// Export retry utility for manual use if needed
export { retryRequest, calculateBackoffDelay, isRetryableError };

// Export the configured axios instance for direct usage
export { apiClient };

// Default export for Orval
export default customInstance;