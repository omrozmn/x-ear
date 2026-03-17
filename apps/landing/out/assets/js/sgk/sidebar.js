(function(){
  // SGK-specific adapter for the global SidebarWidget.
  // Prefer the canonical public/assets/widgets/sidebar.js when present.
  try {
    var s = document.createElement('script');
    // Prefer the top-level widgets path (public/assets/widgets/sidebar.js) which is the file the user requested
    s.src = '/assets/widgets/sidebar.js';
    s.async = false;
    s.onload = function() {
      try {
        // If the global SidebarWidget constructor is available, make a namespaced alias
        if (window.SidebarWidget) {
          window.SGK = window.SGK || {};
          window.SGK.SidebarWidget = window.SidebarWidget;
        }
      } catch (e) { console.warn('sgk/sidebar.js post-load hook failed', e); }
    };
    s.onerror = function() {
      // Fallback to legacy path used in older builds
      try {
        var s2 = document.createElement('script');
        s2.src = '/assets/js/widgets/sidebar.js';
        s2.async = false;
        s2.onload = function() {
          try {
            if (window.SidebarWidget) {
              window.SGK = window.SGK || {};
              window.SGK.SidebarWidget = window.SidebarWidget;
            }
          } catch (e) { console.warn('sgk/sidebar.js post-load hook failed after fallback', e); }
        };
        s2.onerror = function() { console.warn('sgk/sidebar.js failed to inject sidebar widget from both preferred and fallback paths'); };
        document.head.appendChild(s2);
      } catch (fallbackErr) { console.warn('sgk/sidebar.js fallback injection failed', fallbackErr); }
    };
    document.head.appendChild(s);
  } catch (e) {
    console.warn('sgk/sidebar.js failed to inject sidebar.js', e);
  }
})();
