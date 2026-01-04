import axios, { AxiosRequestConfig } from 'axios';

/**
 * Token Manager - Single source of truth for auth tokens
 */
class TokenManager {
  private tokenKey = 'auth_token';

  get token(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.tokenKey, token);
    console.log('[TokenManager] Token updated');
  }

  clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.tokenKey);
    console.log('[TokenManager] Token cleared');
  }
}

export const tokenManager = new TokenManager();

/**
 * API Configuration - Use environment variable
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003';

console.log('[Landing API Client] Initialized with Base URL:', API_BASE_URL);

/**
 * Retry Configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableStatusCodes: [429, 503, 502, 504],
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ERR_NETWORK']
};

function calculateBackoffDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

function isRetryableError(error: any): boolean {
  if (error.code && RETRY_CONFIG.retryableErrors.includes(error.code)) {
    return true;
  }
  if (error.response?.status && RETRY_CONFIG.retryableStatusCodes.includes(error.response.status)) {
    return true;
  }
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Axios Instance
 */
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

/**
 * Request Interceptor
 * - Add auth token from TokenManager
 * - Add idempotency key for non-GET requests
 * - Add request ID for tracing
 */
apiClient.interceptors.request.use((config) => {
    // Add auth token
    const token = tokenManager.token;
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Add idempotency key for non-GET requests
    if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
        const idempotencyKey = `landing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        config.headers['Idempotency-Key'] = idempotencyKey;
    }

    // Add request ID for tracing
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    config.headers['X-Request-ID'] = requestId;

    return config;
});

/**
 * Response Interceptor
 * - Auto token refresh on 401
 * - Retry with exponential backoff
 * - Detailed error logging
 */
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        // Auto token refresh on 401
        if (error.response?.status === 401 && config && !config.__isRetryRequest) {
            // Skip refresh for auth endpoints
            const isAuthEndpoint = config.url?.includes('/auth/login') ||
                config.url?.includes('/auth/register') ||
                config.url?.includes('/affiliate/login');

            if (!isAuthEndpoint) {
                try {
                    console.log('[Landing API] 401 detected, attempting token refresh...');
                    
                    const refreshResp = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, {
                        withCredentials: true
                    });

                    if (refreshResp.data?.access_token) {
                        tokenManager.setToken(refreshResp.data.access_token);
                        
                        // Retry original request
                        config.__isRetryRequest = true;
                        config.headers.Authorization = `Bearer ${refreshResp.data.access_token}`;
                        return apiClient(config);
                    }
                } catch (refreshError) {
                    console.error('[Landing API] Token refresh failed:', refreshError);
                    tokenManager.clearToken();
                    
                    // Redirect to login for affiliate pages
                    if (typeof window !== 'undefined' && window.location.pathname.includes('/affiliate')) {
                        window.location.href = '/affiliate/login';
                    }
                }
            }
        }

        // Retry logic for retryable errors
        if (!config.__retryCount) {
            config.__retryCount = 0;
        }

        if (config.__retryCount < RETRY_CONFIG.maxRetries && isRetryableError(error)) {
            config.__retryCount++;
            const delay = calculateBackoffDelay(config.__retryCount);
            
            console.warn(`[Landing API] Request failed (attempt ${config.__retryCount}/${RETRY_CONFIG.maxRetries}), retrying in ${delay}ms:`, {
                url: config.url,
                method: config.method,
                error: error.code || error.message
            });

            await sleep(delay);
            return apiClient(config);
        }

        // Log detailed error info
        if (error.config) {
            console.error(`[Landing API] Error details:`, {
                url: error.config.url,
                baseURL: error.config.baseURL,
                fullUrl: `${error.config.baseURL || ''}${error.config.url}`,
                method: error.config.method,
                status: error.response?.status,
                data: error.response?.data,
                retryCount: config.__retryCount || 0
            });
        }
        
        return Promise.reject(error);
    }
);
