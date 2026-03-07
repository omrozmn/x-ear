/**
 * API URL Wrapper for X-Ear CRM
 * Wraps generated orval API functions to use centralized base URL configuration
 * This ensures all API calls use the correct base URL from window.API_BASE_URL
 */

(function() {
  'use strict';

  // Wait for orval API to load
  function waitForOrvalAPI() {
    return new Promise((resolve) => {
      if (window.registrationGetTurnstileConfig) {
        resolve();
        return;
      }
      
      // Listen for orval API loaded event
      document.addEventListener('orvalApiLoaded', resolve);
      
      // Fallback timeout
      setTimeout(resolve, 2000);
    });
  }

  // Get the base URL from configuration
  function getBaseURL() {
    return window.API_BASE_URL || 'http://localhost:5003';
  }

  // Wrap a function to use absolute URLs
  function wrapAPIFunction(originalFunc, urlFunc) {
    return async function(...args) {
      // Get the relative URL from the original URL function
      const relativeUrl = urlFunc();
      
      // Create absolute URL
      const baseUrl = getBaseURL();
      const absoluteUrl = relativeUrl.startsWith('/') ? `${baseUrl}${relativeUrl}` : relativeUrl;
      
      // Replace the URL function temporarily
      const originalUrlFunc = urlFunc;
      const tempUrlFunc = () => absoluteUrl;
      
      // Call the original function with modified URL
      try {
        // Monkey patch the URL function
        if (window.getRegistrationGetTurnstileConfigUrl) {
          window.getRegistrationGetTurnstileConfigUrl = tempUrlFunc;
        }
        
        const result = await originalFunc.apply(this, args);
        return result;
      } finally {
        // Restore original URL function
        if (originalUrlFunc) {
          window.getRegistrationGetTurnstileConfigUrl = originalUrlFunc;
        }
      }
    };
  }

  // Initialize wrapper when DOM is ready
  function initializeWrapper() {
    waitForOrvalAPI().then(() => {
      console.log('🔧 [API-WRAPPER] Initializing API URL wrapper...');
      
      // Wrap the Turnstile config function
      if (window.registrationGetTurnstileConfig && window.getRegistrationGetTurnstileConfigUrl) {
        const originalFunc = window.registrationGetTurnstileConfig;
        const originalUrlFunc = window.getRegistrationGetTurnstileConfigUrl;
        
        window.registrationGetTurnstileConfig = wrapAPIFunction(originalFunc, originalUrlFunc);
        
        // Also create the alias that HTML files expect
        window.getTurnstileConfig = window.registrationGetTurnstileConfig;
        
        console.log('✅ [API-WRAPPER] Wrapped registrationGetTurnstileConfig');
      }
      
      // Wrap other API functions as needed
      // Add more function wrapping here as you identify them
      
      console.log('🌐 [API-WRAPPER] Using base URL:', getBaseURL());
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWrapper);
  } else {
    initializeWrapper();
  }

})();