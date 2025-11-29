/**
 * Suppliers Table Module
 * Handles table rendering and display logic
 */

import { getSuppliers, getPaginationDisplay } from './suppliers-state.js';

/**
 * Render suppliers table
 */
export function renderTable() {
    const tbody = document.getElementById('suppliersTableBody');
    const suppliers = getSuppliers();
    
    if (!tbody) return;
    
    if (suppliers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="px-6 py-12 text-center text-gray-500">
                    <div class="flex flex-col items-center">
                        <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4.5"/>
                        </svg>
                        <p class="text-lg font-medium">Tedarikçi bulunamadı</p>
                        <p class="text-sm">Yeni tedarikçi eklemek için yukarıdaki butonu kullanın</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = suppliers.map(supplier => createTableRow(supplier)).join('');
}

/**
 * Create a table row for a supplier
 * @param {Object} supplier - Supplier data
 * @returns {string} HTML string
 */
function createTableRow(supplier) {
    const statusClass = supplier.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    const statusText = supplier.is_active ? 'Aktif' : 'Pasif';
    const productCount = supplier.product_count || 0;
    
    return `
        <tr class="hover:bg-gray-50" data-supplier-id="${supplier.id}">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${escapeHtml(supplier.company_code || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${escapeHtml(supplier.company_name)}</div>
                ${supplier.tax_number ? `<div class="text-sm text-gray-500">VN: ${escapeHtml(supplier.tax_number)}</div>` : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${escapeHtml(supplier.contact_person || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${escapeHtml(supplier.email || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${escapeHtml(supplier.phone || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${escapeHtml(supplier.city || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${escapeHtml(supplier.payment_terms || '-')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${productCount}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button class="text-indigo-600 hover:text-indigo-900 edit-supplier" data-supplier-id="${supplier.id}" title="Düzenle">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                        </svg>
                    </button>
                    <button class="text-blue-600 hover:text-blue-900 view-products" data-supplier-id="${supplier.id}" title="Ürünleri Gör">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                    <button class="text-red-600 hover:text-red-900 delete-supplier" data-supplier-id="${supplier.id}" title="Sil">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd"/>
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v6a1 1 0 11-2 0V7zM12 7a1 1 0 10-2 0v6a1 1 0 102 0V7z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Update pagination display
 */
export function updatePagination() {
    const display = getPaginationDisplay();
    
    // Update info text - try both element IDs for compatibility
    const infoEl = document.getElementById('paginationInfo') || document.getElementById('pageInfo');
    if (infoEl) {
        // Update the correct element based on what we found
        if (infoEl.id === 'pageInfo') {
            infoEl.textContent = `Sayfa ${display.currentPage} / ${display.totalPages}`;
        } else {
            infoEl.textContent = `${display.start}-${display.end} / ${display.total} kayıt`;
        }
    }
    
    // Update separate page info if exists
    const pageInfoEl = document.getElementById('currentPageInfo');
    if (pageInfoEl) {
        pageInfoEl.textContent = `Sayfa ${display.currentPage} / ${display.totalPages}`;
    }
    
    // Update button states
    updatePaginationButtons(display);
}

/**
 * Update pagination button states
 * @param {Object} display - Pagination display data
 */
function updatePaginationButtons(display) {
    const firstBtn = document.getElementById('firstPageBtn');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const lastBtn = document.getElementById('lastPageBtn');
    
    const isFirstPage = display.currentPage === 1;
    const isLastPage = display.currentPage === display.totalPages;
    
    if (firstBtn) firstBtn.disabled = isFirstPage;
    if (prevBtn) prevBtn.disabled = isFirstPage;
    if (nextBtn) nextBtn.disabled = isLastPage;
    if (lastBtn) lastBtn.disabled = isLastPage;
}

/**
 * Update statistics display
 * @param {Object} stats - Statistics data
 */
export function updateStats(stats) {
    const elements = {
        totalSuppliers: document.getElementById('totalSuppliers'),
        activeSuppliers: document.getElementById('activeSuppliers'),
        totalProducts: document.getElementById('totalProducts')
    };
    
    if (elements.totalSuppliers) {
        elements.totalSuppliers.textContent = stats.total || 0;
    }
    
    if (elements.activeSuppliers) {
        elements.activeSuppliers.textContent = stats.active || 0;
    }
    
    if (elements.totalProducts) {
        elements.totalProducts.textContent = stats.totalProducts || 0;
    }
}

/**
 * Show loading state in table
 */
export function showTableLoading() {
    const tbody = document.getElementById('suppliersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="10" class="px-6 py-12 text-center">
                <div class="flex flex-col items-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                    <p class="text-gray-600">Tedarikçiler yükleniyor...</p>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Show error state in table
 * @param {string} message - Error message
 */
export function showTableError(message) {
    const tbody = document.getElementById('suppliersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="10" class="px-6 py-12 text-center">
                <div class="flex flex-col items-center">
                    <svg class="w-12 h-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="text-lg font-medium text-red-600">Hata Oluştu</p>
                    <p class="text-sm text-gray-600">${escapeHtml(message)}</p>
                    <button onclick="window.SuppliersApp.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Tekrar Dene
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Render products table in modal
 * @param {Object|Array} data - Products data (can be response object or array)
 */
export function renderProductsTable(data) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    // Handle both response object and direct array
    const products = Array.isArray(data) ? data : (data.products || []);
    
    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="products-empty-state">
                    <div>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4.5"/>
                        </svg>
                        <h3>Ürün Bulunamadı</h3>
                        <p>Bu tedarikçiye ait ürün kaydı bulunmuyor</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = products.map(product => createProductRow(product)).join('');
    
    // Update products count
    const countElement = document.getElementById('productsCount');
    if (countElement) {
        countElement.textContent = products.length;
    }
}

/**
 * Create a product row
 * @param {Object} product - Product data
 * @returns {string} HTML string
 */
function createProductRow(product) {
    const statusClass = product.is_active ? 'status-active' : 'status-inactive';
    const statusText = product.is_active ? 'Aktif' : 'Pasif';
    
    // Handle both direct product and nested product object
    const productName = product.product_name || product.supplier_product_name || (product.product && product.product.name) || '-';
    
    // Priority styling
    let priorityClass = '';
    let priorityIcon = '';
    const priority = product.priority || 'normal';
    
    switch (priority.toLowerCase()) {
        case 'primary':
        case 'birincil':
        case '1':
            priorityClass = 'priority-primary';
            priorityIcon = '⭐';
            break;
        case 'secondary':
        case 'ikincil':
        case '2':
            priorityClass = 'priority-secondary';
            priorityIcon = '🥈';
            break;
        case 'tertiary':
        case 'üçüncül':
        case '3':
            priorityClass = 'priority-tertiary';
            priorityIcon = '🥉';
            break;
        default:
            priorityClass = '';
            priorityIcon = '';
    }
    
    return `
        <tr>
            <td class="product-name">
                <div class="flex items-center">
                    <div>
                        <div class="font-medium text-gray-900">${escapeHtml(productName)}</div>
                        ${product.product_description ? `<div class="text-xs text-gray-500 mt-1">${escapeHtml(product.product_description)}</div>` : ''}
                    </div>
                </div>
            </td>
            <td>
                ${product.supplier_product_code ? `<span class="product-code">${escapeHtml(product.supplier_product_code)}</span>` : '<span class="text-gray-400">-</span>'}
            </td>
            <td class="product-price">
                ${formatCurrency(product.unit_cost, product.currency)}
            </td>
            <td class="product-quantity">
                ${product.minimum_order_quantity ? `<span class="font-medium">${product.minimum_order_quantity}</span> adet` : '<span class="text-gray-400">-</span>'}
            </td>
            <td class="product-lead-time">
                ${product.lead_time_days ? `<span class="font-medium">${product.lead_time_days}</span> gün` : '<span class="text-gray-400">-</span>'}
            </td>
            <td class="product-priority">
                <span class="${priorityClass}">
                    ${priorityIcon} ${priority === 'normal' ? 'Normal' : priority}
                </span>
            </td>
            <td>
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass === 'status-active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${statusText}
                </span>
            </td>
        </tr>
    `;
}

/**
 * Highlight search results in table
 * @param {string} searchTerm - Search term to highlight
 */
export function highlightSearchResults(searchTerm) {
    if (!searchTerm) return;
    
    const tbody = document.getElementById('suppliersTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    const term = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(term)) {
            row.style.backgroundColor = '#fffacd';
        } else {
            row.style.backgroundColor = '';
        }
    });
}

/**
 * Sort table by column (client-side)
 * @param {string} column - Column name
 * @param {string} direction - Sort direction ('asc' or 'desc')
 */
export function sortTableByColumn(column, direction = 'asc') {
    const suppliers = getSuppliers();
    
    suppliers.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        // Handle null/undefined
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';
        
        // Convert to lowercase for string comparison
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    renderTable();
}

/**
 * Format currency value
 * @param {number} amount - Amount
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency
 */
function formatCurrency(amount, currency = 'TRY') {
    if (amount == null) return '-';
    
    const formatted = new Intl.NumberFormat('tr-TR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
    
    return `${formatted} ${currency}`;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (text == null) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Update table column header sort indicators
 * @param {string} column - Column being sorted
 * @param {string} direction - Sort direction
 */
export function updateSortIndicators(column, direction) {
    const headers = document.querySelectorAll('#suppliersTable th');
    
    headers.forEach(header => {
        const headerColumn = header.dataset.column;
        header.classList.remove('sort-asc', 'sort-desc');
        
        if (headerColumn === column) {
            header.classList.add(`sort-${direction}`);
        }
    });
}

/**
 * Export table data to CSV
 * @returns {string} CSV data
 */
export function exportToCSV() {
    const suppliers = getSuppliers();
    
    const headers = [
        'Kod', 'Firma Adı', 'Vergi No', 'Yetkili', 'Telefon', 
        'E-posta', 'Şehir', 'Ödeme Koşulları', 'Değerlendirme', 
        'Ürün Sayısı', 'Durum'
    ];
    
    const rows = suppliers.map(s => [
        s.company_code || '',
        s.company_name || '',
        s.tax_number || '',
        s.contact_person || '',
        s.phone || '',
        s.email || '',
        s.city || '',
        s.payment_terms || '',
        s.rating || '',
        s.product_count || 0,
        s.is_active ? 'Aktif' : 'Pasif'
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV() {
    const csv = exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `tedarikciler_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export default {
    renderTable,
    updatePagination,
    updateStats,
    showTableLoading,
    showTableError,
    renderProductsTable,
    highlightSearchResults,
    sortTableByColumn,
    updateSortIndicators,
    exportToCSV,
    downloadCSV
};
