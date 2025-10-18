// X-EAR Core Package - Main exports
export * from './api';
export * from './domain';
export * from './hooks';
export * from './utils';
export * from './services';

// Common types and utilities
export type {
  ApiResponse,
  PaginatedResponse,
  ApiError
} from './api/types';

export type {
  Patient,
  Appointment,
  InventoryItem,
  Campaign,
  User
} from './domain/types';

export {
  formatDate,
  formatMoney,
  validateTcNumber,
  validateEmail
} from './utils';
