import React, { memo } from 'react';
import { Input } from '@x-ear/ui-web';
import { Search, Package, Headphones } from 'lucide-react';

export interface DeviceInventoryItem {
  id: string;
  uniqueId?: string;
  brand: string;
  model: string;
  price: number;
  ear: 'left' | 'right' | 'both' | 'bilateral';
  direction?: 'left' | 'right' | 'both';
  availableInventory: number;
  serialNumbers?: string[];
  availableSerials?: string[];
  barcode?: string;
  category: string;
  status: 'available' | 'out_of_stock';
}

interface DeviceSearchFormProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filteredDevices: DeviceInventoryItem[];
  selectedDevice: DeviceInventoryItem | null;
  onDeviceSelect: (device: DeviceInventoryItem) => void;
  errors?: Record<string, string>;
}

export const DeviceSearchForm: React.FC<DeviceSearchFormProps> = memo(({
  searchTerm,
  onSearchChange,
  filteredDevices,
  selectedDevice,
  onDeviceSelect,
  errors = {}
}) => {
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(price);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hearing_aid':
        return <Headphones className="w-4 h-4" />;
      case 'cochlear_implant':
        return <Package className="w-4 h-4" />;
      case 'bone_anchored':
        return <Package className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'hearing_aid':
        return 'İşitme Cihazı';
      case 'cochlear_implant':
        return 'Koklear İmplant';
      case 'bone_anchored':
        return 'Kemik İletimli';
      default:
        return 'Diğer';
    }
  };

  const getEarLabel = (ear: string): string => {
    switch (ear) {
      case 'left':
        return 'Sol';
      case 'right':
        return 'Sağ';
      case 'both':
      case 'bilateral':
        return 'Bilateral';
      default:
        return ear;
    }
  };

  return (
    <div className="space-y-4">
      {/* Device Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cihaz Arama *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <Input
            id="device-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Marka, model veya barkod ile arayın..."
            className={`pl-10 ${errors.deviceId ? 'border-red-300' : ''}`}
          />
        </div>
        {errors.deviceId && (
          <p className="mt-1 text-sm text-red-600">{errors.deviceId}</p>
        )}
      </div>

      {/* Device List */}
      {searchTerm && (
        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
          {filteredDevices.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredDevices.map((device) => (
                <div
                  key={device.id}
                  onClick={() => onDeviceSelect(device)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedDevice?.id === device.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {getCategoryIcon(device.category)}
                        <h4 className="text-sm font-medium text-gray-900">
                          {device.brand} {device.model}
                        </h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {getCategoryLabel(device.category)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Kulak: {getEarLabel(device.ear)}</span>
                        <span>Stok: {device.availableInventory}</span>
                        {device.barcode && <span>Barkod: {device.barcode}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(device.price)}
                      </div>
                      <div className={`text-xs ${device.status === 'available' ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {device.status === 'available' ? 'Mevcut' : 'Stokta Yok'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Arama kriterlerinize uygun cihaz bulunamadı.</p>
            </div>
          )}
        </div>
      )}

      {/* Selected Device Summary */}
      {selectedDevice && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            {getCategoryIcon(selectedDevice.category)}
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Seçilen Cihaz: {selectedDevice.brand} {selectedDevice.model}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                <div>Kategori: {getCategoryLabel(selectedDevice.category)}</div>
                <div>Kulak: {getEarLabel(selectedDevice.ear)}</div>
                <div>Liste Fiyatı: {formatPrice(selectedDevice.price)}</div>
                <div>Mevcut Stok: {selectedDevice.availableInventory}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});