/**
 * Dark Mode Module
 * Bu modül, X-Ear CRM uygulaması için dark mode özelliğini yönetir.
 */

const DarkMode = (function() {
    // Dark mode durumunu saklamak için key
    const STORAGE_KEY = window.STORAGE_KEYS?.X_EAR_DARK_MODE || 'x-ear-dark-mode';
    
    // Dark mode class'ı
    const DARK_MODE_CLASS = 'dark-mode';
    
    /**
     * Dark mode durumunu kontrol eder
     * @returns {boolean} Dark mode aktif mi?
     */
    function isDarkMode() {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    
    /**
     * Dark mode'u açar veya kapatır
     * @param {boolean} enable Dark mode'u etkinleştir/devre dışı bırak
     */
    function setDarkMode(enable) {
        if (enable) {
            document.documentElement.classList.add(DARK_MODE_CLASS);
            localStorage.setItem(STORAGE_KEY, 'true');
        } else {
            document.documentElement.classList.remove(DARK_MODE_CLASS);
            localStorage.setItem(STORAGE_KEY, 'false');
        }
        
        // Custom event tetikle
        document.dispatchEvent(new CustomEvent('darkModeChanged', { 
            detail: { darkMode: enable } 
        }));
    }
    
    /**
     * Dark mode durumunu tersine çevirir
     */
    function toggleDarkMode() {
        setDarkMode(!isDarkMode());
    }
    
    /**
     * Sayfa yüklendiğinde dark mode durumunu uygular
     */
    function initialize() {
        // Kullanıcı tercihini kontrol et
        if (isDarkMode()) {
            document.documentElement.classList.add(DARK_MODE_CLASS);
        }
        
        // Sistem tercihini dinle
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Kullanıcı daha önce bir tercih belirtmediyse, sistem tercihini kullan
        if (localStorage.getItem(STORAGE_KEY) === null) {
            setDarkMode(prefersDarkScheme.matches);
        }
        
        // Sistem tercihi değiştiğinde güncelle (kullanıcı tercihi yoksa)
        prefersDarkScheme.addEventListener('change', (e) => {
            if (localStorage.getItem(STORAGE_KEY) === null) {
                setDarkMode(e.matches);
            }
        });
    }
    
    // Sayfa yüklendiğinde otomatik başlat
    document.addEventListener('DOMContentLoaded', initialize);
    
    // Public API
    return {
        toggle: toggleDarkMode,
        enable: () => setDarkMode(true),
        disable: () => setDarkMode(false),
        isDark: isDarkMode,
        // Backwards-compatible aliases expected by header and legacy pages
        toggleDarkMode: toggleDarkMode,
        isDarkMode: isDarkMode
    };
})();

// Global olarak erişilebilir yap
window.DarkMode = DarkMode;