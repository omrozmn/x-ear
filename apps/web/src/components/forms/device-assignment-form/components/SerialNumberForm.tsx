import React, { useState, useRef, useEffect } from 'react';
import { Hash, CheckCircle } from 'lucide-react';
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
  isManualMode?: boolean;
}

const SerialAutocomplete: React.FC<{
  value: string;
  onChange: (value: string) => void;
  availableSerials: string[];
  placeholder: string;
  label: string;
  color?: 'blue' | 'red';
}> = ({ value, onChange, availableSerials, placeholder, label, color = 'blue' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSerials, setFilteredSerials] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && isOpen) {
      const filtered = availableSerials.filter(serial =>
        serial.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSerials(filtered);
    } else if (isOpen) {
      setFilteredSerials(availableSerials);
    } else {
      setFilteredSerials([]);
    }
  }, [value, isOpen, availableSerials]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (serial: string) => {
    onChange(serial);
    setIsOpen(false);
  };

  const colorClasses = {
    blue: 'text-blue-700 dark:text-blue-300',
    red: 'text-red-700 dark:text-red-300'
  };

  return (
    <div className="relative">
      <label className={`block text-sm font-medium mb-1 ${colorClasses[color]}`}>
        {label} (Opsiyonel)
      </label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
      />

      {isOpen && filteredSerials.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md shadow-lg max-h-48 overflow-auto"
        >
          {filteredSerials.map((serial, index) => (
            <div
              key={index}
              onClick={() => handleSelect(serial)}
              className="px-4 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">{serial}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const SerialNumberForm: React.FC<SerialNumberFormProps> = ({
  formData,
  onFormDataChange,
  selectedDevice,
  errors = {},
  isManualMode = false
}) => {
  const updateField = (field: keyof DeviceAssignment, value: string) => {
    onFormDataChange({ [field]: value });
  };

  const availableSerials = selectedDevice?.availableSerials || [];

  // In manual mode, we don't need a selected device to show the form
  if (!selectedDevice && !isManualMode) {
    return (
      <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-6 text-center">
        <Hash className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
        <p className="text-gray-600 dark:text-gray-400">
          Seri numarası atamak için önce bir cihaz seçin.
        </p>
      </div>
    );
  }

  // If manual mode, we simulate available serials (empty) but allow typing
  // Or we just rely on the existing rendering which handles empty availableSerials by just showing the input?
  // The SerialAutocomplete component filters based on availableSerials if > 0. 
  // We need to check SerialAutocomplete behavior.
  // Actually, let's just update the check above first.


  const assignedSerials = [
    formData.serialNumber,
    formData.serialNumberLeft,
    formData.serialNumberRight
  ].filter(Boolean);

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4">
      <div>
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1 flex items-center">
          <Hash className="w-4 h-4 mr-2" />
          Seri Numarası Yönetimi
        </h4>
        {selectedDevice ? (
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>{selectedDevice.brand} {selectedDevice.model}</strong> - Mevcut: {availableSerials.length} adet
          </p>
        ) : (
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Manuel giriş modu aktif
          </p>
        )}
      </div>

      {/* Serial Number Inputs - Audiological order: Right Left */}
      {formData.ear === 'both' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SerialAutocomplete
            value={formData.serialNumberRight || ''}
            onChange={(val) => updateField('serialNumberRight', val)}
            availableSerials={availableSerials}
            placeholder="Sağ kulak seri no"
            label="Sağ Kulak Seri No"
            color="red"
          />
          <SerialAutocomplete
            value={formData.serialNumberLeft || ''}
            onChange={(val) => updateField('serialNumberLeft', val)}
            availableSerials={availableSerials}
            placeholder="Sol kulak seri no"
            label="Sol Kulak Seri No"
            color="blue"
          />
        </div>
      ) : (
        <SerialAutocomplete
          value={formData.serialNumber || ''}
          onChange={(val) => updateField('serialNumber', val)}
          availableSerials={availableSerials}
          placeholder={`${formData.ear === 'left' ? 'Sol' : 'Sağ'} kulak seri no`}
          label={`${formData.ear === 'left' ? 'Sol' : 'Sağ'} Kulak Seri No`}
          color={formData.ear === 'left' ? 'blue' : 'red'}
        />
      )}

      {/* Assigned Serials Summary - Audiological view: Right Left (as facing a person) */}
      {/* Assigned Serials Summary - Audiological view: Right Left (as facing a person) */}
      {assignedSerials.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <h5 className="text-xs font-medium text-green-900 dark:text-green-100 mb-2 flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" />
            Atanan Seri Numaraları
          </h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Right Ear - Red (First column - audiological view) */}
            {(formData.serialNumberRight || (formData.serialNumber && formData.ear === 'right')) && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1">
                <strong className="text-red-700 dark:text-red-300">Sağ:</strong>
                <span className="ml-1 text-red-900 dark:text-red-100 font-mono">
                  {formData.serialNumberRight || formData.serialNumber}
                </span>
              </div>
            )}
            {/* Left Ear - Blue (Second column - audiological view) */}
            {(formData.serialNumberLeft || (formData.serialNumber && formData.ear === 'left')) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded px-2 py-1">
                <strong className="text-blue-700 dark:text-blue-300">Sol:</strong>
                <span className="ml-1 text-blue-900 dark:text-blue-100 font-mono">
                  {formData.serialNumberLeft || formData.serialNumber}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};