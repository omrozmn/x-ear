// X-Ear CRM - TypeScript Data Loader for HTML Compatibility
// This file loads compiled TypeScript data services and makes them available globally

/**
 * TypeScript Data Loader
 * This module dynamically loads TypeScript module services.
 * 
 * @module typescript-data-loader
 */
console.log('🔄 Loading TypeScript data services...');

// Global state for tracking loaded modules
const libLoadedModules = new Set();

/**
 * Dynamically load TypeScript module data services
 */
function loadTypeScriptData() {
    // Check if data is already loaded
    if (window.dataLoaded) {
        console.log('✅ TypeScript data already loaded');
        return;
    }

    // Load scripts dynamically as modules
    const scripts = [
        '/assets/js/domain/patients/data-service.js',
        '/assets/js/domain/appointments/data-service.js',
        '/assets/js/domain/uts/data-service.js',
        '/assets/js/domain/inventory/data-service.js',
        '/assets/js/domain/sms/data-service.js',
        '/assets/modules/patient-details-manager.js'
    ];

    let loadedCount = 0;
    const totalScripts = scripts.length;
    const libModuleRegistry = {};

    scripts.forEach((scriptPath, index) => {
        // Use dynamic import for ES6 modules
        import(scriptPath).then(module => {
            loadedCount++;
            console.log(`✅ Loaded module ${scriptPath} (${loadedCount}/${totalScripts})`);

            // Store the module
            if (scriptPath.includes('patients')) {
                libModuleRegistry.patients = module;
            } else if (scriptPath.includes('appointments')) {
                libModuleRegistry.appointments = module;
            } else if (scriptPath.includes('uts')) {
                libModuleRegistry.uts = module;
            } else if (scriptPath.includes('inventory')) {
                libModuleRegistry.inventory = module;
            } else if (scriptPath.includes('sms')) {
                libModuleRegistry.sms = module;
            } else if (scriptPath.includes('patient-details-manager')) {
                libModuleRegistry.patientDetailsManager = module;
                // Make PatientDetailsManager globally available
                if (module.PatientDetailsManager) {
                    window.PatientDetailsManager = module.PatientDetailsManager;
                    console.log('✅ PatientDetailsManager made globally available');
                }
            }

            if (loadedCount === totalScripts) {
                // All modules loaded, now initialize
                initializeServices(libModuleRegistry);
            }
        }).catch(error => {
            console.error(`❌ Failed to load module ${scriptPath}:`, error);
            loadedCount++;
            if (loadedCount === totalScripts) {
                initializeServices(libModuleRegistry);
            }
        });
    });

    function initializeServices(modules) {
        try {
            console.log('🔄 Initializing services...');

            // Create global data structure for backward compatibility
            window.sampleData = {
                patients: modules.patients?.initialPatientData || [],
                appointments: modules.appointments?.initialAppointmentData || [],
                utsRecords: modules.uts?.initialUTSDeviceData || [],
                utsDevices: modules.uts?.initialUTSDeviceData || [],
                inventory: modules.inventory?.initialInventoryData || [],
                smsData: modules.sms?.initialSMSData || [],

                // Services
                patientService: modules.patients?.patientDataService || null,
                appointmentService: modules.appointments?.appointmentDataService || null,
                utsService: modules.uts?.utsDataService || null,
                inventoryService: modules.inventory?.inventoryDataService || null,
                smsService: modules.sms?.smsDataService || null
            };

            // Initialize services that have an initialize method
            const servicesToInit = [
                window.sampleData.patientService,
                window.sampleData.appointmentService,
                window.sampleData.utsService,
                window.sampleData.inventoryService,
                window.sampleData.smsService
            ].filter(service => service); // Filter out null services

            // Initialize services asynchronously
            Promise.all(
                servicesToInit.map(async (service, index) => {
                    if (service && typeof service.initialize === 'function') {
                        try {
                            console.log(`Initializing service ${index + 1}...`);
                            await service.initialize();
                            console.log(`✅ Service ${index + 1} initialized`);
                        } catch (error) {
                            console.warn(`⚠️ Service ${index + 1} initialization failed:`, error);
                        }
                    }
                })
            ).then(() => {
                // Update sampleData with fresh data from services after initialization
                if (window.sampleData.inventoryService && typeof window.sampleData.inventoryService.getAll === 'function') {
                    window.sampleData.inventory = window.sampleData.inventoryService.getAll();
                    console.log(`🔄 [INVENTORY] Updated sampleData.inventory with ${window.sampleData.inventory.length} items from service`);
                }
                if (window.sampleData.patientService && typeof window.sampleData.patientService.getAll === 'function') {
                    window.sampleData.patients = window.sampleData.patientService.getAll();
                }
                
                // Legacy global variables for backward compatibility
                window.samplePatients = window.sampleData.patients;
                window.sampleAppointments = window.sampleData.appointments;
                window.sampleUTSRecords = window.sampleData.utsRecords;
                window.sampleUTSDevices = window.sampleData.utsDevices;
                window.sampleInventory = window.sampleData.inventory;
                window.sampleCampaigns = [
                    {
                        id: 'camp_001',
                        name: 'Yeni Hasta Kampanyası',
                        type: 'sms',
                        status: 'completed',
                        sentCount: 150,
                        openRate: 65,
                        clickRate: 25,
                        recipients: 150,
                        message: 'X-Ear\'da yeni işitme cihazı kampanyamız başladı! Ücretsiz danışmanlık için bizi arayın.',
                        createdAt: '2024-01-15T10:00:00Z'
                    },
                    {
                        id: 'camp_002',
                        name: 'Pil Değişim Hatırlatması',
                        type: 'sms',
                        status: 'active',
                        sentCount: 85,
                        openRate: 72,
                        clickRate: 28,
                        recipients: 85,
                        message: 'Merhaba {name}, cihazınızın pil değişim zamanı yaklaştı. Randevu için 0216-XXX-XX-XX arayın.',
                        createdAt: '2024-02-01T09:00:00Z'
                    },
                    {
                        id: 'camp_003',
                        name: 'Deneme Süreci Takibi',
                        type: 'sms',
                        status: 'draft',
                        sentCount: 0,
                        openRate: 0,
                        clickRate: 0,
                        recipients: 0,
                        message: 'Merhaba {name}, cihaz deneme süreciniz nasıl gidiyor? Sorularınız için bize ulaşın.',
                        createdAt: '2024-02-10T14:00:00Z'
                    }
                ];

                // Also set the service instances globally for direct access
                if (window.sampleData.patientService) {
                    window.patientDataService = window.sampleData.patientService;
                    window.PatientDataService = modules.patients.PatientDataService;
                }

                console.log(`✅ TypeScript data services loaded successfully:
                - ${window.sampleData.patients.length} patients
                - ${window.sampleData.appointments.length} appointments
                - ${window.sampleData.utsRecords.length} UTS records
                - ${window.sampleData.inventory.length} inventory items`);

                // Dispatch event to notify other scripts that data is ready
                window.dispatchEvent(new CustomEvent('typeScriptDataLoaded', {
                    detail: {
                        patients: window.sampleData.patients.length,
                        appointments: window.sampleData.appointments.length,
                        utsRecords: window.sampleData.utsRecords.length
                    }
                }));

                console.log('✅ All TypeScript data services loaded and initialized.');
            }).catch(error => {
                console.error('❌ Error initializing services:', error);
                setupFallback();
            });

        } catch (error) {
            console.error('❌ Failed to initialize services:', error);
            setupFallback();
        }
    }

    function setupFallback() {
        // Fallback: Create empty data structures to prevent errors
        window.sampleData = {
            patients: [],
            appointments: [],
            utsRecords: [],
            utsDevices: [],
            inventory: []
        };

        window.samplePatients = [];
        window.sampleAppointments = [];
        window.sampleUTSRecords = [];

            console.warn('⚠️ Using fallback empty data structures');

        // Still dispatch the event
        window.dispatchEvent(new CustomEvent('typeScriptDataLoaded', {
            detail: { patients: 0, appointments: 0, utsRecords: 0 }
        }));
    }
}

// Check if document is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTypeScriptData);
}
else {
    loadTypeScriptData();
}

// Make available in global scope for legacy scripts
window.loadTypeScriptData = loadTypeScriptData;

// CommonJS/Node compatibility fallback (when module.exports is available)
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = { loadTypeScriptData };
}