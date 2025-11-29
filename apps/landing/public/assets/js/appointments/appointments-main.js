// Main Appointments Module - Initialization and Coordination
// Use Orval API from window object instead of ES6 imports

class AppointmentsMain {
    constructor() {
        this.initialized = false;
        this.init();
    }

    init() {
        if (this.initialized) return;
        
        document.addEventListener('DOMContentLoaded', async () => {
            await this.initializeModules();
            this.setupEventListeners();
            await this.initializeUI();
            this.initialized = true;
        });
    }

    async initializeModules() {
        // Initialize all modules in correct order
        window.utils = new Utils();
        window.appointmentData = new AppointmentData();
        await window.appointmentData.init(); // Wait for async initialization
        window.calendarManager = new CalendarManager();
        window.appointmentModal = new AppointmentModal();
        window.searchFilter = new SearchFilter();
        window.keyboardNavigation = new KeyboardNavigation();
        window.dragDrop = new DragDrop();
        
        console.log('All appointment modules initialized');
    }

    setupEventListeners() {

        // Today button
        const todayBtn = document.getElementById('today-btn');
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                const today = new Date();
                window.calendarManager.currentMonth = today.getMonth();
                window.calendarManager.currentYear = today.getFullYear();
                window.calendarManager.selectedDate = new Date(today);
                
                if (window.calendarManager.currentView === 'month') {
                    window.calendarManager.generateCalendar();
                } else if (window.calendarManager.currentView === 'day') {
                    window.calendarManager.updateDayView();
                } else if (window.calendarManager.currentView === 'week') {
                    window.calendarManager.updateWeekView();
                }
            });
        }

        // View buttons
        document.getElementById('monthViewBtn')?.addEventListener('click', () => 
            window.calendarManager.switchView('month'));
        document.getElementById('weekViewBtn')?.addEventListener('click', () => 
            window.calendarManager.switchView('week'));
        document.getElementById('dayViewBtn')?.addEventListener('click', () => 
            window.calendarManager.switchView('day'));
        document.getElementById('listViewBtn')?.addEventListener('click', () => 
            window.calendarManager.switchView('list'));

        // Week navigation
        document.getElementById('prev-week')?.addEventListener('click', () => 
            window.calendarManager.previousWeek());
        document.getElementById('next-week')?.addEventListener('click', () => 
            window.calendarManager.nextWeek());

        // Quick add button
        document.getElementById('quick-add-btn')?.addEventListener('click', () => {
            if (window.appointmentModal) {
                // Use today's date for quick add
                const today = window.appointmentData.formatDate(new Date());
                window.appointmentModal.openModal('', '', '', today);
            }
        });
    }

    async initializeUI() {
        // Set default view
        window.calendarManager.switchView('month');
        
        // Populate patient dropdown
        await window.appointmentData.populatePatientDropdown();
        
        // Initialize drag and drop for existing appointments
        window.dragDrop.initializeExistingAppointments();
        
        // Initialize widgets
        this.initializeWidgets();
        
        // API connectivity check
        await this.checkAPIConnectivity();
        
        console.log('Appointments page initialized successfully');
    }

    initializeWidgets() {
        // Initialize sidebar widget
        const sidebarContainer = document.getElementById('sidebar-container');
        if (sidebarContainer && typeof SidebarWidget !== 'undefined') {
            const sidebar = new SidebarWidget('appointments');
            sidebarContainer.innerHTML = sidebar.render();
        }

        // Initialize header widget
        const headerContainer = document.getElementById('header-container');
        if (headerContainer && typeof HeaderWidget !== 'undefined') {
            const header = new HeaderWidget('Randevular');
            headerContainer.innerHTML = header.render();
            header.attachEventListeners();
        }
    }
    
    async checkAPIConnectivity() {
        try {
            let result;
            
            // Try Orval first (preferred method) from window object
            if (window.appointmentsGetAppointments && typeof window.appointmentsGetAppointments === 'function') {
                result = await window.appointmentsGetAppointments();
                console.log('✅ Appointments API connected successfully via Orval');
            } else if (window.APIConfig && typeof window.APIConfig.makeRequest === 'function') {
                // Use APIConfig as fallback
                result = await window.APIConfig.makeRequest(window.APIConfig.endpoints.appointments, 'GET');
                console.log('✅ Appointments API connected successfully via APIConfig');
            } else {
                // No API methods available
                console.warn('⚠️ Neither Orval nor APIConfig available for appointments API');
                return;
            }
            
            // Load appointments from API if available
            if (result && result.success && Array.isArray(result.data)) {
                // Transform API data to match frontend format
                const apiAppointments = result.data.map(apt => ({
                    id: apt.id,
                    patient: apt.patientName || `Patient ${apt.patientId}`,
                    patientId: apt.patientId,
                    patientName: apt.patientName || `Patient ${apt.patientId}`,
                    date: apt.date.includes('T') ? apt.date.split('T')[0] : apt.date, // Ensure YYYY-MM-DD format
                    time: apt.time,
                    type: apt.type,
                    branch: apt.branchId || 'Ana Şube',
                    status: apt.status || 'SCHEDULED', // Use uppercase enum value
                    duration: apt.duration || 30,
                    notes: apt.notes || ''
                }));
                
                // Replace local data with API data (API is source of truth)
                window.appointmentData.appointments = apiAppointments;
                window.appointmentData.filteredAppointments = [...apiAppointments];
                window.appointmentData.updateResultsCount();
                window.appointmentData.refreshCurrentView();
                console.log(`📅 Loaded ${apiAppointments.length} appointments from API, replacing local data`);
            }
        } catch (error) {
            console.warn('⚠️ Appointments API connection failed, using local data:', error.message);
        }
    }
}

// Initialize the application
new AppointmentsMain();