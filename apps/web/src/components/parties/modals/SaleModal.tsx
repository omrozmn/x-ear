import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Input,
  Textarea,
  Alert,
  Select
} from '@x-ear/ui-web';
import { CreditCard, FileText, X, Search, Package, DollarSign, ScanLine } from 'lucide-react';
import { Party } from '../../../types/party/party-base.types';
import { useInventory, InventoryItemRead } from '../../../hooks/useInventory';
import { useSector } from '../../../hooks/useSector';
import { fuzzySearch } from '../../../utils/fuzzy-search';
import { BarcodeScannerModal } from '../../barcode';
import { useBarcodeKeyboardInput } from '../../../hooks/useBarcodeKeyboardInput';
import { createPartyTimeline, createPartyActivities } from '@/api/client/timeline.client';
import { partyApiService } from '../../../services/party/party-api.service';
import { SaleRead } from '@/api/generated/schemas';
import toast from 'react-hot-toast';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
  onSaleCreate: (sale: SaleRead) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  hearing_aid: 'İşitme Cihazı',
  battery: 'Pil',
  accessory: 'Aksesuar',
  ear_mold: 'Kulak Kalıbı',
  maintenance: 'Bakım',
};

function getCategoryLabel(category?: string): string {
  if (!category) return 'Kategori belirtilmemiş';
  return CATEGORY_LABELS[category] || category;
}

function SaleModal({ isOpen, onClose, party, onSaleCreate }: SaleModalProps) {
  // Legacy UX'a uygun basit state
  const [partyStatus, setPartyStatus] = useState('worker');
  const [selectedDevice, setSelectedDevice] = useState<InventoryItemRead | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed'); // TL indirim
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [downPayment, setDownPayment] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [installmentCount, setInstallmentCount] = useState(1);
  const [interestRate, setInterestRate] = useState(0);

  // Use inventory hook for products
  const { products, loading: productsLoading } = useInventory();
  const { isHearingSector } = useSector();

  // Fuzzy search utility
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleBarcodeScan = (barcode: string) => {
    setProductSearchTerm(barcode);
    setShowProductDropdown(true);
    setIsScannerOpen(false);
  };

  // USB barcode scanner support
  useBarcodeKeyboardInput({
    onScan: handleBarcodeScan,
    enabled: isOpen,
  });

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) {
      return products.slice(0, 10); // Show first 10 products when no search
    }

    const searchResults = fuzzySearch(products, productSearchTerm, {
      threshold: 0.6,
      keys: ['name', 'brand', 'model', 'barcode', 'serialNumber']
    });
    return searchResults.slice(0, 10).map(result => result.item);
     
  }, [productSearchTerm, products]); // Click outside handler for dropdown
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

    const basePrice = (selectedDevice.price || 0) * quantity;
    const discountAmount = discountType === 'percentage'
      ? (basePrice * discount) / 100
      : discount;

    const netAmount = Math.max(0, basePrice - discountAmount);

    // KDV hesaplaması - hearing aid cihazlar KDV'den muaf
    const isHearingAid = isHearingSector() && (
      selectedDevice.category?.toLowerCase().includes('hearing_aid') ||
      selectedDevice.category?.toLowerCase().includes('işitme')
    );
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

    if (!party.id) {
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
      // Use PartyApiService instead of direct API call
      const saleData = {
        devices: [{
          id: selectedDevice.id,
          inventoryId: selectedDevice.id, // Use ID as inventory ID
          ...(isHearingSector() && { ear: 'left' }), // Ear side only for hearing
          listPrice: selectedDevice.price || 0, // Fallback if price missing
          discountType: discountType,
          discountValue: discount,
          notes: notes
        }],
        sgkScheme: partyStatus === 'retired' ? 'retired' : 'standard',
        paymentMethod: paymentMethod,
        paidAmount: downPayment,
        // Taksit bilgileri
        ...(paymentMethod === 'installment' && {
          installmentCount: installmentCount,
          interestRate: interestRate
        })
      };

      const response = await partyApiService.createSale(party.id, saleData);

      if (response.success) {
        toast.success('Satış başarıyla kaydedildi!');

        // Create timeline and sales logs
        const saleId = (response.data as SaleRead)?.id;
        if (saleId && notes.trim() && party.id) {
          await createTimelineLog(party.id, notes, saleId);
        }
        if (saleId && party.id) {
          await createSalesLog(party.id, saleId);
        }

        if (response.data) {
          onSaleCreate(response.data);
        }
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
    setPartyStatus('worker');
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
  const createTimelineLog = async (partyId: string, notes: string, saleId: string) => {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createPartyTimeline(partyId, timelineData as any);
      console.log('Timeline log created successfully');
    } catch (error) {
      console.error('Error creating timeline log:', error);
      // Don't block the sale process if timeline logging fails
    }
  };

  // Legacy'deki gibi sales log oluşturma (cashflow için)
  const createSalesLog = async (partyId: string, saleId: string) => {
    try {
      // Create activity log entry for cashflow tracking
      const activityData = {
        type: 'sale',
        title: 'Satış Geliri',
        description: `${selectedDevice?.brand} ${selectedDevice?.model || selectedDevice?.name} satışı`,
        details: {
          party_id: partyId,
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

      await createPartyActivities(partyId, activityData as unknown as Parameters<typeof createPartyActivities>[1]);
      console.log('Sales activity log created successfully');
    } catch (error) {
      console.error('Error creating sales activity log:', error);
      // Don't block the sale process if activity logging fails
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="sale-modal">
      <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-foreground">
            Yeni Satış - {party.firstName} {party.lastName}
          </h2>
          <button data-allow-raw="true" onClick={handleClose} className="text-muted-foreground hover:text-muted-foreground">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* Hasta Durumu ve Satış Tarihi */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Hasta Durumu <span className="text-destructive">*</span>
                </label>
                <Select
                  data-testid="sale-party-status-select"
                  value={partyStatus}
                  onChange={(e) => setPartyStatus(e.target.value)}
                  className="w-full"
                  options={[
                    { value: "worker", label: "Çalışan" },
                    { value: "retired", label: "Emekli" },
                    { value: "beneficiary", label: "Yakın (Çalışan/Emekli Yakını)" }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Satış Tarihi <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>
            </div>

            {/* Ürün Arama - Legacy'deki gibi fuzzy search */}
            <div className="relative product-search-container">
              <label className="block text-sm font-medium text-foreground mb-2">
                Ürün Seçimi <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-testid="sale-product-search-input"
                    type="text"
                    placeholder="Ürün ara (marka, model, barkod)..."
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
                <button
                  data-allow-raw="true"
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="p-2.5 border border-border rounded-xl hover:bg-muted transition-colors"
                  title="Barkod tara"
                >
                  <ScanLine className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Arama Sonuçları Dropdown */}
              {showProductDropdown && (
                <div className="absolute z-10 w-full bg-card border border-border rounded-2xl shadow-lg mt-1 max-h-60 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    <div className="py-1">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                          onClick={() => {
                            setSelectedDevice(product);
                            setProductSearchTerm(
                              product.brand && product.model
                                ? `${product.brand} ${product.model}`
                                : product.name || `${product.brand || ''} ${product.model || ''}`
                            );
                            setShowProductDropdown(false);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-medium text-foreground text-sm">
                                {product.brand && product.model
                                  ? `${product.brand} ${product.model}`
                                  : product.name || `${product.brand || ''} ${product.model || ''}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getCategoryLabel(product.category)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-primary text-sm">
                                {product.price?.toLocaleString('tr-TR')} TL
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Stok: {product.availableInventory || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : productSearchTerm && (
                    <div className="px-3 py-2 text-muted-foreground text-sm">
                      Ürün bulunamadı
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ürün Detayları - Legacy'deki gibi */}
            {selectedDevice && (
              <div className="bg-muted p-4 rounded-2xl">
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Ürün Detayları
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Marka:</span>
                    <span className="font-medium ml-2">{selectedDevice.brand || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Model:</span>
                    <span className="font-medium ml-2">{selectedDevice.model || selectedDevice.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Kategori:</span>
                    <span className="font-medium ml-2">{getCategoryLabel(selectedDevice.category)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fiyat:</span>
                    <span className="font-medium ml-2 text-primary">{selectedDevice.price?.toLocaleString('tr-TR')} TL</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">KDV (%):</span>
                    <span className="font-medium ml-2 text-success">
                      {selectedDevice.category?.toLowerCase().includes('hearing_aid') ||
                        selectedDevice.category?.toLowerCase().includes('işitme') ? '0' : '20'}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stok:</span>
                    <span className={`font-medium ml-2 ${(selectedDevice.availableInventory || 0) === 0 ? 'text-destructive' :
                      (selectedDevice.availableInventory || 0) <= 5 ? 'text-orange-600' : 'text-success'
                      }`}>
                      {selectedDevice.availableInventory || 0} adet
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Barkod:</span>
                    <span className="font-medium ml-2 font-mono text-xs">{(selectedDevice.barcode as unknown as string) || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Miktar ve Birim Fiyat */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Miktar <span className="text-destructive">*</span>
                </label>
                <Input
                  data-testid="sale-quantity-input"
                  type="number"
                  min="1"
                  value={quantity === 0 ? '' : quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  placeholder="1"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Birim Fiyat (₺)
                </label>
                <Input
                  type="text"
                  value={selectedDevice?.price?.toLocaleString('tr-TR') || '0'}
                  disabled
                  className="w-full bg-muted"
                />
              </div>
            </div>

            {/* İndirim - Legacy'deki gibi */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                İndirim
              </label>
              <div className="flex gap-2">
                <Input
                  data-testid="sale-discount-input"
                  type="number"
                  min="0"
                  value={discount === 0 ? '' : discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="flex-1"
                />
                <Select
                  data-testid="sale-discount-type-select"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="w-32"
                  options={[
                    { value: 'fixed', label: 'TL' },
                    { value: 'percentage', label: '%' }
                  ]}
                />
              </div>
            </div>

            {/* Ödeme Yöntemi - Legacy'deki gibi */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">Ödeme Yöntemi</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  data-allow-raw="true"
                  data-testid="sale-payment-cash-button"
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 border rounded-2xl text-center transition-colors ${paymentMethod === 'cash'
                    ? 'border-blue-500 bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:border-blue-300'
                    }`}
                >
                  <CreditCard className="mx-auto mb-1" size={20} />
                  <span className="text-sm font-medium">Nakit</span>
                </button>
                <button
                  data-allow-raw="true"
                  data-testid="sale-payment-card-button"
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 border rounded-2xl text-center transition-colors ${paymentMethod === 'card'
                    ? 'border-blue-500 bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:border-blue-300'
                    }`}
                >
                  <CreditCard className="mx-auto mb-1" size={20} />
                  <span className="text-sm font-medium">Kart</span>
                </button>
                <button
                  data-allow-raw="true"
                  data-testid="sale-payment-transfer-button"
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-3 border rounded-2xl text-center transition-colors ${paymentMethod === 'transfer'
                    ? 'border-blue-500 bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:border-blue-300'
                    }`}
                >
                  <span className="text-sm font-medium">Havale</span>
                </button>
                <button
                  data-allow-raw="true"
                  data-testid="sale-payment-installment-button"
                  type="button"
                  onClick={() => setPaymentMethod('installment')}
                  className={`p-3 border rounded-2xl text-center transition-colors ${paymentMethod === 'installment'
                    ? 'border-blue-500 bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:border-blue-300'
                    }`}
                >
                  <span className="text-sm font-medium">Taksit</span>
                </button>
              </div>
            </div>

            {/* Peşinat / İlk Ödeme */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tahsil Edilen Tutar (₺)
              </label>
              <Input
                data-testid="sale-down-payment-input"
                type="number"
                min="0"
                max={totals.total}
                value={downPayment === 0 ? '' : downPayment}
                onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full"
              />
              {downPayment > 0 && totals.total > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Kalan: {totals.remaining.toLocaleString('tr-TR')} TL
                </p>
              )}
            </div>

            {/* Taksit Seçenekleri - Sadece taksit seçildiğinde göster */}
            {paymentMethod === 'installment' && (
              <div className="bg-primary/10 p-4 rounded-2xl border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-3">Taksit Bilgileri</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Taksit Sayısı</label>
                    <Select
                      value={installmentCount.toString()}
                      onChange={(e) => setInstallmentCount(parseInt(e.target.value))}
                      className="w-full"
                      options={[
                        { value: '3', label: '3 Taksit' },
                        { value: '6', label: '6 Taksit' },
                        { value: '9', label: '9 Taksit' },
                        { value: '12', label: '12 Taksit' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Faiz Oranı (%)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={interestRate === 0 ? '' : interestRate}
                      onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Fiyat Özeti - Legacy'deki gibi detaylı breakdown */}
            {selectedDevice && (
              <div className="bg-primary/10 p-4 rounded-2xl border border-blue-200">
                <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Fiyat Özeti
                </h3>

                {/* İndirim varsa göster */}
                {totals.discountAmount > 0 && (
                  <div className="bg-destructive/10 p-3 rounded-2xl border border-red-200 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-destructive font-medium">İndirim Uygulandı</span>
                      <span className="text-destructive font-bold">
                        -{totals.discountAmount.toLocaleString('tr-TR')} TL
                      </span>
                    </div>
                  </div>
                )}

                {/* Toplam Tutar */}
                <div className="bg-card p-4 rounded-2xl border border-blue-200">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-blue-900 text-lg">Toplam Tutar</span>
                    <span className="font-bold text-primary text-xl">
                      {totals.total.toLocaleString('tr-TR')} TL
                    </span>
                  </div>

                  {/* Detaylı Breakdown */}
                  <div className="border-t border-blue-200 pt-3 space-y-1">
                    <div className="flex justify-between text-sm text-primary">
                      <span>Liste Fiyatı:</span>
                      <span>{totals.basePrice.toLocaleString('tr-TR')} TL</span>
                    </div>
                    {totals.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-primary">
                        <span>İndirim:</span>
                        <span>-{totals.discountAmount.toLocaleString('tr-TR')} TL</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-primary">
                      <span>KDV (%{totals.kdvRate}):</span>
                      <span>{totals.kdvAmount.toLocaleString('tr-TR')} TL</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Satış Notları */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
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
              <Button variant="outline" onClick={handleClose} data-testid="sale-cancel-button">
                İptal
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !selectedDevice} data-testid="sale-submit-button">
                {loading ? 'Kaydediliyor...' : 'Satışı Tamamla'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
        mode="input"
        title="Ürün Barkodu Tara"
      />
    </div>
  );
}

export default SaleModal;