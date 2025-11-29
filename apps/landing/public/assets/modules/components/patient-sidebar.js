class PatientSidebarComponent {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.patients = [];
        this.filteredPatients = [];
        this.currentPatientId = null;
        this.isCollapsed = false;
    }

    async initialize() {
        try {
            // Get current patient ID from URL
            this.currentPatientId = this.getPatientIdFromURL();

            // Load patients
            await this.loadPatients();

            // Setup search functionality
            this.setupSearch();

            // Setup toggle functionality
            this.setupToggle();

            // Load initial state
            this.loadCollapsedState();

            console.log('✅ Patient sidebar initialized');
        } catch (error) {
            console.error('❌ Error initializing patient sidebar:', error);
        }
    }

    getPatientIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('patientId') || urlParams.get('id') || 'p1';
    }

    async loadPatients() {
        try {
            // Try to get patients from API
            if (this.apiClient) {
                this.patients = await this.apiClient.getPatients();
            }

            // Fallback to localStorage
            if (!this.patients || this.patients.length === 0) {
                const storedPatients = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.PATIENTS || 'xear_patients') || '[]');
                this.patients = storedPatients;
            }

            // Fallback to sample data
            if (!this.patients || this.patients.length === 0) {
                if (window.sampleData && window.sampleData.patients) {
                    this.patients = window.sampleData.patients;
                }
            }

            // Add default patients if none exist
            if (!this.patients || this.patients.length === 0) {
                this.patients = [
                    {
                        id: 'p1',
                        firstName: 'Ahmet',
                        lastName: 'Yılmaz',
                        name: 'Ahmet Yılmaz',
                        phone: '0532 123 4567',
                        status: 'active',
                        conversionStep: 'device_trial'
                    },
                    {
                        id: 'p2',
                        firstName: 'Ayşe',
                        lastName: 'Kaya',
                        name: 'Ayşe Kaya',
                        phone: '0533 234 5678',
                        status: 'active',
                        conversionStep: 'purchased'
                    },
                    {
                        id: 'p3',
                        firstName: 'Mehmet',
                        lastName: 'Demir',
                        name: 'Mehmet Demir',
                        phone: '0534 345 6789',
                        status: 'pending',
                        conversionStep: 'hearing_test_done'
                    }
                ];
            }

            this.filteredPatients = [...this.patients];
            this.render();

            console.log('✅ Patients loaded:', this.patients.length);
        } catch (error) {
            console.error('❌ Error loading patients:', error);
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('patientSearchInput');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            this.filterPatients(query);
        });
    }

    setupToggle() {
        const toggleButton = document.getElementById('patient-list-toggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                this.toggle();
            });
        }

        // Also setup collapsed toggle button
        const collapsedToggleButton = document.getElementById('patient-list-toggle-collapsed');
        if (collapsedToggleButton) {
            collapsedToggleButton.addEventListener('click', () => {
                this.toggle();
            });
        }

        // Setup mobile toggle button
        const mobileToggleButton = document.getElementById('mobile-patient-list-toggle');
        if (mobileToggleButton) {
            mobileToggleButton.addEventListener('click', () => {
                this.toggleMobile();
            });
        }

        // Close sidebar when clicking overlay on mobile
        const sidebarContainer = document.getElementById('patient-list-sidebar-container');
        if (sidebarContainer) {
            sidebarContainer.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && e.target === sidebarContainer) {
                    this.closeMobile();
                }
            });
        }
    }

    filterPatients(query) {
        if (!query) {
            this.filteredPatients = [...this.patients];
        } else {
            this.filteredPatients = this.patients.filter(patient => {
                const name = (patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`).toLowerCase();
                const phone = (patient.phone || '').toLowerCase();
                return name.includes(query) || phone.includes(query);
            });
        }
        this.render();
    }

    toggle() {
        this.isCollapsed = !this.isCollapsed;
        this.saveCollapsedState();
        this.updateLayout();
        console.log('🔄 Patient sidebar toggled:', this.isCollapsed ? 'collapsed' : 'expanded');
    }

    loadCollapsedState() {
        this.isCollapsed = localStorage.getItem(window.STORAGE_KEYS?.PATIENT_LIST_COLLAPSED || 'patientListCollapsed') === 'true';
        this.updateLayout();
    }

    saveCollapsedState() {
        localStorage.setItem(window.STORAGE_KEYS?.PATIENT_LIST_COLLAPSED || 'patientListCollapsed', this.isCollapsed);
    }

    updateLayout() {
        const sidebar = document.getElementById('patient-list-sidebar-container');
        const toggleButton = document.getElementById('patient-list-toggle-collapsed');
        const mobileToggleButton = document.getElementById('mobile-patient-list-toggle');
        const isMobile = window.innerWidth <= 768;

        if (sidebar) {
            if (this.isCollapsed) {
                sidebar.classList.add('collapsed');
            } else {
                sidebar.classList.remove('collapsed');
            }
        }

        if (toggleButton && !isMobile) {
            if (this.isCollapsed) {
                toggleButton.style.display = 'block';
                // Position it correctly based on main sidebar state
                const mainSidebarCollapsed = document.querySelector('.sidebar-nav')?.classList.contains('collapsed');
                toggleButton.style.left = mainSidebarCollapsed ? '90px' : '250px';
            } else {
                toggleButton.style.display = 'none';
            }
        }

        if (mobileToggleButton) {
            if (isMobile) {
                mobileToggleButton.style.display = 'block';
            } else {
                mobileToggleButton.style.display = 'none';
            }
        }

        // Force layout update
        setTimeout(() => {
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.offsetHeight;
            }
        }, 350);
    }

    toggleMobile() {
        const sidebarContainer = document.getElementById('patient-list-sidebar-container');
        if (sidebarContainer) {
            const isOpen = !sidebarContainer.classList.contains('collapsed');
            if (isOpen) {
                this.closeMobile();
            } else {
                this.openMobile();
            }
        }
    }

    openMobile() {
        const sidebarContainer = document.getElementById('patient-list-sidebar-container');
        if (sidebarContainer) {
            sidebarContainer.classList.remove('collapsed');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    }

    closeMobile() {
        const sidebarContainer = document.getElementById('patient-list-sidebar-container');
        if (sidebarContainer) {
            sidebarContainer.classList.add('collapsed');
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    getPatientInitials(patient) {
        const name = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`;
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return (parts[0] || 'H')[0].toUpperCase();
    }

    getStatusClass(status) {
        switch (status) {
            case 'active': return 'active';
            case 'inactive': return 'inactive';
            case 'pending': return 'pending';
            default: return 'pending';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'active': return 'Aktif';
            case 'inactive': return 'Pasif';
            case 'pending': return 'Beklemede';
            default: return 'Bilinmiyor';
        }
    }

    render() {
        const sidebarHtml = `
            <div id="patient-list-sidebar" class="patient-list-sidebar">
                <div class="p-4 border-b border-gray-200">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-lg font-semibold text-gray-900">Hastalar</h3>
                        <button id="patient-list-toggle" class="p-1 rounded hover:bg-gray-100" title="Hasta listesini gizle/göster">
                            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                            </svg>
                        </button>
                    </div>
                    <div class="relative">
                        <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <input type="text" id="patientSearchInput" placeholder="Hasta ara..."
                               class="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    </div>
                </div>
                <div class="patient-list-container" id="patientListContainer">
                    ${this.renderPatientList()}
                </div>
            </div>
        `;

        const container = document.getElementById('patient-list-sidebar-container');
        if (container) {
            container.innerHTML = sidebarHtml;

            // Re-setup event listeners after render
            this.setupSearch();
            this.setupToggle();
        }
    }

    renderPatientList() {
        if (!this.filteredPatients || this.filteredPatients.length === 0) {
            return `
                <div class="text-center py-8 text-gray-500">
                    <p>Henüz hasta bulunmamaktadır.</p>
                </div>
            `;
        }

        return this.filteredPatients.map(patient => {
            const isActive = patient.id === this.currentPatientId;
            const initials = this.getPatientInitials(patient);
            const statusClass = this.getStatusClass(patient.status);

            return `
                <a href="patient-details-modular.html?patientId=${patient.id}" class="patient-list-item ${isActive ? 'active' : ''}" data-patient-id="${patient.id}">
                    <div class="patient-avatar">${initials}</div>
                    <div class="patient-info">
                        <div class="patient-name">${patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim()}</div>
                        <div class="patient-phone">${patient.phone || 'Telefon belirtilmemiş'}</div>
                    </div>
                    <div class="patient-status ${statusClass}" title="${this.getStatusText(patient.status)}"></div>
                </a>
            `;
        }).join('');
    }
}

// Global function for sidebar toggle (for backward compatibility)
window.togglePatientList = function() {
    if (window.patientSidebarComponent) {
        window.patientSidebarComponent.toggle();
    }
};