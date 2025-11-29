class DocumentManagementComponent {
    constructor() {
        // Access API client through window object to avoid conflicts
        this.api = window.api;
        this.apiClient = new ApiClient();
    }

    renderDocumentsTab(patientData) {
        const documents = patientData.documents || [];

        // Render enhanced controls if available
        const enhancedControls = window.documentManagementEnhanced 
            ? window.documentManagementEnhanced.renderEnhancedControls(patientData.id)
            : '';

        let documentsHtml = '';

        if (documents.length > 0) {
            documentsHtml = documents.map(doc => {
                const uploadDate = doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString('tr-TR') : 'Bilinmiyor';
                const fileSize = this.formatFileSize(doc.size || doc.fileSize || 0);
                const docType = doc.type || doc.mimeType || 'general';

                return `
                    <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200" 
                         data-document-type="${docType}"
                         data-document-id="${doc.id}"
                         data-patient-id="${patientData.id}">
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex items-start space-x-3">
                                <div class="text-2xl">${this.getDocIcon(docType)}</div>
                                <div>
                                    <h4 class="text-sm font-medium text-gray-900">${doc.name || doc.title || doc.originalName || doc.fileName || 'İsimsiz Belge'}</h4>
                                    <p class="text-xs text-gray-500">${fileSize} • ${uploadDate}</p>
                                    ${doc.description ? `<p class="text-xs text-gray-600 mt-1">${doc.description}</p>` : ''}
                                </div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <button onclick="viewDocument('${doc.id}', '${patientData.id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Görüntüle">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                </button>
                                <button onclick="downloadDocument('${doc.id}', '${patientData.id}')" class="text-green-600 hover:text-green-800 p-1" title="İndir">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                </button>
                                <button onclick="deleteDocument('${doc.id}', '${patientData.id}')" class="text-red-600 hover:text-red-800 p-1" title="Sil">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            documentsHtml = `
                <div class="text-center py-12 text-gray-500 col-span-full">
                    <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p class="text-lg font-medium">Henüz belge yüklenmemiş</p>
                    <p class="mt-1">Aşağıdaki hızlı butonları kullanarak belge yükleyebilirsiniz.</p>
                </div>
            `;
        }

        return `
            <div class="space-y-6">
                ${enhancedControls}
                
                <div class="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-medium text-gray-900">
                                Yüklenen Belgeler 
                                <span class="text-sm font-normal text-gray-500">(${documents.length})</span>
                            </h3>
                            <button onclick="uploadDocument()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                                <i class="fas fa-upload mr-2"></i>Belge Yükle
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${documentsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Exact replica of legacy uploadDocument function
    uploadDocument() {
        // Create modal HTML exactly like legacy
        const modalHtml = `
            <div id="uploadDocumentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div class="mt-3">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-medium text-gray-900">Belge Yükle</h3>
                            <button onclick="closeUploadModal()" class="text-gray-400 hover:text-gray-600">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <form id="documentUploadForm" class="space-y-4">
                            <div>
                                <label for="documentTitle" class="block text-sm font-medium text-gray-700 mb-1">Belge Başlığı *</label>
                                <input type="text" id="documentTitle" name="documentTitle" required
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>

                            <div>
                                <label for="documentType" class="block text-sm font-medium text-gray-700 mb-1">Belge Türü *</label>
                                <select id="documentType" name="documentType" required
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Seçiniz...</option>
                                    <option value="sgk_report">SGK Raporu</option>
                                    <option value="hearing_test">İşitim Testi</option>
                                    <option value="prescription">Reçete</option>
                                    <option value="invoice">Fatura</option>
                                    <option value="id_card">Kimlik Fotokopisi</option>
                                    <option value="other">Diğer</option>
                                </select>
                            </div>

                            <div>
                                <label for="documentDate" class="block text-sm font-medium text-gray-700 mb-1">Belge Tarihi *</label>
                                <input type="date" id="documentDate" name="documentDate" required
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>

                            <div>
                                <label for="documentFile" class="block text-sm font-medium text-gray-700 mb-1">Dosya Seç *</label>
                                <div class="border-2 border-dashed border-gray-300 rounded-md p-4 text-center hover:border-gray-400 transition-colors">
                                    <input type="file" id="documentFile" name="documentFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required
                                           class="hidden" onchange="handleFileSelect(event)">
                                    <div id="fileDropArea" onclick="document.getElementById('documentFile').click()"
                                         class="cursor-pointer">
                                        <svg class="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                        </svg>
                                        <p class="text-sm text-gray-600">Dosyayı sürükleyin veya tıklayarak seçin</p>
                                        <p class="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOC, DOCX (max 10MB)</p>
                                    </div>
                                    <div id="fileInfo" class="hidden mt-2">
                                        <p class="text-sm font-medium text-gray-900" id="selectedFileName"></p>
                                        <p class="text-xs text-gray-500" id="selectedFileSize"></p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label for="documentNotes" class="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                                <textarea id="documentNotes" name="documentNotes" rows="3"
                                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="Belge hakkında ek bilgiler..."></textarea>
                            </div>

                            <div class="flex justify-end space-x-3 pt-4">
                                <button type="button" onclick="closeUploadModal()"
                                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                                    İptal
                                </button>
                                <button type="submit"
                                        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    Yükle
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('documentDate').value = today;

        // Add form submit handler
        document.getElementById('documentUploadForm').addEventListener('submit', this.handleDocumentUpload.bind(this));

        // Add drag and drop functionality
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const dropArea = document.getElementById('fileDropArea');
        const fileInput = document.getElementById('documentFile');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, this.highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, this.unhighlight, false);
        });

        dropArea.addEventListener('drop', this.handleDrop.bind(this), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight() {
        const dropArea = document.getElementById('fileDropArea');
        dropArea.classList.add('border-blue-400', 'bg-blue-50');
    }

    unhighlight() {
        const dropArea = document.getElementById('fileDropArea');
        dropArea.classList.remove('border-blue-400', 'bg-blue-50');
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    handleFile(file) {
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            this.showToast('Dosya boyutu 10MB\'dan büyük olamaz!', 'error');
            return;
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            this.showToast('Geçersiz dosya türü! Sadece PDF, JPG, PNG, DOC, DOCX dosyaları kabul edilir.', 'error');
            return;
        }

        // Update file input and display info
        const fileInput = document.getElementById('documentFile');
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;

        // Show file info
        document.getElementById('fileDropArea').classList.add('hidden');
        document.getElementById('fileInfo').classList.remove('hidden');
        document.getElementById('selectedFileName').textContent = file.name;
        document.getElementById('selectedFileSize').textContent = this.formatFileSize(file.size);
    }

    async handleDocumentUpload(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const file = formData.get('documentFile');

        // Validate required fields
        const title = formData.get('documentTitle').trim();
        const type = formData.get('documentType');
        const date = formData.get('documentDate');

        if (!title || !type || !date || !file) {
            this.showToast('Lütfen tüm zorunlu alanları doldurunuz!', 'error');
            return;
        }

        // Validate file size
        if (file.size > 10 * 1024 * 1024) {
            this.showToast('Dosya boyutu 10MB\'dan büyük olamaz!', 'error');
            return;
        }

        try {
            // Show loading state
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Yükleniyor...';
            submitBtn.disabled = true;

            // Create document object
            const documentData = {
                id: Date.now().toString(),
                title: title,
                type: type,
                date: date,
                fileName: file.name,
                fileSize: file.size,
                notes: formData.get('documentNotes'),
                uploadDate: new Date().toISOString(),
                patientId: window.patientDetailsManager?.currentPatient?.id || 'unknown'
            };

            // Save to patient's documents (simulate API call)
            await this.saveDocumentToPatient(documentData);

            // Close modal and show success
            this.closeUploadModal();
            this.showToast('Belge başarıyla yüklendi!', 'success');

            // Refresh documents tab
            if (window.patientTabContentComponent) {
                const patientData = window.patientDetailsManager?.currentPatient || {};
                patientData.documents = patientData.documents || [];
                patientData.documents.push(documentData);
                window.patientTabContentComponent.renderDocumentsTab(patientData);
            }

        } catch (error) {
            console.error('Document upload error:', error);
            this.showToast('Belge yüklenirken bir hata oluştu!', 'error');
        } finally {
            // Reset button state
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Yükle';
            submitBtn.disabled = false;
        }
    }

    async saveDocumentToPatient(documentData) {
        // Prefer backend persistence
        if (typeof window !== 'undefined' && window.APIConfig && typeof window.APIConfig.makeRequest === 'function') {
            try {
                const patientId = documentData.patientId;
                // Fetch existing patient documents via API first (best-effort)
                let existing = [];
                try {
                    const p = await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.patients}/${patientId}`, 'GET');
                    const serverPatient = p && (p.data || p) ? (p.data || p) : null;
                    existing = serverPatient && serverPatient.documents ? serverPatient.documents : [];
                } catch (e) {
                    existing = [];
                }

                const payload = { documents: [...existing, documentData] };
                const resp = await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.patients}/${patientId}`, 'PUT', payload);
                const serverPatient = resp && (resp.data || resp) ? (resp.data || resp) : null;
                if (serverPatient) {
                    // Update localStorage for UI parity
                    const patients = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.PATIENTS || 'xear_patients') || '[]');
                    const patientIndex = patients.findIndex(p => p.id === patientId);
                    if (patientIndex !== -1) {
                        patients[patientIndex].documents = serverPatient.documents || [...(patients[patientIndex].documents||[]), documentData];
                        try { localStorage.setItem(window.STORAGE_KEYS?.PATIENTS || 'xear_patients', JSON.stringify(patients)); } catch(e){ console.warn('persist document to localStorage failed', e); }
                    }

                    // Dispatch events
                    try { window.dispatchEvent(new CustomEvent('patient:updated', { detail: { id: patientId } })); } catch(e){}
                    try { window.dispatchEvent(new CustomEvent('patient:updated:remote', { detail: { id: patientId } })); } catch(e){}

                    return documentData;
                }

            } catch (err) {
                console.warn('Document persist via API failed, falling back to local:', err);
                if (err && err.status === 401) throw err;
            }
        }

        // LocalStorage fallback (demo/offline)
        return new Promise((resolve) => {
            setTimeout(() => {
                // Add to local storage for demo purposes
                const patients = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.PATIENTS || 'xear_patients') || '[]');
                const patientIndex = patients.findIndex(p => p.id === documentData.patientId);

                if (patientIndex !== -1) {
                    patients[patientIndex].documents = patients[patientIndex].documents || [];
                    patients[patientIndex].documents.push(documentData);
                    localStorage.setItem(window.STORAGE_KEYS?.PATIENTS || 'xear_patients', JSON.stringify(patients));

                    // Dispatch local event
                    try { window.dispatchEvent(new CustomEvent('patient:updated', { detail: { id: documentData.patientId } })); } catch(e){}
                }

                resolve(documentData);
            }, 1000);
        });
    }

    closeUploadModal() {
        const modal = document.getElementById('uploadDocumentModal');
        if (modal) {
            modal.remove();
        }
    }

    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-4 py-2 rounded-md text-white z-50 ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
        }`;
        toast.textContent = message;

        document.body.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    /**
     * View document in modal
     */
    viewDocument(documentId, patientId) {
        // Find document in current patient data
        const doc = this.findDocumentById(documentId, patientId);
        if (!doc) {
            this.showToast('Belge bulunamadı', 'error');
            return;
        }

        this.showDocumentModal(doc);
    }

    /**
     * Download document
     */
    downloadDocument(documentId, patientId) {
        const doc = this.findDocumentById(documentId, patientId);
        if (!doc) {
            this.showToast('Belge bulunamadı', 'error');
            return;
        }

        // If document has a URL, download from there
        if (doc.url || doc.filePath) {
            const link = document.createElement('a');
            link.href = doc.url || doc.filePath;
            link.download = doc.name || doc.originalName || doc.fileName || 'document';
            link.click();
            this.showToast('Belge indiriliyor...', 'info');
            return;
        }

        // If document has base64 data
        if (doc.data || doc.content) {
            const link = document.createElement('a');
            const content = doc.data || doc.content;
            
            // For HTML content, create a blob
            if (doc.mimeType === 'text/html' || doc.type === 'promissory_note') {
                const blob = new Blob([content], { type: 'text/html' });
                link.href = URL.createObjectURL(blob);
            } else {
                link.href = content;
            }
            
            link.download = doc.name || doc.originalName || doc.fileName || 'document';
            link.click();
            
            // Clean up blob URL if created
            if (link.href.startsWith('blob:')) {
                setTimeout(() => URL.revokeObjectURL(link.href), 100);
            }
            
            this.showToast('Belge indiriliyor...', 'info');
            return;
        }

        this.showToast('Belge indirilemedi', 'error');
    }

    /**
     * Delete document
     */
    async deleteDocument(documentId, patientId) {
        if (!confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            // Call API to delete document
            const response = await this.api.deletePatient(id);

            if (response.ok) {
                this.showToast('Belge silindi', 'success');
                
                // Reload documents
                window.location.reload();
            } else {
                throw new Error('Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('Belge silinirken hata oluştu', 'error');
        }
    }

    /**
     * Find document by ID
     */
    findDocumentById(documentId, patientId) {
        // Try to get from current patient data
        const currentPatient = window.patientDetailsManager?.currentPatient;
        if (currentPatient && currentPatient.documents) {
            const doc = currentPatient.documents.find(d => d.id === documentId);
            if (doc) return doc;
        }

        // Try to get from localStorage as fallback
        try {
            const patients = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.PATIENTS || 'xear_patients') || '[]');
            const patient = patients.find(p => p.id === patientId);
            if (patient && patient.documents) {
                return patient.documents.find(d => d.id === documentId);
            }
        } catch (e) {
            console.error('Error finding document:', e);
        }

        return null;
    }

    /**
     * Show document modal
     */
    showDocumentModal(doc) {
        const documentTypes = {
            'general': { icon: '📄', label: 'Genel Belge' },
            'medical': { icon: '⚕️', label: 'Tıbbi Belge' },
            'prescription': { icon: '📋', label: 'Reçete' },
            'audiometry': { icon: '🎧', label: 'Audiometri' },
            'lab_result': { icon: '🔬', label: 'Laboratuvar Sonucu' },
            'imaging': { icon: '📷', label: 'Görüntüleme' },
            'report': { icon: '📊', label: 'Rapor' },
            'sgk_report': { icon: '🏥', label: 'SGK Raporu' },
            'hearing_test': { icon: '👂', label: 'İşitme Testi' },
            'invoice': { icon: '💰', label: 'Fatura' },
            'id_card': { icon: '🆔', label: 'Kimlik' }
        };

        const typeConfig = documentTypes[doc.type] || { icon: '📄', label: 'Belge' };
        const fileName = doc.name || doc.title || doc.originalName || doc.fileName || 'İsimsiz Belge';
        const fileSize = this.formatFileSize(doc.size || doc.fileSize || 0);
        const uploadDate = doc.uploadDate || doc.uploadedAt || doc.createdAt;
        const formattedDate = uploadDate ? new Date(uploadDate).toLocaleString('tr-TR') : 'Bilinmiyor';

        // Determine content to display
        let contentHTML = '';
        const content = doc.data || doc.content || doc.url || doc.filePath;
        
        if (content) {
            const mimeType = doc.mimeType || doc.type;
            
            if (mimeType && mimeType.startsWith('image/')) {
                contentHTML = `<img src="${content}" alt="Document" class="max-w-full h-auto border rounded shadow-sm">`;
            } else if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
                contentHTML = `
                    <div class="border rounded bg-gray-50 p-4 text-center">
                        <i class="fas fa-file-pdf text-red-500 text-6xl mb-3"></i>
                        <p class="text-gray-700">PDF belgesi görüntülenemez</p>
                        <p class="text-sm text-gray-500 mt-2">İndirme butonunu kullanarak görüntüleyebilirsiniz</p>
                    </div>
                `;
            } else if (mimeType === 'text/html' || doc.type === 'promissory_note') {
                contentHTML = `<div class="prose max-w-none">${content}</div>`;
            } else {
                contentHTML = `
                    <div class="border rounded bg-gray-50 p-4 text-center">
                        <i class="fas fa-file text-gray-400 text-6xl mb-3"></i>
                        <p class="text-gray-700">Belge önizlemesi mevcut değil</p>
                        <p class="text-sm text-gray-500 mt-2">İndirme butonunu kullanarak görüntüleyebilirsiniz</p>
                    </div>
                `;
            }
        } else {
            contentHTML = `
                <div class="border rounded bg-gray-50 p-4 text-center">
                    <i class="fas fa-exclamation-triangle text-yellow-500 text-6xl mb-3"></i>
                    <p class="text-gray-700">Belge içeriği bulunamadı</p>
                </div>
            `;
        }

        const modalHTML = `
            <div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" 
                 id="document-view-modal"
                 onclick="if(event.target.id === 'document-view-modal') this.remove()">
                <div class="modal-container bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full m-4 flex flex-col" 
                     onclick="event.stopPropagation()">
                    <div class="modal-header border-b p-6 flex-shrink-0">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold flex items-center gap-2">
                                <span class="text-2xl">${typeConfig.icon}</span>
                                <span>${typeConfig.label}</span>
                            </h3>
                            <button onclick="document.getElementById('document-view-modal').remove()" 
                                    class="text-gray-400 hover:text-gray-600 transition-colors">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="modal-body p-6 overflow-y-auto flex-1">
                        <div class="mb-6">
                            ${contentHTML}
                        </div>
                        
                        <div class="bg-gray-50 rounded-lg p-4">
                            <h4 class="font-semibold text-gray-700 mb-3">Belge Bilgileri</h4>
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-gray-500">Dosya Adı:</span>
                                    <p class="font-medium text-gray-900">${fileName}</p>
                                </div>
                                <div>
                                    <span class="text-gray-500">Boyut:</span>
                                    <p class="font-medium text-gray-900">${fileSize}</p>
                                </div>
                                <div>
                                    <span class="text-gray-500">Tür:</span>
                                    <p class="font-medium text-gray-900">${typeConfig.label}</p>
                                </div>
                                <div>
                                    <span class="text-gray-500">Yüklenme:</span>
                                    <p class="font-medium text-gray-900">${formattedDate}</p>
                                </div>
                                ${doc.description ? `
                                    <div class="col-span-2">
                                        <span class="text-gray-500">Açıklama:</span>
                                        <p class="font-medium text-gray-900">${doc.description}</p>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer border-t p-6 flex-shrink-0">
                        <div class="flex justify-end space-x-3">
                            <button onclick="window.documentManagement.downloadDocument('${doc.id}', '${doc.patientId}')" 
                                    class="btn-secondary flex items-center gap-2">
                                <i class="fas fa-download"></i>
                                İndir
                            </button>
                            <button onclick="window.documentManagement.deleteDocument('${doc.id}', '${doc.patientId}')" 
                                    class="btn-secondary text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <i class="fas fa-trash"></i>
                                Sil
                            </button>
                            <button onclick="document.getElementById('document-view-modal').remove()" 
                                    class="btn-primary">
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    getDocIcon(type) {
        const iconMap = {
            'sgk_report': '🏥',
            'hearing_test': '👂',
            'prescription': '💊',
            'invoice': '📄',
            'id_card': '🆔',
            'general': '📄',
            'medical': '⚕️',
            'audiometry': '🎧',
            'lab_result': '🔬',
            'imaging': '📷',
            'report': '📊',
            'other': '📎'
        };
        return iconMap[type] || '📄';
    }

    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

// Global functions for modal management (matching legacy)
function uploadDocument() {
    if (window.documentManagement) {
        window.documentManagement.uploadDocument();
    }
}

function closeUploadModal() {
    if (window.documentManagement) {
        window.documentManagement.closeUploadModal();
    }
}

function handleFileSelect(event) {
    if (window.documentManagement && event.target.files.length > 0) {
        window.documentManagement.handleFile(event.target.files[0]);
    }
}

// Initialize global instance
window.documentManagement = new DocumentManagementComponent();
// Global functions for document view/download/delete
function viewDocument(documentId) {
    if (window.documentManagement) {
        const patientId = window.patientDetailsManager?.currentPatient?.id;
        window.documentManagement.viewDocument(documentId, patientId);
    }
}

function downloadDocument(documentId) {
    if (window.documentManagement) {
        const patientId = window.patientDetailsManager?.currentPatient?.id;
        window.documentManagement.downloadDocument(documentId, patientId);
    }
}

function deleteDocument(documentId) {
    if (window.documentManagement) {
        const patientId = window.patientDetailsManager?.currentPatient?.id;
        window.documentManagement.deleteDocument(documentId, patientId);
    }
}
