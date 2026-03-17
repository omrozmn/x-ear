import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helperText,
  fullWidth = true,
  resize = 'vertical',
  className = '',
  id,
  ...props
}, ref) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  const baseClasses = 'block px-3 py-2 border rounded-xl text-sm bg-card text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed';

  const stateClasses = error
    ? 'border-destructive focus:border-destructive focus:ring-destructive'
    : 'border-border focus:border-primary';

  const widthClasses = fullWidth ? 'w-full' : '';

  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize',
  };

  const textareaClasses = [
    baseClasses,
    stateClasses,
    widthClasses,
    resizeClasses[resize],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-foreground mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClasses}
          {...props}
        />

        {error && (
          <div className="absolute top-2 right-2 pointer-events-none">
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

Textarea.displayName = 'Textarea';

export default Textarea;
