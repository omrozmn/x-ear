// API Connectivity Test Script
// Test all backend API connections and report status

class APIConnectivityTester {
    constructor() {
        this.results = {
            backend: false,
            database: false,
            endpoints: {},
            services: {},
            recommendations: []
        };
    }

    async runFullTest() {
        console.log('🔍 Starting comprehensive API connectivity test...');

        // Test 1: Backend connectivity
        await this.testBackendConnectivity();

        // Test 2: Database connectivity
        await this.testDatabaseConnectivity();

        // Test 3: Core API endpoints
        await this.testCoreEndpoints();

        // Test 4: Service integrations
        await this.testServiceIntegrations();

        // Generate report
        this.generateReport();

        return this.results;
    }

    async testBackendConnectivity() {
        console.log('📡 Testing backend connectivity...');
        try {
            if (!window.APIConfig) {
                throw new Error('APIConfig not loaded');
            }

            const connected = await window.APIConfig.testConnection();
            this.results.backend = connected;

            if (connected) {
                console.log('✅ Backend connectivity: SUCCESS');
            } else {
                console.log('❌ Backend connectivity: FAILED');
                this.results.recommendations.push('Start the Flask backend server on port 5003');
            }
        } catch (error) {
            console.error('❌ Backend connectivity test failed:', error);
            this.results.backend = false;
            this.results.recommendations.push('Check if Flask backend is running on localhost:5003');
        }
    }

    async testDatabaseConnectivity() {
        console.log('🗄️ Testing database connectivity...');
        try {
            const status = window.APIConfig.getStatus();
            this.results.database = status.database;

            if (status.database) {
                console.log('✅ Database connectivity: SUCCESS');
            } else {
                console.log('⚠️ Database connectivity: NOT VERIFIED');
                this.results.recommendations.push('Initialize database with /init-db endpoint');
            }
        } catch (error) {
            console.error('❌ Database connectivity test failed:', error);
            this.results.database = false;
        }
    }

    async testCoreEndpoints() {
        console.log('🔗 Testing core API endpoints...');

        const endpoints = [
            { name: 'Health Check', url: '/health', method: 'GET' },
            { name: 'Patients API', url: '/api/patients', method: 'GET' },
            { name: 'Appointments API', url: '/api/appointments', method: 'GET' },
            { name: 'Devices API', url: '/api/devices', method: 'GET' },
            { name: 'Dashboard KPIs', url: '/api/dashboard/kpis', method: 'GET' },
            { name: 'OCR Processing', url: '/api/ocr/process', method: 'POST', data: { image_path: '/test/image.jpg', type: 'medical' } },
            { name: 'NLP Processing', url: '/process', method: 'POST', data: { image_path: '/test/image.jpg' } }
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await window.APIConfig.makeRequest(
                    window.APIConfig.BACKEND_BASE_URL + endpoint.url,
                    endpoint.method,
                    endpoint.data || (endpoint.method === 'POST' ? { test: true } : null)
                );

                this.results.endpoints[endpoint.name] = {
                    status: 'success',
                    response: response
                };
                console.log(`✅ ${endpoint.name}: SUCCESS`);

            } catch (error) {
                this.results.endpoints[endpoint.name] = {
                    status: 'failed',
                    error: error.message
                };
                console.log(`❌ ${endpoint.name}: FAILED - ${error.message}`);
                this.results.recommendations.push(`Fix ${endpoint.name} endpoint`);
            }
        }
    }

    async testServiceIntegrations() {
        console.log('🔧 Testing service integrations...');

        // Test Backend Service Manager
        try {
            if (!window.BackendServiceManager) {
                throw new Error('BackendServiceManager not loaded');
            }

            const initialized = await window.BackendServiceManager.initialize();
            this.results.services.BackendServiceManager = initialized;

            if (initialized) {
                console.log('✅ Backend Service Manager: SUCCESS');
            } else {
                console.log('⚠️ Backend Service Manager: PARTIAL');
            }
        } catch (error) {
            console.error('❌ Backend Service Manager test failed:', error);
            this.results.services.BackendServiceManager = false;
            this.results.recommendations.push('Load backend-service-manager.js');
        }

        // Test individual services
        const services = ['patients', 'appointments', 'devices', 'sgk', 'ocr', 'dashboard'];
        for (const serviceName of services) {
            try {
                const service = window.BackendServiceManager.getService(serviceName);
                if (service) {
                    this.results.services[serviceName] = true;
                    console.log(`✅ ${serviceName} service: AVAILABLE`);
                } else {
                    this.results.services[serviceName] = false;
                    console.log(`❌ ${serviceName} service: NOT FOUND`);
                }
            } catch (error) {
                this.results.services[serviceName] = false;
                console.log(`❌ ${serviceName} service: ERROR - ${error.message}`);
            }
        }
    }

    generateReport() {
        console.log('\\n📊 === API CONNECTIVITY TEST REPORT ===');

        console.log('\\n🔗 Backend Status:');
        console.log(`   Backend: ${this.results.backend ? '✅ Connected' : '❌ Disconnected'}`);
        console.log(`   Database: ${this.results.database ? '✅ Connected' : '⚠️ Unknown'}`);

        console.log('\\n📡 API Endpoints:');
        Object.entries(this.results.endpoints).forEach(([name, result]) => {
            console.log(`   ${name}: ${result.status === 'success' ? '✅' : '❌'}`);
        });

        console.log('\\n🔧 Services:');
        Object.entries(this.results.services).forEach(([name, status]) => {
            console.log(`   ${name}: ${status ? '✅' : '❌'}`);
        });

        console.log('\\n💡 Recommendations:');
        if (this.results.recommendations.length === 0) {
            console.log('   ✅ All systems operational!');
        } else {
            this.results.recommendations.forEach(rec => {
                console.log(`   • ${rec}`);
            });
        }

        console.log('\\n=== END REPORT ===\\n');
    }

    // Quick connectivity check
    async quickCheck() {
        try {
            const connected = await window.APIConfig.testConnection();
            return {
                backend: connected,
                status: connected ? 'healthy' : 'disconnected',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                backend: false,
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Global tester instance
const apiTester = new APIConnectivityTester();
window.APITester = apiTester;

// Auto-run quick test on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Running API connectivity test...');
    await apiTester.runFullTest();
});

// Make functions globally available for manual testing
window.testAPIConnectivity = () => apiTester.runFullTest();
window.quickAPICheck = () => apiTester.quickCheck();

console.log('🔧 API Connectivity Tester loaded');
console.log('💡 Use testAPIConnectivity() to run full test');
console.log('💡 Use quickAPICheck() for quick status');