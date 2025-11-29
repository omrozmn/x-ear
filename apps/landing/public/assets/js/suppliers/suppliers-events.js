/**
 * Suppliers Events Module
 * Handles all user interactions and events
 */

import * as API from './suppliers-api.js';
import * as State from './suppliers-state.js';
import * as Table from './suppliers-table.js';
import * as Modal from './suppliers-modal.js';
import * as Filters from './suppliers-filters.js';

/**
 * Setup all event listeners
 */
export function setupEventListeners() {
    setupButtonListeners();
    setupTableListeners();
    setupPaginationListeners();
    setupFormListeners();
    Filters.setupFilterListeners();
    Modal.setupModalListeners();
    Modal.setupFieldValidation();
}

/**
 * Setup button event listeners
 */
function setupButtonListeners() {
    // Add supplier button
    const addBtn = document.getElementById('addSupplierBtn');
    if (addBtn) {
        addBtn.addEventListener('click', handleAddSupplier);
    }
    
    // Sort order button
    const sortOrderBtn = document.getElementById('sortOrderBtn');
    if (sortOrderBtn) {
        sortOrderBtn.addEventListener('click', handleSortOrderToggle);
    }
}

/**
 * Setup table event listeners (using event delegation)
 */
function setupTableListeners() {
    const tbody = document.getElementById('suppliersTableBody');
    if (!tbody) return;
    
    tbody.addEventListener('click', async (e) => {
        const target = e.target;
        
        // Edit supplier
        if (target.classList.contains('edit-supplier') || target.closest('.edit-supplier')) {
            const btn = target.classList.contains('edit-supplier') ? target : target.closest('.edit-supplier');
            const supplierId = parseInt(btn.dataset.supplierId);
            await handleEditSupplier(supplierId);
        }
        
        // Delete supplier
        else if (target.classList.contains('delete-supplier') || target.closest('.delete-supplier')) {
            const btn = target.classList.contains('delete-supplier') ? target : target.closest('.delete-supplier');
            const supplierId = parseInt(btn.dataset.supplierId);
            await handleDeleteSupplier(supplierId);
        }
        
        // View products
        else if (target.classList.contains('view-products') || target.closest('.view-products')) {
            e.preventDefault();
            const btn = target.classList.contains('view-products') ? target : target.closest('.view-products');
            const supplierId = parseInt(btn.dataset.supplierId);
            await handleViewProducts(supplierId);
        }
    });
}

/**
 * Setup pagination event listeners
 */
function setupPaginationListeners() {
    const firstBtn = document.getElementById('firstPageBtn');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const lastBtn = document.getElementById('lastPageBtn');
    
    if (firstBtn) {
        firstBtn.addEventListener('click', () => handlePageChange('first'));
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => handlePageChange('prev'));
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => handlePageChange('next'));
    }
    
    if (lastBtn) {
        lastBtn.addEventListener('click', () => handlePageChange('last'));
    }
}

/**
 * Setup form event listeners
 */
function setupFormListeners() {
    const saveBtn = document.getElementById('saveSupplierBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSaveSupplier);
    }
    
    const form = document.getElementById('supplierForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSaveSupplier();
        });
    }
}

/**
 * Handle add supplier button click
 */
function handleAddSupplier() {
    Modal.openCreateModal();
}

/**
 * Handle sort order toggle
 */
function handleSortOrderToggle() {
    Filters.toggleSortOrder();
    
    // Update button text
    const filters = State.getFilters();
    const sortOrderText = document.getElementById('sortOrderText');
    if (sortOrderText) {
        sortOrderText.textContent = filters.order === 'asc' ? 'Artan' : 'Azalan';
    }
}

/**
 * Handle edit supplier button click
 * @param {number} supplierId - Supplier ID
 */
async function handleEditSupplier(supplierId) {
    try {
        showLoading(true);
        const supplier = await API.getSupplier(supplierId);
        Modal.openEditModal(supplier);
    } catch (error) {
        showError(API.handleApiError(error));
    } finally {
        showLoading(false);
    }
}

/**
 * Handle delete supplier button click
 * @param {number} supplierId - Supplier ID
 */
async function handleDeleteSupplier(supplierId) {
    const suppliers = State.getSuppliers();
    const supplier = suppliers.find(s => s.id === supplierId);
    
    if (!supplier) return;
    
    const confirmed = confirm(
        `"${supplier.company_name}" tedarikçisini silmek istediğinizden emin misiniz?\n\n` +
        `Bu işlem geri alınamaz.`
    );
    
    if (!confirmed) return;
    
    try {
        showLoading(true);
        await API.deleteSupplier(supplierId);
        State.removeSupplier(supplierId);
        Table.renderTable();
        showSuccess('Tedarikçi başarıyla silindi');
        
        // Refresh data
        await loadSuppliers();
    } catch (error) {
        showError(API.handleApiError(error));
    } finally {
        showLoading(false);
    }
}

/**
 * Handle view products button click
 * @param {number} supplierId - Supplier ID
 */
async function handleViewProducts(supplierId) {
    try {
        showLoading(true);
        
        const suppliers = State.getSuppliers();
        const supplier = suppliers.find(s => s.id === supplierId);
        
        if (supplier) {
            Modal.updateProductsModalTitle(supplier.company_name);
        }
        
        const products = await API.getSupplierProducts(supplierId);
        Table.renderProductsTable(products);
        Modal.openProductsModal(supplierId);
    } catch (error) {
        showError(API.handleApiError(error));
    } finally {
        showLoading(false);
    }
}

/**
 * Handle save supplier (create or update)
 */
async function handleSaveSupplier() {
    try {
        Modal.setModalLoading(true);
        const result = await Modal.handleFormSubmit();
        
        const supplierId = document.getElementById('supplierId')?.value;
        
        if (supplierId) {
            // Update
            State.updateSupplier(result);
            showSuccess('Tedarikçi başarıyla güncellendi');
        } else {
            // Create
            State.addSupplier(result);
            showSuccess('Tedarikçi başarıyla oluşturuldu');
        }
        
        Table.renderTable();
        Modal.closeModal();
        
        // Refresh data
        await loadSuppliers();
    } catch (error) {
        console.error('Save supplier error:', error);
        
        if (error.message !== 'Form validation failed') {
            // Show user-friendly error message
            let errorMessage = error.message;
            
            // Handle specific error cases based on status code and message
            if (error.status === 409 || error.message.includes('409') || error.message.includes('CONFLICT') || 
                error.message.includes('already exists') || error.message.includes('duplicate')) {
                errorMessage = 'Bu şirket adı zaten kayıtlı. Lütfen farklı bir şirket adı girin.';
            } else if (error.status === 400 || error.message.includes('400') || error.message.includes('validation')) {
                errorMessage = 'Form verilerinde hata var. Lütfen tüm alanları kontrol edin.';
            } else if (error.status === 500 || error.message.includes('500') || error.message.includes('server')) {
                errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
            } else if (error.status === 404) {
                errorMessage = 'İstenen kaynak bulunamadı.';
            } else if (error.status === 403) {
                errorMessage = 'Bu işlem için yetkiniz bulunmuyor.';
            } else if (error.status === 401) {
                errorMessage = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
            }
            
            Modal.showModalError(errorMessage);
        }
    } finally {
        Modal.setModalLoading(false);
    }
}

/**
 * Handle page change
 * @param {string} action - Page action ('first', 'prev', 'next', 'last')
 */
async function handlePageChange(action) {
    const pagination = State.getPagination();
    let newPage = pagination.currentPage;
    
    switch (action) {
        case 'first':
            newPage = 1;
            break;
        case 'prev':
            newPage = Math.max(1, pagination.currentPage - 1);
            break;
        case 'next':
            newPage = Math.min(pagination.totalPages, pagination.currentPage + 1);
            break;
        case 'last':
            newPage = pagination.totalPages;
            break;
    }
    
    if (newPage !== pagination.currentPage) {
        State.setCurrentPage(newPage);
        await loadSuppliers();
    }
}

/**
 * Load suppliers from API
 */
export async function loadSuppliers() {
    try {
        showLoading(true);
        Table.showTableLoading();
        
        const params = State.buildQueryParams();
        const response = await API.getSuppliers(params);
        
        // Fix: Backend returns suppliers in 'data' field, not 'suppliers'
        // Backend returns pagination in 'meta' with different field names
        const suppliers = response.data || [];
        const meta = response.meta || {};
        
        State.setSuppliers(suppliers);
        State.setPagination({
            currentPage: meta.page || 1,
            totalPages: meta.totalPages || 1,
            total: meta.total || 0,
            perPage: meta.perPage || 50
        });
        
        Table.renderTable();
        Table.updatePagination();
        Filters.updateClearButtonState();
        Filters.toggleFilterSummary();
        
        // Load stats
        await loadStats();
    } catch (error) {
        Table.showTableError(API.handleApiError(error));
    } finally {
        showLoading(false);
    }
}

/**
 * Load statistics from API
 */
async function loadStats() {
    try {
        const stats = await API.getSupplierStats();
        // Map backend field names to frontend
        const mappedStats = {
            total: stats.total_suppliers || 0,
            active: stats.active_suppliers || 0,
            totalProducts: stats.total_product_relationships || 0
        };
        State.setStats(mappedStats);
        Table.updateStats(mappedStats);
    } catch (error) {
        console.error('Failed to load stats:', error);
        // Don't show error to user, stats are not critical
    }
}

/**
 * Show loading overlay
 * @param {boolean} show - Show or hide
 */
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
    State.setLoading(show);
}

/**
 * Show success message
 * @param {string} message - Success message
 */
function showSuccess(message) {
    showNotification(message, 'success');
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
    showNotification(message, 'error');
}

/**
 * Show notification toast
 * @param {string} message - Message text
 * @param {string} type - Message type ('success', 'error', 'info')
 */
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification-toast');
    if (existing) {
        existing.remove();
    }
    
    // Create notification
    const toast = document.createElement('div');
    toast.className = `notification-toast notification-${type}`;
    toast.textContent = message;
    
    // Add icon
    const icon = document.createElement('span');
    icon.className = 'notification-icon';
    icon.textContent = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    toast.insertBefore(icon, toast.firstChild);
    
    // Add to page
    document.body.appendChild(toast);
    
    // Show with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

/**
 * Subscribe to state changes
 */
export function subscribeToStateChanges() {
    State.subscribe((type, payload) => {
        switch (type) {
            case 'FILTER_CHANGED':
            case 'FILTERS_CHANGED':
            case 'FILTERS_RESET':
                loadSuppliers();
                break;
                
            case 'PAGE_CHANGED':
                loadSuppliers();
                break;
                
            case 'SUPPLIERS_UPDATED':
                Table.renderTable();
                Table.updatePagination();
                break;
                
            case 'STATS_UPDATED':
                Table.updateStats(payload);
                break;
        }
    });
}

/**
 * Handle keyboard shortcuts
 */
export function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N: New supplier
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            handleAddSupplier();
        }
        
        // Ctrl/Cmd + F: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Ctrl/Cmd + R: Refresh
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            loadSuppliers();
        }
    });
}

/**
 * Handle window resize
 */
export function setupWindowResize() {
    let resizeTimeout;
    
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Adjust table if needed
            Table.renderTable();
        }, 250);
    });
}

/**
 * Handle page visibility change
 */
export function setupVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            // Refresh data when page becomes visible
            const lastUpdate = State.getState().lastUpdate;
            const now = Date.now();
            
            // Refresh if more than 5 minutes old
            if (!lastUpdate || now - lastUpdate > 5 * 60 * 1000) {
                loadSuppliers();
            }
        }
    });
}

export default {
    setupEventListeners,
    loadSuppliers,
    subscribeToStateChanges,
    setupKeyboardShortcuts,
    setupWindowResize,
    setupVisibilityChange
};
