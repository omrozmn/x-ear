(function(){
  try {
    var s = document.createElement('script');
    s.src = '/modules/sgk/sgk-patient-matcher.js';
    s.async = false;
    document.head.appendChild(s);
  } catch(e){ console.warn('patient-matching-wrapper load failed', e); }
})();
