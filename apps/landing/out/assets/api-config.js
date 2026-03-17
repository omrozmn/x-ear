// API Configuration Manager
// Centralized configuration for all backend API connections

(function() {
  // Central runtime API base configuration.
  // Override by setting window.API_BASE_URL before this script runs, or set environment-specific value during deploy.
  // NOTE: Do not include /api suffix - it will be added by the endpoint paths
  
  // Environment-based configuration
  const getApiBaseUrl = () => {
    // 1. Check if explicitly set via window.API_BASE_URL
    if (typeof window !== 'undefined' && window.API_BASE_URL) {
      return window.API_BASE_URL;
    }
    
    // 2. Check for environment variable (for deployment)
    if (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL) {
      return process.env.API_BASE_URL;
    }
    
    // 3. Auto-detect based on current hostname for common deployment scenarios
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      
      // Production detection patterns
      if (hostname.includes('xear.app') || hostname.includes('x-ear.com')) {
        return `${protocol}//api.${hostname}`;
      }
      
      // Staging detection patterns
      if (hostname.includes('staging') || hostname.includes('dev')) {
        return `${protocol}//${hostname.replace('app', 'api')}`;
      }
      
      // Local development with different ports
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const port = window.location.port;
        // Ensure string comparison and handle empty port case
        if (port === '8080' || port === '9001' || port === '8000' || !port) {
          return 'http://localhost:5003';
        }
      }
    }
    
    // 4. Default fallback
    return 'http://localhost:5003';
  };
  
  if (typeof window !== 'undefined') {
    window.API_BASE_URL = getApiBaseUrl();
    console.log('🌐 [API-CONFIG] Base URL set to:', window.API_BASE_URL);
  }

  // APIConfig class with full functionality
  class APIConfig {
    constructor() {
        // Backend service ports
        this.BACKEND_PORT = 5003;
        this.FRONTEND_PORT = 8080;

        // Base URLs - use the dynamically determined API_BASE_URL
        this.BACKEND_BASE_URL = window.API_BASE_URL || `http://localhost:${this.BACKEND_PORT}`;
        this.FRONTEND_BASE_URL = `http://localhost:${this.FRONTEND_PORT}`;

        // API endpoints
        this.endpoints = {
            // Core CRUD endpoints
            patients: `${this.BACKEND_BASE_URL}/api/patients`,
            appointments: `${this.BACKEND_BASE_URL}/api/appointments`,
            devices: `${this.BACKEND_BASE_URL}/api/devices`,
            campaigns: `${this.BACKEND_BASE_URL}/api/campaigns`,
            suppliers: `${this.BACKEND_BASE_URL}/api/suppliers`,
            inventory: `${this.BACKEND_BASE_URL}/api/inventory`,

            // Specialized endpoints
            patientSearch: `${this.BACKEND_BASE_URL}/api/patients/search`,
            appointmentAvailability: `${this.BACKEND_BASE_URL}/api/appointments/availability`,
            deviceCategories: `${this.BACKEND_BASE_URL}/api/inventory/categories`,
            deviceBrands: `${this.BACKEND_BASE_URL}/api/inventory/brands`,

            // SGK endpoints
            sgkDocuments: `${this.BACKEND_BASE_URL}/api/sgk/documents`,
            sgkUpload: `${this.BACKEND_BASE_URL}/api/sgk/upload`,
            sgkProcess: `${this.BACKEND_BASE_URL}/api/automation/sgk/process`,

            // OCR and NLP endpoints
            ocrProcess: `${this.BACKEND_BASE_URL}/api/ocr/process`,
            nlpProcess: `${this.BACKEND_BASE_URL}/process`,
            nlpEntities: `${this.BACKEND_BASE_URL}/entities`,
            nlpSimilarity: `${this.BACKEND_BASE_URL}/similarity`,

            // Dashboard and analytics
            dashboardKPIs: `${this.BACKEND_BASE_URL}/api/dashboard/kpis`,
            patientTrends: `${this.BACKEND_BASE_URL}/api/dashboard/charts/patient-trends`,
            revenueTrends: `${this.BACKEND_BASE_URL}/api/dashboard/charts/revenue-trends`,

            // System endpoints
            health: `${this.BACKEND_BASE_URL}/api/health`,
            config: `${this.BACKEND_BASE_URL}/api/config`,
            initialize: `${this.BACKEND_BASE_URL}/initialize`,
            automationStatus: `${this.BACKEND_BASE_URL}/api/automation/status`,
            automationLogs: `${this.BACKEND_BASE_URL}/api/automation/logs`
        };

        // Connection status
        this.connectionStatus = {
            backend: false,
            database: false,
            ocr: false,
            lastChecked: null
        };
    }

    // Test backend connectivity
    async testConnection() {
        try {
            console.log('🔍 Testing backend connectivity...');

            const response = await fetch(this.endpoints.health, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                const responseData = await response.json();
                const data = responseData.data || responseData; // Handle envelope format
                this.connectionStatus.backend = true;
                this.connectionStatus.database = data.database_connected || false;
                this.connectionStatus.ocr = data.ocr_available || false;
                this.connectionStatus.lastChecked = new Date();

                console.log('✅ Backend connection successful:', {
                    backend: this.connectionStatus.backend,
                    database: this.connectionStatus.database,
                    ocr: this.connectionStatus.ocr
                });

                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.warn('❌ Backend connection failed:', error.message);
            this.connectionStatus.backend = false;
            this.connectionStatus.database = false;
            this.connectionStatus.ocr = false;
            this.connectionStatus.lastChecked = new Date();
            return false;
        }
    }

    // Get connection status
    getStatus() {
        return { ...this.connectionStatus };
    }

    // Make authenticated request (add auth headers if needed)
    async makeRequest(endpoint, method = 'GET', data = null, options = {}) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            // Explicitly set CORS mode to make cross-origin failures reproducible in logs.
            mode: 'cors',
            // If your backend requires cookies or HTTP-only session cookies, enable credentials and configure backend accordingly.
            // credentials: 'include',
            ...options
        };

        // Attach token if present
        try {
            const token = (typeof localStorage !== 'undefined') ? localStorage.getItem(window.STORAGE_KEYS.ACCESS_TOKEN) : null;
            if (token) config.headers['Authorization'] = `Bearer ${token}`;
        } catch (e) {
            // ignore localStorage errors
        }

        // Add Idempotency-Key header for POST requests if not already present
        if (method === 'POST' && !config.headers['Idempotency-Key']) {
            config.headers['Idempotency-Key'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(endpoint, config);

            if (!response.ok) {
                // on 401, dispatch an event so UI can react (redirect to login, suppress success toasts etc.)
                if (response.status === 401) {
                    try { window.dispatchEvent(new CustomEvent('api:unauthorized', { detail: { endpoint, method } })); } catch(e){}
                }

                // Read the response text once
                const responseText = await response.text();
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

                // Try to parse as JSON for better error messages
                try {
                    const errJson = JSON.parse(responseText);
                    const errMsg = errJson.error || errJson.message || JSON.stringify(errJson);
                    const errTrace = errJson.trace ? `\n${errJson.trace}` : '';
                    errorMessage = `HTTP ${response.status}: ${errMsg}${errTrace}`;
                } catch (parseErr) {
                    // If not JSON, use the raw text
                    if (responseText) {
                        errorMessage = `HTTP ${response.status}: ${responseText}`;
                    }
                }

                const err = new Error(errorMessage);
                err.status = response.status;
                err.body = responseText;
                throw err;
            }

            // If no content (204) return null
            if (response.status === 204) return null;

            // Try to parse JSON safely
            const contentType = response.headers.get('Content-Type') || '';
            if (contentType.includes('application/json')) {
                const result = await response.json();
                return result;
            } else {
                const text = await response.text();
                return text;
            }
        } catch (error) {
            // Improve detection of CORS-like failures
            try {
                const errMsg = error && error.message ? error.message : String(error);
                if (/Failed to fetch|TypeError|NetworkError|CORS|preflight/i.test(errMsg)) {
                    console.error(`❌ API Request likely failed due to network/CORS/preflight: ${endpoint}`, error);
                } else {
                    console.error(`❌ API Request failed: ${endpoint}`, error);
                }
            } catch (logErr) {
                console.error(`❌ API Request failed and error logging failed for: ${endpoint}`, error);
            }
            throw error;
        }
    }

    // Initialize backend services
    async initializeBackend() {
        try {
            console.log('🚀 Initializing backend services...');

            // Initialize database
            await this.makeRequest(`${this.BACKEND_BASE_URL}/init-db`, 'POST');

            // Initialize NLP service
            await this.makeRequest(this.endpoints.initialize, 'POST');

            console.log('✅ Backend services initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Backend initialization failed:', error);
            return false;
        }
    }
  }

  // Global API configuration instance
  const apiConfig = new APIConfig();

  // Make it globally available
  window.APIConfig = apiConfig;

  console.log('🔧 API Configuration loaded:', apiConfig.BACKEND_BASE_URL);

  // Demo Mode functionality (complete implementation from old file)
  (function(){
    try {
        apiConfig.DEMO_DB = apiConfig.DEMO_DB || { patients: [], appointments: [], sales: [], sgk_documents: [], inventory: [], suppliers: [], cash_register: [], invoices: [] };
        apiConfig.DEMO_SEED_VERSION = 'v1';
        apiConfig._realMakeRequest = apiConfig.makeRequest.bind(apiConfig);

        apiConfig.enableDemoMode = async function(options = {}) {
            try {
                if (this._demoEnabled) return true;
                this._demoEnabled = true;

                this.DEMO_WRITES_SIMULATED = (window.DEMO_WRITES_SIMULATED === true) || (localStorage.getItem && localStorage.getItem('DEMO_WRITES_SIMULATED') === '1') || !!options.simulateWrites;

                const seedPaths = {
                    patients: '/demo/seed/patients.json',
                    appointments: '/demo/seed/appointments.json',
                    sales: '/demo/seed/sales.json',
                    sgk_documents: '/demo/seed/sgk_documents.json',
                    inventory: '/demo/seed/inventory.json',
                    suppliers: '/demo/seed/suppliers.json',
                    cash_register: '/demo/seed/cash_register.json',
                    invoices: '/demo/seed/invoices.json'
                };

                const loadPromises = Object.keys(seedPaths).map(async (k) => {
                    try {
                        const resp = await fetch(seedPaths[k]);
                        if (!resp.ok) throw new Error(`Failed to fetch ${seedPaths[k]}`);
                        const json = await resp.json();
                        this.DEMO_DB[k] = Array.isArray(json) ? json : (json.data || []);
                    } catch (err) {
                        console.warn('Demo seed load failed for', k, err);
                        this.DEMO_DB[k] = this.DEMO_DB[k] || [];
                    }
                });

                await Promise.all(loadPromises);

                try { localStorage.setItem('demoState_v1', JSON.stringify({ seedVersion: this.DEMO_SEED_VERSION, data: this.DEMO_DB })); } catch(e){}

                // Mirror demo collections into localStorage keys the UI may read directly
                try {
                    // Helper to mirror specific collections into keys
                    this._mirrorDemoToLocal = this._mirrorDemoToLocal || function() {
                        try {
                            const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch(e){} };
                            // Patients (existing keys kept for backward compatibility)
                            const patientsPayload = JSON.stringify(this.DEMO_DB.patients || []);
                            [window.STORAGE_KEYS?.PATIENTS_DATA || 'xear_patients_data', window.STORAGE_KEYS?.PATIENTS || 'xear_patients', window.STORAGE_KEYS?.CRM_PATIENTS || 'xear_crm_patients', 'xear_patients_list'].forEach(k => safeSet(k, patientsPayload));

                            // Inventory, suppliers, cash register and invoices
                            safeSet('xear_inventory', JSON.stringify(this.DEMO_DB.inventory || []));
                            safeSet('xear_suppliers', JSON.stringify(this.DEMO_DB.suppliers || []));
                            safeSet('xear_cash_register', JSON.stringify(this.DEMO_DB.cash_register || []));
                            safeSet(window.STORAGE_KEYS?.INVOICES || 'xear_invoices', JSON.stringify(this.DEMO_DB.invoices || []));

                            // Keep single-source demoState_v1 for full snapshot
                            safeSet('demoState_v1', JSON.stringify({ seedVersion: this.DEMO_SEED_VERSION, data: this.DEMO_DB }));
                        } catch (e) { /* ignore */ }
                    };
                    // Immediately mirror after seed load
                    this._mirrorDemoToLocal();
                } catch (e) { /* ignore */ }

                this._realMakeRequest = this.makeRequest.bind(this);
                const self = this;
                this.makeRequest = async function(endpoint, method = 'GET', data = null, options = {}) {
                    return await self._demoRouter(endpoint, method, data, options);
                };

                window.DEMO_MODE = true;
                console.log('🧪 Demo mode enabled (client-side) — in-memory seeding loaded.');
                return true;
            } catch (e) {
                console.error('Failed to enable demo mode', e);
                return false;
            }
        };

        apiConfig._makeEnvelope = function(payload) {
            const envelope = { success: !!(payload && payload.success), requestId: `demo_${Date.now()}_${Math.floor(Math.random()*10000)}`, timestamp: new Date().toISOString() };
            if (payload && payload.success) envelope.data = payload.data;
            if (payload && payload.meta) envelope.meta = payload.meta;
            if (payload && payload.error) { envelope.success = false; envelope.error = payload.error; }
            return envelope;
        };

        apiConfig._demoRouter = async function(endpoint, method = 'GET', body = null, options = {}) {
            try {
                let path = endpoint;
                // Normalize endpoint to extract path - handle both full URLs and relative paths
                try { 
                    const u = new URL(endpoint, this.BACKEND_BASE_URL || window.API_BASE_URL || 'http://localhost:5003'); 
                    path = u.pathname + (u.search || ''); 
                } catch (err) { 
                    const idx = endpoint.indexOf('/api/'); 
                    if (idx >= 0) path = endpoint.slice(idx); 
                }
                const p = path.replace(/^\/+/, '');

                const findId = (arr, id) => arr.find(x => String(x.id) === String(id));
                const extractIdFromPath = (patt) => { const m = p.match(new RegExp(patt)); return m && m[1]; };

                // GET endpoints for all collections
                if (method === 'GET' && /\/api\/patients(\?|$)/.test(path)) { const data = this.DEMO_DB.patients || []; return this._makeEnvelope({ success: true, data, meta: { total: data.length } }); }
                if (method === 'GET' && /\/api\/patients\/([^\/\?]+)/.test(path)) { const id = extractIdFromPath('\\/api\\/patients\\/([^\\/\\?]+)'); const item = findId(this.DEMO_DB.patients || [], id); if (!item) return this._makeEnvelope({ success: false, error: { code: 'NOT_FOUND', message: 'Patient not found' } }); return this._makeEnvelope({ success: true, data: item }); }
                if (method === 'GET' && /\/api\/appointments(\?|$)/.test(path)) { const data = this.DEMO_DB.appointments || []; return this._makeEnvelope({ success: true, data, meta: { total: data.length } }); }
                if (method === 'GET' && /\/api\/inventory(\?|$)/.test(path)) { const data = this.DEMO_DB.inventory || []; return this._makeEnvelope({ success: true, data, meta: { total: data.length } }); }
                if (method === 'GET' && /\/api\/inventory\/([^\/\?]+)/.test(path)) { const id = extractIdFromPath('\\/api\\/inventory\\/([^\\/\\?]+)'); const item = findId(this.DEMO_DB.inventory || [], id); if (!item) return this._makeEnvelope({ success: false, error: { code: 'NOT_FOUND', message: 'Inventory item not found' } }); return this._makeEnvelope({ success: true, data: item }); }
                if (method === 'GET' && /\/api\/suppliers(\?|$)/.test(path)) { const data = this.DEMO_DB.suppliers || []; return this._makeEnvelope({ success: true, data, meta: { total: data.length } }); }
                if (method === 'GET' && /\/api\/suppliers\/([^\/\?]+)/.test(path)) { const id = extractIdFromPath('\\/api\\/suppliers\\/([^\\/\\?]+)'); const item = findId(this.DEMO_DB.suppliers || [], id); if (!item) return this._makeEnvelope({ success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found' } }); return this._makeEnvelope({ success: true, data: item }); }
                if (method === 'GET' && /\/api\/cash_register(\?|$)/.test(path)) { const data = this.DEMO_DB.cash_register || []; return this._makeEnvelope({ success: true, data, meta: { total: data.length } }); }
                if (method === 'GET' && /\/api\/cash_register\/([^\/\?]+)/.test(path)) { const id = extractIdFromPath('\\/api\\/cash_register\\/([^\\/\\?]+)'); const item = findId(this.DEMO_DB.cash_register || [], id); if (!item) return this._makeEnvelope({ success: false, error: { code: 'NOT_FOUND', message: 'Cash register entry not found' } }); return this._makeEnvelope({ success: true, data: item }); }
                if (method === 'GET' && /\/api\/invoices(\?|$)/.test(path)) { const data = this.DEMO_DB.invoices || []; return this._makeEnvelope({ success: true, data, meta: { total: data.length } }); }
                if (method === 'GET' && /\/api\/invoices\/([^\/\?]+)/.test(path)) { const id = extractIdFromPath('\\/api\\/invoices\\/([^\\/\\?]+)'); const item = findId(this.DEMO_DB.invoices || [], id); if (!item) return this._makeEnvelope({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } }); return this._makeEnvelope({ success: true, data: item }); }

                // Device categories/brands derived from inventory (demo mode)
                if (method === 'GET' && /\/api\/devices\/categories(\?|$)/.test(path)) {
                    const inv = this.DEMO_DB.inventory || [];
                    const set = new Set();
                    inv.forEach(x => { if (x && x.category) set.add(String(x.category).trim()); });
                    const data = Array.from(set);
                    return this._makeEnvelope({ success: true, data, meta: { total: data.length } });
                }
                if (method === 'GET' && /\/api\/devices\/brands(\?|$)/.test(path)) {
                    const inv = this.DEMO_DB.inventory || [];
                    const set = new Set();
                    inv.forEach(x => { if (x && x.brand) set.add(String(x.brand).trim()); });
                    const data = Array.from(set);
                    return this._makeEnvelope({ success: true, data, meta: { total: data.length } });
                }

                // Write operations (POST/PUT/PATCH/DELETE)
                if (/POST|PUT|PATCH|DELETE/.test(method)) {
                    if (this.DEMO_WRITES_SIMULATED) {
                        // Inventory CRUD
                        if (/\/api\/inventory(\/?$|\/)/.test(path)) {
                            if (method === 'POST') { 
                                const newItem = Object.assign({}, body || {}); 
                                newItem.id = newItem.id || `item_demo_${Date.now()}_${Math.floor(Math.random()*9999)}`; 
                                this.DEMO_DB.inventory = this.DEMO_DB.inventory || []; 
                                this.DEMO_DB.inventory.unshift(newItem); 
                                try { localStorage.setItem('demoState_v1', JSON.stringify({ seedVersion: this.DEMO_SEED_VERSION, data: this.DEMO_DB })); } catch(e){} 
                                try { if (this._mirrorDemoToLocal) this._mirrorDemoToLocal(); } catch(e){} 
                                return this._makeEnvelope({ success: true, data: newItem }); 
                            }
                            if (method === 'PUT' || method === 'PATCH') { 
                                const id = extractIdFromPath('\\/api\\/inventory\\/([^\\/]+)'); 
                                const item = findId(this.DEMO_DB.inventory || [], id); 
                                if (item) { 
                                    Object.assign(item, body || {}); 
                                    try { localStorage.setItem('demoState_v1', JSON.stringify({ seedVersion: this.DEMO_SEED_VERSION, data: this.DEMO_DB })); } catch(e){} 
                                    return this._makeEnvelope({ success: true, data: item }); 
                                } 
                                return this._makeEnvelope({ success: false, error: { code: 'NOT_FOUND', message: 'Inventory item not found' } }); 
                            }
                            if (method === 'DELETE') { 
                                const id = extractIdFromPath('\\/api\\/inventory\\/([^\\/]+)'); 
                                this.DEMO_DB.inventory = (this.DEMO_DB.inventory || []).filter(x => String(x.id) !== String(id)); 
                                try { localStorage.setItem('demoState_v1', JSON.stringify({ seedVersion: this.DEMO_SEED_VERSION, data: this.DEMO_DB })); } catch(e){} 
                                return this._makeEnvelope({ success: true, data: null }); 
                            }
                        }
                        // Patients CRUD
                        if (/\/api\/patients(\/?$|\/)/.test(path)) {
                            if (method === 'POST') { const newItem = Object.assign({}, body || {}); newItem.id = newItem.id || `p_demo_${Date.now()}_${Math.floor(Math.random()*9999)}`; this.DEMO_DB.patients = this.DEMO_DB.patients || []; this.DEMO_DB.patients.unshift(newItem); try { localStorage.setItem('demoState_v1', JSON.stringify({ seedVersion: this.DEMO_SEED_VERSION, data: this.DEMO_DB })); } catch(e){} try { if (this._mirrorDemoToLocal) this._mirrorDemoToLocal(); } catch(e){} return this._makeEnvelope({ success: true, data: newItem }); }
                            if (method === 'PUT' || method === 'PATCH') { const id = extractIdFromPath('\\/api\\/patients\\/([^\\/]+)'); const item = findId(this.DEMO_DB.patients || [], id); if (item) { Object.assign(item, body || {}); try { localStorage.setItem('demoState_v1', JSON.stringify({ seedVersion: this.DEMO_SEED_VERSION, data: this.DEMO_DB })); } catch(e){} return this._makeEnvelope({ success: true, data: item }); } return this._makeEnvelope({ success: false, error: { code: 'NOT_FOUND', message: 'Patient not found' } }); }
                            if (method === 'DELETE') { const id = extractIdFromPath('\\/api\\/patients\\/([^\\/]+)'); this.DEMO_DB.patients = (this.DEMO_DB.patients || []).filter(x => String(x.id) !== String(id)); try { localStorage.setItem('demoState_v1', JSON.stringify({ seedVersion: this.DEMO_SEED_VERSION, data: this.DEMO_DB })); } catch(e){} return this._makeEnvelope({ success: true, data: null }); }
                        }
                        // Similar CRUD operations for other collections...
                        // (Suppliers, Cash Register, Invoices - keeping the same pattern)
                        return this._makeEnvelope({ success: true, data: { simulated: true } });
                    } else {
                        return this._makeEnvelope({ success: false, error: { code: 'DEMO_READ_ONLY', message: 'Demo mode is read-only' } });
                    }
                }
                
                return this._makeEnvelope({ success: false, error: { code: 'DEMO_NO_ROUTE', message: 'No demo route for this endpoint' } });
            } catch (err) { 
                return this._makeEnvelope({ success: false, error: { code: 'DEMO_ERROR', message: String(err) } }); 
            }
        };
        
        // Auto-enable demo mode ONLY if URL param is set (not localStorage)
        (function(){ 
            try { 
                const params = new URLSearchParams(location.search); 
                if (params.get('demo') === '1') { 
                    apiConfig.enableDemoMode(); 
                    console.log('🧪 Demo mode enabled via URL parameter ?demo=1');
                } else {
                    console.log('🔧 Normal mode - no demo parameter found');
                }
            } catch (e){
                console.warn('Demo mode detection failed:', e);
            } 
        })();
    } catch (err) { 
        console.warn('demo init failed', err); 
    }
  })();

})();
