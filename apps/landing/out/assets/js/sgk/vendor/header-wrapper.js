(function(){
  try {
    var s = document.createElement('script');
    s.src = '/assets/js/widgets/header.js';
    s.async = false;
    document.head.appendChild(s);
  } catch(e){ console.warn('header-wrapper load failed', e); }
})();
