/**
 * Dark Mode Initializer
 * Bu dosya tüm sayfalarda dark mode'un çalışması için gerekli başlatma kodunu içerir.
 */

(function() {
    // Sayfa yüklendiğinde dark mode durumunu kontrol et
    function initializeDarkMode() {
        // CSS dosyasını ekle
        if (!document.querySelector('link[href="assets/css/dark-mode.css"]')) {
            const darkModeCSS = document.createElement('link');
            darkModeCSS.rel = 'stylesheet';
            darkModeCSS.href = 'assets/css/dark-mode.css';
            document.head.appendChild(darkModeCSS);
        }

        // Dark mode JS dosyasını ekle
        if (typeof window.DarkMode === 'undefined') {
            const darkModeScript = document.createElement('script');
            darkModeScript.src = 'assets/js/darkMode.js';
            darkModeScript.onload = function() {
                // Dark mode durumunu kontrol et ve uygula
                if (typeof window.DarkMode !== 'undefined') {
                    if (window.DarkMode.isDark()) {
                        document.documentElement.classList.add('dark-mode');
                    }
                }
            };
            document.head.appendChild(darkModeScript);
        } else {
            // Dark mode durumunu kontrol et ve uygula
            if (window.DarkMode.isDark()) {
                document.documentElement.classList.add('dark-mode');
            }
        }
    }

    // Sayfa yüklendiğinde başlat
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDarkMode);
    } else {
        initializeDarkMode();
    }
})();