/**
 * Suppliers Filters Module
 * Handles filtering, searching, and sorting
 */

import { getFilters, setFilter, setFilters, resetFilters, setCurrentPage } from './suppliers-state.js';

/**
 * Initialize filter inputs with current values
 */
export function initializeFilters() {
    const filters = getFilters();
    
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const cityFilter = document.getElementById('cityFilter');
    const sortBy = document.getElementById('sortBy');
    
    if (searchInput) searchInput.value = filters.search || '';
    if (statusFilter) statusFilter.value = filters.status || 'active';
    if (cityFilter) cityFilter.value = filters.city || '';
    if (sortBy) sortBy.value = filters.sortBy || 'company_name';
}

/**
 * Handle search input change
 * @param {string} value - Search value
 */
export function handleSearchChange(value) {
    setFilter('search', value.trim());
    setCurrentPage(1); // Reset to first page
}

/**
 * Handle status filter change
 * @param {string} value - Status value ('all', 'active', 'inactive')
 */
export function handleStatusChange(value) {
    setFilter('status', value || 'all');
    setCurrentPage(1);
}

/**
 * Handle city filter change
 * @param {string} value - City value
 */
export function handleCityChange(value) {
    setFilter('city', value.trim());
    setCurrentPage(1);
}

/**
 * Handle sort change
 * @param {string} value - Sort field
 */
export function handleSortChange(value) {
    setFilter('sortBy', value);
    setCurrentPage(1);
}

/**
 * Handle sort order toggle
 */
export function toggleSortOrder() {
    const filters = getFilters();
    const newOrder = filters.order === 'asc' ? 'desc' : 'asc';
    setFilter('order', newOrder);
}

/**
 * Clear all filters
 */
export function handleClearFilters() {
    resetFilters();
    
    // Reset UI elements
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const cityFilter = document.getElementById('cityFilter');
    const sortBy = document.getElementById('sortBy');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = 'active';
    if (cityFilter) cityFilter.value = '';
    if (sortBy) sortBy.value = 'company_name';
    
    setCurrentPage(1);
}

/**
 * Setup filter event listeners
 */
export function setupFilterListeners() {
    // Search input with debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearchChange(e.target.value);
            }, 300); // 300ms debounce
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            handleStatusChange(e.target.value);
        });
    }
    
    // City filter with debounce
    const cityFilter = document.getElementById('cityFilter');
    if (cityFilter) {
        let cityTimeout;
        cityFilter.addEventListener('input', (e) => {
            clearTimeout(cityTimeout);
            cityTimeout = setTimeout(() => {
                handleCityChange(e.target.value);
            }, 300);
        });
    }
    
    // Sort by
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', (e) => {
            handleSortChange(e.target.value);
        });
    }
    
    // Clear filters button
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearFilters);
    }
}

/**
 * Get active filter count
 * @returns {number} Number of active filters
 */
export function getActiveFilterCount() {
    const filters = getFilters();
    let count = 0;
    
    if (filters.search) count++;
    if (filters.status !== 'active') count++;
    if (filters.city) count++;
    
    return count;
}

/**
 * Update clear filters button state
 */
export function updateClearButtonState() {
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (!clearBtn) return;
    
    const count = getActiveFilterCount();
    
    if (count > 0) {
        clearBtn.disabled = false;
        clearBtn.textContent = `Filtreleri Temizle (${count})`;
    } else {
        clearBtn.disabled = true;
        clearBtn.textContent = 'Filtreleri Temizle';
    }
}

/**
 * Build filter summary text
 * @returns {string} Filter summary
 */
export function getFilterSummary() {
    const filters = getFilters();
    const parts = [];
    
    if (filters.search) {
        parts.push(`Arama: "${filters.search}"`);
    }
    
    if (filters.status === 'active') {
        parts.push('Sadece aktif');
    } else if (filters.status === 'inactive') {
        parts.push('Sadece pasif');
    }
    
    if (filters.city) {
        parts.push(`Şehir: ${filters.city}`);
    }
    
    const sortLabels = {
        company_name: 'Firma Adı',
        created_at: 'Eklenme Tarihi',
        product_count: 'Ürün Sayısı'
    };
    
    const sortLabel = sortLabels[filters.sortBy] || filters.sortBy;
    const orderLabel = filters.order === 'asc' ? '↑' : '↓';
    parts.push(`Sıralama: ${sortLabel} ${orderLabel}`);
    
    return parts.join(' • ');
}

/**
 * Show/hide filter summary
 */
export function toggleFilterSummary() {
    let summary = document.getElementById('filterSummary');
    
    if (getActiveFilterCount() === 0) {
        if (summary) {
            summary.remove();
        }
        return;
    }
    
    if (!summary) {
        summary = document.createElement('div');
        summary.id = 'filterSummary';
        summary.className = 'filter-summary';
        
        const filtersContainer = document.querySelector('.filters-container');
        if (filtersContainer) {
            filtersContainer.appendChild(summary);
        }
    }
    
    summary.textContent = getFilterSummary();
}

/**
 * Validate filter values
 * @param {Object} filters - Filters to validate
 * @returns {boolean} True if valid
 */
export function validateFilters(filters) {
    // Check valid status values
    if (filters.status && !['all', 'active', 'inactive'].includes(filters.status)) {
        console.error('Invalid status filter:', filters.status);
        return false;
    }
    
    // Check valid sort fields
    const validSortFields = ['company_name', 'created_at', 'product_count'];
    if (filters.sortBy && !validSortFields.includes(filters.sortBy)) {
        console.error('Invalid sort field:', filters.sortBy);
        return false;
    }
    
    // Check valid sort order
    if (filters.order && !['asc', 'desc'].includes(filters.order)) {
        console.error('Invalid sort order:', filters.order);
        return false;
    }
    
    return true;
}

/**
 * Export current filters as URL parameters
 * @returns {string} URL query string
 */
export function exportFiltersToURL() {
    const filters = getFilters();
    const params = new URLSearchParams();
    
    if (filters.search) params.set('search', filters.search);
    if (filters.status !== 'active') params.set('status', filters.status);
    if (filters.city) params.set('city', filters.city);
    if (filters.sortBy) params.set('sort', filters.sortBy);
    if (filters.order !== 'asc') params.set('order', filters.order);
    
    return params.toString();
}

/**
 * Import filters from URL parameters
 * @param {string} queryString - URL query string
 */
export function importFiltersFromURL(queryString) {
    const params = new URLSearchParams(queryString);
    const filters = {};
    
    if (params.has('search')) filters.search = params.get('search');
    if (params.has('status')) filters.status = params.get('status');
    if (params.has('city')) filters.city = params.get('city');
    if (params.has('sort')) filters.sortBy = params.get('sort');
    if (params.has('order')) filters.order = params.get('order');
    
    if (Object.keys(filters).length > 0 && validateFilters(filters)) {
        setFilters(filters);
        initializeFilters();
    }
}

/**
 * Setup URL sync (update URL when filters change)
 */
export function setupURLSync() {
    // Listen for filter changes and update URL
    let updateTimeout;
    
    const updateURL = () => {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            const queryString = exportFiltersToURL();
            const newURL = queryString 
                ? `${window.location.pathname}?${queryString}`
                : window.location.pathname;
            
            window.history.replaceState({}, '', newURL);
        }, 500);
    };
    
    // Subscribe to filter changes
    ['search', 'status', 'city', 'sortBy', 'order'].forEach(key => {
        document.addEventListener(`filter:${key}`, updateURL);
    });
}

/**
 * Get predefined filter presets
 * @returns {Object} Filter presets
 */
export function getFilterPresets() {
    return {
        all: {
            name: 'Tümü',
            filters: {
                search: '',
                status: 'all',
                city: '',
                sortBy: 'company_name',
                order: 'asc'
            }
        },
        active: {
            name: 'Aktif Tedarikçiler',
            filters: {
                search: '',
                status: 'active',
                city: '',
                sortBy: 'company_name',
                order: 'asc'
            }
        },
        mostProducts: {
            name: 'Çok Ürünlü',
            filters: {
                search: '',
                status: 'active',
                city: '',
                sortBy: 'product_count',
                order: 'desc'
            }
        },
        recent: {
            name: 'Yeni Eklenenler',
            filters: {
                search: '',
                status: 'all',
                city: '',
                sortBy: 'created_at',
                order: 'desc'
            }
        }
    };
}

/**
 * Apply a filter preset
 * @param {string} presetName - Name of preset to apply
 */
export function applyFilterPreset(presetName) {
    const presets = getFilterPresets();
    const preset = presets[presetName];
    
    if (!preset) {
        console.error('Unknown filter preset:', presetName);
        return;
    }
    
    setFilters(preset.filters);
    initializeFilters();
    setCurrentPage(1);
}

export default {
    initializeFilters,
    handleSearchChange,
    handleStatusChange,
    handleCityChange,
    handleSortChange,
    toggleSortOrder,
    handleClearFilters,
    setupFilterListeners,
    getActiveFilterCount,
    updateClearButtonState,
    getFilterSummary,
    toggleFilterSummary,
    validateFilters,
    exportFiltersToURL,
    importFiltersFromURL,
    setupURLSync,
    getFilterPresets,
    applyFilterPreset
};
