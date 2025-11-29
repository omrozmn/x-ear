/**
 * Patient Details Manager Module
 * Extracted from patient-details.js (2275 lines)
 */

export class PatientDetailsManager {
    constructor(options = {}) {
        this.debug = options.debug || false;
        this.storagePrefix = options.storagePrefix || window.STORAGE_KEYS?.CRM_ || 'xear_crm_';
        this.maxHistorySize = options.maxHistorySize || 50;

        // Initialize storage
        this.initializeStorage();

        if (this.debug) {
            console.log('👤 Patient Details Manager initialized');
        }
    }

    /**
     * Initialize storage structure
     */
    initializeStorage() {
        if (!localStorage.getItem(`${this.storagePrefix}patients`)) {
            localStorage.setItem(`${this.storagePrefix}patients`, JSON.stringify([]));
        }

        if (!localStorage.getItem(`${this.storagePrefix}patient_history`)) {
            localStorage.setItem(`${this.storagePrefix}patient_history`, JSON.stringify([]));
        }
    }

    /**
     * Get all patients
     */
    getAllPatients() {
        try {
            const patients = localStorage.getItem(`${this.storagePrefix}patients`);
            return patients ? JSON.parse(patients) : [];
        } catch (error) {
            console.error('Failed to get patients:', error);
            return [];
        }
    }

    /**
     * Get patient by ID
     */
    getPatientById(patientId) {
        const patients = this.getAllPatients();
        return patients.find(patient => patient.id === patientId) || null;
    }

    /**
     * Search patients
     */
    searchPatients(query, options = {}) {
        const patients = this.getAllPatients();
        const searchTerm = query.toLowerCase().trim();

        if (!searchTerm) return patients;

        return patients.filter(patient => {
            const searchableText = [
                patient.firstName,
                patient.lastName,
                patient.tcNumber,
                patient.phone,
                patient.email,
                patient.address
            ].join(' ').toLowerCase();

            return searchableText.includes(searchTerm);
        });
    }

    /**
     * Save patient
     */
    savePatient(patientData) {
        try {
            const patients = this.getAllPatients();

            // Generate ID if not provided
            if (!patientData.id) {
                patientData.id = this.generatePatientId();
                patientData.createdAt = new Date().toISOString();
            } else {
                patientData.updatedAt = new Date().toISOString();
            }

            // Ensure required fields
            patientData = this.normalizePatientData(patientData);

            // Find existing patient or add new
            const existingIndex = patients.findIndex(p => p.id === patientData.id);

            if (existingIndex >= 0) {
                patients[existingIndex] = { ...patients[existingIndex], ...patientData };
            } else {
                patients.push(patientData);
            }

            // Save to storage
            localStorage.setItem(`${this.storagePrefix}patients`, JSON.stringify(patients));

            // Add to history
            this.addToHistory('save', patientData);

            if (this.debug) {
                console.log('✅ Patient saved:', patientData.id);
            }

            return patientData;

        } catch (error) {
            console.error('Failed to save patient:', error);
            throw error;
        }
    }

    /**
     * Delete patient
     */
    deletePatient(patientId) {
        try {
            const patients = this.getAllPatients();
            const filteredPatients = patients.filter(p => p.id !== patientId);

            if (filteredPatients.length === patients.length) {
                throw new Error('Patient not found');
            }

            localStorage.setItem(`${this.storagePrefix}patients`, JSON.stringify(filteredPatients));

            // Add to history
            this.addToHistory('delete', { id: patientId });

            if (this.debug) {
                console.log('🗑️ Patient deleted:', patientId);
            }

            return true;

        } catch (error) {
            console.error('Failed to delete patient:', error);
            throw error;
        }
    }

    /**
     * Generate unique patient ID
     */
    generatePatientId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `patient_${timestamp}_${random}`;
    }

    /**
     * Normalize patient data
     */
    normalizePatientData(data) {
        return {
            id: data.id || '',
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            tcNumber: data.tcNumber || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            birthDate: data.birthDate || null,
            gender: data.gender || '',
            bloodType: data.bloodType || '',
            allergies: data.allergies || [],
            medications: data.medications || [],
            medicalHistory: data.medicalHistory || [],
            appointments: data.appointments || [],
            notes: data.notes || [],
            status: data.status || 'active',
            acquisitionType: data.acquisitionType || 'walk_in',
            assignedDevices: data.assignedDevices || [],
            ereceiptHistory: data.ereceiptHistory || [],
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString()
        };
    }

    /**
     * Add to history
     */
    addToHistory(action, data) {
        try {
            const history = this.getHistory();
            const historyEntry = {
                id: this.generateHistoryId(),
                action,
                data,
                timestamp: new Date().toISOString()
            };

            history.unshift(historyEntry);

            // Limit history size
            if (history.length > this.maxHistorySize) {
                history.splice(this.maxHistorySize);
            }

            localStorage.setItem(`${this.storagePrefix}patient_history`, JSON.stringify(history));

        } catch (error) {
            console.warn('Failed to add to history:', error);
        }
    }

    /**
     * Get history
     */
    getHistory() {
        try {
            const history = localStorage.getItem(`${this.storagePrefix}patient_history`);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.warn('Failed to get history:', error);
            return [];
        }
    }

    /**
     * Generate history ID
     */
    generateHistoryId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `history_${timestamp}_${random}`;
    }

    /**
     * Export patients to JSON
     */
    exportPatients() {
        const patients = this.getAllPatients();
        const dataStr = JSON.stringify(patients, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `patients_export_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    /**
     * Import patients from JSON
     */
    async importPatients(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const importedPatients = JSON.parse(e.target.result);

                    if (!Array.isArray(importedPatients)) {
                        throw new Error('Invalid file format');
                    }

                    const currentPatients = this.getAllPatients();
                    const mergedPatients = [...currentPatients];

                    // Merge imported patients
                    importedPatients.forEach(imported => {
                        const existingIndex = mergedPatients.findIndex(p => p.id === imported.id);

                        if (existingIndex >= 0) {
                            // Update existing
                            mergedPatients[existingIndex] = {
                                ...mergedPatients[existingIndex],
                                ...imported,
                                updatedAt: new Date().toISOString()
                            };
                        } else {
                            // Add new
                            mergedPatients.push({
                                ...imported,
                                createdAt: new Date().toISOString()
                            });
                        }
                    });

                    localStorage.setItem(`${this.storagePrefix}patients`, JSON.stringify(mergedPatients));

                    resolve({
                        imported: importedPatients.length,
                        total: mergedPatients.length
                    });

                } catch (error) {
                    reject(new Error('Failed to parse file: ' + error.message));
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Get patient statistics
     */
    getStatistics() {
        const patients = this.getAllPatients();

        const stats = {
            total: patients.length,
            active: patients.filter(p => p.status === 'active').length,
            inactive: patients.filter(p => p.status === 'inactive').length,
            byGender: {},
            byAcquisitionType: {},
            byBloodType: {},
            recentActivity: this.getHistory().slice(0, 10)
        };

        // Group by various fields
        patients.forEach(patient => {
            // Gender
            stats.byGender[patient.gender] = (stats.byGender[patient.gender] || 0) + 1;

            // Acquisition type
            stats.byAcquisitionType[patient.acquisitionType] = (stats.byAcquisitionType[patient.acquisitionType] || 0) + 1;

            // Blood type
            if (patient.bloodType) {
                stats.byBloodType[patient.bloodType] = (stats.byBloodType[patient.bloodType] || 0) + 1;
            }
        });

        return stats;
    }

    /**
     * Validate patient data
     */
    validatePatientData(data) {
        const errors = [];

        // Required fields
        if (!data.firstName?.trim()) errors.push('First name is required');
        if (!data.lastName?.trim()) errors.push('Last name is required');

        // TC Number validation (Turkish ID)
        if (data.tcNumber && !this.validateTCNumber(data.tcNumber)) {
            errors.push('Invalid Turkish ID number');
        }

        // Phone validation
        if (data.phone && !this.validatePhone(data.phone)) {
            errors.push('Invalid phone number');
        }

        // Email validation
        if (data.email && !this.validateEmail(data.email)) {
            errors.push('Invalid email address');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate Turkish ID number
     */
    validateTCNumber(tcNumber) {
        if (!tcNumber || tcNumber.length !== 11) return false;
        if (tcNumber[0] === '0') return false;

        // Checksum validation
        const digits = tcNumber.split('').map(Number);
        const sum = digits.slice(0, 10).reduce((a, b) => a + b, 0);
        return (sum % 10) === digits[10];
    }

    /**
     * Validate phone number
     */
    validatePhone(phone) {
        // Turkish phone patterns
        const patterns = [
            /^(\+90|0)?\s*(\d{3})\s*(\d{3})\s*(\d{2})\s*(\d{2})$/,
            /^(\+90|0)?\s*(\d{3})\s*(\d{3})\s*(\d{4})$/
        ];

        const cleanPhone = phone.replace(/\s/g, '');
        return patterns.some(pattern => pattern.test(cleanPhone));
    }

    /**
     * Validate email
     */
    validateEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    /**
     * Get manager status
     */
    getStatus() {
        const patients = this.getAllPatients();
        const history = this.getHistory();

        return {
            initialized: true,
            patientCount: patients.length,
            historyCount: history.length,
            storagePrefix: this.storagePrefix,
            maxHistorySize: this.maxHistorySize
        };
    }
}