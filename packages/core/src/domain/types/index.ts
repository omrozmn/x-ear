// Domain types exports
export * from './common';
export * from './patient';
export * from './appointment';
export * from './inventory';
export * from './campaign';
export * from './user';

// Re-export API types
export type { ApiResponse, PaginatedResponse, ApiError } from '../../api/types';