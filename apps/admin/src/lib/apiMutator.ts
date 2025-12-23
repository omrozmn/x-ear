import { adminApiInstance } from './api';

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
 */
export const adminApi = <T>(requestConfig: any): Promise<T> => {
    // Add /api prefix if missing (for Vite proxy to work)
    if (requestConfig.url && !requestConfig.url.startsWith('/api')) {
        requestConfig.url = `/api${requestConfig.url}`;
    }

    return adminApiInstance(requestConfig).then(response => response.data);
};
