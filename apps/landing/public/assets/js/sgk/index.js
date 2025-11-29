// SGK module index - centralize and normalize SGK-related globals
(function(global){
  global.SGK = global.SGK || {};

  // Map existing top-level helpers/modules into a consistent namespace
  global.SGK.api = global.SGKApi || null;
  global.SGK.storage = global.SGKStorage || null;
  global.SGK.processing = global.SGK.processing || null;
  global.SGK.ui = global.SGK.ui || null;
  global.SGK.helpers = global.SGK && global.SGK.helpers ? global.SGK.helpers : (global.SGKHelpers || null);

  // Modals namespace
  global.SGK.modals = global.SGK.modals || {};
  if (global.SGKModals) {
    global.SGK.modals.openUploadModal = global.SGKModals.openUploadModal || null;
    global.SGK.modals.openCandidateModal = global.SGKModals.openCandidateModal || null;
    global.SGK.modals.openEReceiptModal = global.SGKModals.openEReceiptModal || null;
  }

  // Registry for diagnostic/helpful checks
  global.SGK._registry = {
    api: !!global.SGKApi,
    storage: !!global.SGKStorage,
    processing: !!(global.SGK && global.SGK.processing),
    ui: !!(global.SGK && global.SGK.ui),
    helpers: !!(global.SGK && global.SGK.helpers),
    modals: !!global.SGKModals
  };

  // Small helper to log current SGK module map (safe to call in console)
  global.SGK.logStatus = function() {
    console.log('SGK modules registry:', global.SGK._registry);
  };

  // Backwards-compatible aliases used across legacy code
  global.SGKApi = global.SGKApi || global.SGK.api || global.SGKApi;
  global.SGKStorage = global.SGKStorage || global.SGK.storage || global.SGKStorage;

})(window);
