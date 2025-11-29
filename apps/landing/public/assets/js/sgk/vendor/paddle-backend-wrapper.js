(function(){
  try {
    var s = document.createElement('script');
    s.src = '/assets/js/paddle-backend-client.js';
    s.async = false;
    document.head.appendChild(s);
  } catch(e){ console.warn('paddle-backend-wrapper load failed', e); }
})();
