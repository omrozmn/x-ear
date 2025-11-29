import { adminApiInstance } from './api';

/**
 * Orval mutator function that forwards the request configuration to the axios instance.
 * This matches the signature expected by Orval: <T>(requestConfig) => Promise<T>
 */
export const adminApi = <T>(requestConfig: any): Promise<T> => {
    return adminApiInstance(requestConfig).then(response => response.data);
};
