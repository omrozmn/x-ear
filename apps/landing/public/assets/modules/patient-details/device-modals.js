/**
 * Device Modal Functions for Patient Details
 * Handles edit, delete, and replacement modals for patient devices
 */

// Top-Right Toast Notification System
window.showTopRightToast = function(title, message, type = 'info', duration = 5000) {
    const icons = {
        success: '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        error: '<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        warning: '<svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
        info: '<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    
    const colors = {
        success: 'border-green-500 bg-green-50',
        error: 'border-red-500 bg-red-50',
        warning: 'border-amber-500 bg-amber-50',
        info: 'border-blue-500 bg-blue-50'
    };
    
    const toastId = `toast-${Date.now()}`;
    const toastHtml = `
        <div id="${toastId}" class="fixed top-4 right-4 z-[10000] max-w-sm w-full bg-white border-l-4 ${colors[type]} rounded-lg shadow-2xl transform translate-x-full transition-transform duration-300 ease-out">
            <div class="p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        ${icons[type]}
                    </div>
                    <div class="ml-3 flex-1">
                        <h3 class="text-sm font-semibold text-gray-900">${title}</h3>
                        <p class="mt-1 text-sm text-gray-600">${message}</p>
                    </div>
                    <button onclick="closeTopRightToast('${toastId}')" class="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', toastHtml);
    
    // Slide in
    setTimeout(() => {
        const toast = document.getElementById(toastId);
        if (toast) toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto close
    if (duration > 0) {
        setTimeout(() => closeTopRightToast(toastId), duration);
    }
};

window.closeTopRightToast = function(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.transform = 'translateX(150%)';
        setTimeout(() => toast.remove(), 300);
    }
};

// Custom Alert/Confirm Modal System
window.showCustomAlert = function(title, message, type = 'info') {
    const icons = {
        success: '<svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        error: '<svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        warning: '<svg class="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
        info: '<svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    
    const colors = {
        success: 'bg-green-100',
        error: 'bg-red-100',
        warning: 'bg-amber-100',
        info: 'bg-blue-100'
    };
    
    const modalHtml = `
        <div id="customAlertModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 animate-fade-in">
            <div class="bg-white rounded-lg shadow-2xl max-w-md w-full transform transition-all animate-scale-in">
                <div class="p-6">
                    <div class="flex items-center justify-center mb-4">
                        <div class="w-16 h-16 ${colors[type]} rounded-full flex items-center justify-center">
                            ${icons[type]}
                        </div>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-900 text-center mb-2">${title}</h3>
                    <p class="text-gray-600 text-center">${message}</p>
                </div>
                <div class="px-6 py-4 bg-gray-50 flex justify-center rounded-b-lg">
                    <button onclick="closeCustomAlert()" 
                        class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors">
                        Tamam
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing alert
    const existingAlert = document.getElementById('customAlertModal');
    if (existingAlert) existingAlert.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeCustomAlert = function() {
    const modal = document.getElementById('customAlertModal');
    if (modal) {
        modal.classList.add('animate-fade-out');
        setTimeout(() => modal.remove(), 200);
    }
};

window.showCustomConfirm = function(title, message, onConfirm, type = 'warning') {
    const icons = {
        danger: '<svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
        warning: '<svg class="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
        info: '<svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    
    const colors = {
        danger: 'bg-red-100',
        warning: 'bg-amber-100',
        info: 'bg-blue-100'
    };
    
    const modalHtml = `
        <div id="customConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 animate-fade-in">
            <div class="bg-white rounded-lg shadow-2xl max-w-md w-full transform transition-all animate-scale-in">
                <div class="p-6">
                    <div class="flex items-center justify-center mb-4">
                        <div class="w-16 h-16 ${colors[type]} rounded-full flex items-center justify-center">
                            ${icons[type]}
                        </div>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-900 text-center mb-2">${title}</h3>
                    <p class="text-gray-600 text-center">${message}</p>
                </div>
                <div class="px-6 py-4 bg-gray-50 flex gap-3 rounded-b-lg">
                    <button onclick="closeCustomConfirm()" 
                        class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 font-medium transition-colors">
                        İptal
                    </button>
                    <button onclick="confirmCustomAction()" 
                        class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors">
                        Onayla
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing confirm
    const existingConfirm = document.getElementById('customConfirmModal');
    if (existingConfirm) existingConfirm.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Store callback
    window._customConfirmCallback = onConfirm;
};

window.closeCustomConfirm = function() {
    const modal = document.getElementById('customConfirmModal');
    if (modal) {
        modal.classList.add('animate-fade-out');
        setTimeout(() => modal.remove(), 200);
    }
    window._customConfirmCallback = null;
};

window.confirmCustomAction = function() {
    if (window._customConfirmCallback) {
        window._customConfirmCallback();
        window._customConfirmCallback = null;
    }
    closeCustomConfirm();
};

// Custom Prompt Modal
window.showCustomPrompt = function(title, message, defaultValue = '', onConfirm, type = 'info') {
    // Remove existing prompt modal if any
    const existingModal = document.getElementById('customPromptModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const iconMap = {
        'info': '<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        'warning': '<svg class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"/></svg>',
        'error': '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        'success': '<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    
    const modalHtml = `
        <div id="customPromptModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full animate-fade-in">
                <div class="p-6">
                    <div class="flex items-center mb-4">
                        ${iconMap[type] || iconMap['info']}
                        <h3 class="text-lg font-semibold text-gray-900 ml-3">${title}</h3>
                    </div>
                    <p class="text-gray-600 mb-4">${message}</p>
                    <input type="text" id="customPromptInput" value="${defaultValue}" 
                        class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                        placeholder="Değer giriniz...">
                    <div class="flex justify-end space-x-3">
                        <button onclick="closeCustomPrompt()" 
                            class="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
                            İptal
                        </button>
                        <button onclick="confirmCustomPrompt()" 
                            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                            Tamam
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Store callback
    window._customPromptCallback = onConfirm;
    
    // Focus on input
    setTimeout(() => {
        const input = document.getElementById('customPromptInput');
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);
    
    // Handle Enter key
    document.getElementById('customPromptInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            confirmCustomPrompt();
        }
    });
    
    // Handle Escape key
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            closeCustomPrompt();
            document.removeEventListener('keydown', escapeHandler);
        }
    });
};

window.closeCustomPrompt = function() {
    const modal = document.getElementById('customPromptModal');
    if (modal) {
        modal.classList.add('animate-fade-out');
        setTimeout(() => modal.remove(), 200);
    }
    window._customPromptCallback = null;
};

window.confirmCustomPrompt = function() {
    const input = document.getElementById('customPromptInput');
    const value = input ? input.value : '';
    
    if (window._customPromptCallback) {
        window._customPromptCallback(value);
        window._customPromptCallback = null;
    }
    closeCustomPrompt();
};

// Global modal functions
window.editDeviceModal = async function(deviceId, patientId) {
    try {
        // Fetch device details
        const apiClient = new ApiClient();
        const devicesResponse = await apiClient.getPatientDevices(patientId);
        const devices = Array.isArray(devicesResponse) ? devicesResponse : (devicesResponse?.data || []);
        const device = devices.find(d => d.id === deviceId);
        
        if (!device) {
            showCustomAlert('Hata', 'Cihaz bulunamadı', 'error');
            return;
        }
        
        const modalHtml = `
            <div id="editDeviceModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
                    <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-gray-900">Cihaz Düzenle</h3>
                        <button onclick="closeEditDeviceModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    
                    <form id="editDeviceForm" class="p-6 space-y-4">
                        <!-- Serial Number -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Seri Numarası</label>
                            <input type="text" id="edit_serialNumber" value="${device.serialNumber || ''}" 
                                class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Seri numarası giriniz">
                        </div>
                        
                        <!-- Ear Selection -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Kulak Seçimi</label>
                            <div class="grid grid-cols-2 gap-3">
                                <button type="button" onclick="selectEar('RIGHT')" 
                                    id="ear_RIGHT"
                                    class="px-4 py-3 border-2 rounded-lg font-medium transition-all ${device.ear === 'RIGHT' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300 text-gray-700 hover:border-red-300'}">
                                    <svg class="w-6 h-6 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                                        <circle cx="10" cy="10" r="8"/>
                                    </svg>
                                    Sağ Kulak
                                </button>
                                <button type="button" onclick="selectEar('LEFT')" 
                                    id="ear_LEFT"
                                    class="px-4 py-3 border-2 rounded-lg font-medium transition-all ${device.ear === 'LEFT' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:border-blue-300'}">
                                    <svg class="w-6 h-6 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                                        <circle cx="10" cy="10" r="8"/>
                                    </svg>
                                    Sol Kulak
                                </button>
                            </div>
                            <input type="hidden" id="edit_ear" value="${device.ear}">
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex gap-3 pt-4">
                            <button type="button" onclick="closeEditDeviceModal()" 
                                class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium">
                                İptal
                            </button>
                            <button type="submit" 
                                class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
                                Kaydet
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Form submit handler
        document.getElementById('editDeviceForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveDeviceEditNew(deviceId, patientId);
        });
        
    } catch (error) {
        console.error('Error opening edit modal:', error);
        showCustomAlert('Hata', 'Cihaz düzenleme modalı açılırken hata oluştu', 'error');
    }
};

window.selectEar = function(ear) {
    // Update visual state
    ['LEFT', 'RIGHT'].forEach(e => {
        const btn = document.getElementById(`ear_${e}`);
        if (e === ear) {
            btn.className = `px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                ear === 'LEFT' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-red-500 bg-red-50 text-red-700'
            }`;
        } else {
            btn.className = 'px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium transition-all hover:border-gray-400';
        }
    });
    
    // Update hidden input
    document.getElementById('edit_ear').value = ear;
};

window.closeEditDeviceModal = function() {
    const modal = document.getElementById('editDeviceModal');
    if (modal) modal.remove();
};

window.saveDeviceEditNew = async function(deviceId, patientId) {
    try {
        const serialNumber = document.getElementById('edit_serialNumber').value.trim();
        const ear = document.getElementById('edit_ear').value;
        
        if (!ear) {
            showCustomAlert('Uyarı', 'Lütfen kulak seçimi yapınız', 'warning');
            return;
        }
        
        const apiClient = new ApiClient();
        
        // Update device
        await apiClient.put(`/api/devices/${deviceId}`, {
            serialNumber: serialNumber || null,
            ear: ear
        });
        
        // Add to timeline
        await apiClient.addPatientTimelineEvent(patientId, {
            type: 'device_update',
            title: 'Cihaz Güncellendi',
            description: `Cihaz bilgileri güncellendi: ${ear === 'LEFT' ? 'Sol' : 'Sağ'} kulak${serialNumber ? `, Seri: ${serialNumber}` : ''}`,
            timestamp: new Date().toISOString()
        });
        
        closeEditDeviceModal();
        
        // Refresh only the Devices tab content without changing tabs
        if (window.patientTabContentComponent && window.currentPatientData) {
            const devicesTab = document.querySelector('[data-tab="devices"]');
            if (devicesTab && devicesTab.classList.contains('active')) {
                // We're on devices tab, refresh it
                const content = await window.patientTabContentComponent.render(window.currentPatientData);
                document.getElementById('tab-content').innerHTML = content;
            }
        }
        
    } catch (error) {
        console.error('Error saving device edit:', error);
        showCustomAlert('Hata', 'Cihaz güncellenirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 'error');
    }
};

// Remove Device Modal
window.removeDeviceModal = function(deviceId, patientId) {
    const modalHtml = `
        <div id="removeDeviceModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900">Cihazı Kaldır</h3>
                </div>
                
                <div class="p-6">
                    <div class="flex items-center justify-center mb-4">
                        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                        </div>
                    </div>
                    <p class="text-center text-gray-700 mb-2 font-medium">Bu cihazı hastadan kaldırmak istediğinize emin misiniz?</p>
                    <p class="text-center text-sm text-gray-500">Bu işlem geri alınamaz.</p>
                </div>
                
                <div class="px-6 py-4 bg-gray-50 flex gap-3 rounded-b-lg">
                    <button onclick="closeRemoveDeviceModal()" 
                        class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 font-medium">
                        İptal
                    </button>
                    <button onclick="confirmRemoveDevice('${deviceId}', '${patientId}')" 
                        class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium">
                        Kaldır
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeRemoveDeviceModal = function() {
    const modal = document.getElementById('removeDeviceModal');
    if (modal) modal.remove();
};

window.confirmRemoveDevice = async function(deviceId, patientId) {
    try {
        const apiClient = new ApiClient();
        
        // Get device info before deleting for timeline
        const devicesResponse = await apiClient.getPatientDevices(patientId);
        const devices = Array.isArray(devicesResponse) ? devicesResponse : (devicesResponse?.data || []);
        const device = devices.find(d => d.id === deviceId);
        
        // Delete device
        await apiClient.delete(`/api/devices/${deviceId}`);
        
        // Add to timeline
        if (device) {
            await apiClient.addPatientTimelineEvent(patientId, {
                type: 'device_removed',
                title: 'Cihaz Kaldırıldı',
                description: `${device.brand} ${device.model} (${device.ear === 'LEFT' ? 'Sol' : 'Sağ'} kulak) kaldırıldı`,
                timestamp: new Date().toISOString()
            });
        }
        
        closeRemoveDeviceModal();
        showCustomAlert('Başarılı', 'Cihaz başarıyla kaldırıldı', 'success');
        
        // Refresh only the Devices tab content without changing tabs
        const devicesTab = document.querySelector('[data-tab="devices"]');
        if (devicesTab && devicesTab.classList.contains('active')) {
            // We're on devices tab, reload device data and refresh it
            if (window.deviceManagementComponent) {
                await window.deviceManagementComponent.loadDevices(patientId);
            }
            if (window.patientTabContentComponent && window.currentPatientData) {
                const content = await window.patientTabContentComponent.render(window.currentPatientData);
                document.getElementById('tab-content').innerHTML = content;
            }
        }
        
    } catch (error) {
        console.error('Error removing device:', error);
        showCustomAlert('Hata', 'Cihaz kaldırılırken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 'error');
    }
};

// Report Device Replacement Modal
window.reportDeviceReplacement = async function(oldDeviceId, patientId) {
    try {
        const apiClient = new ApiClient();
        
        // Fetch old device info
        const devicesResponse = await apiClient.getPatientDevices(patientId);
        const devices = Array.isArray(devicesResponse) ? devicesResponse : (devicesResponse?.data || []);
        const oldDevice = devices.find(d => d.id === oldDeviceId);
        
        if (!oldDevice) {
            showCustomAlert('Hata', 'Cihaz bulunamadı', 'error');
            return;
        }
        
        // Fetch inventory (hearing aids ONLY) from /api/inventory
        let inventoryData;
        try {
            if (window.inventoryGetInventory) {
                inventoryData = await window.inventoryGetInventory();
            } else if (window.APIConfig) {
                inventoryData = await window.APIConfig.makeRequest(`${apiClient.baseUrl}/api/inventory`);
            } else {
                console.warn('No API client available for inventory fetch');
                const inventoryResponse = await fetch(`${apiClient.baseUrl}/api/inventory`);
                inventoryData = await inventoryResponse.json();
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
            showCustomAlert('Hata', 'Envanter yüklenemedi', 'error');
            return;
        }

        const allInventory = inventoryData.data || inventoryData.items || [];
        
        // STRICT FILTER: Only hearing_aid category
        const inventory = allInventory.filter(item => {
            const cat = (item.category || '').toLowerCase();
            return cat === 'hearing_aid';
        });

        const modalHtml = `
            <div id="replacementModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
                    <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">Cihaz Değişimi Bildir</h3>
                            <p class="text-sm text-gray-600 mt-1">Mevcut: ${oldDevice.brand} ${oldDevice.model}</p>
                        </div>
                        <button onclick="closeReplacementModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Search Bar -->
                    <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <input type="text" id="replacementSearch" 
                            placeholder="Marka, model, seri no veya barkod ile ara..." 
                            class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            oninput="filterReplacementDevices()">
                    </div>
                    
                    <!-- Inventory Grid -->
                    <div class="p-6 max-h-[60vh] overflow-y-auto">
                        <div id="replacementDeviceGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${inventory.length === 0 ? 
                                '<div class="col-span-full text-center py-8 text-gray-500">Envanterde işitme cihazı bulunamadı</div>' :
                                inventory.map(item => `
                                <div class="replacement-device-card border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                                    data-search="${([item.brand, item.name, item.model, item.barcode].filter(Boolean).join(' ') + ' ' + (item.availableSerials || []).join(' ')).toLowerCase()}"
                                    onclick="selectReplacementDevice('${item.id}', '${oldDeviceId}', '${patientId}', this)">
                                    <h4 class="font-semibold text-gray-900 mb-2">${item.brand || 'N/A'} ${item.name || item.model || 'Cihaz'}</h4>
                                    ${item.model ? `<p class="text-xs text-gray-500 mb-2">Model: ${item.model}</p>` : ''}
                                    <div class="space-y-1 text-xs text-gray-600">
                                        <p><span class="font-medium">Stok:</span> ${item.availableInventory || item.inventory || 0}</p>
                                        ${item.barcode ? `<p><span class="font-medium">Barkod:</span> ${item.barcode}</p>` : ''}
                                        <p><span class="font-medium">Fiyat:</span> ₺${(item.price || 0).toLocaleString('tr-TR')}</p>
                                        ${item.supplier ? `<p class="text-xs text-gray-400 mt-1">Tedarikçi: ${item.supplier}</p>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <input type="hidden" id="selectedReplacementDevice" value="">
                    
                    <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
                        <button onclick="closeReplacementModal()" 
                            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 font-medium">
                            İptal
                        </button>
                        <button onclick="saveReplacement('${oldDeviceId}', '${patientId}')" 
                            class="flex-1 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 font-medium">
                            Değişimi Kaydet
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
    } catch (error) {
        console.error('Error opening replacement modal:', error);
        showCustomAlert('Hata', 'Değişim modalı açılırken hata oluştu', 'error');
    }
};

window.filterReplacementDevices = function() {
    const searchTerm = document.getElementById('replacementSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.replacement-device-card');
    
    cards.forEach(card => {
        const searchData = card.getAttribute('data-search');
        if (searchData.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
};

window.selectReplacementDevice = function(deviceId, oldDeviceId, patientId, element) {
    // Remove previous selection
    document.querySelectorAll('.replacement-device-card').forEach(card => {
        card.classList.remove('border-blue-500', 'bg-blue-50');
        card.classList.add('border-gray-300');
    });
    
    // Mark as selected
    element.classList.remove('border-gray-300');
    element.classList.add('border-blue-500', 'bg-blue-50');
    
    // Store selection
    document.getElementById('selectedReplacementDevice').value = deviceId;
};

window.closeReplacementModal = function() {
    const modal = document.getElementById('replacementModal');
    if (modal) modal.remove();
};

window.saveReplacement = async function(oldDeviceId, patientId) {
    try {
        const newInventoryId = document.getElementById('selectedReplacementDevice').value;
        
        if (!newInventoryId) {
            showCustomAlert('Uyarı', 'Lütfen bir ürün seçiniz', 'warning');
            return;
        }
        
        const apiClient = new ApiClient();
        
        // Get device details
        const devicesResponse = await apiClient.getPatientDevices(patientId);
        const devices = Array.isArray(devicesResponse) ? devicesResponse : (devicesResponse?.data || []);
        const oldDevice = devices.find(d => d.id === oldDeviceId);
        
        const inventoryResponse = await fetch(`${apiClient.baseUrl}/api/inventory`);
        const inventoryData = await inventoryResponse.json();
        const inventory = inventoryData.data || inventoryData.items || [];
        const newInventoryItem = inventory.find(i => i.id === newInventoryId);
        
        // Create replacement via API
        const replacementData = {
            oldDeviceId: oldDeviceId,
            newInventoryId: newInventoryId,
            oldDeviceInfo: `${oldDevice.brand} ${oldDevice.model}`,
            newDeviceInfo: `${newInventoryItem.brand} ${newInventoryItem.name}`
        };
        
        try {
            let result;
            if (window.patientsCreatePatientReplacement) {
                result = await window.patientsCreatePatientReplacement({ patientId }, replacementData);
            } else if (window.APIConfig) {
                result = await window.APIConfig.makeRequest(
                    `${apiClient.baseUrl}/api/patients/${patientId}/replacements`,
                    'POST',
                    replacementData,
                    { headers: { 'Content-Type': 'application/json' } }
                );
            } else {
                console.warn('No API client available for replacement creation');
                const response = await fetch(`${apiClient.baseUrl}/api/patients/${patientId}/replacements`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(replacementData)
                });
                result = await response.json();
            }
            
            if (!result.success) {
                throw new Error(result.error || 'Değişim kaydedilemedi');
            }
        } catch (error) {
            console.error('Error creating replacement:', error);
            showCustomAlert('Hata', 'Değişim kaydedilemedi', 'error');
            return;
        }

        // Add to timeline
        await apiClient.addPatientTimelineEvent(patientId, {
            type: 'device_replacement',
            title: 'Cihaz Değişimi Bildirildi',
            description: `${oldDevice.brand} ${oldDevice.model} → ${newInventoryItem.brand} ${newInventoryItem.name}`,
            timestamp: new Date().toISOString()
        });
        
        closeReplacementModal();
        
        showCustomAlert('Başarılı', 'Değişim kaydedildi! Satışlar sekmesinden değişimi tamamlayabilirsiniz.', 'success');
        
        // Refresh current tab content
        if (window.patientTabContentComponent && window.currentPatientData) {
            const currentTab = document.querySelector('[data-tab].active');
            if (currentTab) {
                const content = await window.patientTabContentComponent.render(window.currentPatientData);
                document.getElementById('tab-content').innerHTML = content;
            }
        }
        
        // Show info toast
        if (typeof showTopRightToast === 'function') {
            setTimeout(() => {
                showTopRightToast(
                    'İade Faturası Oluşturun',
                    'Satışlar sekmesine giderek İade/Değişim bölümünden İade Faturası Oluştur butonuna tıklayarak işlemi tamamlayabilirsiniz.',
                    'info',
                    5000
                );
            }, 500);
        }
        
    } catch (error) {
        console.error('Error saving replacement:', error);
        showCustomAlert('Hata', 'Değişim kaydedilirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 'error');
    }
};
