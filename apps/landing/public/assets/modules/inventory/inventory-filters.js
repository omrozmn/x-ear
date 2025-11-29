// Inventory Filters Management Module
class InventoryFilters {
    constructor() {
        this.debounceTimer = null;
    }

    setup() {
        this.populateFeatureFilter();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.apply());
        }

        // Filter dropdowns
        const filters = ['categoryFilter', 'brandFilter', 'statusFilter', 'featureFilter'];
        filters.forEach(filterId => {
            const filterElement = document.getElementById(filterId);
            if (filterElement) {
                filterElement.addEventListener('change', () => this.apply());
            }
        });

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

    performFiltering() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const brandFilter = document.getElementById('brandFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const featureFilter = document.getElementById('featureFilter')?.value || '';

        const allItems = window.inventoryData.getAllItems();
        
        const filteredItems = allItems.filter(item => {
            // Search term filter
            const matchesSearch = !searchTerm || 
                (item.name && item.name.toLowerCase().includes(searchTerm)) ||
                (item.brand && item.brand.toLowerCase().includes(searchTerm)) ||
                (item.model && item.model.toLowerCase().includes(searchTerm)) ||
                (item.barcode && item.barcode.toLowerCase().includes(searchTerm));

            // Category filter
            const matchesCategory = !categoryFilter || this.matchesCategory(item, categoryFilter);

            // Brand filter
            const matchesBrand = !brandFilter || (item.brand === brandFilter);

            // Status filter (based on stock levels)
            const matchesStatus = !statusFilter || this.matchesStatus(item, statusFilter);

            // Feature filter
            const matchesFeature = !featureFilter || this.matchesFeature(item, featureFilter);

            return matchesSearch && matchesCategory && matchesBrand && matchesStatus && matchesFeature;
        });

        window.inventoryData.setFilteredItems(filteredItems);
        window.inventoryTable.render();
        this.updateResultsCount(filteredItems.length, allItems.length);
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
        
        const itemFeatures = item.features.toLowerCase().split(',').map(f => f.trim());
        return itemFeatures.includes(featureFilter.toLowerCase());
    }

    updateResultsCount(filtered, total) {
        const countElement = document.getElementById('resultsCount');
        if (countElement) {
            countElement.textContent = `${filtered} / ${total} ürün`;
        }
    }

    populateFeatureFilter() {
        const featureSet = new Set();
        const allItems = window.inventoryData.getAllItems();
        
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