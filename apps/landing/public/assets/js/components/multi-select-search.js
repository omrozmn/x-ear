/**
 * Multi-Select Search Component
 * Provides a searchable dropdown with multi-select capabilities
 */
class MultiSelectSearch {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.options = {
            placeholder: options.placeholder || 'Seçim yapın...',
            searchPlaceholder: options.searchPlaceholder || 'Ara...',
            noResultsText: options.noResultsText || 'Sonuç bulunamadı',
            maxDisplayItems: options.maxDisplayItems || 3,
            allowClear: options.allowClear !== false,
            data: options.data || [],
            onSelectionChange: options.onSelectionChange || (() => {}),
            fuzzySearch: options.fuzzySearch || null,
            valueField: options.valueField || 'value',
            labelField: options.labelField || 'label',
            searchFields: options.searchFields || ['label']
        };
        
        this.selectedItems = new Set();
        this.filteredData = [...this.options.data];
        this.isOpen = false;
        
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
        this.updateFilteredData();
    }

    render() {
        this.container.innerHTML = `
            <div class="multi-select-search relative">
                <div class="multi-select-trigger border border-gray-300 rounded-lg px-3 py-2 bg-white cursor-pointer min-h-[40px] flex items-center justify-between">
                    <div class="selected-items-display flex-1">
                        <span class="placeholder text-gray-500">${this.options.placeholder}</span>
                    </div>
                    <div class="trigger-icons flex items-center space-x-2">
                        ${this.options.allowClear ? '<button class="clear-btn hidden text-gray-400 hover:text-gray-600"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg></button>' : ''}
                        <svg class="dropdown-arrow w-4 h-4 text-gray-400 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </div>
                </div>
                
                <div class="multi-select-dropdown absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 hidden mt-1">
                    <div class="search-container p-3 border-b border-gray-200">
                        <div class="relative">
                            <input type="text" class="search-input w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="${this.options.searchPlaceholder}">
                            <svg class="absolute right-3 top-2.5 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                    </div>
                    
                    <div class="options-container max-h-60 overflow-y-auto">
                        <!-- Options will be rendered here -->
                    </div>
                </div>
            </div>
        `;

        this.elements = {
            trigger: this.container.querySelector('.multi-select-trigger'),
            dropdown: this.container.querySelector('.multi-select-dropdown'),
            searchInput: this.container.querySelector('.search-input'),
            optionsContainer: this.container.querySelector('.options-container'),
            selectedDisplay: this.container.querySelector('.selected-items-display'),
            placeholder: this.container.querySelector('.placeholder'),
            clearBtn: this.container.querySelector('.clear-btn'),
            dropdownArrow: this.container.querySelector('.dropdown-arrow')
        };
    }

    setupEventListeners() {
        // Toggle dropdown
        this.elements.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Search input
        this.elements.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Clear button
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearSelection();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });

        // Prevent dropdown close when clicking inside
        this.elements.dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    handleSearch(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredData = [...this.options.data];
        } else {
            if (this.options.fuzzySearch) {
                // Use fuzzy search if available - fix parameter order
                this.filteredData = this.options.fuzzySearch.multiFieldSearch(
                    searchTerm,
                    this.options.data,
                    this.options.searchFields
                );
            } else {
                // Fallback to simple string matching
                this.filteredData = this.options.data.filter(item => {
                    return this.options.searchFields.some(field => {
                        const value = item[field];
                        return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
                    });
                });
            }
        }
        this.renderOptions();
    }

    renderOptions() {
        if (this.filteredData.length === 0) {
            this.elements.optionsContainer.innerHTML = `
                <div class="p-3 text-gray-500 text-sm text-center">${this.options.noResultsText}</div>
            `;
            return;
        }

        const optionsHtml = this.filteredData.map(item => {
            const value = item[this.options.valueField];
            const label = item[this.options.labelField];
            const isSelected = this.selectedItems.has(value);
            
            return `
                <div class="option-item flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}" data-value="${value}">
                    <div class="checkbox-container mr-3">
                        <input type="checkbox" class="option-checkbox" ${isSelected ? 'checked' : ''} tabindex="-1">
                    </div>
                    <span class="option-label flex-1">${label}</span>
                    ${isSelected ? '<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>' : ''}
                </div>
            `;
        }).join('');

        this.elements.optionsContainer.innerHTML = optionsHtml;

        // Add click listeners to options
        this.elements.optionsContainer.querySelectorAll('.option-item').forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                const value = option.dataset.value;
                this.toggleSelection(value);
            });
        });
    }

    toggleSelection(value) {
        if (this.selectedItems.has(value)) {
            this.selectedItems.delete(value);
        } else {
            this.selectedItems.add(value);
        }
        
        this.updateDisplay();
        this.renderOptions(); // Re-render to update checkboxes
        this.options.onSelectionChange(Array.from(this.selectedItems));
    }

    updateDisplay() {
        const selectedCount = this.selectedItems.size;
        
        if (selectedCount === 0) {
            this.elements.selectedDisplay.innerHTML = `<span class="placeholder text-gray-500">${this.options.placeholder}</span>`;
            if (this.elements.clearBtn) {
                this.elements.clearBtn.classList.add('hidden');
            }
        } else {
            const selectedLabels = Array.from(this.selectedItems).map(value => {
                const item = this.options.data.find(item => item[this.options.valueField] === value);
                return item ? item[this.options.labelField] : value;
            });

            let displayText;
            if (selectedCount <= this.options.maxDisplayItems) {
                displayText = selectedLabels.join(', ');
            } else {
                const firstItems = selectedLabels.slice(0, this.options.maxDisplayItems).join(', ');
                displayText = `${firstItems} ve ${selectedCount - this.options.maxDisplayItems} tane daha`;
            }

            this.elements.selectedDisplay.innerHTML = `<span class="selected-text text-gray-900">${displayText}</span>`;
            
            if (this.elements.clearBtn) {
                this.elements.clearBtn.classList.remove('hidden');
            }
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.elements.dropdown.classList.remove('hidden');
        this.elements.dropdownArrow.style.transform = 'rotate(180deg)';
        this.elements.searchInput.focus();
        this.renderOptions();
    }

    close() {
        this.isOpen = false;
        this.elements.dropdown.classList.add('hidden');
        this.elements.dropdownArrow.style.transform = 'rotate(0deg)';
        this.elements.searchInput.value = '';
        this.filteredData = [...this.options.data];
    }

    clearSelection() {
        this.selectedItems.clear();
        this.updateDisplay();
        this.renderOptions();
        this.options.onSelectionChange([]);
    }

    setData(data) {
        this.options.data = data;
        this.filteredData = [...data];
        this.renderOptions();
    }

    getSelectedValues() {
        return Array.from(this.selectedItems);
    }

    setSelectedValues(values) {
        this.selectedItems = new Set(values);
        this.updateDisplay();
        this.renderOptions();
    }

    updateFilteredData() {
        this.filteredData = [...this.options.data];
        this.renderOptions();
    }
}

// Export for use in other modules
window.MultiSelectSearch = MultiSelectSearch;