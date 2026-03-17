/**
 * Sales Form Module
 * Handles product sale form with SGK, pricing, and payment options
 */
export class SalesFormModule {
  constructor(apiClient) {
    this.apiClient = apiClient;
    
    // Initialize fuzzy search utility
    this.fuzzySearch = new FuzzySearchUtil({
      threshold: 0.6,
      maxDistance: 3,
      caseSensitive: false,
      includeScore: true,
      minLength: 1
    });
  }

  /**
   * Get user-friendly category display name
   */
  getCategoryDisplayName(category) {
    const categoryMap = {
      'hearing_aid': 'İşitme Cihazı',
      'aksesuar': 'Aksesuar', 
      'pil': 'Pil',
      'bakim': 'Bakım',
      'accessory': 'Aksesuar',
      'battery': 'Pil',
      'maintenance': 'Bakım',
      'ear_mold': 'Kulak Kalıbı',
      'device': 'Cihaz'
    };
    return categoryMap[category] || category || 'Kategori belirtilmemiş';
  }

  /**
   * Open sales modal for a patient
   */
  async openSalesModal(patientId) {
    try {
      // Fetch all available inventory items (not just hearing aids)
      const inventoryItems = await this.fetchAllInventoryItems();
      const pricingSettings = await this.fetchPricingSettings();

      if (!inventoryItems || inventoryItems.length === 0) {
        this.showToast('Satış için uygun ürün bulunamadı', 'warning');
        return;
      }

      const modal = document.createElement('div');
      modal.id = 'salesModal';
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-2xl font-bold text-gray-900">Ürün Satışı</h2>
              <button onclick="this.closest('#salesModal').remove()" 
                      class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-2xl"></i>
              </button>
            </div>

            <form id="sales-form" class="space-y-6">
              <!-- Product Selection -->
              <div class="relative">
                <label class="block text-sm font-medium text-gray-700 mb-2">Ürün Seçimi</label>
                <input type="text" 
                       id="product-search" 
                       name="product_search" 
                       placeholder="Ürün ara (marka, model, kategori)..." 
                       autocomplete="off"
                       class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <input type="hidden" id="product-select" name="product_id" required>
                
                <!-- Search Results Dropdown -->
                <div id="product-dropdown" class="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto hidden">
                  <div id="product-results" class="py-1">
                    <!-- Search results will be populated here -->
                  </div>
                  <div id="no-results" class="px-3 py-2 text-gray-500 text-sm hidden">
                    Ürün bulunamadı
                  </div>
                </div>
              </div>

              <!-- Product Details -->
              <div id="product-details" class="bg-gray-50 p-4 rounded-lg hidden">
                <h3 class="text-sm font-medium text-gray-900 mb-3">Ürün Detayları</h3>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="text-gray-600">Marka:</span>
                    <span id="product-brand" class="font-medium ml-2"></span>
                  </div>
                  <div>
                    <span class="text-gray-600">Model:</span>
                    <span id="product-model" class="font-medium ml-2"></span>
                  </div>
                  <div>
                    <span class="text-gray-600">Kategori:</span>
                    <span id="product-category" class="font-medium ml-2"></span>
                  </div>
                  <div>
                    <span class="text-gray-600">Fiyat:</span>
                    <span id="product-price" class="font-medium ml-2 text-blue-600"></span>
                  </div>
                  <div>
                    <span class="text-gray-600">KDV (%):</span>
                    <span id="product-kdv" class="font-medium ml-2 text-green-600"></span>
                  </div>
                  <div>
                    <span class="text-gray-600">KDV Dahil Fiyat:</span>
                    <span id="product-price-incl" class="font-medium ml-2 text-blue-600"></span>
                  </div>
                  <div>
                    <span class="text-gray-600">Stok:</span>
                    <span id="product-stock" class="font-medium ml-2"></span>
                  </div>
                  <div>
                    <span class="text-gray-600">Seri No:</span>
                    <span id="product-serial" class="font-medium ml-2"></span>
                  </div>
                  <div class="col-span-2">
                    <span class="text-gray-600">Barkod:</span>
                    <span id="product-barcode" class="font-medium ml-2 font-mono text-xs"></span>
                  </div>
                </div>
              </div>

              <!-- Payment Options -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">Ödeme Yöntemi</label>
                <div class="grid grid-cols-3 gap-3">
                  <button type="button" id="payment-cash" data-payment="cash" 
                          class="payment-method-btn active flex flex-col items-center justify-center p-4 border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all">
                    <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    <span class="text-sm font-medium">Peşin</span>
                  </button>
                  
                  <button type="button" id="payment-card" data-payment="card" 
                          class="payment-method-btn flex flex-col items-center justify-center p-4 border-2 border-gray-300 bg-white text-gray-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
                    <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                    </svg>
                    <span class="text-sm font-medium">Kartla Ödeme</span>
                  </button>
                  
                  <button type="button" id="payment-transfer" data-payment="transfer" 
                          class="payment-method-btn flex flex-col items-center justify-center p-4 border-2 border-gray-300 bg-white text-gray-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
                    <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                    </svg>
                    <span class="text-sm font-medium">Havale</span>
                  </button>
                </div>
                <input type="hidden" id="payment-type" name="payment_type" value="cash">
              </div>

              <!-- Discount -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">İndirim (TL)</label>
                <input type="number" id="discount-amount" name="discount" 
                       min="0" step="0.01" value="0"
                       class="w-full border border-gray-300 rounded px-3 py-2">
              </div>

              <!-- Pricing Preview -->
              <div id="pricing-preview" class="bg-gray-50 p-4 rounded-lg hidden">
                <h3 class="text-sm font-medium text-gray-900 mb-3">Fiyat Özeti</h3>
                <div id="pricing-details" class="space-y-2 text-sm"></div>
              </div>

              <!-- Sale Notes -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Satış Notları</label>
                <textarea id="sale-notes" name="notes" rows="3" 
                          class="w-full border border-gray-300 rounded-lg px-3 py-2" 
                          placeholder="Satış ile ilgili notlar..."></textarea>
              </div>

              <!-- Action Buttons -->
              <div class="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onclick="this.closest('#salesModal').remove()" 
                        class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  İptal
                </button>
                <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <i class="fas fa-check mr-2"></i>Satışı Tamamla
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Setup event listeners
      this.setupSalesForm(patientId);

    } catch (error) {
      console.error('Failed to open sales modal:', error);
      this.showToast('Cihaz satış formu açılamadı', 'error');
    }
  }

  /**
   * Setup sales form event listeners
   */
  setupSalesForm(patientId) {
    const form = document.getElementById('sales-form');
    const productSelect = document.getElementById('product-select');
    const productSearch = document.getElementById('product-search');
    const productDropdown = document.getElementById('product-dropdown');
    const sgkStatus = document.getElementById('sgk-status');
    const sgkAmount = document.getElementById('sgk-amount');
    const discountAmount = document.getElementById('discount-amount');
    const paymentCash = document.getElementById('payment-cash');
    // Removed references to payment-installment and installment-options as they were removed from HTML

    // Store all inventory items for searching
    this.allInventoryItems = [];
    this.fetchAllInventoryItems().then(items => {
      this.allInventoryItems = items || [];
    });

    // Product search functionality
    let searchTimeout;
    let selectedIndex = -1;
    
    productSearch.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      selectedIndex = -1; // Reset selection
      
      if (query.length === 0) {
        productDropdown.classList.add('hidden');
        return;
      }

      // Debounce search to avoid too many operations
      searchTimeout = setTimeout(() => {
        this.searchProducts(query);
      }, 300);
    });

    // Keyboard navigation for search results
    productSearch.addEventListener('keydown', (e) => {
      const productResults = document.getElementById('product-results');
      const resultItems = productResults.querySelectorAll('.search-result-item');
      
      if (resultItems.length === 0) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, resultItems.length - 1);
          this.updateSelectedResult(resultItems, selectedIndex);
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, -1);
          this.updateSelectedResult(resultItems, selectedIndex);
          break;
          
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
            resultItems[selectedIndex].click();
          }
          break;
          
        case 'Escape':
          productDropdown.classList.add('hidden');
          selectedIndex = -1;
          break;
      }
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.relative')) {
        productDropdown.classList.add('hidden');
      }
    });

    // Show product details when product is selected
    productSelect.addEventListener('change', () => {
      this.updateProductDetails();
      this.updatePricingPreview();
    });

    // Removed installment-related event listeners as those elements were removed

    // Update pricing on changes
    [productSelect, discountAmount].forEach(element => {
      element.addEventListener('change', () => this.updatePricingPreview());
      element.addEventListener('input', () => this.updatePricingPreview());
    });

    // Add event listener for discount changes
    const discountInput = document.getElementById('discount-amount');
    if (discountInput) {
      discountInput.addEventListener('input', () => {
        this.updatePricingPreview();
      });
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSalesSubmit(patientId);
    });
  }

  /**
   * Search products based on query with fuzzy matching
   */
  searchProducts(query) {
    const productResults = document.getElementById('product-results');
    const noResults = document.getElementById('no-results');
    const productDropdown = document.getElementById('product-dropdown');
    
    if (!this.allInventoryItems || this.allInventoryItems.length === 0) {
      return;
    }

    // Use fuzzy search for better matching
    const filteredItems = this.fuzzySearch.search(query, this.allInventoryItems, item => {
      // Search in multiple fields for better coverage
      return [
        item.brand || '',
        item.model || '',
        item.name || '',
        item.category || '',
        item.barcode || '',
        item.serial_number || ''
      ].filter(Boolean).join(' ');
    });

    // Clear previous results
    productResults.innerHTML = '';
    
    if (filteredItems.length === 0) {
      noResults.classList.remove('hidden');
      productResults.classList.add('hidden');
    } else {
      noResults.classList.add('hidden');
      productResults.classList.remove('hidden');
      
      // Limit results to 10 items for performance
      const limitedItems = filteredItems.slice(0, 10);
      
      limitedItems.forEach(item => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0';
        resultItem.innerHTML = `
          <div class="flex justify-between items-center">
            <div>
              <div class="font-medium text-gray-900">${item.brand} ${item.model || item.name}</div>
              <div class="text-sm text-gray-600">${this.getCategoryDisplayName(item.category)}</div>
            </div>
            <div class="text-right">
              <div class="font-medium text-blue-600">${(item.price || 0).toLocaleString('tr-TR')} TL</div>
              <div class="text-xs text-gray-500">Stok: ${item.availableInventory || item.inventory || 0}</div>
            </div>
          </div>
        `;
        
        resultItem.addEventListener('click', () => {
          this.selectProduct(item);
        });
        
        productResults.appendChild(resultItem);
      });
    }
    
    productDropdown.classList.remove('hidden');
  }

  /**
   * Select a product from search results
   */
  selectProduct(item) {
    const productSearch = document.getElementById('product-search');
    const productSelect = document.getElementById('product-select');
    const productDropdown = document.getElementById('product-dropdown');
    
    // Update search input with selected product
    productSearch.value = `${item.brand} ${item.model || item.name}`;
    
    // Set hidden product ID
    productSelect.value = item.id;
    
    // Store product data for later use
    productSelect.dataset.price = item.price || 0;
    productSelect.dataset.brand = item.brand || '';
    productSelect.dataset.model = item.model || item.name || '';
    productSelect.dataset.category = item.category || '';
    productSelect.dataset.name = item.name || '';
    productSelect.dataset.stock = item.availableInventory || item.inventory || 0;
    productSelect.dataset.serial = item.serial_number || '';
    productSelect.dataset.barcode = item.barcode || '';

    // KDV bilgilerini ürün verisinden al, yoksa kategoriye göre varsayılanı kullan
    const categoryLower = (item.category || '').toLowerCase();
    const resolvedKdvRate = (item.kdvRate != null)
      ? Number(item.kdvRate)
      : ((categoryLower === 'hearing_aid' || categoryLower === 'işitme cihazı') ? 0 : 20);
    productSelect.dataset.kdvRate = String(resolvedKdvRate);

    const basePriceNum = Number(item.price || 0);
    const resolvedPriceWithKdv = (item.priceWithKdv != null)
      ? Number(item.priceWithKdv)
      : basePriceNum * (1 + (resolvedKdvRate / 100));
    productSelect.dataset.priceWithKdv = String(resolvedPriceWithKdv);
    
    // Hide dropdown
    productDropdown.classList.add('hidden');
    
    // Update product details and pricing
    this.updateProductDetails();
   this.updatePricingPreview();
  }

  /**
   * Update product details display
   */
   updateProductDetails() {
     const productSelect = document.getElementById('product-select');
     const productDetails = document.getElementById('product-details');
     
     if (productSelect.value) {
       document.getElementById('product-brand').textContent = productSelect.dataset.brand || '-';
       document.getElementById('product-model').textContent = productSelect.dataset.model || '-';
       document.getElementById('product-category').textContent = productSelect.dataset.category || '-';
       document.getElementById('product-price').textContent = parseFloat(productSelect.dataset.price || 0).toLocaleString('tr-TR') + ' TL';
       
       // Display stock with color coding
       const stockElement = document.getElementById('product-stock');
       const stockQuantity = parseInt(productSelect.dataset.stock || 0);
       stockElement.textContent = stockQuantity + ' adet';
       
       // Color code stock levels
       if (stockQuantity === 0) {
         stockElement.className = 'font-medium ml-2 text-red-600';
       } else if (stockQuantity <= 5) {
         stockElement.className = 'font-medium ml-2 text-orange-600';
       } else {
         stockElement.className = 'font-medium ml-2 text-green-600';
       }
       
       document.getElementById('product-serial').textContent = productSelect.dataset.serial || '-';
       document.getElementById('product-barcode').textContent = productSelect.dataset.barcode || '-';
       
       // KDV oranını dataset'ten göster (yoksa kategoriye göre varsayılan)
       let kdvRate = Number(productSelect.dataset.kdvRate);
       if (isNaN(kdvRate)) {
         const category = (productSelect.dataset.category || '').toLowerCase();
         kdvRate = (category === 'hearing_aid' || category === 'işitme cihazı') ? 0 : 20;
       }
       document.getElementById('product-kdv').textContent = `${kdvRate}%`;
      
      // KDV dahil fiyatı dataset'ten göster (yoksa hesapla)
      const priceInclEl = document.getElementById('product-price-incl');
      if (priceInclEl) {
        let priceIncl = Number(productSelect.dataset.priceWithKdv);
        if (isNaN(priceIncl)) {
          const base = Number(productSelect.dataset.price) || 0;
          priceIncl = base * (1 + (kdvRate / 100));
        }
        priceInclEl.textContent = priceIncl.toLocaleString('tr-TR') + ' TL';
      }
       
       productDetails.classList.remove('hidden');
     } else {
       productDetails.classList.add('hidden');
     }
   }

   /**
    * Update selected result for keyboard navigation
    */
   updateSelectedResult(resultItems, selectedIndex) {
     // Remove previous selection
     resultItems.forEach(item => {
       item.classList.remove('bg-blue-100');
     });
     
     // Add selection to current item
     if (selectedIndex >= 0 && selectedIndex < resultItems.length) {
       resultItems[selectedIndex].classList.add('bg-blue-100');
       resultItems[selectedIndex].scrollIntoView({ block: 'nearest' });
     }
   }

  /**
   * Update pricing preview
   */
  updatePricingPreview() {
    const productSelect = document.getElementById('product-select');
    const discountAmount = parseFloat(document.getElementById('discount-amount').value) || 0;

    if (!productSelect || !productSelect.value) {
      const preview = document.getElementById('pricing-preview');
      if (preview) {
        preview.classList.add('hidden');
      }
      return;
    }

    const basePrice = parseFloat(productSelect.dataset.price) || 0;
    const netAmount = Math.max(0, basePrice - discountAmount);
    
    // KDV oranını dataset'ten kullan (yoksa kategoriye göre varsayılan)
    let kdvRate = Number(productSelect.dataset.kdvRate);
    if (isNaN(kdvRate)) {
      const category = (productSelect.dataset.category || '').toLowerCase();
      kdvRate = (category === 'hearing_aid' || category === 'işitme cihazı') ? 0 : 20;
    }
    
    const kdvAmount = (netAmount * kdvRate) / 100;
    const totalWithKdv = netAmount + kdvAmount;

    const preview = document.getElementById('pricing-preview');
    const details = document.getElementById('pricing-details');

    if (!preview || !details) {
      console.warn('Pricing preview elements not found');
      return;
    }

    details.innerHTML = `
      <div class="space-y-2">
        <!-- Discount Section at Top -->
        ${discountAmount > 0 ? `
          <div class="bg-red-50 p-3 rounded-lg border border-red-200">
            <div class="flex justify-between items-center">
              <span class="text-red-700 font-medium">İndirim Uygulandı</span>
              <span class="text-red-700 font-bold">-${discountAmount.toLocaleString('tr-TR')} TL</span>
            </div>
          </div>
        ` : ''}
        
        <!-- Total Amount -->
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div class="flex justify-between items-center mb-3">
            <span class="font-bold text-blue-900 text-lg">Toplam Tutar</span>
            <span class="font-bold text-blue-600 text-xl">${totalWithKdv.toLocaleString('tr-TR')} TL</span>
          </div>
          
          <!-- Components Breakdown -->
          <div class="border-t border-blue-200 pt-3 space-y-1">
            <div class="flex justify-between text-sm text-blue-700">
              <span>Liste Fiyatı:</span>
              <span>${basePrice.toLocaleString('tr-TR')} TL</span>
            </div>
            ${discountAmount > 0 ? `
              <div class="flex justify-between text-sm text-blue-700">
                <span>İndirim:</span>
                <span>-${discountAmount.toLocaleString('tr-TR')} TL</span>
              </div>
            ` : ''}
            <div class="flex justify-between text-sm text-blue-700">
              <span>KDV (%${kdvRate}):</span>
              <span>${kdvAmount.toLocaleString('tr-TR')} TL</span>
            </div>
          </div>
        </div>
      </div>
    `;

    preview.classList.remove('hidden');
  }

  /**
   * Handle sales form submission
   */
  async handleSalesSubmit(patientId) {
    try {
      const form = document.getElementById('sales-form');
      const formData = new FormData(form);

      // Validate required fields
      if (!formData.get('product_id')) {
        this.showToast('Lütfen bir ürün seçin', 'error');
        return;
      }

      // Prepare sale data
      const saleData = {
        patient_id: patientId,
        product_id: formData.get('product_id'),
        discount: parseFloat(formData.get('discount')) || 0,
        payment_type: formData.get('payment_type'),
        notes: formData.get('notes')
      };

      if (saleData.payment_type === 'installment') {
        saleData.installment_count = parseInt(formData.get('installment_count'));
        saleData.interest_rate = parseFloat(formData.get('interest_rate')) || 0;
      }

      // Submit product sale
      const response = await this.apiClient.post(`/api/patients/${patientId}/product-sales`, saleData);

      if (response.success || response.data?.success) {
        this.showToast('Ürün satışı başarıyla tamamlandı', 'success');
        
        // If installment payment, create payment plan
        const saleId = response.data?.sale_id || response.sale_id;
        if (saleData.payment_type === 'installment' && saleId) {
          await this.createPaymentPlan(saleId, saleData);
        }
        
        // Create timeline log if notes exist
        if (saleData.notes && saleData.notes.trim()) {
          await this.createTimelineLog(patientId, saleData.notes, saleId);
        }
        
        // Create sales log for cashflow.html
        await this.createSalesLog(patientId, saleData, saleId);
        
        this.closeModal('salesModal');
        
        // Refresh patient data
        if (window.patientDetailsComponent) {
          window.patientDetailsComponent.loadPatientData();
        }
        
        // Refresh sales table
        if (window.salesManagement && window.salesManagement.refreshSalesTable) {
          window.salesManagement.refreshSalesTable(patientId);
        }
      } else {
        throw new Error(response.error || 'Satış tamamlanamadı');
      }
    } catch (error) {
      console.error('Product sale failed:', error);
      this.showToast('Satış tamamlanamadı: ' + error.message, 'error');
    }
  }

  /**
   * Create payment plan for installment sales
   */
  async createPaymentPlan(saleId, saleData) {
    try {
      const planData = {
        installment_count: saleData.installment_count,
        interest_rate: saleData.interest_rate,
        start_date: new Date().toISOString().split('T')[0]
      };

      await this.apiClient.post(`/api/sales/${saleId}/payment-plan`, planData);
      this.showToast('Taksit planı oluşturuldu', 'success');
    } catch (error) {
      console.error('Error creating payment plan:', error);
      this.showToast('Taksit planı oluşturulurken hata oluştu', 'warning');
    }
  }

  /**
   * Create timeline log for sales with notes
   */
  async createTimelineLog(patientId, notes, saleId) {
    try {
      const timelineData = {
        type: 'sale',
        title: 'Satış Gerçekleştirildi',
        description: `Satış notu: ${notes}`,
        details: {
          sale_id: saleId,
          notes: notes
        },
        user: localStorage.getItem('currentUser') || 'Sistem',
        category: 'sales'
      };

      await this.apiClient.post(`/api/patients/${patientId}/timeline`, timelineData);
    } catch (error) {
      console.error('Error creating timeline log:', error);
    }
  }

  /**
   * Create sales log for cashflow.html page
   */
  async createSalesLog(patientId, saleData, saleId) {
    try {
      // Calculate the actual sale amount from product pricing
      const productSelect = document.getElementById('product-select');
      const basePrice = parseFloat(productSelect?.dataset?.price) || 0;
      const discount = saleData.discount || 0;
      const netAmount = Math.max(0, basePrice - discount);
      
      // KDV oranını dataset'ten kullan (yoksa kategoriye göre varsayılan)
      let kdvRate = Number(productSelect?.dataset?.kdvRate);
      if (isNaN(kdvRate)) {
        const category = (productSelect?.dataset?.category || '').toLowerCase();
        kdvRate = (category === 'hearing_aid' || category === 'işitme cihazı') ? 0 : 20;
      }
      
      const kdvAmount = (netAmount * kdvRate) / 100;
      const totalAmount = netAmount + kdvAmount;

      const logData = {
        patient_id: patientId,
        sale_id: saleId,
        product_id: saleData.product_id,
        amount: totalAmount, // Use calculated total amount
        payment_type: saleData.payment_type,
        discount: saleData.discount,
        notes: saleData.notes,
        user_name: localStorage.getItem('currentUser') || 'Sistem',
        timestamp: new Date().toISOString()
      };

      const response = await this.apiClient.post('/api/sales/logs', logData);
      
      // If backend returns cashflow.html compatible data, save it to localStorage
      if (response?.data?.sales_html_data) {
        const cashRecords = JSON.parse(localStorage.getItem('cashRecords') || '[]');
        cashRecords.push(response.data.sales_html_data);
        localStorage.setItem('cashRecords', JSON.stringify(cashRecords));
        
        console.log('Sales log saved to localStorage for cashflow.html:', response.data.sales_html_data);
      }
      
    } catch (error) {
      console.error('Error creating sales log:', error);
    }
  }

  /**
   * Fetch all available inventory items
   */
  async fetchAllInventoryItems() {
    try {
      const response = await this.apiClient.get('/api/inventory?status=available');
      return response?.data || response || [];
    } catch (error) {
      console.error('Failed to fetch inventory items:', error);
      return [];
    }
  }

  /**
   * Fetch pricing settings
   */
  async fetchPricingSettings() {
    try {
      const response = await this.apiClient.get('/api/settings/pricing');
      return response?.data || response || {};
    } catch (error) {
      console.error('Failed to fetch pricing settings:', error);
      return {};
    }
  }

  /**
   * Close modal
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
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

// Export to window for global access
if (typeof window !== 'undefined') {
  window.SalesFormModule = SalesFormModule;
  
  // Initialize if ApiClient is available
  if (window.ApiClient) {
    const apiClient = new window.ApiClient();
    window.salesForm = new SalesFormModule(apiClient);
  }
}
