/**
 * Toast Notification Widget
 * Cashflow stilinde sağ üstten toast bildirimleri
 */

class ToastNotification {
    constructor() {
        this.toastContainer = null;
        this.createContainer();
    }

    createContainer() {
        // Container zaten varsa tekrar oluşturma
        if (document.getElementById('toast-container')) {
            this.toastContainer = document.getElementById('toast-container');
            return;
        }
        
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
        this.toastContainer.style.pointerEvents = 'none';
        
        // DOM hazır olana kadar bekle
        if (document.body) {
            document.body.appendChild(this.toastContainer);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(this.toastContainer);
            });
        }
    }

    show(message, type = 'info', duration = 3000) {
        const toast = this.createToast(message, type);
        this.toastContainer.appendChild(toast);

        // Animasyon ile göster
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);

        // Belirtilen süre sonra kaldır
        setTimeout(() => {
            this.remove(toast);
        }, duration);

        return toast;
    }

    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type} transform translate-x-full transition-all duration-300 ease-in-out`;
        toast.style.pointerEvents = 'auto';

        // Type'a göre stil ve ikon
        const config = this.getTypeConfig(type);
        
        toast.innerHTML = `
            <div class="flex items-center p-4 rounded-lg shadow-lg min-w-80 max-w-96" style="background-color: ${config.bg}; border-left: 4px solid ${config.border};">
                <div class="flex-shrink-0 mr-3">
                    <svg class="w-5 h-5" style="color: ${config.iconColor};" fill="currentColor" viewBox="0 0 20 20">
                        ${config.icon}
                    </svg>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium" style="color: ${config.textColor};">${message}</p>
                </div>
                <button class="ml-3 flex-shrink-0 toast-close" style="color: ${config.textColor}; opacity: 0.7;" onclick="this.closest('.toast-notification').remove()">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `;

        return toast;
    }

    getTypeConfig(type) {
        const configs = {
            success: {
                bg: '#f0fdf4',
                border: '#22c55e',
                iconColor: '#22c55e',
                textColor: '#166534',
                icon: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>'
            },
            error: {
                bg: '#fef2f2',
                border: '#ef4444',
                iconColor: '#ef4444',
                textColor: '#991b1b',
                icon: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>'
            },
            warning: {
                bg: '#fffbeb',
                border: '#f59e0b',
                iconColor: '#f59e0b',
                textColor: '#92400e',
                icon: '<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>'
            },
            info: {
                bg: '#eff6ff',
                border: '#3b82f6',
                iconColor: '#3b82f6',
                textColor: '#1e40af',
                icon: '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>'
            }
        };

        return configs[type] || configs.info;
    }

    remove(toast) {
        if (toast && toast.parentNode) {
            toast.classList.remove('toast-show');
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    clear() {
        if (this.toastContainer) {
            this.toastContainer.innerHTML = '';
        }
    }
}

// CSS stilleri ekle
const toastStyles = `
<style>
.toast-notification {
    max-width: 24rem;
    min-width: 20rem;
}

.toast-show {
    transform: translateX(0) !important;
}

.toast-close:hover {
    opacity: 1 !important;
}

@media (max-width: 640px) {
    #toast-container {
        left: 1rem;
        right: 1rem;
        top: 1rem;
    }
    
    .toast-notification {
        min-width: auto;
        max-width: none;
    }
}
</style>
`;

// CSS'i head'e ekle
if (!document.getElementById('toast-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'toast-styles';
    styleElement.innerHTML = toastStyles;
    document.head.appendChild(styleElement);
}

// Global instance oluştur
window.toastNotification = new ToastNotification();

// ToastNotification class'ını da global yap
window.ToastNotification = {
    show: function(message, type = 'info', duration = 3000) {
        return window.toastNotification.show(message, type, duration);
    },
    clear: function() {
        window.toastNotification.clear();
    }
};

// Global fonksiyonlar
window.showToast = function(message, type = 'info', duration = 3000) {
    return window.toastNotification.show(message, type, duration);
};

window.clearToasts = function() {
    window.toastNotification.clear();
};

// Utils namespace'ine de ekle
if (typeof window.Utils === 'undefined') {
    window.Utils = {};
}

window.Utils.showToast = window.showToast;
window.Utils.clearToasts = window.clearToasts;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToastNotification;
}