// Enhanced Inventory Database for UTS Comparison
// Maintains inventory with UTS tracking capabilities

// Helper: robust category utilities with XEar fallbacks
function _isHearingCategory(token) {
    if (typeof window !== 'undefined' && window.XEar && window.XEar.CategoryNormalizer && typeof window.XEar.CategoryNormalizer.isHearingAid === 'function') {
        return window.XEar.CategoryNormalizer.isHearingAid(token);
    }
    return token === 'hearing_aid';
}

function _canonicalCategory(token) {
    if (typeof window !== 'undefined' && window.XEar && window.XEar.CategoryNormalizer && typeof window.XEar.CategoryNormalizer.toCanonical === 'function') {
        return window.XEar.CategoryNormalizer.toCanonical(token);
    }
    return token;
}

class InventoryManager {
    constructor() {
        this.inventoryItems = [];
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        this.loadInventory();
        this.isInitialized = true;
        console.log('Inventory Manager initialized with', this.inventoryItems.length, 'items');
    }

    // Load inventory from localStorage or initialize with sample data
    loadInventory() {
        try {
            // Try to load from localStorage first
            const storedInventory = localStorage.getItem(window.STORAGE_KEYS?.INVENTORY_DATABASE || 'xear_inventory_database');
            if (storedInventory) {
                this.inventoryItems = JSON.parse(storedInventory);
                return;
            }
            
            // If no stored data, check if we have inventory data from data.js
            if (window.sampleInventory && Array.isArray(window.sampleInventory)) {
                this.inventoryItems = this.enhanceInventoryWithUTSData(window.sampleInventory);
            } else {
                // Create sample inventory data if nothing is available
                this.inventoryItems = this.createSampleInventoryData();
            }
            
            this.saveInventory();
        } catch (e) {
            console.warn('Failed to load inventory data:', e);
            this.inventoryItems = this.createSampleInventoryData();
        }
    }

    // Enhance existing inventory data with UTS tracking fields
    enhanceInventoryWithUTSData(inventoryData) {
        return inventoryData.map((item, index) => ({
            // Existing inventory fields
            ...item,
            
            // UTS tracking fields
            utsTracked: _isHearingCategory(item.category),
            barkodList: item.barcode ? [item.barcode] : this.generateBarkodList(item, 3),
            serialNumbers: this.generateSerialNumbers(item, item.inventory || 5),
            utsStatus: {
                totalInInventory: item.inventory || 0,
                inUTSPossession: 0,
                awaitingAlma: 0,
                deliveredToConsumer: 0,
                lastUTSSync: new Date().toISOString()
            },
            
            // Enhanced device information for UTS
            deviceInfo: {
                deviceType: this.mapCategoryToDeviceType(item.category),
                isMinistryTracked: _isHearingCategory(item.category),
                requiresUTSCompliance: _isHearingCategory(item.category),
                ubbFirmaKodu: this.generateUBBCode(item),
                manufacturer: item.brand || 'Bilinmiyor'
            },
            
            // Inventory movement tracking
            movements: [],
            
            // Last updated timestamp
            lastUpdated: new Date().toISOString()
        }));
    }

    // Create sample inventory data with UTS integration
    createSampleInventoryData() {
        return [
            {
                id: 'inventory_001',
                name: 'Phonak Audeo Paradise P90',
                brand: 'Phonak',
                model: 'P90-13',
                category: 'hearing_aid',
                inventory: 15,
                minInventory: 5,
                price: 15000,
                supplier: 'Phonak Türkiye',
                warranty: 24,
                utsTracked: true,
                barkodList: ['8690123456789', '8690123456790', '8690123456791'],
                serialNumbers: ['HG2024001', 'HG2024002', 'HG2024003', 'HG2024004', 'HG2024005'],
                utsStatus: {
                    totalInInventory: 15,
                    inUTSPossession: 12,
                    awaitingAlma: 2,
                    deliveredToConsumer: 1,
                    lastUTSSync: new Date().toISOString()
                },
                deviceInfo: {
                    deviceType: 'Kulak Arkası',
                    isMinistryTracked: true,
                    requiresUTSCompliance: true,
                    ubbFirmaKodu: 'UBB001',
                    manufacturer: 'Phonak'
                },
                movements: [],
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'inventory_002',
                name: 'Oticon More 1',
                brand: 'Oticon',
                model: 'M1-312T',
                category: 'hearing_aid',
                inventory: 10,
                minInventory: 3,
                price: 18000,
                supplier: 'Oticon Türkiye',
                warranty: 24,
                utsTracked: true,
                barkodList: ['8690123456800', '8690123456801', '8690123456802'],
                serialNumbers: ['OT2024001', 'OT2024002', 'OT2024003', 'OT2024004', 'OT2024005'],
                utsStatus: {
                    totalInInventory: 10,
                    inUTSPossession: 8,
                    awaitingAlma: 1,
                    deliveredToConsumer: 1,
                    lastUTSSync: new Date().toISOString()
                },
                deviceInfo: {
                    deviceType: 'Kulak Arkası',
                    isMinistryTracked: true,
                    requiresUTSCompliance: true,
                    ubbFirmaKodu: 'UBB002',
                    manufacturer: 'Oticon'
                },
                movements: [],
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'inventory_003',
                name: 'Signia Pure Charge&Go 7X',
                brand: 'Signia',
                model: '7X-RIC',
                category: 'hearing_aid',
                inventory: 8,
                minInventory: 3,
                price: 16500,
                supplier: 'Signia Türkiye',
                warranty: 24,
                utsTracked: true,
                barkodList: ['8690123456810', '8690123456811', '8690123456812'],
                serialNumbers: ['SG2024001', 'SG2024002', 'SG2024003', 'SG2024004'],
                utsStatus: {
                    totalInInventory: 8,
                    inUTSPossession: 6,
                    awaitingAlma: 2,
                    deliveredToConsumer: 0,
                    lastUTSSync: new Date().toISOString()
                },
                deviceInfo: {
                    deviceType: 'Kulak İçi',
                    isMinistryTracked: true,
                    requiresUTSCompliance: true,
                    ubbFirmaKodu: 'UBB003',
                    manufacturer: 'Signia'
                },
                movements: [],
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'inventory_004',
                name: 'Widex Moment 440',
                brand: 'Widex',
                model: '440-BTE',
                category: 'hearing_aid',
                inventory: 12,
                minInventory: 4,
                price: 14000,
                supplier: 'Widex Türkiye',
                warranty: 24,
                utsTracked: true,
                barkodList: ['8690123456820', '8690123456821', '8690123456822'],
                serialNumbers: ['WX2024001', 'WX2024002', 'WX2024003', 'WX2024004', 'WX2024005'],
                utsStatus: {
                    totalInInventory: 12,
                    inUTSPossession: 10,
                    awaitingAlma: 1,
                    deliveredToConsumer: 1,
                    lastUTSSync: new Date().toISOString()
                },
                deviceInfo: {
                    deviceType: 'Kulak Arkası',
                    isMinistryTracked: true,
                    requiresUTSCompliance: true,
                    ubbFirmaKodu: 'UBB004',
                    manufacturer: 'Widex'
                },
                movements: [],
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'inventory_005',
                name: 'İşitme Cihazı Pili Size 312',
                brand: 'Duracell',
                model: '312-6P',
                category: 'pil',
                inventory: 200,
                minInventory: 50,
                price: 25,
                supplier: 'Pil Merkezi Ltd.',
                warranty: 12,
                utsTracked: false,
                barkodList: ['8690123456900'],
                serialNumbers: [],
                utsStatus: {
                    totalInInventory: 200,
                    inUTSPossession: 0,
                    awaitingAlma: 0,
                    deliveredToConsumer: 0,
                    lastUTSSync: new Date().toISOString()
                },
                deviceInfo: {
                    deviceType: 'Aksesuar',
                    isMinistryTracked: false,
                    requiresUTSCompliance: false,
                    ubbFirmaKodu: null,
                    manufacturer: 'Duracell'
                },
                movements: [],
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'inventory_006',
                name: 'Kulak Kalıbı Malzemesi',
                brand: 'Generic',
                model: 'STD-MOLD',
                category: 'kalip_malzemesi',
                inventory: 50,
                minInventory: 15,
                price: 150,
                supplier: 'Medikal Malzemeler A.Ş.',
                warranty: 6,
                utsTracked: false,
                barkodList: ['8690123456910'],
                serialNumbers: [],
                utsStatus: {
                    totalInInventory: 50,
                    inUTSPossession: 0,
                    awaitingAlma: 0,
                    deliveredToConsumer: 0,
                    lastUTSSync: new Date().toISOString()
                },
                deviceInfo: {
                    deviceType: 'Malzeme',
                    isMinistryTracked: false,
                    requiresUTSCompliance: false,
                    ubbFirmaKodu: null,
                    manufacturer: 'Generic'
                },
                movements: [],
                lastUpdated: new Date().toISOString()
            }
        ];
    }

    // Helper methods for data generation
    generateBarkodList(item, count = 3) {
        const base = '869012345';
        const barkodList = [];
        for (let i = 0; i < count; i++) {
            const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            barkodList.push(base + randomSuffix);
        }
        return barkodList;
    }

    generateSerialNumbers(item, count = 5) {
        const prefix = (item.brand || 'XX').substring(0, 2).toUpperCase();
        const year = new Date().getFullYear();
        const serialNumbers = [];
        
        for (let i = 1; i <= count; i++) {
            serialNumbers.push(`${prefix}${year}${i.toString().padStart(3, '0')}`);
        }
        
        return serialNumbers;
    }

    mapCategoryToDeviceType(category) {
        const canonical = _canonicalCategory(category);
        const mapping = {
            'hearing_aid': 'Kulak Arkası',
            'pil': 'Aksesuar',
            'kalip_malzemesi': 'Malzeme'
        };
        return mapping[canonical] || mapping[category] || 'Bilinmiyor';
    }

    generateUBBCode(item) {
        if (!_isHearingCategory(item.category)) return null;
        return `UBB${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`;
    }

    // Save inventory to localStorage
    saveInventory() {
        try {
            localStorage.setItem(window.STORAGE_KEYS?.INVENTORY_DATABASE || 'xear_inventory_database', JSON.stringify(this.inventoryItems));
        } catch (e) {
            console.warn('Failed to save inventory data:', e);
        }
    }

    // Sync with UTS data and update possession status
    syncWithUTS() {
        if (!window.UTSManager) {
            console.warn('UTS Manager not available for sync');
            return;
        }

        const utsDevices = window.UTSManager.getAllDevices();
        let syncedCount = 0;

        this.inventoryItems.forEach(inventoryItem => {
            if (!inventoryItem.utsTracked) return;

            // Reset counters
            inventoryItem.utsStatus.inUTSPossession = 0;
            inventoryItem.utsStatus.awaitingAlma = 0;
            inventoryItem.utsStatus.deliveredToConsumer = 0;

            // Count devices by status
            inventoryItem.barkodList.forEach(barkod => {
                inventoryItem.serialNumbers.forEach(seriNo => {
                    const utsDevice = utsDevices.find(d => 
                        d.barkod === barkod && d.seriNo === seriNo
                    );

                    if (utsDevice) {
                        switch (utsDevice.possessionStatus) {
                            case 'center':
                                inventoryItem.utsStatus.inUTSPossession++;
                                break;
                            case 'supplier':
                                if (utsDevice.status === 'Alma Bekliyor') {
                                    inventoryItem.utsStatus.awaitingAlma++;
                                }
                                break;
                            case 'consumer':
                                inventoryItem.utsStatus.deliveredToConsumer++;
                                break;
                        }
                    }
                });
            });

            inventoryItem.utsStatus.lastUTSSync = new Date().toISOString();
            inventoryItem.lastUpdated = new Date().toISOString();
            syncedCount++;
        });

        this.saveInventory();
        console.log(`UTS sync completed for ${syncedCount} items`);
        return syncedCount;
    }

    // Get inventory items that require UTS tracking
    getUTSTrackedItems() {
        return this.inventoryItems.filter(item => item.utsTracked);
    }

    // Get items with possession discrepancies
    getDiscrepancyItems() {
        return this.inventoryItems.filter(item => {
            if (!item.utsTracked) return false;
            
            const totalUTSAccounted = item.utsStatus.inUTSPossession + 
                                    item.utsStatus.awaitingAlma + 
                                    item.utsStatus.deliveredToConsumer;
            
            return totalUTSAccounted !== item.inventory;
        });
    }

    // Get items with low inventory
    getLowInventoryItems() {
        return this.inventoryItems.filter(item => item.inventory <= item.minInventory);
    }

    // Get items awaiting UTS Alma
    getAwaitingAlmaItems() {
        return this.inventoryItems.filter(item => item.utsStatus.awaitingAlma > 0);
    }

    // Search items by name, brand, or barcode
    searchItems(query) {
        if (!query) return this.inventoryItems;
        
        const searchQuery = query.toLowerCase();
        return this.inventoryItems.filter(item => {
            return item.name.toLowerCase().includes(searchQuery) ||
                   item.brand.toLowerCase().includes(searchQuery) ||
                   item.model.toLowerCase().includes(searchQuery) ||
                   item.barkodList.some(barkod => barkod.includes(query)) ||
                   item.serialNumbers.some(serial => serial.toLowerCase().includes(searchQuery));
        });
    }

    // Get item by ID
    getItemById(id) {
        return this.inventoryItems.find(item => item.id === id);
    }

    // Get items by category
    getItemsByCategory(category) {
        const target = _canonicalCategory(category);
        return this.inventoryItems.filter(item => _canonicalCategory(item.category) === target);
    }

    // Add new inventory item
    addInventoryItem(itemData) {
        const newItem = {
            id: `inventory_${Date.now()}`,
            ...itemData,
            utsTracked: _isHearingCategory(itemData.category),
            barkodList: itemData.barkodList || [itemData.barcode || this.generateBarkodList({ brand: itemData.brand }, 1)[0]],
            serialNumbers: itemData.serialNumbers || this.generateSerialNumbers(itemData, itemData.inventory || 1),
            utsStatus: {
                totalInInventory: itemData.inventory || 0,
                inUTSPossession: 0,
                awaitingAlma: 0,
                deliveredToConsumer: 0,
                lastUTSSync: new Date().toISOString()
            },
            deviceInfo: {
                deviceType: this.mapCategoryToDeviceType(itemData.category),
                isMinistryTracked: _isHearingCategory(itemData.category),
                requiresUTSCompliance: _isHearingCategory(itemData.category),
                ubbFirmaKodu: this.generateUBBCode(itemData),
                manufacturer: itemData.brand || 'Bilinmiyor'
            },
            movements: [],
            lastUpdated: new Date().toISOString()
        };

        this.inventoryItems.push(newItem);
        this.saveInventory();
        return newItem;
    }

    // Update inventory item
    updateInventoryItem(id, updateData) {
        const itemIndex = this.inventoryItems.findIndex(item => item.id === id);
        if (itemIndex === -1) return false;

        this.inventoryItems[itemIndex] = {
            ...this.inventoryItems[itemIndex],
            ...updateData,
            lastUpdated: new Date().toISOString()
        };

        this.saveInventory();
        return this.inventoryItems[itemIndex];
    }

    // Record inventory movement
    recordMovement(itemId, movementData) {
        const item = this.getItemById(itemId);
        if (!item) return false;

        const movement = {
            id: `movement_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: movementData.type, // 'in', 'out', 'transfer', 'adjustment'
            quantity: movementData.quantity,
            reason: movementData.reason,
            referenceId: movementData.referenceId, // e-receipt ID, UTS ID, etc.
            notes: movementData.notes || '',
            performedBy: movementData.performedBy || 'system'
        };

        item.movements.push(movement);
        
        // Update inventory quantity based on movement type
        if (movementData.type === 'out') {
            item.inventory = Math.max(0, item.inventory - movementData.quantity);
        } else if (movementData.type === 'in') {
            item.inventory += movementData.quantity;
        }

        item.lastUpdated = new Date().toISOString();
        this.saveInventory();
        return movement;
    }

    // Get comprehensive inventory report
    getInventoryReport() {
        const totalItems = this.inventoryItems.length;
        const utsTrackedItems = this.getUTSTrackedItems().length;
        const lowInventoryItems = this.getLowInventoryItems().length;
        const discrepancyItems = this.getDiscrepancyItems().length;
        const awaitingAlmaItems = this.getAwaitingAlmaItems().length;

        const totalValue = this.inventoryItems.reduce((sum, item) => sum + (item.inventory * item.price), 0);
        const lastSyncTime = Math.max(...this.inventoryItems.map(item => new Date(item.utsStatus.lastUTSSync).getTime()));

        return {
            summary: {
                totalItems,
                utsTrackedItems,
                lowInventoryItems,
                discrepancyItems,
                awaitingAlmaItems,
                totalValue,
                lastUTSSync: new Date(lastSyncTime).toISOString()
            },
            categories: this.getCategorySummary(),
            lowInventory: this.getLowInventoryItems(),
            discrepancies: this.getDiscrepancyItems(),
            awaitingAlma: this.getAwaitingAlmaItems()
        };
    }

    // Get category summary
    getCategorySummary() {
        const categories = {};
        
        this.inventoryItems.forEach(item => {
            if (!categories[item.category]) {
                categories[item.category] = {
                    count: 0,
                    totalInventory: 0,
                    totalValue: 0,
                    utsTracked: 0
                };
            }
            
            categories[item.category].count++;
            categories[item.category].totalInventory += item.inventory;
            categories[item.category].totalValue += item.inventory * item.price;
            if (item.utsTracked) {
                categories[item.category].utsTracked++;
            }
        });

        return categories;
    }

    // Public API
    getAllItems() {
        return this.inventoryItems;
    }

    getItemCount() {
        return this.inventoryItems.length;
    }

    // Manual data refresh
    refreshData() {
        this.loadInventory();
        this.syncWithUTS();
    }
}

// Initialize and expose globally
window.InventoryManager = new InventoryManager();

// Auto-sync with UTS every 10 minutes
setInterval(() => {
    if (window.InventoryManager) {
        window.InventoryManager.syncWithUTS();
    }
}, 10 * 60 * 1000);

console.log('Inventory Manager loaded');
