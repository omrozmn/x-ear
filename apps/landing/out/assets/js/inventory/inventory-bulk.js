// Inventory Bulk Operations Module
class InventoryBulk {
    constructor() {
        this.selectedItems = new Set();
        this.allInventoryItems = [];
        this.categoryAutocomplete = null;
        
        // Initialize fuzzy search utility
        this.fuzzySearch = new FuzzySearchUtil({
            threshold: 0.6,
            maxDistance: 3,
            caseSensitive: false,
            includeScore: true,
            minLength: 1
        });
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Bulk upload form
        const bulkUploadForm = document.getElementById('bulkUploadForm');
        if (bulkUploadForm) {
            bulkUploadForm.addEventListener('submit', (e) => this.handleBulkUpload(e));
        }

        // File input change - check both possible IDs
        const fileInput = document.getElementById('csvFile') || document.getElementById('bulkUploadFile');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Setup modal form listeners
        this.setupModalFormListeners();
    }

    setupModalFormListeners() {
        // Category update form
        const categoryForm = document.getElementById('categoryUpdateForm');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => this.handleCategoryUpdate(e));
        }

        // Price update form
        const priceForm = document.getElementById('priceUpdateForm');
        if (priceForm) {
            priceForm.addEventListener('submit', (e) => this.handlePriceUpdate(e));
            
            // Price type change handler
            const priceType = document.getElementById('priceUpdateType');
            if (priceType) {
                priceType.addEventListener('change', (e) => this.updatePriceInputUnit(e.target.value));
            }
        }

        // Stock update form
        const stockForm = document.getElementById('stockUpdateForm');
        if (stockForm) {
            stockForm.addEventListener('submit', (e) => this.handleStockUpdate(e));
        }

        // Supplier update form
        const supplierForm = document.getElementById('supplierUpdateForm');
        if (supplierForm) {
            supplierForm.addEventListener('submit', (e) => this.handleSupplierUpdate(e));
        }
    }

    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.item-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const itemId = checkbox.value;
            if (checked) {
                window.inventoryTable.selectedItems.add(itemId);
            } else {
                window.inventoryTable.selectedItems.delete(itemId);
            }
        });

        window.inventoryTable.updateBulkActionsButton();
        window.inventoryTable.render(); // Re-render to show selection
    }

    openActionsModal() {
        const selectedItems = window.inventoryTable.getSelectedItems();
        if (selectedItems.size === 0) {
            window.Utils.showToast('Lütfen işlem yapmak için ürün seçin', 'warning');
            return;
        }

        const modal = document.getElementById('bulkActionsModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('selectedItemsCount').textContent = selectedItems.size;
        }
    }

    closeActionsModal() {
        const modal = document.getElementById('bulkActionsModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Category Update Modal
    openCategoryUpdateModal() {
        const modal = document.getElementById('categoryUpdateModal');
        const selectedCount = document.getElementById('categorySelectedCount');
        
        if (modal && selectedCount) {
            selectedCount.textContent = window.inventoryTable.selectedItems.size;
            modal.classList.remove('hidden');
            
            // Initialize CategoryBrandAutocomplete for category input
            const categoryInput = document.getElementById('newCategory');
            if (categoryInput && !this.categoryAutocomplete) {
                this.categoryAutocomplete = new CategoryBrandAutocomplete(categoryInput, 'category', {
                    allowCreate: true,
                    onSelect: (item) => {
                        console.log('Category selected:', item);
                    },
                    onCreate: (name) => {
                        console.log('New category created:', name);
                    }
                });
            }
        }
    }

    closeCategoryUpdateModal() {
        const modal = document.getElementById('categoryUpdateModal');
        if (modal) {
            modal.classList.add('hidden');
            
            // Clean up CategoryBrandAutocomplete
            if (this.categoryAutocomplete) {
                this.categoryAutocomplete.destroy();
                this.categoryAutocomplete = null;
            }
            
            // Clear form
            const form = document.getElementById('categoryUpdateForm');
            if (form) {
                form.reset();
            }
        }
    }



    // Price Update Modal
    openPriceUpdateModal() {
        this.closeActionsModal();
        const modal = document.getElementById('priceUpdateModal');
        const selectedCount = document.getElementById('priceSelectedCount');
        
        if (modal && selectedCount) {
            selectedCount.textContent = window.inventoryTable.selectedItems.size;
            modal.classList.remove('hidden');
            this.updatePriceInputUnit('percentage'); // Default
        }
    }

    closePriceUpdateModal() {
        const modal = document.getElementById('priceUpdateModal');
        if (modal) {
            modal.classList.add('hidden');
            document.getElementById('priceUpdateForm').reset();
        }
    }

    updatePriceInputUnit(type) {
        const unitSpan = document.getElementById('priceUnit');
        const input = document.getElementById('priceValue');
        const helpText = input.parentElement.nextElementSibling;
        
        if (unitSpan && input && helpText) {
            switch (type) {
                case 'percentage':
                    unitSpan.textContent = '%';
                    input.placeholder = '0';
                    helpText.textContent = 'Örnek: %10 artış için 10, %5 indirim için -5';
                    break;
                case 'fixed':
                    unitSpan.textContent = '₺';
                    input.placeholder = '0.00';
                    helpText.textContent = 'Örnek: 100₺ artış için 100, 50₺ indirim için -50';
                    break;
                case 'set':
                    unitSpan.textContent = '₺';
                    input.placeholder = '0.00';
                    helpText.textContent = 'Tüm seçili ürünler bu fiyata ayarlanacak';
                    break;
            }
        }
    }

    // Stock Update Modal
    openStockUpdateModal() {
        this.closeActionsModal();
        const modal = document.getElementById('stockUpdateModal');
        const selectedCount = document.getElementById('stockSelectedCount');
        
        if (modal && selectedCount) {
            selectedCount.textContent = window.inventoryTable.selectedItems.size;
            modal.classList.remove('hidden');
        }
    }

    closeStockUpdateModal() {
        const modal = document.getElementById('stockUpdateModal');
        if (modal) {
            modal.classList.add('hidden');
            document.getElementById('stockUpdateForm').reset();
        }
    }

    // Supplier Update Modal
    openSupplierUpdateModal() {
        this.closeActionsModal();
        const modal = document.getElementById('supplierUpdateModal');
        const selectedCount = document.getElementById('supplierSelectedCount');
        
        if (modal && selectedCount) {
            selectedCount.textContent = window.inventoryTable.selectedItems.size;
            modal.classList.remove('hidden');
            // Initialize supplier autocomplete if available
            setTimeout(() => {
                const supplierInput = document.getElementById('newSupplier');
                if (supplierInput && window.SupplierAutocomplete) {
                    if (this.supplierAutocomplete) {
                        this.supplierAutocomplete.destroy();
                    }
                    this.supplierAutocomplete = new SupplierAutocomplete(supplierInput, {
                        allowCreate: true,
                        onSelect: (supplier) => {
                            console.log('Supplier selected in bulk operations:', supplier);
                        },
                        onCreate: (supplier) => {
                            console.log('New supplier created in bulk operations:', supplier);
                            if (window.Utils && window.Utils.showToast) {
                                window.Utils.showToast(`"${supplier.companyName || supplier.company_name}" tedarikçisi oluşturuldu`, 'success');
                            }
                        }
                    });
                }
            }, 100);
        }
    }

    closeSupplierUpdateModal() {
        const modal = document.getElementById('supplierUpdateModal');
        if (modal) {
            modal.classList.add('hidden');
            document.getElementById('supplierUpdateForm').reset();
            if (this.supplierAutocomplete) {
                this.supplierAutocomplete.destroy();
                this.supplierAutocomplete = null;
            }
        }
    }

    async handleCategoryUpdate(e) {
        e.preventDefault();
        
        const selectedItems = Array.from(window.inventoryTable.selectedItems);
        if (selectedItems.length === 0) {
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Lütfen güncellenecek ürünleri seçin', 'error');
            }
            return;
        }

        // Get category value from CategoryBrandAutocomplete
        const newCategory = this.categoryAutocomplete ? this.categoryAutocomplete.getValue() : '';
        
        // Ensure newCategory is a string before calling trim
        const categoryString = typeof newCategory === 'string' ? newCategory : (newCategory?.name || newCategory?.value || '');
        
        if (!categoryString || !categoryString.trim()) {
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Lütfen bir kategori seçin veya girin', 'error');
            }
            return;
        }

        const categoryValue = categoryString.trim();

        try {
            const updatePromises = selectedItems.map(async (itemId) => {
                const updateData = { category: categoryValue };
                return await window.inventoryData.updateItem(itemId, updateData);
            });

            await Promise.all(updatePromises);

            // Show success message
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast(`${selectedItems.length} ürünün kategorisi "${categoryValue}" olarak güncellendi`, 'success');
            }

            // Close modal and refresh table
            this.closeCategoryUpdateModal();
            if (window.inventoryTable) {
                window.inventoryTable.update();
            }

            // Clear selection
            window.inventoryTable.clearSelection();

        } catch (error) {
            console.error('Category update error:', error);
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Kategori güncellenirken hata oluştu: ' + error.message, 'error');
            }
        }
    }

    async handlePriceUpdate(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const updateType = formData.get('priceType') || 'percentage';
        const value = parseFloat(formData.get('value') || document.getElementById('priceValue')?.value);
        
        if (isNaN(value)) {
            window.Utils.showToast('Lütfen geçerli bir değer girin', 'error');
            return;
        }

        const selectedItems = window.inventoryTable.getSelectedItems();
        let updatedCount = 0;
        let errorCount = 0;

        // Show loading
        const submitBtn = document.querySelector('button[type="submit"][form="priceUpdateForm"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Güncelleniyor...';
        submitBtn.disabled = true;

        try {
            for (const itemId of selectedItems) {
                try {
                    const item = window.inventoryData.getItem(itemId);
                    if (item) {
                        let newPrice = item.price || 0;
                        
                        switch (updateType) {
                            case 'percentage':
                                newPrice = newPrice * (1 + value / 100);
                                break;
                            case 'fixed':
                                newPrice = newPrice + value;
                                break;
                            case 'set':
                                newPrice = value;
                                break;
                        }
                        
                        newPrice = Math.max(0, newPrice); // Ensure price is not negative
                        await window.inventoryData.updateItem(itemId, { price: newPrice });
                        updatedCount++;
                    }
                } catch (error) {
                    console.error(`Error updating item ${itemId}:`, error);
                    errorCount++;
                }
            }

            this.closePriceUpdateModal();
            window.inventoryTable.clearSelection();
            
            if (errorCount === 0) {
                window.Utils.showToast(`${updatedCount} ürünün fiyatı güncellendi`, 'success');
            } else {
                window.Utils.showToast(`${updatedCount} ürün güncellendi, ${errorCount} hatada sorun oluştu`, 'warning');
            }
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleStockUpdate(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const updateType = formData.get('stockType') || 'add';
        const value = parseInt(formData.get('value') || document.getElementById('stockValue')?.value);
        const note = '';
        
        if (isNaN(value) || value < 0) {
            window.Utils.showToast('Lütfen geçerli bir miktar girin', 'error');
            return;
        }

        const selectedItems = window.inventoryTable.getSelectedItems();
        let updatedCount = 0;
        let errorCount = 0;

        // Show loading
        const submitBtn = document.querySelector('button[type="submit"][form="stockUpdateForm"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Güncelleniyor...';
        submitBtn.disabled = true;

        try {
            for (const itemId of selectedItems) {
                try {
                    const item = window.inventoryData.getItem(itemId);
                    if (item) {
                        let newStock = item.inventory || 0;
                        
                        switch (updateType) {
                            case 'add':
                                newStock = newStock + value;
                                break;
                            case 'subtract':
                                newStock = Math.max(0, newStock - value);
                                break;
                            case 'set':
                                newStock = value;
                                break;
                        }
                        
                        const updates = { 
                            inventory: newStock,
                            availableInventory: newStock // For compatibility
                        };
                        
                        await window.inventoryData.updateItem(itemId, updates);
                        
                        // Log stock change if note provided
                        if (note) {
                            console.log(`Stock updated for ${item.name}: ${item.inventory} -> ${newStock}. Note: ${note}`);
                        }
                        
                        updatedCount++;
                    }
                } catch (error) {
                    console.error(`Error updating item ${itemId}:`, error);
                    errorCount++;
                }
            }

            this.closeStockUpdateModal();
            window.inventoryTable.clearSelection();
            
            if (errorCount === 0) {
                window.Utils.showToast(`${updatedCount} ürünün stoğu güncellendi`, 'success');
            } else {
                window.Utils.showToast(`${updatedCount} ürün güncellendi, ${errorCount} hatada sorun oluştu`, 'warning');
            }
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleSupplierUpdate(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const newSupplier = formData.get('supplier') || document.getElementById('newSupplier')?.value;
        
        if (!newSupplier || !newSupplier.trim()) {
            window.Utils.showToast('Lütfen tedarikçi adı girin', 'error');
            return;
        }

        const selectedItems = window.inventoryTable.getSelectedItems();
        let updatedCount = 0;
        let errorCount = 0;

        // Show loading
        const submitBtn = document.querySelector('button[type="submit"][form="supplierUpdateForm"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Güncelleniyor...';
        submitBtn.disabled = true;

        try {
            for (const itemId of selectedItems) {
                try {
                    await window.inventoryData.updateItem(itemId, { 
                        supplier: newSupplier.trim() 
                    });
                    updatedCount++;
                } catch (error) {
                    console.error(`Error updating item ${itemId}:`, error);
                    errorCount++;
                }
            }

            this.closeSupplierUpdateModal();
            window.inventoryTable.clearSelection();
            
            if (errorCount === 0) {
                window.Utils.showToast(`${updatedCount} ürünün tedarikçisi güncellendi`, 'success');
            } else {
                window.Utils.showToast(`${updatedCount} ürün güncellendi, ${errorCount} hatada sorun oluştu`, 'warning');
            }
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    exportSelected() {
        const selectedItems = window.inventoryTable.getSelectedItems();
        
        if (selectedItems.size === 0) {
            window.Utils.showToast('Dışa aktarmak için ürün seçin', 'warning');
            return;
        }

        try {
            const items = [];
            selectedItems.forEach(itemId => {
                const item = window.inventoryData.getItem(itemId);
                if (item) {
                    items.push(item);
                }
            });

            if (items.length === 0) {
                window.Utils.showToast('Dışa aktarılacak ürün bulunamadı', 'error');
                return;
            }

            // Create CSV content
            const headers = [
                'Ürün Adı', 'Marka', 'Model', 'Kategori', 'Barkod', 
                'Stok', 'Min Stok', 'Fiyat', 'Tedarikçi', 'Garanti', 'Açıklama'
            ];

            const csvRows = items.map(item => [
                item.name || '',
                item.brand || '',
                item.model || '',
                item.category || '',
                item.barcode || '',
                item.inventory || 0,
                item.minInventory || 0,
                item.price || 0,
                item.supplier || '',
                item.warranty || 0,
                item.description || ''
            ]);

            const csvContent = [
                headers.join(','),
                ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `secili_urunler_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.closeActionsModal();
            window.Utils.showToast(`${items.length} ürün dışa aktarıldı`, 'success');

        } catch (error) {
            console.error('Export error:', error);
            window.Utils.showToast('Dışa aktarma sırasında hata oluştu', 'error');
        }
    }

    confirmDelete() {
        const selectedItems = window.inventoryTable.getSelectedItems();
        
        if (selectedItems.size === 0) {
            window.Utils.showToast('Silmek için ürün seçin', 'warning');
            return;
        }

        // Create a more detailed confirmation dialog
        const itemNames = [];
        selectedItems.forEach(itemId => {
            const item = window.inventoryData.getItem(itemId);
            if (item) {
                itemNames.push(item.name);
            }
        });

        const itemList = itemNames.slice(0, 5).map(name => `• ${name}`).join('<br>');
        const additionalItems = itemNames.length > 5 ? `<br>... ve ${itemNames.length - 5} ürün daha` : '';
        
        const confirmMessage = `
            <div class="space-y-4">
                <div class="text-gray-800">
                    <strong>${selectedItems.size} ürünü</strong> silmek istediğinizden emin misiniz?
                </div>
                <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div class="text-red-800 font-medium mb-2">⚠️ Bu işlem geri alınamaz</div>
                    <div class="text-sm text-red-700">
                        Silinecek ürünler:<br>
                        ${itemList}${additionalItems}
                    </div>
                </div>
            </div>
        `;

        // Use XEarModalWidget for better UX
        if (typeof XEarModalWidget !== 'undefined') {
            XEarModalWidget.confirm(
                'Ürünleri Sil',
                confirmMessage,
                () => this.deleteItems(),
                {
                    size: 'md',
                    confirmText: 'Sil',
                    cancelText: 'İptal'
                }
            );
        } else {
            // Fallback to basic confirm if XEarModalWidget is not available
            const basicMessage = `${selectedItems.size} ürünü silmek istediğinizden emin misiniz?\n\n` +
                `Bu işlem geri alınamaz.\n\n` +
                `Silinecek ürünler:\n${itemNames.slice(0, 5).join('\n')}` +
                (itemNames.length > 5 ? `\n... ve ${itemNames.length - 5} ürün daha` : '');
            
            if (confirm(basicMessage)) {
                this.deleteItems();
            }
        }
    }

    async deleteItems() {
        const selectedItems = window.inventoryTable.getSelectedItems();
        let deletedCount = 0;
        let errorCount = 0;

        try {
            // Process deletions sequentially to avoid overwhelming the API
            for (const itemId of selectedItems) {
                try {
                    await window.inventoryData.deleteItem(itemId);
                    deletedCount++;
                    console.log(`✅ Successfully deleted item ${itemId} (${deletedCount}/${selectedItems.size})`);
                } catch (error) {
                    console.error(`❌ Error deleting item ${itemId}:`, error);
                    errorCount++;
                }
            }

            // Refresh the table to show updated data
            if (window.inventoryTable) {
                window.inventoryTable.render();
            }

            this.closeActionsModal();
            window.inventoryTable.clearSelection();
            
            if (errorCount === 0) {
                window.Utils.showToast(`${deletedCount} ürün başarıyla silindi`, 'success');
            } else {
                window.Utils.showToast(`${deletedCount} ürün silindi, ${errorCount} üründe hata oluştu`, 'warning');
            }
        } catch (error) {
            console.error('Bulk delete error:', error);
            window.Utils.showToast('Silme işlemi sırasında hata oluştu', 'error');
        }
    }

    openUploadModal() {
        const modal = document.getElementById('bulkUploadModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    closeUploadModal() {
        const modal = document.getElementById('bulkUploadModal');
        if (modal) {
            modal.classList.add('hidden');
            const form = document.getElementById('bulkUploadForm');
            if (form) form.reset();
            this.clearPreview();
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Show selected file info
        const fileInfo = document.getElementById('selectedFileInfo');
        const fileName = document.getElementById('selectedFileName');
        if (fileInfo && fileName) {
            fileName.textContent = file.name;
            fileInfo.classList.remove('hidden');
        }

        // Enable upload button
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.disabled = false;
        }

        // Accept CSV and Excel files
        const isValidFile = file.type === 'text/csv' || 
                           file.name.endsWith('.csv') ||
                           file.type === 'application/vnd.ms-excel' ||
                           file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                           file.name.endsWith('.xlsx') ||
                           file.name.endsWith('.xls');

        if (!isValidFile) {
            window.Utils.showToast('Lütfen CSV veya Excel dosyası seçin', 'error');
            return;
        }

        // For CSV files, show preview
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                this.previewCSV(event.target.result);
            };
            reader.readAsText(file);
        } else {
            // For Excel files, show a message
            const previewContainer = document.getElementById('uploadPreview');
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p class="text-sm text-blue-800">
                            Excel dosyası seçildi. Yüklemek için "Ürünleri Yükle" butonuna tıklayın.
                        </p>
                    </div>
                `;
                previewContainer.classList.remove('hidden');
            }
        }
    }

    previewCSV(csvContent) {
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            window.Utils.showToast('CSV dosyası en az 2 satır içermelidir (başlık + veri)', 'error');
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const dataLines = lines.slice(1, 6); // Show first 5 rows

        let previewHTML = `
            <div class="mb-4">
                <h4 class="font-medium text-gray-900 mb-2">Dosya Önizlemesi (İlk 5 satır)</h4>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                ${headers.map(header => `<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">${header}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
        `;

        dataLines.forEach(line => {
            const cells = line.split(',').map(cell => cell.trim());
            previewHTML += `
                <tr>
                    ${cells.map(cell => `<td class="px-3 py-2 text-sm text-gray-900">${cell}</td>`).join('')}
                </tr>
            `;
        });

        previewHTML += `
                        </tbody>
                    </table>
                </div>
                <p class="text-sm text-gray-500 mt-2">Toplam ${lines.length - 1} satır veri bulundu.</p>
            </div>
        `;

        const previewContainer = document.getElementById('uploadPreview');
        if (previewContainer) {
            previewContainer.innerHTML = previewHTML;
            previewContainer.classList.remove('hidden');
        }
    }

    clearPreview() {
        const previewContainer = document.getElementById('uploadPreview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.classList.add('hidden');
        }
        
        const fileInfo = document.getElementById('selectedFileInfo');
        if (fileInfo) {
            fileInfo.classList.add('hidden');
        }
        
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.disabled = true;
        }
    }

    async handleBulkUpload(e) {
        if (e && e.preventDefault) e.preventDefault();

        const fileInput = document.getElementById('csvFile') || document.getElementById('bulkUploadFile');
        const file = fileInput ? fileInput.files[0] : null;
        
        if (!file) {
            window.Utils.showToast('Lütfen CSV dosyası seçin', 'error');
            return;
        }

        try {
            const csvContent = await this.readFileAsText(file);
            const result = await this.processBulkUpload(csvContent);
            
            this.closeUploadModal();
            window.Utils.showToast(`${result.success} ürün eklendi, ${result.errors} hata`, 'success');
            
        } catch (error) {
            console.error('Bulk upload error:', error);
            window.Utils.showToast('Toplu yükleme sırasında hata oluştu: ' + error.message, 'error');
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    async processBulkUpload(csvContent) {
        const lines = csvContent.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const dataLines = lines.slice(1);

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 0; i < dataLines.length; i++) {
            try {
                const cells = dataLines[i].split(',').map(cell => cell.trim());
                const itemData = {};

                // Map CSV columns to item properties
                headers.forEach((header, index) => {
                    const value = cells[index] || '';
                    switch (header) {
                        case 'name':
                        case 'ürün adı':
                        case 'product name':
                            itemData.name = value;
                            break;
                        case 'brand':
                        case 'marka':
                            itemData.brand = value;
                            break;
                        case 'model':
                            itemData.model = value;
                            break;
                        case 'category':
                        case 'kategori':
                            itemData.category = value;
                            break;
                        case 'barcode':
                        case 'barkod':
                            itemData.barcode = value;
                            break;
                        case 'serial':
                        case 'serialnumber':
                        case 'seri no':
                            itemData.serialNumber = value;
                            break;
                        case 'stock':
                        case 'inventory':
                        case 'stok':
                            itemData.inventory = parseInt(value) || 0;
                            break;
                        case 'minstock':
                        case 'min stok':
                            itemData.minInventory = parseInt(value) || 5;
                            break;
                        case 'price':
                        case 'fiyat':
                            itemData.price = parseFloat(value) || 0;
                            break;
                        case 'supplier':
                        case 'tedarikçi':
                            itemData.supplier = value;
                            break;
                        case 'warranty':
                        case 'garanti':
                            itemData.warranty = parseInt(value) || 0;
                            break;
                        case 'description':
                        case 'açıklama':
                            itemData.description = value;
                            break;
                    }
                });

                // Validate required fields
                if (!itemData.name || !itemData.brand) {
                    throw new Error(`Satır ${i + 2}: Ürün adı ve marka zorunludur`);
                }

                // Add item
                window.inventoryData.addItem(itemData);
                successCount++;

            } catch (error) {
                errorCount++;
                errors.push(`Satır ${i + 2}: ${error.message}`);
                console.error(`Row ${i + 2} error:`, error);
            }
        }

        // Show detailed errors if any
        if (errors.length > 0 && errors.length <= 5) {
            console.warn('Upload errors:', errors);
        }

        return { success: successCount, errors: errorCount };
    }

    downloadTemplate() {
        const headers = [
            'name',
            'brand', 
            'model',
            'category',
            'barcode',
            'serialNumber',
            'inventory',
            'minInventory',
            'price',
            'supplier',
            'warranty',
            'description'
        ];

        const sampleData = [
            'Örnek Ürün',
            'Örnek Marka',
            'Model123',
            'hearing_aid',
            '1234567890',
            'SN001',
            '10',
            '5',
            '1500.00',
            'Tedarikçi A',
            '24',
            'Örnek açıklama'
        ];

        const csvContent = [
            headers.join(','),
            sampleData.join(',')
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'inventory_template.csv';
        link.click();
    }
}

// Export for global use
window.InventoryBulk = InventoryBulk;