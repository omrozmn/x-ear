// Module: product-serials-api.js
// Enhanced serial number modal with backend API integration
// This module extends product-serials.js with API persistence

import { inventoryApiService } from '../../../src/domain/inventory/api-service.ts';

const SERIAL_MODAL_ID = 'productSerialListModal';

/**
 * Build serial number modal HTML
 */
function buildSerialModalHtml(productName, count) {
  let inputsHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">';
  for (let i = 0; i < count; i++) {
    inputsHtml += `
      <div>
        <label class="block text-xs text-gray-600 mb-1">Seri #${i+1}</label>
        <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md" data-serial-index="${i}">
      </div>
    `;
  }
  inputsHtml += '</div>';

  return `
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[60vh] overflow-y-auto" role="dialog" aria-modal="true">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Seri No Listesi - ${productName}</h3>
        <button class="text-gray-500" data-serial-action="close">Kapat</button>
      </div>
      <p class="text-sm text-gray-600 mb-4">Lütfen mevcut stok kadar seri girin. Alanlar isteğe bağlıdır; yalnızca doldurulan seri numaraları kaydedilecektir.</p>
      <div id="productSerialInputs">${inputsHtml}</div>
      <div class="flex justify-end space-x-3 mt-4">
        <button class="px-4 py-2 bg-gray-200 rounded" data-serial-action="close">İptal</button>
        <button class="px-4 py-2 bg-blue-600 text-white rounded" id="saveProductSerialsBtn">
          <span id="saveBtnText">Kaydet</span>
        </button>
      </div>
      <div id="saveStatus" class="hidden mt-3 p-3 rounded-lg"></div>
    </div>
  `;
}

/**
 * Open serial number modal with API integration
 */
function openProductSerialListModalApi() {
  console.log('🔵 openProductSerialListModalApi called (API version)');
  console.log('🔵 window.currentProduct:', window.currentProduct);
  
  const currentProduct = window.currentProduct;
  if (!currentProduct) {
    console.error('❌ No currentProduct found');
    alert('Ürün bilgisi yüklenmedi. Lütfen sayfayı yenileyin.');
    return;
  }
  
  const availableCount = currentProduct.availableInventory != null 
    ? currentProduct.availableInventory 
    : (currentProduct.inventory != null ? currentProduct.inventory : 0);
  
  console.log('🔵 Available count:', availableCount);
  
  if (!availableCount || availableCount <= 0) {
    console.warn('⚠️ No inventory available');
    window.Utils && window.Utils.showToast && window.Utils.showToast('Mevcut stok sıfır, seri eklenemez', 'warning');
    return;
  }

  const count = Math.min(availableCount, 50);
  console.log('🔵 Creating modal for', count, 'items');
  
  // Prevent duplicate modal
  if (document.getElementById(SERIAL_MODAL_ID)) {
    console.warn('⚠️ Modal already exists');
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = SERIAL_MODAL_ID;
  overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  overlay.innerHTML = buildSerialModalHtml(currentProduct.name || 'Ürün', count);

  // Close when clicking overlay
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeProductSerialListModal();
  });

  document.body.appendChild(overlay);
  console.log('✅ Modal added to DOM');

  // Listen to inventory changes and update modal content dynamically
  function updateModalInputs(e) {
    console.log('🔄 updateModalInputs called! Event:', e?.type);
    
    const inventoryInput = document.getElementById('productInventory');
    if (!inventoryInput) {
      console.warn('⚠️ Inventory input not found!');
      return;
    }
    
    const newCount = parseInt(inventoryInput.value) || 0;
    const limitedCount = Math.min(newCount, 50);
    
    console.log('🔄 Inventory value:', newCount, '(limited to', limitedCount, ')');
    
    // Get current values from existing inputs
    const existingInputs = Array.from(overlay.querySelectorAll('[data-serial-index]'));
    const existingValues = existingInputs.map(input => input.value.trim());
    console.log('📝 Existing values:', existingValues);
    
    // Update the inputs container
    const inputsContainer = overlay.querySelector('#productSerialInputs');
    if (inputsContainer) {
      let inputsHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">';
      for (let i = 0; i < limitedCount; i++) {
        inputsHtml += `
          <div>
            <label class="block text-xs text-gray-600 mb-1">Seri #${i+1}</label>
            <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md" data-serial-index="${i}" value="${existingValues[i] || ''}">
          </div>
        `;
      }
      inputsHtml += '</div>';
      inputsContainer.innerHTML = inputsHtml;
      console.log('✅ Modal inputs updated to', limitedCount, 'fields');
    }
  }
  
  // Add event listener to inventory input
  const inventoryInput = document.getElementById('productInventory');
  console.log('🎯 Looking for inventory input...', inventoryInput ? 'FOUND' : 'NOT FOUND');
  
  if (inventoryInput) {
    console.log('✅ Adding listeners to inventory input');
    inventoryInput.addEventListener('input', updateModalInputs);
    inventoryInput.addEventListener('change', updateModalInputs);
  }

  // Keyboard: ESC to close
  function onKey(e) {
    if (e.key === 'Escape') closeProductSerialListModal();
  }
  document.addEventListener('keydown', onKey);

  // Wire close buttons
  overlay.querySelectorAll('[data-serial-action="close"]').forEach(btn => {
    btn.addEventListener('click', closeProductSerialListModal);
  });

  // Save handler with API integration
  const saveBtn = document.getElementById('saveProductSerialsBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async function onSave() {
      const inputs = Array.from(overlay.querySelectorAll('[data-serial-index]'));
      const entered = inputs.map(i => i.value.trim()).filter(v => v);
      
      if (entered.length === 0) {
        window.Utils && window.Utils.showToast && window.Utils.showToast('Eklemek için en az bir seri girin veya iptal edin', 'warning');
        return;
      }

      // Disable button and show loading state
      saveBtn.disabled = true;
      const btnText = document.getElementById('saveBtnText');
      const originalText = btnText.textContent;
      btnText.textContent = '⏳ Kaydediliyor...';

      try {
        console.log('💾 Saving serial numbers to API:', entered);
        
        // Call API to add serial numbers
        const result = await inventoryApiService.addSerialNumbers(currentProduct.id, entered);
        
        if (result.success) {
          console.log('✅ Serial numbers saved successfully:', result.data);
          
          // Update local product reference
          if (result.data) {
            currentProduct.availableInventory = result.data.available_inventory;
            currentProduct.totalInventory = result.data.total_inventory;
            currentProduct.availableSerials = result.data.available_serials || [];
          }
          
          // Dispatch event for UI updates
          window.dispatchEvent(new CustomEvent('inventoryUpdated', { 
            detail: { 
              product: currentProduct, 
              action: 'add_serials', 
              created: entered.length 
            } 
          }));
          
          // Show success message
          window.Utils && window.Utils.showToast && window.Utils.showToast(
            `✅ ${entered.length} adet seri numarası başarıyla kaydedildi`, 
            'success'
          );
          
          // Close modal
          closeProductSerialListModal();
          
          // Refresh form to update counts
          if (window.populateForm) {
            window.populateForm();
          }
        } else {
          throw new Error(result.error || 'Kayıt başarısız');
        }
      } catch (error) {
        console.error('❌ Failed to save serial numbers:', error);
        
        // Show error message
        const statusDiv = document.getElementById('saveStatus');
        if (statusDiv) {
          statusDiv.className = 'mt-3 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200';
          statusDiv.textContent = `❌ Hata: ${error.message}`;
          statusDiv.classList.remove('hidden');
        }
        
        window.Utils && window.Utils.showToast && window.Utils.showToast(
          `❌ Kayıt başarısız: ${error.message}`, 
          'error'
        );
        
        // Re-enable button
        saveBtn.disabled = false;
        btnText.textContent = originalText;
      }
    });
  }

  // Expose cleanup reference on overlay for removal
  overlay._cleanup = function() {
    document.removeEventListener('keydown', onKey);
    if (inventoryInput) {
      inventoryInput.removeEventListener('input', updateModalInputs);
      inventoryInput.removeEventListener('change', updateModalInputs);
    }
  };
}

/**
 * Close serial number modal
 */
function closeProductSerialListModal() {
  const modal = document.getElementById(SERIAL_MODAL_ID);
  if (!modal) return;
  if (modal._cleanup) modal._cleanup();
  modal.remove();
}

// Auto-init: expose functions to window
if (typeof window !== 'undefined') {
  window.openProductSerialListModalApi = openProductSerialListModalApi;
  window.closeProductSerialListModal = closeProductSerialListModal;
  
  // Override the legacy function with API version
  window.openProductSerialListModal = openProductSerialListModalApi;
  
  console.log('✅ Serial modal API functions loaded and ready');
}

export { openProductSerialListModalApi, closeProductSerialListModal };
