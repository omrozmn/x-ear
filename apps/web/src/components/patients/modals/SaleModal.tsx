import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Input,
  Textarea,
  Alert,
  Select
} from '@x-ear/ui-web';
import { CreditCard, FileText, X, Search, Package, DollarSign } from 'lucide-react';
import { Patient } from '../../../types/patient/patient-base.types';
import { useInventory } from '../../../hooks/useInventory';
import ProductSearch, { type Product } from '../../common/ProductSearch';
import { useFuzzySearch } from '../../../utils/fuzzySearch';
import { createPatientTimeline, createPatientActivities } from '@/api/generated';
import { patientApiService } from '../../../services/patient/patient-api.service';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onSaleCreate: (sale: any) => void;
}

function SaleModal({ isOpen, onClose, patient, onSaleCreate }: SaleModalProps) {
  // Legacy UX'a uygun basit state
  const [patientStatus, setPatientStatus] = useState('worker');
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed'); // TL indirim
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [downPayment, setDownPayment] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devices, setDevices] = useState<any[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(1);
  const [interestRate, setInterestRate] = useState(0);

  // Use inventory hook for products
  const { products, loading: productsLoading } = useInventory();

  // Fuzzy search utility
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const fuzzySearchUtil = new (require('../../../utils/fuzzySearch').FuzzySearchUtil)({
    threshold: 0.6,
    maxDistance: 3,
    caseSensitive: false,
    includeScore: true,
    minLength: 1
  });

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) {
      return products.slice(0, 10); // Show first 10 products when no search
    }

    const searchResults = fuzzySearchUtil.search(productSearchTerm, products, ['name', 'brand', 'model', 'barcode', 'serialNumber']);
    return searchResults.slice(0, 10).map(result => result.item);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSearchTerm, products]);  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showProductDropdown && !target.closest('.product-search-container')) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProductDropdown]);

  // Legacy'deki calculateTotal fonksiyonu gibi KDV hesaplaması
  const calculateTotals = () => {
    if (!selectedDevice) {
      return {
        basePrice: 0,
        discountAmount: 0,
        netAmount: 0,
        kdvRate: 0,
        kdvAmount: 0,
        total: 0,
        remaining: 0
      };
    }

    const basePrice = selectedDevice.price * quantity;
    const discountAmount = discountType === 'percentage'
      ? (basePrice * discount) / 100
      : discount;

    const netAmount = Math.max(0, basePrice - discountAmount);

    // KDV hesaplaması - legacy'deki gibi
    const isHearingAid = selectedDevice.category?.toLowerCase().includes('hearing_aid') ||
      selectedDevice.category?.toLowerCase().includes('işitme');
    const kdvRate = isHearingAid ? 0 : 20;
    const kdvAmount = (netAmount * kdvRate) / 100;
    const total = netAmount + kdvAmount;
    const remaining = total - downPayment;

    return {
      basePrice,
      discountAmount,
      netAmount,
      kdvRate,
      kdvAmount,
      total,
      remaining: Math.max(0, remaining)
    };
  };

  const totals = calculateTotals();

  // Form validation - legacy'deki gibi
  const handleSubmit = async () => {
    if (!selectedDevice) {
      setError('Lütfen bir cihaz seçiniz');
      return;
    }

    if (!patient.id) {
      setError('Hasta bilgisi bulunamadı');
      return;
    }

    if (totals.total <= 0) {
      setError('Geçerli bir satış tutarı giriniz');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use PatientApiService instead of direct API call
      const saleData = {
        devices: [{
          id: selectedDevice.id,
          inventoryId: selectedDevice.inventoryId, // Add inventoryId for backend
          ear: 'left', // Default ear side
          listPrice: selectedDevice.price,
          discountType: discountType,
          discountValue: discount,
          notes: notes
        }],
        sgkScheme: patientStatus === 'retired' ? 'retired' : 'standard',
        paymentMethod: paymentMethod,
        paidAmount: downPayment,
        // Taksit bilgileri
        ...(paymentMethod === 'installment' && {
          installmentCount: installmentCount,
          interestRate: interestRate
        })
      };

      const response = await patientApiService.createSale(patient.id, saleData);

      if (response.success) {
        alert('Satış başarıyla kaydedildi!');

        // Create timeline and sales logs
        const saleId = (response.data as any)?.id;
        if (saleId && notes.trim() && patient.id) {
          await createTimelineLog(patient.id, notes, saleId);
        }
        if (saleId && patient.id) {
          await createSalesLog(patient.id, saleData, saleId);
        }

        onSaleCreate(response.data);
        handleClose();
      } else {
        setError(response.message || 'Satış kaydedilirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Satış kaydedilirken hata:', error);
      setError('Satış kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form - legacy'deki closeModal gibi
    setPatientStatus('worker');
    setSelectedDevice(null);
    setQuantity(1);
    setDiscount(0);
    setDiscountType('fixed');
    setPaymentMethod('cash');
    setDownPayment(0);
    setNotes('');
    setInstallmentCount(1);
    setInterestRate(0);
    setProductSearchTerm('');
    setShowProductDropdown(false);
    setError('');
    onClose();
  };

  // Legacy'deki gibi timeline log oluşturma
  const createTimelineLog = async (patientId: string, notes: string, saleId: string) => {
    try {
      const timelineData = {
        type: 'sale',
        title: 'Ürün Satışı Gerçekleştirildi',
        description: `Ürün satışı yapıldı: ${selectedDevice?.brand} ${selectedDevice?.model || selectedDevice?.name}`,
        details: {
          id: saleId,
          product_id: selectedDevice?.id,
          product_name: `${selectedDevice?.brand} ${selectedDevice?.model || selectedDevice?.name}`,
          amount: totals.total,
          payment_method: paymentMethod,
          notes: notes
        },
        user: 'Sistem', // TODO: Get from auth context
        category: 'sales'
      };

      await createPatientTimeline(patientId, timelineData as any);
      console.log('Timeline log created successfully');
    } catch (error) {
      console.error('Error creating timeline log:', error);
      // Don't block the sale process if timeline logging fails
    }
  };

  // Legacy'deki gibi sales log oluşturma (cashflow için)
  const createSalesLog = async (patientId: string, saleData: any, saleId: string) => {
    try {
      // Create activity log entry for cashflow tracking
      const activityData = {
        type: 'sale',
        title: 'Satış Geliri',
        description: `${selectedDevice?.brand} ${selectedDevice?.model || selectedDevice?.name} satışı`,
        details: {
          patient_id: patientId,
          sale_id: saleId,
          product_id: selectedDevice?.id,
          amount: totals.total,
          payment_type: paymentMethod,
          discount: totals.discountAmount,
          notes: notes,
          user_name: 'Sistem', // TODO: Get from auth context
          timestamp: new Date().toISOString()
        },
        category: 'sales'
      };

      await createPatientActivities(patientId, activityData as any);
      console.log('Sales activity log created successfully');
    } catch (error) {
      console.error('Error creating sales activity log:', error);
      // Don't block the sale process if activity logging fails
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            Yeni Satış - {patient.firstName} {patient.lastName}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* Hasta Durumu Seçimi - Legacy'deki gibi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hasta Durumu <span className="text-red-500">*</span>
              </label>
              <Select
                value={patientStatus}
                onChange={(e) => setPatientStatus(e.target.value)}
                className="w-full"
                options={[
                  { value: "worker", label: "Çalışan" },
                  { value: "retired", label: "Emekli" },
                  { value: "beneficiary", label: "Yakın (Çalışan/Emekli Yakını)" }
                ]}
              />
            </div>

            {/* Ürün Arama - Legacy'deki gibi fuzzy search */}
            <div className="relative product-search-container">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ürün Seçimi <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Ürün ara (marka, model, kategori)..."
                  value={productSearchTerm}
                  onChange={(e) => {
                    setProductSearchTerm(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  className="pl-10 w-full"
                  disabled={productsLoading}
                />
              </div>

              {/* Arama Sonuçları Dropdown */}
              {showProductDropdown && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    <div className="py-1">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => {
                            setSelectedDevice(product);
                            setProductSearchTerm(`${product.brand} ${product.model || product.name}`);
                            setShowProductDropdown(false);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-sm">
                                {product.brand} {product.model || product.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {product.category || 'Kategori belirtilmemiş'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-blue-600 text-sm">
                                {product.price?.toLocaleString('tr-TR')} TL
                              </div>
                              <div className="text-xs text-gray-500">
                                Stok: {product.stock || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : productSearchTerm && (
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      Ürün bulunamadı
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ürün Detayları - Legacy'deki gibi */}
            {selectedDevice && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Ürün Detayları
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Marka:</span>
                    <span className="font-medium ml-2">{selectedDevice.brand || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Model:</span>
                    <span className="font-medium ml-2">{selectedDevice.model || selectedDevice.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Kategori:</span>
                    <span className="font-medium ml-2">{selectedDevice.category || 'Kategori belirtilmemiş'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fiyat:</span>
                    <span className="font-medium ml-2 text-blue-600">{selectedDevice.price?.toLocaleString('tr-TR')} TL</span>
                  </div>
                  <div>
                    <span className="text-gray-600">KDV (%):</span>
                    <span className="font-medium ml-2 text-green-600">
                      {selectedDevice.category?.toLowerCase().includes('hearing_aid') ||
                        selectedDevice.category?.toLowerCase().includes('işitme') ? '0' : '20'}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Stok:</span>
                    <span className={`font-medium ml-2 ${(selectedDevice.stock || 0) === 0 ? 'text-red-600' :
                        (selectedDevice.stock || 0) <= 5 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                      {selectedDevice.stock || 0} adet
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Barkod:</span>
                    <span className="font-medium ml-2 font-mono text-xs">{selectedDevice.barcode || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* İndirim - Legacy'deki gibi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İndirim
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="İndirim tutarı"
                  className="flex-1"
                />
                <Select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="w-24"
                  options={[
                    { value: 'fixed', label: 'TL' },
                    { value: 'percentage', label: '%' }
                  ]}
                />
              </div>
            </div>

            {/* Ödeme Yöntemi - Legacy'deki gibi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Ödeme Yöntemi</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 border rounded-lg text-center transition-colors ${paymentMethod === 'cash'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                >
                  <CreditCard className="mx-auto mb-1" size={20} />
                  <span className="text-sm font-medium">Nakit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 border rounded-lg text-center transition-colors ${paymentMethod === 'card'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                >
                  <CreditCard className="mx-auto mb-1" size={20} />
                  <span className="text-sm font-medium">Kart</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-3 border rounded-lg text-center transition-colors ${paymentMethod === 'transfer'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                >
                  <span className="text-sm font-medium">Havale</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('installment')}
                  className={`p-3 border rounded-lg text-center transition-colors ${paymentMethod === 'installment'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                >
                  <span className="text-sm font-medium">Taksit</span>
                </button>
              </div>
            </div>

            {/* Taksit Seçenekleri - Sadece taksit seçildiğinde göster */}
            {paymentMethod === 'installment' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-3">Taksit Bilgileri</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Taksit Sayısı</label>
                    <Select
                      value={installmentCount.toString()}
                      onChange={(e) => setInstallmentCount(parseInt(e.target.value))}
                      options={[
                        { value: '3', label: '3 Taksit' },
                        { value: '6', label: '6 Taksit' },
                        { value: '9', label: '9 Taksit' },
                        { value: '12', label: '12 Taksit' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Faiz Oranı (%)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Fiyat Özeti - Legacy'deki gibi detaylı breakdown */}
            {selectedDevice && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Fiyat Özeti
                </h3>

                {/* İndirim varsa göster */}
                {totals.discountAmount > 0 && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-red-700 font-medium">İndirim Uygulandı</span>
                      <span className="text-red-700 font-bold">
                        -{totals.discountAmount.toLocaleString('tr-TR')} TL
                      </span>
                    </div>
                  </div>
                )}

                {/* Toplam Tutar */}
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-blue-900 text-lg">Toplam Tutar</span>
                    <span className="font-bold text-blue-600 text-xl">
                      {totals.total.toLocaleString('tr-TR')} TL
                    </span>
                  </div>

                  {/* Detaylı Breakdown */}
                  <div className="border-t border-blue-200 pt-3 space-y-1">
                    <div className="flex justify-between text-sm text-blue-700">
                      <span>Liste Fiyatı:</span>
                      <span>{totals.basePrice.toLocaleString('tr-TR')} TL</span>
                    </div>
                    {totals.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-blue-700">
                        <span>İndirim:</span>
                        <span>-{totals.discountAmount.toLocaleString('tr-TR')} TL</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-blue-700">
                      <span>KDV (%{totals.kdvRate}):</span>
                      <span>{totals.kdvAmount.toLocaleString('tr-TR')} TL</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Satış Notları */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText size={16} />
                Satış Notları
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Satış ile ilgili notlar..."
                className="w-full"
              />
            </div>

            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            {/* Butonlar */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                İptal
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !selectedDevice}>
                {loading ? 'Kaydediliyor...' : 'Satışı Tamamla'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SaleModal;