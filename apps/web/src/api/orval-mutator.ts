import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig, AxiosInstance, AxiosError } from 'axios';
import humps from 'humps';
import { outbox, OutboxOperation } from '../utils/outbox';
import { tokenManager } from '../utils/token-manager';

// Extend Axios types for custom properties
declare module 'axios' {
  export interface AxiosRequestConfig {
    __isRetryRequest?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    __isRetryRequest?: boolean;
  }
}

interface ExtendedAxiosInstance extends AxiosInstance {
  _refreshing?: boolean;
  _refreshSubscribers?: Array<(token: string | null) => void>;
}

interface RefreshResponse {
  accessToken?: string;
  access_token?: string;
}

// Hybrid Converter: Adds CamelCase keys while preserving SnakeCase keys
// Canonical Case Converter: Strictly camelCase
// Replaces previous hybrid approach to ensure idempotency and type consistency
// We keep the name 'hybridCamelize' for backward compatibility with imports
// Resource errors need extra properties
interface ExtendedError extends Error {
  code?: string;
  response?: { status: number };
  retryAfter?: number;
  originalError?: unknown;
}

export const hybridCamelize = (data: unknown): unknown => {
  if (Array.isArray(data)) {
    return data.map(hybridCamelize);
  }
  if (data && typeof data === 'object' && data !== null && !(data instanceof Date)) {
    // Strictly return camelized keys - NO hybrid snake_case keys
    // This ensures data shape is deterministic for idempotency hashing
    return humps.camelizeKeys(data as Record<string, unknown>);
  }
  return data;
};

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
function isRetryableError(error: unknown): boolean {
  const err = error as ExtendedError;
  // Check error codes
  if (err.code && RETRY_CONFIG.retryableErrors.includes(err.code)) {
    return true;
  }

  // Check HTTP status codes
  if (err.response?.status && RETRY_CONFIG.retryableStatusCodes.includes(err.response.status)) {
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
  } catch (error: unknown) {
    const err = error as ExtendedError;
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
      error: err.code || err.message
    });

    await sleep(delay);

    // Retry the request
    return retryRequest(requestFn, config, attempt + 1);
  }
}

// Standalone Key Generator for universal use
export const generateIdempotencyKey = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

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
function handleResourceError(error: unknown, config: AxiosRequestConfig): Error {
  const resourceError = new Error('Kaynak limiti aşıldı. Lütfen bir süre sonra tekrar deneyin.') as ExtendedError;
  resourceError.name = 'ResourceError';

  // Add retry suggestion
  resourceError.retryAfter = 5000; // Suggest retry after 5 seconds
  resourceError.originalError = error;

  console.warn('Kaynak kısıtlaması tespit edildi:', {
    url: config.url,
    method: config.method,
    error: error instanceof Error ? error.message : 'Unknown error'
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
      console.warn('[orval-mutator] İstek için token bulunamadı:', config.url);
    }

    // URL rewriting logic has been removed as backend now supports Unified Endpoints.
    // All roles (Tenant Admin, Super Admin) access the same endpoints.
    // Sub-resource filtering and permission checks are handled by AccessContext on the backend.

    // DEMO MODE CHECK (Rule 4): Demo (9001) is read-only
    const isDemoMode = typeof window !== 'undefined' && window.location.port === '9001';
    if (isDemoMode && config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
      console.warn('[orval-mutator] Demo modunda yazma işlemleri engellendi:', config.url);
      return Promise.reject(new Error('Demo modunda sadece okuma yapılabilir.'));
    }

    // Add idempotency key for non-GET requests
    if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
      const idempotencyKey = config.headers['Idempotency-Key'] || generateIdempotencyKey();
      config.headers['Idempotency-Key'] = idempotencyKey;
    }

    // Add request ID for tracing
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    config.headers['X-Request-ID'] = requestId;

    // URL rewriting logic has been removed as backend now supports Unified Endpoints.

    // Case Conversion: Convert payload to snake_case for backend
    // DISABLED: Backend expects camelCase as per OpenAPI spec and generated types.
    // The previous conversion to snake_case was causing 422 Validation Errors (e.g. missing 'partyId')
    // because the backend received 'party_id' but validated against 'partyId'.
    /*
    if (config.data && !(config.data instanceof FormData)) {
      config.data = humps.decamelizeKeys(config.data);
    }
    */

    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and offline support
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.data) {
      // Apply hybrid conversion to response data
      response.data = hybridCamelize(response.data);
    }
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
        const createAuthRefresh = tokenManager.createAuthRefresh;

        console.log('[orval-mutator] 401 error detected:', {
          url: config.url,
          isAuthEndpoint,
          hasRefreshToken: !!createAuthRefresh
        });

        const extendedClient = apiClient as ExtendedAxiosInstance;

        if (!extendedClient._refreshing) {
          extendedClient._refreshing = true;
          extendedClient._refreshSubscribers = [] as Array<(token: string | null) => void>;
          try {
            if (!createAuthRefresh) {
              console.error('[orval-mutator] Yenileme token\'ı mevcut değil');
              throw new Error('Yenileme token\'ı mevcut değil');
            }

            console.log('[orval-mutator] Attempting token refresh...');

            // Bypass apiClient to avoid attaching the expired access token
            const refreshUrl = `${API_BASE_URL}/api/auth/refresh`;
            let refreshResp: AxiosResponse<RefreshResponse>;

            try {
              // Try with Authorization header first (preferred by backend)
              console.log('[orval-mutator] Trying refresh with Authorization header...');
              refreshResp = await axios.post(refreshUrl, {}, {
                headers: { Authorization: `Bearer ${createAuthRefresh}` },
                withCredentials: true,
              });
            } catch (err) {
              console.log('[orval-mutator] Header refresh failed, trying with token in body...');
              // Fallback to body-based refresh
              try {
                refreshResp = await axios.post(refreshUrl, { createAuthRefresh }, { withCredentials: false });
              } catch (err2) {
                console.error('[orval-mutator] Both refresh attempts failed:', err);
                throw err;
              }
            }

            console.log('[orval-mutator] Refresh response:', {
              status: refreshResp.status,
              hasAccessToken: !!refreshResp.data?.access_token || !!refreshResp.data?.accessToken
            });

            if (refreshResp.status === 200 && refreshResp.data) {
              const newToken = refreshResp.data.access_token || refreshResp.data.accessToken || null;
              if (newToken) {
                console.log('[orval-mutator] Token refresh successful, updating via TokenManager...');
                // Use TokenManager to update token (single source of truth)
                tokenManager.updateAccessToken(newToken);
                extendedClient._refreshSubscribers?.forEach((cb) => cb(newToken));
              } else {
                console.error('[orval-mutator] No access token in refresh response');
                extendedClient._refreshSubscribers?.forEach((cb) => cb(null));
              }
            } else {
              console.error('[orval-mutator] Refresh failed with status:', refreshResp.status);
              extendedClient._refreshSubscribers?.forEach((cb) => cb(null));
              // Clear tokens via TokenManager
              tokenManager.clearTokens();
            }
          } catch (e) {
            console.error('[orval-mutator] Token refresh error:', e);
            extendedClient._refreshSubscribers?.forEach((cb) => cb(null));
            // Clear tokens via TokenManager
            tokenManager.clearTokens();
          } finally {
            extendedClient._refreshing = false;
            extendedClient._refreshSubscribers = [];
          }
        } else {
          console.log('[orval-mutator] Refresh already in progress, waiting...');
        }

        return new Promise((resolve, reject) => {
          extendedClient._refreshSubscribers?.push((token: string | null) => {
            if (token) {
              config.__isRetryRequest = true;
              config.headers = config.headers || {};
              config.headers['Authorization'] = `Bearer ${token}`;
              resolve(extendedClient(config));
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
    const err = error as ExtendedError;
    if (err.code === 'ERR_INSUFFICIENT_RESOURCES' ||
      err.code === 'ECONNRESET' ||
      err.code === 'ENOTFOUND' ||
      (err.response?.status === 429) || // Too Many Requests
      (err.response?.status === 503)) { // Service Unavailable
      return Promise.reject(handleResourceError(error, config));
    }

    // Handle network errors (offline scenarios)
    // Only queue non-GET requests - GET requests should be re-fetched by UI when online
    if (!err.response && err.code === 'ERR_NETWORK') {
      const method = config?.method?.toUpperCase() || 'GET';

      if (method !== 'GET') {
        console.warn('Ağ hatası tespit edildi, istek çevrimdışı işleme için sıraya alınıyor');
        await queueOfflineRequest(config);
        // Return a rejected promise with offline error for mutations
        const offlineError = new Error('İstek çevrimdışı işleme için sıraya alındı');
        offlineError.name = 'OfflineError';
        return Promise.reject(offlineError);
      } else {
        // For GET requests, just reject with the original error so react-query can retry
        console.warn('GET isteği için ağ hatası tespit edildi, sıraya alınmıyor (UI tarafından yeniden çekilecek)');
        return Promise.reject(error);
      }
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
export { apiClient, AxiosError };

// Default export for Orval
export default customInstance;