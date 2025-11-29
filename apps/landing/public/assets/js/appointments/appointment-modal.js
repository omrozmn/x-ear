// Appointment Modal Module
// Use Orval API from window object instead of ES6 imports

class AppointmentModal {
    constructor() {
        this.modal = document.getElementById('appointmentModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.form = document.getElementById('appointmentForm');
        this.currentModalAppointment = null;
        this.patientSearchTimeout = null;
        this.init();
    }

    // Helper method to format date for HTML date input (yyyy-MM-dd format)
    formatDateForInput(dateStr) {
        if (!dateStr) return '';
        
        // If already in yyyy-MM-dd format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }
        
        // Handle dd.MM.yyyy format (Turkish format)
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('.');
            return `${year}-${month}-${day}`;
        }
        
        // Handle other formats by parsing as Date
        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        } catch (error) {
            console.warn('⚠️ Could not parse date:', dateStr);
        }
        
        return dateStr; // Return original if can't parse
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close modal events
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelModal');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        // Click outside to close
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }

        // Form submission
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission(e);
            });
        }

        // Quick add button
        const quickAddBtn = document.getElementById('quick-add-btn');
        if (quickAddBtn) {
            quickAddBtn.addEventListener('click', () => {
                this.openModal();
            });
        }

        // Debug: Add time input change listener
        const timeInput = document.getElementById('modalTime');
        if (timeInput) {
            timeInput.addEventListener('change', (e) => {
                console.log('🕐 Time input changed:', e.target.value);
            });
            timeInput.addEventListener('input', (e) => {
                console.log('🕐 Time input event:', e.target.value);
            });
        }

        // Patient search functionality
        this.setupPatientSearch();
    }

    openModal(patient = '', time = '', type = '', date = '') {
        if (!this.modal) return;

        // Pre-fill form if data provided
        if (patient) {
            const patientSearchInput = document.getElementById('modalPatientSearch');
            const patientHiddenInput = document.getElementById('modalPatient');
            
            if (patientSearchInput && patientHiddenInput) {
                // Find patient by name to get ID
                if (window.appointmentData && window.appointmentData.patients) {
                    const foundPatient = window.appointmentData.patients.find(p => 
                        p.name && p.name.toLowerCase().includes(patient.toLowerCase())
                    );
                    if (foundPatient) {
                        patientSearchInput.value = foundPatient.name;
                        patientHiddenInput.value = foundPatient.id;
                        console.log('✅ Hasta pre-filled:', foundPatient.id, foundPatient.name);
                    } else {
                        patientSearchInput.value = patient;
                        console.log('⚠️ Hasta bulunamadı pre-fill için:', patient);
                    }
                }
            }
        }

        if (time) {
            const timeInput = document.getElementById('modalTime');
            if (timeInput) {
                timeInput.value = time;
            }
        }

        if (date) {
            const dateInput = document.getElementById('modalDate');
            if (dateInput) {
                dateInput.value = this.formatDateForInput(date);
            }
        }

        if (type) {
            const typeSelect = document.getElementById('modalType');
            if (typeSelect) {
                const options = Array.from(typeSelect.options);
                const matchingOption = options.find(option => 
                    option.textContent.toLowerCase().includes(type.toLowerCase())
                );
                if (matchingOption) {
                    typeSelect.value = matchingOption.value;
                }
            }
        }

        // Set default date to today only if no date provided and field is empty
        const dateInput = document.getElementById('modalDate');
        if (dateInput && !date && !dateInput.value) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            dateInput.value = `${year}-${month}-${day}`;
        }

        // Ensure patient data is loaded before opening modal
        this.ensurePatientDataLoaded().then(() => {
            this.modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            // Initialize modern pickers
            this.initializePickers();
            
            // Focus first input
            setTimeout(() => {
                const firstInput = this.form.querySelector('input, select');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 100);
        });
    }

    closeModal() {
        if (!this.modal) return;

        this.modal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Reset form
        if (this.form) {
            this.form.reset();
        }
        
        // Clear patient search input
        const patientSearchInput = document.getElementById('modalPatientSearch');
        if (patientSearchInput) {
            patientSearchInput.value = '';
        }
        
        // Hide search results
        const resultsContainer = document.getElementById('patientSearchResults');
        if (resultsContainer) {
            resultsContainer.classList.add('hidden');
        }
        
        this.currentModalAppointment = null;
    }

    async handleFormSubmission(e) {
        try {
            const formData = new FormData(this.form);
            
            // Debug: Log all form data
            console.log('📋 Raw FormData entries:');
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}: "${value}" (type: ${typeof value})`);
            }
            
            // Debug: Check time input element directly
            const timeInputElement = document.getElementById('modalTime');
            console.log('🕐 Time input element value:', timeInputElement ? timeInputElement.value : 'NOT FOUND');
            console.log('🕐 Time input element type:', timeInputElement ? timeInputElement.type : 'NOT FOUND');
            
            // Get time value with fallback - prioritize direct input value over FormData
            let timeValue = formData.get('time');
            if (!timeValue && timeInputElement) {
                timeValue = timeInputElement.value;
                console.log('🕐 Using fallback time value:', timeValue);
            }
            
            const appointmentData = {
                patient: formData.get('patient'),
                date: formData.get('date'),
                time: timeValue, // Use the fallback time value
                type: formData.get('type'),
                branch: formData.get('branch'),
                duration: formData.get('duration'),
                notes: formData.get('notes')
            };
            
            console.log('📅 Form data received:', appointmentData);
            console.log('📅 Date from form:', appointmentData.date, 'Type:', typeof appointmentData.date);
            console.log('🕐 Time from form:', appointmentData.time, 'Type:', typeof appointmentData.time);

            // Validate required fields
            if (!appointmentData.patient || !appointmentData.date || !appointmentData.time) {
                console.error('❌ Validation failed:', {
                    patient: appointmentData.patient,
                    date: appointmentData.date,
                    time: appointmentData.time
                });
                window.utils.showToast('error', 'Lütfen hasta, tarih ve saat alanlarını doldurun');
                return;
            }

            // Map type key to Turkish value
            const typeMapping = {
                'consultation': 'Konsültasyon',
                'hearing-test': 'İşitme Testi',
                'device-trial': 'Cihaz Denemesi',
                'follow-up': 'Kontrol'
            };

            // Ensure date is in correct format (no timezone conversion)
            let finalDate = appointmentData.date;
            if (finalDate && finalDate.includes('-')) {
                // Date is already in YYYY-MM-DD format, keep it as is
                console.log('📅 Date already in correct format:', finalDate);
            } else {
                console.warn('⚠️ Unexpected date format:', finalDate);
            }

            // Create new appointment (let backend generate ID)
            const newAppointment = {
                patientId: appointmentData.patient,
                patientName: window.appointmentData.getPatientNameById(appointmentData.patient),
                patient: window.appointmentData.getPatientNameById(appointmentData.patient),
                date: finalDate,
                time: appointmentData.time,
                type: typeMapping[appointmentData.type] || appointmentData.type,
                branch: appointmentData.branch,
                duration: appointmentData.duration,
                notes: appointmentData.notes,
                status: 'SCHEDULED',
                createdAt: new Date().toISOString()
            };
            
            console.log('📅 Final appointment data:', newAppointment);

            // Save appointment (saveAppointmentToStorage handles all updates)
            const saveResult = await window.appointmentData.saveAppointmentToStorage(newAppointment);
            
            if (saveResult) {
                console.log('✅ Yeni randevu kaydedildi:', newAppointment);
                window.utils.showToast('success', 'Randevu başarıyla oluşturuldu');
                
                // Force refresh all views
                setTimeout(() => {
                    window.appointmentData.refreshCurrentView();
                    console.log('🔄 Calendar views refreshed after appointment save');
                }, 200);
                
                this.closeModal();
            } else {
                window.utils.showToast('error', 'Randevu kaydedilemedi');
            }

        } catch (error) {
            console.error('Error submitting appointment form:', error);
            window.utils.showToast('error', 'Randevu kaydedilirken hata oluştu');
        }
    }

    editAppointment(appointment) {
        this.currentModalAppointment = appointment;
        
        // Pre-fill form with appointment data
        const patientSearchInput = document.getElementById('modalPatientSearch');
        const patientHiddenInput = document.getElementById('modalPatient');
        
        if (patientSearchInput && patientHiddenInput && appointment.patientId) {
            const patientInfo = window.appointmentData.getPatientInfoById(appointment.patientId);
            
            // Hide the search input and show patient name as read-only
            patientSearchInput.style.display = 'none';
            patientHiddenInput.value = appointment.patientId;
            
            // Create or update patient display element
            let patientDisplay = document.getElementById('modalPatientDisplay');
            if (!patientDisplay) {
                patientDisplay = document.createElement('div');
                patientDisplay.id = 'modalPatientDisplay';
                patientDisplay.className = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-700';
                patientSearchInput.parentNode.insertBefore(patientDisplay, patientSearchInput);
            }
            patientDisplay.textContent = patientInfo.name;
            patientDisplay.style.display = 'block';
        }
        
        document.getElementById('modalDate').value = this.formatDateForInput(appointment.date);
        document.getElementById('modalTime').value = appointment.time;
        document.getElementById('modalType').value = appointment.type;
        document.getElementById('modalBranch').value = appointment.branch;
        document.getElementById('modalClinician').value = appointment.clinician;
        document.getElementById('modalDuration').value = appointment.duration || '30';
        document.getElementById('modalNotes').value = appointment.notes || '';

        // Change modal title
        this.modalTitle.textContent = 'Randevu Düzenle';
        
        // Change submit button text
        const submitBtn = document.getElementById('saveAppointment');
        if (submitBtn) {
            submitBtn.textContent = 'Güncelle';
        }

        this.openModal();
    }
    
    initializePickers() {
        // Initialize modern date picker for appointment modal
        if (typeof ModernDatePicker !== 'undefined') {
            ModernDatePicker.initializeInputs('#modalDate', {
                allowFutureDates: true,
                maxDate: null, // Allow future dates for appointments
                locale: 'tr-TR'
            });
        }
        
        // Initialize modern time picker for appointment modal
        if (typeof ModernTimePicker !== 'undefined') {
            ModernTimePicker.initializeInputs('#modalTime', {
                step: 15, // 15 minute intervals
                minTime: '08:00',
                maxTime: '18:00',
                defaultTime: '09:00'
            });
        }
    }

    setupPatientSearch() {
        const searchInput = document.getElementById('modalPatientSearch');
        const resultsContainer = document.getElementById('patientSearchResults');
        const hiddenInput = document.getElementById('modalPatient');

        if (!searchInput || !resultsContainer) return;

        // Input event for search
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            console.log('🔍 Hasta arama:', query);

            if (query.length < 2) {
                resultsContainer.classList.add('hidden');
                return;
            }

            // Clear previous timeout
            if (this.patientSearchTimeout) {
                clearTimeout(this.patientSearchTimeout);
            }

            // Debounce search
            this.patientSearchTimeout = setTimeout(() => {
                this.searchPatients(query);
            }, 300);
        });

        // Focus event to show all patients if empty
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length === 0) {
                this.showAllPatients();
            }
        });

        // Click outside to close results
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.classList.add('hidden');
            }
        });

        // Prevent form submission on enter in search
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }

    searchPatients(query) {
        console.log('🔍 Hasta arama başlatıldı:', query);
        
        // Ensure patient data is loaded before searching
        if (!window.patientsData || !Array.isArray(window.patientsData)) {
            console.log('🔄 Hasta verisi yükleniyor arama için...');
            // Show loading indicator
            const resultsContainer = document.getElementById('patientSearchResults');
            if (resultsContainer) {
                resultsContainer.innerHTML = '<div class="p-3 text-sm text-gray-500">Hasta verisi yükleniyor...</div>';
                resultsContainer.classList.remove('hidden');
            }
            
            this.ensurePatientDataLoaded().then(() => {
                this.performPatientSearch(query);
            }).catch(error => {
                console.error('❌ Hasta verisi yüklenirken hata:', error);
                const resultsContainer = document.getElementById('patientSearchResults');
                if (resultsContainer) {
                    resultsContainer.innerHTML = '<div class="p-3 text-sm text-red-500">Hasta verisi yüklenemedi</div>';
                    resultsContainer.classList.remove('hidden');
                }
            });
            return;
        }

        this.performPatientSearch(query);
    }

    performPatientSearch(query) {
        if (!window.patientsData || !Array.isArray(window.patientsData)) {
            console.warn('⚠️ Hasta verisi bulunamadı - window.patientsData undefined');
            return;
        }

        const resultsContainer = document.getElementById('patientSearchResults');
        const patients = window.patientsData;
        
        // Filter patients by name or identifier
        const filteredPatients = patients.filter(patient => {
            const nameMatch = patient.name && patient.name.toLowerCase().includes(query.toLowerCase());
            const identifierMatch = patient.identifier && patient.identifier.toLowerCase().includes(query.toLowerCase());
            return nameMatch || identifierMatch;
        });

        console.log('🔍 Filtrelenmiş hastalar:', filteredPatients.length, 'adet');

        if (filteredPatients.length === 0) {
            resultsContainer.innerHTML = '<div class="p-3 text-sm text-gray-500">Hasta bulunamadı</div>';
            resultsContainer.classList.remove('hidden');
            return;
        }

        // Render results
        const resultsHTML = filteredPatients.map(patient => `
            <div class="patient-result p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0" 
                 data-patient-id="${patient.id}" 
                 data-patient-name="${patient.name}"
                 data-patient-identifier="${patient.identifier}">
                <div class="font-medium text-gray-900">${patient.name}</div>
                <div class="text-sm text-gray-500">${patient.identifier}</div>
            </div>
        `).join('');

        resultsContainer.innerHTML = resultsHTML;
        resultsContainer.classList.remove('hidden');

        // Add click handlers for results
        resultsContainer.querySelectorAll('.patient-result').forEach(result => {
            result.addEventListener('click', () => {
                const patientId = result.dataset.patientId;
                const patientName = result.dataset.patientName;
                const patientIdentifier = result.dataset.patientIdentifier;

                console.log('✅ Hasta seçildi:', patientId, patientName);

                // Update search input and hidden input
                document.getElementById('modalPatientSearch').value = patientName;
                document.getElementById('modalPatient').value = patientId;

                // Hide results
                resultsContainer.classList.add('hidden');
            });
        });
    }

    showAllPatients() {
        console.log('📋 Tüm hastalar gösteriliyor');
        
        // Ensure patient data is loaded before showing
        if (!window.patientsData || !Array.isArray(window.patientsData)) {
            console.log('🔄 Hasta verisi yükleniyor tüm hastalar için...');
            // Show loading indicator
            const resultsContainer = document.getElementById('patientSearchResults');
            if (resultsContainer) {
                resultsContainer.innerHTML = '<div class="p-3 text-sm text-gray-500">Hasta verisi yükleniyor...</div>';
                resultsContainer.classList.remove('hidden');
            }
            
            this.ensurePatientDataLoaded().then(() => {
                this.performShowAllPatients();
            }).catch(error => {
                console.error('❌ Hasta verisi yüklenirken hata:', error);
                const resultsContainer = document.getElementById('patientSearchResults');
                if (resultsContainer) {
                    resultsContainer.innerHTML = '<div class="p-3 text-sm text-red-500">Hasta verisi yüklenemedi</div>';
                    resultsContainer.classList.remove('hidden');
                }
            });
            return;
        }

        this.performShowAllPatients();
    }

    performShowAllPatients() {
        if (!window.patientsData || !Array.isArray(window.patientsData)) {
            console.warn('⚠️ Hasta verisi bulunamadı - window.patientsData undefined');
            return;
        }

        const resultsContainer = document.getElementById('patientSearchResults');
        const patients = window.patientsData.slice(0, 10); // Show first 10 patients

        if (patients.length === 0) {
            resultsContainer.innerHTML = '<div class="p-3 text-sm text-gray-500">Hasta bulunamadı</div>';
            resultsContainer.classList.remove('hidden');
            return;
        }

        const resultsHTML = patients.map(patient => `
            <div class="patient-result p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0" 
                 data-patient-id="${patient.id}" 
                 data-patient-name="${patient.name}"
                 data-patient-identifier="${patient.identifier}">
                <div class="font-medium text-gray-900">${patient.name}</div>
                <div class="text-sm text-gray-500">${patient.identifier}</div>
            </div>
        `).join('');

        resultsContainer.innerHTML = resultsHTML;
        resultsContainer.classList.remove('hidden');

        // Add click handlers
        resultsContainer.querySelectorAll('.patient-result').forEach(result => {
            result.addEventListener('click', () => {
                const patientId = result.dataset.patientId;
                const patientName = result.dataset.patientName;

                console.log('✅ Hasta seçildi:', patientId, patientName);

                document.getElementById('modalPatientSearch').value = patientName;
                document.getElementById('modalPatient').value = patientId;
                resultsContainer.classList.add('hidden');
            });
        });
    }

    async ensurePatientDataLoaded() {
        // Check if patient data is already loaded
        if (window.patientsData && Array.isArray(window.patientsData) && window.patientsData.length > 0) {
            console.log('✅ Hasta verisi zaten yüklü:', window.patientsData.length, 'hasta');
            return;
        }

        // Check if AppointmentData already has patients loaded
        if (window.appointmentData && window.appointmentData.patients && Array.isArray(window.appointmentData.patients) && window.appointmentData.patients.length > 0) {
            console.log('✅ AppointmentData\'dan hasta verisi alınıyor:', window.appointmentData.patients.length, 'hasta');
            window.patientsData = window.appointmentData.patients;
            return;
        }

        console.log('🔄 Hasta verisi yükleniyor...');
        
        // Fallback: Try to load directly from API (only once)
        console.log('🔄 API\'den hasta verisi yükleniyor...');
        try {
            let patients = [];
            
            // Use APIConfig directly (skip Orval since it's not available)
            if (window.APIConfig && typeof window.APIConfig.makeRequest === 'function') {
                const result = await window.APIConfig.makeRequest(window.APIConfig.endpoints.patients, 'GET');
                
                // Fix: Extract patients from the correct nested structure
                let patientData = null;
                if (result && result.success && result.data && result.data.data && Array.isArray(result.data.data)) {
                    // New API format: { success: true, data: { data: [...], meta: {...} } }
                    patientData = result.data.data;
                } else if (result && result.success && Array.isArray(result.data)) {
                    // Legacy format: { success: true, data: [...] }
                    patientData = result.data;
                }
                
                if (Array.isArray(patientData)) {
                    patients = patientData.map(patient => ({
                        id: patient.id,
                        name: `${patient.firstName} ${patient.lastName}`,
                        firstName: patient.firstName,
                        lastName: patient.lastName,
                        tcNumber: patient.tcNumber || patient.identityNumber,
                        phone: patient.phone,
                        identifier: patient.tcNumber || patient.identityNumber || patient.phone
                    }));
                    console.log('✅ Patients loaded via APIConfig in appointment modal:', patients.length);
                }
            } else {
                console.warn('⚠️ APIConfig not available for patient data in appointment modal');
                patients = [];
            }
            
            if (patients.length > 0) {
                window.patientsData = patients;
                console.log('✅ Hasta verisi yüklendi:', patients.length, 'hasta');
                return;
            }
        } catch (apiError) {
            console.error('❌ API çağrısı başarısız:', apiError);
        }
        
        // Last resort: Sample data
        console.log('📋 Son çare: Örnek hasta verisi kullanılıyor...');
        window.patientsData = [
            { id: 'P00001', name: 'Ahmet Yılmaz', firstName: 'Ahmet', lastName: 'Yılmaz', tcNumber: '12345678901', phone: '0532 123 4567', identifier: '12345678901' },
            { id: 'P00002', name: 'Ayşe Demir', firstName: 'Ayşe', lastName: 'Demir', tcNumber: '12345678902', phone: '0533 234 5678', identifier: '12345678902' },
            { id: 'P00003', name: 'Mehmet Kaya', firstName: 'Mehmet', lastName: 'Kaya', tcNumber: '12345678903', phone: '0534 345 6789', identifier: '12345678903' },
            { id: 'P00004', name: 'Fatma Şahin', firstName: 'Fatma', lastName: 'Şahin', tcNumber: '12345678904', phone: '0535 456 7890', identifier: '12345678904' },
            { id: 'P00005', name: 'Ali Çelik', firstName: 'Ali', lastName: 'Çelik', tcNumber: '12345678905', phone: '0536 567 8901', identifier: '12345678905' }
        ];
        console.log('✅ Örnek hasta verisi yüklendi');
    }
}

// Export for global use
window.AppointmentModal = AppointmentModal;