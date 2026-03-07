// Utility Functions Module
class Utils {
    constructor() {
        // Utility class doesn't need initialization
    }

    showToast(type, message) {
        // Remove existing toasts
        document.querySelectorAll('.toast-notification').forEach(toast => {
            toast.remove();
        });

        const toast = document.createElement('div');
        toast.className = `toast-notification fixed top-4 right-4 px-4 py-2 rounded-md text-white z-50 transform transition-all duration-300 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
        }`;
        
        toast.innerHTML = `
            <div class="flex items-center space-x-2">
                <span>${this.getToastIcon(type)}</span>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, 3000);
    }

    getToastIcon(type) {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✗';
            case 'warning':
                return '⚠';
            default:
                return 'ℹ';
        }
    }

    formatDate(date, locale = 'tr-TR') {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        return date.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(time) {
        if (typeof time === 'string' && time.includes(':')) {
            return time;
        }
        
        if (typeof time === 'string') {
            const date = new Date(time);
            return date.toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        return time;
    }

    formatDateTime(date, time) {
        return `${this.formatDate(date)} ${this.formatTime(time)}`;
    }

    debounce(func, wait) {
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

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePhone(phone) {
        const re = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        return re.test(phone);
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .trim();
    }

    copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).then(() => {
                this.showToast('success', 'Panoya kopyalandı');
            }).catch(() => {
                this.showToast('error', 'Kopyalama başarısız');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                textArea.remove();
                this.showToast('success', 'Panoya kopyalandı');
            } catch (err) {
                textArea.remove();
                this.showToast('error', 'Kopyalama başarısız');
            }
        }
    }

    downloadAsJSON(data, filename = 'data.json') {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('success', 'Dosya indirildi');
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim());
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }
        }
        
        return data;
    }

    exportToCSV(data, filename = 'export.csv') {
        if (!data || data.length === 0) {
            this.showToast('error', 'Dışa aktarılacak veri bulunamadı');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => row[header] || '').join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('success', 'CSV dosyası indirildi');
    }

    isToday(date) {
        const today = new Date();
        const checkDate = new Date(date);
        
        return today.toDateString() === checkDate.toDateString();
    }

    isSameWeek(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        
        // Get Monday of each week
        const monday1 = new Date(d1);
        monday1.setDate(d1.getDate() - (d1.getDay() === 0 ? 6 : d1.getDay() - 1));
        
        const monday2 = new Date(d2);
        monday2.setDate(d2.getDate() - (d2.getDay() === 0 ? 6 : d2.getDay() - 1));
        
        return monday1.toDateString() === monday2.toDateString();
    }

    getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    }

    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    addWeeks(date, weeks) {
        return this.addDays(date, weeks * 7);
    }

    addMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }

    getBusinessDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const businessDays = [];
        
        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
                businessDays.push(new Date(current));
            }
            current.setDate(current.getDate() + 1);
        }
        
        return businessDays;
    }
}

// Export for global use
window.Utils = Utils;
window.utils = new Utils();