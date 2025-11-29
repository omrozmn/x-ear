class PatientTabsNavigationComponent {
    constructor() {
        this.tabs = [
            { id: 'genel', label: 'Genel' },
            { id: 'belgeler', label: 'Belgeler' },
            { id: 'zaman-cizelgesi', label: 'Zaman Çizelgesi' },
            { id: 'satis', label: 'Satış Bilgileri' }
        ];
        this.activeTab = 'genel';
        this.currentPatient = null;
    }

    /**
     * Initialize the component
     * @param {Object} options - Configuration options
     * @param {Object} options.currentPatient - Current patient data
     * @param {string} options.activeTab - Initially active tab ID
     */
    init(options = {}) {
        if (options.currentPatient) {
            this.currentPatient = options.currentPatient;
        }
        
        if (options.activeTab && this.tabs.some(tab => tab.id === options.activeTab)) {
            this.activeTab = options.activeTab;
        }

        // Add event listeners after rendering
        this.addEventListeners();
    }

    /**
     * Add event listeners to the component
     */
    addEventListeners() {
        // Tab click events are handled by the switchTab method
        // which is called directly from the HTML
    }

    /**
     * Switch to a different tab
     * @param {string} tabId - The ID of the tab to switch to
     */
    async switchTab(tabId) {
        if (tabId === this.activeTab) return;
        
        // Update active tab
        this.activeTab = tabId;
        
        // Update tab button states
        const buttons = document.querySelectorAll('.modern-tab-button');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabId) {
                btn.classList.add('active');
            }
        });

        // Load tab content
        await this.loadTabContent(tabId);
    }

    /**
     * Load content for the specified tab
     * @param {string} tabId - The ID of the tab to load content for
     */
    async loadTabContent(tabId) {
        const contentContainer = document.getElementById('tab-content');
        if (!contentContainer) return;

        // Show loading state
        contentContainer.innerHTML = `
            <div class="flex items-center justify-center h-32">
                <div class="loading-spinner mr-3"></div>
                <span class="text-gray-600">İçerik yükleniyor...</span>
            </div>
        `;

        try {
            // Use the PatientDetailsTabLoader to load content
            if (window.patientTabLoader) {
                const content = await window.patientTabLoader.loadTabContent(tabId);
                contentContainer.innerHTML = content;
                
                // Initialize tab-specific functionality
                this.initializeTabFunctionality(tabId);
            } else {
                throw new Error('Tab loader not found');
            }
        } catch (error) {
            console.error('Error loading tab content:', error);
            contentContainer.innerHTML = `
                <div class="p-6 text-center">
                    <p class="text-red-500">Tab içeriği yüklenemedi.</p>
                    <button onclick="patientTabsNavigation.loadTabContent('${tabId}')" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
                        Tekrar Dene
                    </button>
                </div>
            `;
        }
    }

    /**
     * Initialize functionality specific to the active tab
     * @param {string} tabId - The ID of the tab to initialize
     */
    initializeTabFunctionality(tabId) {
        switch (tabId) {
            case 'genel':
                // Initialize general tab functionality
                if (window.initializeGeneralTab) {
                    window.initializeGeneralTab(this.currentPatient);
                }
                break;
            case 'belgeler':
                // Initialize documents tab functionality
                if (window.initializeDocumentsTab) {
                    window.initializeDocumentsTab(this.currentPatient);
                }
                break;
            case 'zaman-cizelgesi':
                // Initialize timeline tab functionality
                if (window.initializeTimelineTab) {
                    window.initializeTimelineTab(this.currentPatient);
                }
                break;
            case 'satis':
                // Initialize sales tab functionality
                if (window.initializeSalesTab) {
                    window.initializeSalesTab(this.currentPatient);
                }
                break;
        }
    }

    /**
     * Render the tabs navigation HTML
     * @returns {string} The HTML for the tabs navigation
     */
    render() {
        return `
            <div class="modern-tabs-container">
                <div class="modern-tabs-header">
                    <nav class="modern-tabs-nav" id="tabNavigation">
                        ${this.tabs.map(tab => `
                            <button class="modern-tab-button ${tab.id === this.activeTab ? 'active' : ''}"
                                    data-tab="${tab.id}"
                                    onclick="patientTabsNavigation.switchTab('${tab.id}')">
                                <span class="tab-label">${tab.label}</span>
                            </button>
                        `).join('')}
                    </nav>
                </div>
                <div class="modern-tabs-content">
                    <div id="tab-content" class="tab-dynamic-content"></div>
                </div>
            </div>
        `;
    }
}

// Create a global instance of the component
window.patientTabsNavigation = new PatientTabsNavigationComponent();

// Export the component for module usage