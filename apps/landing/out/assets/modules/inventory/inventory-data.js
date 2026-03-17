// Inventory Data Management Module

class InventoryData {
    constructor() {
        this.inventory = [];
        this.filteredInventory = [];
    }

    async init() {
        console.log('🔄 [INVENTORY DATA] Initializing...');
        
        // Wait for prefetch to complete with timeout
        if (window.inventoryPrefetchPromise) {
            try {
                const prefetchResult = await Promise.race([
                    window.inventoryPrefetchPromise,
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Prefetch timeout')), 15000)
                    )
                ]);
                
                console.log('📦 [INVENTORY DATA] Prefetch completed:', prefetchResult);
            } catch (error) {
                console.warn('⚠️ [INVENTORY DATA] Prefetch failed or timed out:', error.message);
            }
        }

        // Priority 1: Try to load from API-prefetched localStorage
        const apiData = localStorage.getItem(window.STORAGE_KEYS?.CRM_INVENTORY || 'xear_crm_inventory');
        if (apiData) {
            try {
                const parsedData = JSON.parse(apiData);
                if (Array.isArray(parsedData) && parsedData.length > 0) {
                    window.AppState = window.AppState || {};
                    window.AppState.inventory = parsedData;
                    console.log(`✅ [INVENTORY PAGE] Loaded ${parsedData.length} items from API-prefetched localStorage`);
                    this.inventory = window.AppState.inventory;
                    this.filteredInventory = [...this.inventory];
                    return;
                }
            } catch (error) {
                console.error('❌ [INVENTORY DATA] Error parsing API data:', error);
            }
        }

        // Priority 2: Try direct API call if prefetch failed
        try {
            console.log('🔄 [INVENTORY DATA] Attempting direct API call...');
            const response = await fetch('http://localhost:5003/api/inventory');
            if (response.ok) {
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    window.AppState = window.AppState || {};
                    window.AppState.inventory = result.data;
                    
                    // Cache for future use
                    localStorage.setItem(window.STORAGE_KEYS?.CRM_INVENTORY || 'xear_crm_inventory', JSON.stringify(result.data));
                    
                    console.log(`✅ [INVENTORY PAGE] Loaded ${result.data.length} items from direct API call`);
                    this.inventory = window.AppState.inventory;
                    this.filteredInventory = [...this.inventory];
                    return;
                }
            }
        } catch (error) {
            console.warn('⚠️ [INVENTORY DATA] Direct API call failed:', error.message);
        }

        // Priority 3: Fallback to window.sampleInventory
        if (typeof window.sampleInventory !== 'undefined' && Array.isArray(window.sampleInventory)) {
            window.AppState = window.AppState || {};
            window.AppState.inventory = [...window.sampleInventory];
            console.log(`⚠️ [INVENTORY PAGE] Using fallback sampleInventory: ${window.AppState.inventory.length} items`);
        } else {
            // Priority 4: Initialize empty if nothing else works
            window.AppState = window.AppState || {};
            window.AppState.inventory = [];
            console.warn('⚠️ [INVENTORY PAGE] No data available, initialized empty inventory');
        }

        this.inventory = window.AppState.inventory || [];
        this.filteredInventory = [...this.inventory];
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

                return canonicalItem;
            });

            console.log('✅ [INVENTORY] Canonicalized inventory items');
        } catch (error) {
            console.error('❌ Error canonicalizing inventory:', error);
        }
    }

    async addItem(itemData) {
        // Check for duplicate barcode first
        if (itemData.barcode) {
            const duplicate = this.inventory.find(item => item.barcode === itemData.barcode);
            if (duplicate) {
                throw new Error('Bu barkod zaten kullanılıyor');
            }
        }

        // Prepare data for API
        const apiData = {
            name: itemData.name,
            brand: itemData.brand,
            model: itemData.model || '',
            category: itemData.category,
            serialNumber: itemData.serialNumber || '',
            barcode: itemData.barcode || '',
            availableInventory: parseInt(itemData.inventory) || 0,
            inventory: parseInt(itemData.inventory) || 0, // Legacy field
            reorderLevel: parseInt(itemData.minInventory) || 5,
            minInventory: parseInt(itemData.minInventory) || 5, // Legacy field
            price: parseFloat(itemData.price) || 0,
            supplier: itemData.supplier || '',
            warranty: parseInt(itemData.warranty) || 0,
            description: itemData.description || '',
            features: itemData.features ? itemData.features.split(',').map(f => f.trim()).filter(f => f) : [],
            onTrial: 0
        };

        try {
            // Try Orval function first
            let result;
            if (window.inventoryCreateInventoryItem && typeof window.inventoryCreateInventoryItem === 'function') {
                try {
                    const orvalResponse = await window.inventoryCreateInventoryItem({ data: apiData });
                    if (orvalResponse && orvalResponse.data) {
                        result = orvalResponse;
                        console.log('✅ Database saved via Orval:', result);
                    } else {
                        throw new Error('Orval response invalid');
                    }
                } catch (orvalError) {
                    console.error('❌ Orval inventory creation failed:', orvalError);
                    throw orvalError;
                }
            } else if (window.APIConfig && window.APIConfig.makeRequest) {
                // Fallback to APIConfig
                const response = await window.APIConfig.makeRequest('/api/inventory', 'POST', apiData);
                result = { data: response };
                console.log('✅ Database saved via APIConfig:', result);
            } else {
                throw new Error('No API client available');
            }

            // Use the item returned from API (has server-generated ID)
            const newItem = {
                ...result.data,
                // Ensure legacy fields for UI compatibility
                inventory: result.data.availableInventory,
                minInventory: result.data.reorderLevel,
                createdAt: result.data.createdAt || new Date().toISOString(),
                lastUpdated: result.data.updatedAt || new Date().toISOString()
            };

            // Add to local inventory
            this.inventory.push(newItem);
            window.AppState.inventory.push(newItem);

            // Save to storage (both keys for compatibility)
            this.saveToStorage();

            // Dispatch update event
            this.dispatchUpdateEvent();

            return newItem;

        } catch (error) {
            console.error('❌ Database save error:', error);
            
            // Fallback: save to localStorage only
            const newItem = {
                id: 'item_' + Date.now(),
                ...itemData,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };

            // Add to inventory
            this.inventory.push(newItem);
            window.AppState.inventory.push(newItem);

            // Save to storage
            this.saveToStorage();

            // Dispatch update event
            this.dispatchUpdateEvent();

            // Re-throw error with context
            throw new Error(`Veritabanı hatası: ${error.message}. Ürün sadece yerel olarak kaydedildi.`);
        }
    }

    updateItem(itemId, updates) {
        const index = this.inventory.findIndex(item => item.id === itemId);
        if (index === -1) {
            throw new Error('Ürün bulunamadı');
        }

        // Update item
        this.inventory[index] = {
            ...this.inventory[index],
            ...updates,
            lastUpdated: new Date().toISOString()
        };

        // Update AppState
        const appStateIndex = window.AppState.inventory.findIndex(item => item.id === itemId);
        if (appStateIndex !== -1) {
            window.AppState.inventory[appStateIndex] = this.inventory[index];
        }

        // Save to storage
        this.saveToStorage();

        // Dispatch update event
        this.dispatchUpdateEvent();

        return this.inventory[index];
    }

    deleteItem(itemId) {
        const index = this.inventory.findIndex(item => item.id === itemId);
        if (index === -1) {
            throw new Error('Ürün bulunamadı');
        }

        const deletedItem = this.inventory[index];

        // Remove from inventory
        this.inventory.splice(index, 1);

        // Remove from AppState
        const appStateIndex = window.AppState.inventory.findIndex(item => item.id === itemId);
        if (appStateIndex !== -1) {
            window.AppState.inventory.splice(appStateIndex, 1);
        }

        // Save to storage
        this.saveToStorage();

        // Dispatch update event
        this.dispatchUpdateEvent();

        return deletedItem;
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
        localStorage.setItem(window.STORAGE_KEYS?.CRM_INVENTORY || 'xear_crm_inventory', JSON.stringify(window.AppState.inventory));
    }

    dispatchUpdateEvent() {
        console.log('📊 Dispatching inventory update event');
        window.dispatchEvent(new CustomEvent('inventoryUpdated', {
            detail: { inventory: this.inventory }
        }));
        
        // Also trigger stats update directly
        if (window.inventoryStats) {
            setTimeout(() => window.inventoryStats.update(), 100);
        }
        
        // Also trigger filter update
        if (window.inventoryFilters) {
            window.inventoryFilters.populateFeatureFilter();
        }
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
        if (typeof window !== 'undefined' && window.XEar && window.XEar.CategoryNormalizer && window.XEar.CategoryNormalizer.isHearingAid) {
            return window.XEar.CategoryNormalizer.isHearingAid(category);
        }
        return category === 'hearing_aid';
    }
}

// Export for global use
window.InventoryData = InventoryData;