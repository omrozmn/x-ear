class PatientManagementComponent {
    constructor(apiClient) {
        this.apiClient = apiClient;
    }

    // Exact replica of legacy editPatient function
    editPatient() {
        const patient = window.patientDetailsManager?.currentPatient || {};
        if (!patient.id) {
            this.showToast('Hasta bilgileri yüklenemedi', 'error');
            return;
        }

        this.showModal({
            title: 'Hasta Bilgilerini Düzenle',
            content: `
                <form id="editPatientForm" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Ad</label>
                            <input type="text" id="editPatientFirstName" value="${patient.firstName || patient.first_name || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Soyad</label>
                            <input type="text" id="editPatientLastName" value="${patient.lastName || patient.last_name || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">TC Kimlik No</label>
                            <input type="text" id="editPatientTC" value="${patient.tcNumber || patient.tc || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   maxlength="11">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                            <input type="text" id="editPatientPhone" value="${patient.phone || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                            <input type="email" id="editPatientEmail" value="${patient.email || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Doğum Tarihi</label>
                            <input type="date" id="editPatientBirthDate" value="${patient.birthDate || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                            <select id="editPatientStatus" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="active" ${patient.status === 'active' ? 'selected' : ''}>Aktif</option>
                                <option value="inactive" ${patient.status === 'inactive' ? 'selected' : ''}>Pasif</option>
                                <option value="trial" ${patient.status === 'trial' ? 'selected' : ''}>Deneme</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                        <textarea id="editPatientAddress" rows="3"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">${patient.address || ''}</textarea>
                    </div>
                </form>
            `,
            primaryButton: {
                text: 'Kaydet',
                onClick: () => {
                    this.savePatientChanges();
                }
            },
            secondaryButton: {
                text: 'İptal',
                onClick: () => {}
            }
        });
    }

    // Exact replica of legacy savePatientChanges function
    async savePatientChanges() {
        const updatedData = {
            firstName: document.getElementById('editPatientFirstName').value.trim(),
            lastName: document.getElementById('editPatientLastName').value.trim(),
            tcNumber: document.getElementById('editPatientTC').value.trim(),
            tc: document.getElementById('editPatientTC').value.trim(), // Keep both for compatibility
            tc: document.getElementById('editPatientTC').value.trim(), // Keep both for compatibility
            phone: document.getElementById('editPatientPhone').value.trim(),
            email: document.getElementById('editPatientEmail').value.trim(),
            birthDate: document.getElementById('editPatientBirthDate').value,
            status: document.getElementById('editPatientStatus').value,
            address: document.getElementById('editPatientAddress').value.trim()
        };

        // Calculate age if birth date is provided
        if (updatedData.birthDate) {
            updatedData.age = this.calculateAge(updatedData.birthDate);
        }

        // Validate required fields
        if (!updatedData.firstName) {
            this.showToast('Ad gereklidir', 'error');
            return false;
        }

        if (!updatedData.lastName) {
            this.showToast('Soyad gereklidir', 'error');
            return false;
        }

        if (!updatedData.tcNumber) {
            this.showToast('TC Kimlik No gereklidir', 'error');
            return false;
        }

        if (updatedData.tcNumber.length !== 11) {
            this.showToast('TC Kimlik No 11 haneli olmalıdır', 'error');
            return false;
        }

        // Validate TC number with algorithm
        if (!this.validateTCKN(updatedData.tcNumber)) {
            this.showToast('Geçersiz TC Kimlik No. Lütfen doğru TC Kimlik No giriniz.', 'error');
            return false;
        }

        // Validate phone number if provided
        if (updatedData.phone && !this.validatePhone(updatedData.phone)) {
            this.showToast('Geçersiz telefon numarası. Lütfen doğru telefon numarası giriniz.', 'error');
            return false;
        }

        try {
            const patientId = window.patientDetailsManager?.currentPatient?.id;
            if (!patientId) {
                this.showToast('Hasta ID bulunamadı', 'error');
                return false;
            }

            // Prepare data for API (convert to backend format)
            const apiData = {
                firstName: updatedData.firstName,
                lastName: updatedData.lastName,
                tcNumber: updatedData.tcNumber,
                phone: updatedData.phone,
                email: updatedData.email,
                birthDate: updatedData.birthDate,
                status: updatedData.status,
                address: {
                    fullAddress: updatedData.address
                }
            };

            // Try to save via API first
            let saveSuccess = false;
            try {
                const response = await this.apiClient.updatePatient(patientId, apiData);
                if (response && response.success) {
                    saveSuccess = true;
                    console.log('✅ Patient updated via API');
                }
            } catch (apiError) {
                console.warn('❌ API update failed, falling back to localStorage:', apiError);
                // Check for unique constraint violation on TC number
                if (apiError && apiError.message && apiError.message.includes('UNIQUE constraint failed: patients.tc_number')) {
                    this.showToast('Bu TC Kimlik Numarası ile zaten bir hasta kayıtlı. Lütfen farklı bir TC Kimlik Numarası giriniz.', 'error');
                    return false;
                }
                // Show user-facing warning so they know server update failed
                const msg = apiError && apiError.message ? apiError.message : 'Sunucuya kaydedilemedi';
                const isReadOnly = (apiError && (apiError.status === 503 || /readonly database|attempt to write a readonly database/i.test(apiError.message || '')));
                if (isReadOnly) {
                    this.showToast('Sunucu veritabanı salt okunur. Değişiklik yalnızca yerelde kaydedildi.', 'warning');
                } else {
                    this.showToast('Sunucuya kaydedilemedi: ' + msg, 'warning');
                }
            }

            // Update current patient data
            if (window.patientDetailsManager?.currentPatient) {
                Object.assign(window.patientDetailsManager.currentPatient, updatedData);
            }

            // Update global currentPatientData to ensure tab switches show updated data
            if (window.currentPatientData) {
                Object.assign(window.currentPatientData, updatedData);
            }

            // Update localStorage for fallback and immediate UI updates
            const patients = this.loadPatientsFromStorage();
            const patientIndex = patients.findIndex(p => p.id === patientId);
            if (patientIndex !== -1) {
                const merged = Object.assign({}, patients[patientIndex], updatedData);
                // Ensure name property remains available for header widgets
                merged.name = `${merged.firstName || ''} ${merged.lastName || ''}`.trim();
                patients[patientIndex] = merged;
                this.savePatientsToStorage(patients);
            }

            // Update UI components
            this.updatePatientHeader(updatedData);
            this.updateGeneralTabInfo(updatedData);

            // Notify patient list to refresh if it exists
            if (window.patientListSidebar && typeof window.patientListSidebar.refresh === 'function') {
                window.patientListSidebar.refresh();
            }

            // Dispatch custom event to notify other components
            // Legacy event
            window.dispatchEvent(new CustomEvent('patientUpdated', { detail: { patientId, updatedData } }));
            // New standardized events for list and sync handling
            try { window.dispatchEvent(new CustomEvent('patient:updated', { detail: { id: patientId } })); } catch(e){}
            // If we saved via API, also emit remote-confirmed event
            if (typeof response !== 'undefined' && response && response.success) {
                try { window.dispatchEvent(new CustomEvent('patient:updated:remote', { detail: { id: patientId } })); } catch(e){}
            }

            if (saveSuccess) this.showToast('Hasta bilgileri başarıyla güncellendi', 'success');
            else this.showToast('Değişiklik yerelde kaydedildi (sunucuya kaydetme başarısız)', 'warning');
            this.closeModal();

            return true;
        } catch (error) {
            console.error('Error saving patient changes:', error);
            this.showToast('Değişiklikler kaydedilirken hata oluştu', 'error');
            return false;
        }
    }

    // Exact replica of legacy updatePatientLabel function
    updatePatientLabel() {
        const patient = window.patientDetailsManager?.currentPatient || {};
        if (!patient.id) {
            this.showToast('Hasta bilgileri yüklenemedi', 'error');
            return;
        }

        // Load custom etiket settings
        const etiketSettings = this.loadEtiketSettings();

        // Generate acquisition type options
        const acquisitionTypeOptions = etiketSettings.acquisitionTypes.map(type =>
            `<option value="${type.value}" ${patient.acquisitionType === type.value ? 'selected' : ''}>${type.name}</option>`
        ).join('');

        // Generate conversion step options
        const conversionStepOptions = etiketSettings.conversionSteps.map(step =>
            `<option value="${step.value}" ${patient.conversionStep === step.value ? 'selected' : ''}>${step.name}</option>`
        ).join('');

        this.showModal({
            title: 'Hasta Etiketlerini Güncelle',
            content: `
                <form id="updateLabelForm" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Edinilme Türü</label>
                            <select id="acquisitionType" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Seçiniz</option>
                                ${acquisitionTypeOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Dönüşüm Adımı</label>
                            <select id="conversionStep" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Seçiniz</option>
                                ${conversionStepOptions}
                            </select>
                        </div>
                    </div>
                </form>
            `,
            primaryButton: {
                text: 'Etiketleri Güncelle',
                onClick: () => {
                    this.saveLabelChanges();
                }
            },
            secondaryButton: {
                text: 'İptal',
                onClick: () => {}
            }
        });
    }

    // Exact replica of legacy saveLabelChanges function
    async saveLabelChanges() {
        const updatedLabels = {
            acquisitionType: document.getElementById('acquisitionType').value,
            conversionStep: document.getElementById('conversionStep').value
        };

        try {
            const patientId = window.patientDetailsManager?.currentPatient?.id;
            if (!patientId) {
                this.showToast('Hasta ID bulunamadı', 'error');
                return false;
            }

            // Prepare data for API
            const apiData = {
                acquisitionType: updatedLabels.acquisitionType,
                // Send conversionStep explicitly so backend routes map it to conversion_step
                conversionStep: updatedLabels.conversionStep
            };

            // Try to save via API first
            let saveSuccess = false;
            try {
                const response = await this.apiClient.updatePatient(patientId, apiData);
                // Accept a few possible success shapes from different API client implementations
                if (response && (response.success || response.id || (response.data && response.data.id))) {
                    saveSuccess = true;
                    console.log('✅ Patient labels updated via API');
                }
            } catch (apiError) {
                console.warn('❌ API label update failed, falling back to localStorage:', apiError);
                const msg = apiError && apiError.message ? apiError.message : 'Sunucuya kaydedilemedi';
                const isReadOnly = (apiError && (apiError.status === 503 || /readonly database|attempt to write a readonly database/i.test(apiError.message || '')));
                if (isReadOnly) this.showToast('Sunucu veritabanı salt okunur. Etiket değişikliği yalnızca yerelde kaydedildi.', 'warning');
                else this.showToast('Etiket güncellemesi sunucuda başarısız: ' + msg, 'warning');
            }

            // Update current patient data
            if (window.patientDetailsManager?.currentPatient) {
                Object.assign(window.patientDetailsManager.currentPatient, updatedLabels);
            }

            // Update global currentPatientData to ensure tab switches show updated data
            if (window.currentPatientData) {
                Object.assign(window.currentPatientData, updatedLabels);
            }

            // Update localStorage for fallback and immediate UI updates
            const patients = this.loadPatientsFromStorage();
            const patientIndex = patients.findIndex(p => p.id === patientId);
            if (patientIndex !== -1) {
                Object.assign(patients[patientIndex], updatedLabels);
                this.savePatientsToStorage(patients);
            }

            // Update UI components
            this.updateGeneralTabInfo({
                ...window.patientDetailsManager.currentPatient,
                ...updatedLabels
            });

            // Update PatientProfileWidget to refresh header information
            if (window.patientProfileWidget && window.patientProfileWidget.updatePatientData) {
                // Ensure we have valid data before updating
                const currentPatient = window.patientDetailsManager?.currentPatient || {};
                const validData = {
                    tc: currentPatient.tcNumber || currentPatient.tc || 'Bilinmiyor',
                    tcNumber: currentPatient.tcNumber || currentPatient.tc || 'Bilinmiyor',
                    tc: currentPatient.tcNumber || currentPatient.tc || 'Bilinmiyor',
                    tcNumber: currentPatient.tcNumber || currentPatient.tc || 'Bilinmiyor',
                    phone: currentPatient.phone || 'Bilinmiyor',
                    age: currentPatient.age || (currentPatient.birthDate ? this.calculateAge(currentPatient.birthDate) : 'Bilinmiyor'),
                    status: currentPatient.status || 'Aktif',
                    acquisitionType: updatedLabels.acquisitionType || currentPatient.acquisitionType || '',
                    conversionStep: updatedLabels.conversionStep || currentPatient.conversionStep || '',
                    lastVisit: currentPatient.lastVisit || '15 Ocak 2024',
                    birthDate: currentPatient.birthDate,
                    email: currentPatient.email || '',
                    address: currentPatient.address || ''
                };

                console.log('Updating PatientProfileWidget with validated data:', validData);
                window.patientProfileWidget.updatePatientData(validData);
            }

            // Update patient header card in modular page
            if (window.headerCard && window.patientDetailsManager?.currentPatient) {
                const updatedPatient = { ...window.patientDetailsManager.currentPatient, ...updatedLabels };
                document.getElementById('patient-header-card-container').innerHTML = window.headerCard.render(updatedPatient);
            }

            // Notify patient list to refresh
            if (window.patientListSidebar && typeof window.patientListSidebar.refresh === 'function') {
                window.patientListSidebar.refresh();
            }

            // Dispatch custom event to notify other components
            // Legacy event
            window.dispatchEvent(new CustomEvent('patientUpdated', { detail: { patientId, updatedLabels } }));
            // New standardized events for list and sync handling
            try { window.dispatchEvent(new CustomEvent('patient:updated', { detail: { id: patientId } })); } catch(e){}
            // If we saved via API, also emit remote-confirmed event
            if (typeof response !== 'undefined' && response && response.success) {
                try { window.dispatchEvent(new CustomEvent('patient:updated:remote', { detail: { id: patientId } })); } catch(e){}
            }

            // Success message only if it was persisted to the server
            if (saveSuccess) this.showToast('Hasta etiketleri başarıyla güncellendi', 'success');
            else this.showToast('Etiket değişikliği yerelde kaydedildi (sunucuya kaydetme başarısız)', 'warning');
            this.closeModal();

            return true;
        } catch (error) {
            console.error('Error saving label changes:', error);
            this.showToast('Etiket değişiklikleri kaydedilirken hata oluştu', 'error');
            return false;
        }
    }

    // Exact replica of legacy editPatientInfo function
    editPatientInfo() {
        const patient = window.patientDetailsManager?.currentPatient || {};
        if (!patient.id) {
            this.showToast('Hasta bilgileri yüklenemedi', 'error');
            return;
        }

        this.showModal({
            title: 'Hasta Bilgilerini Düzenle',
            content: `
                <form id="editPatientForm" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Ad</label>
                            <input type="text" id="editPatientFirstName" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value="${patient.firstName || patient.first_name || ''}" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Soyad</label>
                            <input type="text" id="editPatientLastName" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value="${patient.lastName || patient.last_name || ''}" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">TC Kimlik No</label>
                            <input type="text" id="editPatientTC" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value="${patient.tcNumber || ''}" maxlength="11" required>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                            <input type="tel" id="editPatientPhone" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value="${patient.phone || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Doğum Tarihi</label>
                            <input type="date" id="editPatientBirthDate" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value="${patient.birthDate || ''}">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                        <input type="email" id="editPatientEmail" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value="${patient.email || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                        <textarea id="editPatientAddress" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Hasta adresi">${patient.address || ''}</textarea>
                    </div>
                </form>
            `,
            primaryButton: {
                text: 'Bilgileri Güncelle',
                onClick: () => {
                    this.savePatientInfoChanges();
                }
            },
            secondaryButton: {
                text: 'İptal',
                onClick: () => {}
            }
        });
    }

    // Exact replica of legacy savePatientInfoChanges function
    async savePatientInfoChanges() {
        // Read separate first and last name fields (editPatientInfo modal provides them)
        const firstName = (document.getElementById('editPatientFirstName') || {}).value?.trim() || '';
        const lastName = (document.getElementById('editPatientLastName') || {}).value?.trim() || '';
        const updatedInfo = {
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            tcNumber: document.getElementById('editPatientTC').value.trim(),
            tc: document.getElementById('editPatientTC').value.trim(), // Keep both for compatibility
            phone: document.getElementById('editPatientPhone').value.trim(),
            birthDate: document.getElementById('editPatientBirthDate').value,
            email: document.getElementById('editPatientEmail').value.trim(),
            address: document.getElementById('editPatientAddress').value.trim()
        };

        // Basic validation
        if (!updatedInfo.name) {
            this.showToast('Hasta adı zorunludur', 'error');
            return;
        }

        // Validate TC Kimlik No using proper algorithm
        if (!updatedInfo.tcNumber || !this.validateTCKN(updatedInfo.tcNumber)) {
            this.showToast('Geçerli bir TC Kimlik Numarası giriniz', 'error');
            return;
        }

        // Validate phone number if provided
        if (updatedInfo.phone && !this.validatePhone(updatedInfo.phone)) {
            this.showToast('Geçerli bir telefon numarası giriniz (10-11 hane)', 'error');
            return;
        }

        try {
            const patientId = window.patientDetailsManager?.currentPatient?.id;
            if (!patientId) {
                this.showToast('Hasta ID bulunamadı', 'error');
                return false;
            }

            // Prepare data for API (convert to backend format)
            const apiData = {
                firstName: updatedInfo.firstName,
                lastName: updatedInfo.lastName,
                tcNumber: updatedInfo.tcNumber,
                phone: updatedInfo.phone,
                email: updatedInfo.email,
                birthDate: updatedInfo.birthDate,
                address: {
                    fullAddress: updatedInfo.address
                }
            };

            // Try to save via API first
            let saveSuccess = false;
            try {
                const response = await this.apiClient.updatePatient(patientId, apiData);
                if (response && response.success) {
                    saveSuccess = true;
                    console.log('✅ Patient info updated via API');
                }
            } catch (apiError) {
                console.warn('❌ API info update failed, falling back to localStorage:', apiError);
                // Check for unique constraint violation on TC number
                if (apiError && apiError.message && apiError.message.includes('UNIQUE constraint failed: patients.tc_number')) {
                    this.showToast('Bu TC Kimlik Numarası ile zaten bir hasta kayıtlı. Lütfen farklı bir TC Kimlik Numarası giriniz.', 'error');
                    return false;
                }
            }

            // Update current patient data
            if (window.patientDetailsManager?.currentPatient) {
                Object.assign(window.patientDetailsManager.currentPatient, updatedInfo);
            }

            // Update global currentPatientData to ensure tab switches show updated data
            if (window.currentPatientData) {
                Object.assign(window.currentPatientData, updatedInfo);
            }

            // Update localStorage for fallback and immediate UI updates
            const patients = this.loadPatientsFromStorage();
            const patientIndex = patients.findIndex(p => p.id === patientId);
            if (patientIndex !== -1) {
                Object.assign(patients[patientIndex], updatedInfo);
                this.savePatientsToStorage(patients);
            }

            // Update PatientProfileWidget to refresh header information
            if (window.patientProfileWidget && window.patientProfileWidget.updatePatientData) {
                // Ensure we have valid data before updating
                const currentPatient = window.patientDetailsManager?.currentPatient || {};
                const validData = {
                    name: updatedInfo.name,
                    tc: updatedInfo.tcNumber,
                    tcNumber: updatedInfo.tcNumber,
                    phone: updatedInfo.phone || 'Bilinmiyor',
                    age: updatedInfo.birthDate ? this.calculateAge(updatedInfo.birthDate) : (currentPatient.age || 'Bilinmiyor'),
                    status: currentPatient.status || 'Aktif',
                    acquisitionType: currentPatient.acquisitionType || '',
                    conversionStep: currentPatient.conversionStep || '',
                    lastVisit: currentPatient.lastVisit || '15 Ocak 2024',
                    birthDate: updatedInfo.birthDate,
                    email: updatedInfo.email || '',
                    address: updatedInfo.address || ''
                };

                console.log('Updating PatientProfileWidget with edited data:', validData);
                window.patientProfileWidget.updatePatientData(validData);
            }

            // Update patient header card in modular page
            if (window.headerCard && window.patientDetailsManager?.currentPatient) {
                const updatedPatient = { ...window.patientDetailsManager.currentPatient, ...updatedInfo };
                document.getElementById('patient-header-card-container').innerHTML = window.headerCard.render(updatedPatient);
            }

            // Update General tab info
            this.updateGeneralTabInfo(updatedInfo);

            // Notify patient list to refresh
            if (window.patientListSidebar && typeof window.patientListSidebar.refresh === 'function') {
                window.patientListSidebar.refresh();
            }

            // Dispatch custom event to notify other components
            // Legacy event
            window.dispatchEvent(new CustomEvent('patientUpdated', { detail: { patientId, updatedInfo } }));
            // New standardized events for list and sync handling
            try { window.dispatchEvent(new CustomEvent('patient:updated', { detail: { id: patientId } })); } catch(e){}
            // If we saved via API, also emit remote-confirmed event
            if (typeof response !== 'undefined' && response && response.success) {
                try { window.dispatchEvent(new CustomEvent('patient:updated:remote', { detail: { id: patientId } })); } catch(e){}
            }

            // Show success only when API persistence succeeded. Otherwise surface warning.
            if (saveSuccess) this.showToast('Hasta bilgileri başarıyla güncellendi', 'success');
            else this.showToast('Değişiklik yerelde kaydedildi (sunucuya kaydetme başarısız)', 'warning');
            this.closeModal();

            return true;
        } catch (error) {
            console.error('Error saving patient info changes:', error);
            this.showToast('Hasta bilgileri kaydedilirken hata oluştu', 'error');
            return false;
        }
    }

    // Legacy utility functions
    calculateAge(birthDate) {
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

    validateTCKN(tcNumber) {
        if (!tcNumber || tcNumber.length !== 11) return false;

        // Check if all digits are the same
        if (/^(\d)\1{10}$/.test(tcNumber)) return false;

        // Calculate checksum
        const digits = tcNumber.split('').map(Number);
        const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
        const evenSum = digits[1] + digits[3] + digits[5] + digits[7];

        const digit10 = ((oddSum * 7) - evenSum) % 10;
        const digit11 = (oddSum + evenSum + digit10) % 10;

        return digits[9] === digit10 && digits[10] === digit11;
    }

    validatePhone(phoneNumber) {
        if (!phoneNumber) return true; // Optional field
        const cleaned = phoneNumber.replace(/\D/g, '');
        return cleaned.length === 10 || cleaned.length === 11;
    }

    loadEtiketSettings() {
        const settings = localStorage.getItem('etiketSettings');
        if (settings) {
            return JSON.parse(settings);
        }

        // Default settings
        return {
            acquisitionTypes: [
                { name: 'Tabela', value: 'tabela' },
                { name: 'Sosyal Medya', value: 'sosyal_medya' },
                { name: 'Tanıtım', value: 'tanitim' },
                { name: 'Referans', value: 'referans' },
                { name: 'Direkt Başvuru', value: 'walk_in' }
            ],
            conversionSteps: [
                { name: 'Yeni Hasta', value: 'yeni' },
                { name: 'Arama Yapıldı', value: 'arama_yapildi' },
                { name: 'Randevu Verildi', value: 'randevu_verildi' },
                { name: 'Geldi', value: 'geldi' },
                { name: 'Satış Yapıldı', value: 'satis_yapildi' }
            ]
        };
    }

    initPatientDetailsManager() {
        if (typeof PatientDetailsManager !== 'undefined') {
            window.patientDetailsManager = new PatientDetailsManager();
            console.log('✅ patientDetailsManager initialized');
        } else {
            console.error('❌ PatientDetailsManager class not found');
            // Fallback
            window.patientDetailsManager = {
                currentPatient: null,
                savePatientToStorage: function() {
                    if (this.currentPatient) {
                        const patients = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.PATIENTS || 'xear_patients') || '[]');
                        const patientIndex = patients.findIndex(p => p.id === this.currentPatient.id);
                        if (patientIndex >= 0) {
                            patients[patientIndex] = this.currentPatient;
                        } else {
                            patients.push(this.currentPatient);
                        }
                        localStorage.setItem(window.STORAGE_KEYS?.PATIENTS || 'xear_patients', JSON.stringify(patients));
                        try { localStorage.setItem(window.STORAGE_KEYS?.PATIENTS_DATA || 'xear_patients_data', JSON.stringify(patients)); } catch(e){}
                        try { localStorage.setItem(window.STORAGE_KEYS?.CRM_PATIENTS || 'xear_crm_patients', JSON.stringify(patients)); } catch(e){}
                        console.log('✅ Patient saved to localStorage (fallback)');
                    }
                }
            };
        }
    }

    loadPatientsFromStorage() {
        const STORAGE_KEYS_FALLBACK = window.STORAGE_KEYS || { PATIENTS: 'xear_patients' };
        return JSON.parse(localStorage.getItem(STORAGE_KEYS_FALLBACK.PATIENTS) || '[]');
    }

    savePatientsToStorage(patients) {
        try {
            const STORAGE_KEYS_FALLBACK = window.STORAGE_KEYS || { PATIENTS: 'xear_patients', PATIENTS_DATA: 'xear_patients_data', CRM_PATIENTS: window.STORAGE_KEYS?.CRM_PATIENTS || 'xear_crm_patients' };
            localStorage.setItem(STORAGE_KEYS_FALLBACK.PATIENTS, JSON.stringify(patients));
            try { localStorage.setItem(STORAGE_KEYS_FALLBACK.PATIENTS_DATA, JSON.stringify(patients)); } catch(e){}
            try { localStorage.setItem(STORAGE_KEYS_FALLBACK.CRM_PATIENTS, JSON.stringify(patients)); } catch(e){}
        } catch (e) {
            console.warn('savePatientsToStorage failed', e);
        }
    }

    // Legacy UI update functions
    updatePatientHeader(updatedData) {
        // Update patient profile widget
        if (window.patientProfileWidget) {
            window.patientProfileWidget.updatePatientData(updatedData);
        }

        // Update header elements directly if widget update doesn't work
        const nameElement = document.getElementById('patientFullName');
        const tcElement = document.getElementById('patientTC');
        const phoneElement = document.getElementById('patientPhone');
        const ageElement = document.getElementById('patientAge');
        const statusElement = document.getElementById('patientStatus');

        if (nameElement) nameElement.textContent = updatedData.name;
        if (tcElement) tcElement.textContent = `TC: ${updatedData.tcNumber}`;
        if (phoneElement) phoneElement.textContent = `Tel: ${updatedData.phone}`;
        if (ageElement && updatedData.age) ageElement.textContent = `Yaş: ${updatedData.age}`;
        if (statusElement) {
            const statusMap = {
                'active': 'Aktif',
                'inactive': 'Pasif',
                'trial': 'Deneme'
            };
            statusElement.textContent = statusMap[updatedData.status] || updatedData.status;
        }

        // Update avatar initials
        const avatarElement = document.getElementById('patientAvatar');
        if (avatarElement && updatedData.name) {
            const initials = updatedData.name.split(' ').map(n => n[0]).join('').toUpperCase();
            avatarElement.textContent = initials;
        }
    }

    updateGeneralTabInfo(updatedData) {
        // Update General tab personal information by reloading the personal info section
        if (window.patientTabContentComponent) {
            // Force re-render of general tab
            const generalTabSelectors = ['[data-tab="general"]', '[data-tab="genel"]', '#tab-general', '#tab-genel'];
            let clicked = false;
            for (const sel of generalTabSelectors) {
                const generalTab = document.querySelector(sel);
                if (generalTab) {
                    try {
                        generalTab.click();
                        clicked = true;
                        break;
                    } catch (e) {
                        // If click fails, try handleTabClick
                        try { window.handleTabClick('general'); clicked = true; break; } catch(e2){}
                    }
                }
            }

            // If no element clicked, try calling the global handler(s) directly
            if (!clicked) {
                if (typeof window.handleTabClick === 'function') {
                    try { window.handleTabClick('general'); } catch(e) { try { window.handleTabClick('genel'); } catch(e2){} }
                } else if (typeof window.switchTab === 'function') {
                    try { window.switchTab('general'); } catch(e) { try { window.switchTab('genel'); } catch(e2){} }
                }
            }
        }

        // Update medical tab info if elements exist
        const medicalElements = {
            'medicalTabAge': updatedData.age,
            'medicalTabStatus': updatedData.status,
            'medicalTabSegment': updatedData.segment,
            'medicalTabLastVisit': updatedData.lastVisit
        };

        Object.entries(medicalElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || '-';
            }
        });

        // Also update any other elements if they exist
        const elements = {
            'generalTabName': updatedData.name,
            'generalTabTC': updatedData.tcNumber,
            'generalTabPhone': updatedData.phone,
            'generalTabEmail': updatedData.email,
            'generalTabAddress': updatedData.address,
            'generalTabAge': updatedData.age,
            'generalTabStatus': updatedData.status,
            'generalTabSegment': updatedData.segment,
            'generalTabSGKStatus': updatedData.sgkStatus,
            'generalTabLastVisit': updatedData.lastVisit
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || '-';
            }
        });

        // Force refresh the General tab if needed (legacy compatibility)
        if (typeof loadTabContent === 'function') {
            const activeTab = document.querySelector('.tab-button.active');
            if (activeTab && (activeTab.textContent.includes('Genel') || activeTab.textContent.includes('general'))) {
                setTimeout(() => loadTabContent('general'), 100);
            }
        }
    }

    // Modal management functions (exact replica of legacy Utils.showModal)
    showModal(options) {
        const { title, content, primaryButton, secondaryButton } = options;

        const modalId = 'modal-' + Date.now();
        const primaryButtonId = 'primary-btn-' + Date.now();
        const secondaryButtonId = 'secondary-btn-' + Date.now();

        const modalHtml = `
            <div id="${modalId}" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">${title}</h3>
                    </div>
                    <div class="p-6">
                        ${content}
                    </div>
                    <div class="p-6 border-t border-gray-200 flex justify-end space-x-3">
                        ${secondaryButton ? `<button id="${secondaryButtonId}" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">${secondaryButton.text}</button>` : ''}
                        ${primaryButton ? `<button id="${primaryButtonId}" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">${primaryButton.text}</button>` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add event listeners after the modal is added to DOM
        if (primaryButton && primaryButton.onClick) {
            document.getElementById(primaryButtonId).addEventListener('click', () => {
                primaryButton.onClick();
            });
        }

        if (secondaryButton && secondaryButton.onClick) {
            document.getElementById(secondaryButtonId).addEventListener('click', () => {
                secondaryButton.onClick();
                this.closeModal();
            });
        } else if (secondaryButton) {
            document.getElementById(secondaryButtonId).addEventListener('click', () => {
                this.closeModal();
            });
        }
    }

    closeModal() {
        const modals = document.querySelectorAll('[id^="modal-"]');
        modals.forEach(modal => modal.remove());
    }

    // Toast notification function (exact replica of legacy Utils.showToast)
    showToast(message, type = 'info') {
        const toastHtml = `
            <div id="toast" class="fixed top-4 right-4 z-50 px-4 py-2 rounded-md text-white ${
                type === 'success' ? 'bg-green-500' :
                type === 'error' ? 'bg-red-500' :
                type === 'warning' ? 'bg-yellow-500' :
                'bg-blue-500'
            } shadow-lg transform transition-transform duration-300 translate-x-full">
                ${message}
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', toastHtml);

        const toast = document.getElementById('toast');
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}

// Global functions for modal management (exact replica of legacy)
window.editPatient = function() {
    if (window.patientManagement) {
        window.patientManagement.editPatient();
    }
};

window.updatePatientLabel = function() {
    if (window.patientManagement) {
        window.patientManagement.updatePatientLabel();
    }
};

window.editPatientInfo = function() {
    if (window.patientManagement) {
        window.patientManagement.editPatientInfo();
    }
};

// Legacy modal management functions
window.showModal = function(options) {
    if (window.patientManagement) {
        window.patientManagement.showModal(options);
    }
};

window.closeModal = function() {
    if (window.patientManagement) {
        window.patientManagement.closeModal();
    }
};

window.showToast = function(message, type = 'info') {
    if (window.patientManagement) {
        window.patientManagement.showToast(message, type);
    }
};

// Global compatibility shim to handle tab clicks across legacy (Turkish ids) and modular (English ids) implementations.
window.handleTabClick = async function(tabId) {
    try {
        // Show loading indicator
        const tabContent = document.getElementById('tab-content');
        if (tabContent) {
            tabContent.innerHTML = `
                <div class="flex items-center justify-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span class="ml-2 text-gray-600">Sekme yükleniyor...</span>
                </div>
            `;
        }

        // Prefer modular switchTab if present
        if (typeof window.switchTab === 'function') {
            try {
                await window.switchTab(tabId);
                return;
            } catch (e) {
                console.warn('switchTab failed, falling back to legacy managers', e);
            }
        }

        // Map English <-> Turkish tab ids for legacy managers
        const englishToTurkish = {
            'general': 'genel',
            'documents': 'belgeler',
            'sales': 'satis',
            'timeline': 'zaman',
            'devices': 'cihaz',
            'sgk': 'sgk'
        };

        const mapped = englishToTurkish[tabId] || tabId;

        // If legacy patientManager exists (older pages), call its method
        if (window.patientManager && typeof window.patientManager.switchTab === 'function') {
            try {
                window.patientManager.switchTab(mapped);
                return;
            } catch (e) {
                console.warn('patientManager.switchTab failed', e);
            }
        }

        // If newer patientDetailsManager exists, try to call its switchTab method
        if (window.patientDetailsManager && typeof window.patientDetailsManager.switchTab === 'function') {
            try {
                window.patientDetailsManager.switchTab(mapped);
                return;
            } catch (e) {
                console.warn('patientDetailsManager.switchTab failed', e);
            }
        }

        // As a last resort, update patientTabContentComponent directly (modular renderer)
        if (window.patientTabContentComponent && typeof window.patientTabContentComponent.setActiveTab === 'function') {
            try {
                window.patientTabContentComponent.setActiveTab(tabId);
                if (window.currentPatientData) {
                    const content = await window.patientTabContentComponent.render(window.currentPatientData);
                    if (tabContent) {
                        tabContent.innerHTML = content;
                    }
                }
                // Also update tabs UI if a tabs component exists
                if (window.patientTabsComponent) {
                    window.patientTabsComponent.activeTab = tabId;
                    document.getElementById('tabs-container').innerHTML = window.patientTabsComponent.render();
                }
                return;
            } catch (e) {
                console.error('Failed to render tab content directly in handleTabClick', e);
            }
        }

        console.warn('No tab handler found for', tabId);
    } catch (err) {
        console.error('Error in handleTabClick shim:', err);
        // Hide loading on error
        const tabContent = document.getElementById('tab-content');
        if (tabContent) {
            tabContent.innerHTML = '<p class="text-center py-8 text-red-600">Sekme yüklenirken hata oluştu.</p>';
        }
    }
};

// Improve updateGeneralTabInfo to be robust across id conventions
window.updateGeneralTabInfo = function(updatedData) {
    // Update General tab personal information by reloading the personal info section
    if (window.patientTabContentComponent) {
        // Force re-render of general tab
        const generalTabSelectors = ['[data-tab="general"]', '[data-tab="genel"]', '#tab-general', '#tab-genel'];
        let clicked = false;
        for (const sel of generalTabSelectors) {
            const generalTab = document.querySelector(sel);
            if (generalTab) {
                try {
                    generalTab.click();
                    clicked = true;
                    break;
                } catch (e) {
                    // If click fails, try handleTabClick
                    try { window.handleTabClick('general'); clicked = true; break; } catch(e2){}
                }
            }
        }

        // If no element clicked, try calling the global handler(s) directly
        if (!clicked) {
            if (typeof window.handleTabClick === 'function') {
                try { window.handleTabClick('general'); } catch(e) { try { window.handleTabClick('genel'); } catch(e2){} }
            } else if (typeof window.switchTab === 'function') {
                try { window.switchTab('general'); } catch(e) { try { window.switchTab('genel'); } catch(e2){} }
            }
        }
    }

    // Update medical tab info if elements exist
    const medicalElements = {
        'medicalTabAge': updatedData.age,
        'medicalTabStatus': updatedData.status,
        'medicalTabSegment': updatedData.segment,
        'medicalTabLastVisit': updatedData.lastVisit
    };

    Object.entries(medicalElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || '-';
        }
    });

    // Also update any other elements if they exist
    const elements = {
        'generalTabName': updatedData.name,
        'generalTabTC': updatedData.tcNumber,
        'generalTabPhone': updatedData.phone,
        'generalTabEmail': updatedData.email,
        'generalTabAddress': updatedData.address,
        'generalTabAge': updatedData.age,
        'generalTabStatus': updatedData.status,
        'generalTabSegment': updatedData.segment,
        'generalTabSGKStatus': updatedData.sgkStatus,
        'generalTabLastVisit': updatedData.lastVisit
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || '-';
        }
    });

    // Force refresh the General tab if needed (legacy compatibility)
    if (typeof loadTabContent === 'function') {
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab && (activeTab.textContent.includes('Genel') || activeTab.textContent.includes('general'))) {
            setTimeout(() => loadTabContent('general'), 100);
        }
    }
};