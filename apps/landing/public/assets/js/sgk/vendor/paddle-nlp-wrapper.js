(function(){
  try {
    var s = document.createElement('script');
    s.src = '/assets/js/paddle-nlp-service.js';
    s.async = false;
    document.head.appendChild(s);
  } catch(e){ console.warn('paddle-nlp-wrapper load failed', e); }
})();
