// Complete Inventory Data Service - Migrated from data.js
// This file replaces /public/assets/data.js inventory functionality
// Complete inventory data migrated from legacy data.js
export const initialInventoryData = [
    {
        id: 'item_1', name: 'Audeo Paradise P90', category: 'hearing_aid', type: 'digital_programmable', brand: 'Phonak', model: 'P90-13', ear: 'both',
        availableInventory: 15, totalInventory: 15, usedInventory: 0, availableSerials: ['PH123456','PH123457','PH123458'], availableBarcodes: ['1234567890123','1234567890124','1234567890125'], reorderLevel: 5, supplier: 'Phonak Türkiye', cost: 12000, price: 15000, sgkCode: '32.07.01.01.01', isMinistryTracked: true, lastUpdated: '2024-01-15T10:00:00Z', createdAt: '2024-01-15T10:00:00Z'
    },
    {
        id: 'item_2', name: 'Audeo Paradise P70', category: 'hearing_aid', type: 'digital_programmable', brand: 'Phonak', model: 'P70-312',
        availableInventory: 8, totalInventory: 12, usedInventory: 4, availableSerials: ['PH123459','PH123460'], availableBarcodes: ['1234567890126','1234567890127'], reorderLevel: 3, supplier: 'Phonak Türkiye', cost: 9000, price: 12000, sgkCode: '32.07.01.01.01', isMinistryTracked: true, lastUpdated: '2024-01-15T10:00:00Z', createdAt: '2024-01-15T10:00:00Z'
    },
    {
        id: 'item_3', name: 'Oticon More 1', category: 'hearing_aid', type: 'digital_programmable', brand: 'Oticon', model: 'More1-312',
        availableInventory: 6, totalInventory: 10, usedInventory: 4, availableSerials: ['OT234567','OT234568'], availableBarcodes: ['2345678901234','2345678901235'], reorderLevel: 2, supplier: 'Oticon Türkiye', cost: 11000, price: 14000, sgkCode: '32.07.01.01.01', isMinistryTracked: true, lastUpdated: '2024-01-15T10:00:00Z', createdAt: '2024-01-15T10:00:00Z'
    },
    {
        id: 'item_4', name: 'ReSound One 9', category: 'hearing_aid', type: 'digital_programmable', brand: 'ReSound', model: 'ONE9-312T',
        availableInventory: 4, totalInventory: 8, usedInventory: 4, availableSerials: ['RS345678','RS345679'], availableBarcodes: ['3456789012345','3456789012346'], reorderLevel: 2, supplier: 'ReSound Türkiye', cost: 10000, price: 13000, sgkCode: '32.07.01.01.01', isMinistryTracked: true, lastUpdated: '2024-01-15T10:00:00Z', createdAt: '2024-01-15T10:00:00Z'
    },
    {
        id: 'item_5', name: 'Signia Pure Charge&Go 7X', category: 'hearing_aid', type: 'rechargeable_digital', brand: 'Signia', model: 'Pure7X-312',
        availableInventory: 3, totalInventory: 6, usedInventory: 3, availableSerials: ['SG456789'], availableBarcodes: ['4567890123456'], reorderLevel: 2, supplier: 'Signia Türkiye', cost: 9500, price: 12500, sgkCode: '32.07.01.01.01', isMinistryTracked: true, lastUpdated: '2024-01-15T10:00:00Z', createdAt: '2024-01-15T10:00:00Z'
    },
    {
        id: 'item_6', name: 'Widex Moment 440', category: 'hearing_aid', type: 'digital_programmable', brand: 'Widex', model: 'M440-312',
        availableInventory: 5, totalInventory: 8, usedInventory: 3, availableSerials: ['WX567890','WX567891'], availableBarcodes: ['5678901234567','5678901234568'], reorderLevel: 2, supplier: 'Widex Türkiye', cost: 8500, price: 11500, sgkCode: '32.07.01.01.01', isMinistryTracked: true, lastUpdated: '2024-01-15T10:00:00Z', createdAt: '2024-01-15T10:00:00Z'
    },
    {
        id: 'item_7', name: "Size 312 Pil (6'lı)", category: 'battery', type: 'zinc_air', brand: 'Rayovac', model: '312AU',
        availableInventory: 200, totalInventory: 250, usedInventory: 50, availableSerials: [], availableBarcodes: ['6789012345678'], reorderLevel: 50, supplier: 'Pil Tedarik A.Ş.', cost: 15, price: 25, isMinistryTracked: false, lastUpdated: '2024-01-15T10:00:00Z', createdAt: '2024-01-15T10:00:00Z'
    },
    {
        id: 'item_8', name: "Size 13 Pil (6'lı)", category: 'battery', type: 'zinc_air', brand: 'Rayovac', model: '13AU',
        availableInventory: 150, totalInventory: 200, usedInventory: 50, availableSerials: [], availableBarcodes: ['7890123456789'], reorderLevel: 40, supplier: 'Pil Tedarik A.Ş.', cost: 15, price: 25, isMinistryTracked: false, lastUpdated: '2024-01-15T10:00:00Z', createdAt: '2024-01-15T10:00:00Z'
    },
    {
        id: 'item_9', name: 'Kişiye Özel Kulak Kalıbı', category: 'ear_mold', type: 'custom_silicone', brand: 'X-Ear Lab', model: 'Custom-Soft',
        availableInventory: 0, totalInventory: 20, usedInventory: 20, availableSerials: [], availableBarcodes: [], reorderLevel: 5, supplier: 'X-Ear Laboravarı', cost: 150, price: 300, isMinistryTracked: true, lastUpdated: '2024-01-15T10:00:00Z', createdAt: '2024-01-15T10:00:00Z'
    },
    {
        id: 'item_10', name: 'Temizlik Seti', category: 'accessory', type: 'maintenance_kit', brand: 'Universal', model: 'CleanKit-Pro',
        availableInventory: 25, totalInventory: 30, usedInventory: 5, availableSerials: [], availableBarcodes: ['8901234567890'], reorderLevel: 10, supplier: 'Aksesuar Tedarik Ltd.', cost: 40, price: 80, isMinistryTracked: false, lastUpdated: '2024-01-15T10:00:00Z', createdAt: '2024-01-15T10:00:00Z'
    }
];
// Inventory service class
export class InventoryDataService {
    constructor() {
        this.storageKey = window.STORAGE_KEYS?.CRM_INVENTORY || 'xear_crm_inventory';
        this.apiBaseUrl = 'http://localhost:5003/api/inventory';
        this.useApi = true; // API'yi kullanmayı varsayılan yap
    }
    
    // Initialize with API data or fallback to localStorage
    async initialize() {
        console.log('🔄 [INVENTORY] Initializing Inventory Data Service...');
        
        // Wait for inventory.html's API prefetch to complete first
        if (window.inventoryPrefetchPromise) {
            console.log('⏳ [INVENTORY] Waiting for page-level API prefetch to complete...');
            try {
                await window.inventoryPrefetchPromise;
                console.log('✅ [INVENTORY] Page-level prefetch completed, localStorage should have fresh data');
            } catch (err) {
                console.warn('⚠️ [INVENTORY] Page-level prefetch had issues:', err);
            }
        }
        
        // First priority: Check if localStorage already has data from prefetch
        const existing = this.getAll();
        if (existing.length > 0) {
            console.log(`✅ [INVENTORY] Loaded ${existing.length} items from localStorage (prefetch)`);
            console.log(`📊 [INVENTORY] Data source: localStorage (API-prefetched or fallback)`);
            return;
        }
        
        // Second priority: Try API directly if localStorage is empty
        if (this.useApi) {
            try {
                console.log('🌐 [INVENTORY] localStorage empty, attempting direct API load:', this.apiBaseUrl);
                const response = await fetch(this.apiBaseUrl);
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        localStorage.setItem(this.storageKey, JSON.stringify(result.data));
                        console.log(`✅ [INVENTORY] Loaded ${result.data.length} items from API (Backend)`);
                        console.log(`📊 [INVENTORY] Data source: Backend API (http://localhost:5003)`);
                        return;
                    }
                }
                console.warn('⚠️ [INVENTORY] API response not ok, using fallback data');
            } catch (error) {
                console.warn('⚠️ [INVENTORY] API fetch failed, using fallback data:', error.message);
            }
        }
        
        // Last resort: Use initial sample data
        localStorage.setItem(this.storageKey, JSON.stringify(initialInventoryData));
        console.log(`✅ [INVENTORY] Initialized localStorage with ${initialInventoryData.length} sample items (fallback)`);
    }
    getAll() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            const items = stored ? JSON.parse(stored) : [];
            // Ensure every stored item exposes canonical fields for modern code
            return items.map(i => {
                // Provide both legacy and canonical stock fields
                i.availableInventory = i.availableInventory != null ? i.availableInventory : (i.available != null ? i.available : 0);
                i.totalInventory = i.totalInventory != null ? i.totalInventory : 0;
                i.usedInventory = i.usedInventory != null ? i.usedInventory : 0;
                // Legacy aliases removed: do not write back availableStock/totalStock/usedStock
                // Normalize category to modern token if possible
                try {
                    if (window && window.XEar && window.XEar.CategoryNormalizer) {
                        i.category = window.XEar.CategoryNormalizer.toCanonical(i.category || i.type || '');
                    } else if (i.category === 'hearing_aid') {
                        i.category = 'hearing_aid';
                    }
                } catch (e) { /* ignore */ }
                return i;
            });
        }
        catch {
            return [];
        }
    }
    getById(id) {
        const items = this.getAll();
        return items.find(i => i.id === id) || null;
    }
    getByCategory(category) {
        const items = this.getAll();
        // Normalize incoming category parameter to canonical token if possible
        let normalized = category;
        try {
            if (window && window.XEar && window.XEar.CategoryNormalizer) {
                normalized = window.XEar.CategoryNormalizer.toCanonical(category);
            } else if ((window.XEar && window.XEar.CategoryNormalizer && window.XEar.CategoryNormalizer.toCanonical(category) === 'hearing_aid')) {
                // legacy or canonical hearing-aid path
                // map to internal hearing-aid types if needed
                normalized = 'hearing_aid';
            }
        } catch (e) { /* ignore */ }
        return items.filter(i => {
            // Compare canonical forms
            const itemCat = (i.category || i.type || '').toString();
            try {
                if (window && window.XEar && window.XEar.CategoryNormalizer) {
                    return window.XEar.CategoryNormalizer.toCanonical(itemCat) === normalized;
                }
            } catch (e) { /* ignore */ }
            // Fallback comparison
            return itemCat === normalized || itemCat === category;
        });
    }
    getLowStock() {
        const items = this.getAll();
        return items.filter(i => i.availableInventory <= (i.reorderLevel || 0));
    }
    search(query) {
        const items = this.getAll();
        const searchTerm = query.toLowerCase();
        return items.filter(i => i.name.toLowerCase().includes(searchTerm) ||
            i.brand.toLowerCase().includes(searchTerm) ||
            (i.model || '').toLowerCase().includes(searchTerm) ||
            (i.supplier || '').toLowerCase().includes(searchTerm));
    }
    save(item) {
        try {
            const items = this.getAll();
            const existingIndex = items.findIndex(i => i.id === item.id);
            item.lastUpdated = new Date().toISOString();
            
            if (existingIndex >= 0) {
                items[existingIndex] = item;
                console.log(`💾 [INVENTORY] Updated item ${item.id} in localStorage`);
            }
            else {
                items.push(item);
                console.log(`💾 [INVENTORY] Added new item ${item.id} to localStorage`);
            }
            
            localStorage.setItem(this.storageKey, JSON.stringify(items));
            console.log(`✅ [INVENTORY] Saved to localStorage (total: ${items.length} items)`);
            
            // API'ye de kaydetmeyi dene
            if (this.useApi) {
                this.saveToApi(item, existingIndex >= 0).catch(err => {
                    console.warn('⚠️ [INVENTORY] API save failed:', err.message);
                });
            }
            
            return { success: true, data: item };
        }
        catch (error) {
            console.error('❌ [INVENTORY] Save failed:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Save failed' };
        }
    }
    
    async saveToApi(item, isUpdate = false) {
        try {
            const url = isUpdate ? `${this.apiBaseUrl}/${item.id}` : this.apiBaseUrl;
            const method = isUpdate ? 'PUT' : 'POST';
            
            console.log(`🌐 [INVENTORY] Saving to API: ${method} ${url}`);
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(item)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`✅ [INVENTORY] API save successful:`, result);
                return result;
            } else {
                const error = await response.json();
                console.error('❌ [INVENTORY] API save failed:', error);
                throw new Error(error.error || 'API save failed');
            }
        } catch (error) {
            console.error('❌ [INVENTORY] API save error:', error);
            throw error;
        }
    }
    updateStock(itemId, quantityChange) {
        try {
            const items = this.getAll();
            const itemIndex = items.findIndex(i => i.id === itemId);
            if (itemIndex === -1) {
                console.error(`❌ [INVENTORY] Item ${itemId} not found for stock update`);
                return { success: false, error: 'Item not found' };
            }
            const item = items[itemIndex];
            const newStock = item.availableInventory + quantityChange;
            if (newStock < 0) {
                console.error(`❌ [INVENTORY] Insufficient stock for ${itemId}: ${item.availableInventory} + ${quantityChange} = ${newStock}`);
                return { success: false, error: 'Insufficient stock' };
            }
            item.availableInventory = newStock;
            if (quantityChange > 0) {
                item.totalInventory = (item.totalInventory || 0) + quantityChange;
            }
            else {
                item.usedInventory = (item.usedInventory || 0) + Math.abs(quantityChange);
            }
            item.lastUpdated = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(items));
            console.log(`✅ [INVENTORY] Stock updated for ${itemId}: ${item.availableInventory} (change: ${quantityChange > 0 ? '+' : ''}${quantityChange})`);
            
            // API'ye de güncellemeyi dene
            if (this.useApi) {
                this.saveToApi(item, true).catch(err => {
                    console.warn('⚠️ [INVENTORY] API stock update failed:', err.message);
                });
            }
            
            return { success: true };
        }
        catch (error) {
            console.error('❌ [INVENTORY] Stock update failed:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
        }
    }
}
// Singleton instance
export const inventoryDataService = new InventoryDataService();
// Legacy compatibility
window.sampleInventory = initialInventoryData;
window.InventoryDataService = InventoryDataService;
window.inventoryDataService = inventoryDataService;
// Initialize on load (async)
(async () => {
    await inventoryDataService.initialize();
    console.log('✅ Inventory Data Service loaded with full legacy compatibility');
})();
