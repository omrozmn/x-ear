/**
 * Invoice Management Component
 * Handles invoice creation for device sales
 */
class InvoiceManagementComponent {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.invoices = [];
        this.loadInvoices();

        // Listen for globally created invoices to keep local cache in sync
        window.addEventListener('invoiceCreated', (e) => {
            try {
                const invoice = e.detail;
                if (invoice && invoice.id) {
                    // Avoid duplicates
                    if (!this.invoices.find(i => i.id === invoice.id)) {
                        this.invoices.push(invoice);
                        this.saveInvoices();
                    }
                }
            } catch (err) {
                console.warn('invoiceCreated handler error', err);
            }
        });
    }

    /**
     * Load invoices from localStorage
     */
    loadInvoices() {
        try {
            const stored = localStorage.getItem(window.STORAGE_KEYS?.INVOICES || 'xear_invoices');
            this.invoices = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading invoices:', error);
            this.invoices = [];
        }
    }

    /**
     * Save invoices to localStorage
     */
    saveInvoices() {
        try {
            localStorage.setItem(window.STORAGE_KEYS?.INVOICES || 'xear_invoices', JSON.stringify(this.invoices));
        } catch (error) {
            console.error('Error saving invoices:', error);
        }
    }

    /**
     * Create invoice for a device assignment
     * @param {string} deviceId - Device assignment ID
     * @param {string} patientId - Patient ID
     */
    async createDeviceInvoice(deviceId, patientId) {
        try {
            // If invoice widget exists, delegate to it (provides full editable form)
            if (window.invoiceWidget && typeof window.invoiceWidget.openForDevice === 'function') {
                return window.invoiceWidget.openForDevice(deviceId, patientId);
            }

            // Fallback to legacy behavior
            // Get device details
            const deviceResponse = await this.apiClient.getPatientDevices(patientId);
            const devices = Array.isArray(deviceResponse) ? deviceResponse : (deviceResponse?.data || []);
            const device = devices.find(d => d.id === deviceId);

            if (!device) {
                throw new Error('Cihaz bulunamadı');
            }

            // Get patient details
            const patientResponse = await this.apiClient.getPatient(patientId);
            const patient = patientResponse?.data || patientResponse;

            if (!patient) {
                throw new Error('Hasta bulunamadı');
            }

            // Show confirmation modal
            this.showInvoiceConfirmModal(device, patient);

        } catch (error) {
            console.error('Error preparing invoice:', error);
            this.showToast('Fatura hazırlanırken hata oluştu: ' + error.message, 'error');
        }
    }

    /**
     * Show invoice confirmation modal
     * @param {Object} device - Device data
     * @param {Object} patient - Patient data
     */
    showInvoiceConfirmModal(device, patient) {
        const modalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="invoiceConfirmModal">
                <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-semibold">Fatura Oluştur</h2>
                        <button class="text-gray-500 hover:text-gray-700" onclick="window.invoiceManagement.closeInvoiceModal()">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <!-- Patient Info -->
                    <div class="mb-4 p-4 bg-gray-50 rounded-lg">
                        <h3 class="font-semibold mb-2">Hasta Bilgileri</h3>
                        <p class="text-sm text-gray-700">${patient.firstName || ''} ${patient.lastName || ''}</p>
                        <p class="text-sm text-gray-600">${patient.phone || 'Telefon belirtilmemiş'}</p>
                        <p class="text-sm text-gray-600">TC: ${patient.identityNumber || patient.tcNumber || 'Belirtilmemiş'}</p>
                    </div>

                    <!-- Device Info -->
                    <div class="mb-6 p-4 border border-gray-200 rounded-lg">
                        <h3 class="font-semibold mb-3">Cihaz Bilgileri</h3>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Marka/Model:</span>
                                <span class="text-sm font-medium">${device.brand || 'Bilinmiyor'} ${device.model || ''}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Kulak:</span>
                                <span class="text-sm font-medium">${device.ear === 'left' || device.ear === 'LEFT' ? 'Sol' : device.ear === 'right' || device.ear === 'RIGHT' ? 'Sağ' : 'Bilateral'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Seri No:</span>
                                <span class="text-sm font-medium font-mono">${device.serialNumber || 'Yok'}</span>
                            </div>
                            <div class="flex justify-between border-t pt-2 mt-2">
                                <span class="text-sm font-semibold">Fiyat:</span>
                                <span class="text-sm font-bold text-blue-600">₺${(device.price || device.salePrice || 0).toLocaleString('tr-TR')}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Confirmation Message -->
                    <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p class="text-sm text-blue-900">
                            <i class="fas fa-info-circle mr-2"></i>
                            Bu işlem fatura oluşturacak, Dokümanlar sekmesine ekleyecek ve zaman çizelgesine kaydedecektir.
                        </p>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex justify-end space-x-3">
                        <button type="button" 
                                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50" 
                                onclick="window.invoiceManagement.closeInvoiceModal()">
                            İptal
                        </button>
                        <button type="button" 
                                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700" 
                                onclick="window.invoiceManagement.generateInvoice('${device.id}', '${patient.id}')">
                            <i class="fas fa-file-invoice mr-2"></i>Fatura Oluştur
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Close invoice modal
     */
    closeInvoiceModal() {
        const modal = document.getElementById('invoiceConfirmModal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Generate invoice
     * @param {string} deviceId - Device assignment ID
     * @param {string} patientId - Patient ID
     */
    async generateInvoice(deviceId, patientId) {
        try {
            // Get device and patient details
            const deviceResponse = await this.apiClient.getPatientDevices(patientId);
            const devices = Array.isArray(deviceResponse) ? deviceResponse : (deviceResponse?.data || []);
            const device = devices.find(d => d.id === deviceId);

            const patientResponse = await this.apiClient.getPatient(patientId);
            const patient = patientResponse?.data || patientResponse;

            if (!device || !patient) {
                throw new Error('Cihaz veya hasta bilgisi bulunamadı');
            }

            // Validate required fields before API call
            if (!patient.id || !(device.price || device.salePrice || device.devicePrice)) {
                // If centralized widget exists, open it to let user fill missing info
                if (window.invoiceWidget && typeof window.invoiceWidget.openForDevice === 'function') {
                    this.showToast('Fatura için gerekli alanlar eksik; fatura formunu açıyorum.', 'warning');
                    return window.invoiceWidget.openForDevice(deviceId, patientId);
                }
                throw new Error('patientId and devicePrice are required');
            }

            // Prepare invoice data for backend API
            const invoiceData = {
                patientId: patientId,
                deviceId: deviceId,
                deviceName: `${device.brand || 'Bilinmiyor'} ${device.model || ''}`.trim(),
                deviceSerial: device.serialNumber || '',
                devicePrice: device.price || device.salePrice || 0,
                notes: `${device.ear || 'Bilateral'} kulak - ${device.reason || 'Satış'}`,
                createdBy: 'system'
            };

            // Create invoice via backend API
            const response = await this.apiClient.post('/api/invoices', invoiceData);

            if (!response?.success) {
                throw new Error(response?.message || 'Fatura oluşturulamadı');
            }

            const invoice = response.data;

            // Save to localStorage as backup/cache
            this.invoices.push(invoice);
            this.saveInvoices();

            // Also append to the global EFatura store so the invoices page (which uses EFaturaDataService) sees the new invoice
            try {
                const addToEfatura = (inv, patientObj) => {
                    try {
                        const key = 'efatura_data';
                        const existing = localStorage.getItem(key);
                        const arr = existing ? JSON.parse(existing) : [];

                        // Minimal mapping to the efatura shape used by invoices page
                        const faturaNo = inv.number || inv.faturaNo || `INV-${inv.id || Date.now()}`;
                        const mapped = {
                            id: String(inv.id || Date.now()),
                            faturaNo: faturaNo,
                            belgeNo: inv.documentNumber || inv.belgeNo || faturaNo,
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

                // Attempt to fetch patient name if not present
                let patientForMap = null;
                try {
                    if (!invoice.patientId) {
                        patientForMap = null;
                    } else {
                        // Try Orval-generated method first
                        if (this.apiClient.getPatient) {
                            patientForMap = await this.apiClient.getPatient(invoice.patientId);
                        } else {
                            // Fallback to manual API call
                            const pResp = await this.apiClient.get(`/api/patients/${invoice.patientId}`);
                            patientForMap = pResp?.data || pResp;
                        }
                    }
                } catch (pErr) {
                    // ignore
                }

                addToEfatura(invoice, patientForMap);
            } catch (err) {
                console.warn('Could not mirror invoice to EFatura store', err);
            }

            // Create document record for Documents tab
            if (window.documentManagement) {
                try {
                    if (typeof window.documentManagement.createInvoiceDocument === 'function') {
                        await window.documentManagement.createInvoiceDocument(invoice, patient);
                    } else if (typeof window.documentManagement.saveDocumentToPatient === 'function') {
                        // Build a document metadata object for the invoice
                        const doc = {
                            id: invoice.id || (Date.now().toString()),
                            name: invoice.number ? `Fatura ${invoice.number}` : `Fatura ${invoice.id}`,
                            type: 'invoice',
                            uploadDate: new Date().toISOString(),
                            fileName: invoice.fileName || (`invoice_${invoice.id || Date.now()}.pdf`),
                            size: invoice.fileSize || 0,
                            notes: invoice.notes || '',
                            patientId: patient?.id || invoice.patientId || patientId
                        };
                        await window.documentManagement.saveDocumentToPatient(doc);
                    } else {
                        console.warn('documentManagement does not provide createInvoiceDocument or saveDocumentToPatient');
                    }
                } catch (docError) {
                    console.warn('Could not create document record:', docError);
                }
            }

            // Close modal
            this.closeInvoiceModal();

            // Show success message (use invoice.number or fallback to id)
            const invoiceLabel = invoice.number || invoice.id || '—';
            this.showToast(`Fatura oluşturuldu! Fatura No: ${invoiceLabel}`, 'success');

            // Notify UI to refresh without reloading the page and keep user in same tab
            window.dispatchEvent(new CustomEvent('invoiceCreated', { detail: invoice }));
            window.dispatchEvent(new CustomEvent('invoicesUpdated', { detail: invoice }));
            window.dispatchEvent(new CustomEvent('reloadSalesTab', { detail: { patientId: patient?.id || invoice.patientId } }));

            // Do not reload the page; keep the user on the same tab
            // setTimeout(() => window.location.reload(), 1500);

        } catch (error) {
            console.error('Error generating invoice:', error);
            this.showToast('Fatura oluşturulurken hata oluştu: ' + error.message, 'error');
        }
    }

    /**
     * Generate a unique invoice number
     * @returns {string} Invoice number
     */
    generateInvoiceNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = this.invoices.filter(inv => inv.number?.startsWith(`INV${year}${month}`)).length + 1;
        return `INV${year}${month}${String(count).padStart(4, '0')}`;
    }

    /**
     * Get patient invoices
     * @param {string} patientId - Patient ID
     * @returns {Array} Invoices
     */
    getPatientInvoices(patientId) {
        return this.invoices.filter(inv => inv.patientId === patientId);
    }

    /**
     * Get invoice by ID
     * @param {string} invoiceId - Invoice ID
     * @returns {Object|null} Invoice or null
     */
    getInvoiceById(invoiceId) {
        return this.invoices.find(inv => inv.id === invoiceId) || null;
    }
}

// Initialize global instance
if (typeof window !== 'undefined') {
    window.InvoiceManagementComponent = InvoiceManagementComponent;
    // Will be initialized in main app with API client
}
