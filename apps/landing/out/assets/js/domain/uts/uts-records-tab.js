// UTS Records Tab Functions for Patient Details
// This file provides functionality for the ÜTS Kayıtları tab

// Load and display UTS records for the current patient
function loadUTSRecordsTab() {
    console.log('🔄 Loading UTS Records tab data...');
    
    try {
        // Initialize UTS Manager
        if (!window.UTSManager) {
            console.error('❌ UTS Manager not found');
            return;
        }
        
        // Load overview statistics
        updateUTSOverviewStats();
        
        // Load device list
        loadUTSDevicesList();
        
        // Load consumer delivery notifications
        loadUTSConsumerNotifications();
        
        console.log('✅ UTS Records tab loaded successfully');
    } catch (error) {
        console.error('❌ Error loading UTS Records tab:', error);
    }
}

// Update UTS overview statistics
function updateUTSOverviewStats() {
    console.log('📊 Updating UTS overview statistics...');
    
    try {
        const utsManager = window.UTSManager;
        
        // Get device counts by status
        const devicesInPossession = utsManager.getDevicesInPossession().length;
        const devicesAwaitingCollection = utsManager.getDevicesAwaitingCollection().length;
        const devicesDelivered = utsManager.getDeliveredDevices().length;
        
        // Update DOM elements
        const possessionElement = document.getElementById('utsDevicesInPossession');
        const awaitingElement = document.getElementById('utsDevicesAwaiting');
        const deliveredElement = document.getElementById('utsDevicesDelivered');
        
        if (possessionElement) possessionElement.textContent = devicesInPossession.toString();
        if (awaitingElement) awaitingElement.textContent = devicesAwaitingCollection.toString();
        if (deliveredElement) deliveredElement.textContent = devicesDelivered.toString();
        
        console.log(`✅ UTS stats updated: ${devicesInPossession} in possession, ${devicesAwaitingCollection} awaiting, ${devicesDelivered} delivered`);
    } catch (error) {
        console.error('❌ Error updating UTS stats:', error);
    }
}

// Load and display UTS devices list
function loadUTSDevicesList(filterStatus = 'all') {
    console.log(`🔄 Loading UTS devices list (filter: ${filterStatus})...`);
    
    try {
        const utsManager = window.UTSManager;
        let devices = utsManager.getAllDevices();
        
        // Apply filter
        if (filterStatus !== 'all') {
            devices = devices.filter(device => device.possessionStatus === filterStatus);
        }
        
        const devicesList = document.getElementById('utsDevicesList');
        if (!devicesList) {
            console.error('❌ UTS devices list container not found');
            return;
        }
        
        if (devices.length === 0) {
            devicesList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    ${filterStatus === 'all' ? 'ÜTS sistemi' : 'Bu filtre'}nde cihaz bulunamadı.
                </div>
            `;
            return;
        }
        
        // Generate devices HTML
        const devicesHtml = devices.map(device => `
            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                            <h4 class="font-medium text-gray-900">${device.model}</h4>
                            <span class="px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(device.possessionStatus)}">
                                ${getStatusText(device.possessionStatus)}
                            </span>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div><strong>Barkod:</strong> ${device.barkod}</div>
                            <div><strong>Seri No:</strong> ${device.seriNo}</div>
                            <div><strong>Üretici:</strong> ${device.manufacturer}</div>
                            <div><strong>Tedarikçi:</strong> ${device.supplier}</div>
                            <div><strong>Son Hareket:</strong> ${device.movementType}</div>
                            <div><strong>Tarih:</strong> ${device.movementDate}</div>
                        </div>
                        
                        ${device.patientId ? `
                            <div class="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                                <div class="text-sm text-blue-800">
                                    <strong>Hasta ID:</strong> ${device.patientId}
                                    ${device.eReceiptId ? `<br><strong>E-Reçete:</strong> ${device.eReceiptId}` : ''}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${device.notes ? `
                            <div class="mt-2 text-sm text-gray-600">
                                <strong>Notlar:</strong> ${device.notes}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="flex flex-col space-y-2 ml-4">
                        ${getDeviceActions(device)}
                    </div>
                </div>
            </div>
        `).join('');
        
        devicesList.innerHTML = devicesHtml;
        
        console.log(`✅ UTS devices list loaded: ${devices.length} devices`);
    } catch (error) {
        console.error('❌ Error loading UTS devices list:', error);
        const devicesList = document.getElementById('utsDevicesList');
        if (devicesList) {
            devicesList.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    Cihaz listesi yüklenirken hata oluştu.
                </div>
            `;
        }
    }
}

// Load and display UTS consumer delivery notifications
function loadUTSConsumerNotifications() {
    console.log('🔄 Loading UTS consumer delivery notifications...');
    
    try {
        const utsManager = window.UTSManager;
        const notifications = utsManager.getConsumerDeliveryNotifications();
        
        // Update notification count
        const countElement = document.getElementById('utsNotificationCount');
        if (countElement) {
            countElement.textContent = `${notifications.length} bildirim`;
        }
        
        const notificationsList = document.getElementById('utsNotificationsList');
        if (!notificationsList) {
            console.error('❌ UTS notifications list container not found');
            return;
        }
        
        if (notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    Tüketiciye verme bildirimi bulunamadı.
                </div>
            `;
            return;
        }
        
        // Generate notifications HTML
        const notificationsHtml = notifications.map(notification => `
            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                            <h4 class="font-medium text-gray-900">Bildirim #${notification.utsReferenceNumber}</h4>
                            <span class="px-2 py-1 text-xs rounded-full font-medium ${getNotificationStatusColor(notification.status)}">
                                ${getNotificationStatusText(notification.status)}
                            </span>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                            <div><strong>Hasta:</strong> ${notification.patientName}</div>
                            <div><strong>TC:</strong> ${notification.patientTC || 'Belirtilmemiş'}</div>
                            <div><strong>E-Reçete:</strong> ${notification.eReceiptId}</div>
                            <div><strong>Teslim Tarihi:</strong> ${notification.deliveryDate}</div>
                            <div><strong>Bildirim Tarihi:</strong> ${notification.notificationDate}</div>
                            <div><strong>Cihaz Sayısı:</strong> ${notification.devices.length}</div>
                        </div>
                        
                        <!-- Devices in notification -->
                        <div class="mb-3">
                            <h5 class="text-sm font-medium text-gray-700 mb-2">Teslim Edilen Cihazlar:</h5>
                            <div class="space-y-1">
                                ${notification.devices.map(device => `
                                    <div class="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                        ${device.model} - Barkod: ${device.barkod} - Seri: ${device.seriNo}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Documents -->
                        <div class="mb-3">
                            <h5 class="text-sm font-medium text-gray-700 mb-2">Belgeler:</h5>
                            <div class="flex flex-wrap gap-2">
                                ${notification.documents.map(doc => `
                                    <button onclick="downloadUTSDocument('${doc.id}', '${doc.url}')" 
                                            class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                            title="${doc.name} (${doc.size})">
                                        📄 ${doc.name}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex flex-col space-y-2 ml-4">
                        <button onclick="viewUTSNotificationDetails('${notification.id}')" 
                                class="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors">
                            Detaylar
                        </button>
                        <button onclick="regenerateUTSNotification('${notification.id}')" 
                                class="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded transition-colors">
                            Yenile
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        notificationsList.innerHTML = notificationsHtml;
        
        console.log(`✅ UTS notifications loaded: ${notifications.length} notifications`);
    } catch (error) {
        console.error('❌ Error loading UTS notifications:', error);
        const notificationsList = document.getElementById('utsNotificationsList');
        if (notificationsList) {
            notificationsList.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    Bildirimler yüklenirken hata oluştu.
                </div>
            `;
        }
    }
}

// Helper function to get status color classes
function getStatusColor(status) {
    switch (status) {
        case 'center':
            return 'bg-green-100 text-green-800';
        case 'supplier':
            return 'bg-yellow-100 text-yellow-800';
        case 'consumer':
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Helper function to get status text
function getStatusText(status) {
    switch (status) {
        case 'center':
            return 'Elimizde';
        case 'supplier':
            return 'Alma Bekliyor';
        case 'consumer':
            return 'Teslim Edilmiş';
        default:
            return 'Bilinmeyen';
    }
}

// Helper function to get notification status color
function getNotificationStatusColor(status) {
    switch (status) {
        case 'completed':
            return 'bg-green-100 text-green-800';
        case 'pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'failed':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Helper function to get notification status text
function getNotificationStatusText(status) {
    switch (status) {
        case 'completed':
            return 'Tamamlandı';
        case 'pending':
            return 'Bekliyor';
        case 'failed':
            return 'Hata';
        default:
            return 'Bilinmeyen';
    }
}

// Helper function to generate device action buttons
function getDeviceActions(device) {
    const actions = [];
    
    switch (device.possessionStatus) {
        case 'supplier':
            // Device is awaiting collection
            actions.push(`
                <button onclick="performAlmaOperationFromList('${device.barkod}', '${device.seriNo}')" 
                        class="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded transition-colors">
                    Alma Yap
                </button>
            `);
            break;
        case 'center':
            // Device is in our possession
            actions.push(`
                <button onclick="viewDeviceDetails('${device.id}')" 
                        class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors">
                    Detaylar
                </button>
            `);
            break;
        case 'consumer':
            // Device is delivered
            actions.push(`
                <button onclick="viewDeliveryDetails('${device.id}')" 
                        class="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded transition-colors">
                    Teslim Detayı
                </button>
            `);
            break;
    }
    
    // Always show details button
    actions.push(`
        <button onclick="showUTSDeviceHistory('${device.id}')" 
                class="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors">
            Geçmiş
        </button>
    `);
    
    return actions.join('');
}

// Filter UTS devices by status
function filterUTSDevices(filterStatus) {
    console.log(`🔍 Filtering UTS devices by: ${filterStatus}`);
    
    // Update filter button states
    const filterButtons = ['utsFilterAll', 'utsFilterCenter', 'utsFilterSupplier', 'utsFilterConsumer'];
    filterButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.className = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-100 text-gray-700 border border-gray-200';
        }
    });
    
    // Activate selected filter
    const activeButtonId = {
        'all': 'utsFilterAll',
        'center': 'utsFilterCenter',
        'supplier': 'utsFilterSupplier',
        'consumer': 'utsFilterConsumer'
    }[filterStatus];
    
    const activeButton = document.getElementById(activeButtonId);
    if (activeButton) {
        activeButton.className = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-100 text-blue-800 border border-blue-200';
    }
    
    // Reload devices list with filter
    loadUTSDevicesList(filterStatus);
}

// Perform bulk Alma operation for all awaiting devices
function performBulkAlmaOperation() {
    console.log('🔄 Starting bulk Alma operation...');
    
    const utsManager = window.UTSManager;
    const awaitingDevices = utsManager.getDevicesAwaitingCollection();
    
    if (awaitingDevices.length === 0) {
        Utils.showToast('Alma bekleyen cihaz bulunamadı', 'info');
        return;
    }
    
    const confirmMessage = `${awaitingDevices.length} adet alma bekleyen cihaz için toplu alma işlemi yapılacak. Devam edilsin mi?`;
    
    if (confirm(confirmMessage)) {
        let successCount = 0;
        let errorCount = 0;
        
        awaitingDevices.forEach(device => {
            const result = utsManager.performAlmaOperation(device.barkod, device.seriNo);
            if (result.success) {
                successCount++;
            } else {
                errorCount++;
                console.error(`❌ Alma failed for ${device.barkod}:`, result.message);
            }
        });
        
        if (successCount > 0) {
            Utils.showToast(`${successCount} cihaz için alma işlemi tamamlandı`, 'success');
            refreshUTSData();
        }
        
        if (errorCount > 0) {
            Utils.showToast(`${errorCount} cihaz için alma işlemi başarısız`, 'error');
        }
    }
}

// Perform Alma operation for a specific device from the list
function performAlmaOperationFromList(barkod, seriNo) {
    console.log(`🔄 Performing Alma operation for: ${barkod} - ${seriNo}`);
    
    const utsManager = window.UTSManager;
    const result = utsManager.performAlmaOperation(barkod, seriNo);
    
    if (result.success) {
        Utils.showToast(`Alma işlemi tamamlandı: ${barkod}`, 'success');
        refreshUTSData();
    } else {
        Utils.showToast(`Alma işlemi başarısız: ${result.message}`, 'error');
    }
}

// Refresh all UTS data
function refreshUTSData() {
    console.log('🔄 Refreshing UTS data...');
    
    try {
        updateUTSOverviewStats();
        loadUTSDevicesList();
        loadUTSConsumerNotifications();
        
        Utils.showToast('ÜTS verileri yenilendi', 'success');
    } catch (error) {
        console.error('❌ Error refreshing UTS data:', error);
        Utils.showToast('ÜTS verileri yenilenirken hata oluştu', 'error');
    }
}

// Generate missing consumer delivery notifications
function generateMissingNotifications() {
    console.log('🔄 Generating missing consumer delivery notifications...');
    
    const utsManager = window.UTSManager;
    const deliveredDevices = utsManager.getDeliveredDevices();
    const existingNotifications = utsManager.getConsumerDeliveryNotifications();
    
    // Find devices that are delivered but don't have notifications
    const missingNotifications = deliveredDevices.filter(device => {
        return !existingNotifications.some(notification => 
            notification.devices.some(notifDevice => 
                notifDevice.barkod === device.barkod && notifDevice.seriNo === device.seriNo
            )
        );
    });
    
    if (missingNotifications.length === 0) {
        Utils.showToast('Eksik bildirim bulunamadı', 'info');
        return;
    }
    
    console.log(`📋 Found ${missingNotifications.length} devices needing notifications`);
    
    let generatedCount = 0;
    
    missingNotifications.forEach(async device => {
        try {
            const notification = await utsManager.generateConsumerDeliveryNotification(
                device, 
                device.patientId, 
                device.eReceiptId,
                {
                    patientName: `Hasta ${device.patientId}`,
                    deliveryDate: device.movementDate
                }
            );
            
            if (notification) {
                generatedCount++;
            }
        } catch (error) {
            console.error(`❌ Failed to generate notification for ${device.barkod}:`, error);
        }
    });
    
    setTimeout(() => {
        if (generatedCount > 0) {
            Utils.showToast(`${generatedCount} eksik bildirim oluşturuldu`, 'success');
            loadUTSConsumerNotifications();
        }
    }, 1000);
}

// Download UTS document
function downloadUTSDocument(docId, docUrl) {
    console.log(`📄 Downloading UTS document: ${docId}`);
    
    // Create a temporary link and click it (simulates download)
    const link = document.createElement('a');
    link.href = docUrl;
    link.download = docUrl.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    Utils.showToast('Belge indirme başlatıldı', 'info');
}

// View UTS notification details
function viewUTSNotificationDetails(notificationId) {
    console.log(`📋 Viewing UTS notification details: ${notificationId}`);
    
    const utsManager = window.UTSManager;
    const notifications = utsManager.getConsumerDeliveryNotifications();
    const notification = notifications.find(n => n.id === notificationId);
    
    if (!notification) {
        Utils.showToast('Bildirim bulunamadı', 'error');
        return;
    }
    
    Utils.showModal({
        title: `Tüketiciye Verme Bildirimi - ${notification.utsReferenceNumber}`,
        content: `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div><strong>Hasta:</strong> ${notification.patientName}</div>
                    <div><strong>TC:</strong> ${notification.patientTC || 'Belirtilmemiş'}</div>
                    <div><strong>E-Reçete:</strong> ${notification.eReceiptId}</div>
                    <div><strong>Teslim Tarihi:</strong> ${notification.deliveryDate}</div>
                    <div><strong>Bildirim Tarihi:</strong> ${notification.notificationDate}</div>
                    <div><strong>Durum:</strong> ${getNotificationStatusText(notification.status)}</div>
                </div>
                
                <div>
                    <h4 class="font-medium mb-2">Teslim Edilen Cihazlar:</h4>
                    <div class="space-y-2 max-h-40 overflow-y-auto">
                        ${notification.devices.map(device => `
                            <div class="border p-2 rounded bg-gray-50">
                                <div><strong>Model:</strong> ${device.model}</div>
                                <div><strong>Barkod:</strong> ${device.barkod}</div>
                                <div><strong>Seri No:</strong> ${device.seriNo}</div>
                                <div><strong>Üretici:</strong> ${device.manufacturer}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <h4 class="font-medium mb-2">Belgeler:</h4>
                    <div class="space-y-2">
                        ${notification.documents.map(doc => `
                            <div class="flex justify-between items-center border p-2 rounded">
                                <div>
                                    <div class="font-medium">${doc.name}</div>
                                    <div class="text-sm text-gray-600">Boyut: ${doc.size}</div>
                                </div>
                                <button onclick="downloadUTSDocument('${doc.id}', '${doc.url}')" 
                                        class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors">
                                    İndir
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `,
        primaryButton: {
            text: 'Kapat',
            onClick: () => {}
        }
    });
}

// Regenerate UTS notification
function regenerateUTSNotification(notificationId) {
    console.log(`🔄 Regenerating UTS notification: ${notificationId}`);
    
    if (confirm('Bu bildirim yeniden oluşturulacak. Devam edilsin mi?')) {
        // This would trigger the regeneration process
        Utils.showToast('Bildirim yenileme işlemi başlatıldı', 'info');
        
        // Simulate regeneration delay
        setTimeout(() => {
            Utils.showToast('Bildirim başarıyla yenilendi', 'success');
            loadUTSConsumerNotifications();
        }, 2000);
    }
}

// Fallback initialization if main function is not available
function initializeUTSTabFallback() {
    console.log('🔧 Initializing UTS tab with fallback method...');
    
    // Basic initialization without full functionality
    document.getElementById('utsDevicesInPossession').textContent = '0';
    document.getElementById('utsDevicesAwaiting').textContent = '0';
    document.getElementById('utsDevicesDelivered').textContent = '0';
    document.getElementById('utsNotificationCount').textContent = '0 bildirim';
    
    document.getElementById('utsDevicesList').innerHTML = `
        <div class="text-center py-8 text-gray-500">
            ÜTS Manager bulunamadı. Lütfen sistem yöneticisi ile iletişime geçin.
        </div>
    `;
    
    document.getElementById('utsNotificationsList').innerHTML = `
        <div class="text-center py-8 text-gray-500">
            ÜTS Manager bulunamadı. Lütfen sistem yöneticisi ile iletişime geçin.
        </div>
    `;
}

// Make functions globally available
window.loadUTSRecordsTab = loadUTSRecordsTab;
window.updateUTSOverviewStats = updateUTSOverviewStats;
window.loadUTSDevicesList = loadUTSDevicesList;
window.loadUTSConsumerNotifications = loadUTSConsumerNotifications;
window.filterUTSDevices = filterUTSDevices;
window.performBulkAlmaOperation = performBulkAlmaOperation;
window.performAlmaOperationFromList = performAlmaOperationFromList;
window.refreshUTSData = refreshUTSData;
window.generateMissingNotifications = generateMissingNotifications;
window.downloadUTSDocument = downloadUTSDocument;
window.viewUTSNotificationDetails = viewUTSNotificationDetails;
window.regenerateUTSNotification = regenerateUTSNotification;
window.initializeUTSTabFallback = initializeUTSTabFallback;

console.log('✅ UTS Records Tab functions loaded');
