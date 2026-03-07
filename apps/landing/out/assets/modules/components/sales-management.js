/**
 * Sales Management Component - Main Coordinator
 * Modular architecture: Delegates to specialized modules
 */

// Use browser-compatible logger (avoid global const redeclaration across scripts)
var logger = window.logger || console;

// Orval API functions are available on window global object
// import { inventoryGetInventoryItems } from '../js/generated/orval-api.js';

// Custom inventory get item function using generated Orval function
const inventoryGetInventoryItem = async (itemId, options = {}) => {
    // First try to use the newly generated window.inventoryGetInventoryItem function
    if (window.inventoryGetInventoryItem) {
        try {
            const response = await window.inventoryGetInventoryItem(itemId, options);
            if (response && response.data) {
                return response;
            }
        } catch (error) {
            logger.warn('Orval inventoryGetInventoryItem failed:', error);
        }
    }
    // Try Orval generated client first
    if (window.inventoryGetInventoryItem) {
        try {
            const response = await window.inventoryGetInventoryItem({ id: itemId });
            return { data: response, status: 200, headers: {} };
        } catch (orvalError) {
            logger.warn('Orval client failed, trying APIConfig fallback:', orvalError);
        }
    }
    
    // Fallback to APIConfig if available
    if (window.APIConfig && window.APIConfig.makeRequest) {
        try {
            const response = await window.APIConfig.makeRequest(`/api/inventory/${itemId}`, 'GET');
            // Wrap response in expected format
            return { data: response, status: 200, headers: {} };
        } catch (apiError) {
            logger.error('APIConfig fallback failed:', apiError);
        }
    }
    
    // Last resort: try inventoryGetInventoryItems with filter
    if (window.inventoryGetInventoryItems) {
        try {
            const response = await window.inventoryGetInventoryItems({ id: itemId });
            if (response.data && response.data.success && Array.isArray(response.data.data)) {
                const item = response.data.data.find(item => item.id === itemId);
                if (item) {
                    return { data: { success: true, data: item }, status: 200, headers: response.headers };
                }
            }
        } catch (error) {
            logger.warn('Orval inventoryGetInventoryItems fallback failed:', error);
        }
    }
    
    logger.warn('⚠️ No API client available for inventory item');
    return { data: null, status: 404, headers: {} };
};

// Use browser-compatible module loading - these modules should be loaded via script tags
// import { SalesCollectionModule } from '../sales/sales-collection.js';
// import { SalesEditModule } from '../sales/sales-edit.js';
// import { SalesDetailsModule } from '../sales/sales-details.js';
// import { SalesInvoiceModule } from '../sales/sales-invoice.js';
// import { SalesFormModule } from '../sales/sales-form.js';
// import { SalesReturnsModule } from '../sales/sales-returns.js';

class SalesManagementComponent {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.currentPatientId = null;
    
    // Initialize specialized modules
    this.collectionModule = new SalesCollectionModule(apiClient);
    this.editModule = new SalesEditModule(apiClient);
    this.detailsModule = new SalesDetailsModule(apiClient);
    this.invoiceModule = new SalesInvoiceModule(apiClient);
    this.deviceFormModule = new SalesFormModule(apiClient);
    this.returnsModule = new SalesReturnsModule(apiClient);
    
    // Initialize promissory note component
    this.promissoryNote = window.PromissoryNoteComponent ? new window.PromissoryNoteComponent(apiClient) : null;
    
    // Expose modules globally for onclick handlers
    window.salesCollection = this.collectionModule;
    window.salesEdit = this.editModule;
    window.salesDetails = this.detailsModule;
    window.salesInvoice = this.invoiceModule;
    window.salesDeviceForm = this.deviceFormModule;
    window.salesReturns = this.returnsModule;

    // Clean up any portal overflow menus when the sales tab is reloaded or on navigation
    const cleanupPortals = () => {
      document.querySelectorAll('[id^="overflow-menu-portal-"]').forEach(p => p.remove());
    };
    window.addEventListener('reloadSalesTab', cleanupPortals);
    window.addEventListener('beforeunload', cleanupPortals);
  }

  /**
   * Main render method for sales tab
   */
  async renderSalesTab(patientData) {
    this.currentPatientId = patientData.id;
    
    // Fetch sales from backend API
    const patientSales = await this.fetchPatientSalesFromAPI(patientData.id);
    const totalSales = this.calculateTotalSales(patientSales);
    const lastSaleDate = this.getLastSaleDate(patientSales);
    const totalRemaining = this.calculateTotalRemaining(patientSales);
    
    // Get returns/exchanges HTML
    const returnsExchangesHtml = await this.renderReturnsExchanges(patientData.id);

    // Get proformas HTML from proforma-management (if available)
    let proformasHtml = '';
    try {
      if (window.proformaManagement && typeof window.proformaManagement.renderProformasSection === 'function') {
        proformasHtml = await window.proformaManagement.renderProformasSection(patientData.id);
      }
    } catch (e) {
            logger.warn('Could not render proformas section:', e);
      proformasHtml = '';
    }

    return `
      <div class="space-y-6">
        <!-- Sales Summary -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Satış Özeti</h3>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-green-50 p-4 rounded-lg">
              <h4 class="text-sm text-gray-600">Toplam Satış</h4>
              <p class="text-xl font-bold text-green-600">${totalSales.toLocaleString('tr-TR')} TL</p>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg">
              <h4 class="text-sm text-gray-600">Satış Sayısı</h4>
              <p class="text-xl font-bold text-blue-600">${patientSales.length}</p>
            </div>
            <div class="bg-orange-50 p-4 rounded-lg">
              <h4 class="text-sm text-gray-600">Kalan Ödeme</h4>
              <p class="text-xl font-bold text-orange-600">${totalRemaining.toLocaleString('tr-TR')} TL</p>
            </div>
            <div class="bg-purple-50 p-4 rounded-lg">
              <h4 class="text-sm text-gray-600">Son Satış</h4>
              <p class="text-sm text-gray-800">${lastSaleDate}</p>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onclick="salesManagement.openSalesModal('${patientData.id}')" 
                  class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium">
            <i class="fas fa-shopping-cart mr-2"></i>Satış
          </button>
          <button onclick="salesManagement.openCollectionModal('${patientData.id}')" 
                  class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center font-medium">
            <i class="fas fa-hand-holding-usd mr-2"></i>Tahsilat
          </button>
          <button onclick="salesManagement.openPromissoryNoteModal('${patientData.id}')" 
                  class="bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center font-medium">
            <i class="fas fa-file-contract mr-2"></i>Senet Oluştur
          </button>
        </div>

        <!-- Sales List -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Satış Geçmişi</h3>
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-600">Başlangıç:</label>
                  <input type="date" id="salesDateFrom" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-600">Bitiş:</label>
                  <input type="date" id="salesDateTo" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                </div>
                <button onclick="salesManagement.applySalesDateFilter('${patientData.id}')" 
                        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  <i class="fas fa-filter mr-1"></i>Filtrele
                </button>
                <button onclick="salesManagement.clearSalesDateFilter('${patientData.id}')" 
                        class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm">
                  <i class="fas fa-times mr-1"></i>Temizle
                </button>
              </div>
            </div>
            ${this.renderSalesTable(patientSales, patientData.id)}
          </div>
        </div>

        <!-- Proformas / Teklifler -->
        ${proformasHtml}

        <!-- Returns & Exchanges -->
        ${returnsExchangesHtml}
      </div>
    `;
  }

  /**
   * Renders the sales table
   */
  renderSalesTable(sales, patientId) {
    if (!sales || !Array.isArray(sales) || sales.length === 0) {
      return '<p class="text-gray-500 text-center py-8">Henüz satış kaydı bulunmuyor</p>';
    }

    return `
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Satış ID/Tarih</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün/Hizmet</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barkod/Seri No</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Liste Fiyatı</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İndirim</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">KDV Dahil Toplam</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Alınan Ödeme</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kalan Tutar</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${sales.map(sale => {
              // Always use patient-payable fields for display (form-aligned)
              const patientPayment = (function(s) {
          const patientPayable = s.patient_payment || s.patientPayment || s.totalPatientPayment || s.finalAmount || s.final_amount;
          if (typeof patientPayable === 'number') return patientPayable;
          const total = s.totalAmount || 0;
          const discount = s.discountAmount || s.discount_amount || 0;
          const sgk = s.sgkCoverage || 0;
          return total - discount - sgk;
        })(sale);

              // Calculate paid amount from payment records (preferred), else backend paid_amount
              let paid = 0;
              // Önce backend'den gelen paid_amount değerini kullan
              if (sale.paidAmount !== undefined && sale.paidAmount !== null) {
                paid = parseFloat(sale.paidAmount) || 0;
              } else if (sale.paid_amount !== undefined && sale.paid_amount !== null) {
                paid = parseFloat(sale.paid_amount) || 0;
              } else if (sale.paymentRecords && sale.paymentRecords.length > 0) {
                // Sadece backend değerleri yoksa payment records'dan hesapla
                const paidRecords = sale.paymentRecords.filter(r => (r.status || 'paid') === 'paid');
                paid = paidRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
              }

              // KDV dahil toplam tutarı hesapla
              const vatRate = this.getVatRate(sale);
              // patientPayment zaten KDV hariç tutar
              const vatAmount = (patientPayment * vatRate) / 100;
              const displayTotal = patientPayment + vatAmount; // KDV dahil tutar
              const displayRemaining = (displayTotal - paid);
              
              // Get discount amount
              const discountAmount = sale.discountAmount || sale.discount_amount || 0;
              
              // Get list price (before discount)
              const listPrice = sale.totalAmount || sale.total_amount || 0;
              
              // Get invoice status for this sale (invoice is now included in sale object)
              const invoiceData = sale.invoice; // Backend includes invoice in sale
              const hasInvoice = !!invoiceData;
              const invoiceSentToGib = hasInvoice && invoiceData.sentToGib;
              
        const cancelledClass = sale.status === 'cancelled' ? 'opacity-50 line-through pointer-events-none' : '';
        return `
                <tr class="hover:bg-gray-50 ${paid > 0 && displayRemaining > 0 ? 'bg-yellow-50' : ''} ${cancelledClass} cursor-pointer transition-colors" 
                  data-sale-id="${sale.id}"
                  onclick="event.target.closest('button') || salesManagement.viewSaleDetails('${sale.id}', '${patientId}')">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div class="font-medium">${sale.id}</div>
                  <div class="text-xs text-gray-600">${new Date(sale.saleDate || sale.date || sale.createdAt).toLocaleDateString('tr-TR')}</div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">
                  ${this.renderDevicesSummary(sale)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ${this.renderBarcodeSerialInfo(sale)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                  ${listPrice.toLocaleString('tr-TR')} TL
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${discountAmount > 0 ? 'text-red-600' : 'text-gray-500'}">
                  ${discountAmount > 0 ? '-' : ''}${discountAmount.toLocaleString('tr-TR')} TL
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                  ${displayTotal.toLocaleString('tr-TR')} TL
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-700">
                  <div>${paid.toLocaleString('tr-TR')} TL</div>
                  <div class="text-xs text-gray-600">${this.renderPaymentMethods(sale)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${displayRemaining > 0 ? 'text-orange-700' : 'text-gray-500'}">
                  ${displayRemaining.toLocaleString('tr-TR')} TL
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  ${this.renderStatusBadge(sale.status, paid, displayRemaining)}
                  ${hasInvoice && !invoiceSentToGib ? '<span class="block mt-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Fatura Oluşturuldu</span>' : ''}
                  ${invoiceSentToGib ? '<span class="block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Fatura GİB\'e Gönderildi</span>' : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center text-sm" onclick="event.stopPropagation()">
                  <div class="relative">
                    <button class="overflow-action-btn w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" 
                            title="Aksiyonlar" aria-label="Aksiyonlar" aria-haspopup="true" aria-expanded="false" onclick="salesManagement.toggleOverflowMenu(event, '${sale.id}', '${patientId}', ${hasInvoice ? invoiceData.id : 'null'})">
                      <i class="fas fa-ellipsis-v text-lg text-gray-600" aria-hidden="true"></i>
                    </button>

                    <!-- Overflow menu (hidden by default) -->
                    <div id="overflow-menu-${sale.id}" class="overflow-menu hidden absolute mt-2 w-44 bg-white border border-gray-200 rounded shadow-lg z-50">
                      <div class="flex flex-col">
                        <button onclick="salesManagement.viewSaleDetails('${sale.id}', '${patientId}'); salesManagement.closeOverflowMenu('${sale.id}')" class="menu-item text-left px-3 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700"><i class="fas fa-search mr-2"></i> Görüntüle</button>
                        <button onclick="salesManagement.editSale('${sale.id}', '${patientId}'); salesManagement.closeOverflowMenu('${sale.id}')" class="menu-item text-left px-3 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700"><i class="fas fa-pen mr-2"></i> Düzenle</button>
                        ${hasInvoice ? `
                          <button onclick="salesManagement.previewInvoice('${sale.id}', '${patientId}', ${invoiceData.id}); salesManagement.closeOverflowMenu('${sale.id}')" class="menu-item text-left px-3 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700"><i class="fas fa-file-alt mr-2"></i> Fatura Önizle</button>
                        ` : `
                          <button onclick="salesManagement.createInvoice('${sale.id}', '${patientId}'); salesManagement.closeOverflowMenu('${sale.id}')" class="menu-item text-left px-3 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700"><i class="fas fa-file-invoice mr-2"></i> Fatura Oluştur</button>
                        `}
                        <button onclick="salesManagement.viewPromissoryNotes('${sale.id}', '${patientId}'); salesManagement.closeOverflowMenu('${sale.id}')" class="menu-item text-left px-3 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700"><i class="fas fa-file-contract mr-2"></i> Senetler</button>
                        <button onclick="salesManagement.openPatientDocuments('${patientId}'); salesManagement.closeOverflowMenu('${sale.id}')" class="menu-item text-left px-3 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700"><i class="fas fa-folder-open mr-2"></i> Belgeler</button>
                        <button onclick="salesManagement.cancelSale('${sale.id}', '${patientId}'); salesManagement.closeOverflowMenu('${sale.id}')" class="menu-item text-left px-3 py-2 hover:bg-gray-50 flex items-center text-sm text-red-600"><i class="fas fa-ban mr-2"></i> Satışı İptal Et</button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Renders a summary of devices in the sale
   */
  renderDevicesSummary(sale) {
    // Check if sale has product_id (from product-sales endpoint)
    if (sale.productId) {
      // Create a unique identifier for this sale's product info
      const productInfoId = `product-info-${sale.id}`;
      
      // Fetch product information from inventory asynchronously
      this.fetchProductInfo(sale.productId).then(product => {
        if (product) {
          const productElement = document.getElementById(productInfoId);
          if (productElement) {
            productElement.innerHTML = `
              <div class="mb-1">
                <div class="font-medium text-gray-900">${product.name || 'Ürün'}</div>
                <div class="text-xs text-gray-600">Marka: ${product.brand || '-'} | Model: ${product.model || '-'}</div>
                ${product.category ? `<div class="text-xs text-blue-600">Kategori: ${this.getCategoryDisplayName(product.category)}</div>` : ''}
              </div>
            `;
          }
        }
      }).catch(error => {
        logger.error('Error loading product info:', error);
        const productElement = document.getElementById(productInfoId);
        if (productElement) {
          productElement.innerHTML = `<div class="text-red-500 text-xs">Ürün bilgisi yüklenemedi</div>`;
        }
      });
      
      // Return placeholder with unique ID while loading
      return `<div id="${productInfoId}" class="product-info">
        <div class="animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>`;
    }
    
    // Original logic for device assignments
    if (sale.devices && sale.devices.length > 0) {
      return sale.devices.map(d => `
        <div class="mb-1">
          <div class="font-medium text-gray-900">${d.name || d.model || 'Cihaz'}</div>
          <div class="text-xs text-gray-600">Marka: ${d.brand || '-'} | Model: ${d.model || '-'}</div>
        </div>
      `).join('');
    }
    return '<div class="text-gray-500 text-sm">Ürün bilgisi yok</div>';
  }

  /**
   * Get VAT rate for sale
   */
  getVatRate(sale) {
    // Sadece ürün detaylarında belirtilen KDV oranını kullan
    if (sale.devices && sale.devices.length > 0) {
      const device = sale.devices[0]; // İlk cihazın KDV oranını kullan
      if (device.kdvRate !== undefined && device.kdvRate !== null) {
        return Number(device.kdvRate);
      }
    }
    
    // Ürün detayında KDV oranı yoksa varsayılan olarak %20 kullan
    return sale.vatRate || 20;
  }

  /**
   * Check if sale contains hearing aid category
   */
  isHearingAidCategory(sale) {
    if (!sale.devices || sale.devices.length === 0) {
      return false;
    }
    
    // Cihazların kategorisini kontrol et
    return sale.devices.some(device => {
      const category = (device.category || device.deviceType || '').toLowerCase();
      
      // Önce pil, aksesuar gibi işitme cihazı OLMAYAN kategorileri kontrol et
      const nonHearingAidCategories = ['pil', 'battery', 'aksesuar', 'accessory', 'kutu', 'case', 'temizlik', 'cleaning'];
      if (nonHearingAidCategories.some(cat => category.includes(cat))) {
        return false;
      }
      
      // Sadece kategori bazlı kontrol - marka ve isim kontrolü kaldırıldı
      return category === 'hearing_aid' || 
             category.includes('işitme') || 
             category.includes('hearing') ||
             category.includes('cihaz') ||
             category.includes('hearing_aid') ||
             category.includes('kulak');
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

  async fetchProductInfo(productId) {
    try {
      // Use Orval client for getting inventory item
      try {
        const response = await inventoryGetInventoryItem(productId);
        logger.log('🔍 Orval response for product:', productId, response);
        
        // Check if response has the expected Orval format
        if (response && response.status === 200 && response.data) {
          // Check if it's wrapped in success envelope
          if (response.data.success && response.data.data) {
            logger.log('✅ Product info loaded via Orval wrapper (envelope format):', productId);
            return response.data.data;
          } 
          // Check if it's direct data (non-envelope format)
          else if (response.data.id || response.data.name) {
            logger.log('✅ Product info loaded via Orval wrapper (direct format):', productId);
            return response.data;
          }
          else {
            logger.warn('⚠️ Unexpected response format from Orval inventory wrapper');
            throw new Error('Unexpected response format');
          }
        } else {
          logger.warn('⚠️ Invalid Orval response structure');
          throw new Error('Invalid response structure');
        }
      } catch (orvalError) {
        logger.error('❌ Orval inventory wrapper failed:', orvalError);
        
        // Fallback to API client if available
        if (this.apiClient) {
          // Try Orval-generated method first, fallback to manual API call
          let result;
          try {
            if (window.inventoryGetInventoryItem && typeof window.inventoryGetInventoryItem === 'function') {
              result = await window.inventoryGetInventoryItem(productId);
            } else if (this.apiClient.getInventoryItem && typeof this.apiClient.getInventoryItem === 'function') {
              result = await this.apiClient.getInventoryItem(productId);
            } else {
              result = await this.apiClient.get(`/api/inventory/${productId}`);
            }
          } catch (error) {
            console.warn('Orval method failed, falling back to manual API call:', error);
            result = await this.apiClient.get(`/api/inventory/${productId}`);
          }
          
          logger.log('✅ Product info loaded via API client fallback:', productId);
          return result.data;
        } else if (window.inventoryGetInventoryItem) {
          // Use Orval generated client
          try {
            const result = await window.inventoryGetInventoryItem({ id: productId });
            logger.log('✅ Product info loaded via Orval client:', productId);
            return result.data;
          } catch (orvalError) {
            logger.warn('Orval client failed, trying APIConfig fallback:', orvalError);
          }
        }
        
        if (window.APIConfig && window.APIConfig.makeRequest) {
          // APIConfig fallback
          try {
            const result = await window.APIConfig.makeRequest(`/api/inventory/${productId}`, 'GET');
            logger.log('✅ Product info loaded via APIConfig fallback:', productId);
            return result.data;
          } catch (apiError) {
            logger.error('❌ APIConfig fallback failed:', apiError);
          }
        } else {
          logger.warn('⚠️ No API client available for product info');
        }
      }
    } catch (error) {
      logger.error('Error fetching product info:', error);
    }
    return null;
  }

  /**
   * Renders barcode and serial number information
   */
  renderBarcodeSerialInfo(sale) {
    if (sale.devices && sale.devices.length > 0) {
      const device = sale.devices[0]; // Take first device for now
      const barcode = device.barcode || device.serialNumber || '-';
      const serial = device.serialNumber || '-';
      
      return `
        <div class="font-medium">${barcode}</div>
        <div class="text-xs text-gray-600">${serial}</div>
      `;
    }
    return '-';
  }

  /**
   * Renders payment methods information
   */
  renderPaymentMethods(sale) {
    // If sale has payment records, show them
    if (sale.paymentRecords && sale.paymentRecords.length > 0) {
      // Show only paid records for method summary consistency
      const paidRecords = sale.paymentRecords.filter(r => (r.status || 'paid') === 'paid');
      return paidRecords.map(record => {
        const methodLabels = {
          'cash': 'Nakit',
          'card': 'Kart', 
          'transfer': 'Havale',
          'installment': 'Taksit',
          'promissory_note': 'Senet'
        };
        const method = methodLabels[record.paymentMethod] || record.paymentMethod;
        return `${method}:${record.amount?.toLocaleString('tr-TR')}`;
      }).join('<br>');
    }
    
    // Fallback to sale payment method
    const paymentMethod = sale.paymentMethod || 'cash';
    const methodLabels = {
      'cash': 'Nakit',
      'card': 'Kart',
      'transfer': 'Havale', 
      'installment': 'Taksit',
      'promissory_note': 'Senet'
    };
    
    return methodLabels[paymentMethod] || paymentMethod;
  }

  /**
   * Renders status badge with payment information
   */
  renderStatusBadge(status, paidAmount = 0, remainingAmount = 0) {
    // If we have payment information, prioritize that
    if (paidAmount > 0 && remainingAmount > 0) {
      return '<span class="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Kısmi Ödendi</span>';
    } else if (paidAmount > 0 && remainingAmount === 0) {
      return '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Ödendi</span>';
    }
    
    // Fall back to status-based badges
    const badges = {
      'paid': '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Ödendi</span>',
      'pending': '<span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Beklemede</span>',
      'partial': '<span class="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Kısmi Ödendi</span>',
      'cancelled': '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">İptal edildi</span>',
      'completed': '<span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Tamamlandı</span>'
    };
    return badges[status] || badges['pending'];
  }

  /**
   * Delegate methods to specialized modules
   */
  async openSalesModal(patientId) {
    return this.deviceFormModule.openSalesModal(patientId);
  }

  async openCollectionModal(patientId) {
    return this.collectionModule.openCollectionModal(patientId);
  }

  async openReturnModal(patientId) {
    return this.returnsModule.openReturnModal(patientId);
  }

  async openReturnInvoiceModal(replacementId, patientId) {
    return this.returnsModule.openReturnInvoiceModal(replacementId, patientId);
  }

  async createReturnInvoice() {
    return this.returnsModule.createReturnInvoice();
  }

  async sendInvoice(invoiceId) {
    return this.returnsModule.sendInvoice(invoiceId);
  }

  printInvoice(invoiceId) {
    return this.returnsModule.printInvoice(invoiceId);
  }

  selectInvoice(invoiceId, invoiceNumber, supplierName, invoiceDate, element) {
    return this.returnsModule.selectInvoice(invoiceId, invoiceNumber, supplierName, invoiceDate, element);
  }

  filterInvoices() {
    return this.returnsModule.filterInvoices();
  }

  async viewSaleDetails(saleId, patientId) {
    return this.detailsModule.openSaleDetailsModal(saleId, patientId);
  }

  async editSale(saleId, patientId) {
    return this.editModule.openEditSaleModal(saleId, patientId);
  }

  async createInvoice(saleId, patientId) {
    try {
      // First check if invoice already exists
      try {
        let existingInvoice;
        if (window.invoicesGetSaleInvoice) {
          existingInvoice = await window.invoicesGetSaleInvoice(saleId);
        } else if (this.apiClient.getSaleInvoice && typeof this.apiClient.getSaleInvoice === 'function') {
          // Try apiClient Orval method
          existingInvoice = await this.apiClient.getSaleInvoice(saleId);
        } else {
          // Fallback to manual API call
          existingInvoice = await this.apiClient.get(`/api/sales/${saleId}/invoice`);
        }
        
        if (existingInvoice && existingInvoice.success) {
          this.showToast('Bu satış için zaten fatura mevcut.', 'info');
          return;
        }
      } catch (getError) {
        // 404 is expected if invoice doesn't exist, continue with creation
        logger.log('No existing invoice found (expected):', getError.status);
        if (getError.status !== 404) {
          logger.error('Unexpected error checking for existing invoice:', getError);
          // Don't throw here, just log and continue with creation attempt
        }
      }

      // Use the new dynamic invoice form widget for all invoice creation
      logger.log('🚀 Opening dynamic invoice form for sale:', saleId);
      
      if (window.invoiceWidget && typeof window.invoiceWidget.openForSale === 'function') {
        // Open the dynamic invoice form with sale data pre-populated
        await window.invoiceWidget.openForSale(saleId, patientId);
        
        // Listen for successful invoice creation to refresh the sales table
        const handleInvoiceCreated = async (event) => {
          if (event.detail && event.detail.saleId === saleId) {
            logger.log('✅ Invoice created successfully for sale:', saleId);
            this.showToast('✓ Fatura başarıyla oluşturuldu', 'success');
            await this.refreshSalesTable(patientId);
            
            // Remove the event listener after handling
            window.removeEventListener('invoiceCreated', handleInvoiceCreated);
          }
        };
        
        // Add event listener for invoice creation
        window.addEventListener('invoiceCreated', handleInvoiceCreated);
        
        return;
      }

      // Fallback to legacy API-based creation if widget is not available
      logger.warn('⚠️ Dynamic invoice widget not available, falling back to legacy creation');
      
      // Fetch sale details first to ensure required fields exist
      const sale = await this.fetchSaleData(saleId, patientId);

      if (!sale) {
        this.showToast('Satış verisi alınamadı; lütfen tekrar deneyin.', 'error');
        return;
      }

      // If sale lacks device entries, show appropriate message
      if (!Array.isArray(sale.devices) || sale.devices.length === 0) {
        this.showToast('Bu satışa ait ürün kaydı bulunamadı. Lütfen manuel olarak fatura oluşturun.', 'warning');
        return;
      }

      // Proceed to request invoice creation on server using POST
      const response = await this.apiClient.post(`/api/sales/${saleId}/invoice`);

      if (response && response.success !== false) {
        this.showToast('✓ Fatura başarıyla oluşturuldu', 'success');
        await this.refreshSalesTable(patientId);
      } else {  
        throw new Error(response.error || 'Fatura oluşturulamadı');
      }
    } catch (error) {
      logger.error('Failed to create invoice:', error);
      this.showToast('Fatura oluşturulamadı: ' + (error.message || error), 'error');
    }
  }

  async previewInvoice(saleId, patientId, invoiceId) {
    try {
      // Initialize invoice preview widget if not already done
      if (!window.invoicePreview) {
        window.invoicePreview = new window.InvoicePreviewWidget(this.apiClient);
      }

      // Open invoice preview with callback to reload sales tab
      await window.invoicePreview.open(invoiceId, async () => {
        await this.refreshSalesTable(patientId);
      });
    } catch (error) {
      logger.error('Failed to preview invoice:', error);
      this.showToast('Fatura önizlenemedi: ' + error.message, 'error');
    }
  }

  async reloadSalesTab(patientId) {
    // Trigger a refresh of the sales tab
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('reloadSalesTab', { detail: { patientId } }));
    }
  }

  // Toggle overflow action menu for a sale
  toggleOverflowMenu(e, saleId, patientId, invoiceId = null) {
    e.stopPropagation();

    // Close any existing portal menus
    document.querySelectorAll('[id^="overflow-menu-portal-"]').forEach(p => p.remove());

    // Close other inline menus (for robustness)
    document.querySelectorAll('.overflow-menu').forEach(m => m.classList.add('hidden'));

    const menu = document.getElementById(`overflow-menu-${saleId}`);
    if (!menu) return;

    // Determine the source button element
    const button = e.currentTarget || e.target.closest('button') || e.target;
    if (!button) return;

    // If menu is already visible inline, hide it and return
    if (!menu.classList.contains('hidden')) {
      menu.classList.add('hidden');
      button.setAttribute('aria-expanded', 'false');
      return;
    }

    // Hide the original inline menu (we will show a portal copy)
    menu.classList.add('hidden');

    // Clone menu to body (portal) so it won't affect table layout
    const portal = menu.cloneNode(true);
    portal.id = `overflow-menu-portal-${saleId}`;
    portal.dataset.portal = 'true';
    portal.classList.remove('hidden');

    // Basic inline styles to ensure correct positioning and appearance
    portal.style.position = 'absolute';
    portal.style.minWidth = menu.offsetWidth ? `${menu.offsetWidth}px` : '176px';
    portal.style.zIndex = 9999;

    // Append to body so it is outside table flow
    document.body.appendChild(portal);

    // Compute position: open downward and align to the button's right edge so it opens left
    const rect = button.getBoundingClientRect();
    const portalRect = portal.getBoundingClientRect();

    // Prefer opening downward
    let top = rect.bottom + window.scrollY + 6; // 6px gap
    let left = rect.right + window.scrollX - portalRect.width; // align right edges -> opens left

    // If portal would go below viewport, attempt to open upwards
    const viewportBottom = window.scrollY + window.innerHeight;
    if (top + portalRect.height > viewportBottom) {
      const altTop = rect.top + window.scrollY - portalRect.height - 6;
      if (altTop >= 8) top = altTop; // open upwards if space
    }

    // Keep portal within left/right viewport bounds
    left = Math.max(8, Math.min(left, window.scrollX + window.innerWidth - portalRect.width - 8));

    portal.style.left = left + 'px';
    portal.style.top = top + 'px';

    // Update aria-expanded on the button
    button.setAttribute('aria-expanded', 'true');

    // Close on outside click
    const outsideHandler = (ev) => {
      if (!portal.contains(ev.target) && ev.target !== button) {
        portal.remove();
        button.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', outsideHandler);
      }
    };

    // Use next tick to avoid immediate invocation from the same click
    setTimeout(() => document.addEventListener('click', outsideHandler), 0);
  }

  closeOverflowMenu(saleId) {
    // Remove any portal clone first
    const portal = document.getElementById(`overflow-menu-portal-${saleId}`);
    if (portal) portal.remove();

    // Also hide the inline menu if present
    const menu = document.getElementById(`overflow-menu-${saleId}`);
    if (menu) menu.classList.add('hidden');

    // Update aria-expanded states for any buttons related to this sale
    const relatedButtons = document.querySelectorAll(`button[onclick*="${saleId}"]`);
    relatedButtons.forEach(b => b.setAttribute('aria-expanded', 'false'));
  }

  // Open patient's documents modal using the new widget
  async openPatientDocuments(patientId) {
    try {
      if (window.documentListWidget && typeof window.documentListWidget.openPatientDocumentsModal === 'function') {
        return window.documentListWidget.openPatientDocumentsModal(patientId);
      }
      // Fallback to legacy documentManagement if present
      if (window.documentManagement && typeof window.documentManagement.renderDocumentsTab === 'function') {
        const html = window.documentManagement.renderDocumentsTab({ id: patientId, documents: [] });
        const modalHtml = `<div id="patient-docs-fallback" class="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">${html}</div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
      } else {
        this.showToast('Belgeler modülü yüklenemedi', 'error');
      }
    } catch (err) {
      logger.error('openPatientDocuments error', err);
      this.showToast('Belgeler açılamadı', 'error');
    }
  }

  async cancelSale(saleId, patientId) {
    if (window.showCustomConfirm) {
      window.showCustomConfirm('Onay', 'Bu satışı iptal etmek istediğinize emin misiniz?', () => {
        // Proceed with cancellation
        this.performSaleCancellation(saleId, patientId);
      });
    } else {
      if (!confirm('Bu satışı iptal etmek istediğinize emin misiniz?')) return;
      this.performSaleCancellation(saleId, patientId);
    }
  }

  async performSaleCancellation(saleId, patientId) {

    // Find the corresponding table row so we can show a loading state
    let row = null;
    try {
      row = Array.from(document.querySelectorAll('tr')).find(r => r.textContent.includes(saleId));
    } catch (e) {
      // ignore
    }

    // Add a simple inline spinner to the row's last cell (if any) and dim the row
    let spinner = null;
    if (row) {
      row.classList.add('opacity-70', 'pointer-events-none');
      try {
        const lastCell = row.querySelector('td:last-child');
        if (lastCell) {
          spinner = document.createElement('span');
          spinner.className = 'ml-2 inline-flex items-center';
          spinner.innerHTML = `<svg class="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>`;
          lastCell.appendChild(spinner);
        }
      } catch (e) {
        // ignore spinner errors
      }
    }

    try {
      const response = await this.apiClient.patch(`/api/patients/${patientId}/sales/${saleId}`, { status: 'cancelled' });
      if (response && (response.success !== false)) {
        this.showToast('Satış iptal edildi', 'success');
        // Refresh sales table to immediately reflect cancelled status without full page reload
        if (typeof this.refreshSalesTable === 'function') {
          await this.refreshSalesTable(patientId);
        } else {
          await this.reloadSalesTab(patientId);
        }
      } else {
        throw new Error(response.error || 'Satış iptal edilemedi');
      }
    } catch (error) {
      logger.error('Failed to cancel sale:', error);
      this.showToast('Satış iptal edilemedi: ' + (error.message || error), 'error');
      // Remove loading state if present
      if (row) {
        row.classList.remove('opacity-70', 'pointer-events-none');
        if (spinner && spinner.parentNode) spinner.remove();
      }
    }
  }
  
  async viewPromissoryNotes(saleId, patientId) {
    try {
      // Fetch promissory notes for this sale
      let response;
      if (window.paymentsGetSalePromissoryNotes) {
        response = await window.paymentsGetSalePromissoryNotes(saleId);
      } else if (this.apiClient.getSalePromissoryNotes && typeof this.apiClient.getSalePromissoryNotes === 'function') {
        // Try apiClient Orval method
        response = await this.apiClient.getSalePromissoryNotes(saleId);
      } else {
        // Fallback to manual API call
        response = await this.apiClient.get(`/api/sales/${saleId}/promissory-notes`);
      }
      
      const notes = response?.data || response || [];
      
      if (notes.length === 0) {
        this.showToast('Bu satış için senet bulunamadı', 'info');
        return;
      }
      
      // Sort notes by note number
      notes.sort((a, b) => (a.noteNumber || 0) - (b.noteNumber || 0));
      
      // Create modal to show promissory notes
      const modalHtml = `
        <div id="promissoryNotesModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Senetler - Satış #${saleId}</h3>
                <p class="text-sm text-gray-600 mt-1">${notes.length} adet senet</p>
              </div>
              <button onclick="salesManagement.closeModal('promissoryNotesModal')" 
                      class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Kapat [ESC]">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div class="p-6">
              <div class="space-y-4">
                ${notes.map(note => {
                  const isPaid = note.status === 'paid';
                  const isOverdue = note.status === 'overdue' || 
                    (note.dueDate && new Date(note.dueDate) < new Date() && !isPaid);
                  const statusColor = isPaid ? 'green' : isOverdue ? 'red' : 'blue';
                  const statusIcon = isPaid ? 'check-circle' : isOverdue ? 'exclamation-triangle' : 'clock';
                  const statusText = isPaid ? 'Ödendi' : isOverdue ? 'Vadesi Geçti' : 'Aktif';
                  
                  return `
                    <div class="border-2 ${isPaid ? 'border-green-200 bg-green-50' : isOverdue ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'} rounded-lg p-4">
                      <div class="flex justify-between items-start mb-3">
                        <div class="flex-1">
                          <div class="flex items-center gap-2 mb-2">
                            <h4 class="font-semibold text-gray-900">Senet ${note.noteNumber}/${note.totalNotes}</h4>
                            <span class="px-2 py-1 text-xs rounded-full bg-${statusColor}-100 text-${statusColor}-800 font-medium">
                              <i class="fas fa-${statusIcon} mr-1"></i>${statusText}
                            </span>
                          </div>
                          <div class="grid grid-cols-2 gap-2 text-sm text-gray-700">
                            <div><strong>Düzenlenme:</strong> ${new Date(note.issueDate).toLocaleDateString('tr-TR')}</div>
                            <div><strong>Vade:</strong> ${new Date(note.dueDate).toLocaleDateString('tr-TR')}</div>
                            <div><strong>Borçlu:</strong> ${note.debtorName}</div>
                            <div><strong>T.C.:</strong> ${note.debtorTc || '-'}</div>
                            ${note.hasGuarantor ? `
                              <div class="col-span-2"><strong>Kefil:</strong> ${note.guarantorName}</div>
                            ` : ''}
                            ${isPaid ? `
                              <div class="col-span-2 text-green-700">
                                <i class="fas fa-check mr-1"></i><strong>Tahsil Tarihi:</strong> ${new Date(note.paidDate).toLocaleDateString('tr-TR')}
                              </div>
                            ` : ''}
                          </div>
                        </div>
                        <div class="text-right ml-4">
                          <p class="text-2xl font-bold text-${statusColor}-700">${(note.amount || 0).toLocaleString('tr-TR')} TL</p>
                          ${!isPaid ? `
                            <button onclick="salesManagement.markPromissoryNotePaid('${note.id}', '${saleId}', '${patientId}')"
                                    class="mt-2 text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                              Tahsil Et
                            </button>
                          ` : ''}
                        </div>
                      </div>
                      ${note.notes ? `
                        <div class="mt-2 pt-2 border-t border-${statusColor}-200">
                          <p class="text-xs text-gray-600">${note.notes}</p>
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
              
              <div class="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
                <div>
                  <p class="text-sm text-gray-600">Toplam Tutar:</p>
                  <p class="text-2xl font-bold text-gray-900">
                    ${notes.reduce((sum, n) => sum + (n.amount || 0), 0).toLocaleString('tr-TR')} TL
                  </p>
                </div>
                <button onclick="salesManagement.closeModal('promissoryNotesModal')"
                        class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
      // Add ESC key listener
      const escapeHandler = (e) => {
        if (e.key === 'Escape') {
          this.closeModal('promissoryNotesModal');
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
      
    } catch (error) {
      logger.error('Failed to fetch promissory notes:', error);
      this.showToast('Senetler yüklenemedi: ' + error.message, 'error');
    }
  }
  
  async markPromissoryNotePaid(noteId, saleId, patientId) {
    if (window.showCustomConfirm) {
      window.showCustomConfirm('Onay', 'Bu senedi tahsil edildi olarak işaretlemek istediğinize emin misiniz?', () => {
        // Proceed with marking as paid
        this.performMarkPromissoryNotePaid(noteId, saleId, patientId);
      });
    } else {
      if (!confirm('Bu senedi tahsil edildi olarak işaretlemek istediğinize emin misiniz?')) {
        return;
      }
      this.performMarkPromissoryNotePaid(noteId, saleId, patientId);
    }
  }
  
  async performMarkPromissoryNotePaid(noteId, saleId, patientId) {
    
    try {
      const response = await this.apiClient.patch(`/api/promissory-notes/${noteId}`, {
        status: 'paid',
        paid_date: new Date().toISOString()
      });
      
      if (response && (response.success || response.data)) {
        this.showToast('Senet tahsil edildi olarak işaretlendi', 'success');
        
        // Close and reopen modal to refresh
        this.closeModal('promissoryNotesModal');
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.viewPromissoryNotes(saleId, patientId);
      } else {
        throw new Error('İşlem başarısız');
      }
    } catch (error) {
      logger.error('Failed to mark promissory note as paid:', error);
      this.showToast('Senet güncellenemedi: ' + error.message, 'error');
    }
  }

  async openPromissoryNoteModal(patientId) {
    if (this.promissoryNote) {
      return this.promissoryNote.openModal(patientId);
    } else {
      this.showToast('Senet modülü yüklenemedi', 'error');
    }
  }

  /**
   * Fetch patient sales from API
   */
  async fetchPatientSalesFromAPI(patientId) {
    try {
      // Use Orval-generated method first
      if (window.salesGetPatientSales) {
        const response = await window.salesGetPatientSales(patientId);
        
        // Handle the unified response envelope: { success, data, meta?, requestId, timestamp }
        let sales = [];
        if (response && response.data && response.data.success && Array.isArray(response.data.data)) {
          // Unified envelope format with success flag
          sales = response.data.data;
        } else if (response && response.data && Array.isArray(response.data)) {
          // Direct data array
          sales = response.data;
        } else if (response && Array.isArray(response)) {
          // Response is directly an array
          sales = response;
        } else {
          // Unexpected format - log for debugging but don't show warning to user
          logger.debug('Unexpected sales response format:', response);
          sales = [];
        }
        
        return sales;
      } else {
        logger.warn('⚠️ salesGetPatientSales not available on window, falling back to manual API call');
        throw new Error('salesGetPatientSales not available');
      }
    } catch (orvalError) {
      logger.warn('Orval salesGetPatientSales failed, falling back to manual API call:', orvalError);
      
      // Fallback to manual API call
      try {
        let response;
        if (this.apiClient.getPatientSales && typeof this.apiClient.getPatientSales === 'function') {
          // Try apiClient Orval method
          response = await this.apiClient.getPatientSales(patientId);
        } else {
          // Final fallback to manual API call
          response = await this.apiClient.get(`/api/patients/${patientId}/sales`);
        }
        
        // Handle the unified response envelope: { success, data, meta?, requestId, timestamp }
        let sales = [];
        if (response && response.data && Array.isArray(response.data)) {
          // Direct data array or unified envelope format
          sales = response.data;
        } else if (response && Array.isArray(response)) {
          // Response is directly an array
          sales = response;
        } else {
          // Unexpected format - log for debugging but don't show warning to user
          logger.debug('Unexpected sales response format:', response);
          sales = [];
        }
        
        return sales;
      } catch (fallbackError) {
        logger.error('Failed to fetch sales (both Orval and fallback):', fallbackError);
        return [];
      }
    }
  }

  /**
   * Fetch single sale data by saleId for the current or given patient
   */
  async fetchSaleData(saleId, patientId) {
    try {
      const pid = patientId || this.currentPatientId;
      if (!pid) return null;

      // Try the invoice endpoint that returns sale information (if invoice exists or sale data is present)
      try {
        // Use Orval-generated method first
        if (window.invoicesGetSaleInvoice) {
          const resp = await window.invoicesGetSaleInvoice(saleId);
          const data = resp?.data || resp;
          // API returns { success: true, data: invoice_data } where invoice_data.sale contains sale details
          const invoiceData = data?.data || data;
          const saleFromInvoice = invoiceData?.sale || null;
          if (saleFromInvoice) return saleFromInvoice;
        } else if (this.apiClient.getSaleInvoice && typeof this.apiClient.getSaleInvoice === 'function') {
          // Try apiClient Orval method
          const resp = await this.apiClient.getSaleInvoice(saleId);
          const data = resp?.data || resp;
          // API returns { success: true, data: invoice_data } where invoice_data.sale contains sale details
          const invoiceData = data?.data || data;
          const saleFromInvoice = invoiceData?.sale || null;
          if (saleFromInvoice) return saleFromInvoice;
        } else {
          // Fallback to manual API call
          const resp = await this.apiClient.get(`/api/sales/${saleId}/invoice`);
          const data = resp?.data || resp;
          // API returns { success: true, data: invoice_data } where invoice_data.sale contains sale details
          const invoiceData = data?.data || data;
          const saleFromInvoice = invoiceData?.sale || null;
          if (saleFromInvoice) return saleFromInvoice;
        }
      } catch (detailErr) {
        // Not fatal — fallback to patient sales list
        // logger.debug('sale-invoice endpoint not available or failed', detailErr);
      }

      const sales = await this.fetchPatientSalesFromAPI(pid);
      if (!Array.isArray(sales)) return null;
      return sales.find(s => String(s.id) === String(saleId)) || null;
    } catch (err) {
      logger.warn('fetchSaleData failed', err);
      return null;
    }
  }

  /**
   * Calculate total sales amount
   */
  calculateTotalSales(sales) {
    if (!sales || !Array.isArray(sales) || sales.length === 0) return 0;
    return sales.reduce((sum, sale) => {
      const patientPayable = (function(s) {
          const patientPayableAmount = s.totalPatientPayment || s.patient_payment || s.patientPayment || s.finalAmount || s.final_amount;
          if (typeof patientPayableAmount === 'number') return patientPayableAmount;
          const total = s.totalAmount || 0;
          const discount = s.discountAmount || 0;
          const sgk = s.sgkCoverage || 0;
          return total - discount - sgk;
        })(sale);
      return sum + (patientPayable || 0);
    }, 0);
  }

  /**
   * Calculate total remaining payment amount
   */
  calculateTotalRemaining(sales) {
    if (!sales || !Array.isArray(sales) || sales.length === 0) return 0;
    return sales.reduce((sum, sale) => {
      const patientPayable = sale.totalPatientPayment || sale.patient_payment || sale.patientPayment || sale.finalAmount || sale.final_amount || 0;
      // Paid amount prefers paymentRecords sum, then paid_amount/paidAmount
      let paid = 0;
      if (Array.isArray(sale.paymentRecords) && sale.paymentRecords.length > 0) {
        paid = sale.paymentRecords.reduce((acc, r) => acc + (r.amount || 0), 0);
      } else {
        paid = sale.paid_amount || sale.paidAmount || 0;
      }
      const remaining = patientPayable - paid;
      return sum + (remaining > 0 ? remaining : 0);
    }, 0);
  }

  /**
   * Get last sale date
   */
  getLastSaleDate(sales) {
    if (!sales || !Array.isArray(sales) || sales.length === 0) return 'Satış yok';
    const lastSale = sales.sort((a, b) => {
      const dateA = new Date(a.date || a.saleDate || a.createdAt);
      const dateB = new Date(b.date || b.saleDate || b.createdAt);
      return dateB - dateA;
    })[0];
    return new Date(lastSale.date || lastSale.saleDate || lastSale.createdAt).toLocaleDateString('tr-TR');
  }

  /**
   * Render returns and exchanges section
   */
  async renderReturnsExchanges(patientId) {
    return this.returnsModule.renderReturnsExchanges(patientId);
  }

  /**
   * Refresh sales table after changes
   */
  async refreshSalesTable(patientId) {
    try {
      logger.log('🔄 Refreshing sales table for patient:', patientId);
      
      // Force fetch fresh sales data from API (bypass any cache)
      const freshSales = await this.fetchPatientSalesFromAPI(patientId);
      logger.log('📊 Fresh sales data fetched:', freshSales.length, 'sales');
      
      // Apply date filter if active
      const filteredSales = this.applyDateFilter(freshSales);
      
      // Wait a bit for data to settle
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get current patient data
      let patientData = window.currentPatientData;
      
      // If we don't have current patient data, try to fetch it
      if (!patientData || patientData.id !== patientId) {
        logger.log('🔄 Fetching patient data...');
        try {
          let response;
          if (this.apiClient.getPatient) {
            response = await this.apiClient.getPatient(patientId);
          } else {
            // Fallback to manual API call
            response = await this.apiClient.get(`/api/patients/${patientId}`);
          }
          patientData = response?.data || response;
        } catch (error) {
          logger.error('Failed to fetch patient data:', error);
          // Use a minimal patient object
          patientData = { id: patientId };
        }
      }
      
      // Update window.currentPatientData with fresh sales
      if (window.currentPatientData && window.currentPatientData.id === patientId) {
        window.currentPatientData.sales = filteredSales;
      }
      
      // Re-render the entire sales tab with fresh data
      const content = await this.renderSalesTab(patientData);
      const tabContent = document.getElementById('tab-content');
      if (tabContent) {
        tabContent.innerHTML = content;
        logger.log('✅ Sales tab refreshed successfully');
      } else {
        logger.warn('⚠️ Could not find tab-content element');
      }
    } catch (error) {
      logger.error('❌ Failed to refresh sales table:', error);
      this.showToast('Satış tablosu yenilenemedi', 'error');
    }
  }

  /**
   * Apply date filter to sales data
   */
  applyDateFilter(sales) {
    const dateFrom = document.getElementById('salesDateFrom')?.value;
    const dateTo = document.getElementById('salesDateTo')?.value;
    
    if (!dateFrom && !dateTo) {
      return sales;
    }
    
    // Ensure sales is an array before filtering
    if (!Array.isArray(sales)) {
      logger.warn('Sales data is not an array in applyDateFilter:', sales);
      return [];
    }
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.saleDate || sale.date || sale.createdAt || sale.created_at);
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (saleDate < fromDate) return false;
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Include the entire end date
        if (saleDate > toDate) return false;
      }
      
      return true;
    });
  }

  /**
   * Apply sales date filter
   */
  async applySalesDateFilter(patientId) {
    await this.refreshSalesTable(patientId);
  }

  /**
   * Clear sales date filter
   */
  async clearSalesDateFilter(patientId) {
    document.getElementById('salesDateFrom').value = '';
    document.getElementById('salesDateTo').value = '';
    await this.refreshSalesTable(patientId);
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      logger.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Close modal helper
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.remove();
    }
  }
}

// Initialize and expose globally
if (typeof window !== 'undefined') {
  window.SalesManagementComponent = SalesManagementComponent;
  
  // Auto-initialize if ApiClient is available
  if (window.ApiClient) {
    const apiClient = new window.ApiClient();
    window.salesManagement = new SalesManagementComponent(apiClient);
  }
}

export default SalesManagementComponent;
