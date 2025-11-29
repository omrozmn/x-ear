import { EFaturaDataService } from './domain/efatura/data-service.js';

class InvoicesManager {
  constructor() {
    this.dataService = new EFaturaDataService();
    this.currentFilters = {};
    this.selectedInvoices = new Set();
    this.currentPage = 1;
    this.pageSize = 20;
    this.currentInvoice = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadInvoices();
    this.updateStatistics();
    this.initializeFilters();
  }

  setupEventListeners() {
    // Search and filters
    document.getElementById('searchInput').addEventListener('input', 
      this.debounce(() => this.applyFilters(), 300));
    document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
    document.getElementById('paymentMethodFilter').addEventListener('change', () => this.applyFilters());
    document.getElementById('dateFromFilter').addEventListener('change', () => this.applyFilters());
    document.getElementById('dateToFilter').addEventListener('change', () => this.applyFilters());
    document.getElementById('amountMinFilter').addEventListener('change', () => this.applyFilters());

    // Select all checkbox
    document.getElementById('selectAll').addEventListener('change', (e) => {
      this.toggleSelectAll(e.target.checked);
    });

    // Form submission and other events will be handled by individual functions
  }

  initializeFilters() {
    // Set default date filter to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    
    document.getElementById('dateFromFilter').value = this.formatDate(firstDay);
    document.getElementById('dateToFilter').value = this.formatDate(now);
  }

  async loadInvoices() {
    try {
      this.showLoading();
      
      const filters = this.buildFilters();
      const invoices = this.dataService.search(filters);
      
      this.renderInvoicesTable(invoices);
      this.updatePagination(invoices.length);
      
    } catch (error) {
      console.error('Faturalar yüklenirken hata oluştu:', error);
      this.showError('Faturalar yüklenirken hata oluştu');
    } finally {
      this.hideLoading();
    }
  }

  buildFilters() {
    const filters = {};
    
    const query = document.getElementById('searchInput').value.trim();
    if (query) filters.query = query;
    
    const status = document.getElementById('statusFilter').value;
    if (status) filters.durum = status;
    
    const paymentMethod = document.getElementById('paymentMethodFilter').value;
    if (paymentMethod) filters.odemeYontemi = paymentMethod;
    
    const dateFrom = document.getElementById('dateFromFilter').value;
    if (dateFrom) filters.dateFrom = dateFrom;
    
    const dateTo = document.getElementById('dateToFilter').value;
    if (dateTo) filters.dateTo = dateTo;
    
    const amountMin = document.getElementById('amountMinFilter').value;
    if (amountMin) filters.tutarMin = parseFloat(amountMin);

    return filters;
  }

  renderInvoicesTable(invoices) {
    const tbody = document.getElementById('invoicesTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (invoices.length === 0) {
      tbody.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    
    emptyState.style.display = 'none';
    
    tbody.innerHTML = invoices.map(invoice => `
      <tr data-invoice-id="${invoice.id}">
        <td>
          <input type="checkbox" class="form-check invoice-checkbox" value="${invoice.id}">
        </td>
        <td>
          <a href="#" onclick="invoicesManager.showInvoiceDetails('${invoice.id}')" class="link-primary">
            ${invoice.faturaNo}
          </a>
        </td>
        <td>${invoice.patientName}</td>
        <td>${this.formatDate(invoice.tarih)}</td>
        <td>${this.formatCurrency(invoice.toplamTutar)}</td>
        <td>${this.formatCurrency(invoice.kdvTutar)}</td>
        <td><strong>${this.formatCurrency(invoice.genelToplam)}</strong></td>
        <td>
          <span class="badge badge-${this.getStatusColor(invoice.durum)}">
            ${this.getStatusText(invoice.durum)}
          </span>
        </td>
        <td>${this.getPaymentMethodText(invoice.odemeYontemi || '')}</td>
        <td>
          ${invoice.ettn ? 
            `<span class="badge badge-success" title="${invoice.ettn}">✓ Gönderildi</span>` :
            '<span class="badge badge-secondary">-</span>'
          }
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            <button type="button" class="btn btn-outline btn-sm" 
                    onclick="invoicesManager.showInvoiceDetails('${invoice.id}')" title="Detaylar">
              <i class="icon-eye"></i>
            </button>
            <button type="button" class="btn btn-outline btn-sm" 
                    onclick="invoicesManager.editInvoice('${invoice.id}')" title="Düzenle"
                    ${invoice.durum !== 'taslak' ? 'disabled' : ''}>
              <i class="icon-edit"></i>
            </button>
            ${invoice.durum === 'taslak' ? `
              <button type="button" class="btn btn-outline btn-sm" 
                      onclick="invoicesManager.sendToEFatura('${invoice.id}')" title="E-Fatura Gönder">
                <i class="icon-send"></i>
              </button>
            ` : ''}
            <button type="button" class="btn btn-outline btn-sm" 
                    onclick="invoicesManager.deleteInvoice('${invoice.id}')" title="Sil"
                    ${invoice.durum === 'onaylandi' ? 'disabled' : ''}>
              <i class="icon-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Setup checkbox listeners
    tbody.querySelectorAll('.invoice-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.toggleInvoiceSelection(e.target.value, e.target.checked);
      });
    });
  }

  updateStatistics() {
    const stats = this.dataService.getStatistics();
    
    document.getElementById('totalInvoicesCount').textContent = stats.total;
    document.getElementById('approvedInvoicesCount').textContent = stats.byStatus.onaylandi;
    document.getElementById('pendingInvoicesCount').textContent = 
      stats.byStatus.gonderildi + stats.byStatus.taslak;
    document.getElementById('totalRevenueAmount').textContent = 
      this.formatCurrency(stats.totalRevenue);
  }

  toggleInvoiceSelection(invoiceId, selected) {
    if (selected) {
      this.selectedInvoices.add(invoiceId);
    } else {
      this.selectedInvoices.delete(invoiceId);
    }
    
    this.updateBulkActions();
    this.updateSelectAll();
  }

  toggleSelectAll(selectAll) {
    const checkboxes = document.querySelectorAll('.invoice-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = selectAll;
      this.toggleInvoiceSelection(checkbox.value, selectAll);
    });
  }

  updateSelectAll() {
    const checkboxes = document.querySelectorAll('.invoice-checkbox');
    const selectedCount = this.selectedInvoices.size;
    const selectAllCheckbox = document.getElementById('selectAll');
    
    if (selectedCount === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (selectedCount === checkboxes.length) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }

  updateBulkActions() {
    const bulkCard = document.getElementById('bulkActionsCard');
    const selectedCount = this.selectedInvoices.size;
    
    if (selectedCount > 0) {
      bulkCard.style.display = 'block';
      bulkCard.querySelector('.bulk-selected-count').textContent = 
        `${selectedCount} fatura seçildi`;
    } else {
      bulkCard.style.display = 'none';
    }
  }

  async showInvoiceDetails(invoiceId) {
    try {
      const invoice = this.dataService.getById(invoiceId);
      if (!invoice) {
        this.showError('Fatura bulunamadı');
        return;
      }

      this.currentInvoice = invoice;
      this.renderInvoiceDetailsModal(invoice);
      this.showModal('invoiceDetailsModal');
      
    } catch (error) {
      console.error('Fatura detayları yüklenirken hata:', error);
      this.showError('Fatura detayları yüklenemedi');
    }
  }

  renderInvoiceDetailsModal(invoice) {
    const content = document.getElementById('invoiceDetailsContent');
    
    content.innerHTML = `
      <div class="invoice-details">
        <div class="detail-section">
          <h4>Fatura Bilgileri</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Fatura No:</label>
              <span>${invoice.faturaNo}</span>
            </div>
            <div class="detail-item">
              <label>Belge No:</label>
              <span>${invoice.belgeNo}</span>
            </div>
            <div class="detail-item">
              <label>Tarih:</label>
              <span>${this.formatDate(invoice.tarih)}</span>
            </div>
            <div class="detail-item">
              <label>Durum:</label>
              <span class="badge badge-${this.getStatusColor(invoice.durum)}">
                ${this.getStatusText(invoice.durum)}
              </span>
            </div>
            <div class="detail-item">
              <label>Ödeme Yöntemi:</label>
              <span>${this.getPaymentMethodText(invoice.odemeYontemi || '')}</span>
            </div>
            ${invoice.ettn ? `
              <div class="detail-item">
                <label>ETTN:</label>
                <span>${invoice.ettn}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="detail-section">
          <h4>Müşteri Bilgileri</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Adı:</label>
              <span>${invoice.patientName}</span>
            </div>
            ${invoice.patientTcNo ? `
              <div class="detail-item">
                <label>TC No:</label>
                <span>${invoice.patientTcNo}</span>
              </div>
            ` : ''}
            ${invoice.patientAddress ? `
              <div class="detail-item span-full">
                <label>Adres:</label>
                <span>${invoice.patientAddress}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="detail-section">
          <h4>Fatura Kalemleri</h4>
          <div class="table-container">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Mal/Hizmet</th>
                  <th>Miktar</th>
                  <th>Birim</th>
                  <th>Birim Fiyat</th>
                  <th>KDV %</th>
                  <th>KDV Tutarı</th>
                  <th>Toplam</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map(item => `
                  <tr>
                    <td>${item.malHizmet}</td>
                    <td>${item.miktar}</td>
                    <td>${item.birim}</td>
                    <td>${this.formatCurrency(item.birimFiyat)}</td>
                    <td>%${item.kdvOrani}</td>
                    <td>${this.formatCurrency(item.kdvTutar)}</td>
                    <td>${this.formatCurrency(item.tutar)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="detail-section">
          <h4>Toplam Tutarlar</h4>
          <div class="totals-summary">
            <div class="total-row">
              <label>Ara Toplam:</label>
              <span>${this.formatCurrency(invoice.toplamTutar)}</span>
            </div>
            <div class="total-row">
              <label>KDV Toplam:</label>
              <span>${this.formatCurrency(invoice.kdvTutar)}</span>
            </div>
            <div class="total-row final">
              <label><strong>Genel Toplam:</strong></label>
              <span><strong>${this.formatCurrency(invoice.genelToplam)}</strong></span>
            </div>
          </div>
        </div>

        ${invoice.aciklama ? `
          <div class="detail-section">
            <h4>Açıklamalar</h4>
            <p>${invoice.aciklama}</p>
          </div>
        ` : ''}
      </div>
    `;

    // Update modal buttons based on invoice status
    const sendBtn = document.getElementById('sendEFaturaBtn');
    const editBtn = document.getElementById('editInvoiceBtn');
    
    sendBtn.style.display = invoice.durum === 'taslak' ? 'inline-block' : 'none';
    editBtn.disabled = invoice.durum !== 'taslak';
  }

  async sendToEFatura(invoiceId) {
    try {
      this.showLoadingModal('E-Fatura gönderiliyor...');
      
      const result = this.dataService.sendToEFatura(invoiceId);
      
      if (result.success) {
        this.showSuccess('E-Fatura başarıyla gönderildi');
        this.loadInvoices();
        this.updateStatistics();
        this.closeModal('invoiceDetailsModal');
      } else {
        this.showError(result.error || 'E-Fatura gönderilemedi');
      }
      
    } catch (error) {
      console.error('E-Fatura gönderme hatası:', error);
      this.showError('E-Fatura gönderilirken hata oluştu');
    } finally {
      this.hideLoadingModal();
    }
  }

  async bulkSendToEFatura() {
    if (this.selectedInvoices.size === 0) {
      this.showError('Lütfen fatura seçiniz');
      return;
    }

    if (!confirm(`${this.selectedInvoices.size} adet fatura E-Fatura sistemine gönderilsin mi?`)) {
      return;
    }

    try {
      this.showLoadingModal('Toplu E-Fatura gönderimi yapılıyor...');
      
      const result = this.dataService.bulkSendToEFatura(Array.from(this.selectedInvoices));
      
      if (result.success) {
        const { success, failed, errors } = result.data;
        let message = `${success} fatura başarıyla gönderildi`;
        if (failed > 0) {
          message += `, ${failed} fatura gönderilemedi`;
        }
        this.showSuccess(message);
        
        this.selectedInvoices.clear();
        this.loadInvoices();
        this.updateStatistics();
        this.updateBulkActions();
      } else {
        this.showError('Toplu gönderim sırasında hata oluştu');
      }
      
    } catch (error) {
      console.error('Toplu E-Fatura gönderme hatası:', error);
      this.showError('Toplu gönderim sırasında hata oluştu');
    } finally {
      this.hideLoadingModal();
    }
  }

  async deleteInvoice(invoiceId) {
    const invoice = this.dataService.getById(invoiceId);
    if (!invoice) {
      this.showError('Fatura bulunamadı');
      return;
    }

    if (invoice.durum === 'onaylandi') {
      this.showError('Onaylanmış faturalar silinemez');
      return;
    }

    this.currentInvoice = invoice;
    this.showModal('confirmDeleteModal');
  }

  async confirmDelete() {
    if (!this.currentInvoice) return;

    try {
      this.showLoadingModal('Fatura siliniyor...');
      
      const result = this.dataService.delete(this.currentInvoice.id);
      
      if (result.success) {
        this.showSuccess('Fatura başarıyla silindi');
        this.loadInvoices();
        this.updateStatistics();
      } else {
        this.showError(result.error || 'Fatura silinemedi');
      }
      
    } catch (error) {
      console.error('Fatura silme hatası:', error);
      this.showError('Fatura silinirken hata oluştu');
    } finally {
      this.hideLoadingModal();
      this.closeModal('confirmDeleteModal');
      this.currentInvoice = null;
    }
  }

  // Event Handlers
  applyFilters() {
    this.currentPage = 1;
    this.loadInvoices();
  }

  clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('paymentMethodFilter').value = '';
    document.getElementById('dateFromFilter').value = '';
    document.getElementById('dateToFilter').value = '';
    document.getElementById('amountMinFilter').value = '';
    
    this.applyFilters();
  }

  refreshInvoices() {
    this.loadInvoices();
    this.updateStatistics();
  }

  editInvoice(invoiceId) {
    window.location.href = `new-invoice.html?edit=${invoiceId}`;
  }

  exportInvoices() {
    const filters = this.buildFilters();
    const invoices = this.dataService.search(filters);
    
    // Convert to CSV
    const csvData = this.convertToCSV(invoices);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `faturalar_${this.formatDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.showSuccess('Faturalar başarıyla dışa aktarıldı');
  }

  // Utility Methods
  getStatusColor(status) {
    const colors = {
      'taslak': 'secondary',
      'gonderildi': 'warning',
      'onaylandi': 'success',
      'reddedildi': 'danger',
      'iptal': 'dark'
    };
    return colors[status] || 'secondary';
  }

  getStatusText(status) {
    const texts = {
      'taslak': 'Taslak',
      'gonderildi': 'Gönderildi',
      'onaylandi': 'Onaylandı',
      'reddedildi': 'Reddedildi',
      'iptal': 'İptal'
    };
    return texts[status] || status;
  }

  getPaymentMethodText(method) {
    const methods = {
      'nakit': 'Nakit',
      'kart': 'Kart',
      'havale': 'Havale',
      'cek': 'Çek'
    };
    return methods[method] || '-';
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR');
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount || 0);
  }

  convertToCSV(data) {
    const headers = [
      'Fatura No', 'Hasta Adı', 'Tarih', 'Tutar', 'KDV', 'Toplam', 'Durum', 'Ödeme'
    ];
    
    const csvContent = [headers.join(',')];
    
    data.forEach(invoice => {
      const row = [
        invoice.faturaNo,
        invoice.patientName,
        this.formatDate(invoice.tarih),
        invoice.toplamTutar,
        invoice.kdvTutar,
        invoice.genelToplam,
        this.getStatusText(invoice.durum),
        this.getPaymentMethodText(invoice.odemeYontemi || '')
      ];
      csvContent.push(row.join(','));
    });
    
    return csvContent.join('\n');
  }

  // UI Helper Methods
  showLoading() {
    document.getElementById('loadingState').style.display = 'block';
  }

  hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
  }

  showLoadingModal(message = 'İşleminiz gerçekleştiriliyor...') {
    document.getElementById('loadingMessage').textContent = message;
    this.showModal('loadingModal');
  }

  hideLoadingModal() {
    this.closeModal('loadingModal');
  }

  showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
  }

  closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
  }

  showSuccess(message) {
    // This would typically show a toast notification
    alert(message);
  }

  showError(message) {
    // This would typically show a toast notification
    alert('Hata: ' + message);
  }

  debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  updatePagination(totalItems) {
    const paginationInfo = document.getElementById('paginationInfo');
    paginationInfo.textContent = `Toplam ${totalItems} kayıt`;
    
    // Pagination controls would be implemented here
  }
}

// Global functions for onclick handlers
window.invoicesManager = new InvoicesManager();

window.applyFilters = () => window.invoicesManager.applyFilters();
window.clearFilters = () => window.invoicesManager.clearFilters();
window.refreshInvoices = () => window.invoicesManager.refreshInvoices();
window.exportInvoices = () => window.invoicesManager.exportInvoices();
window.bulkSendToEFatura = () => window.invoicesManager.bulkSendToEFatura();
window.bulkExport = () => window.invoicesManager.exportInvoices();
window.bulkDelete = () => window.invoicesManager.bulkDelete();
window.closeInvoiceDetails = () => window.invoicesManager.closeModal('invoiceDetailsModal');
window.closeConfirmDelete = () => window.invoicesManager.closeModal('confirmDeleteModal');
window.confirmDelete = () => window.invoicesManager.confirmDelete();
window.editInvoice = () => window.invoicesManager.editInvoice(window.invoicesManager.currentInvoice.id);
window.printInvoice = () => window.print();
window.sendToEFatura = () => window.invoicesManager.sendToEFatura(window.invoicesManager.currentInvoice.id);

// Global event: reload invoices when a new invoice is created elsewhere
window.addEventListener('invoicesUpdated', (e) => {
  try {
    invoicesManager.loadInvoices();
    invoicesManager.updateStatistics();
  } catch (err) {
    console.warn('invoicesUpdated handler error', err);
  }
});
