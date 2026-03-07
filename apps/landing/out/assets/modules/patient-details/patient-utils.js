/**
 * Patient Details Utility Functions
 * Extracted from inline code for better modularity
 */

/**
 * Format phone number to (XXX) XXX-XXXX format
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Formatted phone number
 */
window.formatPhoneNumber = function(phoneNumber) {
    if (!phoneNumber) return '';
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
    }
    return phoneNumber;
};

/**
 * Toggle patient sidebar
 */
window.togglePatientSidebar = function() {
    const sidebar = document.getElementById('patient-list-sidebar-container');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
};

/**
 * Handle main sidebar toggle coordination
 */
window.handleMainSidebarToggle = function() {
    if (window.patientListSidebar && typeof window.patientListSidebar.updateLayoutMargins === 'function') {
        setTimeout(() => {
            window.patientListSidebar.updateLayoutMargins();
        }, 50);
    }
};

/**
 * Global tab switching function
 * @param {string} tabId - Tab ID to switch to
 */
window.switchTab = async function(tabId) {
    try {
        // Update tab content component
        if (window.patientTabContentComponent) {
            window.patientTabContentComponent.setActiveTab(tabId);

            // Re-render content with current patient data
            if (window.currentPatientData) {
                const content = await window.patientTabContentComponent.render(window.currentPatientData);
                document.getElementById('tab-content').innerHTML = content;
            }
        }

        // Update tabs component
        if (window.patientTabsComponent) {
            window.patientTabsComponent.activeTab = tabId;
            const tabsHtml = window.patientTabsComponent.render();
            document.getElementById('tabs-container').innerHTML = tabsHtml;
        }

        // Initialize tab-specific functionality
        initializeTabFunctionality(tabId);
    } catch (error) {
        console.error('Error switching tab:', error);
    }
};

/**
 * Initialize functionality specific to the active tab
 * @param {string} tabId - The ID of the tab to initialize
 */
function initializeTabFunctionality(tabId) {
    // Map Turkish tab IDs to English for compatibility
    const tabIdMap = {
        'genel': 'general',
        'belgeler': 'documents',
        'zaman-cizelgesi': 'timeline',
        'satis': 'sales',
        'cihaz': 'devices',
        'sgk': 'sgk'
    };

    const mappedTabId = tabIdMap[tabId] || tabId;

    switch (mappedTabId) {
        case 'general':
            // Initialize general tab functionality
            if (window.initializeGeneralTab) {
                window.initializeGeneralTab(window.currentPatientData);
            }
            break;
        case 'documents':
            // Initialize documents tab functionality
            if (window.initializeDocumentsTab) {
                window.initializeDocumentsTab(window.currentPatientData);
            }
            break;
        case 'timeline':
            // Initialize timeline tab functionality
            if (window.initializeTimelineTab) {
                window.initializeTimelineTab(window.currentPatientData);
            }
            break;
        case 'sales':
            // Initialize sales tab functionality
            if (window.initializeSalesTab) {
                window.initializeSalesTab(window.currentPatientData);
            }
            break;
        case 'devices':
            // Initialize devices tab functionality
            if (window.initializeDevicesTab) {
                window.initializeDevicesTab(window.currentPatientData);
            }
            break;
        case 'sgk':
            // Initialize SGK tab functionality
            if (window.initializeSGKTab) {
                window.initializeSGKTab(window.currentPatientData);
            }
            break;
    }
}

/**
 * Placeholder function for creating sales
 */
window.createSale = function() {
    console.log('createSale function called - placeholder implementation');
    alert('Satış oluşturma özelliği henüz geliştirilmektedir.');
};
