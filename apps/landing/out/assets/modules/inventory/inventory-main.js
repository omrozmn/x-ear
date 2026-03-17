// Inventory Main Module - Initialization and Coordination
class InventoryMain {
    constructor() {
        this.initialized = false;
        this.init();
    }

    init() {
        if (this.initialized) return;
        
        document.addEventListener('DOMContentLoaded', async () => {
            await this.initializeModules();
            this.setupEventListeners();
            await this.initializeUI();
            this.initialized = true;
        });
    }

    async initializeModules() {
        // Initialize all modules in correct order
        window.inventoryUtils = new InventoryUtils();
        window.inventoryData = new InventoryData();
        await window.inventoryData.init(); // Wait for async initialization
        window.inventoryTable = new InventoryTable();
        window.inventoryModal = new InventoryModal();
        window.inventoryFilters = new InventoryFilters();
        window.inventoryBulk = new InventoryBulk();
        window.inventoryStats = new InventoryStats();
        
        console.log('All inventory modules initialized');
    }

    setupEventListeners() {
        // Global event listeners
        document.addEventListener('inventoryUpdated', () => {
            window.inventoryTable.render();
            window.inventoryStats.update();
        });

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                window.inventoryFilters.apply();
            });
        }

        // Filter dropdowns
        const filters = ['categoryFilter', 'brandFilter', 'statusFilter', 'featureFilter'];
        filters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('change', () => {
                    window.inventoryFilters.apply();
                });
            }
        });

        // Bulk actions
        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                window.inventoryBulk.toggleSelectAll(e.target.checked);
            });
        }
    }

    async initializeUI() {
        // Wait for data to be loaded
        await this.waitForData();
        
        // Wait a bit more for data to be fully processed
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Initialize UI components in correct order
        window.inventoryData.canonicalizeInventory();
        
        // Setup filters first (populates dropdowns)
        window.inventoryFilters.setup();
        
        // Then render table
        window.inventoryTable.render();
        
        // Finally update stats
        window.inventoryStats.update();
        
        // Setup table sorting
        window.inventoryTable.setupSorting();
        
        // Trigger initial data dispatch
        window.inventoryData.dispatchUpdateEvent();
        
        // Initialize widgets
        this.initializeWidgets();
        
        console.log('Inventory page initialized successfully');
    }

    async waitForData() {
        // Wait for typeScriptDataLoaded event
        return new Promise((resolve) => {
            if (window.sampleInventory) {
                resolve();
            } else {
                document.addEventListener('typeScriptDataLoaded', resolve);
            }
        });
    }

    initializeWidgets() {
        // Initialize sidebar widget
        const sidebarContainer = document.getElementById('sidebar-container');
        if (sidebarContainer && typeof SidebarWidget !== 'undefined') {
            const sidebar = new SidebarWidget('inventory');
            sidebarContainer.innerHTML = sidebar.render();
        }

        // Initialize header widget
        const headerContainer = document.getElementById('header-container');
        if (headerContainer && typeof HeaderWidget !== 'undefined') {
            const header = new HeaderWidget('Stok Yönetimi');
            headerContainer.innerHTML = header.render();
            header.attachEventListeners();
        }
    }
}

// Initialize the application
new InventoryMain();