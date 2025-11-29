// Global modal helper: focus trap, ESC to close, click-outside, body scroll lock
(function(){
  const FOCUSABLE = 'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function isVisible(el) {
    return !!(el && el.offsetWidth > 0 && el.offsetHeight > 0 && window.getComputedStyle(el).visibility !== 'hidden');
  }

  function enableModalEnhancements(modal) {
    if (modal.__enhanced) return;
    modal.__enhanced = true;

    let previouslyFocused = null;
    let keydownHandler = null;
    let clickOutsideHandler = null;

    const openHandler = () => {
      previouslyFocused = document.activeElement;
      document.body.classList.add('modal-open');

      // focus first focusable
      const focusable = modal.querySelectorAll(FOCUSABLE);
      if (focusable.length) focusable[0].focus();

      keydownHandler = (e) => {
        if (e.key === 'Escape') {
          closeModal(modal);
        }
        if (e.key === 'Tab') {
          // focus trap
          const focusables = Array.from(modal.querySelectorAll(FOCUSABLE));
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
          }
        }
      };

      document.addEventListener('keydown', keydownHandler);

      clickOutsideHandler = (e) => {
        if (!modal.contains(e.target)) {
          closeModal(modal);
        }
      };

      // If modal has an overlay element (common pattern), attach close on click too
      setTimeout(() => document.addEventListener('click', clickOutsideHandler), 10);
    };

    const closeHandler = () => {
      document.body.classList.remove('modal-open');
      if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
      // remove click listener (safe to attempt)
      document.removeEventListener('click', clickOutsideHandler);
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    };

    // We observe visibility changes via MutationObserver
    const observer = new MutationObserver(() => {
      const visible = isVisible(modal) || modal.classList.contains('show');
      if (visible) openHandler(); else closeHandler();
    });

    observer.observe(modal, { attributes: true, attributeFilter: ['style','class'], childList: false, subtree: false });

    // Also listen for explicit open/close via custom events
    modal.addEventListener('modal:open', openHandler);
    modal.addEventListener('modal:close', closeHandler);

    // Expose programmatic open/close helpers
    modal.openModal = function(){
      modal.classList.add('show');
      modal.style.display = '';
      modal.dispatchEvent(new Event('modal:open'));
    };
    modal.closeModal = function(){
      modal.classList.remove('show');
      modal.style.display = 'none';
      modal.dispatchEvent(new Event('modal:close'));
    };
  }

  function closeModal(modal) {
    if (!modal) return;
    if (typeof modal.closeModal === 'function') return modal.closeModal();
    // fallback: hide element
    modal.style.display = 'none';
    modal.classList.remove('show');
    modal.dispatchEvent(new Event('modal:close'));
  }

  function enhanceAll() {
    const modals = Array.from(document.querySelectorAll('.modal, [role="dialog"]'));
    modals.forEach(m => enableModalEnhancements(m));
  }

  document.addEventListener('DOMContentLoaded', () => {
    enhanceAll();
    // auto-enhance dynamically added modals
    const bodyObs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) {
          m.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              if (node.matches && (node.matches('.modal') || node.getAttribute('role') === 'dialog')) enableModalEnhancements(node);
              node.querySelectorAll && node.querySelectorAll('.modal, [role="dialog"]').forEach(enhance => enableModalEnhancements(enhance));
            }
          });
        }
      }
    });
    bodyObs.observe(document.body, {childList: true, subtree: true});
  });

  // Expose helper
  window.modalHelper = { enhanceAll, closeModal };
})();
