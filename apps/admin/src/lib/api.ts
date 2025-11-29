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
adminApiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401s or other specific admin errors here
        return Promise.reject(error);
    }
);
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
    }
};
