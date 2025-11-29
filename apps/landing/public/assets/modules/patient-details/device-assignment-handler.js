/**
 * Device Assignment Handler
 * Manages device assignment form interactions and validation
 */
class DeviceAssignmentHandler {
    constructor(deviceManagement) {
        this.deviceManagement = deviceManagement;
    }

    /**
     * Update ear mode (inventory vs manual entry)
     * @param {string} ear - 'right' or 'left'
     */
    updateEarMode(ear) {
        const mode = document.getElementById(`${ear}EarMode`).value;
        const inventoryMode = document.getElementById(`${ear}EarInventoryMode`);
        const manualMode = document.getElementById(`${ear}EarManualMode`);

        if (mode === 'inventory') {
            inventoryMode.classList.remove('hidden');
            manualMode.classList.add('hidden');
        } else {
            inventoryMode.classList.add('hidden');
            manualMode.classList.remove('hidden');
        }

        this.validateDeviceAssignment();
    }

    /**
     * Load device inventory and populate select dropdowns
     */
    loadDeviceInventory() {
        if (!this.deviceManagement) {
            console.warn('Device management component not available');
            return;
        }

        const rightEarSelect = document.getElementById('rightEarDeviceSelect');
        const leftEarSelect = document.getElementById('leftEarDeviceSelect');

        if (!rightEarSelect || !leftEarSelect) {
            console.warn('Device select elements not found');
            return;
        }

        // Clear existing options
        rightEarSelect.innerHTML = '<option value="">Ürün seçin...</option>';
        leftEarSelect.innerHTML = '<option value="">Ürün seçin...</option>';

        // Get available inventory
        const availableInventory = this.deviceManagement.getInventoryItems({ status: 'available' });

        // Add options for each ear
        availableInventory.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.brand} ${item.model} - ${item.serialNumber} (${item.ear === 'left' ? 'Sol' : 'Sağ'})`;
            option.dataset.item = JSON.stringify(item);

            if (item.ear === 'right') {
                rightEarSelect.appendChild(option.cloneNode(true));
            } else if (item.ear === 'left') {
                leftEarSelect.appendChild(option);
            }
        });

        console.log(`Loaded ${availableInventory.length} inventory items`);
    }

    /**
     * Validate device assignment form
     * @returns {Object} Validation result with rightEarValid and leftEarValid flags
     */
    validateDeviceAssignment() {
        const rightEarMode = document.getElementById('rightEarMode')?.value;
        const leftEarMode = document.getElementById('leftEarMode')?.value;

        let rightEarValid = false;
        let leftEarValid = false;

        // Validate right ear
        if (rightEarMode === 'inventory') {
            const deviceSelect = document.getElementById('rightEarDeviceSelect');
            rightEarValid = deviceSelect && deviceSelect.value !== '';
        } else {
            const brand = document.getElementById('rightEarBrand')?.value;
            const model = document.getElementById('rightEarModel')?.value;
            const serial = document.getElementById('rightEarSerial')?.value;
            const type = document.getElementById('rightEarType')?.value;
            rightEarValid = !!(brand && model && serial && type);
        }

        // Validate left ear
        if (leftEarMode === 'inventory') {
            const deviceSelect = document.getElementById('leftEarDeviceSelect');
            leftEarValid = deviceSelect && deviceSelect.value !== '';
        } else {
            const brand = document.getElementById('leftEarBrand')?.value;
            const model = document.getElementById('leftEarModel')?.value;
            const serial = document.getElementById('leftEarSerial')?.value;
            const type = document.getElementById('leftEarType')?.value;
            leftEarValid = !!(brand && model && serial && type);
        }

        // Update button state
        const assignBtn = document.getElementById('assignDeviceBtn');
        if (assignBtn) {
            if (rightEarValid || leftEarValid) {
                assignBtn.disabled = false;
                assignBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
                assignBtn.classList.add('bg-blue-600', 'hover:bg-blue-700', 'cursor-pointer');
            } else {
                assignBtn.disabled = true;
                assignBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'cursor-pointer');
                assignBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
            }
        }

        // Update status indicators
        this.updateStatusIndicator('rightEarStatus', rightEarValid);
        this.updateStatusIndicator('leftEarStatus', leftEarValid);

        return { rightEarValid, leftEarValid };
    }

    /**
     * Update status indicator for ear
     * @param {string} elementId - Status element ID
     * @param {boolean} isValid - Validation state
     */
    updateStatusIndicator(elementId, isValid) {
        const statusElement = document.getElementById(elementId);
        if (statusElement) {
            statusElement.textContent = isValid ? 'Hazır' : 'Eksik Bilgi';
            statusElement.className = isValid
                ? 'text-sm font-medium text-green-700'
                : 'text-sm font-medium text-red-700';
        }
    }

    /**
     * Toggle device assignment form visibility
     */
    toggleDeviceAssignmentForm() {
        const card = document.getElementById('deviceAssignmentCard');
        const button = document.getElementById('toggleDeviceAssignmentBtn');

        if (!card || !button) return;

        if (card.classList.contains('hidden')) {
            card.classList.remove('hidden');
            button.innerHTML = `
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                İptal
            `;
            this.initializeDeviceAssignmentForm();
        } else {
            card.classList.add('hidden');
            button.innerHTML = `
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Cihaz Ata
            `;
        }
    }

    /**
     * Initialize device assignment form
     */
    initializeDeviceAssignmentForm() {
        // Load device inventory
        this.loadDeviceInventory();

        // Load SGK schemes for assignment
        if (typeof window.loadSgkSchemesForAssignment === 'function') {
            window.loadSgkSchemesForAssignment();
        }

        // Set initial modes
        this.updateEarMode('right');
        this.updateEarMode('left');

        // Add event listeners for validation
        const inputs = [
            'rightEarDeviceSelect', 'rightEarBrand', 'rightEarModel', 'rightEarSerial', 'rightEarType',
            'leftEarDeviceSelect', 'leftEarBrand', 'leftEarModel', 'leftEarSerial', 'leftEarType'
        ];

        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.validateDeviceAssignment());
                element.addEventListener('input', () => this.validateDeviceAssignment());
            }
        });
    }

    /**
     * Cancel device assignment
     */
    cancelDeviceAssignment() {
        const card = document.getElementById('deviceAssignmentCard');
        const button = document.getElementById('toggleDeviceAssignmentBtn');

        if (!card || !button) return;

        card.classList.add('hidden');
        button.innerHTML = `
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Cihaz Ata
        `;
    }

    /**
     * Clear device assignment form
     */
    clearDeviceAssignment() {
        // Reset mode selects
        const rightMode = document.getElementById('rightEarMode');
        const leftMode = document.getElementById('leftEarMode');
        if (rightMode) rightMode.value = 'inventory';
        if (leftMode) leftMode.value = 'inventory';

        // Clear inventory selects
        const rightSelect = document.getElementById('rightEarDeviceSelect');
        const leftSelect = document.getElementById('leftEarDeviceSelect');
        if (rightSelect) rightSelect.value = '';
        if (leftSelect) leftSelect.value = '';

        // Clear manual entry fields
        ['rightEarBrand', 'rightEarModel', 'rightEarSerial', 'rightEarType',
         'leftEarBrand', 'leftEarModel', 'leftEarSerial', 'leftEarType'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });

        // Update modes and validation
        this.updateEarMode('right');
        this.updateEarMode('left');
        this.validateDeviceAssignment();
    }

    /**
     * Assign devices to patient
     * @param {Object} currentPatientData - Current patient data
     * @returns {Promise<Object>} Assignment result
     */
    async assignDevices(currentPatientData) {
        if (!this.deviceManagement || !currentPatientData) {
            alert('Cihaz yönetim sistemi veya hasta verisi bulunamadı.');
            return { success: false };
        }

        const rightEarMode = document.getElementById('rightEarMode')?.value;
        const leftEarMode = document.getElementById('leftEarMode')?.value;

        const assignments = [];

        // Process right ear assignment
        if (rightEarMode === 'inventory') {
            const deviceSelect = document.getElementById('rightEarDeviceSelect');
            if (deviceSelect && deviceSelect.value) {
                const selectedOption = deviceSelect.options[deviceSelect.selectedIndex];
                const deviceData = JSON.parse(selectedOption.dataset.item);
                assignments.push({
                    ...deviceData,
                    patientId: currentPatientData.id,
                    patientName: `${currentPatientData.firstName || ''} ${currentPatientData.lastName || ''}`.trim(),
                    assignmentDate: new Date().toISOString().split('T')[0],
                    ear: 'right'
                });
            }
        } else {
            // Manual entry for right ear
            const brand = document.getElementById('rightEarBrand')?.value;
            const model = document.getElementById('rightEarModel')?.value;
            const serial = document.getElementById('rightEarSerial')?.value;
            const type = document.getElementById('rightEarType')?.value;

            if (brand && model && serial && type) {
                assignments.push({
                    brand,
                    model,
                    serialNumber: serial,
                    type,
                    patientId: currentPatientData.id,
                    patientName: `${currentPatientData.firstName || ''} ${currentPatientData.lastName || ''}`.trim(),
                    assignmentDate: new Date().toISOString().split('T')[0],
                    ear: 'right',
                    status: 'assigned'
                });
            }
        }

        // Process left ear assignment
        if (leftEarMode === 'inventory') {
            const deviceSelect = document.getElementById('leftEarDeviceSelect');
            if (deviceSelect && deviceSelect.value) {
                const selectedOption = deviceSelect.options[deviceSelect.selectedIndex];
                const deviceData = JSON.parse(selectedOption.dataset.item);
                assignments.push({
                    ...deviceData,
                    patientId: currentPatientData.id,
                    patientName: `${currentPatientData.firstName || ''} ${currentPatientData.lastName || ''}`.trim(),
                    assignmentDate: new Date().toISOString().split('T')[0],
                    ear: 'left'
                });
            }
        } else {
            // Manual entry for left ear
            const brand = document.getElementById('leftEarBrand')?.value;
            const model = document.getElementById('leftEarModel')?.value;
            const serial = document.getElementById('leftEarSerial')?.value;
            const type = document.getElementById('leftEarType')?.value;

            if (brand && model && serial && type) {
                assignments.push({
                    brand,
                    model,
                    serialNumber: serial,
                    type,
                    patientId: currentPatientData.id,
                    patientName: `${currentPatientData.firstName || ''} ${currentPatientData.lastName || ''}`.trim(),
                    assignmentDate: new Date().toISOString().split('T')[0],
                    ear: 'left',
                    status: 'assigned'
                });
            }
        }

        if (assignments.length === 0) {
            alert('Atamak için en az bir ürün seçin veya manuel giriş yapın.');
            return { success: false };
        }

        try {
            let successCount = 0;
            for (const assignment of assignments) {
                const result = await this.deviceManagement.assignDevice(assignment);
                if (result) {
                    successCount++;
                }
            }

            if (successCount > 0) {
                alert(`${successCount} cihaz başarıyla atandı!`);
                this.cancelDeviceAssignment();
                return { success: true, count: successCount };
            } else {
                alert('Cihaz ataması başarısız oldu.');
                return { success: false };
            }
        } catch (error) {
            console.error('Device assignment error:', error);
            alert('Cihaz ataması sırasında hata oluştu: ' + error.message);
            return { success: false, error };
        }
    }

    /**
     * Handle device assignment form submission
     * @param {Event} event - Form submit event
     * @param {Object} currentPatientData - Current patient data
     */
    async handleFormSubmit(event, currentPatientData) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const assignmentData = {
            patientId: formData.get('patientId'),
            patientName: currentPatientData ? `${currentPatientData.firstName || ''} ${currentPatientData.lastName || ''}`.trim() : 'Bilinmeyen Hasta',
            brand: formData.get('brand'),
            model: formData.get('model'),
            ear: formData.get('ear'),
            serialNumber: formData.get('serialNumber'),
            assignmentDate: formData.get('assignmentDate'),
            warrantyEndDate: formData.get('warrantyEndDate'),
            price: parseFloat(formData.get('price')) || 0,
            notes: formData.get('notes') || ''
        };

        try {
            if (this.deviceManagement) {
                const result = await this.deviceManagement.assignDevice(assignmentData);

                if (result) {
                    alert('Cihaz başarıyla atandı!');
                    this.cancelDeviceAssignment();
                    event.target.reset();
                    return { success: true, shouldRefresh: true };
                } else {
                    alert('Cihaz ataması başarısız oldu.');
                    return { success: false };
                }
            } else {
                alert('Cihaz yönetim sistemi yüklenmemiş.');
                return { success: false };
            }
        } catch (error) {
            console.error('Device assignment error:', error);
            alert('Cihaz ataması sırasında hata oluştu: ' + error.message);
            return { success: false, error };
        }
    }
}
