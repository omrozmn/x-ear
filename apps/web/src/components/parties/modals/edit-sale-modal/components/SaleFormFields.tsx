import React from 'react';
import {
  Input,
  Label,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button
} from '@x-ear/ui-web';
import { Package, Search, Calendar } from 'lucide-react';
import type { SaleFormData, EditSaleState } from '../types';
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
  const handleInputChange = (field: keyof SaleFormData, value: string | number) => {
    onFormDataChange({ [field]: value });
  };

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
      'battery': 'Pil',
      'accessory': 'Aksesuar',
      'service': 'Servis',
      'other': 'Diğer'
    };
    return categoryMap[category] || category;
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="productName">Ürün Adı *</Label>
              <div className="flex gap-2">
                <Input
                  id="productName"
                  value={formData.productName}
                  onChange={(e) => handleInputChange('productName', e.target.value)}
                  placeholder="Ürün adını giriniz"
                  required
                />
                {state.saleType === 'device' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onStateChange({ showDeviceSelector: !state.showDeviceSelector })}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="brand">Marka</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                placeholder="Marka"
              />
            </div>

            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                placeholder="Model"
              />
            </div>

            <div>
              <Label htmlFor="category">Kategori</Label>
              <Input
                id="category"
                value={getCategoryLabel(formData.category)}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="Kategori"
                disabled
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="barcode">Barkod</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleInputChange('barcode', e.target.value)}
                placeholder="Barkod"
                disabled
              />
            </div>
          </div>

          {/* Serial Number Fields - Dynamic based on category and ear */}
          {formData.category === 'hearing_aid' ? (
            // Hearing aid: Show based on ear selection
            formData.ear === 'both' ? (
              // Bilateral: Show both left and right
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serialNumberLeft">Sol Kulak Seri No *</Label>
                  <Input
                    id="serialNumberLeft"
                    value={formData.serialNumberLeft}
                    onChange={(e) => handleInputChange('serialNumberLeft', e.target.value)}
                    placeholder="Sol kulak seri numarası"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="serialNumberRight">Sağ Kulak Seri No *</Label>
                  <Input
                    id="serialNumberRight"
                    value={formData.serialNumberRight}
                    onChange={(e) => handleInputChange('serialNumberRight', e.target.value)}
                    placeholder="Sağ kulak seri numarası"
                    required
                  />
                </div>
              </div>
            ) : formData.ear === 'left' ? (
              // Left ear only
              <div>
                <Label htmlFor="serialNumberLeft">Sol Kulak Seri No *</Label>
                <Input
                  id="serialNumberLeft"
                  value={formData.serialNumberLeft}
                  onChange={(e) => handleInputChange('serialNumberLeft', e.target.value)}
                  placeholder="Sol kulak seri numarası"
                  required
                />
              </div>
            ) : formData.ear === 'right' ? (
              // Right ear only
              <div>
                <Label htmlFor="serialNumberRight">Sağ Kulak Seri No *</Label>
                <Input
                  id="serialNumberRight"
                  value={formData.serialNumberRight}
                  onChange={(e) => handleInputChange('serialNumberRight', e.target.value)}
                  placeholder="Sağ kulak seri numarası"
                  required
                />
              </div>
            ) : null
          ) : (
            // Other products: Single serial number
            <div>
              <Label htmlFor="serialNumber">Seri Numarası</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                placeholder="Seri numarası"
              />
            </div>
          )}

          {/* Device Selector */}
          {state.showDeviceSelector && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-sm">Cihaz Seç</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Input
                    placeholder="Cihaz ara..."
                    value={state.deviceSearchTerm}
                    onChange={(e) => onStateChange({ deviceSearchTerm: e.target.value })}
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {availableDevices.map((device) => (
                      <div
                        key={device.id}
                        className="p-2 border rounded cursor-pointer hover:bg-gray-50"
                        onClick={() => onDeviceSelect(device)}
                      >
                        <div className="font-medium">{device.name}</div>
                        <div className="text-sm text-gray-500">
                          {device.brand} - {device.model} - {formatCurrency(device.price || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Delivery & Report Status - Only for hearing_aid and battery categories */}
      {(formData.category === 'hearing_aid' || formData.category === 'battery') && (
        <Card>
          <CardHeader>
            <CardTitle>Teslim ve Rapor Durumu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveryStatus">Teslim Durumu</Label>
                <select data-allow-raw="true"
                  id="deliveryStatus"
                  value={formData.deliveryStatus || 'pending'}
                  onChange={(e) => handleInputChange('deliveryStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Teslim Edilmedi</option>
                  <option value="delivered">Teslim Edildi</option>
                </select>
              </div>

              <div>
                <Label htmlFor="reportStatus">Rapor Durumu</Label>
                <select data-allow-raw="true"
                  id="reportStatus"
                  value={formData.reportStatus || ''}
                  onChange={(e) => handleInputChange('reportStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="saleDate">Satış Tarihi *</Label>
              <Input
                id="saleDate"
                type="date"
                value={formData.saleDate}
                onChange={(e) => handleInputChange('saleDate', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod">Ödeme Yöntemi</Label>
              <select data-allow-raw="true"
                id="paymentMethod"
                value={state.paymentMethod}
                onChange={(e) => onStateChange({ paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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