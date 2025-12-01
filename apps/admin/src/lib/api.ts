import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

// Create axios instance for admin routes
export const adminApiInstance = axios.create({
    baseURL: '/api', // Assuming the same base URL, but routes will be /admin/...
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Generic wrapper for Orval
export const adminApi = <T>(config: any): Promise<T> => {
    return adminApiInstance(config).then(response => response.data);
};


// Request interceptor to add auth token from the main app's store
adminApiInstance.interceptors.request.use(
    (config) => {
        const storeToken = useAuthStore.getState().token;
        const localToken = localStorage.getItem('admin_token');
        const token = storeToken || localToken;

        console.log('API Request:', config.url, 'Token:', token ? 'Present' : 'Missing', '(Store:', !!storeToken, 'Local:', !!localToken, ')');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor
// Token manager for handling auth tokens
export const tokenManager = {
    setToken: (token: string) => {
        localStorage.setItem('admin_token', token);
    },
    getToken: () => {
        return localStorage.getItem('admin_token');
    },
    clearToken: () => {
        localStorage.removeItem('admin_token');
    },
    setRefreshToken: (token: string) => {
        localStorage.setItem('admin_refresh_token', token);
    },
    getRefreshToken: () => {
        return localStorage.getItem('admin_refresh_token');
    },
    clearRefreshToken: () => {
        localStorage.removeItem('admin_refresh_token');
    }
};

// Response interceptor
adminApiInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = tokenManager.getRefreshToken();
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // Try to refresh token
                // We use axios directly to avoid infinite loops if this fails
                const response = await axios.post('/api/admin/auth/refresh', {}, {
                    headers: {
                        'Authorization': `Bearer ${refreshToken}`
                    }
                });

                const { access_token } = response.data;

                if (access_token) {
                    // Update token in storage
                    tokenManager.setToken(access_token);

                    // Update token in store
                    useAuthStore.getState().setToken(access_token);

                    // Update header for original request
                    originalRequest.headers.Authorization = `Bearer ${access_token}`;

                    // Retry original request
                    return adminApiInstance(originalRequest);
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                // Clear tokens and redirect to login
                tokenManager.clearToken();
                tokenManager.clearRefreshToken();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);
