/**
 * Orval Mutator - Browser-compatible API client wrapper
 * This mutator ensures all generated API functions work in browser environment
 */

// Custom fetch instance that works in browser
const customInstance = async (config) => {
  const { url, ...otherConfig } = config;
  
  // Use window.APIConfig if available, otherwise fallback to fetch
  if (window.APIConfig && window.APIConfig.makeRequest) {
    try {
      const method = otherConfig.method || 'GET';
      const headers = otherConfig.headers || {};
      const body = otherConfig.body;
      
      return await window.APIConfig.makeRequest(url, method, body, { headers });
    } catch (error) {
      console.warn('APIConfig failed, falling back to fetch:', error);
    }
  }
  
  // Fallback to native fetch
  const response = await fetch(url, otherConfig);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response;
};

// Export for CommonJS (Node.js) and global (browser)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { customInstance };
} else {
  window.customInstance = customInstance;
}