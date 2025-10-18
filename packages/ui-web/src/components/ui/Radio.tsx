import React, { forwardRef } from 'react';

interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  helperText?: string;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}, ref) => {
  const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseClasses = 'w-4 h-4 border rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const stateClasses = error 
    ? 'border-red-300 focus:ring-red-500' 
    : 'border-gray-300 focus:ring-blue-500';
    
  const checkedClasses = props.checked
    ? 'bg-blue-600 border-blue-600'
    : 'bg-white';

  const radioClasses = [
    baseClasses,
    stateClasses,
    checkedClasses,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className="flex items-start">
      <div className="relative flex items-center">
        <input
          ref={ref}
          type="radio"
          id={radioId}
          className={`${radioClasses} appearance-none`}
          {...props}
        />
        
        {/* Custom radio indicator */}
        {props.checked && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}
      </div>
      
      {(label || error || helperText) && (
        <div className="ml-2 flex-1">
          {label && (
            <label 
              htmlFor={radioId}
              className="block text-sm font-medium text-gray-700 cursor-pointer"
            >
              {label}
            </label>
          )}
          
          {error && (
            <p className="mt-1 text-sm text-red-600">
              {error}
            </p>
          )}
          
          {helperText && !error && (
            <p className="mt-1 text-sm text-gray-500">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

Radio.displayName = 'Radio';

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  label,
  error,
  helperText,
  direction = 'vertical',
  className = '',
}) => {
  const containerClasses = direction === 'horizontal' 
    ? 'flex flex-wrap gap-4' 
    : 'space-y-2';

  return (
    <div className={className}>
      {label && (
        <div className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </div>
      )}
      
      <div className={containerClasses}>
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            disabled={option.disabled}
            label={option.label}
          />
        ))}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Radio;