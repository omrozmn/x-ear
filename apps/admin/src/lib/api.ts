import axios, { AxiosRequestConfig } from 'axios';
import humps from 'humps';

// Hybrid Converter: Adds CamelCase keys while preserving SnakeCase keys
const hybridCamelize = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(hybridCamelize);
    }
    if (data && typeof data === 'object' && data !== null && !(data instanceof Date)) {
        const result: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                const camelKey = humps.camelize(key);
                const newValue = hybridCamelize(value);
                result[key] = newValue; // Keep original key
                if (camelKey !== key) {
                    result[camelKey] = newValue; // Add camel key
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
const rawBaseUrl = (typeof window !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:5003';
// const rawBaseUrl = 'http://localhost:5003';
const API_BASE_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl.slice(0, -4) : rawBaseUrl.endsWith('/api/') ? rawBaseUrl.slice(0, -5) : rawBaseUrl;

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('admin_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add idempotency key for non-GET requests
        if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
            const idempotencyKey = config.headers['Idempotency-Key'] ||
                `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            config.headers['Idempotency-Key'] = idempotencyKey;
        }

        // Add request ID for tracing
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        config.headers['X-Request-ID'] = requestId;

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
        if (!error.response && (error.code === 'ERR_NETWORK' || !navigator.onLine)) {
            console.warn('[Admin API] Network error detected, queuing request for offline processing');

            // Dynamically import to avoid circular dependency
            const { offlineQueue } = await import('./offlineQueue');
            offlineQueue.addRequest(error.config);

            const offlineError = new Error('Request queued for offline processing');
            offlineError.name = 'OfflineError';
            (offlineError as any).isOffline = true;
            return Promise.reject(offlineError);
        }

        if (error.response?.status === 401) {
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
                console.warn('Authentication error detected, logging out:', errorMessage);
                // disable auto-logout for debugging
                /*
                localStorage.removeItem('admin_token');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                */
                console.warn("[Lib API] Auto-logout disabled for debugging");
            } else {
                // Just log the authorization error, don't logout
                console.warn('Authorization error (not logging out):', errorMessage);
            }
        }
        return Promise.reject(error);
    }
);

// Export instances expected by manual/generated code
export const adminApiInstance = apiClient;

export const adminApi = <T>(config: AxiosRequestConfig): Promise<T> => {
    return apiClient(config).then((response) => response.data);
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
