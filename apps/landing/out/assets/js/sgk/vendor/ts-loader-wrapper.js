(function(){
  try {
    var s = document.createElement('script');
    s.src = '/assets/js/lib/typescript-data-loader.js';
    s.async = false;
    document.head.appendChild(s);
  } catch(e){ console.warn('ts-loader-wrapper load failed', e); }
})();
