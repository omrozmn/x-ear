import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AUTH_TOKEN } from '../constants/storage-keys';
import { outbox, OutboxOperation } from '../utils/outbox';

// API Configuration
const API_BASE_URL = ''; // Use relative URLs with Vite proxy

// Create axios instance with proper configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
const idempotencyManager = new IdempotencyManager();

// Queue request in outbox for offline support
async function queueOfflineRequest(config: AxiosRequestConfig): Promise<void> {
  try {
    const operation: OutboxOperation = {
      method: (config.method?.toUpperCase() as OutboxOperation['method']) || 'GET',
      endpoint: `${API_BASE_URL}${config.url}`,
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

// Request interceptor for authentication and idempotency
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem(AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

// Export the configured axios instance as customInstance
export const customInstance = apiClient;
export default customInstance;