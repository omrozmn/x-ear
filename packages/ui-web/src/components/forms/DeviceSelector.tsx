import React from 'react';
import { Select } from '@x-ear/ui-web';

interface Device {
  id: string;
  name: string;
  brand: string;
  model: string;
  price: number;
  stock: number;
}

interface DeviceSelectorProps {
  label?: string;
  devices: Device[];
  value?: string;
  onChange: (deviceId: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  showStock?: boolean;
  showPrice?: boolean;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  label,
  devices,
  value,
  onChange,
  placeholder = 'Cihaz seçin...',
  required = false,
  disabled = false,
  error,
  className = '',
  showStock = true,
  showPrice = true,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const options = devices.map((device) => ({
    value: device.id,
    label: `${device.brand} ${device.model} - ${formatCurrency(device.price)} ${showStock ? `(Stok: ${device.stock})` : ''}`,
    disabled: device.stock === 0,
  }));

  return (
    <div className={className}>
      <Select
        label={label}
        options={options}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        error={error}
        fullWidth
      />
    </div>
  );
};

export default DeviceSelector;