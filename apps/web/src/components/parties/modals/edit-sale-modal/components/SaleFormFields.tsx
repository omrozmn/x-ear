import React, { useEffect, useRef } from 'react';
import {
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@x-ear/ui-web';
import { Package, Calendar } from 'lucide-react';
import type { SaleFormData, EditSaleState } from '../types';
import { SerialAutocomplete } from '@/components/shared/SerialAutocomplete';
// Local type for inventory items to avoid import errors
export interface InventoryItem {
  id?: string;
  name: string;
  category?: string;
  brand?: string;
  model?: string;
  price?: number;
  availableInventory?: number;
  inventory?: number;
  availableSerials?: string[];
  [key: string]: unknown;
}

interface SaleFormFieldsProps {
  formData: SaleFormData;
  state: EditSaleState;
  availableDevices: InventoryItem[];
  onFormDataChange: (updates: Partial<SaleFormData>) => void;
  onStateChange: (updates: Partial<EditSaleState>) => void;
  onDeviceSelect: (device: InventoryItem) => void;
}

export const SaleFormFields: React.FC<SaleFormFieldsProps> = ({
  formData,
  state,
  availableDevices,
  onFormDataChange,
  onStateChange,
  onDeviceSelect
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onStateChange({ showDeviceSelector: false });
      }
    };

    if (state.showDeviceSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [state.showDeviceSelector, onStateChange]);

  const handleInputChange = (field: keyof SaleFormData, value: string | number) => {
    onFormDataChange({ [field]: value });
  };

  // Get available serials from the current product
  const currentDevice = availableDevices.find(d => d.name === formData.productName);
  const availableSerials = currentDevice?.availableSerials || [];

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getCategoryLabel = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'hearing_aid': 'İşitme Cihazı',
      'hearing_aid_battery': 'İşitme Cihazı Pili',
      'implant_battery': 'İmplant Pili',
      'battery': 'Pil',
      'accessory': 'Aksesuar',
      'service': 'Servis',
      'other': 'Diğer'
    };
    return categoryMap[category] || category;
  };

  // Check if category is a battery with SGK support
  const isSgkBattery = formData.category === 'hearing_aid_battery' || formData.category === 'implant_battery';

  return (
    <div className="space-y-6">
      {/* Product Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Ürün Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Ürün Adı + Marka */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative w-full" ref={dropdownRef}>
              <Label htmlFor="productName">Ürün Adı *</Label>
              <Input
                className="w-full"
                id="productName"
                value={formData.productName}
                onChange={(e) => {
                  handleInputChange('productName', e.target.value);
                  onStateChange({ deviceSearchTerm: e.target.value, showDeviceSelector: true });
                }}
                onFocus={() => onStateChange({ showDeviceSelector: true })}
                placeholder="Ürün adını giriniz veya arayın..."
                required
              />
              
              {/* Autocomplete Dropdown - Shows filtered results */}
              {state.showDeviceSelector && formData.productName && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {availableDevices
                    .filter(device => 
                      device.name.toLowerCase().includes(formData.productName.toLowerCase()) ||
                      device.brand?.toLowerCase().includes(formData.productName.toLowerCase()) ||
                      device.model?.toLowerCase().includes(formData.productName.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((device) => (
                      <div
                        key={device.id}
                        className="p-3 border-b last:border-b-0 cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={() => {
                          onDeviceSelect(device);
                          onStateChange({ showDeviceSelector: false });
                        }}
                      >
                        <div className="font-medium text-gray-900">{device.name}</div>
                        <div className="text-sm text-gray-600">
                          {device.brand} {device.model && `- ${device.model}`} • {formatCurrency(device.price || 0)}
                        </div>
                      </div>
                    ))}
                  {availableDevices.filter(device => 
                    device.name.toLowerCase().includes(formData.productName.toLowerCase()) ||
                    device.brand?.toLowerCase().includes(formData.productName.toLowerCase()) ||
                    device.model?.toLowerCase().includes(formData.productName.toLowerCase())
                  ).length === 0 && (
                    <div className="p-3 text-sm text-gray-500 text-center">
                      Sonuç bulunamadı
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="w-full">
              <Label htmlFor="brand">Marka</Label>
              <Input
                className="w-full"
                id="brand"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                placeholder="Marka"
              />
            </div>
          </div>

          {/* Row 2: Model + Kategori */}
          <div className="grid grid-cols-2 gap-4">
            <div className="w-full">
              <Label htmlFor="model">Model</Label>
              <Input
                className="w-full"
                id="model"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                placeholder="Model"
              />
            </div>

            <div className="w-full">
              <Label htmlFor="category">Kategori</Label>
              <Input
                className="w-full"
                id="category"
                value={getCategoryLabel(formData.category)}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="Kategori"
                disabled
              />
            </div>
          </div>

          {/* Row 3: Barkod + Kulak/Miktar */}
          <div className="grid grid-cols-2 gap-4">
            <div className="w-full">
              <Label htmlFor="barcode">Barkod</Label>
              <Input
                className="w-full"
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleInputChange('barcode', e.target.value)}
                placeholder="Barkod"
                disabled
              />
            </div>

            {/* Ear Selector (for hearing aids and SGK batteries) or Quantity (for other products) */}
            {(formData.category === 'hearing_aid' || isSgkBattery) ? (
              <div className="w-full">
                <Label htmlFor="ear">Kulak *</Label>
                <select data-allow-raw="true"
                  id="ear"
                  value={formData.ear || 'both'}
                  onChange={(e) => onFormDataChange({ ear: e.target.value as 'left' | 'right' | 'both' })}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="left">Sol Kulak</option>
                  <option value="right">Sağ Kulak</option>
                  <option value="both">İki Kulak (Bilateral)</option>
                </select>
              </div>
            ) : formData.category && formData.category !== 'hearing_aid' ? (
              <div className="w-full">
                <Label htmlFor="quantity">Miktar *</Label>
                <Input
                  className="w-full"
                  id="quantity"
                  type="number"
                  value={formData.quantity || 1}
                  onChange={(e) => onFormDataChange({ quantity: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                  min="1"
                  step="1"
                  required
                />
              </div>
            ) : null}
            {/* Quantity field for batteries (in addition to ear) */}
            {isSgkBattery && (
              <div className="w-full">
                <Label htmlFor="quantity">Miktar (Paket) *</Label>
                <Input
                  className="w-full"
                  id="quantity"
                  type="number"
                  value={formData.quantity || 1}
                  onChange={(e) => onFormDataChange({ quantity: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                  min="1"
                  step="1"
                  required
                />
              </div>
            )}
          </div>

          {/* Serial Number Fields - Dynamic based on category and ear */}
          {formData.category === 'hearing_aid' ? (
            // Hearing aid: Show based on ear selection
            formData.ear === 'both' ? (
              // Bilateral: Show both left and right
              <div className="grid grid-cols-2 gap-4">
                <SerialAutocomplete
                  value={formData.serialNumberLeft}
                  onChange={(val) => handleInputChange('serialNumberLeft', val)}
                  availableSerials={availableSerials}
                  placeholder="Sol kulak seri numarası"
                  label="Sol Kulak Seri No"
                  color="blue"
                  id="serialNumberLeft"
                />
                <SerialAutocomplete
                  value={formData.serialNumberRight}
                  onChange={(val) => handleInputChange('serialNumberRight', val)}
                  availableSerials={availableSerials}
                  placeholder="Sağ kulak seri numarası"
                  label="Sağ Kulak Seri No"
                  color="red"
                  id="serialNumberRight"
                />
              </div>
            ) : formData.ear === 'left' ? (
              // Left ear only
              <SerialAutocomplete
                value={formData.serialNumberLeft}
                onChange={(val) => handleInputChange('serialNumberLeft', val)}
                availableSerials={availableSerials}
                placeholder="Sol kulak seri numarası"
                label="Sol Kulak Seri No"
                color="blue"
                id="serialNumberLeft"
              />
            ) : formData.ear === 'right' ? (
              // Right ear only
              <SerialAutocomplete
                value={formData.serialNumberRight}
                onChange={(val) => handleInputChange('serialNumberRight', val)}
                availableSerials={availableSerials}
                placeholder="Sağ kulak seri numarası"
                label="Sağ Kulak Seri No"
                color="red"
                id="serialNumberRight"
              />
            ) : null
          ) : (
            // Other products: Single serial number
            <SerialAutocomplete
              value={formData.serialNumber}
              onChange={(val) => handleInputChange('serialNumber', val)}
              availableSerials={availableSerials}
              placeholder="Seri numarası"
              label="Seri Numarası"
              id="serialNumber"
            />
          )}
        </CardContent>
      </Card>

      {/* Delivery & Report Status - For hearing_aid, battery, hearing_aid_battery, implant_battery categories */}
      {(formData.category === 'hearing_aid' || formData.category === 'battery' || isSgkBattery) && (
        <Card>
          <CardHeader>
            <CardTitle>Teslim ve Rapor Durumu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Teslim Durumu + Rapor Durumu */}
            <div className="grid grid-cols-2 gap-4">
              <div className="w-full">
                <Label htmlFor="deliveryStatus">Teslim Durumu</Label>
                <select data-allow-raw="true"
                  id="deliveryStatus"
                  value={formData.deliveryStatus || 'pending'}
                  onChange={(e) => handleInputChange('deliveryStatus', e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Teslim Edilmedi</option>
                  <option value="delivered">Teslim Edildi</option>
                </select>
              </div>

              <div className="w-full">
                <Label htmlFor="reportStatus">Rapor Durumu</Label>
                <select data-allow-raw="true"
                  id="reportStatus"
                  value={formData.reportStatus || ''}
                  onChange={(e) => handleInputChange('reportStatus', e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçiniz...</option>
                  <option value="received">Rapor Teslim Alındı</option>
                  <option value="pending">Rapor Bekleniyor</option>
                  <option value="none">Raporsuz Özel Satış</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sale Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Satış Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Satış Tarihi + Ödeme Yöntemi */}
          <div className="grid grid-cols-2 gap-4">
            <div className="w-full">
              <Label htmlFor="saleDate">Satış Tarihi *</Label>
              <Input
                className="w-full"
                id="saleDate"
                type="date"
                value={formData.saleDate}
                onChange={(e) => handleInputChange('saleDate', e.target.value)}
                required
              />
            </div>

            <div className="w-full">
              <Label htmlFor="paymentMethod">Ödeme Yöntemi</Label>
              <select data-allow-raw="true"
                id="paymentMethod"
                value={state.paymentMethod}
                onChange={(e) => onStateChange({ paymentMethod: e.target.value })}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">Nakit</option>
                <option value="credit_card">Kredi Kartı</option>
                <option value="bank_transfer">Banka Havalesi</option>
                <option value="installment">Taksit</option>
                <option value="check">Çek</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};