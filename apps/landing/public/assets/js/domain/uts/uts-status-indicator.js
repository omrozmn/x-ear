// UTS Status Indicator Component
// Shows green/red ÜTS status indicators for devices based on possession status

class UTSStatusIndicator {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log('UTS Status Indicator initialized');
    }

    // Create UTS status indicator element
    createIndicator(device, options = {}) {
        const { barkod, seriNo } = device;
        const { size = 'small', showLabel = true, className = '' } = options;
        
        const isInPossession = this.checkDevicePossession(barkod, seriNo);
        const status = isInPossession ? 'in-possession' : 'not-in-possession';
        const color = isInPossession ? 'green' : 'red';
        const statusText = isInPossession ? 'Elimizde' : 'Elimizde Değil';
        const icon = isInPossession ? '✓' : '✗';
        
        // Size variants
        const sizeClasses = {
            small: 'px-1.5 py-0.5 text-xs',
            medium: 'px-2 py-1 text-sm',
            large: 'px-3 py-1.5 text-base'
        };
        
        const iconSizes = {
            small: 'w-3 h-3',
            medium: 'w-4 h-4', 
            large: 'w-5 h-5'
        };

        const indicator = document.createElement('span');
        indicator.className = `uts-status-indicator inline-flex items-center ${sizeClasses[size]} rounded-full font-medium ${className}`;
        indicator.setAttribute('data-status', status);
        indicator.setAttribute('data-barkod', barkod);
        indicator.setAttribute('data-seri-no', seriNo);
        
        // Set colors based on status
        if (isInPossession) {
            indicator.classList.add('bg-green-100', 'text-green-800', 'border', 'border-green-200');
        } else {
            indicator.classList.add('bg-red-100', 'text-red-800', 'border', 'border-red-200');
        }
        
        // Create indicator content
        let content = '';
        
        if (showLabel) {
            content = `
                <span class="inline-flex items-center">
                    <span class="${iconSizes[size]} mr-1">${icon}</span>
                    <span class="font-semibold">ÜTS</span>
                </span>
            `;
        } else {
            content = `
                <span class="inline-flex items-center">
                    <span class="${iconSizes[size]} mr-1">${icon}</span>
                    <span class="font-semibold">ÜTS</span>
                </span>
            `;
        }
        
        indicator.innerHTML = content;
        
        // Add tooltip
        this.addTooltip(indicator, {
            barkod,
            seriNo,
            status: statusText,
            details: this.getDeviceDetails(barkod, seriNo)
        });
        
        return indicator;
    }

    // Create compact pill-style indicator
    createPillIndicator(device, options = {}) {
        const { barkod, seriNo } = device;
        const isInPossession = this.checkDevicePossession(barkod, seriNo);
        
        const pill = document.createElement('span');
        pill.className = `uts-pill-indicator inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${options.className || ''}`;
        pill.setAttribute('data-status', isInPossession ? 'in-possession' : 'not-in-possession');
        
        if (isInPossession) {
            pill.classList.add('bg-green-100', 'text-green-700', 'ring-1', 'ring-green-600/20');
            pill.innerHTML = '<span class="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>ÜTS';
        } else {
            pill.classList.add('bg-red-100', 'text-red-700', 'ring-1', 'ring-red-600/20');
            pill.innerHTML = '<span class="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>ÜTS';
        }
        
        // Add tooltip
        this.addTooltip(pill, {
            barkod,
            seriNo,
            status: isInPossession ? 'Cihaz elimizde' : 'Cihaz elimizde değil',
            details: this.getDeviceDetails(barkod, seriNo)
        });
        
        return pill;
    }

    // Create detailed status card
    createDetailedIndicator(device, options = {}) {
        const { barkod, seriNo } = device;
        const isInPossession = this.checkDevicePossession(barkod, seriNo);
        const details = this.getDeviceDetails(barkod, seriNo);
        
        const card = document.createElement('div');
        card.className = `uts-detailed-indicator p-3 rounded-lg border ${options.className || ''}`;
        
        if (isInPossession) {
            card.classList.add('bg-green-50', 'border-green-200');
        } else {
            card.classList.add('bg-red-50', 'border-red-200');
        }
        
        const statusIcon = isInPossession 
            ? '<svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>'
            : '<svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>';
        
        card.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex items-center">
                    ${statusIcon}
                    <div class="ml-3">
                        <p class="text-sm font-medium ${isInPossession ? 'text-green-800' : 'text-red-800'}">
                            ÜTS Durumu: ${isInPossession ? 'Elimizde' : 'Elimizde Değil'}
                        </p>
                        <p class="text-xs ${isInPossession ? 'text-green-600' : 'text-red-600'}">
                            Barkod: ${barkod} | Seri: ${seriNo}
                        </p>
                        ${details ? `
                            <p class="text-xs ${isInPossession ? 'text-green-600' : 'text-red-600'} mt-1">
                                Son Güncelleme: ${new Date(details.updatedAt).toLocaleDateString('tr-TR')}
                            </p>
                        ` : ''}
                    </div>
                </div>
                ${!isInPossession && options.showActions ? `
                    <button onclick="window.UTSStatusIndicator.requestAlma('${barkod}', '${seriNo}')" 
                            class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors">
                        Alma Yap
                    </button>
                ` : ''}
            </div>
        `;
        
        return card;
    }

    // Check if device is in UTS possession
    checkDevicePossession(barkod, seriNo) {
        if (!window.UTSManager) return false;
        
        try {
            return window.UTSManager.isDeviceInPossession(barkod, seriNo);
        } catch (e) {
            console.warn('Error checking device possession:', e);
            return false;
        }
    }

    // Get detailed device information from UTS
    getDeviceDetails(barkod, seriNo) {
        if (!window.UTSManager || !window.UTSManager.getAllDevices) return null;
        
        try {
            const devices = window.UTSManager.getAllDevices();
            return devices.find(device => 
                device.barkod === barkod && device.seriNo === seriNo
            );
        } catch (e) {
            console.warn('Error getting device details:', e);
            return null;
        }
    }

    // Add tooltip to indicator element
    addTooltip(element, data) {
        let tooltip = null;
        
        element.addEventListener('mouseenter', (e) => {
            // Remove existing tooltip
            this.removeTooltip();
            
            // Create new tooltip
            tooltip = document.createElement('div');
            tooltip.className = 'uts-tooltip absolute z-50 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg shadow-lg pointer-events-none';
            tooltip.style.top = '0';
            tooltip.style.left = '0';
            tooltip.style.transform = 'translate(-50%, -100%)';
            tooltip.style.marginTop = '-8px';
            
            let tooltipContent = `
                <div class="font-semibold">${data.status}</div>
                <div class="text-xs mt-1">Barkod: ${data.barkod}</div>
                <div class="text-xs">Seri No: ${data.seriNo}</div>
            `;
            
            if (data.details) {
                tooltipContent += `
                    <div class="text-xs mt-2 pt-2 border-t border-gray-700">
                        <div>Model: ${data.details.model || 'Bilinmiyor'}</div>
                        <div>Tedarikçi: ${data.details.supplier || 'Bilinmiyor'}</div>
                        <div>Durum: ${data.details.status || 'Bilinmiyor'}</div>
                    </div>
                `;
            }
            
            tooltip.innerHTML = tooltipContent;
            document.body.appendChild(tooltip);
            
            // Position tooltip
            const rect = element.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            let left = rect.left + rect.width / 2;
            let top = rect.top;
            
            // Adjust if tooltip would go off screen
            if (left - tooltipRect.width / 2 < 10) {
                left = 10 + tooltipRect.width / 2;
            } else if (left + tooltipRect.width / 2 > window.innerWidth - 10) {
                left = window.innerWidth - 10 - tooltipRect.width / 2;
            }
            
            if (top - tooltipRect.height - 8 < 10) {
                top = rect.bottom + 8;
                tooltip.style.transform = 'translate(-50%, 0)';
            }
            
            tooltip.style.left = left + 'px';
            tooltip.style.top = (top - tooltipRect.height - 8) + 'px';
        });
        
        element.addEventListener('mouseleave', () => {
            this.removeTooltip();
        });
    }

    // Remove existing tooltips
    removeTooltip() {
        const existingTooltips = document.querySelectorAll('.uts-tooltip');
        existingTooltips.forEach(tooltip => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        });
    }

    // Request Alma operation for a device
    requestAlma(barkod, seriNo) {
        if (!window.UTSManager) {
            window.Utils?.showToast?.('UTS Manager bulunamadı', 'error');
            return;
        }
        
        const devices = window.UTSManager.getAllDevices();
        const device = devices.find(d => d.barkod === barkod && d.seriNo === seriNo);
        
        if (!device) {
            window.Utils?.showToast?.('Cihaz bulunamadı', 'error');
            return;
        }
        
        // Show confirmation dialog
        const confirmDialog = document.createElement('div');
        confirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        confirmDialog.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg max-w-md mx-4">
                <div class="p-6">
                    <div class="flex items-center mb-4">
                        <svg class="w-6 h-6 text-orange-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                        <h3 class="text-lg font-medium text-gray-900">UTS Alma İşlemi</h3>
                    </div>
                    <p class="text-sm text-gray-600 mb-4">
                        Bu cihaz için UTS alma işlemi yapılsın mı?
                    </p>
                    <div class="bg-gray-50 p-3 rounded-lg text-sm mb-4">
                        <strong>Barkod:</strong> ${barkod}<br>
                        <strong>Seri No:</strong> ${seriNo}<br>
                        <strong>Model:</strong> ${device.model || 'Bilinmiyor'}<br>
                        <strong>Tedarikçi:</strong> ${device.supplier || 'Bilinmiyor'}
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" 
                                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                            İptal
                        </button>
                        <button onclick="window.UTSStatusIndicator.performAlma('${device.id}'); this.parentElement.parentElement.parentElement.parentElement.remove()" 
                                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                            Alma Yap
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmDialog);
    }

    // Perform UTS Alma operation
    performAlma(deviceId) {
        if (!window.UTSManager || !window.UTSManager.performAlma) {
            window.Utils?.showToast?.('UTS Manager bulunamadı', 'error');
            return;
        }
        
        const success = window.UTSManager.performAlma(deviceId, 'Manuel alma işlemi - UTS Status Indicator');
        
        if (success) {
            window.Utils?.showToast?.('UTS alma işlemi başarıyla gerçekleştirildi', 'success');
            // Refresh all indicators on page
            this.refreshAllIndicators();
        } else {
            window.Utils?.showToast?.('UTS alma işlemi başarısız', 'error');
        }
    }

    // Refresh all UTS indicators on the current page
    refreshAllIndicators() {
        const indicators = document.querySelectorAll('.uts-status-indicator, .uts-pill-indicator, .uts-detailed-indicator');
        
        indicators.forEach(indicator => {
            const barkod = indicator.getAttribute('data-barkod');
            const seriNo = indicator.getAttribute('data-seri-no');
            
            if (barkod && seriNo) {
                const isInPossession = this.checkDevicePossession(barkod, seriNo);
                const newStatus = isInPossession ? 'in-possession' : 'not-in-possession';
                
                // Update status attribute
                indicator.setAttribute('data-status', newStatus);
                
                // Update classes and content
                indicator.className = indicator.className.replace(/bg-(green|red)-(50|100)/g, `bg-${isInPossession ? 'green' : 'red'}-${indicator.classList.contains('uts-detailed-indicator') ? '50' : '100'}`);
                indicator.className = indicator.className.replace(/text-(green|red)-(600|700|800)/g, `text-${isInPossession ? 'green' : 'red'}-${indicator.classList.contains('uts-detailed-indicator') ? '600' : '800'}`);
                indicator.className = indicator.className.replace(/border-(green|red)-(200|600)/g, `border-${isInPossession ? 'green' : 'red'}-${indicator.classList.contains('uts-pill-indicator') ? '600' : '200'}`);
                indicator.className = indicator.className.replace(/ring-(green|red)-600/g, `ring-${isInPossession ? 'green' : 'red'}-600`);
                
                // Update content based on indicator type
                if (indicator.classList.contains('uts-pill-indicator')) {
                    const dotColor = isInPossession ? 'bg-green-500' : 'bg-red-500';
                    indicator.innerHTML = `<span class="w-1.5 h-1.5 ${dotColor} rounded-full mr-1.5"></span>ÜTS`;
                } else if (indicator.classList.contains('uts-status-indicator')) {
                    const icon = isInPossession ? '✓' : '✗';
                    const iconElement = indicator.querySelector('span:first-child');
                    if (iconElement) {
                        iconElement.textContent = icon;
                    }
                }
            }
        });
    }

    // Batch create indicators for a list of devices
    createIndicatorsForDevices(devices, containerSelector, options = {}) {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.warn('Container not found:', containerSelector);
            return;
        }
        
        const { indicatorType = 'pill', insertPosition = 'append' } = options;
        
        devices.forEach(device => {
            let indicator;
            
            switch (indicatorType) {
                case 'detailed':
                    indicator = this.createDetailedIndicator(device, options);
                    break;
                case 'standard':
                    indicator = this.createIndicator(device, options);
                    break;
                default:
                    indicator = this.createPillIndicator(device, options);
                    break;
            }
            
            if (insertPosition === 'prepend') {
                container.insertBefore(indicator, container.firstChild);
            } else {
                container.appendChild(indicator);
            }
        });
    }

    // Add indicators to existing e-receipt items
    enhanceEReceiptItems() {
        // This will be called when e-receipt pages load
        const eReceiptItems = document.querySelectorAll('[data-device-barkod]');
        
        eReceiptItems.forEach(item => {
            const barkod = item.getAttribute('data-device-barkod');
            const seriNo = item.getAttribute('data-device-seri') || '';
            
            if (barkod) {
                const indicator = this.createPillIndicator({ barkod, seriNo }, { className: 'ml-2' });
                
                // Find appropriate location to insert indicator
                const nameElement = item.querySelector('.device-name, .material-name, h3, .font-medium');
                if (nameElement) {
                    nameElement.appendChild(indicator);
                }
            }
        });
    }

    // Public API
    static getInstance() {
        if (!window._utsStatusIndicatorInstance) {
            window._utsStatusIndicatorInstance = new UTSStatusIndicator();
        }
        return window._utsStatusIndicatorInstance;
    }
}

// Initialize and expose globally
window.UTSStatusIndicator = UTSStatusIndicator.getInstance();

// Auto-enhance e-receipt items when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all page scripts have loaded
    setTimeout(() => {
        window.UTSStatusIndicator.enhanceEReceiptItems();
    }, 1000);
});

console.log('UTS Status Indicator loaded');
