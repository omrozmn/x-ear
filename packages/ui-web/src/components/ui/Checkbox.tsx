import React, { forwardRef } from 'react';
import { Check, Minus } from 'lucide-react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  error,
  helperText,
  indeterminate = false,
  className = '',
  id,
  ...props
}, ref) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseClasses = 'w-4 h-4 border rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const stateClasses = error 
    ? 'border-red-300 focus:ring-red-500' 
    : 'border-gray-300 focus:ring-blue-500';
    
  const checkedClasses = props.checked || indeterminate
    ? 'bg-blue-600 border-blue-600 text-white'
    : 'bg-white';

  const checkboxClasses = [
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
          type="checkbox"
          id={checkboxId}
          className={`${checkboxClasses} appearance-none`}
          {...props}
        />
        
        {/* Custom checkbox indicator */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {indeterminate ? (
            <Minus className="w-3 h-3 text-white" />
          ) : props.checked ? (
            <Check className="w-3 h-3 text-white" />
          ) : null}
        </div>
      </div>
      
      {(label || error || helperText) && (
        <div className="ml-2 flex-1">
          {label && (
            <label 
              htmlFor={checkboxId}
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

Checkbox.displayName = 'Checkbox';

export default Checkbox;