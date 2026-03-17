// Module: product-direction.js
// Simplified: No longer needed since direction is now a simple select in main form

// Keep empty for backward compatibility, but no longer used
function init() {
  // No-op: direction is now directly in the form as a select
}

if (typeof window !== 'undefined') {
  window.ProductDirection = { init };
}

export { init };
