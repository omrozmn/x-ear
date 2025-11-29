// X-Ear CRM - Global Search Manager with NLP Enhancement
class GlobalSearchManager {
    constructor(options = {}) {
        this.searchIndex = {};
        this.searchResults = [];
        this.currentFocus = -1;
        this.isSearchOpen = false;
        this.searchCache = new Map();
        
        // NLP Integration
        this.nlpService = null;
        this.nlpEnabled = options.enableNLP !== false;
        this.intelligentSearch = options.intelligentSearch !== false;
        this.debug = options.debug || false;
        
        // Intent-based search results
        this.intentHandlers = new Map();
        this.searchHistory = [];
        this.maxHistorySize = 50;
        
        this.init();
    }

    init() {
        this.buildSearchIndex();
        this.setupKeyboardShortcuts();
        this.createSearchModal();
        this.setupEventListeners();
        this.initializeNLP();
        this.setupIntentHandlers();
    }

    /**
     * Initialize NLP service for intelligent search
     */
    async initializeNLP() {
        if (this.nlpEnabled && typeof PaddleNLPService !== 'undefined') {
            try {
                console.log('🧠 Initializing NLP for Global Search...');
                this.nlpService = new PaddleNLPService({ 
                    debug: this.debug,
                    language: 'tr' 
                });
                await this.nlpService.initialize();
                console.log('✅ Global Search NLP initialized');
            } catch (error) {
                console.warn('⚠️ NLP initialization failed for Global Search:', error);
                this.nlpEnabled = false;
            }
        }
    }

    /**
     * Setup intent handlers for different types of searches
     */
    setupIntentHandlers() {
        // Patient search intents
        this.intentHandlers.set('FIND_PATIENTS', async (intent) => {
            const results = await this.searchPatients(intent);
            return this.formatSearchResults(results, '👥 Hastalar', 'patients');
        });

        // Document search intents
        this.intentHandlers.set('SEARCH_DOCUMENTS', async (intent) => {
            const results = await this.searchDocuments(intent);
            return this.formatSearchResults(results, '📄 Belgeler', 'documents');
        });

        // Appointment search intents
        this.intentHandlers.set('SHOW_APPOINTMENTS', async (intent) => {
            const results = await this.searchAppointments(intent);
            return this.formatSearchResults(results, '📅 Randevular', 'appointments');
        });

        // Device inquiry intents
        this.intentHandlers.set('DEVICE_INQUIRY', async (intent) => {
            const results = await this.searchDevices(intent);
            return this.formatSearchResults(results, '🦻 Cihazlar', 'devices');
        });

        // SGK related intents
        this.intentHandlers.set('SGK_RELATED', async (intent) => {
            const results = await this.searchSGK(intent);
            return this.formatSearchResults(results, '🏥 SGK', 'sgk');
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+K or Cmd+K for global search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openSearch();
            }

            // Ctrl+Shift+P for command palette
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                this.openCommandPalette();
            }

            // Ctrl+G for go to patient
            if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
                e.preventDefault();
                this.openPatientSearch();
            }

            // Escape to close search
            if (e.key === 'Escape' && this.isSearchOpen) {
                e.preventDefault();
                this.closeSearch();
            }

            // Arrow navigation in search results
            if (this.isSearchOpen) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.navigateResults(1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateResults(-1);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.selectResult();
                }
            }
        });
    }

    createSearchModal() {
        const modalHTML = `
            <div id="global-search-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
                <div class="flex items-start justify-center pt-20">
                    <div class="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4">
                        <!-- Search Header -->
                        <div class="border-b p-4">
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                    </svg>
                                </div>
                                <input
                                    id="global-search-input"
                                    type="text"
                                    placeholder="Hasta, randevu, ürün, sayfa arayın... (Ctrl+K)"
                                    class="block w-full pl-10 pr-3 py-3 border-0 text-lg placeholder-gray-500 focus:outline-none focus:ring-0"
                                    autocomplete="off"
                                />
                            </div>
                        </div>

                        <!-- Search Results -->
                        <div id="search-results-container" class="max-h-96 overflow-y-auto">
                            <!-- Default state -->
                            <div id="search-default" class="p-6 text-center text-gray-500">
                                <div class="space-y-4">
                                    <p class="text-lg">🔍 Arama yapmaya başlayın</p>
                                    <div class="grid grid-cols-2 gap-3 text-sm">
                                        <div class="space-y-2">
                                            <p class="font-medium text-gray-700">Hızlı Erişim:</p>
                                            <div class="space-y-1 text-left">
                                                <p><kbd class="kbd">Alt+1</kbd> Panel</p>
                                                <p><kbd class="kbd">Alt+2</kbd> Hastalar</p>
                                                <p><kbd class="kbd">Alt+3</kbd> Randevular</p>
                                                <p><kbd class="kbd">Alt+4</kbd> Envanter</p>
                                            </div>
                                        </div>
                                        <div class="space-y-2">
                                            <p class="font-medium text-gray-700">Arama Türleri:</p>
                                            <div class="space-y-1 text-left">
                                                <p><kbd class="kbd">Ctrl+G</kbd> Hasta Git</p>
                                                <p><kbd class="kbd">Ctrl+Shift+P</kbd> Komutlar</p>
                                                <p><kbd class="kbd">Escape</kbd> Kapat</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Search Results -->
                            <div id="search-results" class="hidden"></div>
                        </div>

                        <!-- Search Footer -->
                        <div class="border-t p-3 text-xs text-gray-500 bg-gray-50 rounded-b-lg">
                            <div class="flex justify-between items-center">
                                <span>↑↓ gezinmek için • Enter seçmek için • Escape kapatmak için</span>
                                <span id="search-stats"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    setupEventListeners() {
        const searchInput = document.getElementById('global-search-input');
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 200);
        });

        // Close on outside click
        document.getElementById('global-search-modal').addEventListener('click', (e) => {
            if (e.target.id === 'global-search-modal') {
                this.closeSearch();
            }
        });
    }

    buildSearchIndex() {
        this.searchIndex = {
            patients: this.indexPatients(),
            appointments: this.indexAppointments(),
            inventory: this.indexInventory(),
            pages: this.indexPages(),
            commands: this.indexCommands()
        };
    }

    indexPatients() {
        const patients = Storage.load('patients') || [];
        return patients.map(patient => ({
            type: 'patient',
            id: patient.id,
            title: `${patient.firstName} ${patient.lastName}`,
            subtitle: `TC: ${patient.tcNo} • Tel: ${patient.phone}`,
            description: `${patient.city || ''} ${patient.notes || ''}`,
            icon: '👤',
            action: () => this.navigateToPatient(patient.id),
            keywords: [patient.firstName, patient.lastName, patient.tcNo, patient.phone, patient.email].filter(Boolean)
        }));
    }

    indexAppointments() {
        const appointments = Storage.load('appointments') || [];
        const patients = Storage.load('patients') || [];
        const patientMap = Object.fromEntries(patients.map(p => [p.id, p]));

        return appointments.map(appointment => {
            const patient = patientMap[appointment.patientId];
            const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Bilinmeyen Hasta';
            
            return {
                type: 'appointment',
                id: appointment.id,
                title: `${new Date(appointment.dateTime).toLocaleString('tr-TR')} - ${patientName}`,
                subtitle: `Durum: ${this.getAppointmentStatusText(appointment.status)}`,
                description: appointment.notes || '',
                icon: '📅',
                action: () => this.navigateToAppointment(appointment.id),
                keywords: [patientName, appointment.status, appointment.notes].filter(Boolean)
            };
        });
    }

    indexInventory() {
        const inventory = Storage.load('inventory') || [];
        return inventory.map(item => ({
            type: 'inventory',
            id: item.id,
            title: item.name,
            subtitle: `Stok: ${item.inventory} • Fiyat: ${item.price}₺`,
            description: `${item.category} • ${item.brand || ''}`,
            icon: '📦',
            action: () => this.navigateToInventoryItem(item.id),
            keywords: [item.name, item.category, item.brand, item.barcode].filter(Boolean)
        }));
    }

    indexPages() {
        return [
            {
                type: 'page',
                id: 'dashboard',
                title: 'Panel',
                subtitle: 'Ana sayfa ve özet bilgiler',
                icon: '🏠',
                action: () => this.navigateToPage('/dashboard.html'),
                keywords: ['panel', 'ana sayfa', 'dashboard', 'home']
            },
            {
                type: 'page',
                id: 'patients',
                title: 'Hastalar',
                subtitle: 'Hasta listesi ve yönetimi',
                icon: '👥',
                action: () => this.navigateToPage('/patients.html'),
                keywords: ['hastalar', 'patients', 'hasta listesi']
            },
            {
                type: 'page',
                id: 'appointments',
                title: 'Randevular',
                subtitle: 'Randevu takvibi ve yönetimi',
                icon: '📅',
                action: () => this.navigateToPage('/appointments.html'),
                keywords: ['randevular', 'appointments', 'takvim', 'calendar']
            },
            {
                type: 'page',
                id: 'inventory',
                title: 'Envanter',
                subtitle: 'Ürün stok yönetimi',
                icon: '📦',
                action: () => this.navigateToPage('/inventory.html'),
                keywords: ['envanter', 'inventory', 'stok', 'ürünler']
            },
            {
                type: 'page',
                id: 'automation',
                title: 'Otomasyon',
                subtitle: 'Otomatik süreç yönetimi',
                icon: '⚙️',
                action: () => this.navigateToPage('/automation.html'),
                keywords: ['otomasyon', 'automation', 'otomatik']
            },
            {
                type: 'page',
                id: 'campaigns',
                title: 'Kampanyalar',
                subtitle: 'SMS ve pazarlama kampanyaları',
                icon: '📢',
                action: () => this.navigateToPage('/campaigns.html'),
                keywords: ['kampanyalar', 'campaigns', 'sms', 'pazarlama']
            },
            {
                type: 'page',
                id: 'reports',
                title: 'Raporlar',
                subtitle: 'İstatistik ve analiz raporları',
                icon: '📊',
                action: () => this.navigateToPage('/reports.html'),
                keywords: ['raporlar', 'reports', 'istatistik', 'analiz']
            },
            {
                type: 'page',
                id: 'sgk',
                title: 'SGK İşlemleri',
                subtitle: 'Sosyal güvenlik işlemleri',
                icon: '🏥',
                action: () => this.navigateToPage('/sgk.html'),
                keywords: ['sgk', 'sosyal güvenlik', 'cihaz', 'pil']
            },
            {
                type: 'page',
                id: 'settings',
                title: 'Ayarlar',
                subtitle: 'Sistem ayarları ve konfigürasyon',
                icon: '⚙️',
                action: () => this.navigateToPage('/settings.html'),
                keywords: ['ayarlar', 'settings', 'konfigürasyon']
            }
        ];
    }

    indexCommands() {
        return [
            {
                type: 'command',
                id: 'new-patient',
                title: 'Yeni Hasta Ekle',
                subtitle: 'Sisteme yeni hasta kaydı oluştur',
                icon: '👤➕',
                action: () => this.executeCommand('new-patient'),
                keywords: ['yeni hasta', 'hasta ekle', 'new patient']
            },
            {
                type: 'command',
                id: 'new-appointment',
                title: 'Yeni Randevu',
                subtitle: 'Randevu takviminde yeni randevu oluştur',
                icon: '📅➕',
                action: () => this.executeCommand('new-appointment'),
                keywords: ['yeni randevu', 'randevu ekle', 'new appointment']
            },
            {
                type: 'command',
                id: 'send-sms',
                title: 'SMS Gönder',
                subtitle: 'Hastalara SMS mesajı gönder',
                icon: '📱',
                action: () => this.executeCommand('send-sms'),
                keywords: ['sms gönder', 'mesaj', 'send sms']
            },
            {
                type: 'command',
                id: 'export-data',
                title: 'Veri Dışa Aktar',
                subtitle: 'Sistem verilerini Excel formatında dışa aktar',
                icon: '📤',
                action: () => this.executeCommand('export-data'),
                keywords: ['dışa aktar', 'export', 'excel', 'backup']
            },
            {
                type: 'command',
                id: 'automation-status',
                title: 'Otomasyon Durumu',
                subtitle: 'Aktif otomasyon süreçlerini görüntüle',
                icon: '⚙️📊',
                action: () => this.executeCommand('automation-status'),
                keywords: ['otomasyon durumu', 'automation status']
            }
        ];
    }

    async performSearch(query) {
        if (!query.trim()) {
            this.showDefaultState();
            return;
        }

        const startTime = Date.now();
        console.log('🔍 Performing search:', query);

        // Add to search history
        this.addToSearchHistory(query);

        // Check cache first
        const cacheKey = query.toLowerCase();
        if (this.searchCache.has(cacheKey)) {
            this.displayResults(this.searchCache.get(cacheKey), query);
            return;
        }

        let results = [];

        try {
            // Use NLP-enhanced search if available
            if (this.nlpEnabled && this.nlpService && this.nlpService.isReady()) {
                results = await this.performIntelligentSearch(query);
            } else {
                results = await this.performLegacySearch(query);
            }

            // Cache results
            this.searchCache.set(cacheKey, results);
            
            const searchTime = Date.now() - startTime;
            console.log(`✅ Search completed in ${searchTime}ms, found ${results.length} results`);

            this.displayResults(results, query);

        } catch (error) {
            console.error('❌ Search failed:', error);
            // Fall back to legacy search
            results = await this.performLegacySearch(query);
            this.displayResults(results, query);
        }
    }

    /**
     * Perform intelligent search using NLP intent recognition
     */
    async performIntelligentSearch(query) {
        console.log('🧠 Using NLP-enhanced search');
        
        try {
            // Parse query intent
            const intent = await this.nlpService.parseIntent(query);
            console.log('🎯 Detected intent:', intent.type, 'Confidence:', intent.confidence);

            let results = [];

            // Handle specific intents
            if (intent.type !== 'UNKNOWN' && intent.confidence > 0.6) {
                const intentHandler = this.intentHandlers.get(intent.type);
                if (intentHandler) {
                    const intentResults = await intentHandler(intent);
                    results.push(...intentResults);
                }
            }

            // Always include general search results for completeness
            const generalResults = await this.performSemanticSearch(query, intent);
            results.push(...generalResults);

            // Remove duplicates and sort by relevance
            results = this.deduplicateResults(results);
            results = this.sortResultsByRelevance(results, query, intent);

            // Add intent information for display
            if (intent.type !== 'UNKNOWN') {
                results.unshift({
                    type: 'intent',
                    title: this.getIntentDisplayText(intent.type),
                    subtitle: `Anlam: ${intent.type.toLowerCase().replace('_', ' ')}`,
                    description: `Güven: ${(intent.confidence * 100).toFixed(0)}%`,
                    icon: '🧠',
                    action: 'intent',
                    score: 1000, // High priority for intent display
                    intent: intent
                });
            }

            return results;

        } catch (error) {
            console.warn('⚠️ NLP search failed, falling back to semantic search:', error);
            return await this.performSemanticSearch(query);
        }
    }

    /**
     * Perform semantic search using NLP similarity
     */
    async performSemanticSearch(query, intent = null) {
        const results = [];
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

        // Search through all indexed content with semantic enhancement
        for (const [category, items] of Object.entries(this.searchIndex)) {
            for (const item of items) {
                // Calculate traditional relevance
                const traditionalScore = this.calculateRelevanceScore(item, searchTerms);
                
                // Calculate semantic similarity if NLP is available
                let semanticScore = 0;
                if (this.nlpService && this.nlpService.isReady()) {
                    try {
                        const itemText = [item.title, item.subtitle, item.description].join(' ');
                        const similarity = await this.nlpService.calculateSemanticSimilarity(query, itemText);
                        semanticScore = similarity.similarity;
                    } catch (error) {
                        // Silently fall back to traditional scoring
                    }
                }

                // Combine scores (traditional 40%, semantic 60%)
                const combinedScore = (traditionalScore * 0.4) + (semanticScore * 0.6);

                // Apply intent-based boosting
                let intentBoost = 0;
                if (intent && intent.type !== 'UNKNOWN') {
                    intentBoost = this.calculateIntentBoost(item, intent);
                }

                const finalScore = combinedScore + intentBoost;

                if (finalScore > 0.1) { // Lower threshold for semantic search
                    results.push({ 
                        ...item, 
                        score: finalScore,
                        traditionalScore,
                        semanticScore,
                        intentBoost,
                        searchMethod: 'semantic'
                    });
                }
            }
        }

        return results;
    }

    /**
     * Legacy search method (original implementation)
     */
    async performLegacySearch(query) {
        console.log('📚 Using legacy search');
        
        const results = [];
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

        // Search through all indexed content
        Object.values(this.searchIndex).forEach(items => {
            items.forEach(item => {
                const score = this.calculateRelevanceScore(item, searchTerms);
                if (score > 0) {
                    results.push({ 
                        ...item, 
                        score,
                        searchMethod: 'legacy'
                    });
                }
            });
        });

        // Sort by relevance score (highest first)
        results.sort((a, b) => b.score - a.score);

        return results;
    }

    calculateRelevanceScore(item, searchTerms) {
        let score = 0;
        const searchableText = [
            item.title,
            item.subtitle,
            item.description,
            ...(item.keywords || [])
        ].join(' ').toLowerCase();

        searchTerms.forEach(term => {
            if (item.title.toLowerCase().includes(term)) {
                score += 10; // Title matches are most important
            }
            if (item.subtitle && item.subtitle.toLowerCase().includes(term)) {
                score += 5; // Subtitle matches
            }
            if (searchableText.includes(term)) {
                score += 2; // General content matches
            }
            // Fuzzy matching for typos
            if (this.fuzzyMatch(searchableText, term)) {
                score += 1;
            }
        });

        return score;
    }

    fuzzyMatch(text, term) {
        // Simple fuzzy matching - check if most characters of the term exist in order
        if (term.length < 3) return false;
        
        let termIndex = 0;
        for (let i = 0; i < text.length && termIndex < term.length; i++) {
            if (text[i] === term[termIndex]) {
                termIndex++;
            }
        }
        
        return termIndex >= term.length * 0.8; // At least 80% of characters matched
    }

    displayResults(results, query) {
        const container = document.getElementById('search-results');
        const defaultState = document.getElementById('search-default');
        const statsElement = document.getElementById('search-stats');

        if (results.length === 0) {
            defaultState.style.display = 'block';
            container.style.display = 'none';
            defaultState.innerHTML = `
                <div class="p-6 text-center text-gray-500">
                    <p class="text-lg">🔍 "${query}" için sonuç bulunamadı</p>
                    <p class="text-sm mt-2">Farklı anahtar kelimeler deneyin</p>
                </div>
            `;
            statsElement.textContent = '';
            return;
        }

        this.searchResults = results;
        this.currentFocus = -1;

        defaultState.style.display = 'none';
        container.style.display = 'block';
        statsElement.textContent = `${results.length} sonuç`;

        const resultsHTML = results.slice(0, 20).map((result, index) => `
            <div class="search-result-item px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${index === this.currentFocus ? 'bg-blue-50' : ''}"
                 data-index="${index}">
                <div class="flex items-center space-x-3">
                    <span class="text-xl">${result.icon}</span>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2">
                            <p class="text-sm font-medium text-gray-900 truncate">${this.highlightMatch(result.title, query)}</p>
                            <span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">${this.getTypeLabel(result.type)}</span>
                        </div>
                        <p class="text-xs text-gray-500 truncate">${this.highlightMatch(result.subtitle || '', query)}</p>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = resultsHTML;

        // Add click listeners
        container.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.currentFocus = index;
                this.selectResult();
            });
        });
    }

    highlightMatch(text, query) {
        if (!query.trim()) return text;
        
        const terms = query.toLowerCase().split(' ').filter(term => term.length > 0);
        let highlightedText = text;
        
        terms.forEach(term => {
            const regex = new RegExp(`(${term})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
        });
        
        return highlightedText;
    }

    getTypeLabel(type) {
        const labels = {
            'patient': 'Hasta',
            'appointment': 'Randevu',
            'inventory': 'Ürün',
            'page': 'Sayfa',
            'command': 'Komut'
        };
        return labels[type] || type;
    }

    showDefaultState() {
        document.getElementById('search-default').style.display = 'block';
        document.getElementById('search-results').style.display = 'none';
        document.getElementById('search-stats').textContent = '';
        this.searchResults = [];
        this.currentFocus = -1;
    }

    navigateResults(direction) {
        if (this.searchResults.length === 0) return;

        this.currentFocus += direction;
        
        if (this.currentFocus >= this.searchResults.length) {
            this.currentFocus = 0;
        } else if (this.currentFocus < 0) {
            this.currentFocus = this.searchResults.length - 1;
        }

        this.updateFocusHighlight();
    }

    updateFocusHighlight() {
        const resultItems = document.querySelectorAll('.search-result-item');
        resultItems.forEach((item, index) => {
            if (index === this.currentFocus) {
                item.classList.add('bg-blue-50');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('bg-blue-50');
            }
        });
    }

    selectResult() {
        if (this.currentFocus >= 0 && this.searchResults[this.currentFocus]) {
            const result = this.searchResults[this.currentFocus];
            this.closeSearch();
            
            // Execute the action
            if (result.action) {
                result.action();
            }
        }
    }

    openSearch() {
        const modal = document.getElementById('global-search-modal');
        const input = document.getElementById('global-search-input');
        
        modal.classList.remove('hidden');
        input.value = '';
        input.focus();
        this.isSearchOpen = true;
        this.showDefaultState();
        
        // Rebuild search index to get latest data
        this.buildSearchIndex();
    }

    openCommandPalette() {
        this.openSearch();
        document.getElementById('global-search-input').placeholder = 'Komut arayın...';
        
        // Show only commands initially
        const commands = this.searchIndex.commands;
        this.displayResults(commands, '');
    }

    openPatientSearch() {
        this.openSearch();
        document.getElementById('global-search-input').placeholder = 'Hasta arayın...';
        
        // Show all patients initially
        const patients = this.searchIndex.patients;
        this.displayResults(patients, '');
    }

    closeSearch() {
        const modal = document.getElementById('global-search-modal');
        modal.classList.add('hidden');
        this.isSearchOpen = false;
        document.getElementById('global-search-input').placeholder = 'Hasta, randevu, ürün, sayfa arayın... (Ctrl+K)';
    }

    // Navigation methods
    navigateToPage(path) {
        if (window.location.pathname !== path) {
            window.location.href = path;
        }
    }

    navigateToPatient(patientId) {
        window.location.href = `/patient-details.html?id=${patientId}`;
    }

    navigateToAppointment(appointmentId) {
        window.location.href = `/appointments.html?highlight=${appointmentId}`;
    }

    navigateToInventoryItem(itemId) {
        window.location.href = `/inventory.html?highlight=${itemId}`;
    }

    executeCommand(commandId) {
        switch (commandId) {
            case 'new-patient':
                if (typeof window.patientManager !== 'undefined') {
                    window.patientManager.showAddPatientModal();
                } else {
                    this.navigateToPage('/patients.html');
                }
                break;
            case 'new-appointment':
                if (typeof window.appointmentManager !== 'undefined') {
                    window.appointmentManager.showAddAppointmentModal();
                } else {
                    this.navigateToPage('/appointments.html');
                }
                break;
            case 'send-sms':
                this.navigateToPage('/campaigns.html');
                break;
            case 'export-data':
                if (typeof window.exportManager !== 'undefined') {
                    window.exportManager.exportAllData();
                } else {
                    Utils.showToast('Dışa aktarma özelliği yüklenmedi', 'error');
                }
                break;
            case 'automation-status':
                window.open('/automation-status.html', '_blank');
                break;
        }
    }

    getAppointmentStatusText(status) {
        const statusTexts = {
            'scheduled': 'Planlandı',
            'confirmed': 'Onaylandı',
            'completed': 'Tamamlandı',
            'cancelled': 'İptal Edildi',
            'no_show': 'Gelmedi'
        };
        return statusTexts[status] || status;
    }

    /**
     * Add query to search history
     */
    addToSearchHistory(query) {
        // Remove if already exists
        const index = this.searchHistory.indexOf(query);
        if (index > -1) {
            this.searchHistory.splice(index, 1);
        }
        
        // Add to beginning
        this.searchHistory.unshift(query);
        
        // Limit size
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }
        
        // Save to localStorage
        try {
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('Could not save search history:', error);
        }
    }

    /**
     * Remove duplicate results
     */
    deduplicateResults(results) {
        const seen = new Set();
        return results.filter(result => {
            const key = `${result.type}-${result.title}-${result.action}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Sort results by relevance with NLP considerations
     */
    sortResultsByRelevance(results, query, intent) {
        return results.sort((a, b) => {
            // Intent results have highest priority
            if (a.type === 'intent') return -1;
            if (b.type === 'intent') return 1;
            
            // Then by combined score
            return b.score - a.score;
        });
    }

    /**
     * Calculate intent boost for search results
     */
    calculateIntentBoost(item, intent) {
        let boost = 0;
        
        switch (intent.type) {
            case 'FIND_PATIENTS':
                if (item.type === 'patient' || item.action === 'patients') boost = 0.3;
                break;
            case 'SEARCH_DOCUMENTS':
                if (item.type === 'document' || item.action === 'documents') boost = 0.3;
                break;
            case 'SHOW_APPOINTMENTS':
                if (item.type === 'appointment' || item.action === 'appointments') boost = 0.3;
                break;
            case 'DEVICE_INQUIRY':
                if (item.keywords && item.keywords.some(k => 
                    k.includes('cihaz') || k.includes('device') || k.includes('hearing')
                )) boost = 0.3;
                break;
            case 'SGK_RELATED':
                if (item.keywords && item.keywords.some(k => 
                    k.includes('sgk') || k.includes('rapor')
                )) boost = 0.3;
                break;
        }
        
        return boost;
    }

    /**
     * Get display text for intent types
     */
    getIntentDisplayText(intentType) {
        const texts = {
            'FIND_PATIENTS': '👥 Hasta Arama',
            'SEARCH_DOCUMENTS': '📄 Belge Arama',
            'SHOW_APPOINTMENTS': '📅 Randevu Arama',
            'DEVICE_INQUIRY': '🦻 Cihaz Sorgulama',
            'SGK_RELATED': '🏥 SGK İşlemleri'
        };
        return texts[intentType] || intentType;
    }

    /**
     * Search patients based on intent
     */
    async searchPatients(intent) {
        // This would integrate with the actual patient database
        // For now, return mock results based on entities found
        const results = [];
        
        if (intent.entities && intent.entities.PERSON) {
            intent.entities.PERSON.forEach(person => {
                results.push({
                    type: 'patient',
                    title: person.text,
                    subtitle: 'Hasta Kaydı',
                    description: `NLP ile bulunan hasta: ${person.text}`,
                    icon: '👤',
                    action: 'view-patient',
                    score: person.confidence,
                    data: { patientName: person.text }
                });
            });
        }
        
        return results;
    }

    /**
     * Search documents based on intent
     */
    async searchDocuments(intent) {
        const results = [];
        
        // Add document type suggestions based on classification
        if (intent.entities && intent.entities.MEDICAL_CONDITION) {
            intent.entities.MEDICAL_CONDITION.forEach(condition => {
                results.push({
                    type: 'document',
                    title: `${condition.text} ile ilgili belgeler`,
                    subtitle: 'Tıbbi Belgeler',
                    description: `${condition.category} kategorisinde belgeler`,
                    icon: '📋',
                    action: 'search-documents',
                    score: condition.confidence,
                    data: { medicalCondition: condition.text }
                });
            });
        }
        
        return results;
    }

    /**
     * Search appointments based on intent
     */
    async searchAppointments(intent) {
        const results = [];
        
        if (intent.entities && intent.entities.DATE) {
            intent.entities.DATE.forEach(date => {
                results.push({
                    type: 'appointment',
                    title: `${date.text} randevuları`,
                    subtitle: 'Randevu Listesi',
                    description: `${date.text} tarihindeki randevular`,
                    icon: '📅',
                    action: 'view-appointments',
                    score: date.confidence,
                    data: { date: date.standardFormat || date.text }
                });
            });
        }
        
        return results;
    }

    /**
     * Search devices based on intent
     */
    async searchDevices(intent) {
        const results = [];
        
        if (intent.entities && intent.entities.DEVICE_TYPE) {
            intent.entities.DEVICE_TYPE.forEach(device => {
                results.push({
                    type: 'device',
                    title: `${device.text}`,
                    subtitle: 'Cihaz Bilgisi',
                    description: `${device.category} - ${device.text}`,
                    icon: '🦻',
                    action: 'view-device',
                    score: device.confidence,
                    data: { deviceType: device.text, category: device.category }
                });
            });
        }
        
        return results;
    }

    /**
     * Search SGK related content based on intent
     */
    async searchSGK(intent) {
        const results = [];
        
        // Add SGK-specific search results
        results.push({
            type: 'sgk',
            title: 'SGK Rapor Sihirbazı',
            subtitle: 'SGK İşlemleri',
            description: 'SGK cihaz raporu oluştur ve gönder',
            icon: '🏥',
            action: 'sgk-wizard',
            score: 0.9
        });
        
        return results;
    }

    /**
     * Format search results for display
     */
    formatSearchResults(results, categoryTitle, categoryType) {
        if (results.length === 0) return [];
        
        const formatted = results.map(result => ({
            ...result,
            category: categoryType
        }));
        
        // Add category header
        formatted.unshift({
            type: 'category',
            title: categoryTitle,
            subtitle: `${results.length} sonuç`,
            description: '',
            icon: '📂',
            action: 'category',
            score: 1000,
            isCategory: true
        });
        
        return formatted;
    }

    /**
     * Enable or disable NLP functionality
     */
    toggleNLP(enabled) {
        this.nlpEnabled = enabled;
        console.log(`🧠 Global Search NLP ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get search statistics
     */
    getStats() {
        return {
            nlpEnabled: this.nlpEnabled,
            nlpReady: this.nlpService ? this.nlpService.isReady() : false,
            cacheSize: this.searchCache.size,
            historySize: this.searchHistory.length,
            indexSize: Object.keys(this.searchIndex).length
        };
    }
}

// Add keyboard shortcut styles
const keyboardStyles = `
<style>
.kbd {
    display: inline-block;
    padding: 2px 4px;
    font-size: 11px;
    line-height: 10px;
    color: #444d56;
    vertical-align: middle;
    background-color: #fafbfc;
    border: solid 1px #c6cbd1;
    border-bottom-color: #959da5;
    border-radius: 3px;
    box-shadow: inset 0 -1px 0 #959da5;
    font-family: monospace;
}

.search-result-item:hover {
    background-color: #f3f4f6 !important;
}

.search-result-item.bg-blue-50 {
    background-color: #eff6ff !important;
}

mark {
    background-color: #fef08a;
    padding: 0 1px;
    border-radius: 2px;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', keyboardStyles);

// Initialize global search
window.globalSearchManager = new GlobalSearchManager();
