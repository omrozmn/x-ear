import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea } from '@x-ear/ui-web';
import { X, Settings, RefreshCw, DollarSign, Shield, CreditCard } from 'lucide-react';
import type { DeviceRead, InventoryItemCreate } from '@/api/generated/schemas';
import { getAllInventory } from '@/api/generated';

// Type aliases for backward compatibility
type Device = DeviceRead;
// Flexible InventoryItem type that accepts any object with common inventory fields
type InventoryItem = {
  id?: string;
  name?: string;
  brand?: string;
  model?: string;
  category?: string;
  price?: number;
  availableInventory?: number;
  availableSerials?: string[];
  [key: string]: any;
};

interface DeviceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: any; // Using any to support new fields like saleId, deliveryStatus etc.
  inventoryItems: InventoryItem[];
  onUpdate: (deviceId: string, updates: any) => Promise<void>;
  onReplace: (deviceId: string, newDeviceData: any) => Promise<void>;
  loading?: boolean;
}

const DeviceEditModal: React.FC<DeviceEditModalProps> = ({
  isOpen,
  onClose,
  device,
  inventoryItems,
  onUpdate,
  onReplace,
  loading = false
}) => {
  const [formData, setFormData] = useState<{
    mode: 'edit' | 'replace';
    replaceMode: 'inventory' | 'manual';
    inventoryId: string;
    brand: string;
    model: string;
    serialNumber: string;
    serialNumberLeft: string;
    serialNumberRight: string;
    deviceType: string;
    price: number; // Sale Price
    listPrice: number;
    sgkSupport: number;
    patientPayment: number;
    notes: string;
    ear: string;
    deliveryStatus: string;
    isLoaner: boolean;
    reportStatus: string;
    loanerBrand: string;
    loanerModel: string;
    loanerSerialNumber: string;
    loanerSerialNumberLeft: string;
    loanerSerialNumberRight: string;
    loanerInventoryId: string;
  }>({
    mode: 'edit',
    replaceMode: 'inventory',
    inventoryId: '',
    brand: '',
    model: '',
    serialNumber: '',
    serialNumberLeft: '',
    serialNumberRight: '',
    deviceType: '',
    price: 0,
    listPrice: 0,
    sgkSupport: 0,
    patientPayment: 0,
    notes: '',
    ear: '',
    deliveryStatus: 'pending',
    isLoaner: false,
    reportStatus: '',
    loanerBrand: '',
    loanerModel: '',
    loanerSerialNumber: '',
    loanerSerialNumberLeft: '',
    loanerSerialNumberRight: '',
    loanerInventoryId: ''
  });

  // Loaner Search State
  const [loanerSearch, setLoanerSearch] = useState('');
  const [loanerResults, setLoanerResults] = useState<any[]>([]);
  const [showLoanerResults, setShowLoanerResults] = useState(false);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (loanerSearch.length >= 2) {
        try {
          const response = await getAllInventory({ search: loanerSearch });
          const result = (response as any).data || response;

          if (result.success) {
            setLoanerResults(result.data);
            setShowLoanerResults(true);
          }
        } catch (error) {
          console.error("Loaner search failed", error);
        }
      } else {
        setLoanerResults([]);
        setShowLoanerResults(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [loanerSearch]);

  const selectLoaner = (device: any) => {
    setFormData(prev => ({
      ...prev,
      loanerInventoryId: device.id,
      loanerBrand: device.brand,
      loanerModel: device.model,
      loanerSerialNumber: device.serialNumber
    }));
    setLoanerSearch(`${device.brand} ${device.model}`);
    setShowLoanerResults(false);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if device is bilateral
  const isBilateral = React.useMemo(() => {
    if (!device) return false;
    const ear = (device.ear || device.earSide || '').toLowerCase();
    return ear.includes('both') || ear.includes('bi') || ear.startsWith('b');
  }, [device]);

  useEffect(() => {
    if (device) {
      const earVal = (device.ear || device.earSide || '').toLowerCase();
      // Normalize to match dropdown options values
      let normalizedEar = 'Left';
      if (earVal.includes('right') || earVal === 'r') normalizedEar = 'Right';
      else if (earVal.includes('both') || earVal.includes('bi') || earVal === 'b') normalizedEar = 'Bilateral';

      // If we detected bilateral via isBilateral helper or the string match, set proper Ear
      // Note: isBilateral runs before this, so rely on normalizedEar.

      const qty = normalizedEar === 'Bilateral' ? 2 : 1;

      // Normalize reportStatus to match dropdown options
      const rawReportStatus = String(device.reportStatus || device.report_status || '').toLowerCase().trim();

      console.log('🔍 [DeviceEditModal] Rapor Durumu Debug:', {
        original: {
          reportStatus: device.reportStatus,
          report_status: device.report_status
        },
        raw: rawReportStatus,
        matchReceived: ['raporlu', 'received', 'has_report', 'true'].includes(rawReportStatus)
      });

      let normalizedReportStatus = '';
      if (['raporlu', 'received', 'has_report', 'true'].includes(rawReportStatus)) normalizedReportStatus = 'received';
      else if (['bekleniyor', 'pending'].includes(rawReportStatus)) normalizedReportStatus = 'pending';
      else if (['none', 'raporsuz', 'null', 'undefined', ''].includes(rawReportStatus)) normalizedReportStatus = 'none';

      setFormData(prev => ({
        ...prev,
        brand: device.brand || '',
        model: device.model || '',
        serialNumber: device.serialNumber || '',
        serialNumberLeft: device.serialNumberLeft || '',
        serialNumberRight: device.serialNumberRight || '',
        deviceType: device.deviceType || '',
        price: Number(device.salePrice || device.price || 0) * qty,
        listPrice: Number(device.listPrice || 0) * qty,
        sgkSupport: Number(device.sgkReduction || device.sgkSupport || 0) * qty,
        patientPayment: Number(device.patientPayment || device.netPayable || 0),
        notes: device.notes || '',
        ear: normalizedEar,
        deliveryStatus: device.deliveryStatus || 'pending',
        isLoaner: !!device.isLoaner,
        reportStatus: normalizedReportStatus,
        loanerBrand: device.loanerBrand || '',
        loanerModel: device.loanerModel || '',
        loanerSerialNumber: device.loanerSerialNumber || '',
        loanerSerialNumberLeft: device.loanerSerialNumberLeft || '',
        loanerSerialNumberRight: device.loanerSerialNumberRight || '',
        loanerInventoryId: device.loanerInventoryId || ''
      }));

      if (device.isLoaner) {
        setLoanerSearch(`${device.loanerBrand || ''} ${device.loanerModel || ''}`.trim());
      }
    }
  }, [device]);

  useEffect(() => {
    // Auto-calculate Patient Payment when Price or SGK changes
    // Only if the user hasn't explicitly overridden it (complicated UI logic, let's keep simple: Price - SGK = Patient)
    // Actually, let's blindly calc: Patient Payment = Price - SGK
    // But sometimes there are discounts.
    // Let's assume Price (Sale Price) is AFTER discount.
    // So Patient Payment = Sale Price - SGK.

    // We won't auto-update to avoid annoying user corrections, 
    // but we could provide a "Recalculate" button or just let them type.
  }, [formData.price, formData.sgkSupport]);

  if (!isOpen || !device) return null;

  const handleUpdate = async () => {
    if (!device?.id) return;
    setIsSubmitting(true);

    const qty = isBilateral ? 2 : 1;

    console.log('💾 [DeviceEditModal] KAYDET BAŞLANGIÇ:', {
      deviceId: device.id,
      formData: {
        deliveryStatus: formData.deliveryStatus,
        reportStatus: formData.reportStatus,
        ear: formData.ear,
        isLoaner: formData.isLoaner
      }
    });

    try {
      const updatedDevice: any = {
        id: device.id,
        brand: formData.brand,
        model: formData.model,
        serialNumber: formData.serialNumber,
        deviceType: formData.deviceType,
        ear: formData.ear, // Include Ear
        salePrice: formData.price / qty, // Per unit
        notes: formData.notes,
        // Map new fields
        serialNumberLeft: formData.serialNumberLeft,
        serialNumberRight: formData.serialNumberRight,
        sgkSupport: formData.sgkSupport / qty, // Per unit
        netPayable: formData.patientPayment, // Total? Or Per Unit? Backend logic usually sums Net.
        // Actually best to send clean values. IF logic above is Per Unit (price/qty), Net Payable should probably be derived or sent as Total?
        // Backend `sales.py` line 766 calculates net_payable = sale_price * quantity.
        // So we don't strictly need to send netPayable if we send salePrice.
        // But if we send it, we should ensure consistency.
        patientPayment: formData.patientPayment,
        saleId: device.saleId,
        deliveryStatus: formData.deliveryStatus,
        isLoaner: formData.isLoaner,
        reportStatus: formData.reportStatus,
        report_status: formData.reportStatus, // Send snake_case ensuring backend compat
        loanerBrand: formData.loanerBrand,
        loanerModel: formData.loanerModel,
        loanerSerialNumber: formData.loanerSerialNumber,
        loanerSerialNumberLeft: formData.loanerSerialNumberLeft,
        loanerSerialNumberRight: formData.loanerSerialNumberRight,
        loanerInventoryId: formData.loanerInventoryId
      };

      console.log('📤 [DeviceEditModal] Backend\'e gönderilen veri:', updatedDevice);

      // 1. Update Device Assignment
      await onUpdate(device.id!, updatedDevice);

      console.log('✅ [DeviceEditModal] onUpdate tamamlandı, modal kapatılıyor');

      // 2. Update Sale if saleId exists
      if (device.saleId) {
        // Backend's update_device_assignment automatically syncs finalAmount, etc. to the Sale table.
        // We do NOT need to make a separate call here, which avoids potential auth/concurrency issues.
        console.debug('Skipping manual sale update - backend handles sync.');
      }

      onClose();
    } catch (error) {
      console.error('❌ [DeviceEditModal] HATA:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplace = async () => {
    if (!device?.id) return;
    setIsSubmitting(true);
    try {
      if (formData.replaceMode === 'inventory' && formData.inventoryId) {
        const selectedItem = inventoryItems.find(item => item.id === formData.inventoryId);
        if (selectedItem) {
          const replacementDevice: any = {
            id: device.id,
            inventoryId: selectedItem.id,
            brand: selectedItem.brand,
            model: selectedItem.model || '',
            deviceType: selectedItem.category || '',
            price: selectedItem.price,
            serialNumber: selectedItem.availableSerials?.[0] || '',
          };
          await onReplace(device.id!, replacementDevice);
        }
      } else {
        const replacementDevice: any = {
          id: device.id,
          brand: formData.brand,
          model: formData.model,
          serialNumber: formData.serialNumber,
          deviceType: formData.deviceType,
          price: formData.price,
          notes: formData.notes,
        };
        await onReplace(device.id!, replacementDevice);
      }
      onClose();
    } catch (error) {
      console.error('Error replacing device:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableInventoryItems = inventoryItems.filter(item =>
    (item.availableInventory || 0) > 0 && item.category === device.deviceType
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Cihaz {formData.mode === 'edit' ? 'Düzenle' : 'Değiştir'}
          </h3>
          <Button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Mode Tabs */}
        <div className="flex space-x-4 mb-6">
          <Button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, mode: 'edit' }))}
            variant={formData.mode === 'edit' ? 'default' : 'secondary'}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${formData.mode === 'edit'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <Settings className="w-4 h-4 mr-2" />
            Düzenle
          </Button>
          <Button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, mode: 'replace' }))}
            variant={formData.mode === 'replace' ? 'default' : 'secondary'}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${formData.mode === 'replace'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Değiştir
          </Button>
        </div>

        {/* Mode Content */}
        {formData.mode === 'edit' ? (
          <div className="space-y-4">

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cihaz Yönü</label>
                <Select
                  value={formData.ear}
                  onChange={(e) => setFormData(prev => ({ ...prev, ear: e.target.value }))}
                  options={[
                    { value: 'Left', label: 'Sol' },
                    { value: 'Right', label: 'Sağ' },
                    { value: 'Bilateral', label: 'Bilateral (Çift)' }
                  ]}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teslim Durumu</label>
                <Select
                  value={formData.deliveryStatus}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryStatus: e.target.value }))}
                  options={[
                    { value: 'pending', label: 'Teslim Edilmedi' },
                    { value: 'delivered', label: 'Teslim Edildi' }
                  ]}
                  className="w-full"
                />
              </div>
              <div className="pt-2 border-t border-gray-200 mt-2 col-span-2">
                <div className="flex items-center space-x-2 mb-2">
                  <Input
                    type="checkbox"
                    id="editIsLoaner"
                    checked={formData.isLoaner}
                    onChange={(e) => setFormData(prev => ({ ...prev, isLoaner: e.target.checked }))}
                  />
                  <label htmlFor="editIsLoaner" className="text-sm font-medium text-gray-700">Emanet Cihaz</label>
                </div>

                {formData.isLoaner && (
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 space-y-3">
                    {/* Search Input */}
                    <div className="relative">
                      <input
                        type="text"
                        value={loanerSearch}
                        onChange={(e) => setLoanerSearch(e.target.value)}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 placeholder-purple-300 text-sm"
                        placeholder="Emanet cihaz ara..."
                      />
                      {showLoanerResults && loanerResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                          {loanerResults.map(res => (
                            <div
                              key={res.id}
                              onClick={() => selectLoaner(res)}
                              className="p-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{res.brand} {res.model}</div>
                                  <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                                    <span>SN: {res.serialNumber || '-'}</span>
                                    <span className="font-medium">Stok: {res.availableInventory || 0}</span>
                                    {res.price && <span>{Number(res.price).toLocaleString('tr-TR')} ₺</span>}
                                  </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${(res.availableInventory || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                  {(res.availableInventory || 0) > 0 ? 'Mevcut' : 'Stok Yok'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Marka" value={formData.loanerBrand} onChange={e => setFormData(p => ({ ...p, loanerBrand: e.target.value }))} className="bg-white text-sm" />
                      <Input placeholder="Model" value={formData.loanerModel} onChange={e => setFormData(p => ({ ...p, loanerModel: e.target.value }))} className="bg-white text-sm" />
                      {isBilateral ? (
                        <div className="col-span-2 grid grid-cols-2 gap-2">
                          <Input placeholder="Sağ Kulak SN" value={formData.loanerSerialNumberRight} onChange={e => setFormData(p => ({ ...p, loanerSerialNumberRight: e.target.value }))} className="bg-white text-sm" />
                          <Input placeholder="Sol Kulak SN" value={formData.loanerSerialNumberLeft} onChange={e => setFormData(p => ({ ...p, loanerSerialNumberLeft: e.target.value }))} className="bg-white text-sm" />
                        </div>
                      ) : (
                        <Input placeholder="Seri No" value={formData.loanerSerialNumber} onChange={e => setFormData(p => ({ ...p, loanerSerialNumber: e.target.value }))} className="bg-white text-sm col-span-2" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Report Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rapor Durumu</label>
              <Select
                value={formData.reportStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, reportStatus: e.target.value }))}
                options={[
                  { value: '', label: 'Seçiniz...' },
                  { value: 'received', label: 'Rapor Teslim Alındı' },
                  { value: 'pending', label: 'Rapor Bekleniyor' },
                  { value: 'none', label: 'Raporsuz Özel Satış' }
                ]}
                className="w-full"
              />
            </div>

            {/* Device Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Serial Numbers */}
            {isBilateral ? (
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sağ Seri No</label>
                  <Input
                    value={formData.serialNumberRight}
                    onChange={(e) => setFormData(prev => ({ ...prev, serialNumberRight: e.target.value }))}
                    placeholder="Sağ kulak seri no"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sol Seri No</label>
                  <Input
                    value={formData.serialNumberLeft}
                    onChange={(e) => setFormData(prev => ({ ...prev, serialNumberLeft: e.target.value }))}
                    placeholder="Sol kulak seri no"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seri No</label>
                <Input
                  value={formData.serialNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                  required
                />
              </div>
            )}

            {/* Financial Info */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                Finansal Bilgiler
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Satış Fiyatı (Toplam)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₺</span>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => {
                        const newPrice = Number(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          price: newPrice,
                          // Auto-adjust patient payment?
                          patientPayment: newPrice - prev.sgkSupport
                        }));
                      }}
                      className="pl-8"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Shield className="w-3 h-3 mr-1 text-green-600" /> SGK Desteği
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₺</span>
                    <Input
                      type="number"
                      value={formData.sgkSupport}
                      onChange={(e) => {
                        const newSgk = Number(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          sgkSupport: newSgk,
                          patientPayment: prev.price - newSgk
                        }));
                      }}
                      className="pl-8 text-green-700 font-medium"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <CreditCard className="w-3 h-3 mr-1 text-blue-600" /> Hasta Ödemesi
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₺</span>
                    <Input
                      type="number"
                      value={formData.patientPayment}
                      onChange={(e) => setFormData(prev => ({ ...prev, patientPayment: Number(e.target.value) }))}
                      className="pl-8 text-blue-700 font-medium"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Cihaz ile ilgili notlar..."
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
              <Button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                İptal
              </Button>
              <Button
                type="button"
                onClick={handleUpdate}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                disabled={isSubmitting || loading}
              >
                {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </Button>
            </div>
          </div>
        ) : (
          /* Replace Mode Content (Simplified for brevity, assuming minimal changes needed here) */
          <div className="space-y-4">
            {/* ... reuse existing replace logic ... */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Değiştirme Yöntemi</label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, replaceMode: 'inventory' }))}
                  variant={formData.replaceMode === 'inventory' ? 'default' : 'secondary'}
                  className={`p-3 border rounded-lg text-center transition-colors ${formData.replaceMode === 'inventory'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                    }`}
                >
                  <div className="font-medium">Stoktan Seç</div>
                  <div className="text-sm text-gray-600">Mevcut stoktan cihaz seç</div>
                </Button>
                <Button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, replaceMode: 'manual' }))}
                  variant={formData.replaceMode === 'manual' ? 'default' : 'secondary'}
                  className={`p-3 border rounded-lg text-center transition-colors ${formData.replaceMode === 'manual'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                    }`}
                >
                  <div className="font-medium">Manuel Giriş</div>
                  <div className="text-sm text-gray-600">Cihaz bilgilerini manuel gir</div>
                </Button>
              </div>
            </div>

            {formData.replaceMode === 'inventory' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stok Cihazı Seç</label>
                <Select
                  value={formData.inventoryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, inventoryId: e.target.value }))}
                  options={[
                    { value: '', label: 'Cihaz seçiniz...' },
                    ...availableInventoryItems.map((item) => ({
                      value: item.id || '',
                      label: `${item.brand} ${item.model} - ${item.name}`
                    }))
                  ]}
                  required
                />
              </div>
            ) : (
              <div className="space-y-4">
                <Input value={formData.brand} onChange={e => setFormData(p => ({ ...p, brand: e.target.value }))} placeholder="Marka" />
                <Input value={formData.model} onChange={e => setFormData(p => ({ ...p, model: e.target.value }))} placeholder="Model" />
                <Input value={formData.serialNumber} onChange={e => setFormData(p => ({ ...p, serialNumber: e.target.value }))} placeholder="Seri No" />
                <Input type="number" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: Number(e.target.value) }))} placeholder="Fiyat" />
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
              <Button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-md">İptal</Button>
              <Button onClick={handleReplace} className="px-6 py-2 bg-red-600 text-white rounded-md">Cihazı Değiştir</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { DeviceEditModal };
export default DeviceEditModal;