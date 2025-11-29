class PatientTabLoaderComponent {
    constructor() {
        this.contentCache = new Map();
        this.currentPatient = null;
    }

    /**
     * Initialize the component with patient data
     * @param {Object} patientData - The patient data object
     */
    init(patientData) {
        this.currentPatient = patientData;
    }

    /**
     * Load tab content for the specified tab
     * @param {string} tabId - The ID of the tab to load content for
     * @returns {Promise<string>} The HTML content for the tab
     */
    async loadTabContent(tabId) {
        console.log(`🔄 Loading tab '${tabId}' content`);
        
        try {
            // Check if content is cached
            if (this.contentCache.has(tabId)) {
                return this.contentCache.get(tabId);
            }
            
            // Generate content based on tab ID
            const content = this.generateTabContent(tabId);
            
            // Cache the content
            this.contentCache.set(tabId, content);
            
            return content;
        } catch (error) {
            console.error(`❌ Error loading tab ${tabId}:`, error);
            return this.getFallbackContent(tabId);
        }
    }

    /**
     * Generate content for the specified tab
     * @param {string} tabId - The ID of the tab to generate content for
     * @returns {string} The HTML content for the tab
     */
    generateTabContent(tabId) {
        switch (tabId) {
            case 'genel':
                return this.generateGeneralTabContent();
            case 'belgeler':
                return this.generateDocumentsTabContent();
            case 'zaman-cizelgesi':
                return this.generateTimelineTabContent();
            case 'satis':
                return this.generateSalesTabContent();
            default:
                return this.getFallbackContent(tabId);
        }
    }

    /**
     * Generate content for the general tab
     * @returns {string} The HTML content for the general tab
     */
    generateGeneralTabContent() {
        return `
            <div class="space-y-6">
                <!-- Hasta Notları Card -->
                <div class="bg-white rounded-lg border border-gray-200 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Hasta Notları</h3>
                        <button onclick="addPatientNote()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors">
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Not Ekle
                        </button>
                    </div>
                    <div id="quickNotes">
                        <!-- Notes will be loaded here -->
                        <div class="text-center py-8 text-gray-500">
                            Notlar yükleniyor...
                        </div>
                    </div>
                </div>

                <!-- Quick Action Buttons -->
                <div class="flex space-x-4 mb-6">
                    <button onclick="addAppointment('${this.currentPatient?.id || ''}')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        Yeni Randevu
                    </button>
                    <button onclick="createSale()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                        </svg>
                        Yeni Satış
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Generate content for the documents tab
     * @returns {string} The HTML content for the documents tab
     */
    generateDocumentsTabContent() {
        return `
            <div class="space-y-6">
                <!-- Upload Section -->
                <div class="bg-white rounded-lg border border-gray-200 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Belge Yönetimi</h3>
                        <button onclick="uploadDocument()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                            </svg>
                            Belge Yükle
                        </button>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <button onclick="uploadSpecificDocument('sgk_report')" class="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div class="flex items-center">
                                <svg class="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <div>
                                    <h4 class="font-medium text-gray-900">SGK Raporu</h4>
                                    <p class="text-sm text-gray-600">İşitme cihazı raporu yükle</p>
                                </div>
                            </div>
                        </button>
                        
                        <button onclick="uploadSpecificDocument('audiogram')" class="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div class="flex items-center">
                                <svg class="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                                <div>
                                    <h4 class="font-medium text-gray-900">Odyogram</h4>
                                    <p class="text-sm text-gray-600">İşitme testi sonuçları</p>
                                </div>
                            </div>
                        </button>
                        
                        <button onclick="uploadSpecificDocument('prescription')" class="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div class="flex items-center">
                                <svg class="w-8 h-8 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                <div>
                                    <h4 class="font-medium text-gray-900">Reçete</h4>
                                    <p class="text-sm text-gray-600">Doktor reçetesi</p>
                                </div>
                            </div>
                        </button>
                    </div>
                    
                    <!-- Document List -->
                    <div id="documentList" class="mt-6">
                        <div class="text-center py-8 text-gray-500">
                            Belgeler yükleniyor...
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate content for the timeline tab
     * @returns {string} The HTML content for the timeline tab
     */
    generateTimelineTabContent() {
        return `
            <div class="space-y-6">
                <div class="bg-white rounded-lg border border-gray-200 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Zaman Çizelgesi</h3>
                        <button onclick="addTimelineEvent()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors">
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Etkinlik Ekle
                        </button>
                    </div>
                    
                    <div id="timelineContainer" class="mt-6">
                        <div class="text-center py-8 text-gray-500">
                            Zaman çizelgesi yükleniyor...
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate content for the sales tab
     * @returns {string} The HTML content for the sales tab
     */
    generateSalesTabContent() {
        return `
            <div class="space-y-6">
                <div class="bg-white rounded-lg border border-gray-200 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Satış Bilgileri</h3>
                        <button onclick="createNewSale()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors">
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Yeni Satış
                        </button>
                    </div>
                    
                    <div id="salesContainer" class="mt-6">
                        <div class="text-center py-8 text-gray-500">
                            Satış bilgileri yükleniyor...
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get fallback content for when tab content cannot be loaded
     * @param {string} tabId - The ID of the tab
     * @returns {string} The fallback HTML content
     */
    getFallbackContent(tabId) {
        return `
            <div class="p-6 text-center">
                <p class="text-red-500">Tab içeriği yüklenemedi: ${tabId}</p>
                <button onclick="patientTabLoader.loadTabContent('${tabId}')" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
                    Tekrar Dene
                </button>
            </div>
        `;
    }
}

// Create a global instance of the component
window.patientTabLoader = new PatientTabLoaderComponent();

// Export the component for module usage