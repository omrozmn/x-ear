/**
 * Environment Configuration Loader
 * 
 * Loads and provides environment variables for tests
 */

import { API_CONFIG, WEB_CONFIG, ADMIN_CONFIG, LANDING_CONFIG } from './test-data';

export interface TestEnvironment {
  api: typeof API_CONFIG;
  web: typeof WEB_CONFIG;
  admin: typeof ADMIN_CONFIG;
  landing: typeof LANDING_CONFIG;
  isCI: boolean;
  browser: 'chromium' | 'firefox' | 'webkit';
  headed: boolean;
}

/**
 * Get current test environment
 */
export function getEnvironment(): TestEnvironment {
  return {
    api: API_CONFIG,
    web: WEB_CONFIG,
    admin: ADMIN_CONFIG,
    landing: LANDING_CONFIG,
    isCI: process.env.CI === 'true',
    browser: (process.env.BROWSER as 'chromium' | 'firefox' | 'webkit') || 'chromium',
    headed: process.env.HEADED === 'true',
  };
}

/**
 * Get API base URL
 */
export function getApiUrl(): string {
  return API_CONFIG.BASE_URL;
}

/**
 * Get Web app URL
 */
export function getWebUrl(): string {
  return WEB_CONFIG.BASE_URL;
}

/**
 * Get Admin app URL
 */
export function getAdminUrl(): string {
  return ADMIN_CONFIG.BASE_URL;
}

/**
 * Get Landing page URL
 */
export function getLandingUrl(): string {
  return LANDING_CONFIG.BASE_URL;
}

/**
 * Check if running in CI
 */
export function isCI(): boolean {
  return process.env.CI === 'true';
}

/**
 * Check if running in headed mode
 */
export function isHeaded(): boolean {
  return process.env.HEADED === 'true';
}

export default {
  getEnvironment,
  getApiUrl,
  getWebUrl,
  getAdminUrl,
  getLandingUrl,
  isCI,
  isHeaded,
};
