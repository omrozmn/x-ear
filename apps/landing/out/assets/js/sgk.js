/**
 * SGK Manager - Handles Social Security Institution (SGK) related operations
 * Manages device and battery rights, validity calculations, and SGK information
 */
class SGKManager {
    constructor() {
        this.sgkData = this.loadSGKData();
        this.deviceValidityYears = 5;
        this.batteryValidityYears = 1;
    }

    /**
     * Load SGK data from localStorage
     */
    loadSGKData() {
        try {
            const data = localStorage.getItem('sgkData');
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error loading SGK data:', error);
            return {};
        }
    }

    /**
     * Save SGK data to localStorage
     */
    saveSGKData() {
        try {
            localStorage.setItem('sgkData', JSON.stringify(this.sgkData));
        } catch (error) {
            console.error('Error saving SGK data:', error);
        }
    }

    /**
     * Get SGK information for a specific patient
     * @param {string} patientId - Patient ID
     * @returns {Object} SGK information
     */
    getPatientSGKInfo(patientId) {
        return this.sgkData[patientId] || {
            sgkDeviceRight: '',
            sgkDeviceLeft: '',
            sgkBatteryRight: '',
            sgkBatteryLeft: '',
            lastDeviceDate: '',
            lastBatteryDate: '',
            sgkValidityDate: ''
        };
    }

    /**
     * Update SGK information for a patient
     * @param {string} patientId - Patient ID
     * @param {Object} sgkInfo - SGK information
     */
    updatePatientSGKInfo(patientId, sgkInfo) {
        // Calculate validity date
        const validityDate = this.calculateValidityDate(sgkInfo.lastDeviceDate, sgkInfo.lastBatteryDate);
        
        this.sgkData[patientId] = {
            ...sgkInfo,
            sgkValidityDate: validityDate,
            updatedAt: new Date().toISOString()
        };
        
        this.saveSGKData();
        return this.sgkData[patientId];
    }

    /**
     * Calculate SGK validity date based on device and battery dates
     * @param {string} deviceDate - Last device acquisition date
     * @param {string} batteryDate - Last battery acquisition date
     * @returns {string} Validity date (earliest expiration)
     */
    calculateValidityDate(deviceDate, batteryDate) {
        if (!deviceDate && !batteryDate) return '';
        
        let earliestExpiry = null;
        
        if (deviceDate) {
            const deviceExpiry = new Date(deviceDate);
            deviceExpiry.setFullYear(deviceExpiry.getFullYear() + this.deviceValidityYears);
            earliestExpiry = deviceExpiry;
        }
        
        if (batteryDate) {
            const batteryExpiry = new Date(batteryDate);
            batteryExpiry.setFullYear(batteryExpiry.getFullYear() + this.batteryValidityYears);
            
            if (!earliestExpiry || batteryExpiry < earliestExpiry) {
                earliestExpiry = batteryExpiry;
            }
        }
        
        return earliestExpiry ? earliestExpiry.toISOString().split('T')[0] : '';
    }

    /**
     * Check if patient has valid SGK rights for device assignment
     * @param {string} patientId - Patient ID
     * @param {string} side - 'right' or 'left'
     * @returns {Object} Validation result
     */
    validateDeviceAssignment(patientId, side = 'right') {
        const sgkInfo = this.getPatientSGKInfo(patientId);
        const deviceRight = sgkInfo[`sgkDevice${side.charAt(0).toUpperCase() + side.slice(1)}`];
        const batteryRight = sgkInfo[`sgkBattery${side.charAt(0).toUpperCase() + side.slice(1)}`];
        
        const validation = {
            isValid: false,
            errors: [],
            warnings: []
        };
        
        // Check device rights
        if (!deviceRight || deviceRight === 'expired') {
            validation.errors.push(`${side === 'right' ? 'Sağ' : 'Sol'} kulak cihaz hakkı mevcut değil veya süresi dolmuş`);
        } else if (deviceRight === 'used') {
            validation.warnings.push(`${side === 'right' ? 'Sağ' : 'Sol'} kulak cihaz hakkı daha önce kullanılmış`);
        }
        
        // Check battery rights
        if (!batteryRight || batteryRight === 'expired') {
            validation.errors.push(`${side === 'right' ? 'Sağ' : 'Sol'} kulak pil hakkı mevcut değil veya süresi dolmuş`);
        } else if (batteryRight === 'used') {
            validation.warnings.push(`${side === 'right' ? 'Sağ' : 'Sol'} kulak pil hakkı daha önce kullanılmış`);
        }
        
        // Check validity date
        if (sgkInfo.sgkValidityDate) {
            const validityDate = new Date(sgkInfo.sgkValidityDate);
            const today = new Date();
            
            if (validityDate < today) {
                validation.errors.push('SGK geçerlilik tarihi dolmuş');
            } else if (validityDate < new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
                validation.warnings.push('SGK geçerlilik tarihi 30 gün içinde dolacak');
            }
        }
        
        validation.isValid = validation.errors.length === 0;
        return validation;
    }

    /**
     * Get SGK status summary for a patient
     * @param {string} patientId - Patient ID
     * @returns {Object} SGK status summary
     */
    getSGKStatusSummary(patientId) {
        const sgkInfo = this.getPatientSGKInfo(patientId);
        
        const summary = {
            hasValidRights: false,
            deviceRights: {
                right: sgkInfo.sgkDeviceRight,
                left: sgkInfo.sgkDeviceLeft
            },
            batteryRights: {
                right: sgkInfo.sgkBatteryRight,
                left: sgkInfo.sgkBatteryLeft
            },
            validityDate: sgkInfo.sgkValidityDate,
            daysUntilExpiry: null,
            status: 'unknown'
        };
        
        // Calculate days until expiry
        if (sgkInfo.sgkValidityDate) {
            const validityDate = new Date(sgkInfo.sgkValidityDate);
            const today = new Date();
            const diffTime = validityDate - today;
            summary.daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (summary.daysUntilExpiry < 0) {
                summary.status = 'expired';
            } else if (summary.daysUntilExpiry <= 30) {
                summary.status = 'expiring_soon';
            } else {
                summary.status = 'valid';
            }
        }
        
        // Check if has any valid rights
        const hasDeviceRights = summary.deviceRights.right === 'available' || summary.deviceRights.left === 'available';
        const hasBatteryRights = summary.batteryRights.right === 'available' || summary.batteryRights.left === 'available';
        summary.hasValidRights = hasDeviceRights && hasBatteryRights && summary.status !== 'expired';
        
        return summary;
    }

    /**
     * Mark SGK rights as used after device assignment
     * @param {string} patientId - Patient ID
     * @param {string} side - 'right' or 'left'
     * @param {boolean} useDevice - Whether device right was used
     * @param {boolean} useBattery - Whether battery right was used
     */
    markRightsAsUsed(patientId, side, useDevice = true, useBattery = true) {
        const sgkInfo = this.getPatientSGKInfo(patientId);
        
        if (useDevice) {
            sgkInfo[`sgkDevice${side.charAt(0).toUpperCase() + side.slice(1)}`] = 'used';
        }
        
        if (useBattery) {
            sgkInfo[`sgkBattery${side.charAt(0).toUpperCase() + side.slice(1)}`] = 'used';
        }
        
        this.updatePatientSGKInfo(patientId, sgkInfo);
    }

    /**
     * Get all patients with expiring SGK rights
     * @param {number} daysThreshold - Days threshold for expiring rights
     * @returns {Array} List of patients with expiring rights
     */
    getPatientsWithExpiringSGK(daysThreshold = 30) {
        const expiringPatients = [];
        
        for (const [patientId, sgkInfo] of Object.entries(this.sgkData)) {
            if (sgkInfo.sgkValidityDate) {
                const validityDate = new Date(sgkInfo.sgkValidityDate);
                const today = new Date();
                const diffTime = validityDate - today;
                const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (daysUntilExpiry <= daysThreshold && daysUntilExpiry >= 0) {
                    expiringPatients.push({
                        patientId,
                        daysUntilExpiry,
                        validityDate: sgkInfo.sgkValidityDate
                    });
                }
            }
        }
        
        return expiringPatients.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    }

    /**
     * Export SGK data for backup
     * @returns {string} JSON string of SGK data
     */
    exportSGKData() {
        return JSON.stringify(this.sgkData, null, 2);
    }

    /**
     * Import SGK data from backup
     * @param {string} jsonData - JSON string of SGK data
     * @returns {boolean} Success status
     */
    importSGKData(jsonData) {
        try {
            const importedData = JSON.parse(jsonData);
            this.sgkData = { ...this.sgkData, ...importedData };
            this.saveSGKData();
            return true;
        } catch (error) {
            console.error('Error importing SGK data:', error);
            return false;
        }
    }
}

// Initialize SGK Manager
const sgkManager = new SGKManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SGKManager;
}