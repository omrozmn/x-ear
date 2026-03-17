import React, { forwardRef, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className = '',
  id,
  ...props
}, ref) => {
  const generatedId = useMemo(() => `input-${Math.random().toString(36).substr(2, 9)}`, []);
  const inputId = id || generatedId;

  const baseClasses = 'block px-3 py-2 border rounded-xl text-sm bg-card text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed';

  const stateClasses = error
    ? 'border-destructive focus:border-destructive focus:ring-destructive'
    : 'border-border focus:border-primary';

  const widthClasses = fullWidth ? 'w-full' : '';

  const paddingClasses = leftIcon && rightIcon
    ? 'pl-10 pr-10'
    : leftIcon
      ? 'pl-10'
      : rightIcon
        ? 'pr-10'
        : '';

  const inputClasses = [
    baseClasses,
    stateClasses,
    widthClasses,
    paddingClasses,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
            <span className="text-muted-foreground">{leftIcon}</span>
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          {...props}
        />

        {rightIcon && !error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <span className="text-muted-foreground">{rightIcon}</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}

      {helperText && !error && (
        <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
