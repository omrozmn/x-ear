/**
 * Sales Details Module
 * Handles displaying detailed information about sales
 */
export class SalesDetailsModule {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Calculate display total - same logic as sales table for consistency
   */
  calculateDisplayTotal(sale) {
    // Backend'den gelen patient_payment değerini öncelikle kullan
    const patientPayment = sale.patient_payment || sale.patientPayment;
    
    if (patientPayment && patientPayment > 0) {
      return patientPayment;
    }
    
    // Eğer patient_payment yoksa, manuel hesaplama yap
    const totalAmount = sale.totalAmount || sale.total_amount || 0;
    const sgkCoverage = sale.sgkCoverage || sale.sgk_coverage || sale.total_sgk_support || 0;
    const discountAmount = sale.discountAmount || sale.discount_amount || 0;
    
    // Hasta ödemesi = Toplam tutar - SGK kapsamı - İndirim
    const calculatedPatientPayment = Math.max(0, totalAmount - sgkCoverage - discountAmount);
    
    return calculatedPatientPayment;
  }

  /**
   * Get down payment amount from payment records
   */
  getDownPaymentAmount(sale) {
    // Backend'den gelen paidAmount alanını kullan
    if (sale.paidAmount !== undefined && sale.paidAmount !== null) {
      return parseFloat(sale.paidAmount) || 0;
    }
    
    // Alternatif alan isimleri kontrol et
    if (sale.paid_amount !== undefined && sale.paid_amount !== null) {
      return parseFloat(sale.paid_amount) || 0;
    }
    
    // Payment records'dan hesapla (eski yöntem)
    if (sale.paymentRecords && sale.paymentRecords.length > 0) {
      // Find down payment records
      const downPaymentRecords = sale.paymentRecords.filter(record => 
        record.payment_type === 'down_payment' || record.paymentType === 'down_payment'
      );
      return downPaymentRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
    }
    
    // Fallback to sale data
    return sale.downPayment || 0;
  }

  /**
   * Calculate paid amount from payment records
   */
  calculatePaidAmount(sale) {
    // First check if backend already provides paidAmount to avoid recalculation
    if (sale.paidAmount !== undefined && sale.paidAmount !== null) {
      return parseFloat(sale.paidAmount) || 0;
    }
    
    if (sale.paid_amount !== undefined && sale.paid_amount !== null) {
      return parseFloat(sale.paid_amount) || 0;
    }
    
    // Calculate from payment records only if backend values are not available
    if (sale.paymentRecords && sale.paymentRecords.length > 0) {
      return sale.paymentRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
    }
    
    return 0;
  }

  /**
   * Render payment details breakdown
   */
  renderPaymentDetails(sale) {
    if (!sale.paymentRecords || sale.paymentRecords.length === 0) {
      return '';
    }

    const methodLabels = {
      'cash': 'Nakit',
      'card': 'Kart', 
      'transfer': 'Havale',
      'installment': 'Taksit',
      'promissory_note': 'Senet'
    };

    return `
      <div class="mt-3 pt-3 border-t border-gray-200">
        <div class="text-sm text-gray-600 mb-2">Ödeme Detayları:</div>
        <div class="space-y-1">
          ${sale.paymentRecords.map(record => {
            const method = methodLabels[record.paymentMethod] || record.paymentMethod;
            return `
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">${method}:</span>
                <span class="font-medium">${(record.amount || 0).toLocaleString('tr-TR')} TL</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Opens the sale details modal
   */
  async openSaleDetailsModal(saleId, patientId) {
    try {
      // Fetch sale data with full details
      const sale = await this.fetchSaleData(saleId, patientId);
      
      if (!sale) {
        this.showToast('Satış bulunamadı', 'error');
        return;
      }

      // Check if invoice exists for this sale
      let hasInvoice = false;
      let invoiceData = null;
      try {
        const invoiceResponse = await this.apiClient.get(`/api/sales/${saleId}/invoice`);
        if (invoiceResponse && invoiceResponse.success && invoiceResponse.data) {
          hasInvoice = true;
          invoiceData = invoiceResponse.data;
        }
      } catch (error) {
        // Invoice doesn't exist or error occurred, keep hasInvoice as false
        console.log('No invoice found for sale:', saleId);
      }

      // Compute a user-friendly sale date string with robust fallbacks
      const saleDateRaw = sale.saleDate || sale.date || sale.createdAt || sale.created_at || null;
      const saleDateStr = (function(d) {
        if (!d) return '-';
        const parsed = new Date(d);
        if (isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleDateString('tr-TR');
      })(saleDateRaw);

      const modal = document.createElement('div');
      modal.id = 'saleDetailsModal';
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-2xl font-bold text-gray-900">Satış Detayları - ${sale.id}</h2>
              <button onclick="this.closest('#saleDetailsModal').remove()" 
                      class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-2xl"></i>
              </button>
            </div>

            <div class="space-y-6">
              <!-- Sale Information -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h3 class="text-lg font-semibold mb-3">Satış Bilgileri</h3>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="text-gray-600">Satış ID:</span>
                    <span class="font-medium ml-2">${sale.id}</span>
                  </div>
                  <div>
                    <span class="text-gray-600">Tarih:</span>
                    <span class="font-medium ml-2">${saleDateStr}</span>
                  </div>
                  <div>
                    <span class="text-gray-600">Ödeme Yöntemi:</span>
                    <span class="font-medium ml-2">${this.getPaymentMethodLabel(sale.paymentMethod)}</span>
                  </div>
                  <div>
                    <span class="text-gray-600">Durum:</span>
                    <span class="font-medium ml-2 ${sale.status === 'paid' ? 'text-green-600' : 'text-orange-600'}">
                      ${this.getSaleStatusLabel(sale.status)}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Devices Sold -->
              ${this.renderDevicesSection(sale)}

              <!-- Financial Details -->
              <div class="bg-blue-50 p-4 rounded-lg">
                <h3 class="text-lg font-semibold mb-3">Finansal Detaylar</h3>
                <div class="space-y-2 text-sm">
                  <!-- Liste Fiyatı -->
                  <div class="flex justify-between">
                    <span class="text-gray-700">Liste Fiyatı:</span>
                    <span class="font-medium">${(sale.listPriceTotal || sale.totalAmount || 0).toLocaleString('tr-TR')} TL</span>
                  </div>
                  
                  <!-- Toplam Tutar -->
                  <div class="flex justify-between">
                    <span class="text-gray-700">Toplam Tutar:</span>
                    <span class="font-medium">${(sale.totalAmount || 0).toLocaleString('tr-TR')} TL</span>
                  </div>
                  
                  <!-- SGK Kapsamı ve Grubu - Sadece işitme cihazı için göster -->
                  ${this.isHearingAidCategory(sale) ? `
                    <div class="flex justify-between">
                      <span class="text-gray-700">SGK Kapsamı ${this.getSgkGroupInfo(sale)}:</span>
                      <span class="font-medium ${(sale.sgkCoverage || sale.sgk_coverage || sale.total_sgk_support) > 0 ? 'text-green-600' : 'text-gray-500'}">
                        ${(sale.sgkCoverage || sale.sgk_coverage || sale.total_sgk_support) > 0 ? '-' : ''}${(sale.sgkCoverage || sale.sgk_coverage || sale.total_sgk_support || 0).toLocaleString('tr-TR')} TL
                      </span>
                    </div>
                  ` : ''}
                  
                  <!-- İndirim Tutarı ve Oranı - Her zaman göster -->
                  <div class="flex justify-between">
                    <span class="text-gray-700">İndirim ${this.getDiscountPercentage(sale)}:</span>
                    <span class="font-medium ${(sale.discountAmount || sale.discount_amount) > 0 ? 'text-red-600' : 'text-gray-500'}">
                      ${(sale.discountAmount || sale.discount_amount) > 0 ? '-' : ''}${(sale.discountAmount || sale.discount_amount || 0).toLocaleString('tr-TR')} TL
                    </span>
                  </div>
                  
                  <!-- Ön Ödeme Tutarı -->
                  <div class="flex justify-between">
                    <span class="text-gray-700">Ön Ödeme:</span>
                    <span class="font-medium ${this.getDownPaymentAmount(sale) > 0 ? 'text-blue-600' : 'text-gray-500'}">${this.getDownPaymentAmount(sale).toLocaleString('tr-TR')} TL</span>
                  </div>
                  
                  <!-- KDV Oranı -->
                  <div class="flex justify-between">
                    <span class="text-gray-700">KDV Oranı:</span>
                    <span class="font-medium">${this.getVatRate(sale)}%</span>
                  </div>
                  
                  <!-- KDV Tutarı -->
                  ${this.calculateVatAmount(sale) > 0 ? `
                    <div class="flex justify-between">
                      <span class="text-gray-700">KDV Tutarı:</span>
                      <span class="font-medium text-orange-600">${this.calculateVatAmount(sale).toLocaleString('tr-TR')} TL</span>
                    </div>
                  ` : ''}
                  
                  <!-- Net Tutar (Hasta Ödemesi) -->
                  <div class="flex justify-between border-t pt-2 mt-2">
                    <span class="font-semibold text-gray-900">Hasta Ödemesi (KDV Hariç):</span>
                    <span class="font-bold text-blue-600 text-lg">${Math.max(0, (sale.totalAmount || 0) - (sale.discountAmount || sale.discount_amount || 0)).toLocaleString('tr-TR')} TL</span>
                  </div>
                  
                  <!-- KDV Dahil Toplam -->
                  <div class="flex justify-between">
                    <span class="font-semibold text-gray-900">KDV Dahil Toplam:</span>
                    <span class="font-bold text-purple-600 text-lg">${this.calculateTotalWithVat(sale).toLocaleString('tr-TR')} TL</span>
                  </div>
                  
                  <!-- Ödenen ve Kalan Tutar -->
                  ${(sale.paidAmount !== undefined || sale.paid_amount !== undefined || (sale.paymentRecords && sale.paymentRecords.length > 0)) ? `
                    <div class="flex justify-between">
                      <span class="text-gray-700">Ödenen:</span>
                      <span class="font-medium text-green-600">${this.calculatePaidAmount(sale).toLocaleString('tr-TR')} TL</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-700">Kalan Tutar:</span>
                      <span class="font-medium text-red-600">${Math.max(0, this.calculateTotalWithVat(sale) - this.calculatePaidAmount(sale)).toLocaleString('tr-TR')} TL</span>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Ödeme Geçmişi -->
              ${this.renderPaymentHistory(sale)}
            </div>

            <!-- Modal Footer with Action Buttons -->
            <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
              <button onclick="this.closest('#saleDetailsModal').remove()" 
                      class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Kapat
              </button>
              
              <div class="flex space-x-3">
                <!-- Tahsilat Button -->
                <button onclick="window.salesManagement?.openCollectionModal('${patientId}'); this.closest('#saleDetailsModal').remove();" 
                        class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center">
                  <i class="fas fa-hand-holding-usd mr-2"></i>Tahsilat
                </button>
                
                <!-- Fatura Button (Conditional) -->
                ${hasInvoice ? 
                  `<button onclick="window.invoicePreview?.open('${invoiceData.id}'); this.closest('#saleDetailsModal').remove();" 
                          class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center">
                    <i class="fas fa-file-alt mr-2"></i>Fatura Önizle
                  </button>` :
                  `<button onclick="window.salesManagement?.createInvoice('${sale.id}', '${patientId}'); this.closest('#saleDetailsModal').remove();" 
                          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                    <i class="fas fa-file-invoice mr-2"></i>Fatura Oluştur
                  </button>`
                }
                
                <!-- Düzenle Button -->
                <button onclick="window.salesManagement?.editSale('${sale.id}', '${patientId}'); this.closest('#saleDetailsModal').remove();" 
                        class="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center">
                  <i class="fas fa-pen mr-2"></i>Düzenle
                </button>
                
                <!-- Yazdır Button -->
                <button onclick="window.print()" 
                        class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center">
                  <i class="fas fa-print mr-2"></i>Yazdır
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    } catch (error) {
      console.error('Failed to open sale details modal:', error);
      this.showToast('Satış detayları gösterilemedi', 'error');
    }
  }

  /**
   * Renders the devices section
   */
  renderDevicesSection(sale) {
    if (!sale.devices || sale.devices.length === 0) {
      return '';
    }

    return `
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold mb-3">Satılan Cihazlar</h3>
        <div class="space-y-2">
          ${sale.devices.map(device => `
            <div class="bg-white p-3 rounded border">
              <div class="flex justify-between">
                <div>
                  <p class="font-medium">${device.name || (device.brand && device.model ? `${device.brand} ${device.model}` : device.brand || device.model || 'Cihaz')}</p>
                  <p class="text-sm text-gray-600">Seri: ${device.serialNumber || device.serial_number || '-'}</p>
                  ${device.barcode ? `<p class="text-sm text-gray-600">Barkod: ${device.barcode}</p>` : ''}
                  ${device.ear ? `<p class="text-xs text-gray-500">Kulak: ${device.ear === 'left' || device.ear === 'L' ? 'Sol' : device.ear === 'right' || device.ear === 'R' ? 'Sağ' : 'Bilateral'}</p>` : ''}
                  ${device.sgk_scheme || device.sgkScheme ? `<p class="text-xs text-blue-600">SGK: ${this.getSingleDeviceSgkLabel(device.sgk_scheme || device.sgkScheme)}</p>` : ''}
                  ${device.sgk_support || device.sgkSupport ? `<p class="text-xs text-green-600">SGK Desteği: ${(device.sgk_support || device.sgkSupport || 0).toLocaleString('tr-TR')} TL</p>` : ''}
                </div>
                <div class="text-right">
                  <p class="font-medium">${(
                    (device.salePrice ?? device.listPrice ?? device.price ?? device.patientPayment ?? 0)
                  ).toLocaleString('tr-TR')} TL</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Renders the payment plan section
   */
  renderPaymentPlan(plan) {
    return `
      <div class="bg-purple-50 p-4 rounded-lg">
        <h3 class="text-lg font-semibold mb-3">Taksit Planı</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-700">Taksit Sayısı:</span>
            <span class="font-medium">${plan.installmentCount || 0} ay</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-700">Aylık Taksit:</span>
            <span class="font-medium">${(plan.installmentAmount || 0).toLocaleString('tr-TR')} TL</span>
          </div>
          ${plan.interestRate ? `
            <div class="flex justify-between">
              <span class="text-gray-700">Faiz Oranı:</span>
              <span class="font-medium">%${plan.interestRate}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Renders the payment history section
   */
  renderPaymentHistory(sale) {
    if (!sale.paymentRecords || sale.paymentRecords.length === 0) {
      return '';
    }

    return `
      <div class="bg-green-50 p-4 rounded-lg mt-4">
        <h3 class="text-lg font-semibold mb-3">Ödeme Geçmişi</h3>
        <div class="space-y-2">
          ${sale.paymentRecords.map(payment => {
            // For down payments without a date, use the sale date
            let paymentDate = payment.date || payment.paymentDate;
            if (!paymentDate && payment.payment_type === 'down_payment' && sale.date) {
              paymentDate = sale.date;
            }
            
            return `
            <div class="bg-white p-3 rounded border">
              <div class="flex justify-between items-center">
                <div>
                  <p class="font-medium">${this.getPaymentMethodLabel(payment.method || payment.paymentMethod)}</p>
                  <p class="text-sm text-gray-600">${paymentDate ? new Date(paymentDate).toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş'}</p>
                  ${payment.notes ? `<p class="text-xs text-gray-500">${payment.notes}</p>` : ''}
                </div>
                <div class="text-right">
                  <p class="font-medium text-green-600">${(payment.amount || 0).toLocaleString('tr-TR')} TL</p>
                  ${payment.status ? `<p class="text-xs ${payment.status === 'completed' || payment.status === 'paid' ? 'text-green-500' : 'text-yellow-500'}">${payment.status === 'completed' || payment.status === 'paid' ? 'Tamamlandı' : 'Beklemede'}</p>` : ''}
                </div>
              </div>
            </div>
          `;}).join('')}
        </div>
        <div class="border-t pt-3 mt-3">
          <div class="flex justify-between font-semibold">
            <span>Toplam Ödenen:</span>
            <span class="text-green-600">${this.calculatePaidAmount(sale).toLocaleString('tr-TR')} TL</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get SGK group information
   */
  getSgkGroupInfo(sale) {
    const sgkScheme = sale.sgk_scheme || sale.sgkScheme;
    const sgkGroup = sale.sgkGroup || sale.sgk_group;
    const sgkCoverage = sale.sgkCoverage || sale.sgk_coverage;
    
    // Check if this is a bilateral case with device assignments
    if (sale.devices && sale.devices.length > 1) {
      const leftDevice = sale.devices.find(d => d.ear === 'left' || d.ear === 'L');
      const rightDevice = sale.devices.find(d => d.ear === 'right' || d.ear === 'R');
      
      if (leftDevice && rightDevice) {
        const leftScheme = leftDevice.sgk_scheme || leftDevice.sgkScheme;
        const rightScheme = rightDevice.sgk_scheme || rightDevice.sgkScheme;
        
        // If both ears have different SGK schemes, show detailed breakdown
        if (leftScheme && rightScheme && leftScheme !== rightScheme) {
          const sgkSchemeLabels = {
            'no_coverage': 'SGK hakkı yok',
            'premium': 'Premium SGK',
            'private': 'Özel Sigorta',
            'standard': 'Standart SGK',
            'under4_parent_working': '0-4 yaş, çalışan ebeveyn',
            'under4_parent_retired': '0-4 yaş, emekli ebeveyn',
            '5to12_parent_working': '5-12 yaş, çalışan ebeveyn',
            '5to12_parent_retired': '5-12 yaş, emekli ebeveyn',
            'age13_18_parent_working': '13-18 yaş, çalışan ebeveyn',
            'age13_18_parent_retired': '13-18 yaş, emekli ebeveyn',
            'over18_working': '18+ yaş, çalışan',
            'over18_retired': '18+ yaş, emekli'
          };
          
          const leftLabel = sgkSchemeLabels[leftScheme] || leftScheme;
          const rightLabel = sgkSchemeLabels[rightScheme] || rightScheme;
          
          return `(Sol: ${leftLabel}, Sağ: ${rightLabel})`;
        }
      }
    }
    
    // Fallback to original logic for single ear or same scheme bilateral cases
    if (sgkScheme) {
      // SGK scheme değerlerini kullanıcı dostu metinlere çevir
      const sgkSchemeLabels = {
        'no_coverage': 'SGK hakkı yok',
        'premium': 'Premium SGK',
        'private': 'Özel Sigorta',
        'standard': 'Standart SGK',
        'under4_parent_working': '0-4 yaş, çalışan ebeveyn',
        'under4_parent_retired': '0-4 yaş, emekli ebeveyn',
        '5to12_parent_working': '5-12 yaş, çalışan ebeveyn',
        '5to12_parent_retired': '5-12 yaş, emekli ebeveyn',
        'age13_18_parent_working': '13-18 yaş, çalışan ebeveyn',
        'age13_18_parent_retired': '13-18 yaş, emekli ebeveyn',
        'over18_working': '18+ yaş, çalışan',
        'over18_retired': '18+ yaş, emekli'
      };
      
      const label = sgkSchemeLabels[sgkScheme] || sgkScheme;
      return `(${label})`;
    } else if (sgkGroup) {
      return `(${sgkGroup})`;
    } else if (!sgkCoverage || sgkCoverage === 0) {
      return '(SGK hakkı yok)';
    }
    return '';
  }

  /**
   * Get SGK scheme label for a single device
   */
  getSingleDeviceSgkLabel(sgkScheme) {
    const sgkSchemeLabels = {
      'no_coverage': 'SGK hakkı yok',
      'premium': 'Premium SGK',
      'private': 'Özel Sigorta',
      'standard': 'Standart SGK',
      'under4_parent_working': '0-4 yaş, çalışan ebeveyn',
      'under4_parent_retired': '0-4 yaş, emekli ebeveyn',
      '5to12_parent_working': '5-12 yaş, çalışan ebeveyn',
      '5to12_parent_retired': '5-12 yaş, emekli ebeveyn',
      'age13_18_parent_working': '13-18 yaş, çalışan ebeveyn',
      'age13_18_parent_retired': '13-18 yaş, emekli ebeveyn',
      'over18_working': '18+ yaş, çalışan',
      'over18_retired': '18+ yaş, emekli'
    };
    
    return sgkSchemeLabels[sgkScheme] || sgkScheme;
  }

  /**
   * Get discount percentage
   */
  getDiscountPercentage(sale) {
    const discountAmount = sale.discountAmount || sale.discount_amount;
    
    if (!discountAmount || discountAmount === 0) {
      return '(İndirim yok)';
    }
    
    // Sabit tutar olarak göster, yüzde hesaplama yapma
    return `(${discountAmount.toLocaleString('tr-TR')} TL)`;
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
   * Calculate VAT amount
   */
  calculateVatAmount(sale) {
    const vatRate = this.getVatRate(sale);
    // İndirimli net tutarı hesapla (liste fiyatı - indirim)
    const listPrice = sale.totalAmount || 0;
    const discountAmount = sale.discountAmount || sale.discount_amount || 0;
    const netAmount = Math.max(0, listPrice - discountAmount);
    return (netAmount * vatRate) / 100;
  }

  /**
   * Calculate total with VAT
   */
  calculateTotalWithVat(sale) {
    // İndirimli net tutar + KDV tutarı = KDV dahil toplam
    const listPrice = sale.totalAmount || 0;
    const discountAmount = sale.discountAmount || sale.discount_amount || 0;
    const netAmount = Math.max(0, listPrice - discountAmount);
    const vatAmount = this.calculateVatAmount(sale);
    return netAmount + vatAmount;
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
   * Print sale receipt
   */
  printSaleReceipt(saleId) {
    this.showToast('Fatura yazdırma özelliği geliştirme aşamasında', 'info');
    // Implementation would use window.print() with formatted receipt
  }

  /**
   * Get payment method label
   */
  getPaymentMethodLabel(method) {
    const labels = {
      'cash': 'Nakit',
      'card': 'Kredi Kartı',
      'transfer': 'Havale/EFT',
      'installment': 'Taksit',
      'check': 'Çek'
    };
    return labels[method] || method;
  }

  /**
   * Get sale status label
   */
  getSaleStatusLabel(status) {
    const labels = {
      'paid': 'Ödendi',
      'pending': 'Beklemede',
      'partial': 'Kısmi Ödendi',
      'cancelled': 'İptal edildi',
      'completed': 'Tamamlandı'
    };
    return labels[status] || status;
  }

  /**
   * Fetch sale data from API
   */
  async fetchSaleData(saleId, patientId) {
    try {
      const response = await this.apiClient.get(`/api/patients/${patientId}/sales`);
      const sales = response?.data || response || [];
      return sales.find(s => s.id === saleId);
    } catch (error) {
      console.error('Failed to fetch sale data:', error);
      return null;
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
  window.SalesDetailsModule = SalesDetailsModule;
  
  // Initialize if ApiClient is available
  if (window.ApiClient) {
    const apiClient = new window.ApiClient();
    window.salesDetails = new SalesDetailsModule(apiClient);
  }
}
