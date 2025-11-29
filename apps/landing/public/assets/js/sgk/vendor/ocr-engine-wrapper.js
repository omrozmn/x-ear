(function(){
  try {
    var s = document.createElement('script');
    s.src = '/assets/js/ocr-engine.js';
    s.async = false;
    document.head.appendChild(s);
  } catch(e){ console.warn('ocr-engine-wrapper load failed', e); }
})();
