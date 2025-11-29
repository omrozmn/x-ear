// Inventory Modal Management Module
class InventoryModal {
    constructor() {
        this.setupEventListeners();
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

        // Setup form event listener
        const form = modal.querySelector('#addItemForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleAddItem(e));
        }
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
                                        <select id="itemBrand" name="brand" required 
                                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                            <option value="">Marka seçin</option>
                                            <option value="Phonak">Phonak</option>
                                            <option value="Oticon">Oticon</option>
                                            <option value="Widex">Widex</option>
                                            <option value="Signia">Signia</option>
                                            <option value="ReSound">ReSound</option>
                                            <option value="Starkey">Starkey</option>
                                            <option value="Unitron">Unitron</option>
                                            <option value="Bernafon">Bernafon</option>
                                        </select>
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
                                        <select id="itemCategory" name="category" required 
                                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                            <option value="">Kategori seçin</option>
                                            <option value="hearing_aid">🦻 İşitme Cihazı</option>
                                            <option value="aksesuar">🔌 Aksesuar</option>
                                            <option value="pil">🔋 Pil</option>
                                            <option value="bakim">🧽 Bakım</option>
                                        </select>
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
                                <div class="grid grid-cols-3 gap-3">
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
                                    <div>
                                        <label for="itemPrice" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Fiyat <span class="text-red-500">*</span>
                                        </label>
                                        <input type="number" id="itemPrice" name="price" required min="0" step="0.01" 
                                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                               placeholder="0.00">
                                    </div>
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
                                        <input type="text" id="itemFeatures" name="features" 
                                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                               placeholder="bluetooth, şarjlı, 24 kanal">
                                    </div>
                                    <div>
                                        <label for="itemWarranty" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Garanti (ay)</label>
                                        <input type="number" id="itemWarranty" name="warranty" min="0" value="24" 
                                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" 
                                               placeholder="24">
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
    }

    openAddModal() {
        // Create modal dynamically
        this.createAddItemModal();
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
        const previewContainer = document.getElementById('inventoryFeaturesPreview');

        if (!featuresInput || !previewContainer) return;

        const features = featuresInput.value.split(',').map(f => f.trim()).filter(f => f);

        if (features.length === 0) {
            previewContainer.innerHTML = '<span class="text-gray-400">Özellik etiketleri burada görünecek</span>';
            return;
        }

        previewContainer.innerHTML = features.map(feature =>
            `< span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2 mb-1" >
            ${feature}
            </span > `
        ).join('');
    }

    clearFeaturesPreview() {
        const previewContainer = document.getElementById('inventoryFeaturesPreview');
        if (previewContainer) {
            previewContainer.innerHTML = '<span class="text-gray-400">Özellik etiketleri burada görünecek</span>';
        }
    }
}

// Export for global use
window.InventoryModal = InventoryModal;