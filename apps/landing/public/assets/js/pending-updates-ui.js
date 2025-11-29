/**
 * Pending Updates UI Component
 * Shows badge and manages UI feedback for pending operations
 */

class PendingUpdatesUI {
    constructor() {
        this.badge = null;
        this.pendingCount = 0;
        this.init();
    }

    init() {
        this.createBadge();
        this.bindEvents();
    }

    createBadge() {
        this.badge = document.createElement('div');
        this.badge.className = 'pending-updates-badge hidden';
        this.badge.innerHTML = `
            <span class="count">0</span> bekleyen güncelleme
        `;
        
        this.badge.addEventListener('click', () => {
            this.showPendingUpdatesModal();
        });

        document.body.appendChild(this.badge);
    }

    bindEvents() {
        // Listen for pending update changes
        window.addEventListener('pending-update-changed', (event) => {
            const { pendingCount } = event.detail;
            this.updateBadge(pendingCount);
        });

        // Listen for online/offline status
        window.addEventListener('online', () => {
            this.updateBadgeStatus('online');
        });

        window.addEventListener('offline', () => {
            this.updateBadgeStatus('offline');
        });
    }

    updateBadge(count) {
        this.pendingCount = count;
        
        if (count > 0) {
            this.badge.classList.remove('hidden');
            this.badge.querySelector('.count').textContent = count;
            this.badge.innerHTML = `
                <span class="count">${count}</span> 
                ${count === 1 ? 'bekleyen güncelleme' : 'bekleyen güncelleme'}
            `;
        } else {
            this.badge.classList.add('hidden');
        }
    }

    updateBadgeStatus(status) {
        if (status === 'offline' && this.pendingCount > 0) {
            this.badge.style.background = 'var(--danger)';
            this.badge.innerHTML = `
                <span class="count">${this.pendingCount}</span> 
                çevrimdışı - bekleyen güncelleme
            `;
        } else if (status === 'online' && this.pendingCount > 0) {
            this.badge.style.background = 'var(--warning)';
            this.badge.innerHTML = `
                <span class="count">${this.pendingCount}</span> 
                senkronize ediliyor...
            `;
        }
    }

    showPendingUpdatesModal() {
        const modal = this.createPendingUpdatesModal();
        document.body.appendChild(modal);

        // Auto-close after 5 seconds
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }, 5000);
    }

    createPendingUpdatesModal() {
        const modal = document.createElement('div');
        modal.className = 'pending-updates-modal-overlay';
        modal.innerHTML = `
            <div class="pending-updates-modal">
                <div class="pending-header">
                    <h3>📤 Bekleyen Güncellemeler</h3>
                    <button class="close-btn">&times;</button>
                </div>
                
                <div class="pending-content">
                    <div class="pending-list" id="pending-list">
                        ${this.renderPendingList()}
                    </div>
                    
                    <div class="pending-info">
                        <p>Bu güncellemeler internet bağlantısı kurulduğunda otomatik olarak senkronize edilecek.</p>
                    </div>
                </div>
                
                <div class="pending-actions">
                    <button class="btn btn-primary" id="retry-now">
                        Şimdi Dene
                    </button>
                    <button class="btn btn-light" id="close-modal">
                        Kapat
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        modal.querySelector('.close-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('#close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('#retry-now').addEventListener('click', async () => {
            if (window.OptimisticAPIClient) {
                await window.OptimisticAPIClient.processPendingUpdates();
            }
            document.body.removeChild(modal);
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        return modal;
    }

    renderPendingList() {
        if (!window.OptimisticAPIClient) {
            return '<p>Bekleyen güncelleme bulunamadı.</p>';
        }

        const pendingUpdates = Array.from(window.OptimisticAPIClient.pendingUpdates.values());
        
        if (pendingUpdates.length === 0) {
            return '<p>Bekleyen güncelleme bulunamadı.</p>';
        }

        return pendingUpdates.map(update => `
            <div class="pending-item">
                <div class="pending-endpoint">${this.formatEndpoint(update.endpoint)}</div>
                <div class="pending-time">${this.formatTime(update.timestamp)}</div>
                <div class="pending-retry">Deneme: ${update.retryCount}</div>
            </div>
        `).join('');
    }

    formatEndpoint(endpoint) {
        // Convert endpoint to user-friendly name
        const endpointNames = {
            '/api/patients': 'Hasta Bilgileri',
            '/api/appointments': 'Randevular',
            '/api/devices': 'Cihazlar',
            '/api/inventory': 'Envanter',
            '/api/suppliers': 'Tedarikçiler'
        };

        for (const [pattern, name] of Object.entries(endpointNames)) {
            if (endpoint.includes(pattern)) {
                return name;
            }
        }

        return endpoint;
    }

    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) {
            return 'Az önce';
        } else if (minutes < 60) {
            return `${minutes} dakika önce`;
        } else {
            const hours = Math.floor(minutes / 60);
            return `${hours} saat önce`;
        }
    }

    // Show temporary success message
    showSuccessMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'success-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            z-index: 10001;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Show temporary error message
    showErrorMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            z-index: 10001;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }
}

// Add CSS for pending updates modal
const pendingModalCSS = `
.pending-updates-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease-out;
}

.pending-updates-modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    animation: slideIn 0.3s ease-out;
}

.pending-header {
    padding: 20px 24px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.pending-header h3 {
    margin: 0;
    color: #374151;
    font-size: 1.1rem;
    font-weight: 600;
}

.close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #9ca3af;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-btn:hover {
    color: #374151;
}

.pending-content {
    padding: 20px 24px;
}

.pending-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f3f4f6;
}

.pending-item:last-child {
    border-bottom: none;
}

.pending-endpoint {
    font-weight: 500;
    color: #374151;
}

.pending-time {
    font-size: 0.8rem;
    color: #6b7280;
}

.pending-retry {
    font-size: 0.8rem;
    color: #f59e0b;
    font-weight: 500;
}

.pending-info {
    margin-top: 16px;
    padding: 12px;
    background: #f0f9ff;
    border-radius: 6px;
    border-left: 3px solid #3b82f6;
}

.pending-info p {
    margin: 0;
    font-size: 0.9rem;
    color: #1e40af;
}

.pending-actions {
    padding: 16px 24px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOutRight {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = pendingModalCSS;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.PendingUpdatesUI = new PendingUpdatesUI();
    });
} else {
    window.PendingUpdatesUI = new PendingUpdatesUI();
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PendingUpdatesUI;
}