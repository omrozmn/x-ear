(function(){
  try {
    var s = document.createElement('script');
    s.src = '/assets/js/components/quick-look-modal.js';
    s.async = false;
    document.head.appendChild(s);
  } catch(e){ console.warn('quicklook-wrapper load failed', e); }
})();
