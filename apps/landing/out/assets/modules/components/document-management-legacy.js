/**
 * Document Management Component (LEGACY)
 * Handles document upload, storage, viewing, and management for patients
 * Uses localStorage - DEPRECATED in favor of API-based version
 */
class DocumentManagementComponentLegacy {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.documents = this.loadDocuments();
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // File upload handlers
        document.addEventListener('change', (e) => {
            if (e.target.type === 'file' && e.target.dataset.documentType) {
                this.handleFileUpload(e.target, e.target.dataset.documentType);
            }
        });

        // Drag and drop handlers
        document.addEventListener('dragover', (e) => {
            if (e.target.classList.contains('document-drop-zone')) {
                e.preventDefault();
                e.target.classList.add('drag-over');
            }
        });

        document.addEventListener('dragleave', (e) => {
            if (e.target.classList.contains('document-drop-zone')) {
                e.target.classList.remove('drag-over');
            }
        });

        document.addEventListener('drop', (e) => {
            if (e.target.classList.contains('document-drop-zone')) {
                e.preventDefault();
                e.target.classList.remove('drag-over');
                this.handleFileDrop(e.target, e.dataTransfer.files);
            }
        });
    }

    // Load documents from localStorage
    loadDocuments() {
        try {
            return JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.PATIENT_DOCUMENTS_PLAIN || 'patient_documents')) || {};
        } catch (error) {
            console.error('Error loading documents:', error);
            return {};
        }
    }

    // Save documents to localStorage
    saveDocuments() {
        try {
            localStorage.setItem(window.STORAGE_KEYS?.PATIENT_DOCUMENTS_PLAIN || 'patient_documents', JSON.stringify(this.documents));
        } catch (error) {
            console.error('Error saving documents:', error);
        }
    }

    // Get documents for a specific patient
    getPatientDocuments(patientId) {
        return this.documents[patientId] || [];
    }

    // Validate file before upload
    validateFile(file) {
        if (!this.supportedFormats.includes(file.type)) {
            this.showToast('Desteklenmeyen dosya formatı. JPG, PNG, WebP veya PDF kullanın.', 'error');
            return false;
        }

        if (file.size > this.maxFileSize) {
            this.showToast('Dosya çok büyük. Maksimum 10MB dosya yükleyebilirsiniz.', 'error');
            return false;
        }

        return true;
    }

    // Handle file upload from input
    async handleFileUpload(input, documentType) {
        const files = Array.from(input.files);
        const patientId = input.dataset.patientId;

        for (const file of files) {
            if (!this.validateFile(file)) continue;
            
            try {
                await this.processDocument(file, documentType, patientId);
            } catch (error) {
                console.error('Document processing failed:', error);
                this.showToast(`Belge işlenirken hata oluştu: ${error.message}`, 'error');
            }
        }

        // Clear input
        input.value = '';
    }

    // Handle file drop
    async handleFileDrop(dropZone, files) {
        const documentType = dropZone.dataset.documentType;
        const patientId = dropZone.dataset.patientId;

        for (const file of files) {
            if (!this.validateFile(file)) continue;
            
            try {
                await this.processDocument(file, documentType, patientId);
            } catch (error) {
                console.error('Document processing failed:', error);
                this.showToast(`Belge işlenirken hata oluştu: ${error.message}`, 'error');
            }
        }
    }

    // Process uploaded document
    async processDocument(file, documentType, patientId) {
        this.showToast('Belge işleniyor...', 'info');

        // Create document record
        const documentId = 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const document = {
            id: documentId,
            patientId: patientId,
            type: documentType,
            originalName: file.name,
            size: file.size,
            mimeType: file.type,
            uploadedAt: new Date().toISOString(),
            status: 'processing'
        };

        try {
            // Convert file to base64 for storage
            document.data = await this.fileToBase64(file);
            document.status = 'completed';

            // Save document
            this.saveDocument(document);
            
            // Update UI
            this.renderDocumentItem(document);
            
            this.showToast('Belge başarıyla yüklendi', 'success');
        } catch (error) {
            document.status = 'error';
            this.showToast('Belge yüklenirken hata oluştu', 'error');
            throw error;
        }
    }

    // Convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Save document to storage
    saveDocument(document) {
        if (!this.documents[document.patientId]) {
            this.documents[document.patientId] = [];
        }
        this.documents[document.patientId].push(document);
        this.saveDocuments();
    }

    // Delete document
    deleteDocument(documentId) {
        if (!confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) {
            return;
        }

        for (const patientId in this.documents) {
            const index = this.documents[patientId].findIndex(doc => doc.id === documentId);
            if (index !== -1) {
                this.documents[patientId].splice(index, 1);
                this.saveDocuments();
                
                // Remove from UI
                const element = document.querySelector(`[data-document-id="${documentId}"]`);
                if (element) {
                    element.remove();
                }
                
                this.showToast('Belge silindi', 'success');
                return;
            }
        }
    }

    // Render documents tab
    renderDocumentsTab(patientData) {
        const documents = this.getPatientDocuments(patientData.id);
        
        return `
            <div class="documents-tab">
                <!-- Document Upload Section -->
                <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">📄 Belge Yönetimi</h3>
                    
                    <!-- Upload Area -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div class="document-drop-zone border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
                             data-document-type="general" data-patient-id="${patientData.id}">
                            <div class="text-gray-500 mb-2">
                                <svg class="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">Genel belgeler için dosya sürükleyin</p>
                            <input type="file" class="hidden" multiple accept=".jpg,.jpeg,.png,.pdf,.webp" 
                                   data-document-type="general" data-patient-id="${patientData.id}" id="general-upload-${patientData.id}">
                            <label for="general-upload-${patientData.id}" class="btn-primary text-sm cursor-pointer">Dosya Seç</label>
                        </div>
                        
                        <div class="document-drop-zone border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors"
                             data-document-type="medical" data-patient-id="${patientData.id}">
                            <div class="text-gray-500 mb-2">
                                <svg class="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">Tıbbi belgeler için dosya sürükleyin</p>
                            <input type="file" class="hidden" multiple accept=".jpg,.jpeg,.png,.pdf,.webp" 
                                   data-document-type="medical" data-patient-id="${patientData.id}" id="medical-upload-${patientData.id}">
                            <label for="medical-upload-${patientData.id}" class="btn-success text-sm cursor-pointer">Dosya Seç</label>
                        </div>
                    </div>
                    
                    <!-- Quick Upload Buttons -->
                    <div class="flex flex-wrap gap-2">
                        <button onclick="window.documentManagement.openUploadModal('${patientData.id}', 'prescription')" 
                                class="btn-secondary text-sm">📋 Reçete Ekle</button>
                        <button onclick="window.documentManagement.openUploadModal('${patientData.id}', 'audiometry')" 
                                class="btn-secondary text-sm">🎧 Audiometri Ekle</button>
                        <button onclick="window.documentManagement.openUploadModal('${patientData.id}', 'warranty')" 
                                class="btn-secondary text-sm">🛡️ Garanti Ekle</button>
                        <button onclick="window.documentManagement.openUploadModal('${patientData.id}', 'invoice')" 
                                class="btn-secondary text-sm">🧾 Fatura Ekle</button>
                    </div>
                </div>
                
                <!-- Documents List -->
                <div class="bg-white rounded-lg shadow-sm border p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Yüklenen Belgeler (${documents.length})</h3>
                        <div class="flex space-x-2">
                            <select class="form-select text-sm" onchange="window.documentManagement.filterDocuments('${patientData.id}', this.value)">
                                <option value="all">Tüm Belgeler</option>
                                <option value="medical">Tıbbi Belgeler</option>
                                <option value="general">Genel Belgeler</option>
                                <option value="prescription">Reçeteler</option>
                                <option value="audiometry">Audiometri</option>
                                <option value="warranty">Garanti</option>
                                <option value="invoice">Faturalar</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="documents-list" data-document-list="${patientData.id}">
                        ${documents.length === 0 ? `
                            <div class="text-center py-8 text-gray-500">
                                <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                <p>Henüz belge yüklenmemiş</p>
                                <p class="text-sm">Yukarıdaki alanları kullanarak belge yükleyebilirsiniz</p>
                            </div>
                        ` : documents.map(doc => this.renderDocumentItemHTML(doc)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Render individual document item HTML
    renderDocumentItemHTML(document) {
        const statusIcon = this.getStatusIcon(document.status);
        const statusText = this.getStatusText(document.status);
        const typeText = this.getDocumentTypeText(document.type);

        return `
            <div class="document-item border border-gray-200 rounded-lg p-4 mb-3" data-document-id="${document.id}">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                            <span class="text-lg">${this.getDocumentTypeIcon(document.type)}</span>
                            <h4 class="font-medium text-gray-900">${typeText}</h4>
                            <span class="text-xs px-2 py-1 rounded-full ${this.getStatusClass(document.status)}">
                                ${statusIcon} ${statusText}
                            </span>
                        </div>
                        
                        <div class="text-sm text-gray-600 mb-2">
                            <p><strong>Dosya:</strong> ${document.originalName}</p>
                            <p><strong>Boyut:</strong> ${this.formatFileSize(document.size)}</p>
                            <p><strong>Yüklenme:</strong> ${new Date(document.uploadedAt).toLocaleString('tr-TR')}</p>
                        </div>
                    </div>
                    
                    <div class="flex flex-col space-y-2 ml-4">
                        <button onclick="window.documentManagement.viewDocument('${document.id}')" 
                                class="btn-secondary text-xs px-3 py-1">
                            👁️ Görüntüle
                        </button>
                        <button onclick="window.documentManagement.downloadDocument('${document.id}')" 
                                class="btn-secondary text-xs px-3 py-1">
                            💾 İndir
                        </button>
                        <button onclick="window.documentManagement.deleteDocument('${document.id}')" 
                                class="btn-secondary text-xs px-3 py-1 text-red-600">
                            🗑️ Sil
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Render document item in DOM
    renderDocumentItem(document) {
        const container = document.querySelector(`[data-document-list="${document.patientId}"]`);
        if (!container) return;

        // Remove empty state if exists
        const emptyState = container.querySelector('.text-center.py-8');
        if (emptyState) {
            emptyState.remove();
        }

        container.insertAdjacentHTML('afterbegin', this.renderDocumentItemHTML(document));
    }

    // Get document type icon
    getDocumentTypeIcon(type) {
        const icons = {
            'prescription': '📋',
            'audiometry': '🎧',
            'warranty': '🛡️',
            'invoice': '🧾',
            'medical': '🏥',
            'general': '📄',
            'other': '📄'
        };
        return icons[type] || icons['other'];
    }

    // Get document type text
    getDocumentTypeText(type) {
        const types = {
            'prescription': 'Reçete',
            'audiometry': 'Audiometri',
            'warranty': 'Garanti',
            'invoice': 'Fatura',
            'medical': 'Tıbbi Belge',
            'general': 'Genel Belge',
            'other': 'Diğer Belge'
        };
        return types[type] || types['other'];
    }

    // Get status icon
    getStatusIcon(status) {
        const icons = {
            'processing': '⏳',
            'completed': '✅',
            'error': '❌'
        };
        return icons[status] || '❓';
    }

    // Get status text
    getStatusText(status) {
        const texts = {
            'processing': 'İşleniyor',
            'completed': 'Tamamlandı',
            'error': 'Hata'
        };
        return texts[status] || 'Bilinmiyor';
    }

    // Get status CSS class
    getStatusClass(status) {
        const classes = {
            'processing': 'bg-yellow-100 text-yellow-800',
            'completed': 'bg-green-100 text-green-800',
            'error': 'bg-red-100 text-red-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // View document in modal
    viewDocument(documentId) {
        const document = this.findDocumentById(documentId);
        if (!document) {
            this.showToast('Belge bulunamadı', 'error');
            return;
        }

        this.showDocumentModal(document);
    }

    // Download document
    downloadDocument(documentId) {
        const doc = this.findDocumentById(documentId);
        if (!doc) {
            this.showToast('Belge bulunamadı', 'error');
            return;
        }

        // Create download link
        const link = window.document.createElement('a');
        const content = doc.data || doc.content;
        
        // For HTML content, create a blob
        if (doc.mimeType === 'text/html' || doc.type === 'promissory_note') {
            const blob = new Blob([content], { type: 'text/html' });
            link.href = URL.createObjectURL(blob);
        } else {
            link.href = content;
        }
        
        link.download = doc.originalName || doc.fileName;
        link.click();
        
        // Clean up blob URL if created
        if (link.href.startsWith('blob:')) {
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
        }
    }

    // Find document by ID
    findDocumentById(documentId) {
        for (const patientId in this.documents) {
            const document = this.documents[patientId].find(doc => doc.id === documentId);
            if (document) return document;
        }
        return null;
    }

    // Show document modal
    showDocumentModal(doc) {
        const modalHTML = `
            <div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onclick="this.remove()">
                <div class="modal-container bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full m-4" onclick="event.stopPropagation()">
                    <div class="modal-header border-b p-6">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold">
                                ${this.getDocumentTypeIcon(doc.type)} ${this.getDocumentTypeText(doc.type)}
                            </h3>
                            <button onclick="this.closest('.modal-overlay').remove()" class="text-gray-400 hover:text-gray-600">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="modal-body p-6 max-h-[70vh] overflow-y-auto">
                        ${doc.data || doc.content ? `
                            <div class="mb-4">
                                <h4 class="font-medium mb-2">Belge:</h4>
                                ${doc.mimeType && doc.mimeType.startsWith('image/') ? 
                                    `<img src="${doc.data || doc.content}" alt="Document" class="max-w-full h-auto border rounded">` :
                                    `<div class="prose max-w-none">${doc.data || doc.content}</div>`
                                }
                            </div>
                        ` : ''}
                        
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div><strong>Dosya Adı:</strong> ${doc.originalName || doc.fileName}</div>
                            <div><strong>Boyut:</strong> ${this.formatFileSize(doc.size)}</div>
                            <div><strong>Tür:</strong> ${this.getDocumentTypeText(doc.type)}</div>
                            <div><strong>Yüklenme:</strong> ${new Date(doc.uploadedAt || doc.createdAt).toLocaleString('tr-TR')}</div>
                        </div>
                    </div>
                    <div class="modal-footer border-t p-6">
                        <div class="flex justify-end space-x-3">
                            <button onclick="window.documentManagement.downloadDocument('${doc.id}')" class="btn-secondary">
                                💾 İndir
                            </button>
                            <button onclick="this.closest('.modal-overlay').remove()" class="btn-primary">
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        window.document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Open upload modal for specific document type
    openUploadModal(patientId, documentType) {
        const modalHTML = `
            <div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onclick="this.remove()">
                <div class="modal-container bg-white rounded-lg shadow-xl max-w-md w-full m-4" onclick="event.stopPropagation()">
                    <div class="modal-header border-b p-6">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold">
                                ${this.getDocumentTypeIcon(documentType)} ${this.getDocumentTypeText(documentType)} Yükle
                            </h3>
                            <button onclick="this.closest('.modal-overlay').remove()" class="text-gray-400 hover:text-gray-600">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="modal-body p-6">
                        <div class="document-drop-zone border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
                             data-document-type="${documentType}" data-patient-id="${patientId}">
                            <div class="text-gray-500 mb-4">
                                <svg class="mx-auto h-16 w-16" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                            </div>
                            <p class="text-gray-600 mb-4">Dosyaları buraya sürükleyin veya seçin</p>
                            <input type="file" class="hidden" multiple accept=".jpg,.jpeg,.png,.pdf,.webp" 
                                   data-document-type="${documentType}" data-patient-id="${patientId}" id="modal-upload-${documentType}-${patientId}">
                            <label for="modal-upload-${documentType}-${patientId}" class="btn-primary cursor-pointer">
                                Dosya Seç
                            </label>
                        </div>
                        <p class="text-xs text-gray-500 mt-4 text-center">
                            Desteklenen formatlar: JPG, PNG, WebP, PDF (Maksimum 10MB)
                        </p>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Filter documents by type
    filterDocuments(patientId, filterType) {
        const documents = this.getPatientDocuments(patientId);
        const container = document.querySelector(`[data-document-list="${patientId}"]`);
        if (!container) return;

        let filteredDocuments = documents;
        if (filterType !== 'all') {
            filteredDocuments = documents.filter(doc => doc.type === filterType);
        }

        container.innerHTML = filteredDocuments.length === 0 ? `
            <div class="text-center py-8 text-gray-500">
                <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p>Bu kategoride belge bulunamadı</p>
            </div>
        ` : filteredDocuments.map(doc => this.renderDocumentItemHTML(doc)).join('');
    }

    // Show toast notification
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white transition-all duration-300 transform translate-x-full`;
        
        // Set background color based on type
        switch (type) {
            case 'success':
                toast.className += ' bg-green-500';
                break;
            case 'error':
                toast.className += ' bg-red-500';
                break;
            case 'warning':
                toast.className += ' bg-yellow-500';
                break;
            default:
                toast.className += ' bg-blue-500';
        }
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Global helper functions
window.openDocumentUploadModal = function(patientId, documentType) {
    if (window.documentManagement) {
        window.documentManagement.openUploadModal(patientId, documentType);
    }
};

window.filterDocuments = function(patientId, filterType) {
    if (window.documentManagement) {
        window.documentManagement.filterDocuments(patientId, filterType);
    }
};

window.viewDocument = function(documentId) {
    if (window.documentManagement) {
        window.documentManagement.viewDocument(documentId);
    }
};

window.downloadDocument = function(documentId) {
    if (window.documentManagement) {
        window.documentManagement.downloadDocument(documentId);
    }
};

window.deleteDocument = function(documentId) {
    if (window.documentManagement) {
        window.documentManagement.deleteDocument(documentId);
    }
};