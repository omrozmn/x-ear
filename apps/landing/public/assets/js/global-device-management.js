/**
 * Global Device Management Wrapper Functions
 * Provides backward compatibility and easy access to device management features
 * 
 * New System: DeviceManagementComponent (device-management.js)
 * Replaces: DevicesTabManager (devices-tab.js) - DEPRECATED
 */

// Ensure deviceManagement is initialized
function ensureDeviceManagement() {
    if (!window.deviceManagement) {
        console.warn('⚠️ deviceManagement not initialized. Creating instance...');
        window.deviceManagement = new DeviceManagementComponent(window.apiClient);
    }
    return window.deviceManagement;
}

/**
 * Assign a device to a patient
 * Opens the device assignment modal
 * @param {string} patientId - Patient ID
 */
window.assignDevice = function(patientId) {
    const dm = ensureDeviceManagement();
    return dm.openAssignDeviceModal(patientId);
};

/**
 * Remove device assignment from patient
 * @param {string} assignmentId - Assignment ID to remove
 */
window.removeDevice = async function(assignmentId) {
    const dm = ensureDeviceManagement();
    
    if (!confirm('Bu cihaz atamasını kaldırmak istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        // Get assignment details
        const assignment = dm.assignments.find(a => a.id === assignmentId);
        if (!assignment) {
            Utils.showToast('Atama bulunamadı', 'error');
            return;
        }
        
        // Update inventory - add back to available
        if (assignment.inventoryId) {
            const inventoryItem = dm.inventory.find(i => i.id === assignment.inventoryId);
            if (inventoryItem) {
                inventoryItem.availableInventory = (inventoryItem.availableInventory || 0) + 1;
                inventoryItem.usedInventory = Math.max(0, (inventoryItem.usedInventory || 0) - 1);
                
                // Add serial back to available pool
                if (assignment.serialNumber && inventoryItem.availableSerials) {
                    inventoryItem.availableSerials.push(assignment.serialNumber);
                }
                if (assignment.barcode && inventoryItem.availableBarcodes) {
                    inventoryItem.availableBarcodes.push(assignment.barcode);
                }
                
                dm.saveInventory();
            }
        }
        
        // Remove assignment
        const index = dm.assignments.findIndex(a => a.id === assignmentId);
        if (index !== -1) {
            dm.assignments.splice(index, 1);
            dm.saveAssignments();
        }
        
        // Update patient data
        const patients = JSON.parse(localStorage.getItem('xear_patients') || '[]');
        const patient = patients.find(p => p.id === assignment.patientId);
        if (patient && patient.devices) {
            patient.devices = patient.devices.filter(d => d.id !== assignmentId);
            localStorage.setItem('xear_patients', JSON.stringify(patients));
        }

        // Add to timeline
        if (window.APIClient && assignment.patientId) {
            try {
                const apiClient = window.APIClient;
                await apiClient.post(`/api/patients/${assignment.patientId}/timeline`, {
                    type: 'device_removed',
                    title: 'Cihaz Kaldırıldı',
                    description: `${assignment.brand || 'Bilinmeyen'} ${assignment.model || ''} (${assignment.ear === 'left' ? 'Sol' : assignment.ear === 'right' ? 'Sağ' : 'Bilateral'}) kaldırıldı`,
                    category: 'general',
                    icon: 'fa-circle',
                    color: 'blue',
                    details: {
                        brand: assignment.brand,
                        model: assignment.model,
                        ear: assignment.ear,
                        serialNumber: assignment.serialNumber
                    }
                });
            } catch (timelineError) {
                console.warn('Could not add device removal to timeline:', timelineError);
            }
        }
        
        Utils.showToast('Cihaz ataması kaldırıldı', 'success');
        
        // Refresh view if on devices tab
        if (window.patientTabContentComponent && window.currentPatientData) {
            const content = await window.patientTabContentComponent.render(window.currentPatientData);
            document.getElementById('tab-content').innerHTML = content;
        }
    } catch (error) {
        console.error('Error removing device:', error);
        Utils.showToast('Cihaz kaldırma hatası', 'error');
    }
};

/**
 * Edit device assignment
 * @param {string} assignmentId - Assignment ID to edit
 */
window.editDevice = function(assignmentId) {
    const dm = ensureDeviceManagement();
    const assignment = dm.assignments.find(a => a.id === assignmentId);
    
    if (!assignment) {
        Utils.showToast('Atama bulunamadı', 'error');
        return;
    }
    
    // Create edit modal
    const modalHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="editDeviceModal">
            <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-semibold">Cihaz Atamasını Düzenle</h2>
                    <button onclick="closeEditDeviceModal()" class="text-gray-500 hover:text-gray-700">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <form id="editDeviceForm" onsubmit="saveDeviceEdit(event, '${assignmentId}')">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Cihaz</label>
                            <input type="text" value="${assignment.brand} ${assignment.model}" 
                                   class="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50" readonly>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Seri No</label>
                            <input type="text" name="serialNumber" value="${assignment.serialNumber || ''}" 
                                   class="w-full border border-gray-300 rounded-md px-3 py-2">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Kulak</label>
                            <select name="ear" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                <option value="left" ${assignment.ear === 'left' ? 'selected' : ''}>Sol Kulak</option>
                                <option value="right" ${assignment.ear === 'right' ? 'selected' : ''}>Sağ Kulak</option>
                                <option value="both" ${assignment.ear === 'both' ? 'selected' : ''}>Bilateral</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Fiyat (₺)</label>
                            <input type="number" name="price" value="${assignment.price || 0}" step="0.01"
                                   class="w-full border border-gray-300 rounded-md px-3 py-2">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                            <select name="status" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                <option value="active" ${assignment.status === 'active' ? 'selected' : ''}>Aktif</option>
                                <option value="trial" ${assignment.status === 'trial' ? 'selected' : ''}>Deneme</option>
                                <option value="maintenance" ${assignment.status === 'maintenance' ? 'selected' : ''}>Bakımda</option>
                                <option value="returned" ${assignment.status === 'returned' ? 'selected' : ''}>İade Edildi</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                            <textarea name="notes" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2">${assignment.notes || ''}</textarea>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" onclick="closeEditDeviceModal()" 
                                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                            İptal
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Kaydet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeEditDeviceModal = function() {
    const modal = document.getElementById('editDeviceModal');
    if (modal) modal.remove();
};

window.saveDeviceEdit = async function(event, assignmentId) {
    event.preventDefault();
    const dm = ensureDeviceManagement();
    
    const formData = new FormData(event.target);
    const updates = {
        serialNumber: formData.get('serialNumber'),
        ear: formData.get('ear'),
        price: parseFloat(formData.get('price')),
        status: formData.get('status'),
        notes: formData.get('notes'),
        updatedAt: new Date().toISOString()
    };
    
    const result = dm.updateAssignment(assignmentId, updates);
    if (result) {
        Utils.showToast('Cihaz ataması güncellendi', 'success');
        closeEditDeviceModal();
        
        // Refresh view
        if (window.patientTabContentComponent && window.currentPatientData) {
            const content = await window.patientTabContentComponent.render(window.currentPatientData);
            document.getElementById('tab-content').innerHTML = content;
        }
    } else {
        Utils.showToast('Güncelleme hatası', 'error');
    }
};

/**
 * Open device maintenance modal
 * @param {string} assignmentId - Assignment ID for maintenance
 */
window.deviceMaintenance = function(assignmentId) {
    const dm = ensureDeviceManagement();
    const assignment = dm.assignments.find(a => a.id === assignmentId);
    
    if (!assignment) {
        Utils.showToast('Atama bulunamadı', 'error');
        return;
    }
    
    const modalHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="maintenanceModal">
            <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-semibold">Cihaz Bakım Kaydı</h2>
                    <button onclick="closeMaintenanceModal()" class="text-gray-500 hover:text-gray-700">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="mb-4 bg-blue-50 p-4 rounded-lg">
                    <h3 class="font-semibold text-blue-900">${assignment.brand} ${assignment.model}</h3>
                    <p class="text-sm text-blue-700">Seri No: ${assignment.serialNumber}</p>
                    <p class="text-sm text-blue-700">Kulak: ${assignment.ear === 'left' ? 'Sol' : 'Sağ'}</p>
                </div>
                
                <form id="maintenanceForm" onsubmit="saveMaintenanceRecord(event, '${assignmentId}')">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Bakım Tipi</label>
                            <select name="maintenanceType" class="w-full border border-gray-300 rounded-md px-3 py-2" required>
                                <option value="">Seçiniz</option>
                                <option value="cleaning">Temizlik</option>
                                <option value="repair">Tamir</option>
                                <option value="adjustment">Ayarlama</option>
                                <option value="battery_replacement">Pil Değişimi</option>
                                <option value="tube_replacement">Hortum Değişimi</option>
                                <option value="general_checkup">Genel Kontrol</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Bakım Tarihi</label>
                            <input type="date" name="maintenanceDate" value="${new Date().toISOString().split('T')[0]}" 
                                   class="w-full border border-gray-300 rounded-md px-3 py-2" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Yapılan İşlemler</label>
                            <textarea name="description" rows="4" 
                                      class="w-full border border-gray-300 rounded-md px-3 py-2" 
                                      placeholder="Yapılan bakım işlemlerini detaylı açıklayın..." required></textarea>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Maliyet (₺)</label>
                            <input type="number" name="cost" step="0.01" min="0" 
                                   class="w-full border border-gray-300 rounded-md px-3 py-2">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Teknisyen</label>
                            <input type="text" name="technician" 
                                   class="w-full border border-gray-300 rounded-md px-3 py-2" 
                                   placeholder="Bakımı yapan teknisyen adı">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Sonraki Bakım Tarihi</label>
                            <input type="date" name="nextMaintenanceDate" 
                                   class="w-full border border-gray-300 rounded-md px-3 py-2">
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" onclick="closeMaintenanceModal()" 
                                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                            İptal
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            Bakım Kaydını Kaydet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeMaintenanceModal = function() {
    const modal = document.getElementById('maintenanceModal');
    if (modal) modal.remove();
};

window.saveMaintenanceRecord = async function(event, assignmentId) {
    event.preventDefault();
    const dm = ensureDeviceManagement();
    
    const formData = new FormData(event.target);
    const maintenanceRecord = {
        id: `maint_${Date.now()}`,
        assignmentId: assignmentId,
        type: formData.get('maintenanceType'),
        date: formData.get('maintenanceDate'),
        description: formData.get('description'),
        cost: parseFloat(formData.get('cost')) || 0,
        technician: formData.get('technician'),
        nextMaintenanceDate: formData.get('nextMaintenanceDate'),
        createdAt: new Date().toISOString()
    };
    
    // Get or create maintenance records array
    let maintenanceRecords = JSON.parse(localStorage.getItem('xear_deviceMaintenance') || '[]');
    maintenanceRecords.push(maintenanceRecord);
    localStorage.setItem('xear_deviceMaintenance', JSON.stringify(maintenanceRecords));
    
    // Update assignment status if in maintenance
    if (maintenanceRecord.type === 'repair') {
        dm.updateAssignment(assignmentId, {
            status: 'maintenance',
            lastMaintenanceDate: maintenanceRecord.date,
            nextMaintenanceDate: maintenanceRecord.nextMaintenanceDate
        });
    }
    
    Utils.showToast('Bakım kaydı oluşturuldu', 'success');
    closeMaintenanceModal();
    
    // Refresh view
    if (window.patientTabContentComponent && window.currentPatientData) {
        const content = await window.patientTabContentComponent.render(window.currentPatientData);
        document.getElementById('tab-content').innerHTML = content;
    }
};

/**
 * Start device trial for patient
 * @param {string} patientId - Patient ID
 */
window.startDeviceTrial = function(patientId) {
    const dm = ensureDeviceManagement();
    
    // Get patient data
    const patients = JSON.parse(localStorage.getItem('xear_patients') || '[]');
    const patient = patients.find(p => p.id === patientId);
    
    if (!patient) {
        Utils.showToast('Hasta bulunamadı', 'error');
        return;
    }
    
    // Open assignment modal in trial mode
    dm.openAssignDeviceModal(patientId);
    
    // Auto-set assignment reason to trial
    setTimeout(() => {
        const reasonSelect = document.querySelector('[name="assignmentReason"]');
        if (reasonSelect) {
            reasonSelect.value = 'trial';
        }
    }, 100);
};

/**
 * Complete device trial
 * @param {string} trialId - Trial ID
 */
window.completeDeviceTrial = function(trialId) {
    const dm = ensureDeviceManagement();
    
    const modalHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="completeTrialModal">
            <div class="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 class="text-xl font-semibold mb-4">Cihaz Denemesini Tamamla</h2>
                
                <form id="completeTrialForm" onsubmit="saveTrialCompletion(event, '${trialId}')">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Deneme Sonucu</label>
                            <select name="result" class="w-full border border-gray-300 rounded-md px-3 py-2" required>
                                <option value="">Seçiniz</option>
                                <option value="purchased">Satın Alındı</option>
                                <option value="returned">İade Edildi</option>
                                <option value="extended">Süre Uzatıldı</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                            <textarea name="notes" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2" 
                                      placeholder="Deneme süreci hakkında notlar..."></textarea>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" onclick="closeCompleteTrialModal()" 
                                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                            İptal
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Tamamla
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeCompleteTrialModal = function() {
    const modal = document.getElementById('completeTrialModal');
    if (modal) modal.remove();
};

window.saveTrialCompletion = async function(event, trialId) {
    event.preventDefault();
    const dm = ensureDeviceManagement();
    
    const formData = new FormData(event.target);
    const result = formData.get('result');
    const notes = formData.get('notes');
    
    const completedTrial = dm.endDeviceTrial(trialId, result, notes);
    
    if (completedTrial) {
        Utils.showToast('Deneme süreci tamamlandı', 'success');
        closeCompleteTrialModal();
        
        // Refresh view
        if (window.patientTabContentComponent && window.currentPatientData) {
            const content = await window.patientTabContentComponent.render(window.currentPatientData);
            document.getElementById('tab-content').innerHTML = content;
        }
    } else {
        Utils.showToast('Tamamlama hatası', 'error');
    }
};

/**
 * Edit device trial
 * @param {string} trialId - Trial ID to edit
 */
window.editDeviceTrial = function(trialId) {
    const trials = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.DEVICETRIALS || 'xear_deviceTrials') || '[]');
    const trial = trials.find(t => t.id === trialId);
    
    if (!trial) {
        Utils.showToast('Deneme kaydı bulunamadı', 'error');
        return;
    }
    
    Utils.showToast('Düzenleme özelliği yakında eklenecek', 'info');
};

/**
 * Open serial number list modal
 * @param {string} itemId - Inventory item ID
 */
window.openSerialListModal = function(itemId) {
    const dm = ensureDeviceManagement();
    return dm.openSerialListModal(itemId);
};

/**
 * Close serial number list modal
 */
window.closeSerialListModal = function() {
    const dm = ensureDeviceManagement();
    return dm.closeSerialListModal();
};

/**
 * Close assign device modal
 */
window.closeAssignDeviceModal = function() {
    const modal = document.getElementById('assignDeviceModal');
    if (modal) modal.remove();
};

/**
 * Close inventory modal
 */
window.closeInventoryModal = function() {
    const modal = document.getElementById('inventoryModal');
    if (modal) modal.remove();
};

console.log('✅ Global Device Management wrapper functions loaded');
