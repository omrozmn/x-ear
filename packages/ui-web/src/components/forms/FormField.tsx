import React from 'react';
import { Input, Label } from '@x-ear/ui-web';
import { LucideIcon } from 'lucide-react';

interface FormFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'date' | 'email' | 'tel';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  icon?: LucideIcon;
  className?: string;
  step?: string;
  min?: string | number;
  max?: string | number;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error,
  icon: Icon,
  className = '',
  step,
  min,
  max,
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs font-medium text-gray-600 block">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <Icon className="w-3 h-3 text-gray-400" />
          </div>
        )}
        
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={Icon ? 'pl-6' : ''}
          step={step}
          min={min}
          max={max}
        />
      </div>
      
      {error && (
        <div className="text-red-600 text-xs mt-1">{error}</div>
      )}
    </div>
  );
};