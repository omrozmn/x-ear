/**
 * SGK Management Component
 * Comprehensive SGK integration for patient management
 */

class SGKManagementComponent {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.sgkDocuments = [];
        this.sgkStatuses = {
            'not_applied': { label: 'Başvuru Yapılmadı', class: 'bg-gray-100 text-gray-800' },
            'pending': { label: 'Beklemede', class: 'bg-yellow-100 text-yellow-800' },
            'processing': { label: 'İşleniyor', class: 'bg-blue-100 text-blue-800' },
            'approved': { label: 'Onaylandı', class: 'bg-green-100 text-green-800' },
            'rejected': { label: 'Reddedildi', class: 'bg-red-100 text-red-800' },
            'expired': { label: 'Süresi Doldu', class: 'bg-orange-100 text-orange-800' }
        };
        this.documentTypes = {
            'sgk_raporu': 'SGK Raporu',
            'muayene_raporu': 'Muayene Raporu',
            'hekim_raporu': 'Hekim Raporu',
            'cihaz_raporu': 'Cihaz Raporu',
            'onay_belgesi': 'Onay Belgesi',
            'fatura': 'Fatura',
            'e_recete': 'E-Reçete'
        };
        this.init();
    }

    init() {
        this.loadSGKDocuments();
        this.setupEventListeners();
    }

    loadSGKDocuments() {
        try {
            // Prefer centralized storage wrapper if available
            if (window.SGKStorage && typeof window.SGKStorage.getAll === 'function') {
                this.sgkDocuments = window.SGKStorage.getAll() || [];
            } else {
                this.sgkDocuments = JSON.parse(localStorage.getItem('sgk_documents') || '[]');
            }
        } catch (error) {
            console.error('Error loading SGK documents:', error);
            this.sgkDocuments = [];
        }
    }

    saveSGKDocuments() {
        try {
            if (window.SGKStorage && typeof window.SGKStorage.saveAll === 'function') {
                window.SGKStorage.saveAll(this.sgkDocuments || []);
            } else {
                localStorage.setItem('sgk_documents', JSON.stringify(this.sgkDocuments));
            }
        } catch (error) {
            console.error('Error saving SGK documents:', error);
        }
    }

    setupEventListeners() {
        // Global functions for SGK operations
        window.uploadSGKDocument = () => this.openUploadModal();
        window.queryEReceipt = (patientId) => this.queryEReceipt(patientId);
        window.querySGKStatus = (patientId) => this.querySGKStatus(patientId);
        window.generateSGKReport = (patientId) => this.generateSGKReport(patientId);
        window.sendToSGK = (patientId) => this.sendToSGK(patientId);
        window.viewSGKDocument = (docId) => this.viewDocument(docId);
        window.downloadSGKDocument = (docId) => this.downloadDocument(docId);
        window.deleteSGKDocument = (docId) => this.deleteDocument(docId);
        window.updateSGKInfo = (patientId, field, value) => this.updateSGKInfo(patientId, field, value);
        window.createEReceipt = (patientId) => this.createEReceipt(patientId);
        window.processEReceipt = (receiptData) => this.processEReceipt(receiptData);
    }

    renderSGKTab(patientData) {
        const sgkInfo = patientData.sgkInfo || {};
        const patientSGKDocs = this.sgkDocuments.filter(doc => doc.patientId === patientData.id);
        
        // Get status display info (matching legacy implementation)
        const getStatusInfo = (status) => {
            switch (status) {
                case 'approved':
                case 'active':
                    return { text: 'Onaylı', class: 'status-badge status-active', color: 'green' };
                case 'pending':
                    return { text: 'Beklemede', class: 'status-badge status-pending', color: 'yellow' };
                case 'expired':
                    return { text: 'Süresi Dolmuş', class: 'status-badge status-expired', color: 'red' };
                case 'rejected':
                    return { text: 'Reddedildi', class: 'status-badge status-rejected', color: 'red' };
                default:
                    return { text: 'Bilinmiyor', class: 'status-badge status-pending', color: 'gray' };
            }
        };
        
        const statusInfo = getStatusInfo(sgkInfo.status);
        const reportDate = sgkInfo.reportDate ? new Date(sgkInfo.reportDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş';
        const reportNo = sgkInfo.reportNo || 'Belirtilmemiş';
        const validityPeriod = sgkInfo.validityPeriod || 'Belirtilmemiş';
        const contributionAmount = sgkInfo.contributionAmount || 0;
        const sgkCoverage = sgkInfo.sgkCoverage || 0;
        const totalAmount = contributionAmount + sgkCoverage;
        
        return `
            <div class="space-y-6">
                <!-- SGK Status Card -->
                <div class="card p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">SGK Durum Bilgileri</h3>
                        <button class="btn btn-outline btn-sm" onclick="querySGKStatus('${patientData.id}')">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                            Durumu Sorgula
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- SGK Status Information -->
                        <div class="space-y-4">
                            <h5 class="font-medium text-gray-900">SGK Durum Bilgileri</h5>
                            <div class="space-y-3">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">SGK Durumu:</span>
                                    <span class="${statusInfo.class}">${statusInfo.text}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Rapor Tarihi:</span>
                                    <span class="font-medium">${reportDate}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Rapor No:</span>
                                    <span class="font-medium">${reportNo}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Geçerlilik:</span>
                                    <span class="font-medium">${validityPeriod}</span>
                                </div>
                                ${sgkInfo.validityDate ? `
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Geçerlilik Tarihi:</span>
                                        <span class="font-medium">${new Date(sgkInfo.validityDate).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                ` : ''}
                                <div class="flex justify-between">
                                    <span class="text-gray-600">SGK No:</span>
                                    <span class="font-medium">${sgkInfo.number || 'Belirtilmemiş'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Kurum:</span>
                                    <span class="font-medium">${sgkInfo.institution || 'SGK'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Financial Information -->
                        <div class="space-y-4">
                            <h5 class="font-medium text-gray-900">Mali Bilgiler</h5>
                            <div class="space-y-3">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Katkı Payı:</span>
                                    <span class="font-medium">₺${contributionAmount.toLocaleString('tr-TR')}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">SGK Karşılama:</span>
                                    <span class="font-medium">₺${sgkCoverage.toLocaleString('tr-TR')}</span>
                                </div>
                                <div class="flex justify-between border-t pt-2">
                                    <span class="text-gray-600 font-medium">Toplam Tutar:</span>
                                    <span class="font-bold text-lg">₺${totalAmount.toLocaleString('tr-TR')}</span>
                                </div>
                            </div>
                            
                            <!-- Device Rights -->
                            <div class="mt-4 space-y-2">
                                <h6 class="font-medium text-gray-900">Cihaz Hakları</h6>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Cihaz Hakkı:</span>
                                    <span class="px-2 py-1 text-xs rounded ${sgkInfo.deviceRight ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${sgkInfo.deviceRight ? 'Var' : 'Yok'}
                                    </span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Pil Hakkı:</span>
                                    <span class="px-2 py-1 text-xs rounded ${sgkInfo.batteryRight ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${sgkInfo.batteryRight ? 'Var' : 'Yok'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="mt-6 pt-6 border-t border-gray-200 flex flex-wrap gap-3">
                        <button onclick="updateSGKInfo('${patientData.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                            SGK Bilgilerini Güncelle
                        </button>
                        <button onclick="downloadSGKReport('${patientData.id}')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                            Rapor İndir
                        </button>
                        ${sgkInfo.status === 'pending' ? `
                            <button onclick="checkSGKStatus('${patientData.id}')" class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                                Durum Sorgula
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- E-Receipt Query Section -->
                <div class="card p-6">
                    <h3 class="text-lg font-semibold mb-4">E-Reçete Sorgulama</h3>
                    <div class="space-y-4">
                        <div class="flex space-x-3">
                            <input type="text" id="eReceiptNo" placeholder="E-reçete numarasını giriniz" 
                                   class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <button onclick="queryEReceipt('${patientData.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                Sorgula
                            </button>
                        </div>
                        <div id="eReceiptResult" class="hidden"></div>
                    </div>
                </div>

                <!-- Patient Reports Section -->
                <div class="card p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">Hasta Raporları</h3>
                        <button onclick="queryPatientReport()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                            Rapor Sorgula
                        </button>
                    </div>
                    <div id="reportResult" class="hidden"></div>
                </div>

                <!-- Device Rights Section -->
                <div class="card p-6">
                    <h3 class="text-lg font-semibold mb-4">Cihaz Hakları</h3>
                    <div id="deviceRightsInfo"></div>
                </div>

                <!-- Saved E-Receipts Section -->
                <div class="card p-6">
                    <h3 class="text-lg font-semibold mb-4">Kayıtlı E-Reçeteler</h3>
                    <div id="savedEReceipts"></div>
                </div>

                <!-- Device Assignment Section -->
                <div class="card p-6">
                    <h3 class="text-lg font-semibold mb-4">Cihaz Atama</h3>
                    <div id="deviceAssignmentInfo"></div>
                </div>

                <!-- SGK Documents -->
                <div class="card p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">SGK Belgeleri</h3>
                        <button class="btn btn-primary" onclick="uploadSGKDocument()">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                            Belge Yükle
                        </button>
                    </div>
                    
                    ${this.renderDocumentsList(patientSGKDocs)}
                </div>

                <!-- E-Receipt Management -->
                <div class="card p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">E-Reçete Yönetimi</h3>
                        <button class="btn btn-primary" onclick="createEReceipt('${patientData.id}')">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            E-Reçete Oluştur
                        </button>
                    </div>
                    
                    ${this.renderEReceiptSection(patientData)}
                </div>

                <!-- SGK Operations -->
                <div class="card p-6">
                    <h3 class="text-lg font-semibold mb-4">SGK İşlemleri</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button class="btn btn-outline" onclick="generateSGKReport('${patientData.id}')">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Rapor Oluştur
                        </button>
                        <button class="btn btn-outline" onclick="sendToSGK('${patientData.id}')">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                            </svg>
                            SGK'ya Gönder
                        </button>
                        <button class="btn btn-outline" onclick="window.sgkManagement.checkSGKDeadlines('${patientData.id}')">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Süre Kontrol
                        </button>
                        <button class="btn btn-outline" onclick="window.sgkManagement.exportSGKData('${patientData.id}')">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Veri Dışa Aktar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize sections after rendering
        setTimeout(() => {
            this.renderDocumentsList();
            this.renderEReceiptSection();
            // Load all section data
            window.loadDeviceRightsInfo();
            window.loadSavedEReceipts();
            window.loadAssignedDevices();
        }, 100);
    }

    renderDocumentsList(documents) {
        if (documents.length === 0) {
            return `
                <div class="text-center py-8 text-gray-500">
                    <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p>Henüz SGK belgesi yüklenmemiş</p>
                </div>
            `;
        }

        return `
            <div class="space-y-3">
                ${documents.map(doc => `
                    <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <div class="flex items-center space-x-2 mb-2">
                                    <h5 class="font-medium text-gray-900">${doc.filename || doc.name}</h5>
                                    <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                        ${this.documentTypes[doc.type] || doc.type}
                                    </span>
                                </div>
                                <div class="text-sm text-gray-600 space-y-1">
                                    <p>Yüklenme: ${new Date(doc.uploadDate || doc.createdAt).toLocaleDateString('tr-TR')}</p>
                                    ${doc.processedDate ? `<p>İşlenme: ${new Date(doc.processedDate).toLocaleDateString('tr-TR')}</p>` : ''}
                                    ${doc.status ? `<p>Durum: <span class="font-medium">${doc.status}</span></p>` : ''}
                                </div>
                            </div>
                            <div class="flex space-x-2 ml-4">
                                <button class="text-blue-600 hover:text-blue-800 text-sm font-medium" onclick="viewSGKDocument('${doc.id}')">
                                    Görüntüle
                                </button>
                                <button class="text-green-600 hover:text-green-800 text-sm font-medium" onclick="downloadSGKDocument('${doc.id}')">
                                    İndir
                                </button>
                                <button class="text-red-600 hover:text-red-800 text-sm font-medium" onclick="deleteSGKDocument('${doc.id}')">
                                    Sil
                                </button>
                                ${doc.candidates && doc.candidates.length ? `
                                <button class="text-indigo-600 hover:text-indigo-800 text-sm font-medium" onclick="window.sgkManagement.openCandidatesModal('${doc.id}')">
                                    Adayları Gör
                                </button>
                                ` : ''}
                             </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderEReceiptSection(patientData) {
        const eReceipts = patientData.eReceipts || [];
        
        return `
            <div class="space-y-4">
                ${eReceipts.length > 0 ? `
                    <div class="space-y-3">
                        ${eReceipts.map(receipt => `
                            <div class="border rounded-lg p-4">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <h5 class="font-medium">E-Reçete #${receipt.number}</h5>
                                        <p class="text-sm text-gray-600">Tarih: ${new Date(receipt.date).toLocaleDateString('tr-TR')}</p>
                                        <p class="text-sm text-gray-600">Tutar: ${receipt.amount} TL</p>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <span class="px-2 py-1 text-xs rounded-full ${
                                            receipt.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            receipt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }">
                                            ${receipt.status === 'approved' ? 'Onaylandı' : receipt.status === 'pending' ? 'Beklemede' : 'Reddedildi'}
                                        </span>
                                        <button class="text-blue-600 hover:text-blue-800 text-sm" onclick="window.sgkManagement.viewEReceipt('${receipt.id}')">
                                            Detay
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="text-center py-6 text-gray-500">
                        <svg class="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p>Henüz e-reçete oluşturulmamış</p>
                    </div>
                `}
            </div>
        `;
    }

    // E-Receipt Query Function
    async queryEReceipt(patientId) {
        const eReceiptNo = document.getElementById('eReceiptNo')?.value?.trim();
        const resultDiv = document.getElementById('eReceiptResult');
        
        if (!eReceiptNo) {
            this.showToast('E-reçete numarası giriniz', 'warning');
            return;
        }
        
        resultDiv.classList.remove('hidden');
        resultDiv.innerHTML = `<div class="text-center p-4">E-reçete sorgulanıyor...</div>`;

        try {
            // Simulate API call to SGK E-receipt service
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Mock response based on legacy implementation
            const mockResponse = {
                success: true,
                receiptNo: eReceiptNo,
                receiptDate: new Date().toLocaleDateString('tr-TR'),
                doctorName: 'Dr. Zeynep Kaya',
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR'),
                materials: [
                    {
                        code: 'DMT001',
                        name: 'Dijital programlanabilir işitme cihazı - sağ',
                        kdv: '0 KDV',
                        direction: 'Sağ',
                        available: true
                    },
                    {
                        code: 'DMT002', 
                        name: 'Dijital programlanabilir işitme cihazı - sol',
                        kdv: '0 KDV',
                        direction: 'Sol',
                        available: true
                    },
                    {
                        code: 'DMT003',
                        name: 'İşitme cihazı kalıbı - sağ',
                        kdv: '0 KDV',
                        direction: 'Sağ',
                        available: true
                    },
                    {
                        code: 'DMT004',
                        name: 'İşitme cihazı kalıbı - sol', 
                        kdv: '0 KDV',
                        direction: 'Sol',
                        available: true
                    },
                    {
                        code: 'BAT001',
                        name: 'İşitme cihazı pili - sağ',
                        kdv: '%20 KDV',
                        direction: 'Sağ',
                        available: true
                    },
                    {
                        code: 'BAT002',
                        name: 'İşitme cihazı pili - sol',
                        kdv: '%20 KDV', 
                        direction: 'Sol',
                        available: true
                    }
                ]
            };

            // If a modular e-receipt UI exists, use it
            if (window.SGKModals && typeof window.SGKModals.openEReceiptModal === 'function') {
                window.SGKModals.openEReceiptModal(this, mockResponse, patientId || window.currentPatientData?.id);
                return;
            }

            const materialsHTML = mockResponse.materials.map((material, index) => `
                <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div class="flex items-center">
                        <input type="checkbox" id="material_${index}" value="${material.code}" 
                               class="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                        <div>
                            <p class="font-medium text-gray-900">${material.name}</p>
                            <p class="text-sm text-gray-600">Kod: ${material.code} • ${material.kdv}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm">
                            <label for="date_${index}" class="block text-gray-600 mb-1">Başvuru Tarihi:</label>
                            <input type="date" id="date_${index}" value="${new Date().toISOString().split('T')[0]}" 
                                   max="${new Date().toISOString().split('T')[0]}"
                                   class="ereceipt-date-input text-sm border border-gray-300 rounded px-2 py-1">
                        </div>
                    </div>
                </div>
            `).join('');

            resultDiv.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div class="flex items-start">
                        <svg class="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        <div class="flex-1">
                            <h4 class="font-medium text-green-900 mb-2">E-reçete Bulundu</h4>
                            <div class="grid grid-cols-2 gap-4 text-sm text-green-800 mb-4">
                                <div><strong>E-reçete No:</strong> ${mockResponse.receiptNo}</div>
                                <div><strong>Tarih:</strong> ${mockResponse.receiptDate}</div>
                                <div><strong>Doktor:</strong> ${mockResponse.doctorName}</div>
                                <div><strong>Geçerlilik:</strong> ${mockResponse.validUntil}</div>
                            </div>
                            
                            <!-- Global Date Setting -->
                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-3">
                                        <label for="globalDate" class="text-sm font-medium text-blue-800">Tüm malzemeler için başvuru tarihi:</label>
                                        <input type="date" id="globalDate" value="${new Date().toISOString().split('T')[0]}" 
                                               max="${new Date().toISOString().split('T')[0]}"
                                               class="ereceipt-date-input text-sm border border-blue-300 rounded px-2 py-1">
                                    </div>
                                    <button onclick="(function(){const g=document.getElementById('globalDate');document.querySelectorAll('.ereceipt-date-input').forEach(d=>d.value=g.value);})()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors">
                                        Tarihi Uygula
                                    </button>
                                </div>
                            </div>
                            
                            <h5 class="font-medium text-green-900 mb-3">Malzemeler (Seçiniz):</h5>
                            <div class="space-y-3 mb-4">
                                ${materialsHTML}
                            </div>
                            
                            <div class="flex justify-between items-center">
                                <div class="flex space-x-2">
                                    <button onclick="document.querySelectorAll('.ereceipt-date-input').forEach((i)=>i.previousElementSibling?.checked=true)" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                                        Hepsini Seç
                                    </button>
                                    <button onclick="document.querySelectorAll('.ereceipt-date-input').forEach((i)=>i.previousElementSibling?.checked=false)" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                                        Seçimi Temizle
                                    </button>
                                </div>
                                <button id="saveEReceiptBtn" onclick="(function(){
                                    const arr=[];document.querySelectorAll('.sgkEReceiptMaterials input[type=checkbox]').forEach((cb,i)=>{if(cb.checked){arr.push({code:cb.getAttribute('value'),date:document.querySelectorAll('.ereceipt-date-input')[i].value})}});if(typeof window.saveEReceiptInternal==='function'){window.saveEReceiptInternal('${eReceiptNo}', arr)}else{console.warn('saveEReceiptInternal not present')}})()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                    E-reçete Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            // Expose a helper used by the inline save button to perform actual save through manager or legacy bridge
            window.saveEReceiptInternal = async (receiptNo, materials) => {
                const payload = {
                    patientId: patientId || (window.currentPatientData && window.currentPatientData.id) || null,
                    receiptNo: receiptNo,
                    materials: materials
                };
                try {
                    if (this && typeof this.saveEReceipt === 'function') {
                        await this.saveEReceipt(payload);
                    } else if (window.legacyBridge && typeof window.legacyBridge.saveEReceipt === 'function') {
                        await window.legacyBridge.saveEReceipt(payload);
                    } else {
                        const key = window.STORAGE_KEYS?.LOCAL_ERECEIPTS || 'xear_local_ereceipts';
                        const arr = JSON.parse(localStorage.getItem(key) || '[]');
                        arr.push(payload);
                        localStorage.setItem(key, JSON.stringify(arr));
                    }
                    if (this && typeof this.showToast === 'function') this.showToast('E-reçete kaydedildi', 'success');
                    if (typeof this.loadSavedEReceipts === 'function') this.loadSavedEReceipts();
                } catch (e) {
                    console.error('E-receipt save failed', e);
                    if (typeof this.showToast === 'function') this.showToast('E-reçete kaydedilemedi', 'error');
                }
            };

         } catch (error) {
             console.error('E-receipt query error:', error);
             resultDiv.innerHTML = `
                 <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                     <div class="flex items-center">
                         <svg class="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                         </svg>
                         <div>
                             <h4 class="font-medium text-red-900">Sorgu Hatası</h4>
                             <p class="text-sm text-red-700 mt-1">E-reçete sorgulanırken bir hata oluştu. Lütfen tekrar deneyin.</p>
                         </div>
                     </div>
                 </div>
             `;
         }
     }

    // Patient Report Query Function
    async queryPatientReport() {
        const resultDiv = document.getElementById('reportResult');
        
        resultDiv.classList.remove('hidden');
        resultDiv.innerHTML = `<div class="text-center p-4">Hasta raporları sorgulanıyor...</div>`;

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Mock response based on legacy implementation
            const mockReports = [
                {
                    type: 'İşitme Cihazı Raporu',
                    date: '2024-01-15',
                    validUntil: '2026-01-15',
                    status: 'Geçerli',
                    renewalDate: '2025-12-15',
                    doctor: 'Dr. Ahmet Yılmaz'
                },
                {
                    type: 'Pil Raporu',
                    date: '2024-02-10',
                    validUntil: '2025-02-10',
                    status: 'Geçerli',
                    renewalDate: '2025-01-10',
                    doctor: 'Dr. Zeynep Kaya'
                },
                {
                    type: 'Bakım Raporu',
                    date: '2024-03-05',
                    validUntil: '2025-03-05',
                    status: 'Yakında Dolacak',
                    renewalDate: '2025-02-05',
                    doctor: 'Dr. Mehmet Demir'
                }
            ];

            const reportsHTML = mockReports.map(report => `
                <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h5 class="font-medium text-gray-900 mb-2">${report.type}</h5>
                            <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div><strong>Rapor Tarihi:</strong> ${new Date(report.date).toLocaleDateString('tr-TR')}</div>
                                <div><strong>Geçerlilik:</strong> ${new Date(report.validUntil).toLocaleDateString('tr-TR')}</div>
                                <div><strong>Yenileme Tarihi:</strong> ${new Date(report.renewalDate).toLocaleDateString('tr-TR')}</div>
                                <div><strong>Doktor:</strong> ${report.doctor}</div>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="px-2 py-1 text-xs rounded-full ${
                                report.status === 'Geçerli' ? 'bg-green-100 text-green-800' :
                                report.status === 'Yakında Dolacak' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }">
                                ${report.status}
                            </span>
                        </div>
                    </div>
                </div>
            `).join('');

            resultDiv.innerHTML = `
                <div class="space-y-3">
                    ${reportsHTML}
                </div>
            `;
            
        } catch (error) {
            console.error('Patient report query error:', error);
            resultDiv.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <svg class="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        <div>
                            <h4 class="font-medium text-red-900">Sorgu Hatası</h4>
                            <p class="text-sm text-red-700 mt-1">Hasta raporları sorgulanırken bir hata oluştu.</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // SGK Operations
    async querySGKStatus(patientId) {
        try {
            this.showToast('SGK durumu sorgulanıyor...', 'info');
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Update patient SGK info
            const patients = JSON.parse(localStorage.getItem('patients') || '[]');
            const patientIndex = patients.findIndex(p => p.id === patientId);
            
            if (patientIndex !== -1) {
                const mockStatuses = ['approved', 'pending', 'processing', 'rejected'];
                const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];
                
                patients[patientIndex].sgkInfo = {
                    ...patients[patientIndex].sgkInfo,
                    status: randomStatus,
                    lastUpdate: new Date().toISOString(),
                    deviceRight: randomStatus === 'approved',
                    batteryRight: randomStatus === 'approved',
                    validityDate: randomStatus === 'approved' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null
                };
                
                localStorage.setItem('patients', JSON.stringify(patients));
                
                // Update global patient data if it exists
                if (window.currentPatientData && window.currentPatientData.id === patientId) {
                    window.currentPatientData.sgkInfo = patients[patientIndex].sgkInfo;
                    
                    // Re-render the SGK tab
                    if (window.patientTabContentComponent) {
                        const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
                        if (activeTab === 'sgk') {
                            window.patientTabContentComponent.render(window.currentPatientData);
                        }
                    }
                }
                
                this.showToast('SGK durumu güncellendi', 'success');
            }
        } catch (error) {
            console.error('SGK status query failed:', error);
            this.showToast('SGK durumu sorgulanırken hata oluştu', 'error');
        }
    }

    async generateSGKReport(patientId) {
        try {
            this.showToast('SGK raporu oluşturuluyor...', 'info');
            
            // Simulate report generation
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const reportId = 'SGK_' + Date.now();
            const newDocument = {
                id: reportId,
                patientId: patientId,
                filename: `SGK_Raporu_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.pdf`,
                type: 'sgk_raporu',
                uploadDate: new Date().toISOString(),
                processedDate: new Date().toISOString(),
                status: 'generated',
                size: Math.floor(Math.random() * 500000) + 100000 // Random size between 100KB-600KB
            };
            
            try {
                if (window.SGKStorage && typeof window.SGKStorage.add === 'function') {
                    window.SGKStorage.add(newDocument);
                    this.loadSGKDocuments();
                } else {
                    this.sgkDocuments.push(newDocument);
                    this.saveSGKDocuments();
                }
            } catch (err) {
                console.error('Failed to persist SGK report:', err);
                this.sgkDocuments.push(newDocument);
            }
             
             // Re-render if on SGK tab
             if (window.currentPatientData && window.currentPatientData.id === patientId) {
                 const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
                 if (activeTab === 'sgk' && window.patientTabContentComponent) {
                     window.patientTabContentComponent.render(window.currentPatientData);
                 }
             }
             
             this.showToast('SGK raporu başarıyla oluşturuldu', 'success');
         } catch (error) {
             console.error('SGK report generation failed:', error);
             this.showToast('SGK raporu oluşturulurken hata oluştu', 'error');
         }
    }

    async sendToSGK(patientId) {
        try {
            this.showToast('SGK\'ya gönderiliyor...', 'info');
            
            // Simulate sending to SGK
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            // Update patient SGK status
            const patients = JSON.parse(localStorage.getItem('patients') || '[]');
            const patientIndex = patients.findIndex(p => p.id === patientId);
            
            if (patientIndex !== -1) {
                patients[patientIndex].sgkInfo = {
                    ...patients[patientIndex].sgkInfo,
                    status: 'processing',
                    lastUpdate: new Date().toISOString(),
                    submittedDate: new Date().toISOString()
                };
                
                localStorage.setItem('patients', JSON.stringify(patients));
                
                // Update global patient data
                if (window.currentPatientData && window.currentPatientData.id === patientId) {
                    window.currentPatientData.sgkInfo = patients[patientIndex].sgkInfo;
                    
                    // Re-render the SGK tab
                    const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
                    if (activeTab === 'sgk' && window.patientTabContentComponent) {
                        window.patientTabContentComponent.render(window.currentPatientData);
                    }
                }
            }
            
            this.showToast('SGK\'ya başarıyla gönderildi', 'success');
        } catch (error) {
            console.error('SGK submission failed:', error);
            this.showToast('SGK\'ya gönderilirken hata oluştu', 'error');
        }
    }

    openUploadModal() {
        // Delegate modal creation to SGKModals.upload if available for modularization
        if (window.SGKModals && typeof window.SGKModals.openUploadModal === 'function') {
            window.SGKModals.openUploadModal(this);
            return;
        }

        // Fallback: inline modal creation (legacy behavior)
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">SGK Belgesi Yükle</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <form id="sgkUploadForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Belge Türü</label>
                        <select id="sgkDocType" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="sgk_raporu">SGK Raporu</option>
                            <option value="muayene_raporu">Muayene Raporu</option>
                            <option value="hekim_raporu">Hekim Raporu</option>
                            <option value="cihaz_raporu">Cihaz Raporu</option>
                            <option value="onay_belgesi">Onay Belgesi</option>
                            <option value="fatura">Fatura</option>
                            <option value="e_recete">E-Reçete</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Dosya Seç</label>
                        <input type="file" id="sgkFileInput" accept=".pdf,.jpg,.jpeg,.png" 
                               class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <p class="text-xs text-gray-500 mt-1">PDF, JPG, JPEG, PNG formatları desteklenir</p>
                    </div>
                    
                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button" onclick="this.closest('.fixed').remove()" 
                                class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                            İptal
                        </button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            Yükle
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle form submission
        modal.querySelector('#sgkUploadForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFileUpload(modal);
        });
    }

    async handleFileUpload(modal) {
        const fileInput = modal.querySelector('#sgkFileInput');
        const docType = modal.querySelector('#sgkDocType').value;
        const file = fileInput.files[0];
        
        if (!file) {
            this.showToast('Lütfen bir dosya seçin', 'error');
            return;
        }
        
        try {
            this.showToast('Dosya upload ediliyor...', 'info');

            // Try server-side upload via SGKApi; fall back to legacy local behavior on network/API failure
            try {
                const patientId = window.currentPatientData?.id || null;
                const uploadResult = await window.SGKApi.upload([file], patientId, docType);

                // Expect uploadResult.results array (per file)
                const first = uploadResult && Array.isArray(uploadResult.results) ? uploadResult.results[0] : null;
                if (first) {
                    // If backend identified a matched patient, create persistent SGKDocument via API
                    const matched = first.matched_patient || null;
                    if (matched && matched.id) {
                        const payload = {
                            patientId: matched.id,
                            filename: file.name,
                            documentType: docType,
                            ocr: first.ocr || null
                        };
                        try {
                            const created = await window.SGKApi.createDocument(payload);
                            const createdDoc = created.document || created.data || created;
                            // Add to local list for UI immediately
                            this.sgkDocuments.push(Object.assign({}, createdDoc, {
                                id: createdDoc.id || ('SGK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)),
                                filename: file.name,
                                type: docType,
                                uploadDate: new Date().toISOString(),
                                processedDate: new Date().toISOString(),
                                status: 'processed',
                                size: file.size
                            }));
                            this.saveSGKDocuments();
                            this.showToast('Belge işlendi ve hasta ile ilişkilendirildi', 'success');
                        } catch (err) {
                            console.warn('Failed to persist SGKDocument on server:', err);
                            // fallback: keep transient local record with OCR info
                            const fallbackDoc = {
                                id: 'SGK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                                patientId: matched.id,
                                filename: file.name,
                                type: docType,
                                uploadDate: new Date().toISOString(),
                                processedDate: new Date().toISOString(),
                                status: 'processed_local',
                                size: file.size,
                                ocr: first.ocr || null
                            };
                            this.sgkDocuments.push(fallbackDoc);
                            this.saveSGKDocuments();
                            this.showToast('Belge işlendi ancak sunucuya kaydedilemedi; yerel olarak kaydedildi', 'warning');
                        }
                    } else {
                        // No direct match; save OCR + candidate info locally for manual assignment later
                        const doc = {
                            id: 'SGK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            patientId: patientId,
                            filename: file.name,
                            type: docType,
                            uploadDate: new Date().toISOString(),
                            processedDate: new Date().toISOString(),
                            status: 'processed',
                            size: file.size,
                            ocr: first.ocr || null,
                            matched_patient: first.matched_patient || null,
                            candidates: first.candidates || null
                        };
                        this.sgkDocuments.push(doc);
                        this.saveSGKDocuments();
                        this.showToast('Belge işlendi; otomatik hasta eşleşmesi bulunamadı', 'info');
                    }
                } else {
                    // Unexpected server response shape: fallback to local storage
                    this._addLocalDocumentFallback(file, docType);
                    this.showToast('Sunucudan beklenmeyen sonuç döndü; belge yerel olarak kaydedildi', 'warning');
                }

                // Close modal and re-render
                modal.remove();
                const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
                if (activeTab === 'sgk' && window.patientTabContentComponent) {
                    window.patientTabContentComponent.render(window.currentPatientData);
                }
                return;
            } catch (serverErr) {
                console.warn('Server upload failed, falling back to legacy local behavior:', serverErr);
            }

            // Legacy fallback: local-only behavior
            await new Promise(resolve => setTimeout(resolve, 1000));
            const newDocument = {
                id: 'SGK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                patientId: window.currentPatientData?.id,
                filename: file.name,
                type: docType,
                uploadDate: new Date().toISOString(),
                status: 'uploaded',
                size: file.size
            };
            this.sgkDocuments.push(newDocument);
            this.saveSGKDocuments();
            modal.remove();
            const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
            if (activeTab === 'sgk' && window.patientTabContentComponent) {
                window.patientTabContentComponent.render(window.currentPatientData);
            }
            this.showToast('Dosya yerel olarak kaydedildi (sunucuya yükleme başarısız)', 'warning');
        } catch (error) {
            console.error('File upload failed:', error);
            this.showToast('Dosya yüklenirken hata oluştu', 'error');
        }
    }

    // Helper: fallback local storage add when server-side upload/assign isn't used or fails
    _addLocalDocumentFallback(file, docType, ocr = null) {
        const newDocument = {
            id: 'SGK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            patientId: window.currentPatientData?.id,
            filename: file.name,
            type: docType,
            uploadDate: new Date().toISOString(),
            processedDate: ocr ? new Date().toISOString() : null,
            status: ocr ? 'processed_local' : 'uploaded',
            size: file.size,
            ocr: ocr
        };
        try {
            if (window.SGKStorage && typeof window.SGKStorage.add === 'function') {
                window.SGKStorage.add(newDocument);
            } else {
                this.sgkDocuments.push(newDocument);
                this.saveSGKDocuments();
            }
        } catch (e) {
            console.warn('Failed adding local document fallback', e);
            this.sgkDocuments.push(newDocument);
        }
        this.loadSGKDocuments();
        return newDocument;
    }

    // Helper: create server document assigned to a patient and persist locally
    async assignDocumentToPatient(patientId, file, docType, ocr = null) {
        try {
            const payload = {
                patientId: patientId,
                filename: file.name,
                documentType: docType,
                ocr: ocr
            };
            const created = await window.SGKApi.createDocument(payload);
            const createdDoc = (created && (created.document || created.data)) || created || {};
            const doc = Object.assign({}, createdDoc, {
                id: createdDoc.id || ('SGK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
                filename: file.name,
                type: docType,
                uploadDate: new Date().toISOString(),
                processedDate: new Date().toISOString(),
                status: 'processed'
            });
            if (window.SGKStorage && typeof window.SGKStorage.add === 'function') {
                window.SGKStorage.add(doc);
            } else {
                this.sgkDocuments.push(doc);
                this.saveSGKDocuments();
            }
            this.loadSGKDocuments();
            return doc;
        } catch (err) {
            console.error('Failed to assign document to patient:', err);
            throw err;
        }
    }

    openCandidatesModal(docId) {
        const doc = this.sgkDocuments.find(d => d.id === docId);
        if (!doc) {
            this.showToast('Belge bulunamadı', 'error');
            return;
        }

        // Delegate to SGKModals if available
        if (window.SGKModals && typeof window.SGKModals.openCandidateModal === 'function') {
            window.SGKModals.openCandidateModal(this, doc);
            return;
        }

        // Fallback: simple inline candidate chooser
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        const candidates = Array.isArray(doc.candidates) ? doc.candidates : (doc.matched_patient ? [doc.matched_patient] : []);
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Hasta Adayları</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="space-y-3" id="sgkCandidateList">
                    ${candidates.length === 0 ? '<p class="text-sm text-gray-600">Hiç aday bulunamadı</p>' : ''}
                </div>
                <div class="mt-4 text-right">
                    <button class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50" onclick="this.closest('.fixed').remove()">Kapat</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const listEl = modal.querySelector('#sgkCandidateList');
        candidates.forEach(candidate => {
            const item = document.createElement('div');
            item.className = 'border rounded p-3 flex justify-between items-center';
            item.innerHTML = `
                <div>
                    <div class="font-medium">${candidate.name || candidate.fullName || candidate.displayName || (candidate.firstName ? candidate.firstName + ' ' + (candidate.lastName || '') : 'Bilinmeyen')}</div>
                    <div class="text-sm text-gray-600">TC: ${candidate.tcMask || candidate.tc || '—'} · Olasılık: ${candidate.score ? Math.round(candidate.score*100) + '%' : '—'}</div>
                </div>
                <div>
                    <button class="px-3 py-1 bg-green-600 text-white rounded-md">Eşleştir</button>
                </div>
            `;
            const assignBtn = item.querySelector('button');
            assignBtn.addEventListener('click', async () => {
                try {
                    const pid = candidate.id || candidate.patientId || candidate.id;
                    await this.assignExistingDocument(docId, pid);
                    modal.remove();
                    this.showToast('Belge seçilen hasta ile ilişkilendirildi', 'success');
                } catch (err) {
                    console.error('Failed assigning document to candidate:', err);
                    this.showToast('Eşleştirme başarısız', 'error');
                }
            });
            listEl.appendChild(item);
        });
    }

    async assignExistingDocument(docId, patientId) {
        const docIndex = this.sgkDocuments.findIndex(d => d.id === docId);
        if (docIndex === -1) throw new Error('Document not found');
        const doc = this.sgkDocuments[docIndex];
        try {
            const payload = {
                patientId: patientId,
                filename: doc.filename || doc.name,
                documentType: doc.type,
                ocr: doc.ocr || null
            };
            const created = await window.SGKApi.createDocument(payload);
            const createdDoc = (created && (created.document || created.data)) || created || {};
            const newDoc = Object.assign({}, createdDoc, {
                id: createdDoc.id || doc.id,
                filename: doc.filename,
                type: doc.type,
                uploadDate: doc.uploadDate || new Date().toISOString(),
                processedDate: new Date().toISOString(),
                status: 'processed'
            });
            // Persist in centralized storage if available
            if (window.SGKStorage && typeof window.SGKStorage.update === 'function') {
                // Update existing local record
                window.SGKStorage.update(newDoc);
            } else {
                // Replace local item
                this.sgkDocuments[docIndex] = newDoc;
                this.saveSGKDocuments();
            }
            this.loadSGKDocuments();
            return newDoc;
        } catch (err) {
            console.error('Failed to create server document during assignment:', err);
            throw err;
        }
    }
}