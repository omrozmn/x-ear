/**
 * Invoice Preview Widget
 * Beautiful modal for previewing, sending to GİB, and deleting invoices
 */

class InvoicePreviewWidget {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Opens invoice preview modal
   */
  async open(invoiceId, onUpdate = null) {
    try {
      // Fetch invoice data
      const response = await this.apiClient.get(`/api/invoices/${invoiceId}`);
      const invoice = response?.data || response;

      if (!invoice) {
        this.showToast('Fatura bulunamadı', 'error');
        return;
      }

      // Fetch sale data if available
      let sale = invoice.sale;
      if (invoice.saleId && !sale) {
        const saleResponse = await this.apiClient.get(`/api/sales/${invoice.saleId}/invoice`);
        sale = saleResponse?.data?.sale;
      }

      const modal = document.createElement('div');
      modal.id = 'invoicePreviewModal';
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4';
      modal.innerHTML = this.renderModalContent(invoice, sale);

      document.body.appendChild(modal);

      // Add ESC key listener
      const escapeHandler = (e) => {
        if (e.key === 'Escape') {
          this.close();
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);

      // Store callback
      this.onUpdateCallback = onUpdate;

    } catch (error) {
      console.error('Failed to open invoice preview:', error);
      this.showToast('Fatura yüklenemedi: ' + error.message, 'error');
    }
  }

  /**
   * Renders the modal content
   */
  renderModalContent(invoice, sale) {
    const isGibSent = invoice.sentToGib;
    const isCancelled = invoice.status === 'cancelled';
    
    return `
      <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl shadow-lg z-10">
          <div>
            <h3 class="text-xl font-bold flex items-center gap-2">
              <i class="fas fa-file-invoice"></i>
              Fatura Önizleme
            </h3>
            <p class="text-blue-100 text-sm mt-1">${invoice.invoiceNumber}</p>
          </div>
          <button onclick="window.invoicePreview.close()" 
                  class="text-white hover:text-blue-100 p-2 hover:bg-white/10 rounded-full transition-colors"
                  title="Kapat [ESC]">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>

        <!-- Status Badges -->
        <div class="px-6 py-3 bg-gray-50 border-b border-gray-200 flex gap-2 flex-wrap">
          ${this.renderStatusBadges(invoice)}
        </div>

        <!-- Invoice Content -->
        <div class="p-8">
          <!-- Company Header -->
          <div class="text-center mb-8 pb-6 border-b-2 border-gray-200">
            <div class="flex justify-between items-center mb-4">
              <!-- Company Logo -->
              <div class="flex-1">
                ${this.getCompanyLogo()}
              </div>
              
              <!-- GİB Logo -->
              <div class="flex-1 text-center">
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTAwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMDA0Nzg4Ii8+Cjx0ZXh0IHg9IjUwIiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkdJQjwvdGV4dD4KPHN2Zz4K" alt="GİB Logo" class="mx-auto h-10">
              </div>
              
              <!-- Digital Signature -->
              <div class="flex-1 text-right">
                ${this.getDigitalSignature()}
              </div>
            </div>
            
            <h1 class="text-3xl font-bold text-gray-900 mb-2">X-EAR İŞİTME CİHAZLARI</h1>
            <p class="text-gray-600">Adres: [Şirket Adresi]</p>
            <p class="text-gray-600">Tel: [Telefon] | Email: [Email]</p>
            <p class="text-gray-600">Vergi Dairesi: [Vergi Dairesi] | Vergi No: [Vergi No]</p>
          </div>

          <!-- Invoice Info Grid -->
          <div class="grid grid-cols-2 gap-6 mb-8">
            <!-- Customer Info -->
            <div class="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
              <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <i class="fas fa-user text-blue-600"></i>
                Müşteri Bilgileri
              </h4>
              <div class="space-y-2 text-sm text-gray-700">
                <p><strong>Adı Soyadı:</strong> ${invoice.patientName || '-'}</p>
                <p><strong>T.C. No:</strong> ${invoice.patientTC || '-'}</p>
                <p><strong>Hasta ID:</strong> ${invoice.patientId}</p>
              </div>
            </div>

            <!-- Invoice Info -->
            <div class="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
              <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <i class="fas fa-file-invoice text-green-600"></i>
                Fatura Bilgileri
              </h4>
              <div class="space-y-2 text-sm text-gray-700">
                <p><strong>Fatura No:</strong> ${invoice.invoiceNumber}</p>
                <p><strong>Tarih:</strong> ${new Date(invoice.createdAt).toLocaleString('tr-TR')}</p>
                ${invoice.saleId ? `<p><strong>Satış ID:</strong> ${invoice.saleId}</p>` : ''}
                <p><strong>Oluşturan:</strong> ${invoice.createdBy || 'Sistem'}</p>
              </div>
            </div>
          </div>

          <!-- Device/Product Details -->
          <div class="mb-8">
            <h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i class="fas fa-box text-purple-600"></i>
              Ürün/Hizmet Detayları
            </h4>
            <div class="overflow-x-auto">
              <table class="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ürün/Hizmet</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Seri No</th>
                    <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Birim Fiyat</th>
                    <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">Miktar</th>
                    <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Toplam</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  ${this.renderInvoiceItems(invoice, sale)}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Total -->
          <div class="flex justify-end mb-8">
            <div class="w-64">
              <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-600">
                <div class="flex justify-between text-sm text-gray-700 mb-2">
                  <span>Ara Toplam:</span>
                  <span>${(invoice.devicePrice || 0).toLocaleString('tr-TR')} TL</span>
                </div>
                <div class="flex justify-between text-sm text-gray-700 mb-2">
                  <span>KDV (%20):</span>
                  <span>${((invoice.devicePrice || 0) * 0.20).toLocaleString('tr-TR')} TL</span>
                </div>
                <div class="flex justify-between font-bold text-lg text-blue-900 pt-2 border-t-2 border-blue-600">
                  <span>GENEL TOPLAM:</span>
                  <span>${((invoice.devicePrice || 0) * 1.20).toLocaleString('tr-TR')} TL</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes -->
          ${invoice.notes ? `
            <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <h4 class="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <i class="fas fa-sticky-note text-yellow-600"></i>
                Notlar
              </h4>
              <p class="text-sm text-gray-700">${invoice.notes}</p>
            </div>
          ` : ''}
        </div>

        <!-- Action Buttons -->
        <div class="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3 rounded-b-xl">
          ${this.renderActionButtons(invoice)}
        </div>
      </div>
    `;
  }

  /**
   * Renders status badges
   */
  renderStatusBadges(invoice) {
    let badges = [];

    // Status badge
    if (invoice.status === 'cancelled') {
      badges.push(`
        <span class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-1">
          <i class="fas fa-ban"></i> İptal Edildi
        </span>
      `);
    } else {
      badges.push(`
        <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
          <i class="fas fa-check-circle"></i> Aktif
        </span>
      `);
    }

    // GİB status badge
    if (invoice.sentToGib) {
      badges.push(`
        <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-1">
          <i class="fas fa-paper-plane"></i> GİB'e Gönderildi
        </span>
      `);
      if (invoice.sentToGibAt) {
        badges.push(`
          <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
            ${new Date(invoice.sentToGibAt).toLocaleDateString('tr-TR')}
          </span>
        `);
      }
    }

    return badges.join('');
  }

  /**
   * Renders invoice items
   */
  renderInvoiceItems(invoice, sale) {
    // If we have sale data with devices, show them
    if (sale?.devices && sale.devices.length > 0) {
      return sale.devices.map(device => `
        <tr>
          <td class="px-4 py-3 text-sm text-gray-900">${device.brand || ''} ${device.model || 'Cihaz'}</td>
          <td class="px-4 py-3 text-sm text-gray-600">${device.serialNumber || '-'}</td>
          <td class="px-4 py-3 text-sm text-gray-900 text-right">${(
            (device.price ?? device.patientPayment ?? device.salePrice ?? device.listPrice ?? 0)
          ).toLocaleString('tr-TR')} TL</td>
          <td class="px-4 py-3 text-sm text-gray-600 text-center">1</td>
          <td class="px-4 py-3 text-sm font-semibold text-gray-900 text-right">${(
            (device.price ?? device.patientPayment ?? device.salePrice ?? device.listPrice ?? 0)
          ).toLocaleString('tr-TR')} TL</td>
        </tr>
      `).join('');
    }

    // Otherwise, show generic invoice item
    return `
      <tr>
        <td class="px-4 py-3 text-sm text-gray-900">${invoice.deviceName || 'İşitme Cihazı'}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${invoice.deviceSerial || '-'}</td>
        <td class="px-4 py-3 text-sm text-gray-900 text-right">${(invoice.devicePrice || 0).toLocaleString('tr-TR')} TL</td>
        <td class="px-4 py-3 text-sm text-gray-600 text-center">1</td>
        <td class="px-4 py-3 text-sm font-semibold text-gray-900 text-right">${(invoice.devicePrice || 0).toLocaleString('tr-TR')} TL</td>
      </tr>
    `;
  }

  /**
   * Renders action buttons
   */
  renderActionButtons(invoice) {
    const isGibSent = invoice.sentToGib;
    const isCancelled = invoice.status === 'cancelled';

    let buttons = [];

    // Send to GİB button
    if (!isGibSent && !isCancelled) {
      buttons.push(`
        <button onclick="window.invoicePreview.sendToGib(${invoice.id})"
                class="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2">
          <i class="fas fa-paper-plane"></i>
          GİB'e Gönder
        </button>
      `);
    }

    // Delete button (only if not sent to GİB)
    if (!isGibSent && !isCancelled) {
      buttons.push(`
        <button onclick="window.invoicePreview.deleteInvoice(${invoice.id})"
                class="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2">
          <i class="fas fa-trash"></i>
          Faturayı Sil
        </button>
      `);
    }

    // Print button
    buttons.push(`
      <button onclick="window.invoicePreview.print()"
              class="flex-1 bg-gray-600 text-white px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2">
        <i class="fas fa-print"></i>
        Yazdır
      </button>
    `);

    // Close button
    buttons.push(`
      <button onclick="window.invoicePreview.close()"
              class="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium">
        Kapat
      </button>
    `);

    return buttons.join('');
  }

  /**
   * Sends invoice to GİB
   */
  async sendToGib(invoiceId) {
    if (!confirm('Bu faturayı GİB\'e göndermek istediğinize emin misiniz?\n\nGİB\'e gönderilen faturalar silinemez.')) {
      return;
    }

    try {
      const response = await this.apiClient.post(`/api/invoices/${invoiceId}/send-to-gib`);

      if (response && response.success !== false) {
        this.showToast('✓ Fatura GİB\'e gönderildi', 'success');
        
        // Call update callback if provided
        if (this.onUpdateCallback) {
          await this.onUpdateCallback();
        }

        // Close and reopen to refresh data
        this.close();
        await this.open(invoiceId, this.onUpdateCallback);
      } else {
        throw new Error(response.error || 'GİB\'e gönderilemedi');
      }
    } catch (error) {
      console.error('Failed to send to GİB:', error);
      this.showToast('GİB\'e gönderilemedi: ' + error.message, 'error');
    }
  }

  /**
   * Deletes invoice
   */
  async deleteInvoice(invoiceId) {
    if (!confirm('Bu faturayı silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.')) {
      return;
    }

    try {
      const response = await this.apiClient.delete(`/api/invoices/${invoiceId}`);

      if (response && response.success !== false) {
        this.showToast('✓ Fatura başarıyla silindi', 'success');
        
        // Call update callback if provided
        if (this.onUpdateCallback) {
          await this.onUpdateCallback();
        }

        this.close();
      } else {
        throw new Error(response.error || 'Fatura silinemedi');
      }
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      this.showToast('Fatura silinemedi: ' + error.message, 'error');
    }
  }

  /**
   * Prints invoice
   */
  print() {
    window.print();
  }

  /**
   * Closes the modal
   */
  close() {
    const modal = document.getElementById('invoicePreviewModal');
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Gets company logo from settings
   */
  getCompanyLogo() {
    const logo = localStorage.getItem('settings.invoice.logo');
    if (logo) {
      return `<img src="${logo}" alt="Şirket Logosu" class="h-16 max-w-32 object-contain">`;
    }
    return '<div class="h-16 w-32 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">Logo</div>';
  }

  /**
   * Gets digital signature from settings
   */
  getDigitalSignature() {
    const signature = localStorage.getItem('settings.invoice.signature');
    if (signature) {
      return `<img src="${signature}" alt="Dijital İmza" class="h-12 max-w-24 object-contain ml-auto">`;
    }
    return '<div class="h-12 w-24 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">İmza</div>';
  }

  /**
   * Shows toast notification
   */
  showToast(message, type = 'info') {
    // Try to use global toast if available
    if (window.showToast) {
      window.showToast(message, type);
      return;
    }

    // Fallback to alert
    alert(message);
  }
}

// Initialize global instance
if (typeof window !== 'undefined') {
  window.InvoicePreviewWidget = InvoicePreviewWidget;
}

export default InvoicePreviewWidget;
