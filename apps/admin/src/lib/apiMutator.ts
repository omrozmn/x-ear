import { adminApi as axiosInstance } from './api';

/**
 * Orval mutator function that forwards the request configuration to the axios instance.
 * This matches the signature expected by Orval: (requestConfig) => Promise<any>
 */
export const adminApi = (requestConfig) => {
    return axiosInstance(requestConfig);
};
