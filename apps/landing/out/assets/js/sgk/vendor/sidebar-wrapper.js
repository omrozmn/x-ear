(function(){
  try {
    var s = document.createElement('script');
    s.src = '/assets/js/widgets/sidebar.js';
    s.async = false;
    document.head.appendChild(s);
  } catch(e){ console.warn('sidebar-wrapper load failed', e); }
})();
