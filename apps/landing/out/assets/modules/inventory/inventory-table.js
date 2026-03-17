// Inventory Table Management Module
class InventoryTable {
    constructor() {
        this.currentSortField = 'name';
        this.currentSortDirection = 'asc';
        this.selectedItems = new Set();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for inventory updates
        window.addEventListener('inventoryUpdated', () => {
            this.update();
        });
    }

    update() {
        console.log('📊 Updating inventory table');
        this.render();
    }

    render() {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;

        const items = window.inventoryData.getFilteredItems();
        
        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="px-6 py-8 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <svg class="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m0 0V9a2 2 0 012-2h2m0 0V6a2 2 0 012-2h2.586a1 1 0 01.707.293l2.414 2.414A1 1 0 0016 7.414V9"></path>
                            </svg>
                            <p class="text-lg font-medium text-gray-900 mb-2">Ürün bulunamadı</p>
                            <p class="text-gray-500">Arama kriterlerinizi değiştirin veya yeni ürün ekleyin</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = items.map(item => this.renderRow(item)).join('');
        this.updateBulkActionsButton();
    }

    renderRow(item) {
        const isSelected = this.selectedItems.has(item.id);
        const categoryText = window.inventoryData.getCategoryText(item.category || item.type);
        const isHearing = window.inventoryData.isHearingCategory(item.category || item.type);
        const stockStatus = this.getStockStatus(item);
        
        return `
            <tr class="hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}" 
                onclick="window.inventoryTable.handleRowClick(event, '${item.id}')">
                <td class="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" 
                           class="item-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                           value="${item.id}" 
                           ${isSelected ? 'checked' : ''}
                           onchange="window.inventoryTable.handleItemSelection(event)">
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-full ${isHearing ? 'bg-blue-100' : 'bg-gray-100'} flex items-center justify-center">
                                <span class="text-sm font-medium ${isHearing ? 'text-blue-600' : 'text-gray-600'}">
                                    ${(item.name || '').charAt(0).toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${item.name || ''}</div>
                            <div class="text-sm text-gray-500">${item.model || ''}</div>
                            ${this.renderFeatureTags(item)}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.brand || ''}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getCategoryBadgeClass(item.category || item.type)}">
                        ${categoryText}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.barcode || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.serialNumber || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <span class="text-sm font-medium text-gray-900">${item.inventory || 0}</span>
                        <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stockStatus.class}">
                            ${stockStatus.text}
                        </span>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.minInventory || 0}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₺${(item.price || 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₺${((item.price || 0) * (item.inventory || 0)).toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex items-center space-x-2">
                        <button onclick="event.stopPropagation(); window.inventoryModal.openUpdateModal('${item.id}')" 
                                class="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50" 
                                title="Stok Güncelle">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                        </button>
                        <button onclick="event.stopPropagation(); window.inventoryTable.editItem('${item.id}')" 
                                class="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50" 
                                title="Düzenle">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="event.stopPropagation(); window.inventoryTable.viewDetails('${item.id}')" 
                                class="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50" 
                                title="Detaylar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                        </button>
                        <button onclick="event.stopPropagation(); deleteInventoryItem('${item.id}')" 
                                class="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50" 
                                title="Sil">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    getStockStatus(item) {
        const stock = item.inventory || 0;
        const minStock = item.minInventory || 0;
        
        if (stock === 0) {
            return { class: 'bg-red-100 text-red-800', text: 'Tükendi' };
        } else if (stock <= minStock) {
            return { class: 'bg-yellow-100 text-yellow-800', text: 'Düşük' };
        } else {
            return { class: 'bg-green-100 text-green-800', text: 'Normal' };
        }
    }

    getCategoryBadgeClass(category) {
        const classes = {
            'hearing_aid': 'bg-blue-100 text-blue-800',
            'accessory': 'bg-green-100 text-green-800',
            'battery': 'bg-yellow-100 text-yellow-800',
            'maintenance': 'bg-purple-100 text-purple-800'
        };
        return classes[category] || 'bg-gray-100 text-gray-800';
    }

    setupSorting() {
        this.updateSortIndicators();
    }

    sortTable(field) {
        if (this.currentSortField === field) {
            this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSortField = field;
            this.currentSortDirection = 'asc';
        }

        const items = window.inventoryData.getFilteredItems();
        items.sort((a, b) => {
            let aVal = a[field] || '';
            let bVal = b[field] || '';

            // Handle numeric fields
            if (field === 'inventory' || field === 'minInventory' || field === 'price') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else {
                aVal = aVal.toString().toLowerCase();
                bVal = bVal.toString().toLowerCase();
            }

            if (this.currentSortDirection === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });

        window.inventoryData.setFilteredItems(items);
        this.render();
        this.updateSortIndicators();
    }

    updateSortIndicators() {
        document.querySelectorAll('th[onclick]').forEach(th => {
            const field = th.getAttribute('onclick').match(/sortTable\('(.+?)'\)/)?.[1];
            const arrow = th.querySelector('.sort-arrow');
            
            if (arrow) {
                if (field === this.currentSortField) {
                    arrow.textContent = this.currentSortDirection === 'asc' ? '↑' : '↓';
                    arrow.classList.add('text-blue-600');
                } else {
                    arrow.textContent = '↕';
                    arrow.classList.remove('text-blue-600');
                }
            }
        });
    }

    handleRowClick(event, itemId) {
        // Prevent navigation if clicking on checkbox or action buttons
        if (event.target.type === 'checkbox' || event.target.tagName === 'BUTTON' || event.target.closest('button')) {
            return;
        }
        this.viewDetails(itemId);
    }

    handleItemSelection(event) {
        const itemId = event.target.value;
        if (event.target.checked) {
            this.selectedItems.add(itemId);
        } else {
            this.selectedItems.delete(itemId);
        }

        // Update select all checkbox
        const selectAllCheckbox = document.getElementById('selectAll');
        const allCheckboxes = document.querySelectorAll('.item-checkbox');
        const checkedCheckboxes = document.querySelectorAll('.item-checkbox:checked');
        
        if (selectAllCheckbox) {
            selectAllCheckbox.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < allCheckboxes.length;
            selectAllCheckbox.checked = checkedCheckboxes.length === allCheckboxes.length;
        }

        this.updateBulkActionsButton();
    }

    updateBulkActionsButton() {
        const bulkButton = document.querySelector('button[onclick*="openBulkActionsModal"]');
        if (bulkButton) {
            bulkButton.disabled = this.selectedItems.size === 0;
            bulkButton.classList.toggle('opacity-50', this.selectedItems.size === 0);
        }
    }

    editItem(itemId) {
        window.location.href = `product-details.html?id=${itemId}`;
    }

    viewDetails(itemId) {
        const item = window.inventoryData.getItem(itemId);
        if (!item) return;

        // Get features as array
        let features = [];
        if (item.features) {
            if (Array.isArray(item.features)) {
                features = item.features;
            } else if (typeof item.features === 'string') {
                features = item.features.split(',').map(f => f.trim()).filter(f => f);
            }
        }

        // Create features tags HTML
        const featuresHTML = features.length > 0 ? 
            features.map(feature => 
                `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${feature}</span>`
            ).join(' ') : 
            '<span class="text-gray-500 text-sm">Özellik belirtilmemiş</span>';

        // Get stock status
        const stockStatus = this.getStockStatus(item);

        // Create modern modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
                <!-- Header -->
                <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">${item.name || 'Ürün Adı'}</h3>
                                <p class="text-sm text-gray-500">${item.brand || ''} ${item.model || ''}</p>
                            </div>
                        </div>
                        <button onclick="this.closest('.fixed').remove()" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Body -->
                <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    <!-- Stock Status -->
                    <div class="mb-6 p-4 rounded-lg ${stockStatus.bgColor}">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <div class="w-8 h-8 ${stockStatus.iconBg} rounded-full flex items-center justify-center">
                                    ${stockStatus.icon}
                                </div>
                                <div>
                                    <p class="font-medium ${stockStatus.textColor}">${item.inventory || 0} adet stokta</p>
                                    <p class="text-sm ${stockStatus.textColor} opacity-75">Min: ${item.minInventory || 0} adet</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="text-lg font-bold text-gray-900">₺${(item.price || 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})}</p>
                                <p class="text-sm text-gray-500">Birim fiyat</p>
                            </div>
                        </div>
                    </div>

                    <!-- Details Grid -->
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <p class="text-sm font-medium text-gray-500">Kategori</p>
                                <p class="text-sm text-gray-900">${window.inventoryData.getCategoryText(item.category || item.type)}</p>
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-500">Barkod</p>
                                <p class="text-sm text-gray-900 font-mono">${item.barcode || '-'}</p>
                            </div>
                        </div>

                        ${item.supplier ? `
                        <div>
                            <p class="text-sm font-medium text-gray-500">Tedarikçi</p>
                            <p class="text-sm text-gray-900">${item.supplier}</p>
                        </div>
                        ` : ''}

                        ${item.warranty ? `
                        <div>
                            <p class="text-sm font-medium text-gray-500">Garanti</p>
                            <p class="text-sm text-gray-900">${item.warranty} ay</p>
                        </div>
                        ` : ''}

                        <!-- Features -->
                        <div>
                            <p class="text-sm font-medium text-gray-500 mb-2">Özellikler</p>
                            <div class="flex flex-wrap gap-2">
                                ${featuresHTML}
                            </div>
                        </div>

                        ${item.description ? `
                        <div>
                            <p class="text-sm font-medium text-gray-500">Açıklama</p>
                            <p class="text-sm text-gray-700 mt-1">${item.description}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div class="flex items-center justify-end space-x-3">
                        <button onclick="this.closest('.fixed').remove()" 
                                class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 transition-colors font-medium">
                            Kapat
                        </button>
                        <button onclick="this.closest('.fixed').remove(); window.inventoryTable.editItem('${item.id}')" 
                                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors font-medium flex items-center">
                            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                            </svg>
                            Düzenle
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    renderFeatureTags(item) {
        if (!item.features) return '';
        
        let features = [];
        if (Array.isArray(item.features)) {
            features = item.features;
        } else if (typeof item.features === 'string') {
            features = item.features.split(',').map(f => f.trim()).filter(f => f);
        }
        
        if (features.length === 0) return '';
        
        // Show max 3 features in table, with "..." if more
        const displayFeatures = features.slice(0, 3);
        const hasMore = features.length > 3;
        
        const tagsHTML = displayFeatures.map(feature => 
            `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-1">${feature}</span>`
        ).join('');
        
        const moreHTML = hasMore ? `<span class="text-xs text-gray-500">+${features.length - 3}</span>` : '';
        
        return `<div class="mt-1">${tagsHTML}${moreHTML}</div>`;
    }

    getStockStatus(item) {
        const stock = item.inventory || 0;
        const minStock = item.minInventory || 0;

        if (stock === 0) {
            return {
                class: 'bg-red-100 text-red-800',
                text: 'Tükendi',
                bgColor: 'bg-red-50',
                textColor: 'text-red-700',
                iconBg: 'bg-red-100',
                icon: '<svg class="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>'
            };
        } else if (stock <= minStock) {
            return {
                class: 'bg-yellow-100 text-yellow-800',
                text: 'Az Stok',
                bgColor: 'bg-yellow-50',
                textColor: 'text-yellow-700',
                iconBg: 'bg-yellow-100',
                icon: '<svg class="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>'
            };
        } else {
            return {
                class: 'bg-green-100 text-green-800',
                text: 'Yeterli',
                bgColor: 'bg-green-50',
                textColor: 'text-green-700',
                iconBg: 'bg-green-100',
                icon: '<svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>'
            };
        }
    }

    deleteItem(itemId) {
        console.log('🗑️ Delete item clicked:', itemId);
        const item = window.inventoryData.getItem(itemId);
        if (!item) {
            console.error('Item not found:', itemId);
            return;
        }

        console.log('📋 Item found:', item.name);
        // Show modern delete confirmation modal
        this.showDeleteConfirmation(item, itemId);
    }

    showDeleteConfirmation(item, itemId) {
        // Create modern confirmation modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div class="flex items-center mb-4">
                    <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                        <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd"/>
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM8 13a1 1 0 112 0 1 1 0 01-2 0z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900">Ürün Sil</h3>
                        <p class="text-sm text-gray-500">Bu işlem geri alınamaz</p>
                    </div>
                </div>
                
                <div class="mb-6">
                    <p class="text-gray-700">
                        <strong>"${item.name}"</strong> ürününü kalıcı olarak silmek istediğinizden emin misiniz?
                    </p>
                    <div class="mt-3 p-3 bg-red-50 rounded-lg">
                        <p class="text-sm text-red-700">
                            ⚠️ Bu ürünün tüm stok bilgileri ve geçmişi silinecektir.
                        </p>
                    </div>
                </div>
                
                <div class="flex space-x-3">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        İptal
                    </button>
                    <button onclick="window.inventoryTable.confirmDelete('${itemId}'); this.closest('.fixed').remove()" 
                            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        Evet, Sil
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async confirmDelete(itemId) {
        try {
            console.log('🗑️ Deleting item:', itemId);
            await window.inventoryData.deleteItem(itemId);
            
            // Trigger data update event
            window.inventoryData.dispatchUpdateEvent();
            
            // Re-apply filters to update filtered data
            if (window.inventoryFilters) {
                window.inventoryFilters.apply();
            }
            
            // Show success message
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Ürün başarıyla silindi', 'success');
            } else {
                console.log('✅ Ürün başarıyla silindi');
            }
            
        } catch (error) {
            console.error('Error deleting item:', error);
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Ürün silinirken hata oluştu', 'error');
            }
        }
    }

    getSelectedItems() {
        return this.selectedItems;
    }

    clearSelection() {
        this.selectedItems.clear();
        document.querySelectorAll('.item-checkbox').forEach(cb => cb.checked = false);
        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
        this.updateBulkActionsButton();
    }
}

// Export for global use
window.InventoryTable = InventoryTable;