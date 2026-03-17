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
        console.log('🚀 Initializing modules...');
        
        window.inventoryUtils = new InventoryUtils();
        console.log('✅ InventoryUtils initialized');
        
        window.inventoryData = new InventoryData();
        await window.inventoryData.init(); // Wait for async initialization
        console.log('✅ InventoryData initialized');
        
        window.inventoryTable = new InventoryTable();
        console.log('✅ InventoryTable initialized');
        
        // Check if InventoryModal is available
        if (typeof InventoryModal !== 'undefined') {
            window.inventoryModal = new InventoryModal();
            console.log('✅ InventoryModal initialized');
        } else {
            console.error('❌ InventoryModal not found');
        }
        
        window.inventoryFilters = new InventoryFilters();
        console.log('✅ InventoryFilters initialized');
        
        window.inventoryBulk = new InventoryBulk();
        console.log('✅ InventoryBulk initialized');
        
        window.inventoryStats = new InventoryStats();
        console.log('✅ InventoryStats initialized');
        
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
        
        // Setup filters first (populates dropdowns) - WAIT for async setup
        await window.inventoryFilters.setup();
        
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
        // Wait for inventoryDataReady event first (from prefetch)
        return new Promise((resolve) => {
            if (window.AppState && window.AppState.inventory && window.AppState.inventory.length > 0) {
                console.log('✅ [INVENTORY] Data already available in AppState');
                resolve();
            } else {
                // Listen for both events to ensure data is ready
                const handleDataReady = () => {
                    console.log('✅ [INVENTORY] Data ready event received');
                    resolve();
                };
                
                const handleTypeScriptLoaded = () => {
                    console.log('✅ [INVENTORY] TypeScript data loaded event received');
                    // Give a small delay to ensure data is processed
                    setTimeout(resolve, 100);
                };
                
                // Listen for inventory-specific data ready event
                document.addEventListener('inventoryDataReady', handleDataReady, { once: true });
                
                // Fallback to typeScriptDataLoaded event
                if (window.sampleInventory) {
                    resolve();
                } else {
                    document.addEventListener('typeScriptDataLoaded', handleTypeScriptLoaded, { once: true });
                }
                
                // Timeout fallback after 10 seconds
                setTimeout(() => {
                    console.warn('⚠️ [INVENTORY] Data loading timeout, proceeding anyway');
                    resolve();
                }, 10000);
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

        // Initialize category and brand autocomplete components
        if (typeof CategoryBrandAutocomplete !== 'undefined') {
            // Initialize category autocomplete for inventory form
            const categoryInput = document.getElementById('itemCategory');
            if (categoryInput) {
                new CategoryBrandAutocomplete(categoryInput, 'category');
                console.log('✅ Category autocomplete initialized for inventory form');
            }

            // Initialize brand autocomplete for inventory form
            const brandInput = document.getElementById('itemBrand');
            if (brandInput) {
                new CategoryBrandAutocomplete(brandInput, 'brand');
                console.log('✅ Brand autocomplete initialized for inventory form');
            }
        } else {
            console.warn('⚠️ CategoryBrandAutocomplete not available');
        }
    }
}

// Initialize the application
new InventoryMain();