import axios, { AxiosHeaders, AxiosRequestConfig, isAxiosError } from 'axios';
import humps from 'humps';

// Hybrid Converter: Adds CamelCase keys while preserving SnakeCase keys
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue | unknown };
type ErrorPayload = {
    error?: string | { message?: string };
};
type OfflineError = Error & { isOffline: true };

function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

const hybridCamelize = (data: JsonValue | unknown): JsonValue | unknown => {
    if (Array.isArray(data)) {
        return data.map(hybridCamelize);
    }
    if (isJsonObject(data)) {
        const result: JsonObject = {};
        for (const key of Object.keys(data)) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                const camelKey = humps.camelize(key);
                const newValue = hybridCamelize(value);
                result[key] = newValue as JsonValue; // Keep original key
                if (camelKey !== key) {
                    result[camelKey] = newValue as JsonValue; // Add camel key
                }
            }
        }
        return result;
    }
    return data;
};

// API Configuration
// API Configuration
// Ensure base URL doesn't end with /api/ to prevent double prefixing with Orval mutator
const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5003';
const API_BASE_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl.slice(0, -4) : rawBaseUrl.endsWith('/api/') ? rawBaseUrl.slice(0, -5) : rawBaseUrl;

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request Interceptor
apiClient.interceptors.request.use(
    (config) => {
        config.headers = AxiosHeaders.from(config.headers);
        const token = localStorage.getItem('admin_token');
        if (token) {
            config.headers.set('Authorization', `Bearer ${token}`);
        }

        // Add idempotency key for non-GET requests
        if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
            const existingIdempotencyKey = config.headers.get('Idempotency-Key');
            const idempotencyKey = existingIdempotencyKey ||
                `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            config.headers.set('Idempotency-Key', idempotencyKey);
        }

        // Add request ID for tracing
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        config.headers.set('X-Request-ID', requestId);

        // Case Conversion: Convert payload to snake_case for backend
        if (config.data && !(config.data instanceof FormData)) {
            config.data = humps.decamelizeKeys(config.data);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
apiClient.interceptors.response.use(
    (response) => {
        if (response.data) {
            response.data = hybridCamelize(response.data);
        }
        return response;
    },
    async (error) => {
        // Handle offline errors - queue for later processing
        if (isAxiosError(error) && !error.response && (error.code === 'ERR_NETWORK' || !navigator.onLine)) {

            // Dynamically import to avoid circular dependency
            const { offlineQueue } = await import('./offlineQueue');
            if (error.config) {
                offlineQueue.addRequest(error.config);
            }

            const offlineError = new Error('Request queued for offline processing');
            offlineError.name = 'OfflineError';
            const typedOfflineError: OfflineError = Object.assign(offlineError, { isOffline: true as const });
            return Promise.reject(typedOfflineError);
        }

        if (isAxiosError<ErrorPayload>(error) && error.response?.status === 401) {
            // Check if it's a real authentication error or just authorization
            let message = '';
            if (error.response?.data?.error) {
                if (typeof error.response.data.error === 'string') {
                    message = error.response.data.error;
                } else if (typeof error.response.data.error.message === 'string') {
                    message = error.response.data.error.message;
                }
            }

            const errorMessage = message.toLowerCase();

            const isAuthError =
                errorMessage.includes('token') ||
                errorMessage.includes('jwt') ||
                errorMessage.includes('expired') ||
                errorMessage.includes('invalid') ||
                errorMessage.includes('authentication') ||
                errorMessage.includes('bu sayfaya erişim') || // Catch specific backend message
                !localStorage.getItem('admin_token'); // No token at all

            // Only logout if it's a real auth error, not just missing permissions
            if (isAuthError) {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_refresh_token');
                localStorage.removeItem('admin-auth-storage');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

// Export instances expected by manual/generated code
export const adminApiInstance = apiClient;

export const adminApi = <T>(config: AxiosRequestConfig): Promise<T> => {
    return apiClient<T>(config).then((response) => response.data);
};

// Token manager (kept from previous version)
export const tokenManager = {
    setToken: (token: string) => localStorage.setItem('admin_token', token),
    getToken: () => localStorage.getItem('admin_token'),
    clearToken: () => localStorage.removeItem('admin_token'),
    setRefreshToken: (token: string) => localStorage.setItem('admin_refresh_token', token),
    getRefreshToken: () => localStorage.getItem('admin_refresh_token'),
    clearRefreshToken: () => localStorage.removeItem('admin_refresh_token'),
};
