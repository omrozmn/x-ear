/**
 * Test Data - Shared Constants
 * 
 * Contains test data constants used across all test suites
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'http://127.0.0.1:5003',
  TIMEOUT: 30000,
};

// Web App Configuration
export const WEB_CONFIG = {
  BASE_URL: process.env.WEB_BASE_URL || 'http://127.0.0.1:8080',
  TIMEOUT: 30000,
};

// Admin App Configuration
export const ADMIN_CONFIG = {
  BASE_URL: process.env.ADMIN_BASE_URL || 'http://127.0.0.1:8082',
  TIMEOUT: 30000,
};

// Landing Page Configuration
export const LANDING_CONFIG = {
  BASE_URL: process.env.LANDING_BASE_URL || 'http://127.0.0.1:3000',
  TIMEOUT: 30000,
};

// Test Users
export const TEST_USERS = {
  WEB_ADMIN: {
    identifier: 'admin@xear.com',
    password: 'Admin123!',
    role: 'admin',
  },
  WEB_USER: {
    identifier: 'user@xear.com',
    password: 'User123!',
    role: 'user',
  },
  ADMIN_SUPER: {
    username: 'superadmin@xear.com',
    password: 'SuperAdmin123!',
    role: 'super_admin',
  },
  ADMIN_USER: {
    username: 'admin@xear.com',
    password: 'Admin123!',
    role: 'admin',
  },
};

// Test Party Data
export const TEST_PARTIES = {
  MINIMAL: {
    firstName: 'Test',
    lastName: 'User',
    phone: '05321234567',
  },
  FULL: {
    firstName: 'John',
    lastName: 'Doe',
    phone: '05321234567',
    email: 'john.doe@example.com',
    role: 'patient',
  },
};

// Test Sale Data
export const TEST_SALES = {
  DEVICE_ONLY: {
    deviceId: 'TEST-DEVICE-001',
    amount: 5000,
  },
  DEVICE_SGK: {
    deviceId: 'TEST-DEVICE-001',
    amount: 2500,
    sgkCoverage: 2500,
  },
};

// Test Device Data
export const TEST_DEVICES = {
  SERIAL: 'TEST-SERIAL-001',
  BRAND: 'TestBrand',
  MODEL: 'TestModel',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  LARGE_PAGE_SIZE: 50,
};

// Timeouts
export const TIMEOUTS = {
  SHORT: 1000,
  MEDIUM: 5000,
  LONG: 10000,
  EXTRA_LONG: 30000,
};

// Selectors (common test IDs)
export const TEST_IDS = {
  LOGIN: {
    IDENTIFIER: 'login-identifier-input',
    PASSWORD: 'login-password-input',
    SUBMIT: 'login-submit-button',
  },
  NAVIGATION: {
    USER_MENU: 'user-menu',
    LOGOUT: 'logout-button',
  },
  TOAST: {
    SUCCESS: 'success-toast',
    ERROR: 'error-toast',
    WARNING: 'warning-toast',
    INFO: 'info-toast',
  },
  MODAL: {
    CLOSE: 'modal-close-button',
    SAVE: 'modal-save-button',
    CANCEL: 'modal-cancel-button',
  },
  TABLE: {
    ROW: 'table-row',
    PAGINATION_NEXT: 'pagination-next',
    PAGINATION_PREV: 'pagination-prev',
  },
};
