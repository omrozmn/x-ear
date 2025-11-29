/**
 * Suppliers Modal Module
 * Handles modal dialogs for add/edit supplier
 */

import { getCurrentSupplier, setCurrentSupplier, setModalState } from './suppliers-state.js';
import { createSupplier, updateSupplier, validateSupplierData, formatSupplierData } from './suppliers-api.js';

/**
 * Open modal for creating new supplier
 */
export function openCreateModal() {
    setCurrentSupplier(null);
    setModalState(true, 'create');
    
    const modal = document.getElementById('supplierModal');
    const title = document.getElementById('modalTitle');
    
    if (title) {
        title.textContent = 'Yeni Tedarikçi';
    }
    
    resetForm();
    
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * Open modal for editing supplier
 * @param {Object} supplier - Supplier to edit
 */
export function openEditModal(supplier) {
    setCurrentSupplier(supplier);
    setModalState(true, 'edit');
    
    const modal = document.getElementById('supplierModal');
    const title = document.getElementById('modalTitle');
    
    if (title) {
        title.textContent = 'Tedarikçi Düzenle';
    }
    
    populateForm(supplier);
    
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * Close supplier modal
 */
export function closeModal() {
    const modal = document.getElementById('supplierModal');
    
    if (modal) {
        modal.classList.add('hidden');
    }
    
    setModalState(false);
    setCurrentSupplier(null);
    resetForm();
}

// Global function for onclick handlers
window.closeSupplierModal = closeModal;

/**
 * Reset form to empty state
 */
export function resetForm() {
    const form = document.getElementById('supplierForm');
    if (!form) return;
    
    form.reset();
    
    // Set default values for hidden/select fields if they exist
    const supplierIdField = document.getElementById('supplierId');
    const isActiveField = document.getElementById('isActive');
    const currencyField = document.getElementById('currency');
    
    if (supplierIdField) supplierIdField.value = '';
    if (isActiveField) isActiveField.checked = true;
    if (currencyField) currencyField.value = 'TRY';
    
    clearFormErrors();
}

/**
 * Populate form with supplier data
 * @param {Object} supplier - Supplier data
 */
export function populateForm(supplier) {
    if (!supplier) return;
    
    const fields = {
        supplierId: supplier.id,
        companyName: supplier.company_name,
        companyCode: supplier.company_code,
        taxNumber: supplier.tax_number,
        taxOffice: supplier.tax_office,
        contactPerson: supplier.contact_person,
        email: supplier.email,
        phone: supplier.phone,
        mobile: supplier.mobile,
        website: supplier.website,
        address: supplier.address,
        city: supplier.city,
        country: supplier.country,
        paymentTerms: supplier.payment_terms,
        currency: supplier.currency || 'TRY',
        notes: supplier.notes
    };
    
    Object.entries(fields).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element && value != null) {
            if (element.type === 'checkbox') {
                element.checked = value === true || value === 'true';
            } else {
                element.value = value;
            }
        }
    });
    
    // Set isActive checkbox separately
    const isActiveCheckbox = document.getElementById('isActive');
    if (isActiveCheckbox) {
        isActiveCheckbox.checked = supplier.is_active === true || supplier.is_active === 'true';
    }
    
    clearFormErrors();
}

/**
 * Get form data as object
 * @returns {Object} Form data
 */
export function getFormData() {
    return {
        company_name: document.getElementById('companyName')?.value,
        company_code: document.getElementById('companyCode')?.value,
        tax_number: document.getElementById('taxNumber')?.value,
        tax_office: document.getElementById('taxOffice')?.value,
        contact_person: document.getElementById('contactPerson')?.value,
        email: document.getElementById('email')?.value,
        phone: document.getElementById('phone')?.value,
        mobile: document.getElementById('mobile')?.value,
        website: document.getElementById('website')?.value,
        address: document.getElementById('address')?.value,
        city: document.getElementById('city')?.value,
        country: document.getElementById('country')?.value,
        payment_terms: document.getElementById('paymentTerms')?.value,
        currency: document.getElementById('currency')?.value,
        is_active: document.getElementById('isActive')?.checked === true,
        notes: document.getElementById('notes')?.value
    };
}

/**
 * Handle form submission
 * @returns {Promise<Object>} Created/updated supplier
 */
export async function handleFormSubmit() {
    const formData = getFormData();
    const validation = validateSupplierData(formData);
    
    if (!validation.isValid) {
        showFormErrors(validation.errors);
        throw new Error('Form validation failed');
    }
    
    const data = formatSupplierData(formData);
    const supplierId = document.getElementById('supplierId')?.value;
    
    if (supplierId) {
        // Update existing supplier
        return await updateSupplier(parseInt(supplierId), data);
    } else {
        // Create new supplier
        return await createSupplier(data);
    }
}

/**
 * Show form validation errors
 * @param {Object} errors - Validation errors
 */
export function showFormErrors(errors) {
    clearFormErrors();
    
    Object.entries(errors).forEach(([field, message]) => {
        const fieldMap = {
            company_name: 'companyName',
            email: 'email',
            rating: 'rating'
        };
        
        const elementId = fieldMap[field];
        if (!elementId) return;
        
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Add error class
        element.classList.add('error');
        
        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        // Insert after element
        element.parentNode.insertBefore(errorDiv, element.nextSibling);
    });
}

/**
 * Clear all form errors
 */
export function clearFormErrors() {
    // Remove error classes
    document.querySelectorAll('.form-control.error').forEach(el => {
        el.classList.remove('error');
    });
    
    // Remove error messages
    document.querySelectorAll('.error-message').forEach(el => {
        el.remove();
    });
}

/**
 * Open products modal for a supplier
 * @param {number} supplierId - Supplier ID
 */
export function openProductsModal(supplierId) {
    const modal = document.getElementById('productsModal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    
    // Modal title will be updated when products are loaded
}

/**
 * Close products modal
 */
export function closeProductsModal() {
    const modal = document.getElementById('productsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Global function for onclick handlers
window.closeProductsModal = closeProductsModal;

/**
 * Update products modal title
 * @param {string} supplierName - Supplier name
 */
export function updateProductsModalTitle(supplierName) {
    const title = document.getElementById('productsModalTitle');
    if (title) {
        title.textContent = `${supplierName} - Ürünler`;
    }
}

/**
 * Show loading state in modal
 * @param {boolean} isLoading - Loading state
 */
export function setModalLoading(isLoading) {
    const saveBtn = document.getElementById('saveSupplierBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (saveBtn) {
        saveBtn.disabled = isLoading;
        saveBtn.textContent = isLoading ? 'Kaydediliyor...' : 'Kaydet';
    }
    
    if (cancelBtn) {
        cancelBtn.disabled = isLoading;
    }
}

/**
 * Show success message in modal
 * @param {string} message - Success message
 */
export function showModalSuccess(message) {
    showModalMessage(message, 'success');
}

/**
 * Show error message in modal
 * @param {string} message - Error message
 */
export function showModalError(message) {
    showModalMessage(message, 'error');
}

/**
 * Show message in modal
 * @param {string} message - Message text
 * @param {string} type - Message type ('success' or 'error')
 */
function showModalMessage(message, type = 'info') {
    const modalBody = document.querySelector('#supplierModal .modal-body');
    if (!modalBody) return;
    
    // Remove existing messages
    const existing = modalBody.querySelector('.modal-message');
    if (existing) {
        existing.remove();
    }
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `modal-message alert alert-${type}`;
    messageDiv.textContent = message;
    
    // Insert at top of modal body
    modalBody.insertBefore(messageDiv, modalBody.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

/**
 * Setup modal event listeners
 */
export function setupModalListeners() {
    // Close modal on X button
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // Close modal on Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    // Close modal on overlay click
    const modal = document.getElementById('supplierModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // Close products modal
    const closeProductsBtn = document.getElementById('closeProductsModalBtn');
    if (closeProductsBtn) {
        closeProductsBtn.addEventListener('click', closeProductsModal);
    }
    
    const closeProductsBtn2 = document.getElementById('closeProductsBtn');
    if (closeProductsBtn2) {
        closeProductsBtn2.addEventListener('click', closeProductsModal);
    }
    
    const productsModal = document.getElementById('productsModal');
    if (productsModal) {
        productsModal.addEventListener('click', (e) => {
            if (e.target === productsModal) {
                closeProductsModal();
            }
        });
    }
    
    // Handle ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeProductsModal();
        }
    });
}

/**
 * Validate form field on blur
 * @param {HTMLElement} field - Form field
 */
export function validateField(field) {
    const value = field.value?.trim();
    const fieldName = field.name || field.id;
    let isValid = true;
    let errorMessage = '';

    // Clear previous errors
    field.classList.remove('error');
    const errorElement = field.parentElement.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }

    // Required field validation
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = 'Bu alan zorunludur';
    }

    // Email validation
    if (field.type === 'email' && value && !isValidEmail(value)) {
        isValid = false;
        errorMessage = 'Geçerli bir e-posta adresi girin';
    }

    // Company name validation - check for duplicates
    if (fieldName === 'company_name' && value) {
        // Check if this company name already exists (only for create mode)
        const supplierId = document.getElementById('supplierId')?.value;
        if (!supplierId) { // Only check for duplicates when creating new supplier
            checkCompanyNameDuplicate(value, field);
        }
    }

    if (!isValid) {
        field.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error text-red-500 text-sm mt-1';
        errorDiv.textContent = errorMessage;
        field.parentElement.appendChild(errorDiv);
    }

    return isValid;
}

/**
 * Check if company name already exists
 * @param {string} companyName - Company name to check
 * @param {HTMLElement} field - Input field element
 */
async function checkCompanyNameDuplicate(companyName, field) {
    try {
        // Simple check by searching existing suppliers
        const response = await fetch(`${window.APIConfig?.BACKEND_BASE_URL || 'http://localhost:5003'}/api/suppliers?search=${encodeURIComponent(companyName)}`);
        if (response.ok) {
            const data = await response.json();
            const exactMatch = data.data?.find(supplier => 
                supplier.companyName?.toLowerCase() === companyName.toLowerCase()
            );
            
            if (exactMatch) {
                field.classList.add('error');
                const existingError = field.parentElement.querySelector('.field-error');
                if (existingError) {
                    existingError.remove();
                }
                const errorDiv = document.createElement('div');
                errorDiv.className = 'field-error text-red-500 text-sm mt-1';
                errorDiv.textContent = 'Bu şirket adı zaten kayıtlı';
                field.parentElement.appendChild(errorDiv);
                return false;
            }
        }
    } catch (error) {
        console.warn('Company name duplicate check failed:', error);
    }
    return true;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Setup field validation listeners
 */
export function setupFieldValidation() {
    const form = document.getElementById('supplierForm');
    if (!form) return;

    // Add real-time validation for company name with debouncing
    const companyNameField = document.getElementById('companyName');
    if (companyNameField) {
        let debounceTimer;
        companyNameField.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                validateField(this);
            }, 500); // 500ms debounce
        });
        
        companyNameField.addEventListener('blur', function() {
            validateField(this);
        });
    }

    // Add validation for other fields
    const fieldsToValidate = ['email', 'phone', 'mobile'];
    fieldsToValidate.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', function() {
                validateField(this);
            });
        }
    });
}

export default {
    openCreateModal,
    openEditModal,
    closeModal,
    resetForm,
    populateForm,
    getFormData,
    handleFormSubmit,
    showFormErrors,
    clearFormErrors,
    openProductsModal,
    closeProductsModal,
    updateProductsModalTitle,
    setModalLoading,
    showModalSuccess,
    showModalError,
    setupModalListeners,
    validateField,
    setupFieldValidation
};
