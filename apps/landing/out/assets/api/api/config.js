"use strict";
// API Configuration - Centralized settings for API client
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiConfig = getApiConfig;
exports.updateApiConfig = updateApiConfig;
// Default configuration
const defaultConfig = {
    baseUrl: 'http://localhost:5003',
    timeout: 30000,
    retries: 3,
    useGeneratedClient: false,
    enableShadowValidation: false,
};
// Get configuration from environment/window
function getApiConfig() {
    const config = { ...defaultConfig };
    // Browser environment
    if (typeof window !== 'undefined') {
        config.baseUrl = window.API_BASE_URL || config.baseUrl;
        config.useGeneratedClient = window.localStorage?.getItem(window.STORAGE_KEYS.USE_GENERATED_CLIENT) === 'true';
        config.enableShadowValidation = window.localStorage?.getItem(window.STORAGE_KEYS.ENABLE_SHADOW_VALIDATION) === 'true';
    }
    // Node environment
    if (typeof process !== 'undefined') {
        config.baseUrl = process.env.API_BASE_URL || config.baseUrl;
        config.useGeneratedClient = process.env.USE_GENERATED_CLIENT === 'true';
        config.enableShadowValidation = process.env.ENABLE_SHADOW_VALIDATION === 'true';
        config.timeout = parseInt(process.env.API_TIMEOUT || '30000', 10);
    }
    return config;
}
// Update configuration at runtime
function updateApiConfig(updates) {
    if (typeof window !== 'undefined') {
        if (updates.useGeneratedClient !== undefined) {
            window.localStorage.setItem(window.STORAGE_KEYS.USE_GENERATED_CLIENT, updates.useGeneratedClient.toString());
        }
        if (updates.enableShadowValidation !== undefined) {
            window.localStorage.setItem(window.STORAGE_KEYS.ENABLE_SHADOW_VALIDATION, updates.enableShadowValidation.toString());
        }
    }
}
exports.default = getApiConfig;
