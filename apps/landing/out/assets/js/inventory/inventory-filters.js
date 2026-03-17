// Inventory Filters Management Module
class InventoryFilters {
    constructor() {
        this.debounceTimer = null;
        this.currentFilters = {};
        
        // Initialize fuzzy search utility
        this.fuzzySearch = new FuzzySearchUtil({
            threshold: 0.6,
            maxDistance: 3,
            caseSensitive: false,
            includeScore: true,
            minLength: 1
        });

        // Multi-select filter instances
        this.categoryMultiSelect = null;
        this.brandMultiSelect = null;
        this.featureMultiSelect = null;
        
        // Category, brand and feature data
        this.categoryData = [];
        this.brandData = [];
        this.featureData = [];
    }

    async setup() {
        await this.loadFilterData();
        this.setupMultiSelectFilters();
        this.populateFeatureFilter();
        this.setupEventListeners();
    }

    async loadFilterData() {
        console.log('🔧 Loading filter data...');
        
        // Load categories, brands and features from multiple sources
        await Promise.all([
            this.loadCategories(),
            this.loadBrands(),
            this.loadFeatures()
        ]);
    }

    async loadCategories() {
        try {
            // Try API first
            if (window.deviceAPIService && typeof window.deviceAPIService.getCategories === 'function') {
                const response = await window.deviceAPIService.getCategories();
                const categories = response.categories || response.data || [];
                this.categoryData = this.normalizeFilterData(categories, 'category');
            } else if (window.APIConfig) {
                const response = await window.APIConfig.makeRequest(window.APIConfig.endpoints.deviceCategories);
                const categories = response.categories || response.data || [];
                this.categoryData = this.normalizeFilterData(categories, 'category');
            }
        } catch (error) {
            console.warn('Failed to load categories from API:', error);
        }

        // Fallback to inventory data if API fails
        if (this.categoryData.length === 0) {
            this.categoryData = this.extractFromInventory('category');
        }

        console.log('Loaded categories:', this.categoryData.length);
    }

    async loadBrands() {
        try {
            // Try API first
            if (window.deviceAPIService && typeof window.deviceAPIService.getBrands === 'function') {
                const response = await window.deviceAPIService.getBrands();
                const brands = response.brands || response.data || [];
                this.brandData = this.normalizeFilterData(brands, 'brand');
            } else if (window.APIConfig) {
                const response = await window.APIConfig.makeRequest(window.APIConfig.endpoints.deviceBrands);
                const brands = response.brands || response.data || [];
                this.brandData = this.normalizeFilterData(brands, 'brand');
            }
        } catch (error) {
            console.warn('Failed to load brands from API:', error);
        }

        // Fallback to inventory data if API fails
        if (this.brandData.length === 0) {
            this.brandData = this.extractFromInventory('brand');
        }

        console.log('Loaded brands:', this.brandData.length);
    }

    normalizeFilterData(data, type) {
        if (!Array.isArray(data)) {
            data = Object.values(data);
        }

        return data
            .map(item => {
                if (typeof item === 'string') {
                    return { 
                        value: item, 
                        label: type === 'category' ? this.getCategoryDisplayName(item) : item 
                    };
                }
                const value = item.name || item.value || item.label || item.title;
                return value ? { 
                    value: value, 
                    label: type === 'category' ? this.getCategoryDisplayName(value) : value 
                } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.label.localeCompare(b.label));
    }

    extractFromInventory(type) {
        let inventoryData = [];
        
        // Try multiple data sources in correct order
        if (window.inventoryData && typeof window.inventoryData.getAllItems === 'function') {
            inventoryData = window.inventoryData.getAllItems();
        } else if (window.sampleData && window.sampleData.inventory && Array.isArray(window.sampleData.inventory)) {
            inventoryData = window.sampleData.inventory;
        } else if (window.inventoryDataService && typeof window.inventoryDataService.getAll === 'function') {
            inventoryData = window.inventoryDataService.getAll();
        } else if (window.inventory && Array.isArray(window.inventory)) {
            inventoryData = window.inventory;
        } else if (window.AppState && window.AppState.inventory && Array.isArray(window.AppState.inventory)) {
            inventoryData = window.AppState.inventory;
        }

        console.log(`Extracting ${type} from inventory data:`, inventoryData.length, 'items');

        const itemSet = new Set();
        inventoryData.forEach(item => {
            const value = type === 'category' ? item.category : item.brand;
            if (value && value.trim()) {
                itemSet.add(value.trim());
            }
        });

        const result = Array.from(itemSet).map(value => ({
            value: value,
            label: type === 'category' ? this.getCategoryDisplayName(value) : value
        })).sort((a, b) => a.label.localeCompare(b.label));

        console.log(`Extracted ${type} data:`, result.length, 'unique items');
        return result;
    }

    getCategoryDisplayName(category) {
        const categoryMap = {
            'hearing_aid': 'İşitme Cihazı',
            'aksesuar': 'Aksesuar', 
            'pil': 'Pil',
            'bakim': 'Bakım',
            'accessory': 'Aksesuar',
            'battery': 'Pil',
            'maintenance': 'Bakım',
            'ear_mold': 'Kulak Kalıbı',
            'device': 'Cihaz'
        };
        return categoryMap[category] || category || 'Kategori belirtilmemiş';
    }

    async loadFeatures() {
        try {
            // Extract features from inventory data
            this.featureData = this.extractFeaturesFromInventory();
        } catch (error) {
            console.warn('Failed to load features:', error);
            this.featureData = [];
        }

        console.log('Loaded features:', this.featureData.length);
    }

    extractFeaturesFromInventory() {
        let inventoryData = [];
        
        // Try multiple data sources in correct order
        if (window.inventoryData && typeof window.inventoryData.getAllItems === 'function') {
            inventoryData = window.inventoryData.getAllItems();
        } else if (window.sampleData && window.sampleData.inventory && Array.isArray(window.sampleData.inventory)) {
            inventoryData = window.sampleData.inventory;
        } else if (window.inventoryDataService && typeof window.inventoryDataService.getAll === 'function') {
            inventoryData = window.inventoryDataService.getAll();
        } else if (window.inventory && Array.isArray(window.inventory)) {
            inventoryData = window.inventory;
        } else if (window.AppState && window.AppState.inventory && Array.isArray(window.AppState.inventory)) {
            inventoryData = window.AppState.inventory;
        }

        console.log('Extracting features from inventory data:', inventoryData.length, 'items');

        const featureSet = new Set();
        inventoryData.forEach(item => {
            // Extract features from various fields
            if (item.features && Array.isArray(item.features)) {
                item.features.forEach(feature => {
                    if (feature && feature.trim()) {
                        featureSet.add(feature.trim());
                    }
                });
            }
            
            // Also check for feature-related properties
            if (item.model && item.model.trim()) {
                featureSet.add(item.model.trim());
            }
            
            if (item.type && item.type.trim()) {
                featureSet.add(item.type.trim());
            }
            
            // Check for hearing aid specific features
            if (item.category === 'hearing_aid') {
                if (item.direction) {
                    featureSet.add(`${item.direction} Kulak`);
                }
                if (item.technology) {
                    featureSet.add(item.technology);
                }
                if (item.style) {
                    featureSet.add(item.style);
                }
            }
        });

        return Array.from(featureSet).map(value => ({
            value: value,
            label: value
        })).sort((a, b) => a.label.localeCompare(b.label));
    }

    setupMultiSelectFilters() {
        // Setup category multi-select
        const categoryContainer = document.getElementById('categoryFilterContainer');
        if (categoryContainer && window.MultiSelectSearch) {
            this.categoryMultiSelect = new window.MultiSelectSearch('categoryFilterContainer', {
                placeholder: 'Kategori seçin...',
                searchPlaceholder: 'Kategori ara...',
                noResultsText: 'Kategori bulunamadı',
                data: this.categoryData,
                fuzzySearch: this.fuzzySearch,
                onSelectionChange: (selectedValues) => {
                    this.apply();
                }
            });
        }

        // Setup brand multi-select
        const brandContainer = document.getElementById('brandFilterContainer');
        if (brandContainer && window.MultiSelectSearch) {
            this.brandMultiSelect = new window.MultiSelectSearch('brandFilterContainer', {
                placeholder: 'Marka seçin...',
                searchPlaceholder: 'Marka ara...',
                noResultsText: 'Marka bulunamadı',
                data: this.brandData,
                fuzzySearch: this.fuzzySearch,
                onSelectionChange: (selectedValues) => {
                    this.apply();
                }
            });
        }

        // Setup feature multi-select
        const featureContainer = document.getElementById('featureFilterContainer');
        if (featureContainer && window.MultiSelectSearch) {
            this.featureMultiSelect = new window.MultiSelectSearch('featureFilterContainer', {
                placeholder: 'Özellik seçin...',
                searchPlaceholder: 'Özellik ara...',
                noResultsText: 'Özellik bulunamadı',
                data: this.featureData,
                fuzzySearch: this.fuzzySearch,
                onSelectionChange: (selectedValues) => {
                    this.apply();
                }
            });
        }
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.apply());
        }

        // Status filter (keep as dropdown)
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.apply());
        }

        console.log('✅ Filter event listeners attached');
    }

    apply() {
        // Debounce filter application to avoid excessive processing
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.performFiltering();
        }, 300);
    }

    async performFiltering() {
        const searchTerm = document.getElementById('searchInput')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';

        // Get selected categories, brands and features from multi-select components
        const selectedCategories = this.categoryMultiSelect ? this.categoryMultiSelect.getSelectedValues() : [];
        const selectedBrands = this.brandMultiSelect ? this.brandMultiSelect.getSelectedValues() : [];
        const selectedFeatures = this.featureMultiSelect ? this.featureMultiSelect.getSelectedValues() : [];

        console.log('Filter selections:', {
            categories: selectedCategories,
            brands: selectedBrands,
            features: selectedFeatures,
            search: searchTerm,
            status: statusFilter
        });

        // Build backend-supported filters with fuzzy search enhancement
        const filters = {};
        
        // Enhanced search with fuzzy matching
        if (searchTerm && searchTerm.trim()) {
            filters.search = this.enhanceSearchTerm(searchTerm.trim());
        }

        // Category filtering - backend expects single category parameter
        if (selectedCategories.length > 0) {
            // For now, use the first selected category
            // TODO: Backend should support multiple categories
            filters.category = this.normalizeCategory(selectedCategories[0]);
        }

        // Brand filtering - add to search term since backend doesn't have brand parameter
        if (selectedBrands.length > 0) {
            const brandSearch = selectedBrands.join(' ');
            filters.search = (filters.search ? filters.search + ' ' + brandSearch : brandSearch);
        }

        // Multi-feature filtering - add to search term
        if (selectedFeatures.length > 0) {
            const featureSearch = selectedFeatures.map(feature => this.enhanceSearchTerm(feature)).join(' ');
            filters.search = (filters.search ? filters.search + ' ' + featureSearch : featureSearch);
        }

        if (statusFilter === 'low_inventory') {
            filters.lowStock = true;
        }

        this.currentFilters = filters;
        console.log('Applied filters:', filters);

        // Reset to first page and load via server-side pagination
        if (window.inventoryTable) {
            window.inventoryTable.currentPage = 1;
            await window.inventoryTable.loadPaginatedData(filters);
        }
    }

    /**
     * Enhance search term with fuzzy matching capabilities
     * @param {string} term - Original search term
     * @returns {string} - Enhanced search term
     */
    enhanceSearchTerm(term) {
        if (!term || !term.trim()) return term;
        
        // Normalize the term for better matching
        const normalizedTerm = this.fuzzySearch.normalize(term);
        
        // For now, return the normalized term
        // In the future, this could be enhanced to include synonyms or related terms
        return normalizedTerm;
    }

    normalizeCategory(category) {
        try {
            if (window.XEar && window.XEar.CategoryNormalizer && typeof window.XEar.CategoryNormalizer.toCanonical === 'function') {
                return window.XEar.CategoryNormalizer.toCanonical(category);
            }
        } catch (e) {
            console.warn('Category normalizer error:', e);
        }
        // Fallback mapping for Turkish labels
        const map = {
            'aksesuar': 'accessory',
            'pil': 'battery',
            'bakim': 'maintenance',
            'işitme cihazı': 'hearing_aid'
        };
        const key = (category || '').toLowerCase();
        return map[key] || category;
    }

    matchesCategory(item, categoryFilter) {
        try {
            if (window.XEar && window.XEar.CategoryNormalizer) {
                const itemCategory = window.XEar.CategoryNormalizer.toCanonical(item.category || item.type);
                const filterCategory = window.XEar.CategoryNormalizer.toCanonical(categoryFilter);
                return itemCategory === filterCategory;
            } else {
                return (item.category === categoryFilter) || (item.type === categoryFilter);
            }
        } catch (error) {
            console.error('Error matching category:', error);
            return (item.category === categoryFilter) || (item.type === categoryFilter);
        }
    }

    matchesStatus(item, statusFilter) {
        const stock = item.inventory || 0;
        const minStock = item.minInventory || 0;

        switch (statusFilter) {
            case 'in_inventory':
                return stock > minStock;
            case 'low_inventory':
                return stock > 0 && stock <= minStock;
            case 'out_of_inventory':
                return stock === 0;
            case 'on_trial':
                return (item.onTrial || 0) > 0;
            default:
                return true;
        }
    }

    matchesFeature(item, featureFilter) {
        if (!item.features) return false;
        
        let itemFeatures = [];
        
        // Handle both array and string formats
        if (Array.isArray(item.features)) {
            itemFeatures = item.features.map(f => f.toLowerCase().trim());
        } else if (typeof item.features === 'string') {
            itemFeatures = item.features.toLowerCase().split(',').map(f => f.trim());
        }
        
        return itemFeatures.includes(featureFilter.toLowerCase());
    }

    updateResultsCount(filtered, total) {
        const countElement = document.getElementById('resultsCount');
        if (countElement) {
            countElement.textContent = `${filtered} / ${total} ürün`;
        }
    }

    populateFeatureFilter() {
        console.log('🔧 Populating feature filter...');
        const featureSet = new Set();
        
        if (!window.inventoryData) {
            console.warn('InventoryData not available');
            return;
        }
        
        const allItems = window.inventoryData.getAllInventory();
        console.log('Items for feature filter:', allItems.length);
        
        allItems.forEach(item => {
            if (item.features) {
                let features = [];
                
                // Handle both array and string formats
                if (Array.isArray(item.features)) {
                    features = item.features;
                } else if (typeof item.features === 'string') {
                    features = item.features.split(',').map(f => f.trim());
                }
                
                features.forEach(feature => {
                    if (feature && feature.trim()) {
                        featureSet.add(feature.trim());
                    }
                });
            }
        });

        const featureFilter = document.getElementById('featureFilter');
        if (featureFilter) {
            // Clear existing options except the first one
            while (featureFilter.children.length > 1) {
                featureFilter.removeChild(featureFilter.lastChild);
            }

            // Add feature options
            Array.from(featureSet).sort().forEach(feature => {
                const option = document.createElement('option');
                option.value = feature;
                option.textContent = feature;
                featureFilter.appendChild(option);
            });
        }
    }

    clear() {
        // Clear all filter inputs
        const inputs = [
            'searchInput',
            'categoryFilter', 
            'brandFilter',
            'statusFilter',
            'featureFilter'
        ];

        inputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.value = '';
            }
        });

        // Apply filters to show all items
        this.apply();
        
        window.Utils.showToast('Filtreler temizlendi', 'info');
    }

    savePreset() {
        const filterState = {
            search: document.getElementById('searchInput')?.value || '',
            category: document.getElementById('categoryFilter')?.value || '',
            brand: document.getElementById('brandFilter')?.value || '',
            status: document.getElementById('statusFilter')?.value || '',
            feature: document.getElementById('featureFilter')?.value || ''
        };

        localStorage.setItem('inventoryFilterPreset', JSON.stringify(filterState));
        window.Utils.showToast('Filtre ayarları kaydedildi', 'success');
    }

    loadPreset() {
        try {
            const saved = localStorage.getItem('inventoryFilterPreset');
            if (saved) {
                const filterState = JSON.parse(saved);
                
                if (filterState.search) document.getElementById('searchInput').value = filterState.search;
                if (filterState.category) document.getElementById('categoryFilter').value = filterState.category;
                if (filterState.brand) document.getElementById('brandFilter').value = filterState.brand;
                if (filterState.status) document.getElementById('statusFilter').value = filterState.status;
                if (filterState.feature) document.getElementById('featureFilter').value = filterState.feature;
                
                this.apply();
                window.Utils.showToast('Kaydedilmiş filtre ayarları yüklendi', 'info');
            }
        } catch (error) {
            console.error('Error loading filter preset:', error);
        }
    }
}

// Export for global use
window.InventoryFilters = InventoryFilters;