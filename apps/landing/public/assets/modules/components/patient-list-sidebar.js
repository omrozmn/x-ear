class PatientListSidebarComponent {
    constructor(apiClient) {
        this.apiClient = apiClient;
        // Initialize collapsed state from localStorage - exactly like legacy
        this.isCollapsed = localStorage.getItem(window.STORAGE_KEYS?.PATIENT_LIST_COLLAPSED || 'patientListCollapsed') === 'true';
        this.searchQuery = '';
        this.patients = [];
        this.filteredPatients = [];
        
        // Built-in initial patient data as fallback
        this.initialPatients = [
            {
                id: 'p1',
                firstName: 'Elif',
                lastName: 'Özkan',
                name: 'Elif Özkan',
                tcNumber: '12345678901',
                phone: '0532 123 4567',
                status: 'active'
            },
            {
                id: 'p2',
                firstName: 'Mehmet',
                lastName: 'Demir',
                name: 'Mehmet Demir',
                tcNumber: '98765432109',
                phone: '0542 987 6543',
                status: 'active'
            },
            {
                id: 'p3',
                firstName: 'Ayşe',
                lastName: 'Kaya',
                name: 'Ayşe Kaya',
                tcNumber: '11122233344',
                phone: '0533 111 2233',
                status: 'completed'
            }
        ];
    }

    /**
     * Initialize the component
     */
    async init() {
        await this.loadPatients();
        // Note: render() is now called after loading patients to ensure data is available
    }

    /**
     * Set up event listeners after DOM elements are available
     */
    setupEventListeners() {
        this.addEventListeners();
        this.updateVisibility();
        this.updateCounts();
        
        // Apply initial collapsed state to container
        const container = document.getElementById('patient-list-sidebar-container');
        if (container) {
            if (this.isCollapsed) {
                container.classList.add('collapsed');
            } else {
                container.classList.remove('collapsed');
            }
        }
        
        // Immediately check main sidebar state and apply classes
        const mainSidebar = document.querySelector('.sidebar-nav');
        if (mainSidebar && mainSidebar.classList.contains('collapsed')) {
            console.log('🔧 Main sidebar is collapsed on init, applying main-sidebar-collapsed class');
            if (container) {
                container.classList.add('main-sidebar-collapsed');
            }
        }
        
        // Update layout immediately and after a delay to ensure proper positioning
        this.updateLayoutMargins();
        setTimeout(() => {
            this.updateLayoutMargins();
            console.log('✅ Initial layout margins updated');
        }, 100);
        
        // Additional safety check after longer delay
        setTimeout(() => {
            const sidebar = document.querySelector('.sidebar-nav');
            const patientContainer = document.getElementById('patient-list-sidebar-container');
            if (sidebar && patientContainer && sidebar.classList.contains('collapsed')) {
                if (!patientContainer.classList.contains('main-sidebar-collapsed')) {
                    console.log('🚨 Safety check: Adding missing main-sidebar-collapsed class');
                    patientContainer.classList.add('main-sidebar-collapsed');
                    this.updateLayoutMargins();
                }
            }
        }, 500);
    }

    /**
     * Refresh the patient list in the DOM
     */
    refreshPatientList() {
        const patientListContainer = document.getElementById('patient-list');
        if (!patientListContainer) return;

        let patientListHtml = '';
        
        if (this.filteredPatients.length === 0) {
            patientListHtml = `
                <div class="p-4 text-center text-gray-500">
                    <svg class="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    <p class="text-sm">Hasta bulunamadı</p>
                </div>
            `;
        } else {
            // Get current patient ID from URL
            const currentPatientId = this.getPatientIdFromURL();
            
            patientListHtml = this.filteredPatients.map(patient => {
                const isActive = patient.id === currentPatientId;
                const initials = this.getPatientInitials(patient);
                const statusClass = this.getStatusClass(patient.status);
                
                return `
                    <div class="mb-2 patient-item" data-patient-id="${patient.id}">
                        <a href="patient-details-modular.html?id=${patient.id}" class="patient-list-item ${isActive ? 'active' : ''}" data-patient-id="${patient.id}">
                            <div class="patient-avatar">${initials}</div>
                            <div class="patient-info">
                                <div class="patient-name">${patient.name || `${patient.firstName} ${patient.lastName}`}</div>
                                <div class="patient-phone">${patient.phone || 'Telefon belirtilmemiş'}</div>
                            </div>
                            <div class="patient-status ${statusClass}" title="${this.getStatusText(patient.status)}"></div>
                        </a>
                    </div>
                `;
            }).join('');
        }

        patientListContainer.innerHTML = patientListHtml;
    }

    /**
     * Load patients from storage - exactly matching legacy loadPatientList
     */
    async loadPatients() {
        try {
            // API-first approach
            if (this.apiClient && typeof this.apiClient.getPatients === 'function') {
                try {
                    // Use the proper getPatients method
                    const response = await this.apiClient.getPatients();
                    if (response && Array.isArray(response)) {
                        this.patients = response.map(p => ({ ...p, name: p.name || `${p.firstName||''} ${p.lastName||''}`.trim() }));
                        this.filteredPatients = [...this.patients];
                        // Persist for legacy compatibility
                        try { localStorage.setItem(window.STORAGE_KEYS?.PATIENTS_DATA || 'xear_patients_data', JSON.stringify(this.patients)); } catch(e) { console.warn('persist failed', e); }
                        console.log('✅ Loaded patients from API:', this.patients.length);
                        return;
                    }
                    // If envelope with data array
                    if (response && response.data && Array.isArray(response.data)) {
                        this.patients = response.data.map(p => ({ ...p, name: p.name || `${p.firstName||''} ${p.lastName||''}`.trim() }));
                        this.filteredPatients = [...this.patients];
                        try { localStorage.setItem(window.STORAGE_KEYS?.PATIENTS_DATA || 'xear_patients_data', JSON.stringify(this.patients)); } catch(e) { console.warn('persist failed', e); }
                        console.log('✅ Loaded patients from API (envelope):', this.patients.length);
                        return;
                    }
                } catch (apiError) {
                    console.warn('❌ API patients load failed, falling back to localStorage:', apiError);
                }
            }

            // Fallback to localStorage
            try {
                const storedPatients = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.PATIENTS_DATA || 'xear_patients_data') || '[]');
                if (Array.isArray(storedPatients) && storedPatients.length > 0) {
                    this.patients = storedPatients;
                    this.filteredPatients = [...this.patients];
                    console.log('✅ Loaded patients from localStorage:', this.patients.length);
                    return;
                }
            } catch (storageError) {
                console.warn('❌ localStorage load failed:', storageError);
            }

            // Final fallback to built-in data
            console.log('No data found, using built-in fallback data');
            this.patients = [...this.initialPatients];
            this.filteredPatients = [...this.patients];

        } catch (error) {
            console.error('Error loading patient list:', error);
            // Fallback to built-in data
            this.patients = [...this.initialPatients];
            this.filteredPatients = [...this.patients];
        }
    }

    /**
     * Search patients based on query - exactly like legacy setupPatientSearch
     */
    searchPatients(query) {
        this.searchQuery = query.toLowerCase().trim();
        
        if (!this.patients) return;
        
        const filteredPatients = this.patients.filter(patient => {
            const name = (patient.name || `${patient.firstName} ${patient.lastName}`).toLowerCase();
            const phone = (patient.phone || '').toLowerCase();
            
            return name.includes(this.searchQuery) || phone.includes(this.searchQuery);
        });
        
        this.filteredPatients = filteredPatients;
        this.refreshPatientList();
        this.updateCounts();
    }

    /**
     * Add event listeners - exactly like legacy setupPatientSearch
     */
    addEventListeners() {
        // Search input event listener - exactly like legacy
        const searchInput = document.getElementById('patientSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchPatients(e.target.value);
            });
        }
    }

    /**
     * Toggle the visibility of the patient list sidebar - exactly like legacy togglePatientList
     */
    toggle() {
        const patientSidebarContainer = document.getElementById('patient-list-sidebar-container');
        
        if (patientSidebarContainer) {
            patientSidebarContainer.classList.toggle('collapsed');
            
            // Save state to localStorage - exactly like legacy
            const isCollapsed = patientSidebarContainer.classList.contains('collapsed');
            this.isCollapsed = isCollapsed;
            localStorage.setItem(window.STORAGE_KEYS?.PATIENT_LIST_COLLAPSED || 'patientListCollapsed', isCollapsed);
            
            console.log('🔄 Patient list toggled:', isCollapsed ? 'collapsed' : 'expanded');
            
            // Update layout immediately - exactly like legacy
            this.updateLayoutMargins();
            
            // Force a second update after transition completes - exactly like legacy
            setTimeout(() => {
                this.updateLayoutMargins();
                console.log('✅ Patient list toggle layout update complete');
            }, 350); // Slightly longer than CSS transition
        }
    }

    /**
     * Update the visibility of the sidebar based on collapsed state
     */
    updateVisibility() {
        const sidebarContainer = document.getElementById('patient-list-sidebar-container');
        const toggleButton = document.getElementById('patient-list-toggle-collapsed');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebarContainer && toggleButton && mainContent) {
            if (this.isCollapsed) {
                sidebarContainer.classList.add('collapsed');
                toggleButton.style.display = 'block';
                mainContent.classList.add('expanded');
            } else {
                sidebarContainer.classList.remove('collapsed');
                toggleButton.style.display = 'none';
                mainContent.classList.remove('expanded');
            }
        }
    }

    /**
     * Adjust layout based on sidebar states - exactly like legacy updateLayoutMargins
     */
    updateLayoutMargins() {
        const sidebar = document.querySelector('.sidebar-nav');
        const patientSidebarContainer = document.getElementById('patient-list-sidebar-container');
        const mainContent = document.querySelector('.patient-details-content');
        const headerContainer = document.getElementById('header-container');
        const toggleButton = document.getElementById('patient-list-toggle-collapsed');

        if (!sidebar || !patientSidebarContainer || !mainContent) {
            console.log('Missing elements for layout update');
            return;
        }

        const sidebarCollapsed = sidebar.classList.contains('collapsed');
        const patientListCollapsed = patientSidebarContainer.classList.contains('collapsed');

        console.log('Layout update:', { sidebarCollapsed, patientListCollapsed });

        // Clear all existing classes first - exactly like legacy
        patientSidebarContainer.classList.remove('main-sidebar-collapsed');
        mainContent.classList.remove('main-sidebar-collapsed', 'patient-list-collapsed');
        if (headerContainer) {
            headerContainer.classList.remove('main-sidebar-collapsed', 'patient-list-collapsed');
        }

        // Apply classes to control layout via CSS - exactly like legacy
        if (sidebarCollapsed) {
            console.log('🔧 Applying main-sidebar-collapsed classes');
            patientSidebarContainer.classList.add('main-sidebar-collapsed');
            mainContent.classList.add('main-sidebar-collapsed');
            if (headerContainer) {
                headerContainer.classList.add('main-sidebar-collapsed');
            }
            // Force inline style as backup to ensure positioning
            patientSidebarContainer.style.left = '80px';
        } else {
            console.log('🔧 Main sidebar is expanded, no collapsed classes applied');
            // Reset to default position
            patientSidebarContainer.style.left = '240px';
        }

        if (patientListCollapsed) {
            mainContent.classList.add('patient-list-collapsed');
            if (headerContainer) {
                headerContainer.classList.add('patient-list-collapsed');
            }
            // Show toggle button when patient list is collapsed - exactly like legacy
            if (toggleButton) {
                toggleButton.style.display = 'block';
                // Position it correctly based on main sidebar state - exactly like legacy
                toggleButton.style.left = sidebarCollapsed ? '90px' : '250px';
            }
        } else {
            // Hide toggle button when patient list is open - exactly like legacy
            if (toggleButton) {
                toggleButton.style.display = 'none';
            }
        }

        // Force a reflow to ensure the layout changes take effect immediately - exactly like legacy
        mainContent.offsetHeight;

        // Remove any inline styles that might override CSS - exactly like legacy
        patientSidebarContainer.style.width = '';
        patientSidebarContainer.style.left = '';
        mainContent.style.marginLeft = '';

        console.log('✅ Layout updated - Classes applied:', {
            patientSidebarContainerClasses: Array.from(patientSidebarContainer.classList),
            mainContentClasses: Array.from(mainContent.classList),
            headerContainerClasses: headerContainer ? Array.from(headerContainer.classList) : 'N/A'
        });

        console.log('CSS classes applied, toggle button visibility updated');
    }

    /**
     * Update the patient count display
     */
    updateCounts() {
        const countElement = document.querySelector('.text-xs.text-gray-500');
        if (countElement) {
            countElement.textContent = `${this.filteredPatients.length} / ${this.patients.length} hasta`;
        }
    }

    /**
     * Render the patient list items - exactly matching legacy renderPatientList
     */
    renderPatientList() {
        const patientListContainer = document.getElementById('patient-list');
        if (!patientListContainer) return;

        // Get current patient ID from URL - exactly like legacy
        const currentPatientId = this.getPatientIdFromURL();
        
        if (this.filteredPatients.length === 0) {
            patientListContainer.innerHTML = `
                <div class="p-4 text-center text-gray-500">
                    <svg class="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    <p class="text-sm">Hasta bulunamadı</p>
                </div>
            `;
            return;
        }

        const patientListItems = this.filteredPatients.map(patient => {
            const isActive = patient.id === currentPatientId;
            const initials = this.getPatientInitials(patient);
            const statusClass = this.getStatusClass(patient.status);
            
            return `
                <div class="mb-2 patient-item" data-patient-id="${patient.id}">
                    <a href="patient-details-modular.html?id=${patient.id}" class="patient-list-item ${isActive ? 'active' : ''}" data-patient-id="${patient.id}">
                        <div class="patient-avatar">${initials}</div>
                        <div class="patient-info">
                            <div class="patient-name">${patient.name || `${patient.firstName} ${patient.lastName}`}</div>
                            <div class="patient-phone">${patient.phone || 'Telefon belirtilmemiş'}</div>
                        </div>
                        <div class="patient-status ${statusClass}" title="${this.getStatusText(patient.status)}"></div>
                    </a>
                </div>
            `;
        }).join('');

        patientListContainer.innerHTML = patientListItems;
    }

    /**
     * Get patient ID from URL - exactly like legacy
     */
    getPatientIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    /**
     * Get patient initials - exactly like legacy getPatientInitials
     */
    getPatientInitials(patient) {
        const name = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`;
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return (parts[0] || 'H')[0].toUpperCase();
    }

    /**
     * Get status CSS class - exactly like legacy getStatusClass
     */
    getStatusClass(status) {
        switch (status) {
            case 'active': return 'active';
            case 'inactive': return 'inactive';
            case 'pending': return 'pending';
            default: return 'pending';
        }
    }

    /**
     * Get status text - exactly like legacy getStatusText
     */
    getStatusText(status) {
        switch (status) {
            case 'active': return 'Aktif';
            case 'inactive': return 'Pasif';
            case 'pending': return 'Beklemede';
            default: return 'Bilinmiyor';
        }
    }

    /**
     * Render the patient list sidebar HTML - with exact legacy styling
     * @returns {string} The HTML for the patient list sidebar
     */
    render() {
        console.log('PatientListSidebarComponent.render() called');
        
        // Get current patient ID from URL
        const currentPatientId = this.getPatientIdFromURL();
        
        // Generate patient list items
        const patientListItems = this.filteredPatients.map(patient => {
            const isActive = patient.id === currentPatientId;
            const initials = this.getPatientInitials(patient);
            const statusClass = this.getStatusClass(patient.status);
            
            return `
                <div class="mb-2 patient-item" data-patient-id="${patient.id}">
                    <a href="patient-details-modular.html?id=${patient.id}" class="patient-list-item ${isActive ? 'active' : ''}" data-patient-id="${patient.id}">
                        <div class="patient-avatar">${initials}</div>
                        <div class="patient-info">
                            <div class="patient-name">${patient.name || `${patient.firstName} ${patient.lastName}`}</div>
                            <div class="patient-phone">${patient.phone || 'Telefon belirtilmemiş'}</div>
                        </div>
                        <div class="patient-status ${statusClass}" title="${this.getStatusText(patient.status)}"></div>
                    </a>
                </div>
            `;
        }).join('');
        
        return `
            <div id="patient-list-sidebar" class="patient-list-sidebar" style="width: 320px; height: 100vh; background: white; border-right: 1px solid #e5e7eb; overflow-y: auto;">
                <div class="p-4 border-b border-gray-200">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Hastalar</h3>
                        <button onclick="window.patientListSidebar.toggle()" class="p-1 rounded hover:bg-gray-100" title="Hasta listesini gizle/göster">
                            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="relative mb-4">
                        <input type="text" id="patientSearchInput" placeholder="Ara..." class="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg">
                        <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </div>
                    
                    <div class="mt-4 pt-3 border-t border-gray-200">
                        <p class="text-xs text-gray-500">${this.filteredPatients.length} / ${this.patients.length} hasta</p>
                    </div>
                </div>
                
                <div class="patient-list-container p-2" id="patient-list">
                    ${patientListItems || '<div class="p-4 text-center text-gray-500"><p class="text-sm">Hasta bulunamadı</p></div>'}
                </div>
            </div>
        `;
    }
}

// Create a global instance of the component (will be initialized later)
// window.patientListSidebar = new PatientListSidebarComponent();

// Export the component for module usage