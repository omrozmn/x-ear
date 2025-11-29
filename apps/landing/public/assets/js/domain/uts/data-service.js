// Complete UTS Data Service - Migrated from uts-data.js
// This file replaces /public/assets/uts-data.js functionality
// Complete UTS device data migrated from legacy uts-data.js
export const initialUTSDeviceData = [
    {
        id: 'uts_001',
        barkod: '8690123456789',
        seriNo: 'HG2024001',
        deviceType: 'kulak_arkasi',
        model: 'PowerMax Pro 85',
        supplierName: 'Medikal Çözümler Ltd.',
        manufacturerName: 'Phonak',
        possession: 'center',
        lastMovementDate: '2024-01-15T09:00:00Z',
        status: 'success',
        patientId: undefined,
        eReceiptId: undefined,
        notes: 'Tedarikçiden alındı',
        createdAt: '2024-01-15T09:00:00Z',
        updatedAt: '2024-01-15T09:00:00Z'
    },
    {
        id: 'uts_002',
        barkod: '8690123456790',
        seriNo: 'HG2024002',
        deviceType: 'kanal_ici',
        model: 'InEar Comfort 60',
        supplierName: 'Sağlık Teknolojileri A.Ş.',
        manufacturerName: 'Oticon',
        possession: 'supplier',
        lastMovementDate: '2024-01-20T14:30:00Z',
        status: 'pending',
        patientId: undefined,
        eReceiptId: undefined,
        notes: 'Tedarikçi tarafından gönderildi, alım bekleniyor',
        createdAt: '2024-01-20T14:30:00Z',
        updatedAt: '2024-01-20T14:30:00Z'
    },
    {
        id: 'uts_003',
        barkod: '8690123456791',
        seriNo: 'HG2024003',
        deviceType: 'kulak_arkasi',
        model: 'PowerMax Pro 85',
        supplierName: 'Medikal Çözümler Ltd.',
        manufacturerName: 'Phonak',
        possession: 'consumer',
        lastMovementDate: '2024-01-25T11:45:00Z',
        status: 'success',
        patientId: 'p3',
        eReceiptId: 'er_1',
        notes: 'Hasta Ayşe Kaya\'ya teslim edildi',
        createdAt: '2024-01-25T11:45:00Z',
        updatedAt: '2024-01-25T11:45:00Z'
    },
    {
        id: 'uts_004',
        barkod: '8690123456792',
        seriNo: 'HG2024004',
        deviceType: 'kulak_arkasi',
        model: 'AudioMax 75',
        supplierName: 'Ses Teknolojileri Ltd.',
        manufacturerName: 'ReSound',
        possession: 'center',
        lastMovementDate: '2024-01-22T16:20:00Z',
        status: 'success',
        patientId: undefined,
        eReceiptId: undefined,
        notes: 'Stokta bekliyor',
        createdAt: '2024-01-22T16:20:00Z',
        updatedAt: '2024-01-22T16:20:00Z'
    },
    {
        id: 'uts_005',
        barkod: '8690123456793',
        seriNo: 'HG2024005',
        deviceType: 'kanal_ici',
        model: 'MiniSound Pro',
        supplierName: 'Akustik Çözümler A.Ş.',
        manufacturerName: 'Widex',
        possession: 'supplier',
        lastMovementDate: '2024-01-18T08:30:00Z',
        status: 'pending',
        patientId: undefined,
        eReceiptId: undefined,
        notes: 'Tedarikçi deposunda',
        createdAt: '2024-01-18T08:30:00Z',
        updatedAt: '2024-01-18T08:30:00Z'
    }
];
// Consumer delivery notifications data
export const initialConsumerNotificationData = [
    {
        id: 'notification_001',
        eReceiptId: 'er_1',
        patientId: 'p3',
        deviceBarkod: '8690123456791',
        deviceSeriNo: 'HG2024003',
        notificationDate: '2024-01-25T11:45:00Z',
        deliveryDate: '2024-01-25T11:45:00Z',
        deliveredTo: 'Ayşe Kaya',
        deliveryAddress: 'Şişli, İstanbul',
        deliveryStatus: 'completed',
        ubbFirmaKodu: 'UBB001',
        notes: 'Başarıyla teslim edildi',
        isCancelled: false,
        cancelledAt: undefined,
        createdAt: '2024-01-25T11:45:00Z',
        updatedAt: '2024-01-25T11:45:00Z'
    }
];
// UTS service class
export class UTSDataService {
    constructor() {
        this.devicesStorageKey = 'xear_crm_utsDevices';
        this.notificationsStorageKey = 'xear_crm_utsConsumerNotifications';
        this.historyStorageKey = window.STORAGE_KEYS?.CRM_UTSHISTORY || 'xear_crm_utsHistory';
    }
    // Initialize with legacy data if needed
    initialize() {
        const existingDevices = this.getAllDevices();
        if (existingDevices.length === 0) {
            localStorage.setItem(this.devicesStorageKey, JSON.stringify(initialUTSDeviceData));
            console.log(`✅ Initialized UTS devices storage with ${initialUTSDeviceData.length} devices`);
        }
        const existingNotifications = this.getAllNotifications();
        if (existingNotifications.length === 0) {
            localStorage.setItem(this.notificationsStorageKey, JSON.stringify(initialConsumerNotificationData));
            console.log(`✅ Initialized UTS notifications storage with ${initialConsumerNotificationData.length} notifications`);
        }
    }
    // Device management
    getAllDevices() {
        try {
            const stored = localStorage.getItem(this.devicesStorageKey);
            return stored ? JSON.parse(stored) : [];
        }
        catch {
            return [];
        }
    }
    getDeviceByBarkod(barkod) {
        const devices = this.getAllDevices();
        return devices.find(d => d.barkod === barkod) || null;
    }
    getDevicesBySeriNo(seriNo) {
        const devices = this.getAllDevices();
        return devices.filter(d => d.seriNo === seriNo);
    }
    getDevicesByPossession(possession) {
        const devices = this.getAllDevices();
        return devices.filter(d => d.possession === possession);
    }
    getDevicesByPatient(patientId) {
        const devices = this.getAllDevices();
        return devices.filter(d => d.patientId === patientId);
    }
    updateDevicePossession(barkod, newPossession, notes) {
        try {
            const devices = this.getAllDevices();
            const deviceIndex = devices.findIndex(d => d.barkod === barkod);
            if (deviceIndex === -1) {
                return { success: false, error: 'Device not found' };
            }
            const device = devices[deviceIndex];
            const oldPossession = device.possession;
            device.possession = newPossession;
            device.lastMovementDate = new Date().toISOString();
            device.updatedAt = new Date().toISOString();
            if (notes)
                device.notes = notes;
            localStorage.setItem(this.devicesStorageKey, JSON.stringify(devices));
            // Log to history
            this.addToHistory({
                id: `hist_${Date.now()}`,
                barkod: barkod,
                seriNo: device.seriNo,
                type: 'alma',
                from: oldPossession,
                to: newPossession,
                date: new Date().toISOString(),
                status: 'success',
                notes: notes,
                createdAt: new Date().toISOString()
            });
            return { success: true, device };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
        }
    }
    saveDevice(device) {
        try {
            const devices = this.getAllDevices();
            const existingIndex = devices.findIndex(d => d.id === device.id);
            device.updatedAt = new Date().toISOString();
            if (existingIndex >= 0) {
                devices[existingIndex] = device;
            }
            else {
                devices.push(device);
            }
            localStorage.setItem(this.devicesStorageKey, JSON.stringify(devices));
            return { success: true, data: device };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Save failed' };
        }
    }
    // Consumer notifications management
    getAllNotifications() {
        try {
            const stored = localStorage.getItem(this.notificationsStorageKey);
            return stored ? JSON.parse(stored) : [];
        }
        catch {
            return [];
        }
    }
    getNotificationsByPatient(patientId) {
        const notifications = this.getAllNotifications();
        return notifications.filter(n => n.patientId === patientId);
    }
    createConsumerDelivery(data) {
        try {
            const notifications = this.getAllNotifications();
            const notification = {
                id: `notification_${Date.now()}`,
                eReceiptId: data.eReceiptId,
                patientId: data.patientId,
                deviceBarkod: data.deviceBarkod,
                deviceSeriNo: data.deviceSeriNo,
                notificationDate: new Date().toISOString(),
                deliveryDate: new Date().toISOString(),
                deliveredTo: data.deliveredTo,
                deliveryAddress: data.deliveryAddress,
                deliveryStatus: 'completed',
                ubbFirmaKodu: data.ubbFirmaKodu,
                notes: data.notes,
                isCancelled: false,
                cancelledAt: undefined,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            notifications.push(notification);
            localStorage.setItem(this.notificationsStorageKey, JSON.stringify(notifications));
            // Update device possession to consumer
            this.updateDevicePossession(data.deviceBarkod, 'consumer', `Teslim edildi: ${data.deliveredTo}`);
            return { success: true, notification };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Delivery creation failed' };
        }
    }
    // History management
    addToHistory(movement) {
        try {
            const history = JSON.parse(localStorage.getItem(this.historyStorageKey) || '[]');
            history.push(movement);
            // Keep only last 1000 entries
            if (history.length > 1000) {
                history.splice(0, history.length - 1000);
            }
            localStorage.setItem(this.historyStorageKey, JSON.stringify(history));
        }
        catch (error) {
            console.error('Failed to add to UTS history:', error);
        }
    }
    getHistory(limit = 100) {
        try {
            const history = JSON.parse(localStorage.getItem(this.historyStorageKey) || '[]');
            return history.slice(-limit).reverse(); // Most recent first
        }
        catch {
            return [];
        }
    }
    // Bulk operations
    performBulkAlmaOperation(devices) {
        const results = [];
        for (const deviceData of devices) {
            const result = this.updateDevicePossession(deviceData.barkod, 'center', deviceData.notes);
            results.push({
                barkod: deviceData.barkod,
                seriNo: deviceData.seriNo,
                success: result.success,
                error: result.error
            });
        }
        const successCount = results.filter(r => r.success).length;
        return {
            success: successCount > 0,
            results
        };
    }
    // Search and filters
    searchDevices(query) {
        const devices = this.getAllDevices();
        const searchTerm = query.toLowerCase();
        return devices.filter(d => d.barkod.includes(searchTerm) ||
            d.seriNo.toLowerCase().includes(searchTerm) ||
            (d.model && d.model.toLowerCase().includes(searchTerm)) ||
            (d.supplierName && d.supplierName.toLowerCase().includes(searchTerm)) ||
            (d.manufacturerName && d.manufacturerName.toLowerCase().includes(searchTerm)));
    }
}
// Singleton instance
export const utsDataService = new UTSDataService();
// Legacy compatibility
window.sampleUTSDevices = initialUTSDeviceData;
window.sampleConsumerDeliveryNotifications = initialConsumerNotificationData;
window.UTSDataService = UTSDataService;
window.utsDataService = utsDataService;
// Legacy function compatibility
window.getUTSDevices = () => utsDataService.getAllDevices();
window.saveUTSDevices = (devices) => {
    localStorage.setItem('xear_crm_utsDevices', JSON.stringify(devices));
};
window.performAlmaOperation = (barkod, _seriNo) => {
    return utsDataService.updateDevicePossession(barkod, 'center', 'Alma işlemi gerçekleştirildi');
};
window.getConsumerDeliveryNotifications = () => utsDataService.getAllNotifications();
window.addConsumerDeliveryNotification = (notification) => {
    const notifications = utsDataService.getAllNotifications();
    notifications.push(notification);
    localStorage.setItem('xear_crm_utsConsumerNotifications', JSON.stringify(notifications));
};
// Initialize on load
utsDataService.initialize();
console.log('✅ UTS Data Service loaded with full legacy compatibility');
