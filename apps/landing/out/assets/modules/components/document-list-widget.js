// Document List Widget - Reusable component for displaying and managing uploaded documents
// Handles viewing, downloading, and deleting documents

class DocumentListWidget {
  constructor(options = {}) {
    this.options = {
      containerId: options.containerId || 'document-list-container',
      patientId: options.patientId || null,
      documents: options.documents || [],
      onDocumentView: options.onDocumentView || null,
      onDocumentDownload: options.onDocumentDownload || null,
      onDocumentDelete: options.onDocumentDelete || null,
      showUploadSection: options.showUploadSection !== false, // Default true
      showFilters: options.showFilters !== false, // Default true
      ...options
    };

    this.currentFilter = 'all';
    this.init();
  }

  init() {
    this.setupContainer();
    this.render();
    this.setupEventListeners();
  }

  setupContainer() {
    const container = document.getElementById(this.options.containerId);
    if (!container) {
      console.error(`Container with id "${this.options.containerId}" not found`);
      return;
    }
    // Container will be populated by render()
  }

  render() {
    const container = document.getElementById(this.options.containerId);
    if (!container) return;

    const filteredDocuments = this.filterDocuments(this.options.documents, this.currentFilter);

    container.innerHTML = `
      <div class="document-list-widget bg-white rounded-lg shadow-sm border">
        ${this.options.showUploadSection ? this.renderUploadSection() : ''}

        <!-- Documents List Header -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">
              📄 Yüklenen Belgeler (${this.options.documents.length})
            </h3>

            ${this.options.showFilters ? `
              <div class="flex items-center space-x-4">
                <select id="document-filter-${this.options.containerId}"
                        class="form-select text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onchange="this.closest('.document-list-widget').querySelector('.document-list-widget-instance').filterDocuments(this.value)">
                  <option value="all">Tüm Belgeler</option>
                  <option value="medical">Tıbbi Belgeler</option>
                  <option value="general">Genel Belgeler</option>
                  <option value="prescription">Reçeteler</option>
                  <option value="audiometry">Audiometri</option>
                  <option value="warranty">Garanti</option>
                  <option value="invoice">Faturalar</option>
                  <option value="promissory_note">Senetler</option>
                </select>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Documents List -->
        <div class="p-6">
          <div class="documents-list space-y-4" data-document-list="${this.options.patientId || 'default'}">
            ${filteredDocuments.length === 0 ? this.renderEmptyState() : filteredDocuments.map(doc => this.renderDocumentItem(doc)).join('')}
          </div>
        </div>
      </div>
    `;

    // Store reference to this instance
    container.querySelector('.document-list-widget').documentListWidgetInstance = this;
  }

  renderUploadSection() {
    if (!this.options.patientId) return '';

    return `
      <!-- Document Upload Section -->
      <div class="p-6 border-b border-gray-200">
        <h4 class="text-md font-semibold text-gray-900 mb-4">Belge Yükleme</h4>

        <!-- Quick Upload Buttons -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <button onclick="this.closest('.document-list-widget').querySelector('.document-list-widget-instance').openUploadModal('prescription')"
                  class="flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition-colors text-sm">
            <i class="fas fa-prescription text-lg"></i>
            <span>Reçete</span>
          </button>

          <button onclick="this.closest('.document-list-widget').querySelector('.document-list-widget-instance').openUploadModal('audiometry')"
                  class="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-colors text-sm">
            <i class="fas fa-headphones text-lg"></i>
            <span>Audiometri</span>
          </button>

          <button onclick="this.closest('.document-list-widget').querySelector('.document-list-widget-instance').openUploadModal('medical')"
                  class="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border border-green-200 transition-colors text-sm">
            <i class="fas fa-stethoscope text-lg"></i>
            <span>Tıbbi</span>
          </button>

          <button onclick="this.closest('.document-list-widget').querySelector('.document-list-widget-instance').openUploadModal('invoice')"
                  class="flex items-center justify-center gap-2 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg border border-orange-200 transition-colors text-sm">
            <i class="fas fa-file-invoice text-lg"></i>
            <span>Fatura</span>
          </button>
        </div>

        <!-- Drag & Drop Upload Area -->
        <div class="document-drop-zone border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
             data-patient-id="${this.options.patientId}"
             onclick="this.querySelector('input').click()">
          <div class="text-gray-500 mb-2">
            <i class="fas fa-cloud-upload-alt text-3xl"></i>
          </div>
          <p class="text-sm text-gray-600 mb-2">Belge yüklemek için tıklayın veya sürükleyin</p>
          <p class="text-xs text-gray-500">Desteklenen formatlar: JPG, PNG, WebP, PDF (Maksimum 10MB)</p>
          <input type="file" class="hidden" multiple accept=".jpg,.jpeg,.png,.pdf,.webp"
                 onchange="this.closest('.document-list-widget').querySelector('.document-list-widget-instance').handleFileSelect(event)">
        </div>
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div class="text-center py-12 text-gray-500">
        <i class="fas fa-folder-open text-6xl text-gray-300 mb-4"></i>
        <h4 class="text-lg font-medium text-gray-900 mb-2">Henüz Belge Yok</h4>
        <p class="text-sm">Bu hasta için henüz belge yüklenmemiş</p>
        ${this.options.showUploadSection ? '<p class="text-sm mt-2">Yukarıdaki alanları kullanarak belge yükleyebilirsiniz</p>' : ''}
      </div>
    `;
  }

  renderDocumentItem(document) {
    const statusIcon = this.getStatusIcon(document.status);
    const statusText = this.getStatusText(document.status);
    const typeText = this.getDocumentTypeText(document.type);
    const typeIcon = this.getDocumentTypeIcon(document.type);

    return `
      <div class="document-item bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
           data-document-id="${document.id}" data-document-type="${document.type}">
        <div class="flex items-start justify-between">
          <div class="flex items-start space-x-3 flex-1">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-white rounded-lg border flex items-center justify-center">
                <i class="${typeIcon} text-lg text-gray-600"></i>
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2 mb-1">
                <h4 class="text-sm font-medium text-gray-900 truncate">${typeText}</h4>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${this.getStatusClass(document.status)}">
                  ${statusIcon} ${statusText}
                </span>
              </div>

              <p class="text-sm text-gray-600 mb-1">
                <i class="fas fa-file mr-1"></i>${document.originalName || document.fileName || 'İsimsiz dosya'}
              </p>

              <div class="flex items-center space-x-4 text-xs text-gray-500">
                <span><i class="fas fa-weight mr-1"></i>${this.formatFileSize(document.size || 0)}</span>
                <span><i class="fas fa-calendar mr-1"></i>${this.formatDate(document.uploadedAt || document.createdAt)}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-2 ml-4">
            <button onclick="this.closest('.document-item').querySelector('.document-list-widget-instance').viewDocument('${document.id}')"
                    class="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    title="Görüntüle">
              <i class="fas fa-eye mr-1"></i>
              <span class="hidden sm:inline">Görüntüle</span>
            </button>

            <button onclick="this.closest('.document-item').querySelector('.document-list-widget-instance').downloadDocument('${document.id}')"
                    class="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    title="İndir">
              <i class="fas fa-download mr-1"></i>
              <span class="hidden sm:inline">İndir</span>
            </button>

            <button onclick="this.closest('.document-item').querySelector('.document-list-widget-instance').deleteDocument('${document.id}')"
                    class="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
                    title="Sil">
              <i class="fas fa-trash mr-1"></i>
              <span class="hidden sm:inline">Sil</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Add instance reference to container for event handling
    const container = document.getElementById(this.options.containerId);
    if (container) {
      container.documentListWidgetInstance = this;
    }
  }

  filterDocuments(documents, filterType) {
    if (filterType === 'all') return documents;
    return documents.filter(doc => doc.type === filterType);
  }

  updateFilter(filterType) {
    this.currentFilter = filterType;
    this.render();
  }

  getDocumentTypeIcon(type) {
    const icons = {
      'prescription': 'fas fa-prescription',
      'audiometry': 'fas fa-headphones',
      'warranty': 'fas fa-shield-alt',
      'invoice': 'fas fa-file-invoice',
      'medical': 'fas fa-stethoscope',
      'general': 'fas fa-file',
      'promissory_note': 'fas fa-file-signature',
      'lab_result': 'fas fa-flask',
      'imaging': 'fas fa-x-ray',
      'report': 'fas fa-chart-line',
      'consent': 'fas fa-signature'
    };
    return icons[type] || 'fas fa-file';
  }

  getDocumentTypeText(type) {
    const types = {
      'prescription': 'Reçete',
      'audiometry': 'Audiometri',
      'warranty': 'Garanti',
      'invoice': 'Fatura',
      'medical': 'Tıbbi Belge',
      'general': 'Genel Belge',
      'promissory_note': 'Senet',
      'lab_result': 'Laboratuvar Sonucu',
      'imaging': 'Görüntüleme',
      'report': 'Rapor',
      'consent': 'Onam Formu'
    };
    return types[type] || 'Diğer Belge';
  }

  getStatusIcon(status) {
    const icons = {
      'processing': '⏳',
      'completed': '✅',
      'error': '❌'
    };
    return icons[status] || '❓';
  }

  getStatusText(status) {
    const texts = {
      'processing': 'İşleniyor',
      'completed': 'Tamamlandı',
      'error': 'Hata'
    };
    return texts[status] || 'Bilinmiyor';
  }

  getStatusClass(status) {
    const classes = {
      'processing': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'error': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatDate(dateString) {
    if (!dateString) return 'Tarih yok';
    try {
      return new Date(dateString).toLocaleDateString('tr-TR');
    } catch (e) {
      return 'Geçersiz tarih';
    }
  }

  viewDocument(documentId) {
    const document = this.findDocumentById(documentId);
    if (!document) {
      this.showNotification('Belge bulunamadı', 'error');
      return;
    }

    if (this.options.onDocumentView) {
      this.options.onDocumentView(document);
    } else {
      this.showDocumentModal(document);
    }
  }

  downloadDocument(documentId) {
    const document = this.findDocumentById(documentId);
    if (!document) {
      this.showNotification('Belge bulunamadı', 'error');
      return;
    }

    if (this.options.onDocumentDownload) {
      this.options.onDocumentDownload(document);
    } else {
      this.downloadDocumentFile(document);
    }
  }

  deleteDocument(documentId) {
    const document = this.findDocumentById(documentId);
    if (!document) {
      this.showNotification('Belge bulunamadı', 'error');
      return;
    }

    if (!confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) {
      return;
    }

    if (this.options.onDocumentDelete) {
      this.options.onDocumentDelete(document);
    } else {
      this.removeDocumentFromList(documentId);
      this.showNotification('Belge silindi', 'success');
    }
  }

  findDocumentById(documentId) {
    return this.options.documents.find(doc => doc.id === documentId);
  }

  showDocumentModal(document) {
    const modalHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
           onclick="this.remove()">
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between p-6 border-b">
            <div class="flex items-center space-x-3">
              <i class="${this.getDocumentTypeIcon(document.type)} text-2xl text-gray-600"></i>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">${this.getDocumentTypeText(document.type)}</h3>
                <p class="text-sm text-gray-600">${document.originalName || document.fileName}</p>
              </div>
            </div>
            <button onclick="this.closest('.fixed').remove()"
                    class="text-gray-400 hover:text-gray-600 transition-colors">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>

          <div class="p-6 max-h-[60vh] overflow-y-auto">
            ${this.renderDocumentContent(document)}
          </div>

          <div class="flex items-center justify-between p-6 border-t bg-gray-50">
            <div class="text-sm text-gray-600">
              <span class="font-medium">Boyut:</span> ${this.formatFileSize(document.size)} |
              <span class="font-medium">Tarih:</span> ${this.formatDate(document.uploadedAt || document.createdAt)}
            </div>

            <div class="flex space-x-3">
              <button onclick="this.closest('.fixed').querySelector('.document-list-widget-instance').downloadDocument('${document.id}')"
                      class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                <i class="fas fa-download mr-2"></i>İndir
              </button>
              <button onclick="this.closest('.fixed').remove()"
                      class="inline-flex items-center px-4 py-2 bg-blue-500 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-600 transition-colors">
                Kapat
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add instance reference for event handling
    const modal = document.body.lastElementChild;
    modal.querySelector('.fixed').documentListWidgetInstance = this;
  }

  renderDocumentContent(document) {
    const content = document.data || document.content;

    if (!content) {
      return '<div class="text-center text-gray-500 py-8"><i class="fas fa-file text-4xl mb-4"></i><p>Belge içeriği bulunamadı</p></div>';
    }

    if (document.mimeType && document.mimeType.startsWith('image/')) {
      return `<div class="text-center"><img src="${content}" alt="Document" class="max-w-full h-auto rounded-lg shadow-sm"></div>`;
    }

    if (document.mimeType === 'application/pdf' || document.originalName?.toLowerCase().endsWith('.pdf')) {
      return `
        <div class="text-center">
          <i class="fas fa-file-pdf text-6xl text-red-500 mb-4"></i>
          <p class="text-gray-600 mb-4">PDF dosyası - İndirmek için aşağıdaki butonu kullanın</p>
          <button onclick="this.closest('.fixed').querySelector('.document-list-widget-instance').downloadDocument('${document.id}')"
                  class="inline-flex items-center px-6 py-3 bg-red-500 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-600 transition-colors">
            <i class="fas fa-download mr-2"></i>PDF'yi İndir
          </button>
        </div>
      `;
    }

    // For HTML content or other text content
    if (document.mimeType === 'text/html' || document.type === 'promissory_note' || typeof content === 'string') {
      return `<div class="prose max-w-none bg-gray-50 p-4 rounded-lg border">${content}</div>`;
    }

    return '<div class="text-center text-gray-500 py-8"><i class="fas fa-file text-4xl mb-4"></i><p>Bu dosya türü görüntülenemez</p></div>';
  }

  downloadDocumentFile(document) {
    try {
      const link = document.createElement('a');
      const content = document.data || document.content;

      if (document.mimeType === 'text/html' || document.type === 'promissory_note') {
        const blob = new Blob([content], { type: 'text/html' });
        link.href = URL.createObjectURL(blob);
      } else {
        link.href = content;
      }

      link.download = document.originalName || document.fileName || 'document';
      link.click();

      // Clean up blob URL
      if (link.href.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
      }

      this.showNotification('Belge indiriliyor...', 'info');
    } catch (error) {
      console.error('Download error:', error);
      this.showNotification('Belge indirilirken hata oluştu', 'error');
    }
  }

  removeDocumentFromList(documentId) {
    // Remove from local documents array
    this.options.documents = this.options.documents.filter(doc => doc.id !== documentId);

    // Re-render the list
    this.render();
  }

  openUploadModal(documentType) {
    // This would typically open an upload modal
    // For now, just show a notification
    this.showNotification(`${this.getDocumentTypeText(documentType)} yükleme modalı açılacak`, 'info');
  }

  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // This would typically handle file upload
    // For now, just show a notification
    this.showNotification(`${files.length} dosya seçildi. Yükleme işlemi başlatılacak.`, 'info');

    // Clear the input
    event.target.value = '';
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white transition-all duration-300 transform translate-x-full max-w-sm`;

    // Set background color based on type
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };

    notification.className += ` ${colors[type] || colors.info}`;
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'info' ? 'info-circle' : 'exclamation-triangle'}"></i>
        <span class="text-sm font-medium">${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);

    // Remove after 4 seconds
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  // Public methods for external use
  updateDocuments(documents) {
    this.options.documents = documents;
    this.render();
  }

  addDocument(document) {
    this.options.documents.unshift(document);
    this.render();
  }

  removeDocument(documentId) {
    this.removeDocumentFromList(documentId);
  }
}

// Export for use in other modules
window.DocumentListWidget = DocumentListWidget;