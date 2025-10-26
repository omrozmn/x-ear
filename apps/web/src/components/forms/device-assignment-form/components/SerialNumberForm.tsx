import React from 'react';
import { Input, Select } from '@x-ear/ui-web';
import { Hash, AlertTriangle, CheckCircle } from 'lucide-react';
import { DeviceInventoryItem } from './DeviceSearchForm';

export interface DeviceAssignment {
  serialNumber?: string;
  serialNumberLeft?: string;
  serialNumberRight?: string;
  ear: 'left' | 'right' | 'both';
}

interface SerialNumberFormProps {
  formData: Partial<DeviceAssignment>;
  onFormDataChange: (data: Partial<DeviceAssignment>) => void;
  selectedDevice: DeviceInventoryItem | null;
  errors?: Record<string, string>;
}

export const SerialNumberForm: React.FC<SerialNumberFormProps> = ({
  formData,
  onFormDataChange,
  selectedDevice,
  errors = {}
}) => {
  const updateFormData = (field: keyof DeviceAssignment, value: any) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  const getAvailableSerials = (): string[] => {
    return selectedDevice?.availableSerials || [];
  };

  const isSerialAvailable = (serial: string): boolean => {
    return getAvailableSerials().includes(serial);
  };

  const renderSerialInput = (
    label: string,
    field: keyof DeviceAssignment,
    placeholder: string
  ) => {
    const currentValue = formData[field] as string || '';
    const availableSerials = getAvailableSerials();
    const isValid = !currentValue || isSerialAvailable(currentValue);

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <div className="space-y-2">
          {/* Manual Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Hash className="w-4 h-4 text-gray-400" />
            </div>
            <Input
              type="text"
              value={currentValue}
              onChange={(e) => updateFormData(field, e.target.value)}
              placeholder={placeholder}
              className={`pl-10 ${
                errors[field] ? 'border-red-300' : 
                currentValue && !isValid ? 'border-orange-300' : ''
              }`}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {currentValue && (
                isValid ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                )
              )}
            </div>
          </div>

          {/* Available Serials Dropdown */}
          {availableSerials.length > 0 && (
            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  updateFormData(field, e.target.value);
                }
              }}
              label=""
              options={[
                { value: '', label: 'Mevcut seri numaralarından seçin...' },
                ...availableSerials.map(serial => ({
                  value: serial,
                  label: serial
                }))
              ]}
              className="text-sm"
            />
          )}

          {/* Validation Messages */}
          {errors[field] && (
            <p className="text-sm text-red-600">{errors[field]}</p>
          )}
          {currentValue && !isValid && (
            <p className="text-sm text-orange-600 flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Bu seri numarası mevcut değil veya kullanımda
            </p>
          )}
        </div>
      </div>
    );
  };

  if (!selectedDevice) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <Hash className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-gray-600">
          Seri numarası atamak için önce bir cihaz seçin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
          <Hash className="w-4 h-4 mr-2" />
          Seri Numarası Yönetimi
        </h4>
        <p className="text-xs text-blue-700">
          Seçilen cihaz: <strong>{selectedDevice.brand} {selectedDevice.model}</strong>
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Mevcut seri numaraları: {getAvailableSerials().length} adet
        </p>
      </div>

      {/* Serial Number Assignment based on ear selection */}
      {formData.ear === 'both' ? (
        // Bilateral - Both ears
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderSerialInput(
            'Sol Kulak Seri No',
            'serialNumberLeft',
            'Sol kulak seri numarası'
          )}
          {renderSerialInput(
            'Sağ Kulak Seri No',
            'serialNumberRight',
            'Sağ kulak seri numarası'
          )}
        </div>
      ) : (
        // Single ear
        renderSerialInput(
          `${formData.ear === 'left' ? 'Sol' : 'Sağ'} Kulak Seri No`,
          'serialNumber',
          `${formData.ear === 'left' ? 'Sol' : 'Sağ'} kulak seri numarası`
        )
      )}

      {/* Available Serials List */}
      {getAvailableSerials().length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h5 className="text-sm font-medium text-gray-900 mb-2">
            Mevcut Seri Numaraları
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {getAvailableSerials().map((serial) => {
              const isUsed = 
                serial === formData.serialNumber ||
                serial === formData.serialNumberLeft ||
                serial === formData.serialNumberRight;
              
              return (
                <div
                  key={serial}
                  className={`px-2 py-1 rounded text-xs font-mono ${
                    isUsed
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  {serial}
                  {isUsed && (
                    <span className="ml-1 text-blue-600">✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Serial Assignment Summary */}
      {(formData.serialNumber || formData.serialNumberLeft || formData.serialNumberRight) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h5 className="text-sm font-medium text-green-900 mb-2 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Atanan Seri Numaraları
          </h5>
          <div className="space-y-1 text-sm text-green-800">
            {formData.serialNumber && (
              <div>
                <strong>{formData.ear === 'left' ? 'Sol' : 'Sağ'} Kulak:</strong> {formData.serialNumber}
              </div>
            )}
            {formData.serialNumberLeft && (
              <div>
                <strong>Sol Kulak:</strong> {formData.serialNumberLeft}
              </div>
            )}
            {formData.serialNumberRight && (
              <div>
                <strong>Sağ Kulak:</strong> {formData.serialNumberRight}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {getAvailableSerials().length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-yellow-900">Uyarı</h5>
              <p className="text-sm text-yellow-800 mt-1">
                Bu cihaz için mevcut seri numarası bulunmuyor. 
                Seri numarasını manuel olarak girmeniz gerekebilir.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};