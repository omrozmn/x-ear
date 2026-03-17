/**
 * Patient Details Tab Loader - Dynamic loading system for patient detail tabs
 * This system loads tab content from separate HTML files and their associated JavaScript
 */

class PatientDetailsTabLoader {
    constructor() {
        this.loadedTabs = new Map();
        this.contentCache = new Map();
        this.basePath = 'patient-details-tabs/';
        this.jsBasePath = 'assets/js/patient-details-tabs/';
        this.loadingIndicators = new Map();
    }

    /**
     * Load tab content from external file
     * @param {string} tabId - The tab identifier (e.g., 'general', 'documents')
     * @returns {Promise<string>} The HTML content of the tab
     */
    async loadTabContent(tabId) {
        console.log(`� Loading tab '${tabId}' content`);
        
        try {
            // Use inline content generation instead of external files
            const content = this.generateInlineContent(tabId);
            return content;
            
        } catch (error) {
            console.error(`❌ Error loading tab ${tabId}:`, error);
            return this.getFallbackContent(tabId);
        }
    }

    /**
     * Generate inline content for tabs instead of loading from files
     * @param {string} tabId - The tab identifier
     * @returns {string} Generated HTML content for the tab
     */
    generateInlineContent(tabId) {
        console.log(`🎨 Generating inline content for tab: ${tabId}`);
        
        const tabTemplates = {
            general: `
                <div class="space-y-6">
                    <!-- Hasta Notları Card -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-semibold text-gray-900">Hasta Notları</h3>
                            <button onclick="addNewNote()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors">
                                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Not Ekle
                            </button>
                        </div>
                        <div id="quickNotes">
                            <!-- Notes will be loaded here -->
                            <div class="text-center py-8 text-gray-500">
                                Notlar yükleniyor...
                            </div>
                        </div>
                    </div>

                    <!-- Quick Action Buttons -->
                    <div class="flex space-x-4 mb-6">
                        <button onclick="addAppointment('${window.currentPatientId || ''}')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            Yeni Randevu
                        </button>
                        <button onclick="createSale()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                            </svg>
                            Yeni Satış
                        </button>
                    </div>
                </div>
            `,
            documents: `
                <div class="space-y-6">
                    <!-- Upload Section -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-gray-900">Belge Yönetimi</h3>
                            <button onclick="uploadDocument()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                </svg>
                                Belge Yükle
                            </button>
                        </div>
                        
                        <!-- Quick Actions -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <button onclick="uploadSpecificDocument('sgk_report')" class="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                <div class="flex items-center">
                                    <svg class="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <div>
                                        <h4 class="font-medium text-gray-900">SGK Raporu</h4>
                                        <p class="text-sm text-gray-500">Sağlık kurulu raporu yükle</p>
                                    </div>
                                </div>
                            </button>
                            <button onclick="uploadSpecificDocument('hearing_test')" class="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                <div class="flex items-center">
                                    <svg class="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                                    </svg>
                                    <div>
                                        <h4 class="font-medium text-gray-900">İşitme Testi</h4>
                                        <p class="text-sm text-gray-500">Odyogram sonucu yükle</p>
                                    </div>
                                </div>
                            </button>
                            <button onclick="uploadSpecificDocument('prescription')" class="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                <div class="flex items-center">
                                    <svg class="w-8 h-8 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                    <div>
                                        <h4 class="font-medium text-gray-900">Reçete</h4>
                                        <p class="text-sm text-gray-500">Doktor reçetesi yükle</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Documents List -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Yüklenen Belgeler</h3>
                        <div id="documents-list">
                            <div class="text-center py-8 text-gray-500">
                                Belgeler yükleniyor...
                            </div>
                        </div>
                    </div>
                    
                    <!-- E-Receipt Integration Notice -->
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div class="flex items-start">
                            <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <div>
                                <h4 class="text-blue-800 font-medium">E-reçete ve SGK İşlemleri</h4>
                                <p class="text-blue-700 text-sm mt-1">E-reçete sorgulama ve SGK rapor işlemleri için <strong>SGK</strong> sekmesini kullanın.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            timeline: `
                <div class="space-y-6">
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Zaman Çizelgesi</h3>
                        <div id="timelineTabContent">
                            <div class="text-center py-8 text-gray-500">
                                Zaman çizelgesi yükleniyor...
                            </div>
                        </div>
                    </div>
                </div>
            `,
            sales: `
                <div class="space-y-6">
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-gray-900">Satış Bilgileri</h3>
                            <button onclick="createSale()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Yeni Satış
                            </button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div class="bg-blue-50 p-4 rounded-lg">
                                <h4 class="text-sm font-medium text-blue-800">Toplam Satış</h4>
                                <p class="text-2xl font-bold text-blue-900" id="totalSalesAmount">₺0.00</p>
                            </div>
                            <div class="bg-green-50 p-4 rounded-lg">
                                <h4 class="text-sm font-medium text-green-800">Bu Ay</h4>
                                <p class="text-2xl font-bold text-green-900" id="monthlySalesAmount">₺0.00</p>
                            </div>
                            <div class="bg-purple-50 p-4 rounded-lg">
                                <h4 class="text-sm font-medium text-purple-800">Toplam Adet</h4>
                                <p class="text-2xl font-bold text-purple-900" id="totalSalesCount">0</p>
                            </div>
                        </div>
                        <div id="noSalesMessage" class="text-center py-8 text-gray-500" style="display: none;">
                            Henüz satış kaydı bulunmamaktadır.
                        </div>
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hasta Durumu</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Birim Fiyat</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vergi</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peşinat</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kalan</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody id="salesTableBody" class="bg-white divide-y divide-gray-200">
                                <tr><td colspan="11" class="text-center py-8 text-gray-500">Satış bilgileri yükleniyor...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `,
            appointments: `
                <div class="space-y-6">
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Randevular</h3>
                        <div id="appointments-content">
                            <div class="text-center py-8 text-gray-500">
                                Randevular yükleniyor...
                            </div>
                        </div>
                    </div>
                </div>
            `,
            devices: `
                <div class="space-y-6">
                    <!-- Cihaz Ata Form -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-lg font-semibold text-gray-900">Cihaz Ata</h3>
                            <button onclick="openDeviceAssignmentModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Cihaz Ata
                            </button>
                        </div>
                        
                        <!-- Device Assignment Form -->
                        <div id="deviceAssignmentForm" class="hidden">
                            <!-- Assignment Reason Dropdown -->
                            <div class="mb-6">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Cihaz Atama Nedeni</label>
                                <select id="assignmentReason" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="">Seçiniz...</option>
                                    <option value="satın_alma">Satın Alma</option>
                                    <option value="hizmet_sunma">Hizmet Sunma</option>
                                    <option value="yeni_deneme">Yeni Deneme</option>
                                    <option value="emanet_cihaz">Emanet Cihaz</option>
                                </select>
                            </div>
                            
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <!-- Left Ear Section (Red - Right Ear) -->
                                <div class="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                                    <div class="flex items-center mb-4">
                                        <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"/>
                                            </svg>
                                        </div>
                                        <h4 class="text-lg font-semibold text-red-900">Sağ Kulak</h4>
                                    </div>
                                    
                                    <div class="space-y-4">
                                        <div>
                                            <label class="block text-sm font-medium text-red-800 mb-2">Marka</label>
                                            <input type="text" id="rightBrand" class="w-full border border-red-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-red-800 mb-2">Model</label>
                                            <input type="text" id="rightModel" class="w-full border border-red-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-red-800 mb-2">Seri No</label>
                                            <input type="text" id="rightSerial" class="w-full border border-red-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Right Ear Section (Blue - Left Ear) -->
                                <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                                    <div class="flex items-center mb-4">
                                        <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"/>
                                            </svg>
                                        </div>
                                        <h4 class="text-lg font-semibold text-blue-900">Sol Kulak</h4>
                                    </div>
                                    
                                    <div class="space-y-4">
                                        <div>
                                            <label class="block text-sm font-medium text-blue-800 mb-2">Marka</label>
                                            <input type="text" id="leftBrand" class="w-full border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-blue-800 mb-2">Model</label>
                                            <input type="text" id="leftModel" class="w-full border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-blue-800 mb-2">Seri No</label>
                                            <input type="text" id="leftSerial" class="w-full border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Enhanced Inventory Selection -->
                            <div class="mt-6 border-t border-gray-200 pt-6">
                                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                    <div class="flex items-center justify-between mb-4">
                                        <div class="flex items-center space-x-3">
                                            <div class="flex-shrink-0">
                                                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <h4 class="text-sm font-semibold text-blue-900">Envanterden Cihaz Seçimi</h4>
                                                <p class="text-xs text-blue-700">Mevcut envanterinizden hazır cihaz seçebilirsiniz</p>
                                            </div>
                                        </div>
                                        <label class="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" id="useInventory" class="sr-only peer">
                                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            <span class="ml-3 text-sm font-medium text-gray-900">Envanter Kullan</span>
                                        </label>
                                    </div>
                                    
                                    <!-- Inventory Selection Panel -->
                                    <div id="inventorySelectionPanel" class="hidden space-y-4">
                                        <!-- Search and Filter -->
                                        <div class="bg-white rounded-lg border border-gray-200 p-4">
                                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                <div>
                                                    <label class="block text-xs font-medium text-gray-700 mb-1">Marka Ara</label>
                                                    <input type="text" id="inventoryBrandFilter" placeholder="Marka..." 
                                                           class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-medium text-gray-700 mb-1">Model Ara</label>
                                                    <input type="text" id="inventoryModelFilter" placeholder="Model..." 
                                                           class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-medium text-gray-700 mb-1">Kulak</label>
                                                    <select id="inventoryEarFilter" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                                        <option value="">Tümü</option>
                                                        <option value="left">Sol Kulak</option>
                                                        <option value="right">Sağ Kulak</option>
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            <!-- Inventory Devices Grid -->
                                            <div id="inventoryDevicesGrid" class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                                                <!-- Loading state -->
                                                <div id="inventoryLoading" class="col-span-full flex items-center justify-center py-8">
                                                    <div class="flex items-center space-x-3">
                                                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                        <span class="text-sm text-gray-600">Envanter yükleniyor...</span>
                                                    </div>
                                                </div>
                                                
                                                <!-- No devices found -->
                                                <div id="inventoryEmpty" class="col-span-full hidden text-center py-8">
                                                    <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                                                    </svg>
                                                    <p class="text-sm text-gray-500">Envanterde uygun cihaz bulunamadı</p>
                                                    <p class="text-xs text-gray-400 mt-1">Filtreleri değiştirerek tekrar deneyin</p>
                                                </div>
                                            </div>
                                            
                                            <!-- Selected Device Info -->
                                            <div id="selectedInventoryDevice" class="hidden mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <div class="flex items-center space-x-2">
                                                    <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                    </svg>
                                                    <div class="flex-1">
                                                        <p class="text-sm font-medium text-green-900" id="selectedDeviceName">Seçilen Cihaz</p>
                                                        <p class="text-xs text-green-700" id="selectedDeviceDetails">Detaylar otomatik doldurulacak</p>
                                                    </div>
                                                    <button onclick="clearInventorySelection()" class="text-xs text-green-600 hover:text-green-800 font-medium">
                                                        Değiştir
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Manual Entry Toggle -->
                                        <div class="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                            <div class="flex items-center space-x-2">
                                                <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                                                </svg>
                                                <div>
                                                    <p class="text-sm font-medium text-amber-900">Manuel Giriş</p>
                                                    <p class="text-xs text-amber-700">Envanterde yoksa manuel olarak girin</p>
                                                </div>
                                            </div>
                                            <button onclick="toggleManualEntry()" id="manualEntryBtn" 
                                                    class="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors">
                                                Manuel Gir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Form Actions -->
                            <div class="mt-6 flex justify-end space-x-3">
                                <button onclick="cancelDeviceAssignment()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                                    İptal
                                </button>
                                <button onclick="saveDeviceAssignment()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Emanet Cihazlar Section -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-lg font-semibold text-gray-900">Emanet Cihazlar</h3>
                            <button onclick="openDepositedDeviceModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                </svg>
                                Emanet Cihaz Ekle
                            </button>
                        </div>
                        
                        <!-- Deposited Devices List -->
                        <div id="depositedDevicesList" class="space-y-4">
                            <div class="text-center py-8 text-gray-500">
                                Emanet cihaz bulunmamaktadır.
                            </div>
                        </div>
                        
                        <!-- Deposited Device Form (Hidden by default) -->
                        <div id="depositedDeviceForm" class="hidden mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h4 class="text-lg font-semibold text-green-900 mb-4">Yeni Emanet Cihaz</h4>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label class="block text-sm font-medium text-green-800 mb-2">Cihaz Türü</label>
                                    <select id="depositedDeviceType" class="w-full border border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                        <option value="">Seçiniz...</option>
                                        <option value="hearing_aid">İşitme Cihazı</option>
                                        <option value="accessory">Aksesuar</option>
                                        <option value="battery">Pil</option>
                                        <option value="other">Diğer</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-green-800 mb-2">Emanet Nedeni</label>
                                    <select id="depositedReason" class="w-full border border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                        <option value="">Seçiniz...</option>
                                        <option value="repair">Tamir</option>
                                        <option value="maintenance">Bakım</option>
                                        <option value="upgrade">Yükseltme</option>
                                        <option value="trial">Deneme</option>
                                        <option value="other">Diğer</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label class="block text-sm font-medium text-green-800 mb-2">Marka</label>
                                    <input type="text" id="depositedBrand" class="w-full border border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-green-800 mb-2">Model</label>
                                    <input type="text" id="depositedModel" class="w-full border border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-green-800 mb-2">Seri No</label>
                                    <input type="text" id="depositedSerial" class="w-full border border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                </div>
                            </div>
                            
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-green-800 mb-2">Notlar</label>
                                <textarea id="depositedNotes" rows="3" class="w-full border border-green-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500" placeholder="Emanet cihaz hakkında notlar..."></textarea>
                            </div>
                            
                            <div class="flex justify-end space-x-3">
                                <button onclick="cancelDepositedDevice()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                                    İptal
                                </button>
                                <button onclick="saveDepositedDevice()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Atanan Cihazlar Section -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-6">Atanan Cihazlar</h3>
                        
                        <!-- Device Display Layout (Red on left for right ear, Blue on right for left ear) -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Left Side: Red (Right Ear) -->
                            <div class="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                                <div class="flex items-center mb-4">
                                    <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"/>
                                        </svg>
                                    </div>
                                    <h4 class="text-lg font-semibold text-red-900">Sağ Kulak Cihazı</h4>
                                </div>
                                
                                <div id="rightEarDevice" class="space-y-3">
                                    <div class="text-center py-8 text-red-600">
                                        <svg class="w-12 h-12 mx-auto mb-3 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"/>
                                        </svg>
                                        <p class="text-sm">Sağ kulak için atanan cihaz bulunmuyor</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Right Side: Blue (Left Ear) -->
                            <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                                <div class="flex items-center mb-4">
                                    <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"/>
                                        </svg>
                                    </div>
                                    <h4 class="text-lg font-semibold text-blue-900">Sol Kulak Cihazı</h4>
                                </div>
                                
                                <div id="leftEarDevice" class="space-y-3">
                                    <div class="text-center py-8 text-blue-600">
                                        <svg class="w-12 h-12 mx-auto mb-3 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"/>
                                        </svg>
                                        <p class="text-sm">Sol kulak için atanan cihaz bulunmuyor</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Device List -->
                        <div id="assignedDevicesList" class="mt-6 space-y-3">
                            <!-- Assigned devices will be displayed here -->
                        </div>
                    </div>
                    
                    <!-- Device History/Trials Section -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Cihaz Geçmişi</h3>
                        <div id="deviceHistory">
                            <div class="text-center py-8 text-gray-500">
                                Cihaz geçmişi yükleniyor...
                            </div>
                        </div>
                    </div>
                </div>
            `,
            sgk: `
                <div class="space-y-6">
                    <!-- E-reçete ve Rapor Sorgulama -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- E-reçete Sorgulama -->
                        <div class="bg-white rounded-lg border border-gray-200 p-6">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">E-reçete Sorgulama</h3>
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">E-reçete Numarası</label>
                                    <div class="flex space-x-2">
                                        <input type="text" id="eReceiptNo" placeholder="E-reçete numarasını giriniz" 
                                               class="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <button onclick="queryEReceipt()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                            Sorgula
                                        </button>
                                    </div>
                                </div>
                                <div id="eReceiptResult" class="hidden">
                                    <!-- E-receipt results will be displayed here -->
                                </div>
                            </div>
                        </div>

                        <!-- Rapor Sorgulama -->
                        <div class="bg-white rounded-lg border border-gray-200 p-6">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">Rapor Sorgulama</h3>
                            <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-gray-600 mb-2">Hasta TC kimlik numarası ile otomatik sorgulanacak</p>
                                        <p class="text-xs text-gray-500" id="reportQueryTC">TC: Yükleniyor...</p>
                                    </div>
                                    <button onclick="queryPatientReport()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                        Rapor Sorgula
                                    </button>
                                </div>
                                <div id="reportResult" class="hidden">
                                    <!-- Report results will be displayed here -->
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Saved E-receipts Panel -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-gray-900">Kaydedilmiş E-reçeteler</h3>
                            <div class="flex space-x-2">
                                <span class="text-sm text-gray-600" id="savedEReceiptsCount">0 kaydedilmiş e-reçete</span>
                                <button onclick="loadSavedEReceipts()" class="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors">
                                    🔄 Yenile
                                </button>
                                <button onclick="debugPatientData()" class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors">
                                    🔍 Debug
                                </button>
                            </div>
                        </div>
                        <div id="savedEReceipts">
                            <div class="text-center py-8 text-gray-500">
                                Kaydedilmiş e-reçete bulunmamaktadır.
                            </div>
                        </div>
                    </div>

                    <!-- Device Assignment Panel (for Kontrol Hastası) -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6" id="deviceAssignmentPanel">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-gray-900">Cihaz Atama</h3>
                            <button onclick="showDeviceAssignmentModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                </svg>
                                Cihaz Ata
                            </button>
                        </div>
                        <div id="assignedDevices">
                            <div class="text-center py-8 text-gray-500">
                                Atanmış cihaz bulunmamaktadır.
                            </div>
                        </div>
                        
                        <!-- Patient Requirements Check -->
                        <div id="patientRequirementsCheck" class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg hidden">
                            <h4 class="font-medium text-yellow-800 mb-2">Eksik Bilgiler</h4>
                            <p class="text-sm text-yellow-700 mb-3">Cihaz atamak için aşağıdaki bilgilerin dolu olması gerekir:</p>
                            <ul id="missingRequirements" class="list-disc list-inside text-sm text-yellow-700 space-y-1">
                                <!-- Missing requirements will be listed here -->
                            </ul>
                        </div>
                    </div>

                    <!-- SGK Device Rights Information -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">SGK Cihaz Hakları</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <h4 class="font-medium text-blue-900 mb-2">İşitme Cihazı Hakkı</h4>
                                <div class="space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <span class="text-blue-700">Son Yenileme:</span>
                                        <span id="deviceRightLastRenewal" class="font-medium text-blue-900">-</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-blue-700">Geçerlilik Tarihi:</span>
                                        <span id="deviceRightValidity" class="font-medium text-blue-900">-</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-blue-700">Kalan Süre:</span>
                                        <span id="deviceRightRemaining" class="font-medium text-blue-900">-</span>
                                    </div>
                                </div>
                                <button onclick="updateDeviceRight()" class="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    Hakkı Güncelle
                                </button>
                            </div>
                            
                            <div class="p-4 bg-green-50 rounded-lg border border-green-200">
                                <h4 class="font-medium text-green-900 mb-2">Pil Hakkı</h4>
                                <div class="space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <span class="text-green-700">Son Yenileme:</span>
                                        <span id="batteryRightLastRenewal" class="font-medium text-green-900">-</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-green-700">Geçerlilik Tarihi:</span>
                                        <span id="batteryRightValidity" class="font-medium text-green-900">-</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-green-700">Kalan Süre:</span>
                                        <span id="batteryRightRemaining" class="font-medium text-green-900">-</span>
                                    </div>
                                </div>
                                <button onclick="updateBatteryRight()" class="mt-3 w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    Hakkı Güncelle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- E-Receipt Modal -->
                <div id="eReceiptModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
                            <div class="p-6 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-lg font-semibold text-gray-900">E-reçete Detayları</h3>
                                    <button onclick="closeEReceiptModal()" class="text-gray-400 hover:text-gray-600">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="p-6" id="eReceiptModalContent">
                                <!-- Modal content will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Device Assignment Modal -->
                <div id="deviceAssignmentModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg max-w-3xl w-full max-h-screen overflow-y-auto">
                            <div class="p-6 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-lg font-semibold text-gray-900">Cihaz Atama</h3>
                                    <button onclick="closeDeviceAssignmentModal()" class="text-gray-400 hover:text-gray-600">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="p-6" id="deviceAssignmentModalContent">
                                <!-- Modal content will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>
            `
        };
        
        return tabTemplates[tabId] || `
            <div class="space-y-6">
                <div class="bg-white rounded-lg border border-gray-200 p-6">
                    <div class="text-center py-8 text-gray-500">
                        Bu sekme henüz hazır değil.
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Load tab content for the TabNavigationWidget
     * This is the method called by the tab navigation widget
     * @param {string} tabId - The tab identifier
     * @param {Object} currentPatient - Current patient data (optional)
     * @returns {Promise<string>} The HTML content of the tab
     */
    async loadTab(tabId, currentPatient = null) {
        console.log(`🔄 Loading tab '${tabId}' for TabNavigationWidget`);
        
        try {
            // Generate and return the content
            const content = this.generateInlineContent(tabId);
            
            // Cache the content
            this.contentCache.set(tabId, content);
            
            return content;
            
        } catch (error) {
            console.error(`❌ Error loading tab ${tabId}:`, error);
            return this.getFallbackContent(tabId);
        }
    }

    /**
     * Load and execute tab-specific JavaScript
     * @param {string} tabId - The tab identifier
     */
    async loadTabScript(tabId) {
        // Don't load the same script twice
        if (this.loadedTabs.has(tabId)) {
            console.log(`🔄 Tab script '${tabId}' already loaded`);
            return;
        }

        try {
            console.log(`📜 Loading script for tab '${tabId}'`);
            const response = await fetch(`${this.jsBasePath}${tabId}-tab.js`);
            
            if (!response.ok) {
                console.warn(`⚠️ No specific script found for tab ${tabId}`);
                return;
            }
            
            const scriptContent = await response.text();
            
            // Create and execute script
            const script = document.createElement('script');
            script.textContent = scriptContent;
            script.setAttribute('data-tab', tabId);
            document.head.appendChild(script);
            
            this.loadedTabs.set(tabId, true);
            console.log(`✅ Script for tab '${tabId}' loaded successfully`);
            
        } catch (error) {
            console.warn(`⚠️ Could not load script for tab ${tabId}:`, error);
        }
    }

    /**
     * Inject tab content into a container and initialize it
     * @param {string} tabId - The tab identifier
     * @param {string} containerId - The container element ID
     */
    async injectTab(tabId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ Container '${containerId}' not found for tab '${tabId}'`);
            return;
        }

        // Show loading indicator
        this.showLoadingIndicator(container, tabId);

        try {
            // Load content and script in parallel
            const [content] = await Promise.all([
                this.loadTabContent(tabId),
                this.loadTabScript(tabId)
            ]);

            // Inject the content
            container.innerHTML = content;
            
            // Initialize tab-specific functionality
            await this.initializeTab(tabId);
            
            // Hide loading indicator
            this.hideLoadingIndicator(container);
            
            // Trigger tab loaded event
            this.triggerTabLoadedEvent(tabId);
            
            console.log(`🎉 Tab '${tabId}' successfully injected and initialized`);
            
        } catch (error) {
            console.error(`❌ Error injecting tab ${tabId}:`, error);
            container.innerHTML = this.getFallbackContent(tabId);
            this.hideLoadingIndicator(container);
        }
    }

    /**
     * Reload patient data from localStorage to ensure tabs get fresh data
     * This is critical for maintaining data consistency across tab switches
     */
    async reloadPatientDataFromStorage() {
        try {
            console.log('🔄 Reloading patient data from localStorage...');
            
            // Get current patient ID from URL or global state
            const urlParams = new URLSearchParams(window.location.search);
            const currentPatientId = urlParams.get('id') || window.currentPatientId;
            
            if (!currentPatientId) {
                console.warn('⚠️ No patient ID found for reloading data');
                return;
            }
            
            // Load fresh patient data from localStorage using unified storage manager
            let freshPatientData = null;
            
            // Try unified storage manager first
            if (window.XEarStorageManager) {
                freshPatientData = window.XEarStorageManager.get('patients', []).find(p => p.id === currentPatientId);
            }
            
            // Fallback to direct localStorage access for backward compatibility
            if (!freshPatientData) {
                const localPatients = JSON.parse(localStorage.getItem('xear_patients_data') || 
                                               localStorage.getItem('xear_patients') || 
                                               localStorage.getItem(window.STORAGE_KEYS?.X_EAR_PATIENTS || 'x-ear-patients') || '[]');
                freshPatientData = localPatients.find(p => p.id === currentPatientId);
            }
            
            if (freshPatientData) {
                // Update the global patient manager with fresh data
                if (!window.patientDetailsManager) {
                    window.patientDetailsManager = {};
                }
                
                // Preserve any in-memory changes that haven't been saved yet
                const currentPatient = window.patientDetailsManager.currentPatient;
                if (currentPatient && currentPatient.id === currentPatientId) {
                    // Merge fresh data with any unsaved changes
                    const mergedData = { ...freshPatientData, ...currentPatient };
                    
                    // Ensure arrays are properly merged (don't lose e-receipts)
                    if (freshPatientData.ereceiptHistory && currentPatient.ereceiptHistory) {
                        // Combine and deduplicate e-receipts
                        const allReceipts = [
                            ...(freshPatientData.ereceiptHistory || []),
                            ...(currentPatient.ereceiptHistory || [])
                        ];
                        mergedData.ereceiptHistory = allReceipts.filter((receipt, index, self) => 
                            index === self.findIndex(r => r.id === receipt.id)
                        );
                    }
                    
                    window.patientDetailsManager.currentPatient = mergedData;
                } else {
                    // No current patient in memory, use fresh data
                    window.patientDetailsManager.currentPatient = freshPatientData;
                }
                
                console.log('✅ Patient data reloaded from localStorage:', {
                    id: freshPatientData.id,
                    name: freshPatientData.name,
                    ereceiptHistory: freshPatientData.ereceiptHistory?.length || 0,
                    appointments: freshPatientData.appointments?.length || 0,
                    devices: freshPatientData.devices?.length || 0
                });
            } else {
                console.warn('⚠️ Patient not found in localStorage:', currentPatientId);
            }
            
        } catch (error) {
            console.error('❌ Error reloading patient data from localStorage:', error);
        }
    }
    /**
     * Initialize tab-specific functionality after content is loaded
     * @param {string} tabId - The tab identifier
     */
    async initializeTab(tabId) {
        console.log(`🔧 Initializing tab '${tabId}'`);
        
        // CRITICAL FIX: Always reload fresh patient data from localStorage before initializing tabs
        // This ensures tabs get the most current data, not stale cached data
        await this.reloadPatientDataFromStorage();
        
        // Tab-specific initialization
        switch (tabId) {
            case 'general':
                // Load notes for the general tab (personal info is now only in header)
                setTimeout(() => {
                    if (typeof loadQuickNotes === 'function') {
                        loadQuickNotes();
                    }
                }, 500); // Give time for patient data to be loaded
                break;
                
            case 'documents':
                // Initialize document management
                if (typeof loadDocumentsTabData === 'function') {
                    loadDocumentsTabData();
                }
                // Test PDF functionality
                if (typeof testPDFLibrary === 'function') {
                    testPDFLibrary();
                }
                break;
                
            case 'sales':
                // Load sales data
                if (typeof loadSalesData === 'function') {
                    loadSalesData();
                }
                break;
                
            case 'timeline':
                // Wait for DOM to be ready, then load timeline
                setTimeout(() => {
                    if (typeof loadTimeline === 'function') {
                        loadTimeline();
                    }
                }, 100);
                break;
                
            case 'appointments':
                // Wait for DOM to be ready, then load appointments
                setTimeout(() => {
                    if (typeof loadAppointments === 'function') {
                        loadAppointments();
                    }
                }, 100);
                break;
                
            case 'devices':
                // Wait for DOM to be ready, then load devices
                setTimeout(() => {
                    if (typeof loadDevices === 'function') {
                        loadDevices();
                    }
                    // Load device manager for inventory functionality
                    if (!window.deviceManager) {
                        const script = document.createElement('script');
                        script.src = 'assets/js/device-manager.js';
                        script.onload = () => {
                            console.log('✅ Device manager loaded for devices tab');
                        };
                        document.head.appendChild(script);
                    }
                }, 100);
                break;
                
            case 'sgk':
                try {
                    // Wait for DOM to be ready, then initialize SGK components
                    setTimeout(() => {
                        // Update report query TC display
                        const reportQueryTC = document.getElementById('reportQueryTC');
                        if (reportQueryTC && window.patientDetailsManager?.currentPatient) {
                            const patient = window.patientDetailsManager.currentPatient;
                            const tcNumber = patient.tcNumber || patient.tc || 'Bulunamadı';
                            reportQueryTC.textContent = `TC: ${tcNumber}`;
                        }
                        
                        // Load SGK information
                        if (typeof loadSGKInfo === 'function') {
                            loadSGKInfo();
                        }
                        if (typeof renderSGKInfo === 'function') {
                            renderSGKInfo();
                        }
                        // Load patient notes
                        if (typeof loadPatientNotes === 'function') {
                            loadPatientNotes();
                        }
                        // Load saved e-receipts
                        if (typeof loadSavedEReceipts === 'function') {
                            loadSavedEReceipts();
                        }
                        // Load assigned devices
                        if (typeof loadAssignedDevices === 'function') {
                            loadAssignedDevices();
                        }
                        // Check if patient qualifies for device assignment
                        if (typeof checkDeviceAssignmentEligibility === 'function') {
                            checkDeviceAssignmentEligibility();
                        }
                    }, 100);
                } catch (error) {
                    console.error('Error initializing SGK tab:', error);
                    // Continue with partial initialization
                }
                break;
        }
        
        // Dispatch custom initialization event
        document.dispatchEvent(new CustomEvent('tabInitialized', { 
            detail: { tabId } 
        }));
    }

    /**
     * Show loading indicator in container
     * @param {HTMLElement} container - The container element
     * @param {string} tabId - The tab identifier
     */
    showLoadingIndicator(container, tabId) {
        const loadingHtml = `
            <div class="flex items-center justify-center py-12" data-loading="${tabId}">
                <div class="flex items-center space-x-3">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span class="text-gray-600">Yükleniyor...</span>
                </div>
            </div>
        `;
        container.innerHTML = loadingHtml;
        this.loadingIndicators.set(tabId, container);
    }

    /**
     * Hide loading indicator
     * @param {HTMLElement} container - The container element
     */
    hideLoadingIndicator(container) {
        const loadingElement = container.querySelector('[data-loading]');
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    /**
     * Trigger custom event when tab is loaded
     * @param {string} tabId - The tab identifier
     */
    triggerTabLoadedEvent(tabId) {
        document.dispatchEvent(new CustomEvent('tabLoaded', { 
            detail: { tabId, timestamp: Date.now() } 
        }));
    }

    /**
     * Get fallback content when tab loading fails
     * @param {string} tabId - The tab identifier
     * @returns {string} Fallback HTML content
     */
    getFallbackContent(tabId) {
        const tabNames = {
            general: 'Genel Bilgiler',
            documents: 'Belgeler',
            timeline: 'Zaman Çizelgesi',
            sales: 'Satışlar',
            appointments: 'Randevular',
            devices: 'Cihazlar',
            sgk: 'SGK Bilgileri',
            uts: 'ÜTS Kayıtları'
        };
        
        const tabName = tabNames[tabId] || 'Bilinmeyen Tab';
        
        return `
            <div class="flex items-center justify-center py-12">
                <div class="text-center">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">İçerik Yüklenemedi</h3>
                    <p class="text-gray-600 mb-4">${tabName} sekmesi yüklenirken bir hata oluştu.</p>
                    <button onclick="location.reload()" class="btn-primary">
                        Sayfayı Yenile
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Preload tab content for better performance
     * @param {string[]} tabIds - Array of tab IDs to preload
     */
    async preloadTabs(tabIds) {
        console.log('🚀 Preloading tabs:', tabIds);
        
        const promises = tabIds.map(async (tabId) => {
            try {
                await this.loadTabContent(tabId);
                console.log(`✅ Preloaded tab: ${tabId}`);
            } catch (error) {
                console.warn(`⚠️ Failed to preload tab: ${tabId}`, error);
            }
        });
        
        await Promise.allSettled(promises);
        console.log('🎉 Tab preloading completed');
    }

    /**
     * Clear cache for a specific tab or all tabs
     * @param {string} [tabId] - Optional tab ID to clear, if not provided clears all
     */
    clearCache(tabId = null) {
        if (tabId) {
            this.contentCache.delete(tabId);
            this.loadedTabs.delete(tabId);
            console.log(`🗑️ Cache cleared for tab: ${tabId}`);
        } else {
            this.contentCache.clear();
            this.loadedTabs.clear();
            console.log('🗑️ All tab cache cleared');
        }
    }

    /**
     * Refresh the currently active tab with fresh data
     * This should be called after data is saved to ensure UI reflects changes
     */
    async refreshCurrentTab() {
        const activeTab = this.activeTab || 'general';
        console.log(`🔄 Refreshing current tab: ${activeTab}`);
        
        try {
            // Reload fresh patient data
            await this.reloadPatientDataFromStorage();
            
            // Re-initialize the current tab
            await this.initializeTab(activeTab);
            
            console.log(`✅ Current tab refreshed: ${activeTab}`);
        } catch (error) {
            console.error(`❌ Error refreshing current tab: ${activeTab}`, error);
        }
    }
}

// Create global instance
window.patientDetailsTabLoader = new PatientDetailsTabLoader();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatientDetailsTabLoader;
}

console.log('🎯 Patient Details Tab Loader initialized');
