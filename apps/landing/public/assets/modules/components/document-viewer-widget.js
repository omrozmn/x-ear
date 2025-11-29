// Document Viewer Widget - Reusable modal component for viewing documents
// Provides a clean, focused interface for document viewing

class DocumentViewerWidget {
  constructor(options = {}) {
    this.options = {
      showDownloadButton: options.showDownloadButton !== false, // Default true
      showCloseButton: options.showCloseButton !== false, // Default true
      allowFullscreen: options.allowFullscreen !== false, // Default true
      onDownload: options.onDownload || null,
      onClose: options.onClose || null,
      ...options
    };

    this.currentDocument = null;
    this.isFullscreen = false;
  }

  /**
   * Show document in viewer modal
   */
  show(document) {
    this.currentDocument = document;
    this.renderModal();
    this.attachEventListeners();
  }

  /**
   * Hide the viewer modal
   */
  hide() {
    const modal = document.querySelector('.document-viewer-modal');
    if (modal) {
      modal.remove();
    }

    if (this.options.onClose) {
      this.options.onClose(this.currentDocument);
    }

    this.currentDocument = null;
    this.isFullscreen = false;
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    const modal = document.querySelector('.document-viewer-modal');
    if (!modal) return;

    this.isFullscreen = !this.isFullscreen;

    if (this.isFullscreen) {
      modal.classList.add('fullscreen');
      modal.querySelector('.modal-container').classList.add('max-w-none', 'w-screen', 'h-screen', 'rounded-none');
      modal.querySelector('.modal-body').classList.add('h-full');
    } else {
      modal.classList.remove('fullscreen');
      modal.querySelector('.modal-container').classList.remove('max-w-none', 'w-screen', 'h-screen', 'rounded-none');
      modal.querySelector('.modal-body').classList.remove('h-full');
    }

    // Update fullscreen button icon
    const fullscreenBtn = modal.querySelector('.fullscreen-btn i');
    if (fullscreenBtn) {
      fullscreenBtn.className = this.isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
    }
  }

  /**
   * Download the current document
   */
  download() {
    if (this.options.onDownload) {
      this.options.onDownload(this.currentDocument);
    } else {
      this.downloadDocument();
    }
  }

  /**
   * Render the viewer modal
   */
  renderModal() {
    const modalHTML = `
      <div class="document-viewer-modal fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
        <div class="modal-container bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <!-- Modal Header -->
          <div class="modal-header flex items-center justify-between p-4 border-b bg-gray-50">
            <div class="flex items-center space-x-3">
              <i class="${this.getDocumentTypeIcon(this.currentDocument.type)} text-2xl text-blue-600"></i>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">${this.getDocumentTypeText(this.currentDocument.type)}</h3>
                <p class="text-sm text-gray-600 truncate max-w-md">${this.currentDocument.originalName || this.currentDocument.fileName || 'İsimsiz dosya'}</p>
              </div>
            </div>

            <div class="flex items-center space-x-2">
              ${this.options.allowFullscreen ? `
                <button class="fullscreen-btn p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        title="${this.isFullscreen ? 'Küçült' : 'Tam Ekran'}">
                  <i class="fas fa-expand"></i>
                </button>
              ` : ''}

              ${this.options.showDownloadButton ? `
                <button class="download-btn p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        title="İndir">
                  <i class="fas fa-download"></i>
                </button>
              ` : ''}

              ${this.options.showCloseButton ? `
                <button class="close-btn p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        title="Kapat">
                  <i class="fas fa-times"></i>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Modal Body -->
          <div class="modal-body p-0 max-h-[70vh] overflow-y-auto bg-gray-100">
            ${this.renderDocumentContent()}
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer flex items-center justify-between p-4 border-t bg-gray-50">
            <div class="text-sm text-gray-600">
              <div class="flex items-center space-x-4">
                <span><i class="fas fa-weight-hanging mr-1"></i>${this.formatFileSize(this.currentDocument.size || 0)}</span>
                <span><i class="fas fa-calendar mr-1"></i>${this.formatDate(this.currentDocument.uploadedAt || this.currentDocument.createdAt)}</span>
                <span><i class="fas fa-tag mr-1"></i>${this.getStatusText(this.currentDocument.status)}</span>
              </div>
            </div>

            <div class="flex space-x-3">
              ${this.options.showDownloadButton ? `
                <button class="download-btn-secondary inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                  <i class="fas fa-download mr-2"></i>İndir
                </button>
              ` : ''}

              <button class="close-btn-secondary inline-flex items-center px-4 py-2 bg-blue-500 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-600 transition-colors">
                <i class="fas fa-times mr-2"></i>Kapat
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if present
    const existingModal = document.querySelector('.document-viewer-modal');
    if (existingModal) {
      existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  /**
   * Render document content based on type
   */
  renderDocumentContent() {
    const content = this.currentDocument.data || this.currentDocument.content;

    if (!content) {
      return this.renderEmptyContent();
    }

    if (this.currentDocument.mimeType && this.currentDocument.mimeType.startsWith('image/')) {
      return this.renderImageContent(content);
    }

    if (this.currentDocument.mimeType === 'application/pdf' ||
        this.currentDocument.originalName?.toLowerCase().endsWith('.pdf')) {
      return this.renderPdfContent();
    }

    if (this.currentDocument.mimeType === 'text/html' ||
        this.currentDocument.type === 'promissory_note' ||
        typeof content === 'string') {
      return this.renderTextContent(content);
    }

    return this.renderUnsupportedContent();
  }

  /**
   * Render image content
   */
  renderImageContent(content) {
    return `
      <div class="flex items-center justify-center min-h-[400px] p-8">
        <div class="text-center">
          <img src="${content}" alt="Document"
               class="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg cursor-zoom-in"
               onclick="this.classList.toggle('cursor-zoom-out'); this.classList.toggle('max-h-screen')">
          <p class="text-sm text-gray-500 mt-4">Tıklayarak yakınlaştırın/uzaklaştırın</p>
        </div>
      </div>
    `;
  }

  /**
   * Render PDF content
   */
  renderPdfContent() {
    return `
      <div class="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div class="text-center mb-6">
          <i class="fas fa-file-pdf text-6xl text-red-500 mb-4"></i>
          <h4 class="text-xl font-semibold text-gray-900 mb-2">PDF Belgesi</h4>
          <p class="text-gray-600 mb-6">Bu PDF dosyası doğrudan tarayıcıda görüntülenemez.</p>
        </div>

        <div class="flex space-x-4">
          <button class="download-btn-pdf inline-flex items-center px-6 py-3 bg-red-500 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-red-600 transition-colors shadow-lg">
            <i class="fas fa-download mr-2"></i>PDF'yi İndir ve Görüntüle
          </button>

          <button class="print-btn inline-flex items-center px-6 py-3 bg-blue-500 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-600 transition-colors shadow-lg">
            <i class="fas fa-print mr-2"></i>Yazdır
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render text/HTML content
   */
  renderTextContent(content) {
    return `
      <div class="p-8">
        <div class="bg-white rounded-lg shadow-sm border p-6 max-w-none">
          <div class="prose prose-sm max-w-none">
            ${content}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render empty content placeholder
   */
  renderEmptyContent() {
    return `
      <div class="flex items-center justify-center min-h-[400px] p-8">
        <div class="text-center">
          <i class="fas fa-file-excel text-6xl text-gray-300 mb-4"></i>
          <h4 class="text-xl font-semibold text-gray-900 mb-2">İçerik Bulunamadı</h4>
          <p class="text-gray-600">Bu belgenin içeriği yüklenemedi veya mevcut değil.</p>
        </div>
      </div>
    `;
  }

  /**
   * Render unsupported content placeholder
   */
  renderUnsupportedContent() {
    return `
      <div class="flex items-center justify-center min-h-[400px] p-8">
        <div class="text-center">
          <i class="fas fa-file text-6xl text-gray-300 mb-4"></i>
          <h4 class="text-xl font-semibold text-gray-900 mb-2">Desteklenmeyen Dosya Türü</h4>
          <p class="text-gray-600 mb-4">Bu dosya türü doğrudan görüntülenemez.</p>
          <p class="text-sm text-gray-500">Dosyayı indirmek için aşağıdaki butonu kullanın.</p>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to modal elements
   */
  attachEventListeners() {
    const modal = document.querySelector('.document-viewer-modal');
    if (!modal) return;

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hide();
      }
    });

    // Close buttons
    modal.querySelectorAll('.close-btn, .close-btn-secondary').forEach(btn => {
      btn.addEventListener('click', () => this.hide());
    });

    // Download buttons
    modal.querySelectorAll('.download-btn, .download-btn-secondary, .download-btn-pdf').forEach(btn => {
      btn.addEventListener('click', () => this.download());
    });

    // Fullscreen button
    const fullscreenBtn = modal.querySelector('.fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    // Print button
    const printBtn = modal.querySelector('.print-btn');
    if (printBtn) {
      printBtn.addEventListener('click', () => this.printDocument());
    }

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal) {
        this.hide();
      }
    });
  }

  /**
   * Download document file
   */
  downloadDocument() {
    try {
      const link = document.createElement('a');
      const content = this.currentDocument.data || this.currentDocument.content;

      if (this.currentDocument.mimeType === 'text/html' || this.currentDocument.type === 'promissory_note') {
        const blob = new Blob([content], { type: 'text/html' });
        link.href = URL.createObjectURL(blob);
      } else {
        link.href = content;
      }

      link.download = this.currentDocument.originalName || this.currentDocument.fileName || 'document';
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

  /**
   * Print document
   */
  printDocument() {
    if (this.currentDocument.mimeType === 'application/pdf' ||
        this.currentDocument.originalName?.toLowerCase().endsWith('.pdf')) {
      // For PDFs, download and let user print
      this.downloadDocument();
      this.showNotification('PDF indirildi. Lütfen PDF viewer ile yazdırın.', 'info');
    } else {
      // For other content, try to print the modal content
      const printWindow = window.open('', '_blank');
      const content = this.renderDocumentContent();

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${this.currentDocument.originalName || 'Belge'}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .no-print { display: none; }
              img { max-width: 100%; height: auto; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="no-print" style="text-align: center; margin-bottom: 20px;">
              <button onclick="window.print()">Yazdır</button>
              <button onclick="window.close()">Kapat</button>
            </div>
            ${content}
          </body>
        </html>
      `);

      printWindow.document.close();
    }
  }

  /**
   * Utility methods
   */
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

  getStatusText(status) {
    const texts = {
      'processing': 'İşleniyor',
      'completed': 'Tamamlandı',
      'error': 'Hata'
    };
    return texts[status] || 'Bilinmiyor';
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
      return new Date(dateString).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Geçersiz tarih';
    }
  }

  showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white transition-all duration-300 transform translate-x-full max-w-sm`;

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

    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);

    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }
}

// Export for global use
window.DocumentViewerWidget = DocumentViewerWidget;

// Compatibility alias for simpler API (legacy code expects window.DocumentViewer)
if (typeof window !== 'undefined') {
    window.DocumentViewer = window.DocumentViewer || new DocumentViewerWidget();
}