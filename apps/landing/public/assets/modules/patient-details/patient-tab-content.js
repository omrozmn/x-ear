class PatientTabContentComponent {
    constructor() {
        this.activeTab = 'general';
        this.apiClient = new ApiClient();
    }

    setActiveTab(tabId) {
        this.activeTab = tabId;
    }

    /**
     * Normalize patient object using shared canonicalizer if available.
     * This ensures tab renderers see a consistent shape (identityNumber, dob, firstName/lastName/name, etc).
     */
    normalizePatientObject(patient) {
        if (!patient) return patient;
        try {
            if (typeof window !== 'undefined' && window.CanonicalizePatient && typeof window.CanonicalizePatient.canonicalizePatient === 'function') {
                return window.CanonicalizePatient.canonicalizePatient(patient) || patient;
            }
        } catch (e) {
            console.warn('PatientTabContentComponent: canonicalizer failed', e);
        }
        // Minimal fallback normalization
        const p = Object.assign({}, patient);
        p.identityNumber = p.identityNumber || p.identity_number || p.tcNumber || p.tc || null;
        if (p.dob && p.dob.indexOf && p.dob.indexOf('T') !== -1) p.dob = p.dob.split('T')[0];
        p.name = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
        p.tcNumber = p.tcNumber || p.tc || p.identityNumber || null;
        return p;
    }

    /**
     * Async render helper: obtains patient via DomainManager or legacyBridge then renders the active tab content.
     * @param {string} patientId
     */
    async renderAsync(patientId) {
        let pdata = null;
        if (typeof window !== 'undefined') {
            try {
                if (window.domainManager && typeof window.domainManager.getPatient === 'function') {
                    pdata = await window.domainManager.getPatient(patientId);
                } else if (window.legacyBridge && typeof window.legacyBridge.getPatients === 'function') {
                    const list = await Promise.resolve(window.legacyBridge.getPatients());
                    pdata = list.find(p => p.id === patientId) || null;
                }
            } catch (e) {
                console.warn('PatientTabContentComponent: domainManager/legacyBridge fetch failed, falling back to globals', e);
                pdata = null;
            }

            if (!pdata) {
                pdata = window.patientDetailsManager?.currentPatient || window.currentPatientData || null;
            }
        }

        pdata = this.normalizePatientObject(pdata || {});
        return this.render(pdata);
    }

    async render(patientData) {
        // Ensure patient data normalized for downstream renderers
        patientData = this.normalizePatientObject(patientData || {});

        // Map Turkish tab IDs to English for compatibility
        const tabIdMap = {
            'genel': 'general',
            'belgeler': 'documents',
            'zaman-cizelgesi': 'timeline',
            'satis': 'sales',
            'cihaz': 'devices',
            'sgk': 'sgk'
        };

        const mappedTabId = tabIdMap[this.activeTab] || this.activeTab;

        switch (mappedTabId) {
            case 'general':
                return this.renderGeneralInfo(patientData);
            case 'documents':
                return await this.renderDocuments(patientData);
            case 'sales':
                return this.renderSales(patientData);
            case 'devices':
                // Prefer component-level async loader when available (DomainManager-backed)
                if (typeof window !== 'undefined' && window.deviceManagement && typeof window.deviceManagement.renderAsync === 'function') {
                    try {
                        return await window.deviceManagement.renderAsync(patientData.id);
                    } catch (e) {
                        console.warn('deviceManagement.renderAsync failed, falling back to renderDevices', e);
                    }
                }
                return await this.renderDevices(patientData);
            case 'timeline':
                return await this.renderTimeline(patientData);
            case 'sgk':
                return this.renderSGK(patientData);
            default:
                return `<p>Content for ${this.activeTab}</p>`;
        }
    }

    renderGeneralInfo(patientData) {
        // Match legacy loadPersonalInfo structure exactly with 6 info cards plus notes section
        return `
            <div class="space-y-6">
                <!-- Hasta Notları Card -->
                <div class="bg-white rounded-lg border border-gray-200 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Hasta Notları</h3>
                        <button onclick="addPatientNote()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors">
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Not Ekle
                        </button>
                    </div>
                    <div id="quickNotes">
                        <!-- Notes will be loaded here -->
                        <div class="text-center py-8 text-gray-500">
                            Notlar yükleniyor...
                        </div>
                    </div>
                </div>

                <!-- Patient Info Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Name Card -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Ad Soyad</h4>
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                        </div>
                        <p class="text-lg font-semibold text-gray-900">${patientData.name || 'Belirtilmemiş'}</p>
                    </div>

                    <!-- TC Number Card -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-sm font-medium text-gray-500 uppercase tracking-wide">TC Kimlik No</h4>
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                            </svg>
                        </div>
                        <p class="text-lg font-semibold text-gray-900">${patientData.tcNumber || patientData.tc || 'Belirtilmemiş'}</p>
                    </div>

                    <!-- Phone Card -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Telefon</h4>
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                            </svg>
                        </div>
                        <p class="text-lg font-semibold text-gray-900">${patientData.phone || 'Belirtilmemiş'}</p>
                    </div>

                    <!-- Email Card -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-sm font-medium text-gray-500 uppercase tracking-wide">E-posta</h4>
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                        </div>
                        <p class="text-lg font-semibold text-gray-900">${patientData.email || 'Belirtilmemiş'}</p>
                    </div>

                    <!-- Birth Date Card -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Doğum Tarihi</h4>
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                        </div>
                        <p class="text-lg font-semibold text-gray-900">${patientData.birthDate ? new Date(patientData.birthDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</p>
                    </div>

                    <!-- Address Card -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Adres</h4>
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                        </div>
                        <p class="text-lg font-semibold text-gray-900">${patientData.address || 'Belirtilmemiş'}</p>
                    </div>
                </div>

                <!-- Quick Action Buttons -->
                <div class="flex space-x-4 mb-6">
                    <button onclick="addAppointment('${patientData.id || ''}')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        Yeni Randevu
                    </button>
                    <button onclick="createSale()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                        </svg>
                        Yeni Satış
                    </button>
                </div>
            </div>
        `;
    }

    async renderAppointments(patientData) {
        const appointments = patientData.appointments || [];
        
        let appointmentsHtml = '';
        if (appointments.length > 0) {
            // Sort appointments by date (newest first) like legacy
            appointments.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
            
            appointmentsHtml = appointments.map(appointment => {
                const appointmentDate = new Date(appointment.date);
                const formattedDate = appointmentDate.toLocaleDateString('tr-TR');
                const formattedTime = appointment.time || '';
                
                // Status badge matching legacy
                const getStatusBadge = (status) => {
                    switch (status) {
                        case 'completed':
                            return '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Tamamlandı</span>';
                        case 'cancelled':
                            return '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">İptal</span>';
                        case 'no-show':
                            return '<span class="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Gelmedi</span>';
                        default:
                            return '<span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Planlandı</span>';
                    }
                };
                
                return `
                    <tr class="hover:bg-gray-50 border-b border-gray-200">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${getStatusBadge(appointment.status)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${appointment.type || 'Genel Muayene'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formattedDate} ${formattedTime}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button onclick="viewAppointmentDetails('${appointment.id}')" class="text-blue-600 hover:text-blue-900 mr-2">Detay</button>
                            <button onclick="editAppointment('${appointment.id}')" class="text-green-600 hover:text-green-900">Düzenle</button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            appointmentsHtml = '<tr><td colspan="4" class="text-center py-8 text-gray-500">Henüz randevu bulunmamaktadır.</td></tr>';
        }

        return `
            <div class="bg-white shadow-sm rounded-lg overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-medium text-gray-900">Randevu Geçmişi</h3>
                        <button onclick="addAppointment('${patientData.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                            Yeni Randevu
                        </button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih/Saat</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${appointmentsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async renderDocuments(patientData) {
        // Fetch documents from API
        try {
            const response = await this.apiClient.getPatientDocuments(patientData.id);
            if (response.success && response.data) {
                patientData.documents = response.data;
                console.log(`✅ Loaded ${response.data.length} documents from API for patient ${patientData.id}`);
            }
        } catch (error) {
            console.warn('Could not load documents from API:', error);
        }

        // If documentManagement defines renderDocumentsTab, prefer it (safe check)
        if (window.documentManagement && typeof window.documentManagement.renderDocumentsTab === 'function') {
            try {
                return window.documentManagement.renderDocumentsTab(patientData);
            } catch (e) {
                console.warn('documentManagement.renderDocumentsTab threw', e);
            }
        }

        // Fallback: render placeholder + legacy HTML. If UploadedDocuments module is present
        // it will be initialized by the inline script which will remove the legacy DOM.
        const documents = patientData.documents || [];
        const containerId = `uploaded-docs-${patientData.id}`;
        const legacyId = `legacy-docs-${patientData.id}`;

        const legacyHtml = `
            <div id="${legacyId}" class="space-y-6">
                <div class="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-medium text-gray-900">
                                Yüklenen Belgeler <span class="text-sm font-normal text-gray-500">(${documents.length})</span>
                            </h3>
                            <button onclick="uploadDocument()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                                <i class="fas fa-upload mr-2"></i>Belge Yükle
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${documents.length === 0 ? `
                                <div class="text-center py-12 text-gray-500 col-span-full">
                                    <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    <p class="text-lg font-medium">Henüz belge yüklenmemiş</p>
                                    <p class="mt-1">Aşağıdaki hızlı butonları kullanarak belge yükleyebilirsiniz.</p>
                                </div>
                            ` : documents.map(doc => `
                                <div class="bg-white border border-gray-200 rounded-lg p-4">
                                    <div class="flex items-start justify-between">
                                        <div class="flex-1">
                                            <h4 class="font-medium text-gray-900">${doc.fileName || doc.originalName}</h4>
                                            <p class="text-sm text-gray-500">${doc.type || 'Document'}</p>
                                            <p class="text-xs text-gray-400">${new Date(doc.uploadedAt || doc.createdAt).toLocaleString('tr-TR')}</p>
                                        </div>
                                        <button onclick="viewDocument('${doc.id}', '${patientData.id}')" class="text-blue-600 hover:text-blue-800">
                                            Görüntüle
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        return `
            <div id="${containerId}" class="uploaded-docs-widget-container" style="display:none"></div>
            ${legacyHtml}
            <script>
              (function(){
                try {
                  var patientId = '${patientData.id}';
                  var containerId = '${containerId}';
                  var legacyId = '${legacyId}';

                  function initUploadedDocs() {
                    try {
                      if (window.UploadedDocuments && (!window.UploadedDocumentsInstances || !window.UploadedDocumentsInstances[patientId])) {
                        var legacy = document.getElementById(legacyId);
                        if (legacy) legacy.remove();
                        var ph = document.getElementById(containerId);
                        if (ph) ph.style.display = 'block';
                        try {
                          new window.UploadedDocuments({ containerId: containerId, patientId: patientId, storageProvider: window.documentManagement });
                        } catch (e) { console.warn('UploadedDocuments init error', e); }
                        return true;
                      }
                    } catch (e) { console.warn('initUploadedDocs inner error', e); }
                    return false;
                  }

                  if (!initUploadedDocs()) {
                    var attempts = 0;
                    var maxAttempts = 20;
                    var interval = setInterval(function(){
                      attempts++;
                      if (initUploadedDocs() || attempts >= maxAttempts) clearInterval(interval);
                    }, 250);

                    setTimeout(function(){
                      if (!window.UploadedDocuments) {
                        var ph2 = document.getElementById(containerId);
                        if (ph2) ph2.remove();
                      }
                    }, (maxAttempts + 1) * 250);
                  }
                } catch(e){ console.warn('uploaded-docs init script error', e); }
              })();
            </script>
        `;
    }

    renderSales(patientData) {
    // Use synchronous rendering like other tabs
    if (window.salesManagement) {
      return window.salesManagement.renderSalesTab(patientData);
    }

    // Fallback if sales management component is not available
    return `
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-2 text-gray-600">Satış yönetimi yükleniyor...</span>
      </div>
    `;
  }

  async renderDevicesTab(patientData) {
    return await this.renderDevices(patientData);
  }

    async renderDevices(patientData) {
        // Fetch devices from API
        let devices = [];
        try {
            const response = await this.apiClient.getPatientDevices(patientData.id);
            // getPatientDevices now returns the data directly (array or object)
            devices = Array.isArray(response) ? response : (response?.data || []);
        } catch (error) {
            console.error('Error fetching patient devices:', error);
            // Fallback to patient data
            devices = patientData.assignedDevices || patientData.devices || [];
        }
        
        const deviceTrials = patientData.deviceTrials || [];
        const ereceiptHistory = patientData.ereceiptHistory || [];
        const sgkInfo = patientData.sgkInfo || {};

        let assignedDevicesHtml = '';
        let deviceTrialsHtml = '';
        let ereceiptsHtml = '';

        // Assigned Devices Section
        if (devices.length > 0) {
            // Separate devices by ear for 2-column layout
            // Treat bilateral devices as belonging to both columns so they are visible
            const leftEarDevices = devices.filter(d => {
                const e = (d.ear || d.direction || '').toString().toUpperCase();
                return e === 'LEFT' || e === 'BOTH' || e === 'BILATERAL';
            });
            const rightEarDevices = devices.filter(d => {
                const e = (d.ear || d.direction || '').toString().toUpperCase();
                return e === 'RIGHT' || e === 'BOTH' || e === 'BILATERAL';
            });
            
            const renderDeviceCard = (device) => {
                const assignmentDate = device.createdAt ? new Date(device.createdAt).toLocaleDateString('tr-TR') : 'Bilinmiyor';
                const warrantyEnd = device.warranty?.endDate ? new Date(device.warranty.endDate).toLocaleDateString('tr-TR') : 'Yok';
                const warrantyStart = device.warranty?.startDate ? new Date(device.warranty.startDate).toLocaleDateString('tr-TR') : null;
                
                const isLeft = device.ear === 'LEFT' || device.ear === 'left';
                const isRight = device.ear === 'RIGHT' || device.ear === 'right';
                const earLabel = isLeft ? 'Sol Kulak' : isRight ? 'Sağ Kulak' : 'Bilateral';
                
                // Border: full border in ear color
                const borderColorClass = isLeft ? 'border-blue-500' : isRight ? 'border-red-500' : 'border-gray-400';
                const bgColorClass = isLeft ? 'bg-blue-50' : isRight ? 'bg-red-50' : 'bg-gray-50';
                const textColorClass = isLeft ? 'text-blue-700' : isRight ? 'text-red-700' : 'text-gray-700';
                
                // Stock status from inventory
                const stockStatus = device.status === 'IN_STOCK' ? 'Stokta' : device.status === 'TRIAL' ? 'Denemede' : 'Kullanımda';
                const stockBadgeColor = device.status === 'IN_STOCK' ? 'bg-green-100 text-green-800' : device.status === 'TRIAL' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800';
                
                // Assignment reason badge
                const reasonLabels = {
                    'sale': 'Satış',
                    'trial': 'Deneme',
                    'service': 'Fitting',
                    'repair': 'Tamir',
                    'replacement': 'Değişim',
                    'proposal': 'Teklif',
                    'other': 'Diğer'
                };
                const assignmentReason = device.assignmentReason || device.assignment_reason || 'other';
                const reasonLabel = reasonLabels[assignmentReason] || assignmentReason;
                
                // Price display: show trial price for trials, sale price for sales
                let priceDisplay = 'Belirtilmemiş';
                if (assignmentReason === 'trial' && device.trialPrice) {
                    priceDisplay = '₺' + parseFloat(device.trialPrice).toLocaleString('tr-TR');
                } else if (device.salePrice) {
                    priceDisplay = '₺' + parseFloat(device.salePrice).toLocaleString('tr-TR');
                } else if (device.price) {
                    priceDisplay = '₺' + parseFloat(device.price).toLocaleString('tr-TR');
                }
                
                return `
                    <div class="bg-white border-2 ${borderColorClass} rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                        <!-- Header -->
                        <div class="flex justify-between items-start mb-4">
                            <div class="flex-1">
                                <h4 class="text-lg font-semibold ${textColorClass} mb-1">${device.brand || 'Bilinmiyor'} ${device.model || ''}</h4>
                                <p class="text-xs ${textColorClass} font-medium mb-2">${earLabel}</p>
                            </div>
                            <div class="flex flex-col gap-1 items-end">
                                <span class="px-3 py-1 text-xs font-semibold ${stockBadgeColor} rounded-full">${stockStatus}</span>
                                <span class="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">${reasonLabel}</span>
                            </div>
                        </div>
                        
                        <!-- Device Info Grid -->
                        <div class="space-y-2 mb-4 text-sm">
                            <div class="flex justify-between border-b border-gray-200 pb-1">
                                <span class="text-gray-600 font-medium">Barkod:</span>
                                <span class="text-gray-900 font-mono">${device.inventoryId || 'N/A'}</span>
                            </div>
                            <div class="flex justify-between border-b border-gray-200 pb-1">
                                <span class="text-gray-600 font-medium">Seri No:</span>
                                <span class="text-gray-900 font-mono">${device.serialNumber || 'Yok'}</span>
                            </div>
                            <div class="flex justify-between border-b border-gray-200 pb-1">
                                <span class="text-gray-600 font-medium">Atanma:</span>
                                <span class="text-gray-900">${assignmentDate}</span>
                            </div>
                            <div class="flex justify-between border-b border-gray-200 pb-1">
                                <span class="text-gray-600 font-medium">Garanti:</span>
                                <span class="text-gray-900">${warrantyStart ? `${warrantyStart} - ${warrantyEnd}` : warrantyEnd}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600 font-medium">Fiyat:</span>
                                <span class="text-gray-900 font-semibold">${priceDisplay}</span>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200">
                            <button onclick="editDeviceModal('${device.id}', '${patientData.id}')" 
                                class="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
                                Düzenle
                            </button>
                            <button onclick="reportDeviceReplacement('${device.id}', '${patientData.id}')" 
                                class="px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors">
                                Değişim Bildir
                            </button>
                            <button onclick="window.invoiceManagement?.createDeviceInvoice('${device.id}', '${patientData.id}')" 
                                class="px-3 py-2 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors">
                                <i class="fas fa-file-invoice mr-1"></i>Fatura Oluştur
                            </button>
                            <button onclick="removeDeviceModal('${device.id}', '${patientData.id}')" 
                                class="px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
                                Kaldır
                            </button>
                        </div>
                    </div>
                `;
            };
            
            assignedDevicesHtml = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Right Ear Column (Left Side) -->
                    <div class="space-y-4">
                        <h4 class="text-sm font-semibold text-red-700 mb-3 flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <circle cx="10" cy="10" r="8"/>
                            </svg>
                            Sağ Kulak Cihazları
                        </h4>
                        ${rightEarDevices.length > 0 ? rightEarDevices.map(renderDeviceCard).join('') : '<p class="text-sm text-gray-500 text-center py-8">Sağ kulak cihazı atanmamış</p>'}
                    </div>
                    
                    <!-- Left Ear Column (Right Side) -->
                    <div class="space-y-4">
                        <h4 class="text-sm font-semibold text-blue-700 mb-3 flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <circle cx="10" cy="10" r="8"/>
                            </svg>
                            Sol Kulak Cihazları
                        </h4>
                        ${leftEarDevices.length > 0 ? leftEarDevices.map(renderDeviceCard).join('') : '<p class="text-sm text-gray-500 text-center py-8">Sol kulak cihazı atanmamış</p>'}
                    </div>
                </div>
            `;
        } else {
            assignedDevicesHtml = `
                <div class="text-center py-8 text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    <p>Henüz cihaz atanmamış</p>
                    <p class="text-sm">Bu hastaya henüz bir işitme cihazı atanmamıştır.</p>
                </div>
            `;
        }

        // Device Trials Section
        if (deviceTrials.length > 0) {
            deviceTrialsHtml = deviceTrials.map(trial => {
                const startDate = trial.startDate ? new Date(trial.startDate).toLocaleDateString('tr-TR') : 'Bilinmiyor';
                const endDate = trial.endDate ? new Date(trial.endDate).toLocaleDateString('tr-TR') : 'Devam ediyor';
                const duration = trial.startDate && trial.endDate ?
                    Math.ceil((new Date(trial.endDate) - new Date(trial.startDate)) / (1000 * 60 * 60 * 24)) + ' gün' :
                    'Devam ediyor';

                const getStatusBadge = (status) => {
                    switch (status) {
                        case 'completed':
                            return '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Tamamlandı</span>';
                        case 'cancelled':
                            return '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">İptal</span>';
                        case 'active':
                        default:
                            return '<span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Aktif</span>';
                    }
                };

                return `
                    <div class="bg-white border border-gray-200 rounded-lg p-4">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <h6 class="font-medium text-gray-900">${trial.deviceName || 'Cihaz Denemesi'}</h6>
                                <p class="text-xs text-gray-600">Başlangıç: ${startDate}</p>
                                <p class="text-xs text-gray-600">Bitiş: ${endDate}</p>
                            </div>
                            ${getStatusBadge(trial.status)}
                        </div>
                        <div class="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                                <span class="block text-gray-500">Süre:</span>
                                <span class="font-medium text-gray-900">${duration}</span>
                            </div>
                        </div>
                        ${trial.notes ? `
                            <div class="mt-2">
                                <span class="block text-gray-500 text-sm">Notlar:</span>
                                <p class="text-sm text-gray-700">${trial.notes}</p>
                            </div>
                        ` : ''}
                        <div class="mt-3 flex space-x-2">
                            <button onclick="window.editDeviceTrial('${trial.id}')" class="text-blue-600 hover:text-blue-900 text-sm font-medium transition-colors">Düzenle</button>
                            ${trial.status === 'active' ? `<button onclick="window.completeDeviceTrial('${trial.id}')" class="text-green-600 hover:text-green-900 text-sm font-medium transition-colors">Tamamla</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            deviceTrialsHtml = `
                <div class="text-center py-8 text-gray-500">
                    <p>Henüz cihaz denemesi yapılmamış.</p>
                </div>
            `;
        }

        // E-receipts Section
        if (ereceiptHistory.length > 0) {
            ereceiptsHtml = ereceiptHistory.map(receipt => {
                const pendingMaterials = receipt.materials.filter(m => !m.deliveryStatus || m.deliveryStatus === 'pending');
                const savedMaterials = receipt.materials.filter(m => m.deliveryStatus === 'saved');
                const deliveredMaterials = receipt.materials.filter(m => m.deliveryStatus === 'delivered');

                const allMaterialsDelivered = deliveredMaterials.length === receipt.materials.length;
                const allMaterialsSavedOrDelivered = pendingMaterials.length === 0;
                const hasPendingMaterials = pendingMaterials.length > 0;
                const hasSavedMaterials = savedMaterials.length > 0;
                const hasDeliveredMaterials = deliveredMaterials.length > 0;

                let statusText = 'Beklemede';
                let statusClass = 'bg-gray-100 text-gray-800';

                if (allMaterialsDelivered) {
                    statusText = 'Teslim Edildi';
                    statusClass = 'bg-green-100 text-green-800';
                } else if (allMaterialsSavedOrDelivered && hasSavedMaterials) {
                    statusText = 'Kaydedildi';
                    statusClass = 'bg-blue-100 text-blue-800';
                } else if (hasSavedMaterials || hasDeliveredMaterials) {
                    statusText = 'Kısmen Kaydedildi';
                    statusClass = 'bg-yellow-100 text-yellow-800';
                }

                return `
                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex items-center space-x-3">
                                <div>
                                    <h6 class="font-medium text-blue-900">E-Reçete #${receipt.number}</h6>
                                    <p class="text-sm text-blue-700">${receipt.doctorName || 'Doktor Bilgisi Yok'}</p>
                                    <p class="text-sm text-blue-600">${new Date(receipt.date).toLocaleDateString('tr-TR')}</p>
                                </div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-1 text-xs font-medium rounded ${statusClass}">${statusText}</span>
                                ${allMaterialsDelivered ? `
                                    <div class="flex space-x-1 ml-2">
                                        <button onclick="downloadDocument('${receipt.id}', 'all', 'ereceite')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors" title="E-Reçete İndir">📄 E-Reçete</button>
                                        <button onclick="downloadDocument('${receipt.id}', 'all', 'rapor')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition-colors" title="Rapor İndir">📋 Rapor</button>
                                        <button onclick="downloadDocument('${receipt.id}', 'all', 'islem-formu')" class="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs transition-colors" title="Hasta İşlem Formu İndir">📝 İşlem Formu</button>
                                    </div>
                                ` : ''}
                                ${!allMaterialsDelivered ? `
                                    <button onclick="saveAllMaterials('${receipt.id}')" class="px-3 py-1 rounded text-xs transition-colors ${!hasPendingMaterials ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}" ${!hasPendingMaterials ? 'disabled' : ''}>${!hasPendingMaterials ? 'Tümü Kaydedildi ✓' : 'Tümünü Kaydet'}</button>
                                    <button onclick="deliverAllMaterials('${receipt.id}')" class="px-3 py-1 rounded text-xs transition-colors ${allMaterialsSavedOrDelivered && hasSavedMaterials ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}" ${!(allMaterialsSavedOrDelivered && hasSavedMaterials) ? 'disabled' : ''}>Tümünü Teslim Et</button>
                                ` : ''}
                            </div>
                        </div>

                        <div class="space-y-2">
                            <details class="cursor-pointer">
                                <summary class="text-sm font-medium text-blue-900 hover:text-blue-700">Malzemeler (${receipt.materials.length}) - Detayları Görüntüle</summary>
                                <div class="mt-3 space-y-3">
                                    ${receipt.materials.map((material, index) => {
                                        const isHearingAid = material.code.includes('DPIC') || material.name.toLowerCase().includes('işitme cihazı') || material.name.toLowerCase().includes('dijital');
                                        const isDelivered = material.deliveryStatus === 'delivered';
                                        const isSaved = material.deliveryStatus === 'saved';
                                        const isPending = !material.deliveryStatus || material.deliveryStatus === 'pending';

                                        return `
                                        <div class="bg-white p-3 rounded border border-gray-200 ${isSaved ? 'bg-green-50 border-green-200' : ''}">
                                            <div class="flex justify-between items-start mb-2">
                                                <div class="flex-1">
                                                    <div class="flex items-center space-x-2 mb-1">
                                                        <p class="text-sm font-medium text-gray-900">${material.name}</p>
                                                        ${isHearingAid ? `<div id="uts-indicator-${receipt.id}-${index}" class="text-xs text-gray-600">UTS: ${material.utsNotificationId ? 'Bildirildi' : 'Beklemede'}</div>` : ''}
                                                    </div>
                                                    <p class="text-xs text-gray-600">Kod: ${material.code}</p>
                                                    <p class="text-xs text-gray-600">Başvuru Tarihi: ${new Date(material.applicationDate).toLocaleDateString('tr-TR')}</p>
                                                </div>
                                                <div class="flex items-center space-x-2">
                                    ${isDelivered ? `
                                        <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Teslim Edildi</span>
                                        <span class="text-xs text-gray-600">${material.deliveryDate ? new Date(material.deliveryDate).toLocaleDateString('tr-TR') : ''}</span>
                                    ` : isSaved ? `
                                        <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Kaydedildi ✓</span>
                                        <span class="text-xs text-gray-600">${material.deliveryDate ? new Date(material.deliveryDate).toLocaleDateString('tr-TR') : ''}</span>
                                        ${!allMaterialsDelivered ? `<button onclick="deliverMaterial('${receipt.id}', '${material.code}')" class="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs transition-colors">Teslim Et</button>` : ''}
                                    ` : `
                                        <button onclick="saveMaterial('${receipt.id}', '${material.code}')" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors">Kaydet</button>
                                    `}
                                </div>
                                            </div>

                                            ${!isDelivered && !isSaved ? `
                                                <div class="mt-3 space-y-2">
                                                    <div class="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label class="block text-xs font-medium text-gray-700 mb-1">Teslim Tarihi</label>
                                                            <input type="date" id="delivery_date_${receipt.id}_${material.code}" value="${new Date().toISOString().split('T')[0]}" max="${new Date().toISOString().split('T')[0]}" class="w-full text-xs border border-gray-300 rounded px-2 py-1">
                                                        </div>
                                                        ${isHearingAid ? `
                                                            <div>
                                                                <label class="block text-xs font-medium text-gray-700 mb-1">UBB Firma Kodu</label>
                                                                <input type="text" id="ubb_code_${receipt.id}_${material.code}" value="UBB001" placeholder="UBB Firma Kodu" class="w-full text-xs border border-gray-300 rounded px-2 py-1">
                                                            </div>
                                                        ` : ''}
                                                    </div>

                                                    ${isHearingAid ? `
                                                        <div class="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label class="block text-xs font-medium text-gray-700 mb-1">Cihaz Barkod No</label>
                                                                <div class="relative">
                                                                    <input type="text" id="device_barcode_${receipt.id}_${material.code}" placeholder="Barkod giriniz veya seçiniz" onchange="updateSerialNumber('${receipt.id}', '${material.code}')" class="w-full text-xs border border-gray-300 rounded px-2 py-1 pr-8">
                                                                    <select id="device_barcode_select_${receipt.id}_${material.code}" class="absolute right-0 top-0 w-8 h-full text-xs border-l border-gray-300 bg-gray-50 rounded-r opacity-60" onchange="selectDeviceFromDropdown('${receipt.id}', '${material.code}')" title="Atanmış cihazlardan seç">
                                                                        <option value="">⚐</option>
                                                                        ${this.getPatientDeviceOptions(patientData)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label class="block text-xs font-medium text-gray-700 mb-1">Cihaz Seri No</label>
                                                                <input type="text" id="device_serial_${receipt.id}_${material.code}" placeholder="Seri Numarası" class="w-full text-xs border border-gray-300 rounded px-2 py-1">
                                                            </div>
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            ` : ''}
                                        </div>
                                        `;
                                    }).join('')}
                                </div>
                            </details>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            ereceiptsHtml = `
                <div class="text-center py-8 text-gray-500">
                    <p>Kaydedilmiş e-reçete bulunmamaktadır.</p>
                </div>
            `;
        }

        return `
            <div class="space-y-6">
                <!-- Device Assignment Quick Action -->
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-1">Cihaz Yönetimi</h3>
                            <p class="text-sm text-gray-600">Hastaya yeni cihaz atayın</p>
                        </div>
                        <div>
                            <button onclick="window.assignDevice('${patientData.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Cihaz Ata
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Assigned Devices -->
                <div class="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-medium text-gray-900">Mevcut Cihazlar</h3>
                        </div>
                    </div>
                    <div class="p-6">
                        ${assignedDevicesHtml}
                    </div>
                </div>

                <!-- Device Trials -->
                <div class="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-medium text-gray-900">Cihaz Denemeleri</h3>
                            <button onclick="startDeviceTrial('${patientData.id}')" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Yeni Deneme
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${deviceTrialsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getPatientDeviceOptions(patientData) {
        if (!patientData || !patientData.assignedDevices) return '<option value="">Cihaz bulunamadı</option>';

        return patientData.assignedDevices.map(device => `
            <option value="${device.serialNumber || device.barcode}"
                    data-serial="${device.serialNumber}"
                    data-brand="${device.brand || device.deviceName?.split(' ')[0]}"
                    data-model="${device.model || device.deviceName?.split(' ').slice(1).join(' ')}">
                ${device.brand || device.deviceName?.split(' ')[0]} ${device.model || device.deviceName?.split(' ').slice(1).join(' ')} (${device.serialNumber})
            </option>
        `).join('');
    }

    // Helper function for device assignment reason options
    getReasonOptions() {
        return `
            <option value="">Sebep Seçin</option>
            <option value="Trial">Deneme</option>
            <option value="Sale">Satış</option>
            <option value="Repair">Tamirat</option>
            <option value="Replacement">Değişim</option>
            <option value="Warranty">Garanti</option>
        `;
    }

    getSGKStatusClass(status) {
        switch (status) {
            case 'approved':
            case 'active':
                return 'px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full';
            case 'pending':
                return 'px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full';
            case 'expired':
                return 'px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full';
            case 'rejected':
                return 'px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full';
            default:
                return 'px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full';
        }
    }

    async renderTimeline(patientData) {
        // Fetch timeline from API
        try {
            const response = await this.apiClient.getPatientTimeline(patientData.id);
            if (response.success && response.data) {
                patientData.timeline = response.data;
                console.log(`✅ Loaded ${response.data.length} timeline events from API for patient ${patientData.id}`);
            }
        } catch (error) {
            console.warn('Could not load timeline from API:', error);
        }

        const timeline = patientData.timeline || [];
        const notes = patientData.notes || [];
        
        // Collect all events with timestamps like legacy implementation
        const events = [];
        
        // Add registration event
        if (patientData.registrationDate || patientData.createdAt) {
            try {
                events.push({
                    type: 'registration',
                    date: new Date(patientData.registrationDate || patientData.createdAt),
                    title: 'Hasta Kaydı',
                    description: `${patientData.firstName || patientData.name || 'Hasta'} ${patientData.lastName || ''} sisteme kaydedildi.`.trim(),
                    icon: 'user-plus'
                });
            } catch (error) {
                console.warn('Error adding registration event:', error);
            }
        }

        // Add notes with safe iteration
        if (Array.isArray(notes)) {
            notes.forEach(note => {
                try {
                    if (note.date || note.createdAt) {
                        events.push({
                            type: 'note',
                            date: new Date(note.date || note.createdAt),
                            title: note.title || `${this.getNoteTypeDisplay(note.type)} notu`,
                            description: note.content || note.text || 'İçerik belirtilmemiş',
                            icon: 'clipboard',
                            noteType: note.type
                        });
                    }
                } catch (error) {
                    console.warn('Error adding note event:', error, note);
                }
            });
        }
        
        // Add appointments with safe data access
        const appointments = patientData.appointments || [];
        appointments.forEach(appointment => {
            try {
                if (appointment.date) {
                    events.push({
                        type: 'appointment',
                        date: new Date(appointment.date),
                        title: `Randevu: ${appointment.type || 'Genel'}`,
                        description: appointment.notes || 'Randevu detayı belirtilmemiş.',
                        icon: 'calendar',
                        status: appointment.status || 'SCHEDULED'
                    });
                }
            } catch (error) {
                console.warn('Error adding appointment event:', error, appointment);
            }
        });
        
        // Add device trials with validation
        const deviceTrials = patientData.deviceTrials || [];
        if (Array.isArray(deviceTrials)) {
            deviceTrials.forEach(trial => {
                try {
                    if (trial.startDate) {
                        events.push({
                            type: 'device_trial',
                            date: new Date(trial.startDate),
                            title: 'Cihaz Denemesi Başladı',
                            description: `${trial.deviceName || 'Cihaz'} denemesi başladı.`,
                            icon: 'headphones',
                            trialId: trial.id
                        });
                    }
                    
                    if (trial.endDate) {
                        events.push({
                            type: 'device_trial_end',
                            date: new Date(trial.endDate),
                            title: 'Cihaz Denemesi Tamamlandı',
                            description: `${trial.deviceName || 'Cihaz'} denemesi tamamlandı. ${trial.result || ''}`,
                            icon: 'check-circle',
                            trialId: trial.id
                        });
                    }
                } catch (error) {
                    console.warn('Error adding device trial event:', error, trial);
                }
            });
        }
        
        // Add device assignments with validation
        if (Array.isArray(patientData.devices) || Array.isArray(patientData.assignedDevices)) {
            const deviceAssignments = patientData.devices || patientData.assignedDevices || [];
            deviceAssignments.forEach(device => {
                try {
                    if (device.assignedDate || device.assignmentDate) {
                        events.push({
                            type: 'device_assignment',
                            date: new Date(device.assignedDate || device.assignmentDate),
                            title: 'Cihaz Atandı',
                            description: `${device.brand || device.manufacturer || 'Cihaz'} ${device.model || ''} ${device.ear || device.direction || ''} cihazı atandı.`.trim(),
                            icon: 'headphones',
                            deviceId: device.id
                        });
                    }
                } catch (error) {
                    console.warn('Error adding device assignment event:', error, device);
                }
            });
        }
        
        // Add payments with validation
        const payments = patientData.payments || [];
        if (Array.isArray(payments)) {
            payments.forEach(payment => {
                try {
                    if (payment.date) {
                        events.push({
                            type: 'payment',
                            date: new Date(payment.date),
                            title: 'Ödeme Alındı',
                            description: `${payment.amount || 0} TL ödeme ${payment.method || 'nakit'} olarak alındı. ${payment.description || ''}`.trim(),
                            icon: 'credit-card',
                            paymentId: payment.id
                        });
                    }
                } catch (error) {
                    console.warn('Error adding payment event:', error, payment);
                }
            });
        }
        
        // Add documents with validation
        const documents = patientData.documents || [];
        if (Array.isArray(documents)) {
            documents.forEach(doc => {
                try {
                    if (doc.date || doc.uploadDate) {
                        events.push({
                            type: 'document',
                            date: new Date(doc.date || doc.uploadDate),
                            title: `Belge Yüklendi: ${doc.title || doc.name || 'Belge'}`,
                            description: `${doc.type || 'Belge'} yüklendi. ${doc.notes || ''}`.trim(),
                            icon: 'file',
                            documentId: doc.id
                        });
                    }
                } catch (error) {
                    console.warn('Error adding document event:', error, doc);
                }
            });
        }
        
        // Add SMS history with validation
        if (Array.isArray(patientData.smsHistory)) {
            patientData.smsHistory.forEach(sms => {
                try {
                    if (sms.date || sms.sentAt) {
                        events.push({
                            type: 'sms',
                            date: new Date(sms.date || sms.sentAt),
                            title: 'SMS Gönderildi',
                            description: sms.message || 'SMS içeriği belirtilmemiş',
                            icon: 'message-square',
                            smsId: sms.id
                        });
                    }
                } catch (error) {
                    console.warn('Error adding SMS event:', error, sms);
                }
            });
        }
        
        // Add SGK updates with validation
        if (patientData.sgkInfo?.updatedAt) {
            try {
                events.push({
                    type: 'sgk_update',
                    date: new Date(patientData.sgkInfo.updatedAt),
                    title: 'SGK Bilgileri Güncellendi',
                    description: `SGK bilgileri güncellendi. Durum: ${this.getSGKStatusText(patientData.sgkInfo.status)}`,
                    icon: 'shield'
                });
            } catch (error) {
                console.warn('Error adding SGK update event:', error);
            }
        }
        
        // Add sales with validation
        if (Array.isArray(patientData.sales)) {
            patientData.sales.forEach(sale => {
                try {
                    if (sale.date) {
                        events.push({
                            type: 'sale',
                            date: new Date(sale.date),
                            title: 'Satış Tamamlandı',
                            description: `${sale.totalAmount?.toLocaleString('tr-TR') || '0'} TL tutarında satış yapıldı.`,
                            icon: 'shopping-cart',
                            saleId: sale.id
                        });
                    }
                } catch (error) {
                    console.warn('Error adding sale event:', error, sale);
                }
            });
        }

        // Add label changes with validation
        if (Array.isArray(patientData.labelHistory)) {
            patientData.labelHistory.forEach(change => {
                try {
                    if (change.date) {
                        events.push({
                            type: 'label_change',
                            date: new Date(change.date),
                            title: 'Etiket Güncellendi',
                            description: `"${change.oldLabel || 'Belirtilmemiş'}" → "${change.newLabel}"`,
                            icon: 'tag',
                            notes: change.notes
                        });
                    }
                } catch (error) {
                    console.warn('Error adding label change event:', error, change);
                }
            });
        }

        // Add E-receipt events with validation
        if (Array.isArray(patientData.ereceiptHistory)) {
            patientData.ereceiptHistory.forEach(receipt => {
                try {
                    if (receipt.date) {
                        events.push({
                            type: 'ereceipt',
                            date: new Date(receipt.date),
                            title: `E-Reçete Kaydedildi: #${receipt.number}`,
                            description: `Doktor: ${receipt.doctorName || 'Bilinmiyor'}`,
                            icon: 'file-text',
                            receiptId: receipt.id
                        });
                    }
                } catch (error) {
                    console.warn('Error adding E-receipt event:', error, receipt);
                }
            });
        }

        // Add profile updates with validation
        if (Array.isArray(patientData.profileUpdates)) {
            patientData.profileUpdates.forEach(update => {
                try {
                    if (update.date) {
                        events.push({
                            type: 'profile_update',
                            date: new Date(update.date),
                            title: 'Hasta Bilgileri Güncellendi',
                            description: update.description || 'Hasta profili güncellendi',
                            icon: 'user',
                            fields: update.fields
                        });
                    }
                } catch (error) {
                    console.warn('Error adding profile update event:', error, update);
                }
            });
        }
        
        // Add existing timeline events
        if (Array.isArray(timeline)) {
            timeline.forEach(event => {
                try {
                    // Use timestamp or date field, whichever is available
                    const eventDate = event.timestamp || event.date;
                    if (eventDate) {
                        events.push({
                            ...event,
                            type: event.type || 'timeline',
                            date: new Date(eventDate),
                            // Preserve original time if provided, otherwise will be calculated from date
                            originalTime: event.time
                        });
                    }
                } catch (error) {
                    console.warn('Error adding timeline event:', error, event);
                }
            });
        }
        
        // Sort events by date (newest first) with error handling
        events.sort((a, b) => {
            try {
                return b.date - a.date;
            } catch (error) {
                console.warn('Error sorting timeline events:', error);
                return 0;
            }
        });
        
        let timelineHTML = '';
        
        if (events.length === 0) {
            timelineHTML = `
                <div class="p-4 text-center">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="text-gray-500 mb-2">Henüz kayıtlı bir etkinlik bulunmamaktadır.</p>
                    <p class="text-sm text-gray-400">Hasta ile ilgili etkinlikler burada görüntülenecektir.</p>
                </div>
            `;
        } else {
            let currentDate = null;
            
            timelineHTML = `<div class="p-4">`;
            
            events.forEach((event, index) => {
                try {
                    const eventDate = this.formatTimelineDate(event.date);
                    
                    // Add date header if this is a new date
                    if (currentDate !== eventDate) {
                        currentDate = eventDate;
                        timelineHTML += `
                            ${index > 0 ? '</div>' : ''}
                            <div class="mb-4">
                                <h3 class="text-lg font-medium text-gray-900 sticky top-0 bg-gray-100 p-2 rounded">${eventDate}</h3>
                        `;
                    }
                    
                    // Add event
                    timelineHTML += `
                        <div class="flex items-start mb-4">
                            <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${this.getTimelineColorClass(event.type)} text-white mr-3">
                                <i class="${this.getTimelineIconClass(event.icon)} text-sm"></i>
                            </div>
                            <div class="flex-grow">
                                <div class="flex items-center">
                                    <h4 class="text-md font-medium text-gray-900">${event.title}</h4>
                                    <span class="ml-auto text-sm text-gray-500">${event.originalTime || this.formatTimelineTime(event.date)}</span>
                                </div>
                                <p class="text-sm text-gray-600 mt-1">${event.description}</p>
                            </div>
                        </div>
                    `;
                } catch (error) {
                    console.warn('Error rendering timeline event:', error, event);
                }
            });
            
            timelineHTML += `</div></div>`;
        }

        return `
            <div class="card p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Hasta Geçmişi</h3>
                    <div class="space-x-2">
                        <button class="btn btn-secondary" onclick="addPatientNote()">Not Ekle</button>
                        <button class="btn btn-primary" onclick="addTimelineEvent()">Olay Ekle</button>
                    </div>
                </div>
                <div class="relative">
                    <div id="timelineEvents" class="space-y-4">
                        ${timelineHTML}
                    </div>
                </div>
            </div>
        `;
    }
    
    getNoteTypeDisplay(type) {
        const types = {
            'genel': 'Genel',
            'randevu': 'Randevu',
            'tedavi': 'Tedavi',
            'odeme': 'Ödeme',
            'cihaz': 'Cihaz',
            'sgk': 'SGK',
            'sikayet': 'Şikayet',
            'takip': 'Takip'
        };
        return types[type] || type;
    }

    // Timeline helper functions
    formatTimelineDate(date) {
        return date.toLocaleDateString('tr-TR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
        });
    }

    formatTimelineTime(date) {
        return date.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    getSGKStatusText(status) {
        switch (status) {
            case 'active': return 'Aktif';
            case 'pending': return 'Beklemede';
            case 'expired': return 'Süresi Dolmuş';
            case 'not_eligible': return 'Uygun Değil';
            default: return 'Belirtilmemiş';
        }
    }

    getTimelineIconClass(iconName) {
        const iconMap = {
            'user-plus': 'fas fa-user-plus',
            'clipboard': 'fas fa-clipboard',
            'calendar': 'fas fa-calendar-alt',
            'headphones': 'fas fa-headphones',
            'check-circle': 'fas fa-check-circle',
            'credit-card': 'fas fa-credit-card',
            'file': 'fas fa-file-alt',
            'file-text': 'fas fa-file-alt',
            'message-square': 'fas fa-comment-alt',
            'shield': 'fas fa-shield-alt',
            'shopping-cart': 'fas fa-shopping-cart',
            'tag': 'fas fa-tag',
            'user': 'fas fa-user'
        };
        
        return iconMap[iconName] || 'fas fa-circle';
    }

    getTimelineColorClass(eventType) {
        const colorMap = {
            'registration': 'border-blue-500 bg-blue-500',
            'note': 'border-yellow-500 bg-yellow-500',
            'appointment': 'border-green-500 bg-green-500',
            'device_trial': 'border-purple-500 bg-purple-500',
            'device_trial_end': 'border-purple-700 bg-purple-700',
            'device_assignment': 'border-indigo-500 bg-indigo-500',
            'payment': 'border-green-600 bg-green-600',
            'document': 'border-gray-500 bg-gray-500',
            'sms': 'border-blue-400 bg-blue-400',
            'sgk_update': 'border-red-500 bg-red-500',
            'sale': 'border-emerald-500 bg-emerald-500',
            'label_change': 'border-orange-500 bg-orange-500',
            'ereceipt': 'border-cyan-500 bg-cyan-500',
            'profile_update': 'border-teal-500 bg-teal-500',
            'timeline': 'border-blue-500 bg-blue-500'
        };
        
        return colorMap[eventType] || 'border-gray-400 bg-gray-400';
    }

    getEventTypeLabel(eventType) {
        const labelMap = {
            'registration': 'Kayıt',
            'note': 'Not',
            'appointment': 'Randevu',
            'device_trial': 'Cihaz Denemesi',
            'device_trial_end': 'Deneme Sonu',
            'device_assignment': 'Cihaz Atama',
            'payment': 'Ödeme',
            'document': 'Belge',
            'sms': 'SMS',
            'sgk_update': 'SGK Güncelleme',
            'sale': 'Satış',
            'label_change': 'Etiket Değişikliği',
            'ereceipt': 'E-Reçete',
            'profile_update': 'Profil Güncelleme',
            'timeline': 'Olay'
        };
        
        return labelMap[eventType] || 'Diğer';
    }

    renderSGK(patientData) {
        const sgkData = patientData.sgkInfo || {};
        
        // Default SGK values matching legacy
        const sgkStatus = sgkData.status || patientData.sgkStatus || 'pending';
        const reportDate = sgkData.reportDate || sgkData.lastReportDate || '05 Ocak 2024';
        const reportNo = sgkData.reportNo || `SGK-2024-${patientData.id?.slice(-6) || '001234'}`;
        const validityPeriod = sgkData.validityPeriod || '2 Yıl';
        const contributionAmount = sgkData.contributionAmount || 1500;
        const sgkCoverage = sgkData.sgkCoverage || 8500;
        const totalAmount = contributionAmount + sgkCoverage;
        
        // Get status display info
        const getStatusInfo = (status) => {
            switch (status) {
                case 'approved':
                case 'active':
                    return { text: 'Onaylı', class: 'px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full' };
                case 'pending':
                    return { text: 'Beklemede', class: 'px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full' };
                case 'expired':
                    return { text: 'Süresi Dolmuş', class: 'px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full' };
                case 'rejected':
                    return { text: 'Reddedildi', class: 'px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full' };
                default:
                    return { text: 'Bilinmiyor', class: 'px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full' };
            }
        };
        
        const statusInfo = getStatusInfo(sgkStatus);

        return `
            <div class="space-y-6">
                <!-- SGK Status Information -->
                <div class="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">SGK Durum Bilgileri</h3>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- SGK Status Information -->
                            <div class="space-y-4">
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
                                    ${sgkData.validityDate ? `
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Geçerlilik Tarihi:</span>
                                            <span class="font-medium">${new Date(sgkData.validityDate).toLocaleDateString('tr-TR')}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <!-- Financial Information -->
                            <div class="space-y-4">
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
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- E-receipt Query Section -->
                <div class="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">E-Reçete Sorgulama</h3>
                    </div>
                    <div class="p-6">
                        <div class="flex space-x-4 mb-4">
                            <input type="text" id="eReceiptNo" placeholder="E-reçete numarası giriniz" 
                                   class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <button onclick="queryEReceipt()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200">
                                Sorgula
                            </button>
                        </div>
                        <div id="eReceiptResult" class="hidden"></div>
                    </div>
                </div>
                
                <!-- Report Query Section -->
                <div class="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">Rapor Sorgulama</h3>
                    </div>
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-4">
                            <p class="text-sm text-gray-600">Hasta TC Kimlik Numarası ile rapor haklarını sorgulayın</p>
                            <button onclick="queryPatientReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                                Rapor Sorgula
                            </button>
                        </div>
                        <div id="reportResult" class="hidden"></div>
                    </div>
                </div>
                
                <!-- Saved E-receipts Section -->
                <div class="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">Kaydedilmiş E-Reçeteler <span id="savedEReceiptsCount" class="text-sm font-normal text-gray-500">(0 kaydedilmiş e-reçete)</span></h3>
                    </div>
                    <div id="savedEReceipts" class="p-6">
                        <div class="text-center py-8 text-gray-500">
                            <p>Henüz kaydedilmiş e-reçete bulunmamaktadır.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderBelgeler(patientData) {
        // Use the document management component for rendering
        if (window.documentManagement) {
            return window.documentManagement.renderDocumentsTab(patientData);
        }
        
        // Fallback rendering if document management component is not available
        return `
            <div class="space-y-6">
                <div class="card p-6">
                    <h3 class="text-lg font-semibold mb-4">📄 Belge Yönetimi</h3>
                    <p class="text-gray-500">Belge yönetim bileşeni yükleniyor...</p>
                </div>
            </div>
        `;
    }

    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Load patient sales data from backend API
    async loadPatientSalesData(patientId) {
        try {
            const response = await this.apiClient.get(`/api/patients/${patientId}/sales`);
            // Support both envelope { success,data } and unwrapped arrays
            if (Array.isArray(response)) {
                return response;
            }
            if (response && response.data && Array.isArray(response.data)) {
                return response.data;
            }
            // Support nested envelope shapes e.g. { data: { success: true, data: [...] } }
            if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
                return response.data.data;
            }
            return [];
        } catch (error) {
            console.error('Error loading patient sales data:', error);
            return [];
        }
    }
}

// Create global patientManagement object with loadPatientData method
window.patientManagement = {
    loadPatientData: async function() {
        try {
            console.log('🔄 Loading patient data from API...');

            // Get current patient ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const patientId = urlParams.get('id');

            if (!patientId) {
                console.warn('⚠️ No patient ID found in URL');
                return;
            }

            // Fetch fresh patient data from API
            let data;
            // Prefer the centralized patientDataService if present (migrated TypeScript service)
            if (window.patientDataService && typeof window.patientDataService.getById === 'function') {
                data = await window.patientDataService.getById(patientId);
            } else {
                const base = (typeof window !== 'undefined' && window.API_BASE_URL) || '/api';
                const response = await fetch(`${base}/patients/${patientId}`);
                data = await response.json();
            }

            // Canonicalize payload (support both envelope and raw shapes)
            let payload = data && data.data ? data.data : data;
            try {
                if (typeof window !== 'undefined' && window.CanonicalizePatient && typeof window.CanonicalizePatient.canonicalizePatient === 'function') {
                    payload = window.CanonicalizePatient.canonicalizePatient(payload);
                } else if (typeof require === 'function') {
                    // For test environments that support commonjs
                    try {
                        const normalizer = require('./utils/patient-normalize.cjs');
                        if (normalizer && typeof normalizer.canonicalizePatient === 'function') {
                            payload = normalizer.canonicalizePatient(payload);
                        }
                    } catch (e) { /* ignore */ }
                }
            } catch (e) {
                /* fall back to raw payload */
            }
            
            if (data && (data.success === undefined || data.success === true) && payload) {
                console.log('✅ Patient data loaded from API:', payload);

                // Update localStorage with fresh data
                let patientsData = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.PATIENTS_DATA || 'xear_patients_data') ||
                                           localStorage.getItem('xear_patients') || '[]');

                // Find and update the patient in localStorage
                const patientIndex = patientsData.findIndex(p => p.id === patientId);
                if (patientIndex !== -1) {
                    // Merge API data with existing localStorage data to preserve any local-only fields
                    const existingPatient = patientsData[patientIndex];
                    patientsData[patientIndex] = { ...existingPatient, ...payload };
                } else {
                    // Add new patient if not found
                    patientsData.push(payload);
                }

                // Save back to localStorage
                localStorage.setItem(window.STORAGE_KEYS?.PATIENTS_DATA || 'xear_patients_data', JSON.stringify(patientsData));

                // Update global patient manager
                if (!window.patientDetailsManager) {
                    window.patientDetailsManager = {};
                }
                window.patientDetailsManager.currentPatient = payload;

                console.log('✅ Patient data updated in localStorage and global state');

                // Trigger UI refresh by reloading the devices tab if it's active
                if (window.deviceManagement && typeof window.deviceManagement.renderDevicesTab === 'function') {
                    const content = window.deviceManagement.renderDevicesTab(payload);
                    const tabContent = document.getElementById('tab-content');
                    if (tabContent) tabContent.innerHTML = content;
                }

                // Also refresh the tab loader if it exists
                if (window.patientDetailsTabLoader && window.patientDetailsTabLoader.refreshCurrentTab) {
                    window.patientDetailsTabLoader.refreshCurrentTab();
                }

            } else {
                console.error('❌ Failed to load patient data from API:', data);
            }

        } catch (error) {
            console.error('❌ Error loading patient data:', error);
        }
    }
};

console.log('🎯 Patient Tab Content Component initialized');

// Global functions for device assignment
window.toggleDeviceAssignmentForm = function() {
    const form = document.getElementById('deviceAssignmentCard');
    const btn = document.getElementById('toggleDeviceAssignmentBtn');
    
    if (form.classList.contains('hidden')) {
        form.classList.remove('hidden');
        btn.innerHTML = `
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Vazgeç
        `;
        // Load SGK schemes when form opens
        loadSgkSchemesForAssignment();
        // Apply pricing settings
        applyPricingSettings();
    } else {
        form.classList.add('hidden');
        btn.innerHTML = `
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Cihaz Ata
        `;
    }
};

window.updateRightEarMode = function() {
    const mode = document.getElementById('rightEarMode').value;
    const inventoryMode = document.getElementById('rightEarInventoryMode');
    const manualMode = document.getElementById('rightEarManualMode');
    
    if (mode === 'inventory') {
        inventoryMode.classList.remove('hidden');
        manualMode.classList.add('hidden');
    } else {
        inventoryMode.classList.add('hidden');
        manualMode.classList.remove('hidden');
    }
    
    updateRightEarPricing();
};

window.updateLeftEarMode = function() {
    const mode = document.getElementById('leftEarMode').value;
    const inventoryMode = document.getElementById('leftEarInventoryMode');
    const manualMode = document.getElementById('leftEarManualMode');
    
    if (mode === 'inventory') {
        inventoryMode.classList.remove('hidden');
        manualMode.classList.add('hidden');
    } else {
        inventoryMode.classList.add('hidden');
        manualMode.classList.remove('hidden');
    }
    
    updateLeftEarPricing();
};

window.updateRightEarReason = function() {
    const reason = document.getElementById('rightEarReason').value;
    const pricingPanel = document.getElementById('rightEarPricingPanel');
    
    if (reason === 'Sale') {
        pricingPanel.classList.remove('hidden');
        updateRightEarPricing();
    } else {
        pricingPanel.classList.add('hidden');
    }
};

window.updateLeftEarReason = function() {
    const reason = document.getElementById('leftEarReason').value;
    const pricingPanel = document.getElementById('leftEarPricingPanel');
    
    if (reason === 'Sale') {
        pricingPanel.classList.remove('hidden');
        updateLeftEarPricing();
    } else {
        pricingPanel.classList.add('hidden');
    }
};

window.updateRightEarPricing = function() {
    const listPrice = parseFloat(document.getElementById('rightEarListPrice').value) || 0;
    const salePrice = parseFloat(document.getElementById('rightEarSalePrice').value) || 0;
    const sgkScheme = document.getElementById('rightEarSgkScheme').value;
    const discountType = document.getElementById('rightEarDiscountType').value;
    const discountValue = parseFloat(document.getElementById('rightEarDiscountValue').value) || 0;
    
    // Get SGK support amount
    const sgkSupport = getSgkSupportAmount(sgkScheme);
    
    // Calculate base price (sale price if provided, otherwise list price)
    const basePrice = salePrice > 0 ? salePrice : listPrice;
    
    // Apply discount
    let discountAmount = 0;
    let afterDiscount = basePrice;
    if (discountType === 'percent' && discountValue > 0) {
        discountAmount = basePrice * (discountValue / 100);
        afterDiscount = basePrice - discountAmount;
    } else if (discountType === 'amount' && discountValue > 0) {
        discountAmount = Math.min(discountValue, basePrice);
        afterDiscount = basePrice - discountAmount;
    }
    
    // Apply SGK support
    const netAmount = Math.max(afterDiscount - sgkSupport, 0);
    
    // Update display fields
    document.getElementById('rightEarDiscountAmount').value = discountAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    document.getElementById('rightEarAfterDiscount').value = afterDiscount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    document.getElementById('rightEarNetAmount').value = netAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
};

window.updateLeftEarPricing = function() {
    const listPrice = parseFloat(document.getElementById('leftEarListPrice').value) || 0;
    const salePrice = parseFloat(document.getElementById('leftEarSalePrice').value) || 0;
    const sgkScheme = document.getElementById('leftEarSgkScheme').value;
    const discountType = document.getElementById('leftEarDiscountType').value;
    const discountValue = parseFloat(document.getElementById('leftEarDiscountValue').value) || 0;
    
    // Get SGK support amount
    const sgkSupport = getSgkSupportAmount(sgkScheme);
    
    // Calculate base price (sale price if provided, otherwise list price)
    const basePrice = salePrice > 0 ? salePrice : listPrice;
    
    // Apply discount
    let discountAmount = 0;
    let afterDiscount = basePrice;
    if (discountType === 'percent' && discountValue > 0) {
        discountAmount = basePrice * (discountValue / 100);
        afterDiscount = basePrice - discountAmount;
    } else if (discountType === 'amount' && discountValue > 0) {
        discountAmount = Math.min(discountValue, basePrice);
        afterDiscount = basePrice - discountAmount;
    }
    
    // Apply SGK support
    const netAmount = Math.max(afterDiscount - sgkSupport, 0);
    
    // Update display fields
    document.getElementById('leftEarDiscountAmount').value = discountAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    document.getElementById('leftEarAfterDiscount').value = afterDiscount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    document.getElementById('leftEarNetAmount').value = netAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
};

window.cancelDeviceAssignment = function() {
    toggleDeviceAssignmentForm();
};

window.clearDeviceAssignment = function() {
    // Clear right ear fields
    document.getElementById('rightEarMode').value = 'inventory';
    document.getElementById('rightEarDeviceSelect').value = '';
    document.getElementById('rightEarBrand').value = '';
    document.getElementById('rightEarModel').value = '';
    document.getElementById('rightEarSerial').value = '';
    document.getElementById('rightEarType').value = '';
    document.getElementById('rightEarListPrice').value = '';
    document.getElementById('rightEarSalePrice').value = '';
    document.getElementById('rightEarSgkScheme').value = '';
    document.getElementById('rightEarDiscountType').value = 'none';
    document.getElementById('rightEarDiscountValue').value = '';
    document.getElementById('rightEarDiscountAmount').value = '';
    document.getElementById('rightEarAfterDiscount').value = '';
    document.getElementById('rightEarNetAmount').value = '';
    document.getElementById('rightEarPaymentMethod').value = 'cash';
    
    // Clear left ear fields
    document.getElementById('leftEarMode').value = 'inventory';
    document.getElementById('leftEarDeviceSelect').value = '';
    document.getElementById('leftEarBrand').value = '';
    document.getElementById('leftEarModel').value = '';
    document.getElementById('leftEarSerial').value = '';
    document.getElementById('leftEarType').value = '';
    document.getElementById('leftEarListPrice').value = '';
    document.getElementById('leftEarSalePrice').value = '';
    document.getElementById('leftEarSgkScheme').value = '';
    document.getElementById('leftEarDiscountType').value = 'none';
    document.getElementById('leftEarDiscountValue').value = '';
    document.getElementById('leftEarDiscountAmount').value = '';
    document.getElementById('leftEarAfterDiscount').value = '';
    document.getElementById('leftEarNetAmount').value = '';
    document.getElementById('leftEarPaymentMethod').value = 'cash';
    
    // Update modes
    updateRightEarMode();
    updateLeftEarMode();
};

window.assignDevices = function() {
    // This will be implemented to call the backend API
    console.log('Assigning devices...');
    // TODO: Implement device assignment API call
};