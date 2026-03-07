/**
 * Suppliers API Module
 * Handles all API communication for suppliers management
 */

// Get API base from global config
const API_BASE = window.APIConfig?.BACKEND_BASE_URL + '/api' || 'http://localhost:5003/api';

/**
 * Generic API call handler with error handling
 */
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

/**
 * Get all suppliers with pagination and filters
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Suppliers list with pagination info
 */
export async function getSuppliers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/suppliers${queryString ? '?' + queryString : ''}`;
    return await apiCall(endpoint);
}

/**
 * Get a single supplier by ID
 * @param {number} id - Supplier ID
 * @returns {Promise<Object>} Supplier details
 */
export async function getSupplier(id) {
    return await apiCall(`/suppliers/${id}`);
}

/**
 * Create a new supplier
 * @param {Object} supplierData - Supplier data
 * @returns {Promise<Object>} Created supplier
 */
export async function createSupplier(supplierData) {
    return await apiCall('/suppliers', {
        method: 'POST',
        body: JSON.stringify(supplierData)
    });
}

/**
 * Update an existing supplier
 * @param {number} id - Supplier ID
 * @param {Object} supplierData - Updated supplier data
 * @returns {Promise<Object>} Updated supplier
 */
export async function updateSupplier(id, supplierData) {
    return await apiCall(`/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(supplierData)
    });
}

/**
 * Delete a supplier (soft delete)
 * @param {number} id - Supplier ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteSupplier(id) {
    return await apiCall(`/suppliers/${id}`, {
        method: 'DELETE'
    });
}

/**
 * Get all products for a supplier
 * @param {number} supplierId - Supplier ID
 * @returns {Promise<Array>} List of products
 */
export async function getSupplierProducts(supplierId) {
    return await apiCall(`/suppliers/${supplierId}/products`);
}

/**
 * Get all suppliers for a product
 * @param {number} productId - Product ID
 * @returns {Promise<Array>} List of suppliers
 */
export async function getProductSuppliers(productId) {
    return await apiCall(`/products/${productId}/suppliers`);
}

/**
 * Link a supplier to a product
 * @param {number} productId - Product ID
 * @param {Object} linkData - Link data (supplier_id, unit_cost, etc.)
 * @returns {Promise<Object>} Created link
 */
export async function linkSupplierToProduct(productId, linkData) {
    return await apiCall(`/products/${productId}/suppliers`, {
        method: 'POST',
        body: JSON.stringify(linkData)
    });
}

/**
 * Update product-supplier relationship
 * @param {number} linkId - Product-Supplier link ID
 * @param {Object} linkData - Updated link data
 * @returns {Promise<Object>} Updated link
 */
export async function updateProductSupplierLink(linkId, linkData) {
    return await apiCall(`/product-suppliers/${linkId}`, {
        method: 'PUT',
        body: JSON.stringify(linkData)
    });
}

/**
 * Remove product-supplier link
 * @param {number} linkId - Product-Supplier link ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function removeProductSupplierLink(linkId) {
    return await apiCall(`/product-suppliers/${linkId}`, {
        method: 'DELETE'
    });
}

/**
 * Get supplier statistics
 * @returns {Promise<Object>} Statistics data
 */
export async function getSupplierStats() {
    return await apiCall('/suppliers/stats');
}

/**
 * Search suppliers by query string
 * @param {string} query - Search query
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Search results
 */
export async function searchSuppliers(query, options = {}) {
    const params = {
        search: query,
        ...options
    };
    return await getSuppliers(params);
}

/**
 * Filter suppliers by status
 * @param {boolean} isActive - Active status
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Filtered results
 */
export async function filterSuppliersByStatus(isActive, options = {}) {
    const params = {
        is_active: isActive,
        ...options
    };
    return await getSuppliers(params);
}

/**
 * Filter suppliers by city
 * @param {string} city - City name
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Filtered results
 */
export async function filterSuppliersByCity(city, options = {}) {
    const params = {
        city: city,
        ...options
    };
    return await getSuppliers(params);
}

/**
 * Sort suppliers
 * @param {string} sortBy - Field to sort by
 * @param {string} order - Sort order (asc/desc)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Sorted results
 */
export async function sortSuppliers(sortBy, order = 'asc', options = {}) {
    const params = {
        sort_by: sortBy,
        sort_order: order,
        ...options
    };
    return await getSuppliers(params);
}

/**
 * Get paginated suppliers
 * @param {number} page - Page number
 * @param {number} perPage - Items per page
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Paginated results
 */
export async function getPaginatedSuppliers(page, perPage = 50, options = {}) {
    const params = {
        page: page,
        per_page: perPage,
        ...options
    };
    return await getSuppliers(params);
}

/**
 * Validate supplier data before submission
 * @param {Object} data - Supplier data to validate
 * @returns {Object} Validation result with errors
 */
export function validateSupplierData(data) {
    const errors = {};
    
    if (!data.company_name || data.company_name.trim() === '') {
        errors.company_name = 'Firma adı zorunludur';
    }
    
    if (data.email && !isValidEmail(data.email)) {
        errors.email = 'Geçerli bir e-posta adresi giriniz';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Helper function to validate email format
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Format supplier data for API submission
 * @param {Object} formData - Raw form data
 * @returns {Object} Formatted data
 */
export function formatSupplierData(formData) {
    const data = {
        company_name: formData.company_name?.trim(),
        company_code: formData.company_code?.trim() || null,
        tax_number: formData.tax_number?.trim() || null,
        tax_office: formData.tax_office?.trim() || null,
        contact_person: formData.contact_person?.trim() || null,
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        address: formData.address?.trim() || null,
        city: formData.city?.trim() || null,
        payment_terms: formData.payment_terms?.trim() || null,
        currency: formData.currency || 'TRY',
        is_active: formData.is_active !== undefined ? formData.is_active : true,
        notes: formData.notes?.trim() || null
    };
    
    // Remove null values
    Object.keys(data).forEach(key => {
        if (data[key] === null || data[key] === '') {
            delete data[key];
        }
    });
    
    return data;
}

/**
 * Handle API errors with user-friendly messages
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export function handleApiError(error) {
    if (error.message.includes('Failed to fetch')) {
        return 'Sunucuya bağlanılamıyor. Lütfen bağlantınızı kontrol edin.';
    }
    
    if (error.message.includes('404')) {
        return 'İstenen kayıt bulunamadı.';
    }
    
    if (error.message.includes('403') || error.message.includes('401')) {
        return 'Bu işlem için yetkiniz yok.';
    }
    
    if (error.message.includes('500')) {
        return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
    }
    
    return error.message || 'Bilinmeyen bir hata oluştu.';
}

export default {
    getSuppliers,
    getSupplier,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierProducts,
    getProductSuppliers,
    linkSupplierToProduct,
    updateProductSupplierLink,
    removeProductSupplierLink,
    getSupplierStats,
    searchSuppliers,
    filterSuppliersByStatus,
    filterSuppliersByCity,
    sortSuppliers,
    getPaginatedSuppliers,
    validateSupplierData,
    formatSupplierData,
    handleApiError
};
