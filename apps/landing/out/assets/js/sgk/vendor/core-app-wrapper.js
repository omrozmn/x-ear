(function(){
  try {
    var s = document.createElement('script');
    s.src = '/assets/js/core/app.js';
    s.async = false;
    document.head.appendChild(s);
  } catch(e){ console.warn('core-app-wrapper load failed', e); }
})();
