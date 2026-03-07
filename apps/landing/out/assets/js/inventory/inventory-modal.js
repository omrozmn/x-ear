// Inventory Modal Management Module
class InventoryModal {
    constructor() {
        this.serialNumbers = [];
        this.setupEventListeners();
    }

    initializeBrandAutocomplete() {
        const brandInput = document.getElementById('itemBrand');
        if (brandInput && window.CategoryBrandAutocomplete) {
            this.brandAutocomplete = new window.CategoryBrandAutocomplete(brandInput, 'brand', {
                placeholder: 'Marka ara veya ekle...',
                noResultsText: 'Sonuç bulunamadı',
                addNewText: 'Yeni marka ekle'
            });
            this.brandAutocomplete.init();
        }
    }

    initializeCategoryAutocomplete() {
        const categoryInput = document.getElementById('itemCategory');
        if (categoryInput && window.CategoryBrandAutocomplete) {
            this.categoryAutocomplete = new window.CategoryBrandAutocomplete(categoryInput, 'category', {
                placeholder: 'Kategori ara veya ekle...',
                noResultsText: 'Sonuç bulunamadı',
                addNewText: 'Yeni kategori ekle'
            });
            this.categoryAutocomplete.init();
        }
    }

    showLoadingState(message = 'İşlem yapılıyor...') {
        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center';
        loadingOverlay.innerHTML = `
            <div class="bg-white rounded-lg p-6 flex items-center space-x-3">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span class="text-gray-700 font-medium">${message}</span>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }

    hideLoadingState() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    createAddItemModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('addItemModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create new modal
        const modal = document.createElement('div');
        modal.id = 'addItemModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden overflow-y-auto';
        modal.innerHTML = this.getAddItemModalHTML();

        document.body.appendChild(modal);
        
        // Note: Event listeners are set up in setupEventListeners() method
        // called from openAddModal() to avoid duplicate listeners
    }

    getAddItemModalHTML() {
        return `
            <div class="flex items-start justify-center min-h-screen p-4 py-8">
                <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full my-8">
                    <!-- Modal Header -->
                    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                    <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Yeni Ürün Ekle</h3>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Stok sistemine yeni ürün ekleyin</p>
                                </div>
                            </div>
                            <button onclick="window.closeAddItemModal()" class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Modal Body -->
                    <div class="p-4">
                        <form id="addItemForm" class="space-y-4">
                            <!-- Temel Bilgiler -->
                            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                <h4 class="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                                    <svg class="w-4 h-4 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd"/>
                                    </svg>
                                    Temel Bilgiler
                                </h4>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label for="itemName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Ürün Adı <span class="text-red-500">*</span>
                                        </label>
                                        <input type="text" id="itemName" name="name" required 
                                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                               placeholder="Örn: Phonak Audéo Paradise P90">
                                    </div>
                                    <div>
                                        <label for="itemBrand" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Marka <span class="text-red-500">*</span>
                                        </label>
                                        <input type="text" id="itemBrand" name="brand" required 
                                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                               placeholder="Marka adını yazın...">
                                    </div>
                                    <div>
                                        <label for="itemModel" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
                                        <input type="text" id="itemModel" name="model" 
                                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                               placeholder="Örn: Paradise P90-R">
                                    </div>
                                    <div>
                                        <label for="itemCategory" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Kategori <span class="text-red-500">*</span>
                                        </label>
                                        <input type="text" id="itemCategory" name="category" required 
                                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                               placeholder="Kategori adını yazın...">
                                    </div>
                                </div>
                            </div>

                            <!-- Stok ve Fiyat -->
                            <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                <h4 class="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                                    <svg class="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>
                                    </svg>
                                    Stok ve Fiyat
                                </h4>
                                <div class="grid grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <label for="itemInventory" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Stok <span class="text-red-500">*</span>
                                        </label>
                                        <input type="number" id="itemInventory" name="inventory" required min="0" 
                                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                               placeholder="0">
                                    </div>
                                    <div>
                                        <label for="itemMinInventory" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Stok</label>
                                        <input type="number" id="itemMinInventory" name="minInventory" min="0" value="5" 
                                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                               placeholder="5">
                                    </div>
                                </div>
                                
                                <!-- Fiyat ve KDV -->
                                <div class="grid grid-cols-3 gap-3 mb-4">
                                    <div>
                                        <label for="itemPrice" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Birim Fiyat (KDV Hariç) <span class="text-red-500">*</span>
                                        </label>
                                        <div class="relative">
                                            <input type="number" id="itemPrice" name="price" required min="0" step="0.01" 
                                                   class="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                                   placeholder="0.00">
                                            <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">₺</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label for="itemKdvRate" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KDV Oranı</label>
                                        <select id="itemKdvRate" name="kdvRate" 
                                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                            <option value="0">%0</option>
                                            <option value="1">%1</option>
                                            <option value="10">%10</option>
                                            <option value="20" selected>%20</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label for="itemPriceWithKdv" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KDV Dahil Fiyat</label>
                                        <div class="relative">
                                            <input type="number" id="itemPriceWithKdv" name="priceWithKdv" min="0" step="0.01" 
                                                   class="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                                   placeholder="0.00">
                                            <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">₺</span>
                                        </div>
                                        <div id="itemKdvInfo" class="text-xs text-gray-500 dark:text-gray-400 mt-1">KDV: ₺0,00 (%20)</div>
                                    </div>
                                </div>
                                
                                <!-- Toplam Stok Değeri -->
                                <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Toplam Stok Değeri (KDV Dahil)</label>
                                    <div class="text-lg font-bold text-blue-900 dark:text-blue-100" id="itemTotalValue">₺0,00</div>
                                </div>
                            </div>

                            <!-- Ek Bilgiler -->
                            <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                                <h4 class="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                                    <svg class="w-4 h-4 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
                                    </svg>
                                    Ek Bilgiler
                                </h4>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label for="itemBarcode" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barkod</label>
                                        <input type="text" id="itemBarcode" name="barcode" 
                                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                               placeholder="Barkod numarası">
                                    </div>
                                    <div>
                                        <label for="itemSupplier" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tedarikçi</label>
                                        <input type="text" id="itemSupplier" name="supplier" 
                                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                               placeholder="Tedarikçi firma">
                                    </div>
                                    <div>
                                        <label for="itemFeatures" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Özellikler</label>
                                        <div class="space-y-3">
                                            <input type="text" id="itemFeatures" name="features" 
                                                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                                   placeholder="Örn: 24 kanal, streaming, şarjlı, bluetooth">
                                            <div id="featuresTagsPreview" class="flex flex-wrap gap-2 min-h-[24px]"></div>
                                            <div class="text-xs text-gray-500" id="itemFeatures-help">💡 Virgülle ayırarak birden fazla özellik ekleyebilirsiniz. Tekrarlananlar otomatik kaldırılır.</div>
                                            <div id="existingFeaturesDisplay" class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Mevcut Etiketler (tıklayarak ekleyin):</p>
                                                <div id="existingFeaturesTags" class="flex flex-wrap gap-2"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label for="itemWarranty" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Garanti (ay)</label>
                                        <input type="number" id="itemWarranty" name="warranty" min="0" value="24" 
                                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                               placeholder="24">
                                    </div>
                                </div>
                                
                                <!-- Seri No Yönetimi -->
                                <div class="mt-4">
                                    <div class="flex items-center justify-between mb-2">
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Seri Numaraları</label>
                                        <button type="button" onclick="window.inventoryModal.openBulkSerialModal()" 
                                                class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors">
                                            Toplu Yükle
                                        </button>
                                    </div>
                                    <div class="flex gap-2 mb-2">
                                        <input type="text" id="serialNumberInput" 
                                               class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                               placeholder="Seri numarası girin"
                                               onkeypress="if(event.key==='Enter'){event.preventDefault();window.inventoryModal.addSerialNumber();}">
                                        <button type="button" onclick="window.inventoryModal.addSerialNumber()" 
                                                class="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                                            </svg>
                                        </button>
                                    </div>
                                    <div id="serialNumbersList" class="flex flex-wrap gap-1 min-h-[2rem] p-2 border border-gray-200 rounded-lg bg-gray-50">
                                        <span class="text-xs text-gray-400">Seri numaraları burada görünecek</span>
                                    </div>
                                </div>

                                <div class="mt-3">
                                    <label for="itemDescription" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
                                    <textarea id="itemDescription" name="description" rows="2" 
                                              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none" 
                                              placeholder="Ürün hakkında detaylı bilgi..."></textarea>
                                </div>
                            </div>
                        </form>
                    </div>

                    <!-- Modal Footer -->
                    <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <div class="flex items-center justify-end space-x-3">
                            <button type="button" onclick="window.closeAddItemModal()" 
                                    class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 transition-colors font-medium">
                                İptal
                            </button>
                            <button type="submit" form="addItemForm" 
                                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors font-medium flex items-center">
                                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                                </svg>
                                Ürün Ekle
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Add item form
        const addItemForm = document.getElementById('addItemForm');
        if (addItemForm) {
            addItemForm.addEventListener('submit', (e) => this.handleAddItem(e));
        }

        // Update inventory form
        const updateForm = document.getElementById('inventoryUpdateForm');
        if (updateForm) {
            updateForm.addEventListener('submit', (e) => this.handleInventoryUpdate(e));
        }

        // Features input preview
        const featuresInput = document.getElementById('itemFeatures');
        if (featuresInput) {
            featuresInput.addEventListener('input', () => this.updateFeaturesPreview());
        }

        // Initialize autocomplete for brand and category fields
        this.initializeBrandAutocomplete();
        this.initializeCategoryAutocomplete();

        // VAT calculation event listeners
        const priceInput = document.getElementById('itemPrice');
        const kdvRateSelect = document.getElementById('itemKdvRate');
        const priceWithKdvInput = document.getElementById('itemPriceWithKdv');
        const inventoryInput = document.getElementById('itemInventory');

        if (priceInput) {
            priceInput.addEventListener('input', () => this.updateKdvCalculations('price'));
            priceInput.addEventListener('change', () => this.updateKdvCalculations('price'));
        }
        if (kdvRateSelect) {
            kdvRateSelect.addEventListener('change', () => this.updateKdvCalculations('price'));
        }
        if (priceWithKdvInput) {
            priceWithKdvInput.addEventListener('input', () => this.updateKdvCalculations('priceWithKdv'));
            priceWithKdvInput.addEventListener('change', () => this.updateKdvCalculations('priceWithKdv'));
        }
        if (inventoryInput) {
            inventoryInput.addEventListener('input', () => this.updateTotalValue());
            inventoryInput.addEventListener('change', () => this.updateTotalValue());
        }
    }

    openAddModal() {
        // Remove existing modal to prevent duplicate event listeners
        const existingModal = document.getElementById('addItemModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal dynamically
        this.createAddItemModal();
        
        // Setup event listeners for the newly created modal
        this.setupEventListeners();
        
        // Display existing features and brands (with slight delay to ensure data is loaded)
        setTimeout(() => {
            this.displayExistingFeatures();
            this.displayExistingBrands();
            this.displayExistingCategories();
            // Initialize supplier autocomplete for the modal
            this.initializeSupplierAutocomplete();
            // Initialize VAT calculations
            this.updateKdvCalculations('price');
        }, 100);
        
        const modal = document.getElementById('addItemModal');
        if (modal) {
            modal.classList.remove('hidden');
            // Focus first input
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    closeAddModal() {
        const modal = document.getElementById('addItemModal');
        if (modal) {
            modal.classList.add('hidden');
            const form = document.getElementById('addItemForm');
            if (form) form.reset();
            this.clearFeaturesPreview();
            this.clearSerialNumbers();
            
            // Clean up supplier autocomplete
            if (this.supplierAutocomplete) {
                this.supplierAutocomplete.destroy();
                this.supplierAutocomplete = null;
            }
        }
    }

    openUpdateModal(itemId) {
        const item = window.inventoryData.getItem(itemId);
        if (!item) return;

        // Populate form with item data
        document.getElementById('updateItemId').value = item.id;
        document.getElementById('updateCurrentStock').value = item.inventory || 0;
        document.getElementById('updateStockChange').value = '';
        document.getElementById('updateMinStock').value = item.minInventory || 0;
        document.getElementById('updateNotes').value = '';

        // Show current item info
        document.getElementById('updateItemName').textContent = item.name || '';
        document.getElementById('updateItemBrand').textContent = item.brand || '';

        const modal = document.getElementById('inventoryUpdateModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    closeUpdateModal() {
        const modal = document.getElementById('inventoryUpdateModal');
        if (modal) {
            modal.classList.add('hidden');
            const form = document.getElementById('inventoryUpdateForm');
            if (form) form.reset();
        }
    }

    async handleAddItem(e) {
        e.preventDefault();

        try {
            const formData = new FormData(e.target);

            // Parse features
            const featuresText = formData.get('features') || '';
            const featuresArray = featuresText ?
                [...new Set(featuresText.split(',').map(f => f.trim()).filter(f => f))] : [];

            const itemData = {
                name: formData.get('name'),
                brand: formData.get('brand'),
                model: formData.get('model'),
                category: formData.get('category'),
                barcode: formData.get('barcode') || null,
                supplier: formData.get('supplier'),
                description: formData.get('description'),
                features: featuresArray,
                direction: formData.get('direction') || 'both',

                // Inventory fields - match backend expectations
                availableInventory: parseInt(formData.get('inventory')) || 0,
                inventory: parseInt(formData.get('inventory')) || 0, // Legacy compatibility
                reorderLevel: parseInt(formData.get('minInventory')) || 5,
                minInventory: parseInt(formData.get('minInventory')) || 5, // Legacy compatibility

                // Pricing
                price: parseFloat(formData.get('price')) || 0,

                // Serial numbers
                serialNumbers: [...this.serialNumbers],

                // Other fields
                warranty: parseInt(formData.get('warranty')) || 0,
                onTrial: 0,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };

            // Validate required fields
            if (!itemData.name || !itemData.brand || !itemData.category || !itemData.price) {
                window.Utils.showToast('Lütfen zorunlu alanları doldurun (Ad, Marka, Kategori, Fiyat)', 'error');
                return;
            }

            // Check for duplicate barcode
            if (itemData.barcode) {
                const existingItem = window.inventoryData.findByBarcode(itemData.barcode);
                if (existingItem) {
                    window.Utils.showToast('Bu barkod(' + itemData.barcode + ') zaten "' + existingItem.name + '" ürününde kullanılıyor', 'error');
                    return;
                }
            }

            console.log('📦 Adding item to inventory:', itemData);

            // Show loading state
            this.showLoadingState('Ürün kaydediliyor...');

            try {
                // Use the addItem method which handles both API and local storage
                const newItem = await window.inventoryData.addItem(itemData);

                this.hideLoadingState();
                this.closeAddModal();

                if (newItem) {
                    window.Utils.showToast('✅ ' + itemData.name + ' başarıyla kaydedildi', 'success');
                } else {
                    window.Utils.showToast('⚠️ Ürün kaydedilirken sorun oluştu', 'warning');
                }
            } catch (addError) {
                this.hideLoadingState();
                console.error('Error in addItem:', addError);
                window.Utils.showToast('❌ Ürün kaydedilemedi: ' + addError.message, 'error');
            }

        } catch (error) {
            console.error('Error adding item:', error);
            window.Utils.showToast('Ürün eklenirken hata oluştu: ' + error.message, 'error');
        }
    }

    handleInventoryUpdate(e) {
        e.preventDefault();

        try {
            const formData = new FormData(e.target);
            const itemId = formData.get('itemId');
            const stockChange = parseInt(formData.get('stockChange')) || 0;
            const newMinStock = parseInt(formData.get('minStock')) || 0;
            const notes = formData.get('notes');

            const item = window.inventoryData.getItem(itemId);
            if (!item) {
                throw new Error('Ürün bulunamadı');
            }

            const currentStock = parseInt(item.inventory) || 0;
            const newStock = Math.max(0, currentStock + stockChange);

            // Update item
            const updates = {
                inventory: newStock,
                minInventory: newMinStock
            };

            window.inventoryData.updateItem(itemId, updates);

            // Log the change if there are notes or stock change
            if (stockChange !== 0 || notes) {
                this.logStockChange(item, stockChange, notes);
            }

            this.closeUpdateModal();

            const changeText = stockChange > 0 ? '+ ' + stockChange + ' ' : stockChange.toString();
            window.Utils.showToast(item.name + ' stoku güncellendi(' + changeText + ')', 'success');

        } catch (error) {
            console.error('Error updating inventory:', error);
            window.Utils.showToast('Stok güncellenirken hata oluştu: ' + error.message, 'error');
        }
    }

    logStockChange(item, change, notes) {
        // This would typically log to a stock movement history
        console.log('Stock change logged:', {
            itemId: item.id,
            itemName: item.name,
            change: change,
            notes: notes,
            timestamp: new Date().toISOString()
        });
    }

    updateFeaturesPreview() {
        const featuresInput = document.getElementById('itemFeatures');
        const previewContainer = document.getElementById('featuresTagsPreview');
        
        if (!featuresInput || !previewContainer) return;
        
        const featuresText = featuresInput.value.trim();
        if (!featuresText) {
            previewContainer.innerHTML = '<span class="text-xs text-gray-400 dark:text-gray-500">Virgülle ayırarak özellik ekleyin</span>';
            return;
        }
        
        // Parse and remove duplicates
        const featuresArray = featuresText.split(',').map(f => f.trim()).filter(f => f);
        const uniqueFeatures = [...new Set(featuresArray)];
        
        previewContainer.innerHTML = uniqueFeatures.map(feature => 
            `<span class="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-medium">${feature}</span>`
        ).join('');
        
        // Show warning if duplicates were removed
        if (uniqueFeatures.length < featuresArray.length) {
            const helpText = document.getElementById('itemFeatures-help');
            if (helpText) {
                helpText.innerHTML = '<span class="text-amber-600 dark:text-amber-400">⚠️ Tekrarlanan özellikler kaldırıldı</span>';
                setTimeout(() => {
                    helpText.innerHTML = '💡 Virgülle ayırarak birden fazla özellik ekleyebilirsiniz. Tekrarlananlar otomatik kaldırılır.';
                }, 3000);
            }
        }
    }

    displayExistingFeatures() {
        const tagsContainer = document.getElementById('existingFeaturesTags');
        if (!tagsContainer) return;
        
        // Get all existing features from inventory
        let inventory = [];
        
        // Try multiple sources for inventory data
        if (window.inventoryData && typeof window.inventoryData.getAllItems === 'function') {
            inventory = window.inventoryData.getAllItems();
        } else if (window.inventory && Array.isArray(window.inventory)) {
            inventory = window.inventory;
        } else if (window.INVENTORY_DATA && Array.isArray(window.INVENTORY_DATA)) {
            inventory = window.INVENTORY_DATA;
        }
        
        const allFeatures = new Set();
        
        inventory.forEach(item => {
            if (item.features && Array.isArray(item.features)) {
                item.features.forEach(feature => allFeatures.add(feature));
            }
        });
        
        if (allFeatures.size === 0) {
            tagsContainer.innerHTML = '<span class="text-xs text-gray-400 dark:text-gray-500">Henüz kayıtlı özellik yok</span>';
            return;
        }
        
        // Display as clickable tags
        tagsContainer.innerHTML = Array.from(allFeatures).sort().map(feature => 
            `<button type="button" 
                class="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900 text-gray-700 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-300 px-2 py-1 rounded-full font-medium transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500"
                onclick="window.inventoryModal.addFeatureTag('${feature.replace(/'/g, "\\'")}')"
                title="Tıklayarak ekle">
                + ${feature}
            </button>`
        ).join('');
    }
    
    addFeatureTag(feature) {
        const featuresInput = document.getElementById('itemFeatures');
        if (!featuresInput) return;
        
        const currentValue = featuresInput.value.trim();
        const currentFeatures = currentValue ? currentValue.split(',').map(f => f.trim()).filter(f => f) : [];
        
        // Check if feature already exists (case-insensitive)
        const featureExists = currentFeatures.some(f => f.toLowerCase() === feature.toLowerCase());
        
        if (featureExists) {
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast(`"${feature}" zaten ekli`, 'info');
            }
            return;
        }
        
        // Add the feature
        currentFeatures.push(feature);
        featuresInput.value = currentFeatures.join(', ');
        
        // Update preview
        this.updateFeaturesPreview();
        
        // Show success message
        if (window.Utils && window.Utils.showToast) {
            window.Utils.showToast(`"${feature}" eklendi`, 'success');
        }
    }

    clearFeaturesPreview() {
        const previewContainer = document.getElementById('featuresTagsPreview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
    }

    // Brand Management Methods
    displayExistingBrands() {
        const tagsContainer = document.getElementById('existingBrandsTags');
        if (!tagsContainer) return;
        
        // Get all existing brands from inventory
        let inventory = [];
        
        // Try multiple sources for inventory data
        if (window.inventoryData && typeof window.inventoryData.getAllItems === 'function') {
            inventory = window.inventoryData.getAllItems();
        } else if (window.inventory && Array.isArray(window.inventory)) {
            inventory = window.inventory;
        } else if (window.INVENTORY_DATA && Array.isArray(window.INVENTORY_DATA)) {
            inventory = window.INVENTORY_DATA;
        }
        
        console.log('displayExistingBrands - inventory count:', inventory.length);
        
        const allBrands = new Set();
        
        inventory.forEach(item => {
            if (item.brand && item.brand.trim()) {
                allBrands.add(item.brand.trim());
            }
        });
        
        if (allBrands.size === 0) {
            tagsContainer.innerHTML = '<span class="text-xs text-gray-400 dark:text-gray-500">Henüz kayıtlı marka yok</span>';
            return;
        }
        
        // Display as clickable tags
        tagsContainer.innerHTML = Array.from(allBrands).sort().map(brand => 
            `<button type="button" 
                class="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 rounded-full font-medium transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
                onclick="window.inventoryModal.addBrandTag('${brand.replace(/'/g, "\\'")}')"
                title="Tıklayarak seç">
                ${brand}
            </button>`
        ).join('');
    }
    
    addBrandTag(brand) {
        const brandInput = document.getElementById('itemBrand');
        if (!brandInput) return;
        
        // Set the brand
        brandInput.value = brand;
        const selectedContainer = document.getElementById('selectedBrandTag');
        if (selectedContainer) {
            selectedContainer.innerHTML = `<span class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-medium border border-gray-300 dark:border-gray-600">${brand}</span>`;
        }
        
        // Show success message
        if (window.Utils && window.Utils.showToast) {
            window.Utils.showToast(`"${brand}" seçildi`, 'success');
        }
    }

    // Category Management Methods
    displayExistingCategories() {
        const tagsContainer = document.getElementById('existingCategoriesTags');
        if (!tagsContainer) return;
        
        let inventory = [];
        if (window.inventoryData && typeof window.inventoryData.getAllItems === 'function') {
            inventory = window.inventoryData.getAllItems();
        } else if (window.inventory && Array.isArray(window.inventory)) {
            inventory = window.inventory;
        } else if (window.INVENTORY_DATA && Array.isArray(window.INVENTORY_DATA)) {
            inventory = window.INVENTORY_DATA;
        }

        const allCategories = new Set();
        inventory.forEach(item => {
            const c = (item.category || '').toString().trim();
            if (c) allCategories.add(c);
        });

        if (allCategories.size === 0) {
            tagsContainer.innerHTML = '<span class="text-xs text-gray-400 dark:text-gray-500">Henüz kayıtlı kategori yok</span>';
            return;
        }

        tagsContainer.innerHTML = Array.from(allCategories).sort().map(cat => 
            `<button type="button" 
                class="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 rounded-full font-medium transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
                onclick="window.inventoryModal.addCategoryTag('${cat.replace(/'/g, "\\'")}')"
                title="Tıklayarak seç">
                ${cat}
            </button>`
        ).join('');
    }

    addCategoryTag(category) {
        const input = document.getElementById('itemCategory');
        if (!input) return;
        input.value = category;
        const selectedContainer = document.getElementById('selectedCategoryTag');
        if (selectedContainer) {
            selectedContainer.innerHTML = `<span class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-medium border border-gray-300 dark:border-gray-600">${category}</span>`;
        }
        window.Utils?.showToast(`"${category}" seçildi`, 'success');
    }

    addCategoryFromInput() {
        const input = document.getElementById('itemCategory');
        if (!input) return;
        const val = (input.value || '').trim();
        if (!val) {
            window.Utils?.showToast('Önce kategori yazın', 'warning');
            return;
        }
        this.addCategoryTag(val);
    }

    addBrandFromInput() {
        const input = document.getElementById('itemBrand');
        if (!input) return;
        const val = (input.value || '').trim();
        if (!val) {
            window.Utils?.showToast('Önce marka yazın', 'warning');
            return;
        }
        const selectedContainer = document.getElementById('selectedBrandTag');
        if (selectedContainer) {
            selectedContainer.innerHTML = `<span class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-medium border border-gray-300 dark:border-gray-600">${val}</span>`;
        }
        window.Utils?.showToast(`"${val}" seçildi`, 'success');
    }

    // Seri No Yönetimi Metodları
    addSerialNumber() {
        const input = document.getElementById('serialNumberInput');
        if (!input) return;

        const serialNumber = input.value.trim();
        if (!serialNumber) {
            window.Utils?.showToast('Seri numarası boş olamaz', 'error');
            return;
        }

        if (this.serialNumbers.includes(serialNumber)) {
            window.Utils?.showToast('Bu seri numarası zaten eklenmiş', 'error');
            return;
        }

        this.serialNumbers.push(serialNumber);
        input.value = '';
        this.updateSerialNumbersList();
    }

    removeSerialNumber(serialNumber) {
        this.serialNumbers = this.serialNumbers.filter(sn => sn !== serialNumber);
        this.updateSerialNumbersList();
    }

    updateSerialNumbersList() {
        const container = document.getElementById('serialNumbersList');
        if (!container) return;

        if (this.serialNumbers.length === 0) {
            container.innerHTML = '<span class="text-xs text-gray-400">Seri numaraları burada görünecek</span>';
            return;
        }

        container.innerHTML = this.serialNumbers.map(sn => `
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                ${sn}
                <button type="button" onclick="window.inventoryModal.removeSerialNumber('${sn}')" 
                        class="ml-1 text-blue-600 hover:text-blue-800">
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </span>
        `).join('');
    }

    // Seri No Yönetimi Metodları
    addSerialNumber() {
        const input = document.getElementById('serialNumberInput');
        if (!input) return;

        const serialNumber = input.value.trim();
        if (!serialNumber) {
            window.Utils?.showToast('Seri numarası boş olamaz', 'error');
            return;
        }

        if (this.serialNumbers.includes(serialNumber)) {
            window.Utils?.showToast('Bu seri numarası zaten eklenmiş', 'error');
            return;
        }

        this.serialNumbers.push(serialNumber);
        input.value = '';
        this.updateSerialNumbersList();
    }

    removeSerialNumber(serialNumber) {
        this.serialNumbers = this.serialNumbers.filter(sn => sn !== serialNumber);
        this.updateSerialNumbersList();
    }

    updateSerialNumbersList() {
        const container = document.getElementById('serialNumbersList');
        if (!container) return;

        if (this.serialNumbers.length === 0) {
            container.innerHTML = '<span class="text-xs text-gray-400">Seri numaraları burada görünecek</span>';
            return;
        }

        container.innerHTML = this.serialNumbers.map(sn => `
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                ${sn}
                <button type="button" onclick="window.inventoryModal.removeSerialNumber('${sn}')" 
                        class="ml-1 text-blue-600 hover:text-blue-800">
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </span>
        `).join('');
    }

    openBulkSerialModal() {
        const modal = document.createElement('div');
        modal.id = 'bulkSerialModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-xl font-semibold text-gray-900">Toplu Seri No Yükleme</h3>
                                <p class="text-sm text-gray-500">Excel dosyası ile seri numaralarını toplu yükleyin</p>
                            </div>
                        </div>
                        <button onclick="this.closest('.fixed').remove()" 
                                class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="p-6">
                    <div class="mb-6">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-lg font-medium text-gray-900">Taslak İndir</h4>
                            <button onclick="window.inventoryModal.downloadSerialTemplate()" 
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                                Taslak İndir
                            </button>
                        </div>
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h5 class="font-medium text-blue-900 mb-2">Taslak Formatı:</h5>
                            <ul class="text-sm text-blue-700 space-y-1">
                                <li>• <strong>Seri No:</strong> Seri numarası</li>
                                <li>• <strong>İşlem:</strong> 1 = Ekle, 2 = Sil</li>
                            </ul>
                        </div>
                    </div>

                    <div class="mb-6">
                        <h4 class="text-lg font-medium text-gray-900 mb-4">Dosya Yükle</h4>
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <input type="file" id="serialFileInput" accept=".xlsx,.xls,.csv" class="hidden" 
                                   onchange="window.inventoryModal.handleSerialFileUpload(event)">
                            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <button type="button" onclick="document.getElementById('serialFileInput').click()" 
                                    class="text-blue-600 hover:text-blue-700 font-medium">
                                Dosya Seç
                            </button>
                            <p class="text-sm text-gray-500 mt-2">Excel (.xlsx, .xls) veya CSV dosyası</p>
                        </div>
                    </div>

                    <div id="serialPreview" class="hidden">
                        <h4 class="text-lg font-medium text-gray-900 mb-4">Önizleme</h4>
                        <div class="max-h-60 overflow-y-auto border rounded-lg">
                            <table class="w-full text-sm">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-4 py-2 text-left">Seri No</th>
                                        <th class="px-4 py-2 text-left">İşlem</th>
                                        <th class="px-4 py-2 text-left">Durum</th>
                                    </tr>
                                </thead>
                                <tbody id="serialPreviewBody">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div class="flex items-center justify-end space-x-3">
                        <button onclick="this.closest('.fixed').remove()" 
                                class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            İptal
                        </button>
                        <button id="applySerialChanges" onclick="window.inventoryModal.applySerialChanges()" 
                                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50" 
                                disabled>
                            Değişiklikleri Uygula
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    downloadSerialTemplate() {
        const data = [
            ['Seri No', 'İşlem'],
            ['SN001', '1'],
            ['SN002', '1'],
            ['SN003', '2']
        ];

        const csvContent = data.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'seri_no_taslak.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    handleSerialFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim());

                if (lines.length < 2) {
                    window.Utils?.showToast('Dosya formatı hatalı', 'error');
                    return;
                }

                const serialData = [];
                for (let i = 1; i < lines.length; i++) {
                    const [serialNo, action] = lines[i].split(',').map(cell => cell.trim());
                    if (serialNo && action) {
                        serialData.push({
                            serialNo,
                            action: action === '1' ? 'Ekle' : action === '2' ? 'Sil' : 'Bilinmiyor',
                            actionCode: action,
                            status: this.validateSerialAction(serialNo, action)
                        });
                    }
                }

                this.displaySerialPreview(serialData);
            } catch (error) {
                window.Utils?.showToast('Dosya okuma hatası', 'error');
            }
        };
        reader.readAsText(file);
    }

    validateSerialAction(serialNo, action) {
        if (action === '1') {
            return this.serialNumbers.includes(serialNo) ? 'Zaten var' : 'Eklenecek';
        } else if (action === '2') {
            return this.serialNumbers.includes(serialNo) ? 'Silinecek' : 'Bulunamadı';
        }
        return 'Geçersiz işlem';
    }

    displaySerialPreview(serialData) {
        const preview = document.getElementById('serialPreview');
        const tbody = document.getElementById('serialPreviewBody');

        if (!preview || !tbody) return;

        tbody.innerHTML = serialData.map(item => `
            <tr class="${item.status.includes('Hata') || item.status === 'Bulunamadı' ? 'bg-red-50' : 'bg-white'}">
                <td class="px-4 py-2">${item.serialNo}</td>
                <td class="px-4 py-2">${item.action}</td>
                <td class="px-4 py-2">
                    <span class="px-2 py-1 rounded-full text-xs ${this.getStatusClass(item.status)}">
                        ${item.status}
                    </span>
                </td>
            </tr>
        `).join('');

        preview.classList.remove('hidden');
        document.getElementById('applySerialChanges').disabled = false;
        this.pendingSerialData = serialData;
    }

    getStatusClass(status) {
        if (status === 'Eklenecek') return 'bg-green-100 text-green-800';
        if (status === 'Silinecek') return 'bg-red-100 text-red-800';
        if (status === 'Zaten var') return 'bg-yellow-100 text-yellow-800';
        if (status === 'Bulunamadı') return 'bg-gray-100 text-gray-800';
        return 'bg-red-100 text-red-800';
    }

    applySerialChanges() {
        if (!this.pendingSerialData) return;

        let addedCount = 0;
        let removedCount = 0;

        this.pendingSerialData.forEach(item => {
            if (item.actionCode === '1' && item.status === 'Eklenecek') {
                this.serialNumbers.push(item.serialNo);
                addedCount++;
            } else if (item.actionCode === '2' && item.status === 'Silinecek') {
                this.serialNumbers = this.serialNumbers.filter(sn => sn !== item.serialNo);
                removedCount++;
            }
        });

        this.updateSerialNumbersList();
        document.getElementById('bulkSerialModal').remove();

        window.Utils?.showToast(`${addedCount} seri no eklendi, ${removedCount} seri no silindi`, 'success');
    }

    openBulkSerialModal() {
        const modal = document.createElement('div');
        modal.id = 'bulkSerialModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-xl font-semibold text-gray-900">Toplu Seri No Yükleme</h3>
                                <p class="text-sm text-gray-500">Excel dosyası ile seri numaralarını toplu yükleyin</p>
                            </div>
                        </div>
                        <button onclick="this.closest('.fixed').remove()" 
                                class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="p-6">
                    <div class="mb-6">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-lg font-medium text-gray-900">Taslak İndir</h4>
                            <button onclick="window.inventoryModal.downloadSerialTemplate()" 
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                                Taslak İndir
                            </button>
                        </div>
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h5 class="font-medium text-blue-900 mb-2">Taslak Formatı:</h5>
                            <ul class="text-sm text-blue-700 space-y-1">
                                <li>• <strong>Seri No:</strong> Seri numarası</li>
                                <li>• <strong>İşlem:</strong> 1 = Ekle, 2 = Sil</li>
                            </ul>
                        </div>
                    </div>

                    <div class="mb-6">
                        <h4 class="text-lg font-medium text-gray-900 mb-4">Dosya Yükle</h4>
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <input type="file" id="serialFileInput" accept=".xlsx,.xls,.csv" class="hidden" 
                                   onchange="window.inventoryModal.handleSerialFileUpload(event)">
                            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <button type="button" onclick="document.getElementById('serialFileInput').click()" 
                                    class="text-blue-600 hover:text-blue-700 font-medium">
                                Dosya Seç
                            </button>
                            <p class="text-sm text-gray-500 mt-2">Excel (.xlsx, .xls) veya CSV dosyası</p>
                        </div>
                    </div>

                    <div id="serialPreview" class="hidden">
                        <h4 class="text-lg font-medium text-gray-900 mb-4">Önizleme</h4>
                        <div class="max-h-60 overflow-y-auto border rounded-lg">
                            <table class="w-full text-sm">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-4 py-2 text-left">Seri No</th>
                                        <th class="px-4 py-2 text-left">İşlem</th>
                                        <th class="px-4 py-2 text-left">Durum</th>
                                    </tr>
                                </thead>
                                <tbody id="serialPreviewBody">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div class="flex items-center justify-end space-x-3">
                        <button onclick="this.closest('.fixed').remove()" 
                                class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            İptal
                        </button>
                        <button id="applySerialChanges" onclick="window.inventoryModal.applySerialChanges()" 
                                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50" 
                                disabled>
                            Değişiklikleri Uygula
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    clearSerialNumbers() {
        this.serialNumbers = [];
        this.updateSerialNumbersList();
    }

    // VAT calculation methods
    getKdvRate() {
        const select = document.getElementById('itemKdvRate');
        if (!select) return 20;
        const val = parseFloat(select.value);
        return isNaN(val) ? 20 : val;
    }

    updateKdvCalculations(fromField = 'price') {
        const priceEl = document.getElementById('itemPrice');
        const inclEl = document.getElementById('itemPriceWithKdv');
        const infoEl = document.getElementById('itemKdvInfo');
        const rate = this.getKdvRate();

        let price = parseFloat(priceEl?.value) || 0;
        let incl = parseFloat(inclEl?.value);

        if (fromField === 'priceWithKdv' && !isNaN(incl)) {
            // KDV dahil değer girildi → birim fiyatı ters hesapla
            price = incl / (1 + rate / 100);
            if (priceEl) priceEl.value = price.toFixed(2);
        }

        const kdvAmount = (price * rate) / 100;
        const totalIncl = price + kdvAmount;
        
        // Kullanıcı hangi alanı düzenliyorsa onu yeniden yazmayalım
        if (fromField === 'price' && inclEl) {
            inclEl.value = totalIncl.toFixed(2);
        }
        
        if (infoEl) {
            infoEl.textContent = `KDV: ₺${kdvAmount.toFixed(2)} (%${rate})`;
        }

        this.updateTotalValue();
    }

    updateTotalValue() {
        const inventoryEl = document.getElementById('itemInventory');
        const priceWithKdvEl = document.getElementById('itemPriceWithKdv');
        const totalValueEl = document.getElementById('itemTotalValue');

        if (!inventoryEl || !priceWithKdvEl || !totalValueEl) return;

        const inventory = parseFloat(inventoryEl.value) || 0;
        const priceWithKdv = parseFloat(priceWithKdvEl.value) || 0;
        const totalValue = inventory * priceWithKdv;

        totalValueEl.textContent = `₺${totalValue.toFixed(2)}`;
    }

    initializeSupplierAutocomplete() {
        const supplierInput = document.getElementById('itemSupplier');
        if (supplierInput && window.SupplierAutocomplete) {
            console.log('🏢 Initializing supplier autocomplete for modal...');
            
            // Destroy existing autocomplete if any
            if (this.supplierAutocomplete) {
                this.supplierAutocomplete.destroy();
            }
            
            this.supplierAutocomplete = new SupplierAutocomplete(supplierInput, {
                onSelect: (supplier) => {
                    console.log('Supplier selected:', supplier);
                    // Update hidden field if exists
                    const hiddenField = document.getElementById('itemSupplierId');
                    if (hiddenField) {
                        hiddenField.value = supplier.id;
                    }
                },
                onCreate: (supplier) => {
                    console.log('New supplier created:', supplier);
                    // Update hidden field if exists
                    const hiddenField = document.getElementById('itemSupplierId');
                    if (hiddenField) {
                        hiddenField.value = supplier.id;
                    }
                }
            });
            console.log('✅ Supplier autocomplete initialized for modal');
        } else {
            console.warn('⚠️ Supplier input or SupplierAutocomplete not found in modal');
        }
    }
}

// Export for global use
window.InventoryModal = InventoryModal;

// Global functions for modal access
window.openAddItemModal = function () {
    if (!window.inventoryModal) {
        window.inventoryModal = new InventoryModal();
    }
    window.inventoryModal.openAddModal();
};

window.closeAddItemModal = function () {
    if (window.inventoryModal) {
        window.inventoryModal.closeAddModal();
    }
};