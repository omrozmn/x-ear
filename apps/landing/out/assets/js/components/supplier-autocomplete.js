/**
 * Supplier Autocomplete Component
 * Provides autocomplete functionality for supplier selection with auto-creation
 */

class SupplierAutocomplete {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            minLength: 2,
            maxResults: 10,
            placeholder: 'Tedarikçi adı yazın...',
            allowCreate: true,
            onSelect: null,
            onCreate: null,
            fuzzySearch: true,
            fuzzyThreshold: 0.6,
            maxDistance: 3,
            apiEndpoint: (window.APIConfig?.endpoints?.suppliers) || ((window.API_BASE_URL || 'http://127.0.0.1:5003') + '/api/suppliers'),
            ...options
        };
        
        this.suppliers = [];
        this.filteredSuppliers = [];
        this.selectedSupplier = null;
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
        
        this.init();
    }
    
    init() {
        this.setupInput();
        this.createDropdown();
        this.bindEvents();
        this.loadSuppliers();
    }
    
    setupInput() {
        this.input.setAttribute('autocomplete', 'off');
        this.input.placeholder = this.options.placeholder;
        this.input.classList.add('supplier-autocomplete-input');
        
        // Add wrapper for positioning
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'supplier-autocomplete-wrapper relative';
        this.input.parentNode.insertBefore(this.wrapper, this.input);
        this.wrapper.appendChild(this.input);
    }
    
    createDropdown() {
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'supplier-autocomplete-dropdown absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto hidden';
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
    
    async loadSuppliers() {
        try {
            const response = await fetch(`${this.options.apiEndpoint}?per_page=100&is_active=true`);
            const data = await response.json();
            // Backend returns suppliers in 'data' field, not 'suppliers'
            this.suppliers = data.data || [];
        } catch (error) {
            console.error('Error loading suppliers:', error);
            this.suppliers = [];
        }
    }
    
    async searchSuppliers(query) {
        try {
            console.log('Searching suppliers with query:', query);
            
            // Use main endpoint with search parameter instead of separate search endpoint
            const url = `${this.options.apiEndpoint}?search=${encodeURIComponent(query)}&per_page=${this.options.maxResults}&is_active=true`;
            console.log('API endpoint:', url);
            
            const response = await fetch(url);
            console.log('Response status:', response.status);
            
            const data = await response.json();
            console.log('Response data:', data);
            
            // Backend returns suppliers in 'data' field, not 'suppliers'
            return data.data || [];
        } catch (error) {
            console.error('Error searching suppliers:', error);
            return [];
        }
    }
    
    handleInput(e) {
        const value = e.target.value.trim();
        console.log('Input changed:', value, 'Length:', value.length, 'Min length:', this.options.minLength);
        
        if (value.length >= this.options.minLength) {
            console.log('Starting search...');
            // Use debounced search for better performance
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.performSearch(value);
            }, 300);
        } else {
            console.log('Value too short, closing dropdown');
            this.close();
        }
        
        this.selectedSupplier = null;
        this.currentIndex = -1;
    }
    
    async performSearch(query) {
        try {
            console.log('Performing search for:', query);
            this.showLoading();
            
            // Use API search for better performance
            const suppliers = await this.searchSuppliers(query);
            console.log('Found suppliers:', suppliers);
            this.filteredSuppliers = suppliers;
            
            // If no results from API, try local filtering as fallback
            if (suppliers.length === 0 && this.suppliers.length > 0) {
                console.log('No API results, trying local filter');
                this.filterSuppliers(query);
            } else {
                this.renderDropdown(query);
                this.open();
            }
        } catch (error) {
            console.error('Search error:', error);
            // Fallback to local search
            console.log('API failed, using local search');
            this.filterSuppliers(query);
        }
    }
    
    showLoading() {
        this.dropdown.innerHTML = `
            <div class="supplier-autocomplete-loading">
                Aranıyor...
            </div>
        `;
        this.open();
    }
    
    showError(message) {
        this.dropdown.innerHTML = `
            <div class="supplier-autocomplete-error">
                ${message}
            </div>
        `;
    }
    
    handleFocus() {
        const value = this.input.value.trim();
        if (value.length >= this.options.minLength) {
            this.performSearch(value);
        }
    }
    
    handleBlur() {
        // Delay to allow dropdown click
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
        const item = e.target.closest('.supplier-item');
        if (item) {
            const index = parseInt(item.dataset.index);
            if (item.classList.contains('create-new')) {
                this.createNewSupplier();
            } else {
                this.selectSupplier(this.filteredSuppliers[index]);
            }
        }
    }
    
    filterSuppliers(query) {
        if (!query || query.length < this.options.minLength) {
            this.filteredSuppliers = [];
            this.renderDropdown(query);
            return;
        }

        // Use fuzzy search for better matching
        if (this.options.fuzzySearch && this.fuzzySearch) {
            this.filteredSuppliers = this.fuzzySearch.search(query, this.suppliers, supplier => {
                // Search in multiple fields for better coverage
                const companyName = supplier.companyName || supplier.company_name || '';
                const companyCode = supplier.companyCode || supplier.company_code || '';
                const contactPerson = supplier.contactPerson || supplier.contact_person || '';
                const city = supplier.city || '';
                const phone = supplier.phone || '';
                const email = supplier.email || '';
                
                return [companyName, companyCode, contactPerson, city, phone, email]
                    .filter(Boolean)
                    .join(' ');
            });
        } else {
            // Fallback to original filtering logic
            const lowerQuery = query.toLowerCase();
            this.filteredSuppliers = this.suppliers.filter(supplier => {
                // Ensure supplier and its properties exist and are strings
                if (!supplier || typeof supplier !== 'object') return false;
                
                // Backend returns camelCase field names
                const companyName = supplier.companyName || supplier.company_name || '';
                const companyCode = supplier.companyCode || supplier.company_code || '';
                const contactPerson = supplier.contactPerson || supplier.contact_person || '';
                
                return companyName.toString().toLowerCase().includes(lowerQuery) ||
                       companyCode.toString().toLowerCase().includes(lowerQuery) ||
                       contactPerson.toString().toLowerCase().includes(lowerQuery);
            });
        }

        // Limit results
        this.filteredSuppliers = this.filteredSuppliers.slice(0, this.options.maxResults);
        
        this.renderDropdown(query);
        this.open();
    }
    
    renderDropdown(query) {
        let html = '';
        
        // Render matching suppliers
        this.filteredSuppliers.forEach((supplier, index) => {
            const isActive = index === this.currentIndex;
            // Handle both camelCase and snake_case field names
            const companyName = supplier.companyName || supplier.company_name || '';
            const contactPerson = supplier.contactPerson || supplier.contact_person || '';
            const city = supplier.city || '';
            
            html += `
                <div class="supplier-item px-4 py-2 cursor-pointer hover:bg-gray-100 ${isActive ? 'bg-blue-100' : ''}" data-index="${index}">
                    <div class="font-medium text-gray-900">${this.highlightMatch(companyName, query)}</div>
                    ${contactPerson ? `<div class="text-sm text-gray-600">${contactPerson}</div>` : ''}
                    ${city ? `<div class="text-xs text-gray-500">${city}</div>` : ''}
                </div>
            `;
        });
        
        // Add "Create new supplier" option if enabled and no exact match
        if (this.options.allowCreate && query.length >= 2) {
            const exactMatch = this.filteredSuppliers.some(s => {
                const companyName = s.companyName || s.company_name || '';
                return companyName.toLowerCase() === query.toLowerCase();
            });
            
            if (!exactMatch) {
                const createIndex = this.filteredSuppliers.length;
                const isActive = createIndex === this.currentIndex;
                html += `
                    <div class="supplier-item create-new px-4 py-2 cursor-pointer hover:bg-green-50 border-t border-gray-200 ${isActive ? 'bg-green-100' : ''}" data-index="${createIndex}">
                        <div class="flex items-center text-green-700">
                            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                            </svg>
                            <span class="font-medium">"${query}" adında yeni tedarikçi oluştur</span>
                        </div>
                    </div>
                `;
            }
        }
        
        if (html === '') {
            html = `
                <div class="px-4 py-3 text-gray-500 text-center">
                    <div class="text-sm">Tedarikçi bulunamadı</div>
                    ${this.options.allowCreate ? '<div class="text-xs mt-1">Yazmaya devam edin ve yeni tedarikçi oluşturun</div>' : ''}
                </div>
            `;
        }
        
        this.dropdown.innerHTML = html;
    }
    
    highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    }
    
    navigateDown() {
        const maxIndex = this.filteredSuppliers.length + (this.shouldShowCreateOption() ? 0 : -1);
        this.currentIndex = Math.min(this.currentIndex + 1, maxIndex);
        this.updateActiveItem();
    }
    
    navigateUp() {
        this.currentIndex = Math.max(this.currentIndex - 1, -1);
        this.updateActiveItem();
    }
    
    updateActiveItem() {
        const items = this.dropdown.querySelectorAll('.supplier-item');
        items.forEach((item, index) => {
            item.classList.toggle('bg-blue-100', index === this.currentIndex);
            item.classList.toggle('bg-green-100', item.classList.contains('create-new') && index === this.currentIndex);
        });
    }
    
    selectCurrent() {
        if (this.currentIndex === -1) return;
        
        const createOption = this.dropdown.querySelector('.create-new');
        if (createOption && this.currentIndex === this.filteredSuppliers.length) {
            this.createNewSupplier();
        } else if (this.filteredSuppliers[this.currentIndex]) {
            this.selectSupplier(this.filteredSuppliers[this.currentIndex]);
        }
    }
    
    selectSupplier(supplier) {
        this.selectedSupplier = supplier;
        // Handle both camelCase and snake_case field names from backend
        this.input.value = supplier.companyName || supplier.company_name || '';
        this.close();
        
        if (this.options.onSelect) {
            this.options.onSelect(supplier);
        }
        
        // Trigger change event
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    async createNewSupplier() {
        const supplierName = this.input.value.trim();
        if (!supplierName) return;
        
        try {
            const response = await fetch(this.options.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    company_name: supplierName,
                    is_active: true
                })
            });
            
            if (response.ok) {
                const newSupplier = await response.json();
                
                // Add to local suppliers list
                this.suppliers.push(newSupplier);
                
                // Select the new supplier
                this.selectSupplier(newSupplier);
                
                if (this.options.onCreate) {
                    this.options.onCreate(newSupplier);
                }
                
                // Show success message
                this.showMessage('Yeni tedarikçi başarıyla oluşturuldu', 'success');
                
            } else {
                const error = await response.json();
                this.showMessage(error.error || 'Tedarikçi oluşturulurken hata oluştu', 'error');
            }
        } catch (error) {
            console.error('Error creating supplier:', error);
            this.showMessage('Tedarikçi oluşturulurken hata oluştu', 'error');
        }
        
        this.close();
    }
    
    shouldShowCreateOption() {
        const query = this.input.value.trim();
        if (!this.options.allowCreate || query.length < 2) return false;
        
        return !this.filteredSuppliers.some(s => 
            s.company_name.toLowerCase() === query.toLowerCase()
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
    
    showMessage(message, type = 'info') {
        // Use existing toast system if available
        if (window.Utils && window.Utils.showToast) {
            window.Utils.showToast(message, type);
        } else {
            // Fallback to console
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    // Public methods
    getValue() {
        return this.selectedSupplier;
    }
    
    setValue(supplier) {
        if (supplier) {
            this.selectedSupplier = supplier;
            this.input.value = supplier.company_name;
        } else {
            this.selectedSupplier = null;
            this.input.value = '';
        }
    }
    
    clear() {
        this.setValue(null);
    }
    
    refresh() {
        this.loadSuppliers();
    }
    
    destroy() {
        // Clear any pending search timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Remove event listeners and DOM elements
        this.dropdown.remove();
        this.input.classList.remove('supplier-autocomplete-input');
        
        if (this.wrapper.parentNode) {
            this.wrapper.parentNode.insertBefore(this.input, this.wrapper);
            this.wrapper.remove();
        }
    }
}

// Export for use in other modules
window.SupplierAutocomplete = SupplierAutocomplete;