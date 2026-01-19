import React from 'react';
import { Button, Input, Select } from '@x-ear/ui-web';
import { DollarSign, Plus, X } from 'lucide-react';

interface DeviceSelection {
  id: string;
  name: string;
  brand: string;
  model: string;
  ear: 'left' | 'right';
  serialNumber?: string;
  listPrice: number;
  salePrice: number;
  sgkCoverageAmount: number;
  partyResponsibleAmount: number;
  discountType?: 'none' | 'percentage' | 'amount';
  discountValue?: number;
}

interface DeviceSelectionListProps {
  devices: DeviceSelection[];
  onAddDevice: () => void;
  onUpdateDevice: (index: number, updates: Partial<DeviceSelection>) => void;
  onRemoveDevice: (index: number) => void;
  errors?: Record<string, string>;
}

export const DeviceSelectionList: React.FC<DeviceSelectionListProps> = ({
  devices,
  onAddDevice,
  onUpdateDevice,
  onRemoveDevice,
  errors
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          Cihazlar *
        </label>
        <Button
          type="button"
          variant="secondary"
          onClick={onAddDevice}
        >
          <Plus className="w-4 h-4 mr-1" />
          Cihaz Ekle
        </Button>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          Henüz cihaz eklenmedi. Yukarıdaki butonu kullanarak cihaz ekleyin.
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map((device, index) => (
            <div key={device.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">Cihaz {index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onRemoveDevice(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Device Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Cihaz Adı *
                  </label>
                  <Input
                    type="text"
                    value={device.name}
                    onChange={(e) => onUpdateDevice(index, { name: e.target.value })}
                    placeholder="Cihaz adı"
                  />
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Marka *
                  </label>
                  <Input
                    type="text"
                    value={device.brand}
                    onChange={(e) => onUpdateDevice(index, { brand: e.target.value })}
                    placeholder="Marka"
                  />
                </div>

                {/* Model */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Model *
                  </label>
                  <Input
                    type="text"
                    value={device.model}
                    onChange={(e) => onUpdateDevice(index, { model: e.target.value })}
                    placeholder="Model"
                  />
                </div>

                {/* Ear */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Kulak *
                  </label>
                  <Select
                    value={device.ear}
                    onChange={(e) => onUpdateDevice(index, { ear: e.target.value as 'left' | 'right' })}
                    options={[
                      { value: 'left', label: 'Sol' },
                      { value: 'right', label: 'Sağ' }
                    ]}
                  />
                </div>

                {/* Serial Number */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Seri Numarası
                  </label>
                  <Input
                    type="text"
                    value={device.serialNumber || ''}
                    onChange={(e) => onUpdateDevice(index, { serialNumber: e.target.value })}
                    placeholder="Seri numarası"
                  />
                </div>

                {/* List Price */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Liste Fiyatı (TL) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <DollarSign className="w-3 h-3 text-gray-400" />
                    </div>
                    <Input
                      type="number"
                      value={device.listPrice}
                      onChange={(e) => onUpdateDevice(index, { listPrice: parseFloat(e.target.value) || 0 })}
                      className="pl-6"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                {/* Sale Price */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Satış Fiyatı (TL) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <DollarSign className="w-3 h-3 text-gray-400" />
                    </div>
                    <Input
                      type="number"
                      value={device.salePrice}
                      onChange={(e) => onUpdateDevice(index, { salePrice: parseFloat(e.target.value) || 0 })}
                      className="pl-6"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                {/* SGK Coverage */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    SGK Karşılığı (TL)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <DollarSign className="w-3 h-3 text-gray-400" />
                    </div>
                    <Input
                      type="number"
                      value={device.sgkCoverageAmount}
                      onChange={(e) => onUpdateDevice(index, { sgkCoverageAmount: parseFloat(e.target.value) || 0 })}
                      className="pl-6"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                {/* Party Responsible Amount */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Hasta Payı (TL)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <DollarSign className="w-3 h-3 text-gray-400" />
                    </div>
                    <Input
                      type="number"
                      value={device.partyResponsibleAmount}
                      onChange={(e) => onUpdateDevice(index, { partyResponsibleAmount: parseFloat(e.target.value) || 0 })}
                      className="pl-6"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                {/* Discount Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    İndirim Türü
                  </label>
                  <Select
                    value={device.discountType || 'none'}
                    onChange={(e) => onUpdateDevice(index, { discountType: e.target.value as 'none' | 'percentage' | 'amount' })}
                    options={[
                      { value: 'none', label: 'İndirim Yok' },
                      { value: 'percentage', label: 'Yüzde (%)' },
                      { value: 'amount', label: 'Tutar (TL)' }
                    ]}
                  />
                </div>

                {/* Discount Value */}
                {device.discountType && device.discountType !== 'none' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      İndirim Değeri
                    </label>
                    <Input
                      type="number"
                      value={device.discountValue || 0}
                      onChange={(e) => onUpdateDevice(index, { discountValue: parseFloat(e.target.value) || 0 })}
                      step="0.01"
                      min="0"
                      placeholder={device.discountType === 'percentage' ? '0-100' : '0.00'}
                    />
                  </div>
                )}
              </div>

              {errors?.[`devices.${index}`] && (
                <div className="mt-2 text-red-600 text-xs">
                  {errors[`devices.${index}`]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {errors?.devices && (
        <div className="mt-2 text-red-600 text-xs">
          {errors.devices}
        </div>
      )}
    </div>
  );
};