// Orval client functions - will be loaded from generated files
// import { 
//     inventoryCreateInventoryItem, 
//     inventoryDeleteInventoryItem,
//     inventoryUpdateInventoryItem
// } from '../generated/orval-api.js';

// Use window.STORAGE_KEYS instead of import
const STORAGE_KEYS = {
    CRM_INVENTORY: window.STORAGE_KEYS?.CRM_INVENTORY || 'xear_crm_inventory'
};

// Note: Using Orval's inventoryUpdateInventoryItem function directly
// If it's not available, the application will need to handle the error gracefully

/**
 * InventoryData - Manages inventory data with localStorage caching and API sync
 * Handles CRUD operations for inventory items with offline-first approach
 */
class InventoryData {
    constructor() {
        this.inventory = [];
        this.filteredInventory = [];
    }

    async init() {
        // Wait for prefetch to complete
        if (window.inventoryPrefetchPromise) {
            await window.inventoryPrefetchPromise;
        }

        // Priority 1: Try to load from API-prefetched localStorage
        const apiData = localStorage.getItem(STORAGE_KEYS.CRM_INVENTORY);
        if (apiData) {
            try {
                const parsedData = JSON.parse(apiData);
                if (Array.isArray(parsedData) && parsedData.length > 0) {
                    window.AppState.inventory = parsedData;
                    console.log(`✅ [INVENTORY PAGE] Loaded ${parsedData.length} items from API-prefetched localStorage`);
                    this.inventory = window.AppState.inventory;
                    this.filteredInventory = [...this.inventory];
                    return;
                }
            } catch (error) {
                console.error('Error parsing API data:', error);
            }
        }

        // Priority 2: Fallback to window.sampleInventory
        if (typeof window.sampleInventory !== 'undefined' && Array.isArray(window.sampleInventory)) {
            window.AppState.inventory = [...window.sampleInventory];
            console.log(`⚠️ [INVENTORY PAGE] Using fallback sampleInventory: ${window.AppState.inventory.length} items`);
        }

        this.inventory = window.AppState.inventory || [];
        this.filteredInventory = [...this.inventory];

        // Add event listener for successful optimistic posts
        window.addEventListener('optimistic-post-success', this.handleOptimisticPostSuccess.bind(this));
    }

    handleOptimisticPostSuccess(event) {
        const { tempId, finalItem } = event.detail;
        console.log(`🔄 [INVENTORY] Received optimistic-post-success for tempId: ${tempId}`, finalItem);

        const index = this.inventory.findIndex(item => item.id === tempId);
        if (index !== -1) {
            this.inventory[index] = this.canonicalizeItem(finalItem);
            this.saveToLocalStorage();
            
            // Dispatch an event to notify other parts of the app
            window.dispatchEvent(new CustomEvent('inventory-updated', {
                detail: { inventory: this.inventory }
            }));

            console.log(`✅ [INVENTORY] Replaced temp item ${tempId} with final item ${finalItem.id}`);
        }
    }

    // Load inventory from localStorage
    loadFromLocalStorage() {
        try {
            const storedData = localStorage.getItem(STORAGE_KEYS.CRM_INVENTORY);
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                if (Array.isArray(parsedData)) {
                    this.inventory = parsedData;
                    this.filteredInventory = [...this.inventory];
                    window.AppState.inventory = parsedData;
                    console.log(`📦 Loaded ${parsedData.length} items from localStorage`);
                    return;
                }
            }
            
            // Fallback to sample inventory if available
            if (typeof window.sampleInventory !== 'undefined' && Array.isArray(window.sampleInventory)) {
                this.inventory = [...window.sampleInventory];
                this.filteredInventory = [...this.inventory];
                window.AppState.inventory = [...window.sampleInventory];
                console.log(`📦 No localStorage data, using fallback sampleInventory: ${this.inventory.length} items`);
                return;
            }
            
            // Final fallback to empty array if no data
            this.inventory = [];
            this.filteredInventory = [];
            window.AppState.inventory = [];
            console.log('📦 No inventory data found in localStorage or sampleInventory, initialized empty');
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            // Try sample inventory as fallback even on error
            if (typeof window.sampleInventory !== 'undefined' && Array.isArray(window.sampleInventory)) {
                this.inventory = [...window.sampleInventory];
                this.filteredInventory = [...this.inventory];
                window.AppState.inventory = [...window.sampleInventory];
                console.log(`📦 Error in localStorage, using fallback sampleInventory: ${this.inventory.length} items`);
            } else {
                this.inventory = [];
                this.filteredInventory = [];
                window.AppState.inventory = [];
            }
        }
    }

    canonicalizeInventory() {
        try {
            if (!window.AppState || !Array.isArray(window.AppState.inventory)) return;

            window.AppState.inventory = window.AppState.inventory.map(item => {
                const canonicalItem = { ...item };

                // Ensure both legacy and canonical category fields are present
                if (item.category && !item.type) {
                    canonicalItem.type = item.category;
                } else if (item.type && !item.category) {
                    canonicalItem.category = item.type;
                }

                // Normalize category using XEar if available
                if (canonicalItem.category && window.canonicalCategory) {
                    canonicalItem.category = window.canonicalCategory(canonicalItem.category);
                    canonicalItem.type = canonicalItem.category;
                }

                // Ensure serialNumbers is always an array
                if (!canonicalItem.serialNumbers) {
                    canonicalItem.serialNumbers = [];
                } else if (typeof canonicalItem.serialNumbers === 'string') {
                    canonicalItem.serialNumbers = canonicalItem.serialNumbers.split(',').map(s => s.trim()).filter(s => s);
                } else if (!Array.isArray(canonicalItem.serialNumbers)) {
                    canonicalItem.serialNumbers = [];
                }

                // Legacy compatibility - convert availableSerials to serialNumbers
                if (canonicalItem.availableSerials && Array.isArray(canonicalItem.availableSerials) && canonicalItem.serialNumbers.length === 0) {
                    canonicalItem.serialNumbers = [...canonicalItem.availableSerials];
                }

                console.log('🔧 Canonicalized item:', canonicalItem.id, 'serialNumbers:', canonicalItem.serialNumbers);

                return canonicalItem;
            });

            console.log('✅ [INVENTORY] Canonicalized inventory items');
        } catch (error) {
            console.error('❌ Error canonicalizing inventory:', error);
        }
    }

    canonicalizeItem(raw) {
        if (!raw) return null;
        
        const item = { ...raw };
        
        // Normalize ID field
        item.id = raw.id || raw.inventoryId || raw.code || null;
        
        // Normalize name
        item.name = raw.name || raw.deviceName || raw.model || '';
        
        // Normalize brand
        item.brand = raw.brand || raw.manufacturer || '';
        
        // Normalize category using XEar if available
        if (window.XEar && window.XEar.CategoryNormalizer && typeof window.XEar.CategoryNormalizer.toCanonical === 'function') {
            item.category = window.XEar.CategoryNormalizer.toCanonical(raw.category || raw.type || raw.deviceCategory);
        } else {
            item.category = raw.category || raw.type || raw.deviceCategory || '';
        }
        
        // Normalize inventory counts
        item.availableInventory = raw.availableInventory != null ? raw.availableInventory : (raw.available != null ? raw.available : 0);
        item.totalInventory = raw.totalInventory != null ? raw.totalInventory : 0;
        item.usedInventory = raw.usedInventory != null ? raw.usedInventory : 0;
        
        // Normalize price
        item.price = raw.price != null ? raw.price : (raw.listPrice != null ? raw.listPrice : 0);
        
        // Normalize serials
        item.availableSerials = raw.availableSerials || raw.serials || [];
        if (typeof item.availableSerials === 'string') {
            try {
                item.availableSerials = JSON.parse(item.availableSerials);
            } catch (e) {
                item.availableSerials = item.availableSerials.split(',').map(s => s.trim()).filter(s => s);
            }
        }
        
        // Normalize supplier
        item.supplier = raw.supplier || raw.manufacturer || '';
        
        // Keep raw for debugging
        item.raw = raw;
        
        return item;
    }

    async addItem(itemData) {
        // Check for duplicate barcode first
        if (itemData.barcode) {
            const duplicate = this.inventory.find(item => item.barcode === itemData.barcode);
            if (duplicate) {
                throw new Error('Bu barkod zaten kullanılıyor');
            }
        }

        const apiData = {
            name: itemData.name,
            brand: itemData.brand,
            model: itemData.model || '',
            category: itemData.category,
            serialNumber: itemData.serialNumber || null,
            barcode: itemData.barcode || null,
            availableInventory: parseInt(itemData.inventory) || 0,
            reorderLevel: parseInt(itemData.minInventory) || 5,
            price: parseFloat(itemData.price) || 0,
            supplier: itemData.supplier || '',
            warranty: parseInt(itemData.warranty) || 0,
            description: itemData.description || '',
            features: Array.isArray(itemData.features) ? itemData.features : 
                     (itemData.features ? itemData.features.split(',').map(f => f.trim()).filter(f => f) : []),
            onTrial: 0
        };

        try {
            const apiClient = window.OptimisticAPIClient || window.APIClient;
            const response = await apiClient.postWithOptimistic(window.APIConfig.endpoints.inventory, apiData);

            const newItem = {
                ...response.data,
                inventory: response.data.availableInventory,
                minInventory: response.data.reorderLevel,
                createdAt: response.data.createdAt || new Date().toISOString(),
                lastUpdated: response.data.updatedAt || new Date().toISOString()
            };

            this.inventory.push(newItem);
            window.AppState.inventory.push(newItem);
            this.saveToStorage();
            this.dispatchUpdateEvent();

            return newItem;
        } catch (error) {
            console.error('❌ Error adding item:', error);
            throw error;
        }
    }

    async updateItem(itemId, updates) {
        const index = this.inventory.findIndex(item => item.id === itemId);
        if (index === -1) {
            throw new Error('Ürün bulunamadı');
        }

        const originalItem = { ...this.inventory[index] };
        const updatedItem = { 
            ...originalItem, 
            ...updates, 
            lastUpdated: new Date().toISOString() 
        };

        // Optimistically update local state
        this.inventory[index] = updatedItem;
        this.saveToStorage();
        this.dispatchUpdateEvent();

        // Use optimistic client for the API call
        try {
            const apiClient = new OptimisticAPIClient();
            const response = await apiClient.putWithOptimistic(`/inventory/${itemId}`, updates);

            if (!response.success && response.queued) {
                console.log('Update queued for offline processing.');
            } else if (!response.success) {
                // Revert on failure if not queued
                this.inventory[index] = originalItem;
                this.saveToStorage();
                this.dispatchUpdateEvent();
                console.error('Optimistic update failed:', response.error);
            }
            
            return updatedItem;

        } catch (error) {
            // Revert on unexpected error
            this.inventory[index] = originalItem;
            this.saveToStorage();
            this.dispatchUpdateEvent();
            console.error('Error during optimistic update:', error);
            throw error;
        }
    }

    async deleteItem(itemId) {
        const index = this.inventory.findIndex(item => item.id === itemId);
        if (index === -1) {
            throw new Error('Ürün bulunamadı');
        }

        const deletedItem = this.inventory[index];
        const originalInventory = [...this.inventory];

        // Optimistically remove from local state
        this.inventory.splice(index, 1);
        this.saveToStorage();
        this.dispatchUpdateEvent();

        // Try Orval delete function first
        try {
            if (typeof window.inventoryDeleteInventoryItem === 'function') {
                console.log('🔄 Attempting Orval delete for item:', itemId);
                const response = await window.inventoryDeleteInventoryItem(itemId);
                
                if (response && (response.status === 200 || response.status === 204)) {
                    console.log('✅ Orval delete successful:', response);
                    return deletedItem;
                } else {
                    console.warn('⚠️ Orval delete returned unexpected response:', response);
                    throw new Error('Orval delete failed with unexpected response');
                }
            } else {
                console.warn('⚠️ Orval delete function not available, falling back to local delete');
                throw new Error('Orval function not available');
            }
        } catch (orvalError) {
            console.error('❌ Orval delete failed, falling back to local delete:', orvalError);
            
            // Fallback to optimistic client for the API call
            try {
                const apiClient = new OptimisticAPIClient();
                const response = await apiClient.deleteWithOptimistic(`/inventory/${itemId}`);

                if (!response.success && response.queued) {
                    console.log('📤 Delete queued for offline processing via fallback.');
                } else if (!response.success) {
                    // Revert on failure if not queued
                    this.inventory = originalInventory;
                    this.saveToStorage();
                    this.dispatchUpdateEvent();
                    console.error('❌ Fallback delete failed:', response.error);
                    throw new Error(`Delete failed: ${response.error}`);
                }

                console.log('✅ Fallback delete successful');
                return deletedItem;

            } catch (fallbackError) {
                // Revert on unexpected error
                this.inventory = originalInventory;
                this.saveToStorage();
                this.dispatchUpdateEvent();
                console.error('❌ Error during fallback delete:', fallbackError);
                throw fallbackError;
            }
        }
    }

    getItem(itemId) {
        return this.inventory.find(item => item.id === itemId);
    }

    findByBarcode(barcode) {
        if (!barcode) return null;
        return this.inventory.find(item => item.barcode === barcode);
    }

    getAllItems() {
        return [...this.inventory];
    }

    getAllInventory() {
        return [...this.inventory];
    }

    getFilteredInventory() {
        return this.filteredInventory || this.inventory || [];
    }

    getFilteredItems() {
        return [...this.filteredInventory];
    }

    setFilteredItems(items) {
        this.filteredInventory = items;
    }

    saveToStorage() {
        // Save to both keys for compatibility
        window.Storage.save('inventory', window.AppState.inventory);
        localStorage.setItem(STORAGE_KEYS.CRM_INVENTORY, JSON.stringify(window.AppState.inventory));
    }

    saveToLocalStorage() {
        // Alias for saveToStorage for backward compatibility
        this.saveToStorage();
    }

    dispatchUpdateEvent() {
        console.log('📊 Dispatching inventory update event to', this.inventory.length, 'items');
        
        // Update filtered inventory to match current inventory
        this.filteredInventory = [...this.inventory];
        
        // Dispatch the event
        const event = new CustomEvent('inventoryUpdated', {
            detail: { 
                inventory: this.inventory,
                timestamp: Date.now()
            }
        });
        window.dispatchEvent(event);
        console.log('📊 Event dispatched successfully');
        
        // Force immediate updates with a slight delay to ensure DOM is ready
        setTimeout(() => {
            console.log('📊 Force updating all components...');
            
            // Update table
            if (window.inventoryTable) {
                console.log('📊 Force updating table with', this.inventory.length, 'items');
                window.inventoryTable.render();
            }
            
            // Update stats
            if (window.inventoryStats) {
                console.log('📊 Force updating stats');
                window.inventoryStats.update();
            }
            
            // Update filters and re-apply them
            if (window.inventoryFilters) {
                console.log('📊 Force updating filters');
                window.inventoryFilters.populateFeatureFilter();
                window.inventoryFilters.apply();
            }
        }, 100);
    }

    // Clear localStorage to force reload from fresh data
    clearCache() {
        localStorage.removeItem(STORAGE_KEYS.CRM_INVENTORY);
        console.log('🗑️ Inventory cache cleared');
    }

    // Utility functions
    getCategoryText(category) {
        const categoryMap = {
            'hearing_aid': 'İşitme Cihazı',
            'accessory': 'Aksesuar',
            'battery': 'Pil',
            'maintenance': 'Bakım'
        };
        return categoryMap[category] || category;
    }

    isHearingCategory(category) {
        if (window.XEar && window.XEar.CategoryNormalizer) {
            return window.XEar.CategoryNormalizer.isHearingAid(category);
        }
        return category === 'hearing_aid';
    }

    async loadInventoryData(filters = {}, page = 1, perPage = 20) {
        try {
            // Build query parameters
            const params = new URLSearchParams();
            
            if (filters.category) params.append('category', filters.category);
            if (filters.lowStock) params.append('lowStock', 'true');
            if (filters.search) params.append('search', filters.search);
            
            // Add pagination parameters
            params.append('page', page.toString());
            params.append('per_page', perPage.toString());
            
            const baseUrl = window.APIConfig?.endpoints?.inventory || 'http://localhost:5003/api/inventory';
            const response = await fetch(`${baseUrl}?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.inventory = result.data.map(item => this.canonicalizeItem(item));
                this.saveToLocalStorage();
                
                // Fix: Backend returns pagination data in 'meta' field, but frontend expects 'pagination'
                // Convert backend meta format to expected pagination format
                const meta = result.meta || {};
                const pagination = {
                    page: meta.page || page,
                    per_page: meta.perPage || perPage,
                    total: meta.total || 0,
                    total_pages: meta.totalPages || 1,
                    has_next: meta.page < meta.totalPages,
                    has_prev: meta.page > 1,
                    next_page: meta.page < meta.totalPages ? meta.page + 1 : null,
                    prev_page: meta.page > 1 ? meta.page - 1 : null
                };
                
                return {
                    data: this.inventory,
                    pagination: pagination
                };
            } else {
                throw new Error(result.error || 'Failed to load inventory data');
            }
        } catch (error) {
            console.error('Error loading inventory data:', error);
            // Fallback to local data if API fails
            this.loadFromLocalStorage();
            const totalItems = this.inventory.length;
            const startIndex = (page - 1) * perPage;
            const endIndex = Math.min(startIndex + perPage, totalItems);
            const paginatedData = this.inventory.slice(startIndex, endIndex);
            
            return {
                data: paginatedData,
                pagination: {
                    page: page,
                    per_page: perPage,
                    total: totalItems,
                    total_pages: Math.ceil(totalItems / perPage),
                    has_next: endIndex < totalItems,
                    has_prev: page > 1,
                    next_page: endIndex < totalItems ? page + 1 : null,
                    prev_page: page > 1 ? page - 1 : null
                }
            };
        }
    }
}

// Export for global use
window.InventoryData = InventoryData;