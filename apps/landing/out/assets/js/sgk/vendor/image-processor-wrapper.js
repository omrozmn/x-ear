(function(){
  try {
    var s = document.createElement('script');
    s.src = '/assets/js/image-processor.js';
    s.async = false;
    document.head.appendChild(s);
  } catch(e){ console.warn('image-processor-wrapper load failed', e); }
})();
