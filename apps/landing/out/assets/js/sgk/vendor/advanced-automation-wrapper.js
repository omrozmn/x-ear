(function(){
  try {
    var s = document.createElement('script');
    s.src = '/assets/js/advanced-automation.js';
    s.async = false;
    document.head.appendChild(s);
  } catch(e){ console.warn('advanced-automation-wrapper load failed', e); }
})();
