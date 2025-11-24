import axios from 'axios';
// import { useAuthStore } from '../stores/authStore';

// Create axios instance for admin routes
export const adminApi = axios.create({
    baseURL: '/api', // Assuming the same base URL, but routes will be /admin/...
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token from the main app's store
adminApi.interceptors.request.use(
    (config) => {
        // const token = useAuthStore.getState().token;
        const token = localStorage.getItem('admin_token'); // Temporary fix
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
adminApi.interceptors.response.use(
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
