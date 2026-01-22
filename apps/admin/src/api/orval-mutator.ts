import axios, { AxiosRequestConfig } from 'axios';

/**
 * Retry configuration for failed requests
 */
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffFactor: 2,
    retryableStatusCodes: [429, 503, 502, 504],
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ERR_NETWORK']
};

/**
 * Generate a unique Idempotency-Key for write operations (G-06)
 */
export const generateIdempotencyKey = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create axios instance for Orval mutator
 * This is separate from api.ts to avoid import.meta issues during Orval generation
 */
const axiosInstance = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for auth token and idempotency
axiosInstance.interceptors.request.use(
    (config) => {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('admin_token') : null;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add Idempotency-Key for write operations (POST, PUT, PATCH)
        const method = config.method?.toUpperCase() || 'GET';
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            const existingKey = config.headers['Idempotency-Key'];
            if (!existingKey) {
                config.headers['Idempotency-Key'] = generateIdempotencyKey();
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number): number {
    const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt - 1);
    return Math.min(delay, RETRY_CONFIG.maxDelay);
}

/**
 * Check if error is retryable
 */
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

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
async function retryRequest<T>(
    requestFn: () => Promise<T>,
    config: any,
    attempt: number = 1
): Promise<T> {
    try {
        return await requestFn();
    } catch (error: any) {
        // Don't retry if we've exceeded max attempts
        if (attempt >= RETRY_CONFIG.maxRetries) {
            console.error(`Request failed after ${attempt} attempts:`, {
                url: config.url,
                method: config.method,
                error: error.code || error.message
            });
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

/**
 * Orval mutator function that forwards the request configuration to the axios instance.
 * This matches the signature expected by Orval: <T>(requestConfig) => Promise<T>
 * 
 * NOTE: This adds /api prefix to generated API URLs.
 * - Generated hooks send: /admin/tenants
 * - This mutator fixes: /admin/tenants -> /api/admin/tenants
 * - Vite proxy then forwards: /api/admin/tenants -> http://localhost:5003/api/admin/tenants
 * 
 * This is necessary because:
 * 1. OpenAPI spec paths don't include /api (they start with /admin/...)
 * 2. Vite proxy matches /api/* pattern
 * 3. We need to add /api prefix here for Vite to proxy correctly
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Retries on network errors and 5xx status codes
 * - Configurable retry attempts and delays
 */
export const adminApi = <T>(requestConfig: AxiosRequestConfig): Promise<T> => {
    // Add /api prefix if missing (for Vite proxy to work)
    if (requestConfig.url && !requestConfig.url.startsWith('/api')) {
        requestConfig.url = `/api${requestConfig.url}`;
    }

    // Wrap in retry logic
    return retryRequest(
        () => axiosInstance(requestConfig).then(response => response.data),
        requestConfig
    );
};

// Export the configured axios instance for direct usage (e.g., AI client)
export { axiosInstance as apiClient };

// Default export for Orval
export default adminApi;
