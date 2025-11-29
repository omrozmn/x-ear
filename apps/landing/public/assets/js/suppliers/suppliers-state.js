/**
 * Suppliers State Management Module
 * Manages application state for suppliers page
 */

// Application state
const state = {
    suppliers: [],
    currentSupplier: null,
    stats: {
        total: 0,
        active: 0,
        totalProducts: 0
    },
    filters: {
        search: '',
        status: 'active',
        city: '',
        sortBy: 'company_name',
        order: 'asc'
    },
    pagination: {
        currentPage: 1,
        totalPages: 1,
        perPage: 50,
        total: 0
    },
    ui: {
        isLoading: false,
        modalOpen: false,
        modalMode: 'create', // 'create' or 'edit'
        selectedSuppliers: []
    },
    lastUpdate: null
};

// State listeners
const listeners = new Set();

/**
 * Subscribe to state changes
 * @param {Function} listener - Callback function
 * @returns {Function} Unsubscribe function
 */
export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Notify all listeners of state change
 * @param {string} type - Type of change
 * @param {*} payload - Change payload
 */
function notify(type, payload) {
    listeners.forEach(listener => {
        try {
            listener(type, payload, state);
        } catch (error) {
            console.error('State listener error:', error);
        }
    });
}

/**
 * Get current state
 * @returns {Object} Current state
 */
export function getState() {
    return { ...state };
}

/**
 * Get suppliers list
 * @returns {Array} Suppliers array
 */
export function getSuppliers() {
    return [...state.suppliers];
}

/**
 * Set suppliers list
 * @param {Array} suppliers - New suppliers array
 */
export function setSuppliers(suppliers) {
    state.suppliers = suppliers;
    state.lastUpdate = Date.now();
    notify('SUPPLIERS_UPDATED', suppliers);
}

/**
 * Add a supplier to the list
 * @param {Object} supplier - Supplier to add
 */
export function addSupplier(supplier) {
    state.suppliers.unshift(supplier);
    state.pagination.total += 1;
    notify('SUPPLIER_ADDED', supplier);
}

/**
 * Update a supplier in the list
 * @param {Object} updatedSupplier - Updated supplier data
 */
export function updateSupplier(updatedSupplier) {
    const index = state.suppliers.findIndex(s => s.id === updatedSupplier.id);
    if (index !== -1) {
        state.suppliers[index] = updatedSupplier;
        notify('SUPPLIER_UPDATED', updatedSupplier);
    }
}

/**
 * Remove a supplier from the list
 * @param {number} supplierId - Supplier ID to remove
 */
export function removeSupplier(supplierId) {
    const index = state.suppliers.findIndex(s => s.id === supplierId);
    if (index !== -1) {
        const removed = state.suppliers.splice(index, 1)[0];
        state.pagination.total -= 1;
        notify('SUPPLIER_REMOVED', removed);
    }
}

/**
 * Get current supplier (being viewed/edited)
 * @returns {Object|null} Current supplier
 */
export function getCurrentSupplier() {
    return state.currentSupplier ? { ...state.currentSupplier } : null;
}

/**
 * Set current supplier
 * @param {Object|null} supplier - Supplier to set as current
 */
export function setCurrentSupplier(supplier) {
    state.currentSupplier = supplier;
    notify('CURRENT_SUPPLIER_CHANGED', supplier);
}

/**
 * Get statistics
 * @returns {Object} Stats object
 */
export function getStats() {
    return { ...state.stats };
}

/**
 * Set statistics
 * @param {Object} stats - New stats
 */
export function setStats(stats) {
    state.stats = { ...state.stats, ...stats };
    notify('STATS_UPDATED', state.stats);
}

/**
 * Get current filters
 * @returns {Object} Filters object
 */
export function getFilters() {
    return { ...state.filters };
}

/**
 * Set filter value
 * @param {string} key - Filter key
 * @param {*} value - Filter value
 */
export function setFilter(key, value) {
    state.filters[key] = value;
    notify('FILTER_CHANGED', { key, value });
}

/**
 * Set multiple filters at once
 * @param {Object} filters - Filters object
 */
export function setFilters(filters) {
    state.filters = { ...state.filters, ...filters };
    notify('FILTERS_CHANGED', state.filters);
}

/**
 * Reset filters to default
 */
export function resetFilters() {
    state.filters = {
        search: '',
        status: 'active',
        city: '',
        sortBy: 'company_name',
        order: 'asc'
    };
    notify('FILTERS_RESET', state.filters);
}

/**
 * Get pagination info
 * @returns {Object} Pagination object
 */
export function getPagination() {
    return { ...state.pagination };
}

/**
 * Set pagination info
 * @param {Object} pagination - Pagination data
 */
export function setPagination(pagination) {
    state.pagination = { ...state.pagination, ...pagination };
    notify('PAGINATION_CHANGED', state.pagination);
}

/**
 * Set current page
 * @param {number} page - Page number
 */
export function setCurrentPage(page) {
    state.pagination.currentPage = page;
    notify('PAGE_CHANGED', page);
}

/**
 * Get UI state
 * @returns {Object} UI state
 */
export function getUIState() {
    return { ...state.ui };
}

/**
 * Set loading state
 * @param {boolean} isLoading - Loading state
 */
export function setLoading(isLoading) {
    state.ui.isLoading = isLoading;
    notify('LOADING_CHANGED', isLoading);
}

/**
 * Set modal state
 * @param {boolean} isOpen - Modal open state
 * @param {string} mode - Modal mode ('create' or 'edit')
 */
export function setModalState(isOpen, mode = 'create') {
    state.ui.modalOpen = isOpen;
    state.ui.modalMode = mode;
    notify('MODAL_STATE_CHANGED', { isOpen, mode });
}

/**
 * Get selected suppliers
 * @returns {Array} Selected supplier IDs
 */
export function getSelectedSuppliers() {
    return [...state.ui.selectedSuppliers];
}

/**
 * Toggle supplier selection
 * @param {number} supplierId - Supplier ID
 */
export function toggleSupplierSelection(supplierId) {
    const index = state.ui.selectedSuppliers.indexOf(supplierId);
    if (index === -1) {
        state.ui.selectedSuppliers.push(supplierId);
    } else {
        state.ui.selectedSuppliers.splice(index, 1);
    }
    notify('SELECTION_CHANGED', state.ui.selectedSuppliers);
}

/**
 * Clear all selections
 */
export function clearSelections() {
    state.ui.selectedSuppliers = [];
    notify('SELECTION_CLEARED', []);
}

/**
 * Build query parameters from current filters
 * @returns {Object} Query parameters
 */
export function buildQueryParams() {
    const params = {
        page: state.pagination.currentPage,
        per_page: state.pagination.perPage
    };
    
    if (state.filters.search) {
        params.search = state.filters.search;
    }
    
    if (state.filters.status === 'active') {
        params.is_active = 'true';
    } else if (state.filters.status === 'inactive') {
        params.is_active = 'false';
    }
    // Don't send is_active for 'all'
    
    if (state.filters.city) {
        params.city = state.filters.city;
    }
    
    if (state.filters.sortBy) {
        params.sort_by = state.filters.sortBy;
        params.sort_order = state.filters.order;
    }
    
    return params;
}

/**
 * Calculate statistics from current suppliers list
 */
export function calculateStatsFromSuppliers() {
    const suppliers = state.suppliers;
    const active = suppliers.filter(s => s.is_active).length;
    const totalProducts = suppliers.reduce((sum, s) => sum + (s.product_count || 0), 0);
    
    setStats({
        total: state.pagination.total,
        active: active,
        totalProducts: totalProducts
    });
}

/**
 * Check if there are active filters
 * @returns {boolean} True if any filter is active
 */
export function hasActiveFilters() {
    return state.filters.search !== '' ||
           state.filters.status !== 'active' ||
           state.filters.city !== '';
}

/**
 * Get pagination display info
 * @returns {Object} Pagination display data
 */
export function getPaginationDisplay() {
    const { currentPage, perPage, total } = state.pagination;
    const start = total > 0 ? (currentPage - 1) * perPage + 1 : 0;
    const end = Math.min(currentPage * perPage, total);
    
    return {
        start,
        end,
        total,
        currentPage,
        totalPages: Math.ceil(total / perPage) || 1
    };
}

/**
 * Reset entire state to initial values
 */
export function resetState() {
    state.suppliers = [];
    state.currentSupplier = null;
    state.stats = {
        total: 0,
        active: 0,
        totalProducts: 0,
        avgRating: 0
    };
    resetFilters();
    state.pagination = {
        currentPage: 1,
        totalPages: 1,
        perPage: 50,
        total: 0
    };
    state.ui = {
        isLoading: false,
        modalOpen: false,
        modalMode: 'create',
        selectedSuppliers: []
    };
    notify('STATE_RESET', null);
}

export default {
    subscribe,
    getState,
    getSuppliers,
    setSuppliers,
    addSupplier,
    updateSupplier,
    removeSupplier,
    getCurrentSupplier,
    setCurrentSupplier,
    getStats,
    setStats,
    getFilters,
    setFilter,
    setFilters,
    resetFilters,
    getPagination,
    setPagination,
    setCurrentPage,
    getUIState,
    setLoading,
    setModalState,
    getSelectedSuppliers,
    toggleSupplierSelection,
    clearSelections,
    buildQueryParams,
    calculateStatsFromSuppliers,
    hasActiveFilters,
    getPaginationDisplay,
    resetState
};
