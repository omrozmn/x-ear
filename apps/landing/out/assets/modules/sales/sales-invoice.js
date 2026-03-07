/**
 * Sales Invoice Module
 * Handles invoice generation and printing
 */
export class SalesInvoiceModule {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Opens the invoice generation form
   */
  async openInvoiceModal(saleId, patientId) {
    if (window.invoiceWidget && typeof window.invoiceWidget.openForSale === 'function') {
      return window.invoiceWidget.openForSale(saleId, patientId);
    }

    try {
      // Fetch sale and patient data
      const sale = await this.fetchSaleData(saleId, patientId);
      const patient = await this.fetchPatientData(patientId);
      
      if (!sale) {
        this.showToast('Satış bulunamadı', 'error');
        return;
      }

      const modal = document.createElement('div');
      modal.id = 'invoiceModal';
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-2xl font-bold text-gray-900">Fatura Oluştur</h2>
              <button onclick="this.closest('#invoiceModal').remove()" 
                      class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-2xl"></i>
              </button>
            </div>

            <form id="invoice-form" class="space-y-6">
              <!-- Invoice Type -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Fatura Türü</label>
                <select id="invoice-type" name="invoiceType" 
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" required>
                  <option value="individual">Bireysel Fatura</option>
                  <option value="corporate">Kurumsal Fatura</option>
                  <option value="e-archive">E-Arşiv Fatura</option>
                </select>
              </div>

              <!-- Customer Information -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h3 class="text-lg font-semibold mb-3">Müşteri Bilgileri</h3>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Ad Soyad / Ünvan</label>
                    <input type="text" id="invoice-name" name="customerName" 
                           value="${patient ? `${patient.firstName} ${patient.lastName}` : ''}"
                           class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">T.C. / Vergi No</label>
                    <input type="text" id="invoice-tax-id" name="taxId" 
                           value="${patient?.nationalId || ''}"
                           class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                  </div>
                  <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                    <textarea id="invoice-address" name="address" rows="2"
                              class="w-full border border-gray-300 rounded-lg px-3 py-2" required>${patient?.address || ''}</textarea>
                  </div>
                </div>
              </div>

              <!-- Invoice Details -->
              <div class="bg-blue-50 p-4 rounded-lg">
                <h3 class="text-lg font-semibold mb-3">Fatura Detayları</h3>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-700">Satış ID:</span>
                    <span class="font-medium">${sale.id}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-700">Fatura Tarihi:</span>
                    <span class="font-medium">${new Date().toLocaleDateString('tr-TR')}</span>
                  </div>
                  <div class="flex justify-between border-t pt-2 mt-2">
                    <span class="text-gray-700">Toplam Tutar:</span>
                    <span class="font-medium">${(sale.totalAmount || 0).toLocaleString('tr-TR')} TL</span>
                  </div>
                  ${sale.discountAmount ? `
                    <div class="flex justify-between">
                      <span class="text-gray-700">İndirim:</span>
                      <span class="font-medium text-red-600">-${(sale.discountAmount).toLocaleString('tr-TR')} TL</span>
                    </div>
                  ` : ''}
                  <div class="flex justify-between border-t pt-2">
                    <span class="font-semibold text-gray-900">KDV Dahil Toplam:</span>
                    <span class="font-bold text-blue-600 text-lg">${(sale.finalAmount || 0).toLocaleString('tr-TR')} TL</span>
                  </div>
                </div>
              </div>

              <!-- Items -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h3 class="text-lg font-semibold mb-3">Fatura Kalemleri</h3>
                <div class="space-y-2">
                  ${this.renderInvoiceItems(sale)}
                </div>
              </div>

              <!-- Notes -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Fatura Notu (Opsiyonel)</label>
                <textarea id="invoice-notes" name="notes" rows="2"
                          class="w-full border border-gray-300 rounded-lg px-3 py-2"></textarea>
              </div>

              <!-- Action Buttons -->
              <div class="flex justify-end space-x-3">
                <button type="button" onclick="this.closest('#invoiceModal').remove()" 
                        class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  İptal
                </button>
                <button type="button" onclick="window.salesInvoice.previewInvoice('${saleId}', '${patientId}')" 
                        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  <i class="fas fa-eye mr-2"></i>Önizle
                </button>
                <button type="submit" 
                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <i class="fas fa-file-invoice mr-2"></i>Fatura Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Add form submit handler
      document.getElementById('invoice-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleInvoiceSubmit(saleId, patientId);
      });

    } catch (error) {
      console.error('Failed to open invoice modal:', error);
      this.showToast('Fatura formu açılamadı', 'error');
    }
  }

  /**
   * Renders invoice items from sale data
   */
  renderInvoiceItems(sale) {
    if (!sale.devices || sale.devices.length === 0) {
      return '<p class="text-gray-500 text-center py-2">Kalem bulunamadı</p>';
    }

    return sale.devices.map(device => `
      <div class="bg-white p-3 rounded border text-sm">
        <div class="flex justify-between">
          <div class="flex-1">
            <p class="font-medium">${device.model || device.name || 'Cihaz'}</p>
            <p class="text-xs text-gray-600">Seri: ${device.serialNumber || '-'}</p>
          </div>
          <div class="text-right">
            <p class="font-medium">${(device.price || 0).toLocaleString('tr-TR')} TL</p>
            <p class="text-xs text-gray-600">KDV: %${device.taxRate || 8}</p>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Handles invoice form submission
   */
  async handleInvoiceSubmit(saleId, patientId) {
    try {
      const formData = {
        sale_id: saleId,
        patient_id: patientId,
        invoice_type: document.getElementById('invoice-type').value,
        customer_name: document.getElementById('invoice-name').value,
        tax_id: document.getElementById('invoice-tax-id').value,
        address: document.getElementById('invoice-address').value,
        notes: document.getElementById('invoice-notes').value,
        invoice_date: new Date().toISOString()
      };

      // Create invoice via API
      const response = await this.apiClient.post('/api/invoices', formData);
      
      if (response.success) {
        this.showToast('Fatura oluşturuldu', 'success');
        this.closeModal('invoiceModal');
        
        // Optionally print or download invoice
        if (response.invoiceId) {
          this.printInvoice(response.invoiceId);
        }
      } else {
        throw new Error(response.error || 'Fatura oluşturulamadı');
      }
    } catch (error) {
      console.error('Invoice creation failed:', error);
      this.showToast('Fatura oluşturulamadı: ' + error.message, 'error');
    }
  }

  /**
   * Previews the invoice before creation
   */
  async previewInvoice(saleId, patientId) {
    this.showToast('Fatura önizleme özelliği geliştirme aşamasında', 'info');
    // Implementation would generate HTML preview and show in new modal/window
  }

  /**
   * Prints an invoice
   */
  async printInvoice(invoiceId) {
    try {
      // Fetch invoice HTML or PDF
      const response = await this.apiClient.get(`/api/invoices/${invoiceId}/print`);
      
      if (response.html) {
        // Open print dialog with invoice HTML
        const printWindow = window.open('', '_blank');
        printWindow.document.write(response.html);
        printWindow.document.close();
        printWindow.print();
      } else if (response.pdfUrl) {
        // Open PDF in new tab
        window.open(response.pdfUrl, '_blank');
      }
    } catch (error) {
      console.error('Invoice printing failed:', error);
      this.showToast('Fatura yazdırılamadı', 'error');
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
   * Fetch patient data from API
   */
  async fetchPatientData(patientId) {
    try {
      const response = await this.apiClient.get(`/api/patients/${patientId}`);
      return response?.data || response || null;
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
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
}

// Export to window for global access
if (typeof window !== 'undefined') {
  window.SalesInvoiceModule = SalesInvoiceModule;
  
  // Initialize if ApiClient is available
  if (window.ApiClient) {
    const apiClient = new window.ApiClient();
    window.salesInvoice = new SalesInvoiceModule(apiClient);
  }
}
