/**
 * Category/Brand Autocomplete Component
 * Provides autocomplete functionality for category and brand selection with auto-creation
 * Based on SupplierAutocomplete but adapted for categories and brands
 */

class CategoryBrandAutocomplete {
    constructor(inputElement, type, options = {}) {
        this.input = inputElement;
        this.type = type; // 'category' or 'brand'
        this.options = {
            minLength: 1,
            maxResults: 10,
            placeholder: type === 'category' ? 'Kategori seçin veya yazın...' : 'Marka seçin veya yazın...',
            allowCreate: true,
            onSelect: null,
            onCreate: null,
            fuzzySearch: true,
            fuzzyThreshold: 0.6,
            maxDistance: 3,
            ...options
        };
        
        this.items = [];
        this.filteredItems = [];
        this.selectedItem = null;
        this.isOpen = false;
        this.currentIndex = -1;

        // Initialize fuzzy search utility
        this.fuzzySearch = new FuzzySearchUtil({
            threshold: this.options.fuzzyThreshold,
            maxDistance: this.options.maxDistance,
            caseSensitive: false,
            includeScore: true,
            minLength: 1
        });

        // Synonyms and normalization helpers (primarily for categories)
        this.CATEGORY_SYNONYMS = {
            'hearing_aid': ['hearing aid', 'işitme cihazı', 'işitme cihaz', 'cihaz', 'isitme cihazi', 'isitme cihaz'],
            'battery': ['battery', 'pil', 'batarya'],
            'accessory': ['accessory', 'aksesuar'],
            'maintenance': ['maintenance', 'bakım', 'servis', 'tamir']
        };
        this.normalizeText = (s) => {
            if (!s) return '';
            let normalized = s.toString().trim().toLowerCase();
            // Normalize Turkish characters for better search matching
            normalized = normalized
                .replace(/ğ/g, 'g')
                .replace(/ü/g, 'u')
                .replace(/ş/g, 's')
                .replace(/ı/g, 'i')
                .replace(/ö/g, 'o')
                .replace(/ç/g, 'c');
            return normalized;
        };
        this.getCategorySlug = (name) => {
            const n = this.normalizeText(name);
            for (const slug of Object.keys(this.CATEGORY_SYNONYMS)) {
                if (n === slug) return slug;
                if (this.CATEGORY_SYNONYMS[slug].includes(n)) return slug;
            }
            return null;
        };
        this.getCategorySearchPool = (name) => {
            const n = this.normalizeText(name);
            const pool = [n];
            const slug = this.getCategorySlug(name);
            if (slug) {
                pool.push(slug);
                (this.CATEGORY_SYNONYMS[slug] || []).forEach(s => pool.push(this.normalizeText(s)));
            }
            return Array.from(new Set(pool));
        };
        
        this.init();
    }

    init() {
        this.setupInput();
        this.createDropdown();
        this.bindEvents();
        this.loadItems();
    }
    
    setupInput() {
        this.input.setAttribute('autocomplete', 'off');
        this.input.placeholder = this.options.placeholder;
        this.input.classList.add('category-brand-autocomplete-input');
        
        // Add wrapper for positioning
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'category-brand-autocomplete-wrapper relative';
        this.input.parentNode.insertBefore(this.wrapper, this.input);
        this.wrapper.appendChild(this.input);
    }

    createDropdown() {
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'category-brand-autocomplete-dropdown absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto hidden';
        this.dropdown.style.top = '100%';
        this.dropdown.style.left = '0';
        this.wrapper.appendChild(this.dropdown);
    }

    bindEvents() {
        // Input events
        this.input.addEventListener('input', this.handleInput.bind(this));
        this.input.addEventListener('focus', this.handleFocus.bind(this));
        this.input.addEventListener('blur', this.handleBlur.bind(this));
        this.input.addEventListener('keydown', this.handleKeydown.bind(this));
        
        // Dropdown events
        this.dropdown.addEventListener('mousedown', this.handleDropdownClick.bind(this));
        
        // Document click to close dropdown
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.close();
            }
        });
    }

    async loadItems() {
        try {
            // First try to load from API endpoints
            await this.loadFromAPI();
            
            // If API fails, fallback to inventory data
            if (this.items.length === 0) {
                await this.loadFromInventoryData();
            }
        } catch (error) {
            console.warn(`Failed to load ${this.type}s:`, error);
            this.items = [];
        }
    }

    async loadFromAPI() {
        try {
            if (this.type === 'category') {
                // Use the DeviceAPIService to get categories
                if (window.deviceAPIService && typeof window.deviceAPIService.getCategories === 'function') {
                    const response = await window.deviceAPIService.getCategories();
                    const categories = response.categories || response.data || [];
                    const arr = Array.isArray(categories) ? categories : Object.values(categories);
                    this.items = arr
                        .map(item => {
                            if (typeof item === 'string') return { name: item };
                            const name = item && (item.name || item.label || item.value || item.title);
                            return name ? { name } : null;
                        })
                        .filter(Boolean)
                        .sort((a, b) => a.name.localeCompare(b.name));
                } else if (window.APIConfig) {
                    // Fallback to direct API call
                    const response = await window.APIConfig.makeRequest(window.APIConfig.endpoints.deviceCategories);
                    const categories = response.categories || response.data || [];
                    const arr = Array.isArray(categories) ? categories : Object.values(categories);
                    this.items = arr
                        .map(item => {
                            if (typeof item === 'string') return { name: item };
                            const name = item && (item.name || item.label || item.value || item.title);
                            return name ? { name } : null;
                        })
                        .filter(Boolean)
                        .sort((a, b) => a.name.localeCompare(b.name));
                }
            } else if (this.type === 'brand') {
                // Use the DeviceAPIService to get brands
                if (window.deviceAPIService && typeof window.deviceAPIService.getBrands === 'function') {
                    const response = await window.deviceAPIService.getBrands();
                    const brands = response.brands || response.data || [];
                    const arr = Array.isArray(brands) ? brands : Object.values(brands);
                    this.items = arr
                        .map(item => {
                            if (typeof item === 'string') return { name: item };
                            const name = item && (item.name || item.label || item.value || item.title);
                            return name ? { name } : null;
                        })
                        .filter(Boolean)
                        .sort((a, b) => a.name.localeCompare(b.name));
                } else if (window.APIConfig) {
                    // Fallback to direct API call
                    const response = await window.APIConfig.makeRequest(window.APIConfig.endpoints.deviceBrands);
                    const brands = response.brands || response.data || [];
                    const arr = Array.isArray(brands) ? brands : Object.values(brands);
                    this.items = arr
                        .map(item => {
                            if (typeof item === 'string') return { name: item };
                            const name = item && (item.name || item.label || item.value || item.title);
                            return name ? { name } : null;
                        })
                        .filter(Boolean)
                        .sort((a, b) => a.name.localeCompare(b.name));
                }
            }
        } catch (error) {
            console.warn(`Failed to load ${this.type}s from API:`, error);
            this.items = [];
        }
    }

    async loadFromInventoryData() {
        let inventoryData = null;
        
        // Try multiple data sources in priority order
        if (window.sampleData && window.sampleData.inventory && Array.isArray(window.sampleData.inventory)) {
            inventoryData = window.sampleData.inventory;
            console.log(`CategoryBrandAutocomplete: Using window.sampleData.inventory (${inventoryData.length} items)`);
        } else if (window.inventoryData && Array.isArray(window.inventoryData)) {
            inventoryData = window.inventoryData;
            console.log(`CategoryBrandAutocomplete: Using window.inventoryData (${inventoryData.length} items)`);
        } else if (window.inventoryDataService && typeof window.inventoryDataService.getAll === 'function') {
            inventoryData = window.inventoryDataService.getAll();
            console.log(`CategoryBrandAutocomplete: Using window.inventoryDataService.getAll() (${inventoryData.length} items)`);
        } else if (window.inventory && Array.isArray(window.inventory)) {
            inventoryData = window.inventory;
            console.log(`CategoryBrandAutocomplete: Using window.inventory (${inventoryData.length} items)`);
        } else if (window.AppState && window.AppState.inventory) {
            inventoryData = window.AppState.inventory;
            console.log(`CategoryBrandAutocomplete: Using window.AppState.inventory (${inventoryData.length} items)`);
        }

        // Try localStorage as fallback
        if (!inventoryData) {
            try {
                const stored = localStorage.getItem('inventoryData') || localStorage.getItem('xear_crm_inventory');
                if (stored) {
                    inventoryData = JSON.parse(stored);
                    console.log(`CategoryBrandAutocomplete: Using localStorage fallback (${inventoryData.length} items)`);
                }
            } catch (e) {
                console.warn('Failed to parse inventory data from localStorage:', e);
            }
        }

        if (inventoryData && Array.isArray(inventoryData)) {
            // Extract unique categories or brands
            const itemSet = new Set();
            inventoryData.forEach(item => {
                if (this.type === 'category' && item.category) {
                    itemSet.add(item.category.trim());
                } else if (this.type === 'brand' && item.brand) {
                    itemSet.add(item.brand.trim());
                }
            });
            
            this.items = Array.from(itemSet).map(name => ({ name })).sort((a, b) => a.name.localeCompare(b.name));
            console.log(`CategoryBrandAutocomplete: Loaded ${this.items.length} unique ${this.type}s from inventory data`);
        } else {
            this.items = [];
            console.warn(`CategoryBrandAutocomplete: No inventory data found for ${this.type}`);
        }
    }

    handleInput(e) {
        const query = e.target.value.trim();
        
        if (query.length >= this.options.minLength) {
            this.filterItems(query);
        } else {
            this.close();
        }
    }

    handleFocus(e) {
        const query = e.target.value.trim();
        if (query.length >= this.options.minLength) {
            this.filterItems(query);
        }
    }

    handleBlur(e) {
        // Delay closing to allow for dropdown clicks
        setTimeout(() => {
            this.close();
        }, 150);
    }

    handleKeydown(e) {
        if (!this.isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.navigateDown();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigateUp();
                break;
            case 'Enter':
                e.preventDefault();
                this.selectCurrent();
                break;
            case 'Escape':
                e.preventDefault();
                this.close();
                break;
        }
    }

    handleDropdownClick(e) {
        const item = e.target.closest('.category-brand-item');
        if (item) {
            const index = parseInt(item.dataset.index);
            if (item.classList.contains('create-new')) {
                this.createNewItem();
            } else {
                this.selectItem(this.filteredItems[index]);
            }
        }
    }

    filterItems(query) {
        if (!query || query.length < this.options.minLength) {
            this.filteredItems = [];
            this.renderDropdown();
            return;
        }

        // Use fuzzy search for better matching
        if (this.options.fuzzySearch && this.fuzzySearch) {
            this.filteredItems = this.fuzzySearch.search(query, this.items, item => {
                // Search in multiple fields for better coverage
                const searchFields = [
                    item.name || item,
                    item.label || item,
                    item.value || item
                ].filter(Boolean);
                
                return searchFields.join(' ');
            });
        } else {
            // Fallback to original filtering logic
            const lowerQuery = this.normalizeText(query);
            if (this.type === 'category') {
                this.filteredItems = this.items.filter(item => {
                    const pool = this.getCategorySearchPool(item.name);
                    return pool.some(s => s.includes(lowerQuery));
                });
            } else {
                this.filteredItems = this.items.filter(item => 
                    this.normalizeText(item.name).includes(lowerQuery)
                );
            }
        }

        // Limit results
        this.filteredItems = this.filteredItems.slice(0, this.options.maxResults);
        
        this.renderDropdown(query);
    }

    renderDropdown(query) {
        let html = '';
        
        // Render matching items
        this.filteredItems.forEach((item, index) => {
            const isActive = index === this.currentIndex;
            html += `
                <div class="category-brand-item px-4 py-2 cursor-pointer hover:bg-gray-100 ${isActive ? 'bg-blue-100' : ''}" data-index="${index}">
                    <div class="font-medium text-gray-900">${this.highlightMatch(item.name, query)}</div>
                </div>
            `;
        });
        
        // Add "Create new" option if enabled and no exact match
        if (this.options.allowCreate && query.length >= 1) {
            const exactMatch = this.filteredItems.some(item => 
                item.name.toLowerCase() === query.toLowerCase()
            );
            
            if (!exactMatch) {
                const createIndex = this.filteredItems.length;
                const isActive = createIndex === this.currentIndex;
                const itemType = this.type === 'category' ? 'kategori' : 'marka';
                html += `
                    <div class="category-brand-item create-new px-4 py-2 cursor-pointer hover:bg-green-50 border-t border-gray-200 ${isActive ? 'bg-green-100' : ''}" data-index="${createIndex}">
                        <div class="flex items-center text-green-700">
                            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                            </svg>
                            <span class="font-medium">"${query}" adında yeni ${itemType} oluştur</span>
                        </div>
                    </div>
                `;
            }
        }

        if (html === '') {
            const itemType = this.type === 'category' ? 'Kategori' : 'Marka';
            html = `
                <div class="px-4 py-3 text-gray-500 text-center">
                    <div class="text-sm">${itemType} bulunamadı</div>
                    ${this.options.allowCreate ? `<div class="text-xs mt-1">Yazmaya devam edin ve yeni ${itemType.toLowerCase()} oluşturun</div>` : ''}
                </div>
            `;
        }
        
        this.dropdown.innerHTML = html;
        this.open();
    }

    highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    navigateDown() {
        const maxIndex = this.filteredItems.length + (this.shouldShowCreateOption() ? 0 : -1);
        this.currentIndex = Math.min(this.currentIndex + 1, maxIndex);
        this.updateActiveItem();
    }

    navigateUp() {
        this.currentIndex = Math.max(this.currentIndex - 1, -1);
        this.updateActiveItem();
    }

    updateActiveItem() {
        const items = this.dropdown.querySelectorAll('.category-brand-item');
        items.forEach((item, index) => {
            item.classList.toggle('bg-blue-100', index === this.currentIndex);
            item.classList.toggle('bg-green-100', item.classList.contains('create-new') && index === this.currentIndex);
        });
    }

    selectCurrent() {
        if (this.currentIndex === -1) return;
        
        const createOption = this.dropdown.querySelector('.create-new');
        if (createOption && this.currentIndex === this.filteredItems.length) {
            this.createNewItem();
        } else if (this.filteredItems[this.currentIndex]) {
            this.selectItem(this.filteredItems[this.currentIndex]);
        }
    }

    selectItem(item) {
        this.selectedItem = item;
        this.input.value = item.name;
        this.close();
        
        if (this.options.onSelect) {
            this.options.onSelect(item);
        }
        
        // Trigger change event
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    async createNewItem() {
        const name = this.input.value.trim();
        if (!name) return;
        
        // Use the createItem method for duplicate prevention
        if (this.createItem(name)) {
            let savedName = name;

            // Try persisting to backend API first
            if (window.APIConfig && window.APIConfig.endpoints) {
                try {
                    const endpoint = this.type === 'category' ? window.APIConfig.endpoints.deviceCategories : window.APIConfig.endpoints.deviceBrands;
                    const payload = this.type === 'category' ? { category: name } : { name: name };
                    const resp = await window.APIConfig.makeRequest(endpoint, 'POST', payload);
                    if (this.type === 'category') {
                        savedName = (resp && resp.data && (resp.data.category || resp.category)) || name;
                    } else {
                        savedName = (resp && resp.data && (resp.data.brand || resp.brand)) || name;
                    }
                    console.log(`New ${this.type} created:`, { name: savedName });
                } catch (e) {
                    // Check if it's a 409 conflict error (category already exists)
                    if (e.status === 409 || (e.response && e.response.status === 409)) {
                        console.log(`${this.type} already exists, using existing:`, name);
                        savedName = name; // Use the existing name
                        // Don't show error to user, just silently use existing
                    } else {
                        console.warn(`Failed to persist new ${this.type} to API, falling back to local:`, e);
                        // For other errors, still use the name but log the warning
                        savedName = name;
                    }
                }
            }

            const newItem = { name: savedName };
            this.selectItem(newItem);
        }
    }

    shouldShowCreateOption() {
        const query = this.input.value.trim();
        if (!this.options.allowCreate || query.length < 1) return false;
        
        return !this.filteredItems.some(item => 
            item.name.toLowerCase() === query.toLowerCase()
        );
    }

    open() {
        this.isOpen = true;
        this.dropdown.classList.remove('hidden');
    }

    close() {
        this.isOpen = false;
        this.dropdown.classList.add('hidden');
        this.currentIndex = -1;
    }

    // Public methods
    getValue() {
        return this.selectedItem;
    }
    
    setValue(item) {
        if (item) {
            this.selectedItem = item;
            this.input.value = typeof item === 'string' ? item : item.name;
        } else {
            this.selectedItem = null;
            this.input.value = '';
        }
    }

    clear() {
        this.setValue(null);
    }

    refresh() {
        this.loadItems();
    }

    /**
     * Check if an item already exists (case-insensitive)
     * @param {string} name - Item name to check
     * @returns {boolean} - True if item exists
     */
    itemExists(name) {
        if (!name) return false;
        
        const normalizedName = this.normalizeText(name);
        return this.items.some(item => {
            const itemName = item.name || item;
            return this.normalizeText(itemName) === normalizedName;
        });
    }

    /**
     * Create new item with duplicate prevention
     * @param {string} name - Item name
     * @returns {boolean} - True if created successfully
     */
    createItem(name) {
        if (!name || !name.trim()) return false;
        
        const trimmedName = name.trim();
        
        // Check for duplicates (case-insensitive)
        if (this.itemExists(trimmedName)) {
            console.warn(`${this.type} "${trimmedName}" already exists`);
            return false;
        }
        
        const newItem = { name: trimmedName };
        this.items.push(newItem);
        
        if (this.options.onCreate) {
            this.options.onCreate(newItem);
        }
        
        return true;
    }

    destroy() {
        // Remove event listeners and DOM elements
        this.close();
        if (this.wrapper && this.wrapper.parentNode) {
            this.wrapper.parentNode.insertBefore(this.input, this.wrapper);
            this.wrapper.parentNode.removeChild(this.wrapper);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryBrandAutocomplete;
} else {
    window.CategoryBrandAutocomplete = CategoryBrandAutocomplete;
}