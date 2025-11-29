// Complete Patient Data Service - Migrated from data.js
// This file replaces /public/assets/data.js for patient management
// Complete patient data migrated from legacy data.js
export const initialPatientData = [
    {
        id: 'p1',
        firstName: 'Elif',
        lastName: 'Özkan',
        tcNumber: '12345678901',
        phone: '0532 123 4567',
        address: 'Kadıköy, İstanbul',
        birthDate: '1985-03-15',
        acquisitionType: 'walk_in',
        status: 'active',
        sgkInfo: {
            hasActiveSGK: true,
            sgkNumber: '123456789',
            institution: 'SGK',
            validUntil: '2024-12-31',
            lastRightsCheck: '2024-01-25T14:30:00Z',
            rightsStatus: 'active',
            coveredServices: ['hearing_aid', 'maintenance', 'repair'],
            usedRights: [],
            remainingRights: 2,
            lastUsedDate: null
        },
        assignedDevices: [
            {
                id: 'assignment_1',
                deviceId: 'device_1',
                patientId: 'p1',
                deviceName: 'Audeo Paradise P90',
                brand: 'Phonak',
                model: 'P90-13',
                ear: 'right',
                assignmentDate: '2024-01-20T10:00:00Z',
                status: 'active',
                trialPeriod: {
                    startDate: '2024-01-20T10:00:00Z',
                    endDate: '2024-02-20T10:00:00Z',
                    isTrialActive: true,
                    trialNotes: 'Hasta cihaza iyi adapte oldu'
                },
                deliveryInfo: {
                    deliveryDate: '2024-01-20T10:00:00Z',
                    deliveredBy: 'Dr. Ahmet Yılmaz',
                    deliveryAddress: 'Kadıköy, İstanbul',
                    deliveryStatus: 'completed',
                    trackingNumber: 'TRK123456'
                },
                warrantyInfo: {
                    warrantyStartDate: '2024-01-20T10:00:00Z',
                    warrantyEndDate: '2026-01-20T10:00:00Z',
                    warrantyProvider: 'Phonak Türkiye',
                    warrantyStatus: 'active'
                },
                createdAt: '2024-01-20T10:00:00Z',
                updatedAt: '2024-01-25T14:30:00Z'
            }
        ],
        ereceiptHistory: [],
        notes: [
            {
                id: 'note_1',
                patientId: 'p1',
                content: 'Bilateral işitme kaybı, deneme cihazı kullanıyor',
                createdBy: 'Dr. Ahmet Yılmaz',
                createdAt: '2024-01-20T10:00:00Z',
                category: 'medical',
                isPrivate: false
            },
            {
                id: 'note_2',
                patientId: 'p1',
                content: 'Hasta cihaza iyi adapte oldu, deneme süresini uzattık',
                createdBy: 'Dr. Ahmet Yılmaz',
                createdAt: '2024-01-25T14:30:00Z',
                category: 'followup',
                isPrivate: false
            }
        ],
        appointments: [
            {
                id: 'apt_1',
                patientId: 'p1',
                title: 'Kontrol Muayenesi',
                startTime: '2024-02-01T10:00:00Z',
                endTime: '2024-02-01T11:00:00Z',
                status: 'scheduled',
                type: 'followup',
                clinician: 'Dr. Ahmet Yılmaz',
                location: 'Kadıköy Şubesi',
                notes: 'Cihaz adaptasyonu kontrolü',
                reminderSent: false,
                createdAt: '2024-01-25T14:30:00Z',
                updatedAt: '2024-01-25T14:30:00Z'
            }
        ],
        createdAt: '2024-01-20T10:00:00Z',
        updatedAt: '2024-01-25T14:30:00Z'
    },
    {
        id: 'p2',
        firstName: 'Mehmet',
        lastName: 'Demir',
        tcNumber: '98765432109',
        phone: '0542 987 6543',
        address: 'Beşiktaş, İstanbul',
        birthDate: '1972-08-22',
        acquisitionType: 'referral',
        status: 'yeni',
        sgkInfo: {
            hasActiveSGK: true,
            sgkNumber: '987654321',
            institution: 'SGK',
            validUntil: '2024-12-31',
            lastRightsCheck: '2024-01-22T09:15:00Z',
            rightsStatus: 'active',
            coveredServices: ['hearing_aid', 'maintenance'],
            usedRights: [],
            remainingRights: 2,
            lastUsedDate: null
        },
        assignedDevices: [],
        ereceiptHistory: [],
        notes: [
            {
                id: 'note_3',
                patientId: 'p2',
                content: 'Yeni hasta, ilk değerlendirme yapıldı',
                createdBy: 'Dr. Fatma Aksoy',
                createdAt: '2024-01-22T09:15:00Z',
                category: 'initial_assessment',
                isPrivate: false
            }
        ],
        appointments: [],
        createdAt: '2024-01-22T09:15:00Z',
        updatedAt: '2024-01-22T09:15:00Z'
    },
    {
        id: 'p3',
        firstName: 'Ayşe',
        lastName: 'Kaya',
        tcNumber: '11122233344',
        phone: '0533 111 2233',
        address: 'Şişli, İstanbul',
        birthDate: '1958-11-10',
        acquisitionType: 'walk_in',
        status: 'completed',
        sgkInfo: {
            hasActiveSGK: true,
            sgkNumber: '111222333',
            institution: 'SGK',
            validUntil: '2024-12-31',
            lastRightsCheck: '2024-01-18T11:20:00Z',
            rightsStatus: 'used',
            coveredServices: ['hearing_aid'],
            usedRights: [
                {
                    id: 'right_1',
                    serviceType: 'hearing_aid',
                    usedDate: '2024-01-18T11:20:00Z',
                    deviceId: 'device_2',
                    eReceiptId: 'er_1'
                }
            ],
            remainingRights: 0,
            lastUsedDate: '2024-01-18T11:20:00Z'
        },
        assignedDevices: [
            {
                id: 'assignment_2',
                deviceId: 'device_2',
                patientId: 'p3',
                deviceName: 'Audeo Paradise P70',
                brand: 'Phonak',
                model: 'P70-312',
                ear: 'bilateral',
                assignmentDate: '2024-01-18T11:20:00Z',
                status: 'completed',
                trialPeriod: {
                    startDate: '2024-01-18T11:20:00Z',
                    endDate: '2024-01-25T11:20:00Z',
                    isTrialActive: false,
                    trialNotes: 'Başarılı adaptasyon'
                },
                deliveryInfo: {
                    deliveryDate: '2024-01-18T11:20:00Z',
                    deliveredBy: 'Dr. Can Özdemir',
                    deliveryAddress: 'Şişli, İstanbul',
                    deliveryStatus: 'completed',
                    trackingNumber: 'TRK789012'
                },
                warrantyInfo: {
                    warrantyStartDate: '2024-01-18T11:20:00Z',
                    warrantyEndDate: '2026-01-18T11:20:00Z',
                    warrantyProvider: 'Phonak Türkiye',
                    warrantyStatus: 'active'
                },
                createdAt: '2024-01-18T11:20:00Z',
                updatedAt: '2024-01-25T11:20:00Z'
            }
        ],
        ereceiptHistory: [
            {
                id: 'er_1',
                patientId: 'p3',
                ereceteNo: 'ER2024001',
                doctorName: 'Dr. Can Özdemir',
                receteDate: '2024-01-18',
                status: 'completed',
                materials: [
                    {
                        id: 'mat_1',
                        ereceteId: 'er_1',
                        code: '32.07.01.01.01',
                        name: 'Dijital Programlanabilir İşitme Cihazı',
                        applicationDate: '2024-01-18T11:20:00Z',
                        kdv: 18,
                        qty: 2,
                        deliveryStatus: 'delivered',
                        deliveryDate: '2024-01-18T11:20:00Z',
                        deliveredBy: 'Dr. Can Özdemir',
                        deliveredAt: 'Şişli Şubesi',
                        isHearingAid: true,
                        side: 'bilateral',
                        deviceInfo: {
                            brand: 'Phonak',
                            model: 'P70-312',
                            serialLeft: 'PH123458L',
                            serialRight: 'PH123458R'
                        },
                        utsNotificationId: 'uts_not_1',
                        utsCancelled: false,
                        utsCancelledAt: undefined,
                        createdAt: '2024-01-18T11:20:00Z',
                        updatedAt: '2024-01-18T11:20:00Z'
                    }
                ],
                sgkProcessingDate: '2024-01-18T11:20:00Z',
                sgkCompletionDate: '2024-01-18T11:30:00Z',
                sgkErrorDate: undefined,
                sgkErrorMessage: undefined,
                documents: [
                    {
                        id: 'doc_1',
                        ereceteId: 'er_1',
                        type: 'sgk_approval',
                        filename: 'sgk_onay_20240118.pdf',
                        url: '/documents/sgk_onay_20240118.pdf',
                        uploadedAt: '2024-01-18T11:30:00Z',
                        uploadedBy: 'system'
                    }
                ],
                createdAt: '2024-01-18T11:20:00Z',
                updatedAt: '2024-01-18T11:30:00Z'
            }
        ],
        notes: [
            {
                id: 'note_4',
                patientId: 'p3',
                content: 'Cihaz teslimi tamamlandı, memnun kaldı',
                createdBy: 'Dr. Can Özdemir',
                createdAt: '2024-01-18T11:30:00Z',
                category: 'completion',
                isPrivate: false
            }
        ],
        appointments: [],
        createdAt: '2024-01-18T11:20:00Z',
        updatedAt: '2024-01-25T11:20:00Z'
    }
];
// Patient service class
export class PatientDataService {
    constructor() {
        this.storageKey = 'xear_patients';
    }
    // Initialize with legacy data and migration
    initialize() {
        // Migrate from old keys if they exist
        this.migrateFromLegacyKeys();
        const existing = this.getAll();
        if (existing.length === 0) {
            localStorage.setItem(this.storageKey, JSON.stringify(initialPatientData));
            console.log(`✅ Initialized patient storage with ${initialPatientData.length} patients`);
        }
        else {
            console.log(`✅ Loaded ${existing.length} existing patients from storage`);
        }
    }
    // Migrate data from conflicting legacy keys
    migrateFromLegacyKeys() {
        const legacyKeys = [window.STORAGE_KEYS?.CRM_PATIENTS || 'xear_crm_patients', 'patients'];
        let migratedCount = 0;
        // Check if target key already has data
        const currentData = localStorage.getItem(this.storageKey);
        if (currentData) {
            console.log(`📊 Target key '${this.storageKey}' already has data, skipping migration`);
            return;
        }
        // Try to find data from legacy keys
        for (const legacyKey of legacyKeys) {
            try {
                const legacyData = localStorage.getItem(legacyKey);
                if (legacyData) {
                    const parsedData = JSON.parse(legacyData);
                    if (Array.isArray(parsedData) && parsedData.length > 0) {
                        console.log(`🔄 Migrating ${parsedData.length} patients from '${legacyKey}' to '${this.storageKey}'`);
                        localStorage.setItem(this.storageKey, legacyData);
                        localStorage.removeItem(legacyKey); // Clean up old key
                        migratedCount += parsedData.length;
                        console.log(`✅ Migration complete: ${migratedCount} patients moved to '${this.storageKey}'`);
                        break; // Use first found legacy data
                    }
                }
            }
            catch (error) {
                console.warn(`⚠️ Failed to migrate from '${legacyKey}':`, error);
            }
        }
        if (migratedCount === 0) {
            console.log(`📝 No legacy data found to migrate to '${this.storageKey}'`);
        }
    }
    getAll() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        }
        catch {
            return [];
        }
    }
    getById(id) {
        const patients = this.getAll();
        return patients.find(p => p.id === id) || null;
    }
    save(patient) {
        try {
            const patients = this.getAll();
            const existingIndex = patients.findIndex(p => p.id === patient.id);
            patient.updatedAt = new Date().toISOString();
            if (existingIndex >= 0) {
                patients[existingIndex] = patient;
            }
            else {
                patients.push(patient);
            }
            localStorage.setItem(this.storageKey, JSON.stringify(patients));
            return { success: true, data: patient };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Save failed' };
        }
    }
    search(query) {
        const patients = this.getAll();
        const searchTerm = query.toLowerCase();
        return patients.filter(p => p.firstName.toLowerCase().includes(searchTerm) ||
            p.lastName.toLowerCase().includes(searchTerm) ||
            p.tcNumber.includes(searchTerm) ||
            p.phone.includes(searchTerm));
    }
}
// Singleton instance
const patientDataService = new PatientDataService();
// Legacy compatibility
window.samplePatients = initialPatientData;
window.Storage = {
    save(key, data) {
        try {
            localStorage.setItem(`xear_${key}`, JSON.stringify(data));
        }
        catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    },
    load(key) {
        try {
            const data = localStorage.getItem(`xear_${key}`);
            return data ? JSON.parse(data) : null;
        }
        catch (e) {
            console.warn('Failed to load from localStorage:', e);
            return null;
        }
    }
};
window.PatientDataService = PatientDataService;
window.patientDataService = patientDataService;

// Expose data for legacy compatibility with patient-details.js
window.sampleData = {
    patients: initialPatientData
};

// Initialize on load
patientDataService.initialize();
console.log('✅ Patient Data Service loaded with full legacy compatibility');
console.log('✅ Sample data exposed for legacy compatibility:', window.sampleData.patients.length, 'patients');
