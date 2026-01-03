import axios, { AxiosRequestConfig } from 'axios';

// API Configuration
// API Configuration
// Ensure base URL doesn't end with /api/ to prevent double prefixing with Orval mutator
const rawBaseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5003';
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
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
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
                localStorage.removeItem('admin_token');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
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
    clearRefreshToken: () => localStorage.removeItem('admin_refresh_token'),
};
