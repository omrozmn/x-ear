// Shim: ocr-integration.js
// Purpose: placeholder for legacy `assets/js/ocr-integration.js` which is not present in the repo.
// This shim prevents 404s for pages that reference the file and provides a small runtime hint
// pointing to the archive / migration notes. It intentionally does NOT implement the full
// legacy integration — that should be restored from archive or reimplemented server-side.

(function globalOCRIntegrationShim() {
  try {
    if (window.__ocr_integration_shim_loaded) return;
    window.__ocr_integration_shim_loaded = true;

    const message = '[ocr-integration shim] legacy file not found in repo; shim loaded. See legacy/reports/legacy-js-canonical-mapping.md for details.';

    // Warn once in console to help debugging in dev/staging environments
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(message);
    }

    // Expose a minimal debug object so legacy code can check presence
    window.OCRIntegration = {
      shim: true,
      note: message,
      // minimal no-op process method to avoid runtime errors — returns a rejected Promise
      processDocument: function () {
        return Promise.reject(new Error('ocr-integration: shim placeholder does not implement processing. Restore or reimplement this integration.'));
      },
      restoreInfo: function () {
        return {
          archived: false,
          archivePath: 'legacy/archive/orphan-js (search required)',
          recommendedAction: 'Restore original file from archive/or reimplement server-side OCR integration.'
        };
      }
    };

    // Add a small DOM marker for easy grep/search in runtime if needed
    try {
      if (typeof document !== 'undefined' && document.body) {
        const el = document.createElement('meta');
        el.name = 'x-ear-ocr-integration-shim';
        el.content = 'shim-loaded';
        document.head && document.head.appendChild(el);
      }
    } catch (e) { /* ignore DOM errors */ }

  } catch (err) {
    try { console.warn('ocr-integration shim failed to install', err); } catch (e) {}
  }
})();
