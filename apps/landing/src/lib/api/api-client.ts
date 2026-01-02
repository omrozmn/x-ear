import axios from 'axios';

// Landing app için özel API client
// Force localhost:5003 for dev to strictly fix 404s
const API_BASE_URL = 'http://localhost:5003';

console.log('[Landing API Client] Initialized with Base URL:', API_BASE_URL);

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor - optional auth token
apiClient.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Response interceptor - handle errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Log detailed error info
        if (error.config) {
            console.error(`API Error details:`, {
                url: error.config.url,
                baseURL: error.config.baseURL,
                fullUrl: `${error.config.baseURL || ''}${error.config.url}`,
                method: error.config.method,
                status: error.response?.status,
                data: error.response?.data
            });
        }
        console.error('API Error:', error.message);
        return Promise.reject(error);
    }
);
