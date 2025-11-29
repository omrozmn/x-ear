/**
 * Mobil Uyumluluk JavaScript
 * 
 * Bu dosya, mobil cihazlarda kullanıcı deneyimini iyileştirmek için gerekli JavaScript fonksiyonlarını içerir.
 */

class MobileOptimizer {
  constructor() {
    this.isMobile = window.innerWidth <= 768;
    this.init();
  }

  init() {
    this.addMobileSidebarToggle();
    this.makeTablesResponsive();
    this.optimizeModals();
    this.addTouchTargetClass();
    this.handleResize();
    
    // Sayfa yüklendiğinde ve boyut değiştiğinde kontrol et
    window.addEventListener('resize', this.handleResize.bind(this));
    document.addEventListener('DOMContentLoaded', this.onDOMContentLoaded.bind(this));
  }

  onDOMContentLoaded() {
    // DOM yüklendikten sonra yapılacak işlemler
    this.makeTablesResponsive();
    this.optimizeModals();
    this.addTouchTargetClass();
  }

  handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;
    
    // Mobil durumu değiştiyse
    if (wasMobile !== this.isMobile) {
      if (this.isMobile) {
        document.body.classList.add('mobile-view');
        this.applyMobileOptimizations();
      } else {
        document.body.classList.remove('mobile-view');
        this.removeMobileOptimizations();
      }
    }
  }

  applyMobileOptimizations() {
    // Mobil cihazlar için optimizasyonlar
    this.makeTablesResponsive();
    this.optimizeModals();
  }

  removeMobileOptimizations() {
    // Mobil optimizasyonları kaldır
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.remove('mobile-open');
    }
  }

  addMobileSidebarToggle() {
    // Sidebar toggle butonu ekle
    const header = document.querySelector('#header');
    if (!header) return;
    
    // Eğer zaten toggle butonu varsa ekleme
    if (document.querySelector('.sidebar-toggle-mobile')) return;
    
    const toggleButton = document.createElement('button');
    toggleButton.className = 'sidebar-toggle-mobile md:hidden';
    toggleButton.setAttribute('aria-label', 'Menüyü aç/kapat');
    toggleButton.setAttribute('aria-controls', 'sidebar');
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
    // Ok fonksiyonu kullanarak "this" bağlamını koru
    toggleButton.addEventListener('click', () => this.toggleMobileSidebar());
    
    header.parentNode.insertBefore(toggleButton, header);
  }

  toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.querySelector('.sidebar-toggle-mobile');
    if (!sidebar || !toggleButton) return;

    const isOpen = sidebar.classList.toggle('mobile-open');

    // Sidebar açıkken body kaydırma kilidi
    document.body.classList.toggle('sidebar-open', isOpen);

    // Aria-expanded değerini güncelle
    toggleButton.setAttribute('aria-expanded', String(isOpen));

    if (isOpen) {
      // ESC ve focus tuzağı için dinleyiciler ekle
      // Sidebar içindeki ilk odaklanabilir öğeye odaklan
      const focusable = sidebar.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length) focusable[0].focus();

      // Escape ve Tab tuşu için keydown işlemi
      this._sidebarKeydownHandler = (e) => {
        if (e.key === 'Escape') {
          sidebar.classList.remove('mobile-open');
          document.body.classList.remove('sidebar-open');
          toggleButton.setAttribute('aria-expanded', 'false');
          document.removeEventListener('keydown', this._sidebarKeydownHandler);
          // Odaklanmayı toggle butonuna geri getir
          toggleButton.focus();
        }

        // Minimal odak tuzağı uygulaması
        if (e.key === 'Tab') {
          const focusableElements = Array.from(sidebar.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'));
          if (focusableElements.length === 0) return;
          const first = focusableElements[0];
          const last = focusableElements[focusableElements.length - 1];

          if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          } else if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        }
      };

      document.addEventListener('keydown', this._sidebarKeydownHandler);

      // Dışarı tıklayınca kapatma
      const closeOnClickOutside = (e) => {
        if (!sidebar.contains(e.target) && !e.target.classList.contains('sidebar-toggle-mobile')) {
          sidebar.classList.remove('mobile-open');
          document.body.classList.remove('sidebar-open');
          toggleButton.setAttribute('aria-expanded', 'false');
          document.removeEventListener('click', closeOnClickOutside);
          // keydown işlemini de kaldır
          document.removeEventListener('keydown', this._sidebarKeydownHandler);
          toggleButton.focus();
        }
      };

      // Mevcut tıklamanın hemen kapatmaması için bir süre bekle
      setTimeout(() => {
        document.addEventListener('click', closeOnClickOutside);
      }, 10);
    } else {
      // Kapalı: varsa dinleyicileri kaldır
      if (this._sidebarKeydownHandler) {
        document.removeEventListener('keydown', this._sidebarKeydownHandler);
        delete this._sidebarKeydownHandler;
      }
      // Kapatıldığında kalan tıklama işlemi yok — kendi kapanışında kaldırılması güvenli
    }
  }

  makeTablesResponsive() {
    // Tabloları responsive yap
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      if (!table.parentElement.classList.contains('table-responsive')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    });
  }

  optimizeModals() {
    // Modal'ları mobil için optimize et
    const modals = document.querySelectorAll('.modal-content');
    modals.forEach(modal => {
      if (this.isMobile) {
        modal.style.width = '95%';
        modal.style.maxWidth = '95%';
      }
    });
  }

  addTouchTargetClass() {
    // Küçük tıklanabilir öğelere touch-target sınıfı ekle
    const clickableElements = document.querySelectorAll('button, .btn, [role="button"], a');
    clickableElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        element.classList.add('touch-target');
      }
    });
  }
}

// Sayfa yüklendiğinde MobileOptimizer'ı başlat
document.addEventListener('DOMContentLoaded', () => {
  window.mobileOptimizer = new MobileOptimizer();
});

// Sayfa yüklenmeden önce mobil görünümü ayarla
(function() {
  if (window.innerWidth <= 768) {
    document.body.classList.add('mobile-view');
  }
})();