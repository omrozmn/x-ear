import React from 'react';
import { Input } from '@x-ear/ui-web';

interface PriceInputProps {
  label?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currency?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const PriceInput: React.FC<PriceInputProps> = ({
  label,
  value,
  onChange,
  currency = 'TRY',
  placeholder,
  required = false,
  disabled = false,
  error,
  className = '',
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className={className}>
      <Input
        label={label}
        type="number"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        error={error}
        step="0.01"
        min="0"
        rightIcon={
          <span className="text-sm text-gray-500">
            {currency}
          </span>
        }
      />
      {typeof value === 'number' && value > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          {formatCurrency(value)}
        </div>
      )}
    </div>
  );
};

export default PriceInput;