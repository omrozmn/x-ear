// Orval API functions are available on window global object
// import { proformasCreateProforma, proformasGetPatientProformas, proformasGetProforma, proformasConvertProformaToSale } from '../js/generated/orval-api.js';

// Use browser-compatible logger (avoid global const redeclaration across scripts)
var logger = window.logger || console;

/**
 * Proforma Management Component
 * Handles proforma (price quote) creation, viewing, and downloading
 */
class ProformaManagementComponent {
    constructor() {
        this.proformas = [];
        this.loadProformas();
    }

    /**
     * Load proformas from localStorage
     */
    loadProformas() {
        try {
            const stored = localStorage.getItem(window.STORAGE_KEYS?.PROFORMAS || 'xear_proformas');
            this.proformas = stored ? JSON.parse(stored) : [];
        } catch (error) {
            logger.error('Error loading proformas:', error);
            this.proformas = [];
        }
    }

    /**
     * Save proformas to localStorage
     */
    saveProformas() {
        try {
            localStorage.setItem(window.STORAGE_KEYS?.PROFORMAS || 'xear_proformas', JSON.stringify(this.proformas));
        } catch (error) {
            logger.error('Error saving proformas:', error);
        }
    }

    /**
     * Create a new proforma
     * @param {Object} proformaData - Proforma data
     * @returns {Object} Created proforma
     */
    async createProforma(proformaData) {
        try {
            // Prepare data for backend API
            const apiData = {
                patientId: proformaData.patientId,
                companyName: proformaData.companyName || null,
                deviceName: proformaData.devices && proformaData.devices.length > 0 
                    ? proformaData.devices.map(d => `${d.brand} ${d.model}`).join(', ')
                    : 'Belirtilmemiş',
                deviceSerial: proformaData.devices && proformaData.devices.length > 0 
                    ? proformaData.devices[0].serialNumber || ''
                    : '',
                devicePrice: proformaData.totalAmount || 0,
                notes: proformaData.notes || '',
                createdBy: proformaData.createdBy || 'system'
            };

            // Create proforma via backend API
            if (!window.proformasCreateProforma) {
                logger.warn('⚠️ proformasCreateProforma not available on window');
                throw new Error('proformasCreateProforma not available');
            }
            
            const response = await window.proformasCreateProforma(apiData);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Proforma oluşturulamadı');
            }

            const proforma = response.data.data;

            // Also save to localStorage as backup/cache
            const localProforma = {
                id: proforma.id,
                number: proforma.proformaNumber,
                patientId: proforma.patientId,
                patientName: proforma.patientName,
                companyName: proforma.companyName,
                devices: proformaData.devices || [],
                totalAmount: proforma.devicePrice,
                sgkSupport: proformaData.sgkSupport || 0,
                patientPayment: proformaData.patientPayment || 0,
                notes: proforma.notes,
                validUntil: proforma.validUntil,
                status: proforma.status,
                createdAt: proforma.createdAt,
                createdBy: proforma.createdBy
            };

            this.proformas.push(localProforma);
            this.saveProformas();

            // Timeline logging is handled by backend, no need to duplicate

            return localProforma;

        } catch (error) {
            logger.error('Error creating proforma:', error);
            
            // Fallback to localStorage-only if backend fails
            logger.warn('Falling back to localStorage for proforma');
            const proforma = {
                id: `proforma_${Date.now()}`,
                number: this.generateProformaNumber(),
                patientId: proformaData.patientId,
                patientName: proformaData.patientName,
                companyName: proformaData.companyName || null,
                devices: proformaData.devices || [],
                totalAmount: proformaData.totalAmount || 0,
                sgkSupport: proformaData.sgkSupport || 0,
                patientPayment: proformaData.patientPayment || 0,
                notes: proformaData.notes || '',
                validUntil: proformaData.validUntil || this.getDefaultValidUntilDate(),
                status: 'active',
                createdAt: new Date().toISOString(),
                createdBy: proformaData.createdBy || 'system'
            };

            this.proformas.push(proforma);
            this.saveProformas();

            return proforma;
        }
    }

    /**
     * Generate a unique proforma number
     * @returns {string} Proforma number
     */
    generateProformaNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = this.proformas.filter(p => p.number.startsWith(`PF${year}${month}`)).length + 1;
        return `PF${year}${month}${String(count).padStart(4, '0')}`;
    }

    /**
     * Get default valid until date (30 days from now)
     * @returns {string} Date string
     */
    getDefaultValidUntilDate() {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
    }

    /**
     * Get proformas for a patient from backend API
     * @param {string} patientId - Patient ID
     * @returns {Promise<Array>} Proformas
     */
    async getPatientProformas(patientId) {
        try {
            // Use window.apiClient if available, otherwise fallback to orval functions
            if (window.apiClient && window.apiClient.get) {
                const response = await window.apiClient.get(`/api/patients/${patientId}/proformas`);
                
                if (response && response.success && response.data) {
                    // Update localStorage cache
                    const cached = this.proformas.filter(p => p.patientId !== patientId);
                    this.proformas = [...cached, ...response.data];
                    this.saveProformas();

                    return response.data;
                } else {
                    logger.warn('Backend returned error or no data');
                    // Fall back to localStorage
                    return this.proformas.filter(p => p.patientId === patientId);
                }
            } else if (window.proformasGetPatientProformas) {
                logger.warn('⚠️ Using legacy proformasGetPatientProformas method');
                const response = await window.proformasGetPatientProformas(patientId);

                if (response.data.success) {
                    // Update localStorage cache
                    const cached = this.proformas.filter(p => p.patientId !== patientId);
                    this.proformas = [...cached, ...response.data.data];
                    this.saveProformas();

                    return response.data.data;
                } else {
                    logger.warn('Backend returned error:', response.data.message);
                    // Fall back to localStorage
                    return this.proformas.filter(p => p.patientId === patientId);
                }
            } else {
                logger.warn('⚠️ No API client available for proformas fetch');
                // Fall back to localStorage only
                return this.proformas.filter(p => p.patientId === patientId);
            }
        } catch (error) {
            logger.error('Error fetching proformas from backend:', error);
            // Fall back to localStorage
            return this.proformas.filter(p => p.patientId === patientId);
        }
    }

    /**
     * Get proforma by ID
     * @param {string} proformaId - Proforma ID
     * @returns {Object|null} Proforma or null
     */
    /**
     * Get proforma by ID from backend API
     * @param {string} proformaId - Proforma ID
     * @returns {Promise<Object|null>} Proforma object or null
     */
    async getProformaById(proformaId) {
        try {
            // Use API client if available, otherwise fallback to direct fetch
            if (window.apiClient) {
                const result = await window.apiClient.get(`/api/proformas/${proformaId}`);
                if (result.success && result.data) {
                    return result.data;
                }
                return null;
            } else {
                if (!window.proformasGetProforma) {
                    logger.warn('⚠️ proformasGetProforma not available on window');
                    return null;
                }
                
                const response = await window.proformasGetProforma(proformaId);

                if (response.data.success && response.data.data) {
                    return response.data.data;
                }
                return null;
            }
        } catch (error) {
            logger.error('Error fetching proforma:', error);
            return null;
        }
    }

    /**
     * Update proforma status
     * @param {string} proformaId - Proforma ID
     * @param {string} status - New status
     */
    updateProformaStatus(proformaId, status) {
        const proforma = this.proformas.find(p => p.id === proformaId);
        if (proforma) {
            proforma.status = status;
            proforma.updatedAt = new Date().toISOString();
            this.saveProformas();
        }
    }

    /**
     * Open create proforma modal
     * @param {string} patientId - Patient ID
     * @param {Object} deviceData - Device assignment data (optional)
     */
    openCreateProformaModal(patientId, deviceData = null) {
        // Get patient info
        const patients = JSON.parse(localStorage.getItem('xear_patients') || '[]');
        const patient = patients.find(p => p.id === patientId);

        if (!patient) {
            if (window.showCustomAlert) {
                window.showCustomAlert('Hata', 'Hasta bulunamadı', 'error');
            } else {
                alert('Hasta bulunamadı');
            }
            return;
        }
        
        // Get inventory items for device selection
        const inventory = JSON.parse(localStorage.getItem('xear_crm_inventory') || '[]');
        const availableDevices = inventory.filter(item => 
            item.stockQuantity > 0 && !item.uniqueId && item.category !== 'ACCESSORY'
        );

        const modalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="createProformaModal">
                <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-semibold">Proforma Oluştur</h2>
                        <button class="text-gray-500 hover:text-gray-700" onclick="window.proformaManagement.closeCreateProformaModal()">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <form id="createProformaForm">
                        <!-- Patient Info -->
                        <div class="mb-4 p-4 bg-gray-50 rounded-lg">
                            <h3 class="font-semibold mb-2">Hasta Bilgileri</h3>
                            <p class="text-sm text-gray-700">${patient.firstName} ${patient.lastName}</p>
                            <p class="text-sm text-gray-600">${patient.phone || 'Telefon belirtilmemiş'}</p>
                        </div>

                        <!-- Company Name (Optional) -->
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Kurum Adı (İsteğe Bağlı)</label>
                            <input type="text" name="companyName" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Kurum adı varsa giriniz">
                        </div>

                        <!-- Device Selection -->
                        <div class="mb-4">
                            <div class="flex justify-between items-center mb-3">
                                <h3 class="font-semibold">Cihaz Seçimi</h3>
                                <button type="button" onclick="window.proformaManagement.addDeviceRow()" class="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                                    <i class="fas fa-plus mr-1"></i>Cihaz Ekle
                                </button>
                            </div>
                            <div id="proformaDevicesList" class="space-y-3">
                                <!-- Device rows will be added here -->
                            </div>
                        </div>

                        <!-- Total Summary -->
                        <div class="mb-4 p-4 bg-gray-50 rounded-lg">
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-sm text-gray-600">Toplam Liste Fiyatı:</span>
                                    <span class="text-sm font-medium" id="proformaTotalList">₺0.00</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-sm text-gray-600">Toplam SGK Desteği:</span>
                                    <span class="text-sm font-medium text-green-600" id="proformaTotalSgk">-₺0.00</span>
                                </div>
                                <div class="flex justify-between border-t pt-2 mt-2">
                                    <span class="text-sm font-semibold">Toplam Hasta Payı:</span>
                                    <span class="text-sm font-bold text-blue-600" id="proformaTotalPatient">₺0.00</span>
                                </div>
                            </div>
                        </div>

                        <!-- Valid Until -->
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Geçerlilik Tarihi</label>
                            <input type="date" name="validUntil" value="${this.getDefaultValidUntilDate()}" class="w-full border border-gray-300 rounded-md px-3 py-2" required>
                        </div>

                        <!-- Notes -->
                        <div class="mb-6">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
                            <textarea name="notes" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Ek notlar..."></textarea>
                        </div>

                        <!-- Submit Button -->
                        <div class="flex justify-end space-x-3">
                            <button type="button" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50" onclick="window.proformaManagement.closeCreateProformaModal()">
                                İptal
                            </button>
                            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                Proforma Oluştur
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Form submission
        document.getElementById('createProformaForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            // Collect all devices from rows
            const container = document.getElementById('proformaDevicesList');
            const devices = [];
            let totalAmount = 0;
            let totalSgkSupport = 0;
            
            container.querySelectorAll('[data-row-index]').forEach(row => {
                const rowIndex = row.dataset.rowIndex;
                const deviceSelect = document.querySelector(`[name="deviceId_${rowIndex}"]`);
                const selectedOption = deviceSelect.options[deviceSelect.selectedIndex];
                
                if (selectedOption && selectedOption.value) {
                    const ear = formData.get(`ear_${rowIndex}`);
                    const listPrice = parseFloat(formData.get(`listPrice_${rowIndex}`) || 0);
                    const sgkSupport = parseFloat(formData.get(`sgkSupport_${rowIndex}`) || 0);
                    const patientPayment = Math.max(0, listPrice - sgkSupport);
                    
                    devices.push({
                        inventoryId: selectedOption.value,
                        brand: selectedOption.dataset.brand,
                        model: selectedOption.dataset.model,
                        ear: ear,
                        listPrice: listPrice,
                        sgkSupport: sgkSupport,
                        patientPayment: patientPayment
                    });
                    
                    totalAmount += listPrice;
                    totalSgkSupport += sgkSupport;
                }
            });
            
            if (devices.length === 0) {
                this.showToast('En az bir cihaz eklemelisiniz', 'warning');
                return;
            }

            const proformaData = {
                patientId: patientId,
                patientName: `${patient.firstName} ${patient.lastName}`,
                companyName: formData.get('companyName'),
                devices: devices,
                totalAmount: totalAmount,
                sgkSupport: totalSgkSupport,
                patientPayment: Math.max(0, totalAmount - totalSgkSupport),
                validUntil: formData.get('validUntil'),
                notes: formData.get('notes')
            };

            const proforma = this.createProforma(proformaData);
            
            this.closeCreateProformaModal();
            
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Proforma başarıyla oluşturuldu!', 'success');
            }

            // Optionally download immediately
            setTimeout(() => {
                if (window.showCustomConfirm) {
                    window.showCustomConfirm('İndirme', 'Proformayı şimdi indirmek ister misiniz?', () => {
                        this.downloadProforma(proforma.id);
                    });
                } else {
                    if (confirm('Proformayı şimdi indirmek ister misiniz?')) {
                        this.downloadProforma(proforma.id);
                    }
                }
            }, 500);
        });
        
        // Add initial device row
        setTimeout(() => this.addDeviceRow(), 100);
    }

    /**
     * Close create proforma modal
     */
    closeCreateProformaModal() {
        const modal = document.getElementById('createProformaModal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * View proforma
     * @param {string} proformaId - Proforma ID
     */
    async viewProforma(proformaId) {
        const proforma = await this.getProformaById(proformaId);
        if (!proforma) {
            if (window.showCustomAlert) {
                window.showCustomAlert('Hata', 'Proforma bulunamadı', 'error');
            } else {
                alert('Proforma bulunamadı');
            }
            return;
        }

        const modalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="viewProformaModal">
                <div class="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-lg border border-gray-200">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-semibold">Proforma: ${proforma.number}</h2>
                        <button class="text-gray-500 hover:text-gray-700" onclick="window.proformaManagement.closeViewProformaModal()">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <div id="proformaContent" class="mb-6">
                        <!-- Proforma header -->
                        <div class="mb-4 pb-4 border-b">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h3 class="text-lg font-bold">X-EAR İşitme Merkezi</h3>
                                    <p class="text-sm text-gray-600">Proforma Fatura</p>
                                </div>
                                <div class="text-right">
                                    <p class="font-semibold">No: ${proforma.number}</p>
                                    <p class="text-sm text-gray-600">Tarih: ${new Date(proforma.createdAt).toLocaleDateString('tr-TR')}</p>
                                    <p class="text-sm text-gray-600">Geçerlilik: ${new Date(proforma.validUntil).toLocaleDateString('tr-TR')}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Customer info -->
                        <div class="mb-4 pb-4 border-b">
                            <h4 class="font-semibold mb-2">Müşteri Bilgileri</h4>
                            <p>${proforma.patientName}</p>
                            ${proforma.companyName ? `<p class="text-sm text-gray-600">${proforma.companyName}</p>` : ''}
                        </div>

                        <!-- Items table -->
                        <div class="mb-4">
                            <table class="w-full">
                                <thead>
                                    <tr class="border-b">
                                        <th class="text-left py-2">Ürün</th>
                                        <th class="text-right py-2">Fiyat</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${proforma.devices.map(device => `
                                        <tr class="border-b">
                                            <td class="py-2">
                                                <div class="font-medium">${device.brand} ${device.model}</div>
                                                <div class="text-sm text-gray-600">${device.ear === 'left' ? 'Sol Kulak' : device.ear === 'right' ? 'Sağ Kulak' : 'Bilateral'}</div>
                                            </td>
                                            <td class="text-right">₺${(device.listPrice || 0).toLocaleString('tr-TR')}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <!-- Totals -->
                        <div class="space-y-2 mb-4">
                            <div class="flex justify-between">
                                <span>Toplam:</span>
                                <span class="font-semibold">₺${(proforma.devicePrice || proforma.totalAmount || 0).toLocaleString('tr-TR')}</span>
                            </div>
                            ${proforma.sgkSupport > 0 ? `
                            <div class="flex justify-between text-green-600">
                                <span>SGK Desteği:</span>
                                <span class="font-semibold">-₺${proforma.sgkSupport.toLocaleString('tr-TR')}</span>
                            </div>
                            ` : ''}
                            <div class="flex justify-between text-lg font-bold text-blue-600 border-t pt-2">
                                <span>Ödenecek Tutar:</span>
                                <span>₺${(proforma.patientPayment || proforma.devicePrice || 0).toLocaleString('tr-TR')}</span>
                            </div>
                        </div>

                        <!-- Notes -->
                        ${proforma.notes ? `
                        <div class="mb-4 p-3 bg-gray-50 rounded">
                            <p class="text-sm font-semibold mb-1">Notlar:</p>
                            <p class="text-sm text-gray-700">${proforma.notes}</p>
                        </div>
                        ` : ''}

                        <!-- Status -->
                        <div class="text-center">
                            <span class="px-3 py-1 rounded-full text-sm ${
                                proforma.status === 'active' ? 'bg-green-100 text-green-800' :
                                proforma.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                                proforma.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                            }">
                                ${
                                    proforma.status === 'active' ? 'Aktif' :
                                    proforma.status === 'accepted' ? 'Kabul Edildi' :
                                    proforma.status === 'rejected' ? 'Reddedildi' :
                                    'Süresi Doldu'
                                }
                            </span>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex justify-between items-center mt-6">
                        <div class="text-sm text-gray-600">Durum: <span class="font-medium">${proforma.status}</span></div>
                        <div class="flex space-x-3">
                            <button type="button" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50" onclick="window.proformaManagement.closeViewProformaModal()">
                                Kapat
                            </button>
                            <button type="button" class="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900" onclick="window.proformaManagement.downloadProforma('${proforma.id}')">
                                İndir (PDF)
                            </button>
                            ${proforma.status !== 'accepted' ? `
                            <button type="button" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700" onclick="window.proformaManagement.convertProformaToSale('${proforma.id}')">
                                Proformayı Satışa Çevir
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Close view proforma modal
     */
    closeViewProformaModal() {
        const modal = document.getElementById('viewProformaModal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Download proforma as PDF
     * @param {string} proformaId - Proforma ID
     */
    async downloadProforma(proformaId) {
        const proforma = await this.getProformaById(proformaId);
        if (!proforma) {
            if (window.showCustomAlert) {
                window.showCustomAlert('Hata', 'Proforma bulunamadı', 'error');
            } else {
                alert('Proforma bulunamadı');
            }
            return;
        }

        // For now, create a printable version
        // TODO: Integrate with PDF generation library (jsPDF or similar)
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Proforma - ${proforma.number}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    .company { font-size: 18px; font-weight: bold; }
                    .proforma-number { text-align: right; }
                    .customer { margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .totals { text-align: right; margin-top: 20px; }
                    .totals div { margin: 5px 0; }
                    .final-total { font-size: 18px; font-weight: bold; color: #0066cc; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company">
                        <div>X-EAR İşitme Merkezi</div>
                        <div style="font-size: 12px; font-weight: normal;">Proforma Fatura</div>
                    </div>
                    <div class="proforma-number">
                        <div>No: ${proforma.number}</div>
                        <div style="font-size: 12px;">Tarih: ${new Date(proforma.createdAt).toLocaleDateString('tr-TR')}</div>
                        <div style="font-size: 12px;">Geçerlilik: ${new Date(proforma.validUntil).toLocaleDateString('tr-TR')}</div>
                    </div>
                </div>

                <div class="customer">
                    <strong>Müşteri Bilgileri:</strong><br>
                    ${proforma.patientName}<br>
                    ${proforma.companyName ? `${proforma.companyName}<br>` : ''}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Ürün</th>
                            <th style="text-align: right;">Fiyat</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${proforma.devices.map(device => `
                            <tr>
                                <td>
                                    <strong>${device.brand} ${device.model}</strong><br>
                                    <small>${device.ear === 'left' ? 'Sol Kulak' : device.ear === 'right' ? 'Sağ Kulak' : 'Bilateral'}</small>
                                </td>
                                <td style="text-align: right;">₺${(device.listPrice || 0).toLocaleString('tr-TR')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="totals">
                    <div>Toplam: ₺${(proforma.devicePrice || proforma.totalAmount || 0).toLocaleString('tr-TR')}</div>
                    ${proforma.sgkSupport > 0 ? `<div style="color: green;">SGK Desteği: -₺${proforma.sgkSupport.toLocaleString('tr-TR')}</div>` : ''}
                    <div class="final-total">Ödenecek Tutar: ₺${(proforma.patientPayment || proforma.devicePrice || 0).toLocaleString('tr-TR')}</div>
                </div>

                ${proforma.notes ? `
                <div style="margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                    <strong>Notlar:</strong><br>
                    ${proforma.notes}
                </div>
                ` : ''}

                <script>
                    window.onload = function() {
                        window.print();
                        // window.close(); // Uncomment to auto-close after print
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    /**
     * Render proformas section for patient sales tab
     * @param {string} patientId - Patient ID
     * @returns {Promise<string>} HTML string
     */
    async renderProformasSection(patientId) {
        const proformas = await this.getPatientProformas(patientId);

        // Ensure we have a sensible display name for the patient on each proforma
        const patientsCache = JSON.parse(localStorage.getItem('xear_patients') || '[]');
        const enhanced = (proformas || []).map(p => {
            let displayName = p.patientName || null;
            if (!displayName && patientsCache && patientsCache.length) {
                const found = patientsCache.find(x => x.id === p.patientId);
                if (found) displayName = `${found.firstName || ''} ${found.lastName || ''}`.trim();
            }
            if (!displayName && typeof window !== 'undefined' && window.currentPatientData && window.currentPatientData.id === p.patientId) {
                displayName = `${window.currentPatientData.firstName || ''} ${window.currentPatientData.lastName || ''}`.trim();
            }
            if (!displayName) displayName = 'Bilinmeyen Hasta';
            return { ...p, _patientDisplayName: displayName };
        });

        return `
            <div class="mb-6">
                <h3 class="text-lg font-semibold mb-3">Fiyat Teklifleri (Proforma)</h3>
                ${proformas.length === 0 ? `
                    <p class="text-gray-500 text-sm">Henüz proforma oluşturulmamış.</p>
                ` : `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${enhanced.map(proforma => `
                            <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                <div class="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 class="text-sm font-semibold text-gray-900">${proforma.proformaNumber || proforma.number}</h4>
                                        <p class="text-xs text-gray-500">${new Date(proforma.createdAt).toLocaleDateString('tr-TR')}</p>
                                        <p class="text-xs text-gray-600 mt-1">${proforma._patientDisplayName}</p>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <div class="text-right mr-2">
                                            <div class="text-sm font-bold text-blue-600">₺${(proforma.patientPayment || proforma.devicePrice || 0).toLocaleString('tr-TR')}</div>
                                            <div class="text-xs text-gray-500">Geçerlilik: ${new Date(proforma.validUntil).toLocaleDateString('tr-TR')}</div>
                                        </div>
                                        <span class="px-2 py-1 text-xs rounded-full ${
                                            proforma.status === 'active' ? 'bg-green-100 text-green-800' :
                                            proforma.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                                            proforma.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }">
                                            ${
                                                proforma.status === 'active' ? 'Aktif' :
                                                proforma.status === 'accepted' ? 'Kabul' :
                                                proforma.status === 'rejected' ? 'Red' :
                                                'Süresi Doldu'
                                            }
                                        </span>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <ul class="text-sm text-gray-700 space-y-1">
                                        ${proforma.devices ? proforma.devices.map(d => `<li>${d.brand || 'Bilinmeyen'} ${d.model || 'Marka'} — <span class="text-gray-600">${d.ear === 'left' ? 'Sol' : d.ear === 'right' ? 'Sağ' : 'Bilateral'}</span></li>`).join('') : '<li>Cihaz bilgisi yok</li>'}
                                    </ul>
                                </div>
                                <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
                                    <div class="flex space-x-2">
                                        <button class="px-3 py-1.5 text-sm rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" onclick="window.proformaManagement.viewProforma('${proforma.id}')">Görüntüle</button>
                                        <button class="px-3 py-1.5 text-sm rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" onclick="window.proformaManagement.downloadProforma('${proforma.id}')">İndir</button>
                                    </div>
                                    ${proforma.status !== 'accepted' ? `<button class="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700" onclick="window.proformaManagement.convertProformaToSale('${proforma.id}')">Satışa Çevir</button>` : `<span class="text-sm text-gray-500">Kabul edildi</span>`}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    }

    /**
     * Alias for openCreateProformaModal for compatibility
     * @param {Object} patientData - Patient data object with id, firstName, lastName, etc.
     */
    openModal(patientData) {
        // Just pass patient ID, no pre-selected device
        this.openCreateProformaModal(patientData.id);
    }
    
    /**
     * Add a new device row to proforma
     */
    addDeviceRow() {
        const container = document.getElementById('proformaDevicesList');
        if (!container) return;
        
        const inventory = JSON.parse(localStorage.getItem('xear_crm_inventory') || '[]');
        const availableDevices = inventory.filter(item => 
            item.stockQuantity > 0 && !item.uniqueId && item.category !== 'ACCESSORY'
        );
        
        const rowIndex = container.children.length;
        const rowHtml = `
            <div class="p-3 border border-gray-200 rounded-lg" data-row-index="${rowIndex}">
                <div class="flex justify-between items-start mb-3">
                    <h4 class="font-medium text-sm">Cihaz ${rowIndex + 1}</h4>
                    <button type="button" onclick="window.proformaManagement.removeDeviceRow(${rowIndex})" class="text-red-600 hover:text-red-800 text-sm">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">Ürün Seçin</label>
                        <select name="deviceId_${rowIndex}" onchange="window.proformaManagement.onDeviceSelect(${rowIndex})" class="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" required>
                            <option value="">Seçiniz...</option>
                            ${availableDevices.map(d => `
                                <option value="${d.id}" data-price="${d.price || 0}" data-brand="${d.brand || ''}" data-model="${d.model || ''}">
                                    ${d.brand} ${d.model} - ₺${(d.price || 0).toLocaleString('tr-TR')}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">Kulak</label>
                        <select name="ear_${rowIndex}" onchange="window.proformaManagement.calculateTotal()" class="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" required>
                            <option value="left">Sol</option>
                            <option value="right">Sağ</option>
                            <option value="both">Bilateral</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">Liste Fiyatı</label>
                        <input type="number" name="listPrice_${rowIndex}" step="0.01" readonly class="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-gray-50" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">SGK Desteği</label>
                        <input type="number" name="sgkSupport_${rowIndex}" step="0.01" onchange="window.proformaManagement.calculateTotal()" class="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" placeholder="0.00">
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', rowHtml);
        this.calculateTotal();
    }

    /**
     * Convert a proforma (quote) to a sale by calling sales API.
     * On success mark proforma as accepted and refresh sales tab.
     * @param {string} proformaId
     */
    async convertProformaToSale(proformaId) {
        const proforma = await this.getProformaById(proformaId);
        if (!proforma) {
            this.showToast('Proforma bulunamadı', 'error');
            return;
        }

        this.showConfirm('Bu proformayı satışa çevirmek istediğinize emin misiniz?', () => {
            this.performProformaToSaleConversion(proformaId, proforma);
        });
    }

    async performProformaToSaleConversion(proformaId, proforma) {

        try {
            // Get inventory data to match devices
            const inventory = JSON.parse(localStorage.getItem('xear_crm_inventory') || '[]');
            
            // Build sale payload compatible with assign-devices-extended
            const deviceAssignments = [];
            
            for (const device of (proforma.devices || [])) {
                // Find matching inventory item by brand and model
                const matchingInventory = inventory.find(inv => 
                    inv.brand === device.brand && inv.model === device.model && inv.stockQuantity > 0
                );
                
                if (!matchingInventory) {
                    throw new Error(`Stokta ${device.brand} ${device.model} bulunamadı. Lütfen önce envanteri kontrol edin.`);
                }
                
                deviceAssignments.push({
                    inventoryId: matchingInventory.id,
                    ear_side: device.ear || 'both',
                    ear: device.ear || 'both',
                    reason: 'Sale',
                    base_price: parseFloat(device.listPrice || 0),
                    sale_price: parseFloat(device.patientPayment || device.listPrice || 0),
                    sgk_scheme: device.sgkSupportType || 'no_coverage',
                    payment_method: 'cash',
                    discount_type: 'none',
                    discount_value: 0,
                    from_inventory: true
                });
            }

            const saleData = {
                device_assignments: deviceAssignments,
                sgk_scheme: proforma.sgkSupport || 'no_coverage',
                payment_plan: 'cash',
                accessories: [],
                services: [],
                notes: proforma.notes || ''
            };

            // POST to backend proforma convert endpoint
            let result;
            if (window.apiClient) {
                result = await window.apiClient.post(`/api/proformas/${proformaId}/convert`, saleData);
            } else {
                if (!window.proformasConvertProformaToSale) {
                    logger.warn('⚠️ proformasConvertProformaToSale not available on window');
                    throw new Error('proformasConvertProformaToSale not available');
                }
                
                const response = await window.proformasConvertProformaToSale(proformaId, saleData);
                result = response.data;

                if (!response.data.success) {
                    throw new Error(response.data.message || 'Satış oluşturulamadı');
                }
            }

            if (result.success === false) {
                throw new Error(result.message || result.error || 'Satış oluşturulamadı');
            }

            // Mark proforma accepted locally
            this.updateProformaStatus(proformaId, 'accepted');
            this.saveProformas();

            // Notify user and refresh sales tab
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Proforma satışa çevrildi', 'success');
            }

            // Refresh Sales tab via existing mechanism
            if (window.salesManagement && typeof window.salesManagement.reloadSalesTab === 'function') {
                await window.salesManagement.reloadSalesTab(proforma.patientId);
            } else if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('reloadSalesTab', { detail: { patientId: proforma.patientId } }));
            }

            // Close modal if open
            this.closeViewProformaModal();

            return result;
        } catch (error) {
            logger.error('Proforma -> sale conversion failed:', error);
            // Fallback: mark proforma as accepted locally if user wants
            this.showConfirm('Backend hatası oluştu. Yine de proformayı yerel olarak kabul etmek ister misiniz?', () => {
                this.updateProformaStatus(proformaId, 'accepted');
                this.saveProformas();
                this.showToast('Proforma yerel olarak kabul edildi', 'info');
                if (window.salesManagement && typeof window.salesManagement.reloadSalesTab === 'function') {
                    window.salesManagement.reloadSalesTab(proforma.patientId);
                }
            }, () => {
                this.showToast('Satışa çevirme başarısız: ' + error.message, 'error');
            });
            throw error;
        }
    }
    
    /**
     * Remove device row from proforma
     */
    removeDeviceRow(rowIndex) {
        const row = document.querySelector(`[data-row-index="${rowIndex}"]`);
        if (row) {
            row.remove();
            this.calculateTotal();
        }
    }
    
    /**
     * Handle device selection in row
     */
    onDeviceSelect(rowIndex) {
        const select = document.querySelector(`[name="deviceId_${rowIndex}"]`);
        const selectedOption = select.options[select.selectedIndex];
        
        if (selectedOption && selectedOption.value) {
            const price = parseFloat(selectedOption.dataset.price || 0);
            const priceInput = document.querySelector(`[name="listPrice_${rowIndex}"]`);
            if (priceInput) {
                priceInput.value = price.toFixed(2);
            }
        }
        
        this.calculateTotal();
    }
    
    /**
     * Calculate proforma totals
     */
    calculateTotal() {
        const container = document.getElementById('proformaDevicesList');
        if (!container) return;
        
        let totalList = 0;
        let totalSgk = 0;
        
        container.querySelectorAll('[data-row-index]').forEach(row => {
            const rowIndex = row.dataset.rowIndex;
            const listPrice = parseFloat(document.querySelector(`[name="listPrice_${rowIndex}"]`)?.value || 0);
            const sgkSupport = parseFloat(document.querySelector(`[name="sgkSupport_${rowIndex}"]`)?.value || 0);
            
            totalList += listPrice;
            totalSgk += sgkSupport;
        });
        
        const totalPatient = Math.max(0, totalList - totalSgk);
        
        document.getElementById('proformaTotalList').textContent = '₺' + totalList.toLocaleString('tr-TR', {minimumFractionDigits: 2});
        document.getElementById('proformaTotalSgk').textContent = '-₺' + totalSgk.toLocaleString('tr-TR', {minimumFractionDigits: 2});
        document.getElementById('proformaTotalPatient').textContent = '₺' + totalPatient.toLocaleString('tr-TR', {minimumFractionDigits: 2});
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (window.Utils && window.Utils.showToast) {
            window.Utils.showToast(message, type);
        } else {
            // Fallback toast implementation
            const toast = document.createElement('div');
            toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 transition-all duration-300 ${
                type === 'success' ? 'bg-green-600' :
                type === 'error' ? 'bg-red-600' :
                type === 'warning' ? 'bg-yellow-600' :
                'bg-blue-600'
            }`;
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }
    }

    /**
     * Show confirmation dialog with toast-style modal
     */
    showConfirm(message, onConfirm, onCancel = null) {
        // Create modern confirmation modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all duration-200 scale-95">
                <div class="flex items-center mb-4">
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900">Onay Gerekli</h3>
                        <p class="text-sm text-gray-500">Bu işlemi onaylamanız gerekiyor</p>
                    </div>
                </div>
                
                <div class="mb-6">
                    <p class="text-gray-700">${message}</p>
                </div>
                
                <div class="flex space-x-3 justify-end">
                    <button class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" onclick="this.closest('.fixed').remove(); ${onCancel ? 'onCancel()' : ''}">
                        İptal
                    </button>
                    <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" onclick="this.closest('.fixed').remove(); onConfirm();">
                        Onayla
                    </button>
                </div>
            </div>
        `;
        
        // Add animation
        document.body.appendChild(modal);
        setTimeout(() => {
            modal.querySelector('.bg-white').classList.remove('scale-95');
            modal.querySelector('.bg-white').classList.add('scale-100');
        }, 10);
        
        // Store callbacks globally for onclick handlers
        window._tempConfirmCallback = onConfirm;
        window._tempCancelCallback = onCancel;
        
        // Update onclick handlers to use stored callbacks
        const confirmBtn = modal.querySelector('button:last-child');
        const cancelBtn = modal.querySelector('button:first-child');
        
        confirmBtn.onclick = () => {
            modal.remove();
            if (window._tempConfirmCallback) {
                window._tempConfirmCallback();
            }
            window._tempConfirmCallback = null;
            window._tempCancelCallback = null;
        };
        
        cancelBtn.onclick = () => {
            modal.remove();
            if (window._tempCancelCallback) {
                window._tempCancelCallback();
            }
            window._tempConfirmCallback = null;
            window._tempCancelCallback = null;
        };
        
        return modal;
    }
}

// Initialize global instance
if (typeof window !== 'undefined') {
    window.ProformaManagementComponent = ProformaManagementComponent;
    window.proformaManagement = new ProformaManagementComponent();
}
