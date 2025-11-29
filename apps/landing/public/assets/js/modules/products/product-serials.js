// Module: product-serials.js
// Handles the serial number modal and creation of per-serial inventory items.

// Use Orval API from window object instead of ES6 imports

// Note: Using Orval's inventoryUpdateInventoryItem function directly
// If it's not available, the application will need to handle the error gracefully

const SERIAL_MODAL_ID = 'productSerialListModal';

function buildSerialModalHtml(productName, count, existingSerials = []) {
  let inputsHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">';
  for (let i = 0; i < count; i++) {
    const existingValue = existingSerials[i] || '';
    inputsHtml += `
      <div class="flex items-center gap-2" data-serial-row="${i}">
        <div class="flex-1">
          <label class="block text-xs text-gray-600 mb-1">Seri #${i+1}</label>
          <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md" data-serial-index="${i}" value="${existingValue}">
        </div>
        <button class="mt-5 p-2 text-red-600 hover:bg-red-50 rounded" onclick="clearSerialInput(${i})" title="Temizle">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    `;
  }
  inputsHtml += '</div>';

  return `
    <div class="bg-white rounded-lg p-6 w-full" style="max-width: 800px; max-height: 80vh; display: flex; flex-direction: column;" role="dialog" aria-modal="true">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Seri No Listesi - ${productName}</h3>
        <button class="text-gray-500 hover:text-gray-700" data-serial-action="close">Kapat</button>
      </div>
      <p class="text-sm text-gray-600 mb-4">Lütfen mevcut stok kadar seri girin. ${existingSerials.length > 0 ? `✅ ${existingSerials.length} adet seri numarası yüklendi.` : ''}</p>
      
      <!-- Arama ve Toplu Yükleme Butonları -->
      <div class="flex gap-3 mb-4">
        <div class="flex-1">
          <input type="text" id="serialSearchInput" placeholder="Seri no ara..." class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
        </div>
        <button class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-2" id="clearAllSerialsBtn" title="Tüm seri numaralarını temizle">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          Tümünü Temizle
        </button>
        <button class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center gap-2" id="bulkUploadBtn">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
          </svg>
          Toplu Yükle
        </button>
      </div>
      
      <!-- Scrollable content -->
      <div style="flex: 1; overflow-y: auto; margin-bottom: 1rem;" id="productSerialInputs">${inputsHtml}</div>
      
      <div class="flex justify-end space-x-3 pt-4 border-t">
        <button class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded" data-serial-action="close">İptal</button>
        <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded" id="saveProductSerialsBtn">Kaydet</button>
      </div>
    </div>
  `;
}

function openProductSerialListModal() {
  console.log('🔵 openProductSerialListModal called');
  console.log('🔵 window.currentProduct:', window.currentProduct);
  
  const currentProduct = window.currentProduct;
  if (!currentProduct) {
    console.error('❌ No currentProduct found');
    alert('Ürün bilgisi yüklenmedi. Lütfen sayfayı yenileyin.');
    return;
  }
  
  const availableCount = currentProduct.availableInventory != null ? currentProduct.availableInventory : (currentProduct.inventory != null ? currentProduct.inventory : 0);
  console.log('🔵 Available count:', availableCount);
  
  if (!availableCount || availableCount <= 0) {
    console.warn('⚠️ No inventory available');
    window.Utils && window.Utils.showToast && window.Utils.showToast('Mevcut stok sıfır, seri eklenemez', 'warning');
    return;
  }

  const count = Math.min(availableCount, 50);
  console.log('\ud83d\udd35 Creating modal for', count, 'items');
  
  // Load existing serial numbers
  const existingSerials = currentProduct.availableSerials || [];
  console.log('\ud83d\udd35 Existing serials:', existingSerials);
  
  // prevent duplicate modal
  if (document.getElementById(SERIAL_MODAL_ID)) {
    console.warn('\u26a0\ufe0f Modal already exists');
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = SERIAL_MODAL_ID;
  overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
  overlay.style.zIndex = 'var(--z-modal, 90)';
  overlay.innerHTML = buildSerialModalHtml(currentProduct.name || 'Ürün', count, existingSerials);

  // close when clicking overlay outside modal content
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeProductSerialListModal();
  });

  document.body.appendChild(overlay);
  console.log('✅ Modal added to DOM');

    // Listen to inventory changes and update modal content dynamically
  function updateModalInputs(e) {
    console.log('\ud83d\udd04 updateModalInputs called! Event:', e?.type);
    
    const inventoryInput = document.getElementById('productInventory');
    if (!inventoryInput) {
      console.warn('\u26a0\ufe0f Inventory input not found!');
      return;
    }
    
    const newCount = parseInt(inventoryInput.value) || 0;
    const limitedCount = Math.min(newCount, 50);
    
    console.log('\ud83d\udd04 Inventory value:', newCount, '(limited to', limitedCount, ')');
    
    // Get current values from existing inputs (preserve user's entries)
    const existingInputs = Array.from(overlay.querySelectorAll('[data-serial-index]'));
    const existingValues = existingInputs.map(input => input.value.trim());
    console.log('\ud83d\udcdd Existing values:', existingValues);
    
    // Update the inputs container
    const inputsContainer = overlay.querySelector('#productSerialInputs');
    if (inputsContainer) {
      let inputsHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">';
      for (let i = 0; i < limitedCount; i++) {
        inputsHtml += `
          <div class="flex items-center gap-2">
            <div class="flex-1">
              <label class="block text-xs text-gray-600 mb-1">Seri #${i+1}</label>
              <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md" data-serial-index="${i}" value="${existingValues[i] || ''}">
            </div>
            <button class="mt-5 p-2 text-red-600 hover:bg-red-50 rounded" onclick="clearSerialInput(${i})" title="Temizle">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
        `;
      }
      inputsHtml += '</div>';
      inputsContainer.innerHTML = inputsHtml;
      console.log('\u2705 Modal inputs updated to', limitedCount, 'fields');
    } else {
      console.error('\u274c productSerialInputs container not found!');
    }
  }
  
  // Add event listener to inventory input
  const inventoryInput = document.getElementById('productInventory');
  console.log('🎯 Looking for inventory input...', inventoryInput ? 'FOUND' : 'NOT FOUND');
  
  if (inventoryInput) {
    console.log('✅ Adding listeners to inventory input');
    inventoryInput.addEventListener('input', updateModalInputs);
    inventoryInput.addEventListener('change', updateModalInputs);
    
    // Test immediate call
    console.log('🧪 Testing updateModalInputs...');
    // Don't call it immediately, just log
  } else {
    console.error('❌ Cannot add listeners - inventory input not found!');
  }

  // keyboard: ESC to close
  function onKey(e) {
    if (e.key === 'Escape') closeProductSerialListModal();
  }
  document.addEventListener('keydown', onKey);

  // wire close buttons
  overlay.querySelectorAll('[data-serial-action="close"]').forEach(btn => {
    btn.addEventListener('click', closeProductSerialListModal);
  });

  // Arama özelliği
  const searchInput = overlay.querySelector('#serialSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase().trim();
      const rows = overlay.querySelectorAll('[data-serial-row]');
      
      rows.forEach(row => {
        const input = row.querySelector('[data-serial-index]');
        const value = input.value.toLowerCase();
        
        if (!searchTerm || value.includes(searchTerm)) {
          row.style.display = 'flex';
          if (searchTerm && value.includes(searchTerm)) {
            row.style.backgroundColor = '#fef3c7';
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            row.style.backgroundColor = '';
          }
        } else {
          row.style.display = 'none';
        }
      });
    });
  }

  // Tümünü Temizle butonu
  const clearAllBtn = overlay.querySelector('#clearAllSerialsBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', function() {
      const confirmed = confirm('Tüm seri numaralarını silmek istediğinizden emin misiniz?');
      if (confirmed) {
        const inputs = overlay.querySelectorAll('[data-serial-index]');
        inputs.forEach(input => {
          input.value = '';
        });
        window.Utils && window.Utils.showToast && window.Utils.showToast('Tüm seri numaraları temizlendi', 'success');
      }
    });
  }

  // Toplu yükleme butonu
  const bulkUploadBtn = overlay.querySelector('#bulkUploadBtn');
  if (bulkUploadBtn) {
    bulkUploadBtn.addEventListener('click', function() {
      openBulkUploadModal(overlay);
    });
  }

  // Save handler
  const saveBtn = document.getElementById('saveProductSerialsBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function onSave() {
      const inputs = Array.from(overlay.querySelectorAll('[data-serial-index]'));
      const entered = inputs.map(i => i.value.trim()).filter(v => v);
      
      // Allow empty serials (all deleted case)
      const wasEmpty = !currentProduct.availableSerials || currentProduct.availableSerials.length === 0;
      if (entered.length === 0 && wasEmpty) {
        window.Utils && window.Utils.showToast && window.Utils.showToast('Eklemek için en az bir seri girin veya iptal edin', 'warning');
        return;
      }

      // Check for duplicates
      const uniqueSerials = new Set();
      const duplicates = [];
      entered.forEach(serial => {
        if (uniqueSerials.has(serial)) {
          duplicates.push(serial);
        } else {
          uniqueSerials.add(serial);
        }
      });
      
      if (duplicates.length > 0) {
        window.Utils && window.Utils.showToast && window.Utils.showToast(
          `Tekrarlayan seri numaraları bulundu: ${duplicates.join(', ')}. Her seri no bir defa eklenebilir.`,
          'error'
        );
        return;
      }

      // Store serial numbers in the product's availableSerials array
      // DO NOT reduce stock - serials are just identifiers, stock stays the same
      const previousSerials = currentProduct.availableSerials || [];
      
      // Replace with new serials (allows deletion)
      currentProduct.availableSerials = entered;
      
      const deletedCount = previousSerials.length - entered.length;
      const action = entered.length === 0 ? 'all_deleted' : (deletedCount > 0 ? 'some_deleted' : 'added');
      console.log(`✅ Serial numbers updated: ${action}`, currentProduct.availableSerials);
      // NOTE: Stock (availableInventory) remains unchanged
      // Stock only decreases when device is assigned to patient

      // Save updated product with serials to BACKEND FIRST
      (async () => {
        try {
          // Use Orval wrapper for updating inventory item from window object
          try {
            if (!window.inventoryUpdateInventoryItem) {
              console.warn('⚠️ inventoryUpdateInventoryItem not available on window');
              throw new Error('inventoryUpdateInventoryItem not available');
            }
            
            const response = await window.inventoryUpdateInventoryItem(currentProduct.id, {
              availableSerials: currentProduct.availableSerials
            });
            
            if (response.status !== 200 && response.status !== 204) {
              console.warn('⚠️ Orval inventory update failed:', response.data?.error || 'Unknown error');
              throw new Error('Orval update failed');
            }
            
            console.log('✅ Serial numbers saved to product via Orval wrapper:', currentProduct.availableSerials);
          } catch (orvalError) {
            console.error('❌ Orval inventory update failed:', orvalError);
            
            // Fallback: Use APIConfig if available
            if (window.APIConfig && window.APIConfig.makeRequest) {
              try {
                await window.APIConfig.makeRequest(
                  `/api/inventory/${currentProduct.id}`,
                  'PUT',
                  { availableSerials: currentProduct.availableSerials }
                );
                console.log('✅ Serial numbers saved to product via APIConfig fallback:', currentProduct.availableSerials);
              } catch (apiError) {
                console.error('❌ APIConfig fallback failed:', apiError);
                console.warn('⚠️ Unable to save serial numbers to API - continuing with local storage only');
              }
            } else {
              console.warn('⚠️ No API fallback available - continuing with local storage only');
            }
          }

          // Then update localStorage
          const inventory = window.sampleData?.inventory || window.Storage?.load('inventory') || [];
          const productIndex = inventory.findIndex(item => item.id === currentProduct.id);
          if (productIndex !== -1) {
            inventory[productIndex] = currentProduct;
            if (window.Storage) {
              window.Storage.save('inventory', inventory);
            }
            if (window.sampleData) {
              window.sampleData.inventory = inventory;
            }
            localStorage.setItem(window.STORAGE_KEYS?.CRM_INVENTORY || 'xear_crm_inventory', JSON.stringify(inventory));
          }
          
          // Log activity
          if (window.logProductActivity) {
            let activityDesc = '';
            if (entered.length === 0) {
              activityDesc = 'Tüm seri numaraları silindi';
            } else if (deletedCount > 0) {
              activityDesc = `${deletedCount} seri numarası silindi, ${entered.length} seri numarası kaldı`;
            } else {
              activityDesc = `${entered.length} adet seri numarası eklendi`;
            }
            
            window.logProductActivity(
              currentProduct.id,
              entered.length === 0 ? 'serial_numbers_deleted' : 'serial_numbers_updated',
              activityDesc,
              { serials: entered, total: currentProduct.availableSerials.length, previousCount: previousSerials.length }
            );
          }
          
          const toastMsg = entered.length === 0 
            ? '✅ Tüm seri numaraları silindi' 
            : `✅ ${entered.length} adet seri numarası veritabanına kaydedildi`;
          window.dispatchEvent(new CustomEvent('inventoryUpdated', { detail: { product: currentProduct, action: 'serials_updated', count: entered.length } }));
          window.Utils && window.Utils.showToast && window.Utils.showToast(toastMsg, 'success');
          closeProductSerialListModal();
          
          // Refresh form to update counts (without navigation)
          window.populateForm && window.populateForm();
        } catch (error) {
          console.error('❌ Failed to save serials:', error);
          window.Utils && window.Utils.showToast && window.Utils.showToast('Seri numaraları kaydedilemedi', 'error');
        }
      })();

      // remove this handler
      saveBtn.removeEventListener('click', onSave);
    });
  }

  // expose a cleanup reference on overlay for removal
  overlay._cleanup = function() {
    document.removeEventListener('keydown', onKey);
    if (inventoryInput) {
      inventoryInput.removeEventListener('input', updateModalInputs);
      inventoryInput.removeEventListener('change', updateModalInputs);
    }
  };
}

function closeProductSerialListModal() {
  const modal = document.getElementById(SERIAL_MODAL_ID);
  if (!modal) return;
  if (modal._cleanup) modal._cleanup();
  modal.remove();
}

// Function to clear a specific serial input
function clearSerialInput(index) {
  const modal = document.getElementById(SERIAL_MODAL_ID);
  if (!modal) return;
  
  const input = modal.querySelector(`[data-serial-index="${index}"]`);
  if (input) {
    input.value = '';
    input.focus();
  }
}

// Toplu yükleme modal
function openBulkUploadModal(parentOverlay) {
  const bulkModalHtml = `
    <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center" id="bulkUploadModal" style="z-index: var(--z-modal-child, 100);">
      <div class="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-semibold text-gray-900">Toplu Seri No Yükle</h3>
          <button onclick="closeBulkUploadModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div class="space-y-6">
          <!-- Template Download -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <div class="flex-1">
                <h4 class="text-sm font-medium text-blue-900 mb-2">📝 Dosya Formatı</h4>
                <p class="text-sm text-blue-800 mb-3">• 1. Sütun: Seri No<br>• 2. Sütun: İşlem (1=Ekle, 2=Sil)</p>
                <button id="downloadTemplateBtn" class="inline-flex items-center px-4 py-2 bg-white border border-blue-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors">
                  <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                  </svg>
                  Taslak İndir (CSV)
                </button>
              </div>
            </div>
          </div>

          <!-- File Upload Area -->
          <div class="space-y-4">
            <label class="block text-sm font-medium text-gray-700">Excel/CSV Dosyası Yükle</label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer">
              <input type="file" id="csvFileInput" accept=".xlsx,.xls,.csv" class="hidden">
              <label for="csvFileInput" class="cursor-pointer block">
                <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"/>
                </svg>
                <p class="text-sm text-gray-600 mb-2">
                  <span class="font-medium text-blue-600">Dosya seçmek için tıklayın</span> veya sürükleyin
                </p>
                <p class="text-xs text-gray-500">Excel (.xlsx, .xls) veya CSV dosyası</p>
              </label>
            </div>

            <!-- Selected File Info -->
            <div id="selectedFileInfo" class="hidden bg-green-50 border border-green-200 rounded-lg p-3">
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                <span class="text-sm text-green-800 font-medium" id="selectedFileName"></span>
              </div>
            </div>
          </div>

          <!-- Preview Area -->
          <div id="uploadPreview" class="hidden space-y-4">
            <div class="border-t pt-4">
              <h4 class="text-sm font-medium text-gray-900 mb-3">📊 Önizleme (İlk 5 satır)</h4>
              <div class="overflow-x-auto border border-gray-200 rounded-lg">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead id="previewTableHead" class="bg-gray-50">
                  </thead>
                  <tbody id="previewTableBody" class="bg-white divide-y divide-gray-200">
                  </tbody>
                </table>
              </div>
              <p class="text-sm text-gray-600 mt-3">
                Toplam <span id="totalRowsCount" class="font-semibold text-gray-900">0</span> satır veri bulundu
              </p>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button type="button" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors" onclick="closeBulkUploadModal()">
            İptal
          </button>
          <button type="button" id="processCsvBtn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center" disabled>
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Yükle ve İşle
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', bulkModalHtml);
  
  const bulkModal = document.getElementById('bulkUploadModal');
  const fileInput = bulkModal.querySelector('#csvFileInput');
  const uploadBtn = bulkModal.querySelector('#processCsvBtn');
  
  // Taslak indirme
  bulkModal.querySelector('#downloadTemplateBtn').addEventListener('click', function() {
    const csv = 'Seri No,İşlem (1=Ekle 2=Sil)\nÖRNEK123,1\nÖRNEK456,1\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'seri_no_taslak.csv';
    link.click();
  });

  // Dosya seçme ve önizleme
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();

    // Dosya bilgisini göster
    const fileInfo = bulkModal.querySelector('#selectedFileInfo');
    const fileNameSpan = bulkModal.querySelector('#selectedFileName');
    fileNameSpan.textContent = fileName;
    fileInfo.classList.remove('hidden');

    // CSV ise önizleme göster
    if (fileExtension === 'csv') {
      const reader = new FileReader();
      reader.onload = function(event) {
        previewCSV(event.target.result, bulkModal);
        uploadBtn.disabled = false;
      };
      reader.readAsText(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Excel dosyası için önizleme göster
      const reader = new FileReader();
      reader.onload = function(event) {
        // SheetJS kütüphanesi yoksa basit önizleme göster
        const previewDiv = bulkModal.querySelector('#uploadPreview');
        const totalCount = bulkModal.querySelector('#totalRowsCount');
        const previewBody = bulkModal.querySelector('#previewTableBody');
        const previewHead = bulkModal.querySelector('#previewTableHead');
        
        previewHead.innerHTML = '<tr><th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Seri No</th><th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">İşlem</th></tr>';
        previewBody.innerHTML = '<tr><td colspan="2" class="px-4 py-2 text-sm text-gray-600 text-center">Excel dosyası yüklendi. "Yükle ve İşle" butonuna tıklayın.</td></tr>';
        totalCount.textContent = '?';
        previewDiv.classList.remove('hidden');
        
        uploadBtn.disabled = false;
      };
      reader.readAsArrayBuffer(file);
    }
  });
  
  // CSV işleme
  bulkModal.querySelector('#processCsvBtn').addEventListener('click', function() {
    const fileInput = bulkModal.querySelector('#csvFileInput');
    if (!fileInput.files.length) {
      window.Utils && window.Utils.showToast && window.Utils.showToast('Lütfen bir CSV dosyası seçin', 'warning');
      return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const text = e.target.result;
      const lines = text.split('\n').slice(1).filter(line => line.trim()); // Skip header and empty lines
      
      const inputs = parentOverlay.querySelectorAll('[data-serial-index]');
      let addedCount = 0;
      let removedCount = 0;
      let skippedCount = 0;
      let duplicateCount = 0;
      
      lines.forEach(line => {
        const [serial, action] = line.split(',').map(s => s.trim());
        if (!serial) return;
        
        if (action === '1') {
          // Önce bu seri no zaten var mı kontrol et
          let alreadyExists = false;
          for (let i = 0; i < inputs.length; i++) {
            if (inputs[i].value.trim() === serial) {
              alreadyExists = true;
              duplicateCount++;
              break;
            }
          }
          
          if (alreadyExists) {
            // Zaten var, ekleme
            return;
          }
          
          // Ekle - sadece boş alanlara ekle
          let added = false;
          for (let i = 0; i < inputs.length; i++) {
            if (!inputs[i].value.trim()) {
              inputs[i].value = serial;
              addedCount++;
              added = true;
              break;
            }
          }
          if (!added) {
            skippedCount++;
          }
        } else if (action === '2') {
          // Sil - bu seri noyu bul ve temizle
          inputs.forEach(input => {
            if (input.value === serial) {
              input.value = '';
              removedCount++;
            }
          });
        }
      });
      
      // Immediately update currentProduct with new serial values
      const allSerials = Array.from(inputs).map(i => i.value.trim()).filter(v => v);
      if (window.currentProduct) {
        window.currentProduct.availableSerials = allSerials;
        console.log('✅ Bulk upload: Updated currentProduct.availableSerials:', allSerials);
      }
      
      closeBulkUploadModal();
      
      let message = '';
      if (addedCount > 0) message += `${addedCount} seri eklendi`;
      if (removedCount > 0) message += (message ? ', ' : '') + `${removedCount} seri silindi`;
      if (duplicateCount > 0) message += (message ? '. ' : '') + `${duplicateCount} seri zaten var (atlandı)`;
      if (skippedCount > 0) message += (message ? '. ' : '') + `${skippedCount} seri atlandı (boş alan yok)`;
      
      const hasWarning = skippedCount > 0 || duplicateCount > 0;
      window.Utils && window.Utils.showToast && window.Utils.showToast(message || 'İşlem tamamlandı', hasWarning ? 'warning' : 'success');
    };
    
    reader.readAsText(file);
  });
}

// CSV önizleme fonksiyonu
function previewCSV(csvContent, modalElement) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    window.Utils && window.Utils.showToast && window.Utils.showToast('CSV dosyası boş', 'warning');
    return;
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const dataLines = lines.slice(1, Math.min(6, lines.length)); // İlk 5 veri satırı

  // Başlıkları oluştur
  const headHTML = `
    <tr>
      ${headers.map(header => `<th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">${header}</th>`).join('')}
    </tr>
  `;

  // Veri satırlarını oluştur
  const bodyHTML = dataLines.map(line => {
    const cells = line.split(',').map(cell => cell.trim());
    return `
      <tr>
        ${cells.map(cell => `<td class="px-4 py-2 text-sm text-gray-900">${cell}</td>`).join('')}
      </tr>
    `;
  }).join('');

  // Önizleme alanını güncelle
  const previewDiv = modalElement.querySelector('#uploadPreview');
  const tableHead = modalElement.querySelector('#previewTableHead');
  const tableBody = modalElement.querySelector('#previewTableBody');
  const totalCount = modalElement.querySelector('#totalRowsCount');

  tableHead.innerHTML = headHTML;
  tableBody.innerHTML = bodyHTML;
  totalCount.textContent = lines.length - 1; // Başlık hariç
  previewDiv.classList.remove('hidden');
}

function closeBulkUploadModal() {
  const modal = document.getElementById('bulkUploadModal');
  if (modal) modal.remove();
}

// Auto-init when module loaded - just expose functions to window
if (typeof window !== 'undefined') {
  window.openProductSerialListModal = openProductSerialListModal;
  window.closeProductSerialListModal = closeProductSerialListModal;
  window.clearSerialInput = clearSerialInput;
  window.closeBulkUploadModal = closeBulkUploadModal;
  console.log('✅ Serial modal functions loaded and ready');
}

// Export removed - functions exposed via window object for compatibility
