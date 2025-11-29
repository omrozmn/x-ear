/**
 * 🔄 UNIFIED FORM PIPELINE
 * Standardizes the flow across all forms in the application
 *
 * Pipeline Flow:
 * 1. Validate form data
 * 2. Save to localStorage (offline-first)
 * 3. Create related records (cash, timeline, etc.)
 * 4. Attempt API sync with retry logic
 * 5. Log activity for audit trail
 * 6. Update UI and provide feedback
 */
class FormPipeline {
    constructor() {
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        this.apiEndpoints = [
            'http://localhost:5003',
            'http://localhost:5000',
            'http://127.0.0.1:5003',
            'http://127.0.0.1:5000'
        ];
    }

    /**
     * Execute the complete form pipeline
     * @param {Object} config - Pipeline configuration
     * @param {Object} config.formData - The form data to process
     * @param {string} config.formType - Type of form (sales, device, cash, etc.)
     * @param {string} config.storageKey - localStorage key for the data
     * @param {Function} config.validator - Function to validate form data
     * @param {Function} config.processor - Function to process the data
     * @param {Array} config.relatedRecords - Array of related record creators
     * @param {Object} config.apiConfig - API configuration
     * @param {Object} config.activityConfig - Activity logging configuration
     * @param {Function} config.uiUpdater - Function to update UI after success
     */
    async execute(config) {
        const {
            formData,
            formType,
            storageKey,
            validator,
            processor,
            relatedRecords = [],
            apiConfig,
            activityConfig,
            uiUpdater
        } = config;

        try {
            console.log(`🔄 Starting ${formType} form pipeline...`);

            // Step 1: Validate form data
            if (validator) {
                const validationResult = await validator(formData);
                if (!validationResult.isValid) {
                    throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
                }
            }

            // Step 2: Process and save to localStorage (offline-first)
            const processedData = processor ? await processor(formData) : formData;
            const recordId = processedData.id || this.generateId();
            processedData.id = recordId;
            await this.saveToLocalStorage(storageKey, processedData);
            console.log(`✅ ${formType} saved to localStorage with ID: ${recordId}`);

            // Step 3: Create related records (cash, timeline, etc.)
            const relatedRecordResults = [];
            for (const relatedRecord of relatedRecords) {
                try {
                    const result = await relatedRecord.creator(processedData, relatedRecord.config);
                    relatedRecordResults.push({
                        type: relatedRecord.type,
                        result,
                        success: true
                    });
                    console.log(`✅ ${relatedRecord.type} record created successfully`);
                } catch (error) {
                    console.warn(`⚠️ Failed to create ${relatedRecord.type} record:`, error);
                    relatedRecordResults.push({
                        type: relatedRecord.type,
                        error,
                        success: false
                    });
                }
            }

            // Step 4: Attempt API sync with retry logic
            let apiSyncSuccess = false;
            if (apiConfig) {
                try {
                    await this.syncToAPI(processedData, apiConfig);
                    apiSyncSuccess = true;
                    console.log(`✅ ${formType} synced to API successfully`);
                } catch (error) {
                    console.warn(`⚠️ API sync failed for ${formType}:`, error);
                    // Mark for later sync
                    await this.markForLaterSync(storageKey, processedData);
                }
            }

            // Step 5: Log activity for audit trail
            if (activityConfig && window.ActivityLogger) {
                try {
                    await window.ActivityLogger.logFormSubmission(
                        formType,
                        recordId,
                        activityConfig.entityId,
                        {
                            ...activityConfig.details,
                            apiSyncSuccess,
                            relatedRecords: relatedRecordResults.map(r => ({
                                type: r.type,
                                success: r.success
                            }))
                        }
                    );
                    console.log(`✅ Activity logged for ${formType}`);
                } catch (error) {
                    console.warn(`⚠️ Failed to log activity for ${formType}:`, error);
                }
            }

            // Step 6: Update UI and provide feedback
            if (uiUpdater) {
                await uiUpdater(processedData, {
                    apiSyncSuccess,
                    relatedRecords: relatedRecordResults
                });
            }

            // Return pipeline result
            return {
                success: true,
                recordId,
                data: processedData,
                apiSyncSuccess,
                relatedRecords: relatedRecordResults
            };

        } catch (error) {
            console.error(`❌ ${formType} form pipeline failed:`, error);

            // Log the error activity if possible
            if (activityConfig && window.ActivityLogger) {
                try {
                    await window.ActivityLogger.logFormSubmission(
                        formType,
                        'error',
                        activityConfig.entityId,
                        {
                            error: error.message,
                            ...activityConfig.details
                        }
                    );
                } catch (logError) {
                    console.warn('Failed to log error activity:', logError);
                }
            }

            throw error;
        }
    }

    /**
     * Save data to localStorage with error handling
     */
    async saveToLocalStorage(key, data) {
        try {
            const existingData = JSON.parse(localStorage.getItem(key) || '[]');
            const updatedData = Array.isArray(existingData) ? [...existingData, data] : [data];
            localStorage.setItem(key, JSON.stringify(updatedData));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            throw new Error('Local storage save failed');
        }
    }

    /**
     * Sync data to API with retry logic
     */
    async syncToAPI(data, apiConfig) {
        const { endpoint, method = 'POST', headers = {} } = apiConfig;

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            for (const baseUrl of this.apiEndpoints) {
                try {
                    const response = await fetch(`${baseUrl}${endpoint}`, {
                        method,
                        headers: {
                            'Content-Type': 'application/json',
                            ...headers
                        },
                        body: JSON.stringify(data)
                    });

                    if (response.ok) {
                        return await response.json();
                    }
                } catch (error) {
                    console.warn(`API sync attempt ${attempt} failed for ${baseUrl}:`, error);
                }
            }

            if (attempt < this.retryAttempts) {
                await this.delay(this.retryDelay * attempt);
            }
        }

        throw new Error('All API sync attempts failed');
    }

    /**
     * Mark record for later synchronization
     */
    async markForLaterSync(storageKey, data) {
        const syncKey = `${storageKey}_pending_sync`;
        try {
            const pendingSync = JSON.parse(localStorage.getItem(syncKey) || '[]');
            pendingSync.push({
                ...data,
                pendingSince: new Date().toISOString(),
                attempts: 0
            });
            localStorage.setItem(syncKey, JSON.stringify(pendingSync));
        } catch (error) {
            console.error('Failed to mark for later sync:', error);
        }
    }

    /**
     * Generate a unique ID for records
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Process pending sync records
     */
    async processPendingSync() {
        const syncKeys = Object.keys(localStorage).filter(key => key.endsWith('_pending_sync'));

        for (const syncKey of syncKeys) {
            try {
                const pendingRecords = JSON.parse(localStorage.getItem(syncKey) || '[]');
                const successfulSyncs = [];

                for (const record of pendingRecords) {
                    try {
                        // Determine API config based on record type
                        const apiConfig = this.getApiConfigForRecord(record);
                        if (apiConfig) {
                            await this.syncToAPI(record, apiConfig);
                            successfulSyncs.push(record.id);
                            console.log(`✅ Pending sync completed for record: ${record.id}`);
                        }
                    } catch (error) {
                        console.warn(`⚠️ Pending sync failed for record ${record.id}:`, error);
                        record.attempts = (record.attempts || 0) + 1;
                    }
                }

                // Remove successfully synced records
                const remainingRecords = pendingRecords.filter(
                    record => !successfulSyncs.includes(record.id)
                );

                if (remainingRecords.length === 0) {
                    localStorage.removeItem(syncKey);
                } else {
                    localStorage.setItem(syncKey, JSON.stringify(remainingRecords));
                }

            } catch (error) {
                console.error(`Failed to process pending sync for ${syncKey}:`, error);
            }
        }
    }

    /**
     * Get API configuration based on record type
     */
    getApiConfigForRecord(record) {
        // This would be expanded based on actual record types
        const apiConfigs = {
            sale: { endpoint: '/api/sales', method: 'POST' },
            cash: { endpoint: '/api/cash_records', method: 'POST' },
            device: { endpoint: '/api/devices', method: 'POST' },
            timeline: { endpoint: '/api/timeline', method: 'POST' },
            patient: { endpoint: '/api/patients', method: 'POST' }
        };

        return apiConfigs[record.type] || null;
    }
}

// Create global instance
window.FormPipeline = new FormPipeline();

// Auto-process pending syncs when online
window.addEventListener('online', () => {
    console.log('🌐 Connection restored, processing pending syncs...');
    window.FormPipeline.processPendingSync();
});

// Process pending syncs on page load
document.addEventListener('DOMContentLoaded', () => {
    // Delay to ensure other scripts are loaded
    setTimeout(() => {
        window.FormPipeline.processPendingSync();
    }, 2000);
});

console.log('🔄 Form Pipeline initialized');