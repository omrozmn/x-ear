/**
 * 🆕 UNIFIED ACTIVITY LOGGER
 * Centralized activity logging utility for all forms
 * Logs activities to backend API with fallback to localStorage
 */
class ActivityLogger {
    constructor() {
        this.apiCandidates = [
            'http://localhost:5003/api/activity-logs',
            `${window.location.origin}/api/activity-logs`
        ];
    }

    /**
     * Log an activity to the backend API
     * @param {string} action - The action performed (create, update, delete, etc.)
     * @param {string} entityType - The type of entity (patient, device, cash_record, etc.)
     * @param {string} entityId - The ID of the entity
     * @param {Object} details - Additional details about the activity
     * @param {string} userId - The user ID (optional, will try to get from localStorage)
     */
    async logActivity(action, entityType, entityId = null, details = {}, userId = null) {
        try {
            // Get user ID from localStorage if not provided
            const currentUserId = userId || localStorage.getItem('currentUserId') || localStorage.getItem('currentUser') || 'system';
            
            const activityData = {
                user_id: currentUserId,
                action: action,
                entity_type: entityType,
                entity_id: entityId,
                details: details,
                timestamp: new Date().toISOString()
            };

            // Try to save via API first
            const apiSuccess = await this.saveViaAPI(activityData);
            if (!apiSuccess) {
                // Fallback to localStorage
                this.saveToLocalStorage(activityData);
            }

            console.log(`✅ Activity logged: ${action} ${entityType}`, activityData);
        } catch (error) {
            console.error('❌ Error logging activity:', error);
            // Still try to save to localStorage as last resort
            try {
                this.saveToLocalStorage({
                    user_id: userId || 'system',
                    action: action,
                    entity_type: entityType,
                    entity_id: entityId,
                    details: details,
                    timestamp: new Date().toISOString(),
                    error: error.message
                });
            } catch (localError) {
                console.error('❌ Failed to save activity to localStorage:', localError);
            }
        }
    }

    /**
     * Try to save activity via API endpoints
     */
    async saveViaAPI(activityData) {
        for (const apiUrl of this.apiCandidates) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('xear_access_token') || ''}`
                    },
                    body: JSON.stringify(activityData)
                });

                if (response.ok) {
                    console.log(`✅ Activity saved via API: ${apiUrl}`);
                    return true;
                } else {
                    console.warn(`⚠️ API save failed: ${apiUrl} - Status: ${response.status}`);
                }
            } catch (error) {
                console.warn(`❌ API save error: ${apiUrl}`, error.message);
            }
        }
        return false;
    }

    /**
     * Save activity to localStorage as fallback
     */
    saveToLocalStorage(activityData) {
        try {
            // Add unique ID for localStorage entries
            activityData.id = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Get existing activities
            let activities = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.ACTIVITY_LOGS || 'xear_activity_logs') || '[]');

            // Add new activity
            activities.push(activityData);

            // Keep only last 500 activities to prevent localStorage bloat
            if (activities.length > 500) {
                activities = activities.slice(-500);
            }

            // Save back to localStorage
            localStorage.setItem(window.STORAGE_KEYS?.ACTIVITY_LOGS || 'xear_activity_logs', JSON.stringify(activities));
            console.log('💾 Activity saved to localStorage');
        } catch (error) {
            console.error('❌ Failed to save activity to localStorage:', error);
        }
    }

    /**
     * Convenience methods for common activities
     */

    // Sales activities
    logSaleCreated(saleId, patientId, amount, details = {}) {
        return this.logActivity('create', 'sale', saleId, {
            patientId: patientId,
            amount: amount,
            ...details
        });
    }

    logDeviceAssigned(assignmentId, patientId, deviceDetails = {}) {
        return this.logActivity('device_assigned', 'device_assignment', assignmentId, {
            patientId: patientId,
            ...deviceDetails
        });
    }

    // Cash activities
    logCashRecordCreated(recordId, transactionType, amount, details = {}) {
        return this.logActivity('create', 'cash_record', recordId, {
            transactionType: transactionType,
            amount: amount,
            ...details
        });
    }

    // Timeline activities
    logTimelineEntryCreated(entryId, patientId, entryType, details = {}) {
        return this.logActivity('create', 'timeline_entry', entryId, {
            patientId: patientId,
            entryType: entryType,
            ...details
        });
    }

    // Patient activities
    logPatientUpdated(patientId, changes = {}) {
        return this.logActivity('update', 'patient', patientId, {
            changes: changes
        });
    }

    // Form submission activities
    logFormSubmitted(formType, formId, data = {}) {
        return this.logActivity('form_submit', formType, formId, {
            formData: data
        });
    }
}

// Create global instance
window.ActivityLogger = new ActivityLogger();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivityLogger;
}