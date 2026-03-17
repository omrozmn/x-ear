/**
 * Orval Loader - replace fragile fetch+eval wrapper
 * This loader assumes `public/assets/js/generated/orval-api-commonjs.js` exists
 * and attaches its exports to window.OrvalApi and also copies named functions to window.
 */
(function() {
  'use strict';

  if (typeof window === 'undefined') return;

  const LOG_PREFIX = '[Orval Loader]';

  function safeExposeApi(api) {
    try {
      window.OrvalApi = api;
      Object.keys(api || {}).forEach((k) => {
        if (typeof api[k] === 'function') {
          try { window[k] = api[k]; } catch (e) { /* ignore */ }
        }
      });
      window.dispatchEvent(new CustomEvent('orvalLoaded'));
      console.info(`${LOG_PREFIX} Orval API exposed (${Object.keys(api || {}).length} exports)`);
    } catch (e) {
      console.error(`${LOG_PREFIX} Failed to expose Orval API:`, e);
    }
  }

  // If OrvalApi already present (e.g. during dev iteration), just expose
  if (window.OrvalApi) {
    safeExposeApi(window.OrvalApi);
    return;
  }

  // If Orval bundle is loaded as module script that sets window.OrvalApi already, wait a tick
  if (typeof window.OrvalApi !== 'undefined') {
    safeExposeApi(window.OrvalApi);
    return;
  }

  // Otherwise, attempt to require the commonjs bundle by creating a script tag.
  const bundlePath = '/assets/js/generated/orval-api-commonjs.js';
  const script = document.createElement('script');
  script.src = bundlePath;
  script.async = false; // preserve execution order
  script.onload = () => {
    if (window.OrvalApi) {
      safeExposeApi(window.OrvalApi);
    } else {
      console.warn(`${LOG_PREFIX} Bundle loaded but window.OrvalApi not set. Ensure the bundle exports a global named 'OrvalApi'.`);
      window.dispatchEvent(new CustomEvent('orvalLoadFailed'));
    }
  };
  script.onerror = (err) => {
    console.error(`${LOG_PREFIX} Failed to load bundle at ${bundlePath}:`, err);
    window.dispatchEvent(new CustomEvent('orvalLoadFailed'));
  };

  document.head.appendChild(script);
})();