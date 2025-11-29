// Utility functions for the X-Ear web application
// Check if UtilsClass already exists to avoid duplicate declaration
if (typeof window.UtilsClass === 'undefined') {
class UtilsClass {
    // URL query parameter handling
    static readQuery(paramName) {
        const urlParams = new URLSearchParams(window.location.search);
        if (paramName) {
            return urlParams.get(paramName);
        } else {
            // Return all params as an object if no specific param is requested
            const params = {};
            for (const [key, value] of urlParams.entries()) {
                params[key] = value;
            }
            return params;
        }
    }
    
    // Date formatting
    static formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        };
        
        return date.toLocaleDateString('tr-TR', options);
    }
    
    // Date validation utilities for modern datepicker
    static isValidDate(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }
    
    static isDateInPast(dateString) {
        if (!this.isValidDate(dateString)) return false;
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    }
    
    static isDateInFuture(dateString) {
        if (!this.isValidDate(dateString)) return false;
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date > today;
    }
    
    static isSameDate(date1, date2) {
        if (!this.isValidDate(date1) || !this.isValidDate(date2)) return false;
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return d1.toDateString() === d2.toDateString();
    }
    
    static formatDateISO(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }
    
    static getTodayISO() {
        return this.formatDateISO(new Date());
    }
    
    static validateEReceiptDate(dateString, fieldName = 'Tarih') {
        if (!dateString) {
            this.showToast(`${fieldName} boş olamaz`, 'error');
            return false;
        }
        
        if (!this.isValidDate(dateString)) {
            this.showToast(`${fieldName} geçerli bir tarih değil`, 'error');
            return false;
        }
        
        if (this.isDateInFuture(dateString)) {
            this.showToast(`${fieldName} gelecek tarih olamaz`, 'error');
            return false;
        }
        
        return true;
    }
    
    static validateAppointmentDate(dateString, fieldName = 'Randevu tarihi') {
        if (!dateString) {
            this.showToast(`${fieldName} boş olamaz`, 'error');
            return false;
        }
        
        if (!this.isValidDate(dateString)) {
            this.showToast(`${fieldName} geçerli bir tarih değil`, 'error');
            return false;
        }
        
        if (this.isDateInPast(dateString)) {
            this.showToast(`${fieldName} geçmiş tarih olamaz`, 'error');
            return false;
        }
        
        return true;
    }
    
    // Update max date for e-receipt inputs dynamically
    static updateEReceiptDateMax() {
        const today = this.getTodayISO();
        document.querySelectorAll('.ereceipt-date-input').forEach(input => {
            input.max = today;
        });
    }
    
    // Update min date for appointment inputs dynamically  
    static updateAppointmentDateMin() {
        const today = this.getTodayISO();
        document.querySelectorAll('.modern-date-input').forEach(input => {
            input.min = today;
        });
    }

    static formatDateTime(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return date.toLocaleDateString('tr-TR', options);
    }

    static formatTime(timeString) {
        if (!timeString) return '';
        
        // Handle both HH:MM and HH:MM:SS formats
        const timeParts = timeString.split(':');
        return `${timeParts[0]}:${timeParts[1]}`;
    }

    // Currency formatting
    static formatCurrency(amount) {
        if (amount === null || amount === undefined) return '0,00 ₺';
        
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 2
        }).format(amount);
    }

    // Phone number formatting
    static formatPhone(phone) {
        if (!phone) return '';
        
        // Remove all non-digit characters
        const cleaned = phone.replace(/\D/g, '');
        
        // Format as Turkish phone number
        if (cleaned.length === 11 && cleaned.startsWith('0')) {
            return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
        } else if (cleaned.length === 10) {
            return `0${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
        }
        
        return phone;
    }

    // Toast notifications
    static showToast(message, type = 'info', duration = 3000) {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast-notification');
        existingToasts.forEach(toast => toast.remove());

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
        
        // Set toast style based on type
        const styles = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        toast.className += ` ${styles[type] || styles.info}`;
        toast.innerHTML = `
            <div class="flex items-center space-x-2">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }

    // Modal utilities
    static openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.style.overflow = 'hidden';
        }
    }

    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = 'auto';
        }
    }
    
    static showModal(options) {
        // Create modal container if it doesn't exist
        let modalContainer = document.getElementById('dynamic-modal-container');
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = 'dynamic-modal-container';
            document.body.appendChild(modalContainer);
        }
        
        // Generate unique ID for this modal
        const modalId = 'modal-' + this.generateId();
        
        // Create modal HTML
        const modalHTML = `
            <div id="${modalId}" class="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex justify-center items-center">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
                    <div class="px-6 py-4 border-b">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold text-gray-900">${options.title || 'Modal'}</h3>
                            <button type="button" class="text-gray-400 hover:text-gray-500" onclick="Utils.closeModalById('${modalId}')">
                                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="px-6 py-4">
                        ${options.content || ''}
                    </div>
                    <div class="px-6 py-4 border-t flex justify-end space-x-4">
                        ${options.secondaryButton ? `
                            <button type="button" class="btn btn-secondary" onclick="Utils.handleModalButton('${modalId}', 'secondary')">
                                ${options.secondaryButton.text || 'Cancel'}
                            </button>
                        ` : ''}
                        ${options.primaryButton ? `
                            <button type="button" class="btn btn-primary" onclick="Utils.handleModalButton('${modalId}', 'primary')">
                                ${options.primaryButton.text || 'OK'}
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to container
        modalContainer.innerHTML = modalHTML;
        
        // Store button callbacks
        window._modalCallbacks = window._modalCallbacks || {};
        window._modalCallbacks[modalId] = {
            primary: options.primaryButton?.onClick,
            secondary: options.secondaryButton?.onClick
        };
        
        // Show modal
        document.body.style.overflow = 'hidden';
        
        // Return modal ID for reference
        return modalId;
    }
    
    static closeModalById(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
            
            // Clean up callbacks
            if (window._modalCallbacks && window._modalCallbacks[modalId]) {
                delete window._modalCallbacks[modalId];
            }
        }
    }
    
    static handleModalButton(modalId, type) {
        // Execute callback if exists
        if (window._modalCallbacks && window._modalCallbacks[modalId] && window._modalCallbacks[modalId][type]) {
            // Callback'in dönüş değerini kontrol et, false ise modalı kapatma
            const result = window._modalCallbacks[modalId][type]();
            if (result === false) {
                return; // Modalı kapatma
            }
        }
        
        // Close modal
        this.closeModalById(modalId);
    }

    // Form validation
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePhone(phone) {
        if (!phone) return false;
        
        // Telefon numarasındaki tüm boşlukları kaldır
        let cleaned = phone.replace(/\s+/g, '');
        
        // Ülke kodu formatını kontrol et: (+90) veya (90) gibi
        const countryCodeRegex = /^\(\+?[0-9]{1,4}\)/;
        const hasCountryCode = countryCodeRegex.test(cleaned);
        
        // Ülke kodunu temizle
        if (hasCountryCode) {
            cleaned = cleaned.replace(/^\(\+?[0-9]{1,4}\)/, '');
        }
        
        // Kalan tüm rakam olmayan karakterleri temizle
        cleaned = cleaned.replace(/\D/g, '');
        
        // Türkiye için telefon numarası 10 haneli olmalı (başında 0 olmadan)
        // veya 11 haneli olmalı (başında 0 ile)
        return /^[0-9]{10,11}$/.test(cleaned);
    }

    static validateTCKN(tckn) {
        // TC kimlik numarası 11 haneli olmalı ve rakamlardan oluşmalı
        if (!tckn || tckn.length !== 11 || !/^\d+$/.test(tckn)) return false;
        
        // İlk rakam 0 olamaz
        if (tckn[0] === '0') return false;
        
        // Algoritma için gerekli toplamları hesapla
        let toplam = 0;  // Tek indislerin toplamı (1,3,5,7,9)
        let toplam2 = 0; // Çift indislerin toplamı (2,4,6,8)
        let toplam3 = 0; // İlk 10 hanenin toplamı
        
        // Tek indislerin toplamı (0,2,4,6,8 - dizin olarak)
        for (let i = 0; i < 9; i += 2) {
            toplam += parseInt(tckn[i]);
        }
        
        // Çift indislerin toplamı (1,3,5,7 - dizin olarak)
        for (let i = 1; i < 9; i += 2) {
            toplam2 += parseInt(tckn[i]);
        }
        
        // İlk 10 hanenin toplamı
        for (let i = 0; i < 10; i++) {
            toplam3 += parseInt(tckn[i]);
        }
        
        // 10. basamak kontrolü: (7 * tek_toplam - çift_toplam) % 10
        const basamak10 = (7 * toplam - toplam2) % 10;
        
        // 11. basamak kontrolü: (ilk_10_toplam) % 10
        const basamak11 = toplam3 % 10;
        
        // Kontrol basamakları doğru mu?
        return (basamak10 === parseInt(tckn[9]) && basamak11 === parseInt(tckn[10]));
    }

    // String utilities
    static capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static truncate(str, length = 50) {
        if (!str || str.length <= length) return str;
        return str.substring(0, length) + '...';
    }

    // Array utilities
    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    // Local storage utilities
    static saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    static getFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    static removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    // URL utilities
    static getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    static updateUrlParameter(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.pushState({}, '', url);
    }

    // File utilities
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    }

    // Age calculation
    static calculateAge(birthDate) {
        if (!birthDate) return null;
        
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Generate unique ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Deep clone object
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => UtilsClass.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = UtilsClass.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }
}

// Make Utils globally available
if (typeof window !== 'undefined') {
    window.Utils = UtilsClass;
    window.UtilsClass = UtilsClass; // Export the class itself as well
}


} // Close the if statement for UtilsClass check