/**
 * X-Ear Storage Manager - TypeScript Version
 * Unified storage interface with standardized key management
 * Replaces: public/assets/js/storage-manager.js
 */
class XEarStorageManager {
    constructor(config = {
        prefix: window.STORAGE_KEYS?. || 'xear_',
        version: '1.0',
        migration: true
    }) {
        this.config = config;
        if (config.migration) {
            this.performLegacyMigration();
        }
    }
    static getInstance() {
        if (!XEarStorageManager.instance) {
            XEarStorageManager.instance = new XEarStorageManager();
        }
        return XEarStorageManager.instance;
    }
    /**
     * Get data from storage with automatic migration
     */
    get(domain, defaultValue = null) {
        try {
            const storageKey = XEarStorageManager.KEYS[domain];
            if (!storageKey) {
                console.warn(`Unknown storage domain: ${domain}`);
                return defaultValue;
            }
            // Check for existing data
            let data = localStorage.getItem(storageKey);
            // If not found, check for legacy keys and migrate
            if (!data && this.config.migration) {
                data = this.migrateLegacyData(domain);
            }
            if (data) {
                return JSON.parse(data);
            }
            return defaultValue;
        }
        catch (error) {
            console.error(`Storage get error for ${domain}:`, error);
            return defaultValue;
        }
    }
    /**
     * Save data to storage with validation
     */
    set(domain, data) {
        try {
            const storageKey = XEarStorageManager.KEYS[domain];
            if (!storageKey) {
                console.warn(`Unknown storage domain: ${domain}`);
                return false;
            }
            // Validate data can be serialized
            const serialized = JSON.stringify(data);
            localStorage.setItem(storageKey, serialized);
            console.log(`✅ Saved ${domain} data (${Math.round(serialized.length / 1024)}KB)`);
            return true;
        }
        catch (error) {
            console.error(`Storage set error for ${domain}:`, error);
            return false;
        }
    }
    /**
     * Remove data from storage
     */
    remove(domain) {
        try {
            const storageKey = XEarStorageManager.KEYS[domain];
            if (!storageKey) {
                console.warn(`Unknown storage domain: ${domain}`);
                return false;
            }
            localStorage.removeItem(storageKey);
            console.log(`🗑️ Removed ${domain} data`);
            return true;
        }
        catch (error) {
            console.error(`Storage remove error for ${domain}:`, error);
            return false;
        }
    }
    /**
     * Clear all X-Ear storage data
     */
    clearAll() {
        try {
            const xearKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.config.prefix)) {
                    xearKeys.push(key);
                }
            }
            xearKeys.forEach(key => localStorage.removeItem(key));
            console.log(`🗑️ Cleared ${xearKeys.length} X-Ear storage keys`);
        }
        catch (error) {
            console.error('Storage clear error:', error);
        }
    }
    /**
     * Get storage statistics
     */
    getStats() {
        const stats = {
            totalSize: 0,
            keyCount: 0,
            domains: {}
        };
        try {
            Object.entries(XEarStorageManager.KEYS).forEach(([domain, storageKey]) => {
                const data = localStorage.getItem(storageKey);
                if (data) {
                    const size = data.length + storageKey.length;
                    stats.totalSize += size;
                    stats.keyCount++;
                    stats.domains[domain] = Math.round(size / 1024); // KB
                }
            });
        }
        catch (error) {
            console.error('Storage stats error:', error);
        }
        return stats;
    }
    /**
     * Migrate legacy data to standardized keys
     */
    performLegacyMigration() {
        try {
            let migrationCount = 0;
            Object.entries(XEarStorageManager.LEGACY_MAPPINGS).forEach(([legacyKey, domain]) => {
                const legacyData = localStorage.getItem(legacyKey);
                if (legacyData) {
                    const targetKey = XEarStorageManager.KEYS[domain];
                    if (targetKey && !localStorage.getItem(targetKey)) {
                        localStorage.setItem(targetKey, legacyData);
                        localStorage.removeItem(legacyKey);
                        migrationCount++;
                        console.log(`🔄 Migrated ${legacyKey} → ${targetKey}`);
                    }
                }
            });
            if (migrationCount > 0) {
                console.log(`✅ Migration completed: ${migrationCount} keys migrated`);
            }
        }
        catch (error) {
            console.error('Migration error:', error);
        }
    }
    /**
     * Migrate specific legacy data
     */
    migrateLegacyData(domain) {
        try {
            // Check all possible legacy keys for this domain
            const legacyKeys = Object.entries(XEarStorageManager.LEGACY_MAPPINGS)
                .filter(([_, mappedDomain]) => mappedDomain === domain)
                .map(([legacyKey, _]) => legacyKey);
            for (const legacyKey of legacyKeys) {
                const data = localStorage.getItem(legacyKey);
                if (data) {
                    // Migrate to new key
                    const targetKey = XEarStorageManager.KEYS[domain];
                    localStorage.setItem(targetKey, data);
                    localStorage.removeItem(legacyKey);
                    console.log(`🔄 Migrated ${legacyKey} → ${targetKey}`);
                    return data;
                }
            }
        }
        catch (error) {
            console.error(`Migration error for ${domain}:`, error);
        }
        return null;
    }
    /**
     * Validate storage health
     */
    validateStorage() {
        const issues = [];
        let isHealthy = true;
        try {
            // Check for duplicate legacy keys
            const legacyKeys = Object.keys(XEarStorageManager.LEGACY_MAPPINGS);
            legacyKeys.forEach(legacyKey => {
                if (localStorage.getItem(legacyKey)) {
                    issues.push(`Legacy key still exists: ${legacyKey}`);
                    isHealthy = false;
                }
            });
            // Check storage quota
            const stats = this.getStats();
            if (stats.totalSize > 4 * 1024 * 1024) { // 4MB
                issues.push(`Storage usage high: ${Math.round(stats.totalSize / 1024 / 1024)}MB`);
            }
            // Test storage functionality
            const testKey = 'xear_test_' + Date.now();
            localStorage.setItem(testKey, 'test');
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            if (retrieved !== 'test') {
                issues.push('Storage read/write test failed');
                isHealthy = false;
            }
        }
        catch (error) {
            issues.push(`Storage validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            isHealthy = false;
        }
        return { isHealthy, issues };
    }
}
// Standardized storage key mapping
XEarStorageManager.KEYS = {
    // Patient Management
    patients: 'xear_patients_data',
    patientsDocuments: 'xear_patients_documents',
    // Device Management  
    devices: 'xear_devices_data',
    deviceTrials: 'xear_devices_trials',
    deviceAssignments: 'xear_devices_assignments',
    // SGK Integration
    sgkIntegrations: 'xear_sgk_integrations',
    sgkDocuments: 'xear_sgk_documents',
    // UTS Records
    utsRecords: 'xear_uts_records',
    // Inventory Management
    inventory: 'xear_inventory_items',
    // Appointments & Scheduling
    appointments: 'xear_appointments_data',
    // SMS & Communication
    campaigns: 'xear_sms_campaigns',
    // System Configuration
    acquisitionTypes: 'xear_acquisition_types',
    systemSettings: 'xear_system_settings',
    automationRules: 'xear_automation_rules'
};
// Legacy key mappings for migration
XEarStorageManager.LEGACY_MAPPINGS = {
    'patients': 'patients',
    'xear_patients': 'patients',
    'xear_crm_patients': 'patients',
    'devices': 'devices',
    'device_data': 'devices',
    'sgk_documents': 'sgkDocuments',
    'patient_documents': 'patientsDocuments',
    'deviceTrials': 'deviceTrials',
    'deviceAssignments': 'deviceAssignments',
    'acquisitionTypes': 'acquisitionTypes'
};
// Create global instance for backward compatibility
const storageManager = XEarStorageManager.getInstance();
// Export for module usage

// Expose to window for HTML files
if (typeof window !== 'undefined') {
    window.XEarStorageManager = {
        get: (domain, defaultValue = null) => storageManager.get(domain, defaultValue),
        set: (domain, data) => storageManager.set(domain, data),
        remove: (domain) => storageManager.remove(domain),
        clearAll: () => storageManager.clearAll(),
        getStats: () => storageManager.getStats(),
        validateStorage: () => storageManager.validateStorage(),
        KEYS: XEarStorageManager.KEYS
    };
}
