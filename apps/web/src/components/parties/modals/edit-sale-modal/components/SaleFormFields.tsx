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
              <Label htmlFor="serialNumber">Seri Numarası</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                placeholder="Seri numarası"
              />
            </div>
          </div>

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

      {/* Pricing Information */}
      <Card>
        <CardHeader>
          <CardTitle>Fiyat Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="listPrice">Liste Fiyatı *</Label>
              <Input
                id="listPrice"
                type="number"
                value={formData.listPrice}
                onChange={(e) => handleInputChange('listPrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <Label htmlFor="discountAmount">İndirim Tutarı</Label>
              <Input
                id="discountAmount"
                type="number"
                value={formData.discountAmount}
                onChange={(e) => handleInputChange('discountAmount', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <Label htmlFor="salePrice">Satış Fiyatı *</Label>
              <Input
                id="salePrice"
                type="number"
                value={formData.salePrice}
                onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="sgkCoverage">SGK Karşılığı</Label>
            <Input
              id="sgkCoverage"
              type="number"
              value={formData.sgkCoverage}
              onChange={(e) => handleInputChange('sgkCoverage', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
        </CardContent>
      </Card>

      {/* Device Specific Fields */}
      {state.saleType === 'device' && (
        <Card>
          <CardHeader>
            <CardTitle>Cihaz Detayları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ear">Kulak</Label>
                <select data-allow-raw="true"
                  id="ear"
                  value={formData.ear}
                  onChange={(e) => handleInputChange('ear', e.target.value as 'left' | 'right' | 'both')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="both">Her İki Kulak</option>
                  <option value="left">Sol Kulak</option>
                  <option value="right">Sağ Kulak</option>
                </select>
              </div>

              <div>
                <Label htmlFor="warrantyPeriod">Garanti Süresi (Ay)</Label>
                <Input
                  id="warrantyPeriod"
                  type="number"
                  value={formData.warrantyPeriod}
                  onChange={(e) => handleInputChange('warrantyPeriod', parseInt(e.target.value) || 0)}
                  placeholder="24"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="fittingDate">Fit Tarihi</Label>
                <Input
                  id="fittingDate"
                  type="date"
                  value={formData.fittingDate}
                  onChange={(e) => handleInputChange('fittingDate', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="deliveryDate">Teslim Tarihi</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
              />
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

          <div>
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Satış ile ilgili notlar..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};