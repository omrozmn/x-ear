class TabNavigationWidget {
    constructor(containerId, tabs, options = {}) {
        this.containerId = containerId;
        this.tabs = tabs;
        this.activeTab = tabs[0]?.id || null;
        this.useDynamicLoading = options.useDynamicLoading || false;
        this.currentPatient = options.currentPatient || null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="modern-tabs-container">
                <div class="modern-tabs-header">
                    <nav class="modern-tabs-nav" id="tabNavigation">
                        ${this.tabs.map(tab => `
                            <button class="modern-tab-button ${tab.id === this.activeTab ? 'active' : ''}"
                                    data-tab="${tab.id}"
                                    onclick="window.tabNavigation.switchTab('${tab.id}')">
                                <span class="tab-label">${tab.label}</span>
                            </button>
                        `).join('')}
                    </nav>
                </div>
                <div class="modern-tabs-content">
                    ${this.useDynamicLoading ?
                        '<div id="tab-content" class="tab-dynamic-content"></div>' :
                        this.tabs.map(tab => `
                            <div id="${tab.id}" class="modern-tab-content ${tab.id === this.activeTab ? 'active' : ''}">
                                ${tab.content || ''}
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;

        // Store reference for global access
        window.tabNavigation = this;

        // Load initial tab if using dynamic loading
        if (this.useDynamicLoading && this.activeTab) {
            this.loadTabContent(this.activeTab);
        }
    }

    async switchTab(tabId) {
        if (this.useDynamicLoading) {
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
        } else {
            // Hide all tabs
            this.tabs.forEach(tab => {
                const tabElement = document.getElementById(tab.id);
                if (tabElement) {
                    tabElement.classList.remove('active');
                }
            });

            // Show active tab
            const activeTabElement = document.getElementById(tabId);
            if (activeTabElement) {
                activeTabElement.classList.add('active');
            }

            // Update tab button states
            const buttons = document.querySelectorAll('.modern-tab-button');
            buttons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.tab === tabId) {
                    btn.classList.add('active');
                }
            });
        }

        this.activeTab = tabId;
    }

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
            // Check if we have a tab loader available
            if (window.patientDetailsTabLoader) {
                const content = await window.patientDetailsTabLoader.loadTab(tabId, this.currentPatient);
                contentContainer.innerHTML = content;
                
                // Initialize tab-specific functionality
                await window.patientDetailsTabLoader.initializeTab(tabId, this.currentPatient);
            } else {
                // Fallback to static content if available
                const tab = this.tabs.find(t => t.id === tabId);
                if (tab && tab.content) {
                    contentContainer.innerHTML = tab.content;
                } else {
                    contentContainer.innerHTML = `
                        <div class="text-center text-gray-500 py-8">
                            <p>Bu sekme henüz hazır değil.</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading tab content:', error);
            contentContainer.innerHTML = `
                <div class="text-center text-red-500 py-8">
                    <p>İçerik yüklenirken bir hata oluştu.</p>
                    <button onclick="window.tabNavigation.loadTabContent('${tabId}')" class="btn-secondary mt-2">
                        Tekrar Dene
                    </button>
                </div>
            `;
        }
    }

    // Helper method to reinitialize the widget
    reinitialize() {
        if (this.tabs.length === 0) {
            this.activeTab = null;
        } else if (!this.tabs.find(tab => tab.id === this.activeTab)) {
            this.activeTab = this.tabs[0].id;
        }
        this.render();
    }

    static createPatientDetailsTabs(containerId, patient = null) {
        const tabs = [
            {
                id: 'general',
                label: 'Genel',
                content: null, // Will be loaded dynamically
                loadFromFile: true
            },
            {
                id: 'devices',
                label: 'Cihazlar',
                content: null, // Will be loaded dynamically
                loadFromFile: true
            },
            {
                id: 'sales',
                label: 'Satışlar',
                content: null, // Will be loaded dynamically
                loadFromFile: true
            },
            {
                id: 'sgk',
                label: 'SGK',
                content: null, // Will be loaded dynamically
                loadFromFile: true
            },
            {
                id: 'documents',
                label: 'Belgeler',
                content: null, // Will be loaded dynamically
                loadFromFile: true
            },
            {
                id: 'timeline',
                label: 'Zaman Çizelgesi',
                content: null, // Will be loaded dynamically
                loadFromFile: true
            }
        ];

        return new TabNavigationWidget(containerId, tabs, {
            useDynamicLoading: true,
            currentPatient: patient
        });
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TabNavigationWidget;
}
