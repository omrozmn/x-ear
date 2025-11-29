/**
 * Suppliers Main Module
 * Application entry point and initialization
 */

import * as Events from './suppliers-events.js';
import * as Filters from './suppliers-filters.js';
import * as State from './suppliers-state.js';

/**
 * Initialize the suppliers application
 */
async function init() {
    try {
        console.log('Initializing Suppliers Management...');
        console.log('API Config:', window.APIConfig);
        
        // Check if we're on the suppliers page
        if (!document.getElementById('suppliersTable')) {
            console.warn('Not on suppliers page, skipping initialization');
            return;
        }
        
        // Setup event listeners
        Events.setupEventListeners();
        Events.subscribeToStateChanges();
        Events.setupKeyboardShortcuts();
        Events.setupWindowResize();
        Events.setupVisibilityChange();
        
        // Initialize filters
        Filters.initializeFilters();
        
        // Check for URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.toString()) {
            Filters.importFiltersFromURL(urlParams.toString());
        }
        
        // Setup URL sync
        Filters.setupURLSync();
        
        // Initial data load
        await Events.loadSuppliers();
        
        console.log('Suppliers Management initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Suppliers Management:', error);
        showInitError();
    }
}

/**
 * Show initialization error
 */
function showInitError() {
    const tbody = document.getElementById('suppliersTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center" style="padding: 2rem;">
                    <p style="color: #dc3545;">
                        ❌ Uygulama başlatılamadı. Lütfen sayfayı yenileyin.
                    </p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
                        Sayfayı Yenile
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * Handle page unload
 */
window.addEventListener('beforeunload', () => {
    // Save any pending state if needed
    console.log('Suppliers Management shutting down...');
});

/**
 * Global error handler
 */
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

/**
 * Global unhandled rejection handler
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

/**
 * Wait for DOM to be ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM already loaded
    init();
}

/**
 * Export for potential external access
 */
window.SuppliersApp = {
    State,
    Events,
    Filters,
    reload: Events.loadSuppliers
};

export default {
    init
};
