import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AUTH_TOKEN, REFRESH_TOKEN } from '../constants/storage-keys';
import { outbox, OutboxOperation } from '../utils/outbox';

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
    // Add auth token if available. Support global window token, persisted zustand storage, new key, and legacy key.
    let token: string | null = null;
    try {
      const tryParse = (raw: string | null) => {
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            if (typeof parsed.token === 'string') return parsed.token;
            if (parsed.state && typeof parsed.state === 'object' && typeof parsed.state.token === 'string') return parsed.state.token;
          }
        } catch (e) {
          // not JSON
        }
        return null;
      };

      const persistedKeys = ['auth-storage', 'persist:auth-storage', 'auth-store', 'persist:auth-store'];
      let persistedToken: string | null = null;
      for (const key of persistedKeys) {
        try {
          const raw = (typeof window !== 'undefined') ? localStorage.getItem(key) : null;
          const t = tryParse(raw);
          if (t) { persistedToken = t; break; }
        } catch (e) { /* ignore */ }
      }

      token = (typeof window !== 'undefined' ? (window as any).__AUTH_TOKEN__ : null) || persistedToken || localStorage.getItem(AUTH_TOKEN) || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
    } catch (e) {
      // ignore storage access or JSON parse errors
    }
    if (token) {
      try {
        // Mask token for logs
        const masked = token.slice(0, 8) + '...' + token.slice(-8);
        console.debug('[orval-mutator] Attaching auth token to request', { url: config.url, token: masked });
      } catch (e) { }
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.debug('[orval-mutator] No auth token found for request', { url: config.url });
    }

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

    // Handle 401 by attempting a silent refresh and replaying the original request
    try {
      if (error.response?.status === 401 && config && !config.__isRetryRequest) {
        if (!(apiClient as any)._refreshing) {
          (apiClient as any)._refreshing = true;
          (apiClient as any)._refreshSubscribers = [] as Array<(token: string | null) => void>;
          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) throw new Error('No refresh token available');

            // Bypass apiClient to avoid attaching the expired access token
            // Explicitly set the Authorization header with the Refresh Token
            // Prefer sending refresh token in the request body without credentials
            // to avoid CORS `withCredentials` network failures. Fall back to
            // credentialed request if necessary.
            const refreshUrl = `${API_BASE_URL}/api/auth/refresh`;
            let refreshResp;
            try {
              refreshResp = await axios.post(refreshUrl, { refreshToken }, { withCredentials: false });
            } catch (err) {
              // If the non-credentialed attempt fails (server expects cookie-based flow),
              // try again including credentials so cookie-based refresh can work.
              try {
                refreshResp = await axios.post(refreshUrl, {}, {
                  headers: { Authorization: `Bearer ${refreshToken}` },
                  withCredentials: true,
                });
              } catch (err2) {
                throw err; // propagate original error
              }
            }

            if (refreshResp.status === 200 && refreshResp.data) {
              const newToken = (refreshResp.data as any).access_token || (refreshResp.data as any).accessToken || null;
              if (newToken) {
                try {
                  localStorage.setItem('auth_token', newToken);
                  localStorage.setItem(AUTH_TOKEN, newToken);
                } catch (e) { }
                (window as any).__AUTH_TOKEN__ = newToken;
                axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                (apiClient as any)._refreshSubscribers.forEach((cb: any) => cb(newToken));
              } else {
                (apiClient as any)._refreshSubscribers.forEach((cb: any) => cb(null));
              }
            } else {
              (apiClient as any)._refreshSubscribers.forEach((cb: any) => cb(null));
              // Force logout if refresh endpoint returns non-200
              try {
                // Use store to clear auth state cleanly without reload loop
                const { logout } = useAuthStore.getState();
                logout();
              } catch (e) {
                // Fallback if store access fails
                try {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('refresh_token');
                  localStorage.removeItem(AUTH_TOKEN);
                  localStorage.removeItem(REFRESH_TOKEN);
                  sessionStorage.clear();
                } catch (err) { }
                delete (window as any).__AUTH_TOKEN__;
              }
            }
          } catch (e) {
            (apiClient as any)._refreshSubscribers.forEach((cb: any) => cb(null));
            // Force logout on error
            try {
              const { logout } = useAuthStore.getState();
              logout();
            } catch (err) {
              try {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem(AUTH_TOKEN);
                localStorage.removeItem(REFRESH_TOKEN);
                sessionStorage.clear();
              } catch (storageErr) { }
              delete (window as any).__AUTH_TOKEN__;
            }
          } finally {
            (apiClient as any)._refreshing = false;
            (apiClient as any)._refreshSubscribers = [];
          }
        }

        return new Promise((resolve, reject) => {
          (apiClient as any)._refreshSubscribers.push((token: string | null) => {
            if (token) {
              config.__isRetryRequest = true;
              config.headers = config.headers || {};
              config.headers['Authorization'] = `Bearer ${token}`;
              resolve(apiClient(config));
            } else {
              // Failed to refresh - logout
              try {
                const { logout } = useAuthStore.getState();
                logout();
              } catch (err) {
                try {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('refresh_token');
                  localStorage.removeItem(AUTH_TOKEN);
                  localStorage.removeItem(REFRESH_TOKEN);
                  sessionStorage.clear();
                } catch (storageErr) { }
                delete (window as any).__AUTH_TOKEN__;
              }

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

// Configure global axios defaults to ensure all Orval generated clients use our configuration
  axios.defaults.baseURL = API_BASE_URL;
axios.defaults.timeout = CONNECTION_CONFIG.timeout;
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.maxRedirects = CONNECTION_CONFIG.maxRedirects;
  // NOTE: do NOT set global `axios.defaults.withCredentials` here —
  // enabling credentials globally can trigger CORS credential checks
  // and cause the browser to treat responses as network errors if the
  // server does not explicitly opt-in. We set `withCredentials` on
  // the dedicated `apiClient` and individual refresh calls instead.

// Apply our interceptors to the global axios instance
axios.interceptors.request.use(
  (config) => {
    // Add auth token if available. Support global window token, persisted zustand storage, new key, and legacy key.
    let token: string | null = null;
    try {
      const tryParse = (raw: string | null) => {
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            if (typeof parsed.token === 'string') return parsed.token;
            if (parsed.state && typeof parsed.state === 'object' && typeof parsed.state.token === 'string') return parsed.state.token;
          }
        } catch (e) {
          // not JSON
        }
        return null;
      };

      const persistedKeys = ['auth-storage', 'persist:auth-storage', 'auth-store', 'persist:auth-store'];
      let persistedToken: string | null = null;
      for (const key of persistedKeys) {
        try {
          const raw = (typeof window !== 'undefined') ? localStorage.getItem(key) : null;
          const t = tryParse(raw);
          if (t) { persistedToken = t; break; }
        } catch (e) { /* ignore */ }
      }

      token = (typeof window !== 'undefined' ? (window as any).__AUTH_TOKEN__ : null) || persistedToken || localStorage.getItem(AUTH_TOKEN) || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
    } catch (e) {
      // ignore storage access or JSON parse errors
    }
    if (token) {
      try {
        const masked = token.slice(0, 8) + '...' + token.slice(-8);
        console.debug('[orval-mutator.global] Attaching auth token to global axios request', { url: config.url, token: masked });
      } catch (e) { }
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.debug('[orval-mutator.global] No auth token found for global axios request', { url: config.url });
    }

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

axios.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const config = error.config;

    // Handle 401 by attempting a silent refresh and replaying the original request
    try {
      if (error.response?.status === 401 && config && !config.__isRetryRequest) {
        // Use a centralized refresh lock to avoid concurrent refreshes
        if (!(axios as any)._refreshing) {
          (axios as any)._refreshing = true;
          (axios as any)._refreshSubscribers = [] as Array<(token: string | null) => void>;

          try {
            // Try refresh via POST body without credentials first to avoid CORS credential issues.
            const refreshUrl2 = `${API_BASE_URL}/api/auth/refresh`;
            let refreshResp2;
            try {
              refreshResp2 = await axios.post(refreshUrl2, { refreshToken: localStorage.getItem(REFRESH_TOKEN) || localStorage.getItem('refresh_token') }, { withCredentials: false });
            } catch (err) {
              // Fallback to apiClient call (which may include cookies) if body-based refresh fails
              refreshResp2 = await apiClient.request({ url: '/api/auth/refresh', method: 'POST', data: JSON.stringify({ refreshToken: localStorage.getItem(REFRESH_TOKEN) || localStorage.getItem('refresh_token') }) } as any);
            }
            if (refreshResp.status === 200 && refreshResp.data) {
              const newToken = (refreshResp.data as any).access_token || (refreshResp.data as any).accessToken || null;
              if (newToken) {
                try {
                  localStorage.setItem('auth_token', newToken);
                  localStorage.setItem(AUTH_TOKEN, newToken);
                } catch (e) { }
                (window as any).__AUTH_TOKEN__ = newToken;
                axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                // notify subscribers
                (axios as any)._refreshSubscribers.forEach((cb: any) => cb(newToken));
              } else {
                // notify failure
                (axios as any)._refreshSubscribers.forEach((cb: any) => cb(null));
              }
            } else {
              (axios as any)._refreshSubscribers.forEach((cb: any) => cb(null));
            }
          } catch (e) {
            (axios as any)._refreshSubscribers.forEach((cb: any) => cb(null));
          } finally {
            (axios as any)._refreshing = false;
            (axios as any)._refreshSubscribers = [];
          }
        }

        // Return a promise that will retry the original request when refresh completes
        return new Promise((resolve, reject) => {
          (axios as any)._refreshSubscribers.push((token: string | null) => {
            if (token) {
              config.__isRetryRequest = true;
              config.headers = config.headers || {};
              config.headers['Authorization'] = `Bearer ${token}`;
              resolve(axios(config));
            } else {
              // Clear local tokens on refresh failure
              try {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem(AUTH_TOKEN);
                localStorage.removeItem(REFRESH_TOKEN);
              } catch (e) { }
              delete (window as any).__AUTH_TOKEN__;
              reject(error);
            }
          });
        });
      }
    } catch (e) {
      // swallow refresh logic errors and continue to other handlers
      console.warn('[orval-mutator] error during refresh handling', e);
    }

    // Handle resource constraint errors
    if (error.code === 'ERR_INSUFFICIENT_RESOURCES' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND' ||
      (error.response?.status === 429) ||
      (error.response?.status === 503)) {
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