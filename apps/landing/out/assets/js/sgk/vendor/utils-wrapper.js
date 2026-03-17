(function(){
  // Wrapper that loads core utils for SGK page
  try {
    var s = document.createElement('script');
    s.src = '/assets/js/core/utils.js';
    s.async = false; // preserve execution order
    document.head.appendChild(s);
  } catch(e){ console.warn('utils-wrapper load failed', e); }
})();
