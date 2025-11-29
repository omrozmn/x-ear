/**
 * Device Management Component
 * Handles device inventory, assignments, tracking, and management
 */

// Use browser-compatible logger and storage keys (avoid global const redeclaration across scripts)
var logger = window.logger || console;
const STORAGE_KEYS = window.STORAGE_KEYS || {
    DEVICES: 'xear_devices',
    CRM_INVENTORY: 'xear_crm_inventory', 
    DEVICEASSIGNMENTS: 'xear_deviceAssignments',
    PATIENTS: 'xear_patients',
    DEVICETRIALS: 'xear_deviceTrials'
};

// Helper function to check if a category is a hearing aid category
function _isHearingCategory(category) {
    if (!category) return false;
    const normalized = category.toString().toLowerCase().replace(/[_\s-]/g, '');
    const hearingCategories = ['hearingaid', 'işitmecihazı', 'işitmecihazi', 'hearing', 'aid'];
    return hearingCategories.some(cat => normalized.includes(cat));
}

class DeviceManagementComponent {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.devices = [];
        this.assignments = [];
        this.inventory = [];
        this.categories = ['İşitme Cihazı', 'Pil', 'Aksesuar', 'Yedek Parça'];
        this.deviceTypes = ['RIC', 'BTE', 'ITE', 'CIC', 'IIC'];
        this.brands = ['Phonak', 'Oticon', 'ReSound', 'Widex', 'Signia', 'Starkey'];
        this.dataLoaded = false;
        this.init();
    }

    init() {
        this.loadDeviceData();
        this.setupEventListeners();
    }

    async loadDeviceData() {
        try {
            // Load inventory from API first (NEW: primary data source)
            if (this.apiClient) {
                try {
                    // Try Orval-generated method first
                    let inventoryRes;
                    if (window.inventoryGetInventoryItems) {
                        inventoryRes = await window.inventoryGetInventoryItems();
                    } else {
                        // Fallback to manual API call
                        inventoryRes = await this.apiClient.get('/api/inventory');
                    }
                    const inventoryData = this.unwrapApiResponse(inventoryRes) || inventoryRes?.data || [];
                    
                    // Process inventory items and expand serial numbers
                    this.inventory = [];
                    // Ensure inventoryData is an array before calling forEach
                    const safeInventoryData = Array.isArray(inventoryData) ? inventoryData : [];
                    safeInventoryData.forEach(item => {
                        try {
                            // Normalize stock fields
                            item.availableInventory = item.availableInventory != null ? item.availableInventory : (item.inventory != null ? item.inventory : 0);
                            item.totalInventory = item.totalInventory != null ? item.totalInventory : 0;
                            item.usedInventory = item.usedInventory != null ? item.usedInventory : 0;
                            
                            // Normalize category
                            if (window.XEar && window.XEar.CategoryNormalizer) {
                                item.category = window.XEar.CategoryNormalizer.toCanonical(item.category || item.type || item.deviceCategory);
                            } else if (_isHearingCategory(item.category)) {
                                item.category = 'hearing_aid';
                            }
                            
                            // Expand serial numbers into individual device entries (NEW LOGIC)
                            const serials = item.availableSerials || [];
                            if (serials.length > 0) {
                                // Create separate entry for each serial number
                                serials.forEach(serial => {
                                    this.inventory.push({
                                        ...item,
                                        serialNumber: serial,
                                        displayName: `${item.brand} ${item.model} - ${serial}`,
                                        uniqueId: `${item.id}_${serial}`,
                                        originalInventoryId: item.id,
                                        availableInventory: 1, // Each serial is 1 unit
                                        isSerializedItem: true
                                    });
                                });
                            } else {
                                // No serials - use as-is (for bulk items like batteries)
                                this.inventory.push({
                                    ...item,
                                    serialNumber: null,
                                    displayName: `${item.brand} ${item.model}`,
                                    uniqueId: item.id,
                                    originalInventoryId: item.id,
                                    isSerializedItem: false
                                });
                            }
                        } catch (e) {
                            logger.warn('Error processing inventory item:', e);
                        }
                    });
                    
                    logger.log(`Loaded ${this.inventory.length} device entries from API (including expanded serials)`);
                } catch (apiError) {
                    logger.warn('Failed to load from API, falling back to localStorage:', apiError);
                    this.inventory = JSON.parse(localStorage.getItem(STORAGE_KEYS.CRM_INVENTORY) || '[]');
                }
                
                // Load devices (legacy)
                const res = await (this.apiClient.getDevices ? this.apiClient.getDevices() : this.apiClient.get('/api/devices'));
                let devices = this.unwrapApiResponse(res) || res || [];
                devices = (devices || []).map(d => {
                    try {
                        return this.canonicalizeDevice(d);
                    } catch (e) { return this.normalizeDeviceObject(d); }
                });
                this.devices = Array.isArray(devices) ? devices : [];
                
                if (!Array.isArray(this.devices) || this.devices.length === 0) {
                    this.devices = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEVICES) || '[]');
                }
            } else {
                // Fallback to localStorage
                this.devices = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEVICES) || '[]');
                this.inventory = JSON.parse(localStorage.getItem(STORAGE_KEYS.CRM_INVENTORY) || '[]');
            }
            
            this.assignments = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEVICEASSIGNMENTS) || '[]');
            
            // Initialize with default data if empty
            if (!Array.isArray(this.devices) || this.devices.length === 0) {
                this.initializeDefaultDevices();
            }
            if (!Array.isArray(this.inventory) || this.inventory.length === 0) {
                this.initializeDefaultInventory();
            }
        } catch (error) {
            logger.error('Error loading device data:', error);
            // Final fallback to localStorage
            this.devices = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEVICES) || '[]');
            this.assignments = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEVICEASSIGNMENTS) || '[]');
            this.inventory = JSON.parse(localStorage.getItem(STORAGE_KEYS.CRM_INVENTORY) || '[]');
        } finally {
            this.dataLoaded = true;
        }
    }

    initializeDefaultDevices() {
        const defaultDevices = [
            {
                id: 'phonak-audeo-p90',
                name: 'Audeo Paradise P90',
                brand: 'Phonak',
                model: 'P90',
                category: 'İşitme Cihazı',
                type: 'RIC',
                price: 25000,
                warrantyPeriod: 24,
                features: ['Bluetooth', 'Şarj Edilebilir', 'Su Geçirmez'],
                description: 'Premium RIC işitme cihazı',
                status: 'active',
                createdAt: new Date().toISOString()
            },
            {
                id: 'oticon-more-1',
                name: 'More 1',
                brand: 'Oticon',
                model: 'More 1',
                category: 'İşitme Cihazı',
                type: 'RIC',
                price: 24000,
                warrantyPeriod: 24,
                features: ['Deep Neural Network', 'Bluetooth', 'Şarj Edilebilir'],
                description: 'AI destekli işitme cihazı',
                status: 'active',
                createdAt: new Date().toISOString()
            },
            {
                id: 'widex-moment-440',
                name: 'Moment 440',
                brand: 'Widex',
                model: '440',
                category: 'İşitme Cihazı',
                type: 'RIC',
                price: 22000,
                warrantyPeriod: 24,
                features: ['PureSound', 'Bluetooth', 'Şarj Edilebilir'],
                description: 'Doğal ses deneyimi',
                status: 'active',
                createdAt: new Date().toISOString()
            }
        ];
        
        this.devices = defaultDevices;
        this.saveDevices();
    }

    initializeDefaultInventory() {
        const defaultInventory = [
            {
                id: 'item_1',
                name: 'Audeo Paradise P90',
                category: 'hearing_aid',
                type: 'digital_programmable',
                brand: 'Phonak',
                model: 'P90-13',
                ear: 'both',
                availableInventory: 15,
                totalInventory: 15,
                usedInventory: 0,
                availableSerials: ['PH123456', 'PH123457', 'PH123458'],
                availableBarcodes: ['1234567890123', '1234567890124', '1234567890125'],
                reorderLevel: 5,
                supplier: 'Phonak Türkiye',
                cost: 12000,
                price: 15000,
                sgkCode: '32.07.01.01.01',
                isMinistryTracked: true,
                lastUpdated: '2024-01-15T10:00:00Z',
                createdAt: '2024-01-15T10:00:00Z'
            },
            {
                id: 'item_2',
                name: 'Audeo Paradise P70',
                category: 'hearing_aid',
                type: 'digital_programmable',
                brand: 'Phonak',
                model: 'P70-312',
                availableInventory: 8,
                totalInventory: 12,
                usedInventory: 4,
                availableSerials: ['PH123459', 'PH123460'],
                availableBarcodes: ['1234567890126', '1234567890127'],
                reorderLevel: 3,
                supplier: 'Phonak Türkiye',
                cost: 9000,
                price: 12000,
                sgkCode: '32.07.01.01.01',
                isMinistryTracked: true,
                lastUpdated: '2024-01-15T10:00:00Z',
                createdAt: '2024-01-15T10:00:00Z'
            },
            {
                id: 'item_3',
                name: 'Oticon More 1',
                category: 'hearing_aid',
                type: 'digital_programmable',
                brand: 'Oticon',
                model: 'More1-312',
                availableInventory: 6,
                totalInventory: 10,
                usedInventory: 4,
                availableSerials: ['OT234567', 'OT234568'],
                availableBarcodes: ['2345678901234', '2345678901235'],
                reorderLevel: 2,
                supplier: 'Oticon Türkiye',
                cost: 11000,
                price: 14000,
                sgkCode: '32.07.01.01.01',
                isMinistryTracked: true,
                lastUpdated: '2024-01-15T10:00:00Z',
                createdAt: '2024-01-15T10:00:00Z'
            },
            {
                id: 'item_4',
                name: 'ReSound One 9',
                category: 'hearing_aid',
                type: 'digital_programmable',
                brand: 'ReSound',
                model: 'ONE9-312T',
                availableInventory: 4,
                totalInventory: 8,
                usedInventory: 4,
                availableSerials: ['RS345678', 'RS345679'],
                availableBarcodes: ['3456789012345', '3456789012346'],
                reorderLevel: 2,
                supplier: 'ReSound Türkiye',
                cost: 10000,
                price: 13000,
                sgkCode: '32.07.01.01.01',
                isMinistryTracked: true,
                lastUpdated: '2024-01-15T10:00:00Z',
                createdAt: '2024-01-15T10:00:00Z'
            },
            {
                id: 'item_5',
                name: 'Signia Pure Charge&Go 7X',
                category: 'hearing_aid',
                type: 'rechargeable_digital',
                brand: 'Signia',
                model: 'Pure7X-312',
                availableInventory: 3,
                totalInventory: 6,
                usedInventory: 3,
                availableSerials: ['SG456789'],
                availableBarcodes: ['4567890123456'],
                reorderLevel: 2,
                supplier: 'Signia Türkiye',
                cost: 9500,
                price: 12500,
                sgkCode: '32.07.01.01.01',
                isMinistryTracked: true,
                lastUpdated: '2024-01-15T10:00:00Z',
                createdAt: '2024-01-15T10:00:00Z'
            },
            {
                id: 'item_6',
                name: 'Widex Moment 440',
                category: 'hearing_aid',
                type: 'digital_programmable',
                brand: 'Widex',
                model: 'M440-312',
                availableInventory: 5,
                totalInventory: 8,
                usedInventory: 3,
                availableSerials: ['WX567890', 'WX567891'],
                availableBarcodes: ['5678901234567', '5678901234568'],
                reorderLevel: 2,
                supplier: 'Widex Türkiye',
                cost: 8500,
                price: 11500,
                sgkCode: '32.07.01.01.01',
                isMinistryTracked: true,
                lastUpdated: '2024-01-15T10:00:00Z',
                createdAt: '2024-01-15T10:00:00Z'
            },
            {
                id: 'item_7',
                name: 'Size 312 Pil (6\'lı)',
                category: 'battery',
                type: 'zinc_air',
                brand: 'Rayovac',
                model: '312AU',
                availableInventory: 200,
                totalInventory: 250,
                usedInventory: 50,
                availableSerials: [],
                availableBarcodes: ['6789012345678'],
                reorderLevel: 50,
                supplier: 'Pil Tedarik A.Ş.',
                cost: 15,
                price: 25,
                isMinistryTracked: false,
                lastUpdated: '2024-01-15T10:00:00Z',
                createdAt: '2024-01-15T10:00:00Z'
            },
            {
                id: 'item_8',
                name: 'Size 13 Pil (6\'lı)',
                category: 'battery',
                type: 'zinc_air',
                brand: 'Rayovac',
                model: '13AU',
                availableInventory: 150,
                totalInventory: 200,
                usedInventory: 50,
                availableSerials: [],
                availableBarcodes: ['7890123456789'],
                reorderLevel: 40,
                supplier: 'Pil Tedarik A.Ş.',
                cost: 15,
                price: 25,
                isMinistryTracked: false,
                lastUpdated: '2024-01-15T10:00:00Z',
                createdAt: '2024-01-15T10:00:00Z'
            },
            {
                id: 'item_9',
                name: 'Kişiye Özel Kulak Kalıbı',
                category: 'ear_mold',
                type: 'custom_silicone',
                brand: 'X-Ear Lab',
                model: 'Custom-Soft',
                availableInventory: 0,
                totalInventory: 20,
                usedInventory: 20,
                availableSerials: [],
                availableBarcodes: [],
                reorderLevel: 5,
                supplier: 'X-Ear Laboravarı',
                cost: 150,
                price: 300,
                isMinistryTracked: true,
                lastUpdated: '2024-01-15T10:00:00Z',
                createdAt: '2024-01-15T10:00:00Z'
            },
            {
                id: 'item_10',
                name: 'Temizlik Seti',
                category: 'accessory',
                type: 'maintenance_kit',
                brand: 'Universal',
                model: 'CleanKit-Pro',
                availableInventory: 25,
                totalInventory: 30,
                usedInventory: 5,
                availableSerials: [],
                availableBarcodes: ['8901234567890'],
                reorderLevel: 10,
                supplier: 'Aksesuar Tedarik Ltd.',
                cost: 40,
                price: 80,
                isMinistryTracked: false,
                lastUpdated: '2024-01-15T10:00:00Z',
                createdAt: '2024-01-15T10:00:00Z'
            }
        ];
        
        this.inventory = defaultInventory;
        this.saveInventory();
        console.log(`✅ Initialized default inventory with ${defaultInventory.length} items`);
    }

    setupEventListeners() {
        // Global event listeners for device management
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="assign-device"]')) {
                this.openAssignDeviceModal(e.target.dataset.patientId);
            }
            if (e.target.matches('[data-action="view-device-history"]')) {
                this.viewDeviceHistory(e.target.dataset.patientId);
            }
            if (e.target.matches('[data-action="manage-inventory"]')) {
                this.openInventoryModal();
            }
        });
    }

    // Validation methods
    validateDeviceInfo(inventoryItem) {
        const errors = [];
        
        // Only validate critical fields for assignment
        if (!inventoryItem.price || inventoryItem.price <= 0) {
            errors.push('Fiyat bilgisi eksik veya geçersiz');
        }
        
        if (!inventoryItem.brand || inventoryItem.brand.trim() === '') {
            errors.push('Marka bilgisi eksik');
        }
        
        if (!inventoryItem.model || inventoryItem.model.trim() === '') {
            errors.push('Model bilgisi eksik');
        }
        
        // Note: Serial, barcode, and ear are optional or will be set during assignment
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Device Management Methods
    addDevice(deviceData) {
        const device = {
            id: `device_${Date.now()}`,
            ...deviceData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.devices.push(device);
        this.saveDevices();
        return device;
    }

    updateDevice(deviceId, updates) {
        const index = this.devices.findIndex(d => d.id === deviceId);
        if (index !== -1) {
            this.devices[index] = {
                ...this.devices[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveDevices();
            return this.devices[index];
        }
        return null;
    }

    deleteDevice(deviceId) {
        const index = this.devices.findIndex(d => d.id === deviceId);
        if (index !== -1) {
            this.devices.splice(index, 1);
            this.saveDevices();
            return true;
        }
        return false;
    }

    getDevice(deviceId) {
        return this.devices.find(d => d.id === deviceId);
    }

    getDevices(filters = {}) {
        let filtered = [...this.devices];
        
        if (filters.category) {
            filtered = filtered.filter(d => d.category === filters.category);
        }
        if (filters.brand) {
            filtered = filtered.filter(d => d.brand === filters.brand);
        }
        if (filters.status) {
            filtered = filtered.filter(d => d.status === filters.status);
        }
        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(d => 
                d.name.toLowerCase().includes(search) ||
                d.brand.toLowerCase().includes(search) ||
                d.model.toLowerCase().includes(search)
            );
        }
        
        return filtered;
    }

    // Inventory Management Methods
    addInventoryItem(itemData) {
        const item = {
            id: `inv_${Date.now()}`,
            ...itemData,
            status: 'available',
            condition: 'new',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.inventory.push(item);
        this.saveInventory();
        return item;
    }

    updateInventoryItem(itemId, updates) {
        const index = this.inventory.findIndex(i => i.id === itemId);
        if (index !== -1) {
            this.inventory[index] = {
                ...this.inventory[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveInventory();
            return this.inventory[index];
        }
        return null;
    }

    getInventoryItems(filters = {}) {
        let filtered = [...this.inventory];
        
        if (filters.status) {
            // For TypeScript data service format, check availableInventory > 0
            if (filters.status === 'available') {
                filtered = filtered.filter(i => (i.availableInventory || 0) > 0);
            } else if (filters.status === 'assigned') {
                filtered = filtered.filter(i => (i.availableInventory || 0) === 0);
            }
        }
        if (filters.deviceId) {
            filtered = filtered.filter(i => i.deviceId === filters.deviceId);
        }
        // Support filtering by category token (e.g. 'hearing_aid')
        if (filters.category) {
            filtered = filtered.filter(i => {
                if (!i.category) return false;
                // Use normalizer helper if available, otherwise compare directly
                try {
                    if (_isHearingCategory(filters.category) && _isHearingCategory(i.category)) return true;
                } catch (e) { /* ignore */ }
                return i.category === filters.category;
            });
        }
        // Flexible ear filtering:
        // - 'both' matches only items marked 'both'
        // - 'left' matches items with ear==='left' OR ear==='both'
        // - 'right' matches items with ear==='right' OR ear==='both'
        if (filters.ear) {
            if (filters.ear === 'both') {
                filtered = filtered.filter(i => i.ear === 'both');
            } else if (filters.ear === 'left') {
                filtered = filtered.filter(i => i.ear === 'left' || i.ear === 'both');
            } else if (filters.ear === 'right') {
                filtered = filtered.filter(i => i.ear === 'right' || i.ear === 'both');
            } else {
                // Fallback to exact match for any other values
                filtered = filtered.filter(i => i.ear === filters.ear);
            }
        }
        
        return filtered;
    }

    getAvailableInventory(deviceId, ear = null) {
        const filters = { status: 'available', deviceId };
        if (ear) filters.ear = ear;
        return this.getInventoryItems(filters);
    }

    // Device Assignment Methods
    async assignDevice(assignmentData) {
        try {
            const inventoryId = assignmentData.inventoryId;
            const serialNumber = assignmentData.serialNumber;
            const assignmentReason = assignmentData.assignmentReason || 'sale';
            
            // Step 1: Assign via inventory API (reduces stock)
            if (this.apiClient && inventoryId) {
                try {
                    // Support bilateral assignments: send two serial assigns or quantity 2 for bulk
                    const ear = assignmentData.ear || assignmentData.assignEar;
                    if (ear === 'both') {
                        const leftSerial = assignmentData.serialNumberLeft || null;
                        const rightSerial = assignmentData.serialNumberRight || null;
                        let apiRes = null;
                        if (leftSerial) {
                            apiRes = await this.apiClient.post(`/api/inventory/${inventoryId}/assign`, {
                                patientId: assignmentData.patientId,
                                serialNumber: leftSerial,
                                quantity: 0
                            });
                            console.log('Inventory assigned via API (left):', apiRes);
                        }
                        if (rightSerial) {
                            apiRes = await this.apiClient.post(`/api/inventory/${inventoryId}/assign`, {
                                patientId: assignmentData.patientId,
                                serialNumber: rightSerial,
                                quantity: 0
                            });
                            console.log('Inventory assigned via API (right):', apiRes);
                        }
                        // If no serials provided (bulk), assign quantity 2
                        if (!leftSerial && !rightSerial) {
                            const bulkRes = await this.apiClient.post(`/api/inventory/${inventoryId}/assign`, {
                                patientId: assignmentData.patientId,
                                serialNumber: null,
                                quantity: 2
                            });
                            console.log('Inventory assigned via API (bilateral bulk x2):', bulkRes);
                        }
                    } else {
                        const assignRes = await this.apiClient.post(`/api/inventory/${inventoryId}/assign`, {
                            patientId: assignmentData.patientId,
                            serialNumber: serialNumber,
                            quantity: serialNumber ? 0 : 1 // 0 when using serial (already counted), 1 for bulk items
                        });
                        console.log('Inventory assigned via API:', assignRes);
                    }
                } catch (apiError) {
                    console.warn('API assignment failed, updating locally:', apiError);
                }
            }
            
            // Step 2: Create device assignment record
            const deviceData = {
                patientId: assignmentData.patientId,
                inventoryId: inventoryId,
                serialNumber: serialNumber || null, // null instead of empty string for UNIQUE constraint
                barcode: assignmentData.barcode || null,
                brand: assignmentData.brand || 'Unknown',
                model: assignmentData.model || 'Unknown',
                type: assignmentData.deviceName || 'hearing_aid',
                ear: assignmentData.ear,
                assignmentReason: assignmentReason,
                status: assignmentReason === 'trial' ? 'trial' : 'active',
                listPrice: assignmentData.listPrice || assignmentData.trialListPrice || null,
                salePrice: assignmentData.salePrice || assignmentData.price || null,
                trialPrice: assignmentData.trialPrice || null,
                sgkSupportType: assignmentData.sgkSupportType || null,
                sgkReduction: assignmentData.sgkReduction || 0,
                patientPayment: assignmentData.patientPayment || null,
                paymentMethod: assignmentData.paymentMethod || null,
                installmentCount: assignmentData.installmentCount || null,
                notes: assignmentData.notes || null,
                assignedAt: new Date().toISOString()
            };

            // Try to create via API
            let result = null;
            if (this.apiClient) {
                try {
                    // Backend expects camelCase for device creation
                    const apiDeviceData = {
                        patientId: deviceData.patientId,
                        inventoryId: deviceData.inventoryId,
                        serialNumber: deviceData.serialNumber,
                        barcode: deviceData.barcode,
                        brand: deviceData.brand,
                        model: deviceData.model,
                        type: deviceData.type,
                        ear: deviceData.ear,
                        assignmentReason: deviceData.assignmentReason,
                        status: deviceData.status,
                        listPrice: deviceData.listPrice,
                        salePrice: deviceData.salePrice,
                        trialPrice: deviceData.trialPrice,
                        sgkSupportType: deviceData.sgkSupportType,
                        sgkReduction: deviceData.sgkReduction,
                        patientPayment: deviceData.patientPayment,
                        paymentMethod: deviceData.paymentMethod,
                        installmentCount: deviceData.installmentCount,
                        notes: deviceData.notes
                    };
                    
                    const res = await (this.apiClient.createDevice ? this.apiClient.createDevice(apiDeviceData) : this.apiClient.post('/api/devices', apiDeviceData));
                    result = this.unwrapApiResponse(res) || res;
                } catch (apiError) {
                    console.warn('Device creation API failed:', apiError);
                }
            }
            
            // Step 3: If reason is 'sale', create or update sale record via Sales API
            if (assignmentReason === 'sale' && this.apiClient) {
                try {
                    // Check if this is an edit (has saleId) or new sale
                    const existingSaleId = assignmentData.saleId;
                    
                    if (existingSaleId) {
                        // Update existing sale
                        console.log('🔄 Updating existing sale:', existingSaleId);
                        const updateData = {
                            total_amount: parseFloat(assignmentData.totalAmount || assignmentData.listPrice || 0),
                            paid_amount: parseFloat(assignmentData.downPayment || 0),
                            patient_payment: parseFloat(assignmentData.totalAmount || assignmentData.listPrice || 0),
                            notes: assignmentData.notes || ''
                        };
                        
                        const updateRes = await this.apiClient.patch(`/api/patients/${assignmentData.patientId}/sales/${existingSaleId}`, updateData);
                        console.log('✅ Sale updated:', updateRes);
                    } else {
                        // Create new sale record
                        const deviceIdForSale = result?.id || result?.data?.id || inventoryId;
                        console.log('� Creating new sale record for device:', deviceIdForSale);
                        const perUnitBase = parseFloat(assignmentData.listPrice || 0);
                        const perUnitSale = parseFloat(assignmentData.salePrice || 0);
                        const isBilateral = assignmentData.ear === 'both';
                        const deviceAssignments = [];
                        if (isBilateral) {
                            const leftSerial = assignmentData.serialNumberLeft || null;
                            const rightSerial = assignmentData.serialNumberRight || null;

                            deviceAssignments.push({
                                device_id: deviceIdForSale,
                                ear_side: 'left',
                                ear: 'left',
                                serial_number: leftSerial,
                                reason: 'Sale',
                                base_price: perUnitBase,
                                sale_price: perUnitSale,
                                sgk_scheme: assignmentData.sgkSupportType || 'no_coverage',
                                payment_method: assignmentData.paymentMethod || 'cash',
                                discount_type: assignmentData.discountType || 'none',
                                discount_value: parseFloat(assignmentData.discountValue || 0),
                                from_inventory: true
                            });
                            deviceAssignments.push({
                                device_id: deviceIdForSale,
                                ear_side: 'right',
                                ear: 'right',
                                serial_number: rightSerial,
                                reason: 'Sale',
                                base_price: perUnitBase,
                                sale_price: perUnitSale,
                                sgk_scheme: assignmentData.sgkSupportType || 'no_coverage',
                                payment_method: assignmentData.paymentMethod || 'cash',
                                discount_type: assignmentData.discountType || 'none',
                                discount_value: parseFloat(assignmentData.discountValue || 0),
                                from_inventory: true
                            });
                        } else {
                            deviceAssignments.push({
                                device_id: deviceIdForSale,
                                ear_side: assignmentData.ear,
                                ear: assignmentData.ear,
                                reason: 'Sale',
                                base_price: perUnitBase,
                                sale_price: perUnitSale,
                                sgk_scheme: assignmentData.sgkSupportType || 'no_coverage',
                                payment_method: assignmentData.paymentMethod || 'cash',
                                discount_type: assignmentData.discountType || 'none',
                                discount_value: parseFloat(assignmentData.discountValue || 0),
                                from_inventory: true
                            });
                        }
                        const saleData = {
                            device_assignments: deviceAssignments,
                            sgk_scheme: assignmentData.sgkSupportType || 'no_coverage',
                            payment_plan: assignmentData.paymentMethod === 'installment' ? 'installment' : 'cash',
                            downPayment: parseFloat(assignmentData.downPayment || 0), // Add down payment amount
                            accessories: [],
                            services: []
                        };
                        
                        const saleRes = await this.apiClient.post(`/api/patients/${assignmentData.patientId}/assign-devices-extended`, saleData);
                        console.log('✅ New sale record created:', saleRes);
                        
                        // Create PaymentRecord for down payment if any
                        const downPaymentAmount = parseFloat(assignmentData.downPayment || 0);
                        if (downPaymentAmount > 0 && saleRes?.sale?.id) {
                            try {
                                // Use the sale date for the prepayment record
                                const saleDate = saleRes.sale.sale_date || saleRes.sale.saleDate || new Date().toISOString();
                                const paymentData = {
                                    patient_id: assignmentData.patientId,
                                    sale_id: saleRes.sale.id,
                                    amount: downPaymentAmount,
                                    payment_date: saleDate,
                                    payment_method: assignmentData.paymentMethod || 'cash',
                                    payment_type: 'down_payment',
                                    status: 'paid'
                                };
                                
                                console.log('💳 Creating PaymentRecord for down payment:', paymentData);
                                const paymentRes = await this.apiClient.post('/api/payment-records', paymentData);
                                console.log('✅ PaymentRecord created for down payment:', paymentRes);
                            } catch (paymentError) {
                                console.warn('⚠️ Failed to create PaymentRecord for down payment:', paymentError);
                                // Don't block the assignment if payment record creation fails
                            }
                        }
                    }
                } catch (saleApiError) {
                    console.warn('⚠️ Sale operation failed:', saleApiError);
                    // Continue with assignment even if sale operation fails
                }
            }
            
            // Step 4: If reason is 'proposal', create proforma
            if (assignmentReason === 'proposal' && window.proformaManagement) {
                try {
                    // Get patient info
                    const patients = JSON.parse(localStorage.getItem(STORAGE_KEYS.PATIENTS) || '[]');
                    const patient = patients.find(p => p.id === assignmentData.patientId);
                    
                    const proformaData = {
                        patientId: assignmentData.patientId,
                        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Bilinmeyen Hasta',
                        companyName: null,
                        devices: [{
                            brand: assignmentData.brand,
                            model: assignmentData.model,
                            ear: assignmentData.ear,
                            listPrice: assignmentData.listPrice || 0,
                            sgkSupport: assignmentData.sgkReduction || 0,
                            patientPayment: assignmentData.patientPayment || assignmentData.listPrice || 0
                        }],
                        totalAmount: assignmentData.listPrice || 0,
                        sgkSupport: assignmentData.sgkReduction || 0,
                        patientPayment: assignmentData.patientPayment || assignmentData.listPrice || 0,
                        notes: assignmentData.notes || ''
                    };
                    
                    const proforma = window.proformaManagement.createProforma(proformaData);
                    console.log('Proforma created:', proforma);
                } catch (proformaError) {
                    console.warn('Proforma creation failed:', proformaError);
                    // Continue with assignment even if proforma creation fails
                }
            }
            
            // Fallback: Create local assignment
            const generatedId = result?.id || result?.assignmentId || `assign_${Date.now()}`;
            const localAssignment = {
                id: generatedId,
                ...deviceData
            };

            // Update local inventory cache
            if (inventoryId) {
                const ear = assignmentData.ear || assignmentData.assignEar;
                if (ear === 'both') {
                    const leftSerial = assignmentData.serialNumberLeft || null;
                    const rightSerial = assignmentData.serialNumberRight || null;
                    let changed = false;
                    if (leftSerial) {
                        const idxLeft = this.inventory.findIndex(i => i.isSerializedItem && (i.originalInventoryId === inventoryId || i.id === inventoryId) && i.serialNumber === leftSerial);
                        if (idxLeft !== -1) {
                            this.inventory.splice(idxLeft, 1);
                            changed = true;
                            console.log(`Removed left serial ${leftSerial} from inventory`);
                        }
                    }
                    if (rightSerial) {
                        const idxRight = this.inventory.findIndex(i => i.isSerializedItem && (i.originalInventoryId === inventoryId || i.id === inventoryId) && i.serialNumber === rightSerial);
                        if (idxRight !== -1) {
                            this.inventory.splice(idxRight, 1);
                            changed = true;
                            console.log(`Removed right serial ${rightSerial} from inventory`);
                        }
                    }
                    if (!changed) {
                        const baseIdx = this.inventory.findIndex(i => i.uniqueId === inventoryId || i.originalInventoryId === inventoryId || i.id === inventoryId);
                        if (baseIdx !== -1) {
                            const item = this.inventory[baseIdx];
                            item.availableInventory = Math.max(0, (item.availableInventory || 0) - 2);
                            item.usedInventory = (item.usedInventory || 0) + 2;
                        }
                    }
                    this.saveInventory();
                } else {
                    if (serialNumber) {
                        const idx = this.inventory.findIndex(i => i.isSerializedItem && (i.originalInventoryId === inventoryId || i.id === inventoryId) && i.serialNumber === serialNumber);
                        if (idx !== -1) {
                            this.inventory.splice(idx, 1);
                            console.log(`Removed serial ${serialNumber} from inventory`);
                        } else {
                            const baseIdx = this.inventory.findIndex(i => i.uniqueId === inventoryId || i.originalInventoryId === inventoryId || i.id === inventoryId);
                            if (baseIdx !== -1) {
                                const item = this.inventory[baseIdx];
                                item.availableInventory = Math.max(0, (item.availableInventory || 0) - 1);
                                item.usedInventory = (item.usedInventory || 0) + 1;
                            }
                        }
                        this.saveInventory();
                    } else {
                        const baseIdx = this.inventory.findIndex(i => i.uniqueId === inventoryId || i.originalInventoryId === inventoryId || i.id === inventoryId);
                        if (baseIdx !== -1) {
                            const item = this.inventory[baseIdx];
                            item.availableInventory = Math.max(0, (item.availableInventory || 0) - 1);
                            item.usedInventory = (item.usedInventory || 0) + 1;
                            this.saveInventory();
                        }
                    }
                }
            }

            // Save assignment locally
            this.assignments.push(localAssignment);
            this.saveAssignments();

            // Add to timeline
            if (this.apiClient && assignmentData.patientId) {
                try {
                    const reasonText = {
                        'sale': 'Satış',
                        'trial': 'Deneme',
                        'service': 'Fitting',
                        'repair': 'Tamir',
                        'replacement': 'Değişim',
                        'proposal': 'Fiyat Teklifi',
                        'other': 'Diğer'
                    }[assignmentReason] || assignmentReason;

                    await this.apiClient.post(`/api/patients/${assignmentData.patientId}/timeline`, {
                        type: assignmentReason === 'trial' ? 'device_trial_started' : 'device_assigned',
                        title: assignmentReason === 'trial' ? 'Cihaz Deneme Başladı' : 'Cihaz Atandı',
                        description: `${assignmentData.brand} ${assignmentData.model} (${assignmentData.ear === 'left' ? 'Sol' : assignmentData.ear === 'right' ? 'Sağ' : 'Bilateral'}) - ${reasonText}`,
                        category: 'general',
                        icon: 'fa-headphones',
                        color: 'blue',
                        details: {
                            brand: assignmentData.brand,
                            model: assignmentData.model,
                            ear: assignmentData.ear,
                            serialNumber: serialNumber,
                            reason: reasonText,
                            price: assignmentData.salePrice || assignmentData.listPrice
                        }
                    });
                } catch (timelineError) {
                    console.warn('Could not add device assignment to timeline:', timelineError);
                }
            }

            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Cihaz başarıyla atandı!', 'success');
            }
            return localAssignment;

        } catch (error) {
            console.error('Device assignment error:', error);
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Cihaz atama sırasında hata oluştu: ' + error.message, 'error');
            }
            throw error;
        }
    }

    /**
     * Creates a sale record in sales history when device is assigned with reason='sale'
     */
    async createSaleRecordFromAssignment(assignmentData, formData) {
        try {
            console.log('📝 Creating sale record from assignment:', assignmentData);
            
            // Get patient info - try API first, fallback to localStorage
            let patient = null;
            if (this.apiClient) {
                try {
                    // Try Orval-generated method first
                    if (this.apiClient.getPatient) {
                        patient = await this.apiClient.getPatient(assignmentData.patientId);
                    } else {
                        // Fallback to manual API call
                        const patientRes = await this.apiClient.get(`/api/patients/${assignmentData.patientId}`);
                        patient = this.unwrapApiResponse(patientRes) || patientRes?.data;
                    }
                } catch (apiError) {
                    console.warn('Could not fetch patient from API, falling back to localStorage:', apiError);
                }
            }
            
            // Fallback to localStorage if API failed
            if (!patient) {
                const patients = JSON.parse(localStorage.getItem(STORAGE_KEYS.PATIENTS) || '[]');
                patient = patients.find(p => p.id === assignmentData.patientId);
            }
            
            if (!patient) {
                throw new Error('Patient not found for sale record');
            }
            
            // Extract payment details from form
            const downPayment = parseFloat(formData.get('downPayment') || 0);
            const quantity = assignmentData.ear === 'both' ? 2 : 1;
            const perUnitList = parseFloat(assignmentData.listPrice || 0);
            const perUnitSale = parseFloat(assignmentData.salePrice || 0);
            const perUnitSgk = parseFloat(assignmentData.sgkReduction || 0);
            const perUnitPatientPayment = Math.max(0, perUnitSale - perUnitSgk);
            const totalPatientPayment = perUnitPatientPayment * quantity;
            const remainingAmount = Math.max(0, totalPatientPayment - downPayment);
            
            // Build sale record data
            const saleRecord = {
                id: `sale_${Date.now()}`,
                patientId: assignmentData.patientId,
                patientName: `${patient.firstName} ${patient.lastName}`,
                patientTcNo: patient.tcNo || '',
                saleDate: new Date().toISOString(),
                saleType: 'device_sale',
                
                // Device details
                devices: (assignmentData.ear === 'both') ? [
                    {
                        inventoryId: assignmentData.inventoryId,
                        brand: assignmentData.brand || 'Unknown',
                        model: assignmentData.model || 'Unknown',
                        type: assignmentData.deviceName || 'hearing_aid',
                        ear: 'left',
                        serialNumber: assignmentData.serialNumberLeft || null,
                        barcode: assignmentData.barcode || null,
                        listPrice: perUnitList,
                        salePrice: perUnitSale,
                        sgkSupportType: assignmentData.sgkSupportType || 'no_coverage',
                        sgkReduction: perUnitSgk,
                        patientPayment: perUnitPatientPayment,
                        price: perUnitPatientPayment
                    },
                    {
                        inventoryId: assignmentData.inventoryId,
                        brand: assignmentData.brand || 'Unknown',
                        model: assignmentData.model || 'Unknown',
                        type: assignmentData.deviceName || 'hearing_aid',
                        ear: 'right',
                        serialNumber: assignmentData.serialNumberRight || null,
                        barcode: assignmentData.barcode || null,
                        listPrice: perUnitList,
                        salePrice: perUnitSale,
                        sgkSupportType: assignmentData.sgkSupportType || 'no_coverage',
                        sgkReduction: perUnitSgk,
                        patientPayment: perUnitPatientPayment,
                        price: perUnitPatientPayment
                    }
                ] : [{
                    inventoryId: assignmentData.inventoryId,
                    brand: assignmentData.brand || 'Unknown',
                    model: assignmentData.model || 'Unknown',
                    type: assignmentData.deviceName || 'hearing_aid',
                    ear: assignmentData.ear,
                    serialNumber: assignmentData.serialNumber || null,
                    barcode: assignmentData.barcode || null,
                    listPrice: perUnitList,
                    salePrice: perUnitSale,
                    sgkSupportType: assignmentData.sgkSupportType || 'no_coverage',
                    sgkReduction: perUnitSgk,
                    patientPayment: perUnitPatientPayment,
                    price: perUnitPatientPayment
                }],
                
                // Payment details
                totalListPrice: perUnitList * quantity,
                totalSalePrice: perUnitSale * quantity,
                totalSgkReduction: perUnitSgk * quantity,
                totalPatientPayment: totalPatientPayment,
                // Canonical top-level fields for UI consumption
                patientPayment: totalPatientPayment,
                finalAmount: totalPatientPayment,
                paidAmount: downPayment,
                downPayment: downPayment,
                remainingAmount: remainingAmount,
                paymentMethod: assignmentData.paymentMethod || 'cash',
                installmentCount: assignmentData.installmentCount || null,
                
                // Additional info
                notes: assignmentData.notes || '',
                status: remainingAmount > 0 ? 'partial_payment' : 'paid',
                createdAt: new Date().toISOString(),
                createdBy: 'system'
            };
            
            logger.log('💾 Sale record to save:', saleRecord);
            
            // Save to localStorage (API sale record is already created by assign-devices-extended)
            const sales = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SALES || 'xear_sales') || '[]');
            sales.push(saleRecord);
            localStorage.setItem(window.STORAGE_KEYS?.SALES || 'xear_sales', JSON.stringify(sales));
            logger.log('✅ Sale record saved to localStorage');
            
            // Add to patient timeline
            if (this.apiClient && assignmentData.patientId) {
                try {
                    await this.apiClient.post(`/api/patients/${assignmentData.patientId}/timeline`, {
                        type: 'device_sale',
                        title: 'Cihaz Satışı',
                        description: `${assignmentData.brand} ${assignmentData.model} satışı yapıldı - ${totalPatientPayment.toFixed(2)} TL`,
                        category: 'financial',
                        icon: 'fa-shopping-cart',
                        color: 'green',
                        details: {
                            saleId: saleRecord.id,
                            deviceBrand: assignmentData.brand,
                            deviceModel: assignmentData.model,
                            ear: assignmentData.ear,
                            salePrice: assignmentData.salePrice,
                            sgkReduction: assignmentData.sgkReduction,
                            patientPayment: totalPatientPayment,
                            downPayment: downPayment,
                            remainingAmount: remainingAmount
                        }
                    });
                } catch (timelineError) {
                    logger.warn('Could not add sale to timeline:', timelineError);
                }
            }
            
            return saleRecord;
            
        } catch (error) {
            logger.error('❌ Sale record creation error:', error);
            throw error;
        }
    }

    startDeviceTrial(trialData) {
        // Load existing trials
        const trial = {
            id: `trial_${Date.now()}`,
            ...trialData,
            startDate: new Date().toISOString(),
            status: 'active'
        };
        
        const trials = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEVICETRIALS) || '[]');
        trials.push(trial);
        localStorage.setItem(STORAGE_KEYS.DEVICETRIALS, JSON.stringify(trials));
        
        // Update inventory item status to trial
        if (trialData.inventoryId) {
            this.updateInventoryItem(trialData.inventoryId, {
                status: 'trial',
                trialTo: trialData.patientId,
                trialStartDate: trial.startDate
            });
        }
        
        // Update patient data
        this.updatePatientDeviceTrials(trialData.patientId, trial);
        
        return trial;
    }

    endDeviceTrial(trialId, result, notes = '') {
        const trials = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEVICETRIALS) || '[]');
        const trialIndex = trials.findIndex(t => t.id === trialId);
        
        if (trialIndex !== -1) {
            const trial = trials[trialIndex];
            trial.endDate = new Date().toISOString();
            trial.status = 'completed';
            trial.result = result;
            trial.notes = (trial.notes ? trial.notes + '\n' : '') + notes;
            trial.updatedAt = new Date().toISOString();
            
            localStorage.setItem(STORAGE_KEYS.DEVICETRIALS, JSON.stringify(trials));
            
            // Update inventory item status back to available
            if (trial.inventoryId) {
                this.updateInventoryItem(trial.inventoryId, {
                    status: 'available',
                    trialTo: null,
                    trialStartDate: null
                });
            }
            
            return trial;
        }
        return null;
    }

    getPatientTrials(patientId) {
        const trials = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEVICETRIALS) || '[]');
        return trials.filter(t => t.patientId === patientId);
    }

    getActiveTrials(patientId = null) {
        const trials = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEVICETRIALS) || '[]');
        let filtered = trials.filter(t => t.status === 'active');
        if (patientId) {
            filtered = filtered.filter(t => t.patientId === patientId);
        }
        return filtered;
    }

    // Update patient data with device trial
    updatePatientDeviceTrials(patientId, trial) {
        const patients = JSON.parse(localStorage.getItem(STORAGE_KEYS.PATIENTS) || '[]');
        const patientIndex = patients.findIndex(p => p.id === patientId);
        
        if (patientIndex !== -1) {
            if (!patients[patientIndex].deviceTrials) {
                patients[patientIndex].deviceTrials = [];
            }
            patients[patientIndex].deviceTrials.push(trial);
            patients[patientIndex].updatedAt = new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
        }
    }

    updateAssignment(assignmentId, updates) {
        const index = this.assignments.findIndex(a => a.id === assignmentId);
        if (index !== -1) {
            this.assignments[index] = {
                ...this.assignments[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveAssignments();
            return this.assignments[index];
        }
        return null;
    }

    getPatientAssignments(patientId) {
        return this.assignments.filter(a => a.patientId === patientId);
    }

    getActiveAssignments(patientId = null) {
        let filtered = this.assignments.filter(a => a.status === 'active');
        if (patientId) {
            filtered = filtered.filter(a => a.patientId === patientId);
        }
        return filtered;
    }

    // Update patient data with device assignment
    updatePatientDevices(patientId, assignment) {
        const patients = JSON.parse(localStorage.getItem(STORAGE_KEYS.PATIENTS) || '[]');
        const patientIndex = patients.findIndex(p => p.id === patientId);
        
        if (patientIndex !== -1) {
            if (!patients[patientIndex].devices) {
                patients[patientIndex].devices = [];
            }
            patients[patientIndex].devices.push(assignment);
            patients[patientIndex].updatedAt = new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
        }
    }

    // Render Methods
    renderDevicesTab(patientData) {
        // Use devices from patientData (API response) if available, otherwise fall back to localStorage
        const patientDevices = patientData.devices || [];
        
        logger.log('🔍 renderDevicesTab - Patient devices from API:', patientDevices.length, patientDevices);
        
        // Separate by status
        const activeDevices = patientDevices.filter(d => 
            d.status === 'ACTIVE' || d.status === 'active' || d.status === 'IN_USE'
        );
        const trialDevices = patientDevices.filter(d => 
            d.status === 'TRIAL' || d.status === 'trial'
        );
        const allDevices = patientDevices.filter(d => 
            !['RETURNED', 'returned', 'REMOVED', 'removed'].includes(d.status)
        );
        
        console.log('🔍 Active:', activeDevices.length, 'Trial:', trialDevices.length, 'All:', allDevices.length);
        
        let devicesHtml = '';
        if (allDevices.length === 0) {
            devicesHtml = `
                <div class="text-center py-8">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Henüz cihaz atanmamış</h3>
                    <p class="text-gray-600">Bu hastaya henüz bir işitme cihazı atanmamıştır.</p>
                </div>
            `;
        } else {
            devicesHtml = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${allDevices.map(device => {
                        const createdDate = device.createdAt ? new Date(device.createdAt).toLocaleDateString('tr-TR') : 'Bilinmiyor';
                        const warrantyEnd = device.warranty ? new Date(device.warranty).toLocaleDateString('tr-TR') : 'Belirtilmemiş';
                        
                        // Normalize ear value
                        let earLabel = 'Bilinmiyor';
                        const earValue = (device.ear || '').toUpperCase();
                        if (earValue === 'LEFT' || earValue === 'L') earLabel = 'Sol Kulak';
                        else if (earValue === 'RIGHT' || earValue === 'R') earLabel = 'Sağ Kulak';
                        else if (earValue === 'BOTH' || earValue === 'BILATERAL' || earValue === 'B') earLabel = 'İki Kulak';
                        
                        // Status badge
                        let statusBadge = '';
                        const status = (device.status || '').toUpperCase();
                        if (status === 'TRIAL') {
                            statusBadge = '<span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Deneme</span>';
                        } else if (status === 'ACTIVE' || status === 'IN_USE') {
                            statusBadge = '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Aktif</span>';
                        } else {
                            statusBadge = `<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">${device.status || 'Bilinmiyor'}</span>`;
                        }
                        
                        return `
                            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div class="flex justify-between items-start mb-3">
                                    <h5 class="font-medium text-gray-900">${device.brand || 'Bilinmiyor'} ${device.model || ''}</h5>
                                    ${statusBadge}
                                </div>
                                <div class="space-y-2 text-sm text-gray-600">
                                    <div class="flex justify-between">
                                        <span>Kulak:</span>
                                        <span class="font-medium text-gray-900">${earLabel}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Seri No:</span>
                                        <span class="font-medium text-gray-900">${device.serialNumber || 'Yok'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Atanma Tarihi:</span>
                                        <span class="font-medium text-gray-900">${createdDate}</span>
                                    </div>
                                    ${device.price ? `
                                    <div class="flex justify-between">
                                        <span>Fiyat:</span>
                                        <span class="font-medium text-gray-900">${device.price.toLocaleString('tr-TR')} TL</span>
                                    </div>
                                    ` : ''}
                                    <div class="flex justify-between">
                                        <span>Garanti Bitiş:</span>
                                        <span class="font-medium text-gray-900">${warrantyEnd}</span>
                                    </div>
                                </div>
                                <div class="mt-3 flex space-x-2">
                                    <button onclick="editDevice('${device.id}')" class="text-blue-600 hover:text-blue-900 text-sm font-medium">Cihaz Yönü Değiştir</button>
                                    <button onclick="deviceMaintenance('${device.id}')" class="text-green-600 hover:text-green-900 text-sm font-medium">Bakım</button>
                                    <button onclick="removeDevice('${device.id}')" class="text-red-600 hover:text-red-900 text-sm font-medium">Kaldır</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        // Trial devices section  
        let trialsHtml = '';
        if (trialDevices.length === 0) {
            trialsHtml = `
                <div class="text-center py-6">
                    <p class="text-gray-500">Henüz cihaz denemesi yapılmamış.</p>
                </div>
            `;
        } else {
            trialsHtml = `
                <div class="space-y-3">
                    ${trialDevices.map(device => {
                        const startDate = device.createdAt ? new Date(device.createdAt).toLocaleDateString('tr-TR') : 'Bilinmiyor';
                        const endDate = device.trialPeriod ? 'Belirtilmemiş' : 'Devam ediyor';
                        
                        // Normalize ear value
                        let earLabel = 'Bilinmiyor';
                        const earValue = (device.ear || '').toUpperCase();
                        if (earValue === 'LEFT' || earValue === 'L') earLabel = 'Sol Kulak';
                        else if (earValue === 'RIGHT' || earValue === 'R') earLabel = 'Sağ Kulak';
                        else if (earValue === 'BOTH' || earValue === 'BILATERAL' || earValue === 'B') earLabel = 'İki Kulak';
                        
                        return `
                            <div class="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                                <div class="flex justify-between items-start mb-2">
                                    <h6 class="font-medium text-gray-900">${device.brand || 'Bilinmiyor'} ${device.model || ''} - ${earLabel}</h6>
                                    <span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Deneme</span>
                                </div>
                                <div class="grid grid-cols-3 gap-4 text-sm text-gray-600">
                                    <div>
                                        <span class="block text-gray-500">Başlangıç:</span>
                                        <span class="font-medium text-gray-900">${startDate}</span>
                                    </div>
                                    <div>
                                        <span class="block text-gray-500">Bitiş:</span>
                                        <span class="font-medium text-gray-900">${endDate}</span>
                                    </div>
                                    <div>
                                        <span class="block text-gray-500">Seri No:</span>
                                        <span class="font-medium text-gray-900">${device.serialNumber || 'Yok'}</span>
                                    </div>
                                </div>
                                ${device.notes ? `
                                    <div class="mt-2">
                                        <span class="block text-gray-500 text-sm">Notlar:</span>
                                        <p class="text-sm text-gray-700">${device.notes}</p>
                                    </div>
                                ` : ''}
                                <div class="mt-3 flex space-x-2">
                                    <button onclick="editDeviceTrial('${device.id}')" class="text-blue-600 hover:text-blue-900 text-sm font-medium">Düzenle</button>
                                    <button onclick="completeDeviceTrial('${device.id}')" class="text-green-600 hover:text-green-900 text-sm font-medium">Tamamla</button>
                                    <button onclick="cancelTrial('${device.id}')" class="text-red-600 hover:text-red-900 text-sm font-medium">İptal</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        return `
            <div class="space-y-6">
                <!-- Current Devices Section -->
                <div class="bg-white rounded-lg border border-gray-200 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-lg font-semibold text-gray-900">Mevcut Cihazlar</h4>
                        <button onclick="assignDevice('${patientData.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Cihaz Ata
                        </button>
                    </div>
                    ${devicesHtml}
                </div>
                
                <!-- Device Trials Section -->
                <div class="bg-white rounded-lg border border-gray-200 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-lg font-semibold text-gray-900">Cihaz Denemeleri</h4>
                        <button onclick="startDeviceTrial('${patientData.id}')" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Yeni Deneme
                        </button>
                    </div>
                    ${trialsHtml}
                </div>
                
                <!-- Device History Section -->
                <div class="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 class="text-lg font-semibold text-gray-900 mb-4">Cihaz Geçmişi</h4>
                    <div class="space-y-2">
                        ${this.renderDeviceHistory(patientData.id)}
                    </div>
                </div>
            </div>
        `;
    }

    renderDeviceHistory(patientId) {
        const allAssignments = this.getPatientAssignments(patientId);
        
        if (allAssignments.length === 0) {
            return '<p class="text-center py-4 text-gray-500">Cihaz geçmişi bulunamadı.</p>';
        }
        
        return allAssignments
            .sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate))
            .map(assignment => `
                <div class="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                        <span class="font-medium">${assignment.brand} ${assignment.model}</span>
                        <span class="text-sm text-gray-500 ml-2">(${assignment.ear === 'left' ? 'Sol' : 'Sağ'})</span>
                    </div>
                    <div class="text-sm text-gray-500">
                        ${new Date(assignment.assignedDate).toLocaleDateString('tr-TR')}
                    </div>
                </div>
            `).join('');
    }

    renderInventoryModal() {
        const availableItems = this.getInventoryItems({ status: 'available' });
        
        return `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="inventoryModal">
                <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-semibold">Envanter Yönetimi</h2>
                        <button class="text-gray-500 hover:text-gray-700" onclick="closeInventoryModal()">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="mb-4">
                        <button class="btn btn-primary" onclick="openAddInventoryItemModal()">Yeni Envanter Ekle</button>
                    </div>
                    
                    <!-- Filter Section -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Filtreler</label>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs text-gray-600 mb-1">Kategori</label>
                                <select id="inventoryCategorySelect" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                    <option value="">Tüm Kategoriler</option>
                                    ${this.categories.map(category => `
                                        <option value="${category.toLowerCase().replace(/ /g, '_')}">${category}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div id="inventoryEarSelectorWrap" style="display: none;">
                                <label class="block text-xs text-gray-600 mb-1">Kulak</label>
                                <div class="flex space-x-2">
                                    <div class="flex items-center">
                                        <input id="earLeft" name="inventoryEar" type="radio" value="left" class="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                                        <label for="earLeft" class="ml-2 block text-sm text-gray-700">Sol</label>
                                    </div>
                                    <div class="flex items-center">
                                        <input id="earRight" name="inventoryEar" type="radio" value="right" class="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500">
                                        <label for="earRight" class="ml-2 block text-sm text-gray-700">Sağ</label>
                                    </div>
                                    <div class="flex items-center">
                                        <input id="earBoth" name="inventoryEar" type="radio" value="both" class="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500" checked>
                                        <label for="earBoth" class="ml-2 block text-sm text-gray-700">Bilateral</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="inventoryItemsGrid">
                        ${availableItems.map(item => {
                            const validation = this.validateDeviceInfo(item);
                            const isValid = validation.isValid;
                            return `
                            <div class="border rounded-lg p-4 ${isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
                                <div class="flex items-center justify-between mb-2">
                                    <div class="flex items-center space-x-2">
                                        <div class="w-3 h-3 rounded-full ${item.ear === 'left' ? 'bg-blue-500' : item.ear === 'right' ? 'bg-red-500' : 'bg-gray-500'}"></div>
                                        <span class="text-xs font-medium text-gray-600 uppercase">${item.ear === 'left' ? 'Sol' : 'Sağ'}</span>
                                        ${!isValid ? '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Eksik Bilgi</span>' : '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Hazır</span>'}
                                    </div>
                                    <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Mevcut</span>
                                </div>
                                <h4 class="font-semibold text-gray-900 mb-1">${item.brand} ${item.model}</h4>
                                ${item.category === 'hearing_aid' ? `
                                    <div class="mb-1">
                                        <button type="button" class="text-blue-600 hover:underline text-sm" onclick="openSerialListModal('${item.id}')">Seri No Listesi (${item.availableInventory || 0})</button>
                                    </div>
                                ` : `<p class="text-sm text-gray-600 mb-1">Seri: ${item.serialNumber || '<span class="text-red-500">Eksik</span>'}</p>`}
                                <p class="text-sm text-gray-600 mb-2">₺${item.price?.toLocaleString() || '<span class="text-red-500">Eksik</span>'}</p>
                                ${!isValid ? `<p class="text-xs text-red-600 mb-2">Eksik: ${validation.errors.join(', ')}</p>` : ''}
                                <div class="flex space-x-2">
                                    <button class="text-blue-600 hover:text-blue-800 text-sm" onclick="editInventoryItem('${item.id}')">Düzenle</button>
                                    <button class="text-red-600 hover:text-red-800 text-sm" onclick="deleteInventoryItem('${item.id}')">Sil</button>
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Modal Management
    async openAssignDeviceModal(patientId) {
        // Ensure data is loaded before opening modal
        if (!this.dataLoaded) {
            await this.loadDeviceData();
        }
        
        // For assignment modal, only show hearing aid category items as available devices
        const availableDevices = this.getInventoryItems({ status: 'available', category: 'hearing_aid' });
        
        // Get patient data for SGK calculations
        const patients = JSON.parse(localStorage.getItem(STORAGE_KEYS.PATIENTS) || '[]');
        const patient = patients.find(p => p.id === patientId);
        
        const modalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="assignDeviceModal">
                <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-6">
                        <div>
                            <h2 class="text-xl font-semibold">Cihaz Atama</h2>
                            <p class="text-sm text-gray-600 mt-1">${patient ? `${patient.firstName} ${patient.lastName}` : 'Hasta'} - ${patientId}</p>
                        </div>
                        <button class="text-gray-500 hover:text-gray-700" onclick="closeAssignDeviceModal()">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <form id="assignDeviceForm">
                        <input type="hidden" name="patientId" value="${patientId}">
                        <input type="hidden" name="inventoryId" id="assignInventoryId" value="">
                        <input type="hidden" name="brand" id="assignBrand" value="">
                        <input type="hidden" name="model" id="assignModel" value="">

                        <!-- Ear override for assignment -->
                        <div class="mb-4" id="assignEarSelectorWrap">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Atama - Kulak Seçimi</label>
                            <div class="flex gap-2 justify-center">
                                <input type="radio" name="assignEar" id="assignEarLeft" value="left" class="hidden ear-radio">
                                <label for="assignEarLeft" class="ear-button flex-1 px-6 py-3 text-center border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                                    <span class="text-sm font-medium">Sol</span>
                                </label>
                                
                                <input type="radio" name="assignEar" id="assignEarRight" value="right" class="hidden ear-radio">
                                <label for="assignEarRight" class="ear-button flex-1 px-6 py-3 text-center border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                                    <span class="text-sm font-medium">Sağ</span>
                                </label>
                                
                                <input type="radio" name="assignEar" id="assignEarBoth" value="both" class="hidden ear-radio" checked>
                                <label for="assignEarBoth" class="ear-button flex-1 px-6 py-3 text-center border-2 border-blue-500 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-all">
                                    <span class="text-sm font-medium">Bilateral</span>
                                </label>
                            </div>
                        </div>
                        
                        <style>
                        .ear-radio:checked + .ear-button {
                            border-color: #3B82F6;
                            background-color: #3B82F6;
                            color: white;
                        }
                        .ear-radio:not(:checked) + .ear-button {
                            background-color: white;
                            color: #374151;
                        }
                        </style>

                        <!-- Assignment Reason -->
                        <div class="mb-6">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Cihaz Atama Nedeni</label>
                            <select name="assignmentReason" id="assignmentReason" class="w-full border border-gray-300 rounded-md px-3 py-2" required>
                                <option value="">Atama nedenini seçiniz</option>
                                <option value="sale">Satış</option>
                                <option value="service">Fitting</option>
                                <option value="repair">Tamir</option>
                                <option value="trial">Deneme</option>
                                <option value="replacement">Değişim</option>
                                <option value="proposal">Fiyat Teklifi</option>
                                <option value="other">Diğer</option>
                            </select>
                        </div>
                        
                        <!-- Device Selection with Search -->
                        <div class="mb-6">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Mevcut Cihazlar</label>
                            
                            <!-- Search Bar -->
                            <div class="mb-3">
                                <input 
                                    type="text" 
                                    id="deviceSearchInput"
                                    class="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                    placeholder="🔍 Barkod, seri no, marka, model veya isim ile ara..."
                                >
                            </div>
                            
                            <div id="deviceListContainer" class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                ${availableDevices.map(item => {
                                    const validation = this.validateDeviceInfo(item);
                                    const isValid = validation.isValid;
                                    const serialInfo = item.serialNumber ? `S/N: ${item.serialNumber}` : '';
                                    const barcodeInfo = item.barcode ? `Barkod: ${item.barcode}` : '';
                                    
                                    return `
                                    <div class="border rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all device-option ${isValid ? 'border-gray-300 bg-white' : 'border-red-200 bg-red-50'}" 
                                         data-device-id="${item.uniqueId || item.id}"
                                         data-inventory-id="${item.originalInventoryId || item.id}"
                                         data-serial="${item.serialNumber || ''}"
                                         data-barcode="${item.barcode || ''}"
                                         data-brand="${item.brand}"
                                         data-model="${item.model}"
                                         data-name="${item.name}"
                                         data-search-text="${(item.brand + ' ' + item.model + ' ' + item.name + ' ' + (item.serialNumber || '') + ' ' + (item.barcode || '')).toLowerCase()}">
                                        
                                        <!-- Header with Ear Indicator -->
                                        <div class="flex items-center justify-between mb-2">
                                            <div class="flex items-center space-x-2">
                                                <div class="w-3 h-3 rounded-full ${item.ear === 'left' || item.direction === 'left' ? 'bg-blue-500' : item.ear === 'right' || item.direction === 'right' ? 'bg-red-500' : 'bg-green-500'}"></div>
                                                <span class="text-xs font-medium text-gray-600 uppercase">${item.ear === 'left' || item.direction === 'left' ? 'Sol' : item.ear === 'right' || item.direction === 'right' ? 'Sağ' : 'Bilateral'}</span>
                                            </div>
                                            ${item.availableInventory > 0 ? '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">✓ Stokta</span>' : '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">⚠️ Stokta Yok</span>'}
                                        </div>
                                        
                                        <!-- Device Name -->
                                        <h4 class="font-semibold text-sm ${isValid ? 'text-gray-900' : 'text-red-700'} mb-1">
                                            ${item.brand} ${item.model}
                                        </h4>
                                        
                                        <!-- Serial Number (prominent) -->
                                        ${serialInfo ? `<p class="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded mb-1">${serialInfo}</p>` : ''}
                                        
                                        <!-- Barcode -->
                                        ${barcodeInfo ? `<p class="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded mb-1">${barcodeInfo}</p>` : ''}
                                        
                                        <!-- Stock and Price -->
                                        <div class="flex justify-between items-center mt-2 text-xs">
                                            <span class="text-gray-600">Stok: ${item.availableInventory || 0}</span>
                                            <span class="text-gray-700 font-medium">₺${item.price?.toLocaleString() || 'N/A'}</span>
                                        </div>
                                    </div>
                                `}).join('')}
                            </div>
                        </div>
                        
                        <!-- Serial Number Selection (between device list and pricing) -->
                        <div class="mb-6" id="serialNumberSection" style="display: none;">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Seri Numarası (İsteğe Bağlı)</label>
                            <div id="serialNumberFields">
                                <!-- Single serial field (for left, right, or single device) -->
                                <div id="singleSerialField" class="mb-3">
                                    <select name="serialNumber" id="assignSerialSelect" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                        <option value="">Seri numarası seçin (opsiyonel)</option>
                                    </select>
                                </div>
                                
                                <!-- Bilateral serial fields (2 fields when bilateral is selected) -->
                                <div id="bilateralSerialFields" style="display: none;">
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-xs text-gray-600 mb-1">Sol Kulak Seri No</label>
                                            <select name="serialNumberLeft" id="assignSerialSelectLeft" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                                <option value="">Sol seri seçin (opsiyonel)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-xs text-gray-600 mb-1">Sağ Kulak Seri No</label>
                                            <select name="serialNumberRight" id="assignSerialSelectRight" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                                <option value="">Sağ seri seçin (opsiyonel)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Pricing Section (shown only for sale/proposal) -->
                        <div class="mb-6" id="pricingSection" style="display: none;">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Fiyatlandırma</label>
                            
                            <!-- First Row: Liste Fiyatı and SGK Desteği -->
                            <div class="grid grid-cols-3 gap-4 mb-3">
                                <div class="col-span-2">
                                    <label class="block text-xs text-gray-600 mb-1">Liste Fiyatı</label>
                                    <input type="number" name="listPrice" id="listPrice" step="0.01" min="0" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0.00" onchange="calculateSalePrice()">
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">SGK Desteği</label>
                                    <select name="sgkSupportType" id="sgkSupportType" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" onchange="calculateSalePrice()">
                                        <option value="">Yok</option>
                                        <option value="no_coverage">Hakkı yok</option>
                                        <option value="under4_parent_working">0-4 yaş, çalışan</option>
                                        <option value="under4_parent_retired">0-4 yaş, emekli</option>
                                        <option value="age5_12_parent_working">5-12 yaş, çalışan</option>
                                        <option value="age5_12_parent_retired">5-12 yaş, emekli</option>
                                        <option value="age13_18_parent_working">13-18 yaş, çalışan</option>
                                        <option value="age13_18_parent_retired">13-18 yaş, emekli</option>
                                        <option value="over18_working">18+ yaş, çalışan</option>
                                        <option value="over18_retired">18+ yaş, emekli</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Second Row: Satış Fiyatı, İndirim Type, İndirim Miktarı -->
                            <div class="grid grid-cols-4 gap-3">
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">Satış Fiyatı</label>
                                    <input type="number" name="salePrice" id="salePrice" step="0.01" min="0" readonly class="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50" placeholder="0.00">
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">İndirim</label>
                                    <select name="discountType" id="discountType" class="w-full border border-gray-300 rounded-md px-2 py-2 text-sm" onchange="calculateSalePrice()">
                                        <option value="none">İndirim Yok</option>
                                        <option value="percentage">Oran (%)</option>
                                        <option value="amount">Miktar (₺)</option>
                                    </select>
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-xs text-gray-600 mb-1">İndirim Miktarı</label>
                                    <input type="number" name="discountValue" id="discountValue" step="0.01" min="0" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0" onchange="calculateSalePrice()">
                                </div>
                            </div>
                            
                            <!-- SGK İndirimi Display (hidden input for backend) -->
                            <input type="hidden" name="sgkReductionDisplay" id="sgkReductionDisplay" value="0">
                        </div>
                        
                        <!-- Trial Pricing Section (shown only for trial) -->
                        <div class="mb-6" id="trialPricingSection" style="display: none;">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Fiyatlandırma</label>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">Liste Fiyatı</label>
                                    <input type="number" name="trialListPrice" step="0.01" min="0" readonly class="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50" placeholder="0.00">
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">Deneme Fiyatı</label>
                                    <input type="number" name="trialPrice" step="0.01" min="0" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0.00">
                                    <p class="text-xs text-gray-500 mt-1">Hastanın deneme süresince ödeyeceği tutar</p>
                                </div>
                            </div>
                        </div>
                        
                        
                        <!-- Down Payment and Amount Due (shown only for sale) -->
                        <div class="mb-6" id="downPaymentSection" style="display: none;">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Ödeme Bilgileri</label>
                            <div class="grid grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">Ödenecek Tutar (₺)</label>
                                    <input type="number" name="patientPayment" id="patientPayment" step="0.01" min="0" readonly class="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50">
                                    <p class="text-xs text-gray-500 mt-1">SGK indirimi sonrası hasta ödemesi</p>
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">Ön Ödeme (₺)</label>
                                    <input type="number" name="downPayment" id="downPayment" step="0.01" min="0" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0.00" oninput="calculateRemainingAmount()">
                                    <p class="text-xs text-gray-500 mt-1">Peşin ödenen tutar</p>
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">Kalan Tutar (₺)</label>
                                    <input type="number" name="remainingAmount" id="remainingAmount" step="0.01" min="0" readonly class="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50">
                                    <p class="text-xs text-gray-500 mt-1">Ön ödeme sonrası kalan tutar</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Payment Method (shown only for sale/proposal) -->
                        <div class="mb-6" id="paymentSection" style="display: none;">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Ödeme Yöntemi</label>
                            <select name="paymentMethod" id="paymentMethod" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                <option value="">Ödeme yöntemini seçiniz</option>
                                <option value="cash">Nakit</option>
                                <option value="card">Kredi Kartı</option>
                                <option value="transfer">Havale/EFT</option>
                                <option value="installment">Taksit</option>
                            </select>
                        </div>
                        
                        <!-- Installment Options (shown when installment is selected) -->
                        <div class="mb-6 hidden" id="installmentOptions">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Taksit Seçenekleri</label>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">Taksit Sayısı</label>
                                    <select name="installmentCount" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                        <option value="3">3 Taksit</option>
                                        <option value="6">6 Taksit</option>
                                        <option value="9">9 Taksit</option>
                                        <option value="12">12 Taksit</option>
                                        <option value="18">18 Taksit</option>
                                        <option value="24">24 Taksit</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">Aylık Taksit</label>
                                    <input type="number" name="monthlyInstallment" step="0.01" min="0" readonly class="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Notes -->
                        <div class="mb-6">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
                            <textarea name="notes" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Atama ile ilgili notlar..."></textarea>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex justify-between items-center pt-4 border-t border-gray-200">
                            <div class="flex space-x-3">
                                <button type="button" class="btn btn-secondary" onclick="closeAssignDeviceModal()">İptal</button>
                                <button type="submit" class="btn btn-primary">Cihazı Ata</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.setupAssignDeviceForm();
    }

    setupAssignDeviceForm() {
        let selectedDevice = null;
        
        // Real-time search functionality
        const searchInput = document.getElementById('deviceSearchInput');
        const deviceContainer = document.getElementById('deviceListContainer');
        const allDeviceOptions = Array.from(document.querySelectorAll('.device-option'));
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase().trim();
                
                allDeviceOptions.forEach(option => {
                    const searchText = option.dataset.searchText || '';
                    const matches = !searchTerm || searchText.includes(searchTerm);
                    
                    if (matches) {
                        option.style.display = '';
                        // Highlight matching text (optional enhancement)
                        if (searchTerm && searchTerm.length > 2) {
                            option.style.borderColor = '#3B82F6';
                            option.style.borderWidth = '2px';
                        } else {
                            option.style.borderColor = '';
                            option.style.borderWidth = '';
                        }
                    } else {
                        option.style.display = 'none';
                    }
                });
                
                // Show "no results" message if needed
                const visibleCount = allDeviceOptions.filter(opt => opt.style.display !== 'none').length;
                const existingNoResults = deviceContainer.querySelector('.no-results-message');
                
                if (visibleCount === 0 && !existingNoResults) {
                    const noResultsMsg = document.createElement('div');
                    noResultsMsg.className = 'no-results-message col-span-2 text-center py-8 text-gray-500';
                    noResultsMsg.innerHTML = `
                        <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <p class="font-medium">Sonuç bulunamadı</p>
                        <p class="text-sm">Arama kriterlerinizi değiştirerek tekrar deneyin</p>
                    `;
                    deviceContainer.appendChild(noResultsMsg);
                } else if (visibleCount > 0 && existingNoResults) {
                    existingNoResults.remove();
                }
            });
        }
        
        // Device selection
        allDeviceOptions.forEach(option => {
            option.addEventListener('click', () => {
                allDeviceOptions.forEach(opt => {
                    opt.classList.remove('border-blue-500', 'bg-blue-50', 'shadow-lg');
                    opt.classList.add('border-gray-300');
                });
                option.classList.remove('border-gray-300');
                option.classList.add('border-blue-500', 'bg-blue-50', 'shadow-lg');
                
                selectedDevice = option.dataset.deviceId;
                const inventoryId = option.dataset.inventoryId;
                const serialNumber = option.dataset.serial;
                
                // Fill form data
                const form = document.getElementById('assignDeviceForm');
                if (form) {
                    // Find device in inventory
                    const device = this.inventory.find(d => d.uniqueId === selectedDevice || d.id === selectedDevice);
                    
                    if (device) {
                        // Pricing
                        const listPriceEl = form.querySelector('[name="listPrice"]'); 
                        if (listPriceEl) listPriceEl.value = device.price || 0;
                        const salePriceEl = form.querySelector('[name="salePrice"]'); 
                        if (salePriceEl) salePriceEl.value = device.price || 0;
                        
                        // Hidden fields
                        const invIdEl = form.querySelector('#assignInventoryId'); 
                        if (invIdEl) invIdEl.value = inventoryId || device.originalInventoryId || device.id;
                        const brandEl = form.querySelector('#assignBrand'); 
                        if (brandEl) brandEl.value = device.brand || '';
                        const modelEl = form.querySelector('#assignModel'); 
                        if (modelEl) modelEl.value = device.model || '';
                        
                        // Show serial number section
                        const serialSection = document.getElementById('serialNumberSection');
                        if (serialSection) serialSection.style.display = 'block';
                        
                        // Serial number (from expanded item or select)
                        const serialSelect = form.querySelector('#assignSerialSelect');
                        const serialSelectLeft = form.querySelector('#assignSerialSelectLeft');
                        const serialSelectRight = form.querySelector('#assignSerialSelectRight');
                        
                        // Get base inventory item to access ALL available serials
                        const baseInventoryId = device.originalInventoryId || inventoryId;
                        const baseInventoryItem = this.inventory.find(inv => 
                            inv.id === baseInventoryId && !inv.uniqueId
                        );
                        
                        const allSerials = baseInventoryItem?.availableSerials || device.availableSerials || [];
                        console.log('📦 Available serials for device:', allSerials);
                        
                        if (serialNumber) {
                            // Pre-select the serial number from expanded item
                            if (serialSelect) {
                                serialSelect.innerHTML = `<option value="${serialNumber}" selected>${serialNumber}</option>`;
                                serialSelect.disabled = true;
                            }
                        } else {
                            // Show ALL available serials from base inventory item
                            const serialOptions = allSerials.map(s => `<option value="${s}">${s}</option>`).join('');
                            if (serialSelect) {
                                serialSelect.innerHTML = '<option value="">Seri seçin (opsiyonel)</option>' + serialOptions;
                                serialSelect.disabled = false;
                            }
                            if (serialSelectLeft) {
                                serialSelectLeft.innerHTML = '<option value="">Sol seri seçin (opsiyonel)</option>' + serialOptions;
                            }
                            if (serialSelectRight) {
                                serialSelectRight.innerHTML = '<option value="">Sağ seri seçin (opsiyonel)</option>' + serialOptions;
                            }
                        }
                        
                        // Set default prices for trial
                        const trialListPrice = form.querySelector('[name="trialListPrice"]');
                        const trialPrice = form.querySelector('[name="trialPrice"]');
                        if (trialListPrice && device.price) {
                            trialListPrice.value = device.price;
                        }
                        if (trialPrice && device.price) {
                            trialPrice.value = device.price;
                        }
                        
                        // Store device ear info for validation (don't change form selection)
                        const deviceEar = device.ear || device.direction || 'both';
                        form.dataset.deviceEar = deviceEar;
                        form.dataset.deviceBrand = device.brand || '';
                        form.dataset.deviceModel = device.model || '';
                        
                        // Toggle serial fields based on ear selection
                        this.updateSerialFieldsVisibility();
                    }
                }
            });
        });
        
        // Ear selection change handler
        const earRadios = document.querySelectorAll('[name="assignEar"]');
        earRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateSerialFieldsVisibility();
                this.checkEarMismatch();
            });
        });
        
        // Assignment reason change - show/hide pricing sections (only for non-edit mode)
        const reasonSelect = document.getElementById('assignmentReason');
        if (reasonSelect) {
            reasonSelect.addEventListener('change', (e) => {
                const form = document.getElementById('assignDeviceForm');
                const isEditMode = form && form.dataset.editMode === 'true';
                
                // Skip pricing section changes in edit mode
                if (isEditMode) return;
                
                const reason = e.target.value;
                const showFullPricing = ['sale', 'proposal'].includes(reason);
                const showTrialPricing = reason === 'trial';
                
                const pricingSection = document.getElementById('pricingSection');
                const trialPricingSection = document.getElementById('trialPricingSection');
                const downPaymentSection = document.getElementById('downPaymentSection');
                const paymentSection = document.getElementById('paymentSection');
                const paymentMethodSelect = document.getElementById('paymentMethod');
                
                // For trial: show ONLY trial pricing section, hide everything else
                if (showTrialPricing) {
                    if (pricingSection) pricingSection.style.display = 'none';
                    if (trialPricingSection) trialPricingSection.style.display = 'block';
                    if (downPaymentSection) downPaymentSection.style.display = 'none';
                    if (paymentSection) paymentSection.style.display = 'none';
                    if (paymentMethodSelect) {
                        paymentMethodSelect.removeAttribute('required');
                        paymentMethodSelect.value = '';
                    }
                }
                // For sale/proposal: show pricing, down payment and payment sections
                else if (showFullPricing) {
                    if (pricingSection) pricingSection.style.display = 'block';
                    if (trialPricingSection) trialPricingSection.style.display = 'none';
                    // Show down payment only for 'sale' not 'proposal'
                    if (downPaymentSection) downPaymentSection.style.display = reason === 'sale' ? 'block' : 'none';
                    if (paymentSection) paymentSection.style.display = 'block';
                    if (paymentMethodSelect) {
                        paymentMethodSelect.setAttribute('required', 'required');
                    }
                    
                    // Auto-fill prices from selected device if available
                    const formEl = document.getElementById('assignDeviceForm');
                    if (formEl) {
                        const selectedDevice = formEl.querySelector('[name="inventoryId"]')?.value;
                        if (selectedDevice) {
                            const device = this.inventory.find(d => d.uniqueId === selectedDevice || d.id === selectedDevice);
                            if (device && device.price) {
                                const listPriceEl = formEl.querySelector('[name="listPrice"]');
                                if (listPriceEl && !listPriceEl.value) {
                                    listPriceEl.value = device.price;
                                    // Trigger calculation
                                    window.calculateSalePrice();
                                }
                            }
                        }
                    }
                }
                // For other reasons: hide all pricing sections
                else {
                    if (pricingSection) pricingSection.style.display = 'none';
                    if (trialPricingSection) trialPricingSection.style.display = 'none';
                    if (downPaymentSection) downPaymentSection.style.display = 'none';
                    if (paymentSection) paymentSection.style.display = 'none';
                    if (paymentMethodSelect) {
                        paymentMethodSelect.removeAttribute('required');
                        paymentMethodSelect.value = '';
                    }
                }
            });
        }
        
        // Form submission
        document.getElementById('assignDeviceForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const assignmentData = Object.fromEntries(formData.entries());
            
            // Calculate patient payment from sale price and SGK reduction
            if (assignmentData.salePrice) {
                const salePrice = parseFloat(assignmentData.salePrice || 0);
                const sgkReduction = parseFloat(assignmentData.sgkReductionDisplay || 0);
                const quantity = assignmentData.assignEar === 'both' ? 2 : 1;
                assignmentData.sgkReduction = sgkReduction;
                assignmentData.patientPayment = Math.max(0, (salePrice - sgkReduction) * quantity);
            }
            
            // Validate required fields (serial number is optional). Note: ear radio uses name 'assignEar'
            const form = e.target;
            const isEditMode = form.dataset.editMode === 'true';
            const requiredFields = isEditMode ? ['patientId', 'assignEar', 'assignmentReason'] : ['patientId', 'inventoryId', 'assignEar', 'assignmentReason'];
            let isValid = true;
            requiredFields.forEach(field => {
                const input = e.target.querySelector(`[name="${field}"]`);
                if (input && !input.value) {
                    isValid = false;
                    input.classList.add('border-red-500');
                    const error = document.createElement('div');
                    error.className = 'text-red-500 text-xs mt-1';
                    error.innerText = 'Bu alan gereklidir';
                    input.parentElement.appendChild(error);
                } else {
                    const error = input.parentElement.querySelector('.text-red-500');
                    if (error) {
                        error.remove();
                        input.classList.remove('border-red-500');
                    }
                }
            });
            
            if (!isValid) return;
            
            // Show loading state
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = isEditMode ? '<i class="fas fa-spinner fa-spin mr-2"></i>Güncelleniyor...' : '<i class="fas fa-spinner fa-spin mr-2"></i>Atanıyor...';
            
            try {
                const selectedEar = assignmentData.assignEar;
                
                // Handle ear selection - bilateral is treated as single assignment
                if (selectedEar === 'both') {
                    // Bilateral: single assignment with 'both' ear designation
                    assignmentData.ear = 'both';
                    const serialLeft = formData.get('serialNumberLeft') || null;
                    const serialRight = formData.get('serialNumberRight') || null;
                    assignmentData.serialNumberLeft = serialLeft;
                    assignmentData.serialNumberRight = serialRight;
                    // Store both serials in notes or separate fields
                    assignmentData.serialNumber = serialLeft && serialRight ? `L:${serialLeft},R:${serialRight}` : (serialLeft || serialRight || null);
                    await this.assignDevice(assignmentData);
                } else {
                    // Single ear assignment (left or right)
                    assignmentData.ear = selectedEar;
                    assignmentData.serialNumber = formData.get('serialNumber') || null;
                    await this.assignDevice(assignmentData);
                }
                
                // Handle sale operations based on edit mode
                if (assignmentData.assignmentReason === 'sale') {
                    if (assignmentData.saleId) {
                        // Edit mode: Check if device changed and update assignment accordingly
                        const originalDeviceId = form.dataset.originalDeviceId;
                        const originalInventoryId = form.dataset.originalInventoryId;
                        const selectedInventoryId = assignmentData.inventoryId;
                        
                        let deviceChanged = false;
                        if (originalInventoryId && selectedInventoryId && originalInventoryId !== selectedInventoryId) {
                            deviceChanged = true;
                            console.log('Device changed in edit mode:', { from: originalInventoryId, to: selectedInventoryId });
                        }
                        
                        if (deviceChanged) {
                            // Device changed: Update the assignment for this sale
                            try {
                                // Find existing assignment for this sale
                                // Try Orval-generated method first, fallback to manual API call
                                let existingAssignments;
                                try {
                                    if (window.patientsGetPatientAssignments && typeof window.patientsGetPatientAssignments === 'function') {
                                        existingAssignments = await window.patientsGetPatientAssignments({ patientId: assignmentData.patientId });
                                    } else if (this.apiClient.getPatientAssignments && typeof this.apiClient.getPatientAssignments === 'function') {
                                        existingAssignments = await this.apiClient.getPatientAssignments(assignmentData.patientId);
                                    } else {
                                        existingAssignments = await this.apiClient.get(`/api/patients/${assignmentData.patientId}/assignments`);
                                    }
                                } catch (error) {
                                    console.warn('Orval method failed, falling back to manual API call:', error);
                                    existingAssignments = await this.apiClient.get(`/api/patients/${assignmentData.patientId}/assignments`);
                                }
                                const saleAssignments = existingAssignments?.data?.filter(a => a.saleId === assignmentData.saleId) || [];
                                
                                if (saleAssignments.length > 0) {
                                    // Update the first assignment (assuming single device for now)
                                    const assignmentToUpdate = saleAssignments[0];
                                    const updateData = {
                                        device_id: assignmentData.deviceId || selectedInventoryId,
                                        ear: assignmentData.ear,
                                        reason: assignmentData.assignmentReason,
                                        serial_number: assignmentData.serialNumber,
                                        notes: assignmentData.notes || 'Updated via sale edit'
                                    };
                                    
                                    console.log('Updating assignment:', assignmentToUpdate.id, updateData);
                                    await this.apiClient.patch(`/api/patients/${assignmentData.patientId}/assignments/${assignmentToUpdate.id}`, updateData);
                                    console.log('✅ Assignment updated for device change');
                                } else {
                                    // No existing assignment found, create new one
                                    console.log('No existing assignment found, creating new assignment for device change');
                                    await this.assignDevice(assignmentData);
                                }
                            } catch (assignmentError) {
                                console.error('❌ Assignment update failed during device change:', assignmentError);
                                if (window.showCustomAlert) {
                                    window.showCustomAlert('Uyarı', 'Cihaz değişimi kaydedildi ancak atama güncellenemedi.', 'warning');
                                }
                            }
                        }
                        
                        // Update existing sale
                        try {
                            const saleUpdateData = {
                                total_amount: parseFloat(formData.get('totalAmount') || 0),
                                paid_amount: parseFloat(formData.get('paidAmount') || 0)
                            };

                            console.log('📝 Updating existing sale:', assignmentData.saleId, saleUpdateData);

                            if (this.apiClient) {
                                await this.apiClient.patch(`/api/patients/${assignmentData.patientId}/sales/${assignmentData.saleId}`, saleUpdateData);
                                console.log('✅ Sale updated via API');
                            } else {
                                // Fallback to localStorage update
                                const sales = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SALES || 'xear_sales') || '[]');
                                const saleIndex = sales.findIndex(s => s.id === assignmentData.saleId);
                                if (saleIndex !== -1) {
                                    sales[saleIndex] = {
                                        ...sales[saleIndex],
                                        totalAmount: saleUpdateData.total_amount,
                                        paidAmount: saleUpdateData.paid_amount,
                                        updatedAt: new Date().toISOString()
                                    };
                                    localStorage.setItem(window.STORAGE_KEYS?.SALES || 'xear_sales', JSON.stringify(sales));
                                    console.log('✅ Sale updated in localStorage');
                                }
                            }
                        } catch (saleError) {
                            console.error('❌ Sale update failed:', saleError);
                            if (window.showCustomAlert) {
                                window.showCustomAlert('Uyarı', 'Cihaz atandı ancak satış güncellenemedi.', 'warning');
                            }
                        }
                    } else {
                        // New sale: Create sale record
                        try {
                            await this.createSaleRecordFromAssignment(assignmentData, formData);
                        } catch (saleError) {
                            console.error('❌ Sale record creation failed:', saleError);
                            // Don't block the assignment if sale record fails
                            if (window.showCustomAlert) {
                                window.showCustomAlert('Uyarı', 'Cihaz atandı ancak satış kaydı oluşturulamadı.', 'warning');
                            }
                        }
                    }
                }
                
                // Close modal
                window.closeAssignDeviceModal();
                
                // Show success notification
                const form = document.getElementById('assignDeviceForm');
                const isEditMode = form && form.dataset.editMode === 'true';
                const successMessage = isEditMode ? 'Satış başarıyla güncellendi!' : 'Cihaz başarıyla atandı!';
                if (window.showCustomAlert) {
                    window.showCustomAlert('Başarılı', successMessage, 'success');
                } else {
                    alert(successMessage);
                }
                
                // Force switch to appropriate tab based on edit mode
                if (isEditMode) {
                    // Edit mode: Stay in sales tab
                    const salesTab = document.querySelector('[data-tab="sales"]');
                    if (salesTab && !salesTab.classList.contains('active')) {
                        salesTab.click();
                    }
                    
                    // Refresh sales tab with updated data
                    if (window.patientTabContentComponent) {
                        const content = await window.patientTabContentComponent.render(window.currentPatientData);
                        const tabContent = document.getElementById('tab-content');
                        if (tabContent) {
                            tabContent.innerHTML = content;
                        }
                    }
                } else {
                    // Assignment mode: Switch to devices tab
                    const devicesTab = document.querySelector('[data-tab="devices"]');
                    if (devicesTab && window.currentPatientData) {
                        // Activate devices tab if not already active
                        if (!devicesTab.classList.contains('active')) {
                            devicesTab.click();
                        }

                        // Show loading state
                        const tabContent = document.getElementById('tab-content');
                        if (tabContent) {
                            tabContent.innerHTML = '<div class="flex items-center justify-center py-12"><i class="fas fa-spinner fa-spin text-4xl text-blue-600 mr-4"></i><span class="text-lg text-gray-600">Cihazlar yükleniyor...</span></div>';
                        }

                        // Wait a moment for backend to process
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // Refetch patient data to get updated devices
                        try {
                            if (this.apiClient) {
                                // Try Orval-generated method first, fallback to manual API call
                                let response;
                                try {
                                    if (this.apiClient.getPatient && typeof this.apiClient.getPatient === 'function') {
                                        response = await this.apiClient.getPatient(window.currentPatientData.id);
                                    } else {
                                        response = await this.apiClient.get(`/api/patients/${window.currentPatientData.id}`);
                                    }
                                } catch (error) {
                                    console.warn('Orval method failed, falling back to manual API call:', error);
                                    response = await this.apiClient.get(`/api/patients/${window.currentPatientData.id}`);
                                }
                                
                                const freshPatientData = response?.data || response;
                                if (freshPatientData) {
                                    window.currentPatientData = freshPatientData;
                                }
                            }
                        } catch (refreshError) {
                            console.warn('Could not refetch patient data:', refreshError);
                        }

                        // Refresh devices tab with updated data
                        if (window.patientTabContentComponent) {
                            const content = await window.patientTabContentComponent.render(window.currentPatientData);
                            if (tabContent) {
                                tabContent.innerHTML = content;
                            }
                        }
                    }
                }
                
            } catch (error) {
                // Show error notification
                if (window.showCustomAlert) {
                    window.showCustomAlert('Hata', 'Cihaz atama sırasında hata oluştu: ' + error.message, 'error');
                } else {
                    alert('Cihaz atama sırasında hata oluştu: ' + error.message);
                }
                
                // Restore button
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        });
    }

    async openInventoryModal() {
        // Ensure data is loaded
        if (!this.dataLoaded) {
            await this.loadDeviceData();
        }
        
        const modalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="inventoryModal">
                <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-semibold">Envanter Yönetimi</h2>
                        <button class="text-gray-500 hover:text-gray-700" onclick="closeInventoryModal()">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Inventory Items Table -->
                    <div class="mb-4">
                        <button class="btn btn-primary" onclick="openAddInventoryItemModal()">Yeni Envanter Ekle</button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="inventoryItemsGrid">
                        ${this.inventory.map(item => {
                            const validation = this.validateDeviceInfo(item);
                            const isValid = validation.isValid;
                            return `
                            <div class="border rounded-lg p-4 ${isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
                                <div class="flex items-center justify-between mb-2">
                                    <div class="flex items-center space-x-2">
                                        <div class="w-3 h-3 rounded-full ${item.ear === 'left' ? 'bg-blue-500' : item.ear === 'right' ? 'bg-red' : 'bg-gray-500'}"></div>
                                        <span class="text-xs font-medium text-gray-600 uppercase">${item.ear === 'left' ? 'Sol' : 'Sağ'}</span>
                                        ${!isValid ? '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Eksik Bilgi</span>' : '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Hazır</span>'}
                                    </div>
                                    <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Mevcut</span>
                                </div>
                                <h4 class="font-semibold text-gray-900 mb-1">${item.brand} ${item.model}</h4>
                                ${item.category === 'hearing_aid' ? `
                                    <div class="mb-1">
                                        <button type="button" class="text-blue-600 hover:underline text-sm" onclick="openSerialListModal('${item.id}')">Seri No Listesi (${item.availableInventory || 0})</button>
                                    </div>
                                ` : `<p class="text-sm text-gray-600 mb-1">Seri: ${item.serialNumber || '<span class="text-red-500">Eksik</span>'}</p>`}
                                <p class="text-sm text-gray-600 mb-2">₺${item.price?.toLocaleString() || '<span class="text-red-500">Eksik</span>'}</p>
                                ${!isValid ? `<p class="text-xs text-red-600 mb-2">Eksik: ${validation.errors.join(', ')}</p>` : ''}
                                <div class="flex space-x-2">
                                    <button class="text-blue-600 hover:text-blue-800 text-sm" onclick="editInventoryItem('${item.id}')">Düzenle</button>
                                    <button class="text-red-600 hover:text-red-800 text-sm" onclick="deleteInventoryItem('${item.id}')">Sil</button>
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Open a modal to split a batch inventory item into serial-specific single items
    openSerialListModal(itemId) {
        const item = this.inventory.find(i => i.id === itemId);
        if (!item) return Utils.showToast('Envanter öğesi bulunamadı', 'error');
        const availableCount = item.availableInventory != null ? item.availableInventory : 0;
        if (availableCount <= 0) return Utils.showToast('Mevcut stok sıfır', 'warning');

        const max = Math.min(availableCount, 50);
        const inputsHtml = new Array(max).fill(0).map((_, idx) => `
            <div class="mb-2">
                <label class="block text-xs text-gray-600 mb-1">Seri #${idx+1}</label>
                <input type="text" data-serial-index="${idx}" class="w-full px-3 py-2 border border-gray-300 rounded-md">
            </div>
        `).join('');

        const modalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60" id="serialListModal">
                <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">Seri No Listesi - ${item.brand} ${item.model}</h3>
                        <button class="text-gray-500" onclick="closeSerialListModal()">Kapat</button>
                    </div>
                    <p class="text-sm text-gray-600 mb-4">Mevcut stok: ${availableCount}. Lütfen eklemek istediğiniz seri numaralarını girin. Alanlar isteğe bağlıdır.</p>
                    <div id="serialInputsWrap">${inputsHtml}</div>
                    <div class="flex justify-end space-x-3 mt-4">
                        <button class="px-4 py-2 bg-gray-200 rounded" onclick="closeSerialListModal()">İptal</button>
                        <button class="px-4 py-2 bg-blue-600 text-white rounded" id="serialModalSaveBtn">Kaydet</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('serialModalSaveBtn').addEventListener('click', () => {
            const modal = document.getElementById('serialListModal');
            const inputs = modal.querySelectorAll('[data-serial-index]');
            const entered = Array.from(inputs).map(i => i.value.trim()).filter(v => v);
            if (entered.length === 0) {
                Utils.showToast('Eklemek için en az bir seri girin veya iptal edin', 'warning');
                return;
            }

            // Create new inventory items for each entered serial
            entered.forEach(s => {
                const newItem = Object.assign({}, Utils.deepClone(item));
                newItem.id = `inv_${Date.now()}_${Math.floor(Math.random()*1000)}`;
                newItem.availableInventory = 1;
                newItem.totalInventory = 1;
                newItem.usedInventory = 0;
                newItem.serialNumber = s;
                newItem.availableSerials = [];
                newItem.createdAt = new Date().toISOString();
                // Persist using component helper
                this.addInventoryItem(newItem);
            });

            // Decrement parent item's availableInventory
            const createdCount = entered.length;
            this.updateInventoryItem(item.id, {
                availableInventory: Math.max(0, (item.availableInventory || 0) - createdCount)
            });

            Utils.showToast(`${entered.length} adet seri envantere eklendi`, 'success');
            closeSerialListModal();
            // Close and reopen inventory modal to refresh content if it is open
            const invModal = document.getElementById('inventoryModal');
            if (invModal) {
                invModal.remove();
                this.openInventoryModal();
            }
        });
    }

    closeSerialListModal() {
        const m = document.getElementById('serialListModal'); if (m) m.remove();
    }

    // Add Inventory Item Modal
    openAddInventoryItemModal() {
        const modalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="addInventoryModal">
                <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-semibold">Yeni Envanter Öğesi Ekle</h2>
                        <button class="text-gray-500 hover:text-gray-700" onclick="closeAddInventoryModal()">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <form id="addInventoryForm">
                        <!-- Basic Information -->
                        <div class="mb-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Temel Bilgiler</h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Ürün Adı *</label>
                                    <input type="text" name="name" required class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Ürün adını girin">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Kategori *</label>
                                    <select name="category" required class="w-full border border-gray-300 rounded-md px-3 py-2">
                                        <option value="">Kategori seçin</option>
                                        <option value="hearing_aid">İşitme Cihazı</option>
                                        <option value="battery">Pil</option>
                                        <option value="accessory">Aksesuar</option>
                                        <option value="ear_mold">Kulak Kalıbı</option>
                                        <option value="spare_part">Yedek Parça</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Marka *</label>
                                    <input type="text" name="brand" required class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Marka adını girin">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Model *</label>
                                    <input type="text" name="model" required class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Model adını girin">
                                </div>
                            </div>
                        </div>

                        <!-- Supplier Information -->
                        <div class="mb-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Tedarikçi Bilgileri</h3>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Tedarikçi</label>
                                <input type="text" id="supplierInput" name="supplier" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Tedarikçi adı yazın...">
                                <input type="hidden" id="supplierId" name="supplier_id">
                                <p class="text-xs text-gray-500 mt-1">Tedarikçi adı yazın. Listede yoksa otomatik olarak yeni tedarikçi oluşturulacak.</p>
                            </div>
                        </div>

                        <!-- Technical Specifications -->
                        <div class="mb-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Teknik Özellikler</h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Kulak</label>
                                    <select name="ear" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                        <option value="both">Bilateral</option>
                                        <option value="left">Sol Kulak</option>
                                        <option value="right">Sağ Kulak</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Tip</label>
                                    <select name="type" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                        <option value="digital_programmable">Dijital Programlanabilir</option>
                                        <option value="rechargeable_digital">Şarj Edilebilir Dijital</option>
                                        <option value="analog">Analog</option>
                                        <option value="zinc_air">Çinko Hava (Pil)</option>
                                        <option value="custom_silicone">Özel Silikon</option>
                                        <option value="maintenance_kit">Bakım Kiti</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Inventory Information -->
                        <div class="mb-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Stok Bilgileri</h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Toplam Stok *</label>
                                    <input type="number" name="totalInventory" required min="0" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Mevcut Stok *</label>
                                    <input type="number" name="availableInventory" required min="0" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Minimum Stok</label>
                                    <input type="number" name="reorderLevel" min="0" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0">
                                </div>
                            </div>
                        </div>

                        <!-- Pricing Information -->
                        <div class="mb-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Fiyat Bilgileri</h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Maliyet Fiyatı</label>
                                    <input type="number" name="cost" step="0.01" min="0" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0.00">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Satış Fiyatı *</label>
                                    <input type="number" name="price" step="0.01" min="0" required class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0.00">
                                </div>
                            </div>
                        </div>

                        <!-- Serial Numbers (for hearing aids) -->
                        <div class="mb-6" id="serialNumbersSection" style="display: none;">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Seri Numaraları</h3>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Seri Numaraları (her satıra bir tane)</label>
                                <textarea name="serialNumbers" rows="4" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="SN001&#10;SN002&#10;SN003"></textarea>
                                <p class="text-xs text-gray-500 mt-1">Her satıra bir seri numarası yazın. Boş bırakırsanız otomatik seri numaraları oluşturulacak.</p>
                            </div>
                        </div>

                        <!-- SGK Information -->
                        <div class="mb-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">SGK Bilgileri</h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">SGK Kodu</label>
                                    <input type="text" name="sgkCode" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="32.07.01.01.01">
                                </div>
                                
                                <div class="flex items-center">
                                    <input type="checkbox" name="isMinistryTracked" id="isMinistryTracked" class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                                    <label for="isMinistryTracked" class="ml-2 block text-sm text-gray-700">Bakanlık Takipli</label>
                                </div>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                            <button type="button" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" onclick="closeAddInventoryModal()">İptal</button>
                            <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">Kaydet</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.setupAddInventoryForm();
    }

    setupAddInventoryForm() {
        const form = document.getElementById('addInventoryForm');
        const categorySelect = form.querySelector('[name="category"]');
        const serialSection = document.getElementById('serialNumbersSection');
        const supplierInput = document.getElementById('supplierInput');
        
        // Show/hide serial numbers section based on category
        categorySelect.addEventListener('change', (e) => {
            if (e.target.value === 'hearing_aid') {
                serialSection.style.display = 'block';
            } else {
                serialSection.style.display = 'none';
            }
        });

        // Initialize supplier autocomplete
        if (supplierInput && window.SupplierAutocomplete) {
            this.supplierAutocomplete = new window.SupplierAutocomplete(supplierInput, {
                onSelect: (supplier) => {
                    document.getElementById('supplierId').value = supplier.id;
                },
                onCreate: (supplier) => {
                    document.getElementById('supplierId').value = supplier.id;
                }
            });
        }

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddInventorySubmit(e);
        });
    }

    async handleAddInventorySubmit(e) {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            // Prepare inventory item data
            const inventoryData = {
                name: data.name,
                category: data.category,
                brand: data.brand,
                model: data.model,
                type: data.type || 'digital_programmable',
                ear: data.ear || 'both',
                totalInventory: parseInt(data.totalInventory) || 0,
                availableInventory: parseInt(data.availableInventory) || 0,
                usedInventory: 0,
                reorderLevel: parseInt(data.reorderLevel) || 0,
                cost: parseFloat(data.cost) || 0,
                price: parseFloat(data.price) || 0,
                sgkCode: data.sgkCode || '',
                isMinistryTracked: data.isMinistryTracked === 'on',
                supplier: data.supplier || '',
                supplier_id: data.supplier_id || null
            };

            // Handle serial numbers for hearing aids
            if (data.category === 'hearing_aid' && data.serialNumbers) {
                const serials = data.serialNumbers.split('\n')
                    .map(s => s.trim())
                    .filter(s => s.length > 0);
                
                if (serials.length > 0) {
                    inventoryData.availableSerials = serials;
                    inventoryData.availableBarcodes = serials.map(s => `BC${s}`);
                    // Adjust inventory count to match serial count
                    inventoryData.availableInventory = serials.length;
                    inventoryData.totalInventory = Math.max(inventoryData.totalInventory, serials.length);
                }
            }

            // Add to inventory
            const newItem = this.addInventoryItem(inventoryData);
            
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Envanter öğesi başarıyla eklendi', 'success');
            }
            
            // Close modal and refresh inventory if open
            this.closeAddInventoryModal();
            
            const inventoryModal = document.getElementById('inventoryModal');
            if (inventoryModal) {
                inventoryModal.remove();
                this.openInventoryModal();
            }
            
        } catch (error) {
            logger.error('Error adding inventory item:', error);
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Envanter öğesi eklenirken hata oluştu', 'error');
            }
        }
    }

    closeAddInventoryModal() {
        const modal = document.getElementById('addInventoryModal');
        if (modal) {
            // Cleanup supplier autocomplete
            if (this.supplierAutocomplete) {
                this.supplierAutocomplete.destroy();
                this.supplierAutocomplete = null;
            }
            modal.remove();
        }
    }

    updateSerialFieldsVisibility() {
        const earValue = document.querySelector('[name="assignEar"]:checked')?.value;
        const singleSerialField = document.getElementById('singleSerialField');
        const bilateralSerialFields = document.getElementById('bilateralSerialFields');
        
        if (earValue === 'both') {
            // Show bilateral fields (2 serial selects)
            if (singleSerialField) singleSerialField.style.display = 'none';
            if (bilateralSerialFields) bilateralSerialFields.style.display = 'block';
        } else {
            // Show single field (for left or right)
            if (singleSerialField) singleSerialField.style.display = 'block';
            if (bilateralSerialFields) bilateralSerialFields.style.display = 'none';
        }
    }

    checkEarMismatch() {
        const form = document.getElementById('assignDeviceForm');
        if (!form || !form.dataset.deviceEar) return;

        const deviceEar = form.dataset.deviceEar.toLowerCase();
        const selectedEar = document.querySelector('[name="assignEar"]:checked')?.value;
        
        // Dismiss any existing warning
        const existingWarning = document.getElementById('earMismatchWarning');
        if (existingWarning) existingWarning.remove();

        // Check for mismatch
        let showWarning = false;
        let warningMessage = '';

        if (deviceEar === 'left' && selectedEar === 'right') {
            showWarning = true;
            warningMessage = `Dikkat: <strong>${form.dataset.deviceBrand} ${form.dataset.deviceModel}</strong> cihazının yönü <strong>SOL</strong> olarak kayıtlı, ancak siz <strong>SAĞ</strong> kulağa atama yapıyorsunuz.`;
        } else if (deviceEar === 'right' && selectedEar === 'left') {
            showWarning = true;
            warningMessage = `Dikkat: <strong>${form.dataset.deviceBrand} ${form.dataset.deviceModel}</strong> cihazının yönü <strong>SAĞ</strong> olarak kayıtlı, ancak siz <strong>SOL</strong> kulağa atama yapıyorsunuz.`;
        } else if (deviceEar === 'both' && selectedEar !== 'both') {
            showWarning = true;
            warningMessage = `Bilgi: <strong>${form.dataset.deviceBrand} ${form.dataset.deviceModel}</strong> cihazı <strong>HER İKİ KULAK</strong> için uygun, ancak siz tek kulak atama yapıyorsunuz.`;
        }

        if (showWarning) {
            const warningDiv = document.createElement('div');
            warningDiv.id = 'earMismatchWarning';
            warningDiv.className = 'bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4';
            warningDiv.innerHTML = `
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <div class="ml-3 flex-1">
                        <p class="text-sm text-yellow-700">${warningMessage}</p>
                        <button type="button" onclick="this.closest('#earMismatchWarning').remove()" 
                                class="mt-2 text-xs font-medium text-yellow-800 hover:text-yellow-900">
                            Anladım, devam et →
                        </button>
                    </div>
                </div>
            `;

            // Insert warning before the pricing section
            const pricingSection = document.getElementById('pricingSection') || 
                                  document.getElementById('trialPricingSection');
            if (pricingSection) {
                pricingSection.parentNode.insertBefore(warningDiv, pricingSection);
            } else {
                // Fallback: insert after serial section
                const serialSection = document.getElementById('serialNumberSection');
                if (serialSection) {
                    serialSection.after(warningDiv);
                }
            }
        }
    }

    // Helper Methods
    unwrapApiResponse(res) {
        // Handle different API response formats
        if (!res) return null;
        if (Array.isArray(res)) return res;
        if (res.data !== undefined) return res.data;
        if (res.items !== undefined) return res.items;
        return res;
    }

    saveDevices() {
        try {
            localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(this.devices));
        } catch (e) {
            console.error('Error saving devices:', e);
        }
    }

    saveInventory() {
        try {
            localStorage.setItem(STORAGE_KEYS.CRM_INVENTORY, JSON.stringify(this.inventory));
        } catch (e) {
            console.error('Error saving inventory:', e);
        }
    }

    saveAssignments() {
        try {
            localStorage.setItem(STORAGE_KEYS.DEVICEASSIGNMENTS, JSON.stringify(this.assignments));
        } catch (e) {
            console.error('Error saving assignments:', e);
        }
    }

    canonicalizeDevice(device) {
        // Normalize device object structure
        return {
            ...device,
            category: device.category || device.type || 'hearing_aid',
            ear: device.ear || device.direction || 'both'
        };
    }

    normalizeDeviceObject(device) {
        // Fallback normalization
        return {
            id: device.id || device.deviceId || `dev_${Date.now()}`,
            ...device
        };
    }
}

// Global functions for modal management
window.openAddInventoryItemModal = function() {
    if (window.deviceManagement && typeof window.deviceManagement.openAddInventoryItemModal === 'function') {
        return window.deviceManagement.openAddInventoryItemModal();
    }
};

window.closeAddInventoryModal = function() {
    if (window.deviceManagement && typeof window.deviceManagement.closeAddInventoryModal === 'function') {
        return window.deviceManagement.closeAddInventoryModal();
    }
};

window.closeInventoryModal = function() {
    const modal = document.getElementById('inventoryModal');
    if (modal) {
        modal.remove();
    }
};

// Global helper functions for device assignment modal

/**
 * Calculate sale price based on list price, discount, and SGK support
 */
window.calculateSalePrice = function() {
    const listPriceEl = document.getElementById('listPrice');
    const salePriceEl = document.getElementById('salePrice');
    const discountTypeEl = document.getElementById('discountType');
    const discountValueEl = document.getElementById('discountValue');
    const sgkTypeEl = document.getElementById('sgkSupportType');
    const sgkReductionEl = document.getElementById('sgkReductionDisplay');
    
    if (!listPriceEl || !salePriceEl) return;
    
    const listPrice = parseFloat(listPriceEl.value || 0);
    const discountType = discountTypeEl?.value || 'none';
    const discountValue = parseFloat(discountValueEl?.value || 0);
    const sgkType = sgkTypeEl?.value || '';
    
    let salePrice = listPrice;
    
    // Apply discount
    if (discountType === 'percentage' && discountValue > 0) {
        const discountAmount = (listPrice * discountValue) / 100;
        salePrice = Math.max(0, listPrice - discountAmount);
    } else if (discountType === 'amount' && discountValue > 0) {
        salePrice = Math.max(0, listPrice - discountValue);
    }
    
    // Update sale price
    salePriceEl.value = salePrice.toFixed(2);
    
    // Calculate SGK reduction from list price (not sale price) to match backend calculation
    let sgkReduction = 0;
    if (sgkType && sgkType !== '' && sgkType !== 'no_coverage') {
        // Load SGK amounts from settings
        const sgkSettings = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SGK_SETTINGS || 'sgk_settings') || '{}');
        
        // Default SGK amounts
        const defaultAmounts = {
            'under4_parent_working': 6104.44,
            'under4_parent_retired': 7630.56,
            'age5_12_parent_working': 5426.17,
            'age5_12_parent_retired': 6782.72,
            'age13_18_parent_working': 5087.04,
            'age13_18_parent_retired': 6358.88,
            'over18_working': 3391.36,
            'over18_retired': 4239.20
        };
        
        const sgkAmount = parseFloat(sgkSettings[sgkType] || defaultAmounts[sgkType] || 0);
        sgkReduction = Math.min(sgkAmount, listPrice);
    }
    
    // Update hidden SGK reduction field
    if (sgkReductionEl) {
        sgkReductionEl.value = sgkReduction.toFixed(2);
    }
    
    console.log('� Price Calculation:', {
        listPrice,
        discountType,
        discountValue,
        salePrice,
        sgkType,
        sgkReduction,
        finalPrice: (salePrice - sgkReduction).toFixed(2)
    });
    
    // Update remaining amount if needed
    if (window.calculateRemainingAmount) {
        window.calculateRemainingAmount();
    }
};

/**
 * Calculate remaining amount after down payment
 */
window.calculateRemainingAmount = function() {
    const salePriceEl = document.getElementById('salePrice');
    const sgkReductionEl = document.getElementById('sgkReductionDisplay');
    const downPaymentEl = document.getElementById('downPayment');
    const remainingAmountEl = document.getElementById('remainingAmount');
    const patientPaymentEl = document.getElementById('patientPayment');
    
    if (!salePriceEl || !remainingAmountEl) return;
    
    const salePrice = parseFloat(salePriceEl.value || 0);
    const sgkReduction = parseFloat(sgkReductionEl?.value || 0);
    const downPayment = parseFloat(downPaymentEl?.value || 0);
    const assignEarSelected = document.querySelector('input[name="assignEar"]:checked')?.value || 'left';
    const quantity = assignEarSelected === 'both' ? 2 : 1;
    
    // Patient payment = (sale price - SGK reduction) x quantity
    const patientPayment = Math.max(0, (salePrice - sgkReduction) * quantity);
    const remainingAmount = Math.max(0, patientPayment - downPayment);
    
    // Update patient payment field
    if (patientPaymentEl) {
        patientPaymentEl.value = patientPayment.toFixed(2);
    }
    
    remainingAmountEl.value = remainingAmount.toFixed(2);
    
    // Removed console.log to prevent excessive logging
};

// Legacy function for backward compatibility (no longer used in new UI)
window.updateSgkSupportAmount = function() {
    window.calculateSalePrice();
};

window.closeAssignDeviceModal = function() {
    const modal = document.getElementById('assignDeviceModal');
    if (modal) {
        modal.remove();
    }
};

// Attach small global wrappers if deviceManagement instance exists at runtime
window.openSerialListModal = function(itemId) { if (window.deviceManagement && typeof window.deviceManagement.openSerialListModal === 'function') return window.deviceManagement.openSerialListModal(itemId); };
window.closeSerialListModal = function() { if (window.deviceManagement && typeof window.deviceManagement.closeSerialListModal === 'function') return window.deviceManagement.closeSerialListModal(); };