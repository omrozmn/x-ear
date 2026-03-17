class PatientProfileWidget {
    constructor(containerId, patientData) {
        this.containerId = containerId;
        this.patientData = patientData;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // TC ve yaş bilgilerini uyumlu hale getir ve senkronize et
        const tcNumber = this.patientData.tc || this.patientData.tcNumber || '';
        // Her iki alanı da güncelle
        this.patientData.tc = tcNumber;
        this.patientData.tcNumber = tcNumber;
        
        const age = this.patientData.age || (this.patientData.birthDate ? Utils.calculateAge(this.patientData.birthDate) : '');
        
        // Telefon numarasını kontrol et
        const phone = this.patientData.phone || '';
        
        // Yaş bilgisini de patientData'ya kaydet
        if (age && !this.patientData.age) {
            this.patientData.age = age;
        }
        
        // Konsola bilgileri yazdır (debug için)
        console.log('PatientProfileWidget render:', {
            name: this.patientData.name,
            tc: this.patientData.tc,
            tcNumber: this.patientData.tcNumber,
            phone: this.patientData.phone,
            age: age
        });

        container.innerHTML = `
            <div class="card p-6 mb-6">
                <div class="flex items-start justify-between">
                    <div class="flex items-center space-x-6">
                        <div class="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold" id="patientAvatar">
                            ${this.getInitials(this.patientData.name)}
                        </div>
                        <div>
                            <h1 class="text-3xl font-bold text-gray-900" id="patientFullName">${this.patientData.name}</h1>
                            <div class="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                <span id="patientTC">TC: ${tcNumber}</span>
                                <span id="patientPhone">Tel: ${phone}</span>
                                <span id="patientAge">Yaş: ${age}</span>
                            </div>
                            <div class="flex items-center space-x-3 mt-3">
                                <span class="status-badge ${this.getStatusClass(this.patientData.status)}" id="patientStatus">${this.getDisplayStatus(this.patientData.status)}</span>
                                <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800" id="patientAcquisitionType">${this.getAcquisitionTypeDisplay(this.patientData.acquisitionType)}</span>
                                <span class="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800" id="patientConversionStep">${this.getConversionStepDisplay(this.patientData.conversionStep)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-600">Son Ziyaret</p>
                        <p class="text-lg font-semibold" id="lastVisit">${this.patientData.lastVisit}</p>
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

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

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

    getSGKStatusClass(sgkStatus) {
        const sgkClasses = {
            'SGK Onaylı': 'status-active',
            'SGK Beklemede': 'status-pending',
            'SGK Reddedildi': 'status-inactive'
        };
        return sgkClasses[sgkStatus] || 'status-pending';
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

    updatePatientData(newData) {
        console.log('PatientProfileWidget.updatePatientData called with:', newData);
        console.log('Previous data:', this.patientData);
        
        this.patientData = { ...this.patientData, ...newData };
        
        console.log('Updated data:', this.patientData);
        
        this.render();
        
        console.log('PatientProfileWidget render completed');
    }

    static createDefault(containerId) {
        const defaultData = {
            name: 'Hasta Seçiniz',
            tcNumber: '',
            phone: '',
            birthDate: '',
            status: 'Yeni',
            segment: 'Henüz belirlenmemiş',
            sgkStatus: 'Bilgi yok',
            lastVisit: 'Henüz ziyaret yok'
        };
        return new PatientProfileWidget(containerId, defaultData);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatientProfileWidget;
}