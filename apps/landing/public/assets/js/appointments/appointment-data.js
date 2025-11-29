// AppointmentData class for managing appointment-related data operations
class AppointmentData {
    constructor() {
        this.appointments = [];
        this.filteredAppointments = [];
        this.patients = [];
        this.isCompactView = false;
        this.isLoading = false;
        
        // Wait for Orval API to load
        this.waitForOrvalApi();
        // Don't call init() here, it will be called from appointments-main.js
    }

    waitForOrvalApi() {
        if (window.orvalApiLoaded) {
            console.log('✅ Orval API already loaded for AppointmentData');
            return;
        }
        
        window.addEventListener('orvalApiLoaded', () => {
            console.log('✅ Orval API loaded for AppointmentData');
        });
    }

    // Utility function for consistent date formatting (YYYY-MM-DD format)
    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Check if two dates are the same day
    isSameDate(date1, date2) {
        return new Date(date1).toDateString() === new Date(date2).toDateString();
    }

    async init() {
        console.log('🚀 AppointmentData initializing...');
        
        try {
            // Load patients data using Orval client
            if (window.patientsGetPatients) {
                const response = await window.patientsGetPatients();
                if (response.data && response.data.success && Array.isArray(response.data.data)) {
                    this.patients = response.data.data.map(patient => ({
                        id: patient.id,
                        name: `${patient.firstName} ${patient.lastName}`,
                        firstName: patient.firstName,
                        lastName: patient.lastName,
                        tcNumber: patient.tcNumber || patient.identityNumber,
                        phone: patient.phone,
                        identifier: patient.tcNumber || patient.identityNumber || patient.phone
                    }));
                    console.log('✅ Patients loaded via Orval:', this.patients.length);
                } else {
                    console.warn('⚠️ Unexpected response format from Orval patientsGetPatients');
                    this.patients = [];
                }
            } else {
                console.warn('⚠️ patientsGetPatients not available on window');
                this.patients = [];
            }
        } catch (error) {
            console.error('❌ Failed to load patients via Orval:', error);
            
            // Fallback to APIConfig if available
            if (window.APIConfig && typeof window.APIConfig.makeRequest === 'function') {
                try {
                    const result = await window.APIConfig.makeRequest(window.APIConfig.endpoints.patients, 'GET');
                    
                    // Fix: Extract patients from the correct nested structure
                    let patients = null;
                    if (result && result.success && result.data && result.data.data && Array.isArray(result.data.data)) {
                        // New API format: { success: true, data: { data: [...], meta: {...} } }
                        patients = result.data.data;
                    } else if (result && result.success && Array.isArray(result.data)) {
                        // Legacy format: { success: true, data: [...] }
                        patients = result.data;
                    }
                    
                    if (Array.isArray(patients)) {
                        this.patients = patients.map(patient => ({
                            id: patient.id,
                            name: `${patient.firstName} ${patient.lastName}`,
                            firstName: patient.firstName,
                            lastName: patient.lastName,
                            tcNumber: patient.tcNumber || patient.identityNumber,
                            phone: patient.phone,
                            identifier: patient.tcNumber || patient.identityNumber || patient.phone
                        }));
                        console.log('✅ Patients loaded via APIConfig fallback:', this.patients.length);
                    }
                } catch (apiError) {
                    console.error('❌ APIConfig fallback also failed:', apiError);
                    this.patients = [];
                }
            } else {
                console.warn('⚠️ Neither Orval nor APIConfig available for patient data');
                this.patients = [];
            }
        }
        
        this.appointments = await this.loadAppointments();
        
        // Process appointments to add patient information
        if (Array.isArray(this.appointments)) {
            this.appointments = this.appointments.map(appointment => {
                // Ensure appointment has patient information
                if (!appointment.patient && (appointment.patientId || appointment.patient_id)) {
                    const patientId = appointment.patientId || appointment.patient_id;
                    const patientInfo = this.getPatientInfoById(patientId);
                    appointment.patient = patientInfo.name;
                }
                return appointment;
            });
        }
        
        this.filteredAppointments = [...this.appointments];
        
        // Also load patients data early to ensure it's available for the modal
        await this.loadPatientsData();
    }

    async loadPatientsData() {
        // This is a simplified version of populatePatientDropdown that just loads the data
        let allPatients = [];
        
        try {
            // Use Orval client for getting patients
            if (window.patientsGetPatients) {
                const response = await window.patientsGetPatients();
                
                // Handle Orval response format: { data: { data: [...], pagination: {...} }, status: 200, headers: Headers }
                let patientsArray = null;
                if (response && response.data && Array.isArray(response.data.data)) {
                    // Orval format: response.data.data contains the patients array
                    patientsArray = response.data.data;
                } else if (response && response.data && response.data.success && Array.isArray(response.data.data)) {
                    // Legacy API format: { data: { success: true, data: [...] } }
                    patientsArray = response.data.data;
                } else if (response && Array.isArray(response.data)) {
                    // Direct array format
                    patientsArray = response.data;
                }
                
                if (Array.isArray(patientsArray)) {
                    allPatients = patientsArray.map(patient => ({
                        id: patient.id,
                        name: `${patient.firstName} ${patient.lastName}`,
                        firstName: patient.firstName,
                        lastName: patient.lastName,
                        tcNumber: patient.tcNumber || patient.identityNumber,
                        phone: patient.phone,
                        identifier: patient.tcNumber || patient.identityNumber || patient.phone
                    }));
                    console.log(`✅ Loaded ${allPatients.length} patients via Orval`);
                } else {
                    console.warn('⚠️ Unexpected response format from Orval patientsGetPatients', response);
                    throw new Error('Unexpected response format');
                }
            } else {
                console.warn('⚠️ patientsGetPatients not available on window');
                throw new Error('patientsGetPatients not available');
            }
        } catch (orvalError) {
            console.error('❌ Orval patientsGetPatients failed:', orvalError);
            
            // Fallback to APIConfig if available
            try {
                if (window.APIConfig && typeof window.APIConfig.makeRequest === 'function') {
                    const result = await window.APIConfig.makeRequest(window.APIConfig.endpoints.patients, 'GET');
                    
                    // Fix: Extract patients from the correct nested structure
                    let patients = null;
                    if (result && result.success && result.data && result.data.data && Array.isArray(result.data.data)) {
                        // New API format: { success: true, data: { data: [...], meta: {...} } }
                        patients = result.data.data;
                    } else if (result && result.success && Array.isArray(result.data)) {
                        // Legacy format: { success: true, data: [...] }
                        patients = result.data;
                    }
                    
                    if (Array.isArray(patients)) {
                        allPatients = patients.map(patient => ({
                            id: patient.id,
                            name: `${patient.firstName} ${patient.lastName}`,
                            firstName: patient.firstName,
                            lastName: patient.lastName,
                            tcNumber: patient.tcNumber || patient.identityNumber,
                            phone: patient.phone,
                            identifier: patient.tcNumber || patient.identityNumber || patient.phone
                        }));
                        console.log(`✅ Loaded ${allPatients.length} patients via APIConfig fallback`);
                    }
                } else {
                    console.warn('⚠️ APIConfig not available for patient data');
                }
            } catch (apiError) {
                console.error('❌ APIConfig fallback also failed:', apiError);
            }
        }
        
        // Update the instance patients array
        if (allPatients.length > 0) {
            this.patients = allPatients;
        } else {
            // Fallback to sample data
            this.patients = [
                { id: 'P00001', name: 'Ahmet Yılmaz', firstName: 'Ahmet', lastName: 'Yılmaz', tcNumber: '12345678901', phone: '0532 123 4567' },
                { id: 'P00002', name: 'Ayşe Demir', firstName: 'Ayşe', lastName: 'Demir', tcNumber: '12345678902', phone: '0533 234 5678' },
                { id: 'P00003', name: 'Mehmet Kaya', firstName: 'Mehmet', lastName: 'Kaya', tcNumber: '12345678903', phone: '0534 345 6789' },
                { id: 'P00004', name: 'Fatma Şahin', firstName: 'Fatma', lastName: 'Şahin', tcNumber: '12345678904', phone: '0535 456 7890' },
                { id: 'P00005', name: 'Ali Özkan', firstName: 'Ali', lastName: 'Özkan', tcNumber: '12345678905', phone: '0536 567 8901' }
            ];
            console.log(`📋 Using ${this.patients.length} sample patients (API will override)`);
        }
    }

    async loadAppointments() {
        try {
            // Try to load from Orval API first
            if (window.appointmentsListAppointments) {
                const response = await window.appointmentsListAppointments();
                if (response.data && response.data.success && Array.isArray(response.data.data)) {
                    console.log('✅ Appointments loaded via Orval:', response.data.data.length);
                    return response.data.data;
                }
            }
        } catch (error) {
            console.warn('⚠️ Orval appointmentsListAppointments failed:', error);
        }

        // Try APIConfig fallback
        try {
            if (window.APIConfig && window.APIConfig.endpoints && window.APIConfig.endpoints.appointments) {
                console.log('🔄 Trying APIConfig fallback for appointments...');
                const result = await window.APIConfig.makeRequest(window.APIConfig.endpoints.appointments, 'GET');
                
                let appointments = null;
                if (result && result.success && result.data && result.data.data && Array.isArray(result.data.data)) {
                    // New API format: { success: true, data: { data: [...], meta: {...} } }
                    appointments = result.data.data;
                } else if (result && result.success && Array.isArray(result.data)) {
                    // Legacy format: { success: true, data: [...] }
                    appointments = result.data;
                }
                
                if (Array.isArray(appointments)) {
                    console.log(`✅ Loaded ${appointments.length} appointments via APIConfig fallback`);
                    return appointments;
                }
            } else {
                console.warn('⚠️ APIConfig not available for appointments');
            }
        } catch (apiError) {
            console.error('❌ APIConfig fallback also failed:', apiError);
        }

        // Fallback to sample data
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const dayAfter = new Date(today);
        dayAfter.setDate(today.getDate() + 2);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        const sampleAppointments = [
            { id: 1, patientId: 'P00001', patient_id: 'P00001', date: formatDate(today), time: '09:00', type: 'Kontrol', branch: 'Ana Şube', status: 'SCHEDULED' },
            { id: 2, patientId: 'P00002', patient_id: 'P00002', date: formatDate(today), time: '10:30', type: 'Muayene', branch: 'Ana Şube', status: 'CONFIRMED' },
            { id: 3, patientId: 'P00005', patient_id: 'P00005', date: formatDate(tomorrow), time: '14:00', type: 'Tedavi', branch: 'Şube 2', status: 'COMPLETED' },
            { id: 4, patientId: 'P00004', patient_id: 'P00004', date: formatDate(tomorrow), time: '11:15', type: 'Kontrol', branch: 'Ana Şube', status: 'SCHEDULED' },
            { id: 5, patientId: 'P00003', patient_id: 'P00003', date: formatDate(dayAfter), time: '16:30', type: 'Muayene', branch: 'Şube 2', status: 'SCHEDULED' },
            { id: 6, patientId: 'P00001', patient_id: 'P00001', date: formatDate(nextWeek), time: '14:00', type: 'Muayene', branch: 'Ana Şube', status: 'SCHEDULED' },
            { id: 7, patientId: 'P00001', patient_id: 'P00001', date: formatDate(nextWeek), time: '11:00', type: 'Tedavi', branch: 'Ana Şube', status: 'SCHEDULED' },
            { id: 8, patientId: 'P00002', patient_id: 'P00002', date: formatDate(dayAfter), time: '15:30', type: 'Kontrol', branch: 'Şube 2', status: 'SCHEDULED' },
            { id: 9, patientId: 'P00005', patient_id: 'P00005', date: formatDate(tomorrow), time: '10:00', type: 'Muayene', branch: 'Ana Şube', status: 'CONFIRMED' }
        ];
        
        console.log(`📅 Using ${sampleAppointments.length} sample appointments (API will override)`);
        return sampleAppointments;
    }

    applyFilters() {
        try {
            const branchFilterEl = document.getElementById('branch-filter');
            const clinicianFilterEl = document.getElementById('clinician-filter');
            const statusFilterEl = document.getElementById('status-filter');
            const typeFilterEl = document.getElementById('type-filter');
            
            if (!branchFilterEl || !clinicianFilterEl || !statusFilterEl || !typeFilterEl) {
                console.error('Filter elements not found');
                return;
            }
            
            const branchFilter = branchFilterEl.value;
            const clinicianFilter = clinicianFilterEl.value;
            const statusFilter = statusFilterEl.value;
            const typeFilter = typeFilterEl.value;
            
            this.filteredAppointments = this.appointments.filter(appointment => {
                return (branchFilter === '' || appointment.branch === branchFilter) &&
                       (clinicianFilter === '' || appointment.clinician === clinicianFilter) &&
                       (statusFilter === '' || appointment.status === statusFilter) &&
                       (typeFilter === '' || appointment.type === typeFilter);
            });
            
            this.updateResultsCount();
            this.refreshCurrentView();
        } catch (error) {
            console.error('Error applying filters:', error);
        }
    }

    updateResultsCount() {
        const countElement = document.getElementById('results-count');
        if (countElement) {
            countElement.textContent = `${this.filteredAppointments.length} randevu`;
        }
    }

    refreshCurrentView() {
        // This will be called by the view components to refresh their display
        const event = new CustomEvent('appointmentsFiltered', { 
            detail: { appointments: this.filteredAppointments } 
        });
        document.dispatchEvent(event);
    }

    resetFilters() {
        try {
            const filterElements = [
                'branch-filter',
                'clinician-filter', 
                'status-filter',
                'type-filter'
            ];
            
            filterElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = '';
                }
            });
            
            this.applyFilters();
        } catch (error) {
            console.error('Error resetting filters:', error);
        }
    }

    saveFilterPreset() {
        try {
            const presetName = prompt('Filtre ön ayarı adı:');
            if (!presetName) return;
            
            const filters = {
                branch: document.getElementById('branch-filter')?.value || '',
                clinician: document.getElementById('clinician-filter')?.value || '',
                status: document.getElementById('status-filter')?.value || '',
                type: document.getElementById('type-filter')?.value || ''
            };
            
            const presets = JSON.parse(localStorage.getItem('appointmentFilterPresets') || '{}');
            presets[presetName] = filters;
            localStorage.setItem('appointmentFilterPresets', JSON.stringify(presets));
            
            alert('Filtre ön ayarı kaydedildi!');
        } catch (error) {
            console.error('Error saving filter preset:', error);
        }
    }

    loadSavedFilters() {
        try {
            const presets = JSON.parse(localStorage.getItem('appointmentFilterPresets') || '{}');
            const presetNames = Object.keys(presets);
            
            if (presetNames.length === 0) {
                console.log('ℹ️ Henüz kaydedilmiş filtre ön ayarı bulunmuyor.');
                return;
            }
            
            const selectedPreset = prompt(`Hangi ön ayarı yüklemek istiyorsunuz?\n${presetNames.join('\n')}`);
            if (!selectedPreset || !presets[selectedPreset]) return;
            
            const filters = presets[selectedPreset];
            
            Object.entries(filters).forEach(([key, value]) => {
                const element = document.getElementById(`${key}-filter`);
                if (element) {
                    element.value = value;
                }
            });
            
            this.applyFilters();
        } catch (error) {
            console.error('Error loading saved filters:', error);
        }
    }

    createAppointmentAtTime(time, date = null) {
        try {
            const appointmentDate = date || new Date().toISOString().split('T')[0];
            
            // Create new appointment object
            const newAppointment = {
                id: Date.now(), // Temporary ID
                date: appointmentDate,
                time: time,
                patientId: '',
                type: '',
                branch: 'Ana Şube',
                status: 'SCHEDULED',
                notes: ''
            };
            
            // Show appointment modal for editing
            if (window.AppointmentModal) {
                window.AppointmentModal.openModal('', time, '', date);
            } else {
                console.error('AppointmentModal not available');
            }
        } catch (error) {
            console.error('Error creating appointment:', error);
        }
    }

    editAppointment(id) {
        try {
            const appointment = this.appointments.find(apt => apt.id == id);
            if (!appointment) {
                console.error('Appointment not found:', id);
                return;
            }
            
            if (window.AppointmentModal) {
                window.AppointmentModal.show(appointment, false);
            } else {
                console.error('AppointmentModal not available');
            }
        } catch (error) {
            console.error('Error editing appointment:', error);
        }
    }

    deleteAppointment(id) {
        try {
            if (confirm('Bu randevuyu silmek istediğinizden emin misiniz?')) {
                this.appointments = this.appointments.filter(apt => apt.id != id);
                this.applyFilters();
                console.log('Appointment deleted:', id);
            }
        } catch (error) {
            console.error('Error deleting appointment:', error);
        }
    }

    getPatientInfoById(patientId) {
        const patient = this.patients.find(p => p.id === patientId);
        if (patient) {
            return {
                name: patient.name,
                firstName: patient.firstName,
                lastName: patient.lastName,
                tcNumber: patient.tcNumber,
                phone: patient.phone,
                identifier: patient.identifier
            };
        }
        
        // Fallback for sample data
        const samplePatients = {
            'P00001': { name: 'Ahmet Yılmaz', firstName: 'Ahmet', lastName: 'Yılmaz', tcNumber: '12345678901', phone: '0532 123 4567' },
            'P00002': { name: 'Ayşe Demir', firstName: 'Ayşe', lastName: 'Demir', tcNumber: '12345678902', phone: '0533 234 5678' },
            'P00003': { name: 'Mehmet Kaya', firstName: 'Mehmet', lastName: 'Kaya', tcNumber: '12345678903', phone: '0534 345 6789' },
            'P00004': { name: 'Fatma Şahin', firstName: 'Fatma', lastName: 'Şahin', tcNumber: '12345678904', phone: '0535 456 7890' },
            'P00005': { name: 'Ali Özkan', firstName: 'Ali', lastName: 'Özkan', tcNumber: '12345678905', phone: '0536 567 8901' }
        };
        
        return samplePatients[patientId] || { name: 'Bilinmeyen Hasta', firstName: '', lastName: '', tcNumber: '', phone: '' };
    }

    getPatientNameById(patientId) {
        const patientInfo = this.getPatientInfoById(patientId);
        return patientInfo.name;
    }

    async saveAppointmentToStorage(appointment) {
        try {
            // First try to save via API
            const savedAppointment = await this.saveToAPI(appointment);
            if (savedAppointment) {
                // Update local data
                const existingIndex = this.appointments.findIndex(apt => apt.id === appointment.id);
                if (existingIndex >= 0) {
                    this.appointments[existingIndex] = savedAppointment;
                } else {
                    this.appointments.push(savedAppointment);
                }
                
                this.applyFilters();
                return savedAppointment;
            }
        } catch (error) {
            console.error('Failed to save appointment via API:', error);
        }
        
        // Fallback to local storage
        try {
            let appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
            
            const existingIndex = appointments.findIndex(apt => apt.id === appointment.id);
            if (existingIndex >= 0) {
                appointments[existingIndex] = appointment;
            } else {
                appointment.id = Date.now();
                appointments.push(appointment);
            }
            
            localStorage.setItem('appointments', JSON.stringify(appointments));
            
            // Update local data
            const localIndex = this.appointments.findIndex(apt => apt.id === appointment.id);
            if (localIndex >= 0) {
                this.appointments[localIndex] = appointment;
            } else {
                this.appointments.push(appointment);
            }
            
            this.applyFilters();
            return appointment;
        } catch (error) {
            console.error('Failed to save appointment to localStorage:', error);
            throw error;
        }
    }

    async saveToAPI(appointment) {
        try {
            if (appointment.id && appointment.id !== 'new') {
                // Update existing appointment
                if (window.appointmentsUpdateAppointment) {
                    const response = await window.appointmentsUpdateAppointment(appointment.id, appointment);
                    if (response.data && response.data.success) {
                        console.log('✅ Appointment updated via API');
                        return response.data.data;
                    }
                }
            } else {
                // Create new appointment
                if (window.appointmentsCreateAppointment) {
                    const response = await window.appointmentsCreateAppointment(appointment);
                    if (response.data && response.data.success) {
                        console.log('✅ Appointment created via API');
                        return response.data.data;
                    }
                }
            }
        } catch (error) {
            console.error('API save failed:', error);
            throw error;
        }
        
        return null;
    }

    showQuickAddForm(time, day) {
        this.createAppointmentAtTime(time, day);
    }

    async populatePatientDropdown() {
        const patientSelect = document.querySelector('select[name="patient"]');
        if (!patientSelect) return;
        
        let allPatients = [];
        
        try {
            // Use Orval client for getting patients
            if (window.patientsGetPatients) {
                const response = await window.patientsGetPatients();
                
                // Handle Orval response format: { data: { data: [...], pagination: {...} }, status: 200, headers: Headers }
                let patientsArray = null;
                if (response && response.data && Array.isArray(response.data.data)) {
                    // Orval format: response.data.data contains the patients array
                    patientsArray = response.data.data;
                } else if (response && response.data && response.data.success && Array.isArray(response.data.data)) {
                    // Legacy API format: { data: { success: true, data: [...] } }
                    patientsArray = response.data.data;
                } else if (response && Array.isArray(response.data)) {
                    // Direct array format
                    patientsArray = response.data;
                }
                
                if (Array.isArray(patientsArray)) {
                    allPatients = patientsArray.map(patient => ({
                        id: patient.id,
                        name: `${patient.firstName} ${patient.lastName}`,
                        firstName: patient.firstName,
                        lastName: patient.lastName,
                        tcNumber: patient.tcNumber || patient.identityNumber,
                        phone: patient.phone,
                        identifier: patient.tcNumber || patient.identityNumber || patient.phone
                    }));
                    console.log(`✅ Loaded ${allPatients.length} patients via Orval`);
                } else {
                    console.warn('⚠️ Unexpected response format from Orval patientsGetPatients', response);
                    throw new Error('Unexpected response format');
                }
            } else {
                console.warn('⚠️ patientsGetPatients not available on window');
                throw new Error('patientsGetPatients not available');
            }
        } catch (orvalError) {
            console.error('❌ Orval patientsGetPatients failed:', orvalError);
            
            // Fallback to APIConfig if available
            try {
                if (window.APIConfig && typeof window.APIConfig.makeRequest === 'function') {
                    const result = await window.APIConfig.makeRequest(window.APIConfig.endpoints.patients, 'GET');
                    if (result && result.success && Array.isArray(result.data)) {
                        allPatients = result.data.map(patient => ({
                            id: patient.id,
                            name: `${patient.firstName} ${patient.lastName}`,
                            firstName: patient.firstName,
                            lastName: patient.lastName,
                            tcNumber: patient.tcNumber || patient.identityNumber,
                            phone: patient.phone,
                            identifier: patient.tcNumber || patient.identityNumber || patient.phone
                        }));
                        console.log(`✅ Loaded ${allPatients.length} patients via APIConfig fallback`);
                    }
                } else {
                    console.warn('⚠️ APIConfig not available for patient data');
                }
            } catch (apiError) {
                console.error('❌ APIConfig fallback also failed:', apiError);
            }
        }
        
        // Use fallback data if no patients loaded
        if (allPatients.length === 0) {
            allPatients = [
                { id: 'P00001', name: 'Ahmet Yılmaz', firstName: 'Ahmet', lastName: 'Yılmaz', tcNumber: '12345678901', phone: '0532 123 4567' },
                { id: 'P00002', name: 'Ayşe Demir', firstName: 'Ayşe', lastName: 'Demir', tcNumber: '12345678902', phone: '0533 234 5678' },
                { id: 'P00003', name: 'Mehmet Kaya', firstName: 'Mehmet', lastName: 'Kaya', tcNumber: '12345678903', phone: '0534 345 6789' },
                { id: 'P00004', name: 'Fatma Şahin', firstName: 'Fatma', lastName: 'Şahin', tcNumber: '12345678904', phone: '0535 456 7890' },
                { id: 'P00005', name: 'Ali Özkan', firstName: 'Ali', lastName: 'Özkan', tcNumber: '12345678905', phone: '0536 567 8901' }
            ];
            console.log(`📋 Using ${allPatients.length} sample patients for dropdown`);
        }
        
        // Clear existing options except the first one
        while (patientSelect.children.length > 1) {
            patientSelect.removeChild(patientSelect.lastChild);
        }
        
        // Add patient options
        allPatients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = `${patient.name} (${patient.tcNumber || patient.phone})`;
            patientSelect.appendChild(option);
        });
        
        console.log(`✅ Patient dropdown populated with ${allPatients.length} patients`);
    }
}

// Make AppointmentData available globally
window.AppointmentData = AppointmentData;