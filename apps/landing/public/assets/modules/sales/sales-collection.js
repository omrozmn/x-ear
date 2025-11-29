/**
 * Sales Collection Module
 * Handles payment collection (Tahsilat) and promissory note tracking
 */
export class SalesCollectionModule {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Opens the collection modal showing outstanding payments and promissory notes
   */
  async openCollectionModal(patientId) {
    try {
      // Fetch patient sales and outstanding payments
      const sales = await this.fetchPatientSalesFromAPI(patientId);
      
      // Get promissory notes for this patient
      let promissoryNotes = [];
      try {
        const response = await this.apiClient.get(`/api/patients/${patientId}/promissory-notes`);
        promissoryNotes = response?.data || response || [];
      } catch (err) {
        console.warn('Failed to fetch promissory notes:', err);
      }

      // Calculate totals - include all sales with outstanding balance (including partial payments)
      const pendingSales = sales.filter(s => {
        const total = s.finalAmount || s.totalAmount || 0;
        const paid = s.paidAmount || 0;
        const remaining = total - paid;
        // Show if there's any remaining balance, regardless of status
        return remaining > 0;
      });
      const totalOutstanding = pendingSales.reduce((sum, s) => {
        const paid = s.paidAmount || 0;
        const total = s.finalAmount || s.totalAmount || 0;
        return sum + (total - paid);
      }, 0);

      const modal = document.createElement('div');
      modal.id = 'collectionModal';
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
          <!-- Header -->
          <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Tahsilat</h3>
              <p class="text-xs text-gray-500">Toplam Borç: <span class="font-bold text-red-600">${totalOutstanding.toLocaleString('tr-TR')} TL</span></p>
            </div>
            <button onclick="window.salesCollection.closeModal('collectionModal')" 
                    class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors" 
                    title="Kapat [ESC]">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            ${pendingSales.length > 0 ? pendingSales.map(sale => {
              const total = sale.finalAmount || sale.totalAmount || 0;
              const paid = sale.paidAmount || 0;
              const remaining = total - paid;
              const hasInstallments = sale.paymentPlan && sale.paymentPlan.installment_count > 1;
              const paymentPercentage = total > 0 ? Math.round((paid / total) * 100) : 0;
              
              return `
                <div class="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors ${paid > 0 ? 'bg-yellow-50' : ''}">
                  <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-mono text-gray-500">#${sale.id}</span>
                        ${hasInstallments ? `<span class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">${sale.paymentPlan.installment_count} Taksit</span>` : ''}
                        ${paid > 0 ? `<span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-semibold">Kısmi: %${paymentPercentage}</span>` : ''}
                      </div>
                      <p class="text-xs text-gray-500 mt-1">${new Date(sale.saleDate || sale.date || sale.createdAt).toLocaleDateString('tr-TR')}</p>
                      <p class="text-xs text-gray-600 mt-1">Toplam: <span class="font-semibold">${total.toLocaleString('tr-TR')} TL</span></p>
                      ${paid > 0 ? `
                        <div class="mt-1 space-y-0.5">
                          <p class="text-xs text-green-600 font-semibold">✓ Ödenen: ${paid.toLocaleString('tr-TR')} TL</p>
                          <div class="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div class="bg-green-600 h-1.5 rounded-full" style="width: ${paymentPercentage}%"></div>
                          </div>
                        </div>
                      ` : ''}
                    </div>
                    <div class="text-right">
                      <p class="text-xs text-gray-500 mb-1">Kalan</p>
                      <p class="text-lg font-bold text-red-600">${remaining.toLocaleString('tr-TR')} TL</p>
                      <button onclick="window.salesCollection.openPaymentForm('${sale.id}', '${patientId}', ${remaining}, ${total}, ${paid}, ${hasInstallments})" 
                              class="mt-1 text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                        Ödeme Al
                      </button>
                    </div>
                  </div>
                  ${hasInstallments ? `
                    <div class="mt-2 pt-2 border-t border-gray-100">
                      <button onclick="window.salesCollection.showInstallmentDetails('${sale.id}', '${patientId}')" 
                              class="text-xs text-blue-600 hover:text-blue-800">
                        <i class="fas fa-list-ul mr-1"></i>Taksit Detayları
                      </button>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('') : '<p class="text-gray-400 text-center py-8 text-sm">Bekleyen ödeme yok</p>'}

            ${promissoryNotes.length > 0 ? `
              <div class="border-t border-gray-200 pt-3 mt-3">
                <h4 class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <i class="fas fa-file-contract"></i>
                  Senetler
                </h4>
                ${promissoryNotes.map(note => {
                  const isPaid = note.status === 'paid';
                  const isPartial = note.status === 'partial';
                  const isOverdue = note.status === 'overdue' || (note.dueDate && new Date(note.dueDate) < new Date() && !isPaid);
                  const noteAmount = note.amount || 0;
                  const paidAmount = note.paidAmount || 0;
                  const remaining = noteAmount - paidAmount;
                  const paymentPercentage = noteAmount > 0 ? Math.round((paidAmount / noteAmount) * 100) : 0;
                  
                  // Find related sale
                  const relatedSale = note.saleId ? sales.find(s => s.id === note.saleId) : null;
                  
                  return `
                    <div class="border border-gray-200 rounded-lg p-3 mb-2 ${isPaid ? 'bg-green-50 opacity-75' : isPartial ? 'bg-yellow-50' : ''}">
                      <div class="flex justify-between items-start gap-3">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-xs font-mono text-gray-600">Senet ${note.noteNumber}/${note.totalNotes}</span>
                            ${note.saleId ? `<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Satış #${note.saleId}</span>` : ''}
                            ${isOverdue && !isPaid ? '<span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">VADESİ GEÇTİ</span>' : ''}
                            ${isPartial ? `<span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-semibold">Kısmi: %${paymentPercentage}</span>` : ''}
                          </div>
                          <p class="text-xs text-gray-500 mt-1">
                            Vade: ${note.dueDate ? new Date(note.dueDate).toLocaleDateString('tr-TR') : '-'}
                          </p>
                          ${relatedSale ? `
                            <p class="text-xs text-gray-600 mt-0.5">
                              <i class="fas fa-link text-blue-500 mr-1"></i>
                              Satış: ${new Date(relatedSale.saleDate || relatedSale.date || relatedSale.createdAt).toLocaleDateString('tr-TR')}
                            </p>
                          ` : ''}
                          <p class="text-xs text-gray-600 mt-1">
                            Tutar: <span class="font-semibold">${noteAmount.toLocaleString('tr-TR')} TL</span>
                          </p>
                          ${isPartial ? `
                            <div class="mt-1 space-y-0.5">
                              <p class="text-xs text-green-600 font-semibold">✓ Ödenen: ${paidAmount.toLocaleString('tr-TR')} TL</p>
                              <div class="w-full bg-gray-200 rounded-full h-1.5">
                                <div class="bg-green-600 h-1.5 rounded-full" style="width: ${paymentPercentage}%"></div>
                              </div>
                            </div>
                          ` : ''}
                        </div>
                        <div class="text-right flex-shrink-0">
                          ${!isPaid ? `
                            <p class="text-xs text-gray-500 mb-1">Kalan</p>
                            <p class="text-base font-bold ${isPartial ? 'text-orange-600' : 'text-red-600'}">${remaining.toLocaleString('tr-TR')} TL</p>
                            <button onclick="window.salesCollection.openPromissoryPaymentForm('${note.id}', '${patientId}', ${remaining}, ${noteAmount}, ${paidAmount}, '${note.saleId || ''}')" 
                                    class="mt-1 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
                              Tahsil Et
                            </button>
                          ` : `
                            <p class="text-sm font-bold text-green-600">${noteAmount.toLocaleString('tr-TR')} TL</p>
                            <span class="text-xs text-green-600 flex items-center gap-1 mt-1">
                              <i class="fas fa-check-circle"></i>
                              Tahsil Edildi
                            </span>
                            ${note.paidDate ? `<p class="text-xs text-gray-500 mt-0.5">${new Date(note.paidDate).toLocaleDateString('tr-TR')}</p>` : ''}
                          `}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      
      // Add ESC key listener to close modal
      const escapeHandler = (e) => {
        if (e.key === 'Escape') {
          this.closeModal('collectionModal');
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
      
    } catch (error) {
      console.error('Failed to open collection modal:', error);
      this.showToast('Tahsilat bilgileri yüklenirken hata oluştu', 'error');
    }
  }

  /**
   * Opens payment form with amount and method selection
   */
  openPaymentForm(saleId, patientId, remainingAmount, totalAmount, paidAmount, hasInstallments) {
    const modal = document.createElement('div');
    modal.id = 'paymentFormModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4';
    
    // Calculate actual remaining amount from API data - use finalAmount as primary source
    const actualRemaining = totalAmount - paidAmount;
    
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900">Ödeme Kaydı</h3>
          <button onclick="window.salesCollection.closeModal('paymentFormModal')" 
                  class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors" 
                  title="Kapat [ESC]">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-4">
          <div class="mb-3" id="paymentSummary">
            <p class="text-sm text-gray-600">Toplam: <span class="font-semibold">${totalAmount.toLocaleString('tr-TR')} TL</span></p>
            ${paidAmount > 0 ? `<p class="text-sm text-green-600">Ödenen: <span id="currentPaid">${paidAmount.toLocaleString('tr-TR')}</span> TL</p>` : ''}
            <p class="text-sm text-red-600 font-semibold">Kalan: <span id="currentRemaining">${actualRemaining.toLocaleString('tr-TR')}</span> TL</p>
          </div>
          
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ödeme Tutarı</label>
              <input type="number" id="paymentAmount" value="${actualRemaining}" max="${actualRemaining}" min="0" step="0.01"
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <div class="flex gap-2 mt-1">
                <button onclick="document.getElementById('paymentAmount').value = ${actualRemaining}" 
                        class="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">Tam Ödeme</button>
                <button onclick="document.getElementById('paymentAmount').value = ${(actualRemaining / 2).toFixed(2)}" 
                        class="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">Yarısı</button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi</label>
              <select id="paymentMethod" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="cash">Nakit</option>
                <option value="card">Kart</option>
                <option value="bank_transfer">Havale/EFT</option>
                <option value="check">Çek</option>
              </select>
            </div>
          </div>

          <div class="flex gap-2 mt-4">
            <button onclick="this.closest('#paymentFormModal').remove()" 
                    class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              İptal
            </button>
            <button onclick="window.salesCollection.submitPayment('${saleId}', '${patientId}', ${actualRemaining})" 
                    class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Kaydet
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Add ESC key listener to close modal
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeModal('paymentFormModal');
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Submits payment record
   */
  async submitPayment(saleId, patientId, maxAmount) {
    try {
      const amount = parseFloat(document.getElementById('paymentAmount').value);
      const method = document.getElementById('paymentMethod').value;

      if (!amount || amount <= 0) {
        this.showToast('Geçerli bir tutar girin', 'warning');
        return;
      }

      if (amount > maxAmount) {
        this.showToast('Ödeme tutarı kalan tutardan fazla olamaz', 'warning');
        return;
      }

      const paymentData = {
        patient_id: patientId,
        sale_id: saleId,
        amount: amount,
        payment_date: new Date().toISOString(),
        payment_method: method,
        payment_type: 'payment',
        status: amount >= maxAmount ? 'paid' : 'partial'
      };

      console.log('📤 Submitting payment:', paymentData);
      const response = await this.apiClient.post('/api/payment-records', paymentData);
      console.log('📥 Payment response:', response);
      
      if (response && (response.success !== false)) {
        const isFullPayment = amount >= maxAmount;
        this.showToast(
          isFullPayment 
            ? '✓ Ödeme tamamlandı' 
            : `✓ Kısmi ödeme kaydedildi (${amount.toLocaleString('tr-TR')} TL)`,
          'success'
        );
        
        // Close payment form
        this.closeModal('paymentFormModal');
        
        // Wait for backend to process and update database
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Force refresh sales data from backend (bypass cache)
        if (window.salesManagement && window.salesManagement.fetchPatientSalesFromAPI) {
          console.log('🔄 Force refreshing sales data from API...');
          const freshSales = await window.salesManagement.fetchPatientSalesFromAPI(patientId);
          console.log('📊 Fresh sales data:', freshSales);
        }
        
        // Wait for data to be fully loaded
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // CRITICAL: Refresh sales table to update sales history section
        if (window.salesManagement && window.salesManagement.refreshSalesTable) {
          console.log('🔄 Refreshing sales table...');
          await window.salesManagement.refreshSalesTable(patientId);
        }
        
        // Wait for sales table to refresh
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Close and reopen collection modal with fresh data
        this.closeModal('collectionModal');
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('🔄 Reopening collection modal with fresh data...');
        await this.openCollectionModal(patientId);
      } else {
        throw new Error(response?.error || 'Ödeme kaydedilemedi - yanıt hatalı');
      }
    } catch (error) {
      console.error('❌ Payment recording failed:', error);
      // Local fallback: persist payment record to localStorage queue
      try {
        const amount = parseFloat(document.getElementById('paymentAmount')?.value || '0');
        const method = document.getElementById('paymentMethod')?.value || 'cash';
        const localPayment = {
          patient_id: patientId,
          sale_id: saleId,
          amount: amount,
          payment_date: new Date().toISOString(),
          payment_method: method,
          payment_type: 'payment',
          status: amount >= maxAmount ? 'paid' : 'partial',
          pending: true,
          source: 'frontend-fallback'
        };
        const KEY = (window.STORAGE_KEYS && window.STORAGE_KEYS.PAYMENT_RECORDS) || 'xear_payment_records';
        const PENDING_KEY = 'xear_payment_records_pending';
        const existing = JSON.parse(localStorage.getItem(KEY) || '[]');
        const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
        existing.push(localPayment);
        pending.push(localPayment);
        localStorage.setItem(KEY, JSON.stringify(existing));
        localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
        this.showToast('⚠️ Backend hatası: Ödeme yerel olarak kaydedildi', 'warning');
        // Close payment form and keep UX flow
        this.closeModal('paymentFormModal');
        // Reopen collection modal to keep user context
        await this.openCollectionModal(patientId);
      } catch (localErr) {
        console.warn('Local payment fallback failed:', localErr);
        this.showToast('Ödeme kaydedilemedi: ' + (error.message || 'bilinmeyen hata'), 'error');
      }
    }
  }

  /**
   * Shows installment details for a sale
   */
  async showInstallmentDetails(saleId, patientId) {
    try {
      const response = await this.apiClient.get(`/api/sales/${saleId}/payment-plan`);
      const plan = response?.data || response;
      
      if (!plan) {
        this.showToast('Taksit bilgileri bulunamadı', 'warning');
        return;
      }

      const modal = document.createElement('div');
      modal.id = 'installmentDetailsModal';
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">Taksit Planı</h3>
            <button onclick="this.closest('#installmentDetailsModal').remove()" 
                    class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="p-4">
            <div class="mb-3 text-sm">
              <p class="text-gray-600">Taksit Sayısı: <span class="font-semibold">${plan.installment_count}</span></p>
              <p class="text-gray-600">Aylık Ödeme: <span class="font-semibold">${((plan.total_amount || 0) / plan.installment_count).toLocaleString('tr-TR')} TL</span></p>
              <p class="text-gray-600">Toplam: <span class="font-semibold">${(plan.total_amount || 0).toLocaleString('tr-TR')} TL</span></p>
            </div>
            <button onclick="this.closest('#installmentDetailsModal').remove()" 
                    class="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              Kapat
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    } catch (error) {
      console.error('Failed to fetch installment details:', error);
      this.showToast('Taksit bilgileri yüklenemedi', 'error');
    }
  }

  /**
   * Opens promissory note payment form (similar to sale payment form)
   */
  openPromissoryPaymentForm(noteId, patientId, remainingAmount, totalAmount, paidAmount, saleId) {
    const modal = document.createElement('div');
    modal.id = 'promissoryPaymentFormModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Senet Tahsilatı</h3>
            ${saleId ? `<p class="text-xs text-gray-500">Satış #${saleId}</p>` : ''}
          </div>
          <button onclick="window.salesCollection.closeModal('promissoryPaymentFormModal')" 
                  class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors" 
                  title="Kapat [ESC]">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-4">
          <div class="mb-3 bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <p class="text-sm text-gray-700">Toplam: <span class="font-semibold">${totalAmount.toLocaleString('tr-TR')} TL</span></p>
            ${paidAmount > 0 ? `<p class="text-sm text-green-600">✓ Ödenen: ${paidAmount.toLocaleString('tr-TR')} TL</p>` : ''}
            <p class="text-sm text-red-600 font-semibold">Kalan: ${remainingAmount.toLocaleString('tr-TR')} TL</p>
          </div>
          
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tahsilat Tutarı</label>
              <input type="number" id="promissoryPaymentAmount" value="${remainingAmount}" max="${remainingAmount}" min="0" step="0.01"
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <div class="flex gap-2 mt-1">
                <button onclick="document.getElementById('promissoryPaymentAmount').value = ${remainingAmount}" 
                        class="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">Tam Tahsilat</button>
                <button onclick="document.getElementById('promissoryPaymentAmount').value = ${(remainingAmount / 2).toFixed(2)}" 
                        class="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">Yarısı</button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi</label>
              <select id="promissoryPaymentMethod" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="cash">Nakit</option>
                <option value="card">Kart</option>
                <option value="bank_transfer">Havale/EFT</option>
                <option value="check">Çek</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Referans No (Opsiyonel)</label>
              <input type="text" id="promissoryReferenceNo" placeholder="İşlem no, dekont no vb..."
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Not (Opsiyonel)</label>
              <input type="text" id="promissoryPaymentNote" placeholder="Tahsilat notu..."
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
          </div>

          <div class="flex gap-2 mt-4">
            <button onclick="window.salesCollection.closeModal('promissoryPaymentFormModal')" 
                    class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              İptal
            </button>
            <button onclick="window.salesCollection.submitPromissoryPayment('${noteId}', '${patientId}', ${remainingAmount})" 
                    class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Tahsil Et
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Add ESC key listener to close modal
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeModal('promissoryPaymentFormModal');
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Submits promissory note payment
   */
  async submitPromissoryPayment(noteId, patientId, maxAmount) {
    try {
      const amount = parseFloat(document.getElementById('promissoryPaymentAmount').value);
      const method = document.getElementById('promissoryPaymentMethod').value;
      const referenceNo = document.getElementById('promissoryReferenceNo').value;
      const note = document.getElementById('promissoryPaymentNote').value;

      if (!amount || amount <= 0) {
        this.showToast('Geçerli bir tutar girin', 'warning');
        return;
      }

      if (amount > maxAmount + 0.01) {  // Allow small rounding differences
        this.showToast('Tahsilat tutarı kalan tutardan fazla olamaz', 'warning');
        return;
      }

      const paymentData = {
        amount: amount,
        payment_date: new Date().toISOString(),
        payment_method: method,
        reference_number: referenceNo || `SENET-${noteId}`,
        notes: note || null
      };

      console.log('📤 Submitting promissory note payment:', paymentData);
      const response = await this.apiClient.post(`/api/promissory-notes/${noteId}/collect`, paymentData);
      console.log('📥 Promissory payment response:', response);
      
      if (response && response.success !== false) {
        const isFullPayment = amount >= maxAmount - 0.01;
        this.showToast(
          isFullPayment 
            ? '✓ Senet tamamen tahsil edildi' 
            : `✓ Kısmi tahsilat kaydedildi (${amount.toLocaleString('tr-TR')} TL)`,
          'success'
        );
        
        this.closeModal('promissoryPaymentFormModal');
        this.closeModal('collectionModal');
        
        // Reopen collection modal to show updated data
        await this.openCollectionModal(patientId);
        
        // Trigger page refresh event if needed
        if (window.dispatchEvent) {
          window.dispatchEvent(new Event('paymentRecorded'));
        }
      } else {
        throw new Error(response.error || 'Senet tahsil edilemedi');
      }
    } catch (error) {
      console.error('Promissory payment failed:', error);
      // Local fallback: persist promissory payment record to localStorage queue
      try {
        const amount = parseFloat(document.getElementById('promissoryPaymentAmount')?.value || '0');
        const method = document.getElementById('promissoryPaymentMethod')?.value || 'cash';
        const referenceNo = document.getElementById('promissoryReferenceNo')?.value || `SENET-${noteId}`;
        const noteText = document.getElementById('promissoryPaymentNote')?.value || null;
        const localPayment = {
          patient_id: patientId,
          promissory_note_id: noteId,
          amount: amount,
          payment_date: new Date().toISOString(),
          payment_method: method,
          payment_type: 'promissory_note',
          reference_number: referenceNo,
          notes: noteText,
          status: amount >= maxAmount - 0.01 ? 'paid' : 'partial',
          pending: true,
          source: 'frontend-fallback'
        };
        const KEY = (window.STORAGE_KEYS && window.STORAGE_KEYS.PAYMENT_RECORDS) || 'xear_payment_records';
        const PENDING_KEY = 'xear_payment_records_pending';
        const existing = JSON.parse(localStorage.getItem(KEY) || '[]');
        const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
        existing.push(localPayment);
        pending.push(localPayment);
        localStorage.setItem(KEY, JSON.stringify(existing));
        localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
        this.showToast('⚠️ Backend hatası: Senet tahsilatı yerel olarak kaydedildi', 'warning');
        // Close modals to keep UX flow
        this.closeModal('promissoryPaymentFormModal');
        this.closeModal('collectionModal');
        // Reopen collection modal to maintain context
        await this.openCollectionModal(patientId);
      } catch (localErr) {
        console.warn('Local promissory payment fallback failed:', localErr);
        this.showToast('Senet tahsil edilemedi: ' + (error.message || 'bilinmeyen hata'), 'error');
      }
    }
  }

  /**
   * Records a promissory note collection (DEPRECATED - Use submitPromissoryPayment instead)
   */
  async recordPromissoryPayment(noteId, patientId, amount) {
    try {
      const paymentData = {
        patient_id: patientId,
        promissory_note_id: noteId,
        amount: amount,
        payment_date: new Date().toISOString(),
        payment_method: 'promissory_note',
        payment_type: 'promissory_note',
        status: 'paid'
      };

      const response = await this.apiClient.post('/api/payment-records', paymentData);
      
      if (response.success) {
        this.showToast('Senet tahsil edildi', 'success');
        this.closeModal('collectionModal');
        this.openCollectionModal(patientId);
      } else {
        throw new Error(response.error || 'Senet tahsil edilemedi');
      }
    } catch (error) {
      console.error('Promissory payment recording failed:', error);
      this.showToast('Senet tahsil edilemedi: ' + error.message, 'error');
    }
  }

  /**
   * Fetch patient sales from API
   */
  async fetchPatientSalesFromAPI(patientId) {
    try {
      const response = await this.apiClient.get(`/api/patients/${patientId}/sales`);
      return response?.data || response || [];
    } catch (error) {
      console.error('Failed to fetch sales:', error);
      return [];
    }
  }

  /**
   * Close a modal by ID
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    // Use global toast if available, otherwise console
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

// Export to window for global access
if (typeof window !== 'undefined') {
  window.SalesCollectionModule = SalesCollectionModule;
  
  // Initialize if ApiClient is available
  if (window.ApiClient) {
    const apiClient = new window.ApiClient();
    window.salesCollection = new SalesCollectionModule(apiClient);
  }
}
