// Backend Service Manager
// Unified interface for all backend API calls

class BackendServiceManager {
    constructor() {
        this.apiConfig = window.APIConfig;
        this.services = {};
        this.initialized = false;
    }

    // Initialize all backend services
    async initialize() {
        if (this.initialized) return true;

        try {
            console.log('🚀 Initializing Backend Service Manager...');

            // Test backend connectivity
            const connected = await this.apiConfig.testConnection();
            if (!connected) {
                console.warn('⚠️ Backend not available, using fallback mode');
                return false;
            }

            // Initialize backend services
            await this.apiConfig.initializeBackend();

            // Initialize individual services
            this.services = {
                patients: new PatientAPIService(),
                appointments: new AppointmentAPIService(),
                devices: new DeviceAPIService(),
                sgk: new SGKAPIService(),
                ocr: new OCRAPIService(),
                dashboard: new DashboardAPIService()
            };

            this.initialized = true;
            console.log('✅ Backend Service Manager initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Backend Service Manager initialization failed:', error);
            return false;
        }
    }

    // Get service instance
    getService(serviceName) {
        return this.services[serviceName] || null;
    }

    // Check if backend is available
    isBackendAvailable() {
        return this.apiConfig && this.apiConfig.connectionStatus.backend;
    }

    // Get connection status
    getStatus() {
        return this.apiConfig ? this.apiConfig.getStatus() : { backend: false };
    }
}

// Individual API Service Classes

class PatientAPIService {
    async getAll() {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.patients);
    }

    async getById(id) {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.patients}/${id}`);
    }

    async create(patientData) {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.patients, 'POST', patientData);
    }

    async update(id, patientData) {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.patients}/${id}`, 'PUT', patientData);
    }

    async delete(id) {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.patients}/${id}`, 'DELETE');
    }

    async search(query, options = {}) {
        // Build query string parameters for safe GET semantics
        const params = new URLSearchParams();
        if (typeof query === 'string') params.append('q', query);
        if (options.page) params.append('page', options.page);
        if (options.per_page) params.append('per_page', options.per_page);
        const url = params.toString() ? `${window.APIConfig.endpoints.patientSearch}?${params.toString()}` : window.APIConfig.endpoints.patientSearch;
        return await window.APIConfig.makeRequest(url, 'GET');
    }
}

class AppointmentAPIService {
    async getAll(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        const url = queryString ? `${window.APIConfig.endpoints.appointments}?${queryString}` : window.APIConfig.endpoints.appointments;
        return await window.APIConfig.makeRequest(url);
    }

    async getById(id) {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.appointments}/${id}`);
    }

    async create(appointmentData) {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.appointments, 'POST', appointmentData);
    }

    async update(id, appointmentData) {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.appointments}/${id}`, 'PUT', appointmentData);
    }

    async delete(id) {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.appointments}/${id}`, 'DELETE');
    }

    async getAvailability(date, duration = 30) {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.appointmentAvailability, 'GET', null, {
            body: JSON.stringify({ date, duration })
        });
    }

    async reschedule(id, newDate, newTime) {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.appointments}/${id}/reschedule`, 'POST', {
            date: newDate,
            time: newTime
        });
    }

    async cancel(id) {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.appointments}/${id}/cancel`, 'POST');
    }

    async complete(id) {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.appointments}/${id}/complete`, 'POST');
    }
}

class DeviceAPIService {
    async getAll(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        const url = queryString ? `${window.APIConfig.endpoints.devices}?${queryString}` : window.APIConfig.endpoints.devices;
        return await window.APIConfig.makeRequest(url);
    }

    async getById(id) {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.devices}/${id}`);
    }

    async create(deviceData) {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.devices, 'POST', deviceData);
    }

    async update(id, deviceData) {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.devices}/${id}`, 'PUT', deviceData);
    }

    async delete(id) {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.devices}/${id}`, 'DELETE');
    }

    async updateStock(id, operation, quantity, reason = '') {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.devices}/${id}/stock-update`, 'POST', {
            operation,
            quantity,
            reason
        });
    }

    async getCategories() {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.deviceCategories);
    }

    async getBrands() {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.deviceBrands);
    }

    async getLowStock() {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.devices}/low-stock`);
    }
}

class SGKAPIService {
    async getDocuments(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        const url = queryString ? `${window.APIConfig.endpoints.sgkDocuments}?${queryString}` : window.APIConfig.endpoints.sgkDocuments;
        return await window.APIConfig.makeRequest(url);
    }

    async createDocument(documentData) {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.sgkDocuments, 'POST', documentData);
    }

    async deleteDocument(id) {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.sgkDocuments}/${id}`, 'DELETE');
    }

    async processDocuments() {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.sgkProcess, 'POST');
    }
}

class OCRAPIService {
    async processDocument(imageData, documentType = 'medical') {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.ocrProcess, 'POST', {
            imageData,
            documentType
        });
    }

    async processText(text, documentType = 'medical') {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.nlpProcess, 'POST', {
            text,
            type: documentType
        });
    }

    async extractEntities(text) {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.nlpEntities, 'POST', {
            text
        });
    }

    async calculateSimilarity(text1, text2) {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.nlpSimilarity, 'POST', {
            text1,
            text2
        });
    }
}

class DashboardAPIService {
    async getKPIs() {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.dashboardKPIs);
    }

    async getPatientTrends() {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.patientTrends);
    }

    async getRevenueTrends() {
        return await window.APIConfig.makeRequest(window.APIConfig.endpoints.revenueTrends);
    }

    async getRecentActivity() {
        return await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.dashboardKPIs.replace('/kpis', '/recent-activity')}`);
    }
}

// Global Backend Service Manager instance
const backendServiceManager = new BackendServiceManager();

// Make it globally available
window.BackendServiceManager = backendServiceManager;

console.log('🔧 Backend Service Manager loaded');