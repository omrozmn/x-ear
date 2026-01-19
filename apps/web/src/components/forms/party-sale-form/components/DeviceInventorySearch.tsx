import React from 'react';
import { Input, Button } from '@x-ear/ui-web';
import { Search } from 'lucide-react';

interface DeviceInventoryItem {
  id: string;
  brand: string;
  model: string;
  price: number;
  ear: 'left' | 'right' | 'both';
  availableInventory: number;
  availableSerials?: string[];
  barcode?: string;
  category: string;
  status: 'available' | 'out_of_stock';
  vatRate?: number;
  serialNumber?: string;
  categoryDisplayName?: string;
}

interface DeviceInventorySearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filteredDevices: DeviceInventoryItem[];
  onDeviceSelect: (device: DeviceInventoryItem) => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount);
};

export const DeviceInventorySearch: React.FC<DeviceInventorySearchProps> = ({
  searchTerm,
  onSearchChange,
  filteredDevices,
  onDeviceSelect
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Envanter Arama
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Marka, model veya barkod ile ara..."
          className="pl-10"
        />
      </div>
      
      {searchTerm && filteredDevices.length > 0 && (
        <div className="mt-2 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
          {filteredDevices.map((device) => (
            <div key={device.id} className="p-3 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{device.brand} {device.model}</p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(device.price)} • Stok: {device.availableInventory}
                  </p>
                  {device.categoryDisplayName && (
                    <p className="text-xs text-gray-400">Kategori: {device.categoryDisplayName}</p>
                  )}
                  {device.barcode && (
                    <p className="text-xs text-gray-400">Barkod: {device.barcode}</p>
                  )}
                  {device.serialNumber && (
                    <p className="text-xs text-gray-400">Seri No: {device.serialNumber}</p>
                  )}
                  {device.vatRate && (
                    <p className="text-xs text-gray-400">KDV: %{device.vatRate}</p>
                  )}
                </div>
                <Button
                  onClick={() => onDeviceSelect(device)}
                  variant="outline"
                  className="text-xs px-2 py-1"
                  disabled={device.status === 'out_of_stock'}
                >
                  {device.status === 'out_of_stock' ? 'Stokta Yok' : 'Seç'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};