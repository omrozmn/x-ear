/**
 * Sales Edit Module
 * Handles editing existing sales records
 */
export class SalesEditModule {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Opens the edit sale modal
   */
  async openEditSaleModal(saleId, patientId) {
    try {
      // Instead of the traditional sale metadata edit form, reuse the Device Assignment modal
      // so staff can assign devices in the exact same UI used in the Devices tab. We will
      // preselect and lock the assignment reason to 'sale' and inject the saleId into the
      // assignment form so the backend (or future enhancements) can link assignments to
      // this existing sale.

      // Open device assignment modal using global helper if available
      if (typeof window.assignDevice === 'function') {
        window.assignDevice(patientId);

        // Wait for the modal and form to be present in the DOM. Retry for a short period.
        const maxRetries = 20;
        let retries = 0;
        const waitForForm = () => new Promise((resolve) => {
          const interval = setInterval(() => {
            const form = document.getElementById('assignDeviceForm');
            if (form) {
              clearInterval(interval);
              resolve(form);
            } else if (++retries >= maxRetries) {
              clearInterval(interval);
              resolve(null);
            }
          }, 100);
        });

        const form = await waitForForm();
        if (!form) {
          this.showToast('Atama formu yüklenemedi', 'error');
          return;
        }

        // Preselect 'sale' as assignment reason and disable changing it
        const reasonSelect = form.querySelector('#assignmentReason') || form.querySelector('[name="assignmentReason"]');
        if (reasonSelect) {
          // Try to set a visible Turkish label if options differ; prefer value 'sale' if present
          try {
            reasonSelect.value = reasonSelect.querySelector('option[value="sale"]') ? 'sale' : (reasonSelect.querySelector('option[value="satın_alma"]') ? 'satın_alma' : reasonSelect.value);
          } catch (e) { /* ignore */ }
          reasonSelect.setAttribute('disabled', 'disabled');
          // Trigger change so the modal shows pricing sections for sale
          const evt = new Event('change', { bubbles: true });
          reasonSelect.dispatchEvent(evt);
        }

        // Inject hidden saleId input so the assignment submission includes sale context
        let saleIdInput = form.querySelector('input[name="saleId"]');
        if (!saleIdInput) {
          saleIdInput = document.createElement('input');
          saleIdInput.type = 'hidden';
          saleIdInput.name = 'saleId';
          saleIdInput.value = saleId;
          form.appendChild(saleIdInput);
        } else {
          saleIdInput.value = saleId;
        }

        // Add visible sale ID display for confirmation
        let saleIdDisplay = form.querySelector('#saleIdDisplay');
        if (!saleIdDisplay) {
          const displayDiv = document.createElement('div');
          displayDiv.className = 'mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg';
          displayDiv.innerHTML = `
            <div class="flex items-center">
              <svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <p class="text-sm font-medium text-blue-900">Satış Düzenleme</p>
                <p class="text-xs text-blue-700">Satış ID: <span class="font-mono font-bold">${saleId}</span></p>
              </div>
            </div>
          `;
          // Insert after assignment reason section
          const reasonSection = form.querySelector('.mb-6:has(#assignmentReason)') || form.querySelector('.mb-6');
          if (reasonSection) {
            reasonSection.after(displayDiv);
          } else {
            form.insertBefore(displayDiv, form.firstChild);
          }

          // Add change device button right after the display div
          const buttonDiv = document.createElement('div');
          buttonDiv.className = 'mb-4';
          buttonDiv.innerHTML = `
            <button type="button" id="changeDeviceBtn" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
              <i class="fas fa-exchange-alt mr-1"></i>Cihazı Değiştir
            </button>
          `;
          displayDiv.after(buttonDiv);
        }

        // Optionally pre-select the ear/mode if the sale already has device assignments
        try {
          const sale = await this.fetchSaleData(saleId, patientId);
          if (sale && Array.isArray(sale.devices) && sale.devices.length > 0) {
            // Check if this is a bilateral sale by looking at all devices
            const deviceEars = sale.devices.map(device => (device.ear || device.side || '').toLowerCase());
            const hasBothEars = deviceEars.includes('left') && deviceEars.includes('right');
            const hasBothValue = deviceEars.includes('both');
            
            let selectedEar = null;
            
            if (hasBothValue || hasBothEars) {
              // This is a bilateral sale
              selectedEar = 'both';
            } else if (deviceEars.includes('left')) {
              selectedEar = 'left';
            } else if (deviceEars.includes('right')) {
              selectedEar = 'right';
            }
            
            if (selectedEar) {
              const earRadio = document.querySelector(`#assignEar${selectedEar === 'left' ? 'Left' : selectedEar === 'right' ? 'Right' : 'Both'}`);
              if (earRadio) {
                earRadio.checked = true;
                earRadio.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`Pre-selected ear: ${selectedEar} for sale ${saleId}`);
              }
            }
          }

          // Populate form with existing sale data
          if (sale) {
            // Wait a bit for the form to be fully loaded
            setTimeout(() => {
              this.populateFormWithSaleData(sale, form);
            }, 500);
          }
        } catch (e) {
          // Non-fatal — we still allow the user to select devices manually
          console.debug('Could not prefill form with sale data for edit modal', e);
        }

        return;
      }

      // Fallback: Original edit modal if device assignment modal is unavailable
      const sale = await this.fetchSaleData(saleId, patientId);
      
      if (!sale) {
        this.showToast('Satış bulunamadı', 'error');
        return;
      }

      const modal = document.createElement('div');
      modal.id = 'editSaleModal';
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-2xl font-bold text-gray-900">Satışı Düzenle - ${sale.id}</h2>
              <button onclick="this.closest('#editSaleModal').remove()" 
                      class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-2xl"></i>
              </button>
            </div>

            <form id="edit-sale-form" class="space-y-6">
              <!-- Sale Date -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Satış Tarihi</label>
                <input type="date" id="edit-sale-date" name="saleDate" 
                       value="${sale.date ? new Date(sale.date).toISOString().split('T')[0] : ''}"
                       class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" required>
              </div>

              <!-- Payment Method -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Ödeme Yöntemi</label>
                <select id="edit-payment-method" name="paymentMethod" 
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" required>
                  <option value="cash" ${sale.paymentMethod === 'cash' ? 'selected' : ''}>Nakit</option>
                  <option value="card" ${sale.paymentMethod === 'card' ? 'selected' : ''}>Kredi Kartı</option>
                  <option value="transfer" ${sale.paymentMethod === 'transfer' ? 'selected' : ''}>Havale/EFT</option>
                  <option value="installment" ${sale.paymentMethod === 'installment' ? 'selected' : ''}>Taksit</option>
                </select>
              </div>

              <!-- Discount -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">İndirim Tutarı (TL)</label>
                <input type="number" id="edit-discount" name="discount" step="0.01" min="0"
                       value="${sale.discountAmount || 0}"
                       class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
              </div>

              <!-- SGK Coverage -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">SGK Desteği (TL)</label>
                <input type="number" id="edit-sgk" name="sgkCoverage" step="0.01" min="0"
                       value="${sale.sgkCoverage || 0}"
                       class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
              </div>

              <!-- Notes -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
                <textarea id="edit-notes" name="notes" rows="3"
                          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">${sale.notes || ''}</textarea>
              </div>

              <!-- Totals Summary (Read-only) -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h3 class="text-sm font-semibold mb-2">Tutar Özeti</h3>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Satış Tutarı (Hasta Ödemesi):</span>
                    <span class="font-medium">${(sale.totalAmount || 0).toLocaleString('tr-TR')} TL</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">İndirim:</span>
                    <span class="font-medium text-red-600">-${(sale.discountAmount || 0).toLocaleString('tr-TR')} TL</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">SGK Desteği:</span>
                    <span class="font-medium text-green-600">-${(sale.sgkCoverage || 0).toLocaleString('tr-TR')} TL</span>
                  </div>
                  <div class="flex justify-between border-t pt-1 mt-1">
                    <span class="font-semibold">Net Tutar:</span>
                    <span class="font-bold text-blue-600">${(sale.finalAmount || 0).toLocaleString('tr-TR')} TL</span>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex justify-end space-x-3">
                <button type="button" onclick="this.closest('#editSaleModal').remove()" 
                        class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  İptal
                </button>
                <button type="submit" 
                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <i class="fas fa-save mr-2"></i>Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Add form submit handler
      document.getElementById('edit-sale-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleEditSaleSubmit(saleId, patientId);
      });

      // Add discount/SGK change handlers to update totals
      ['edit-discount', 'edit-sgk'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
          this.updateEditFormTotals(sale);
        });
      });

    } catch (error) {
      console.error('Failed to open edit sale modal:', error);
      this.showToast('Satış düzenleme formu açılamadı', 'error');
    }
  }

  /**
   * Updates the totals in the edit form based on discount and SGK values
   */
  updateEditFormTotals(originalSale) {
    const discount = parseFloat(document.getElementById('edit-discount').value) || 0;
    const sgk = parseFloat(document.getElementById('edit-sgk').value) || 0;
    const finalAmount = (originalSale.totalAmount || 0) - discount - sgk;

    // Update the totals display (simplified - in real implementation would update DOM)
    console.log('Updated totals:', { discount, sgk, finalAmount });
  }

  /**
   * Handles the edit sale form submission
   */
  async handleEditSaleSubmit(saleId, patientId) {
    try {
      const formData = {
        sale_date: document.getElementById('edit-sale-date').value,
        payment_method: document.getElementById('edit-payment-method').value,
        discount_amount: parseFloat(document.getElementById('edit-discount').value) || 0,
        sgk_coverage: parseFloat(document.getElementById('edit-sgk').value) || 0,
        notes: document.getElementById('edit-notes').value
      };

      const response = await this.apiClient.patch(`/api/patients/${patientId}/sales/${saleId}`, formData);
      
      if (response.success) {
        this.showToast('Satış güncellendi', 'success');
        this.closeModal('editSaleModal');
        // Trigger refresh of sales table
        if (window.salesManagement && window.salesManagement.refreshSalesTable) {
          window.salesManagement.refreshSalesTable(patientId);
        }
      } else {
        throw new Error(response.error || 'Satış güncellenemedi');
      }
    } catch (error) {
      console.error('Sale update failed:', error);
      this.showToast('Satış güncellenemedi: ' + error.message, 'error');
    }
  }

  /**
   * Fetch sale data from API
   */
  async fetchSaleData(saleId, patientId) {
    try {
      const response = await this.apiClient.get(`/api/patients/${patientId}/sales`);
      const sales = response?.data || response || [];
      return sales.find(s => s.id === saleId);
    } catch (error) {
      console.error('Failed to fetch sale data:', error);
      return null;
    }
  }

  /**
   * Close a modal by ID
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Populate the device assignment form with existing sale data for editing
   */
  populateFormWithSaleData(sale, form) {
    try {
      console.log('Populating form with sale data:', sale);

      // Store original device info for comparison during device change
      if (sale.devices && sale.devices.length > 0) {
        const originalDevice = sale.devices[0];
        form.dataset.originalDeviceId = originalDevice.id || originalDevice.deviceId || '';
        form.dataset.originalInventoryId = originalDevice.inventoryId || '';
        form.dataset.originalSerialNumber = originalDevice.serialNumber || '';
        console.log('Stored original device info:', {
          deviceId: form.dataset.originalDeviceId,
          inventoryId: form.dataset.originalInventoryId,
          serialNumber: form.dataset.originalSerialNumber
        });
      }

      // Add editable fields for sale amounts
      this.addEditableSaleFields(form, sale);

      // Pre-select device if available
      if (sale.devices && sale.devices.length > 0) {
        const device = sale.devices[0]; // Assume first device for now
        this.preselectDeviceInForm(device, form);
      }

      // Populate pricing fields
      this.populatePricingFields(sale, form);

    } catch (error) {
      console.error('Error populating form with sale data:', error);
    }
  }

  /**
   * Calculate paid amount from payment records (same logic as renderPaymentMethods)
   */
  calculatePaidAmountFromRecords(sale) {
    // If sale has payment records, sum them up
    if (sale.paymentRecords && sale.paymentRecords.length > 0) {
      // Show only paid records for consistency with payment history display
      const paidRecords = sale.paymentRecords.filter(r => (r.status || 'paid') === 'paid');
      return paidRecords.reduce((total, record) => total + (record.amount || 0), 0);
    }
    
    // Fallback to sale.paidAmount or sale.paid_amount
    return sale.paidAmount || sale.paid_amount || 0;
  }

  /**
   * Calculate display total - same logic as sales detail modal for consistency
   */
  calculateDisplayTotal(sale) {
    // Backend'den gelen patient_payment değerini öncelikle kullan
    const patientPayment = sale.patient_payment || sale.patientPayment;
    
    if (patientPayment && patientPayment > 0) {
      return patientPayment;
    }
    
    // Eğer patient_payment yoksa, manuel hesaplama yap
    const totalAmount = sale.totalAmount || sale.total_amount || 0;
    const sgkCoverage = sale.sgkCoverage || sale.sgk_coverage || sale.total_sgk_support || 0;
    const discountAmount = sale.discountAmount || sale.discount_amount || 0;
    
    // Hasta ödemesi = Toplam tutar - SGK kapsamı - İndirim
    const calculatedPatientPayment = Math.max(0, totalAmount - sgkCoverage - discountAmount);
    
    return calculatedPatientPayment;
  }

  /**
   * Add editable fields for sale amounts (tutar, tahsil edilen, kalan)
   */
  addEditableSaleFields(form, sale) {
    // Hide the conflicting down payment section from device-management.js
    const downPaymentSection = form.querySelector('#downPaymentSection');
    if (downPaymentSection) {
      downPaymentSection.style.display = 'none';
    }

    // Hide pricing section initially for editing (only show when changing device)
    const pricingSection = form.querySelector('#pricingSection');
    if (pricingSection) {
      pricingSection.style.display = 'none';
    }

    // Calculate paid amount using the same logic as payment history display
    const calculatedPaidAmount = this.calculatePaidAmountFromRecords(sale);
    
    // Calculate patient payment using the same logic as sales detail modal
    const patientPaymentAmount = this.calculateDisplayTotal(sale);

    // Create additional fields section
    const additionalFields = document.createElement('div');
    additionalFields.className = 'mb-6';
    additionalFields.innerHTML = `
      <label class="block text-sm font-medium text-gray-700 mb-2">Satış Tutarları</label>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-xs text-gray-600 mb-1">Satış Tutarı (Hasta Ödemesi) (₺)</label>
          <input type="number" name="totalAmount" id="editTotalAmount" step="0.01" min="0"
                 class="w-full border border-gray-300 rounded-md px-3 py-2"
                 value="${patientPaymentAmount.toFixed(2)}">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Tahsil Edilen (₺)</label>
          <input type="number" name="paidAmount" id="editPaidAmount" step="0.01" min="0"
                 class="w-full border border-gray-300 rounded-md px-3 py-2"
                 value="${calculatedPaidAmount.toFixed(2)}">
        </div>
        <div>
          <label class="block text-xs text-gray-600 mb-1">Kalan Tutar (₺)</label>
          <input type="number" name="remainingAmount" id="editRemainingAmount" step="0.01" min="0" readonly
                 class="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                 value="${((sale.totalAmount || sale.total_list_price || 0) - calculatedPaidAmount).toFixed(2)}">
        </div>
      </div>
    `;

    // Insert after pricing section (which is now hidden)
    if (pricingSection) {
      pricingSection.after(additionalFields);
    }

    // Add event listeners
    const totalAmountEl = additionalFields.querySelector('#editTotalAmount');
    const paidAmountEl = additionalFields.querySelector('#editPaidAmount');
    const remainingAmountEl = additionalFields.querySelector('#editRemainingAmount');

    // Update remaining amount when values change
    const updateRemaining = () => {
      const total = parseFloat(totalAmountEl.value) || 0;
      const paid = parseFloat(paidAmountEl.value) || 0;
      remainingAmountEl.value = Math.max(0, total - paid).toFixed(2);
    };

    totalAmountEl.addEventListener('input', updateRemaining);
    paidAmountEl.addEventListener('input', updateRemaining);

    // Change device button event listener
    const changeDeviceBtn = document.getElementById('changeDeviceBtn');
    if (changeDeviceBtn) {
      changeDeviceBtn.addEventListener('click', () => {
        const deviceListContainer = form.querySelector('#deviceListContainer');
        const pricingSection = form.querySelector('#pricingSection');

        if (deviceListContainer && pricingSection) {
          if (deviceListContainer.style.display === 'none') {
            // Show device selection (but keep pricing section hidden in edit mode)
            deviceListContainer.style.display = 'grid';
            // In edit mode, don't show pricing section - only allow editing total/paid amounts
            pricingSection.style.display = 'none';
            changeDeviceBtn.innerHTML = '<i class="fas fa-times mr-1"></i>Cihaz Seçimini İptal';
          } else {
            // Hide device selection
            deviceListContainer.style.display = 'none';
            changeDeviceBtn.innerHTML = '<i class="fas fa-exchange-alt mr-1"></i>Cihazı Değiştir';
          }
        }
      });
    }

    // Initially hide device selection and pricing
    const deviceListContainer = form.querySelector('#deviceListContainer');
    if (deviceListContainer) {
      deviceListContainer.style.display = 'none';
    }

    // Change submit button text for editing
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Satışı Güncelle';
    }

    // Mark form as edit mode to avoid required device selection
    form.dataset.editMode = 'true';
  }

  /**
   * Pre-select device in the form based on existing sale device
   */
  preselectDeviceInForm(device, form) {
    try {
      console.log('Pre-selecting device in form:', device);

      // Find matching device in inventory options
      const deviceOptions = form.querySelectorAll('.device-option');
      let matchedOption = null;

      // Try to match by multiple criteria in order of preference
      for (const option of deviceOptions) {
        const optionInventoryId = option.dataset.inventoryId;
        const optionSerial = option.dataset.serial;
        const optionBarcode = option.dataset.barcode;
        const optionBrand = option.dataset.brand;
        const optionModel = option.dataset.model;

        // Priority 1: Match by inventory ID if available
        if (device.inventoryId && optionInventoryId === device.inventoryId) {
          matchedOption = option;
          console.log('Matched by inventory ID:', device.inventoryId);
          break;
        }

        // Priority 2: Match by serial number if available
        if (device.serialNumber && optionSerial === device.serialNumber) {
          matchedOption = option;
          console.log('Matched by serial number:', device.serialNumber);
          break;
        }

        // Priority 3: Match by barcode if available
        if (device.barcode && optionBarcode === device.barcode) {
          matchedOption = option;
          console.log('Matched by barcode:', device.barcode);
          break;
        }

        // Priority 4: Match by brand and model (fallback)
        if (optionBrand === device.brand && optionModel === device.model) {
          matchedOption = option;
          console.log('Matched by brand/model:', device.brand, device.model);
          // Don't break here - continue looking for better matches
        }
      }

      if (matchedOption) {
        // Click to select this device
        matchedOption.click();

        // Add a visual indicator that this is the current device
        const indicator = document.createElement('span');
        indicator.className = 'ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full';
        indicator.textContent = 'Mevcut Cihaz';
        matchedOption.appendChild(indicator);

        console.log('Successfully pre-selected device');
      } else {
        console.warn('No matching device found in form options for device:', device);
      }

    } catch (error) {
      console.error('Error pre-selecting device in form:', error);
    }
  }

  /**
   * Populate pricing fields with existing sale data
   */
  populatePricingFields(sale, form) {
    // Populate list price
    const listPriceEl = form.querySelector('#listPrice');
    if (listPriceEl && sale.devices && sale.devices.length > 0) {
      const device = sale.devices[0];
      listPriceEl.value = (device.listPrice || device.salePrice || 0).toFixed(2);
    }

    // Populate sale price
    const salePriceEl = form.querySelector('#salePrice');
    if (salePriceEl) {
      salePriceEl.value = (sale.totalAmount || sale.total_list_price || 0).toFixed(2);
    }

    // Populate down payment
    const downPaymentEl = form.querySelector('#downPayment');
    if (downPaymentEl) {
      downPaymentEl.value = (sale.paidAmount || 0).toFixed(2);
    }

    // Trigger calculations
    if (window.calculateSalePrice) {
      window.calculateSalePrice();
    }
    if (window.calculateRemainingAmount) {
      window.calculateRemainingAmount();
    }
  }
}

// Export to window for global access
if (typeof window !== 'undefined') {
  window.SalesEditModule = SalesEditModule;
  
  // Initialize if ApiClient is available
  if (window.ApiClient) {
    const apiClient = new window.ApiClient();
    window.salesEdit = new SalesEditModule(apiClient);
  }
}
