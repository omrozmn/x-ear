/**
 * Promissory Note Component
 * Handles creation and management of promissory notes (senet) for installment payments
 */

// Use Orval API from window object instead of ES6 imports

class PromissoryNoteComponent {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  // Open promissory note creation modal
  async openModal(patientId) {
    try {
      // Load flatpickr if not already loaded
      if (!window.flatpickr) {
        // Load CSS
        if (!document.querySelector('link[href*="flatpickr"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
          document.head.appendChild(link);
        }
        
        // Load JS
        if (!document.querySelector('script[src*="flatpickr"]')) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
          document.head.appendChild(script);
          
          // Wait for script to load
          await new Promise((resolve) => {
            script.onload = resolve;
            setTimeout(resolve, 1000); // Fallback timeout
          });
        }
      }

      // Fetch patient data
      let patientData = null;
      try {
        const res = await (this.apiClient.getPatient ? 
          this.apiClient.getPatient(patientId) : 
          this.apiClient.get(`/api/patients/${patientId}`));
        patientData = res && (res.data ?? res) || null;
      } catch (e) {
        console.error('Error fetching patient:', e);
      }

      if (!patientData) {
        this.showError('Hasta bilgileri alınamadı');
        return;
      }

      patientData = this.normalizePatientObject(patientData);

      // Get patient sales to prefill data
      const patientSales = await this.fetchPatientSalesFromAPI(patientId);
      const lastSale = patientSales.length > 0 ? patientSales[patientSales.length - 1] : null;
      
      // Filter sales with outstanding balances for selection
      const pendingSales = patientSales.filter(s => {
        const total = s.totalAmount || s.finalAmount || 0;
        const paid = s.paidAmount || 0;
        return (total - paid) > 0;
      });

      const modalHtml = `
        <div id="promissoryNoteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 class="text-xl font-bold text-gray-900">Senet Oluştur - ${patientData.name || patientData.fullName || ''}</h2>
              <button onclick="promissoryNote.closeModal()" 
                      class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <form id="promissoryNoteForm" class="p-6 space-y-6" data-patient-id="${patientId}">
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p class="text-sm text-blue-800">
                  <i class="fas fa-info-circle mr-2"></i>
                  Bu form ile resmi senet oluşturabilirsiniz. Bilgileri kontrol edip düzenleyebilirsiniz. 
                  Bir sayfada 2 senet oluşturulacaktır.
                </p>
              </div>

              <!-- Senet Bilgileri -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                ${pendingSales.length > 0 ? `
                <div class="md:col-span-3">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-shopping-cart mr-2 text-blue-600"></i>Satış Seçiniz (Opsiyonel)
                  </label>
                  <select id="saleSelection" name="saleSelection" 
                          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          onchange="promissoryNote.onSaleSelected()">
                    <option value="">-- Satış Seçilmedi --</option>
                    ${pendingSales.map(sale => {
                      const total = sale.totalAmount || sale.finalAmount || 0;
                      const paid = sale.paidAmount || 0;
                      const remaining = total - paid;
                      return `
                        <option value="${sale.id}" data-total="${total}" data-paid="${paid}" data-remaining="${remaining}">
                          Satış #${sale.id} - ${new Date(sale.date || sale.saleDate || sale.createdAt).toLocaleDateString('tr-TR')} - 
                          Kalan: ${remaining.toLocaleString('tr-TR')} TL (Toplam: ${total.toLocaleString('tr-TR')} TL)
                        </option>
                      `;
                    }).join('')}
                  </select>
                  <p class="text-xs text-gray-500 mt-1">
                    Bir satış seçerseniz, senet bu satışla ilişkilendirilir ve Satış Geçmişinde görünür.
                  </p>
                </div>
                ` : ''}
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Senet Sayısı <span class="text-red-500">*</span>
                  </label>
                  <input type="number" id="noteCount" name="noteCount" value="1" min="1" max="24" required
                         class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Toplam Tutar (TL) <span class="text-red-500">*</span>
                  </label>
                  <input type="number" id="totalAmount" name="totalAmount" 
                         value="${lastSale ? lastSale.totalAmount : ''}" step="0.01" required
                         class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Yetkili Mahkeme <span class="text-red-500">*</span>
                  </label>
                  <input type="text" id="authorizedCourt" name="authorizedCourt" value="İstanbul (Çağlayan)" required
                         class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                </div>
              </div>

              <!-- Tarihler (Moved to top for better UX) -->
              <div class="border-t border-gray-200 pt-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">
                  <i class="far fa-calendar-alt mr-2 text-blue-600"></i>Tarihler
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      <i class="far fa-calendar-alt mr-2 text-blue-600"></i>Düzenlenme Tarihi <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="issueDate" name="issueDate" 
                           value="${new Date().toLocaleDateString('tr-TR')}" required
                           class="flatpickr-input w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                           placeholder="GG.AA.YYYY">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      <i class="far fa-calendar-check mr-2 text-green-600"></i>İlk Vade Tarihi <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="firstDueDate" name="firstDueDate" required
                           class="flatpickr-input w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                           placeholder="GG.AA.YYYY">
                    <p class="text-xs text-gray-500 mt-1">İlk vade tarihi, düzenlenme tarihinden en az 1 gün sonra olmalıdır.</p>
                  </div>
                </div>
              </div>

              <!-- Taksit Önizleme -->
              <div id="installmentPreview" class="border-t border-gray-200 pt-4 hidden">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-semibold text-gray-900">Taksit Planı</h3>
                  <button type="button" onclick="promissoryNote.autoFillInstallments()"
                          class="text-sm text-blue-600 hover:text-blue-800">
                    <i class="fas fa-magic mr-1"></i>Otomatik Doldur
                  </button>
                </div>
                <div id="installmentList" class="space-y-2 max-h-64 overflow-y-auto"></div>
                <div class="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span class="font-semibold text-gray-900">Toplam:</span>
                  <span id="installmentTotal" class="font-bold text-lg text-blue-600">0.00 TL</span>
                </div>
              </div>

              <!-- Hasta Bilgileri -->
              <div class="border-t border-gray-200 pt-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Borçlu Bilgileri</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Ad Soyad <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="debtorName" name="debtorName" 
                           value="${patientData.name || patientData.fullName || ''}" required
                           class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      T.C. Kimlik No <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="debtorTc" name="debtorTc" maxlength="11"
                           value="${patientData.identityNumber || patientData.tcNumber || ''}" required
                           class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Adres <span class="text-red-500">*</span>
                    </label>
                    <textarea id="debtorAddress" name="debtorAddress" rows="2" required
                              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">${patientData.address?.fullAddress || patientData.address || ''}</textarea>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Vergi Dairesi <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="debtorTaxOffice" name="debtorTaxOffice" value="OSMANGAZİ" required
                           class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Telefon <span class="text-red-500">*</span>
                    </label>
                    <input type="tel" id="debtorPhone" name="debtorPhone" 
                           value="${patientData.phone || ''}" required
                           class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  </div>
                </div>
              </div>

              <!-- Kefil Bilgileri (Opsiyonel) -->
              <div class="border-t border-gray-200 pt-4">
                <div class="flex items-center mb-4">
                  <input type="checkbox" id="hasGuarantor" name="hasGuarantor" 
                         class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label for="hasGuarantor" class="ml-2 text-sm font-medium text-gray-700">Kefil Ekle</label>
                </div>
                <div id="guarantorFields" class="hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Kefil Ad Soyad</label>
                    <input type="text" id="guarantorName" name="guarantorName"
                           class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Kefil T.C. Kimlik No</label>
                    <input type="text" id="guarantorTc" name="guarantorTc" maxlength="11"
                           class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Kefil Adres</label>
                    <textarea id="guarantorAddress" name="guarantorAddress" rows="2"
                              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"></textarea>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Kefil Telefon</label>
                    <input type="tel" id="guarantorPhone" name="guarantorPhone"
                           class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button type="button" onclick="promissoryNote.closeModal()"
                        class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  İptal
                </button>
                <button type="submit"
                        class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  <i class="fas fa-download mr-2"></i>Senet Oluştur ve İndir
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);

      // Setup event listeners
      document.getElementById('hasGuarantor').addEventListener('change', (e) => {
        const guarantorFields = document.getElementById('guarantorFields');
        if (e.target.checked) {
          guarantorFields.classList.remove('hidden');
        } else {
          guarantorFields.classList.add('hidden');
        }
      });

      // Note count change - show installment preview
      document.getElementById('noteCount').addEventListener('change', (e) => {
        const count = parseInt(e.target.value) || 1;
        if (count > 0) {
          this.showInstallmentPreview(count);
        } else {
          document.getElementById('installmentPreview').classList.add('hidden');
        }
      });

      // Total amount change - update installments
      document.getElementById('totalAmount').addEventListener('input', (e) => {
        this.updateInstallmentsFromTotal();
      });

      document.getElementById('promissoryNoteForm').addEventListener('submit', (e) => {
        e.preventDefault();
        this.generate(e.target);
      });

      // Initialize modern datepickers
      this.initializeDatepickers();

    } catch (error) {
      console.error('Error opening promissory note modal:', error);
      this.showError('Senet formu açılırken hata oluştu');
    }
  }

  // Initialize flatpickr datepickers
  initializeDatepickers() {
    try {
      const issueDateInput = document.getElementById('issueDate');
      const firstDueDateInput = document.getElementById('firstDueDate');

      if (window.flatpickr) {
        // Store firstDueDate picker instance to update dynamically
        let firstDueDatePicker = null;
        
        // Issue date picker
        window.flatpickr(issueDateInput, {
          dateFormat: 'd.m.Y',
          defaultDate: new Date(),
          locale: {
            firstDayOfWeek: 1,
            weekdays: {
              shorthand: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
              longhand: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
            },
            months: {
              shorthand: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
              longhand: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
            }
          },
          allowInput: true,
          clickOpens: true,
          onChange: (selectedDates, dateStr, instance) => {
            // When issue date changes, update firstDueDate minimum to issueDate + 1 day
            if (selectedDates[0] && firstDueDatePicker) {
              const minDueDate = new Date(selectedDates[0]);
              minDueDate.setDate(minDueDate.getDate() + 1);
              firstDueDatePicker.set('minDate', minDueDate);
              
              // If current firstDueDate is before new minimum, update it
              const currentDueDate = firstDueDatePicker.selectedDates[0];
              if (!currentDueDate || currentDueDate < minDueDate) {
                firstDueDatePicker.setDate(minDueDate);
              }
            }
          }
        });

        // Calculate initial minDate (issueDate + 1 day)
        const today = new Date();
        const minDueDate = new Date(today);
        minDueDate.setDate(minDueDate.getDate() + 1);
        
        // First due date picker
        firstDueDatePicker = window.flatpickr(firstDueDateInput, {
          dateFormat: 'd.m.Y',
          minDate: minDueDate,
          locale: {
            firstDayOfWeek: 1,
            weekdays: {
              shorthand: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
              longhand: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
            },
            months: {
              shorthand: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
              longhand: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
            }
          },
          allowInput: true,
          clickOpens: true
        });
        
        console.log('✅ Flatpickr datepickers initialized');
      } else {
        // Fallback to native date input
        console.warn('Flatpickr not available, using native date input');
        issueDateInput.type = 'date';
        firstDueDateInput.type = 'date';
        issueDateInput.value = new Date().toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Error initializing datepickers:', error);
    }
  }

  // Show installment preview with editable amounts and due dates
  showInstallmentPreview(count) {
    const preview = document.getElementById('installmentPreview');
    const list = document.getElementById('installmentList');
    const totalAmount = parseFloat(document.getElementById('totalAmount').value) || 0;
    const amountPerNote = (totalAmount / count).toFixed(2);
    
    // Get first due date to calculate subsequent dates
    const firstDueDateInput = document.getElementById('firstDueDate');
    const firstDueDateValue = firstDueDateInput.value;
    
    preview.classList.remove('hidden');
    list.innerHTML = '';
    
    for (let i = 1; i <= count; i++) {
      // Calculate due date for this installment (firstDueDate + (i-1) months)
      let defaultDueDate = '';
      if (firstDueDateValue) {
        try {
          // Parse Turkish date format (DD.MM.YYYY)
          const parts = firstDueDateValue.split('.');
          if (parts.length === 3) {
            const baseDate = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
            const installmentDate = new Date(baseDate);
            installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
            defaultDueDate = installmentDate.toLocaleDateString('tr-TR');
          }
        } catch (e) {
          console.warn('Could not parse first due date:', e);
        }
      }
      
      const installmentHtml = `
        <div class="grid grid-cols-12 gap-3 bg-gray-50 p-3 rounded-lg items-center">
          <span class="col-span-2 font-medium text-gray-700">Taksit ${i}:</span>
          <div class="col-span-5 flex items-center gap-2">
            <input type="number" 
                   id="installment_${i}" 
                   step="0.01" 
                   value="${amountPerNote}"
                   class="flex-1 border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500"
                   onchange="promissoryNote.updateInstallmentTotal()">
            <span class="text-gray-500 text-sm">TL</span>
          </div>
          <div class="col-span-5">
            <input type="text" 
                   id="installment_due_${i}" 
                   value="${defaultDueDate}"
                   placeholder="Vade Tarihi"
                   class="flatpickr-installment w-full border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer"
                   data-installment="${i}">
          </div>
        </div>
      `;
      list.insertAdjacentHTML('beforeend', installmentHtml);
    }
    
    // Initialize flatpickr for installment due dates
    this.initializeInstallmentDatepickers(count);
    
    this.updateInstallmentTotal();
  }
  
  // Initialize datepickers for installment due dates
  initializeInstallmentDatepickers(count) {
    if (!window.flatpickr) return;
    
    const locale = {
      firstDayOfWeek: 1,
      weekdays: {
        shorthand: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
        longhand: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
      },
      months: {
        shorthand: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
        longhand: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
      }
    };
    
    for (let i = 1; i <= count; i++) {
      const input = document.getElementById(`installment_due_${i}`);
      if (input) {
        window.flatpickr(input, {
          dateFormat: 'd.m.Y',
          locale: locale,
          allowInput: true,
          clickOpens: true
        });
      }
    }
  }

  // Handle sale selection
  onSaleSelected() {
    const saleSelect = document.getElementById('saleSelection');
    const totalAmountInput = document.getElementById('totalAmount');
    
    if (saleSelect && saleSelect.value) {
      const selectedOption = saleSelect.options[saleSelect.selectedIndex];
      const remaining = parseFloat(selectedOption.getAttribute('data-remaining')) || 0;
      
      if (remaining > 0 && totalAmountInput) {
        totalAmountInput.value = remaining.toFixed(2);
        // Trigger installment update
        this.updateInstallmentsFromTotal();
      }
    }
  }

  // Auto-fill installments equally
  autoFillInstallments() {
    const noteCount = parseInt(document.getElementById('noteCount').value) || 1;
    const totalAmount = parseFloat(document.getElementById('totalAmount').value) || 0;
    const amountPerNote = (totalAmount / noteCount).toFixed(2);
    
    for (let i = 1; i <= noteCount; i++) {
      const input = document.getElementById(`installment_${i}`);
      if (input) {
        input.value = amountPerNote;
      }
    }
    
    this.updateInstallmentTotal();
  }

  // Update installment total
  updateInstallmentTotal() {
    const noteCount = parseInt(document.getElementById('noteCount').value) || 1;
    let total = 0;
    
    for (let i = 1; i <= noteCount; i++) {
      const input = document.getElementById(`installment_${i}`);
      if (input) {
        total += parseFloat(input.value) || 0;
      }
    }
    
    const totalEl = document.getElementById('installmentTotal');
    if (totalEl) {
      totalEl.textContent = total.toFixed(2) + ' TL';
      
      // Update main total amount
      const totalAmountInput = document.getElementById('totalAmount');
      if (totalAmountInput && !totalAmountInput.matches(':focus')) {
        totalAmountInput.value = total.toFixed(2);
      }
    }
  }

  // Update installments from total amount change
  updateInstallmentsFromTotal() {
    const preview = document.getElementById('installmentPreview');
    if (!preview.classList.contains('hidden')) {
      const noteCount = parseInt(document.getElementById('noteCount').value) || 1;
      const totalAmount = parseFloat(document.getElementById('totalAmount').value) || 0;
      const amountPerNote = (totalAmount / noteCount).toFixed(2);
      
      for (let i = 1; i <= noteCount; i++) {
        const input = document.getElementById(`installment_${i}`);
        if (input && !input.matches(':focus')) {
          input.value = amountPerNote;
        }
      }
      
      this.updateInstallmentTotal();
    }
  }

  // Generate promissory note HTML document
  async generate(form) {
    const formData = new FormData(form);
    
    const saleId = formData.get('saleSelection') || null;  // Get selected sale ID
    const noteCount = parseInt(formData.get('noteCount')) || 1;
    const totalAmount = parseFloat(formData.get('totalAmount')) || 0;
    const authorizedCourt = formData.get('authorizedCourt') || 'İstanbul (Çağlayan)';
    
    // Get individual installment amounts
    const installmentAmounts = [];
    for (let i = 1; i <= noteCount; i++) {
      const input = document.getElementById(`installment_${i}`);
      const amount = input ? parseFloat(input.value) || 0 : (totalAmount / noteCount);
      installmentAmounts.push(amount);
    }
    
    const debtorName = formData.get('debtorName');
    const debtorTc = formData.get('debtorTc');
    const debtorAddress = formData.get('debtorAddress');
    const debtorTaxOffice = formData.get('debtorTaxOffice');
    const debtorPhone = formData.get('debtorPhone');
    
    const hasGuarantor = formData.get('hasGuarantor') === 'on';
    const guarantorName = formData.get('guarantorName');
    const guarantorTc = formData.get('guarantorTc');
    const guarantorAddress = formData.get('guarantorAddress');
    const guarantorPhone = formData.get('guarantorPhone');
    
    // Parse dates with validation
    const issueDateStr = formData.get('issueDate');
    const firstDueDateStr = formData.get('firstDueDate');
    
    console.log('📅 Date strings from form:', { issueDateStr, firstDueDateStr });
    
    const issueDate = issueDateStr ? this.parseTurkishDate(issueDateStr) : new Date();
    const firstDueDate = firstDueDateStr ? this.parseTurkishDate(firstDueDateStr) : new Date();
    
    // Validate dates
    if (isNaN(issueDate.getTime())) {
      this.showCustomNotification('❌ Hata', 'Düzenleme tarihi geçersiz', 'error');
      return;
    }
    if (isNaN(firstDueDate.getTime())) {
      this.showCustomNotification('❌ Hata', 'İlk vade tarihi geçersiz', 'error');
      return;
    }
    
    console.log('📅 Parsed dates:', { issueDate, firstDueDate });
    
    // Generate HTML for promissory notes with muacceliyet agreement
    let notesHtml = this.generateNotesHTML({
      noteCount,
      installmentAmounts,
      totalAmount,
      authorizedCourt,
      debtorName,
      debtorTc,
      debtorAddress,
      debtorTaxOffice,
      debtorPhone,
      hasGuarantor,
      guarantorName,
      guarantorTc,
      guarantorAddress,
      guarantorPhone,
      issueDate,
      firstDueDate
    });
    
    const patientId = form.dataset.patientId || '';
    const fileName = `Senet-${debtorName.replace(/\s+/g, '-')}-${Date.now()}.html`;
    
    // Show loading notification immediately
    this.showCustomNotification(
      '⏳ Senet Oluşturuluyor...',
      'Belgeler kaydediliyor, lütfen bekleyin.',
      'info'
    );
    
    try {
      // Save promissory notes to backend database
      await this.savePromissoryNotesToBackend({
        patientId: patientId,
        saleId: saleId,
        noteCount: noteCount,
        installmentAmounts: installmentAmounts,
        totalAmount: totalAmount,
        debtorName: debtorName,
        debtorTc: debtorTc,
        debtorAddress: debtorAddress,
        debtorTaxOffice: debtorTaxOffice,
        debtorPhone: debtorPhone,
        hasGuarantor: hasGuarantor,
        guarantorName: guarantorName,
        guarantorTc: guarantorTc,
        guarantorAddress: guarantorAddress,
        guarantorPhone: guarantorPhone,
        issueDate: issueDate,
        firstDueDate: firstDueDate,
        authorizedCourt: authorizedCourt,
        fileName: fileName
      });
      
      // Save to documents/patient files (await for async operation)
      await this.saveToDocuments(patientId, fileName, notesHtml, {
        type: 'promissory_note',
        noteCount: noteCount,
        totalAmount: totalAmount,
        debtorName: debtorName,
        issueDate: this.formatDate(issueDate),
        authorizedCourt: authorizedCourt,
        saleId: saleId
      });
      
      // Log to timeline (await for async operation)
      await this.logToTimeline(patientId, 'promissory_note_created', {
        noteCount: noteCount,
        totalAmount: totalAmount,
        debtorName: debtorName,
        fileName: fileName,
        issueDate: this.formatDate(issueDate),
        authorizedCourt: authorizedCourt
      });
    } catch (error) {
      console.error('❌ Error saving promissory note:', error);
      this.showCustomNotification(
        '⚠️ Kayıt Hatası',
        'Senet kaydedilemedi, ancak yazdırma devam ediyor. Hata: ' + error.message,
        'warning'
      );
    }
    
    // Open in new window for PDF print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(notesHtml);
    printWindow.document.close();
    
    // Trigger print dialog after load
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
    
    // Show custom success notification
    this.showCustomNotification(
      '✅ Senet Başarıyla Oluşturuldu',
      'Senet belgelere kaydedildi ve PDF yazdırma penceresi açıldı. PDF olarak kaydetmek için "Yazdır > PDF olarak kaydet" seçeneğini kullanın.',
      'success'
    );
    
    // Close modal immediately, don't wait for everything
    this.closeModal();
  }

  // Generate HTML document with all notes
  generateNotesHTML(data) {
    const { noteCount, installmentAmounts, totalAmount, authorizedCourt, debtorName, debtorTc, debtorAddress, debtorTaxOffice, 
            debtorPhone, hasGuarantor, guarantorName, guarantorTc, guarantorAddress, 
            guarantorPhone, issueDate, firstDueDate } = data;

    const creditorName = 'ÖZMEN TIBBİ CİHAZLAR İÇ VE DIŞ TİCARET SANAYİ LİMİTED ŞİRKETİ';

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Senet ve Muacceliyet Sözleşmesi - ${debtorName}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.4;
            margin: 0;
            padding: 0;
          }
          .page {
            page-break-after: always;
            padding: 20px;
          }
          .contract-title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            margin: 20px 0;
          }
          .contract-date {
            text-align: left;
            margin-bottom: 20px;
          }
          .contract-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 10pt;
          }
          .contract-table th,
          .contract-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
          }
          .contract-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .contract-text {
            text-align: justify;
            line-height: 1.8;
            margin: 15px 0;
          }
          .contract-signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
          }
          .signature-box {
            text-align: center;
          }
          .note {
            border: 2px solid #000;
            padding: 10px;
            margin-bottom: 10px;
            height: 125mm;
            position: relative;
            box-sizing: border-box;
          }
          .note:last-child {
            margin-bottom: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
            margin-bottom: 10px;
            font-weight: bold;
            font-size: 10pt;
          }
          .header-item {
            text-align: center;
          }
          .amount-box {
            display: inline-block;
            border: 1px solid #000;
            padding: 2px 8px;
            margin: 0 2px;
            min-width: 70px;
            text-align: center;
            font-size: 10pt;
          }
          .content {
            text-align: justify;
            margin: 10px 0;
            line-height: 1.4;
            font-size: 10pt;
          }
          .signature-section {
            margin-top: 15px;
          }
          .signature-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 9pt;
          }
          .signature-field {
            flex: 1;
          }
          .signature-label {
            font-weight: bold;
            margin-right: 8px;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .page-break { page-break-after: always; }
          }
        </style>
      </head>
      <body>
    `;
    
    // Muacceliyet ve Yetki Sözleşmesi
    html += `
      <div class="page">
        <div class="contract-date">${this.formatDate(issueDate)}</div>
        <div class="contract-title">MUACCELİYET ve YETKİ SÖZLEŞMESİ</div>
        <div class="contract-text">Taraflar aşağıdaki hususlarda anlaşmışlardır.</div>
        
        <table class="contract-table">
          <thead>
            <tr>
              <th>SENET NO</th>
              <th>TANZİM TARİHİ</th>
              <th>ALACAKLI</th>
              <th>BORÇLU</th>
              <th>VADE</th>
              <th>TUTAR</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Senet listesi tablosu
    for (let i = 0; i < noteCount; i++) {
      const noteNumber = i + 1;
      const dueDate = new Date(firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      const amount = installmentAmounts[i] || 0;
      
      html += `
            <tr>
              <td>${noteNumber}</td>
              <td>${this.formatDate(issueDate)}</td>
              <td>${creditorName}</td>
              <td>${debtorName}</td>
              <td>${this.formatDate(dueDate)}</td>
              <td>${amount.toFixed(2)} TL</td>
            </tr>
      `;
    }
    
    html += `
            <tr style="font-weight: bold;">
              <td colspan="2">TOPLAM</td>
              <td>${creditorName}</td>
              <td>${debtorName}</td>
              <td></td>
              <td>${totalAmount.toFixed(2)} TL</td>
            </tr>
          </tbody>
        </table>
        
        <div class="contract-text">
          İş bu muacceliyet sözleşmesinin tarafları yukarıda yazılı bulunan senetlerden herhangi birinin 
          vadesinde ödenmemesi halinde vadesi gelmemiş diğer senetlerin de herhangi bir hükme, ihbara ve 
          ihtara gerek kalmaksızın muacceliyet kesbedeceğini kabul beyan ve taahhüt etmişlerdir.
        </div>
        
        <div class="contract-text">
          Taraflar ayrıca, vadesi geçen senet sonrasında vadesi henüz gelmeyen senetler muacceliyet 
          kesbedeceğinden tüm senetlerle ilgili olarak Alacaklı tarafın icra takibi ve ihtiyati haciz 
          başta olmak üzere her türlü yasal işlem başlatabileceğini de kabul, beyan ve taahhüt ederler. 
          Ayrıca yukarıda dökümü yapılan senetler ve muacceliyet sözleşmesi ile ilgili olarak 
          <strong>${authorizedCourt}</strong> İcra Daireleri ile Mahkemelerinin yetkili olduğu 
          taraflarca şimdiden kabul beyan ve taahhüt edilmiştir.
        </div>
        
        <div class="contract-text">
          Taraflar yukarıdaki şartlar dahilinde hazırlanan sözleşmeyi okuduklarını, hür ve gerçek 
          iradelerine uygun olduğunu tespit ettikten sonra sözleşmeyi birlikte imza altına almıştır.
        </div>
        
        <div class="contract-signatures">
          <div class="signature-box">
            <div>Alacaklı</div>
            <div style="margin-top: 60px; border-top: 1px solid #000; padding-top: 5px;">
              ${creditorName}
            </div>
          </div>
          <div class="signature-box">
            <div>Borçlu</div>
            <div style="margin-top: 60px; border-top: 1px solid #000; padding-top: 5px;">
              ${debtorName}
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Generate notes in pairs (2 per page)
    for (let i = 0; i < noteCount; i++) {
      const noteNumber = i + 1;
      const dueDate = new Date(firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      const amount = installmentAmounts[i] || 0;
      const lira = Math.floor(amount);
      const kurus = Math.round((amount - lira) * 100);
      const amountText = this.numberToText(lira) + ' TÜRKLİRASI';
      
      // Start new page every 2 notes
      if (i % 2 === 0) {
        if (i > 0) html += '</div>'; // Close previous page
        html += '<div class="page">';
      }
      
      html += this.generateSingleNote({
        noteNumber,
        dueDate,
        lira,
        kurus,
        amountText,
        debtorName,
        debtorTc,
        debtorAddress,
        debtorTaxOffice,
        debtorPhone,
        hasGuarantor,
        guarantorName,
        guarantorTc,
        guarantorAddress,
        guarantorPhone,
        issueDate
      });
    }
    
    html += `
        </div>
      </body>
      </html>
    `;
    
    return html;
  }

  // Generate single promissory note HTML
  generateSingleNote(data) {
    const { noteNumber, dueDate, lira, kurus, amountText, debtorName, debtorTc, 
            debtorAddress, debtorTaxOffice, debtorPhone, hasGuarantor, guarantorName, 
            guarantorTc, guarantorAddress, guarantorPhone, issueDate } = data;

    return `
      <div class="note">
        <div class="header">
          <div class="header-item">
            <div>TEDİYE TARİHİ</div>
            <div>${this.formatDate(dueDate)}</div>
          </div>
          <div class="header-item">
            <div>TÜRK LİRASI</div>
            <div class="amount-box">${lira.toLocaleString('tr-TR')}</div>
          </div>
          <div class="header-item">
            <div>KURUŞ</div>
            <div class="amount-box">${kurus.toString().padStart(2, '0')}</div>
          </div>
          <div class="header-item">
            <div>NO</div>
            <div class="amount-box">${noteNumber}</div>
          </div>
        </div>
        
        <div class="content">
          İş bu emre muharrer senedimin mukabilinde ${this.formatDate(dueDate)} tarihinde 
          <strong>ÖZMEN TIBBİ CİHAZLAR İÇ VE DIŞ TİCARET SANAYİ LİMİTED ŞİRKETİ</strong> veya 
          emrühavalesine yukarıda yazılı yalnız <strong>${amountText}</strong> 'yı kayıtsız şartsız ödeyeceğim. 
          Bedeli malen ahzolunmuştur. İş bu bono vadesinde ödenmediği taktirde, müteakip bonoların da 
          muacceliyet kesbedeceğini, ihtilaf vukuunda <strong>DÜZCE</strong> mahkeme ve icralarının 
          selahiyetini şimdiden kabul eylerim.
        </div>
        
        <div class="signature-section">
          <div class="signature-row">
            <div class="signature-field">
              <span class="signature-label">İsim:</span> ${debtorName}
            </div>
            <div class="signature-field" style="text-align: right;">
              <span class="signature-label">Düzenleme Tarihi:</span> ${this.formatDate(issueDate)}
            </div>
          </div>
          <div class="signature-row">
            <div class="signature-field">
              <span class="signature-label">Adres:</span> ${debtorAddress}
            </div>
          </div>
          <div class="signature-row">
            <div class="signature-field">
              <span class="signature-label">T.C. Kimlik No:</span> ${debtorTc}
            </div>
            <div class="signature-field">
              <span class="signature-label">V.D:</span> ${debtorTaxOffice || 'OSMANGAZİ'}
            </div>
          </div>
          ${debtorPhone ? `<div class="signature-row"><div class="signature-field"><span class="signature-label">Telefon:</span> ${debtorPhone}</div></div>` : ''}
          
          ${hasGuarantor ? `
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ccc;">
            <div class="signature-row">
              <div class="signature-field">
                <span class="signature-label">Kefil Adı-Soyadı:</span> ${guarantorName || ''}
              </div>
              <div class="signature-field" style="text-align: right;">
                <span class="signature-label">İmza:</span> _______________
              </div>
            </div>
            <div class="signature-row">
              <div class="signature-field">
                <span class="signature-label">Adres:</span> ${guarantorAddress || ''}
              </div>
            </div>
            <div class="signature-row">
              <div class="signature-field">
                <span class="signature-label">T.C. Kimlik No:</span> ${guarantorTc || ''}
              </div>
            </div>
            ${guarantorPhone ? `<div class="signature-row"><div class="signature-field"><span class="signature-label">Telefon:</span> ${guarantorPhone}</div></div>` : ''}
          </div>
          ` : ''}
          
          <div style="margin-top: 25px; text-align: right;">
            <span class="signature-label">Borçlu İmza:</span> _______________
          </div>
        </div>
      </div>
    `;
  }

  // Helper: Convert number to Turkish text
  numberToText(num) {
    const ones = ['', 'BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ'];
    const tens = ['', 'ON', 'YİRMİ', 'OTUZ', 'KIRK', 'ELLİ', 'ALTMIŞ', 'YETMİŞ', 'SEKSEN', 'DOKSAN'];
    const hundreds = ['', 'YÜZ', 'İKİYÜZ', 'ÜÇYÜZ', 'DÖRTYÜZ', 'BEŞYÜZ', 'ALTIYÜZ', 'YEDİYÜZ', 'SEKİZYÜZ', 'DOKUZYÜZ'];
    
    if (num === 0) return 'SIFIR';
    if (num < 10) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return hundreds[Math.floor(num / 100)] + (num % 100 ? ' ' + this.numberToText(num % 100) : '');
    if (num < 1000000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      return (thousands === 1 ? 'BİN' : this.numberToText(thousands) + ' BİN') + (remainder ? ' ' + this.numberToText(remainder) : '');
    }
    return num.toString(); // Fallback for very large numbers
  }

  // Show custom notification with modern design
  showCustomNotification(title, message, type = 'success') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.promissory-notification');
    existing.forEach(el => el.remove());

    // Icon and color based on type
    const config = {
      success: {
        icon: 'fa-check-circle',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600',
        titleColor: 'text-green-900',
        textColor: 'text-green-700'
      },
      info: {
        icon: 'fa-info-circle',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        titleColor: 'text-blue-900',
        textColor: 'text-blue-700'
      },
      error: {
        icon: 'fa-exclamation-circle',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600',
        titleColor: 'text-red-900',
        textColor: 'text-red-700'
      }
    };

    const style = config[type] || config.success;

    const notificationHtml = `
      <div class="promissory-notification fixed top-4 right-4 z-[9999] max-w-md animate-slide-in">
        <div class="${style.bgColor} ${style.borderColor} border-l-4 rounded-lg shadow-lg p-4">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
              <i class="fas ${style.icon} ${style.iconColor} text-xl"></i>
            </div>
            <div class="flex-1">
              <h4 class="font-semibold ${style.titleColor} mb-1">${title}</h4>
              <p class="text-sm ${style.textColor}">${message}</p>
            </div>
            <button onclick="this.closest('.promissory-notification').remove()" 
                    class="flex-shrink-0 ${style.iconColor} hover:opacity-70">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
      <style>
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      </style>
    `;

    document.body.insertAdjacentHTML('beforeend', notificationHtml);

    // Auto-remove after 8 seconds
    setTimeout(() => {
      const notification = document.querySelector('.promissory-notification');
      if (notification) {
        notification.style.animation = 'slide-in 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 8000);
  }

  // Helper: Show error notification
  showError(message) {
    this.showCustomNotification('❌ Hata', message, 'error');
  }

  // Helper: Show success notification (kept for backward compatibility)
  showSuccess(message) {
    this.showCustomNotification('✅ Başarılı', message, 'success');
  }

  // Helper: Format date
  formatDate(date) {
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // Helper: Parse Turkish date format (DD.MM.YYYY) to Date object
  parseTurkishDate(dateStr) {
    if (!dateStr) return null;
    
    // Handle DD.MM.YYYY format
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JavaScript
      const year = parseInt(parts[2], 10);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    
    // Fallback to standard Date parsing
    return new Date(dateStr);
  }

  // Helper: Fetch patient sales from API
  async fetchPatientSalesFromAPI(patientId) {
    try {
      if (!window.salesGetPatientSales) {
        console.warn('⚠️ salesGetPatientSales not available on window');
        throw new Error('salesGetPatientSales not available');
      }
      
      const response = await window.salesGetPatientSales(patientId);
      if (response.status === 200) {
        return response.data.data || response.data || [];
      } else {
        throw new Error('Failed to fetch sales');
      }
    } catch (error) {
      console.warn('Failed to fetch sales from API, trying localStorage:', error);
      return this.getPatientSalesFromLocalStorage(patientId);
    }
  }

  // Helper: Get patient sales from localStorage (fallback)
  getPatientSalesFromLocalStorage(patientId) {
    try {
      const salesData = localStorage.getItem('salesData');
      const allSales = salesData ? JSON.parse(salesData) : [];
      return allSales.filter(sale => sale.patientId === patientId);
    } catch (e) {
      console.error('Error loading patient sales:', e);
      return [];
    }
  }

  // Helper: Normalize patient object
  normalizePatientObject(patient) {
    if (!patient) return patient;
    try {
      if (typeof window !== 'undefined' && window.CanonicalizePatient && typeof window.CanonicalizePatient.canonicalizePatient === 'function') {
        return window.CanonicalizePatient.canonicalizePatient(patient) || patient;
      }
    } catch (e) {
      console.warn('PromissoryNoteComponent: canonicalizer failed', e);
    }
    const p = Object.assign({}, patient);
    p.identityNumber = p.identityNumber || p.identity_number || p.tcNumber || p.tc || null;
    if (p.dob && p.dob.indexOf && p.dob.indexOf('T') !== -1) p.dob = p.dob.split('T')[0];
    p.name = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
    p.tcNumber = p.tcNumber || p.tc || p.identityNumber || null;
    return p;
  }

  // Helper: Close modal
  closeModal() {
    const modal = document.getElementById('promissoryNoteModal');
    if (modal) {
      modal.remove();
    }
  }

  // Save document to patient files
  async saveToDocuments(patientId, fileName, content, metadata = {}) {
    console.log('📄 saveToDocuments called:', { patientId, fileName, contentLength: content.length });
    
    const document = {
      id: 'DOC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      patientId: patientId,
      fileName: fileName,
      content: content,
      metadata: metadata,
      type: 'promissory_note',
      originalName: fileName,
      mimeType: 'text/html',
      size: content.length,
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: 'current_user',
      status: 'completed'
    };

    // Try API first
    const apiSaved = await this.saveDocumentViaAPI(patientId, document);
    
    // Always save to localStorage as backup/fallback
    this.saveDocumentToLocalStorage(patientId, document);
    
    if (apiSaved) {
      console.log('✅ Document saved via API + localStorage backup');
    } else {
      console.log('✅ Document saved to localStorage (API unavailable)');
    }
    
    // Trigger UI refresh
    this.triggerDocumentRefresh(patientId, document);
  }

  // Save via API
  async saveDocumentViaAPI(patientId, document) {
    try {
      if (!window.documentsAddPatientDocument) {
        console.warn('⚠️ documentsAddPatientDocument not available on window');
        return false;
      }
      
      const response = await window.documentsAddPatientDocument(patientId, document);
      
      if (response.status === 200 || response.status === 201) {
        console.log('✅ API save successful:', response.data);
        return true;
      } else {
        console.warn('⚠️ API save failed with status:', response.status);
        return false;
      }
    } catch (error) {
      console.warn('⚠️ API not available:', error.message);
      return false;
    }
  }

  // Save to localStorage
  saveDocumentToLocalStorage(patientId, document) {
    try {
      // Document object already passed from saveToDocuments

      // Save to general patient_documents structure (used by document management)
      let patientDocs = JSON.parse(localStorage.getItem('patient_documents') || '{}');
      if (!patientDocs[patientId]) {
        patientDocs[patientId] = [];
      }
      patientDocs[patientId].push(document);
      localStorage.setItem('patient_documents', JSON.stringify(patientDocs));

      // Also save to patient-specific storage (array format, not object)
      let patientSpecificDocs = JSON.parse(localStorage.getItem(`patient_documents_${patientId}`) || '[]');
      if (!Array.isArray(patientSpecificDocs)) {
        patientSpecificDocs = [];
      }
      patientSpecificDocs.push(document);
      localStorage.setItem(`patient_documents_${patientId}`, JSON.stringify(patientSpecificDocs));

      // Also add to global documents index
      let allDocs = JSON.parse(localStorage.getItem('all_documents') || '[]');
      allDocs.push({
        id: document.id,
        patientId: patientId,
        fileName: document.fileName,
        type: 'promissory_note',
        createdAt: document.createdAt
      });
      localStorage.setItem('all_documents', JSON.stringify(allDocs));

      console.log('✅ Document saved to all storage locations:', document.fileName);
      console.log('📁 Storage keys updated:', {
        patient_documents: `${patientDocs[patientId].length} docs`,
        patient_specific: `${patientSpecificDocs.length} docs`,
        all_documents: `${allDocs.length} docs`
      });
    } catch (error) {
      console.error('❌ Error saving document to localStorage:', error);
      throw error;
    }
  }
  
  // Trigger document refresh in UI
  triggerDocumentRefresh(patientId, document) {
    try {
      // Dispatch event for document management component
      window.dispatchEvent(new CustomEvent('documentsUpdated', {
        detail: { patientId: patientId, document: document }
      }));
      
      // If we have access to patient tab content, trigger re-render
      if (window.patientTabContent && window.patientDetailsManager) {
        console.log('🔄 Triggering patient tab content refresh...');
        // Force re-render by switching away and back, or just force refresh
        setTimeout(async () => {
          if (window.patientTabContent.activeTab === 'documents') {
            // Reload patient data from API and re-render
            const currentPatient = window.patientDetailsManager.getCurrentPatient();
            if (currentPatient && currentPatient.id === patientId) {
              console.log('🔄 Reloading patient data and refreshing documents tab...');
              await window.patientDetailsManager.loadPatient(patientId);
            }
          }
        }, 800); // Wait for API to complete
      }
      
      console.log('✅ Document refresh triggered for UI');
    } catch (error) {
      console.warn('⚠️ Could not trigger UI refresh:', error);
    }
  }

  // Log to patient timeline
  async logToTimeline(patientId, eventType, details = {}) {
    console.log('⏰ logToTimeline called:', { patientId, eventType, details });
    
    const timelineEvent = {
      id: 'TL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      patientId: patientId,
      type: eventType,
      title: 'Senet Oluşturuldu',
      description: `${details.noteCount} adet senet oluşturuldu. Toplam tutar: ${details.totalAmount} TL`,
      details: details,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('tr-TR'),
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      user: 'current_user',
      icon: 'fa-file-invoice',
      color: 'blue',
      category: 'document'
    };

    // Try API first
    const apiSaved = await this.saveTimelineViaAPI(patientId, timelineEvent);
    
    // Always save to localStorage as backup/fallback
    this.saveTimelineToLocalStorage(patientId, timelineEvent, eventType, details);
    
    if (apiSaved) {
      console.log('✅ Timeline logged via API + localStorage backup');
    } else {
      console.log('✅ Timeline logged to localStorage (API unavailable)');
    }
    
    // Trigger UI refresh
    this.triggerTimelineRefresh(patientId, timelineEvent);
  }

  // Save timeline via API
  async saveTimelineViaAPI(patientId, timelineEvent) {
    try {
      if (!window.timelineAddTimelineEvent) {
        console.warn('⚠️ timelineAddTimelineEvent not available on window');
        return false;
      }
      
      const response = await window.timelineAddTimelineEvent(patientId, timelineEvent);
      
      if (response.status === 200 || response.status === 201) {
        console.log('✅ Timeline API save successful:', response.data);
        return true;
      } else {
        console.warn('⚠️ Timeline API save failed with status:', response.status);
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Timeline API not available:', error.message);
      return false;
    }
  }

  // Save timeline to localStorage
  saveTimelineToLocalStorage(patientId, timelineEvent, eventType, details) {
    try {
      // Save to patient-specific timeline
      let timeline = JSON.parse(localStorage.getItem(`patient_timeline_${patientId}`) || '[]');
      timeline.unshift(timelineEvent); // Add to beginning (most recent first)
      localStorage.setItem(`patient_timeline_${patientId}`, JSON.stringify(timeline));

      // Save to general timeline structure
      let generalTimeline = JSON.parse(localStorage.getItem('patient_timeline') || '{}');
      if (!generalTimeline[patientId]) {
        generalTimeline[patientId] = [];
      }
      generalTimeline[patientId].unshift(timelineEvent);
      localStorage.setItem('patient_timeline', JSON.stringify(generalTimeline));

      // Also save to activity logs for backward compatibility
      let activityLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
      activityLogs.push({
        id: timelineEvent.id,
        patientId: patientId,
        type: eventType,
        details: details,
        timestamp: timelineEvent.timestamp,
        user: 'current_user'
      });

      // Keep only last 1000 activities
      if (activityLogs.length > 1000) {
        activityLogs = activityLogs.slice(-1000);
      }

      localStorage.setItem('activityLogs', JSON.stringify(activityLogs));

      console.log('✅ Timeline event logged to all locations:', eventType);
      console.log('📊 Timeline storage:', {
        patient_timeline_specific: timeline.length + ' events',
        patient_timeline_general: generalTimeline[patientId].length + ' events',
        activityLogs: activityLogs.length + ' activities'
      });
    } catch (error) {
      console.error('❌ Error logging to timeline (localStorage):', error);
      throw error;
    }
  }
  
  // Save promissory notes to backend
  async savePromissoryNotesToBackend(data) {
    try {
      const notes = [];
      
      // Validate and parse dates
      const issueDate = data.issueDate instanceof Date ? data.issueDate : new Date(data.issueDate);
      const firstDueDate = data.firstDueDate instanceof Date ? data.firstDueDate : new Date(data.firstDueDate);
      
      // Check if dates are valid
      if (isNaN(issueDate.getTime())) {
        console.error('❌ Invalid issue date:', data.issueDate);
        throw new Error('Invalid issue date');
      }
      if (isNaN(firstDueDate.getTime())) {
        console.error('❌ Invalid first due date:', data.firstDueDate);
        throw new Error('Invalid first due date');
      }
      
      for (let i = 0; i < data.noteCount; i++) {
        const dueDate = new Date(firstDueDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        notes.push({
          note_number: i + 1,
          amount: data.installmentAmounts[i],
          issue_date: issueDate.toISOString(),
          due_date: dueDate.toISOString(),
          debtor_name: data.debtorName,
          debtor_tc: data.debtorTc,
          debtor_address: data.debtorAddress,
          debtor_tax_office: data.debtorTaxOffice,
          debtor_phone: data.debtorPhone,
          has_guarantor: data.hasGuarantor,
          guarantor_name: data.guarantorName,
          guarantor_tc: data.guarantorTc,
          guarantor_address: data.guarantorAddress,
          guarantor_phone: data.guarantorPhone,
          authorized_court: data.authorizedCourt,
          file_name: data.fileName
        });
      }
      
      const payload = {
        patient_id: data.patientId,
        sale_id: data.saleId,
        total_amount: data.totalAmount,
        notes: notes
      };
      
      console.log('📤 Saving promissory notes to backend:', payload);
      
      if (!window.paymentsCreatePromissoryNotes) {
        console.warn('⚠️ paymentsCreatePromissoryNotes not available on window');
        return null;
      }
      
      const response = await window.paymentsCreatePromissoryNotes(payload);
      
      if (response.status === 200 || response.status === 201) {
        console.log('✅ Promissory notes saved to backend:', response.data);
        return response.data;
      } else {
        throw new Error('Failed to save promissory notes');
      }
    } catch (error) {
      console.error('❌ Error saving promissory notes to backend:', error);
      // Don't throw - allow the process to continue even if backend save fails
      return null;
    }
  }

  // Trigger timeline refresh in UI
  triggerTimelineRefresh(patientId, timelineEvent) {
    try {
      // Dispatch events for UI refresh
      window.dispatchEvent(new CustomEvent('patientTimelineUpdated', {
        detail: { patientId: patientId, event: timelineEvent }
      }));

      window.dispatchEvent(new CustomEvent('activityLogged', {
        detail: { patientId: patientId, activity: timelineEvent }
      }));
      
      // If we have access to patient tab content, trigger re-render
      if (window.patientTabContent) {
        console.log('🔄 Triggering timeline tab refresh...');
        // Force re-render of timeline tab
        setTimeout(() => {
          if (window.patientTabContent.activeTab === 'timeline') {
            window.patientTabContent.switchTab('timeline');
          }
        }, 500);
      }
      
      console.log('✅ Timeline refresh triggered for UI');
    } catch (error) {
      console.warn('⚠️ Could not trigger timeline UI refresh:', error);
    }
  }
}

// Export for global access
window.PromissoryNoteComponent = PromissoryNoteComponent;
