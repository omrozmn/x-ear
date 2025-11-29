class ApiClient {
    constructor(baseUrl) {
        // Prefer explicit baseUrl, otherwise use configured global, otherwise use relative path
        // NOTE: baseUrl should not end with /api - the endpoint paths will include it
        let base = baseUrl || (typeof window !== 'undefined' && window.API_BASE_URL) || '';
        
        // Remove trailing slash if present
        if (base.endsWith('/')) {
            base = base.slice(0, -1);
        }
        
        this.baseUrl = base;
    }

    async handleResponse(response) {
        if (!response.ok) {
            let errorBody = {};
            try { errorBody = await response.json(); } catch (e) { /* ignore */ }
            const msg = errorBody.message || errorBody.error || response.statusText || 'An API error occurred';
            const err = new Error(msg);
            err.status = response.status;
            err.body = errorBody;
            throw err;
        }

        // Parse and normalize ApiResponse envelope if present
        let body = null;
        try { body = await response.json(); } catch (e) { return null; }
        if (body && typeof body.success === 'boolean') {
            if (!body.success) {
                const err = new Error(body.error || body.message || 'API error');
                err.status = response.status;
                err.body = body;
                throw err;
            }
            // Return the full response object to preserve success field for UI feedback
            return body;
        }
        return body;
    }

    // Normalize patient object received from server to canonical frontend shape
    canonicalizePatient(raw) {
        // If a shared normalizer is available (for Node tests or centralized reuse), use it
        try {
            if (typeof require === 'function') {
                const normalizer = require('./utils/patient-normalize.cjs');
                if (normalizer && typeof normalizer.canonicalizePatient === 'function') {
                    return normalizer.canonicalizePatient(raw);
                }
            }
        } catch (e) {
            // ignore; fall back to inline normalizer
        }

        if (typeof window !== 'undefined' && window.CanonicalizePatient && typeof window.CanonicalizePatient.canonicalizePatient === 'function') {
            return window.CanonicalizePatient.canonicalizePatient(raw);
        }

        if (!raw) return null;
        const patient = Object.assign({}, raw);
        patient.identityNumber = raw.identityNumber || raw.identity_number || raw.tcNumber || raw.tc || null;
        if (raw.dob && raw.dob.indexOf('T') !== -1) {
            patient.dob = raw.dob.split('T')[0];
        }
        if ((!raw.firstName || !raw.lastName) && raw.fullName) {
            const parts = raw.fullName.split(' ');
            patient.firstName = patient.firstName || parts[0];
            patient.lastName = patient.lastName || parts.slice(1).join(' ');
        }
        patient.createdAt = raw.createdAt || raw.created_at || null;
        patient.name = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
        patient.tcNumber = patient.tcNumber || patient.tc || patient.identityNumber || null;
        return patient;
    }

    async get(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Add authorization headers if needed
            }
        });
        
        return this.handleResponse(response);
    }

    async getHearingTests(patientId) {
        const response = await fetch(`${this.baseUrl}/api/patients/${patientId}/hearing-tests`);
        return this.handleResponse(response);
    }

    async getPatient(patientId) {
        const response = await fetch(`${this.baseUrl}/api/patients/${patientId}`);
        const result = await this.handleResponse(response);
        // Extract data field from API response envelope
        return result?.data || result;
    }

    async getPatients() {
        const response = await fetch(`${this.baseUrl}/api/patients`);
        const result = await this.handleResponse(response);
        // result is already the data/unwrapped payload. If it's an array of raw patients, map to canonical
        if (Array.isArray(result)) {
            return result.map(r => this.canonicalizePatient(r));
        }
        return this.canonicalizePatient(result) || result;
    }

    async getAppointments(patientId) {
        const response = await fetch(`${this.baseUrl}/appointments?patient_id=${patientId}`);
        const result = await this.handleResponse(response);
        return result.appointments || result.data || result; // appointments are already canonical
    }

    async getPatientNotes(patientId) {
        const response = await fetch(`${this.baseUrl}/patients/${patientId}/notes`);
        const result = await this.handleResponse(response);
        return result.notes || result.data || result; // notes are already canonical
    }

    async createPatientNote(patientId, noteData) {
        const response = await fetch(`${this.baseUrl}/patients/${patientId}/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(noteData)
        });
        return this.handleResponse(response);
    }

    async updatePatientNote(patientId, noteId, noteData) {
        const response = await fetch(`${this.baseUrl}/patients/${patientId}/notes/${noteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(noteData)
        });
        return this.handleResponse(response);
    }

    async deletePatientNote(patientId, noteId) {
        const response = await fetch(`${this.baseUrl}/patients/${patientId}/notes/${noteId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        return this.handleResponse(response);
    }

    async createPatient(patientData) {
        const response = await fetch(`${this.baseUrl}/api/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(patientData)
        });
        const result = await this.handleResponse(response);
        // Canonicalize single patient object before returning
        return this.canonicalizePatient(result);
    }

    async updatePatient(patientId, patientData) {
        const response = await fetch(`${this.baseUrl}/api/patients/${patientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(patientData)
        });
        const result = await this.handleResponse(response);
        return this.canonicalizePatient(result);
    }

    async deletePatient(patientId) {
        const response = await fetch(`${this.baseUrl}/api/patients/${patientId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return this.handleResponse(response);
    }

    // Device-related methods
    // params: { inventory_only?: boolean, category?: string }
    async getDevices(params = {}) {
        // Build URL with query params
        const url = new URL(`${this.baseUrl}/api/devices`, window?.location?.origin || undefined);
        Object.keys(params || {}).forEach(k => {
            if (params[k] !== undefined && params[k] !== null) url.searchParams.append(k, params[k]);
        });

        const response = await fetch(url.toString());
        const result = await this.handleResponse(response);
        const items = result.devices || result.data || result || [];

        // Canonicalize each device / inventory item for consumers
        function canonicalize(raw) {
            if (!raw) return null;
            const item = {};
            item.id = raw.id || raw.inventoryId || raw.deviceId || raw.code || null;
            item.name = raw.name || raw.deviceName || raw.model || '';
            item.brand = raw.brand || raw.manufacturer || '';
            // Map server response into canonical DTO shape. Do not emit legacy aliases.
            item.category = raw.category || raw.type || '';
            item.availableInventory = raw.availableInventory != null ? raw.availableInventory : (raw.inventory != null ? raw.inventory : 0);
            item.totalInventory = raw.totalInventory != null ? raw.totalInventory : 0;
            item.usedInventory = raw.usedInventory != null ? raw.usedInventory : 0;
            // Remove legacy aliases: do not set item.availableStock/totalStock/usedStock

            item.price = raw.price != null ? raw.price : (raw.listPrice != null ? raw.listPrice : 0);
            item.availableSerials = raw.availableSerials || raw.serials || [];
            item.availableBarcodes = raw.availableBarcodes || raw.barcodes || [];
            item.supplier = raw.supplier || raw.manufacturer || '';
            item.raw = raw;
            return item;
        }

        return Array.isArray(items) ? items.map(canonicalize) : items;
    }

    async createDevice(deviceData) {
        const response = await fetch(`${this.baseUrl}/api/devices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(deviceData)
        });
        return this.handleResponse(response);
    }

    async post(endpoint, data) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    }

    async put(endpoint, data) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    }

    // Add PATCH helper to update partial resources (used by various modules)
    async patch(endpoint, data) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    }

    async delete(endpoint) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        return this.handleResponse(response);
    }

    async updateDevice(deviceId, deviceData) {
        const response = await fetch(`${this.baseUrl}/api/devices/${deviceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(deviceData)
        });
        return this.handleResponse(response);
    }

    async deleteDevice(deviceId) {
        const response = await fetch(`${this.baseUrl}/api/devices/${deviceId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        return this.handleResponse(response);
    }

    // Patient Documents API
    async getPatientDocuments(patientId) {
        const response = await fetch(`${this.baseUrl}/api/patients/${patientId}/documents`);
        return this.handleResponse(response);
    }

    async addPatientDocument(patientId, documentData) {
        const response = await fetch(`${this.baseUrl}/api/patients/${patientId}/documents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(documentData)
        });
        return this.handleResponse(response);
    }

    // Patient Timeline API
    async getPatientTimeline(patientId) {
        const response = await fetch(`${this.baseUrl}/api/patients/${patientId}/timeline`);
        return this.handleResponse(response);
    }

    async addPatientTimelineEvent(patientId, eventData) {
        const response = await fetch(`${this.baseUrl}/api/patients/${patientId}/timeline`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
        });
        return this.handleResponse(response);
    }

    // Patient Devices API
    async getPatientDevices(patientId) {
        const response = await fetch(`${this.baseUrl}/api/patients/${patientId}/devices`);
        const result = await this.handleResponse(response);
        // Extract data field from API response envelope
        return result?.data || result;
    }
}

// Expose a small compatibility wrapper globally to support legacy modules
if (typeof window !== 'undefined') {
    // Constructor (legacy modules may call `new window.ApiClient()`)
    window.ApiClient = window.ApiClient || ApiClient;

    // Also provide a singleton instance under the older APIClient name for quick access
    window.APIClient = window.APIClient || new ApiClient();
}

// Export for CommonJS environments (tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}