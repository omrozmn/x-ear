"use strict";
// Utility Functions for API Client
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCamelCase = toCamelCase;
exports.toSnakeCase = toSnakeCase;
exports.normalizeError = normalizeError;
exports.wrapResponse = wrapResponse;
exports.withRetry = withRetry;
exports.withTimeout = withTimeout;
exports.shadowValidation = shadowValidation;
exports.buildUrl = buildUrl;
exports.buildHeaders = buildHeaders;
// Case conversion utilities
function toCamelCase(obj) {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (Array.isArray(obj))
        return obj.map(toCamelCase);
    const result = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = toCamelCase(obj[key]);
        }
    }
    return result;
}
function toSnakeCase(obj) {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (Array.isArray(obj))
        return obj.map(toSnakeCase);
    const result = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            result[snakeKey] = toSnakeCase(obj[key]);
        }
    }
    return result;
}
// Error normalization
function normalizeError(error) {
    return {
        code: error?.response?.status?.toString() ?? error?.status?.toString() ?? 'NETWORK',
        message: error?.response?.data?.error?.message ??
            error?.response?.data?.message ??
            error?.message ??
            'Unknown error',
        details: error?.response?.data,
        status: error?.response?.status ?? error?.status
    };
}
// Response wrapper for consistent envelope
function wrapResponse(promise) {
    return promise
        .then(res => ({
        success: true,
        data: res,
        timestamp: new Date().toISOString()
    }))
        .catch(err => ({
        success: false,
        error: normalizeError(err).message,
        timestamp: new Date().toISOString()
    }));
}
// Retry utility
async function withRetry(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxRetries) {
                throw error;
            }
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
        }
    }
    throw lastError;
}
// Timeout utility
function withTimeout(promise, timeoutMs) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs))
    ]);
}
// Shadow validation utility (development only)
async function shadowValidation(operation, generatedResult, legacyResult) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
        return;
    }
    try {
        const [gen, leg] = await Promise.allSettled([generatedResult, legacyResult]);
        const genValue = gen.status === 'fulfilled' ? gen.value : gen.reason;
        const legValue = leg.status === 'fulfilled' ? leg.value : leg.reason;
        console.log(`[Shadow Validation] ${operation}:`, {
            generated: { status: gen.status, value: genValue },
            legacy: { status: leg.status, value: legValue },
            match: JSON.stringify(genValue) === JSON.stringify(legValue)
        });
    }
    catch (error) {
        console.warn(`[Shadow Validation] ${operation} failed:`, error);
    }
}
// URL builder utility
function buildUrl(baseUrl, endpoint, params) {
    const url = new URL(endpoint, baseUrl);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value.toString());
            }
        });
    }
    return url.toString();
}
// Headers utility
function buildHeaders(customHeaders) {
    const headers = {
        'Content-Type': 'application/json',
    };
    // Add authentication if available
    if (typeof window !== 'undefined') {
        const token = window.localStorage?.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    // Merge custom headers
    if (customHeaders) {
        Object.assign(headers, customHeaders);
    }
    return headers;
}
