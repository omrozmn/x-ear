/**
 * Invoice Widget
 * Reusable invoice creation/edit form used across Sales tab and Device cards
 */
class InvoiceWidget {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Open invoice form for a sale (prefills from sale)
   */
  async openForSale(saleId, patientId) {
    try {
      // Use Orval-generated methods first
      let sale, patient;
      
      if (window.salesGetPatientSales) {
        sale = await window.salesGetPatientSales(patientId);
      } else {
        sale = await this.apiClient.get(`/api/patients/${patientId}/sales`);
      }
      const saleData = sale?.data || sale || [];
      const saleObj = Array.isArray(saleData) ? saleData.find(s => s.id === saleId) : null;
      
      if (this.apiClient.getPatient) {
        patient = await this.apiClient.getPatient(patientId);
      } else {
        patient = await this.apiClient.get(`/api/patients/${patientId}`);
      }
      const patientData = patient?.data || patient;

      if (!saleObj) {
        this._toast('Satış verisi bulunamadı', 'error');
        return;
      }

      return this._openInvoiceModal({ sale: saleObj, patient: patientData, source: 'sale' });
    } catch (err) {
      console.error('InvoiceWidget.openForSale error', err);
      this._toast('Fatura formu açılamadı', 'error');
    }
  }

  /**
   * Open invoice form for a device (prefills from device)
   */
  async openForDevice(deviceId, patientId) {
    try {
      // Use Orval-generated methods first
      let devicesResp, patient;
      
      if (window.patientsGetPatientDevices) {
        devicesResp = await window.patientsGetPatientDevices(patientId);
      } else {
        devicesResp = await this.apiClient.get(`/api/patients/${patientId}/devices`);
      }
      const devices = devicesResp?.data || devicesResp || [];
      const device = Array.isArray(devices) ? devices.find(d => d.id === deviceId) : null;
      
      if (this.apiClient.getPatient) {
        patient = await this.apiClient.getPatient(patientId);
      } else {
        patient = await this.apiClient.get(`/api/patients/${patientId}`);
      }
      const patientData = patient?.data || patient;

      if (!device) {
        this._toast('Cihaz bulunamadı', 'error');
        return;
      }

      return this._openInvoiceModal({ device, patient: patientData, source: 'device' });
    } catch (err) {
      console.error('InvoiceWidget.openForDevice error', err);
      this._toast('Fatura formu açılamadı', 'error');
    }
  }

  /**
   * Internal: render and open modal with invoice form
   */
  async _openInvoiceModal({ sale = null, device = null, patient = null, source = 'sale' }) {
    // Build modal id unique
    const modalId = `invoice-widget-modal-${Date.now()}`;

    const itemsHtml = (sale && sale.devices ? sale.devices : device ? [device] : []).map(d => `
      <div class="bg-white p-3 rounded border text-sm">
        <div class="flex justify-between">
          <div class="flex-1">
            <p class="font-medium">${d.deviceName || d.name || d.model || 'Cihaz'}</p>
            <p class="text-xs text-gray-600">Barkod: ${d.barcode || d.serialNumber || '-'}</p>
          </div>
          <div class="text-right">
            <p class="font-medium">${(d.devicePrice || d.price || d.salePrice || 0).toLocaleString('tr-TR')} TL</p>
            <p class="text-xs text-gray-600">KDV: %${d.taxRate || 8}</p>
          </div>
        </div>
      </div>
    `).join('');

    const totalAmount = (sale?.finalAmount || sale?.totalAmount || (device?.devicePrice || device?.price || device?.salePrice || 0));

    const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : '';

    const modalHtml = `
      <div id="${modalId}" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-2xl font-bold text-gray-900">Fatura Oluştur</h2>
              <button onclick="document.getElementById('${modalId}')?.remove()" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-2xl"></i>
              </button>
            </div>

            <form id="${modalId}-form" class="space-y-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Fatura Türü</label>
                <select id="${modalId}-invoice-type" name="invoiceType" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                  <option value="individual">Bireysel Fatura</option>
                  <option value="corporate">Kurumsal Fatura</option>
                  <option value="e-archive">E-Arşiv Fatura</option>
                </select>
              </div>

              <div class="bg-gray-50 p-4 rounded-lg">
                <h3 class="text-lg font-semibold mb-3">Müşteri Bilgileri</h3>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Ad Soyad / Ünvan</label>
                    <input type="text" id="${modalId}-invoice-name" name="customerName" value="${patientName}"
                           class="w-full border border-gray-300 rounded-lg px-3 py-2" required />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">T.C. / Vergi No</label>
                    <input type="text" id="${modalId}-tax-id" name="taxId" value="${patient?.tcNumber || patient?.tc_number || patient?.nationalId || ''}"
                           class="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                    <textarea id="${modalId}-address" name="address" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2">${patient?.address || ''}</textarea>
                  </div>
                </div>
              </div>

              <div class="bg-blue-50 p-4 rounded-lg">
                <h3 class="text-lg font-semibold mb-3">Fatura Detayları</h3>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-700">Kaynak:</span>
                    <span class="font-medium">${source === 'sale' ? 'Satış' : 'Cihaz'}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-700">Fatura Tarihi:</span>
                    <span class="font-medium">${new Date().toLocaleDateString('tr-TR')}</span>
                  </div>
                  <div class="flex justify-between border-t pt-2 mt-2">
                    <span class="text-gray-700">Toplam Tutar:</span>
                    <span class="font-medium">${(totalAmount || 0).toLocaleString('tr-TR')} TL</span>
                  </div>
                </div>
              </div>

              <div class="bg-gray-50 p-4 rounded-lg">
                <h3 class="text-lg font-semibold mb-3">Fatura Kalemleri</h3>
                <div class="space-y-2">${itemsHtml || '<p class="text-gray-500 text-center py-2">Kalem bulunamadı</p>'}</div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Fatura Notu (Opsiyonel)</label>
                <textarea id="${modalId}-notes" name="notes" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2"></textarea>
              </div>

              <div class="flex justify-end space-x-3">
                <button type="button" onclick="document.getElementById('${modalId}')?.remove()" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700">İptal</button>
                <button type="button" id="${modalId}-preview" class="px-4 py-2 bg-gray-600 text-white rounded-md">Önizle</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md">Fatura Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Append modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Hook events
    const form = document.getElementById(`${modalId}-form`);
    const previewBtn = document.getElementById(`${modalId}-preview`);

    previewBtn?.addEventListener('click', () => {
      this._toast('Önizleme özelliği geliştirme aşamasında', 'info');
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._submitForm({ modalId, sale, device, patient });
    });

    return { modalId };
  }

  /**
   * Internal: submit form data to API and handle post-creation actions
   */
  async _submitForm({ modalId, sale, device, patient }) {
    try {
      // Calculate device price from sale or device data
      let devicePrice = 0;
      if (sale) {
        devicePrice = sale.finalAmount || sale.totalAmount || 0;
      } else if (device) {
        devicePrice = device.price || 0;
      }

      const invoicePayload = {
        patientId: patient?.id || (sale?.patientId),
        devicePrice: devicePrice,
        saleId: sale?.id || null,
        deviceId: device?.id || null,
        deviceName: device?.name || device?.model || (sale?.devices && sale.devices[0]?.name) || null,
        deviceSerial: device?.serialNumber || (sale?.devices && sale.devices[0]?.serialNumber) || null,
        invoiceType: document.getElementById(`${modalId}-invoice-type`).value,
        customerName: document.getElementById(`${modalId}-invoice-name`).value,
        taxId: document.getElementById(`${modalId}-tax-id`).value,
        address: document.getElementById(`${modalId}-address`).value,
        notes: document.getElementById(`${modalId}-notes`).value,
        createdBy: 'system'
      };

      // Use the correct endpoint for creating sale invoices
      const saleId = sale?.id || invoicePayload.saleId;
      if (!saleId) {
        throw new Error('Sale ID is required to create invoice');
      }
      const response = await this.apiClient.post(`/api/sales/${saleId}/invoice`, invoicePayload);

      if (!response || response.success === false) {
        throw new Error(response?.error || 'Fatura oluşturulamadı');
      }

      const invoice = response.data || response;

      // If document management exists, create a document record
      if (window.documentManagement && typeof window.documentManagement.createInvoiceDocument === 'function') {
        try {
          await window.documentManagement.createInvoiceDocument(invoice, patient || {});
        } catch (docErr) {
          console.warn('Failed to create invoice document record (createInvoiceDocument):', docErr);
        }
      } else if (window.documentManagement && typeof window.documentManagement.saveDocumentToPatient === 'function') {
        try {
          const doc = {
            id: invoice.id || Date.now().toString(),
            name: invoice.number ? `Fatura ${invoice.number}` : `Fatura ${invoice.id}`,
            type: 'invoice',
            uploadDate: new Date().toISOString(),
            fileName: invoice.fileName || (`invoice_${invoice.id || Date.now()}.pdf`),
            size: invoice.fileSize || 0,
            notes: invoice.notes || '',
            patientId: patient?.id || invoice.patientId || null
          };
          await window.documentManagement.saveDocumentToPatient(doc);
        } catch (docErr) {
          console.warn('Failed to create invoice document record (saveDocumentToPatient):', docErr);
        }
      }

      // Mirror into EFatura store so invoices page sees the new invoice
      try {
        const addToEfatura = (inv, patientObj) => {
          try {
            const key = 'efatura_data';
            const existing = localStorage.getItem(key);
            const arr = existing ? JSON.parse(existing) : [];

            const mapped = {
              id: String(inv.id || Date.now()),
              faturaNo: inv.number || inv.faturaNo || `INV-${inv.id || Date.now()}`,
              belgeNo: inv.documentNumber || inv.belgeNo || (inv.number || inv.id),
              tarih: inv.invoice_date || inv.createdAt || new Date().toISOString(),
              patientId: (patientObj && patientObj.id) || inv.patientId || null,
              patientName: (patientObj && ((patientObj.firstName || '') + ' ' + (patientObj.lastName || '')).trim()) || inv.patientName || '',
              items: inv.items || [],
              toplamTutar: inv.totalAmount || inv.genelToplam || inv.toplamTutar || 0,
              kdvTutar: inv.vatAmount || inv.kdvTutar || 0,
              genelToplam: inv.totalAmount || inv.genelToplam || inv.toplamTutar || 0,
              odemeYontemi: inv.paymentMethod || inv.odemeYontemi || 'nakit',
              durum: inv.status || inv.durum || 'taslak',
              aciklama: inv.notes || inv.aciklama || '',
              createdAt: inv.createdAt || new Date().toISOString()
            };

            arr.push(mapped);
            localStorage.setItem(key, JSON.stringify(arr));
            return true;
          } catch (err) {
            console.warn('addToEfatura failed', err);
            return false;
          }
        };

        // Try to fetch patient data if not provided
        let patientForMap = patient || null;
        if (!patientForMap && invoice.patientId) {
          try {
            // Try Orval-generated method first
            if (this.apiClient.getPatient) {
              patientForMap = await this.apiClient.getPatient(invoice.patientId);
            } else {
              // Fallback to manual API call
              const pResp = await this.apiClient.get(`/api/patients/${invoice.patientId}`);
              patientForMap = pResp?.data || pResp || null;
            }
          } catch (pErr) {
            // ignore
          }
        }

        addToEfatura(invoice, patientForMap);
      } catch (err) {
        console.warn('Could not mirror invoice to EFatura store from widget', err);
      }

      // Notify global invoice management to update caches
      window.dispatchEvent(new CustomEvent('invoiceCreated', { detail: invoice }));

      // Close modal
      document.getElementById(modalId)?.remove();

      // Show success
      const invoiceLabel = invoice.number || invoice.id || '—';
      this._toast(`Fatura oluşturuldu! Fatura No: ${invoiceLabel}`, 'success');

      // Allow other components a chance to react
      setTimeout(() => {
        // If invoices page is open, ask it to refresh via event
        window.dispatchEvent(new CustomEvent('invoicesUpdated', { detail: invoice }));
      }, 300);

      return invoice;
    } catch (err) {
      console.error('InvoiceWidget submit error', err);
      this._toast('Fatura oluşturulamadı: ' + (err.message || err), 'error');
      throw err;
    }
  }

  _toast(msg, type = 'info') {
    if (window.showToast) return window.showToast(msg, type);
    console.log(`[${type}] ${msg}`);
  }
}

// Export global
if (typeof window !== 'undefined') {
  window.InvoiceWidget = InvoiceWidget;
}
