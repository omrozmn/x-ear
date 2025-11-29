/**
 * Sales Returns and Replacements Module
 * Handles device returns, replacements, and return invoices
 */

export class SalesReturnsModule {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Render returns and exchanges section
   */
  async renderReturnsExchanges(patientId) {
    const returns = this.getPatientReturns(patientId);
    
    // Get device replacements from API
    let deviceReplacements = [];
    try {
      let result;
      if (window.patientsGetPatientReplacements) {
        result = await window.patientsGetPatientReplacements({ patientId });
      } else if (this.apiClient && this.apiClient.get) {
        // Use the API client directly
        result = await this.apiClient.get(`/api/patients/${patientId}/replacements`);
      } else if (window.APIConfig) {
        result = await window.APIConfig.makeRequest(`/api/patients/${patientId}/replacements`);
      } else {
        console.warn('No API client available for replacements fetch');
        // Fallback to direct fetch with localhost
        const response = await fetch(`http://localhost:5003/api/patients/${patientId}/replacements`);
        result = await response.json();
      }
      
      if (result.success) {
        deviceReplacements = result.data;
      }
    } catch (error) {
      console.error('Error fetching replacements:', error);
    }
    
    if (returns.length === 0 && deviceReplacements.length === 0) {
      return `
        <div class="text-center py-4">
          <p class="text-gray-500 text-sm mb-3">Henüz iade/değişim kaydı yok</p>
          <button onclick="salesManagement.openReturnModal('${patientId}')" 
                  class="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
            <i class="fas fa-undo mr-2"></i>İade/Değişim Başlat
          </button>
        </div>
      `;
    }

    let html = '';
    
    // Render device replacements
    if (deviceReplacements.length > 0) {
      html += '<h4 class="text-md font-semibold text-gray-900 mb-3">Cihaz Değişimleri</h4>';
      html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">';
      html += deviceReplacements.map((replacement, index) => {
        // Handle both nested and flat invoice structure
        const invoice = replacement.return_invoice || {
          id: replacement.invoiceId,
          invoice_number: replacement.invoiceNumber,
          supplier_name: replacement.supplierName,
          supplier_invoice_number: replacement.originalInvoiceNumber,
          invoice_note: replacement.returnInvoiceNote,
          gib_sent: replacement.gibSent,
          gib_sent_date: replacement.gibSentDate,
          created_at: replacement.invoiceCreatedDate
        };
        return `
        <div class="bg-amber-50 p-3 rounded-lg border-2 border-amber-300">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h4 class="font-semibold text-gray-900 text-sm">Cihaz Değişimi #${index + 1}</h4>
                <span class="inline-block px-2 py-0.5 text-xs rounded ${
                  replacement.status === 'pending_invoice' ? 'bg-yellow-100 text-yellow-800' : 
                  replacement.status === 'invoice_created' ? 'bg-blue-100 text-blue-800' :
                  replacement.status === 'completed' && invoice.gib_sent ? 'bg-green-100 text-green-800' :
                  replacement.status === 'completed' ? 'bg-green-100 text-green-800' : 
                  'bg-gray-100 text-gray-800'
                }">
                  ${
                    replacement.status === 'pending_invoice' ? 'Fatura Bekliyor' : 
                    replacement.status === 'invoice_created' && !invoice.gib_sent ? 'Fatura Oluşturuldu' :
                    replacement.status === 'completed' && invoice.gib_sent ? 'GİB\'e Gönderildi ✓' :
                    replacement.status === 'completed' ? 'Tamamlandı' : 'Beklemede'
                  }
                </span>
              </div>
              <p class="text-xs text-gray-600 mb-1">
                <strong>Tarih:</strong> ${new Date(replacement.createdAt || replacement.created_at).toLocaleDateString('tr-TR', { 
                  day: 'numeric', 
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <div class="bg-red-50 border border-red-200 rounded p-1.5">
                  <p class="text-xs text-red-600 font-medium mb-0.5">Eski Cihaz</p>
                  <p class="text-xs text-gray-900">${replacement.oldDeviceInfo || replacement.old_device_info || 'Belirtilmemiş'}</p>
                </div>
                <div class="bg-green-50 border border-green-200 rounded p-1.5">
                  <p class="text-xs text-green-600 font-medium mb-0.5">Yeni Cihaz</p>
                  <p class="text-xs text-gray-900">${replacement.newDeviceInfo || replacement.new_device_info || 'Belirtilmemiş'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex gap-2 mt-2 pt-2 border-t border-amber-200">
            ${replacement.status === 'pending_invoice' ? `
              <button onclick="salesManagement.openReturnInvoiceModal('${replacement.id}', '${patientId}')" 
                      class="flex-1 px-2 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium transition-colors">
                <i class="fas fa-file-invoice mr-1"></i>İade Faturası
              </button>
            ` : invoice.gib_sent ? `
              <button disabled
                      class="flex-1 px-2 py-1.5 bg-green-600 text-white rounded-md opacity-75 cursor-not-allowed text-xs font-medium">
                <i class="fas fa-check-circle mr-1"></i>GİB'e Gönderildi
              </button>
              <button onclick="salesManagement.previewInvoice('${invoice.id}')" 
                      class="flex-1 px-2 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-xs font-medium transition-colors">
                <i class="fas fa-eye mr-1"></i>Önizle
              </button>
            ` : (invoice.id || invoice.invoice_number) ? `
              <button onclick="salesManagement.previewInvoice('${invoice.id}')" 
                      class="flex-1 px-2 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-xs font-medium transition-colors">
                <i class="fas fa-eye mr-1"></i>Önizle
              </button>
              <button onclick="salesManagement.sendInvoice('${invoice.id}')" 
                      class="flex-1 px-2 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium transition-colors">
                <i class="fas fa-paper-plane mr-1"></i>GİB'e Gönder
              </button>
            ` : ''}
          </div>
          
          ${invoice.id ? `
            <div class="mt-2 pt-2 border-t border-amber-200">
              <p class="text-xs text-green-600 flex items-center mb-1">
                <i class="fas fa-check-circle mr-1"></i>
                İade faturası oluşturuldu: ${invoice.invoice_number || invoice.id}
              </p>
              ${invoice.gib_sent ? `
                <p class="text-xs text-green-700 font-semibold flex items-center mb-1">
                  <i class="fas fa-paper-plane mr-1"></i>
                  GİB'e gönderildi: ${new Date(invoice.gib_sent_date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              ` : ''}
              ${invoice.supplier_invoice_number ? `
                <p class="text-xs text-gray-600">
                  <i class="fas fa-file-alt mr-1"></i>
                  İadeye Konu Fatura: ${invoice.supplier_invoice_number}
                </p>
              ` : ''}
              ${invoice.supplier_name ? `
                <p class="text-xs text-gray-600">
                  <i class="fas fa-truck mr-1"></i>
                  Tedarikçi: ${invoice.supplier_name}
                </p>
              ` : ''}
              ${invoice.invoice_note ? `
                <p class="text-xs text-amber-700 mt-1">
                  <i class="fas fa-sticky-note mr-1"></i>
                  ${invoice.invoice_note}
                </p>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `;
      }).join('');
      html += '</div>'; // Close grid
      
      html += '<div class="mb-6"></div>'; // Spacer
    }
    
    // Render standard returns
    if (returns.length > 0) {
      html += '<h4 class="text-md font-semibold text-gray-900 mb-3">Genel İade/Değişim</h4>';
      html += returns.map(returnItem => `
        <div class="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-3">
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-medium text-gray-900">${returnItem.type === 'return' ? 'İade' : 'Değişim'} #${returnItem.id}</h4>
              <p class="text-sm text-gray-600">Tarih: ${new Date(returnItem.date).toLocaleDateString('tr-TR')}</p>
              <p class="text-sm text-gray-600">Sebep: ${returnItem.reason}</p>
            </div>
            <div class="text-right">
              <span class="inline-block px-2 py-1 text-xs rounded ${this.getReturnStatusColor(returnItem.status)}">
                ${this.getReturnStatusText(returnItem.status)}
              </span>
            </div>
          </div>
        </div>
      `).join('');
    }
    
    return html;
  }

  /**
   * Open return invoice modal to create invoice for device replacement
   */
  async openReturnInvoiceModal(replacementId, patientId) {
    try {
      const invoices = this.getDummyInvoices(patientId);
      
      // Get replacement from API
      const response = await fetch(`${this.apiClient.baseUrl}/api/patients/${patientId}/replacements`);
      const result = await response.json();
      if (!result.success) {
        throw new Error('Değişim kaydı alınamadı');
      }
      
      const replacement = result.data.find(r => r.id === replacementId);
      if (!replacement) {
        this.showAlert('Hata', 'Değişim kaydı bulunamadı', 'error');
        return;
      }
      
      const modalHtml = `
        <div id="returnInvoiceModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">İade Faturası Oluştur (Tedarikçiye)</h3>
                <p class="text-sm text-gray-600 mt-1">Değişim: ${replacement.oldDeviceInfo || replacement.old_device_info || 'Belirtilmemiş'} → ${replacement.newDeviceInfo || replacement.new_device_info || 'Belirtilmemiş'}</p>
                <p class="text-xs text-amber-600 mt-1">⚠️ Eski cihazı tedarikçiye iade edip yeni cihaz talep ediyoruz</p>
              </div>
              <button onclick="salesManagement.closeModal('returnInvoiceModal')" class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <label class="block text-sm font-medium text-gray-700 mb-2">Tedarikçi Alım Faturası Ara</label>
              <input type="text" id="invoiceSearch" value="${replacement.oldDeviceInfo || replacement.old_device_info || ''}" placeholder="Fatura numarası, tedarikçi adı, ürün adı ile ara..." class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" oninput="salesManagement.filterInvoices()">
              <p class="text-xs text-gray-500 mt-1">Eski cihazı (örn: ${replacement.oldDeviceInfo || replacement.old_device_info || 'Belirtilmemiş'}) tedarikçiden aldığımız faturasını seçin</p>
            </div>
            <div class="p-6 max-h-[50vh] overflow-y-auto">
              <div id="invoiceGrid" class="space-y-3">
                ${invoices.map(invoice => `
                  <div class="invoice-card border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all" data-search="${(invoice.number + ' ' + invoice.items.join(' ') + ' ' + invoice.supplierName).toLowerCase()}" onclick="salesManagement.selectInvoice('${invoice.id}', '${invoice.number}', '${invoice.supplierName}', '${invoice.date}', this)">
                    <div class="flex justify-between items-start">
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          <h4 class="font-semibold text-gray-900">${invoice.number}</h4>
                          <span class="px-2 py-1 text-xs rounded ${invoice.type === 'purchase' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}">Tedarikçi Alım</span>
                        </div>
                        <p class="text-sm text-gray-600 mb-1"><strong>Tarih:</strong> ${new Date(invoice.date).toLocaleDateString('tr-TR')}</p>
                        <p class="text-sm text-gray-600 mb-1"><strong>Tedarikçi:</strong> ${invoice.supplierName}</p>
                        <p class="text-sm text-gray-600 mb-1"><strong>Ürünler:</strong> ${invoice.items.join(', ')}</p>
                        <p class="text-sm font-semibold text-gray-900 mt-2">Tutar: ₺${invoice.amount.toLocaleString('tr-TR')}</p>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            <input type="hidden" id="selectedInvoiceId" value="">
            <input type="hidden" id="selectedInvoiceNumber" value="">
            <input type="hidden" id="selectedSupplierName" value="">
            <input type="hidden" id="selectedInvoiceDate" value="">
            <input type="hidden" id="currentReplacementId" value="${replacementId}">
            <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button onclick="salesManagement.closeModal('returnInvoiceModal')" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 font-medium">İptal</button>
              <button onclick="salesManagement.createReturnInvoice()" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">İade Faturası Oluştur</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      setTimeout(() => this.filterInvoices(), 100);
    } catch (error) {
      console.error('Error opening return invoice modal:', error);
      this.showAlert('Hata', 'İade faturası modalı açılırken hata oluştu', 'error');
    }
  }

  /**
   * Filter invoices in the modal
   */
  filterInvoices() {
    const searchTerm = document.getElementById('invoiceSearch')?.value.toLowerCase() || '';
    const cards = document.querySelectorAll('.invoice-card');
    cards.forEach(card => {
      const searchData = card.getAttribute('data-search');
      card.style.display = (searchData && searchData.includes(searchTerm)) ? 'block' : 'none';
    });
  }

  /**
   * Select an invoice from the list
   */
  selectInvoice(invoiceId, invoiceNumber, supplierName, invoiceDate, element) {
    document.querySelectorAll('.invoice-card').forEach(card => {
      card.classList.remove('border-blue-500', 'bg-blue-50');
      card.classList.add('border-gray-300');
    });
    element.classList.remove('border-gray-300');
    element.classList.add('border-blue-500', 'bg-blue-50');
    document.getElementById('selectedInvoiceId').value = invoiceId;
    document.getElementById('selectedInvoiceNumber').value = invoiceNumber;
    document.getElementById('selectedSupplierName').value = supplierName;
    document.getElementById('selectedInvoiceDate').value = invoiceDate;
  }

  /**
   * Create return invoice
   */
  async createReturnInvoice() {
    try {
      const replacementId = document.getElementById('currentReplacementId').value;
      const invoiceId = document.getElementById('selectedInvoiceId').value;
      const invoiceNumber = document.getElementById('selectedInvoiceNumber').value;
      const supplierName = document.getElementById('selectedSupplierName').value;
      const invoiceDate = document.getElementById('selectedInvoiceDate').value;
      
      if (!invoiceId) {
        this.showAlert('Uyarı', 'Lütfen bir fatura seçiniz', 'warning');
        return;
      }
      
      const returnInvoiceNumber = `IADE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      
      // Create return invoice via API
      const invoiceData = {
        invoiceNumber: returnInvoiceNumber,
        supplierInvoiceNumber: invoiceNumber,
        supplierName: supplierName,
        supplierInvoiceId: invoiceId,
        supplierInvoiceDate: invoiceDate,
        invoiceNote: 'Cihaz değişimi nedeniyle iade'
      };
      
      const response = await fetch(`${this.apiClient.baseUrl}/api/replacements/${replacementId}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'İade faturası oluşturulamadı');
      }
      
      // Get patient ID for timeline
      const replacement = result.data.replacement;
      const patientId = replacement.patientId || replacement.patient_id;
      
      if (patientId) {
        // Add to timeline
        await this.apiClient.addPatientTimelineEvent(patientId, {
          type: 'return_invoice_created',
          title: 'İade Faturası Oluşturuldu (Tedarikçiye)',
          description: `${returnInvoiceNumber} - İadeye konu fatura: ${invoiceNumber} | Tedarikçi: ${supplierName}`,
          timestamp: new Date().toISOString()
        });
      }
      
      this.closeModal('returnInvoiceModal');
      this.showAlert('Başarılı', `İade faturası oluşturuldu!\nFatura No: ${returnInvoiceNumber}\nİadeye Konu: ${invoiceNumber}`, 'success');
      
      // Refresh sales table
      if (window.salesManagement && window.salesManagement.refreshSalesTable) {
        await window.salesManagement.refreshSalesTable(patientId);
      }
      
    } catch (error) {
      console.error('Error creating return invoice:', error);
      this.showAlert('Hata', 'İade faturası oluşturulurken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 'error');
    }
  }

  /**
   * Preview invoice
   */
  async previewInvoice(invoiceId) {
    try {
      // Get current patient ID
      const patientId = window.currentPatientData?.id || new URLSearchParams(window.location.search).get('id');
      
      // Get all replacements to find the one with this invoice
      const response = await fetch(`${this.apiClient.baseUrl}/api/patients/${patientId}/replacements`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('Değişim bilgileri alınamadı');
      }
      
      const replacement = result.data.find(r => r.return_invoice && r.return_invoice.id === invoiceId);
      
      if (!replacement || !replacement.return_invoice) {
        this.showAlert('Hata', 'Fatura bilgileri bulunamadı', 'error');
        return;
      }
      
      const invoice = replacement.return_invoice;
    
      const modalHtml = `
        <div id="invoicePreviewModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
          <div class="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-700">
              <h3 class="text-xl font-bold text-white">İade Faturası Önizleme</h3>
              <button onclick="salesManagement.closeModal('invoicePreviewModal')" class="text-white hover:text-gray-200">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <!-- Invoice Content -->
            <div class="p-8 bg-white">
              <!-- Company Header -->
              <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-900">X-EAR İŞİTME MERKEZİ</h1>
                <p class="text-sm text-gray-600 mt-2">Adres Bilgileri | Tel: (XXX) XXX-XXXX | E-posta: info@xear.com</p>
              </div>
              
              <!-- Invoice Title -->
              <div class="text-center mb-6">
                <h2 class="text-2xl font-bold text-red-600">İADE FATURASI (TEDARİKÇİYE)</h2>
                <p class="text-sm text-gray-500 mt-1">Fatura No: ${invoice.invoice_number}</p>
              </div>
              
              <!-- Invoice Details Grid -->
              <div class="grid grid-cols-2 gap-6 mb-6">
                <div class="border border-gray-300 rounded-lg p-4">
                  <h4 class="font-semibold text-gray-700 mb-3 border-b pb-2">Tedarikçi Bilgileri</h4>
                  <p class="text-sm text-gray-600 mb-1"><strong>Tedarikçi:</strong> ${invoice.supplier_name || 'Belirtilmemiş'}</p>
                  <p class="text-sm text-gray-600"><strong>İadeye Konu Fatura:</strong> ${invoice.supplier_invoice_number}</p>
                </div>
                
                <div class="border border-gray-300 rounded-lg p-4">
                  <h4 class="font-semibold text-gray-700 mb-3 border-b pb-2">Fatura Bilgileri</h4>
                  <p class="text-sm text-gray-600 mb-1"><strong>Fatura Tarihi:</strong> ${new Date(invoice.created_at).toLocaleDateString('tr-TR')}</p>
                  <p class="text-sm text-gray-600"><strong>Durum:</strong> <span class="text-blue-600 font-medium">${invoice.gib_sent ? 'GİB\'e Gönderildi' : 'Hazır'}</span></p>
                </div>
              </div>
              
              <!-- Items Table -->
              <div class="border border-gray-300 rounded-lg overflow-hidden mb-6">
                <table class="w-full">
                  <thead class="bg-gray-100">
                    <tr>
                      <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">İade Edilen Ürün</th>
                      <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="border-t border-gray-200">
                      <td class="px-4 py-3 text-sm text-gray-900">${replacement.old_device_info}</td>
                      <td class="px-4 py-3 text-sm text-gray-600">${invoice.invoice_note || 'Cihaz değişimi nedeniyle iade'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- Notes -->
              <div class="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
                <h4 class="font-semibold text-amber-800 mb-2 flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                  </svg>
                  Not
                </h4>
                <p class="text-sm text-amber-900">${invoice.invoice_note || 'Bu fatura, tedarikçiden alınan ürünün iadesi için düzenlenmiştir.'}</p>
              </div>
              
              <!-- Footer -->
              <div class="text-center pt-6 border-t border-gray-300">
                <p class="text-xs text-gray-500">Bu fatura bilgisayar ortamında oluşturulmuştur.</p>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 rounded-b-lg">
              <button onclick="salesManagement.closeModal('invoicePreviewModal')" 
                class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 font-medium">
                Kapat
              </button>
              <button onclick="salesManagement.printInvoice('${invoiceId}')" 
                class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium">
                <i class="fas fa-print mr-2"></i>Yazdır
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
    } catch (error) {
      console.error('Error loading invoice preview:', error);
      this.showAlert('Hata', 'Fatura önizlemesi yüklenemedi: ' + (error.message || 'Bilinmeyen hata'), 'error');
    }
  }

  /**
   * Print invoice
   */
  printInvoice(invoiceId) {
    this.showAlert('Bilgi', 'Yazdırma özelliği yakında eklenecek', 'info');
  }

  /**
   * Send invoice to GIB
   */
  async sendInvoice(invoiceId) {
    if (!confirm('Bu işlem faturayı GİB\'e (Gelir İdaresi Başkanlığı) gönderecektir. Onaylıyor musunuz?')) {
      return;
    }

    try {
      // Send invoice via API
      const response = await fetch(`${this.apiClient.baseUrl}/api/return-invoices/${invoiceId}/send-to-gib`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Fatura gönderilemedi');
      }
      
      this.showAlert('Başarılı', 'Fatura GİB\'e gönderildi!', 'success');
      
      // Refresh sales table
      const patientId = window.currentPatientData?.id;
      if (patientId && window.salesManagement && window.salesManagement.refreshSalesTable) {
        await window.salesManagement.refreshSalesTable(patientId);
      }
      
    } catch (error) {
      console.error('Error sending invoice to GIB:', error);
      this.showAlert('Hata', 'Fatura gönderilirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 'error');
    }
  }

  /**
   * Open return modal (placeholder)
   */
  openReturnModal(patientId) {
    this.showAlert('Bilgi', 'İade/değişim özelliği geliştirme aşamasında', 'info');
  }

  /**
   * Get patient returns (dummy data for now)
   */
  getPatientReturns(patientId) {
    // TODO: Implement actual return data fetching
    return [];
  }

  /**
   * Get return status color
   */
  getReturnStatusColor(status) {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'completed': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Get return status text
   */
  getReturnStatusText(status) {
    const texts = {
      'pending': 'Beklemede',
      'approved': 'Onaylandı',
      'rejected': 'Reddedildi',
      'completed': 'Tamamlandı'
    };
    return texts[status] || 'Bilinmiyor';
  }

  /**
   * Get dummy invoices (for testing)
   */
  getDummyInvoices(patientId) {
    return [
      {
        id: 'SUPP-INV-001',
        number: 'TEDARİK-2025-001',
        date: '2025-01-15',
        supplierName: 'Ear Teknik',
        items: ['Phonak 333 İşitme Cihazı', 'Pil Paketi'],
        amount: 8000,
        type: 'purchase'
      },
      {
        id: 'SUPP-INV-002',
        number: 'TEDARİK-2025-002',
        date: '2025-02-20',
        supplierName: 'Widex Türkiye',
        items: ['Oticon Force 200', 'Bakım Seti'],
        amount: 10000,
        type: 'purchase'
      },
      {
        id: 'SUPP-INV-003',
        number: 'TEDARİK-2025-003',
        date: '2025-03-10',
        supplierName: 'Phonak Distributör',
        items: ['Widex M440-312', 'Garanti Paketi'],
        amount: 12000,
        type: 'purchase'
      }
    ];
  }

  /**
   * Show alert helper
   */
  showAlert(title, message, type = 'info') {
    if (window.showCustomAlert) {
      window.showCustomAlert(title, message, type);
    } else {
      alert(`${title}: ${message}`);
    }
  }

  /**
   * Close modal helper
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.remove();
    }
  }
}

// Export to window for global access
if (typeof window !== 'undefined') {
  window.SalesReturnsModule = SalesReturnsModule;
  
  // Initialize if ApiClient is available
  if (window.ApiClient) {
    const apiClient = new window.ApiClient();
    window.salesReturns = new SalesReturnsModule(apiClient);
  }
}

export default SalesReturnsModule;
