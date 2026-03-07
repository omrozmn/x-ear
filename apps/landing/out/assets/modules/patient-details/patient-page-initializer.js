/**
 * Patient Details Page Initializer
 * Handles the main initialization and component orchestration for patient details page
 */
class PatientPageInitializer {
    constructor() {
        this.currentPatientId = null;
        this.currentPatientData = null;
        this.components = {};
    }

    /**
     * Initialize the page
     */
    async init() {
        // Initialize header
        this.initHeader();

        // Initialize sidebar
        this.initSidebar();

        // Get patient ID from URL
        this.currentPatientId = new URLSearchParams(window.location.search).get('id');
        console.log('Current patient ID from URL:', this.currentPatientId);

        if (!this.currentPatientId) {
            this.showError('Hasta ID belirtilmemiş.');
            return;
        }

        try {
            // Initialize patient details manager
            this.initPatientDetailsManager();

            // Load patient data
            const patient = await this.loadPatientData(this.currentPatientId);

            if (!patient) {
                this.showError(`Hasta bulunamadı. ID: ${this.currentPatientId}`);
                return;
            }

            // Normalize patient data
            this.currentPatientData = this.normalizePatientData(patient);

            // Set current patient globally
            window.patientDetailsManager.currentPatient = this.currentPatientData;
            window.currentPatientData = this.currentPatientData;
            console.log('✅ Current patient set:', this.currentPatientData.id, this.currentPatientData.name);

            // Initialize all components
            await this.initComponents();

            // Render page components
            await this.renderPage();

            // Initialize modern datepicker
            this.initModernDatePicker();

            console.log('✅ Patient details initialized successfully for:', this.currentPatientData.name);

        } catch (error) {
            console.error('❌ Error initializing patient details:', error);
            this.showError('Hasta detayları yüklenirken hata oluştu', error.message);
        }
    }

    /**
     * Initialize header widget
     */
    initHeader() {
        const headerContainer = document.getElementById('header-container');
        if (headerContainer && typeof HeaderWidget !== 'undefined') {
            const header = new HeaderWidget('Hasta Detayları');
            headerContainer.innerHTML = header.render();
            header.initialize();
        }
    }

    /**
     * Initialize sidebar widget
     */
    initSidebar() {
        const sidebarContainer = document.getElementById('sidebar-container');
        if (sidebarContainer) {
            if (typeof window.SidebarWidget !== 'undefined') {
                const sidebar = new SidebarWidget('patients');
                sidebarContainer.innerHTML = sidebar.render();

                // Setup toggle sidebar function
                window.toggleSidebar = () => {
                    const sidebarNav = document.querySelector('.sidebar-nav');
                    const mainContent = document.getElementById('main-content');

                    if (sidebarNav) {
                        sidebarNav.classList.toggle('collapsed');
                        const isCollapsed = sidebarNav.classList.contains('collapsed');

                        localStorage.setItem('sidebarCollapsed', isCollapsed);

                        if (document.documentElement.classList.contains('sidebar-initial-collapsed')) {
                            document.documentElement.classList.remove('sidebar-initial-collapsed');
                        }

                        if (mainContent) {
                            if (isCollapsed) {
                                mainContent.classList.add('sidebar-collapsed');
                                mainContent.classList.remove('sidebar-expanded');
                            } else {
                                mainContent.classList.remove('sidebar-collapsed');
                                mainContent.classList.add('sidebar-expanded');
                            }
                        }

                        if (window.patientListSidebar && typeof window.patientListSidebar.updateLayoutMargins === 'function') {
                            setTimeout(() => {
                                window.patientListSidebar.updateLayoutMargins();
                            }, 50);
                        }
                    }
                };
            } else {
                console.error('SidebarWidget is not defined');
            }
        }
    }

    /**
     * Initialize patient details manager
     */
    initPatientDetailsManager() {
        if (typeof PatientDetailsManager !== 'undefined') {
            window.patientDetailsManager = new PatientDetailsManager();
            console.log('✅ patientDetailsManager initialized');
        } else {
            console.error('❌ PatientDetailsManager class not found');
            // Fallback
            window.patientDetailsManager = {
                currentPatient: null,
                savePatientToStorage: function() {
                    if (this.currentPatient) {
                        const patients = JSON.parse(localStorage.getItem('xear_patients') || '[]');
                        const patientIndex = patients.findIndex(p => p.id === this.currentPatient.id);
                        if (patientIndex >= 0) {
                            patients[patientIndex] = this.currentPatient;
                        } else {
                            patients.push(this.currentPatient);
                        }
                        localStorage.setItem('xear_patients', JSON.stringify(patients));
                        console.log('✅ Patient saved to localStorage (fallback)');
                    }
                }
            };
        }
    }

    /**
     * Load patient data from multiple sources
     * @param {string} patientId - Patient ID
     * @returns {Promise<Object|null>} Patient data or null
     */
    async loadPatientData(patientId) {
        let patient = null;

        // 1. Try localStorage first
        patient = this.loadFromLocalStorage(patientId);
        if (patient) {
            console.log('✅ Found patient in localStorage:', patient.id, patient.name);
            return patient;
        }

        // 2. Try sample data
        if (window.sampleData?.patients) {
            const samplePatient = window.sampleData.patients.find(p => p.id === patientId);
            if (samplePatient) {
                console.log('✅ Using patient from sample data:', samplePatient.id, samplePatient.name);
                return samplePatient;
            }
        }

        // 3. Try API
        try {
            const apiClient = new ApiClient();
            const apiPatient = await apiClient.getPatient(patientId);
            if (apiPatient) {
                // Normalize the patient data to ensure name is properly set
                const normalizedPatient = this.normalizePatientData(apiPatient);
                console.log('✅ Found patient via API:', normalizedPatient.id, normalizedPatient.name);
                return normalizedPatient;
            }
        } catch (apiError) {
            console.warn('❌ API patient lookup failed:', apiError);
        }

        return null;
    }

    /**
     * Load patient from localStorage
     * @param {string} patientId - Patient ID
     * @returns {Object|null} Patient data or null
     */
    loadFromLocalStorage(patientId) {
        try {
            // Use central storage key registry
            const { STORAGE_KEYS } = window.__APP_CONSTANTS__ || { STORAGE_KEYS: { PATIENTS: 'xear_patients', PATIENTS_DATA: 'xear_patients_data', CRM_PATIENTS: window.STORAGE_KEYS?.CRM_PATIENTS || 'xear_crm_patients' } };
            const storageKeys = [STORAGE_KEYS.PATIENTS, STORAGE_KEYS.PATIENTS_DATA, STORAGE_KEYS.CRM_PATIENTS];

            for (const key of storageKeys) {
                try {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            const patient = parsed.find(p => p.id === patientId);
                            if (patient) {
                                return patient;
                            }
                        }
                    }
                } catch (err) {
                    // Ignore parse errors
                }
            }
        } catch (error) {
            console.warn('❌ Error checking localStorage:', error);
        }

        return null;
    }

    /**
     * Normalize patient data
     * @param {Object} patient - Raw patient data
     * @returns {Object} Normalized patient data
     */
    normalizePatientData(patient) {
        // Create name from firstName/lastName if not exists
        if (!patient.name && (patient.firstName || patient.lastName)) {
            patient.name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
        }

        // Synchronize TC fields
        if (patient.tcNumber && !patient.tc) {
            patient.tc = patient.tcNumber;
        } else if (patient.tc && !patient.tcNumber) {
            patient.tcNumber = patient.tc;
        }

        return patient;
    }

    /**
     * Initialize all components
     */
    async initComponents() {
        const apiClient = new ApiClient();
        
        // Expose apiClient globally
        window.apiClient = apiClient;

        // Initialize components
        this.components.patientManagement = new PatientManagementComponent(apiClient);
        this.components.patientNotes = new PatientNotesComponent(apiClient);
        this.components.sgkManagement = new SGKManagementComponent(apiClient);
        
        // Check if DeviceManagementComponent is available
        if (typeof DeviceManagementComponent !== 'undefined') {
            this.components.deviceManagement = new DeviceManagementComponent(apiClient);
        } else {
            console.warn('⚠️ DeviceManagementComponent not available, skipping initialization');
        }
        
        this.components.salesManagement = new SalesManagementComponent(apiClient);
        this.components.invoiceManagement = new InvoiceManagementComponent(apiClient);
        // Initialize centralized invoice widget for reusable invoice form/modal
        if (typeof InvoiceWidget !== 'undefined') {
            this.components.invoiceWidget = new InvoiceWidget(apiClient);
            window.invoiceWidget = this.components.invoiceWidget;
        }
        
        // DocumentManagement is loaded separately from document-management.js
        // It creates window.documentManagement automatically
        this.components.documentManagement = window.documentManagement || null;
        
        this.components.patientAppointments = new PatientAppointmentsComponent(apiClient);

        // Expose to global scope for backward compatibility
        window.patientManagement = this.components.patientManagement;
        window.patientNotes = this.components.patientNotes;
        window.sgkManagement = this.components.sgkManagement;
        window.deviceManagement = this.components.deviceManagement;
        window.salesManagement = this.components.salesManagement;
        window.invoiceManagement = this.components.invoiceManagement;
        // window.documentManagement already set by document-management.js
        window.patientAppointments = this.components.patientAppointments;

        // Initialize patient list sidebar
        this.components.patientListSidebar = new PatientListSidebarComponent(apiClient);
        await this.components.patientListSidebar.init();

        window.patientListSidebar = this.components.patientListSidebar;
    }

    /**
     * Render all page components
     */
    async renderPage() {
        // Render patient list sidebar
        const sidebarHtml = this.components.patientListSidebar.render();
        document.getElementById('patient-list-sidebar-container').innerHTML = sidebarHtml;
        this.components.patientListSidebar.setupEventListeners();

        // Force initial layout update
        setTimeout(() => {
            if (window.patientListSidebar && typeof window.patientListSidebar.updateLayoutMargins === 'function') {
                window.patientListSidebar.updateLayoutMargins();
                console.log('✅ Forced initial layout update for sidebar coordination');
            }
        }, 200);

        // Render header card
        const headerCard = new PatientHeaderCardComponent();
        window.headerCard = headerCard;

        try {
            document.getElementById('patient-header-card-container').innerHTML = 
                await headerCard.renderAsync(this.currentPatientData.id);
        } catch (e) {
            console.warn('headerCard.renderAsync failed, falling back to render', e);
            document.getElementById('patient-header-card-container').innerHTML = 
                headerCard.render(this.currentPatientData);
        }

        // Render stats cards
        const statsCards = new PatientStatsCardsComponent();
        statsCards.init(this.currentPatientData);
        document.getElementById('stats-container').innerHTML = statsCards.render();

        // Render tabs
        window.patientTabsComponent = new PatientTabsComponent('general');
        document.getElementById('tabs-container').innerHTML = window.patientTabsComponent.render();

        // Render tab content
        window.patientTabContentComponent = new PatientTabContentComponent();
        try {
            document.getElementById('tab-content').innerHTML = 
                await window.patientTabContentComponent.renderAsync(this.currentPatientData.id);
        } catch (e) {
            console.warn('patientTabContent.renderAsync failed, falling back to render', e);
            document.getElementById('tab-content').innerHTML = 
                await window.patientTabContentComponent.render(this.currentPatientData);
        }

        // Initialize general tab functionality after initial render
        if (window.initializeGeneralTab) {
            window.initializeGeneralTab(this.currentPatientData);
        }
    }

    /**
     * Initialize modern datepicker
     */
    initModernDatePicker() {
        if (typeof ModernDatePicker !== 'undefined') {
            ModernDatePicker.initializeInputs('.modern-date-input', {
                allowFutureDates: true,
                minDate: new Date(),
                locale: 'tr-TR'
            });
            console.log('✅ Modern DatePicker initialized');
        }
    }

    /**
     * Show error message
     * @param {string} title - Error title
     * @param {string} message - Error message
     */
    showError(title, message = '') {
        const errorHtml = `
            <div class="text-center p-8">
                <div class="text-red-500 mb-4">
                    <svg class="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                    </svg>
                    <p class="mb-2">${title}</p>
                    ${message ? `<p class="text-sm text-gray-600">${message}</p>` : ''}
                </div>
                <button onclick="location.reload()" class="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm">
                    Sayfayı Yenile
                </button>
            </div>
        `;
        document.getElementById('tab-content').innerHTML = errorHtml;
    }
}
