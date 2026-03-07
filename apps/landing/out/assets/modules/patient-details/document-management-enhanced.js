/**
 * Document Management Enhanced Features
 * Advanced features for document management:
 * - Document filtering by type
 * - Quick upload buttons for specific document types
 * - Upload modal with drag & drop
 * - Document type categorization
 */

class DocumentManagementEnhanced {
    constructor() {
        // Access API client through window object to avoid conflicts
        this.api = window.api;
        this.documentTypes = {
            'general': { icon: '📄', label: 'Genel Belge', color: 'blue' },
            'medical': { icon: '⚕️', label: 'Tıbbi Belge', color: 'green' },
            'prescription': { icon: '📋', label: 'Reçete', color: 'purple' },
            'audiometry': { icon: '🎧', label: 'Audiometri', color: 'indigo' },
            'lab_result': { icon: '🔬', label: 'Laboratuvar Sonucu', color: 'pink' },
            'imaging': { icon: '📷', label: 'Görüntüleme', color: 'yellow' },
            'report': { icon: '📊', label: 'Rapor', color: 'red' },
            'consent': { icon: '✍️', label: 'Onam Formu', color: 'teal' },
            'invoice': { icon: '💰', label: 'Fatura', color: 'orange' },
            'promissory_note': { icon: '📝', label: 'Senet', color: 'gray' }
        };

        this.currentFilter = 'all';
        this.currentPatientId = null;
    }

    /**
     * Render enhanced document controls
     */
    renderEnhancedControls(patientId) {
        this.currentPatientId = patientId;
        
        return `
            <div class="document-enhanced-controls mb-6">
                <!-- Quick Action Buttons -->
                <div class="bg-white rounded-lg shadow-sm border p-4 mb-4">
                    <h3 class="text-sm font-semibold text-gray-700 mb-3">Hızlı Belge Ekleme</h3>
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
                        ${this.renderQuickUploadButtons(patientId)}
                    </div>
                </div>

                <!-- Document Filter -->
                <div class="bg-white rounded-lg shadow-sm border p-4">
                    <div class="flex flex-wrap items-center gap-4">
                        <label class="text-sm font-semibold text-gray-700">Belge Türü Filtrele:</label>
                        <select id="document-type-filter" 
                                class="form-select rounded-lg border-gray-300 text-sm flex-1 max-w-xs"
                                onchange="window.documentManagementEnhanced.filterDocuments(this.value)">
                            <option value="all">Tüm Belgeler</option>
                            ${Object.entries(this.documentTypes).map(([type, config]) => `
                                <option value="${type}">${config.icon} ${config.label}</option>
                            `).join('')}
                        </select>
                        
                        <button onclick="window.documentManagementEnhanced.openBulkUploadModal('${patientId}')"
                                class="btn-primary text-sm">
                            <i class="fas fa-cloud-upload-alt mr-2"></i>Toplu Yükleme
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render quick upload buttons for common document types
     */
    renderQuickUploadButtons(patientId) {
        const quickTypes = ['prescription', 'audiometry', 'lab_result', 'imaging', 'report'];
        
        return quickTypes.map(type => {
            const config = this.documentTypes[type];
            return `
                <button onclick="window.documentManagementEnhanced.openUploadModal('${patientId}', '${type}')"
                        class="flex items-center justify-center gap-2 px-3 py-2 bg-${config.color}-50 hover:bg-${config.color}-100 
                               text-${config.color}-700 rounded-lg border border-${config.color}-200 transition-colors text-sm">
                    <span class="text-lg">${config.icon}</span>
                    <span class="hidden sm:inline">${config.label}</span>
                </button>
            `;
        }).join('');
    }

    /**
     * Filter documents by type
     */
    filterDocuments(type) {
        this.currentFilter = type;
        const allDocCards = document.querySelectorAll('[data-document-type]');
        
        allDocCards.forEach(card => {
            const docType = card.getAttribute('data-document-type');
            if (type === 'all' || docType === type) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });

        // Update count
        const visibleCount = document.querySelectorAll('[data-document-type]:not(.hidden)').length;
        const filterLabel = type === 'all' ? 'Tüm Belgeler' : this.documentTypes[type].label;
        
        this.showToast(`${visibleCount} ${filterLabel} gösteriliyor`, 'info');
    }

    /**
     * Open upload modal for specific document type
     */
    openUploadModal(patientId, documentType = 'general') {
        const config = this.documentTypes[documentType];
        
        const modalHTML = `
            <div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" 
                 id="upload-modal" onclick="if(event.target.id === 'upload-modal') this.remove()">
                <div class="modal-container bg-white rounded-lg shadow-xl max-w-2xl w-full m-4" onclick="event.stopPropagation()">
                    <div class="modal-header bg-${config.color}-600 text-white p-6 rounded-t-lg">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold flex items-center gap-2">
                                <span class="text-2xl">${config.icon}</span>
                                <span>${config.label} Yükle</span>
                            </h3>
                            <button onclick="document.getElementById('upload-modal').remove()" 
                                    class="text-white hover:text-gray-200">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="modal-body p-6">
                        <!-- Drag & Drop Zone -->
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4
                                    hover:border-${config.color}-400 transition-colors cursor-pointer"
                             id="drop-zone"
                             ondragover="event.preventDefault(); this.classList.add('border-${config.color}-500', 'bg-${config.color}-50')"
                             ondragleave="this.classList.remove('border-${config.color}-500', 'bg-${config.color}-50')"
                             ondrop="window.documentManagementEnhanced.handleFileDrop(event, '${patientId}', '${documentType}')"
                             onclick="document.getElementById('file-input').click()">
                            
                            <i class="fas fa-cloud-upload-alt text-6xl text-gray-400 mb-4"></i>
                            <p class="text-lg text-gray-700 font-medium mb-2">Dosyaları buraya sürükleyin</p>
                            <p class="text-sm text-gray-500 mb-4">veya tıklayarak dosya seçin</p>
                            <p class="text-xs text-gray-400">Desteklenen formatlar: JPG, PNG, PDF, WebP (Max: 10MB)</p>
                            
                            <input type="file" 
                                   id="file-input" 
                                   class="hidden" 
                                   multiple 
                                   accept=".jpg,.jpeg,.png,.pdf,.webp"
                                   onchange="window.documentManagementEnhanced.handleFileSelect(event, '${patientId}', '${documentType}')">
                        </div>

                        <!-- File Preview Area -->
                        <div id="file-preview" class="hidden">
                            <h4 class="font-semibold text-gray-700 mb-2">Seçilen Dosyalar:</h4>
                            <div id="file-list" class="space-y-2"></div>
                        </div>

                        <!-- Document Description -->
                        <div class="mt-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Belge Açıklaması (Opsiyonel)
                            </label>
                            <textarea id="document-description" 
                                      rows="3" 
                                      class="form-textarea w-full rounded-lg border-gray-300"
                                      placeholder="Bu belge hakkında notlar ekleyebilirsiniz..."></textarea>
                        </div>
                    </div>
                    
                    <div class="modal-footer border-t p-6 flex justify-end gap-3">
                        <button onclick="document.getElementById('upload-modal').remove()" 
                                class="btn-secondary">
                            İptal
                        </button>
                        <button onclick="window.documentManagementEnhanced.uploadFiles('${patientId}', '${documentType}')" 
                                class="btn-primary">
                            <i class="fas fa-upload mr-2"></i>Yükle
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Open bulk upload modal for multiple document types
     */
    openBulkUploadModal(patientId) {
        const modalHTML = `
            <div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" 
                 id="bulk-upload-modal" onclick="if(event.target.id === 'bulk-upload-modal') this.remove()">
                <div class="modal-container bg-white rounded-lg shadow-xl max-w-3xl w-full m-4" onclick="event.stopPropagation()">
                    <div class="modal-header bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold flex items-center gap-2">
                                <i class="fas fa-cloud-upload-alt text-2xl"></i>
                                <span>Toplu Belge Yükleme</span>
                            </h3>
                            <button onclick="document.getElementById('bulk-upload-modal').remove()" 
                                    class="text-white hover:text-gray-200">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="modal-body p-6">
                        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                            <p class="text-sm text-blue-700">
                                <i class="fas fa-info-circle mr-2"></i>
                                Her dosya için ayrı ayrı tür seçebilir ve açıklama ekleyebilirsiniz.
                            </p>
                        </div>

                        <!-- Bulk Upload Zone -->
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4
                                    hover:border-blue-400 transition-colors cursor-pointer"
                             onclick="document.getElementById('bulk-file-input').click()">
                            
                            <i class="fas fa-folder-open text-6xl text-gray-400 mb-4"></i>
                            <p class="text-lg text-gray-700 font-medium mb-2">Birden fazla dosya seçin</p>
                            <p class="text-sm text-gray-500 mb-4">Tüm belgeleri tek seferde yükleyin</p>
                            
                            <input type="file" 
                                   id="bulk-file-input" 
                                   class="hidden" 
                                   multiple 
                                   accept=".jpg,.jpeg,.png,.pdf,.webp"
                                   onchange="window.documentManagementEnhanced.handleBulkFileSelect(event, '${patientId}')">
                        </div>

                        <!-- Bulk File List -->
                        <div id="bulk-file-list" class="space-y-3 max-h-96 overflow-y-auto"></div>
                    </div>
                    
                    <div class="modal-footer border-t p-6 flex justify-between items-center">
                        <div class="text-sm text-gray-600">
                            <span id="bulk-file-count">0</span> dosya seçildi
                        </div>
                        <div class="flex gap-3">
                            <button onclick="document.getElementById('bulk-upload-modal').remove()" 
                                    class="btn-secondary">
                                İptal
                            </button>
                            <button onclick="window.documentManagementEnhanced.uploadBulkFiles('${patientId}')" 
                                    class="btn-primary">
                                <i class="fas fa-upload mr-2"></i>Tümünü Yükle
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Handle file selection
     */
    handleFileSelect(event, patientId, documentType) {
        const files = Array.from(event.target.files);
        this.displayFilePreview(files);
    }

    /**
     * Handle file drop
     */
    handleFileDrop(event, patientId, documentType) {
        event.preventDefault();
        const dropZone = event.currentTarget;
        dropZone.classList.remove('border-gray-500', 'bg-gray-50');
        
        const files = Array.from(event.dataTransfer.files);
        this.displayFilePreview(files);
        
        // Set files to input
        const fileInput = document.getElementById('file-input');
        fileInput.files = event.dataTransfer.files;
    }

    /**
     * Display file preview
     */
    displayFilePreview(files) {
        const previewContainer = document.getElementById('file-preview');
        const fileList = document.getElementById('file-list');
        
        if (files.length === 0) {
            previewContainer.classList.add('hidden');
            return;
        }

        previewContainer.classList.remove('hidden');
        fileList.innerHTML = files.map((file, index) => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div class="flex items-center gap-3">
                    <i class="fas fa-file text-2xl text-blue-500"></i>
                    <div>
                        <p class="font-medium text-sm">${file.name}</p>
                        <p class="text-xs text-gray-500">${this.formatFileSize(file.size)}</p>
                    </div>
                </div>
                <span class="text-green-600">
                    <i class="fas fa-check-circle"></i>
                </span>
            </div>
        `).join('');
    }

    /**
     * Handle bulk file selection
     */
    handleBulkFileSelect(event, patientId) {
        const files = Array.from(event.target.files);
        const fileList = document.getElementById('bulk-file-list');
        const fileCount = document.getElementById('bulk-file-count');
        
        fileCount.textContent = files.length;
        
        fileList.innerHTML = files.map((file, index) => `
            <div class="p-4 bg-gray-50 rounded-lg border" data-file-index="${index}">
                <div class="flex items-start gap-3">
                    <i class="fas fa-file text-3xl text-blue-500 mt-1"></i>
                    <div class="flex-1">
                        <p class="font-medium text-sm mb-2">${file.name}</p>
                        <p class="text-xs text-gray-500 mb-3">${this.formatFileSize(file.size)}</p>
                        
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-gray-700 mb-1">Belge Türü</label>
                                <select class="form-select w-full text-xs rounded border-gray-300" data-file-type="${index}">
                                    ${Object.entries(this.documentTypes).map(([type, config]) => `
                                        <option value="${type}">${config.icon} ${config.label}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-700 mb-1">Açıklama</label>
                                <input type="text" 
                                       class="form-input w-full text-xs rounded border-gray-300" 
                                       placeholder="Opsiyonel..."
                                       data-file-desc="${index}">
                            </div>
                        </div>
                    </div>
                    <button onclick="this.closest('[data-file-index]').remove(); window.documentManagementEnhanced.updateBulkFileCount()"
                            class="text-red-500 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update bulk file count
     */
    updateBulkFileCount() {
        const count = document.querySelectorAll('#bulk-file-list [data-file-index]').length;
        document.getElementById('bulk-file-count').textContent = count;
    }

    /**
     * Upload files
     */
    async uploadFiles(patientId, documentType) {
        const fileInput = document.getElementById('file-input');
        const description = document.getElementById('document-description').value;
        
        if (!fileInput.files.length) {
            this.showToast('Lütfen en az bir dosya seçin', 'error');
            return;
        }

        const formData = new FormData();
        Array.from(fileInput.files).forEach(file => {
            formData.append('files', file);
        });
        formData.append('documentType', documentType);
        formData.append('description', description);

        try {
            this.showToast('Dosyalar yükleniyor...', 'info');
            
            const response = await createPatientDocument(id, documentData);

            if (response.ok) {
                this.showToast('Belgeler başarıyla yüklendi', 'success');
                document.getElementById('upload-modal').remove();
                
                // Reload documents
                if (window.documentManagement) {
                    window.location.reload();
                }
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('Yükleme sırasında hata oluştu', 'error');
        }
    }

    /**
     * Upload bulk files
     */
    async uploadBulkFiles(patientId) {
        const fileInput = document.getElementById('bulk-file-input');
        const files = Array.from(fileInput.files);
        
        if (files.length === 0) {
            this.showToast('Lütfen dosya seçin', 'error');
            return;
        }

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const typeSelect = document.querySelector(`[data-file-type="${i}"]`);
            const descInput = document.querySelector(`[data-file-desc="${i}"]`);
            
            if (!typeSelect) continue;

            const formData = new FormData();
            formData.append('files', file);
            formData.append('documentType', typeSelect.value);
            formData.append('description', descInput ? descInput.value : '');

            try {
                const response = await createPatientDocument(id, documentData);

                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                console.error('Upload error:', error);
                failCount++;
            }
        }

        document.getElementById('bulk-upload-modal').remove();
        this.showToast(`${successCount} belge yüklendi${failCount > 0 ? `, ${failCount} hata` : ''}`, 'success');
        
        // Reload documents
        if (window.documentManagement) {
            window.location.reload();
        }
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const bgColors = {
            'success': 'bg-green-500',
            'error': 'bg-red-500',
            'info': 'bg-blue-500',
            'warning': 'bg-yellow-500'
        };

        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 ${bgColors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize and expose globally
window.documentManagementEnhanced = new DocumentManagementEnhanced();
