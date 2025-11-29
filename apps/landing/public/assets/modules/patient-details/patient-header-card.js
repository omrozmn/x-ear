class PatientHeaderCardComponent {
    constructor() {
        this.patientData = null;
    }

    /**
     * Initialize the component with patient data
     * @param {Object} patientData - The patient data object
     */
    init(patientData) {
        this.patientData = patientData;
        
        if (!this.patientData) {
            console.error('PatientHeaderCardComponent: No patient data provided');
            return;
        }

        // Normalize patient data
        this.normalizePatientData();
    }

    /**
     * Normalize patient data to ensure consistency
     */
    normalizePatientData() {
        if (!this.patientData) return;

        // Use the shared normalizer if available
        try {
            if (typeof window !== 'undefined' && window.CanonicalizePatient && typeof window.CanonicalizePatient.canonicalizePatient === 'function') {
                this.patientData = window.CanonicalizePatient.canonicalizePatient(this.patientData) || this.patientData;
            }
        } catch (e) {
            // ignore and fall back to local normalization
        }

        // Normalize TC number
        const tcNumber = this.patientData.tc || this.patientData.tcNumber || '';
        this.patientData.tc = tcNumber;
        this.patientData.tcNumber = tcNumber;
        if (!this.patientData.name && (this.patientData.firstName || this.patientData.lastName)) {
            this.patientData.name = `${this.patientData.firstName || ''} ${this.patientData.lastName || ''}`.trim();
        }

        // Calculate age if not provided
        if (!this.patientData.age && this.patientData.birthDate) {
            this.patientData.age = this.calculateAge(this.patientData.birthDate);
        }
    }

    /**
     * Calculate age from birth date
     * @param {string} birthDate - The birth date string
     * @returns {number} The calculated age
     */
    calculateAge(birthDate) {
        if (!birthDate) return '';
        
        const birthDateObj = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const monthDiff = today.getMonth() - birthDateObj.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
            age--;
        }
        
        return age;
    }

    /**
     * Get initials from patient name
     * @param {string} name - The patient's full name
     * @returns {string} The initials
     */
    getInitials(name) {
        if (!name) return '';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    /**
     * Get display status text
     * @param {string} status - The status code
     * @returns {string} The display status text
     */
    getDisplayStatus(status) {
        const statusMap = {
            'active': 'Aktif',
            'inactive': 'Pasif',
            'trial': 'Deneme',
            'Aktif': 'Aktif',
            'Pasif': 'Pasif',
            'Beklemede': 'Beklemede'
        };
        return statusMap[status] || status || 'Aktif';
    }

    /**
     * Get status CSS class
     * @param {string} status - The status code
     * @returns {string} The CSS class
     */
    getStatusClass(status) {
        // Handle both English values from forms and Turkish display values
        const statusMap = {
            'active': 'Aktif',
            'inactive': 'Pasif', 
            'trial': 'Deneme',
            'Aktif': 'Aktif',
            'Pasif': 'Pasif',
            'Beklemede': 'Beklemede'
        };
        
        const displayStatus = statusMap[status] || status || 'Aktif';
        
        const statusClasses = {
            'Aktif': 'status-active',
            'Pasif': 'status-inactive',
            'Deneme': 'status-pending',
            'Beklemede': 'status-pending'
        };
        return statusClasses[displayStatus] || 'status-active';
    }

    getAcquisitionTypeDisplay(acquisitionType) {
        if (!acquisitionType) return 'Belirtilmemiş';
        
        // Load custom etiket settings
        const etiketSettings = this.loadEtiketSettings();
        const customType = etiketSettings.acquisitionTypes.find(type => type.value === acquisitionType);
        
        if (customType) {
            return customType.name;
        }
        
        // Fallback to default mapping
        const displayMap = {
            'tabela': 'Tabela',
            'sosyal_medya': 'Sosyal Medya',
            'tanitim': 'Tanıtım',
            'referans': 'Referans',
            'walk_in': 'Direkt Başvuru'
        };
        return displayMap[acquisitionType] || acquisitionType;
    }

    getConversionStepDisplay(conversionStep) {
        if (!conversionStep) return 'Belirtilmemiş';
        
        // Load custom etiket settings
        const etiketSettings = this.loadEtiketSettings();
        const customStep = etiketSettings.conversionSteps.find(step => step.value === conversionStep);
        
        if (customStep) {
            return customStep.name;
        }
        
        // Fallback to default mapping
        const displayMap = {
            'yeni': 'Yeni Hasta',
            'arama_yapildi': 'Arama Yapıldı',
            'randevu_verildi': 'Randevu Verildi',
            'geldi': 'Geldi',
            'satis_yapildi': 'Satış Yapıldı'
        };
        return displayMap[conversionStep] || conversionStep;
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

    /**
     * Async render helper: fetches patient from DomainManager if available and then renders.
     * This allows gradual migration of legacy pages to the DomainManager API without breaking
     * the existing synchronous render contract.
     * @param {string} patientId
     */
    async renderAsync(patientId) {
        let pdata = null;
        // Prefer domain manager if available (TypeScript DomainManager exposes window.domainManager)
        if (typeof window !== 'undefined' && window.domainManager && typeof window.domainManager.getPatient === 'function') {
            try {
                pdata = await window.domainManager.getPatient(patientId);
            } catch (e) {
                console.warn('domainManager.getPatient failed, falling back to legacy sources', e);
                pdata = null;
            }
        }

        // Fallback to legacy global patient holder
        if (!pdata && typeof window !== 'undefined') {
            pdata = window.patientDetailsManager?.currentPatient || window.currentPatientData || null;
        }

        return this.render(pdata);
    }

    /**
     * Render the patient header card HTML
     * @returns {string} The HTML for the patient header card
     */
    render(patientData) {
        this.init(patientData);

        if (!this.patientData) {
            return `
                <div class="card p-6 mb-6">
                    <p class="text-center text-gray-500">Hasta bilgisi bulunamadı</p>
                </div>
            `;
        }

        const { name, tc, phone, age, status, acquisitionType, conversionStep, lastVisit } = this.patientData;

        return `
            <div class="card p-6 mb-6">
                <div class="flex items-start justify-between">
                    <div class="flex items-center space-x-6">
                        <div class="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold" id="patientAvatar">
                            ${this.getInitials(name)}
                        </div>
                        <div>
                            <h1 class="text-3xl font-bold text-gray-900" id="patientFullName">${name}</h1>
                            <div class="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                <span id="patientTC">TC: ${tc || ''}</span>
                                <span id="patientPhone">Tel: ${phone || ''}</span>
                                <span id="patientAge">Yaş: ${age || ''}</span>
                            </div>
                            <div class="flex items-center space-x-3 mt-3">
                                <span class="status-badge ${this.getStatusClass(status)}" id="patientStatus">${this.getDisplayStatus(status)}</span>
                                <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800" id="patientAcquisitionType">${this.getAcquisitionTypeDisplay(acquisitionType)}</span>
                                <span class="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800" id="patientConversionStep">${this.getConversionStepDisplay(conversionStep)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-600">Son Ziyaret</p>
                        <p class="text-lg font-semibold" id="lastVisit">${lastVisit || ''}</p>
                        <div class="flex space-x-2 mt-2">
                            <button onclick="addPatientNote()" class="btn-secondary">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Not Ekle
                            </button>
                            <button id="updateLabelButton" onclick="updatePatientLabel()" class="btn-sm btn-secondary">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.997 1.997 0 013 12V7a4 4 0 014-4z"></path>
                                </svg>
                                Etiket Güncelle
                            </button>
                            <button onclick="editPatientInfo()" class="btn-sm btn-secondary">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                                Düzenle
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}